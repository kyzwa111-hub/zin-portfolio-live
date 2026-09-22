import { describe, expect, it } from "vitest";

describe("Telegram bot configuration", () => {
  it("authenticates the configured bot token with getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { ok?: boolean; result?: { is_bot?: boolean } };
    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
  }, 15_000);
});
