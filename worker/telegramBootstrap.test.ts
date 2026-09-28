import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

class FakeD1Statement {
  private values: unknown[] = [];
  constructor(private sql: string, private settings: Map<string, string>) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() {
    if (this.sql.includes("SELECT value FROM app_settings WHERE key = ?")) {
      const value = this.settings.get(String(this.values[0]));
      return (value === undefined ? null : { value }) as T | null;
    }
    return null;
  }
  async all<T>() { return { results: [] as T[] }; }
  async run() {
    if (this.sql.includes("INSERT INTO app_settings")) this.settings.set(String(this.values[0]), String(this.values[1]));
    return { meta: { changes: 1 } };
  }
}

function fakeEnv(settings = new Map<string, string>(), token = "new-bot-token") {
  return {
    DB: { prepare: (sql: string) => new FakeD1Statement(sql, settings) },
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_ADMIN_USERNAME: "zinmin2244",
    ASSETS: { fetch: vi.fn(async () => new Response("not found", { status: 404 })) },
  };
}

function telegramResponse(username: string) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const method = String(input).split("/").pop();
    if (method === "getMe") return new Response(JSON.stringify({ ok: true, result: { username } }), { status: 200 });
    if (method === "setWebhook") return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
    if (method === "sendMessage") return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    return new Response(JSON.stringify({ ok: false, description: "unexpected method" }), { status: 400 });
  });
}

async function webhookSecret(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

afterEach(() => vi.unstubAllGlobals());

describe("Telegram bot bootstrap", () => {
  it("accepts only @ayechanmoe123, installs the canonical webhook, and is idempotent", async () => {
    const settings = new Map([["bot_username", "Payroll_Officer_bot"], ["webhook_url", "previous-token-marker"]]);
    const env = fakeEnv(settings);
    const telegramFetch = telegramResponse("ayechanmoe123");
    vi.stubGlobal("fetch", telegramFetch);

    const request = () => worker.fetch(new Request("https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/bootstrap"), env as never);
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, botUsername: "ayechanmoe123" });
    expect(settings.get("bot_username")).toBe("ayechanmoe123");
    expect(settings.get("webhook_url")).toContain("https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook|");
    expect(telegramFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(telegramFetch.mock.calls[1][1]?.body))).toMatchObject({
      url: "https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook",
      allowed_updates: ["message", "callback_query"],
    });

    const secondResponse = await request();
    expect(secondResponse.status).toBe(200);
    expect(telegramFetch).toHaveBeenCalledTimes(2);
  });

  it("does not register a webhook for a token belonging to another bot", async () => {
    const settings = new Map([["bot_username", "Payroll_Officer_bot"], ["webhook_url", "previous-token-marker"]]);
    const env = fakeEnv(settings, "wrong-bot-token");
    const telegramFetch = telegramResponse("some_other_bot");
    vi.stubGlobal("fetch", telegramFetch);

    const response = await worker.fetch(new Request("https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/bootstrap"), env as never);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(telegramFetch).toHaveBeenCalledTimes(1);
    expect(settings.get("bot_username")).toBe("Payroll_Officer_bot");
  });

  it("keeps health checks read-only and never deletes the Telegram webhook", async () => {
    const marker = `https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook|${await webhookSecret("new-bot-token")}`;
    const settings = new Map([["bot_username", "ayechanmoe123"], ["webhook_url", marker]]);
    const env = fakeEnv(settings);
    const telegramFetch = telegramResponse("ayechanmoe123");
    vi.stubGlobal("fetch", telegramFetch);

    const response = await worker.fetch(new Request("https://zin-portfolio-live.kyzwa111.workers.dev/api/health"), env as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, telegramWebhookReady: true });
    expect(settings.get("webhook_url")).toBe(marker);
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it("does not let a repeated /start rebind the existing admin chat", async () => {
    const settings = new Map([["admin_chat_id", "111111"]]);
    const env = fakeEnv(settings);
    const telegramFetch = telegramResponse("ayechanmoe123");
    vi.stubGlobal("fetch", telegramFetch);
    const update = { message: { text: "/start", chat: { id: 222222 }, from: { id: 222222, username: "zinmin2244" } } };
    const response = await worker.fetch(new Request("https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": await webhookSecret("new-bot-token") },
      body: JSON.stringify(update),
    }), env as never);
    expect(response.status).toBe(200);
    expect(settings.get("admin_chat_id")).toBe("111111");
    expect(telegramFetch).toHaveBeenCalledTimes(1);
    expect(String(telegramFetch.mock.calls[0][0])).toContain("/sendMessage");
  });
});
