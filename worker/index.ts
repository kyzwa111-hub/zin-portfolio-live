interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1Statement;
}
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_USERNAME: string;
  TELEGRAM_ADMIN_USER_ID?: string;
  MOBILE_APP_ORIGINS?: string;
  TIDB_DATABASE_URL?: string;
  YOUTUBE_DATA_API_KEY?: string;
  LINKEDIN_JOB_FEED_URL?: string;
  JOBNET_JOB_FEED_URL?: string;
}

import { addVideoLink, listVideoLinks, listPublicDiscoveredVideoLinks, TiDBNotConfiguredError, updateVideoReviewStatus, VideoLinkValidationError } from "./videoLinks";
import { runDailyYouTubeDiscovery } from "./videoDiscovery";
import { jobFeedBootstrap } from "./jobFeed";

type AccessStatus = "pending" | "approved" | "denied" | "expired" | "revoked";
const ADMIN_CHAT_KEY = "admin_chat_id";
const WEBHOOK_URL_KEY = "webhook_url";
const TARGET_TELEGRAM_BOT_USERNAME = "ayelay_bot";
const TELEGRAM_WEBHOOK_URL = "https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private" },
  });
}
function trpcResult(data: unknown): Response {
  return json([{ result: { data: { json: data } } }]);
}
function trpcError(message: string, status = 400): Response {
  return json([{ error: { json: { message, code: -32600, data: { code: status === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR", httpStatus: status } } } }], status);
}
function videoLinkErrorResponse(error: unknown): Response {
  if (error instanceof VideoLinkValidationError) return json({ error: error.message }, 400);
  if (error instanceof TiDBNotConfiguredError) return json({ error: "TiDB video storage is not configured yet." }, 503);
  console.error("TiDB video-link request failed", error);
  return json({ error: "TiDB video storage is unavailable. Check the connection and create the required table." }, 503);
}
function randomToken(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function equalSecret(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
async function telegram(env: Env, method: string, payload: Record<string, unknown>): Promise<any> {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot secret is not configured");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { ok: boolean; result?: unknown; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram ${method} failed`);
  return result.result;
}
async function saveSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(key, value).run();
}
async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}
async function targetWebhookReady(env: Env): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) return false;
  const expectedMarker = `${TELEGRAM_WEBHOOK_URL}|${(await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32)}`;
  const marker = await getSetting(env, WEBHOOK_URL_KEY);
  const username = (await getSetting(env, "bot_username") || "").replace(/^@/, "").toLowerCase();
  return marker === expectedMarker && username === TARGET_TELEGRAM_BOT_USERNAME;
}
async function ensureWebhook(env: Env): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot secret is not configured");
  const secret = (await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32);
  const marker = TELEGRAM_WEBHOOK_URL + "|" + secret;
  const bot = await telegram(env, "getMe", {});
  const botUsername = String(bot?.username || "").replace(/^@/, "").toLowerCase();
  if (botUsername !== TARGET_TELEGRAM_BOT_USERNAME) throw new Error("Telegram token is not for the target bot");
  // Re-register on every bootstrap so a deleted/stale Telegram webhook cannot silently stop replies.
  await telegram(env, "setWebhook", { url: TELEGRAM_WEBHOOK_URL, secret_token: secret, allowed_updates: ["message", "callback_query"] });
  await saveSetting(env, WEBHOOK_URL_KEY, marker);
  await saveSetting(env, "bot_username", botUsername);
}
async function sendText(env: Env, chatId: string, text: string, replyMarkup?: unknown): Promise<any> {
  return telegram(env, "sendMessage", { chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}
function adminUsername(env: Env): string {
  return (env.TELEGRAM_ADMIN_USERNAME || "").replace(/^@/, "").toLowerCase();
}
async function isAdminTelegramMessage(message: any, env: Env): Promise<boolean> {
  const username = String(message?.from?.username || "").toLowerCase();
  const senderId = String(message?.from?.id ?? "");
  const chatId = String(message?.chat?.id ?? "");
  const storedAdminChatId = await getSetting(env, ADMIN_CHAT_KEY);
  const allowedAdminId = String(env.TELEGRAM_ADMIN_USER_ID || "").trim() || storedAdminChatId || "";
  return Boolean(allowedAdminId && senderId === allowedAdminId && chatId === allowedAdminId && username === adminUsername(env));
}
async function handleAdminBotCommand(message: any, env: Env): Promise<boolean> {
  const text = String(message?.text || "").trim();
  const [rawCommand, ...args] = text.split(/\s+/);
  const command = String(rawCommand || "").split("@")[0].toLowerCase();
  const supported = ["/pending", "/status", "/approve", "/deny", "/revoke", "/restore", "/update", "/mobilecode"];
  if (!supported.includes(command)) return false;
  const chatId = String(message.chat.id);
  if (!(await isAdminTelegramMessage(message, env))) {
    await sendText(env, chatId, "This command is restricted to the configured administrator.");
    return true;
  }

  if (command === "/pending") {
    const rows = await env.DB.prepare("SELECT request_id, requester_name, expires_at FROM access_requests WHERE status = 'pending' AND expires_at > ? ORDER BY created_at DESC LIMIT 20")
      .bind(Date.now()).all<{ request_id: string; requester_name: string; expires_at: number }>();
    const requests = rows.results || [];
    const summary = requests.length
      ? requests.map((row) => `${row.request_id} — ${row.requester_name} (expires ${new Date(row.expires_at).toISOString()})`).join("\n")
      : "No pending requests.";
    await sendText(env, chatId, `Pending request codes:\n\n${summary}\n\nUse /approve CODE, /deny CODE, /revoke CODE, or /restore CODE.`);
    return true;
  }

  if (command === "/mobilecode") {
    const code = randomToken(32);
    const now = Date.now();
    await env.DB.prepare("DELETE FROM mobile_login_codes WHERE expires_at <= ? OR used_at IS NOT NULL").bind(now).run();
    await env.DB.prepare("INSERT INTO mobile_login_codes (code_hash, expires_at, used_at, created_at) VALUES (?, ?, NULL, ?)")
      .bind(await sha256(code), now + 5 * 60 * 1000, now).run();
    await sendText(env, chatId, `One-time mobile admin login code (expires in 5 minutes):\n\n${code}\n\nEnter it only in your admin app. Do not forward or share it.`);
    return true;
  }

  const requestId = command === "/update" ? String(args[0] || "") : String(args[0] || "");
  const action = command === "/update" ? String(args[1] || "").toLowerCase() : command.slice(1);
  if (command === "/status") {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) {
      await sendText(env, chatId, "Usage: /status REQUEST_CODE");
      return true;
    }
    const row = await env.DB.prepare("SELECT requester_name, status, expires_at FROM access_requests WHERE request_id = ?")
      .bind(requestId).first<{ requester_name: string; status: AccessStatus; expires_at: number }>();
    await sendText(env, chatId, row ? `Request ${requestId}\nName: ${row.requester_name}\nStatus: ${row.status}\nExpires: ${new Date(row.expires_at).toISOString()}` : "Request code not found.");
    return true;
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId) || !["approve", "deny", "revoke", "restore"].includes(action)) {
    await sendText(env, chatId, command === "/update" ? "Usage: /update REQUEST_CODE approve|deny|revoke|restore" : `Usage: ${command} REQUEST_CODE`);
    return true;
  }
  const current = await env.DB.prepare("SELECT status, expires_at FROM access_requests WHERE request_id = ?")
    .bind(requestId).first<{ status: AccessStatus; expires_at: number }>();
  if (!current) {
    await sendText(env, chatId, "Request code not found.");
    return true;
  }
  const now = Date.now();
  let result: unknown;
  let nextStatus: AccessStatus;
  if (action === "approve" || action === "deny") {
    if (current.status !== "pending" || current.expires_at <= now) {
      await sendText(env, chatId, `Request is ${current.expires_at <= now && current.status === "pending" ? "expired" : current.status}; no change made.`);
      return true;
    }
    nextStatus = action === "approve" ? "approved" : "denied";
    result = await env.DB.prepare("UPDATE access_requests SET status = ?, telegram_user_id = ?, telegram_username = ?, approved_at = ?, updated_at = ? WHERE request_id = ? AND status = 'pending' AND expires_at > ?")
      .bind(nextStatus, String(message.from.id), message.from.username ?? null, nextStatus === "approved" ? now : null, now, requestId, now).run();
  } else if (action === "revoke") {
    if (current.status !== "pending" && current.status !== "approved") {
      await sendText(env, chatId, `Request is ${current.status}; it cannot be revoked.`);
      return true;
    }
    nextStatus = "revoked";
    result = await env.DB.prepare("UPDATE access_requests SET status = 'revoked', updated_at = ? WHERE request_id = ? AND status IN ('pending','approved')")
      .bind(now, requestId).run();
  } else {
    if (!["revoked", "denied", "expired"].includes(current.status)) {
      await sendText(env, chatId, `Request is ${current.status}; it cannot be restored.`);
      return true;
    }
    nextStatus = "approved";
    result = await env.DB.prepare("UPDATE access_requests SET status = 'approved', approved_at = ?, expires_at = ?, updated_at = ? WHERE request_id = ? AND status IN ('revoked','denied','expired')")
      .bind(now, now + 24 * 60 * 60 * 1000, now, requestId).run();
  }
  const changes = (result as { meta?: { changes?: number } }).meta?.changes;
  await sendText(env, chatId, changes === 0 ? "Request changed in another action; refresh /status before retrying." : `Request ${requestId} updated to ${nextStatus}.`);
  return true;
}
async function handleDiagnosticBotCommand(message: any, env: Env): Promise<boolean> {
  const text = String(message?.text || "").trim();
  const command = String(text.split(/\s+/)[0] || "").split("@")[0].toLowerCase();
  const chatId = String(message?.chat?.id ?? "");
  if (!chatId || !["/ping", "/help", "/id", "/webhook"].includes(command)) return false;
  if (command === "/ping") {
    await sendText(env, chatId, "Pong — AyeLayBot webhook is responding.");
  } else if (command === "/help") {
    await sendText(env, chatId, "Test commands:\n/ping — test a live reply\n/id — show Telegram chat and user IDs\n/webhook — show webhook status\n/start — connect admin\n/admin — receive the secure admin link");
  } else if (command === "/id") {
    await sendText(env, chatId, `chat_id: ${chatId}\nuser_id: ${String(message?.from?.id ?? "unknown")}\nusername: ${message?.from?.username ? "@" + message.from.username : "(none)"}`);
  } else {
    const info = await telegram(env, "getWebhookInfo", {});
    await sendText(env, chatId, `Webhook URL: ${info?.url || "(not set)"}\nPending updates: ${info?.pending_update_count ?? 0}\nLast error: ${info?.last_error_message || "none"}`);
  }
  return true;
}
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const expected = (await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32);
  const received = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!env.TELEGRAM_BOT_TOKEN || !equalSecret(expected, received)) return json({ ok: false }, 401);
  const update = await request.json() as any;
  const message = update.message;
  const callback = update.callback_query;
  if (message && await handleDiagnosticBotCommand(message, env)) return json({ ok: true });
  if (message?.text?.startsWith("/start")) {
    if (!(await isAdminTelegramMessage(message, env))) {
      await sendText(env, String(message.chat.id), "This bot is restricted to the configured administrator.");
      return json({ ok: true });
    }
    const configuredChat = await getSetting(env, ADMIN_CHAT_KEY);
    if (configuredChat && configuredChat !== String(message.chat.id)) {
      await sendText(env, String(message.chat.id), "This bot is already bound to a different administrator account.");
      return json({ ok: true });
    }
    if (!configuredChat) await saveSetting(env, ADMIN_CHAT_KEY, String(message.chat.id));
    const bot = await telegram(env, "getMe", {}).catch(() => null);
    if (bot?.username) await saveSetting(env, "bot_username", String(bot.username));
    await sendText(env, String(message.chat.id), "Admin bot connected. Use /admin for the web control center, /mobilecode for a one-time mobile API login code, /pending to list request codes, and /approve, /deny, /revoke, /restore, /status, or /update to manage a request.");
    return json({ ok: true });
  }
  if (message && await handleAdminBotCommand(message, env)) return json({ ok: true });
  if (message?.text?.trim().split(/\s+/)[0] === "/admin") {
    const isAdmin = await isAdminTelegramMessage(message, env);
    if (!isAdmin) {
      await sendText(env, String(message.chat.id), "This command is restricted to the configured administrator.");
      return json({ ok: true });
    }
    const loginToken = randomToken(32);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO admin_link_tokens (token_hash, expires_at, used_at, created_at) VALUES (?, ?, NULL, ?)").bind(await sha256(loginToken), now + 10 * 60 * 1000, now).run();
    const link = new URL("/admin?login=" + encodeURIComponent(loginToken), request.url).toString();
    await sendText(env, String(message.chat.id), "Secure Admin Control Center link (one use, expires in 10 minutes):\n" + link);
    return json({ ok: true });
  }
  if (callback) {
    const chatId = await getSetting(env, ADMIN_CHAT_KEY);
    const callbackChatId = String(callback.message?.chat?.id ?? "");
    const callbackUserId = String(callback.from?.id ?? "");
    const [action, requestId] = String(callback.data || "").split(":");
    if (!chatId || callbackChatId !== chatId || callbackUserId !== chatId || !requestId || !["approve", "deny"].includes(action)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "Not authorized", show_alert: true }).catch(() => undefined);
      return json({ ok: true });
    }
    const current = await env.DB.prepare("SELECT status, expires_at FROM access_requests WHERE request_id = ?").bind(requestId).first<{ status: AccessStatus; expires_at: number }>();
    if (!current || current.status !== "pending" || current.expires_at <= Date.now()) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "Request expired or already handled" }).catch(() => undefined);
      return json({ ok: true });
    }
    const next: AccessStatus = action === "approve" ? "approved" : "denied";
    await env.DB.prepare("UPDATE access_requests SET status = ?, telegram_user_id = ?, telegram_username = ?, approved_at = ?, updated_at = ? WHERE request_id = ? AND status = 'pending'")
      .bind(next, callbackUserId, callback.from?.username ?? null, next === "approved" ? Date.now() : null, Date.now(), requestId).run();
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: next === "approved" ? "Access approved" : "Access denied" }).catch(() => undefined);
    if (callback.message) await telegram(env, "editMessageReplyMarkup", { chat_id: chatId, message_id: callback.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => undefined);
    return json({ ok: true });
  }
  return json({ ok: true });
}
function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}
async function adminSession(request: Request, env: Env): Promise<{ hash: string } | null> {
  const token = cookieValue(request, "admin_session");
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE session_hash = ?").bind(hash).first<{ expires_at: number }>();
  if (!row || row.expires_at <= Date.now()) return null;
  return { hash };
}
async function handleAdminApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/admin/session" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { token?: string };
    const token = String(body.token || "");
    if (token.length < 24) return json({ error: "Invalid or expired admin link." }, 401);
    const hash = await sha256(token);
    const row = await env.DB.prepare("SELECT expires_at, used_at FROM admin_link_tokens WHERE token_hash = ?").bind(hash).first<{ expires_at: number; used_at: number | null }>();
    if (!row || row.used_at !== null || row.expires_at <= Date.now()) return json({ error: "Admin link expired or already used. Send /admin to the bot again." }, 401);
    const now = Date.now();
    const consumed = await env.DB.prepare("UPDATE admin_link_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").bind(now, hash, now).run() as { meta?: { changes?: number } };
    if (consumed.meta?.changes === 0) return json({ error: "Admin link already used." }, 401);
    const sessionToken = randomToken(32);
    const sessionHash = await sha256(sessionToken);
    await env.DB.prepare("INSERT INTO admin_sessions (session_hash, expires_at, created_at) VALUES (?, ?, ?)").bind(sessionHash, now + 60 * 60 * 1000, now).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": "admin_session=" + sessionToken + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600" } });
  }
  const session = await adminSession(request, env);
  if (!session) return json({ error: "Admin sign-in required. Open the bot and send /admin." }, 401);
  if (url.pathname === "/api/admin/telegram/setup" && request.method === "POST") {
    try {
      await ensureWebhook(env);
      return json({ ok: true, botUsername: await getSetting(env, "bot_username"), webhookUrl: new URL("/api/telegram/webhook", request.url).toString() });
    } catch {
      return json({ error: "Telegram setup failed. Verify the Worker bot-token secret and try again." }, 503);
    }
  }
  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(session.hash).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": "admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" } });
  }
  const settingsKeys = ["zeke_voice_default", "zeke_daily_quotes", "hr_game_cases", "service_fee_note", "payroll_display_note", "linkedin_job_feed_url", "jobnet_job_feed_url", "telegram_channel_url"];
  if (url.pathname === "/api/admin/settings" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT key, value, updated_at FROM app_settings WHERE key IN (" + settingsKeys.map(() => "?").join(",") + ")").bind(...settingsKeys).all<{ key: string; value: string; updated_at: number }>();
    return json({ settings: Object.fromEntries((rows.results || []).map((row) => [row.key, { value: row.value, updatedAt: row.updated_at }])) });
  }
  if (url.pathname === "/api/admin/settings" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { key?: string; value?: string };
    const key = String(body.key || "");
    const value = String(body.value || "");
    if (!settingsKeys.includes(key) || value.length > 30000) return json({ error: "Invalid admin setting." }, 400);
    await saveSetting(env, key, value);
    return json({ ok: true, key });
  }
  if (url.pathname === "/api/admin/video-links" && request.method === "GET") {
    const statusValue = url.searchParams.get("status");
    if (statusValue && !["pending", "approved", "rejected"].includes(statusValue)) return json({ error: "Invalid review status." }, 400);
    try { return json({ links: await listVideoLinks(env, statusValue as "pending" | "approved" | "rejected" | undefined) }); }
    catch (error) { return videoLinkErrorResponse(error); }
  }
  if (url.pathname === "/api/admin/video-links" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try { return json({ ok: true, link: await addVideoLink(env, body as Parameters<typeof addVideoLink>[1], "manual") }, 201); }
    catch (error) { return videoLinkErrorResponse(error); }
  }
  if (url.pathname === "/api/admin/video-links/review" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { id?: string | number; status?: string };
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!/^\d{1,20}$/.test(id) || !["pending", "approved", "rejected"].includes(status)) return json({ error: "Invalid video review update." }, 400);
    try {
      const updated = await updateVideoReviewStatus(env, id, status as "pending" | "approved" | "rejected");
      return updated ? json({ ok: true }) : json({ error: "Video link not found." }, 404);
    } catch (error) { return videoLinkErrorResponse(error); }
  }
  if (url.pathname === "/api/admin/overview" && request.method === "GET") {
    const requests = await env.DB.prepare("SELECT request_id, requester_name, status, telegram_username, expires_at, approved_at, created_at, updated_at, ip_address, country, city FROM access_requests ORDER BY created_at DESC LIMIT 200").all();
    const payments = await env.DB.prepare("SELECT id, request_id, requester_name, amount, currency, method, reference, status, note, recorded_at, updated_at FROM payment_records ORDER BY recorded_at DESC LIMIT 200").all();
    return json({ requests: requests.results || [], payments: payments.results || [] });
  }
  if (url.pathname === "/api/admin/requests/revoke" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string };
    const requestId = String(body.requestId || "");
    if (requestId.length < 8) return json({ error: "Invalid request ID." }, 400);
    await env.DB.prepare("UPDATE access_requests SET status = 'revoked', updated_at = ? WHERE request_id = ? AND status IN ('pending','approved')").bind(Date.now(), requestId).run();
    return json({ ok: true });
  }
  if (url.pathname === "/api/admin/requests/restore" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string };
    const requestId = String(body.requestId || "");
    if (requestId.length < 8) return json({ error: "Invalid request ID." }, 400);
    const now = Date.now();
    const result = await env.DB.prepare("UPDATE access_requests SET status = 'approved', approved_at = ?, expires_at = ?, updated_at = ? WHERE request_id = ? AND status IN ('revoked','denied','expired')")
      .bind(now, now + 24 * 60 * 60 * 1000, now, requestId).run() as { meta?: { changes?: number } };
    if (result.meta?.changes === 0) return json({ error: "Only revoked, denied, or expired requests can be restored." }, 400);
    return json({ ok: true });
  }
  if (url.pathname === "/api/admin/payments" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string; amount?: number; method?: string; reference?: string; note?: string; status?: string };
    const requestId = String(body.requestId || "");
    const amount = Math.floor(Number(body.amount));
    const method = String(body.method || "");
    const allowedMethods = ["KBZPay", "Bank transfer", "Cash", "Other"];
    const status = String(body.status || "pending");
    if (requestId.length < 8 || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !allowedMethods.includes(method) || !["pending","confirmed","rejected"].includes(status)) return json({ error: "Check the payment fields and try again." }, 400);
    const requestRow = await env.DB.prepare("SELECT requester_name FROM access_requests WHERE request_id = ?").bind(requestId).first<{ requester_name: string }>();
    if (!requestRow) return json({ error: "Access request not found." }, 404);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO payment_records (request_id, requester_name, amount, currency, method, reference, status, note, recorded_at, updated_at) VALUES (?, ?, ?, 'MMK', ?, ?, ?, ?, ?, ?)").bind(requestId, requestRow.requester_name, amount, method, String(body.reference || "").slice(0, 160) || null, status, String(body.note || "").slice(0, 500) || null, now, now).run();
    return json({ ok: true });
  }
  if (url.pathname === "/api/admin/payments/update" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { id?: number; status?: string; reference?: string; note?: string };
    const id = Math.floor(Number(body.id));
    const status = String(body.status || "");
    if (!Number.isInteger(id) || id < 1 || !["pending","confirmed","rejected"].includes(status)) return json({ error: "Invalid payment update." }, 400);
    await env.DB.prepare("UPDATE payment_records SET status = ?, reference = ?, note = ?, updated_at = ? WHERE id = ?").bind(status, String(body.reference || "").slice(0, 160) || null, String(body.note || "").slice(0, 500) || null, Date.now(), id).run();
    return json({ ok: true });
  }
  return json({ error: "Admin endpoint not found." }, 404);
}

const MOBILE_ACCESS_TTL_MS = 15 * 60 * 1000;
const MOBILE_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function mobileCorsHeaders(request: Request, url: URL, env: Env): Headers | null | false {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const configured = (env.MOBILE_APP_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (origin !== url.origin && !configured.includes(origin)) return false;
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-max-age": "600",
    "vary": "Origin",
  });
}

async function mobileSessionForAccessToken(request: Request, env: Env): Promise<{ sessionId: string } | null> {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(authorization);
  if (!match) return null;
  const now = Date.now();
  const tokenHash = await sha256(match[1]);
  const row = await env.DB.prepare("SELECT session_id FROM mobile_sessions WHERE access_token_hash = ? AND access_expires_at > ? AND revoked_at IS NULL LIMIT 1")
    .bind(tokenHash, now).first<{ session_id: string }>();
  if (!row) return null;
  await env.DB.prepare("UPDATE mobile_sessions SET last_used_at = ? WHERE session_id = ? AND revoked_at IS NULL").bind(now, row.session_id).run();
  return { sessionId: row.session_id };
}

async function handleMobileApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/mobile/auth/exchange" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { code?: string };
    const code = String(body.code || "");
    if (code.length < 32 || code.length > 128) return json({ error: "Invalid or expired login code." }, 401);
    const now = Date.now();
    const codeHash = await sha256(code);
    const codeRow = await env.DB.prepare("SELECT expires_at, used_at FROM mobile_login_codes WHERE code_hash = ? LIMIT 1")
      .bind(codeHash).first<{ expires_at: number; used_at: number | null }>();
    if (!codeRow || codeRow.used_at !== null || codeRow.expires_at <= now) return json({ error: "Invalid or expired login code." }, 401);
    const consumed = await env.DB.prepare("UPDATE mobile_login_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?")
      .bind(now, codeHash, now).run() as { meta?: { changes?: number } };
    if (consumed.meta?.changes !== 1) return json({ error: "Invalid or expired login code." }, 401);

    const sessionId = randomToken(18);
    const accessToken = randomToken(32);
    const refreshToken = randomToken(48);
    const accessExpiresAt = now + MOBILE_ACCESS_TTL_MS;
    const refreshExpiresAt = now + MOBILE_REFRESH_TTL_MS;
    await env.DB.prepare("DELETE FROM mobile_sessions WHERE refresh_expires_at <= ? OR revoked_at IS NOT NULL").bind(now).run();
    await env.DB.prepare("INSERT INTO mobile_sessions (session_id, access_token_hash, access_expires_at, refresh_token_hash, refresh_expires_at, revoked_at, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)")
      .bind(sessionId, await sha256(accessToken), accessExpiresAt, await sha256(refreshToken), refreshExpiresAt, now, now).run();
    return json({ tokenType: "Bearer", accessToken, refreshToken, accessExpiresAt: new Date(accessExpiresAt).toISOString(), refreshExpiresAt: new Date(refreshExpiresAt).toISOString() });
  }

  if (path === "/api/mobile/auth/refresh" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { refreshToken?: string };
    const refreshToken = String(body.refreshToken || "");
    if (refreshToken.length < 32 || refreshToken.length > 256) return json({ error: "Invalid or expired refresh token." }, 401);
    const now = Date.now();
    const oldHash = await sha256(refreshToken);
    const row = await env.DB.prepare("SELECT session_id FROM mobile_sessions WHERE refresh_token_hash = ? AND refresh_expires_at > ? AND revoked_at IS NULL LIMIT 1")
      .bind(oldHash, now).first<{ session_id: string }>();
    if (!row) return json({ error: "Invalid or expired refresh token." }, 401);
    const accessToken = randomToken(32);
    const nextRefreshToken = randomToken(48);
    const accessExpiresAt = now + MOBILE_ACCESS_TTL_MS;
    const refreshExpiresAt = now + MOBILE_REFRESH_TTL_MS;
    const rotated = await env.DB.prepare("UPDATE mobile_sessions SET access_token_hash = ?, access_expires_at = ?, refresh_token_hash = ?, refresh_expires_at = ?, last_used_at = ? WHERE session_id = ? AND refresh_token_hash = ? AND refresh_expires_at > ? AND revoked_at IS NULL")
      .bind(await sha256(accessToken), accessExpiresAt, await sha256(nextRefreshToken), refreshExpiresAt, now, row.session_id, oldHash, now).run() as { meta?: { changes?: number } };
    if (rotated.meta?.changes !== 1) return json({ error: "Invalid or expired refresh token." }, 401);
    return json({ tokenType: "Bearer", accessToken, refreshToken: nextRefreshToken, accessExpiresAt: new Date(accessExpiresAt).toISOString(), refreshExpiresAt: new Date(refreshExpiresAt).toISOString() });
  }

  const isMobileAdminPath = path.startsWith("/api/mobile/admin/");
  const isLogout = path === "/api/mobile/auth/logout" && request.method === "POST";
  if (!isMobileAdminPath && !isLogout) return json({ error: "Mobile endpoint not found." }, 404);
  const session = await mobileSessionForAccessToken(request, env);
  if (!session) return json({ error: "Bearer authentication required." }, 401);
  if (isLogout) {
    await env.DB.prepare("UPDATE mobile_sessions SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL").bind(Date.now(), session.sessionId).run();
    return json({ ok: true });
  }
  if (path === "/api/mobile/admin/telegram/setup" && request.method === "POST") {
    try {
      await ensureWebhook(env);
      return json({ ok: true, botUsername: await getSetting(env, "bot_username"), webhookUrl: new URL("/api/telegram/webhook", request.url).toString() });
    } catch {
      return json({ error: "Telegram setup failed. Verify the Worker bot-token secret and try again." }, 503);
    }
  }

  if (path === "/api/mobile/admin/overview" && request.method === "GET") {
    const requests = await env.DB.prepare("SELECT request_id, requester_name, status, telegram_username, expires_at, approved_at, created_at, updated_at, ip_address, country, city FROM access_requests ORDER BY created_at DESC LIMIT 200").all();
    const payments = await env.DB.prepare("SELECT id, request_id, requester_name, amount, currency, method, reference, status, note, recorded_at, updated_at FROM payment_records ORDER BY recorded_at DESC LIMIT 200").all();
    return json({ requests: requests.results || [], payments: payments.results || [] });
  }
  if (path === "/api/mobile/admin/requests/revoke" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string };
    const requestId = String(body.requestId || "");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) return json({ error: "Invalid request ID." }, 400);
    const result = await env.DB.prepare("UPDATE access_requests SET status = 'revoked', updated_at = ? WHERE request_id = ? AND status IN ('pending','approved')").bind(Date.now(), requestId).run() as { meta?: { changes?: number } };
    return result.meta?.changes === 0 ? json({ error: "Request not found or cannot be revoked." }, 404) : json({ ok: true });
  }
  if (path === "/api/mobile/admin/requests/restore" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string };
    const requestId = String(body.requestId || "");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) return json({ error: "Invalid request ID." }, 400);
    const now = Date.now();
    const result = await env.DB.prepare("UPDATE access_requests SET status = 'approved', approved_at = ?, expires_at = ?, updated_at = ? WHERE request_id = ? AND status IN ('revoked','denied','expired')")
      .bind(now, now + 24 * 60 * 60 * 1000, now, requestId).run() as { meta?: { changes?: number } };
    return result.meta?.changes === 0 ? json({ error: "Only revoked, denied, or expired requests can be restored." }, 400) : json({ ok: true });
  }
  if (path === "/api/mobile/admin/payments" && request.method === "GET") {
    const payments = await env.DB.prepare("SELECT id, request_id, requester_name, amount, currency, method, reference, status, note, recorded_at, updated_at FROM payment_records ORDER BY recorded_at DESC LIMIT 200").all();
    return json({ payments: payments.results || [] });
  }
  if (path === "/api/mobile/admin/payments" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { requestId?: string; amount?: number; method?: string; reference?: string; note?: string; status?: string };
    const requestId = String(body.requestId || "");
    const amount = Math.floor(Number(body.amount));
    const method = String(body.method || "");
    const status = String(body.status || "pending");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId) || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !["KBZPay", "Bank transfer", "Cash", "Other"].includes(method) || !["pending", "confirmed", "rejected"].includes(status)) return json({ error: "Check the payment fields and try again." }, 400);
    const requestRow = await env.DB.prepare("SELECT requester_name FROM access_requests WHERE request_id = ?").bind(requestId).first<{ requester_name: string }>();
    if (!requestRow) return json({ error: "Access request not found." }, 404);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO payment_records (request_id, requester_name, amount, currency, method, reference, status, note, recorded_at, updated_at) VALUES (?, ?, ?, 'MMK', ?, ?, ?, ?, ?, ?)")
      .bind(requestId, requestRow.requester_name, amount, method, String(body.reference || "").slice(0, 160) || null, status, String(body.note || "").slice(0, 500) || null, now, now).run();
    return json({ ok: true }, 201);
  }
  if (path === "/api/mobile/admin/payments/update" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { id?: number; status?: string; reference?: string; note?: string };
    const id = Math.floor(Number(body.id));
    const status = String(body.status || "");
    if (!Number.isInteger(id) || id < 1 || !["pending", "confirmed", "rejected"].includes(status)) return json({ error: "Invalid payment update." }, 400);
    await env.DB.prepare("UPDATE payment_records SET status = ?, reference = ?, note = ?, updated_at = ? WHERE id = ?")
      .bind(status, String(body.reference || "").slice(0, 160) || null, String(body.note || "").slice(0, 500) || null, Date.now(), id).run();
    return json({ ok: true });
  }
  if (path === "/api/mobile/admin/video-links" && request.method === "GET") {
    const status = url.searchParams.get("status");
    if (status && !["pending", "approved", "rejected"].includes(status)) return json({ error: "Invalid review status." }, 400);
    try { return json({ links: await listVideoLinks(env, status as "pending" | "approved" | "rejected" | undefined) }); }
    catch (error) { return videoLinkErrorResponse(error); }
  }
  if (path === "/api/mobile/admin/video-links" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try { return json({ ok: true, link: await addVideoLink(env, body as Parameters<typeof addVideoLink>[1], "manual") }, 201); }
    catch (error) { return videoLinkErrorResponse(error); }
  }
  if (path === "/api/mobile/admin/video-links/review" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { id?: string | number; status?: string };
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!/^\d{1,20}$/.test(id) || !["pending", "approved", "rejected"].includes(status)) return json({ error: "Invalid video review update." }, 400);
    try {
      const updated = await updateVideoReviewStatus(env, id, status as "pending" | "approved" | "rejected");
      return updated ? json({ ok: true }) : json({ error: "Video link not found." }, 404);
    } catch (error) { return videoLinkErrorResponse(error); }
  }
  return json({ error: "Mobile admin endpoint not found." }, 404);
}

function unwrapInput(value: any): any {
  if (value && typeof value === "object" && value["0"] !== undefined) return value["0"]?.json ?? value["0"];
  if (value && typeof value === "object" && value.json !== undefined) return value.json;
  return value ?? {};
}
async function readTrpcInput(request: Request, url: URL): Promise<any> {
  if (request.method === "GET") {
    const raw = url.searchParams.get("input");
    return raw ? unwrapInput(JSON.parse(raw)) : {};
  }
  return unwrapInput(await request.json());
}
async function handleTrpc(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = decodeURIComponent(url.pathname.slice("/api/trpc/".length));
  if (route === "auth.me") return trpcResult(null);
  if (route !== "calculatorAccess.request" && route !== "calculatorAccess.status") return trpcError("Procedure is not available on this Worker", 404);
  try {
    const input = await readTrpcInput(request, url);
    if (route === "calculatorAccess.request") {
      const requesterName = String(input?.requesterName ?? "").trim();
      if (request.method !== "POST" || requesterName.length < 2 || requesterName.length > 160) return trpcError("Enter your name to request access.");
      const requestId = randomToken(18);
      const token = randomToken(32);
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;
      const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
      const ipAddress = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null;
      const country = (cf?.country || "").slice(0, 8) || null;
      const city = (cf?.city || "").slice(0, 120) || null;
      await env.DB.prepare("INSERT INTO access_requests (request_id, requester_name, token_hash, status, expires_at, created_at, updated_at, ip_address, country, city) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)")
        .bind(requestId, requesterName, await sha256(token), expiresAt, now, now, ipAddress, country, city).run();
      const adminChat = await getSetting(env, ADMIN_CHAT_KEY);
      let adminNotified = false;
      let webhookReady = false;
      try { webhookReady = await targetWebhookReady(env); } catch { /* Keep the saved request even if bot status cannot be checked. */ }
      if (adminChat && webhookReady) {
        const originLabel = [city, country].filter(Boolean).join(", ") || ipAddress || "Unknown origin";
        try {
          await sendText(env, adminChat, `Payroll access request\n\nName: ${requesterName}\nOrigin: ${originLabel}\nRequest ID: ${requestId}\nExpires in 10 minutes.`, { inline_keyboard: [[{ text: "Approve", callback_data: `approve:${requestId}` }, { text: "Deny", callback_data: `deny:${requestId}` }]] });
          adminNotified = true;
        } catch { /* Notification failure must not discard or hide the saved request. */ }
      }
      const botUsername = TARGET_TELEGRAM_BOT_USERNAME;
      return trpcResult({ requestId, token, expiresAt: new Date(expiresAt).toISOString(), botUsername, adminNotified });
    }
    const requestId = String(input?.requestId ?? "");
    const token = String(input?.token ?? "");
    if (requestId.length < 8 || token.length < 16) return trpcError("Invalid access request.");
    const row = await env.DB.prepare("SELECT status, expires_at FROM access_requests WHERE request_id = ? AND token_hash = ?")
      .bind(requestId, await sha256(token)).first<{ status: AccessStatus; expires_at: number }>();
    if (!row) return trpcResult({ status: "invalid" });
    if (row.status === "pending" && row.expires_at <= Date.now()) {
      await env.DB.prepare("UPDATE access_requests SET status = 'expired', updated_at = ? WHERE request_id = ? AND status = 'pending'").bind(Date.now(), requestId).run();
      return trpcResult({ status: "expired" });
    }
    return trpcResult({ status: row.status, expiresAt: new Date(row.expires_at).toISOString() });
  } catch (error) {
    if (route === "calculatorAccess.request") return trpcError("Your request could not be saved. Please try again.", 503);
    return trpcError(error instanceof Error ? error.message : "Request failed", 500);
  }
}

const accessRecoveryScript = `<script id="access-session-recovery">
(() => {
  const key = "zin-portfolio-access";
  const terminal = new Set(["denied", "expired", "revoked", "invalid"]);
  let checking = false;
  async function checkAccessStatus() {
    if (checking) return;
    let session;
    try { session = JSON.parse(localStorage.getItem(key) || "null"); } catch { return; }
    if (!session?.requestId || !session?.token) return;
    checking = true;
    try {
      const response = await fetch("/api/trpc/calculatorAccess.status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { requestId: session.requestId, token: session.token } }),
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) return;
      const result = await response.json();
      const status = result?.[0]?.result?.data?.json?.status;
      if (terminal.has(status)) {
        localStorage.removeItem(key);
        location.reload();
      }
    } catch {} finally { checking = false; }
  }
  void checkAccessStatus();
  window.setInterval(checkAccessStatus, 2500);
})();
</script>`;

async function serveAssetsWithAccessRecovery(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (request.method !== "GET" || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) return response;
  const html = await response.text();
  if (html.includes('id="access-session-recovery"')) return new Response(html, response);
  const jobFeedScript = await jobFeedBootstrap(env).catch(() => "");
  let zekeSettingsScript = `<script id="zeke-settings">window.__ZEKE_SETTINGS__={};</script>`;
  try {
    const [quoteSetting, voiceSetting] = await Promise.all([getSetting(env, "zeke_daily_quotes"), getSetting(env, "zeke_voice_default")]);
    const settings = { quotes: quoteSetting ? quoteSetting.split("\n").map((value) => value.trim()).filter(Boolean) : [], voiceDefault: voiceSetting || "off" };
    zekeSettingsScript = `<script id="zeke-settings">window.__ZEKE_SETTINGS__=${JSON.stringify(settings).replace(/</g, "\\u003c")}</script>`;
  } catch {}
  const body = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${zekeSettingsScript}${accessRecoveryScript}${jobFeedScript}</body>`)
    : `${html}${zekeSettingsScript}${accessRecoveryScript}${jobFeedScript}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") return handleWebhook(request, env);
    if (url.pathname === "/api/telegram/bootstrap") {
      if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
      try {
        await ensureWebhook(env);
        return json({ ok: true, botUsername: await getSetting(env, "bot_username") });
      } catch {
        return json({ ok: false, error: "Telegram is not connected to @ayelay_bot. Set TELEGRAM_BOT_TOKEN to the token for that bot, then reload this page." }, 503);
      }
    }
    if (url.pathname === "/api/telegram/status") {
      if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
      try {
        await ensureWebhook(env);
        const info = await telegram(env, "getWebhookInfo", {});
        return json({ ok: true, botUsername: await getSetting(env, "bot_username"), webhookUrl: info?.url || null, pendingUpdates: info?.pending_update_count ?? 0, lastError: info?.last_error_message || null });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : "Telegram status check failed." }, 503);
      }
    }
    if (url.pathname.startsWith("/api/mobile/")) {
      const cors = mobileCorsHeaders(request, url, env);
      if (cors === false) return json({ error: "Origin not allowed." }, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors || undefined });
      const response = await handleMobileApi(request, env);
      if (!cors) return response;
      const headers = new Headers(response.headers);
      cors.forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    if (url.pathname === "/api/event-videos" && request.method === "GET") {
      try { return json({ links: await listPublicDiscoveredVideoLinks(env), updatedAt: new Date().toISOString() }); }
      catch (error) { return videoLinkErrorResponse(error); }
    }
    if (url.pathname.startsWith("/api/admin/")) return handleAdminApi(request, env);
    if (url.pathname.startsWith("/api/trpc/")) return handleTrpc(request, env);
    if (url.pathname === "/api/health") {
      let telegramWebhookReady = false;
      try { telegramWebhookReady = await targetWebhookReady(env); } catch { /* Health remains available while D1 is unavailable. */ }
      return json({ ok: true, backend: "cloudflare-worker", telegramWebhookReady });
    }
    return serveAssetsWithAccessRecovery(request, env);
  },
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const result = await runDailyYouTubeDiscovery(env);
    console.log(JSON.stringify({ event: "daily_youtube_video_discovery", ...result }));
  },
};
