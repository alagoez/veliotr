import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/blog";

/** pSEO içeriği LLM tarafından üretilip incelenmeden commit'lendiği için
 *  markdown renderer'ı güvenilmez girdi kabul eder. Bu testler gerileme koruması. */
describe("renderMarkdown XSS koruması", () => {
  const cases: [string, string][] = [
    ["javascript: şeması", "[tikla](javascript:alert(1))"],
    ["data: şeması", "[tikla](data:text/html,<script>alert(1)</script>)"],
    ["tırnakla attribute kaçışı", '[x](" onmouseover="alert(1))'],
    ["açı parantezle kaçış", '[x](a"><img src=x onerror=alert(1)>)'],
    ["vbscript şeması", "[x](vbscript:msgbox(1))"],
  ];

  for (const [name, payload] of cases) {
    it(`engeller: ${name}`, () => {
      const out = renderMarkdown(payload);
      expect(out).not.toMatch(/javascript:/i);
      expect(out).not.toMatch(/vbscript:/i);
      expect(out).not.toMatch(/data:text\/html/i);
      expect(out).not.toMatch(/\son\w+=/i); // onmouseover=, onerror= gibi
      expect(out).not.toMatch(/<script/i);
    });
  }

  it("güvenli linklere izin verir", () => {
    expect(renderMarkdown("[a](/signin)")).toContain('href="/signin"');
    expect(renderMarkdown("[a](https://viralab.dev)")).toContain('href="https://viralab.dev"');
  });

  it("ham HTML'i escape eder", () => {
    const out = renderMarkdown("<img src=x onerror=alert(1)>");
    expect(out).toContain("&lt;img");
    expect(out).not.toMatch(/<img/i);
  });
});
