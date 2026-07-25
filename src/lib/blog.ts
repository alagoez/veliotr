import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** pSEO blog altyapısı — content/blog/*.md dosyalarını okur (SSG). */

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  keyword: string;
  body: string;
};

const DIR = join(process.cwd(), "content", "blog");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2].trim() };
}

export function getPosts(): Post[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map((f) => {
      const { meta, body } = parseFrontmatter(readFileSync(join(DIR, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: meta.title ?? f,
        description: meta.description ?? "",
        date: meta.date ?? "2026-01-01",
        keyword: meta.keyword ?? "",
        body,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

/** SSS bölümünü çıkar (JSON-LD FAQPage için): "### Soru?" + takip eden paragraf */
export function extractFaq(body: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const re = /^###\s+(.+\?)\s*\r?\n+([^#|-][^\r\n]*(?:\r?\n(?!#|\||-)[^\r\n]+)*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.push({ q: m[1].trim(), a: m[2].trim().replace(/\s+/g, " ") });
  }
  return out.slice(0, 8);
}

// ---- Mini markdown renderer (başlık, bold, link, liste, tablo, paragraf) ----

/**
 * Link hedefini güvenli hale getir. İçerik pSEO cron'uyla LLM'den gelip
 * incelenmeden commit'lendiği için güvenilmez kabul edilir:
 * - yalnızca http(s), mailto ve site içi (/) şemalarına izin ver
 * - javascript:/data: gibi şemaları ve tırnak/açı kaçışlarını engelle
 */
function safeHref(raw: string): string {
  const url = raw.trim();
  const allowed =
    /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^\/(?!\/)/.test(url) || /^#/.test(url);
  if (!allowed) return "#";
  return url.replace(/["'<>`\s]/g, encodeURIComponent);
}

function inline(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m, text: string, href: string) => `<a href="${safeHref(href)}">${text}</a>`,
    );
}

export function renderMarkdown(body: string): string {
  const lines = body.split(/\r?\n/);
  const html: string[] = [];
  let list: string[] = [];
  let table: string[][] = [];

  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushTable = () => {
    if (table.length >= 2) {
      const [head, ...rows] = table.filter((r) => !r.every((c) => /^[-: ]*$/.test(c)));
      html.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
    }
    table = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("|")) {
      flushList();
      table.push(t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    if (t.startsWith("### ")) { flushList(); html.push(`<h3>${inline(t.slice(4))}</h3>`); }
    else if (t.startsWith("## ")) { flushList(); html.push(`<h2>${inline(t.slice(3))}</h2>`); }
    else if (t.startsWith("- ")) { list.push(t.slice(2)); }
    else if (t === "") { flushList(); }
    else { flushList(); html.push(`<p>${inline(t)}</p>`); }
  }
  flushList();
  flushTable();
  return html.join("\n");
}
