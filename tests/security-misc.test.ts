import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/redirect";
import { requestIdentifier } from "@/lib/rate-limit";

describe("safeNextPath — açık yönlendirme", () => {
  it("ters eğik çizgi bypass'ını engeller", () => {
    // "/\evil.com" URL ayrıştırıcısında https://evil.com/ olur
    expect(safeNextPath("/\\evil.com")).toBe("/getting-started");
    expect(safeNextPath("/\\/evil.com")).toBe("/getting-started");
  });

  it("çift eğik çizgiyi engeller", () => {
    expect(safeNextPath("//evil.com")).toBe("/getting-started");
  });

  it("mutlak URL'i engeller", () => {
    expect(safeNextPath("https://evil.com")).toBe("/getting-started");
    expect(safeNextPath("javascript:alert(1)")).toBe("/getting-started");
  });

  it("site içi yolları korur", () => {
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("/saved-videos?f=1")).toBe("/saved-videos?f=1");
  });

  it("boş değerde varsayılana döner", () => {
    expect(safeNextPath(null)).toBe("/getting-started");
  });
});

describe("requestIdentifier — hız sınırı kimliği", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://viralab.dev/api/search", { headers });

  it("XFF zincirinde SAĞDAKİ hop'u kullanır (sol taraf uydurulabilir)", () => {
    // Saldırgan "1.2.3.4" gönderir, proxy gerçek IP'yi sona ekler
    expect(requestIdentifier(req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("platformun güvenilir başlığını önceler", () => {
    expect(
      requestIdentifier(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("9.9.9.9");
  });

  it("başlık yoksa anonymous döner", () => {
    expect(requestIdentifier(req({}))).toBe("anonymous");
  });
});
