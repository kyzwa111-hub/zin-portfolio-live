import { useState } from "react";
import { ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Cadence = "monthly" | "annual";
type Kind = "monthly-paye" | "monthly-ssb" | "monthly-tax-card" | "annual-ird" | "annual-cover-letter";
type FileType = "xlsx" | "docx" | "pdf";
type FormTemplateForm = { cadence: Cadence; kind: Kind; title: string; versionLabel: string; description: string; fileType: FileType; fileUrl: string; officialLabel: string; officialUrl: string; isActive: boolean };

const emptyForm: FormTemplateForm = { cadence: "monthly", kind: "monthly-paye", title: "", versionLabel: "FY 2026–2027", description: "", fileType: "xlsx", fileUrl: "", officialLabel: "Open official source", officialUrl: "https://www.ird.gov.mm/", isActive: true };
const kinds: Array<[Kind, string]> = [["monthly-paye", "Monthly PAYE"], ["monthly-ssb", "Monthly SSB"], ["monthly-tax-card", "Monthly tax card"], ["annual-ird", "Annual IRD 03-07"], ["annual-cover-letter", "Annual cover letter"]];

export default function FormTemplateManager() {
  const templates = trpc.formTemplates.adminList.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormTemplateForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const create = trpc.formTemplates.create.useMutation({ onSuccess: async () => { setForm(emptyForm); await utils.formTemplates.adminList.invalidate(); await utils.formTemplates.list.invalidate(); } });
  const update = trpc.formTemplates.update.useMutation({ onSuccess: async () => { setEditingId(null); setForm(emptyForm); await utils.formTemplates.adminList.invalidate(); await utils.formTemplates.list.invalidate(); } });
  const remove = trpc.formTemplates.remove.useMutation({ onSuccess: () => { void utils.formTemplates.adminList.invalidate(); void utils.formTemplates.list.invalidate(); } });
  const set = (key: keyof FormTemplateForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    const payload = { ...form, fileUrl: form.fileUrl.trim(), officialUrl: form.officialUrl.trim() };
    if (editingId) update.mutate({ id: editingId, ...payload }); else create.mutate(payload);
  };
  const beginEdit = (template: NonNullable<typeof templates.data>[number]) => {
    setEditingId(template.id);
    setForm({ cadence: template.cadence, kind: template.kind, title: template.title, versionLabel: template.versionLabel, description: template.description, fileType: template.fileType, fileUrl: template.fileUrl, officialLabel: template.officialLabel, officialUrl: template.officialUrl, isActive: template.isActive === 1 });
  };
  const busy = create.isPending || update.isPending;
  return <section className="admin-card admin-wide-card"><div className="admin-card-heading"><div><span className="admin-eyebrow">Payroll toolkit</span><h2>Form versions &amp; official links</h2></div><span className="admin-count">{templates.data?.length ?? 0} managed</span></div><p className="admin-section-note">Update the current Excel, DOCX, and PDF download files, version labels, and official government links here. The public calculator reads active records automatically.</p>
    <div className="admin-update-fields form-template-fields">
      <label><span>Cadence</span><select value={form.cadence} onChange={(event) => set("cadence", event.target.value)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
      <label><span>Template kind</span><select value={form.kind} onChange={(event) => set("kind", event.target.value)}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Title</span><input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Monthly PAYE blank template" /></label>
      <label><span>Version label</span><input value={form.versionLabel} onChange={(event) => set("versionLabel", event.target.value)} placeholder="FY 2026–2027 · updated Sep 2026" /></label>
      <label><span>File type</span><select value={form.fileType} onChange={(event) => set("fileType", event.target.value)}><option value="xlsx">Excel (.xlsx)</option><option value="docx">DOCX (.docx)</option><option value="pdf">PDF (.pdf)</option></select></label>
      <label><span>Active</span><select value={form.isActive ? "yes" : "no"} onChange={(event) => set("isActive", event.target.value === "yes")}><option value="yes">Visible on website</option><option value="no">Hidden</option></select></label>
      <label className="admin-field-wide"><span>Download file URL or /manus-storage path</span><input value={form.fileUrl} onChange={(event) => set("fileUrl", event.target.value)} placeholder="https://…/manus-storage/current-form.xlsx" /></label>
      <label className="admin-field-wide"><span>Short public description</span><textarea value={form.description} onChange={(event) => set("description", event.target.value)} rows={3} placeholder="What this template is for and what users should verify." /></label>
      <label><span>Official link label</span><input value={form.officialLabel} onChange={(event) => set("officialLabel", event.target.value)} placeholder="Open official IRD source" /></label>
      <label><span>Official government URL</span><input value={form.officialUrl} onChange={(event) => set("officialUrl", event.target.value)} placeholder="https://www.ird.gov.mm/..." /></label>
    </div>
    <div className="form-template-save-row"><button className="button-primary admin-save" onClick={save} disabled={busy || !form.title.trim() || !form.description.trim() || !form.fileUrl.trim() || !form.officialUrl.trim()}>{busy ? <Loader2 className="spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}{editingId ? "Save form changes" : "Add form version"}</button>{editingId && <button className="admin-cancel" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div>
    <small className="admin-helper">For storage uploads, paste the full deployed URL or the storage path. Keep official links pointed at the government source, not a copied file.</small>
    <div className="admin-list form-template-list">{templates.isLoading ? <div className="admin-empty"><Loader2 className="spin" size={18} /> Loading form versions…</div> : templates.data?.length ? templates.data.map((template) => <article className="admin-list-item" key={template.id}><div><div className="admin-item-top"><span>{template.cadence} · {template.fileType.toUpperCase()}</span><time>{template.versionLabel}</time></div><h3>{template.title}</h3><p>{template.description}</p><strong className={template.isActive === 1 ? "admin-status published" : "admin-status"}>{template.isActive === 1 ? "Visible" : "Hidden"}</strong><a className="admin-original-link" href={template.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} /> {template.officialLabel}</a></div><div className="admin-item-actions"><button onClick={() => beginEdit(template)}><Save size={14} /> Edit</button><button className="danger" onClick={() => { if (window.confirm("Delete this form version from the website?")) remove.mutate({ id: template.id }); }}><Trash2 size={14} /></button></div></article>) : <div className="admin-empty">No form versions yet.</div>}</div>
  </section>;
}
