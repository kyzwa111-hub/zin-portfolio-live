import { describe, expect, it } from "vitest";
import { parseToolkitQuery } from "./index";

describe("Worker toolkit query contract", () => {
  it("accepts the final toolkit URL and a game section", () => {
    const result = parseToolkitQuery(new Request("https://example.workers.dev/?hr-toolkit=1&v=final&section=game#top"));
    expect(result).toEqual({ enabled: true, version: "final", section: "game" });
  });

  it("keeps the legacy marker compatible without optional parameters", () => {
    expect(parseToolkitQuery(new Request("https://example.workers.dev/?hr-toolkit=1"))).toEqual({ enabled: true, version: null, section: null });
  });

  it("rejects unsupported marker, version, and section values", () => {
    expect(parseToolkitQuery(new Request("https://example.workers.dev/?hr-toolkit=yes")).error).toContain("must be 1");
    expect(parseToolkitQuery(new Request("https://example.workers.dev/?hr-toolkit=1&v=beta")).error).toContain("version");
    expect(parseToolkitQuery(new Request("https://example.workers.dev/?hr-toolkit=1&section=admin")).error).toContain("section");
  });
});
