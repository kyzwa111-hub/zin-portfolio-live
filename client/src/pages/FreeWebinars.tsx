import { CalendarDays, ExternalLink, PlayCircle, Presentation } from "lucide-react";
import "../webinars.css";

const webinars = [
  {
    title: "Business KPIs Awareness",
    category: "HR Operations",
    date: "26 September 2026",
    description: "A practical learning session about understanding business KPIs and connecting performance information with people operations.",
    folderUrl: "https://drive.google.com/drive/folders/1qFlbWlQLOzuTE4WvQI0irpJISYOfMMA1",
    recordingUrl: "https://drive.google.com/file/d/1mL0kaCtn491Zro0rmjWrX5WQIvhCMhfb/view?usp=sharing",
    slidesUrl: "https://drive.google.com/file/d/1sUfe_y0fbPFay1eo_lh8UsODmv06OcR-/view?usp=sharing",
  },
];

export default function FreeWebinars() {
  return (
    <main className="webinars-page">
      <section className="webinars-hero">
        <nav className="webinars-page-nav" aria-label="Event navigation">
          <a href="/">← Portfolio</a>
          <a href="/admin">Admin panel →</a>
        </nav>
        <p className="section-kicker">HR learning & development</p>
        <h1>Free HR Webinars</h1>
        <p>Practical sessions and resources for HR, payroll, and people operations professionals in Myanmar.</p>
      </section>
      <section className="webinars-list" aria-label="Free HR webinars">
        {webinars.map((webinar) => (
          <article className="webinar-card" key={webinar.title}>
            <div className="webinar-card-top">
              <span className="webinar-badge">FREE · {webinar.category}</span>
              <h2>{webinar.title}</h2>
              <p>{webinar.description}</p>
            </div>
            <div className="webinar-meta"><CalendarDays size={16} /> {webinar.date}</div>
            <div className="webinar-actions">
              {webinar.recordingUrl ? <a href={webinar.recordingUrl} target="_blank" rel="noreferrer"><PlayCircle size={15} /> Watch recording <ExternalLink size={13} /></a> : <span className="webinar-unavailable"><PlayCircle size={15} /> Recording link pending</span>}
              {webinar.slidesUrl ? <a href={webinar.slidesUrl} target="_blank" rel="noreferrer"><Presentation size={15} /> View slides <ExternalLink size={13} /></a> : <span className="webinar-unavailable"><Presentation size={15} /> Slides link pending</span>}
              <a href={webinar.folderUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open event folder</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
