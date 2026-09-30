import { describe, expect, it } from "vitest";
import { telegramPostUrl } from "./jobFeed";

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
