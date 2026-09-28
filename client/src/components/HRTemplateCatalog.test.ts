import { describe, expect, it } from "vitest";
import { hrSectorItems, hrTemplates } from "./HRTemplateCatalog";

describe("HR template catalog", () => {
  it("covers all six requested HR sectors", () => {
    expect(hrSectorItems.map((sector) => sector.id)).toEqual([
      "recruitment",
      "attendance",
      "relations",
      "performance",
      "compliance",
      "people-data",
    ]);
    for (const sector of hrSectorItems) {
      expect(hrTemplates[sector.id].length).toBeGreaterThanOrEqual(3);
    }
  });

  it("includes the requested recruitment and onboarding resources", () => {
    const ids = hrTemplates.recruitment.map((template) => template.id);
    expect(ids).toContain("cv-profile");
    expect(ids).toContain("government-ec-reference");
    expect(ids).toContain("officer-appointment-letter");
    expect(ids).toContain("employment-verification");
    expect(ids).toContain("onboarding-checklist");
  });

  it("keeps the government contract as a reference link, not a fabricated local form", () => {
    const ec = hrTemplates.recruitment.find((template) => template.id === "government-ec-reference");
    expect(ec?.sourceUrl).toMatch(/^https:\/\//);
    expect(ec?.fields).toBeUndefined();
    expect(ec?.notice).toMatch(/township labour.office/i);
  });
});
