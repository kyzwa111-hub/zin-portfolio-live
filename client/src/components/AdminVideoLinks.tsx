import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, Loader2, Plus, RefreshCw } from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected";
type VideoLink = {
  id: string;
  video_url: string;
  platform: string;
  title: string | null;
  creator_name: string | null;
  license_name: string | null;
  rights_status: string;
  review_status: ReviewStatus;
  source_kind: "manual" | "search_api";
  source_query: string | null;
  created_at: string;
};

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result as T;
}

function displayDate(value: string): string {
  const dateText = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(dateText);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminVideoLinks() {
  const [links, setLinks] = useState<VideoLink[]>([]);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("pending");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("other");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    const suffix = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
    const result = await request<{ links: VideoLink[] }>(`/api/admin/video-links${suffix}`);
    setLinks(result.links);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    request<{ links: VideoLink[] }>(`/api/admin/video-links${filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`}`)
      .then((result) => { if (active) setLinks(result.links); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load video links."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  const addLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/video-links", { url, title, platform });
      setUrl("");
      setTitle("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the video link.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: ReviewStatus) => {
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/video-links/review", { id, status });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the review status.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="admin-control-card">
    <div className="admin-control-card-head">
      <div><p className="section-kicker">Public video links</p><h2>Video library</h2></div>
      <button className="admin-video-refresh" onClick={() => { setLoading(true); void refresh().catch((e) => setError(e instanceof Error ? e.message : "Refresh failed.")).finally(() => setLoading(false)); }} disabled={busy || loading}><RefreshCw size={14} /> Refresh</button>
    </div>
    {error && <p className="admin-control-error" role="alert">{error}</p>}
    <p className="admin-control-note">Links are saved for review only. Public viewing does not mean reuse is permitted. This tool does not download or publish videos.</p>
    <form className="admin-video-form" onSubmit={addLink}>
      <label className="admin-video-url"><span>Public video URL</span><input type="url" inputMode="url" autoComplete="url" maxLength={2048} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required /></label>
      <label><span>Platform</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="x">X</option><option value="other">Other</option></select></label>
      <label><span>Title (optional)</span><input maxLength={500} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <button className="button-primary" type="submit" disabled={busy || !url.trim()}>{busy ? <Loader2 className="spin" size={14} /> : <Plus size={14} />} Save link</button>
    </form>
    <div className="admin-video-list-head"><h3>Review queue</h3><label><span className="sr-only">Filter video links</span><select value={filter} onChange={(e) => setFilter(e.target.value as "all" | ReviewStatus)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select></label></div>
    {loading ? <p className="admin-control-empty"><Loader2 className="spin" size={14} /> Loading video links…</p> : links.length ? <div className="admin-control-table-wrap"><table className="admin-control-table admin-video-table"><thead><tr><th>Video</th><th>Platform</th><th>Source</th><th>Rights</th><th>Review</th><th>Added</th></tr></thead><tbody>{links.map((link) => <tr key={link.id}><td><a className="admin-video-link" href={link.video_url} target="_blank" rel="noopener noreferrer">{link.title || link.video_url}<ExternalLink size={12} /></a>{link.creator_name && <small>{link.creator_name}</small>}</td><td>{link.platform}</td><td>{link.source_kind === "search_api" ? link.source_query || "Automatic search" : "Manual"}</td><td><span className="admin-status-pill">{link.license_name || link.rights_status}</span></td><td><select aria-label={`Review status for ${link.title || link.video_url}`} value={link.review_status} disabled={busy} onChange={(e) => void updateStatus(link.id, e.target.value as ReviewStatus)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></td><td>{displayDate(link.created_at)}</td></tr>)}</tbody></table></div> : <p className="admin-control-empty">No video links in this view yet.</p>}
  </section>;
}
