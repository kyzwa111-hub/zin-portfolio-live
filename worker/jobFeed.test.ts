import { describe, expect, it } from "vitest";
import { parseJsonFeed, telegramPostUrl } from "./jobFeed";

describe("Telegram job links", () => {
  it("uses the public browser-safe channel post route", () => {
    expect(telegramPostUrl("90984")).toBe(
      "https://t.me/s/thejournalopportunity/90984"
    );
  });

  it("encodes an incoming post id", () => {
    expect(telegramPostUrl("9 0984")).toBe(
      "https://t.me/s/thejournalopportunity/9%200984"
    );
  });
});


describe("JSON job feeds", () => {
  it("accepts top-level arrays and common job field names", () => {
    expect(parseJsonFeed(JSON.stringify([{ jobTitle: "Payroll Officer", applyUrl: "https://jobs.example/payroll", publishedAt: "2026-10-01" }]), "jobnet")).toEqual([
      { source: "jobnet", title: "Payroll Officer", url: "https://jobs.example/payroll", updatedAt: "2026-10-01" },
    ]);
  });
  it("accepts nested data/results envelopes and rejects unsafe or incomplete rows", () => {
    expect(parseJsonFeed(JSON.stringify({ data: { results: [{ title: "HR Operations", url: "https://jobs.example/hr" }, { title: "No URL" }, { title: "Unsafe", url: "http://jobs.example" }] } }), "linkedin")).toEqual([
      { source: "linkedin", title: "HR Operations", url: "https://jobs.example/hr", updatedAt: expect.any(String) },
    ]);
  });
});
