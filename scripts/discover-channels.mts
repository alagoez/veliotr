/**
 * Kanal evreni keşfi — Velio stratejisinin TR uyarlaması:
 * "Şu an izlenen + aktif üreten creator kanalları" (TR ağırlıklı, global karışık).
 *
 * Yöntem: niş başına anahtar kelimelerle son 30 günün EN ÇOK İZLENEN videoları
 * aranır (search.list, order=viewCount) → o videoların kanalları evrene aday olur.
 * Böylece "aktif" ve "izlenen" tanım gereği sağlanır. Kurum/TV/klon kanallar
 * başlık filtresi + abone eşiğiyle elenir.
 *
 * Kota: search.list 100 birim/çağrı → bu script ~2.500-3.000 birim harcar
 * (günlük 10.000'in içinde, ingest'e yer kalır). Sık çalıştırma; haftada 1 yeter.
 *
 * Çalıştırma: npx tsx --env-file=.env.local scripts/discover-channels.mts
 * Çıktı: seeds/channels.json güncellenir (mevcut sağlıklı kanallar korunur)
 *        + DB'deki medyanı <500 olan gürültü kanalları silinir.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) throw new Error("YOUTUBE_API_KEY gerekli.");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Niş başına arama sorguları: TR (dil=tr) + global (dil=en)
const QUERIES: Record<string, { tr: string[]; en: string[] }> = {
  oyun: {
    tr: ["oyun", "minecraft türkçe", "valorant türkçe", "roblox türkçe", "gta 5 türkçe", "cs2 türkçe", "mobil oyun", "oyun inceleme", "pubg türkçe", "fifa fc türkçe"],
    en: ["gaming", "gameplay"],
  },
  finans: {
    tr: ["borsa", "yatırım", "dolar altın", "kripto para", "temettü hisse", "ekonomi analiz", "girişimcilik", "e-ticaret para kazanma", "emeklilik birikim", "faiz enflasyon"],
    en: ["investing", "personal finance"],
  },
  yemek: {
    tr: ["yemek tarifi", "kolay tarif", "tatlı tarifi", "hamur işi", "et yemekleri", "çorba tarifi", "diyet yemek", "kahvaltılık", "pratik yemek", "sokak lezzetleri"],
    en: ["recipe", "cooking"],
  },
  vlog: {
    tr: ["vlog", "gezi", "günlük vlog", "kamp vlog", "yurtdışı yaşam", "ev turu", "minimalizm", "seyahat rehberi", "köy hayatı", "günlük rutin"],
    en: ["day in my life", "travel vlog"],
  },
  teknoloji: {
    tr: ["telefon inceleme", "yapay zeka", "bilgisayar toplama", "laptop inceleme", "yazılım öğrenme", "kulaklık inceleme", "akıllı ev", "kamera inceleme", "teknoloji haber", "oyun bilgisayarı"],
    en: ["tech review", "ai tools"],
  },
  egitim: {
    tr: ["nasıl yapılır", "ingilizce öğrenme", "matematik konu anlatımı", "yks hazırlık", "tarih anlatımı", "fizik dersi", "kimya dersi", "üniversite tercih", "bilim belgesel", "kodlama dersi"],
    en: ["study tips", "science explained"],
  },
  makyaj: {
    tr: ["makyaj", "cilt bakımı", "makyaj önerileri", "günlük makyaj", "makyaj ürünleri", "saç bakımı", "kaş şekillendirme", "ruj denemesi", "cilt bakım rutini", "kozmetik inceleme"],
    en: ["makeup tutorial", "skincare routine"],
  },
  oto: {
    tr: ["araba inceleme", "otomobil test", "modifiye araba", "sıfır araba", "ikinci el araba", "motosiklet inceleme", "araç bakımı", "otomobil fiyatları", "elektrikli araba", "araba tamiri"],
    en: ["car review", "car mods"],
  },
  spor: {
    tr: ["antrenman programı", "evde spor", "fitness", "kas geliştirme", "koşu antrenman", "yoga dersi", "futbol analiz", "basketbol antrenman", "kilo verme egzersiz", "spor beslenmesi"],
    en: ["home workout", "gym training"],
  },
  komedi: {
    tr: ["komedi skeç", "komik video", "eğlence", "stand up", "parodi video", "komik anlar", "şaka videosu", "eğlenceli challenge", "mizah", "komik montaj"],
    en: ["comedy sketch", "funny video"],
  },
  muzik: {
    tr: ["cover şarkı", "gitar dersi", "akustik", "piyano dersi", "şarkı sözleri", "türkü", "rap müzik", "müzik prodüksiyon", "bağlama dersi", "canlı performans"],
    en: ["song cover", "music tutorial"],
  },
  saglik: {
    tr: ["sağlıklı beslenme", "diyet", "kilo verme", "doktor tavsiyeleri", "uyku düzeni", "psikoloji sağlık", "bitkisel tedavi", "vitamin takviye", "hamilelik", "diş sağlığı"],
    en: ["health tips", "nutrition"],
  },
  moda: {
    tr: ["kombin önerileri", "moda", "stil", "kıyafet alışverişi", "gardırop düzeni", "tesettür kombin", "ayakkabı önerileri", "moda trendleri", "vintage stil", "aksesuar"],
    en: ["fashion lookbook", "outfit ideas"],
  },
  gelisim: {
    tr: ["kişisel gelişim", "motivasyon", "verimlilik", "kariyer tavsiyeleri", "kitap özeti", "zaman yönetimi", "iletişim becerileri", "hedef belirleme", "özgüven", "alışkanlık"],
    en: ["self improvement", "productivity"],
  },
  cocuk: {
    tr: ["çocuk şarkıları", "eğitici çocuk videoları", "çocuk oyunları", "masal anlatımı", "çocuk etkinlikleri", "bebek bakımı", "çocuk gelişimi", "boyama etkinliği", "okul öncesi eğitim", "aile çocuk"],
    en: ["nursery rhymes", "kids learning"],
  },
};

// Sadece belirli nişleri işle: `npm run discover -- makyaj,oto,spor`
const nicheFilter = process.argv[2]?.split(",").map((s) => s.trim()).filter(Boolean);
const activeNiches = nicheFilter?.length
  ? Object.fromEntries(Object.entries(QUERIES).filter(([n]) => nicheFilter.includes(n)))
  : QUERIES;

/**
 * Kota penceresi: search.list çağrısı 100 birim, günlük limit 10.000.
 * QUERY_OFFSET/QUERY_LIMIT ile sorgu listesinin bir dilimi işlenir; böylece
 * geniş sorgu setleri güne yayılabilir (cron her gün farklı dilimi alır).
 */
const Q_OFFSET = Number(process.env.QUERY_OFFSET ?? 0);
const Q_LIMIT = Number(process.env.QUERY_LIMIT ?? 99);
const slice = <T,>(arr: T[]) => arr.slice(Q_OFFSET, Q_OFFSET + Q_LIMIT);

const MIN_SUBS_TR = 10_000; // TR: küçük ama gerçek kanallar da girsin (küçük kanal outlier'ı özelliği)
const MIN_SUBS_GLOBAL = 200_000; // Global: sadece büyük/izlenen kanallar
const MIN_VIDEO_COUNT = 15;
// Ölçek turu: niş başına hedef kanal sayısı (env ile ayarlanır)
const MAX_NEW_PER_NICHE = Number(process.env.MAX_NEW_PER_NICHE ?? 30);

// Kurum / TV / haber / marka-reklam / klon eleme
// (marka kanalları reklam kampanyalarıyla satın alınmış izlenme aldığı için
//  çarpanları anlamsız şişirir — creator değiller, evrene giremezler)
const BLOCKLIST =
  /haber|bakanl|belediye|vakf|üniversite|akademi|resmi|official channel|tv kanalı|televizyon|fragman|dizi bölüm|müzik yapım|müzik\s*$|records|prodüksiyon|kamu spotu|sigorta|banka|emeklilik|holding|telekom|turkcell|vodafone|a\.ş|otomotiv|arçelik|beko|vestel|migros|a101|şok market|petrol|havayolları|airlines|\bvivo\b|xiaomi|samsung|oppo|realme|infinix|tecno|huawei/i;

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: KEY! });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

type SearchItem = { snippet: { channelId: string; channelTitle: string } };
type ChannelItem = {
  id: string;
  snippet: { title: string; country?: string };
  statistics: { subscriberCount?: string; videoCount?: string };
};

const publishedAfter = new Date(Date.now() - 30 * 86400000).toISOString();
const found = new Map<string, { niche: string; global: boolean }>();

for (const [niche, q] of Object.entries(activeNiches)) {
  for (const [lang, queries] of [["tr", slice(q.tr)], ["en", slice(q.en)]] as const) {
    for (const query of queries) {
      const res = await yt<{ items: SearchItem[] }>("search", {
        part: "snippet",
        type: "video",
        q: query,
        order: "viewCount",
        publishedAfter,
        relevanceLanguage: lang,
        regionCode: lang === "tr" ? "TR" : "US",
        maxResults: "50",
      });
      for (const it of res.items ?? []) {
        if (!found.has(it.snippet.channelId)) {
          found.set(it.snippet.channelId, { niche, global: lang === "en" });
        }
      }
      console.log(`arama [${niche}/${lang}] "${query}": toplam aday ${found.size}`);
    }
  }
}

// Kanal detayları (50'li partiler) + filtre
const ids = [...found.keys()];
const accepted: Record<string, string[]> = {};
let rejected = 0;

for (let i = 0; i < ids.length; i += 50) {
  const res = await yt<{ items: ChannelItem[] }>("channels", {
    part: "snippet,statistics",
    id: ids.slice(i, i + 50).join(","),
    maxResults: "50",
  });
  for (const ch of res.items ?? []) {
    const meta = found.get(ch.id)!;
    const subs = Number(ch.statistics.subscriberCount ?? 0);
    const vids = Number(ch.statistics.videoCount ?? 0);
    const minSubs = meta.global ? MIN_SUBS_GLOBAL : MIN_SUBS_TR;
    if (subs < minSubs || vids < MIN_VIDEO_COUNT || BLOCKLIST.test(ch.snippet.title)) {
      rejected++;
      continue;
    }
    (accepted[meta.niche] ??= []).push(ch.id);
  }
}

// Mevcut seed'lerle birleştir: DB'de medyanı sağlıklı (>=500) kanallar korunur
const seedPath = join(process.cwd(), "seeds", "channels.json");
const existing = JSON.parse(readFileSync(seedPath, "utf8")) as {
  niche: string;
  channelIds: string[];
}[];

const { data: healthy } = await db
  .from("channels")
  .select("id")
  .gte("median_views", 500);
const healthySet = new Set((healthy ?? []).map((c) => c.id));

const existingNiches = new Set(existing.map((s) => s.niche));
const merged = existing.map((s) => {
  const kept = s.channelIds.filter((id) => healthySet.has(id));
  const fresh = (accepted[s.niche] ?? [])
    .filter((id) => !kept.includes(id))
    .slice(0, MAX_NEW_PER_NICHE);
  console.log(`${s.niche}: korunan ${kept.length} + yeni ${fresh.length}`);
  return { niche: s.niche, channelIds: [...kept, ...fresh] };
});

// Seed dosyasında olmayan YENİ nişleri ekle
for (const [niche, ids2] of Object.entries(accepted)) {
  if (existingNiches.has(niche)) continue;
  const fresh = ids2.slice(0, MAX_NEW_PER_NICHE);
  console.log(`${niche}: YENİ niş — ${fresh.length} kanal`);
  merged.push({ niche, channelIds: fresh });
}

writeFileSync(seedPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
const total = merged.reduce((a, s) => a + s.channelIds.length, 0);
console.log(`\nseeds/channels.json güncellendi: toplam ${total} kanal (elenen aday: ${rejected})`);

// DB temizliği: medyanı <500 gürültü kanallarını sil (videolar cascade)
const { data: junk } = await db.from("channels").select("id, title").lt("median_views", 500);
if (junk?.length) {
  const { error } = await db.from("channels").delete().lt("median_views", 500);
  if (error) throw new Error(`Temizlik hatası: ${error.message}`);
  console.log(`DB'den silinen gürültü kanalı: ${junk.length}`);
}
