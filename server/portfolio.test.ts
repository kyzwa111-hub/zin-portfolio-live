import { describe, expect, it } from "vitest";
import { getLinkedInSyncLabel, getLinkedInSyncMode } from "../shared/portfolio";

describe("LinkedIn sync state", () => {
  it("uses a safe fallback mode until approved credentials exist", () => {
    expect(getLinkedInSyncMode(false)).toBe("fallback");
    expect(getLinkedInSyncLabel("fallback")).toBe("Update feed ready");
  });

  it("reports live mode when approved credentials are available", () => {
    expect(getLinkedInSyncMode(true)).toBe("live");
    expect(getLinkedInSyncLabel("live")).toBe("Live LinkedIn sync");
  });
});
