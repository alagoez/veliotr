/**
 * Rakip/kanal ekle → anında indekse çek. Velio'nun "add channel" akışı:
 * kullanıcı kendi sektöründeki bir kanalı/videoyu yapıştırır, tüm geçmişi
 * canlı çekilir ve indekse girer. Her nişin (uç nişler dahil) dolmasını
 * sağlayan "lazy ingestion" mekanizması budur.
 *
 * Embedding cron'a bırakılır (Velio: "Calculating outlier score. Check back
 * tomorrow.") — indeks büyür, semantik/nicheRelevant ertesi güncellemede kapsar.
 */
import { resolveChannelId, parseVideoId, fetchChannelIdOfVideo } from "@/lib/youtube";
import { ingestChannel } from "@/lib/ingest-channel";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { fmtCompact } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.YOUTUBE_API_KEY) {
    return Response.json(
      { error: "unavailable", message: "Kanal ekleme demo modda kapalı." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUser())) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }
  try {
    checkRateLimit(`track:${requestIdentifier(request)}`, 15);
  } catch (e) {
    if (e instanceof RateLimitError) return Response.json({ error: e.message }, { status: 429 });
  }

  let input = "";
  try {
    const body = (await request.json()) as { url?: string };
    input = String(body.url ?? "").slice(0, 300);
  } catch {
    return Response.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if (!input.trim()) return Response.json({ error: "Kanal veya video linki gerekli" }, { status: 400 });

  try {
    // Video linki de olabilir → önce videonun kanalını bul
    let channelId = await resolveChannelId(input);
    if (!channelId) {
      const vid = parseVideoId(input);
      if (vid) channelId = await fetchChannelIdOfVideo(vid);
    }
    if (!channelId) {
      return Response.json(
        { error: "not_found", message: "Kanal bulunamadı. Kanal linki, @kullanıcı adı veya video linki dene." },
        { status: 404 },
      );
    }

    // Rakip kanal: embedding'i cron'a bırak (hız için)
    const result = await ingestChannel(channelId, { embed: false, maxPages: 2 });
    if (!result) {
      return Response.json({ error: "not_found", message: "Kanal verisi alınamadı." }, { status: 404 });
    }

    return Response.json({
      channel: {
        id: result.channel.id,
        title: result.channel.title,
        handle: result.channel.handle,
        subscribers: result.channel.subscribers,
        medianViews: result.medianViews,
      },
      videoCount: result.videos.length,
      message: `${result.channel.title} indekse eklendi (${fmtCompact(result.channel.subscribers)} abone, ${result.videos.length} video). Outlier skorları bir sonraki güncellemede tamamlanır.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return Response.json({ error: "ingest_failed", message: msg }, { status: 500 });
  }
}
