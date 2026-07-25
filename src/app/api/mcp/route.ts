/**
 * Viralab MCP sunucusu — Model Context Protocol (Streamable HTTP, stateless).
 * Claude / diğer AI asistanları Viralab indeksini araç olarak kullanabilir.
 *
 * Bağlama (Claude Code):  claude mcp add --transport http viralab <URL>/api/mcp
 * Kimlik: MCP_API_KEY env'i doluysa "Authorization: Bearer <anahtar>" zorunlu.
 *
 * Araçlar: search_videos · get_video · list_collections
 * Bağımlılıksız minimal JSON-RPC uygulaması (SDK sürüm çakışmalarından kaçınmak için).
 */
import { getVideoById, search } from "@/lib/search";
import { COLLECTIONS } from "@/lib/collections";
import { fmtCompact, fmtMultiplier } from "@/lib/format";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import type { SearchFilters, SearchSort, Video } from "@/lib/types";

const PROTOCOL_VERSION = "2025-03-26";

type RpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

function rpcResult(id: RpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

/** limit:"abc" → Number() NaN üretip PostgREST'e range(NaN,NaN) gönderiyordu. */
function clampLimit(raw: unknown): number {
  const n = Number(raw ?? 10);
  if (!Number.isFinite(n)) return 10;
  return Math.min(24, Math.max(1, Math.floor(n)));
}

function videoLine(v: Video): string {
  return `- [${v.id}] "${v.title}" | ${v.channelTitle} (${fmtCompact(v.subscribers)} abone) | ${fmtCompact(v.views)} izlenme | çarpan ${fmtMultiplier(v.outlierScore)} | ${v.isShort ? "Shorts" : "uzun"} | ${v.nicheSlug}`;
}

const TOOLS = [
  {
    name: "search_videos",
    description:
      "Viralab YouTube outlier indeksinde video ara. Çarpan = izlenme ÷ kanal medyanı; yüksek çarpan = kanıtlanmış talep. Nişler: oyun, finans, yemek, vlog, teknoloji, egitim.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Anahtar kelime (başlık/kanal)" },
        niche: { type: "string", description: "Niş slug'ı (örn. finans)" },
        min_multiplier: { type: "number", description: "Minimum çarpan (örn. 3)" },
        is_short: { type: "boolean", description: "Sadece Shorts (true) / uzun video (false)" },
        date_preset: {
          type: "string",
          enum: ["today", "this-week", "last-week", "this-month", "last-month", "all"],
        },
        sort: { type: "string", enum: ["outlier", "upload-date", "relevance"] },
        limit: { type: "number", description: "Sonuç sayısı (varsayılan 10, en çok 24)" },
      },
    },
  },
  {
    name: "get_video",
    description: "Tek bir videonun tüm metriklerini getir (Viralab video ID'si ile).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Video ID" } },
      required: ["id"],
    },
  },
  {
    name: "list_collections",
    description: "Viralab'in küratörlü hazır listelerini (koleksiyonlarını) listele.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_videos": {
      const filters: SearchFilters = {
        q: typeof args.query === "string" ? args.query : undefined,
        niche: typeof args.niche === "string" ? args.niche : undefined,
        isShort: typeof args.is_short === "boolean" ? args.is_short : undefined,
        datePreset: (args.date_preset as SearchFilters["datePreset"]) ?? undefined,
        multiplier:
          typeof args.min_multiplier === "number" ? { min: args.min_multiplier } : undefined,
      };
      const res = await search(
        {
          filters,
          sort: (args.sort as SearchSort) ?? "outlier",
          page: 0,
          pageSize: clampLimit(args.limit),
        },
        { admin: true },
      );
      if (res.videos.length === 0) return "Sonuç bulunamadı — filtreleri gevşetmeyi dene.";
      return `${res.total} eşleşmeden ilk ${res.videos.length}:\n${res.videos.map(videoLine).join("\n")}`;
    }
    case "get_video": {
      const v = await getVideoById(String(args.id ?? ""), { admin: true });
      if (!v) return "Video bulunamadı.";
      return [
        `Başlık: ${v.title}`,
        `Kanal: ${v.channelTitle} (${fmtCompact(v.subscribers)} abone, medyan ${fmtCompact(v.medianViews)})`,
        `İzlenme: ${fmtCompact(v.views)} · Çarpan: ${fmtMultiplier(v.outlierScore)}`,
        `Beğeni: ${fmtCompact(v.likes)} · Yorum: ${fmtCompact(v.comments)} · Etkileşim: %${(v.engagement * 100).toFixed(1)}`,
        `Format: ${v.isShort ? "Shorts" : `uzun (${Math.round(v.durationSec / 60)} dk)`} · Niş: ${v.nicheSlug}`,
        `Yayın: ${v.publishedAt}`,
      ].join("\n");
    }
    case "list_collections":
      return COLLECTIONS.map(
        (c) => `- ${c.emoji} ${c.title} (${c.slug}): ${c.description}`,
      ).join("\n");
    default:
      throw new Error(`Bilinmeyen araç: ${name}`);
  }
}

/**
 * Kimlik doğrulama — fail-closed.
 * Bu uç nokta service-role ile okuma yapar; anahtarsız açık bırakılırsa
 * tüm video indeksi (ürünün asıl varlığı) anonim olarak kazınabilir.
 * Production'da MCP_API_KEY zorunludur; yoksa uç nokta kapalıdır.
 */
function checkAuth(request: Request): { ok: boolean; reason?: string } {
  const key = process.env.MCP_API_KEY;
  if (!key) {
    // NODE_ENV'e güvenme: staging/yanlış yapılandırılmış konteynerde
    // "production" olmayabilir ve uç nokta açılırdı. Anahtarsız erişim
    // yalnızca gerçekten yerel makinede mümkün.
    return isLocalRequest(request)
      ? { ok: true }
      : { ok: false, reason: "mcp_disabled" };
  }
  const header = request.headers.get("authorization") ?? "";
  return { ok: timingSafeEqual(header, `Bearer ${key}`) };
}

function isLocalRequest(request: Request): boolean {
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

/** Sabit süreli karşılaştırma — anahtar tahmininde zamanlama sızıntısını engeller. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const auth = checkAuth(request);
  if (!auth.ok) {
    return Response.json(
      {
        error: auth.reason ?? "unauthorized",
        message:
          auth.reason === "mcp_disabled"
            ? "MCP uç noktası yapılandırılmamış (MCP_API_KEY gerekli)."
            : "Geçersiz veya eksik Bearer anahtarı.",
      },
      { status: auth.reason === "mcp_disabled" ? 503 : 401 },
    );
  }

  // Hız sınırı: kimlik doğrulanmış olsa da toplu kazımayı yavaşlat
  try {
    checkRateLimit(`mcp:${requestIdentifier(request)}`, 30);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return Response.json(
        { error: e.message },
        { status: 429, headers: { "Retry-After": String(Math.ceil((e.resetAt - Date.now()) / 1000)) } },
      );
    }
    throw e;
  }

  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  switch (body.method) {
    case "initialize":
      return rpcResult(body.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "viralab", version: "1.0.0" },
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return new Response(null, { status: 202 });
    case "ping":
      return rpcResult(body.id, {});
    case "tools/list":
      return rpcResult(body.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(body.params?.name ?? "");
      const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const text = await callTool(name, args);
        return rpcResult(body.id, { content: [{ type: "text", text }] });
      } catch (e) {
        return rpcResult(body.id, {
          content: [{ type: "text", text: `Hata: ${e instanceof Error ? e.message : "bilinmeyen"}` }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(body.id, -32601, `Method not found: ${body.method}`);
  }
}

// Streamable HTTP: GET → SSE akışı desteklenmiyor (stateless sunucu), 405 döner.
export async function GET() {
  return new Response(null, { status: 405 });
}
