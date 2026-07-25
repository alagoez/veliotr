/**
 * Embedding tabanlı niş doğrulama & otomatik düzeltme.
 * Her kanalın kendi videolarının anlamsal merkezini çıkarır, indekste en yakın
 * nişi tespit eder; atanan nişten güvenle farklıysa DOĞRU nişe taşır.
 * Yanlış etiketlenmiş kanalları (ör. makyaj'a düşmüş yabancı vlog) temizler.
 *
 * Çalıştırma: npm run verify-niches          (rapor + uygula)
 *             npm run verify-niches -- dry    (sadece rapor)
 */
import { createAdminSupabase } from "../src/lib/supabase/admin";
import { buildProfileVector, detectNiche } from "../src/lib/profile";

const dry = process.argv[2] === "dry";
const db = createAdminSupabase();

const { data: channels } = await db
  .from("channels")
  .select("id, title, niche_slug")
  .not("niche_slug", "is", null);
console.log(`${channels?.length ?? 0} kanal doğrulanıyor...\n`);

type Move = { id: string; title: string; from: string; to: string; conf: number };
const moves: Move[] = [];
let checked = 0;
let confirmed = 0;

for (const ch of channels ?? []) {
  const { data: vids } = await db
    .from("videos")
    .select("embedding")
    .eq("channel_id", ch.id)
    .not("embedding", "is", null)
    .limit(50);
  const vectors = (vids ?? [])
    .map((v) => {
      try { return JSON.parse(v.embedding as unknown as string) as number[]; } catch { return null; }
    })
    .filter((e): e is number[] => Array.isArray(e));
  if (vectors.length < 5) continue; // zayıf profil — dokunma

  const profile = buildProfileVector(vectors);
  if (!profile) continue;
  const niche = await detectNiche(profile);
  checked++;
  if (!niche) continue;

  if (niche.slug === ch.niche_slug) {
    confirmed++;
  } else if (niche.confidence >= 0.55) {
    // Güvenle farklı niş → taşı
    moves.push({ id: ch.id, title: ch.title, from: ch.niche_slug as string, to: niche.slug, conf: niche.confidence });
  }
}

console.log(`Doğrulanan: ${checked} · Nişi teyit: ${confirmed} · Taşınacak: ${moves.length}\n`);
for (const m of moves.slice(0, 40)) {
  console.log(`  ${m.from} → ${m.to} (%${Math.round(m.conf * 100)})  ${m.title.slice(0, 45)}`);
}
if (moves.length > 40) console.log(`  ... +${moves.length - 40} daha`);

if (!dry && moves.length) {
  for (const m of moves) {
    await db.from("channels").update({ niche_slug: m.to }).eq("id", m.id);
  }
  console.log(`\n✓ ${moves.length} kanal doğru nişine taşındı.`);
} else if (dry) {
  console.log(`\n(dry — değişiklik yapılmadı)`);
}
