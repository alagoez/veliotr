import { describe, expect, it } from "vitest";
import { searchDemo } from "@/lib/search";

describe("searchDemo", () => {
  it("outlier sonuçlarını skor azalan sıralar", () => {
    const result = searchDemo({ filters: {}, sort: "outlier", page: 0, pageSize: 10 });
    expect(result.videos.length).toBe(10);
    expect(result.total).toBeGreaterThan(result.videos.length);
    for (let i = 1; i < result.videos.length; i += 1) {
      expect(result.videos[i - 1].outlierScore).toBeGreaterThanOrEqual(result.videos[i].outlierScore);
    }
  });

  it("niş ve shorts filtrelerini birlikte uygular", () => {
    const result = searchDemo({ filters: { niche: "finans", isShort: false }, sort: "outlier", page: 0, pageSize: 48 });
    expect(result.videos.length).toBeGreaterThan(0);
    expect(result.videos.every((video) => video.nicheSlug === "finans" && !video.isShort)).toBe(true);
  });

  it("sayfalama bilgisini doğru üretir", () => {
    const first = searchDemo({ filters: {}, sort: "outlier", page: 0, pageSize: 6 });
    const second = searchDemo({ filters: {}, sort: "outlier", page: 1, pageSize: 6 });
    expect(second.videos[0].id).not.toBe(first.videos[0].id);
    expect(first.hasMore).toBe(true);
  });
});
