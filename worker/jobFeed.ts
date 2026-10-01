export type JobFeedItem = {
  source: "telegram" | "linkedin" | "jobnet";
  title: string;
  url: string;
  updatedAt: string;
};

const TELEGRAM_SOURCE = "https://t.me/s/thejournalopportunity";
const MAX_ITEMS = 24;

export function telegramPostUrl(id: string): string {
  return `https://t.me/s/thejournalopportunity/${encodeURIComponent(id)}`;
}

function clean(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 180);
}

type FeedRecord = Record<string, unknown>;

function firstString(item: FeedRecord, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function feedRecords(payload: unknown): FeedRecord[] {
  if (Array.isArray(payload)) return payload.filter((item): item is FeedRecord => Boolean(item && typeof item === "object"));
  if (!payload || typeof payload !== "object") return [];
  const record = payload as FeedRecord;
  for (const key of ["items", "jobs", "results", "data", "feed"]) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is FeedRecord => Boolean(item && typeof item === "object"));
    if (value && typeof value === "object") {
      const nested = feedRecords(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function parseJsonFeed(text: string, source: JobFeedItem["source"]): JobFeedItem[] {
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { return []; }
  return feedRecords(payload).flatMap((item) => {
    const link = firstString(item, ["link", "url", "applyUrl", "jobUrl", "canonicalUrl"]);
    const title = firstString(item, ["title", "jobTitle", "name", "position"]);
    const updatedAt = firstString(item, ["pubDate", "date_published", "publishedAt", "updatedAt", "date"]) || new Date().toISOString();
    return /^https:\/\//i.test(link) && title ? [{ source, title: clean(title), url: link, updatedAt }] : [];
  });
}

async function readRss(url: string, source: JobFeedItem["source"]): Promise<JobFeedItem[]> {
  const response = await fetch(url, { headers: { accept: "application/rss+xml, application/atom+xml, application/json, text/xml" } });
  if (!response.ok) return [];
  const text = await response.text();
  const jsonItems = parseJsonFeed(text, source);
  if (jsonItems.length) return jsonItems;
  if (text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) return [];
  {
    return [...text.matchAll(/<item[\s\S]*?<\/item>/gi)].flatMap((match) => {
      const block = match[0];
      const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      const link = block.match(/<link[^>]*>(https:\/\/[^<]+)<\/link>/i)?.[1];
      const date = block.match(/<(?:pubDate|updated)[^>]*>([^<]+)<\/(?:pubDate|updated)>/i)?.[1];
      return title && link ? [{ source, title: clean(title), url: link.trim(), updatedAt: date || new Date().toISOString() }] : [];
    });
  }
}

async function readTelegram(): Promise<JobFeedItem[]> {
  const response = await fetch(TELEGRAM_SOURCE, { headers: { accept: "text/html" } });
  if (!response.ok) return [];
  const html = await response.text();
  const ids = [...html.matchAll(/https:\/\/t\.me\/thejournalopportunity\/(\d+)/g)].map((match) => match[1]);
  return [...new Set(ids)].slice(-12).reverse().map((id) => ({ source: "telegram" as const, title: `အခွင့်အလမ်းဂျာနယ် job update #${id}`, url: telegramPostUrl(id), updatedAt: new Date().toISOString() }));
}

export async function fetchJobFeed(env: { LINKEDIN_JOB_FEED_URL?: string; JOBNET_JOB_FEED_URL?: string }): Promise<JobFeedItem[]> {
  const sources = [
    env.LINKEDIN_JOB_FEED_URL ? readRss(env.LINKEDIN_JOB_FEED_URL, "linkedin") : Promise.resolve([]),
    env.JOBNET_JOB_FEED_URL ? readRss(env.JOBNET_JOB_FEED_URL, "jobnet") : Promise.resolve([]),
    readTelegram(),
  ];
  const results = (await Promise.allSettled(sources)).flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return results.filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index).slice(0, MAX_ITEMS);
}

export async function jobFeedBootstrap(env: { LINKEDIN_JOB_FEED_URL?: string; JOBNET_JOB_FEED_URL?: string }): Promise<string> {
  const items = await fetchJobFeed(env);
  return `<script id="job-feed-bootstrap">window.__JOB_FEED__=${JSON.stringify(items).replace(/</g, "\\u003c")}</script>`;
}
