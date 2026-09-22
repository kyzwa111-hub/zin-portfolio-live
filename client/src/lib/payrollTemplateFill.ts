import * as XLSX from "xlsx";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type AutoFillKind = "monthly-paye" | "monthly-ssb" | "annual-ird" | "annual-cover-letter";

export type PayrollAutoFillData = {
  monthlyGross: number;
  annualGross: number;
  employeeSSB: number;
  employerSSB: number;
  monthlyPIT: number;
  annualPIT: number;
  monthlyNet: number;
  employerCost: number;
  taxableIncome: number;
  lifeInsurance: number;
  otherDeductions: number;
  parents: number;
  spouse: number;
  children: number;
  taxLabel: string;
  taxEffective: string;
  taxMode: "employee" | "employer";
};

const money = (value: number) => Math.round(value);
const isoDate = new Date().toISOString().slice(0, 10);
const year = new Date().getFullYear();

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readWorkbook(templateUrl: string) {
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error(`Template download failed (${response.status})`);
  return XLSX.read(await response.arrayBuffer(), { type: "array", cellStyles: true, cellDates: true });
}

function fillMonthlyPaye(workbook: XLSX.WorkBook, data: PayrollAutoFillData) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  sheet.A7 = { t: "n", v: 1 };
  sheet.B7 = { t: "s", v: "Payroll employee" };
  sheet.M7 = { t: "s", v: new Date().toLocaleString("en-US", { month: "short" }).toUpperCase() };
  sheet.N7 = { t: "n", v: year };
  sheet.O7 = { t: "s", v: isoDate.split("-").reverse().join("-") };
  sheet.P7 = { t: "n", v: money(data.monthlyGross) };
  sheet.Q7 = { t: "n", v: 0 };
  sheet.R7 = { t: "n", v: money(data.monthlyPIT) };
  sheet.S7 = { t: "s", v: `${data.taxLabel} · ${data.taxMode === "employee" ? "employee-borne PIT" : "employer-borne PIT"}` };
  sheet.T7 = { t: "s", v: "" };
  sheet.U7 = { t: "s", v: "" };
  sheet.W7 = { t: "s", v: "" };
}

export function getSSBTemplateValues(monthlyGross: number) {
  const contributionBase = Math.min(Math.max(0, monthlyGross), 300_000);
  const employerHealth = contributionBase * 0.02;
  const employerInjury = contributionBase * 0.01;
  const employerTotal = employerHealth + employerInjury;
  const employeeTotal = contributionBase * 0.02;
  return { contributionBase, employerHealth, employerInjury, employerTotal, employeeTotal, total: employerTotal + employeeTotal };
}

function fillMonthlySsb(workbook: XLSX.WorkBook, data: PayrollAutoFillData) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const { contributionBase, employerHealth, employerInjury, employerTotal, employeeTotal, total } = getSSBTemplateValues(data.monthlyGross);
  sheet.A7 = { t: "n", v: 1 };
  sheet.B7 = { t: "s", v: "Payroll employee" };
  sheet.C7 = { t: "s", v: "Payroll employee" };
  sheet.D7 = { t: "s", v: "N/A" };
  sheet.E7 = { t: "s", v: "Payroll employee" };
  sheet.F7 = { t: "s", v: "—" };
  sheet.G7 = { t: "n", v: money(data.monthlyGross) };
  sheet.H7 = { t: "n", v: money(employerHealth) };
  sheet.I7 = { t: "n", v: money(employeeTotal) };
  sheet.J7 = { t: "n", v: money(employerInjury) };
  sheet.K7 = { t: "n", v: money(employerTotal) };
  sheet.L7 = { t: "n", v: money(employeeTotal) };
  sheet.M7 = { t: "n", v: money(total) };
  sheet.N7 = { t: "s", v: `${data.taxLabel} estimate` };
}

function fillAnnualIrd(workbook: XLSX.WorkBook, data: PayrollAutoFillData) {
  const sheet = workbook.Sheets["Employee List"] ?? workbook.Sheets[workbook.SheetNames[0]];
  const totalDeductions = data.employeeSSB * 12 + data.lifeInsurance + data.otherDeductions;
  sheet.A7 = { t: "n", v: 1 };
  sheet.B7 = { t: "s", v: "Payroll employee" };
  sheet.K7 = { t: "s", v: "Payroll employee" };
  sheet.L7 = { t: "n", v: money(data.annualGross) };
  sheet.M7 = { t: "n", v: 0 };
  sheet.N7 = { t: "n", v: money(data.annualGross) };
  sheet.O7 = { t: "n", v: money(data.employeeSSB * 12) };
  sheet.P7 = { t: "n", v: money(data.lifeInsurance) };
  sheet.Q7 = { t: "n", v: money(data.otherDeductions) };
  sheet.R7 = { t: "n", v: money(totalDeductions) };
  sheet.S7 = { t: "s", v: data.spouse > 0 ? "No taxable income" : "N/A" };
  sheet.T7 = { t: "n", v: Math.floor(data.children) };
  sheet.U7 = { t: "n", v: Math.floor(data.parents) };
  sheet.V7 = { t: "n", v: money(data.annualPIT) };
}

export async function downloadFilledExcelTemplate(templateUrl: string, kind: "monthly-paye" | "monthly-ssb" | "annual-ird", data: PayrollAutoFillData) {
  const workbook = await readWorkbook(templateUrl);
  if (kind === "monthly-paye") fillMonthlyPaye(workbook, data);
  if (kind === "monthly-ssb") fillMonthlySsb(workbook, data);
  if (kind === "annual-ird") fillAnnualIrd(workbook, data);
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `zin-min-htet-${kind}-${year}-filled.xlsx`);
}

export async function downloadFilledCoverLetter(data: PayrollAutoFillData) {
  const document = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: "To: Head of Department, Internal Revenue Department", spacing: { after: 240 } }),
        new Paragraph({ text: `Date: ${isoDate}`, spacing: { after: 240 } }),
        new Paragraph({ text: "Subject: Annual salary statement preparation — auto-filled working draft", heading: HeadingLevel.HEADING_2, spacing: { after: 240 } }),
        new Paragraph({ children: [new TextRun("Employer / Company: "), new TextRun({ text: "[Enter employer name]", bold: true })] }),
        new Paragraph({ children: [new TextRun("TIN: "), new TextRun({ text: "[Enter TIN]", bold: true })] }),
        new Paragraph({ text: `Financial year basis: ${data.taxEffective}`, spacing: { after: 180 } }),
        new Paragraph({ text: "This working draft was auto-filled from the Zin Min Htet payroll calculator. Replace the placeholders, attach the official salary statement, and verify current IRD filing requirements before submission.", spacing: { after: 180 } }),
        new Paragraph({ text: `Estimated annual gross salary: ${money(data.annualGross).toLocaleString()} MMK` }),
        new Paragraph({ text: `Estimated employee SSB: ${money(data.employeeSSB * 12).toLocaleString()} MMK` }),
        new Paragraph({ text: `Estimated annual PIT withheld: ${money(data.annualPIT).toLocaleString()} MMK`, spacing: { after: 240 } }),
        new Paragraph({ text: "Respectfully,", spacing: { after: 240 } }),
        new Paragraph({ text: "[Authorized signatory]" }),
      ],
    }],
  });
  const blob = await Packer.toBlob(document);
  saveBlob(blob, `zin-min-htet-annual-cover-letter-${year}-filled.docx`);
}
