import { CalendarDays, ExternalLink, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "../webinars.css";

type EventVideo = {
  id: string;
  video_url: string;
  platform: string;
  title: string | null;
  creator_name: string | null;
  source_query: string | null;
  last_seen_at: string;
};

function displayDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const filters = ["All", "HR", "Career", "Workplace", "Learning"] as const;
type EventFilter = (typeof filters)[number];

function eventCategory(video: EventVideo): Exclude<EventFilter, "All"> {
  const text = `${video.title || ""} ${video.source_query || ""}`.toLowerCase();
  if (/(career|job|အလုပ်|အလုပ်အကိုင်)/i.test(text)) return "Career";
  if (/(workplace|office|work life|လုပ်ငန်းခွင်|ဝန်ထမ်း)/i.test(text)) return "Workplace";
  if (/(training|learning|course|သင်တန်း|လေ့လာ)/i.test(text)) return "Learning";
  return "HR";
}

export default function FreeWebinars() {
  const [videos, setVideos] = useState<EventVideo[]>([]);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/event-videos", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Daily video feed is not ready yet.");
      setVideos(result.links || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the daily video feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredVideos = useMemo(
    () => activeFilter === "All" ? videos : videos.filter(video => eventCategory(video) === activeFilter),
    [activeFilter, videos]
  );
  const featuredVideo = filteredVideos[0];
  const remainingVideos = filteredVideos.slice(1);

  return (
    <main className="webinars-page">
      <section className="webinars-hero">
        <nav className="webinars-page-nav" aria-label="Event navigation"><a href="/">← Zeke home</a><a href="/#jobs">Job</a><a href="/#services">Services</a></nav>
        <p className="section-kicker">Daily event video desk</p>
        <h1>HR events, updated daily.</h1>
        <p>နေ့စဉ်ရှာဖွေတွေ့ရှိသော public HR / workplace videos များကို မူရင်း YouTube စာမျက်နှာသို့သာ ချိတ်ပေးပါသည်။ Google Drive မသုံးပါ၊ ဗီဒီယိုကို download/re-upload မလုပ်ပါ။</p>
      </section>

      <section className="webinars-list" aria-labelledby="daily-event-feed-title">
        <div className="recommended-videos-heading">
          <p className="section-kicker">AUTOMATED DAILY FEED · MYANMAR HR</p>
          <h2 id="daily-event-feed-title">Discover something useful.</h2>
          <p>Upcoming event dates မရှိသေးတဲ့အခါ မူရင်း publisher ရဲ့ latest public video ကိုပဲ ပြသပါတယ်။ Event ကိုရွေးပြီး source မှာ အသေးစိတ်ကြည့်နိုင်ပါတယ်။</p>
          <div className="event-feed-tools">
            <div className="event-filter-list" aria-label="Filter event videos">
              {filters.map(filter => <button key={filter} type="button" className={activeFilter === filter ? "active" : ""} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
            </div>
            <button className="button-print" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />} Refresh feed</button>
          </div>
        </div>
        {error && <p className="admin-control-error" role="alert">{error}</p>}
        {loading ? <p className="webinar-unavailable"><Loader2 className="spin" size={15} /> Loading daily event videos…</p> : videos.length ? filteredVideos.length ? <>
          {featuredVideo && <article className="event-featured-card">
            <div><span className="event-featured-label">FEATURED · {eventCategory(featuredVideo)}</span><h3>{featuredVideo.title || "Today’s HR & workplace video"}</h3><p>{featuredVideo.creator_name || "Original publisher"} · Updated {displayDate(featuredVideo.last_seen_at)}</p></div>
            <a href={featuredVideo.video_url} target="_blank" rel="noopener noreferrer"><PlayCircle size={16} /> Watch featured event <ExternalLink size={13} /></a>
          </article>}
          {remainingVideos.length ? <div className="recommended-videos-grid">{remainingVideos.map((video, index) => <article className="recommended-video-card" key={video.id || video.video_url}>
            <span className="recommended-video-number">{String(index + 2).padStart(2, "0")} · {eventCategory(video)} · {video.platform}</span>
            <h3>{video.title || "HR event video"}</h3>
            <p className="recommended-video-topic">From: {video.source_query || "HR video search"}</p>
            <p className="recommended-video-creator">{video.creator_name || "Original publisher"} · Updated {displayDate(video.last_seen_at)}</p>
            <a href={video.video_url} target="_blank" rel="noopener noreferrer"><PlayCircle size={16} /> Watch original <ExternalLink size={13} /></a>
          </article>)}</div> : null}
        </> : <p className="webinar-unavailable">ဒီ category မှာ video မတွေ့သေးပါ။ All ကို ပြန်ရွေးပြီး အခြား event တွေကို ကြည့်ပါ။</p> : <p className="webinar-unavailable">ဒီနေ့အတွက် public event video အသစ် မတွေ့သေးပါ။ နောက်နေ့ daily update တွင် ပြန်စစ်ပေးပါမည်။</p>}
      </section>

      <section className="recommended-videos" aria-label="Automation notes">
        <div className="recommended-videos-heading"><p className="section-kicker">NO DRIVE CONNECTION</p><h2>How the update works</h2><p>Video link ကို TiDB ထဲမှာ သိမ်းပြီး Cloudflare Worker က နေ့စဉ် 09:00 Myanmar time တွင် search လုပ်ပါတယ်။ Rejected link များသာ ဖယ်ပြီး ကျန် public original links များကို website feed မှာပြပါတယ်။ Video files ကို မကူးယူပါ။</p></div>
      </section>
    </main>
  );
}
