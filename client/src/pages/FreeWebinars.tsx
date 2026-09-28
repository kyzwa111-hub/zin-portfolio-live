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

const recommendedVideos = [
  { title: "အလုပ်ရှင် အလုပ်သမား ဆက်ဆံရေး (Employer & Employee Relations)", creator: "Life and Thought", topic: "အလုပ်ရှင်–ဝန်ထမ်း ဆက်ဆံရေး", platform: "YouTube", url: "https://www.youtube.com/watch?v=eOeefaAltAs" },
  { title: "Time Management ကောင်းတဲ့သူတွေ လိုက်နာတဲ့ Rule (5) ခု", creator: "Work Mindset Program", topic: "အချိန်စီမံခန့်ခွဲမှု၊ အလုပ်ဦးစားပေးခြင်းနှင့် အာရုံစူးစိုက်မှု", platform: "Facebook Reel", url: "https://www.facebook.com/reel/1467610001753466/" },
  { title: "HR တွေ မဖြစ်မနေ အမြဲလုပ်ပေးရတဲ့ လုပ်ငန်းစဉ်ကြီး (၄) ခုက ဘာလဲ?", creator: "HR Country", topic: "HR ၏ အဓိကလုပ်ငန်းစဉ်များ", platform: "YouTube", url: "https://www.youtube.com/watch?v=JVSeXpc4RyY" },
  { title: "ကျွမ်းကျင် HR Professional တစ်ယောက်ဖြစ်လာဖို့ သိထားသင့်တဲ့အချက်များ", creator: "Panellist Business Services", topic: "HR ပညာရှင်တစ်ဦးအတွက် လိုအပ်သော အချက်များ", platform: "YouTube", url: "https://www.youtube.com/watch?v=BUdauu8yvqc" },
  { title: "ခေါင်းဆောင်လုပ်မည့်သူတိုင်း သိထားသင့်သော အခြေခံကျတဲ့ ခေါင်းဆောင်မှု (၅) မျိုး", creator: "Pyay Khaing", topic: "ခေါင်းဆောင်မှုပုံစံများနှင့် လူအဖွဲ့ကို စီမံခန့်ခွဲခြင်း", platform: "YouTube", url: "https://www.youtube.com/watch?v=umV_lQuzXOk" },
];

export default function FreeWebinars() {
  return (
    <main className="webinars-page">
      <section className="webinars-hero">
        <nav className="webinars-page-nav" aria-label="Event navigation">
          <a href="/">← Portfolio</a>
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
      <section className="recommended-videos" aria-labelledby="recommended-videos-title">
        <div className="recommended-videos-heading">
          <p className="section-kicker">Myanmar HR &amp; workplace learning</p>
          <h2 id="recommended-videos-title">Recommended videos</h2>
          <p>These links open the original YouTube or Facebook pages. Videos are not downloaded or re-uploaded here.</p>
        </div>
        <div className="recommended-videos-grid">
          {recommendedVideos.map((video, index) => (
            <article className="recommended-video-card" key={video.url}>
              <span className="recommended-video-number">0{index + 1} · {video.platform}</span>
              <h3>{video.title}</h3>
              <p className="recommended-video-topic">{video.topic}</p>
              <p className="recommended-video-creator">Channel: {video.creator}</p>
              <a href={video.url} target="_blank" rel="noopener noreferrer"><PlayCircle size={16} /> Watch original <ExternalLink size={13} /></a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
