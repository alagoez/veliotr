import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { brand } from "@/config/brand";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { fmtCompact, fmtMultiplier } from "@/lib/format";
import { Sss } from "./Sss";

export const metadata: Metadata = { title: `${brand.name} — ${brand.tagline}` };

/** Örnekler saatte bir tazelenir; her istekte veritabanına gitmenin anlamı yok. */
export const revalidate = 3600;

type Ornek = {
  id: string;
  title: string;
  thumb: string | null;
  channel: string;
  subs: number;
  views: number;
  median: number;
  score: number;
};

type Vitrin = { videolar: number; kanallar: number; izlenme: number; nisler: number[] };

/**
 * Sayfadaki her rakam ve her örnek CANLI veritabanından.
 *
 * Ürünün tek cümlesi "bu küçük kanal bunu yaptı ve patladı". Bunu anlatmanın
 * en dürüst yolu o an indekste duran gerçek bir örneği göstermek — uydurma
 * bir mockup aynı cümleyi kuramaz. Küçük kanal (<100 B abone) şartı kasten:
 * ürünün ayırt edici tarafı büyük kanalın viral videosu değil, küçüğün
 * patlaması.
 */
async function veri(): Promise<{ ornekler: Ornek[]; vitrin: Vitrin | null }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ornekler: [], vitrin: null };
  }
  try {
    const db = createAdminSupabase();
    const [videos, ozet, bars] = await Promise.all([
      db
        .from("videos")
        .select(
          "id, title, thumb_url, views, outlier_score, is_short, channels!inner(title, subscribers, median_views_short, median_views_long)",
        )
        .gt("outlier_score", 0)
        .lt("channels.subscribers", 100_000)
        .order("outlier_score", { ascending: false })
        .limit(6),
      db.from("landing_stats").select("videolar, kanallar, izlenme, nisler").maybeSingle(),
      db.from("landing_niche_bars").select("adet").limit(15),
    ]);

    const ornekler: Ornek[] = (videos.data ?? []).map((r) => {
      const c = r.channels as unknown as {
        title: string; subscribers: number;
        median_views_short: number; median_views_long: number;
      };
      return {
        id: r.id as string,
        title: r.title as string,
        thumb: (r.thumb_url as string | null) ?? null,
        channel: c.title,
        subs: c.subscribers,
        views: r.views as number,
        median: (r.is_short ? c.median_views_short : c.median_views_long) || 0,
        score: r.outlier_score as number,
      };
    });

    const s = ozet.data as { videolar: number; kanallar: number; izlenme: number } | null;
    return {
      ornekler,
      vitrin: s
        ? {
            videolar: Number(s.videolar),
            kanallar: Number(s.kanallar),
            izlenme: Number(s.izlenme),
            nisler: (bars.data ?? []).map((b) => Number((b as { adet: number }).adet)),
          }
        : null,
    };
  } catch {
    return { ornekler: [], vitrin: null };
  }
}

function Cta({ children = "Ücretsiz başla", tone = "primary" }: { children?: string; tone?: "primary" | "ghost" }) {
  return (
    <Link href="/signin" className={tone === "primary" ? "lp-btn lp-btn--primary" : "lp-btn lp-btn--ghost"}>
      <span>{children}</span>
      {tone === "primary" && <ArrowRight size={16} />}
    </Link>
  );
}

/** Uygulamanın Keşfet ekranı — gerçek thumbnail, gerçek çarpan. */
function Pencere({ list, dar = false }: { list: Ornek[]; dar?: boolean }) {
  return (
    <div className={`lp-window${dar ? " lp-window--dar" : ""}`} role="img" aria-label="Keşfet ekranı önizlemesi">
      <div className="lp-window-rail">
        <span className="lp-window-dot lp-window-dot--on" />
        <span className="lp-window-dot" />
        <span className="lp-window-dot" />
        <span className="lp-window-dot" />
      </div>
      <div className="lp-window-body">
        <div className="lp-window-head">
          <span className="lp-window-title">Keşfet</span>
          <span className="lp-window-chip">Outlier ↓</span>
          <span className="lp-window-chip">10x+</span>
          <span className="lp-window-chip">Mikro</span>
        </div>
        <div className="lp-window-grid">
          {list.map((v) => (
            <div key={v.id} className="lp-window-card">
              <div className="lp-window-thumb">
                {v.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumb} alt="" loading="lazy" />
                )}
                <span>{fmtMultiplier(v.score)}</span>
              </div>
              <p className="lp-window-jump">
                {fmtCompact(v.subs)} <i>→</i> <strong>{fmtCompact(v.views)}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const OZELLIKLER = [
  {
    etiket: "KEŞFET",
    baslik: "Kanalın normalini aşan videoyu bul.",
    metin:
      "Çarpan, izlenme sayısı değil — videonun kendi kanalının kaç katını yaptığı. 50 bin izlenme bir kanal için sıradan, bir başkası için rekor. Sıralama abone sayısına göre değil, bu farka göre.",
    madde: ["11 aralık filtresi", "Kanal boyutu ön ayarları", "Shorts / uzun video ayrımı"],
  },
  {
    etiket: "KANALLARIM",
    baslik: "Rakiplerini izle, patladıklarında haberin olsun.",
    metin:
      "Kanal linkini yapıştır, radara girsin. Takip ettiğin bir kanalın videosu kendi normalini aştığı anda bildirim düşer — sen fark etmeden önce.",
    madde: ["Sınırsız kanal takibi", "Eşik bazlı uyarı", "İsimli listeler"],
  },
  {
    etiket: "FİKİR DOĞRULAYICI",
    baslik: "Ne çekeceğini konuşarak netleştir.",
    metin:
      "Nişindeki outlier'ları bağlam olarak alan bir sohbet. \"Bu klasördeki hook'lardan ne öğrenebilirim?\" diye sor, veriye dayalı cevap al.",
    madde: ["Nişine göre bağlam", "Klasör bazlı analiz", "Başlık ve hook önerisi"],
  },
] as const;

export default async function LandingPage() {
  const { ornekler: list, vitrin: stats } = await veri();
  const ilk3 = list.slice(0, 3);
  const son3 = list.slice(3, 6);

  return (
    <main>
      {/* ── 2 · HERO ──────────────────────────────────────────────────────
          Tek kolon + center değil: başlık kendi genişliğinde (--w-title),
          açıklama daha dar (--w-text), CTA'lar yan yana. Huni şekli göz
          yukarıdan aşağı daralarak butona insin diye. */}
      <section className="lp-hero">
        <div className="lp-container">
          <h1>Viral olmuş video fikirlerini, nişleri bulun. Sıradaki viral video sizinki olsun.</h1>
          <p className="lp-lede">
            Viralab her videoyu kendi kanalının normaliyle kıyaslar. 16 bin aboneli bir kanalın
            9 milyon izlenen videosunu bulur — ve senin nişinde işe yaramış fikirleri önüne koyar.
          </p>
          <div className="lp-cta">
            <Cta />
            <Cta tone="ghost">Nasıl çalışır</Cta>
          </div>
        </div>
      </section>

      {/* ── 3 · ÜRÜN GÖRSELİ ─────────────────────────────────────────────
          Sahte ekran görüntüsü değil: uygulamanın kendi arayüzü, kendi
          verisiyle yeniden kuruldu. Altında canlı rakamlar. */}
      {ilk3.length === 3 && (
        <section className="lp-stage">
          <div className="lp-container">
            <Pencere list={ilk3} />
            {stats && (
              <dl className="lp-stats">
                <div>
                  <dt>video taranıyor</dt>
                  <dd>{stats.videolar.toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>kanal takipte</dt>
                  <dd>{stats.kanallar.toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>indekslenen izlenme</dt>
                  <dd>{fmtCompact(stats.izlenme)}</dd>
                </div>
                <div>
                  <dt>kategori</dt>
                  <dd>{stats.nisler.length || 15}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      )}

      {/* ── 4 · ÖZELLİKLER — dönüşümlü yerleşim ──────────────────────────
          Üç küçük kart yerine üç geniş blok: sol metin / sağ görsel, sonra
          tersi. Editorial his buradan geliyor. */}
      <section className="lp-section lp-features">
        <div className="lp-container">
          <div className="lp-head lp-measure">
            <h2>Araştırmanın tamamı tek yerde.</h2>
            <p>Fikir bulmaktan rakip izlemeye, kaydetmekten doğrulamaya — dağınık sekmelerle uğraşmadan.</p>
          </div>

          {OZELLIKLER.map((o, i) => (
            <article key={o.etiket} className={`lp-feature${i % 2 === 1 ? " lp-feature--ters" : ""}`}>
              <div className="lp-feature-text">
                <p className="lp-eyebrow">{o.etiket}</p>
                <h3>{o.baslik}</h3>
                <p className="lp-feature-desc">{o.metin}</p>
                <ul className="lp-ticks">
                  {o.madde.map((m) => (
                    <li key={m}>
                      <Check size={15} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lp-feature-visual">
                {i === 0 && ilk3.length === 3 && <Pencere list={ilk3} dar />}
                {i === 1 && son3.length === 3 && (
                  <div className="lp-panel">
                    <p className="lp-panel-title">Takip edilen kanallar</p>
                    {son3.map((v) => (
                      <div key={v.id} className="lp-row">
                        <span className="lp-row-name">{v.channel}</span>
                        <span className="lp-row-sub">{fmtCompact(v.subs)} abone</span>
                        <span className="lp-row-badge">{fmtMultiplier(v.score)}</span>
                      </div>
                    ))}
                    <div className="lp-alert">
                      <b>Uyarı</b> {son3[0].channel} normalini {fmtMultiplier(son3[0].score)} aştı
                    </div>
                  </div>
                )}
                {i === 2 && ilk3.length > 0 && (
                  <div className="lp-panel lp-panel--chat">
                    <p className="lp-bubble lp-bubble--user">Nişimde şu an ne tutuyor?</p>
                    <p className="lp-bubble">
                      Son 90 günde en çok öne çıkan kalıp: kısa format, ilk 2 saniyede soru.
                      Örnek — <b>{ilk3[0].channel}</b>, {fmtCompact(ilk3[0].subs)} aboneyle{" "}
                      {fmtCompact(ilk3[0].views)} izlenme aldı.
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 5 · FARKLILAŞMA ──────────────────────────────────────────────
          Metodoloji sayfanın en güçlü kozu: ölçüm gerçekten farklı ve
          rakamlar gerçek. */}
      {stats && (
        <section className="lp-section lp-diff">
          <div className="lp-container">
            <div className="lp-head lp-measure">
              <h2>Çarpanı doğru ölçen tek yer.</h2>
              <p>
                Bir Short&apos;u uzun video ortalamasına bölmek içeriğin başarısını değil, formatın
                izlenme farkını ölçer. Marka kanalları da satın alınmış izlenmeyle sıralamayı bozar.
                İkisini de eliyoruz.
              </p>
            </div>
            <div className="lp-diff-grid">
              <div className="lp-diff-item">
                <p className="lp-diff-num">2</p>
                <p className="lp-diff-label">ayrı medyan</p>
                <p className="lp-diff-desc">Shorts ve uzun video ayrı ayrı ölçülür; çarpan kendi formatına göre çıkar.</p>
              </div>
              <div className="lp-diff-item">
                <p className="lp-diff-num">%2</p>
                <p className="lp-diff-label">organiklik eşiği</p>
                <p className="lp-diff-desc">Medyanı abone sayısının %2&apos;sinin altında kalan kanal skorlanmaz — o rakam satın alınmış izlenmenin izidir.</p>
              </div>
              <div className="lp-diff-item">
                <p className="lp-diff-num">100x</p>
                <p className="lp-diff-label">yayılım tavanı</p>
                <p className="lp-diff-desc">Videolarının çoğu ölü, birkaçı patlamış kanallar elenir. Gerçek üreticide dağılım pürüzsüzdür.</p>
              </div>
              {stats.nisler.length > 0 && (
                <div className="lp-diff-item lp-diff-item--grafik">
                  <p className="lp-diff-label">niş başına video</p>
                  <div className="lp-bars">
                    {stats.nisler.map((n, i) => (
                      <i key={i} style={{ height: `${Math.max(12, (n / Math.max(...stats.nisler)) * 100)}%` }} />
                    ))}
                  </div>
                  <p className="lp-diff-desc">{stats.nisler.length} kategori, dengeli dağılım.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 7 · FİYAT ────────────────────────────────────────────────────*/}
      <section className="lp-section lp-pricing">
        <div className="lp-container">
          <div className="lp-head lp-head--orta">
            <h2>Tek plan. Gizli kademe yok.</h2>
            <p>Her şey dahil. Kart istemiyoruz, ilk keşif ücretsiz.</p>
          </div>
          <div className="lp-plans">
            <div className="lp-plan">
              <p className="lp-plan-name">Ücretsiz</p>
              <p className="lp-plan-price">
                {brand.pricing.currency}0
              </p>
              <p className="lp-plan-note">tadımlık — kart gerekmez</p>
              <ul className="lp-ticks">
                <li><Check size={15} />Günde 5 arama</li>
                <li><Check size={15} />10 kayıt, 1 klasör</li>
                <li><Check size={15} />2 kanal takibi</li>
              </ul>
              <Cta tone="ghost">Ücretsiz dene</Cta>
            </div>
            <div className="lp-plan lp-plan--one">
              <p className="lp-plan-badge">{brand.pricing.discountBadge}</p>
              <p className="lp-plan-name">Pro</p>
              <p className="lp-plan-price">
                {brand.pricing.currency}{brand.pricing.annualMonthly}
                <span>/ay</span>
              </p>
              <p className="lp-plan-note">yıllık ödemede · aylık {brand.pricing.currency}{brand.pricing.monthly}</p>
              <ul className="lp-ticks">
                <li><Check size={15} />Sınırsız arama ve filtre</li>
                <li><Check size={15} />Sınırsız kanal takibi</li>
                <li><Check size={15} />Sınırsız kaydetme ve klasör</li>
                <li><Check size={15} />Viral olduğunda uyarı</li>
                <li><Check size={15} />Fikir Doğrulayıcı (AI)</li>
              </ul>
              <Cta>Pro&apos;ya geç</Cta>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8 · SSS ──────────────────────────────────────────────────────*/}
      <Sss />

      {/* ── 10 · FİNAL CTA ───────────────────────────────────────────────*/}
      <section className="lp-final">
        <div className="lp-container">
          <h2>Sıradaki videonu şansa bırakma.</h2>
          <p>Nişinde neyin çalıştığını gör, aynısını kendi kanalında dene.</p>
          <div className="lp-cta lp-cta--orta">
            <Cta />
          </div>
        </div>
      </section>
    </main>
  );
}
