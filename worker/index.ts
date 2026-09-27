interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
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
}

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
    await sendText(env, String(message.chat.id), "Telegram admin approval is connected. You will receive access requests here.");
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
      await env.DB.prepare("INSERT INTO access_requests (request_id, requester_name, token_hash, status, expires_at, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)")
        .bind(requestId, requesterName, await sha256(token), expiresAt, now, now).run();
      const adminChat = await getSetting(env, ADMIN_CHAT_KEY);
      let adminNotified = false;
      if (adminChat) {
        await sendText(env, adminChat, `Payroll access request\n\nName: ${requesterName}\nRequest ID: ${requestId}\nExpires in 10 minutes.`, { inline_keyboard: [[{ text: "Approve", callback_data: `approve:${requestId}` }, { text: "Deny", callback_data: `deny:${requestId}` }]] });
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") return handleWebhook(request, env);
    if (url.pathname.startsWith("/api/trpc/")) return handleTrpc(request, env);
    if (url.pathname === "/api/health") {
      let telegramWebhookReady = false;
      if (env.TELEGRAM_BOT_TOKEN && adminUsername(env)) {
        try { await ensureWebhook(request, env); telegramWebhookReady = true; } catch { telegramWebhookReady = false; }
      }
      return json({ ok: true, backend: "cloudflare-worker", telegramWebhookReady });
    }
    return env.ASSETS.fetch(request);
  },
};
