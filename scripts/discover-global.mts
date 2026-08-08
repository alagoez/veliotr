/**
 * Global + TR kanal keşfi — deterministik, kota-bütçeli, önbellekli.
 *
 * discover-channels.mts'in yerini almaz; onun yanında durur. Farklar:
 *   · TR'ye ek olarak çoklu pazar (regionCode × dil)
 *   · Ham API cevapları diske önbelleklenir → tekrar çalıştırma 0 kota harcar
 *     ve BİREBİR aynı çıktıyı üretir (README kural 7)
 *   · Kota her çağrıdan ÖNCE deftere yazılır, bütçe aşılırsa durur (kural 1-2)
 *   · Hiçbir yerde "önce gelen kazanır" yok — her seçim açık bir sıralama kuralına bağlı
 *   · Supabase'e dokunmaz; çıktı tek bir JSON dosyası
 *
 * Çalıştırma:
 *   npx tsx --env-file=.env.local scripts/discover-global.mts
 *   npx tsx ... scripts/discover-global.mts --plan          (sadece maliyet raporu, çağrı yok)
 *   npx tsx ... scripts/discover-global.mts --budget=5000   (bu çalıştırmanın kota tavanı)
 *   npx tsx ... scripts/discover-global.mts --budget=5000   (bu çalıştırmanın kota tavanı)
 *   npx tsx ... scripts/discover-global.mts --since=2026-07-09
 *
 * Çıktı: seeds/discovered.json   (seeds/channels.json'a DOKUNULMAZ)
 * Önbellek: .cache/discovery/    (.gitignore'da)
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ───────────────────────── yapılandırma ─────────────────────────

/** Pazar = arama bölgesi + dil + o pazar için abone eşiği. */
type Market = { code: string; lang: string; minSubs: number };

const MARKETS: Market[] = [
  // TR eşiği kasten düşük: küçük ama gerçek kanallar evrende kalsın
  // (küçük kanal outlier'ı ürünün ayırt edici özelliği).
  { code: "TR", lang: "tr", minSubs: 10_000 },
  { code: "US", lang: "en", minSubs: 50_000 },
  { code: "GB", lang: "en", minSubs: 50_000 },
  { code: "IN", lang: "en", minSubs: 50_000 },
];

/**
 * Niş × dil sorgu seti. Yeni dil eklemek = buraya o dilin sorgularını yazmak
 * + MARKETS'e o dili kullanan pazarı eklemek. İngilizce sorguyu regionCode=BR
 * ile çalıştırmak Brezilyalı kanal getirmez, İngilizce üreten kanal getirir —
 * o yüzden her pazar kendi dilini bekler.
 */
const NICHE_QUERIES: Record<string, Record<string, string[]>> = {
  oyun: {
    tr: ["oyun", "minecraft türkçe", "valorant türkçe", "roblox türkçe", "gta 5 türkçe", "cs2 türkçe", "mobil oyun", "oyun inceleme", "pubg türkçe", "fifa fc türkçe"],
    en: ["gaming", "gameplay", "game review", "minecraft", "lets play"],
  },
  finans: {
    tr: ["borsa", "yatırım", "dolar altın", "kripto para", "temettü hisse", "ekonomi analiz", "girişimcilik", "e-ticaret para kazanma", "emeklilik birikim", "faiz enflasyon"],
    en: ["investing", "personal finance", "stock market", "crypto", "side hustle"],
  },
  yemek: {
    tr: ["yemek tarifi", "kolay tarif", "tatlı tarifi", "hamur işi", "et yemekleri", "çorba tarifi", "diyet yemek", "kahvaltılık", "pratik yemek", "sokak lezzetleri"],
    en: ["recipe", "cooking", "easy dinner", "baking", "street food"],
  },
  vlog: {
    tr: ["vlog", "gezi", "günlük vlog", "kamp vlog", "yurtdışı yaşam", "ev turu", "minimalizm", "seyahat rehberi", "köy hayatı", "günlük rutin"],
    en: ["day in my life", "travel vlog", "morning routine", "van life", "apartment tour"],
  },
  teknoloji: {
    tr: ["telefon inceleme", "yapay zeka", "bilgisayar toplama", "laptop inceleme", "yazılım öğrenme", "kulaklık inceleme", "akıllı ev", "kamera inceleme", "teknoloji haber", "oyun bilgisayarı"],
    en: ["tech review", "ai tools", "smartphone review", "pc build", "coding tutorial"],
  },
  egitim: {
    tr: ["nasıl yapılır", "ingilizce öğrenme", "matematik konu anlatımı", "yks hazırlık", "tarih anlatımı", "fizik dersi", "kimya dersi", "üniversite tercih", "bilim belgesel", "kodlama dersi"],
    en: ["study tips", "science explained", "how it works", "history documentary", "math tutorial"],
  },
  makyaj: {
    tr: ["makyaj", "cilt bakımı", "makyaj önerileri", "günlük makyaj", "makyaj ürünleri", "saç bakımı", "kaş şekillendirme", "ruj denemesi", "cilt bakım rutini", "kozmetik inceleme"],
    en: ["makeup tutorial", "skincare routine", "grwm", "beauty haul", "hair tutorial"],
  },
  oto: {
    tr: ["araba inceleme", "otomobil test", "modifiye araba", "sıfır araba", "ikinci el araba", "motosiklet inceleme", "araç bakımı", "otomobil fiyatları", "elektrikli araba", "araba tamiri"],
    en: ["car review", "car mods", "ev review", "motorcycle review", "car restoration"],
  },
  spor: {
    tr: ["antrenman programı", "evde spor", "fitness", "kas geliştirme", "koşu antrenman", "yoga dersi", "futbol analiz", "basketbol antrenman", "kilo verme egzersiz", "spor beslenmesi"],
    en: ["home workout", "gym training", "fitness transformation", "yoga class", "running tips"],
  },
  komedi: {
    tr: ["komedi skeç", "komik video", "eğlence", "stand up", "parodi video", "komik anlar", "şaka videosu", "eğlenceli challenge", "mizah", "komik montaj"],
    en: ["comedy sketch", "funny video", "stand up comedy", "prank", "parody"],
  },
  muzik: {
    tr: ["cover şarkı", "gitar dersi", "akustik", "piyano dersi", "şarkı sözleri", "türkü", "rap müzik", "müzik prodüksiyon", "bağlama dersi", "canlı performans"],
    en: ["song cover", "music tutorial", "guitar lesson", "music production", "live session"],
  },
  saglik: {
    tr: ["sağlıklı beslenme", "diyet", "kilo verme", "doktor tavsiyeleri", "uyku düzeni", "psikoloji sağlık", "bitkisel tedavi", "vitamin takviye", "hamilelik", "diş sağlığı"],
    en: ["health tips", "nutrition", "weight loss", "mental health", "sleep better"],
  },
  moda: {
    tr: ["kombin önerileri", "moda", "stil", "kıyafet alışverişi", "gardırop düzeni", "tesettür kombin", "ayakkabı önerileri", "moda trendleri", "vintage stil", "aksesuar"],
    en: ["fashion lookbook", "outfit ideas", "thrift haul", "style guide", "capsule wardrobe"],
  },
  gelisim: {
    tr: ["kişisel gelişim", "motivasyon", "verimlilik", "kariyer tavsiyeleri", "kitap özeti", "zaman yönetimi", "iletişim becerileri", "hedef belirleme", "özgüven", "alışkanlık"],
    en: ["self improvement", "productivity", "book summary", "career advice", "habits"],
  },
  cocuk: {
    tr: ["çocuk şarkıları", "eğitici çocuk videoları", "çocuk oyunları", "masal anlatımı", "çocuk etkinlikleri", "bebek bakımı", "çocuk gelişimi", "boyama etkinliği", "okul öncesi eğitim", "aile çocuk"],
    en: ["nursery rhymes", "kids learning", "kids songs", "toddler activities", "story time"],
  },
};

/** Her pazarda elenen: marka / kurum / plak şirketi / TV — creator değiller. */
const BLOCK_GLOBAL =
  /vevo|records|record label|\blabels?\b|music group|sony music|universal music|warner music|\bhybe\b|official artist|topic$|\bnetwork\b|news\b|\btv\b|television|broadcasting|entertainment inc|studios?$|\bfc\b|official channel|\bltd\b|\binc\.?$|\bgmbh\b|corporation/i;

/** Yalnızca TR pazarında ek eleme. */
const BLOCK_TR =
  /haber|bakanl|belediye|vakf|üniversite|akademi|resmi|tv kanalı|televizyon|fragman|dizi bölüm|müzik yapım|prodüksiyon|kamu spotu|sigorta|banka|emeklilik|holding|telekom|turkcell|vodafone|a\.ş|arçelik|beko|vestel|migros|a101|şok market|petrol|havayolları|airlines|xiaomi|samsung|oppo|realme|infinix|tecno|huawei/i;

const MIN_VIDEO_COUNT = 15;
/** Niş başına saklanacak kanal sayısı (abone sırasına göre en üstten). */
const MAX_PER_NICHE = Number(process.env.MAX_PER_NICHE ?? 60);
/** Arama penceresi (gün) — "aktif üretiyor" tanımı. */
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30);

const COST = { search: 100, channels: 1 } as const;

// ───────────────────────── argümanlar ─────────────────────────

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const PLAN_ONLY = process.argv.includes("--plan");
const BUDGET = Number(arg("budget") ?? process.env.QUOTA_BUDGET ?? 2500);

/**
 * Determinizm 1/4 — tarih penceresi.
 * `Date.now() - 30 gün` her saniye kayar; iki çalıştırma asla aynı olmaz.
 * Bunun yerine UTC gün tabanına yuvarlanmış, açıkça verilebilen bir tarih.
 */
const todayUtc = new Date().toISOString().slice(0, 10);
const SINCE_DATE =
  arg("since") ??
  new Date(Date.parse(`${todayUtc}T00:00:00Z`) - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
const publishedAfter = `${SINCE_DATE}T00:00:00Z`;

const KEY = process.env.YOUTUBE_API_KEY;
const API = "https://www.googleapis.com/youtube/v3";
const CACHE_DIR = join(process.cwd(), ".cache", "discovery");

// ───────────────────────── kota defteri ─────────────────────────

/**
 * Aramalara ayrılmayan, kanal detayları için saklanan pay.
 * Detay çağrısı 1 birim/50 kanal — 100 birim 5.000 adayı kapsar. Bu pay
 * olmadan aramalar bütçeyi bitirir ve elde detaysız aday listesi kalır.
 */
const DETAIL_RESERVE = Number(process.env.DETAIL_RESERVE ?? 100);

/** Kural 1: sayaç tahmin etmez, sayar. Çağrı YAPILMADAN ÖNCE yazılır. */
class Ledger {
  spent = 0;
  cached = 0;
  constructor(
    private readonly budget: number,
    private readonly detailReserve: number,
  ) {}
  /**
   * Bütçe yetiyorsa rezerve eder; yetmiyorsa false döner (kural 2: acil durdurma).
   * Arama fazı detay payına dokunamaz.
   */
  reserve(units: number, phase: "search" | "detail"): boolean {
    const ceiling = phase === "search" ? this.budget - this.detailReserve : this.budget;
    if (this.spent + units > ceiling) return false;
    this.spent += units;
    return true;
  }
  hit() {
    this.cached++;
  }
}
const ledger = new Ledger(BUDGET, DETAIL_RESERVE);

// ───────────────────────── önbellekli API ─────────────────────────

/**
 * Determinizm 2/4 — ham cevap önbelleği.
 * Anahtar: uç nokta + parametreler (API anahtarı hariç) → sha1.
 * Önbellek doluysa ağ yok, kota yok, çıktı birebir aynı.
 */
function cacheKey(path: string, params: Record<string, string>): string {
  const stable = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(`${path}?${stable}`).digest("hex");
}

async function yt<T>(
  path: string,
  params: Record<string, string>,
  units: number,
  phase: "search" | "detail",
): Promise<T | null> {
  const key = cacheKey(path, params);
  const file = join(CACHE_DIR, `${key}.json`);

  if (existsSync(file)) {
    ledger.hit();
    return JSON.parse(readFileSync(file, "utf8")) as T;
  }
  if (!KEY) throw new Error("YOUTUBE_API_KEY gerekli (önbellekte olmayan çağrı için).");
  if (!ledger.reserve(units, phase)) return null; // bütçe bitti — sessizce dur

  const qs = new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as T;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(json), "utf8");
  return json;
}

// ───────────────────────── plan ─────────────────────────

type Step = { niche: string; market: Market; query: string };

/**
 * Determinizm 3/4 — sabit plan sırası.
 * (niş, pazar, sorgu) üçlüleri her zaman aynı sırada. Plan baştan gezilir;
 * önbellek sayesinde güne yayılan çalıştırmalar birbirini tekrar etmez.
 *
 * Sıra ENİNE: önce her nişin 1. sorgusu, sonra her nişin 2. sorgusu...
 * Niş-önce sıralasaydık, yarım kalan bir çalıştırma tek nişi doldurup
 * gerisini boş bırakırdı (ilk denemede tam bunu yaptı: 415 kanalın hepsi
 * "cocuk"tu). Enine sıra, bütçe nerede biterse bitsin dengeli örnek verir.
 */
function buildPlan(): Step[] {
  const steps: Step[] = [];
  const niches = Object.keys(NICHE_QUERIES).sort();
  const markets = [...MARKETS].sort((a, b) => a.code.localeCompare(b.code));
  const maxQ = Math.max(
    ...niches.flatMap((n) => markets.map((m) => (NICHE_QUERIES[n][m.lang] ?? []).length)),
  );
  for (let qi = 0; qi < maxQ; qi++) {
    for (const niche of niches) {
      for (const market of markets) {
        const query = NICHE_QUERIES[niche][market.lang]?.[qi];
        if (query) steps.push({ niche, market, query });
      }
    }
  }
  return steps;
}

const plan = buildPlan();
const fullCost = plan.length * COST.search;

console.log(`Plan: ${plan.length} arama · tam tarama ${fullCost.toLocaleString("tr-TR")} birim`);
console.log(`      günlük 10.000 birimle ~${Math.ceil(fullCost / 10_000)} gün`);
console.log(`Bütçe: ${BUDGET} birim (detay payı ${DETAIL_RESERVE})`);
console.log(`Pencere: ${SINCE_DATE} sonrası · pazarlar: ${MARKETS.map((m) => m.code).join(", ")}\n`);

if (PLAN_ONLY) {
  console.log("(--plan: çağrı yapılmadı)");
  process.exit(0);
}

// ───────────────────────── keşif ─────────────────────────

type SearchItem = { snippet: { channelId: string } };
type ChannelItem = {
  id: string;
  snippet: { title: string; country?: string; publishedAt: string };
  statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string };
};

/** kanalId → niş → kaç sorguda görüldü. Niş ataması bu sayıma göre yapılır. */
const hits = new Map<string, Map<string, number>>();
/** kanalId → onu ilk yakalayan pazar (raporlama için, seçimi etkilemez). */
const seenIn = new Map<string, string>();

let executed = 0;
let skipped = 0;

/**
 * Plan HER ZAMAN baştan gezilir — atlanarak değil.
 * Önbellekteki adımlar bedava okunur, yalnızca yeni adımlar kotadan harcar.
 * Böylece çıktı her çalıştırmada BİRİKİMLİ ve eksiksiz olur. (Adım atlayarak
 * çalıştırdığımızda çıktı dosyası önceki turun nişlerini kaybetti.)
 * Bütçe bittiğinde durulmaz; kalan adımlar önbellekte varsa yine de okunur.
 */
for (let i = 0; i < plan.length; i++) {
  const step = plan[i];
  const res = await yt<{ items: SearchItem[] }>(
    "search",
    {
      part: "snippet",
      type: "video",
      q: step.query,
      order: "viewCount",
      publishedAfter,
      relevanceLanguage: step.market.lang,
      regionCode: step.market.code,
      maxResults: "50",
    },
    COST.search,
    "search",
  );
  if (res === null) {
    skipped++;
    continue; // bütçe yok + önbellekte yok → bu adım bir sonraki çalıştırmaya kalsın
  }
  executed++;

  for (const it of res.items ?? []) {
    const id = it.snippet.channelId;
    if (!hits.has(id)) hits.set(id, new Map());
    const byNiche = hits.get(id)!;
    byNiche.set(step.niche, (byNiche.get(step.niche) ?? 0) + 1);
    if (!seenIn.has(id)) seenIn.set(id, step.market.code);
  }
  console.log(`[${i}] ${step.niche}/${step.market.code} "${step.query}" → aday ${hits.size}`);
}

// ───────────────────────── kanal detayları + eleme ─────────────────────────

const candidateIds = [...hits.keys()].sort(); // sıralı: parti sınırları deterministik
type Row = {
  id: string;
  title: string;
  country: string | null;
  subscribers: number;
  videoCount: number;
  market: string;
};
const details = new Map<string, Row>();

for (let i = 0; i < candidateIds.length; i += 50) {
  const batch = candidateIds.slice(i, i + 50);
  const res = await yt<{ items: ChannelItem[] }>(
    "channels",
    { part: "snippet,statistics", id: batch.join(","), maxResults: "50" },
    COST.channels,
    "detail",
  );
  if (res === null) {
    console.log(`\n⏸  Bütçe kanal detaylarında doldu (${i}/${candidateIds.length}).`);
    break;
  }
  for (const ch of res.items ?? []) {
    details.set(ch.id, {
      id: ch.id,
      title: ch.snippet.title,
      country: ch.snippet.country ?? null,
      subscribers: Number(ch.statistics.subscriberCount ?? 0),
      videoCount: Number(ch.statistics.videoCount ?? 0),
      market: seenIn.get(ch.id) ?? "",
    });
  }
}

/**
 * Determinizm 4/4 — niş ataması ve seçim.
 * Bir kanal birden çok nişte çıkabilir. "Önce bulan kazanır" yerine:
 *   1) en çok sorguda göründüğü niş
 *   2) eşitlikte niş slug'ı alfabetik olarak küçük olan
 * Seçim de rastgele değil: abone sayısına göre azalan, eşitlikte id'ye göre.
 */
function assignNiche(id: string): string {
  const byNiche = [...hits.get(id)!.entries()];
  byNiche.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return byNiche[0][0];
}

const buckets = new Map<string, Row[]>();
let rejected = 0;
const rejectReasons = { subs: 0, videos: 0, blocked: 0, noDetail: 0 };

for (const id of candidateIds) {
  const row = details.get(id);
  if (!row) {
    rejectReasons.noDetail++;
    continue;
  }
  const niche = assignNiche(id);
  const market = MARKETS.find((m) => m.code === row.market) ?? MARKETS[0];

  if (row.subscribers < market.minSubs) {
    rejectReasons.subs++;
    rejected++;
    continue;
  }
  if (row.videoCount < MIN_VIDEO_COUNT) {
    rejectReasons.videos++;
    rejected++;
    continue;
  }
  const blocked =
    BLOCK_GLOBAL.test(row.title) || (market.code === "TR" && BLOCK_TR.test(row.title));
  if (blocked) {
    rejectReasons.blocked++;
    rejected++;
    continue;
  }
  (buckets.get(niche) ?? buckets.set(niche, []).get(niche)!).push(row);
}

// ───────────────────────── çıktı ─────────────────────────

const niches = [...buckets.keys()].sort().map((niche) => {
  const rows = buckets
    .get(niche)!
    .sort((a, b) => (b.subscribers - a.subscribers) || a.id.localeCompare(b.id))
    .slice(0, MAX_PER_NICHE);
  return { niche, count: rows.length, channels: rows };
});

// Çıktıya zaman damgası KONULMAZ — dosya bayt bayt kararlı kalsın, git farkı
// gerçek değişikliği göstersin.
const out = {
  since: SINCE_DATE,
  markets: MARKETS.map((m) => ({ code: m.code, lang: m.lang, minSubs: m.minSubs })),
  planSteps: plan.length,
  planFetched: executed,
  planSkipped: skipped,
  quotaSpent: ledger.spent,
  cacheHits: ledger.cached,
  totalChannels: niches.reduce((a, n) => a + n.count, 0),
  niches,
};

const outPath = join(process.cwd(), "seeds", "discovered.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(`\n─────────── özet ───────────`);
console.log(`Çalıştırılan arama : ${executed}`);
console.log(`Önbellekten        : ${ledger.cached}`);
console.log(`Harcanan kota      : ${ledger.spent} / ${BUDGET}`);
console.log(`Aday kanal         : ${candidateIds.length}`);
console.log(`Elenen             : ${rejected}  (abone ${rejectReasons.subs} · video ${rejectReasons.videos} · kara liste ${rejectReasons.blocked} · detay yok ${rejectReasons.noDetail})`);
console.log(`Kabul edilen       : ${out.totalChannels}`);
for (const n of niches) console.log(`  ${n.niche.padEnd(12)} ${n.count}`);
console.log(`\nYazıldı: seeds/discovered.json`);
if (skipped) console.log(`Bütçesi yetmeyen adım: ${skipped} — yarın tekrar çalıştır, önbellektekiler bedava.`);
