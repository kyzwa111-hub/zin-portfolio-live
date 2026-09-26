import {
  ArrowDown,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ExternalLink,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import PayrollCalculator from "@/components/PayrollCalculator";
import BulkPayroll from "@/components/BulkPayroll";
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

const strengths = [
  "Payroll processing & compensation",
  "PIT, SSB & statutory support",
  "HR operations & documentation",
  "Client and employee communication",
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
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

        <section className="services-panel" id="services">
          <div className="services-hero section-pad">
            <div>
              <p className="section-kicker"><span className="telegram-dot" /> Unlock Telegram</p>
              <h2>All services,<br /><i>in one place.</i></h2>
            </div>
            <div className="services-hero-copy">
              <p>Request access through Telegram to unlock the practical tools below. Payroll data stays protected, and access is approved by the administrator.</p>
              <a className="telegram-button" href="https://t.me/Payroll_Officer_bot" target="_blank" rel="noreferrer"><span>Open Telegram</span><ArrowUpRight size={16} /></a>
            </div>
          </div>

          <div className="service-cards section-pad" aria-label="Available services">
            <article className="service-card"><span className="service-card-number">01</span><div><strong>Payroll calculator</strong><p>Estimate PIT, SSB, net pay, and employer cost for Myanmar payroll.</p></div><span className="service-card-status">Telegram unlock</span></article>
            <article className="service-card"><span className="service-card-number">02</span><div><strong>Bulk payroll tools</strong><p>Upload an employee list and export calculation, SSB, and PAYE-A files.</p></div><span className="service-card-status">Telegram unlock</span></article>
            <article className="service-card"><span className="service-card-number">03</span><div><strong>C&amp;B resource center</strong><p>Find official IRD, SSB, MOL, and CSO references in one curated workspace.</p></div><span className="service-card-status">Open resources</span></article>
          </div>

          <div className="hr-sector-block section-pad">
            <div className="hr-sector-heading"><div><p className="section-kicker">HR sector services</p><h3>People operations,<br /><i>made practical.</i></h3></div><p>Support for the work around payroll: employee records, attendance, leave, onboarding, and everyday HR coordination.</p></div>
            <div className="hr-sector-grid">
              <article className="hr-sector-card"><span className="hr-sector-icon">01</span><div><strong>Employee data &amp; HR admin</strong><p>Organize employee information, contracts, documentation, and HR records with a clear process.</p></div><span className="service-card-status">Telegram unlock</span></article>
              <article className="hr-sector-card"><span className="hr-sector-icon">02</span><div><strong>Attendance &amp; leave</strong><p>Coordinate attendance, leave balances, overtime details, and clean monthly handoffs to payroll.</p></div><span className="service-card-status">Telegram unlock</span></article>
              <article className="hr-sector-card"><span className="hr-sector-icon">03</span><div><strong>People operations support</strong><p>Practical help for onboarding, employee communication, HR checklists, and team coordination.</p></div><span className="service-card-status">Telegram unlock</span></article>
            </div>
          </div>

          <div className="service-tools">
            <PayrollCalculator />
            <BulkPayroll />
            <CBResourceCenter />
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>zin <em>min htet</em></span></div><span className="footer-note"><BriefcaseBusiness size={14} /> Payroll &amp; HR Operations</span><span className="footer-note"><MapPin size={14} /> Yangon, Myanmar</span><span className="footer-year">© {new Date().getFullYear()} Zin Min Htet</span></footer>
    </div>
  );
}
