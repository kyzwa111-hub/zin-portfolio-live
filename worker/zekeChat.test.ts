import { describe, expect, it, vi } from "vitest";
import worker from "./index";

type TestEnv = {
  ASSETS: { fetch: typeof fetch };
  DB: { prepare: () => never };
  AI: { run: ReturnType<typeof vi.fn> };
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_USERNAME: string;
};

function env(aiResult: unknown = { response: "Cloudflare AI reply" }): TestEnv {
  return {
    ASSETS: { fetch: vi.fn() as unknown as typeof fetch },
    DB: { prepare: vi.fn() as never },
    AI: { run: vi.fn().mockResolvedValue(aiResult) },
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_ADMIN_USERNAME: "admin",
  };
}

describe("Zeke AI chat endpoint", () => {
  it("returns a Cloudflare AI response for a conversation", async () => {
    const testEnv = env({ response: "Payroll guidance from AI" });
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "How does payroll work?" }],
        }),
      }),
      testEnv as never
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reply: "Payroll guidance from AI",
      model: "@cf/meta/llama-3.1-8b-instruct",
    });
    expect(testEnv.AI.run).toHaveBeenCalledOnce();
  });

  it("falls back to a useful response when Cloudflare AI is unavailable", async () => {
    const testEnv = env();
    testEnv.AI.run.mockRejectedValueOnce(new Error("AI unavailable"));
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "How do I use payroll?" }],
        }),
      }),
      testEnv as never
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { reply: string }).reply).toContain(
      "Payroll"
    );
  });

  it("rejects an empty conversation", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
      env() as never
    );
    expect(response.status).toBe(400);
  });
});
