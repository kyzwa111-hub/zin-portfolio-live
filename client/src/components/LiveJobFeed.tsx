import { BriefcaseBusiness, ExternalLink } from "lucide-react";

type JobFeedItem = { source: "telegram" | "linkedin" | "jobnet"; title: string; url: string; updatedAt: string };

declare global { interface Window { __JOB_FEED__?: JobFeedItem[] } }

const labels: Record<JobFeedItem["source"], string> = { telegram: "Telegram", linkedin: "LinkedIn", jobnet: "JobNet" };

export default function LiveJobFeed() {
  const items = typeof window === "undefined" ? [] : (window.__JOB_FEED__ || []);
  if (!items.length) return null;
  return <section className="live-job-feed" aria-label="Live job feed"><div className="live-job-feed-head"><div><p className="section-kicker">SERVER-SIDE LIVE FEED</p><h2>New opportunities</h2><p>မူရင်း source link များကိုသာ ပြထားပြီး ဗီဒီယို သို့မဟုတ် job content ကို copy မလုပ်ပါ။</p></div><BriefcaseBusiness size={26} /></div><div className="live-job-feed-grid">{items.map((item) => <a className="live-job-card" href={item.url} target="_blank" rel="noopener noreferrer" key={`${item.source}-${item.url}`}><span>{labels[item.source]} <ExternalLink size={12} /></span><strong>{item.title}</strong><small>Open original source</small></a>)}</div></section>;
}
