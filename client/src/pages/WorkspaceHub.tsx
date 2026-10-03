import { useMemo, useState } from "react";
import { Download, FileText, HelpCircle, Plus, Printer, Search, Trash2 } from "lucide-react";
import "./clean-product.css";

type Doc = { id: string; name: string; category: string; size: number; dataUrl?: string; createdAt: string };
const STORAGE = "zeke-clean-documents";
const seedDocs: Doc[] = [
  { id: "welcome", name: "Employee document workspace", category: "Guide", size: 0, createdAt: "Ready" },
];
const forms = [
  ["Employment confirmation", "Confirmation letter for a new employee"],
  ["Leave request", "Structured leave request record"],
  ["Resignation acknowledgement", "Acknowledge and record a resignation"],
  ["Salary adjustment", "Document a salary or allowance change"],
  ["Employee request", "General employee request form"],
  ["Performance note", "Private manager / HR working note"],
];
const guidance = [
  ["Resignation", "Confirm notice, collect the handover, check final-pay items, and record the exit date."],
  ["Leave", "Check the leave policy, confirm balance, approve the dates, and keep the decision in the employee record."],
  ["Payroll", "Confirm gross pay, PIT, SSB, deductions, and supporting documents before final approval."],
  ["Workplace communication", "Use factual language, document the issue, and route sensitive cases to an authorised HR person."],
];
const readDocs = (): Doc[] => { try { return JSON.parse(localStorage.getItem(STORAGE) || "null") || seedDocs; } catch { return seedDocs; } };
const saveDocs = (docs: Doc[]) => localStorage.setItem(STORAGE, JSON.stringify(docs));
const download = (name: string, content: string, type = "text/plain") => { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); };

export default function WorkspaceHub() {
  const [tab, setTab] = useState("forms");
  const [docs, setDocs] = useState<Doc[]>(readDocs);
  const [query, setQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState(forms[0][0]);
  const [employeeName, setEmployeeName] = useState("");
  const [formBody, setFormBody] = useState("");
  const filteredDocs = useMemo(() => docs.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase())), [docs, query]);
  const addFile = async (file: File) => {
    const reader = new FileReader(); reader.onload = () => { const next = [{ id: crypto.randomUUID(), name: file.name, category: "Uploaded", size: file.size, dataUrl: typeof reader.result === "string" ? reader.result : undefined, createdAt: new Date().toLocaleString() }, ...docs]; setDocs(next); saveDocs(next); }; reader.readAsDataURL(file);
  };
  const removeDoc = (id: string) => { const next = docs.filter((doc) => doc.id !== id); setDocs(next); saveDocs(next); };
  const generateForm = () => { const text = `${selectedForm}\n\nEmployee: ${employeeName || "Not provided"}\nDate: ${new Date().toLocaleDateString()}\n\n${formBody || "Details to be completed by HR."}\n\nPrepared with Zeke HR & Workplace Assistant.\nThis is a working template, not an official government submission.`; download(`${selectedForm.toLowerCase().replaceAll(" ", "-")}.doc`, text, "application/msword"); };
  return <main className="clean-page"><header className="clean-page-header"><div><p className="clean-eyebrow">Zeke · Protected workspace</p><h1>HR workspace, in one clear place.</h1><p>Prepare forms, manage browser-only documents, generate working letters, and follow practical HR guidance.</p></div><a className="clean-back" href="/">Back to Zeke</a></header>
    <nav className="clean-tabs" aria-label="Workspace sections">{[["forms", "HR Forms"], ["documents", "Documents"], ["guidance", "Guidance"], ["generator", "Document Generator"]].map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "forms" && <section className="clean-grid"><div className="clean-card"><p className="clean-eyebrow">Templates</p><h2>Start with a clear HR form.</h2><p>Select a working template, complete the details, and download or print it for review.</p><div className="clean-list">{forms.map(([title, description]) => <button key={title} className="clean-list-row" onClick={() => { setSelectedForm(title); setTab("generator"); }}><FileText size={18} /><span><strong>{title}</strong><small>{description}</small></span></button>)}</div></div><div className="clean-card clean-note"><HelpCircle size={22} /><h3>Safe by default</h3><p>These templates are preparation tools. Verify current Myanmar rules and your organisation policy before using them for an official decision.</p><a href="/payroll-disclaimer">Read payroll disclaimer</a></div></section>}
    {tab === "documents" && <section className="clean-card"><div className="clean-toolbar"><div><p className="clean-eyebrow">Browser-only document library</p><h2>Your working documents</h2></div><label className="clean-button"><Plus size={16} /> Upload<input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.png,.jpg,.jpeg" onChange={(e) => { const file = e.target.files?.[0]; if (file) void addFile(file); }} /></label></div><p className="clean-muted">Files remain in this browser for this workspace. Do not upload confidential employee files to a public/shared device.</p><label className="clean-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" /></label><div className="clean-doc-list">{filteredDocs.map((doc) => <div className="clean-doc-row" key={doc.id}><FileText size={18} /><div><strong>{doc.name}</strong><small>{doc.category} · {doc.size ? `${Math.round(doc.size / 1024)} KB` : doc.createdAt}</small></div><div className="clean-row-actions">{doc.dataUrl && <a href={doc.dataUrl} download={doc.name} aria-label={`Download ${doc.name}`}><Download size={16} /></a>} {doc.id !== "welcome" && <button onClick={() => removeDoc(doc.id)} aria-label={`Delete ${doc.name}`}><Trash2 size={16} /></button>}</div></div>)}</div></section>}
    {tab === "guidance" && <section className="clean-grid"><div className="clean-card"><p className="clean-eyebrow">Practical steps</p><h2>Guidance for everyday HR work.</h2>{guidance.map(([title, body]) => <article className="clean-guidance" key={title}><h3>{title}</h3><p>{body}</p><span>Check the current policy and escalate sensitive cases to authorised HR.</span></article>)}</div><div className="clean-card clean-note"><h3>Answer → Tool → Action</h3><p>Ask Zeke for an explanation, open the relevant service, then save the working record or form you need.</p><button className="clean-button" onClick={() => window.dispatchEvent(new Event("open-zeke-chat"))}>Ask Zeke</button></div></section>}
    {tab === "generator" && <section className="clean-grid"><div className="clean-card"><p className="clean-eyebrow">Working document generator</p><h2>Create an HR letter.</h2><label>Document type<select value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)}>{forms.map(([title]) => <option key={title}>{title}</option>)}</select></label><label>Employee name<input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Enter employee name" /></label><label>Details<textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} placeholder="Add the facts, dates, and next steps" rows={6} /></label><div className="clean-actions"><button className="clean-button" onClick={generateForm}><Download size={16} /> Generate .doc</button><button className="clean-button secondary" onClick={() => window.print()}><Printer size={16} /> Print</button></div></div><div className="clean-card clean-note"><h3>Before you use it</h3><p>Review names, dates, policy references, approval status, and any required legal or tax advice. Zeke templates do not replace an authorised HR review.</p></div></section>}
  </main>;
}
