export type JobFeedItem = {
  source: "telegram" | "linkedin" | "jobnet";
  title: string;
  url: string;
  updatedAt: string;
};

const TELEGRAM_SOURCE = "https://t.me/s/thejournalopportunity";
const MAX_ITEMS = 24;

function clean(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function readRss(url: string, source: JobFeedItem["source"]): Promise<JobFeedItem[]> {
  const response = await fetch(url, { headers: { accept: "application/rss+xml, application/atom+xml, application/json, text/xml" } });
  if (!response.ok) return [];
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { items?: Array<{ title?: string; link?: string; url?: string; pubDate?: string; date_published?: string }> };
    return (payload.items || []).flatMap((item) => {
      const link = String(item.link || item.url || "");
      return link.startsWith("https://") && item.title ? [{ source, title: clean(item.title), url: link, updatedAt: item.pubDate || item.date_published || new Date().toISOString() }] : [];
    });
  } catch {
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
  return [...new Set(ids)].slice(-12).reverse().map((id) => ({ source: "telegram" as const, title: `အခွင့်အလမ်းဂျာနယ် job update #${id}`, url: `https://t.me/thejournalopportunity/${id}`, updatedAt: new Date().toISOString() }));
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
