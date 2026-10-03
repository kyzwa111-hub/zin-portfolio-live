import { connect } from "@tidbcloud/serverless";

export type VideoPlatform = "youtube" | "facebook" | "instagram" | "tiktok" | "linkedin" | "x" | "other";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type SourceKind = "manual" | "search_api";

export interface TiDBEnv {
  TIDB_DATABASE_URL?: string;
  DB?: D1VideoDatabase;
}

interface D1VideoStatement {
  bind(...values: unknown[]): D1VideoStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1VideoDatabase {
  prepare(sql: string): D1VideoStatement;
}

export interface VideoLinkRow {
  id: string;
  video_url: string;
  platform: VideoPlatform;
  title: string | null;
  creator_name: string | null;
  license_name: string | null;
  rights_status: string;
  review_status: ReviewStatus;
  source_kind: SourceKind;
  source_query: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export class TiDBNotConfiguredError extends Error {
  constructor() {
    super("TiDB is not configured.");
    this.name = "TiDBNotConfiguredError";
  }
}

export class VideoLinkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoLinkValidationError";
  }
}

export interface VideoLinkInput {
  url: string;
  platform?: string;
  title?: string | null;
  creatorName?: string | null;
  licenseName?: string | null;
  sourceQuery?: string | null;
}

const relevantVideoTerms = /(\bhr\b|human resources?|people operations?|recruit(ment|ing)?|employee|employer|payroll|salary|compensation|benefit|workplace|work culture|leadership|management|onboarding|performance review|talent|career|hiring|interview|သင်တန်း|ဝန်ထမ်း|အလုပ်အကိုင်|လုပ်ငန်းခွင်|လစာ|လူ့စွမ်းအား|အလုပ်သမား|စီမံခန့်ခွဲမှု|webinar|training)/i;
const irrelevantVideoTerms = /(earthquake|special rapporteur|politics|election|war|football|sport|music video|celebrity|movie|recipe|weather forecast|news headlines|သတင်း|ငလျင်|နိုင်ငံရေး|အားကစား|သီချင်း)/i;

export function isLikelyRelevantVideo(video: Pick<VideoLinkRow, "title" | "creator_name" | "source_query">): boolean {
  const text = `${video.title || ""} ${video.creator_name || ""} ${video.source_query || ""}`;
  return relevantVideoTerms.test(text) && !irrelevantVideoTerms.test(text);
}

function connection(env: TiDBEnv) {
  if (!env.TIDB_DATABASE_URL) throw new TiDBNotConfiguredError();
  return connect({ url: env.TIDB_DATABASE_URL });
}

function d1Connection(env: TiDBEnv): D1VideoDatabase | null {
  return env.DB || null;
}

async function ensureD1VideoTable(db: D1VideoDatabase): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS event_video_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_hash TEXT NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'other',
    title TEXT,
    creator_name TEXT,
    license_name TEXT,
    rights_status TEXT NOT NULL DEFAULT 'public',
    review_status TEXT NOT NULL DEFAULT 'pending',
    source_kind TEXT NOT NULL DEFAULT 'search_api',
    source_query TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS event_video_links_public_idx ON event_video_links(source_kind, review_status, last_seen_at)").run();
}

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

function platformForHost(hostname: string): VideoPlatform {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("youtube.com") || host === "youtu.be") return "youtube";
  if (is("facebook.com") || host === "fb.watch") return "facebook";
  if (is("instagram.com")) return "instagram";
  if (is("tiktok.com")) return "tiktok";
  if (is("linkedin.com")) return "linkedin";
  if (is("x.com") || is("twitter.com")) return "x";
  return "other";
}

const allowedPlatforms: VideoPlatform[] = ["youtube", "facebook", "instagram", "tiktok", "linkedin", "x", "other"];

export function normalizeVideoLink(input: VideoLinkInput): Omit<VideoLinkRow, "id" | "rights_status" | "review_status" | "source_kind" | "first_seen_at" | "last_seen_at" | "created_at"> {
  if (!input || typeof input.url !== "string" || input.url.length > 2048) {
    throw new VideoLinkValidationError("Enter a video link no longer than 2,048 characters.");
  }
  let parsed: URL;
  try {
    parsed = new URL(input.url.trim());
  } catch {
    throw new VideoLinkValidationError("Enter a valid https video link.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new VideoLinkValidationError("Only https links without embedded login details are accepted.");
  }
  parsed.hash = "";
  const inferred = platformForHost(parsed.hostname);
  const supplied = String(input.platform || "").toLowerCase() as VideoPlatform;
  if (supplied && !allowedPlatforms.includes(supplied)) {
    throw new VideoLinkValidationError("Choose a supported platform.");
  }
  const platform = inferred !== "other" ? inferred : (supplied || "other");
  return {
    video_url: parsed.toString(),
    platform,
    title: cleanText(input.title, 500),
    creator_name: cleanText(input.creatorName, 255),
    license_name: cleanText(input.licenseName, 80),
    source_query: cleanText(input.sourceQuery, 255),
  };
}

async function hashUrl(url: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const selectColumns = "CAST(id AS CHAR) AS id, video_url, platform, title, creator_name, license_name, rights_status, review_status, source_kind, source_query, first_seen_at, last_seen_at, created_at";

export async function addVideoLink(env: TiDBEnv, input: VideoLinkInput, sourceKind: SourceKind = "manual"): Promise<VideoLinkRow> {
  const normalized = normalizeVideoLink(input);
  const urlHash = await hashUrl(normalized.video_url);
  const d1 = d1Connection(env);
  if (d1) {
    await ensureD1VideoTable(d1);
    const now = new Date().toISOString();
    await d1.prepare(
      `INSERT INTO event_video_links (url_hash, video_url, platform, title, creator_name, license_name, source_query, source_kind, first_seen_at, last_seen_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(url_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`,
    ).bind(urlHash, normalized.video_url, normalized.platform, normalized.title, normalized.creator_name, normalized.license_name, normalized.source_query, sourceKind, now, now, now, now).run();
    const row = await d1.prepare("SELECT * FROM event_video_links WHERE url_hash = ? LIMIT 1").bind(urlHash).first<VideoLinkRow>();
    if (!row) throw new Error("Video link was saved but could not be read back.");
    return row;
  }
  const db = connection(env);
  await db.execute(
    `INSERT INTO event_video_links (url_hash, video_url, platform, title, creator_name, license_name, source_query, source_kind)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
    [urlHash, normalized.video_url, normalized.platform, normalized.title, normalized.creator_name, normalized.license_name, normalized.source_query, sourceKind],
  );
  const rows = await db.execute(`SELECT ${selectColumns} FROM event_video_links WHERE url_hash = ? LIMIT 1`, [urlHash]) as Array<Record<string, unknown>>;
  if (!rows[0]) throw new Error("Video link was saved but could not be read back.");
  return rows[0] as unknown as VideoLinkRow;
}

export async function listVideoLinks(env: TiDBEnv, reviewStatus?: ReviewStatus): Promise<VideoLinkRow[]> {
  const d1 = d1Connection(env);
  if (d1) {
    await ensureD1VideoTable(d1);
    const query = reviewStatus
      ? d1.prepare("SELECT * FROM event_video_links WHERE review_status = ? ORDER BY created_at DESC LIMIT 200").bind(reviewStatus)
      : d1.prepare("SELECT * FROM event_video_links ORDER BY created_at DESC LIMIT 200");
    const result = await query.all<VideoLinkRow>();
    return result.results;
  }
  const db = connection(env);
  const sql = reviewStatus
    ? `SELECT ${selectColumns} FROM event_video_links WHERE review_status = ? ORDER BY created_at DESC LIMIT 200`
    : `SELECT ${selectColumns} FROM event_video_links ORDER BY created_at DESC LIMIT 200`;
  const rows = await db.execute(sql, reviewStatus ? [reviewStatus] : []) as Array<Record<string, unknown>>;
  return rows as unknown as VideoLinkRow[];
}

export async function listPublicDiscoveredVideoLinks(env: TiDBEnv): Promise<VideoLinkRow[]> {
  const d1 = d1Connection(env);
  if (d1) {
    await ensureD1VideoTable(d1);
    const result = await d1.prepare(
      `SELECT * FROM event_video_links WHERE source_kind = 'search_api' AND review_status <> 'rejected'
       ORDER BY last_seen_at DESC, created_at DESC LIMIT 60`,
    ).all<VideoLinkRow>();
    return result.results.filter(isLikelyRelevantVideo);
  }
  const db = connection(env);
  const rows = await db.execute(
    `SELECT ${selectColumns} FROM event_video_links
     WHERE source_kind = 'search_api' AND review_status <> 'rejected'
     ORDER BY last_seen_at DESC, created_at DESC LIMIT 60`,
  ) as Array<Record<string, unknown>>;
  return (rows as unknown as VideoLinkRow[]).filter(isLikelyRelevantVideo);
}

export async function updateVideoReviewStatus(env: TiDBEnv, id: string, status: ReviewStatus): Promise<boolean> {
  const d1 = d1Connection(env);
  if (d1) {
    await ensureD1VideoTable(d1);
    const result = await d1.prepare("UPDATE event_video_links SET review_status = ?, updated_at = ? WHERE id = ?").bind(status, new Date().toISOString(), id).run() as { meta?: { changes?: number } };
    return Number(result.meta?.changes || 0) > 0;
  }
  const db = connection(env);
  const result = await db.execute(
    "UPDATE event_video_links SET review_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id],
    { fullResult: true },
  ) as { rowsAffected?: number | null };
  return Number(result.rowsAffected || 0) > 0;
}


export async function checkVideoLinkStore(env: TiDBEnv): Promise<void> {
  const d1 = d1Connection(env);
  if (d1) {
    await ensureD1VideoTable(d1);
    await d1.prepare("SELECT 1 AS ready FROM event_video_links LIMIT 1").first();
    return;
  }
  const db = connection(env);
  await db.execute("SELECT 1 AS ready FROM event_video_links LIMIT 1");
}

export async function addVideoLinks(env: TiDBEnv, inputs: VideoLinkInput[], sourceKind: SourceKind = "search_api"): Promise<number> {
  if (d1Connection(env)) {
    for (const input of inputs) await addVideoLink(env, input, sourceKind);
    return inputs.length;
  }
  const db = connection(env);
  let processed = 0;
  for (const input of inputs) {
    const normalized = normalizeVideoLink(input);
    const urlHash = await hashUrl(normalized.video_url);
    await db.execute(
      `INSERT INTO event_video_links (url_hash, video_url, platform, title, creator_name, license_name, source_query, source_kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [urlHash, normalized.video_url, normalized.platform, normalized.title, normalized.creator_name, normalized.license_name, normalized.source_query, sourceKind],
    );
    processed++;
  }
  return processed;
}
