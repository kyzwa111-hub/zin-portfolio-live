import { addVideoLinks, checkVideoLinkStore } from "./videoLinks";
import type { TiDBEnv, VideoLinkInput } from "./videoLinks";

export interface YouTubeDiscoveryEnv extends TiDBEnv {
  YOUTUBE_DATA_API_KEY?: string;
}

export const DAILY_YOUTUBE_QUERIES = [
  "HR Myanmar",
  "HR event Myanmar",
  "HR training Myanmar",
  "human resources Myanmar",
  "လူ့စွမ်းအားအရင်းအမြစ် မြန်မာ",
] as const;

export const PUBLIC_EVENT_FEEDS = [
  { url: "https://news.google.com/rss/search?q=HR+webinar&hl=en-US&gl=US&ceid=US:en", label: "English HR webinars" },
  { url: "https://news.google.com/rss/search?q=human+resources+webinar&hl=en-US&gl=US&ceid=US:en", label: "English people & HR" },
  { url: "https://news.google.com/rss/search?q=Myanmar+HR+training&hl=en-US&gl=US&ceid=US:en", label: "Myanmar HR learning" },
  { url: "https://news.google.com/rss/search?q=workplace+training&hl=en-US&gl=US&ceid=US:en", label: "Workplace learning" },
] as const;

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const MAX_RESULTS_PER_QUERY = 10;

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string };
  }>;
};

type DiscoveryResult = {
  status: "ok" | "skipped" | "failed";
  reason?: string;
  phase?: string;
  httpStatus?: number;
  queriesCompleted?: number;
  queriesPlanned?: number;
  resultsFound?: number;
  linksProcessed?: number;
};

export async function runDailyYouTubeDiscovery(env: YouTubeDiscoveryEnv): Promise<DiscoveryResult> {
  if (!env.YOUTUBE_DATA_API_KEY) return runPublicEventFeedDiscovery(env);
  if (!env.TIDB_DATABASE_URL && !env.DB) return { status: "skipped", reason: "missing_storage", queriesPlanned: DAILY_YOUTUBE_QUERIES.length };

  try {
    await checkVideoLinkStore(env);
  } catch {
    return { status: "skipped", reason: "tidb_unavailable_or_schema_missing", queriesPlanned: DAILY_YOUTUBE_QUERIES.length };
  }

  let queriesCompleted = 0;
  let resultsFound = 0;
  let linksProcessed = 0;

  for (const query of DAILY_YOUTUBE_QUERIES) {
    const endpoint = new URL(SEARCH_ENDPOINT);
    endpoint.searchParams.set("part", "snippet");
    endpoint.searchParams.set("type", "video");
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("maxResults", String(MAX_RESULTS_PER_QUERY));
    endpoint.searchParams.set("order", "date");
    endpoint.searchParams.set("regionCode", "MM");
    endpoint.searchParams.set("relevanceLanguage", "my");

    let response: Response;
    try {
      response = await fetch(endpoint.toString(), { headers: { "X-Goog-Api-Key": env.YOUTUBE_DATA_API_KEY } });
    } catch {
      return { status: "failed", phase: "youtube_api", reason: "network_error", queriesCompleted, resultsFound, linksProcessed, queriesPlanned: DAILY_YOUTUBE_QUERIES.length };
    }
    if (!response.ok) {
      return { status: "failed", phase: "youtube_api", reason: "request_failed", httpStatus: response.status, queriesCompleted, resultsFound, linksProcessed, queriesPlanned: DAILY_YOUTUBE_QUERIES.length };
    }

    let payload: YouTubeSearchResponse;
    try {
      payload = await response.json() as YouTubeSearchResponse;
    } catch {
      return { status: "failed", phase: "youtube_api", reason: "invalid_response", queriesCompleted, resultsFound, linksProcessed, queriesPlanned: DAILY_YOUTUBE_QUERIES.length };
    }

    const candidates: VideoLinkInput[] = (payload.items || []).flatMap((item) => {
      const videoId = item.id?.videoId;
      if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return [];
      return [{
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        platform: "youtube",
        title: item.snippet?.title || null,
        creatorName: item.snippet?.channelTitle || null,
        sourceQuery: query,
      }];
    });

    queriesCompleted++;
    resultsFound += candidates.length;
    if (candidates.length) {
      try {
        linksProcessed += await addVideoLinks(env, candidates, "search_api");
      } catch {
        return { status: "failed", phase: "tidb_write", reason: "database_write_failed", queriesCompleted, resultsFound, linksProcessed, queriesPlanned: DAILY_YOUTUBE_QUERIES.length };
      }
    }
  }

  return { status: "ok", queriesCompleted, queriesPlanned: DAILY_YOUTUBE_QUERIES.length, resultsFound, linksProcessed };
}

function xmlTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim() || null;
}

function xmlItems(xml: string): Array<{ title: string | null; link: string | null; creator: string | null; date: string | null }> {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(match => {
    const block = match[1];
    return { title: xmlTag(block, "title"), link: xmlTag(block, "link"), creator: xmlTag(block, "dc:creator") || xmlTag(block, "author") || xmlTag(block, "source"), date: xmlTag(block, "pubDate") };
  });
}

async function runPublicEventFeedDiscovery(env: YouTubeDiscoveryEnv): Promise<DiscoveryResult> {
  if (!env.DB && !env.TIDB_DATABASE_URL) return { status: "skipped", reason: "missing_storage", queriesPlanned: PUBLIC_EVENT_FEEDS.length };
  try { await checkVideoLinkStore(env); } catch { return { status: "skipped", reason: "storage_unavailable_or_schema_missing", queriesPlanned: PUBLIC_EVENT_FEEDS.length }; }
  let feedsCompleted = 0;
  let resultsFound = 0;
  let linksProcessed = 0;
  for (const feed of PUBLIC_EVENT_FEEDS) {
    try {
      const response = await fetch(feed.url, { headers: { accept: "application/rss+xml, application/xml, text/xml" } });
      if (!response.ok) continue;
      const items = xmlItems(await response.text()).slice(0, 8);
      const candidates: VideoLinkInput[] = items.flatMap(item => {
        if (!item.link || !/^https:\/\//i.test(item.link)) return [];
        return [{ url: item.link, title: item.title, creatorName: item.creator, sourceQuery: feed.label }];
      });
      feedsCompleted++;
      resultsFound += candidates.length;
      if (candidates.length) linksProcessed += await addVideoLinks(env, candidates, "search_api");
    } catch {
      // One public feed being unavailable should not stop the remaining feeds.
    }
  }
  return { status: feedsCompleted ? "ok" : "failed", phase: "public_feeds", reason: feedsCompleted ? undefined : "all_feeds_unavailable", queriesCompleted: feedsCompleted, queriesPlanned: PUBLIC_EVENT_FEEDS.length, resultsFound, linksProcessed };
}
