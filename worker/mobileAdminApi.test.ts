import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import worker from "./index";

type CodeRow = { expires_at: number; used_at: number | null };
type SessionRow = {
  session_id: string;
  access_token_hash: string;
  access_expires_at: number;
  refresh_token_hash: string;
  refresh_expires_at: number;
  revoked_at: number | null;
  last_used_at: number | null;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

class MockStatement {
  private params: unknown[] = [];
  constructor(private db: MockD1, private sql: string) {}
  bind(...params: unknown[]) { this.params = params; return this; }
  async first<T>() { return this.db.first(this.sql, this.params) as T | null; }
  async all<T>() { return this.db.all(this.sql, this.params) as { results: T[] }; }
  async run() { return this.db.run(this.sql, this.params); }
}

class MockD1 {
  codes = new Map<string, CodeRow>();
  sessions = new Map<string, SessionRow>();
  settings = new Map<string, string>([["admin_chat_id", "424242"]]);
  requests = new Map<string, { status: string; expires_at: number }>();
  prepare(sql: string) { return new MockStatement(this, sql); }
  first(sql: string, params: unknown[]) {
    if (sql.includes("FROM app_settings")) {
      const value = this.settings.get(String(params[0]));
      return value === undefined ? null : { value };
    }
    if (sql.includes("SELECT status, expires_at FROM access_requests")) return this.requests.get(String(params[0])) || null;
    if (sql.includes("FROM mobile_login_codes")) return this.codes.get(String(params[0])) || null;
    if (sql.includes("FROM mobile_sessions WHERE access_token_hash")) {
      return [...this.sessions.values()].find((row) => row.access_token_hash === params[0] && row.access_expires_at > Number(params[1]) && row.revoked_at === null) || null;
    }
    if (sql.includes("FROM mobile_sessions WHERE refresh_token_hash")) {
      return [...this.sessions.values()].find((row) => row.refresh_token_hash === params[0] && row.refresh_expires_at > Number(params[1]) && row.revoked_at === null) || null;
    }
    if (sql.includes("FROM admin_sessions")) return null;
    return null;
  }
  all(sql: string) {
    if (sql.includes("FROM access_requests")) return { results: [] };
    if (sql.includes("FROM payment_records")) return { results: [] };
    return { results: [] };
  }
  run(sql: string, params: unknown[]) {
    if (sql.includes("INSERT INTO app_settings")) {
      this.settings.set(String(params[0]), String(params[1]));
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE access_requests SET status = ?, telegram_user_id")) {
      const [status, , , , , requestId, now] = params;
      const row = this.requests.get(String(requestId));
      if (!row || row.status !== "pending" || row.expires_at <= Number(now)) return { meta: { changes: 0 } };
      row.status = String(status);
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE mobile_login_codes SET used_at")) {
      const codeHash = String(params[1]);
      const row = this.codes.get(codeHash);
      if (!row || row.used_at !== null || row.expires_at <= Number(params[2])) return { meta: { changes: 0 } };
      row.used_at = Number(params[0]);
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO mobile_sessions")) {
      const [session_id, access_token_hash, access_expires_at, refresh_token_hash, refresh_expires_at, , last_used_at] = params;
      this.sessions.set(String(session_id), {
        session_id: String(session_id),
        access_token_hash: String(access_token_hash),
        access_expires_at: Number(access_expires_at),
        refresh_token_hash: String(refresh_token_hash),
        refresh_expires_at: Number(refresh_expires_at),
        revoked_at: null,
        last_used_at: Number(last_used_at),
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE mobile_sessions SET last_used_at")) {
      const row = this.sessions.get(String(params[1]));
      if (row) row.last_used_at = Number(params[0]);
      return { meta: { changes: row ? 1 : 0 } };
    }
    if (sql.includes("UPDATE mobile_sessions SET access_token_hash")) {
      const [access_token_hash, access_expires_at, refresh_token_hash, refresh_expires_at, last_used_at, session_id, oldRefreshHash, now] = params;
      const row = this.sessions.get(String(session_id));
      if (!row || row.refresh_token_hash !== oldRefreshHash || row.refresh_expires_at <= Number(now) || row.revoked_at !== null) return { meta: { changes: 0 } };
      row.access_token_hash = String(access_token_hash);
      row.access_expires_at = Number(access_expires_at);
      row.refresh_token_hash = String(refresh_token_hash);
      row.refresh_expires_at = Number(refresh_expires_at);
      row.last_used_at = Number(last_used_at);
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 1 } };
  }
}

function env(db = new MockD1()) {
  return {
    DB: db,
    ASSETS: { fetch: async () => new Response("asset") },
    TELEGRAM_BOT_TOKEN: "test-only-token",
    TELEGRAM_ADMIN_USERNAME: "zinmin2244",
  } as any;
}

async function jsonBody(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

describe("mobile admin API authentication", () => {
  it("keeps the health check read-only and does not call Telegram", async () => {
    const telegramFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", telegramFetch);
    try {
      const response = await worker.fetch(new Request("https://app.example/api/health"), env());
      expect(response.status).toBe(200);
      expect(await jsonBody(response)).toEqual({ ok: true, backend: "cloudflare-worker", telegramBotConfigured: true, telegramWebhookConfigured: false });
      expect(telegramFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects admin API requests without a valid Bearer token", async () => {
    const response = await worker.fetch(new Request("https://app.example/api/mobile/admin/overview"), env());
    expect(response.status).toBe(401);
    expect((await jsonBody(response)).error).toBe("Bearer authentication required.");
  });

  it("does not treat a mobile Bearer token as a browser admin cookie", async () => {
    const accessToken = "a".repeat(43);
    const response = await worker.fetch(new Request("https://app.example/api/admin/overview", {
      headers: { authorization: `Bearer ${accessToken}` },
    }), env());
    expect(response.status).toBe(401);
    expect((await jsonBody(response)).error).toContain("Admin sign-in required");
  });

  it("rejects cross-origin browser calls unless the exact origin is configured", async () => {
    const response = await worker.fetch(new Request("https://app.example/api/mobile/auth/exchange", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ code: "x".repeat(43) }),
    }), env());
    expect(response.status).toBe(403);
    expect((await jsonBody(response)).error).toBe("Origin not allowed.");
  });

  it("exchanges a one-use code, allows admin overview, and rejects code reuse", async () => {
    const db = new MockD1();
    const code = "C".repeat(43);
    db.codes.set(hash(code), { expires_at: Date.now() + 60_000, used_at: null });
    const bindings = env(db);
    const exchange = await worker.fetch(new Request("https://app.example/api/mobile/auth/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }), bindings);
    expect(exchange.status).toBe(200);
    const tokens = await jsonBody(exchange);
    expect(tokens.tokenType).toBe("Bearer");
    expect(tokens.accessToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(tokens.refreshToken).toMatch(/^[A-Za-z0-9_-]{60,}$/);

    const overview = await worker.fetch(new Request("https://app.example/api/mobile/admin/overview", {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    }), bindings);
    expect(overview.status).toBe(200);
    expect(await jsonBody(overview)).toEqual({ requests: [], payments: [] });

    const replay = await worker.fetch(new Request("https://app.example/api/mobile/auth/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }), bindings);
    expect(replay.status).toBe(401);
  });

  it("rotates refresh tokens and invalidates the previous refresh token", async () => {
    const db = new MockD1();
    const code = "R".repeat(43);
    db.codes.set(hash(code), { expires_at: Date.now() + 60_000, used_at: null });
    const bindings = env(db);
    const exchange = await worker.fetch(new Request("https://app.example/api/mobile/auth/exchange", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }),
    }), bindings);
    const firstTokens = await jsonBody(exchange);
    const refresh = await worker.fetch(new Request("https://app.example/api/mobile/auth/refresh", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: firstTokens.refreshToken }),
    }), bindings);
    expect(refresh.status).toBe(200);
    const nextTokens = await jsonBody(refresh);
    expect(nextTokens.accessToken).not.toBe(firstTokens.accessToken);
    expect(nextTokens.refreshToken).not.toBe(firstTokens.refreshToken);

    const replay = await worker.fetch(new Request("https://app.example/api/mobile/auth/refresh", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: firstTokens.refreshToken }),
    }), bindings);
    expect(replay.status).toBe(401);
  });

  it("lets the stored numeric admin approve request codes and rejects another Telegram user", async () => {
    const db = new MockD1();
    db.requests.set("ACCESS_12345678", { status: "pending", expires_at: Date.now() + 60_000 });
    db.requests.set("ACCESS_87654321", { status: "pending", expires_at: Date.now() + 60_000 });
    const telegramFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", telegramFetch);
    const bindings = env(db);
    const sendCommand = (userId: number, requestId: string) => worker.fetch(new Request("https://app.example/api/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": hash("test-only-token").slice(0, 32) },
      body: JSON.stringify({ message: { text: `/update ${requestId} approve`, from: { id: userId, username: "zinmin2244" }, chat: { id: userId } } }),
    }), bindings);
    try {
      const authorized = await sendCommand(424242, "ACCESS_12345678");
      expect(authorized.status).toBe(200);
      expect(db.requests.get("ACCESS_12345678")?.status).toBe("approved");

      const unauthorized = await sendCommand(424243, "ACCESS_87654321");
      expect(unauthorized.status).toBe(200);
      expect(db.requests.get("ACCESS_87654321")?.status).toBe("pending");
      expect(telegramFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
