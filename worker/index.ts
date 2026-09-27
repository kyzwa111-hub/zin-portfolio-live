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
  TIDB_DATABASE_URL?: string;
  YOUTUBE_DATA_API_KEY?: string;
}

import { addVideoLink, listVideoLinks, TiDBNotConfiguredError, updateVideoReviewStatus, VideoLinkValidationError } from "./videoLinks";
import { runDailyYouTubeDiscovery } from "./videoDiscovery";

type AccessStatus = "pending" | "approved" | "denied" | "expired" | "revoked";
const ADMIN_CHAT_KEY = "admin_chat_id";
const WEBHOOK_URL_KEY = "webhook_url";

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
async function ensureWebhook(request: Request, env: Env): Promise<void> {
  const desiredUrl = new URL("/api/telegram/webhook", request.url).toString();
  const secret = (await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32);
  const marker = desiredUrl + "|" + secret;
  if (await getSetting(env, WEBHOOK_URL_KEY) === marker) return;
  await telegram(env, "setWebhook", { url: desiredUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] });
  await saveSetting(env, WEBHOOK_URL_KEY, marker);
  const bot = await telegram(env, "getMe", {});
  if (bot?.username) await saveSetting(env, "bot_username", String(bot.username));
}
async function sendText(env: Env, chatId: string, text: string, replyMarkup?: unknown): Promise<any> {
  return telegram(env, "sendMessage", { chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}
function adminUsername(env: Env): string {
  return (env.TELEGRAM_ADMIN_USERNAME || "").replace(/^@/, "").toLowerCase();
}
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const expected = (await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32);
  const received = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!env.TELEGRAM_BOT_TOKEN || !equalSecret(expected, received)) return json({ ok: false }, 401);
  const update = await request.json() as any;
  const message = update.message;
  const callback = update.callback_query;
  if (message?.text?.startsWith("/start")) {
    const username = String(message.from?.username || "").toLowerCase();
    if (!adminUsername(env) || username !== adminUsername(env)) {
      await sendText(env, String(message.chat.id), "This bot is restricted to the configured administrator.");
      return json({ ok: true });
    }
    await saveSetting(env, ADMIN_CHAT_KEY, String(message.chat.id));
    await sendText(env, String(message.chat.id), "Telegram admin approval is connected. Use /admin to get a secure Control Center link. Access requests will appear here.");
    return json({ ok: true });
  }
  if (message?.text?.trim().split(/\s+/)[0] === "/admin") {
    const configuredChat = await getSetting(env, ADMIN_CHAT_KEY);
    const isAdmin = configuredChat === String(message.chat.id) && String(message.from?.username || "").toLowerCase() === adminUsername(env);
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
  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(session.hash).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": "admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" } });
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
      if (!env.TELEGRAM_BOT_TOKEN || !adminUsername(env)) return trpcError("Telegram approval is not configured yet.", 503);
      await ensureWebhook(request, env);
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
      if (adminChat) {
        const originLabel = [city, country].filter(Boolean).join(", ") || ipAddress || "Unknown origin";
        await sendText(env, adminChat, `Payroll access request\n\nName: ${requesterName}\nOrigin: ${originLabel}\nRequest ID: ${requestId}\nExpires in 10 minutes.`, { inline_keyboard: [[{ text: "Approve", callback_data: `approve:${requestId}` }, { text: "Deny", callback_data: `deny:${requestId}` }]] });
        adminNotified = true;
      }
      const botUsername = await getSetting(env, "bot_username") || "";
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
  const body = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${accessRecoveryScript}</body>`)
    : `${html}${accessRecoveryScript}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") return handleWebhook(request, env);
    if (url.pathname.startsWith("/api/admin/")) return handleAdminApi(request, env);
    if (url.pathname.startsWith("/api/trpc/")) return handleTrpc(request, env);
    if (url.pathname === "/api/health") {
      let telegramWebhookReady = false;
      if (env.TELEGRAM_BOT_TOKEN && adminUsername(env)) {
        try { await ensureWebhook(request, env); telegramWebhookReady = true; } catch { telegramWebhookReady = false; }
      }
      return json({ ok: true, backend: "cloudflare-worker", telegramWebhookReady });
    }
    return serveAssetsWithAccessRecovery(request, env);
  },
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const result = await runDailyYouTubeDiscovery(env);
    console.log(JSON.stringify({ event: "daily_youtube_video_discovery", ...result }));
  },
};
