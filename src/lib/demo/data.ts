import type { Channel, Video } from "@/lib/types";

/**
 * Demo veri seti — Supabase/YouTube anahtarı olmadan uygulamanın
 * "neredeyse birebir çalışır" olmasını sağlar. Deterministik üretilir
 * (seed'li RNG), böylece her açılışta aynı evren görünür.
 * Gerçek moda geçiş: .env'e Supabase anahtarlarını ekle (bkz. README).
 */

// ---- Seed'li RNG (mulberry32) ----
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NICHES = [
  { slug: "oyun", name: "Gaming" },
  { slug: "finans", name: "Business & Finance" },
  { slug: "yemek", name: "Food & Cooking" },
  { slug: "vlog", name: "Travel & Adventure" },
  { slug: "teknoloji", name: "Technology & AI" },
  { slug: "egitim", name: "Education & Science" },
  { slug: "fitness", name: "Fitness & Wellness" },
  { slug: "entertainment", name: "Entertainment" },
] as const;

const CHANNEL_NAMES: Record<string, string[]> = {
  oyun: ["Pixel Forge", "Game Theory Lab", "Level Up Daily", "The Speedrun", "Cozy Gamer", "Critical Hit", "Noob to Pro", "The Quest Log"],
  finans: ["The Market Brief", "Money Explained", "Modern Millennial", "Build in Public", "The Founder Files", "Wealth Signals", "Finance Simplified", "The Growth Room"],
  yemek: ["Basics with Babish", "The Food Lab", "Home Plate", "Street Food Atlas", "Quick Bites", "The Dessert Room", "Chef's Table", "One Pan Kitchen"],
  vlog: ["Wander Theory", "Lost with Purpose", "Urban Nomad", "The Great Detour", "Van Life Stories", "Passport Ready", "Hidden Routes", "Weekend Atlas"],
  teknoloji: ["Marques Brownlee", "The Verge", "Fireship", "AI Explained", "Circuit Breaker", "Future Tools", "Build With Me", "Tech Unpacked"],
  egitim: ["Kurzgesagt", "Veritasium", "CrashCourse", "The Knowledge Project", "Simple History", "The Science Desk", "Study With Me", "Learn With Leon"],
  fitness: ["Hybrid Calisthenics", "Mind Pump", "Yoga With Adriene", "The Running Channel", "Strong Habits", "Wellness Reset", "Mobility Lab", "Train Smart"],
  entertainment: ["Vox Pop", "The Daily Drop", "Culture Decode", "Screen Talk", "The Creator Studio", "Story Mode", "Internet Historian", "Late Night Lab"],
};

const TITLE_TEMPLATES: Record<string, string[]> = {
  oyun: ["The mistake every player makes", "I played {X} for 24 hours", "We broke the impossible record", "The update changed everything", "Beginner vs pro: the real difference", "7 secrets nobody tells you", "I tried the hardest challenge", "Never play without these settings"],
  finans: ["How I built a second income stream", "The money rule nobody taught me", "I tested 5 side hustles", "What successful founders do differently", "The truth about passive income", "I invested $1,000 for 30 days", "This market signal is impossible to ignore", "How to grow from zero"],
  yemek: ["The original {X} recipe", "3 ingredients, restaurant results", "I cooked every version of this dish", "The secret chefs never share", "One pan, five incredible meals", "The viral recipe actually tested", "Street food worth traveling for", "The easiest dinner you will make"],
  vlog: ["I found the city nobody talks about", "48 hours with only $100", "The most underrated road trip", "I moved abroad for 30 days", "This place looks unreal", "The travel mistake everyone makes", "A local guide to hidden gems", "I took the long way home"],
  teknoloji: ["{X} review: before you buy", "I tested the internet's favorite AI tools", "The best setup under $1,000", "This feature changes everything", "I built a website in one day", "The apps I deleted immediately", "What nobody tells you about AI", "The future is closer than you think"],
  egitim: ["The science behind {X}", "I learned a new skill in 30 days", "10 ideas that changed how I think", "The study method that finally worked", "What school forgot to teach us", "The simple explanation nobody gives", "I tested the most popular technique", "The history behind the headline"],
  fitness: ["I tried the routine for 30 days", "The workout mistake holding you back", "What happens when you walk daily", "The simplest plan that actually works", "I tested 5 recovery hacks", "Build strength without a gym", "The science of better sleep", "One habit that changed my energy"],
  entertainment: ["The story behind the viral moment", "I watched every version so you don't have to", "What this trend really means", "The creator formula decoded", "The internet's strangest rabbit hole", "This ending changed everything", "The cultural moment explained", "I tried the challenge everyone is talking about"],
};

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "");
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.floor((s[mid - 1] + s[mid]) / 2);
}

type Dataset = { channels: Channel[]; videos: Video[] };

let cache: Dataset | null = null;

export function getDemoDataset(): Dataset {
  if (cache) return cache;
  const r = rng(4242);
  const channels: Channel[] = [];
  const videos: Video[] = [];
  const now = Date.now();
  const DAY = 86400000;

  for (const niche of NICHES) {
    for (const name of CHANNEL_NAMES[niche.slug]) {
      const handle = "@" + slugify(name);
      const id = "ch_" + slugify(name);
      // Abone: 3K – 2M, log dağılım
      const subscribers = Math.floor(3000 * Math.pow(10, r() * 2.8));
      const ageYears = 1 + r() * 8;
      const videoCount = 12 + Math.floor(r() * 24);
      const baseViews = Math.max(500, Math.floor(subscribers * (0.15 + r() * 0.5)));

      const channelVideos: Video[] = [];
      for (let i = 0; i < videoCount; i++) {
        const ageDays = 1 + Math.floor(r() * ageYears * 330);
        // Çoğu video normal, ~%12'si outlier (2x–40x)
        const isOutlier = r() < 0.12;
        const mult = isOutlier ? 2 + Math.pow(r(), 0.6) * 38 : 0.3 + r() * 1.6;
        const views = Math.max(50, Math.floor(baseViews * mult * (0.8 + r() * 0.4)));
        const isShort = r() < 0.22;
        const durationSec = isShort
          ? 15 + Math.floor(r() * 45)
          : 180 + Math.floor(r() * 1500);
        const likes = Math.floor(views * (0.02 + r() * 0.05));
        const comments = Math.floor(views * (0.001 + r() * 0.006));
        const publishedAt = new Date(now - ageDays * DAY).toISOString();
        const title = pick(r, TITLE_TEMPLATES[niche.slug]).replace(
          "{X}",
          pick(r, ["Legendary", "AI", "The $100 Challenge", "RTX 5090", "The Hidden Rule", "Street Food", "The 30-Day Experiment", "Speedrun", "%42"]),
        );

        channelVideos.push({
          id: `v_${id}_${i}`,
          channelId: id,
          channelTitle: name,
          channelHandle: handle,
          subscribers,
          medianViews: 0, // aşağıda doldurulur
          nicheSlug: niche.slug,
          title,
          thumbUrl: null,
          publishedAt,
          durationSec,
          isShort,
          views,
          likes,
          comments,
          engagement: (likes + comments) / views,
          outlierScore: 0,
          viewsPerDay: views / Math.max(ageDays, 1),
          viewsToSubs: views / subscribers,
        });
      }

      // Medyan: 30 günden eski videolar üzerinden (plan.md §4.3)
      const mature = channelVideos.filter(
        (v) => now - new Date(v.publishedAt).getTime() > 30 * DAY,
      );
      const med = median((mature.length >= 10 ? mature : channelVideos).map((v) => v.views));
      for (const v of channelVideos) {
        v.medianViews = med;
        v.outlierScore = Math.round((v.views / Math.max(med, 1)) * 10) / 10;
      }

      channels.push({
        id,
        title: name,
        handle,
        avatarUrl: null,
        nicheSlug: niche.slug,
        subscribers,
        totalViews: channelVideos.reduce((a, v) => a + v.views, 0),
        videoCount,
        publishedAt: new Date(now - ageYears * 365 * DAY).toISOString(),
        medianViews: med,
      });
      videos.push(...channelVideos);
    }
  }

  cache = { channels, videos };
  return cache;
}
