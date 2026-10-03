import {
  ArrowDown,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  LockKeyhole,
  Menu,
  MousePointer2,
  Play,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import WorkspaceAccessGate from "@/components/WorkspaceAccessGate";
import PayrollCalculator from "@/components/PayrollCalculator";
import { BulkPayrollSection } from "@/components/BulkPayroll";
import CBResourceCenter from "@/components/CBResourceCenter";
import HRSectorForm, { hrSectorItems, type HRSectorId } from "@/components/HRTemplateCatalog";
import LiveJobFeed from "@/components/LiveJobFeed";
import ScenarioLab from "@/components/ScenarioLab";
import "../workspace.css";

const MASCOT_VIDEO = "/videos/zeke-live-mascot-vivid.mp4";
const INTRO_VIDEO = "/videos/zeke-product-intro.mp4";

const serviceItems = [
  { id: "payroll", number: "01", title: "Payroll tool", description: "PIT, SSB, net pay, and employer cost." },
  { id: "bulk", number: "02", title: "Bulk payroll", description: "One employee list; calculation, SSB, and PAYE-A exports." },
  { id: "cb", number: "03", title: "C&B resources", description: "Official monthly PIT, annual IRD, and SSB guidance." },
] as const;

const serviceWalkthroughs = [
  { id: "unlock", label: "Telegram unlock", kicker: "STEP 01", title: "Request access in one tap.", detail: "Send your name, open Telegram, and wait for administrator approval.", screen: "access", steps: ["Open Services", "Send access request", "Follow Telegram approval"] },
  { id: "payroll", label: "Payroll", kicker: "STEP 02", title: "Check payroll with confidence.", detail: "Enter salary inputs, review the estimate, and save your working result.", screen: "payroll", steps: ["Open Payroll tool", "Enter salary inputs", "Review the estimate"] },
  { id: "bulk", label: "Bulk payroll", kicker: "STEP 03", title: "One upload, three outputs.", detail: "Upload the employee list and export calculation, SSB, and PAYE-A files.", screen: "bulk", steps: ["Download template", "Upload employee list", "Export three files"] },
  { id: "workspace", label: "HR workspace", kicker: "STEP 04", title: "Open forms and documents.", detail: "Choose a people-work form, prepare it locally, and keep the working record organised.", screen: "workspace", steps: ["Open HR workspace", "Choose a form", "Save your working record"] },
  { id: "plans", label: "Access plans", kicker: "STEP 05", title: "Choose the right access.", detail: "Compare the available plan notes before requesting protected tools.", screen: "plans", steps: ["Review plan notes", "Compare access", "Choose your next step"] },
  { id: "dashboard", label: "Personal dashboard", kicker: "STEP 06", title: "Keep your progress close.", detail: "Return to saved documents, recent work, and your personal workspace.", screen: "dashboard", steps: ["Open dashboard", "Review saved work", "Continue where you stopped"] },
] as const;

function ServiceWalkthrough() {
  const [active, setActive] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive(current => (current + 1) % serviceWalkthroughs.length), 5200);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setDemoStep(0);
    const timer = window.setInterval(() => setDemoStep(current => (current + 1) % 3), 1750);
    return () => window.clearInterval(timer);
  }, [active]);
  const item = serviceWalkthroughs[active];
  return <section className="service-walkthrough" aria-label="Service walkthrough demo">
    <div className="service-walkthrough-copy">
      <p className="unified-section-kicker"><span>HOW IT WORKS</span> SERVICE WALKTHROUGH</p>
      <h3>See the service flow<br /><em>before you open it.</em></h3>
      <p>Short screen-recording style previews show what each step looks like. Zeke guides the flow; your real data stays inside the protected workspace.</p>
      <div className="service-walkthrough-tabs" role="tablist" aria-label="Service walkthrough steps">
        {serviceWalkthroughs.map((walkthrough, index) => <button key={walkthrough.id} type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{walkthrough.kicker}</span>{walkthrough.label}<ChevronRight size={13} /></button>)}
      </div>
    </div>
    <div className="service-demo-window" aria-live="polite">
      <div className="service-demo-topbar"><span /><span /><span /><small>zeke / {item.label.toLowerCase()}</small></div>
      <div className="service-demo-body">
        <div className="service-demo-sidebar"><strong>zeke</strong><i className="active" /><i /><i /><i /></div>
        <div className="service-demo-screen">
          <div className="service-demo-screen-head"><div><small>{item.kicker}</small><h4>{item.title}</h4></div><span className="service-demo-status">Preview</span></div>
          {item.screen === "access" && <div className="service-demo-access"><div className="service-demo-lock">↗</div><strong>Request access</strong><span>Your request is sent securely to the admin.</span><b>Open Telegram bot</b></div>}
          {item.screen === "payroll" && <div className="service-demo-form"><label>Monthly salary <b>1,200,000 MMK</b></label><div className="service-demo-input" /><label>Pay period <b>Monthly</b></label><div className="service-demo-input short" /><div className="service-demo-result"><span>Estimated net pay</span><strong>Review result →</strong></div></div>}
          {item.screen === "bulk" && <div className="service-demo-bulk"><div className="service-demo-upload">＋ <strong>Drop employee list here</strong><small>.xlsx template accepted</small></div><div className="service-demo-output"><span>01 Calculation</span><span>02 SSB list</span><span>03 PAYE-A</span></div></div>}
          {item.screen === "workspace" && <div className="service-demo-workspace"><span>Attendance</span><span>Recruitment</span><span>Employee relations</span><span>Performance</span></div>}
          {item.screen === "plans" && <div className="service-demo-plans"><span><b>Starter</b><small>Explore the basics</small></span><span className="selected"><b>Protected tools</b><small>Request approval</small></span><span><b>Team access</b><small>Compare options</small></span></div>}
          {item.screen === "dashboard" && <div className="service-demo-dashboard"><div><b>3</b><small>Saved documents</small></div><div><b>2</b><small>Recent forms</small></div><div><b>↗</b><small>Open workspace</small></div></div>}
          <div className="service-demo-step-strip" aria-label="Walkthrough progress">{item.steps.map((step, index) => <span className={index <= demoStep ? "done" : ""} key={step}><b>{index + 1}</b>{step}</span>)}</div>
          <div className="service-demo-footer"><span><strong>Scene {demoStep + 1}/3 · </strong>{item.detail}</span><span className="service-demo-cursor"><MousePointer2 size={16} /> Zeke guide</span></div>
        </div>
        <video className="service-demo-mascot" autoPlay loop muted playsInline preload="metadata" poster="/images/zeke-mascot.png" aria-label="Zeke guiding the service walkthrough"><source src={MASCOT_VIDEO} type="video/mp4" /></video>
      </div>
    </div>
  </section>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceApproved, setWorkspaceApproved] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("payroll");
  const closeMenu = () => setMenuOpen(false);

  const askZeke = () => {
    closeMenu();
    document.querySelector<HTMLButtonElement>(".zeke-launcher")?.click();
  };

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    const targets: Record<string, string> = {
      events: "events",
      jobs: "jobs",
      services: "services",
      service: "services",
      home: "home",
    };
    const target = section ? targets[section] : undefined;
    if (section === "payroll") setSelectedWorkspace("payroll");
    if (!target) return;
    window.requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }, []);

  return (
    <div className="site-shell zeke-experience">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header unified-header">
        <a className="unified-brand" href="#home" onClick={closeMenu} aria-label="Zeke home">
          <span className="unified-brand-mascot" aria-hidden="true">
            <video autoPlay loop muted playsInline preload="none" poster="/images/zeke-mascot.png">
              <source src={MASCOT_VIDEO} type="video/mp4" />
            </video>
          </span>
          <span className="unified-brand-copy"><strong>zeke</strong><small>HR &amp; workplace assistant</small></span>
        </a>
        <button className="mobile-menu-button unified-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav id="primary-navigation" className={menuOpen ? "site-nav unified-nav site-nav-open" : "site-nav unified-nav"} aria-label="Main navigation">
          <a href="#events" onClick={closeMenu}>Event</a>
          <a href="#jobs" onClick={closeMenu}>Job</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#game" onClick={closeMenu}>Game</a>
          <a href="/workspace" onClick={closeMenu}>HR workspace</a>
          <a href="/dashboard" onClick={closeMenu}>Dashboard</a>
          <button className="unified-nav-ask" type="button" onClick={askZeke}><Sparkles size={14} /> Ask Zeke</button>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="unified-hero" id="home" aria-labelledby="unified-hero-title">
          <div className="unified-hero-noise" aria-hidden="true" />
          <div className="unified-hero-inner section-pad">
            <div className="unified-hero-copy">
              <p className="unified-live-label"><span /> Your HR companion is here</p>
              <h1 id="unified-hero-title">Work, with<br /><em>Zeke by your side.</em></h1>
              <p className="unified-hero-lede">Ask Zeke about work, career, feelings, events, and this website. Find an event, discover a job, or unlock the HR services you need.</p>
              <div className="unified-hero-actions">
                <button className="unified-primary-action" type="button" onClick={askZeke}>Ask Zeke anything <ArrowUpRight size={16} /></button>
                <a className="unified-secondary-action" href="#events">Explore the site <ArrowDown size={15} /></a>
              </div>
              <div className="unified-hero-meta" aria-label="Site sections"><span><CalendarDays size={14} /> Event</span><span><BriefcaseBusiness size={14} /> Job</span><span><LockKeyhole size={14} /> Telegram-unlocked services</span><span><Sparkles size={14} /> HR game</span></div>
            </div>
            <div className="unified-hero-stage" aria-label="Animated Zeke assistant">
              <div className="unified-stage-orbit unified-orbit-one" aria-hidden="true" />
              <div className="unified-stage-orbit unified-orbit-two" aria-hidden="true" />
              <div className="unified-stage-glow" aria-hidden="true" />
              <div className="unified-stage-character">
                <video autoPlay loop muted playsInline preload="none" poster="/images/zeke-mascot.png" aria-label="Zeke animated mascot">
                  <source src={MASCOT_VIDEO} type="video/mp4" />
                </video>
              </div>
              <div className="unified-stage-badge unified-badge-top"><span className="unified-badge-dot" /> LIVE · READY TO HELP</div>
              <div className="unified-stage-badge unified-badge-bottom"><Sparkles size={15} /><span><strong>Ask Zeke</strong><small>Anything about work</small></span></div>
            </div>
          </div>
          <div className="unified-scroll-cue" aria-hidden="true"><span /> One place · four useful paths</div>
        </section>

        <section className="unified-intro-video section-pad" aria-labelledby="unified-intro-video-title">
          <div className="unified-intro-video-heading">
            <div>
              <p className="unified-section-kicker"><span>INTRO</span> MEET ZEKE</p>
              <h2 id="unified-intro-video-title">Welcome to Zeke.<br /><em>Your HR, career &amp; workplace companion.</em></h2>
            </div>
            <p>Explore the Zeke experience across workplace learning, opportunities, services, and practical HR judgement.</p>
          </div>
          <div className="unified-intro-video-shell">
            <video controls preload="metadata" poster="/videos/hr-toolkit-services-58sec-poster.jpg" aria-label="Zeke product introduction video">
              <source src={INTRO_VIDEO} type="video/mp4" />
              Your browser does not support the video element.
            </video>
            <div className="unified-intro-video-caption"><strong>Events. Jobs. Games.</strong><span>Everything in one place.</span></div>
          </div>
        </section>

        <section className="unified-paths section-pad" aria-label="Choose a path">
          <a className="unified-path-card unified-path-event" href="#events"><span className="unified-path-index">01 / EVENT</span><span className="unified-path-icon"><CalendarDays size={19} /></span><strong>Watch an event</strong><small>Daily HR &amp; workplace videos</small><ArrowUpRight className="unified-path-arrow" size={17} /></a>
          <a className="unified-path-card unified-path-job" href="#jobs"><span className="unified-path-index">02 / JOB</span><span className="unified-path-icon"><BriefcaseBusiness size={19} /></span><strong>Find an opportunity</strong><small>Live links from original sources</small><ArrowUpRight className="unified-path-arrow" size={17} /></a>
          <a className="unified-path-card unified-path-service" href="#services"><span className="unified-path-index">03 / SERVICE</span><span className="unified-path-icon"><LockKeyhole size={19} /></span><strong>Unlock HR services</strong><small>Access is approved through Telegram</small><ArrowUpRight className="unified-path-arrow" size={17} /></a>
          <a className="unified-path-card unified-path-game" href="#game"><span className="unified-path-index">04 / GAME</span><span className="unified-path-icon"><Sparkles size={19} /></span><strong>Practice HR judgement</strong><small>Myanmar-law learning levels</small><ArrowUpRight className="unified-path-arrow" size={17} /></a>
        </section>

        <section className="unified-section unified-events section-pad" id="events" aria-labelledby="unified-events-title">
          <div className="unified-section-heading">
            <div><p className="unified-section-kicker"><span>01</span> EVENT</p><h2 id="unified-events-title">Learn from the<br /><em>live event desk.</em></h2></div>
            <p>Fresh HR and workplace learning videos, linked to their original publishers. No re-uploads.</p>
          </div>
          <article className="unified-event-panel">
            <div className="unified-event-visual" aria-hidden="true">
              <div className="unified-event-ring unified-event-ring-one" /><div className="unified-event-ring unified-event-ring-two" />
              <div className="unified-event-play"><Play size={26} fill="currentColor" /></div>
              <span className="unified-event-live"><i /> DAILY VIDEO FEED</span>
              <span className="unified-event-word">EVENT<br /><em>desk</em></span>
            </div>
            <div className="unified-event-copy"><p className="unified-section-kicker">HR · PEOPLE · WORKPLACE</p><h3>One tap to the latest events.</h3><p>Browse the daily event feed, then watch each video on its original public channel.</p><a className="unified-text-action" href="/webinars">Open event feed <ArrowUpRight size={15} /></a></div>
          </article>
        </section>

        <section className="unified-section unified-jobs section-pad" id="jobs" aria-label="Live job feed">
          <LiveJobFeed />
        </section>

        <section className="unified-section unified-services section-pad" id="services" aria-labelledby="unified-services-title">
          <div className="unified-section-heading">
            <div><p className="unified-section-kicker"><span>03</span> SERVICE</p><h2 id="unified-services-title">The tools you need,<br /><em>one Telegram unlock.</em></h2></div>
            <p>HR, payroll, bulk exports, and C&amp;B resources stay protected until the administrator approves access through Telegram.</p>
          </div>
          <div className="unified-service-intro">
            <div className="unified-service-unlock">
              <div className="unified-lock-mark"><LockKeyhole size={22} /></div>
              <p className="unified-section-kicker">ONE ACCESS FLOW</p>
              <h3>Request access on the site.<br /><em>Approval comes through Telegram.</em></h3>
              <p>Send one request, then follow the administrator’s Telegram instructions. Protected services stay locked until approval.</p>
              <a className="unified-telegram-link" href="https://t.me/ayelay_bot?start=admin" target="_blank" rel="noopener noreferrer">Open Telegram bot <ExternalLink size={14} /></a>
            </div>
          </div>

          <ServiceWalkthrough />

          <WorkspaceAccessGate onApprovedChange={setWorkspaceApproved} />

          <div className="unified-service-summary" aria-label="Services available after approval">
            {serviceItems.map((service) => <article className="unified-service-chip" key={service.id}><span>{service.number}</span><div><strong>{service.title}</strong><small>{service.description}</small></div>{workspaceApproved ? <Check size={15} aria-label="Unlocked" /> : <LockKeyhole size={15} aria-label="Telegram approval required" />}</article>)}
            <div className="unified-service-chip unified-service-chip-sector"><span>04</span><div><strong>HR sector forms</strong><small>Recruitment, attendance, employee relations, performance, and reporting.</small></div>{workspaceApproved ? <Check size={16} aria-label="Unlocked" /> : <UsersRound size={16} aria-label="Telegram approval required" />}</div>
          </div>

          {workspaceApproved && (
            <div className="unified-unlocked-workspace" aria-live="polite">
              <p className="unified-unlocked-label"><Check size={14} /> Telegram approval confirmed · Workspace unlocked</p>
              <BulkPayrollSection approved={workspaceApproved} />
              <div className="service-cards unified-service-cards" aria-label="Available services">
                {serviceItems.map((service) => <button type="button" className={`service-card service-card-button ${selectedWorkspace === service.id ? "selected" : ""}`} key={service.id} onClick={() => { setSelectedWorkspace(service.id); if (service.id === "bulk") document.getElementById("bulk-payroll")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                  <span className="service-card-number">{service.number}</span><div><strong>{service.title}</strong><p>{service.description}</p></div><span className="service-card-status">Open workspace</span>
                </button>)}
              </div>
              <div className="hr-sector-heading section-pad"><div><p className="section-kicker"><UsersRound size={15} /> HR sector</p><h3>People work, held together.</h3><p>Choose a sector to open its related working form. Forms are local preparation templates, not government submissions.</p></div></div>
              <div className="hr-sector-grid section-pad">{hrSectorItems.map((item, index) => <button type="button" className={`hr-sector-card ${selectedWorkspace === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedWorkspace(item.id)}><span>0{index + 1}</span><div><strong>{item.title}</strong><p>{item.description}</p></div><small>Open related forms</small></button>)}</div>
              {selectedWorkspace !== "bulk" && <div className="workspace-active-panel section-pad">{selectedWorkspace === "payroll" && <PayrollCalculator />}{selectedWorkspace === "cb" && <CBResourceCenter />}{hrSectorItems.some((item) => item.id === selectedWorkspace) && <HRSectorForm key={selectedWorkspace} id={selectedWorkspace as HRSectorId} />}</div>}
            </div>
          )}
          <div className="clean-product-links"><a href="/workspace">Open HR workspace: forms, documents, guidance</a><a href="/plans">View access plans</a><a href="/dashboard">Open personal dashboard</a></div>
        </section>
        <ScenarioLab />
      </main>

      <footer className="unified-footer"><a className="unified-footer-brand" href="#home"><span className="unified-footer-icon"><Sparkles size={14} /></span><strong>zeke</strong></a><span>Event · Job · Services · Game · HR workspace · Dashboard</span><a href="/plans">Plans</a><a href="https://t.me/ayelay_bot" target="_blank" rel="noopener noreferrer">Telegram access <ArrowUpRight size={13} /></a><small>© {new Date().getFullYear()} Zeke HR &amp; workplace assistant</small></footer>
    </div>
  );
}
