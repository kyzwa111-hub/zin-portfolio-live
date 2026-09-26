import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { TAX_RULES, calculateAnnualPIT, calculateSSB, formatFinancialYear } from "@/components/PayrollCalculator";

type TaxMode = "employee" | "employer";
type AccessSession = { requestId: string; token: string };
type BulkRow = {
  name: string;
  basicSalary: number;
  allowance: number;
  overtime: number;
  bonus: number;
  parents: number;
  spouse: number;
  children: number;
  lifeInsurance: number;
  otherDeductions: number;
  taxMode: TaxMode;
};
type CalculatedRow = BulkRow & {
  grossMonthly: number;
  grossAnnual: number;
  contributionBase: number;
  employeeSSB: number;
  employerSSB: number;
  employeeSSBAnnual: number;
  employerSSBAnnual: number;
  taxableIncome: number;
  annualPIT: number;
  monthlyPIT: number;
  netMonthly: number;
  employerCostMonthly: number;
};

const emptyStatusInput = { requestId: "pending", token: "pending" } as const;
const numberValue = (value: unknown) => Math.max(0, Number(String(value ?? "").replace(/,/g, "")) || 0);
const formatMMK = (value: number) => `${Math.round(value).toLocaleString("en-US")} MMK`;
const textValue = (value: unknown, fallback: string) => String(value ?? fallback).trim() || fallback;
const taxRules = TAX_RULES["2026-2027"];

export function createBulkTemplate() {
  return XLSX.utils.json_to_sheet([{
    Name: "Example Employee",
    "Basic Salary": 800000,
    Allowance: 100000,
    Overtime: 0,
    Bonus: 0,
    Parents: 0,
    Spouse: 0,
    Children: 0,
    "Life Insurance": 0,
    "Other Deductions": 0,
    "Tax Mode": "employee",
  }]);
}

function downloadWorkbook(rows: Record<string, unknown>[], filename: string, sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function downloadTemplate() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, createBulkTemplate(), "Employee input");
  XLSX.writeFile(workbook, "bulk-payroll-input-template.xlsx");
}

function parseRows(buffer: ArrayBuffer): BulkRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rawRows.map((row, index) => ({
    name: textValue(row.Name ?? row.name, `Employee ${index + 1}`),
    basicSalary: numberValue(row["Basic Salary"] ?? row.basicSalary),
    allowance: numberValue(row.Allowance ?? row.allowance),
    overtime: numberValue(row.Overtime ?? row.overtime),
    bonus: numberValue(row.Bonus ?? row.bonus),
    parents: Math.min(2, Math.floor(numberValue(row.Parents ?? row.parents))),
    spouse: Math.min(1, Math.floor(numberValue(row.Spouse ?? row.spouse))),
    children: Math.floor(numberValue(row.Children ?? row.children)),
    lifeInsurance: numberValue(row["Life Insurance"] ?? row.lifeInsurance),
    otherDeductions: numberValue(row["Other Deductions"] ?? row.otherDeductions),
    taxMode: String(row["Tax Mode"] ?? row.taxMode).toLowerCase() === "employer" ? "employer" : "employee",
  }));
}

function calculateBulkRow(row: BulkRow): CalculatedRow {
  const grossMonthly = row.basicSalary + row.allowance + row.overtime;
  const grossAnnual = grossMonthly * 12 + row.bonus;
  const monthlySSB = calculateSSB(grossMonthly);
  const employeeSSBAnnual = monthlySSB.employeeSSB * 12;
  const employerSSBAnnual = monthlySSB.employerSSB * 12;
  const reliefArgs = [row.parents, row.spouse, row.children, row.lifeInsurance, employeeSSBAnnual, row.otherDeductions] as const;
  let annualPIT = calculateAnnualPIT(grossAnnual, ...reliefArgs, taxRules);
  if (row.taxMode === "employer") {
    for (let index = 0; index < 30; index += 1) {
      const next = calculateAnnualPIT(grossAnnual + annualPIT, ...reliefArgs, taxRules);
      if (Math.abs(next - annualPIT) < 1) break;
      annualPIT = next;
    }
  }
  const taxableGross = grossAnnual + (row.taxMode === "employer" ? annualPIT : 0);
  const taxableIncome = Math.max(0, taxableGross - Math.min(taxableGross * taxRules.basicReliefRate, taxRules.basicReliefCap) - row.parents * taxRules.parentRelief - row.spouse * taxRules.spouseRelief - row.children * taxRules.childRelief - row.lifeInsurance - Math.min(employeeSSBAnnual, 72_000) - row.otherDeductions);
  const monthlyPIT = annualPIT / 12;
  return { ...row, grossMonthly, grossAnnual, contributionBase: monthlySSB.contributionBase, employeeSSB: monthlySSB.employeeSSB, employerSSB: monthlySSB.employerSSB, employeeSSBAnnual, employerSSBAnnual, taxableIncome, annualPIT, monthlyPIT, netMonthly: Math.max(0, grossMonthly - monthlySSB.employeeSSB - (row.taxMode === "employee" ? monthlyPIT : 0)), employerCostMonthly: grossMonthly + monthlySSB.employerSSB + (row.taxMode === "employer" ? monthlyPIT : 0) };
}

function exportRows(rows: CalculatedRow[]) {
  const total = rows.reduce((sum, row) => ({
    grossMonthly: sum.grossMonthly + row.grossMonthly,
    grossAnnual: sum.grossAnnual + row.grossAnnual,
    employeeSSB: sum.employeeSSB + row.employeeSSB,
    employerSSB: sum.employerSSB + row.employerSSB,
    employeeSSBAnnual: sum.employeeSSBAnnual + row.employeeSSBAnnual,
    employerSSBAnnual: sum.employerSSBAnnual + row.employerSSBAnnual,
    taxableIncome: sum.taxableIncome + row.taxableIncome,
    annualPIT: sum.annualPIT + row.annualPIT,
    monthlyPIT: sum.monthlyPIT + row.monthlyPIT,
    netMonthly: sum.netMonthly + row.netMonthly,
    employerCostMonthly: sum.employerCostMonthly + row.employerCostMonthly,
  }), { grossMonthly: 0, grossAnnual: 0, employeeSSB: 0, employerSSB: 0, employeeSSBAnnual: 0, employerSSBAnnual: 0, taxableIncome: 0, annualPIT: 0, monthlyPIT: 0, netMonthly: 0, employerCostMonthly: 0 });
  const stamp = "FY-2026-2027";
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Gross Monthly": Math.round(row.grossMonthly), "Gross Annual": Math.round(row.grossAnnual), "Employee SSB Monthly": Math.round(row.employeeSSB), "Employer SSB Monthly": Math.round(row.employerSSB), "Annual PIT": Math.round(row.annualPIT), "Monthly PIT": Math.round(row.monthlyPIT), "Net Monthly": Math.round(row.netMonthly), "Employer Cost Monthly": Math.round(row.employerCostMonthly), "Tax Mode": row.taxMode })), { Name: "TOTAL", ...Object.fromEntries(Object.entries(total).map(([key, value]) => [key, Math.round(value)])) }], `bulk-payroll-calculation-${stamp}.xlsx`, "Calculation");
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Contribution Base": Math.round(row.contributionBase), "Employee SSB 2%": Math.round(row.employeeSSB), "Employer SSB 3%": Math.round(row.employerSSB), "Annual Employee SSB": Math.round(row.employeeSSBAnnual), "Annual Employer SSB": Math.round(row.employerSSBAnnual) })), { Name: "TOTAL", "Contribution Base": "—", "Employee SSB 2%": Math.round(total.employeeSSB), "Employer SSB 3%": Math.round(total.employerSSB), "Annual Employee SSB": Math.round(total.employeeSSBAnnual), "Annual Employer SSB": Math.round(total.employerSSBAnnual) }], `bulk-payroll-ssb-${stamp}.xlsx`, "SSB list");
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Gross Annual": Math.round(row.grossAnnual), "Taxable Income": Math.round(row.taxableIncome), "Annual PIT": Math.round(row.annualPIT), "Monthly PIT": Math.round(row.monthlyPIT) })), { Name: "TOTAL", "Gross Annual": Math.round(total.grossAnnual), "Taxable Income": Math.round(total.taxableIncome), "Annual PIT": Math.round(total.annualPIT), "Monthly PIT": Math.round(total.monthlyPIT) }], `bulk-payroll-paye-${stamp}.xlsx`, "PAYE-A schedule");
}

export default function BulkPayroll() {
  const [access, setAccess] = useState<AccessSession | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [rows, setRows] = useState<CalculatedRow[]>([]);
  const accessRequest = trpc.calculatorAccess.request.useMutation({ onSuccess: (data) => { setPaymentRequested(true); setAccess({ requestId: data.requestId, token: data.token }); }, onError: () => setPaymentRequested(false) });
  const statusQuery = trpc.calculatorAccess.status.useQuery(access ?? emptyStatusInput, { enabled: Boolean(access), refetchInterval: access ? 2500 : false });
  const accessGranted = statusQuery.data?.status === "approved";
  const botUsername = accessRequest.data?.botUsername ?? "Payroll_Officer_bot";
  const summary = useMemo(() => rows.length ? `${rows.length} employee${rows.length === 1 ? "" : "s"} calculated locally` : "No employee file uploaded yet", [rows.length]);
  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    setRows(buffer.byteLength ? parseRows(buffer).map(calculateBulkRow) : []);
  };

  return <section className="bulk-section section-pad" id="bulk-payroll"><div className="bulk-intro"><div><p className="section-kicker"><FileSpreadsheet size={15} /> Bulk payroll</p><h2>Import once,<br /><i>export three files.</i></h2></div><p className="section-description">Upload an employee list and calculate the same PIT/SSB rules as the single payroll calculator. Files stay in this browser and are never sent to the server.</p></div>{!accessGranted ? <><div className="bulk-panel bulk-gate"><div className="bulk-step"><span className="bulk-step-num"><LockKeyhole size={16} /></span><div><strong>Unlock bulk payroll tools</strong><p>Request Telegram admin approval before uploading employee salary data or downloading payroll files.</p><label className="calculator-requester-field"><span>Your name</span><input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="Enter your name" autoComplete="name" maxLength={160} /><small>Shared with the administrator for this request.</small></label><div className="calculator-gate-actions"><button className="button-primary" onClick={() => { setPaymentRequested(false); accessRequest.mutate({ requesterName: requesterName.trim() }); }} disabled={accessRequest.isPending || requesterName.trim().length < 2}>{accessRequest.isPending ? "Sending request…" : "Request access"}</button><a className="text-link" href={`https://t.me/${botUsername}?start=admin`} target="_blank" rel="noreferrer">Open Telegram bot</a></div></div></div><div className="calculator-gate-status">{statusQuery.data?.status === "approved" ? <><CheckCircle2 size={16} /> Approved</> : <><ShieldCheck size={16} /> Approval required</>}</div></div>{paymentRequested && accessRequest.data && <div className="payment-request-panel" aria-live="polite"><div><p className="section-kicker">Requester-only payment instructions</p><h3>Pay 25,000 MMK via KBZPay</h3><p>Send the payment screenshot and request ID to the Telegram bot. Bulk payroll tools unlock only after admin approval.</p><strong>Request ID: {accessRequest.data.requestId.slice(-8)}</strong></div><img src="/manus-storage/pasted_file_kNMX4R_image_1509cee3.png" alt="KBZPay QR code for the 25,000 MMK access payment" /></div>}</> : <div className="bulk-panel"><div className="bulk-step"><span className="bulk-step-num">1</span><div><strong>Download template</strong><p>One row per employee. Use the same columns as the single calculator.</p><button type="button" className="button-print" onClick={downloadTemplate}><Download size={14} /> Download .xlsx template</button></div></div><div className="bulk-step"><span className="bulk-step-num">2</span><div><strong>Upload and calculate</strong><p>{summary}</p><label className="bulk-upload"><Upload size={15} /> Choose .xlsx file<input type="file" accept=".xlsx,.xls" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} /></label></div></div><div className="bulk-step"><span className="bulk-step-num">3</span><div><strong>Download three files</strong><p>Calculation, SSB contribution list, and PAYE-A schedule.</p><button type="button" className="button-print" disabled={!rows.length} onClick={() => exportRows(rows)}><Download size={14} /> Download all three</button></div></div></div>}<div className="bulk-notes"><details><summary>Plain-language notes</summary><p>PIT uses the same current progressive brackets, reliefs, employee SSB deduction, and employer gross-up logic as the single calculator. Annual income up to MMK 4.8M is exempt; bonuses are included in annual income; SSB is calculated separately at employee 2% and employer 3% on a 300,000 MMK monthly ceiling. Foreign-staff residency and contractor WHT require separate review.</p></details></div></section>;
}

export const bulkPayrollPrivacyNote = "Bulk processing is client-side; salary rows are not uploaded to the server.";
export const bulkPayrollFinancialYear = formatFinancialYear("2026-2027");
