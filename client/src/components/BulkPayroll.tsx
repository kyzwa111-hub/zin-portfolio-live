import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { trpc } from "@/lib/trpc";
import { FY_MONTHS, TAX_RULES, calculateAnnualPIT, calculateSSB, formatFinancialYear } from "@/components/PayrollCalculator";
import { readAccessSession } from "@/lib/accessSession";
import { PAYMENT_QR_URL } from "@/const";

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

export type BulkPayrollWarning = { row: number; message: string };
type PayrollExportSettings = { companyName: string; financialYear: string; payrollMonth: string };

const emptyStatusInput = { requestId: "pending", token: "pending" } as const;
const numberValue = (value: unknown) => Math.max(0, Number(String(value ?? "").replace(/,/g, "")) || 0);
const formatMMK = (value: number) => `${Math.round(value).toLocaleString("en-US")} MMK`;
const textValue = (value: unknown, fallback: string) => String(value ?? fallback).trim() || fallback;
const taxRules = TAX_RULES["2026-2027"];

export function createBulkTemplate() {
  return XLSX.utils.json_to_sheet([{
    Name: "",
    "Basic Salary": "",
    Allowance: "",
    Overtime: "",
    Bonus: "",
    Parents: "",
    Spouse: "",
    Children: "",
    "Life Insurance": "",
    "Other Deductions": "",
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

export function validateBulkRows(rows: BulkRow[]): BulkPayrollWarning[] {
  const warnings: BulkPayrollWarning[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.name || /^Employee \d+$/.test(row.name)) {
      warnings.push({ row: rowNumber, message: "Add an employee name." });
    }
    if (row.basicSalary + row.allowance + row.overtime === 0 && row.bonus === 0) {
      warnings.push({ row: rowNumber, message: "No monthly earnings or bonus entered." });
    }
  });
  return warnings;
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

function safeFilename(value: string) { return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "company"; }

function downloadBulkPayslipPdf(rows: CalculatedRow[], settings: PayrollExportSettings, password = "") {
  if (!rows.length) return;
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    ...(password ? { encryption: { userPassword: password, ownerPassword: `${password}-owner`, userPermissions: ["print"] } } : {}),
  });
  rows.forEach((row, index) => {
    if (index > 0) pdf.addPage();
    pdf.setTextColor(36, 61, 85);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("PAYSLIP ESTIMATE", 22, 24);
    pdf.setFontSize(22);
    pdf.text(settings.companyName || "ZEKE HR TOOLKIT", 22, 35);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Employee: ${row.name}`, 22, 49);
    pdf.text(`Payroll month: ${settings.payrollMonth}`, 22, 56);
    pdf.text(`Financial year: ${formatFinancialYear(settings.financialYear)}`, 22, 63);
    pdf.text(`Tax mode: ${row.taxMode === "employee" ? "Employee-borne PIT" : "Employer-borne PIT"}`, 22, 70);
    pdf.setDrawColor(220, 214, 204);
    pdf.line(22, 77, 188, 77);
    const values: Array<[string, string]> = [
      ["Gross monthly earnings", formatMMK(row.grossMonthly)],
      ["Employee SSB", formatMMK(row.employeeSSB)],
      ["Monthly PIT", formatMMK(row.monthlyPIT)],
      ["Net pay", formatMMK(row.netMonthly)],
      ["Employer SSB", formatMMK(row.employerSSB)],
      ["Employer monthly cost", formatMMK(row.employerCostMonthly)],
      ["Annual gross earnings", formatMMK(row.grossAnnual)],
      ["Annual PIT", formatMMK(row.annualPIT)],
    ];
    values.forEach(([label, value], valueIndex) => {
      const y = 91 + valueIndex * 12;
      pdf.setTextColor(90, 98, 105);
      pdf.setFontSize(10);
      pdf.text(label, 22, y);
      pdf.setTextColor(36, 61, 85);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, 188, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
    });
    pdf.setTextColor(110, 105, 98);
    pdf.setFontSize(8);
    pdf.text("Estimate only. Verify final payroll treatment with the relevant Myanmar authorities or a qualified adviser.", 22, 196);
    pdf.text(`Payslip ${index + 1} of ${rows.length}`, 22, 204);
  });
  pdf.save(`${safeFilename(settings.companyName)}-payslips-${safeFilename(settings.payrollMonth)}-${rows.length}-employees.pdf`);
}

function downloadDocumentVaultWorkbook(rows: CalculatedRow[], settings: PayrollExportSettings) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Company name", settings.companyName], ["Payroll month", settings.payrollMonth], ["Financial year", formatFinancialYear(settings.financialYear)], ["Package status", "Working documents - verify before filing or sending"]]), "Package info");
  const payslips = rows.map((row, index) => ({
    "Payslip No.": index + 1,
    Company: settings.companyName,
    Name: row.name,
    "Payroll Month": settings.payrollMonth,
    "Financial Year": formatFinancialYear(settings.financialYear),
    "Tax Mode": row.taxMode,
    "Gross Monthly": Math.round(row.grossMonthly),
    "Employee SSB": Math.round(row.employeeSSB),
    "Monthly PIT": Math.round(row.monthlyPIT),
    "Net Pay": Math.round(row.netMonthly),
    "Employer SSB": Math.round(row.employerSSB),
    "Employer Cost": Math.round(row.employerCostMonthly),
    "Annual Gross": Math.round(row.grossAnnual),
    "Annual PIT": Math.round(row.annualPIT),
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payslips), "Payslips");

  const form15Headers = ["Name", "Tax Mode", ...FY_MONTHS.flatMap(month => [`${month} Gross`, `${month} PIT`]), "Annual Gross", "Annual PIT", "Parents", "Spouse", "Children", "Life Insurance", "Other Deductions", "Review status"];
  const form15Rows = rows.map(row => [row.name, row.taxMode, ...FY_MONTHS.flatMap(() => [Math.round(row.grossMonthly), Math.round(row.monthlyPIT)]), Math.round(row.grossAnnual), Math.round(row.annualPIT), row.parents, row.spouse, row.children, Math.round(row.lifeInsurance), Math.round(row.otherDeductions), "Working data - verify monthly changes and payment references"]);
  const form15Sheet = XLSX.utils.aoa_to_sheet([[
    `${settings.companyName} - Form 15(A) working data`,
  ], [
    `Payroll month: ${settings.payrollMonth} · Financial year: ${formatFinancialYear(settings.financialYear)}. Monthly values start from the Bulk Payroll baseline. Verify actual month-by-month salary, tax payment reference, employee identity, and employer details before filing.`,
  ], [], form15Headers, ...form15Rows]);
  XLSX.utils.book_append_sheet(workbook, form15Sheet, "Form 15(A) Working");

  const emailRows = rows.map((row, index) => ({
    "Employee No.": index + 1,
    Name: row.name,
    Email: "",
    "Payslip file": `payslip-${index + 1}-${row.name}.pdf`,
    "Form 15(A) file": `form-15a-${index + 1}-${row.name}.pdf`,
    Subject: `${settings.companyName} payroll documents - ${settings.payrollMonth}`,
    "Message status": "Ready for review",
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(emailRows), "Email Queue");
  XLSX.writeFile(workbook, `${safeFilename(settings.companyName)}-hr-document-vault-${safeFilename(settings.payrollMonth)}-${rows.length}-employees.xlsx`);
}

function exportRows(rows: CalculatedRow[]) {
  const companyName = window.prompt("Company name", "")?.trim() ?? "";
  if (!companyName) return;
  const financialYear = window.prompt("Financial year", "2026-2027")?.trim() ?? "";
  if (!financialYear) return;
  const payrollMonth = window.prompt("Payroll month", "August 2026")?.trim() ?? "";
  if (!payrollMonth) return;
  const settings: PayrollExportSettings = { companyName, financialYear, payrollMonth };
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
  const stamp = `${safeFilename(settings.financialYear)}-${safeFilename(settings.payrollMonth)}`;
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Gross Monthly": Math.round(row.grossMonthly), "Gross Annual": Math.round(row.grossAnnual), "Employee SSB Monthly": Math.round(row.employeeSSB), "Employer SSB Monthly": Math.round(row.employerSSB), "Annual PIT": Math.round(row.annualPIT), "Monthly PIT": Math.round(row.monthlyPIT), "Net Monthly": Math.round(row.netMonthly), "Employer Cost Monthly": Math.round(row.employerCostMonthly), "Tax Mode": row.taxMode })), { Name: "TOTAL", ...Object.fromEntries(Object.entries(total).map(([key, value]) => [key, Math.round(value)])) }], `bulk-payroll-calculation-${stamp}.xlsx`, "Calculation");
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Contribution Base": Math.round(row.contributionBase), "Employee SSB 2%": Math.round(row.employeeSSB), "Employer SSB 3%": Math.round(row.employerSSB), "Annual Employee SSB": Math.round(row.employeeSSBAnnual), "Annual Employer SSB": Math.round(row.employerSSBAnnual) })), { Name: "TOTAL", "Contribution Base": "—", "Employee SSB 2%": Math.round(total.employeeSSB), "Employer SSB 3%": Math.round(total.employerSSB), "Annual Employee SSB": Math.round(total.employeeSSBAnnual), "Annual Employer SSB": Math.round(total.employerSSBAnnual) }], `bulk-payroll-ssb-${stamp}.xlsx`, "SSB list");
  downloadWorkbook([...rows.map((row) => ({ Name: row.name, "Gross Annual": Math.round(row.grossAnnual), "Taxable Income": Math.round(row.taxableIncome), "Annual PIT": Math.round(row.annualPIT), "Monthly PIT": Math.round(row.monthlyPIT) })), { Name: "TOTAL", "Gross Annual": Math.round(total.grossAnnual), "Taxable Income": Math.round(total.taxableIncome), "Annual PIT": Math.round(total.annualPIT), "Monthly PIT": Math.round(total.monthlyPIT) }], `bulk-payroll-paye-${stamp}.xlsx`, "PAYE-A schedule");
  downloadWorkbook(rows.map((row, index) => ({
    "Payslip No.": index + 1,
    Company: settings.companyName,
    "Payroll Month": settings.payrollMonth,
    "Financial Year": formatFinancialYear(settings.financialYear),
    Name: row.name,
    "Tax Mode": row.taxMode,
    "Gross Monthly": Math.round(row.grossMonthly),
    "Employee SSB": Math.round(row.employeeSSB),
    "Monthly PIT": Math.round(row.monthlyPIT),
    "Net Pay": Math.round(row.netMonthly),
    "Employer SSB": Math.round(row.employerSSB),
    "Employer Cost": Math.round(row.employerCostMonthly),
    "Annual Gross": Math.round(row.grossAnnual),
    "Annual PIT": Math.round(row.annualPIT),
  })), `bulk-payroll-payslips-${stamp}.xlsx`, "Payslips");
  downloadDocumentVaultWorkbook(rows, settings);
  const password = window.prompt("Optional: enter a password to protect the payslip PDF. Leave blank for no password.") ?? "";
  downloadBulkPayslipPdf(rows, settings, password.trim());
}

export default function BulkPayroll({ sharedApprovalActive = false }: { sharedApprovalActive?: boolean } = {}) {
  const [access, setAccess] = useState<AccessSession | null>(() => readAccessSession());
  const [requesterName, setRequesterName] = useState("");
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [rows, setRows] = useState<CalculatedRow[]>([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [rowWarnings, setRowWarnings] = useState<BulkPayrollWarning[]>([]);
  const accessRequest = trpc.calculatorAccess.request.useMutation({ onSuccess: (data) => { setPaymentRequested(true); setAccess({ requestId: data.requestId, token: data.token }); }, onError: () => setPaymentRequested(false) });
  const statusQuery = trpc.calculatorAccess.status.useQuery(access ?? emptyStatusInput, { enabled: Boolean(access), refetchInterval: access ? 2500 : false });
  const accessGranted = sharedApprovalActive || statusQuery.data?.status === "approved";
  const botUsername = accessRequest.data?.botUsername ?? "ayelay_bot";

  useEffect(() => {
    const syncAccess = () => setAccess(readAccessSession());
    window.addEventListener("access-session-updated", syncAccess);
    return () => window.removeEventListener("access-session-updated", syncAccess);
  }, []);
  const summary = useMemo(() => rows.length ? `${rows.length} employee${rows.length === 1 ? "" : "s"} calculated locally` : "No employee file uploaded yet", [rows.length]);
  const totals = useMemo(() => rows.reduce((total, row) => ({ grossMonthly: total.grossMonthly + row.grossMonthly, netMonthly: total.netMonthly + row.netMonthly, employerCost: total.employerCost + row.employerCostMonthly }), { grossMonthly: 0, netMonthly: 0, employerCost: 0 }), [rows]);
  const handleFile = async (file: File) => {
    setUploadError("");
    setRowWarnings([]);
    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = buffer.byteLength ? parseRows(buffer) : [];
      if (!parsedRows.length) throw new Error("The workbook has no employee rows.");
      setRows(parsedRows.map(calculateBulkRow));
      setUploadName(file.name);
      setRowWarnings(validateBulkRows(parsedRows));
    } catch {
      setRows([]);
      setUploadName("");
      setUploadError("This file could not be read. Download the template and upload a valid .xlsx or .xls file.");
    }
  };
  const clearFile = () => { setRows([]); setUploadName(""); setUploadError(""); setRowWarnings([]); };

  return <section className="bulk-section section-pad" id="bulk-payroll"><div className="bulk-intro"><div><p className="section-kicker"><FileSpreadsheet size={15} /> Bulk payroll</p><h2>One upload,<br /><i>one document package.</i></h2></div><p className="section-description">Upload an employee list and prepare calculation, SSB, PAYE-A, payslip, Form 15(A) working data, and email-queue files. Files stay in this browser and are never sent to the server.</p></div>{!accessGranted ? <><div className="bulk-panel bulk-gate"><div className="bulk-step"><span className="bulk-step-num"><LockKeyhole size={16} /></span><div><strong>Unlock bulk payroll tools</strong><p>Request Telegram admin approval before uploading employee salary data or downloading payroll files.</p><label className="calculator-requester-field"><span>Your name</span><input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="Enter your name" autoComplete="name" maxLength={160} /><small>Shared with the administrator for this request.</small></label><div className="calculator-gate-actions"><button className="button-primary" onClick={() => { setPaymentRequested(false); accessRequest.mutate({ requesterName: requesterName.trim() }); }} disabled={accessRequest.isPending || requesterName.trim().length < 2}>{accessRequest.isPending ? "Sending request…" : "Request access"}</button><a className="text-link" href={`https://t.me/${botUsername}?start=admin`} target="_blank" rel="noreferrer">Open Telegram bot</a></div></div></div><div className="calculator-gate-status">{statusQuery.data?.status === "approved" ? <><CheckCircle2 size={16} /> Approved</> : <><ShieldCheck size={16} /> Approval required</>}</div></div>{paymentRequested && accessRequest.data && <div className="payment-request-panel" aria-live="polite"><div><p className="section-kicker">Requester-only payment instructions</p><h3>Pay 50,000 MMK via KBZPay</h3><p>Send the payment screenshot and request ID to the Telegram bot. Bulk payroll tools unlock only after admin approval.</p><strong>Request ID: {accessRequest.data.requestId.slice(-8)}</strong></div><img src={PAYMENT_QR_URL} alt="KBZPay QR code for the 50,000 MMK access payment" /></div>}</> : <div className="bulk-panel"><div className="bulk-step"><span className="bulk-step-num">1</span><div><strong>Download template</strong><p>One row per employee. Use the same columns as the single calculator.</p><button type="button" className="button-print" onClick={downloadTemplate}><Download size={14} /> Download .xlsx template</button></div></div><div className="bulk-step"><span className="bulk-step-num">2</span><div><strong>Upload and calculate</strong><p>{uploadName ? <><strong>{uploadName}</strong> · {summary}</> : summary}</p><label className="bulk-upload"><Upload size={15} /> Choose .xlsx file<input type="file" accept=".xlsx,.xls" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} /></label>{uploadError && <p className="bulk-upload-error" role="alert">{uploadError}</p>}{rows.length > 0 && <div className="bulk-upload-summary"><div><span>Gross / month</span><strong>{formatMMK(totals.grossMonthly)}</strong></div><div><span>Net / month</span><strong>{formatMMK(totals.netMonthly)}</strong></div><div><span>Employer cost</span><strong>{formatMMK(totals.employerCost)}</strong></div>{rowWarnings.length > 0 && <p className="bulk-upload-warning">{rowWarnings.length} row warning{rowWarnings.length === 1 ? "" : "s"}; review the highlighted input rows before export.</p>}<button type="button" className="bulk-clear-button" onClick={clearFile}>Clear upload</button></div>}</div></div><div className="bulk-step"><span className="bulk-step-num">3</span><div><strong>Download payroll document package</strong><p>Calculation, SSB, PAYE-A, headcount payslips, Form 15(A) working data, and an email queue. Form 15(A) still needs human review before filing.</p><button type="button" className="button-print" disabled={!rows.length} onClick={() => exportRows(rows)}><Download size={14} /> Download document package</button></div></div></div>}<div className="bulk-notes"><details><summary>Plain-language notes</summary><p>PIT uses the same current progressive brackets, reliefs, employee SSB deduction, and employer gross-up logic as the single calculator. Annual income up to MMK 4.8M is exempt; bonuses are included in annual income; SSB is calculated separately at employee 2% and employer 3% on a 300,000 MMK monthly ceiling. Form 15(A) and government forms are working documents only until identities, monthly actuals, payment references, and filing details are verified.</p></details></div></section>;
}

export function BulkPayrollSection({ approved }: { approved: boolean }) {
  if (approved) return <BulkPayroll sharedApprovalActive />;

  return (
    <section className="bulk-section section-pad" id="bulk-payroll" aria-live="polite">
      <div className="bulk-intro">
        <div>
          <p className="section-kicker"><FileSpreadsheet size={15} /> Bulk payroll</p>
          <h2>Import once,<br /><i>prepare the package.</i></h2>
        </div>
        <p className="section-description">
          Prepare one employee list and produce calculation, SSB contribution, and PAYE-A output files from the same input.
        </p>
      </div>
      <div className="bulk-panel bulk-gate">
        <div className="bulk-step">
          <span className="bulk-step-num"><LockKeyhole size={16} /></span>
          <div>
            <strong>Available after Telegram approval</strong>
            <p>Download template, Upload, and the three Output files will appear here after the shared Telegram approval above. Until then, the payroll file actions stay locked.</p>
          </div>
        </div>
        <div className="calculator-gate-status"><ShieldCheck size={16} /> Telegram approval required</div>
      </div>
    </section>
  );
}

export const bulkPayrollPrivacyNote = "Bulk processing is client-side; salary rows are not uploaded to the server.";
export const bulkPayrollFinancialYear = formatFinancialYear("2026-2027");
