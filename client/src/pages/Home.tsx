import {
  ArrowDown, ArrowUpRight, Bot, BriefcaseBusiness, Calculator, CalendarDays, Check, ExternalLink, Gamepad2, Menu, Sparkles, UserRound, UsersRound, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import "../workspace.css";
import WorkspaceAccessGate from "@/components/WorkspaceAccessGate";
import PayrollCalculator from "@/components/PayrollCalculator";
import BulkPayroll, { BulkPayrollSection } from "@/components/BulkPayroll";
import CBResourceCenter from "@/components/CBResourceCenter";
import HRSectorForm, { hrSectorItems, type HRSectorId } from "@/components/HRTemplateCatalog";
import ScenarioLab from "@/components/ScenarioLab";
const PUBLIC_MEDIA_ORIGIN = "https://zin-portfolio-live.pages.dev";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceApproved, setWorkspaceApproved] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState("payroll");
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    const target = section === "game" ? "game" : section === "payroll" ? "services" : section === "toolkit" ? "toolkit" : null;
    if (!target) return;
    if (section === "payroll") setSelectedWorkspace("payroll");
    window.requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  return (
    <div className="site-shell two-part-portfolio">
      <header className="site-header portfolio-header">
        <a className="brand" href="#home" onClick={closeMenu}>
          <span className="brand-mark"><Sparkles size={15} /></span>
          <span>HR <em>toolkit</em></span>
        </a>
        <button className="mobile-menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "site-nav site-nav-open" : "site-nav"}>
          <a href="#toolkit" onClick={closeMenu}>Toolkit</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="/webinars" onClick={closeMenu}>Events</a>
          <a href="/?hr-toolkit=1&v=final&section=game" onClick={closeMenu}>Game</a>
        </nav>
      </header>

      <main>
        <section className="personal-panel generic-landing-panel" id="home">
          <div className="personal-panel-inner">
            <div className="personal-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> Practical HR workspace</p>
              <div className="personal-title-row"><span className="personal-icon"><Sparkles size={22} /></span><p className="personal-label">Welcome</p></div>
              <h1>HR tools for<br /><span>clearer work.</span></h1>
              <p className="personal-lede">Practical payroll, HR operations, workplace learning, and public event resources in one place.</p>
              <div className="personal-actions"><a className="button-primary" href="#services">Explore tools <ArrowDown size={16} /></a><a className="text-link light-link" href="/webinars"><CalendarDays size={15} /> View events</a></div>
            </div>
            <div className="personal-profile-card generic-tool-card"><div className="profile-card-caption"><span>HR WORKSPACE</span><strong>People · Process · Progress</strong></div><div className="profile-card-note"><Check size={14} /> Tools and resources</div></div>
          </div>
        </section>
        <section
          className="toolkit-section section-pad"
          id="toolkit"
          aria-labelledby="toolkit-title"
        >
          <div className="toolkit-heading">
            <div>
              <p className="section-kicker">
                <span className="eyebrow-dot" /> The working toolkit
              </p>
              <h2 id="toolkit-title">
                One clear place for
                <br />
                <i>people, process, progress.</i>
              </h2>
            </div>
            <p className="section-description">
              Explore practical HR services, learning moments, and protected payroll tools in one place.
            </p>
          </div>
          <div className="toolkit-grid">
            <a className="toolkit-card toolkit-card-dark" href="#services">
              <span className="toolkit-card-icon">
                <UserRound size={18} />
              </span>
              <span className="toolkit-card-index">01 · HR workspace</span>
              <strong>HR operations tools</strong>
              <p>
                Practical templates and resources for everyday people operations.
              </p>
              <span className="toolkit-card-link">
                Explore tools <ArrowUpRight size={15} />
              </span>
            </a>
            <a className="toolkit-card" href="#services">
              <span className="toolkit-card-icon">
                <BriefcaseBusiness size={18} />
              </span>
              <span className="toolkit-card-index">02 · Services</span>
              <strong>HR &amp; payroll support</strong>
              <p>
                Practical operations support, compensation workflows, C&amp;B
                resources, and protected access.
              </p>
              <span className="toolkit-card-link">
                Explore services <ArrowUpRight size={15} />
              </span>
            </a>
            <button
              className="toolkit-card toolkit-card-accent"
              type="button"
              onClick={() =>
                document
                  .querySelector<HTMLButtonElement>(".zeke-launcher")
                  ?.click()
              }
            >
              <span className="toolkit-card-icon">
                <Bot size={18} />
              </span>
              <span className="toolkit-card-index">03 · Assistant</span>
              <strong>Zeke HR assistant</strong>
              <p>
                Ask about HR, payroll, workplace process, career, events, and
                how to use any part of this website.
              </p>
              <span className="toolkit-card-link">
                Ask Zeke anything <ArrowUpRight size={15} />
              </span>
            </button>
            <a className="toolkit-card" href="/webinars">
              <span className="toolkit-card-icon">
                <CalendarDays size={18} />
              </span>
              <span className="toolkit-card-index">04 · Events</span>
              <strong>HR event desk</strong>
              <p>
                Daily public HR and workplace video links, refreshed from
                original sources with no re-uploads.
              </p>
              <span className="toolkit-card-link">
                View event feed <ArrowUpRight size={15} />
              </span>
            </a>
            <a className="toolkit-card toolkit-card-game" href="/?hr-toolkit=1&v=final&section=game">
              <span className="toolkit-card-icon"><Gamepad2 size={18} /></span>
              <span className="toolkit-card-index">05 · Practice</span>
              <strong>Workplace scenario lab</strong>
              <p>Practise calm, fair next steps for attendance, payroll variance, and employee concerns.</p>
              <span className="toolkit-card-link">Play a case <ArrowUpRight size={15} /></span>
            </a>
            <a className="toolkit-card toolkit-card-wide toolkit-card-payroll" href="/?hr-toolkit=1&v=final&section=payroll" onClick={() => setSelectedWorkspace("payroll")}>
              <span className="toolkit-card-icon"><Calculator size={18} /></span>
              <span className="toolkit-card-index">06 · Test &amp; calculate</span>
              <strong>Payroll testing workspace</strong>
              <p>Use the Myanmar payroll estimator, SSB/PIT guidance, bulk file workflows, and sector forms in one protected workspace.</p>
              <span className="toolkit-card-link">Open payroll tools <ArrowUpRight size={15} /></span>
            </a>
          </div>
        </section>

        <ScenarioLab />


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

          <div className="services-explainer section-pad">
            <div className="services-explainer-heading">
              <div>
                <p className="section-kicker"><span className="eyebrow-dot" /> Zeke explains</p>
                <h3>Unlock the workflow,<br /><i>then make it useful.</i></h3>
              </div>
              <p>See what Telegram unlock gives you, which payroll tools are included, and what forms you can prepare inside the workspace.</p>
            </div>
            <div className="services-video-shell">
              <video className="services-explainer-video" controls preload="metadata" poster={`${PUBLIC_MEDIA_ORIGIN}/videos/telegram-unlock-explainer-poster.png`}>
                <source src={`${PUBLIC_MEDIA_ORIGIN}/videos/telegram-unlock-explainer.mp4`} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>
            <div className="services-explainer-footer">
              <span>58 sec · Burmese narration · English UI labels</span>
              <div className="services-explainer-actions">
                <a className="button-primary" href="#services">Request access <ArrowUpRight size={15} /></a>
                <a className="telegram-button" href="https://t.me/ayelay_bot" target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a>
              </div>
            </div>
          </div>

          <div className="section-pad"><WorkspaceAccessGate onApprovedChange={setWorkspaceApproved} /></div>
          <BulkPayrollSection approved={workspaceApproved} />

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
          <div className="hr-sector-grid section-pad">{hrSectorItems.map((item, index) => <button type="button" className={"hr-sector-card " + (selectedWorkspace === item.id ? "selected" : "")} key={item.id} onClick={() => setSelectedWorkspace(item.id)} disabled={!workspaceApproved} aria-disabled={!workspaceApproved}><span>0{index + 1}</span><div><strong>{item.title}</strong><p>{item.description}</p></div><small>{workspaceApproved ? "Open related forms" : "Unlock with Telegram"}</small></button>)}</div>
          {workspaceApproved && selectedWorkspace !== "bulk" && <div className="workspace-active-panel section-pad" aria-live="polite">{selectedWorkspace === "payroll" && <PayrollCalculator />}{selectedWorkspace === "cb" && <CBResourceCenter />}{hrSectorItems.some((item) => item.id === selectedWorkspace) && <HRSectorForm key={selectedWorkspace} id={selectedWorkspace as HRSectorId} />}</div>}
        </section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>HR <em>toolkit</em></span></div><span className="footer-note"><Check size={14} /> Practical public resources</span><span className="footer-year">© {new Date().getFullYear()} HR Toolkit</span></footer>
    </div>
  );
}
