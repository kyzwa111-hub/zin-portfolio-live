import { Download, ExternalLink, FileText } from "lucide-react";
import type { PayrollAutoFillData } from "@/lib/payrollTemplateFill";

const officialForms = [
  { title: "PIT monthly government format · 03-06", kind: "Monthly PAYE", url: "/data-sources/ird-03-06.pdf", official: "https://www.ird.gov.mm/storage/forms/6a59e2576ed5c-03-06.pdf", description: "Official salary-tax withholding schedule for monthly PAYE preparation." },
  { title: "PIT electronic format · 03-06(a)", kind: "Monthly PAYE file guide", url: "/data-sources/ird-03-06-a.pdf", official: "https://www.ird.gov.mm/storage/forms/6a59e269d243a-03-06-a.pdf", description: "Official field specification for the electronic / Excel salary withholding schedule." },
  { title: "Annual salary filing format · 03-07", kind: "Annual IRD", url: "/data-sources/ird-03-07.pdf", official: "https://www.ird.gov.mm/storage/forms/6a59e2854eccf-03-07.pdf", description: "Official annual salary statement reference for salary, SSF, insurance, reliefs, and tax withheld." },
  { title: "SSB monthly contribution reference", kind: "SSB", url: "/data-sources/ssb-contribution-formula.pdf", official: "https://www.ssb.gov.mm/portal/qna", description: "Official contribution formula and guidance. The current Form 13 / monthly workbook must be obtained from SSB or the relevant township office; it is not publicly downloadable here." },
];

export default function PayrollFormDownloads({ data }: { data: PayrollAutoFillData | null }) {
  return <section className="payroll-downloads" aria-labelledby="payroll-downloads-title">
    <div className="payroll-downloads-heading"><div><p className="section-kicker"><FileText size={15} /> Official form library</p><h3 id="payroll-downloads-title">Monthly payroll and annual filing formats.</h3></div><p>Official references from IRD and SSB. Check the current version before filing.</p></div>
    <div className="payroll-download-grid payroll-download-grid-expanded">{officialForms.map((form) => <article className="payroll-download-card" key={form.title}><span className="payroll-download-label">{form.kind}</span><strong>{form.title}</strong><p>{form.description}</p><div className="payroll-download-actions"><a className="payroll-download-action" href={form.url} target="_blank" rel="noreferrer">Open / download <Download size={14} /></a><a className="payroll-official-link" href={form.official} target="_blank" rel="noreferrer">Official source <ExternalLink size={12} /></a></div></article>)}</div>
    <p className="payroll-download-note">{data ? "Payslip calculations are available above. Government PDFs are references; this site does not submit tax or SSB filings." : "Preparation references only. SSB Form 13 and its monthly workbook must be confirmed with the authority."}</p>
  </section>;
}
