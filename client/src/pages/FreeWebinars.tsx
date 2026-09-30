import { CalendarDays, ExternalLink, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
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

export default function FreeWebinars() {
  const [videos, setVideos] = useState<EventVideo[]>([]);
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

  return (
    <main className="webinars-page">
      <section className="webinars-hero">
        <nav className="webinars-page-nav" aria-label="Event navigation"><a href="/">← Portfolio</a></nav>
        <p className="section-kicker">Daily event video desk</p>
        <h1>HR events, updated daily.</h1>
        <p>နေ့စဉ်ရှာဖွေတွေ့ရှိသော public HR / workplace videos များကို မူရင်း YouTube စာမျက်နှာသို့သာ ချိတ်ပေးပါသည်။ Google Drive မသုံးပါ၊ ဗီဒီယိုကို download/re-upload မလုပ်ပါ။</p>
      </section>

      <section className="webinars-list" aria-labelledby="daily-event-feed-title">
        <div className="recommended-videos-heading">
          <p className="section-kicker">AUTOMATED DAILY FEED · MYANMAR HR</p>
          <h2 id="daily-event-feed-title">Latest event videos</h2>
          <p>Cloudflare daily job က HR Myanmar, HR event Myanmar, HR training Myanmar နှင့် လူ့စွမ်းအားအရင်းအမြစ် မြန်မာ စသည့်ရှာဖွေမှုများမှ link အသစ်များကို စုစည်းပေးပါတယ်။</p>
          <button className="button-print" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />} Refresh feed</button>
        </div>
        {error && <p className="admin-control-error" role="alert">{error}</p>}
        {loading ? <p className="webinar-unavailable"><Loader2 className="spin" size={15} /> Loading daily event videos…</p> : videos.length ? <div className="recommended-videos-grid">{videos.map((video, index) => <article className="recommended-video-card" key={video.id || video.video_url}>
          <span className="recommended-video-number">{String(index + 1).padStart(2, "0")} · {video.platform}</span>
          <h3>{video.title || "HR event video"}</h3>
          <p className="recommended-video-topic">Auto-discovered from: {video.source_query || "HR video search"}</p>
          <p className="recommended-video-creator">{video.creator_name || "Original publisher"} · Updated {displayDate(video.last_seen_at)}</p>
          <a href={video.video_url} target="_blank" rel="noopener noreferrer"><PlayCircle size={16} /> Watch original <ExternalLink size={13} /></a>
        </article>)}</div> : <p className="webinar-unavailable">ဒီနေ့အတွက် public event video အသစ် မတွေ့သေးပါ။ နောက်နေ့ daily update တွင် ပြန်စစ်ပေးပါမည်။</p>}
      </section>

      <section className="recommended-videos" aria-label="Automation notes">
        <div className="recommended-videos-heading"><p className="section-kicker">NO DRIVE CONNECTION</p><h2>How the update works</h2><p>Video link ကို TiDB ထဲမှာ သိမ်းပြီး Cloudflare Worker က နေ့စဉ် 09:00 Myanmar time တွင် search လုပ်ပါတယ်။ Rejected link များသာ ဖယ်ပြီး ကျန် public original links များကို website feed မှာပြပါတယ်။ Video files ကို မကူးယူပါ။</p></div>
      </section>
    </main>
  );
}
