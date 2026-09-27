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
      if (await getSetting(env, WEBHOOK_URL_KEY) === desiredUrl) return;
      const secret = (await sha256(env.TELEGRAM_BOT_TOKEN)).slice(0, 32);
      await telegram(env, "setWebhook", { url: desiredUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] });
      await saveSetting(env, WEBHOOK_URL_KEY, desiredUrl);
      const bot = await telegram(env, "getMe", {});u
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
      const received = req
