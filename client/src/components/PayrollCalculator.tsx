import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, Download, ExternalLink, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import jsPDF from "jspdf";
import PayrollFormDownloads from "@/components/PayrollFormDownloads";

type TaxMode = "employee" | "employer";
type AccessSession = { requestId: string; token: string };
type TaxRuleVersion = "2025-2026" | "2026-2027";
type TaxRule = {
  label: string;
  effective: string;
  salaryExemption: number;
  basicReliefRate: number;
  basicReliefCap: number;
  parentRelief: number;
  spouseRelief: number;
  childRelief: number;
  brackets: { from: number; to: number; rate: number }[];
  source: string;
};

export const TAX_RULES: Record<TaxRuleVersion, TaxRule> = {
  "2025-2026": {
    label: "FY 2025–2026",
    effective: "1 Apr 2025 – 31 Mar 2026",
    salaryExemption: 4_800_000,
    basicReliefRate: 0.2,
    basicReliefCap: 10_000_000,
    parentRelief: 1_000_000,
    spouseRelief: 1_000_000,
    childRelief: 500_000,
    brackets: [{ from: 0, to: 2_000_000, rate: 0 }, { from: 2_000_000, to: 10_000_000, rate: 0.05 }, { from: 10_000_000, to: 30_000_000, rate: 0.1 }, { from: 30_000_000, to: 50_000_000, rate: 0.15 }, { from: 50_000_000, to: 70_000_000, rate: 0.2 }, { from: 70_000_000, to: Number.POSITIVE_INFINITY, rate: 0.25 }],
    source: "IRD Union Taxation Law 2025",
  },
  "2026-2027": {
    label: "FY 2026–2027 · current",
    effective: "1 Apr 2026 – 31 Mar 2027",
    salaryExemption: 4_800_000,
    basicReliefRate: 0.2,
    basicReliefCap: 10_000_000,
    parentRelief: 1_000_000,
    spouseRelief: 1_000_000,
    childRelief: 500_000,
    brackets: [{ from: 0, to: 2_000_000, rate: 0 }, { from: 2_000_000, to: 10_000_000, rate: 0.05 }, { from: 10_000_000, to: 30_000_000, rate: 0.1 }, { from: 30_000_000, to: 50_000_000, rate: 0.15 }, { from: 50_000_000, to: 70_000_000, rate: 0.2 }, { from: 70_000_000, to: Number.POSITIVE_INFINITY, rate: 0.25 }],
    source: "IRD Union Taxation Law 2026",
  },
};

const emptyStatusInput = { requestId: "pending", token: "pending" } as const;
const formatMMK = (value: number) => `${Math.round(value).toLocaleString("en-US")} MMK`;
const numberValue = (value: string) => Math.max(0, Number(value.replace(/,/g, "")) || 0);

type PayslipResult = {
  monthlyGross: number;
  employeeSSB: number;
  employerSSB: number;
  monthlyPIT: number;
  monthlyNet: number;
  employerCost: number;
  taxableIncome: number;
};

function downloadPayslipPdf(result: PayslipResult | null, rules: TaxRule, taxMode: TaxMode) {
  if (!result) return;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 22;
  pdf.setTextColor(36, 61, 85);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("PAYSLIP ESTIMATE", left, 24);
  pdf.setFontSize(25);
  pdf.text("Zin Min Htet", left, 36);
  pdf.setFontSize(10);
  pdf.setTextColor(105, 98, 90);
  pdf.setFont("helvetica", "normal");
  pdf.text(rules.label.replace(" · current", ""), 188, 28, { align: "right" });
  pdf.text(`Basis: ${rules.effective.replaceAll("–", "-")}`, left, 52);
  pdf.text(`Tax mode: ${taxMode === "employee" ? "Employee-borne PIT" : "Employer-borne PIT"}`, left, 59);
  pdf.setDrawColor(216, 208, 198);
  pdf.line(left, 67, 188, 67);
  const rows = [
    ["Gross cash earnings", formatMMK(result.monthlyGross)],
    ["Employee SSB", formatMMK(result.employeeSSB)],
    ["Monthly PIT", formatMMK(result.monthlyPIT)],
    ["Net pay", formatMMK(result.monthlyNet)],
    ["Employer SSB", formatMMK(result.employerSSB)],
    ["Employer monthly cost", formatMMK(result.employerCost)],
    ["Annual taxable income", formatMMK(result.taxableIncome)],
  ];
  rows.forEach(([label, value], index) => {
    const y = 80 + index * 16;
    pdf.setTextColor(105, 98, 90);
    pdf.setFontSize(11);
    pdf.text(label, left, y);
    pdf.setTextColor(36, 61, 85);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, 188, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setDrawColor(232, 226, 216);
    pdf.line(left, y + 5, 188, y + 5);
  });
  pdf.setTextColor(105, 98, 90);
  pdf.setFontSize(9);
  pdf.text("Estimate only. Confirm final payroll treatment with IRD, SSB, or a qualified payroll/tax adviser.", left, 210, { maxWidth: 160 });
  pdf.save(`zin-min-htet-payslip-${rules.label.slice(3, 12).replace("–", "-")}.pdf`);
}

export function calculateProgressiveTax(taxableIncome: number, brackets = TAX_RULES["2026-2027"].brackets) {
  return brackets.reduce((tax, bracket) => {
    const amount = Math.max(0, Math.min(taxableIncome, bracket.to) - bracket.from);
    return tax + amount * bracket.rate;
  }, 0);
}

export function calculateSSB(monthlyGross: number) {
  const contributionBase = Math.min(Math.max(0, monthlyGross), 300_000);
  return {
    contributionBase,
    employeeSSB: contributionBase * 0.02,
    employerSSB: contributionBase * 0.03,
  };
}

export function calculateAnnualPIT(grossIncome: number, parentCount: number, spouseCount: number, childCount: number, lifeInsurance: number, employeeSSBAnnual: number, otherDeductions: number, rules = TAX_RULES["2026-2027"]) {
  if (grossIncome <= rules.salaryExemption) return 0;
  const personalRelief = Math.min(grossIncome * rules.basicReliefRate, rules.basicReliefCap);
  const dependentRelief = parentCount * rules.parentRelief + Math.min(spouseCount, 1) * rules.spouseRelief + childCount * rules.childRelief;
  const taxableIncome = Math.max(0, grossIncome - personalRelief - dependentRelief - lifeInsurance - Math.min(employeeSSBAnnual, 72_000) - otherDeductions);
  return calculateProgressiveTax(taxableIncome, rules.brackets);
}

export default function PayrollCalculator() {
  const [access, setAccess] = useState<AccessSession | null>(null);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [taxVersion, setTaxVersion] = useState<TaxRuleVersion>("2026-2027");
  const accessRequest = trpc.calculatorAccess.request.useMutation({ onSuccess: (data) => { setPaymentRequested(true); setAccess({ requestId: data.requestId, token: data.token }); }, onError: () => setPaymentRequested(false) });
  const statusQuery = trpc.calculatorAccess.status.useQuery(access ?? emptyStatusInput, { enabled: Boolean(access), refetchInterval: access ? 2500 : false });
  const accessGranted = statusQuery.data?.status === "approved";
  const rules = TAX_RULES[taxVersion];

  const [basicSalary, setBasicSalary] = useState("800000");
  const [allowance, setAllowance] = useState("100000");
  const [overtime, setOvertime] = useState("0");
  const [annualBonus, setAnnualBonus] = useState("0");
  const [otherEarnings, setOtherEarnings] = useState("0");
  const [lifeInsurance, setLifeInsurance] = useState("0");
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [parents, setParents] = useState("0");
  const [children, setChildren] = useState("0");
  const [spouse, setSpouse] = useState("0");
  const [taxMode, setTaxMode] = useState<TaxMode>("employee");

  const result = useMemo(() => {
    if (!accessGranted) return null;
    const monthlyGross = numberValue(basicSalary) + numberValue(allowance) + numberValue(overtime);
    const annualGross = monthlyGross * 12 + numberValue(annualBonus) + numberValue(otherEarnings);
    const { employeeSSB, employerSSB } = calculateSSB(monthlyGross);
    const parentCount = Math.min(2, Math.floor(numberValue(parents)));
    const spouseCount = Math.min(1, Math.floor(numberValue(spouse)));
    const childCount = Math.floor(numberValue(children));
    const reliefArgs = [parentCount, spouseCount, childCount, numberValue(lifeInsurance), employeeSSB * 12, numberValue(otherDeductions)] as const;
    let annualPIT = calculateAnnualPIT(annualGross, ...reliefArgs, rules);
    if (taxMode === "employer") {
      for (let index = 0; index < 30; index += 1) {
        const next = calculateAnnualPIT(annualGross + annualPIT, ...reliefArgs, rules);
        if (Math.abs(next - annualPIT) < 1) break;
        annualPIT = next;
      }
    }
    const taxableGross = annualGross + (taxMode === "employer" ? annualPIT : 0);
    const personalRelief = Math.min(taxableGross * rules.basicReliefRate, rules.basicReliefCap);
    const taxableIncome = Math.max(0, taxableGross - personalRelief - parentCount * rules.parentRelief - spouseCount * rules.spouseRelief - childCount * rules.childRelief - numberValue(lifeInsurance) - Math.min(employeeSSB * 12, 72_000) - numberValue(otherDeductions));
    const monthlyPIT = annualPIT / 12;
    const monthlyNet = Math.max(0, monthlyGross - employeeSSB - (taxMode === "employee" ? monthlyPIT : 0));
    const employerCost = monthlyGross + employerSSB + (taxMode === "employer" ? monthlyPIT : 0);
    return { monthlyGross, employeeSSB, employerSSB, monthlyPIT, monthlyNet, employerCost, taxableIncome, annualPIT, annualGross };
  }, [accessGranted, allowance, annualBonus, basicSalary, children, lifeInsurance, otherDeductions, otherEarnings, overtime, parents, rules, spouse, taxMode]);

  const field = (label: string, value: string, setValue: (value: string) => void, hint = "MMK / month") => (
    <label className="calculator-field"><span>{label}</span><input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} /><small>{hint}</small></label>
  );
  const botUsername = accessRequest.data?.botUsername ?? "Payroll_Officer_bot";
  const botLink = `https://t.me/${botUsername}?start=admin`;
  const statusMessage = !access ? "Request access to send an approval notice to the administrator." : accessRequest.data?.adminNotified ? "Approval request sent. Waiting for the administrator." : "Admin bot setup is needed: open the bot and send /start from the admin account.";
  const requestAccess = () => {
    setPaymentRequested(false);
    accessRequest.mutate();
  };

  return (
    <section className="calculator-section section-pad" id="calculator">
      <div className="calculator-intro"><div><p className="section-kicker"><Calculator size={15} /> Payroll tool</p><h2>See the number<br /><i>behind the payslip.</i></h2></div><p className="section-description">A Myanmar payroll estimate for gross salary, PIT, SSB, net pay, and employer cost. Access is released only after Telegram admin approval.</p></div>
      {!accessGranted ? (
        <>
          <div className="calculator-gate"><div className="calculator-gate-icon"><LockKeyhole size={24} /></div><div className="calculator-gate-copy"><p className="section-kicker">Admin approval required</p><h3>Unlock the calculator before entering salary data.</h3><p>{statusMessage}</p><div className="calculator-gate-actions"><button className="button-primary" onClick={requestAccess} disabled={accessRequest.isPending}>{accessRequest.isPending ? "Sending request…" : "Request access"}</button><a className="text-link" href={botLink} target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a></div><small>Requests expire after 10 minutes. Salary fields remain hidden until approval.</small></div><div className="calculator-gate-status">{statusQuery.data?.status === "approved" ? <><CheckCircle2 size={16} /> Approved</> : <><ShieldCheck size={16} /> Waiting for approval</>}</div></div>
          {paymentRequested && accessRequest.data && <div className="payment-request-panel" aria-live="polite"><div><p className="section-kicker">Requester-only payment instructions</p><h3>Pay 25,000 MMK via KBZPay</h3><p>Scan the QR code below, then send the payment screenshot and your request ID to the Telegram bot. The calculator and monthly/annual templates unlock only after administrator approval.</p><strong>Request ID: {accessRequest.data.requestId.slice(-8)}</strong><small>This payment panel is shown only in the browser session that submitted the request. It expires with the 10-minute approval request.</small></div><img src="/manus-storage/pasted_file_kNMX4R_image_1509cee3.png" alt="KBZPay QR code for the 25,000 MMK access payment" /></div>}
        </>
      ) : (
        <>
          <div className="calculator-shell">
            <div className="calculator-form"><div className="calculator-form-heading"><h3>Monthly earnings</h3><span>MMK</span></div><div className="calculator-fields">{field("Basic salary", basicSalary, setBasicSalary)}{field("Recurring allowance", allowance, setAllowance)}{field("Overtime / other monthly pay", overtime, setOvertime)}</div><div className="calculator-form-heading"><h3>Annual additions</h3><span>Optional</span></div><div className="calculator-fields">{field("Annual bonus", annualBonus, setAnnualBonus, "MMK / year")}{field("Other annual earnings", otherEarnings, setOtherEarnings, "MMK / year")}{field("Life insurance premium", lifeInsurance, setLifeInsurance, "MMK / year")}{field("Other allowable deductions", otherDeductions, setOtherDeductions, "MMK / year")}</div><div className="calculator-form-heading"><h3>Reliefs</h3><span>Annual count</span></div><div className="calculator-fields calculator-counts">{field("Dependent parents", parents, setParents, "Up to 2 × 1,000,000")}{field("Non-earning spouse", spouse, setSpouse, "1 × 1,000,000")}{field("Qualifying children", children, setChildren, "500,000 each")}</div><div className="tax-mode"><div><strong>Who bears employee PIT?</strong><small>Employee mode deducts PIT from net pay. Employer mode gross-ups the PIT and adds it to employer cost.</small></div><div className="tax-mode-buttons"><button className={taxMode === "employee" ? "active" : ""} onClick={() => setTaxMode("employee")}>Employee</button><button className={taxMode === "employer" ? "active" : ""} onClick={() => setTaxMode("employer")}>Employer</button></div></div></div>
            <div className="calculator-results"><div className="calculator-result-top"><div><p className="section-kicker">Estimated monthly result</p><h3>{formatMMK(result?.monthlyNet ?? 0)}</h3><span>Net pay after SSB{taxMode === "employee" ? " and employee PIT" : " · employee PIT paid by employer"}</span></div><div className="calculator-result-actions"><label className="tax-version-select"><span>Rule version</span><select value={taxVersion} onChange={(event) => setTaxVersion(event.target.value as TaxRuleVersion)}><option value="2026-2027">FY 2026–2027 · current</option><option value="2025-2026">FY 2025–2026</option></select></label><button className="button-print" onClick={() => downloadPayslipPdf(result, rules, taxMode)} disabled={!result}><Download size={15} /> Download payslip PDF</button></div></div><div className="result-list"><div><span>Gross cash earnings</span><strong>{formatMMK(result?.monthlyGross ?? 0)}</strong></div><div><span>Employee SSB · 2%</span><strong>{formatMMK(result?.employeeSSB ?? 0)}</strong></div><div><span>Monthly PIT estimate</span><strong>{formatMMK(result?.monthlyPIT ?? 0)}</strong></div><div><span>Employer SSB · 3%</span><strong>{formatMMK(result?.employerSSB ?? 0)}</strong></div><div><span>Employer monthly cost</span><strong>{formatMMK(result?.employerCost ?? 0)}</strong></div><div><span>Annual taxable income</span><strong>{formatMMK(result?.taxableIncome ?? 0)}</strong></div></div><div className="calculator-note"><Info size={15} /><p>Estimate only. SSB uses the official 2% employee + 3% employer structure on a 300,000 MMK monthly contribution base. {rules.label} is effective {rules.effective}. The selected salary rules are based on {rules.source}; verify final payroll treatment with IRD, SSB, and a qualified payroll/tax adviser.</p></div></div>
          </div>
          <div className="payslip-print"><div className="payslip-print-header"><div><span>PAYSLIP ESTIMATE</span><h1>Zin Min Htet</h1></div><strong>{rules.label}</strong></div><div className="payslip-print-meta"><span>Basis: {rules.effective}</span><span>Tax mode: {taxMode === "employee" ? "Employee-borne PIT" : "Employer-borne PIT"}</span></div><div className="payslip-print-grid"><div><span>Gross cash earnings</span><strong>{formatMMK(result?.monthlyGross ?? 0)}</strong></div><div><span>Employee SSB</span><strong>{formatMMK(result?.employeeSSB ?? 0)}</strong></div><div><span>Monthly PIT</span><strong>{formatMMK(result?.monthlyPIT ?? 0)}</strong></div><div><span>Net pay</span><strong>{formatMMK(result?.monthlyNet ?? 0)}</strong></div><div><span>Employer SSB</span><strong>{formatMMK(result?.employerSSB ?? 0)}</strong></div><div><span>Employer monthly cost</span><strong>{formatMMK(result?.employerCost ?? 0)}</strong></div></div><p className="payslip-print-footnote">Estimate only. Confirm final payroll treatment with the relevant Myanmar authorities or a qualified payroll/tax adviser.</p></div>
        </>
      )}
      {accessGranted && <PayrollFormDownloads data={result ? { monthlyGross: result.monthlyGross, annualGross: result.annualGross, employeeSSB: result.employeeSSB, employerSSB: result.employerSSB, monthlyPIT: result.monthlyPIT, annualPIT: result.annualPIT, monthlyNet: result.monthlyNet, employerCost: result.employerCost, taxableIncome: result.taxableIncome, lifeInsurance: numberValue(lifeInsurance), otherDeductions: numberValue(otherDeductions), parents: numberValue(parents), spouse: numberValue(spouse), children: numberValue(children), taxLabel: rules.label, taxEffective: rules.effective, taxMode } : null} />}
      <div className="calculator-sources"><span>Rules checked against</span><a href="https://www.ird.gov.mm/laws/union-taxation-law" target="_blank" rel="noreferrer">IRD Union Taxation Law index</a><a href="https://ssb.gov.mm/portal/contribute_cal" target="_blank" rel="noreferrer">SSB contribution calculator</a><a href="https://taxsummaries.pwc.com/myanmar/individual/taxes-on-personal-income" target="_blank" rel="noreferrer">PwC tax summary</a></div>
    </section>
  );
}

export type PayrollCalculatorResult = ReturnType<typeof calculateAnnualPIT>;
export const PAYROLL_CALCULATOR_VERSION = "mm-payroll-estimate-with-rule-selector";
export const privacyNote = "Salary inputs are calculated locally in the browser and are not saved.";
export const updateNotice = "Re-check official IRD and SSB sources whenever tax-year rules change.";
