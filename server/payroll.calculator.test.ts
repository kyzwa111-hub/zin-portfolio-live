import { describe, expect, it } from "vitest";
import { TAX_RULES, calculateAnnualPIT, calculateFyAnnualGross, calculateProgressiveTax, calculateSSB, formatFinancialYear } from "../client/src/components/PayrollCalculator";
import { getSSBTemplateValues } from "../client/src/lib/payrollTemplateFill";

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

  it("formats financial years consistently for UI and exports", () => {
    expect(formatFinancialYear("2026-2027")).toBe("FY 2026-2027");
    expect(formatFinancialYear("FY 2025-2026")).toBe("FY 2025-2026");
  });

  it("sums explicit April-to-March income and preserves the monthly fallback", () => {
    expect(calculateFyAnnualGross([1_000_000, 1_100_000, 0, 0], 800_000)).toBe(2_100_000);
    expect(calculateFyAnnualGross([], 800_000)).toBe(9_600_000);
  });

  it("uses the official SSB structure: employee 2%, employer 3%, capped at 300,000 MMK", () => {
    expect(calculateSSB(250_000)).toEqual({ contributionBase: 250_000, employeeSSB: 5_000, employerSSB: 7_500 });
    expect(calculateSSB(800_000)).toEqual({ contributionBase: 300_000, employeeSSB: 6_000, employerSSB: 9_000 });
  });

  it("splits the SSB template employer columns without double-counting injury contribution", () => {
    expect(getSSBTemplateValues(800_000)).toEqual({ contributionBase: 300_000, employerHealth: 6_000, employerInjury: 3_000, employerTotal: 9_000, employeeTotal: 6_000, total: 15_000 });
  });
});
