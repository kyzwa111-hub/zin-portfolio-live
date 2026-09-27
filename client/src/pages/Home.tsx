import {
  ArrowDown,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import "../workspace.css";
import WorkspaceAccessGate from "@/components/WorkspaceAccessGate";
import PayrollCalculator from "@/components/PayrollCalculator";
import BulkPayroll, { BulkPayrollSection } from "@/components/BulkPayroll";
import CBResourceCenter from "@/components/CBResourceCenter";

const experience = [
  {
    period: "Mar 2026 — Present",
    role: "Payroll Operations Specialist",
    company: "Myanmar Payroll & Outsourcing",
    description: "Multi-client payroll, local compliance, tax computations, and client coordination.",
    current: true,
  },
  {
    period: "Apr 2025 — Mar 2026",
    role: "Payroll Operations Executive",
    company: "Myanmar Payroll & Outsourcing",
    description: "Salary and tax-on-tax calculations, PIT and SSB reporting, and stakeholder support.",
  },
  {
    period: "Jan 2025 — Apr 2025",
    role: "Senior Executive, Human Resources",
    company: "NearMe",
    description: "People operations, employee support, documentation, and HR coordination.",
  },
];

const projects = [
  { number: "01", title: "Multi-client payroll operations", type: "Payroll systems", tag: "Scale + accuracy", image: "/images/portfolio/multi-client-operations.jpg", imageAlt: "Operations team pictured beside a service and workflow display." },
  { number: "02", title: "People & operations support", type: "HR operations", tag: "Human-centered", image: "/images/portfolio/people-operations-team-building.jpg", imageAlt: "Myanmar colleagues gathered at an outdoor team-building event." },
  { number: "03", title: "Team culture in action", type: "MP&O team culture", tag: "People first", image: "/images/portfolio/team-culture-mpo.jpg", imageAlt: "Colleagues at an indoor team-culture gathering." },
  { number: "04", title: "Event & stakeholder coordination", type: "Project delivery", tag: "Detail-led", image: "/images/portfolio/event-stakeholder-coordination.jpg", imageAlt: "Attendee at a formal event with flags and a decorated backdrop." },
];

const recommendations = [
  { name: "May Thandar Kyaw", relationship: "Former colleague · AGS Myanmar", quote: "I had the opportunity to work with Zin Min Htet when he served as a Payroll Officer. Although we worked in different departments, we often worked together. He is a good listener, patient with people, and able to handle workload pressure independently. He is familiar with payroll operations and communicates carefully with others." },
  { name: "Aye Chan Moe", relationship: "Colleague · Payroll & HR operations", quote: "I had the pleasure of working with Zin Min Htet, and I can confidently say he is one of the most hardworking and dedicated colleagues I have known. He consistently puts in the effort to deliver high-quality results. He is also a reliable team player who supports others and shares his knowledge. Any team would be fortunate to have him." },
  { name: "Paing Thit Htoo (Ethan)", relationship: "Former direct manager · CX operations", quote: "Zin Min Htet is the kind of person who spots problems before they happen, fixes them quietly, and always puts the team first. Smart, reliable, and genuinely kind—he is the teammate everyone wants." },
  { name: "Kyaw Htwe", relationship: "Former teammate · Oway Ride Call Center", quote: "I had the pleasure of working with Zin Min Htet at Oway Ride’s Call Center, where he proved to be a dedicated and hardworking colleague. His ability to handle challenges, communicate effectively, and stay committed to his work made a strong impression on me. I have no doubt his dedication and problem-solving skills will continue to drive his success." },
  { name: "Ye Htin Kyaw", relationship: "Former teammate · HR team", quote: "I had the opportunity to work with Zin Min Htet in our HR team, where he served as a Payroll Officer. He handled payroll processes with diligence and accuracy, was detail-oriented, and ensured tasks were completed on time. He is familiar with payroll operations and maintains professionalism in his role." },
];

const strengths = [
  "Payroll processing & compensation",
  "PIT, SSB & statutory support",
  "HR operations & documentation",
  "Client and employee communication",
];

type HRSectorId = "recruitment" | "attendance" | "relations" | "performance" | "compliance" | "people-data";
const hrSectorItems: Array<{ id: HRSectorId; title: string; description: string; fields: string[] }> = [
  { id: "recruitment", title: "Recruitment & onboarding", description: "A working checklist for a clear, documented employee joining process.", fields: ["Candidate / employee name", "Role / department", "Start date", "Documents received", "Orientation owner", "Next action"] },
  { id: "attendance", title: "Attendance & leave", description: "Record attendance exceptions, leave dates, and payroll cut-off follow-up.", fields: ["Employee name", "Month", "Leave type / attendance issue", "Start date", "End date", "Approver", "Payroll cut-off note"] },
  { id: "relations", title: "Employee relations", description: "A confidential working note template for employee queries and follow-up ownership.", fields: ["Case reference", "Employee name", "Date received", "Issue category", "Action owner", "Follow-up date", "Next step"] },
  { id: "performance", title: "Performance operations", description: "Organise review-period goals, feedback, and agreed next steps.", fields: ["Employee name", "Review period", "Role", "Goal / outcome", "Support needed", "Manager follow-up", "Next review date"] },
  { id: "compliance", title: "HR policies & compliance", description: "Track policy reviews and official payroll/SSB source checks. Preparation aid, not legal advice.", fields: ["Policy / record", "Owner", "Last reviewed", "Review due", "Official source checked", "Action required"] },
  { id: "people-data", title: "People data & reporting", description: "A minimal working form for recurring headcount and employee-data reporting.", fields: ["Report name", "Reporting period", "Headcount", "Joiners", "Leavers", "Data owner", "Notes"] },
];
function HRSectorForm({ id }: { id: HRSectorId }) {
  const item = hrSectorItems.find((entry) => entry.id === id)!;
  const [values, setValues] = useState<Record<string, string>>({});
  const exportCsv = () => {
    const escape = (value: string) => "\"" + value.replace(/\"/g, "\"\"") + "\"";
    const csv = [item.fields, item.fields.map((field) => values[field] ?? "")].map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = id + "-working-template.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="workspace-detail-panel"><div className="workspace-detail-heading"><p className="section-kicker"><ClipboardCheck size={15} /> Working template</p><h3>{item.title}</h3><p>{item.description}</p></div><div className="workspace-form-grid">{item.fields.map((field) => <label key={field}><span>{field}</span><input value={values[field] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} placeholder={field} /></label>)}</div><div className="workspace-form-actions"><button type="button" className="button-primary" onClick={exportCsv}><Download size={15} /> Download completed CSV</button><span><ShieldCheck size={14} /> Data stays in this browser; this is a working template, not an official government form.</span></div></section>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceApproved, setWorkspaceApproved] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState("payroll");
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell two-part-portfolio">
      <header className="site-header portfolio-header">
        <a className="brand" href="#personal" onClick={closeMenu}>
          <span className="brand-mark"><Sparkles size={15} /></span>
          <span>zin <em>min htet</em></span>
        </a>
        <button className="mobile-menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "site-nav site-nav-open" : "site-nav"}>
          <a href="#personal" onClick={closeMenu}>Personal info</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="/webinars" onClick={closeMenu}>Events</a>
          <a className="nav-cta" href="https://t.me/Payroll_Officer_bot" target="_blank" rel="noreferrer" onClick={closeMenu}>Unlock Telegram <ArrowUpRight size={14} /></a>
        </nav>
      </header>

      <main>
        <section className="personal-panel" id="personal">
          <div className="personal-panel-inner">
            <div className="personal-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> Personal information · Yangon, Myanmar</p>
              <div className="personal-title-row">
                <span className="personal-icon"><UserRound size={22} /></span>
                <p className="personal-label">Hello, I’m</p>
              </div>
              <h1>Zin Min<br /><span>Htet.</span></h1>
              <p className="personal-lede">Payroll and HR Operations professional who turns complex recurring work into clear, dependable systems.</p>
              <div className="personal-actions">
                <a className="button-primary" href="#services">View my services <ArrowDown size={16} /></a>
                <a className="text-link light-link" href="/webinars"><CalendarDays size={15} /> View events</a>
                <a className="text-link light-link" href="/manus-storage/Zin_Min_Htet_CV__8f66dc0b_490a55be.pdf" target="_blank" rel="noreferrer">View CV <ExternalLink size={15} /></a>
              </div>
              <div className="personal-contact-row">
                <a href="mailto:fzinmin11@gmail.com"><Mail size={15} /> fzinmin11@gmail.com</a>
                <a href="https://www.linkedin.com/in/zin-min-htet-39b0a7243/" target="_blank" rel="noreferrer"><Linkedin size={15} /> LinkedIn</a>
              </div>
            </div>

            <div className="personal-profile-card">
              <div className="profile-photo-frame">
                <img src="/manus-storage/profile_c95ef462_5513abdb.png" alt="Zin Min Htet professional profile" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              </div>
              <div className="profile-card-caption"><span>01 / 02</span><strong>Payroll · People · Progress</strong></div>
              <div className="profile-card-note"><Check size={14} /> Open to meaningful opportunities</div>
            </div>
          </div>

          <div className="personal-details-grid">
            <div className="personal-about-copy">
              <p className="section-kicker">About me</p>
              <h2>Accurate work,<br /><i>human approach.</i></h2>
              <p>I support payroll processing, salary and benefits coordination, employee data, attendance and leave administration, SSB and income-tax support, and clear communication with clients and employees.</p>
              <p>I believe good operations are built on accuracy, confidentiality, accountability, and empathy.</p>
            </div>
            <div className="strengths-card">
              <p className="section-kicker">What I bring</p>
              {strengths.map((strength, index) => <div className="strength-row" key={strength}><span>0{index + 1}</span><strong>{strength}</strong><ArrowUpRight size={15} /></div>)}
            </div>
          </div>

          <div className="experience-strip">
            <div className="experience-strip-heading"><p className="section-kicker">Experience</p><span>3+ years across HR &amp; payroll</span></div>
            <div className="experience-list">{experience.map((item) => <article className="experience-mini" key={item.role}><div className="experience-mini-top"><span>{item.period}</span>{item.current && <b>Current</b>}</div><h3>{item.role}</h3><p>{item.company}</p><small>{item.description}</small></article>)}</div>
          </div>
        </section>

        <section className="work-section section-pad" id="work">
          <div className="section-heading-row"><div><p className="section-kicker">Selected work</p><h2>Where the details<br /><i>become visible.</i></h2></div><p className="section-description compact">A few snapshots from the work around payroll, people operations, culture, and stakeholder coordination.</p></div>
          <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.number}><div className="project-image"><img src={project.image} alt={project.imageAlt} loading="lazy" decoding="async" /><span className="project-number">{project.number}</span><span className="project-open"><ArrowUpRight size={17} /></span></div><div className="project-copy"><div><p>{project.type}</p><h3>{project.title}</h3></div><span className="project-tag">{project.tag}</span></div></article>)}</div>
        </section>

        <section className="recommendations-section section-pad" id="recommendations">
          <div className="recommendations-head"><div><p className="section-kicker">LinkedIn recommendations</p><h2>Good work is<br /><i>remembered by people.</i></h2></div><a className="recommendations-link" href="https://www.linkedin.com/in/zin-min-htet-39b0a7243/" target="_blank" rel="noreferrer">View on LinkedIn <ExternalLink size={15} /></a></div>
          <div className="recommendations-grid">{recommendations.map((recommendation) => <article className="recommendation-card" key={recommendation.name}><div className="quote-mark">“</div><p className="recommendation-quote">{recommendation.quote}</p><div className="recommendation-author"><span className="author-avatar">{recommendation.name.split(" ").map((part) => part[0]).join("")}</span><div><strong>{recommendation.name}</strong><span>{recommendation.relationship}</span></div></div></article>)}</div>
        </section>

        <section className="contact-section section-pad" id="contact"><div className="contact-inner"><p className="section-kicker">Start a conversation</p><h2>Let’s make the<br /><i>next thing clearer.</i></h2><p>For payroll operations, HR coordination, or a thoughtful conversation about better ways of working.</p><a className="button-dark" href="mailto:fzinmin11@gmail.com">Send an email <Mail size={16} /></a><div className="contact-details"><span><MapPin size={15} /> Yangon, Myanmar</span><span><BriefcaseBusiness size={15} /> Open to meaningful opportunities</span><span><Check size={15} /> Available for a conversation</span></div></div></section>

        <section className="services-panel" id="services">
          <div className="services-hero section-pad">
            <div>
              <p className="section-kicker"><span className="telegram-dot" /> Unlock Telegram</p>
              <h2>All services,<br /><i>in one place.</i></h2>
            </div>
            <div className="services-hero-copy">
              <p>One protected workspace for HR administration, payroll calculations, bulk exports, and C&amp;B resources. Access is approved by the administrator.</p>
            </div>
          </div>

          <div className="section-pad"><WorkspaceAccessGate onApprovedChange={setWorkspaceApproved} /></div>
          <BulkPayrollSection approved={workspaceApproved} selected={selectedWorkspace === "bulk"} onOpen={() => setSelectedWorkspace("bulk")} />

          <div className="service-cards section-pad" aria-label="Available services">
            {[
              { id: "payroll", number: "01", title: "Payroll tool", description: "See the number behind the payslip: PIT, SSB, net pay, and employer cost." },
              { id: "bulk", number: "02", title: "Bulk payroll file pack", description: "Import once, calculate locally, and export calculation, SSB, and PAYE-A files." },
              { id: "cb", number: "03", title: "C&B resources", description: "Official monthly PIT, annual IRD, and SSB guidance and source links." },
            ].map((service) => {
              const locked = !workspaceApproved && service.id !== "bulk";
              return <button type="button" className={"service-card service-card-button " + (selectedWorkspace === service.id ? "selected" : "")} key={service.id} onClick={() => { setSelectedWorkspace(service.id); if (service.id === "bulk") document.getElementById("bulk-payroll")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={locked} aria-disabled={locked}><span className="service-card-number">{service.number}</span><div><strong>{service.title}</strong><p>{service.description}</p></div><span className="service-card-status">{workspaceApproved ? "Open workspace" : "Telegram unlock"}</span></button>;
            })}
          </div>
          <div className="hr-sector-heading section-pad"><div><p className="section-kicker"><UsersRound size={15} /> HR sector</p><h3>People work, held together.</h3><p>Choose a sector to open its related working form. Forms are local preparation templates, not government submissions.</p></div></div>
          <div className="hr-sector-grid section-pad">{hrSectorItems.map((item, index) => <button type="button" className={"hr-sector-card " + (selectedWorkspace === item.id ? "selected" : "")} key={item.id} onClick={() => setSelectedWorkspace(item.id)} disabled={!workspaceApproved} aria-disabled={!workspaceApproved}><span>0{index + 1}</span><strong>{item.title}</strong><small>{workspaceApproved ? "Open related form" : "Unlock with Telegram"}</small></button>)}</div>
          {workspaceApproved && selectedWorkspace !== "bulk" && <div className="workspace-active-panel section-pad" aria-live="polite">{selectedWorkspace === "payroll" && <PayrollCalculator />}{selectedWorkspace === "cb" && <CBResourceCenter />}{hrSectorItems.some((item) => item.id === selectedWorkspace) && <HRSectorForm id={selectedWorkspace as HRSectorId} />}</div>}
        </section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>zin <em>min htet</em></span></div><span className="footer-note"><BriefcaseBusiness size={14} /> Payroll &amp; HR Operations</span><span className="footer-note"><MapPin size={14} /> Yangon, Myanmar</span><span className="footer-year">© {new Date().getFullYear()} Zin Min Htet</span></footer>
    </div>
  );
}
