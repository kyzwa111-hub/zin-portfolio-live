import { useState } from "react";
import { Download, ExternalLink, FileSpreadsheet, FileText, Loader2, WandSparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { downloadFilledCoverLetter, downloadFilledExcelTemplate, PayrollAutoFillData } from "@/lib/payrollTemplateFill";

type FormKind = "monthly-paye" | "monthly-ssb" | "monthly-tax-card" | "annual-ird" | "annual-cover-letter";
type FormTemplate = { id: number; cadence: "monthly" | "annual"; kind: FormKind; title: string; versionLabel: string; description: string; fileType: "xlsx" | "docx" | "pdf"; fileUrl: string; officialLabel: string; officialUrl: string; isActive: number };

const kindOrder: FormKind[] = ["monthly-paye", "monthly-ssb", "monthly-tax-card", "annual-ird", "annual-cover-letter"];
const kindLabel: Record<FormKind, string> = { "monthly-paye": "Monthly · PAYE", "monthly-ssb": "Monthly · SSB", "monthly-tax-card": "Monthly · Tax card", "annual-ird": "Annual · IRD 03-07", "annual-cover-letter": "Annual · Cover letter" };

export default function PayrollFormDownloads({ data }: { data: PayrollAutoFillData | null }) {
  const templates = trpc.formTemplates.list.useQuery();
  const [fillingKind, setFillingKind] = useState<FormKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTemplates = [...((templates.data ?? []) as FormTemplate[])].sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));

  const autoFill = async (template: FormTemplate) => {
    if (!data) return;
    setError(null);
    setFillingKind(template.kind);
    try {
      if (template.kind === "annual-cover-letter") await downloadFilledCoverLetter(data);
      else if (template.kind === "monthly-paye" || template.kind === "monthly-ssb" || template.kind === "annual-ird") await downloadFilledExcelTemplate(template.fileUrl, template.kind, data);
    } catch (fillError) {
      setError(fillError instanceof Error ? fillError.message : "Could not create the filled template.");
    } finally {
      setFillingKind(null);
    }
  };

  return <div className="payroll-downloads" aria-labelledby="payroll-downloads-title">
    <div className="payroll-downloads-heading">
      <div><p className="section-kicker"><Download size={15} /> Form templates</p><h3 id="payroll-downloads-title">Monthly and annual formats, ready to adapt.</h3></div>
      <p>Download individual Excel, DOCX, and PDF files. Admin can update versions and official links without editing code.</p>
    </div>
    {templates.isLoading ? <div className="payroll-download-loading"><Loader2 className="spin" size={16} /> Loading current form versions…</div> : activeTemplates.length ? <div className="payroll-download-grid payroll-download-grid-expanded">{activeTemplates.map((template) => <article className={`payroll-download-card ${template.cadence === "annual" ? "annual" : ""}`} key={template.id}>
      <span className="payroll-download-label">{kindLabel[template.kind]}</span><strong>{template.title}</strong><small>{template.versionLabel} · {template.fileType.toUpperCase()}</small><p>{template.description}</p>
      <div className="payroll-download-actions"><a className="payroll-download-action" href={template.fileUrl} download>Download blank <Download size={14} /></a>{data && (template.kind === "monthly-paye" || template.kind === "monthly-ssb" || template.kind === "annual-ird" || template.kind === "annual-cover-letter") && <button className="payroll-autofill-action" onClick={() => void autoFill(template)} disabled={fillingKind !== null}>{fillingKind === template.kind ? <Loader2 className="spin" size={13} /> : <WandSparkles size={13} />} Auto-fill &amp; download</button>}</div>
      <a className="payroll-official-link" href={template.officialUrl} target="_blank" rel="noreferrer">{template.officialLabel} <ExternalLink size={12} /></a>
    </article>)}</div> : <p className="payroll-download-note">No active form templates are configured yet. An admin can add the current Excel/DOCX/PDF versions from the control room.</p>}
    {!data && activeTemplates.length > 0 && <p className="payroll-download-note"><WandSparkles size={13} /> Unlock the calculator to enable auto-fill downloads. Blank templates remain available without approval.</p>}
    {error && <p className="payroll-download-error">{error}</p>}
    <p className="payroll-download-note">Preparation aids only—not official government submissions. Verify current IRD and SSB requirements before filing.</p>
  </div>;
}
