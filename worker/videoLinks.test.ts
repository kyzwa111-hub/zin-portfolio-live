import { describe, expect, it } from "vitest";
import { normalizeVideoLink, VideoLinkValidationError } from "./videoLinks";

describe("normalizeVideoLink", () => {
  it("normalizes a public YouTube URL and infers its platform", () => {
    const link = normalizeVideoLink({ url: "https://youtu.be/abc123?t=30#details", title: "  HR   training  " });
    expect(link.video_url).toBe("https://youtu.be/abc123?t=30");
    expect(link.platform).toBe("youtube");
    expect(link.title).toBe("HR training");
  });

  it("infers supported social platforms from subdomains", () => {
    expect(normalizeVideoLink({ url: "https://vm.tiktok.com/ZM123/" }).platform).toBe("tiktok");
    expect(normalizeVideoLink({ url: "https://www.instagram.com/reel/abc/" }).platform).toBe("instagram");
    expect(normalizeVideoLink({ url: "https://fb.watch/abc/" }).platform).toBe("facebook");
    expect(normalizeVideoLink({ url: "https://x.com/user/status/123" }).platform).toBe("x");
  });

  it("uses the selected platform for an unrecognized https domain", () => {
    expect(normalizeVideoLink({ url: "https://videos.example.org/watch/1", platform: "other" }).platform).toBe("other");
  });

  it("rejects insecure or credential-bearing links", () => {
    expect(() => normalizeVideoLink({ url: "http://youtube.com/watch?v=abc" })).toThrow(VideoLinkValidationError);
    expect(() => normalizeVideoLink({ url: "https://user:pass@youtube.com/watch?v=abc" })).toThrow(VideoLinkValidationError);
  });

  it("rejects invalid URLs and unsupported platform labels", () => {
    expect(() => normalizeVideoLink({ url: "not a url" })).toThrow(VideoLinkValidationError);
    expect(() => normalizeVideoLink({ url: "https://video.example.org/v/1", platform: "unknown" })).toThrow(VideoLinkValidationError);
  });

  it("bounds untrusted title metadata", () => {
    expect(normalizeVideoLink({ url: "https://youtube.com/watch?v=abc", title: "x".repeat(600) }).title).toHaveLength(500);
  });
});
