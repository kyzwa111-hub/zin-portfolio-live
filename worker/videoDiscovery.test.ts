import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkVideoLinkStore: vi.fn(),
  addVideoLinks: vi.fn(),
}));

vi.mock("./videoLinks", () => mocks);

import { runDailyYouTubeDiscovery, DAILY_YOUTUBE_QUERIES } from "./videoDiscovery";
import { addVideoLinks, checkVideoLinkStore } from "./videoLinks";

const checkStoreMock = vi.mocked(checkVideoLinkStore);
const addLinksMock = vi.mocked(addVideoLinks);
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  checkStoreMock.mockResolvedValue(undefined);
  addLinksMock.mockImplementation(async (_env, candidates) => candidates.length);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runDailyYouTubeDiscovery", () => {
  it("skips without both secrets and makes no external calls", async () => {
    const result = await runDailyYouTubeDiscovery({});
    expect(result).toMatchObject({ status: "skipped", reason: "missing_storage" });
    expect(checkStoreMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preflights TiDB before using the YouTube API", async () => {
    checkStoreMock.mockRejectedValueOnce(new Error("database unavailable"));
    const result = await runDailyYouTubeDiscovery({ TIDB_DATABASE_URL: "mysql://test", YOUTUBE_DATA_API_KEY: "test-key" });
    expect(result).toMatchObject({ status: "skipped", reason: "tidb_unavailable_or_schema_missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs the bounded Myanmar HR queries and stores metadata-only links", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({
      items: [{ id: { videoId: "video01" }, snippet: { title: "HR conference", channelTitle: "Myanmar HR" } }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const env = { TIDB_DATABASE_URL: "mysql://test", YOUTUBE_DATA_API_KEY: "test-key" };
    const result = await runDailyYouTubeDiscovery(env);

    expect(result).toMatchObject({ status: "ok", queriesCompleted: 5, queriesPlanned: 5, resultsFound: 5, linksProcessed: 5 });
    expect(DAILY_YOUTUBE_QUERIES).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(addLinksMock).toHaveBeenCalledTimes(5);
    const firstCallUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(firstCallUrl.origin + firstCallUrl.pathname).toBe("https://www.googleapis.com/youtube/v3/search");
    expect(firstCallUrl.searchParams.get("key")).toBeNull();
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({ "X-Goog-Api-Key": "test-key" });
    expect(firstCallUrl.searchParams.get("type")).toBe("video");
    expect(firstCallUrl.searchParams.get("regionCode")).toBe("MM");
    expect(firstCallUrl.searchParams.get("relevanceLanguage")).toBe("my");
    expect(firstCallUrl.searchParams.get("maxResults")).toBe("10");
    expect(addLinksMock.mock.calls[0][1]).toEqual([{
      url: "https://www.youtube.com/watch?v=video01",
      platform: "youtube",
      title: "HR conference",
      creatorName: "Myanmar HR",
      sourceQuery: DAILY_YOUTUBE_QUERIES[0],
    }]);
  });

  it("stops safely on an API error without logging or returning the key", async () => {
    fetchMock.mockResolvedValueOnce(new Response("private api error", { status: 403 }));
    const result = await runDailyYouTubeDiscovery({ TIDB_DATABASE_URL: "mysql://test", YOUTUBE_DATA_API_KEY: "hidden-key" });
    expect(result).toMatchObject({ status: "failed", phase: "youtube_api", httpStatus: 403, queriesCompleted: 0 });
    expect(JSON.stringify(result)).not.toContain("hidden-key");
    expect(addLinksMock).not.toHaveBeenCalled();
  });

  it("reports network failure without exposing request details", async () => {
    fetchMock.mockRejectedValueOnce(new Error("request URL included hidden-key"));
    const result = await runDailyYouTubeDiscovery({ TIDB_DATABASE_URL: "mysql://test", YOUTUBE_DATA_API_KEY: "hidden-key" });
    expect(result).toMatchObject({ status: "failed", phase: "youtube_api", reason: "network_error" });
    expect(JSON.stringify(result)).not.toContain("hidden-key");
  });
});
