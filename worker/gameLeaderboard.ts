export interface GameLeaderboardDb {
  prepare(sql: string): {
    bind(...values: unknown[]): { all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<unknown> };
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
}

export interface GameLeaderboardEnv {
  DB: GameLeaderboardDb;
}

export interface GameScoreInput {
  nickname: string;
  score: number;
  level: number;
  streak: number;
  bestStreak: number;
}

export interface GameLeaderboardEntry extends GameScoreInput {
  id: string;
  createdAt: string;
}

const MAX_ENTRIES = 10;
const MAX_NICKNAME_LENGTH = 24;
const MAX_LEVEL = 1000;
const TABLE_SQL = `CREATE TABLE IF NOT EXISTS game_leaderboard (
  id TEXT PRIMARY KEY NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  best_streak INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`;

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function validateScoreInput(body: unknown): GameScoreInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "A score payload is required." };
  const value = body as Partial<GameScoreInput>;
  const nickname = typeof value.nickname === "string" ? value.nickname.trim().replace(/\s+/g, " ") : "";
  if (nickname.length < 2 || nickname.length > MAX_NICKNAME_LENGTH) return { error: `Nickname must be 2–${MAX_NICKNAME_LENGTH} characters.` };
  if (!isWholeNumber(value.score) || value.score < 0 || value.score > MAX_LEVEL) return { error: "Score must be a whole number from 0 to 1000." };
  if (!isWholeNumber(value.level) || value.level < 1 || value.level > MAX_LEVEL) return { error: "Level must be a whole number from 1 to 1000." };
  if (!isWholeNumber(value.streak) || value.streak < 0 || value.streak > MAX_LEVEL) return { error: "Streak is outside the allowed range." };
  if (!isWholeNumber(value.bestStreak) || value.bestStreak < 0 || value.bestStreak > MAX_LEVEL) return { error: "Best streak is outside the allowed range." };
  return { nickname, score: value.score, level: value.level, streak: value.streak, bestStreak: value.bestStreak };
}

async function ensureLeaderboardTable(db: GameLeaderboardDb): Promise<void> {
  await db.prepare(TABLE_SQL).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS game_leaderboard_rank_idx ON game_leaderboard(score DESC, level DESC, best_streak DESC, created_at ASC)").run();
}

function mapEntry(row: Record<string, unknown>): GameLeaderboardEntry {
  return {
    id: String(row.id),
    nickname: String(row.nickname),
    score: Number(row.score),
    level: Number(row.level),
    streak: Number(row.streak),
    bestStreak: Number(row.best_streak),
    createdAt: new Date(Number(row.created_at)).toISOString(),
  };
}

export async function listLeaderboard(env: GameLeaderboardEnv): Promise<GameLeaderboardEntry[]> {
  await ensureLeaderboardTable(env.DB);
  const result = await env.DB.prepare("SELECT id, nickname, score, level, streak, best_streak, created_at FROM game_leaderboard ORDER BY score DESC, level DESC, best_streak DESC, created_at ASC LIMIT ?").bind(MAX_ENTRIES).all<Record<string, unknown>>();
  return result.results.map(mapEntry);
}

export async function submitLeaderboardScore(env: GameLeaderboardEnv, body: unknown): Promise<{ entry: GameLeaderboardEntry; entries: GameLeaderboardEntry[] } | { error: string }> {
  const parsed = validateScoreInput(body);
  if ("error" in parsed) return parsed;
  await ensureLeaderboardTable(env.DB);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await env.DB.prepare("INSERT INTO game_leaderboard (id, nickname, score, level, streak, best_streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, parsed.nickname, parsed.score, parsed.level, parsed.streak, parsed.bestStreak, createdAt).run();
  const entries = await listLeaderboard(env);
  return { entry: { id, ...parsed, createdAt: new Date(createdAt).toISOString() }, entries };
}
