import { describe, expect, it } from "vitest";
import { listLeaderboard, submitLeaderboardScore, validateScoreInput } from "./gameLeaderboard";

class MockD1 {
  rows: Array<Record<string, unknown>> = [];
  prepare(sql: string) {
    const self = this;
    return {
      bind(...values: unknown[]) {
        return {
          async run() {
            if (sql.startsWith("INSERT INTO game_leaderboard")) {
              self.rows.push({ id: values[0], nickname: values[1], score: values[2], level: values[3], streak: values[4], best_streak: values[5], created_at: values[6] });
            }
            return { meta: { changes: 1 } };
          },
          async all<T>() {
            return { results: self.rows.slice().sort((a, b) => Number(b.score) - Number(a.score) || Number(b.level) - Number(a.level)).slice(0, Number(values[0])) as T[] };
          },
        };
      },
      async run() { return { meta: { changes: 1 } }; },
      async all<T>() { return { results: self.rows.slice(0, 10) as T[] }; },
    };
  }
}

describe("HR game leaderboard", () => {
  it("rejects unsafe or malformed score payloads", () => {
    expect(validateScoreInput({ nickname: "x", score: 1, level: 1, streak: 1, bestStreak: 1 })).toEqual({ error: "Nickname must be 2–24 characters." });
    expect(validateScoreInput({ nickname: "Zeke", score: 1001, level: 1, streak: 1, bestStreak: 1 })).toEqual({ error: "Score must be a whole number from 0 to 1000." });
    expect(validateScoreInput({ nickname: "Zeke", score: 1.5, level: 1, streak: 1, bestStreak: 1 })).toEqual({ error: "Score must be a whole number from 0 to 1000." });
  });

  it("normalizes a valid nickname and returns ranked entries", async () => {
    const env = { DB: new MockD1() };
    await submitLeaderboardScore(env, { nickname: "  People   Ops  ", score: 7, level: 8, streak: 3, bestStreak: 4 });
    await submitLeaderboardScore(env, { nickname: "Zeke", score: 9, level: 10, streak: 2, bestStreak: 5 });
    const entries = await listLeaderboard(env);
    expect(entries[0]).toMatchObject({ nickname: "Zeke", score: 9, level: 10 });
    expect(entries[1]).toMatchObject({ nickname: "People Ops", score: 7, level: 8 });
  });
});
