# VIRALAB — SaaS Master Planı

> **Ürün:** Türk YouTuber'lar için veri odaklı viral video araştırma platformu (Velio.co'nun TR pazarına uyarlanmış birebir karşılığı)
> **Domain:** viralab.dev · **Arayüz dili:** Türkçe · **Stack:** Next.js + Supabase + Vercel + GitHub + Gemini + Stripe
> **Tarih:** 24 Temmuz 2026 · **Kaynak:** velio.co'nun 5 paralel agent'la yapılan tam teardown'u (pazarlama sitesi, canlı uygulama bundle'ı, GTM funnel'ları, SEO motoru, hukuk/teknoloji)

---

## 0. Yönetici Özeti

Velio.co, Avustralyalı YouTuber Marcus Jones'un (425K abone) Ağustos 2024'te kendi kitlesine sattığı, tek paketli ($35/ay), YouTube "outlier" (patlayan video) araştırma SaaS'ıdır. Ürünün çekirdeği tek bir metriktir: **çarpan (multiplier) = video izlenmesi ÷ kanalın medyan izlenmesi**. Bunun etrafına arama/filtre, kaydetme/klasörleme, rakip takibi, AI chat ve thumbnail stüdyosu örülmüştür. Dağıtımı %100 creator-led'dir: kurucunun kendi kitlesi + %40 ömür boyu komisyonlu affiliate ordusu + her partnere 1 saatte klonlanan indirimli landing sayfaları + geceleri otomatik basılan programatik SEO içerikleri.

**Viralab**, bu kanıtlanmış modeli Türkçe içerik ekosistemine taşır: aynı ürün mimarisi (Velio'nun kendisi de Next.js + Vercel + Supabase + Stripe kullanıyor — yani hedef mimariyle birebir aynı), Türk kanal evreni, Türkçe arayüz ve Türk creator diline uyarlanmış marka sesi. Global araçlar (vidIQ, 1of10, Velio) Türkçe nişleri iyi kapsamıyor; TR SERP'lerinde araç kategorisi anahtar kelimeleri neredeyse boş. Fırsat penceresi açık.

**MVP hedefi:** 8 haftada, tek nişten başlayıp genişleyen Türk kanal indeksi üzerinde çalışan outlier arama + kaydetme + rakip takibi + AI chat + Stripe abonelik. Aylık altyapı maliyeti < $50.

---

## 1. Kaynak Analiz: Velio Teardown Bulguları

### 1.1 Ürün gerçeği (canlı bundle'dan doğrulanmış)

- **Uygulama:** app.velio.co — Next.js (Pages Router) SPA, Vercel'de (fra1), Supabase auth, koyu tema, General Sans fontu.
- **Çekirdek ekranlar:** `/home` (keşif akışı), `/filters`, `/idea-validator` (AI chat), `/thumbnail-generator`, `/saved-videos`, `/saved-channels`, `/alerts/manage`, `/notifications`, `/databases`, `/shorts`, `/player/[id]`, `/billing`, `/checkout(-2,-3)`, `/learn`, admin paneli.
- **12 aralık filtresi** (log ölçekli çift kollu slider): Çarpan, İzlenme, Abone, Video süresi, İzlenme:Abone oranı, Medyan izlenme, Kanal toplam izlenme, Kanal video sayısı, Beğeni, Yorum, Etkileşim oranı, Kanal yaşı. + Dahil et/hariç tut: Konseptler, Anahtar kelimeler, Kanallar. + Tarih presetleri (Bugün/Bu Hafta/Geçen Hafta/Bu Ay/Geçen Ay/özel aralık). + Shorts toggle'ı, arketip filtresi, "niş-alakalı" toggle'ı.
- **Sıralama:** Outlier skoru / Yükleme tarihi / Alaka. + Rastgele butonu. + "Exact ↔ Broad" semantik arama slider'ı.
- **AI chat (Idea Validator):** hazır prompt çipleri ("Bana viral video fikirleri ver", "Nişimde şu an ne trend?", "Kopyalayabileceğim outlier videolar bul"...), klasör bağlamında da çalışıyor. OpenAI/Gemini/Cohere arkada, Langfuse ile izleniyor.
- **Thumbnail Studio:** kredi bazlı (Stripe kredi paketleri 500–4500), persona (50 kredi), stil referansı, face-swap, AI skorlama, karşılaştırma modu, 16:9 + 9:16.
- **Ekosistem:** Chrome eklentisi (~1.000 kullanıcı, 4.5★), iOS + Android yakalama uygulamaları, OAuth'lu MCP sunucusu, Mux tabanlı player, Discord, kurslar.
- **Diğer altyapı:** Stripe + Metronome (kullanım faturalama), Pikzels (görsel üretim), ClickHouse + Turbopuffer (analitik + vektör arama), PostHog, Sentry, Intercom, Unleash, Calendly.

### 1.2 Fiyatlandırma gerçeği

| Kanal | Teklif |
|---|---|
| Ana sayfa | $35/ay · yıllıkta $25/ay (%28.5 indirim rozeti) |
| Standart partner sayfaları | İlk ay %75 indirim → $8.75 |
| En büyük partner (Youri) | İlk ay %90 → $3.50 |
| Churn win-back | Ücretsiz deneme VSL sayfası |
| Ek gelir | Thumbnail kredi paketleri, koltuk (seat) satışı, abonelik duraklatma akışı |

Tek plan, özellik kademesi yok — sadece faturalama dönemi farkı. "İstediğin zaman iptal et" + "ilk ay risksiz" çerçevesi.

### 1.3 GTM makinesi

1. **Kurucu-kitle avantajı:** ürün, kurucunun "Grow Your Gaming Channel" eğitim kitlesine sıfır CAC ile satıldı.
2. **Testimonial duvarı = partner rosteri:** 8 orta boy eğitimci YouTuber (26K–745K abone) — önce ücretsiz erişim → alıntı → affiliate → co-branded sayfa merdiveni.
3. **Ambassador şablonu:** `/ambassador/` sayfası "Human Name · 368k subs" placeholder'lı master şablon; yeni partner sayfası <1 saatte klonlanıyor. İndirim kupon koduyla değil, attribution cookie'siyle uygulanıyor (link temiz kalıyor).
4. **Affiliate:** FirstPromoter, **%40 ömür boyu komisyon**, başvuru formu ile elenen katılım.
5. **Programatik SEO:** Nisan 2026'dan beri her gece 00:45 UTC'de 1 otomatik makale (Rebelgrowth ajansı), tek anahtar kelime evreni ("youtube video ideas") × niş/araç/fiyat/nasıl-yapılır eksenleri, listicle'larda kendini #1 gösterme.
6. **A/B kültürü:** Zoho PageSense ile başlık testleri ("unf*ck" / "Stop Posting Videos" / sansürsüz varyant), `/home-test-A/B` route'ları.

### 1.4 Zayıf noktaları = Viralab fırsatları

- Türkçe/yerel niş kapsaması yok (ana fırsat).
- YouTube API zorunlu beyanları privacy policy'de eksik (uyumluluk açığı — biz doğru yapacağız).
- Affiliate çerez süresi/ödeme şartları kamuya kapalı; klon sayfalarda özensizlik (yanlış testimonial); "3.750 vs 5.000 kullanıcı" tutarsız rozetler.
- SEO içeriklerinde vendor kirliliği (alakasız düğün fotoğrafçısı linkleri), çift slug'lar, alt-text'te ham AI prompt'ları; JSON-LD yok.
- Ücretsiz kademe yok — mağaza yorumlarında en büyük şikâyet. TR fiyat hassasiyetinde sınırlı ücretsiz kademe güçlü koz.

---

## 2. Viralab Marka Kimliği

| Öğe | Karar |
|---|---|
| **İsim** | Viralab (Viral + Laboratuvar — "videonun bilimi") |
| **Domain** | viralab.dev (uygulama: app.viralab.dev) — .dev TLD zorunlu HTTPS, Vercel'de sorunsuz |
| **Slogan** | "İzlenmeyen video çekmeyi bırak." (Velio hero'sunun TR karşılığı) |
| **Alt slogan** | "Viralab, milyonlarca videoyu tarayıp kanalını patlatacak fikirleri, başlıkları ve thumbnail'ları bulur." |
| **Ton** | Velio'nun küstah-samimi tonunun TR karşılığı: creator ağzı, hafif argo, veri güveni. Örn: "Kanalın için steroid gibi, ama yasal." · "Bir döner parasına." · Fiyat kartında şaka satırı: "Varoluş Krizi Geçir" |
| **Renkler** | Zemin: `#0A0A0F` (koyu) · Yüzey: `#14141B` · Birincil aksan: `#7C3AED` (viral mor) · İkincil: `#22D3EE` (lab camgöbeği) · Başarı/çarpan rozeti: `#4ADE80` · Metin: `#F4F4F5` / `#A1A1AA` |
| **Tipografi** | Başlık: Space Grotesk · Gövde/UI: Inter (Velio'daki General Sans hissinin açık kaynak karşılığı) |
| **Logo yönü** | Erlenmeyer/deney tüpü + play üçgeni füzyonu; "V" harfini kabarcıklı tüp formunda çizen minimal mark |
| **Çarpan rozeti** | Kartlarda yeşil "14.4x" hap rozeti — markanın imza görseli |

---

## 3. Ürün Spesifikasyonu

### 3.1 Route haritası (Velio eşleştirmeli)

**Uygulama (app.viralab.dev)** — App Router, koyu tema:

| Viralab route | Velio karşılığı | Faz |
|---|---|---|
| `/home` — Keşfet akışı | `/home` | 1 |
| `/filters` — filtre paneli (mobilde tam sayfa, masaüstünde yan panel) | `/filters` | 1 |
| `/saved-videos`, `/saved-videos/[id]` — Kaydedilenler/klasörler | aynı | 1 |
| `/saved-channels`, `/saved-channels/[id]` — Takip edilen kanallar | aynı | 1 |
| `/alerts/manage` + `/notifications` — Uyarılar + bildirimler | aynı | 1 |
| `/idea-validator` — Fikir Doğrulayıcı (Gemini chat) | aynı | 1 |
| `/signin`, `/verify`, `/getting-started` | aynı | 1 |
| `/billing`, `/checkout`, `/stripe-return` | aynı | 1 |
| `/shorts` — Shorts görünümü | aynı | 2 |
| `/databases` — hazır listeler ("2026'nın En İyi 30 Videosu" vb.) | aynı | 2 |
| `/thumbnail-studio` — kredi bazlı AI thumbnail | `/thumbnail-generator` | 2 |
| `/player/[id]` — uygulama içi izleme | aynı | 2 |
| `/learn` — Kaynak Kasası/kurslar | aynı | 2 |
| `/share/tracked-channels` — paylaşılabilir listeler | aynı | 2 |
| `/admin/*` — kanal/niş yönetimi, seed araçları | aynı | 1 (minimal) |
| MCP sunucusu | var | 3 |

**Pazarlama (viralab.dev)** — Velio yapısını aynalayan tek-CTA sitesi:

| Sayfa | İçerik |
|---|---|
| `/` | Hero ("İzlenmeyen video çekmeyi bırak") → testimonial bandı → 3 adım ("Viral kalıpları çöz / Rakiplerini izle / İzlenmeyi al") → 3 derin özellik bloğu → uygulama/eklenti → fiyat → kurucu alıntısı → destek 4'lüsü → final CTA → footer |
| `/ozellikler` | Velio `/features` karşılığı: "Kanalını düzlüğe çıkarmanın en hızlı yolu" + 8 özellik karosu + interaktif demo + outlier kart örneği |
| `/iletisim`, `/gizlilik`, `/kosullar` | Hukuki + iletişim |
| `/[creator-slug]` | Ambassador master şablonundan klonlanan partner sayfaları (Faz 2) |
| Programatik SEO kökleri | `/youtube-video-fikirleri-*` (Faz 2, §7.3) |

### 3.2 Keşfet ekranı (çekirdek)

- **Arama çubuğu:** anahtar kelime + (Faz 2'de) Gemini embedding ile semantik arama ve "Birebir ↔ Geniş" slider'ı.
- **Filtre paneli — 12 aralık filtresi** (hepsi log ölçekli çift slider):

| Filtre | Gösterim |
|---|---|
| Çarpan (outlier) | `14.4x` |
| İzlenme | 1,4 Mn |
| Abone | 368 B |
| Video süresi | mm:ss |
| İzlenme:Abone | 3,8 |
| Medyan izlenme | 97 B |
| Kanal toplam izlenme | 120 Mn |
| Kanal video sayısı | 214 |
| Beğeni | 45 B |
| Yorum | 1,2 B |
| Etkileşim oranı | %4,2 |
| Kanal yaşı | 3 yıl |

- **Metin filtreleri:** anahtar kelime dahil/hariç, kanal dahil/hariç, niş seçimi.
- **Tarih:** Bugün / Bu Hafta / Geçen Hafta / Bu Ay / Geçen Ay / Tüm Zamanlar / özel aralık.
- **Sıralama:** Outlier skoru (varsayılan) / Yükleme tarihi / Alaka + 🎲 Rastgele butonu.
- **Toggle'lar:** Shorts/uzun video, "nişime uygun".
- **Sonsuz kaydırma** + boş durum/yükleme durumları.

### 3.3 Video kartı veri alanları

Thumbnail · başlık · kanal adı+avatar · **çarpan rozeti (yeşil "Nx")** · izlenme ("1,4 Mn izlenme · 97 B medyan") · abone · yaş ("3 hafta önce") · süre etiketi. Detayda: beğeni, yorum, etkileşim, izlenme:abone, kanal istatistikleri. **Kart aksiyonları:** Kaydet (klasöre) · etiket/not ekle · kanalı takip et · benzer videoları gör · thumbnail'ı indir · YouTube'da aç.

### 3.4 Kaydetme sistemi

Klasörler (özel koleksiyonlar) → içinde videolar; etiket sistemi (çoktan çoğa); video başına serbest metin not; klasör içi arama. Klasör, AI chat'in bağlam birimi (§3.6).

### 3.5 Rakip takibi + uyarılar

Kanal/video linki yapıştır → kanal takibe girer; isimli kanal listeleri; kanal sayfasında o kanalın videoları outlier metrikleriyle. **Uyarı kuralı (MVP):** takip edilen kanalda `çarpan > 3 VE yaş < 7 gün` → bildirim akışına düş + (Faz 2) e-posta. Takip edilen kanallar ingestion'da yüksek öncelik kuyruğuna alınır.

### 3.6 Fikir Doğrulayıcı (Gemini chat)

Velio prompt çiplerinin TR seti —

Genel mod: "Bana viral video fikirleri ver" · "Nişimde şu an ne trend?" · "Kopyalayabileceğim outlier videolar bul" · "En çok hangi başlık kalıpları öne çıkıyor?" · "Şu an en iyi çalışan hook'lar neler?" · "Yüksek izlenmeli küçük kanal outlier'ları bul" · "İlham için hangi komşu nişlere bakmalıyım?" · "Son dönemde hangi konular beklenenden iyi gidiyor?"

Klasör modu: "Bu klasördeki hook'lardan ne öğrenebilirim?" · "Buradaki hangi kalıp en çok izlenmeyi getirir?" · "Bu klasörden ilhamla 10 başlık yaz" · "Buradaki ortak paketleme kalıpları neler?"

**Teknik:** Gemini 2.5 Flash; sistem prompt'a kullanıcının nişi + sorguyla eşleşen ilk N outlier video (başlık, çarpan, izlenme, kanal) JSON olarak enjekte edilir (RAG-lite). Klasör modunda klasördeki videolar bağlam olur. Sohbet geçmişi `chats/chat_messages` tablolarında.

### 3.7 Faz 2+ özellikleri

Thumbnail Studio (Gemini görsel üretim/analiz + Stripe kredi paketleri 500–4500; persona 50 kredi mantığı) · Databases (küratörlü listeler) · Chrome eklentisi (MV3: YouTube üstüne çarpan rozeti overlay + tek tık kaydet) · paylaşım sayfaları · `/player` · Learn · mobil (Faz 3) · MCP sunucusu (Faz 3).

---

## 4. Teknik Mimari

### 4.1 Genel şema

```
┌────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ GitHub Actions │────▶│  Ingestion script    │────▶│   Supabase        │
│ (cron 6 saatte │     │  (Node/TS)           │     │   Postgres + RLS  │
│  bir, ücretsiz)│     │  YouTube Data API v3 │     │   Auth + Storage  │
└────────────────┘     │  kota yöneticisi     │     └────────┬─────────┘
                       │  outlier skorlayıcı  │              │
                       └─────────────────────┘              │
                                                             ▼
┌────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  viralab.dev   │     │  app.viralab.dev     │     │  Route Handlers   │
│  (pazarlama,   │◀───▶│  Next.js App Router  │◀───▶│  /api/* : arama,  │
│  aynı repo)    │     │  Vercel              │     │  chat(Gemini),    │
└────────────────┘     └─────────────────────┘     │  stripe webhook   │
                                                    └──────────────────┘
```

**Tek monorepo, tek Vercel projesi.** Pazarlama sayfaları ve uygulama aynı Next.js projesinde (route group'larla ayrılır: `(marketing)` / `(app)`). İkinci domain gerektiğinde Vercel'de domain mapping.

### 4.2 Stack kararları

| Katman | Seçim | Gerekçe |
|---|---|---|
| Frontend/backend | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** | Velio ile aynı aile; tek repo, Vercel'e sıfır sürtünme |
| DB + Auth | **Supabase** (Postgres + RLS, e-posta/şifre + Google OAuth) | Velio da Supabase auth kullanıyor; RLS ile kullanıcı verisi izolasyonu |
| Hosting | **Vercel** (app) + **GitHub** (repo + Actions cron) | Velio da Vercel'de |
| Ingestion çalışma zamanı | **GitHub Actions scheduled workflow** (6 saatte bir; job başına 6 saate kadar) | Ücretsiz compute; Vercel function süre limitine takılmaz. Ölçeklenince Hetzner worker'a taşınır |
| AI | **Gemini 2.5 Flash** (chat) + `text-embedding-004` (Faz 2 semantik arama, pgvector) | Ücretsiz kota + düşük maliyet + iyi Türkçe |
| Ödeme | **Stripe** (test modu → canlı) | Kullanıcı kararı; Velio ile aynı. TRY fiyat desteği mevcut |
| Arama (MVP) | Postgres `tsvector` (turkish config) + `pg_trgm` | Ek servis yok; 1M video'ya kadar rahat |
| E-posta (Faz 2) | Resend | Uyarı mailleri |
| Analitik | PostHog (ücretsiz kademe) | Velio ile aynı |
| Hata izleme | Sentry (ücretsiz kademe) | Velio ile aynı |

### 4.3 Veri boru hattı

**Kota tasarımı (günlük 10.000 birim/proje):** `search.list`'ten (100 birim) kaçın; `channels.list` (1) → uploads playlist → `playlistItems.list` (1/50 video) → `videos.list` (1/50 video, toplu). Tek anahtarla **~500K video istatistiği/gün** kapasitesi.

**Akış:**
1. **Seed:** `seeds/channels.json` — niş başına elle küratörlü TR kanalları (başlangıç: 1 niş × 100–300 kanal; hedef: 8 niş × 2.000+ kanal). Admin panelinden ekleme.
2. **Kanal senkronu:** kanal meta + uploads playlist ID (1 birim/kanal).
3. **Video keşfi:** playlistItems ile tüm video ID'leri (sayfalı).
4. **İstatistik çekimi:** `videos.list` 50'li partiler; `videos` upsert + `view_snapshots` insert.
5. **Tazeleme öncelikleri:** yaş < 7 gün → her cron'da (6 saatte bir) · 7–30 gün → günde 1 · > 30 gün → haftada 1 · takip edilen kanallar → +1 öncelik seviyesi.
6. **Skorlama:** her çekimden sonra kanal medyanı ve video skorları yeniden hesaplanıp kolonlara yazılır (okuma anında hesap yok).
7. **Mock modu:** `INGEST_MODE=mock` → API anahtarı olmadan gerçekçi sahte veri üretir (geliştirme/demolar için).

**Outlier algoritması:**
```
kanal_medyani = medyan(izlenme | kanalın 30 günden eski videoları), min 10 video şartı
carpan        = video_izlenme / kanal_medyani
vpd           = video_izlenme / max(video_yasi_gun, 1)        # ivme
izl_abone     = video_izlenme / abone_sayisi                   # boyuttan bağımsız sinyal
etkilesim     = (begeni + yorum) / izlenme
```
Faz 2: yaşa-göre normalizasyon (kanalın "X günlük videosu normalde ne alır" eğrisi) + snapshot'lardan 24 saatlik ivme uyarıları.

### 4.4 Güvenlik

- RLS: tüm kullanıcı tabloları `auth.uid()` politikalı; `videos/channels` herkese okunur (yalnızca authenticated), yazma sadece service-role.
- Ingestion service-role anahtarı yalnızca GitHub Actions secret'ında.
- Stripe webhook imza doğrulaması; Gemini anahtarı yalnızca sunucu tarafında.
- Rate limit: arama API'sine kullanıcı başına dakikalık limit (Upstash Redis ya da Postgres tabanlı, Faz 1'de basit).

---

## 5. Veri Modeli (Supabase migration özeti)

```sql
-- İçerik indeksi (herkese okunur, worker yazar)
channels(id text pk, title, handle, avatar_url, country, niche_id fk, subscribers bigint,
         total_views bigint, video_count int, published_at timestamptz, uploads_playlist text,
         median_views bigint, last_synced_at, priority smallint default 0)
niches(id serial pk, slug text unique, name text)
videos(id text pk, channel_id fk, title, thumb_url, published_at timestamptz,
       duration_sec int, is_short bool, views bigint, likes bigint, comments bigint,
       engagement numeric, outlier_score numeric, views_per_day numeric,
       views_to_subs numeric, title_tsv tsvector, updated_at)
view_snapshots(video_id fk, captured_at timestamptz, views bigint, pk(video_id, captured_at))

-- Kullanıcı alanı (RLS: auth.uid())
profiles(id uuid pk = auth.users, display_name, niche_id fk, youtube_channel_id,
         plan text default 'free', stripe_customer_id, created_at)
folders(id uuid pk, user_id fk, name, created_at)
saved_videos(id uuid pk, user_id fk, folder_id fk, video_id fk, note text, created_at)
tags(id uuid pk, user_id fk, name)
saved_video_tags(saved_video_id fk, tag_id fk, pk(both))
tracked_channels(id uuid pk, user_id fk, channel_id fk, list_id fk null, created_at)
channel_lists(id uuid pk, user_id fk, name)
alerts(id uuid pk, user_id fk, kind text, threshold numeric default 3, active bool)
notifications(id uuid pk, user_id fk, type, payload jsonb, read_at, created_at)
chats(id uuid pk, user_id fk, folder_id fk null, title, created_at)
chat_messages(id uuid pk, chat_id fk, role text, content text, created_at)
subscriptions(user_id pk fk, stripe_subscription_id, status, price_id,
              current_period_end, cancel_at_period_end bool)

-- İndeksler
videos(outlier_score desc), videos(published_at desc), videos(channel_id),
videos USING gin(title_tsv), view_snapshots(video_id, captured_at desc)
```

---

## 6. Fiyatlandırma & Stripe

**Model:** Velio'nun tek-paket modeli + TR satın alma gücü + ücretsiz kademe (Velio'nun en çok şikâyet edilen eksiği).

| Plan | Fiyat | İçerik |
|---|---|---|
| **Ücretsiz** | ₺0 | Günde 5 arama, 1 klasör, 10 kayıt, 2 takipli kanal — "tadımlık", karta gerek yok |
| **Pro Aylık** | **₺349/ay** | Sınırsız arama · gelişmiş filtreler · sınırsız kayıt · sınırsız rakip takibi · uyarılar · AI chat · "Varoluş Krizi Geçir" |
| **Pro Yıllık** | **₺249/ay** (₺2.988/yıl, "%28,5 İNDİRİM" rozeti) | Aynısı |
| Lansman kuponu | İlk ay %75 → **₺87** | Partner landing sayfalarında (attribution ile, kupon kodu sızıntısı yok) |

**Stripe kurulumu:** Product `viralab_pro` + Price'lar (`pro_monthly_try`, `pro_annual_try`), Checkout Session (subscription mode), Customer Portal (iptal/duraklatma), webhook'lar: `checkout.session.completed`, `customer.subscription.updated/deleted` → `subscriptions` tablosu. Test modunda geliştirilir; canlıya geçiş = anahtar değişimi.

---

## 7. GTM Planı (TR)

### 7.1 Creator funnel (Velio playbook'unun TR kopyası)

1. **Çapa partner:** "YouTube nasıl büyür" nişinde 50K+ aboneli 1-2 Türk eğitimci — sponsorluk değil, **%40 ömür boyu gelir ortaklığı** teklifi.
2. **Testimonial duvarı:** 8-10 orta boy Türk YouTuber'a (20K–500K) ücretsiz erişim → alıntı + abone sayısı → duvar aynı zamanda partner vitrini.
3. **Ambassador master şablonu:** `/[creator]` sayfası — kişiselleşen alanlar sadece: isim/foto/abone, birinci ağız selamlama ("Selam, ben X..."), indirim katmanı (%75 standart, en büyük partnere %90), kapanış alıntısı. Hedef: yeni partner sayfası < 1 saat.
4. **Affiliate programı:** %40 ömür boyu, başvuru formlu (nasıl tanıtacaksın + hesap linki). Velio'nun aksine çerez süresi ve ödeme şartları **kamuya açık** yazılır (rekabet avantajı).
5. **UTM disiplini:** `utm_campaign=<kanal>`, `utm_content=<video/ders>` — hangi varlığın sattığı ölçülür.

### 7.2 Fiyat çapası dili

"Bir döner parasına" / "iki kahve parasına" — Velio'nun "less than the cost of dinner" kalıbının yerelleştirilmesi; partner sayfalarında kişiye göre değişir (döner/kahve/öğle yemeği).

### 7.3 Programatik SEO (Faz 2)

Tek anahtar kelime evreni: **"youtube video fikirleri"** × 4 eksen (Velio taksonomisinin TR'si):
- **Niş sayfaları (~40):** "oyun kanalı için youtube video fikirleri", "yemek", "vlog", "finans/borsa", "kripto", "gezi", "fitness", "teknoloji inceleme", "emlakçılar için", "e-ticaret markaları için", "Shorts için"...
- **Ticari (~20):** "en iyi youtube video fikri aracı", "yapay zeka youtube başlık üretici", "youtube trend konular aracı", "ücretsiz youtube analiz aracı"...
- **Alt-huni (~15):** "youtube video fikir aracı fiyatları", "vidIQ Türkçe alternatifi", "TubeBuddy alternatifi", "inceleme", "ücretsiz deneme"... (TR SERP'te bu kategori bomboş — kategoriyi yaratıp sahiplenme oyunu)
- **Nasıl-yapılır (~15):** "youtube'da izlenme nasıl artırılır", "viral video konusu nasıl bulunur", "yüksek CTR başlık formülleri", "rakip kanal analizi nasıl yapılır"...

Şablon: H1=anahtar kelime+fayda · hook giriş · TOC · 5 H2 + H3 kontrol listeleri · 1 karşılaştırma tablosu · 6 soruluk SSS (biri ürün itirazı) · kapanış CTA. Velio'nun yapmadıkları eklenir: JSON-LD (FAQPage/Article), çift slug temizliği, gerçek alt-text.

### 7.4 Sıralı lansman

Hafta 1-2: çapa partner + şablon + affiliate altyapı → Hafta 2-6: 10 eğitimciye ücretsiz erişim, alıntı toplama → Hafta 6-10: partner videolarıyla senkron 3 co-branded sayfa (%75 teklif) → sonra: self-serve affiliate + yıllık plan + win-back + pSEO.

---

## 8. Hukuk & Uyumluluk

### 8.1 YouTube API Services (zorunlu — Velio'nun eksik yaptığı yerler dahil)

- [ ] Gizlilik politikasında **"YouTube API Services kullanır"** açık beyanı
- [ ] **YouTube ToS** (youtube.com/t/terms) ve **Google Gizlilik Politikası** linkleri
- [ ] Hangi API verisinin toplandığı/saklandığı/paylaşıldığının dökümü
- [ ] Kullanıcıya **Google güvenlik ayarları** üzerinden erişim iptali yolu (security.google.com/settings/security/permissions)
- [ ] OAuth ile alınan yetkili veri ≤ **30 günde** tazelenir/silinir; iptalde silinir
- [ ] Veri **yalnızca resmî API'den** — scraping yok
- [ ] Metrikler değiştirilmeden gösterilir, YouTube'a geri link verilir
- [ ] API verisi reklam hedefleme/satış için kullanılmaz
- [ ] Kota: varsayılan 10K birim/gün; büyüme için quota extension audit planı
- [ ] YouTube scope'ları için Google OAuth **app verification** (lansman öncesi)

### 8.2 TR + genel

KVKK aydınlatma metni + veri envanteri · çerez onayı (PostHog/analitik için) · Mesafeli Satış Sözleşmesi + cayma hakkı düzeni (dijital hizmet istisnası: anında ifa onayıyla) · Stripe faturalarında vergi (canlıya geçişte muhasebe danışmanlığı) · iade politikası: "ilk ay risksiz" vaadi + yasal haklar uyumlu yazılır (Velio'nun "hiç iade yok" maddesi TR tüketici hukukunda geçersiz olurdu).

---

## 9. Yol Haritası

| Sprint | Hafta | Teslimat |
|---|---|---|
| **S0 — Plan** | ✅ | Bu doküman |
| **S1 — İskelet** | 1-2 | Next.js + Supabase kurulum, migration'lar, auth (e-posta+Google), koyu tema tasarım sistemi, layout kabuğu |
| **S2 — Veri** | 3-4 | Ingestion script (gerçek + mock mod), outlier skorlama, GitHub Actions cron, admin seed ekranı, 1 niş × 100+ TR kanalı canlı |
| **S3 — Çekirdek UI** | 5-6 | Keşfet akışı + 12 filtre + sıralama + video kartları; klasör/etiket/not; kanal takibi + listeler; bildirimler |
| **S4 — AI + Para** | 7-8 | Fikir Doğrulayıcı (Gemini), Stripe checkout + portal + webhook + plan kapıları, TR landing page, Vercel deploy → **beta** |
| **Faz 2** | 9+ | Chrome eklentisi, Shorts görünümü, Databases, pSEO motoru, e-posta uyarıları, embedding araması, Thumbnail Studio, partner sayfaları |
| **Faz 3** | — | Mobil, MCP sunucusu, win-back VSL, kurslar/Discord |

**MVP kapsam dışı (bilinçli):** thumbnail üretimi, mobil, MCP, Mux player, koltuk satışı, Metronome tarzı kullanım faturalama.

---

## 10. Maliyet Modeli (MVP)

| Kalem | Aylık |
|---|---|
| Vercel Hobby→Pro | $0 → $20 |
| Supabase Free→Pro | $0 → $25 |
| YouTube Data API | $0 (kota) |
| Gemini Flash (chat, ~1K sohbet) | ~$1-5 |
| GitHub Actions (cron) | $0 (public/ücretsiz dakika) |
| Domain viralab.dev | ~$1 (yıllık ~$12) |
| PostHog/Sentry/Resend ücretsiz kademeler | $0 |
| **Toplam** | **< $50/ay** |

Başabaş: ₺349 planında ~5-6 abone. Karşılaştırma: Velio'nun tahmini on binlerce ziyaret/ay ve "5.000+ kullanıcı" rozetiyle bu model $35 fiyatla tek başına ayakta duruyor.

---

## 11. Riskler & Önlemler

| Risk | Önlem |
|---|---|
| YouTube API kotası büyümeyi sınırlar | Ucuz endpoint tasarımı (500K video/gün/anahtar); çok proje; quota audit başvurusu |
| Google OAuth verification gecikmesi | MVP'de YouTube bağlama opsiyonel; e-posta+Google login verification'sız çalışır |
| Kanal evreni dar kalır | Outlier çıkan kanalların otomatik evrene eklenmesi; admin hızlı-ekleme; topluluk önerileri |
| TR ödeme gücü / churn | Ücretsiz kademe + ₺ fiyat + yıllık indirim + duraklatma akışı (Velio'nun retention silahı) |
| vidIQ/1of10 TR'ye ağırlık verir | Hız + yerel dil + yerel creator ortaklıkları + TR niş küratörlüğü hendeği |
| Tek kişilik operasyon yükü | Otomasyon-öncelikli: cron ingestion, programatik SEO, şablonlaşmış partner sayfaları |
| Marka adı ileride değişebilir | Kod tarafında marka tek yerde (`config/brand.ts`) — isim/logo/renk tek dosyadan değişir |

---

## 12. Başarı Metrikleri

- **Aktivasyon:** kayıt → ilk arama → ilk video kaydı (hedef: %40 ilk oturumda)
- **AHA metriği:** ilk 7 günde ≥ 3 outlier kaydı yapan kullanıcı oranı
- **Dönüşüm:** ücretsiz → Pro %5-8 (partner trafiğinde %15+)
- **Elde tutma:** aylık logo churn < %8 (yıllık plan payı ile düşürülür)
- **Kuzey Yıldızı:** haftada aktif araştırma yapan (arama + kayıt) abone sayısı
- **GTM:** partner sayfası dönüşümü ≥ ana sayfa × 2 (Velio'da kanıtlanmış kalıp)

---

## Ek A — Landing kopyası (TR, Velio yapısı birebir)

- **Hero:** "İzlenmeyen video çekmeyi bırak" / "Viralab, milyonlarca videoyu tarayıp kanalını patlatacak fikirleri, başlıkları, thumbnail'ları ve hook'ları bulur." / CTA: "HEMEN BAŞLA"
- **3 adım:** "Kanalın için steroid gibi — ama yasal" → 1) "Viral kalıpları çöz" 2) "Rakiplerini gözetle" 3) "İzlenmeyi topla"
- **Derin bloklar:** "Milyonlarca izlenme getiren formülleri nokta atışı bul" · "Rakiplerin nasıl kazandığını gör, arayı kapat" · "Tüm araştırmanı tek yerde topla"
- **Fiyat bölümü:** "Sıradaki videon patlamaya hazır mı?" / "İzlenmeyen video çekme kısır döngüsünü kır."
- **Final CTA:** "Viralab'i bugün dene — ilk ayın bir döner parasına."
- **Destek 4'lüsü:** Kaynak Kasası · Yardım Merkezi · Discord Topluluğu · Online Kurslar

## Ek B — Uygulama sözlüğü (TR UI metinleri)

Keşfet · Filtreler · Kaydedilenler · Kanallarım · Uyarılar · Bildirimler · Fikir Doğrulayıcı · Çarpan · Medyan izlenme · "Benzer videoları gör" · "Kanalı takip et" · "Klasöre kaydet" · "Etiket yönet" · "Not ekle" · "Tümünü sıfırla" · "Bugün / Bu Hafta / Geçen Hafta / Bu Ay / Geçen Ay / Tüm Zamanlar" · "Outlier skoru / Yükleme tarihi / Alaka" · "Sonuç yok — filtreleri genişletmeyi dene"
