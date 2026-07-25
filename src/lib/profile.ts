/**
 * Kanal concept profili — Velio'nun personalizasyon çapası.
 * Kullanıcının kendi videolarının embedding'lerini ortalayıp normalize eder →
 * o kanalın "anlamsal merkezi". nicheRelevant filtresi bu vektöre yakın
 * videoları global indeksten süzer.
 */
import { createAdminSupabase } from "@/lib/supabase/admin";
import { NICHES } from "@/lib/demo/data";

/** Vektör ortalaması + L2 normalizasyon (kosinüs araması için). */
export function buildProfileVector(embeddings: number[][]): number[] | null {
  const valid = embeddings.filter((e) => e && e.length > 0);
  if (valid.length === 0) return null;
  const dim = valid[0].length;
  const sum = new Array(dim).fill(0);
  for (const e of valid) {
    for (let i = 0; i < dim; i++) sum[i] += e[i];
  }
  for (let i = 0; i < dim; i++) sum[i] /= valid.length;
  const norm = Math.sqrt(sum.reduce((a, x) => a + x * x, 0)) || 1;
  return sum.map((x) => x / norm);
}

export type DetectedNiche = { slug: string; name: string; confidence: number };

/**
 * Profil vektörüne en yakın videoların nişlerini sayıp baskın nişi bulur.
 * (match_videos RPC — 0004 migration; global indeks üzerinde kosinüs araması)
 */
export async function detectNiche(profileVector: number[]): Promise<DetectedNiche | null> {
  const db = createAdminSupabase();
  const { data: matches, error } = await db.rpc("match_videos", {
    query_embedding: JSON.stringify(profileVector),
    match_count: 60,
  });
  if (error || !matches?.length) return null;

  const ids = (matches as { id: string }[]).map((m) => m.id);
  const { data: rows } = await db
    .from("videos")
    .select("id, channels(niche_slug)")
    .in("id", ids);

  const tally = new Map<string, number>();
  for (const r of (rows ?? []) as unknown as { channels: { niche_slug: string | null } }[]) {
    const n = r.channels?.niche_slug;
    if (n) tally.set(n, (tally.get(n) ?? 0) + 1);
  }
  if (tally.size === 0) return null;

  let best = "";
  let bestCount = 0;
  let total = 0;
  for (const [slug, count] of tally) {
    total += count;
    if (count > bestCount) {
      best = slug;
      bestCount = count;
    }
  }
  const name = NICHES.find((n) => n.slug === best)?.name ?? best;
  return { slug: best, name, confidence: Math.round((bestCount / total) * 100) / 100 };
}
