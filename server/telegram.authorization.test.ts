import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createTelegramMessage: vi.fn(),
  getAccessRequest: vi.fn(),
  getAccessRequestByRequestId: vi.fn(),
  getTelegramMessageByExternalId: vi.fn(),
  getTelegramSetting: vi.fn(),
  updateAccessRequest: vi.fn(),
  upsertTelegramSetting: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

function telegramFetchMock() {
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(
    JSON.stringify({ ok: true, result: { message_id: 100 } }),
    { headers: { "content-type": "application/json" } },
  ));
}

async function loadTelegramHandler() {
  vi.resetModules();
  return import("./telegram");
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token");
  vi.stubEnv("TELEGRAM_ADMIN_USERNAME", "@zinmin2244");
  vi.stubEnv("TELEGRAM_ADMIN_USER_ID", "424242");
  dbMocks.createTelegramMessage.mockReset();
  dbMocks.getAccessRequest.mockReset();
  dbMocks.getAccessRequestByRequestId.mockReset();
  dbMocks.getTelegramMessageByExternalId.mockReset().mockResolvedValue(undefined);
  dbMocks.getTelegramSetting.mockReset().mockResolvedValue("424242");
  dbMocks.updateAccessRequest.mockReset();
  dbMocks.upsertTelegramSetting.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Telegram admin-only access", () => {
  it("rejects and does not forward messages from non-admin Telegram users", async () => {
    const telegramFetch = telegramFetchMock();
    vi.stubGlobal("fetch", telegramFetch);
    const { handleTelegramWebhook } = await loadTelegramHandler();

    await handleTelegramWebhook({
      message: {
        message_id: 1,
        chat: { id: 555555 },
        from: { id: 555555, username: "guest" },
        text: "Please help me with my request",
      },
    });

    expect(telegramFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(telegramFetch.mock.calls[0][1]?.body))).toMatchObject({
      chat_id: "555555",
      text: "This bot is restricted to the configured administrator.",
    });
    expect(dbMocks.createTelegramMessage).toHaveBeenCalledTimes(1);
    expect(dbMocks.createTelegramMessage.mock.calls[0][0]).toMatchObject({
      direction: "outbound",
      messageText: "This bot is restricted to the configured administrator.",
    });
  });

  it("rejects a matching username when the numeric Telegram admin ID does not match", async () => {
    const telegramFetch = telegramFetchMock();
    vi.stubGlobal("fetch", telegramFetch);
    const { handleTelegramWebhook } = await loadTelegramHandler();

    await handleTelegramWebhook({
      message: {
        message_id: 2,
        chat: { id: 555555 },
        from: { id: 555555, username: "zinmin2244" },
        text: "/start",
      },
    });

    expect(telegramFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(telegramFetch.mock.calls[0][1]?.body)).text).toBe(
      "This bot is restricted to the configured administrator.",
    );
    expect(dbMocks.upsertTelegramSetting).not.toHaveBeenCalled();
  });

  it("allows the configured admin to use the connected bot chat", async () => {
    const telegramFetch = telegramFetchMock();
    vi.stubGlobal("fetch", telegramFetch);
    const { handleTelegramWebhook } = await loadTelegramHandler();

    await handleTelegramWebhook({
      message: {
        message_id: 3,
        chat: { id: 424242 },
        from: { id: 424242, username: "zinmin2244" },
        text: "hello",
      },
    });

    expect(telegramFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(telegramFetch.mock.calls[0][1]?.body))).toMatchObject({
      chat_id: "424242",
      text: "Admin bot connected. Use the website admin panel to review and manage access requests.",
    });
  });
});
