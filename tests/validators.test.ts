import { describe, expect, it } from "vitest";
import { ChatRequestSchema, SearchRequestSchema } from "@/lib/validators";

describe("API validators", () => {
  it("arama sayfası ve boyut sınırlarını normalize eder", () => {
    const parsed = SearchRequestSchema.parse({ filters: { q: "  kamp  " }, page: 2, pageSize: 48 });
    expect(parsed.filters.q).toBe("kamp");
    expect(parsed.pageSize).toBe(48);
  });

  it("ters aralıkları reddeder", () => {
    expect(() => SearchRequestSchema.parse({ filters: { views: { min: 10, max: 1 } } })).toThrow();
  });

  it("chat mesajını ve içerik boyutunu sınırlar", () => {
    expect(ChatRequestSchema.safeParse({ messages: [{ role: "user", content: "Merhaba" }] }).success).toBe(true);
    expect(ChatRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(4001) }] }).success).toBe(false);
  });
});
