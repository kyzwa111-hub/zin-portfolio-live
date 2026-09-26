import { ArrowUpRight, BookOpenCheck, ClipboardList, ExternalLink, FileText, Landmark, ShieldCheck } from "lucide-react";

const resources = [
  {
    category: "IRD · Monthly PAYE",
    title: "Monthly salary-tax withholding schedule",
    description: "Official PaTaKha (Income)-03-06 schedule for monthly salary-income-tax withholding details.",
    href: "/data-sources/ird-03-06.pdf",
    action: "Download PDF",
    tone: "coral",
  },
  {
    category: "IRD · PAYE",
    title: "Electronic salary withholding format",
    description: "Official 03-06(a) field specification for the electronic / Excel-file salary withholding schedule.",
    href: "/data-sources/ird-03-06-a.pdf",
    action: "Download field guide",
    tone: "blue",
  },
  {
    category: "IRD · Annual close",
    title: "Annual salary statement 03-07",
    description: "Official annual salary statement reference for employee salary, SSF, insurance, reliefs, and tax withheld.",
    href: "/data-sources/ird-03-07.pdf",
    action: "Download PDF",
    tone: "gold",
  },
  {
    category: "IRD · Official portal",
    title: "PAYE Management Portal",
    description: "Continue on IRD to register, upload the current sample file, select employees, and complete payment steps.",
    href: "https://paye-onlinepayment.ird.gov.mm/",
    action: "Continue on IRD",
    tone: "blue",
  },
  {
    category: "SSB · Employer compliance",
    title: "SSB contribution guidance",
    description: "Official SSB contribution information, timing guidance, and the prescribed Form 13 / contribution-list process.",
    href: "https://www.ssb.gov.mm/portal/qna",
    action: "Open SSB guidance",
    tone: "coral",
  },
  {
    category: "SSB · Calculation",
    title: "Contribution calculation formula",
    description: "Official SSB reference PDF for contribution calculations and monthly payment guidance.",
    href: "/data-sources/ssb-contribution-formula.pdf",
    action: "Download PDF",
    tone: "gold",
  },
  {
    category: "MOL · Labour rules",
    title: "Social Security Rules",
    description: "Government rule reference covering prescribed records such as Forms 1, 1A, 13, 36, and 37.",
    href: "https://servicetrade.gov.mm/horizontal/rule-detail/social-security-rules",
    action: "Open government rules",
    tone: "blue",
  },
  {
    category: "CSO · Reference data",
    title: "Labour and employment statistics",
    description: "Official labour-market reference downloads for context. Historical data is clearly labelled and is not a current salary benchmark.",
    href: "https://www.csostat.gov.mm/MonthlyPublication/LabourAndEmploymentAnalysis",
    action: "Open CSO data",
    tone: "coral",
  },
];

const checklist = [
  ["Monthly PAYE", "Prepare salary withholding details, validate employee/TIN data, and hand off through the official IRD PAYE route."],
  ["SSB contribution", "Confirm the current Form 13 or SSB-supplied contribution file with the relevant township SSB office."],
  ["Annual salary close", "Reconcile salary, SSF, insurance, reliefs, and tax withheld before preparing the annual 03-07 statement."],
  ["Government source check", "Verify current form versions, deadlines, rates, and portal instructions before every filing cycle."],
];

export default function CBResourceCenter() {
  return (
    <section className="cb-section section-pad" id="cb-resources">
      <div className="cb-intro">
        <div><p className="section-kicker"><BookOpenCheck size={15} /> C&amp;B resource center</p><h2>Make compliance<br /><i>easier to find.</i></h2></div>
        <div className="cb-intro-copy"><p className="section-description">A curated Myanmar C&amp;B workspace for official IRD, SSB, MOL, and CSO references—built for preparation and handoff, not for storing credentials or submitting government records.</p><span className="cb-source-badge"><ShieldCheck size={14} /> Official links checked 21 Sep 2026</span></div>
      </div>
      <div className="cb-notice"><div className="cb-notice-icon"><Landmark size={18} /></div><div><strong>Use the official site for the final action.</strong><p>Government portals may require their own login, CAPTCHA, TIN, payment confirmation, or township-office process. This toolkit links out safely and does not collect credentials, upload employee records, submit returns, or initiate payments.</p></div></div>
      <div className="cb-resource-grid">{resources.map((resource) => <article className={`cb-resource-card ${resource.tone}`} key={resource.title}><div className="cb-card-top"><span>{resource.category}</span><FileText size={16} /></div><h3>{resource.title}</h3><p>{resource.description}</p><a href={resource.href} target="_blank" rel="noreferrer">{resource.action}<ExternalLink size={14} /></a></article>)}</div>
      <div className="cb-lower-grid"><div className="cb-checklist"><div className="cb-subhead"><p className="section-kicker"><ClipboardList size={15} /> Practical checklist</p><span>Preparation aid</span></div>{checklist.map(([title, text], index) => <div className="cb-check-row" key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div><div className="cb-missing"><p className="section-kicker">Important boundary</p><h3>Some official forms are referenced but not publicly downloadable.</h3><p>SSB Form 13, the Contribution Excel template, and some annual salary-return layouts may be supplied by the authority or appear only after an authenticated portal login. The website will not fabricate a government form or pretend to submit one.</p><a className="text-link" href="https://www.ird.gov.mm/forms/income-tax/filling" target="_blank" rel="noreferrer">Open the official forms library <ArrowUpRight size={15} /></a></div></div>
    </section>
  );
}
