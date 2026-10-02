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
      <a className="skip-link" href="#main-content">Skip to content · အကြောင်းအရာသို့</a>
      <header className="site-header portfolio-header">
        <a className="brand" href="#home" onClick={closeMenu} aria-label="ZHTE HR Toolkit home">
          <span className="brand-mark" aria-hidden="true"><Sparkles size={15} /></span>
          <span><b>ZHTE</b> <em>HR toolkit</em></span>
        </a>
        <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
        <nav id="primary-navigation" className={menuOpen ? "site-nav site-nav-open" : "site-nav"} aria-label="Primary navigation">
          <a href="#toolkit" onClick={closeMenu}>Toolkit</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="/webinars" onClick={closeMenu}>Events</a>
          <a href="/?hr-toolkit=1&v=final&section=game" onClick={closeMenu}>Game</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="personal-panel generic-landing-panel" id="home">
          <div className="personal-panel-inner">
            <div className="personal-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> ZHTE · HR operations &amp; workplace learning</p>
              <div className="personal-title-row"><span className="personal-icon" aria-hidden="true"><Sparkles size={22} /></span><p className="personal-label">HR Toolkit · လုပ်ငန်းသုံးအရင်းအမြစ်</p></div>
              <h1>HR tools for<br /><span>clearer work.</span></h1>
              <p className="personal-lede">Practical payroll, HR operations, workplace learning, and public event resources in one place. <span lang="my">လူနဲ့လုပ်ငန်းစဉ်ကို ပိုရှင်းလင်းအောင် ကူညီပေးတဲ့ HR toolkit တစ်ခုပါ။</span></p>
              <div className="personal-actions"><a className="button-primary" href="#services">Explore tools · ကိရိယာများ <ArrowDown size={16} aria-hidden="true" /></a><a className="text-link light-link" href="/webinars"><CalendarDays size={15} aria-hidden="true" /> View events · ပွဲများ</a></div>
            </div>
            <div className="personal-profile-card generic-tool-card"><div className="profile-card-caption"><span>ZHTE · HR WORKSPACE</span><strong>People · Process · Progress</strong></div><div className="profile-card-note"><Check size={14} aria-hidden="true" /> Tools and resources · လက်တွေ့အသုံးချကိရိယာများ</div></div>
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
              Explore practical HR services, learning moments, and protected payroll tools in one place. <span lang="my">HR အလုပ်အတွက် လိုအပ်တာတွေကို တစ်နေရာတည်းမှာ ရှာဖွေပါ။</span>
            </p>
          </div>
          <div className="toolkit-grid">
            <a className="toolkit-card toolkit-card-dark" href="#services">
              <span className="toolkit-card-icon">
                <UserRound size={18} />
              </span>
              <span className="toolkit-card-index">01 · HR workspace · HR အလုပ်ခွင်</span>
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
              <span className="toolkit-card-index">02 · Services · ဝန်ဆောင်မှု</span>
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
                <span className="toolkit-card-index">03 · Assistant · အကူအညီ</span>
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
              <span className="toolkit-card-index">04 · Events · အစီအစဉ်များ</span>
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
              <span className="toolkit-card-index">05 · Practice · လေ့ကျင့်မှု</span>
              <strong>Workplace scenario lab</strong>
              <p>Practise calm, fair next steps for attendance, payroll variance, and employee concerns.</p>
              <span className="toolkit-card-link">Play a case <ArrowUpRight size={15} /></span>
            </a>
            <a className="toolkit-card toolkit-card-wide toolkit-card-payroll" href="/?hr-toolkit=1&v=final&section=payroll" onClick={() => setSelectedWorkspace("payroll")}>
              <span className="toolkit-card-icon"><Calculator size={18} /></span>
              <span className="toolkit-card-index">06 · Test &amp; calculate · တွက်ချက်မှု</span>
              <strong>Payroll testing workspace</strong>
              <p>Use the Myanmar payroll estimator, SSB/PIT guidance, bulk file workflows, and sector forms in one protected workspace.</p>
              <span className="toolkit-card-link">Open payroll tools <ArrowUpRight size={15} /></span>
            </a>
          </div>
        </section>

        <section className="feature-section section-pad" id="features" aria-labelledby="features-title">
          <div className="feature-heading">
            <div>
              <p className="section-kicker"><span className="eyebrow-dot" /> Built for practical work</p>
              <h2 id="features-title">Everything your<br /><i>HR day needs.</i></h2>
            </div>
            <p>Clear tools, calm workflows, and useful guidance—structured like a modern product workspace, not a crowded portal. <span lang="my">ရှုပ်ထွေးမနေဘဲ အသုံးချလွယ်အောင် တည်ဆောက်ထားပါတယ်။</span></p>
          </div>
          <div className="feature-grid">
            {[
              { number: "01", title: "Payroll clarity", copy: "Estimate PIT, SSB, net pay, and employer cost with a focused testing workspace." },
              { number: "02", title: "Ready-to-use templates", copy: "Open practical forms for recruitment, attendance, performance, employee relations, and reporting." },
              { number: "03", title: "Guided decisions", copy: "Use the scenario lab and Zeke assistant to turn workplace questions into calm next steps." },
              { number: "04", title: "Public learning feed", copy: "Find HR events and workplace learning links gathered from original public sources." },
            ].map((feature) => <article className="feature-card" key={feature.number}><span>{feature.number}</span><strong>{feature.title}</strong><p>{feature.copy}</p><a href="#services">Explore <ArrowUpRight size={14} /></a></article>)}
          </div>
        </section>

        <section className="pricing-section section-pad" id="pricing" aria-labelledby="pricing-title">
          <div className="pricing-heading">
            <div>
              <p className="section-kicker"><span className="eyebrow-dot" /> Simple access</p>
              <h2 id="pricing-title">Choose the right<br /><i>starting point.</i></h2>
            </div>
            <p>Start free, then unlock the protected workspace when you need payroll outputs, templates, and official-source preparation. <span lang="my">အခမဲ့စတင်ပြီး လိုအပ်တဲ့အချိန်မှာ workspace ကို ဖွင့်နိုင်ပါတယ်။</span></p>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card"><span className="pricing-label">PUBLIC</span><strong>Start free</strong><b>No approval</b><p>Public HR resources, events, workplace practice, and the Zeke assistant.</p><a href="#toolkit">Start exploring <ArrowUpRight size={14} /></a></article>
            <article className="pricing-card pricing-card-featured"><span className="pricing-label">WORKSPACE · RECOMMENDED</span><strong>Unlock</strong><b>50,000 MMK access</b><p>Payroll calculator, bulk exports, C&amp;B resources, and sector forms after Telegram review and approval.</p><a href="#telegram-unlock">Request access <ArrowUpRight size={14} /></a></article>
            <article className="pricing-card"><span className="pricing-label">TEAMS</span><strong>Shape it</strong><b>Custom workflow</b><p>Talk through a recurring HR process and build a focused operating workflow for your team.</p><a href="https://t.me/ayelay_bot" target="_blank" rel="noreferrer">Talk on Telegram <ArrowUpRight size={14} /></a></article>
          </div>
        </section>

        <ScenarioLab />


        <section className="services-panel" id="services">
          <div className="services-hero section-pad">
            <div>
              <p className="section-kicker"><span className="telegram-dot" /> ZHTE service desk · HR လုပ်ငန်းစဉ်</p>
              <h2>A calmer way<br /><i>to run HR.</i></h2>
            </div>
            <div className="services-hero-copy">
              <p>Understand the issue, prepare the work, and move to the official next step with confidence. Choose a public resource, protected workspace, or direct team conversation. <span lang="my">အခြေအနေကို နားလည်၊ လုပ်ငန်းကို ပြင်ဆင်ပြီး official next step ကို ယုံကြည်စွာ ဆက်လုပ်နိုင်ပါတယ်။</span></p>
              <div className="services-proof-row"><span><strong>6</strong> HR workstreams</span><span><strong>Local-first</strong> salary data</span><span><strong>Official</strong> source handoff</span></div>
            </div>
          </div>

          <div className="services-paths section-pad" aria-label="Choose your ZHTE path">
            <div className="services-paths-heading"><p className="section-kicker"><span className="eyebrow-dot" /> Choose your next step</p><span>Most visitors start with the recommended workspace path.</span></div>
            <div className="services-path-grid">
              <a className="services-path-card" href="#toolkit"><span>01</span><strong>Explore publicly</strong><p>Use events, practice cases, Zeke, and public HR resources without an approval step.</p><b>Start free <ArrowUpRight size={14} /></b></a>
              <a className="services-path-card services-path-card-featured" href="#telegram-unlock"><span>02 · RECOMMENDED</span><strong>Unlock the workspace</strong><p>Get payroll testing, bulk outputs, HR forms, and C&amp;B resources through one Telegram approval flow.</p><b>Request access <ArrowUpRight size={14} /></b></a>
              <a className="services-path-card" href="https://t.me/ayelay_bot" target="_blank" rel="noreferrer"><span>03</span><strong>Talk to the team</strong><p>For a recurring process, ask about a focused workflow for your team or organisation.</p><b>Open Telegram <ExternalLink size={14} /></b></a>
            </div>
          </div>

          <div className="services-explainer section-pad">
            <div className="services-explainer-heading">
              <div>
                <p className="section-kicker"><span className="eyebrow-dot" /> Optional 58-second explainer</p>
                <h3>See what you get,<br /><i>before you unlock.</i></h3>
              </div>
              <p>Prefer a quick walkthrough? See the access steps and workspace outputs here. You can skip the video and request access directly above or below.</p>
            </div>
            <div className="services-video-shell">
              <video className="services-explainer-video" controls preload="metadata" poster="/videos/hr-toolkit-services-58sec-poster.jpg" aria-label="HR Toolkit Telegram access explainer video">
                <source src="/videos/hr-toolkit-services-58sec.mp4" type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>
            <div className="services-explainer-footer">
              <span>58 sec · Burmese narration · English UI labels · မြန်မာအသံ / English UI</span>
              <div className="services-explainer-actions">
                <a className="button-primary" href="#telegram-unlock">Request access <ArrowUpRight size={15} /></a>
                <a className="telegram-button" href="https://t.me/ayelay_bot" target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a>
              </div>
            </div>
          </div>

          <div className="section-pad services-access-wrap">
            <div className="services-access-heading">
              <div><p className="section-kicker"><span className="telegram-dot" /> Recommended next step</p><h3>Unlock once.<br /><i>Use the workspace.</i></h3></div>
              <p>One request covers payroll testing, bulk payroll files, C&amp;B sources, and HR sector forms. Your salary inputs stay in the browser; official filing remains on the relevant authority's site.</p>
            </div>
            <WorkspaceAccessGate onApprovedChange={setWorkspaceApproved} />
          </div>
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
          <div className="hr-sector-heading section-pad"><div><p className="section-kicker"><UsersRound size={15} aria-hidden="true" /> HR sector · လုပ်ငန်းကဏ္ဍ</p><h3>People work, held together.</h3><p>Choose a sector to open its related working form. Forms are local preparation templates, not government submissions. <span lang="my">သက်ဆိုင်ရာကဏ္ဍကို ရွေးပြီး form ကို ပြင်ဆင်နိုင်ပါတယ်။</span></p></div></div>
          <div className="hr-sector-grid section-pad">{hrSectorItems.map((item, index) => <button type="button" className={"hr-sector-card " + (selectedWorkspace === item.id ? "selected" : "")} key={item.id} onClick={() => setSelectedWorkspace(item.id)} disabled={!workspaceApproved} aria-disabled={!workspaceApproved}><span>0{index + 1}</span><div><strong>{item.title}</strong><p>{item.description}</p></div><small>{workspaceApproved ? "Open related forms" : "Unlock with Telegram"}</small></button>)}</div>
          {workspaceApproved && selectedWorkspace !== "bulk" && <div className="workspace-active-panel section-pad" aria-live="polite">{selectedWorkspace === "payroll" && <PayrollCalculator />}{selectedWorkspace === "cb" && <CBResourceCenter />}{hrSectorItems.some((item) => item.id === selectedWorkspace) && <HRSectorForm key={selectedWorkspace} id={selectedWorkspace as HRSectorId} />}</div>}
        </section>
      </main>

      <footer className="site-footer" aria-label="Website footer"><div className="footer-brand"><span className="brand-mark" aria-hidden="true"><Sparkles size={14} /></span><span><b>ZHTE</b> <em>HR toolkit</em></span></div><span className="footer-note"><Check size={14} aria-hidden="true" /> Practical public resources · လက်တွေ့အရင်းအမြစ်များ</span><nav className="footer-links" aria-label="Legal navigation"><a href="/privacy">Privacy · ကိုယ်ရေးအချက်အလက်</a><a href="/terms">Terms · စည်းကမ်း</a><a href="/payroll-disclaimer">Payroll note · မှတ်ချက်</a></nav><span className="footer-year">© {new Date().getFullYear()} ZHTE · HR Toolkit</span></footer>
    </div>
  );
}
