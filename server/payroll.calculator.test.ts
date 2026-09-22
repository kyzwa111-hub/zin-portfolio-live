import { describe, expect, it } from "vitest";
import { TAX_RULES, calculateAnnualPIT, calculateProgressiveTax } from "../client/src/components/PayrollCalculator";

describe("Myanmar payroll calculator", () => {
  it("applies the progressive tax brackets", () => {
    expect(calculateProgressiveTax(2_000_000)).toBe(0);
    expect(calculateProgressiveTax(10_000_000)).toBe(400_000);
    expect(calculateProgressiveTax(30_000_000)).toBe(2_400_000);
  });

  it("applies the annual salary exemption and reliefs", () => {
    expect(calculateAnnualPIT(4_800_000, 0, 0, 0, 0, 0, 0)).toBe(0);
    expect(calculateAnnualPIT(12_000_000, 1, 0, 1, 0, 72_000, 0)).toBeGreaterThan(0);
    expect(calculateAnnualPIT(12_000_000, 0, 0, 0, 0, 0, 0)).toBeGreaterThan(calculateAnnualPIT(12_000_000, 1, 0, 1, 0, 72_000, 0));
  });

  it("exposes both documented tax-rule versions", () => {
    expect(TAX_RULES["2025-2026"].effective).toContain("31 Mar 2026");
    expect(TAX_RULES["2026-2027"].effective).toContain("1 Apr 2026");
    expect(calculateAnnualPIT(12_000_000, 0, 0, 0, 0, 0, 0, TAX_RULES["2025-2026"])).toBeGreaterThan(0);
  });
});
