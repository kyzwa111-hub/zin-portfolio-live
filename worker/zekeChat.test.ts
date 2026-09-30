import { describe, expect, it, vi } from "vitest";
import worker, { ZEKE_DEFAULT_MODEL } from "./index";

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
      model: ZEKE_DEFAULT_MODEL,
    });
    expect(testEnv.AI.run).toHaveBeenCalledOnce();
  });

  it("accepts an OpenAI-compatible chat completion response", async () => {
    const testEnv = env({ choices: [{ message: { content: "Payroll guidance from chat completion" } }] });
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "How does payroll work?" }] }),
      }),
      testEnv as never
    );
    expect(await response.json()).toMatchObject({ reply: "Payroll guidance from chat completion", model: ZEKE_DEFAULT_MODEL });
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

  it("rejects repetitive model output and uses a practical workplace fallback", async () => {
    const testEnv = env({ response: "အေထောက်အပံ့ပါ အေထောက်အပံ့ပါ အေထောက်အပံ့ပါ အေထောက်အပံ့ပါ အေထောက်အပံ့ပါ" });
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Attendance issue ကို ဘယ်လို စီမံမလဲ?" }] }),
      }),
      testEnv as never
    );
    expect(((await response.json()) as { reply: string }).reply).toContain("attendance record");
  });

  it("rejects an off-topic model answer for a payroll question", async () => {
    const testEnv = env({ response: "ဒီနေ့ မိုးရာသီအကြောင်းကို ပျော်ရွှင်စွာ ပြောကြရအောင်။ အားလုံးကောင်းမွန်ပါစေ။" });
    const response = await worker.fetch(
      new Request("https://example.com/api/zeke/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Payroll calculation ကို ဘယ်လိုသုံးမလဲ?" }] }),
      }),
      testEnv as never
    );
    expect(((await response.json()) as { reply: string }).reply).toContain("Payroll");
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
