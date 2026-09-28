import { useState } from "react";
import { Download, ExternalLink, FileText, Printer, ShieldCheck } from "lucide-react";

export type HRSectorId = "recruitment" | "attendance" | "relations" | "performance" | "compliance" | "people-data";

type FieldDefinition = {
  name: string;
  type?: "text" | "date" | "email" | "tel" | "textarea";
};

type TemplateDefinition = {
  id: string;
  title: string;
  description: string;
  fields?: FieldDefinition[];
  sourceUrl?: string;
  sourceLabel?: string;
  notice?: string;
};

export const hrSectorItems: Array<{ id: HRSectorId; title: string; description: string }> = [
  { id: "recruitment", title: "Recruitment & onboarding", description: "CV, appointment, verification, and employee joining templates." },
  { id: "attendance", title: "Attendance & leave", description: "Leave requests, attendance records, and overtime/shift approvals." },
  { id: "relations", title: "Employee relations", description: "Confidential working forms for concerns, incidents, and exit feedback." },
  { id: "performance", title: "Performance operations", description: "Goal setting, review, and performance-support templates." },
  { id: "compliance", title: "HR policies & compliance", description: "Policy acknowledgements, personnel-file checks, and review trackers." },
  { id: "people-data", title: "People data & reporting", description: "Employee records, headcount, joiner/leaver, and training summaries." },
];

const text = (...names: string[]): FieldDefinition[] => names.map((name) => ({ name }));
const textarea = (...names: string[]): FieldDefinition[] => names.map((name) => ({ name, type: "textarea" }));
const date = (...names: string[]): FieldDefinition[] => names.map((name) => ({ name, type: "date" }));

export const hrTemplates: Record<HRSectorId, TemplateDefinition[]> = {
  recruitment: [
    {
      id: "cv-profile",
      title: "CV / Resume profile template",
      description: "A candidate-owned CV worksheet. Fill it in, then download a Word copy to review or edit.",
      fields: [
        ...text("Full name", "Phone number", "Email address", "Current town / preferred work location", "Target job title"),
        ...textarea("Professional summary", "Key skills", "Work experience (role, employer, dates, responsibilities, achievements)", "Education and qualifications", "Languages", "References (optional)"),
      ],
      notice: "Your entries stay in this browser until you download the file. Do not include national ID, bank, or other unnecessary sensitive details in a CV.",
    },
    {
      id: "officer-appointment-letter",
      title: "Officer appointment / offer letter",
      description: "Editable employer-side draft for an appointment or offer. Review company policy and local requirements before issuing.",
      fields: [
        ...date("Letter date", "Proposed start date", "Response deadline"),
        ...text("Employer / company name", "Company address", "Employee / candidate name", "Position title", "Department", "Reports to", "Work location", "Employment type", "Probation period", "Salary / compensation terms", "Benefits / allowances", "Working schedule", "HR contact", "Authorised signatory"),
        ...textarea("Offer conditions / documents required", "Additional terms or notes"),
      ],
      notice: "Working draft only; not legal advice and not a government form. Have an authorised employer representative review it before use.",
    },
    {
      id: "employment-verification",
      title: "Employee / employment verification form",
      description: "A consent-aware checklist for verifying employment details or preparing a service confirmation letter.",
      fields: [
        ...text("Employee name", "Position / job title", "Department", "Employment type", "Verification requested by", "Purpose of verification", "Verifier name and role", "Company name", "Company contact details"),
        ...date("Employment start date", "Employment end date (if applicable)", "Verification date"),
        ...textarea("Information confirmed", "Employee consent / authority reference", "Verification result and follow-up"),
      ],
      notice: "Confirm the employee's authority before sharing personal employment information with a third party.",
    },
    {
      id: "onboarding-checklist",
      title: "Recruitment & onboarding checklist",
      description: "Track interview, offer, joining documents, orientation, and the first follow-up without storing files here.",
      fields: [
        ...text("Candidate / employee name", "Role / department", "Recruitment owner", "Hiring manager", "Document checklist status", "Equipment / account owner"),
        ...date("Offer date", "Start date", "Orientation date", "First follow-up date"),
        ...textarea("Interview / selection notes", "Documents received (list only)", "Orientation and training plan", "Next action"),
      ],
      notice: "Do not attach or enter identity-document numbers in this local worksheet. Store official personnel records only in your authorised HR system.",
    },
    {
      id: "government-ec-reference",
      title: "Myanmar standard Employment Contract (EC) — reference copy",
      description: "A Burmese 2017 reference copy. The host describes it as the template announced by the Ministry of Labour on 28 August 2017; this site has not verified that it is the latest version.",
      sourceUrl: "https://www.myanmar-law-library.org/IMG/pdf/template_labour_burmese.pdf",
      sourceLabel: "Open 2017 Burmese EC reference PDF",
      notice: "The copy is hosted by Myanmar Law Library, not a government domain. Check the current approved template and township labour-office process before signing or filing. This website does not create or submit an official EC.",
    },
  ],
  attendance: [
    {
      id: "leave-request",
      title: "Leave request & approval",
      description: "Employee request and supervisor decision record.",
      fields: [
        ...text("Employee name", "Employee ID / internal reference (optional)", "Department", "Leave type", "Contact during leave", "Approver name"),
        ...date("Request date", "Leave start date", "Leave end date", "Return-to-work date"),
        ...textarea("Reason / handover note", "Approval decision and comments"),
      ],
      notice: "Use your organisation's current leave policy and keep medical details out unless specifically required and authorised.",
    },
    {
      id: "attendance-register",
      title: "Monthly attendance register",
      description: "A simple period summary; enter attendance codes or attach the authorised timekeeping report separately.",
      fields: [
        ...text("Employee name", "Employee ID / internal reference", "Department", "Month / reporting period", "Working days", "Present days", "Leave days", "Absence / exception days", "Prepared by", "Reviewed by"),
        ...textarea("Date-by-date attendance exceptions", "Payroll cut-off note"),
      ],
      notice: "This worksheet does not calculate payroll or replace an official timekeeping system.",
    },
    {
      id: "overtime-shift-approval",
      title: "Overtime / shift-change approval",
      description: "Record the requested schedule change and the approval trail.",
      fields: [
        ...text("Employee name", "Department", "Request type", "Reason", "Approver"),
        ...date("Request date", "Work date / shift date"),
        ...text("Current shift / hours", "Requested shift / overtime hours", "Compensation / time-off arrangement"),
        ...textarea("Handover / safety notes", "Decision and comments"),
      ],
    },
  ],
  relations: [
    {
      id: "employee-grievance",
      title: "Employee concern / grievance record",
      description: "A restricted-access working note to track intake, assigned owner, and follow-up.",
      fields: [
        ...text("Case reference (avoid personal ID numbers)", "Employee name or internal reference", "Intake channel", "Issue category", "Assigned HR owner"),
        ...date("Date received", "Follow-up date"),
        ...textarea("Employee's stated concern", "Immediate support / safety action", "Steps taken and people consulted", "Outcome / next step"),
      ],
      notice: "Confidential: keep this document in an access-controlled HR system, not a shared public folder.",
    },
    {
      id: "incident-record",
      title: "Workplace incident record",
      description: "Capture objective facts, response, and follow-up; avoid unsupported conclusions.",
      fields: [
        ...date("Incident date", "Report date"),
        ...text("Location", "Reporter name / role", "People involved (minimum necessary)", "Incident category", "Witness reference"),
        ...textarea("What happened (facts only)", "Immediate response", "Evidence / supporting records location", "Follow-up owner and due date", "Review outcome"),
      ],
      notice: "Handle health, safety, and personal information under your organisation's restricted-record rules.",
    },
    {
      id: "exit-interview",
      title: "Exit interview & handover",
      description: "A structured close-out checklist and optional employee feedback form.",
      fields: [
        ...text("Employee name / internal reference", "Role", "Department", "Interview facilitator", "Handover owner"),
        ...date("Interview date", "Final working day", "Equipment return date"),
        ...textarea("Reason for leaving (employee's words)", "Feedback on the work experience", "Open handover items", "Access / property return checklist", "Follow-up action"),
      ],
    },
  ],
  performance: [
    {
      id: "goal-review",
      title: "Goal setting & performance review",
      description: "Set measurable goals, review evidence, and record support needed.",
      fields: [
        ...text("Employee name", "Role", "Department", "Manager", "Review period"),
        ...textarea("Goals and expected outcomes", "Evidence / results", "Strengths demonstrated", "Development areas", "Support or training needed", "Agreed next steps"),
        ...date("Review date", "Next review date"),
      ],
      notice: "Use role-related, documented criteria. Avoid collecting sensitive personal characteristics in performance scoring.",
    },
    {
      id: "kpi-plan",
      title: "KPI / objective plan",
      description: "Define ownership, measure, target, due date, and review cadence for each objective.",
      fields: [
        ...text("Employee / team", "Role", "Review period", "Objective 1", "Measure / baseline", "Target", "Owner", "Objective 2", "Measure / baseline 2", "Target 2"),
        ...date("Plan start date", "Review date"),
        ...textarea("Dependencies / support needed", "Check-in notes"),
      ],
    },
    {
      id: "performance-support-plan",
      title: "Performance support plan",
      description: "Document a fair improvement plan with clear expectations, support, and review dates.",
      fields: [
        ...text("Employee name", "Role", "Manager", "Plan duration", "Expectation / standard", "Success measure"),
        ...date("Plan start date", "Check-in date", "Final review date"),
        ...textarea("Observed work-related gap and examples", "Support / training provided", "Employee comments", "Review outcome and next steps"),
      ],
      notice: "Working HR template only. Follow internal policy, applicable law, and a fair review process.",
    },
  ],
  compliance: [
    {
      id: "policy-acknowledgement",
      title: "Policy acknowledgement",
      description: "Record that a policy version was provided and acknowledged.",
      fields: [
        ...text("Policy title", "Policy version", "Employee name / internal reference", "Department", "Policy owner"),
        ...date("Policy issued date", "Acknowledgement date", "Next review date"),
        ...textarea("Questions / clarification needed", "Acknowledgement note"),
      ],
      notice: "An acknowledgement is not a substitute for legal review or a copy of the policy itself.",
    },
    {
      id: "personnel-file-checklist",
      title: "Personnel-file checklist",
      description: "Track whether required record types are present without entering document numbers or uploading copies.",
      fields: [
        ...text("Employee name / internal reference", "Role", "Department", "File owner"),
        ...textarea("Offer / appointment letter status", "Signed EC status and current-version check", "Role / policy acknowledgements", "Training and licence records (if applicable)", "Missing item and follow-up owner"),
        ...date("Last checked", "Next review date"),
      ],
      notice: "Do not store identity-document scans, bank details, or confidential attachments in this form.",
    },
    {
      id: "compliance-review-tracker",
      title: "HR compliance review tracker",
      description: "Track the owner, official source, review date, and outstanding actions for a requirement.",
      fields: [
        ...text("Requirement / policy", "Business unit", "Responsible owner", "Official source / reference", "Status"),
        ...date("Last checked", "Due date", "Next review date"),
        ...textarea("Evidence location (restricted system only)", "Open action", "Reviewer notes"),
      ],
      notice: "Check rates, forms, deadlines, and official instructions against the relevant authority before filing.",
    },
  ],
  "people-data": [
    {
      id: "headcount-report",
      title: "Monthly headcount report",
      description: "Summarise totals and movement without listing employee-level personal data.",
      fields: [
        ...text("Report owner", "Department / business unit", "Reporting period", "Opening headcount", "Joiners", "Leavers", "Closing headcount", "Approved vacancies"),
        ...textarea("Data source and cut-off", "Notes / variance explanation"),
      ],
    },
    {
      id: "joiner-leaver-report",
      title: "Joiner / leaver tracker",
      description: "A minimal staffing-movement tracker using internal references where possible.",
      fields: [
        ...text("Employee name / internal reference", "Movement type", "Role", "Department", "Location", "Reason category", "Action owner"),
        ...date("Effective date", "System access close / start date", "Next follow-up date"),
        ...textarea("Required handover / onboarding action", "Completion notes"),
      ],
      notice: "Avoid storing sensitive departure reasons or identity data in a general reporting sheet.",
    },
    {
      id: "training-record",
      title: "Training & development record",
      description: "Record planned learning, attendance, and job-related follow-up.",
      fields: [
        ...text("Employee name / internal reference", "Role / department", "Course / training title", "Provider", "Training hours", "Completion status", "Record owner"),
        ...date("Planned date", "Completion date", "Follow-up date"),
        ...textarea("Learning objective", "Evidence / certificate location (restricted system)", "On-the-job follow-up"),
      ],
    },
  ],
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function HRSectorForm({ id }: { id: HRSectorId }) {
  const sector = hrSectorItems.find((entry) => entry.id === id)!;
  const sectorTemplates = hrTemplates[id];
  const [selectedTemplateId, setSelectedTemplateId] = useState(sectorTemplates[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const selected = sectorTemplates.find((template) => template.id === selectedTemplateId) ?? sectorTemplates[0];
  const fields = selected.fields ?? [];

  const setField = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setStatus("");
  };

  const downloadCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [fields.map((field) => field.name), fields.map((field) => values[field.name] ?? "")];
    downloadBlob(new Blob(["\ufeff", rows.map((row) => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${id}-${selected.id}.csv`);
    setStatus("CSV татахад бэлэн боллоо.");
  };

  const downloadDocx = async () => {
    try {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
      const children = [
        new Paragraph({ text: selected.title, heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: selected.description, italics: true })] }),
        new Paragraph({ text: "" }),
        ...fields.flatMap((field) => [
          new Paragraph({ text: field.name, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: values[field.name]?.trim() || "____________________________________________________________" }),
          new Paragraph({ text: "" }),
        ]),
        ...(selected.notice ? [new Paragraph({ children: [new TextRun({ text: selected.notice, italics: true })] })] : []),
        new Paragraph({ children: [new TextRun({ text: "HR working template — review before use. This file is generated in your browser; the website does not store your entries.", size: 18 })] }),
      ];
      const document = new Document({ sections: [{ properties: {}, children }] });
      downloadBlob(await Packer.toBlob(document), `${id}-${selected.id}.docx`);
      setStatus("Word form татахад бэлэн боллоо.");
    } catch (error) {
      console.error("Could not generate HR template", error);
      setStatus("Word файл үүсгэж чадсангүй. CSV татах эсвэл Print / Save as PDF товчийг ашиглана уу.");
    }
  };

  return (
    <section className="workspace-detail-panel hr-template-panel">
      <div className="workspace-detail-heading">
        <p className="section-kicker"><FileText size={15} /> {sector.title}</p>
        <h3>Related forms &amp; templates</h3>
        <p>{sector.description}</p>
      </div>
      <div className="hr-template-picker" aria-label={`${sector.title} templates`}>
        {sectorTemplates.map((template) => (
          <button key={template.id} type="button" className={selected.id === template.id ? "hr-template-choice selected" : "hr-template-choice"} onClick={() => { setSelectedTemplateId(template.id); setValues({}); setStatus(""); }} aria-pressed={selected.id === template.id}>
            <strong>{template.title}</strong><span>{template.description}</span>
          </button>
        ))}
      </div>
      <div className="hr-template-active">
        <div className="workspace-detail-heading">
          <h4>{selected.title}</h4>
          <p>{selected.description}</p>
        </div>
        {selected.sourceUrl ? (
          <div className="hr-template-reference">
            <p>{selected.notice}</p>
            <a className="button-primary" href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel} <ExternalLink size={15} /></a>
          </div>
        ) : (
          <>
            <div className="workspace-form-grid">
              {fields.map((field) => (
                <label key={field.name} className={field.type === "textarea" ? "hr-template-long-field" : undefined}>
                  <span>{field.name}</span>
                  {field.type === "textarea" ? (
                    <textarea value={values[field.name] ?? ""} onChange={(event) => setField(field.name, event.target.value)} rows={3} maxLength={5000} placeholder={field.name} />
                  ) : (
                    <input type={field.type ?? "text"} value={values[field.name] ?? ""} onChange={(event) => setField(field.name, event.target.value)} maxLength={1000} placeholder={field.name} />
                  )}
                </label>
              ))}
            </div>
            {selected.notice && <p className="hr-template-notice"><ShieldCheck size={15} /> {selected.notice}</p>}
            <div className="workspace-form-actions hr-template-actions">
              <button type="button" className="button-primary" onClick={() => void downloadDocx()}><Download size={15} /> Word (.docx)</button>
              <button type="button" className="button-print" onClick={downloadCsv}><Download size={15} /> CSV</button>
              <button type="button" className="button-print" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</button>
              <span><ShieldCheck size={14} /> Form data stays in this browser; nothing is uploaded or saved by the site.</span>
            </div>
            {status && <p className="hr-template-status" role="status">{status}</p>}
          </>
        )}
      </div>
    </section>
  );
}
