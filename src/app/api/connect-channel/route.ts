/**
 * Onboarding: kullanıcı kanalını yapıştırır → canlı çekilir → concept profili
 * kurulur → nişi tespit edilir → örnek outlier'lar döner.
 * (Velio'nun "connect your channel" akışının OAuth'suz karşılığı — niş tespiti
 *  kanalın kendi videolarının anlamsal merkezinden çıkar.)
 */
import { resolveChannelId } from "@/lib/youtube";
import { ingestChannel } from "@/lib/ingest-channel";
import { buildProfileVector, detectNiche } from "@/lib/profile";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import { isGeminiConfigured, isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { fmtCompact, fmtMultiplier } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.YOUTUBE_API_KEY) {
    return Response.json(
      { error: "unavailable", message: "Kanal bağlama demo modda kapalı (Supabase + YouTube API gerekir)." },
      { status: 503 },
    );
  }
  // Quota-pahalı işlem: yalnızca giriş yapmış kullanıcı
  if (!(await getCurrentUser())) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }
  try {
    checkRateLimit(`connect:${requestIdentifier(request)}`, 8);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return Response.json({ error: e.message }, { status: 429 });
    }
  }

  let channelUrl = "";
  try {
    const body = (await request.json()) as { channelUrl?: string };
    channelUrl = String(body.channelUrl ?? "").slice(0, 300);
  } catch {
    return Response.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if (!channelUrl.trim()) {
    return Response.json({ error: "Kanal linki gerekli" }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      return Response.json(
        { error: "not_found", message: "Kanal bulunamadı. Linki veya @kullanıcı adını kontrol et." },
        { status: 404 },
      );
    }

    // Kendi kanalın: embedding'lerle çek (profil için gerekli)
    const result = await ingestChannel(channelId, { embed: isGeminiConfigured(), maxPages: 2 });
    if (!result) {
      return Response.json({ error: "not_found", message: "Kanal verisi alınamadı." }, { status: 404 });
    }

    // Concept profili + niş tespiti
    const vectors = result.videos.map((v) => v.embedding).filter((e): e is number[] => Array.isArray(e));
    const profileVector = buildProfileVector(vectors);
    const niche = profileVector ? await detectNiche(profileVector) : null;

    // Örnek outlier'lar (kanalın kendi patlayanları)
    const topOutliers = [...result.videos]
      .sort((a, b) => b.outlierScore - a.outlierScore)
      .slice(0, 3)
      .map((v) => ({ title: v.title, views: fmtCompact(v.views), multiplier: fmtMultiplier(v.outlierScore) }));

    return Response.json({
      channelId: result.channel.id,
      channelTitle: result.channel.title,
      subscribers: result.channel.subscribers,
      videoCount: result.videos.length,
      niche, // { slug, name, confidence } | null
      profileVector, // istemci store'a yazar; nicheRelevant aramada kullanılır
      topOutliers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return Response.json({ error: "ingest_failed", message: msg }, { status: 500 });
  }
}
