# Viralab 🧪

**Türk YouTuber'lar için veri odaklı viral video araştırma platformu.**
İzlenmeyen video çekmeyi bırak — outlier'ları bul, rakipleri izle, kanıtlanmış fikirlerle üret.

> Kaynak plan: [`docs/plan.md`](docs/plan.md) — pazar analizi, mimari, GTM ve yol haritası.

## Hızlı başlangıç (demo modu — anahtar gerekmez)

```bash
npm install
npm run dev
```

`http://localhost:3000` → pazarlama sitesi · `http://localhost:3000/home` → uygulama.

Demo modunda uygulama **deterministik sahte TR veri setiyle** (48 kanal, ~1.000 video, 6 niş)
tam işlevsel çalışır: arama, 12 filtre, outlier sıralaması, klasörler/etiketler/notlar,
kanal takibi, uyarılar, AI chat (kurallı cevaplar). Kullanıcı verisi localStorage'da tutulur.

## Gerçek moda geçiş

### 1. Supabase (veritabanı + auth)
1. [supabase.com](https://supabase.com) → yeni proje oluştur.
2. SQL Editor'da `supabase/migrations/0001_init.sql` dosyasını çalıştır.
3. Settings → API'den URL + anon key + service role key'i `.env.local`'e yaz.

### 2. YouTube Data API (gerçek veri)
1. [Google Cloud Console](https://console.cloud.google.com) → proje → *YouTube Data API v3* etkinleştir → API anahtarı oluştur.
2. `.env.local`'e `YOUTUBE_API_KEY` yaz.
3. `seeds/channels.json`'a izlemek istediğin Türk kanallarının ID'lerini ekle (`UC...`).
4. Çek: `npm run ingest` (veya mock veriyi basmak için `npm run ingest:mock`).
5. Otomasyon: GitHub'a push'la, repo Settings → Secrets'a 3 anahtarı ekle —
   `.github/workflows/ingest.yml` 6 saatte bir otomatik çeker.

### 3. Gemini (AI chat)
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → anahtar → `GEMINI_API_KEY`.
Fikir Doğrulayıcı otomatik olarak Gemini 2.5 Flash'a geçer.

### 4. Stripe (abonelik)
1. [Stripe test modu](https://dashboard.stripe.com/test) → Product "Viralab Pro" oluştur.
2. İki Price ekle: ₺349/ay (aylık) ve ₺2.988/yıl (yıllık) → ID'leri `.env.local`'e:
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`.
3. `STRIPE_SECRET_KEY` (test) ekle. Webhook için:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` → çıkan secret'ı
   `STRIPE_WEBHOOK_SECRET`'e yaz.

### 5. Vercel'e deploy
```bash
vercel
```
Environment Variables bölümüne `.env.local` içeriğini ekle. `viralab.dev` domainini bağla.

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production derlemesi |
| `npm run ingest` | YouTube'dan canlı veri çek (env gerekli) |
| `npm run ingest:mock` | Demo veri setini Supabase'e bas |
| `npm run lint` | ESLint |

## Mimari özeti

```
Next.js 16 (App Router, TS, Tailwind v4)  →  Vercel
Supabase (Postgres + RLS + Auth)          →  içerik indeksi + kullanıcı verisi
GitHub Actions cron                        →  scripts/ingest.ts (kota-optimize YouTube çekimi)
Gemini 2.5 Flash                           →  /api/chat (Fikir Doğrulayıcı)
Stripe                                     →  /api/stripe/* (abonelik)
```

- **Outlier skoru** = izlenme ÷ kanal medyanı (30 günden eski videoların medyanı, min 10 video).
- **Kota tasarımı**: `search.list` kullanılmaz; `channels → playlistItems → videos` zinciriyle
  tek anahtarla ~500K video istatistiği/gün.
- Marka kimliği tek dosyada: `src/config/brand.ts`.

## Uyumluluk notları (yayın öncesi zorunlu)

- Gizlilik sayfası YouTube API Hizmetleri beyanlarını içeriyor (`/gizlilik`) — canlıya
  çıkmadan hukukçuyla gözden geçirin.
- YouTube verisi yalnızca resmî API'den çekilir, scraping yok.
- OAuth ile kanal bağlama eklendiğinde Google app verification gerekir (plan.md §8).
