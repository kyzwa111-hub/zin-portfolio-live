import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ExternalLink,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import PayrollCalculator from "@/components/PayrollCalculator";
import CBResourceCenter from "@/components/CBResourceCenter";
import { trpc } from "@/lib/trpc";

const projects = [
  {
    number: "01",
    title: "Multi-client payroll operations",
    type: "Payroll systems",
    description:
      "High-volume payroll coordination across clients, industries, allowances, deductions, and statutory reporting needs.",
    image: "/manus-storage/multi-client-operations_fc0da14f_e67dbd0c.jpg",
    tag: "Scale + accuracy",
  },
  {
    number: "02",
    title: "People & operations support",
    type: "HR operations",
    description:
      "Cross-functional work that keeps teams aligned: client communication, finance handoffs, employee support, and clean documentation.",
    image: "/manus-storage/people-operations-teambuilding_f7484045_e0a14152.jpg",
    tag: "Human-centered",
  },
  {
    number: "03",
    title: "Team culture in action",
    type: "MP&O team culture",
    description:
      "An MP&O team-building event that brought colleagues together beyond the daily payroll workflow. The day created space for cross-team connection, shared energy, and the kind of informal communication that strengthens collaboration back at work. For a multi-client operations team, these moments matter: trust and coordination are part of delivering accurate, responsive service to every client.",
    image: "/manus-storage/team-culture-mpo_65fefebb_c04ff0a6.jpg",
    tag: "People first",
  },
  {
    number: "04",
    title: "Event & stakeholder coordination",
    type: "Project delivery",
    description:
      "From planning details to on-the-ground coordination, supporting polished experiences for teams, partners, and stakeholders.",
    image: "/manus-storage/event_b154039c_d5d697af.jpeg",
    tag: "Detail-led",
  },
];

const experience = [
  {
    period: "Mar 2026 — Present",
    role: "Payroll Operations Specialist",
    company: "Myanmar Payroll & Outsourcing",
    description:
      "Supporting multi-client payroll end-to-end, maintaining local compliance, and acting as a key coordination point for payroll queries and tax computations.",
    current: true,
  },
  {
    period: "Apr 2025 — Mar 2026",
    role: "Payroll Operations Executive",
    company: "Myanmar Payroll & Outsourcing",
    description:
      "Delivered accurate salary and tax-on-tax calculations, managed PIT and SSB reporting, and coordinated with government officers, finance teams, and clients.",
  },
  {
    period: "Jan 2025 — Apr 2025",
    role: "Senior Executive, Human Resources",
    company: "NearMe",
    description:
      "Managed people operations, employee support, documentation, and day-to-day HR coordination in a fast-moving business environment.",
  },
];

const updates = [
  {
    date: "06 Sep 2026",
    label: "Career note",
    title: "Why accurate payroll is also a people experience",
    excerpt:
      "A short reflection on how clarity, consistency, and respectful communication build trust around every pay cycle.",
    status: "Published on LinkedIn",
  },
  {
    date: "28 Aug 2026",
    label: "Operations",
    title: "Building better handoffs between HR, finance, and clients",
    excerpt:
      "The small documentation habits that make recurring payroll work easier to review, explain, and improve.",
    status: "Ready to sync",
  },
  {
    date: "14 Aug 2026",
    label: "Learning",
    title: "A practical checklist for cleaner monthly reporting",
    excerpt:
      "What I check before a report leaves the operations desk: source data, assumptions, exceptions, and follow-up.",
    status: "Published on LinkedIn",
  },
];

type PublicUpdate = {
  id?: number;
  label: string;
  title: string;
  excerpt: string;
  date: string;
  status: "Published on LinkedIn" | "Ready to sync";
  linkedinUrl?: string | null;
};

const recommendations = [
  {
    name: "May Thandar Kyaw",
    relationship: "Former colleague · AGS Myanmar",
    quote:
      "I had the opportunity to work with Zin Min Htet when he served as a Payroll Officer. Although we worked in different departments, we often worked together. He is a good listener, patient with people, and able to handle workload pressure independently. He is familiar with payroll operations and communicates carefully with others.",
  },
  {
    name: "Aye Chan Moe",
    relationship: "Colleague · Payroll & HR operations",
    quote:
      "I had the pleasure of working with Zin Min Htet, and I can confidently say he is one of the most hardworking and dedicated colleagues I have known. He consistently puts in the effort to deliver high-quality results. He is also a reliable team player who supports others and shares his knowledge. Any team would be fortunate to have him.",
  },
  {
    name: "Paing Thit Htoo (Ethan)",
    relationship: "Former direct manager · CX operations",
    quote:
      "Zin Min Htet is the kind of person who spots problems before they happen, fixes them quietly, and always puts the team first. Smart, reliable, and genuinely kind—he is the teammate everyone wants.",
  },
  {
    name: "Kyaw Htwe",
    relationship: "Former teammate · Oway Ride Call Center",
    quote:
      "I had the pleasure of working with Zin Min Htet at Oway Ride’s Call Center, where he proved to be a dedicated and hardworking colleague. His ability to handle challenges, communicate effectively, and stay committed to his work made a strong impression on me. I have no doubt his dedication and problem-solving skills will continue to drive his success.",
  },
  {
    name: "Ye Htin Kyaw",
    relationship: "Former teammate · HR team",
    quote:
      "I had the opportunity to work with Zin Min Htet in our HR team, where he served as a Payroll Officer. He handled payroll processes with diligence and accuracy, was detail-oriented, and ensured tasks were completed on time. He is familiar with payroll operations and maintains professionalism in his role.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<(typeof projects)[number] | null>(null);
  const [lastUpdated, setLastUpdated] = useState("just now");
  const [refreshing, setRefreshing] = useState(false);
  const managedUpdates = trpc.linkedinUpdates.list.useQuery();
  const visibleUpdates = useMemo<PublicUpdate[]>(() => {
    if (!managedUpdates.data?.length) return updates as PublicUpdate[];
    return ((managedUpdates.data ?? []) as Array<{ id: number; label: string; title: string; excerpt: string; dateLabel: string; status: PublicUpdate["status"]; linkedinUrl: string | null }>).map((update) => ({ id: update.id, label: update.label, title: update.title, excerpt: update.excerpt, date: update.dateLabel, status: update.status, linkedinUrl: update.linkedinUrl }));
  }, [managedUpdates.data]);

  const year = useMemo(() => new Date().getFullYear(), []);

  const refreshUpdates = async () => {
    setRefreshing(true);
    try {
      await managedUpdates.refetch();
    } finally {
      setRefreshing(false);
      setLastUpdated("just now");
    }
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!selectedProject) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProject(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProject]);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" onClick={closeMenu}>
          <span className="brand-mark"><Sparkles size={15} /></span>
          <span>zin <em>min htet</em></span>
        </a>
        <button className="mobile-menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "site-nav site-nav-open" : "site-nav"}>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#experience" onClick={closeMenu}>Experience</a>
          <a href="#work" onClick={closeMenu}>Selected work</a>
          <a href="#calculator" onClick={closeMenu}>Payroll calculator</a>
          <a href="#cb-resources" onClick={closeMenu}>C&amp;B forms</a>
          <a href="#updates" onClick={closeMenu}>Updates</a>
          <a href="#recommendations" onClick={closeMenu}>Recommendations</a>
          <a className="nav-cta" href="#contact" onClick={closeMenu}>Let’s connect <ArrowUpRight size={14} /></a>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section section-pad">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> Payroll &amp; HR operations · Yangon, Myanmar</p>
            <h1>Clear work.<br /><span>Human impact.</span></h1>
            <p className="hero-lede">I’m Zin Min Htet — a payroll and compensation operations professional with hands-on experience supporting multi-client payroll, statutory compliance, and people-focused operations.</p>
            <div className="hero-actions">
              <a className="button-primary" href="#work">Explore selected work <ArrowUpRight size={17} /></a>
              <a className="text-link" href="/manus-storage/Zin_Min_Htet_CV__8f66dc0b_490a55be.pdf" target="_blank" rel="noreferrer">View CV <ExternalLink size={15} /></a>
              <a className="text-link" href="#about">More about my approach <ArrowDownRight size={16} /></a>
            </div>
            <div className="hero-meta"><span><Check size={14} /> Payroll systems</span><span><Check size={14} /> HR coordination</span><span><Check size={14} /> Client communication</span></div>
          </div>
          <div className="hero-visual" aria-label="Professional team and operations visual">
            <div className="hero-image-wrap"><img className="profile-photo" src="/manus-storage/profile_c95ef462_5513abdb.png" alt="Zin Min Htet professional profile photo" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>
            <div className="hero-card hero-card-top"><span>01</span><strong>make it<br />understandable</strong></div>
            <div className="hero-card hero-card-bottom"><span>02</span><strong>make it<br />reliable</strong></div>
            <div className="hero-caption">Operations / people / trust</div>
          </div>
        </section>

        <section className="signal-strip" aria-label="Professional principles">
          <div className="signal-track"><span>clarity over noise</span><b>✳</b><span>accuracy with empathy</span><b>✳</b><span>momentum over perfection</span><b>✳</b><span>clarity over noise</span></div>
        </section>

        <section className="about-section section-pad" id="about">
          <div className="section-intro">
            <div><p className="section-kicker">The person behind the work</p><h2>Good operations make<br /><i>room for good work.</i></h2></div>
            <p className="section-description">I am a Payroll and HR Operations professional with hands-on experience in multi-client payroll, compensation administration, statutory compliance, and people-focused operations in Myanmar.</p>
          </div>
          <div className="about-grid">
            <div className="about-profile-copy"><span className="large-mark">✳</span><div><p>My work includes payroll processing, salary and benefits coordination, employee data management, attendance and leave administration, SSB and income tax support, and clear communication with clients and employees.</p><p>I focus on making payroll accurate, understandable, and reliable while supporting smooth HR operations across different teams and client environments. I am especially interested in payroll systems, compensation operations, HR process improvement, and practical people solutions.</p><p>I believe good operations are built on accuracy, confidentiality, accountability, and empathy.</p></div></div>
            <div className="stats-grid"><div><strong>3+</strong><span>years across HR &amp; payroll</span></div><div><strong>4</strong><span>core operations strengths</span></div><div><strong>∞</strong><span>curiosity for better systems</span></div><div><strong>01</strong><span>principle: keep it human</span></div></div>
          </div>
        </section>

        <PayrollCalculator />
        <CBResourceCenter />

        <section className="experience-section section-pad" id="experience">
          <div className="section-heading-row"><div><p className="section-kicker">The timeline</p><h2>Experience with<br /><i>real responsibility.</i></h2></div><span className="section-index">02 / 04</span></div>
          <div className="timeline">{experience.map((item) => <article className="timeline-item" key={item.role}><div className="timeline-date">{item.period}</div><div className="timeline-dot" /><div className="timeline-content"><div className="role-line"><h3>{item.role}</h3>{item.current && <span className="current-pill">Current</span>}</div><p className="company">{item.company}</p><p>{item.description}</p></div></article>)}</div>
        </section>

        <section className="work-section section-pad" id="work">
          <div className="section-heading-row"><div><p className="section-kicker">Selected work</p><h2>Where the details<br /><i>become visible.</i></h2></div><p className="section-description compact">A few snapshots from the work around payroll, people operations, culture, and stakeholder coordination.</p></div>
          <div className="project-grid">{projects.map((project) => <button className="project-card" key={project.number} onClick={() => setSelectedProject(project)}><div className="project-image"><img src={project.image} alt={project.title} onError={(event) => { event.currentTarget.style.display = "none"; }} /><span className="project-number">{project.number}</span><span className="project-open"><ArrowUpRight size={17} /></span></div><div className="project-copy"><div><p>{project.type}</p><h3>{project.title}</h3></div><span className="project-tag">{project.tag}</span></div></button>)}</div>
        </section>

        <section className="updates-section section-pad" id="updates">
          <div className="updates-head"><div><p className="section-kicker"><Linkedin size={15} /> Latest from LinkedIn</p><h2>Notes from the<br /><i>work in progress.</i></h2></div><div className="sync-status"><span className="status-dot" /> <span>{managedUpdates.isFetching ? "Refreshing feed" : "Update feed ready"}</span><button onClick={() => void refreshUpdates()} aria-label="Refresh updates" disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} /></button><small>Updated {lastUpdated}</small></div></div>
          <div className="updates-grid">{visibleUpdates.map((update) => <article className="update-card" key={update.id ?? update.title}><div className="update-top"><span>{update.label}</span><span>{update.date}</span></div><h3>{update.title}</h3><p>{update.excerpt}</p><div className="update-bottom"><span className={update.status === "Published on LinkedIn" ? "published" : "ready"}><span className="mini-dot" />{update.status}</span><a href={update.linkedinUrl || "https://www.linkedin.com/"} target="_blank" rel="noreferrer" aria-label="Open LinkedIn"><ExternalLink size={15} /></a></div></article>)}</div>
          <div className="sync-note"><span className="note-icon"><RefreshCw size={16} /></span><p><strong>LinkedIn sync foundation is in place.</strong> This feed is ready to connect to LinkedIn’s approved API or an automation webhook when credentials and permissions are enabled. Until then, updates remain safely editable here.</p><a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">Open LinkedIn <ArrowUpRight size={15} /></a></div>
        </section>

        <section className="recommendations-section section-pad" id="recommendations">
          <div className="recommendations-head"><div><p className="section-kicker">LinkedIn recommendations</p><h2>Good work is<br /><i>remembered by people.</i></h2></div><a className="recommendations-link" href="https://www.linkedin.com/in/zin-min-htet-39b0a7243/" target="_blank" rel="noreferrer">View on LinkedIn <ExternalLink size={15} /></a></div>
          <div className="recommendations-grid">{recommendations.map((recommendation) => <article className="recommendation-card" key={recommendation.name}><div className="quote-mark">“</div><p className="recommendation-quote">{recommendation.quote}</p><div className="recommendation-author"><span className="author-avatar">{recommendation.name.split(" ").map((part) => part[0]).join("")}</span><div><strong>{recommendation.name}</strong><span>{recommendation.relationship}</span></div></div></article>)}</div>
        </section>

        <section className="contact-section section-pad" id="contact"><div className="contact-inner"><p className="section-kicker">Start a conversation</p><h2>Let’s make the<br /><i>next thing clearer.</i></h2><p>For payroll operations, HR coordination, or a thoughtful conversation about better ways of working.</p><a className="button-dark" href="mailto:fzinmin11@gmail.com">Send an email <Mail size={16} /></a><div className="contact-details"><span><MapPin size={15} /> Yangon, Myanmar</span><span><BriefcaseBusiness size={15} /> Open to meaningful opportunities</span><span><CalendarDays size={15} /> Available for a conversation</span></div></div></section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>zin <em>min htet</em></span></div><span className="footer-note">A portfolio for work that matters.</span><a className="footer-admin-link" href="/admin/updates">Manage updates</a><span className="footer-year">© {year} Zin Min Htet</span></footer>

      {selectedProject && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedProject(null)}><div className="project-modal" role="dialog" aria-modal="true" aria-label={selectedProject.title} onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedProject(null)} aria-label="Close project"><X size={20} /></button><img src={selectedProject.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="modal-copy"><p className="section-kicker">{selectedProject.type}</p><h2>{selectedProject.title}</h2><p>{selectedProject.description}</p><span className="project-tag">{selectedProject.tag}</span></div></div></div>}
    </div>
  );
}
