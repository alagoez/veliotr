import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { brand } from "@/config/brand";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { fmtCompact, fmtMultiplier } from "@/lib/format";
import { channelSize } from "@/config/channel-size";

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

/**
 * Ana sayfadaki kanıt GERÇEK veriden geliyor, sahte ekran görüntüsünden değil.
 *
 * Gerekçe: ürünün tek cümlesi "bu küçük kanal bunu yaptı ve patladı". Bunu
 * anlatmanın en dürüst yolu, o an veritabanında duran gerçek bir örneği
 * göstermek. Uydurma bir mockup aynı cümleyi kuramaz.
 *
 * Küçük kanal (<100 B abone) şartı kasten: ürünün ayırt edici tarafı büyük
 * kanalların viral videosu değil, küçük kanalın patlaması.
 */
async function ornekler(): Promise<Ornek[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const db = createAdminSupabase();
    const { data } = await db
      .from("videos")
      .select("id, title, thumb_url, views, outlier_score, channels!inner(title, subscribers, median_views_short, median_views_long), is_short")
      .gt("outlier_score", 0)
      .lt("channels.subscribers", 100_000)
      .order("outlier_score", { ascending: false })
      .limit(3);
    return (data ?? []).map((r) => {
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
  } catch {
    return [];
  }
}

type Vitrin = {
  videolar: number;
  kanallar: number;
  izlenme: number;
  nisler: number[];
};

/**
 * Hero altındaki vitrin rakamları — hepsi canlı veritabanından.
 *
 * Referans sitelerde bu alan tanıtım görseliyle doldurulur. Bizde gerek yok:
 * indeks gerçekten bu büyüklükte ve gerçek sayıyı göstermek uydurmadan daha
 * ikna edici. Çubuk grafik de süs değil — niş başına gerçek video dağılımı.
 */
async function vitrin(): Promise<Vitrin | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createAdminSupabase();
    const [ozet, bars] = await Promise.all([
      db.from("landing_stats").select("videolar, kanallar, izlenme, nisler").maybeSingle(),
      db.from("landing_niche_bars").select("adet").limit(15),
    ]);
    if (!ozet.data) return null;
    const s = ozet.data as { videolar: number; kanallar: number; izlenme: number; nisler: number };
    return {
      videolar: Number(s.videolar),
      kanallar: Number(s.kanallar),
      izlenme: Number(s.izlenme),
      nisler: (bars.data ?? []).map((b) => Number((b as { adet: number }).adet)),
    };
  } catch {
    return null;
  }
}

function Cta({ children = "Ücretsiz başla" }: { children?: string }) {
  return (
    <Link href="/signin" className="orange-button">
      <span>{children}</span>
      <ArrowRight size={16} />
    </Link>
  );
}

const ADIMLAR = [
  ["Kanalın normalini ölçeriz", "Her kanalın kendi ortalamasını çıkarırız — 50 bin izlenme bir kanal için sıradan, bir başkası için rekordur."],
  ["Normali aşanı yakalarız", "Bir video kendi kanalının kaç katını yaptıysa, çarpanı odur. Sıralama abone sayısına değil, bu çarpana göre."],
  ["Sen aynısını çekersin", "Konu, başlık, thumbnail — çalışmış olanı görürsün. Tahmin etmene gerek kalmaz."],
] as const;

export default async function LandingPage() {
  const [list, stats] = await Promise.all([ornekler(), vitrin()]);

  return (
    <main>
      {/* Başlığın üstünde etiket YOK: referansta da yok. Etiket dikkati
          bölüyor ve başlığı aşağı itiyor — sayfayı açan ilk gördüğü şey
          mesajın kendisi olmalı. Gradyan da kaldırıldı; düz siyah metin
          büyük puntoda daha keskin ve daha güvenli duruyor. */}
      <section className="lp-hero">
        <h1>Hangi videonun patladığını gör. Aynısını sen çek.</h1>
        <p className="lp-lede">
          Viralab her videoyu kendi kanalının normaliyle kıyaslar. 16 bin aboneli bir kanalın
          9 milyon izlenen videosunu bulur — ve senin nişinde işe yaramış fikirleri önüne koyar.
        </p>
        <div className="lp-cta">
          <Cta />
          <Link href="/ozellikler" className="lp-secondary">Nasıl çalıştığını gör</Link>
        </div>
      </section>

      {/* Vitrin: ortada uygulamanın kendisi, etrafında canlı rakamlar.
          Yüzen kartlar süs değil — hepsi veritabanından geliyor. Dar ekranda
          yüzenler gizleniyor (CSS), pencere tek başına kalıyor. */}
      {stats && list.length > 0 && (
        <section className="lp-showcase" aria-label="Viralab ekran önizlemesi ve indeks büyüklüğü">
          {/* Zikzak bağlantı çizgisi KALDIRILDI. viewBox sabit 1240×620'ydi ve
              preserveAspectRatio="none" ile esniyordu: bölümden taşıp alttaki
              başlığın ve kartların içinden geçiyordu. Saf süstü, taşıyınca
              sayfanın en büyük gürültü kaynağı oldu. */}
          <div className="lp-window" role="img" aria-label="Keşfet ekranı önizlemesi">
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
                      {fmtCompact(v.subs)} → <strong>{fmtCompact(v.views)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dört yüzen kart — altıydı, ikisi çıkarıldı. Pencere 880 → 740px
              daraltıldı: kenar boşluğu 148px'ten 218px'e çıktı, kartlar (200px)
              artık pencereye binmeden sığıyor. Önceden sığmıyorlardı, üstüne
              çıkıyorlardı. */}
          <figure className="lp-float lp-float--outlier">
            <figcaption>En yüksek çarpan</figcaption>
            {list[0].thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={list[0].thumb} alt="" loading="lazy" />
            )}
            <span className="lp-float-mult">{fmtMultiplier(list[0].score)}</span>
          </figure>

          {/* Tam sayı, kısaltma değil: fmtCompact 1.755'i "1,8 B"ye yuvarlıyordu
              ve bu hem yanlış hem de küçük bir sayı için anlamsız. */}
          <div className="lp-float lp-float--dark lp-float--kanal">
            <p className="lp-float-num">{stats.kanallar.toLocaleString("tr-TR")}</p>
            <p className="lp-float-label">kanal takipte</p>
          </div>

          <div className="lp-float lp-float--accent lp-float--video">
            ↗ {stats.videolar.toLocaleString("tr-TR")} video
          </div>

          {stats.nisler.length > 0 && (
            <div className="lp-float lp-float--grafik">
              <p className="lp-float-label">niş başına video</p>
              <div className="lp-bars">
                {stats.nisler.map((n, i) => (
                  <i key={i} style={{ height: `${Math.max(14, (n / Math.max(...stats.nisler)) * 100)}%` }} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {list.length > 0 && (
        <section className="lp-proof">
          <p className="section-kicker text-center">ŞU AN VERİTABANIMIZDA</p>
          <h2>Küçük kanal, dev izlenme.</h2>
          <div className="lp-proof-grid">
            {list.map((v) => (
              <article key={v.id} className="lp-card">
                <div className="lp-card-thumb">
                  {v.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumb} alt="" loading="lazy" />
                  ) : (
                    <div className="lp-card-thumb-empty" />
                  )}
                  <span className="lp-card-size">{channelSize(v.subs).label} kanal</span>
                  <span className="lp-card-mult">{fmtMultiplier(v.score)}</span>
                </div>
                <div className="lp-card-jump">
                  <span className="lp-card-subs">{fmtCompact(v.subs)} abone</span>
                  <ArrowRight size={14} aria-hidden />
                  <strong>{fmtCompact(v.views)}</strong>
                  <span className="lp-card-unit">izlenme</span>
                </div>
                <p className="lp-card-title">{v.title}</p>
                <p className="lp-card-meta">
                  {v.channel} · normali {fmtCompact(v.median)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="lp-steps">
        <p className="section-kicker text-center">NASIL ÇALIŞIR</p>
        <h2>Üç adım. Tahmin yok.</h2>
        <div className="lp-steps-grid">
          {ADIMLAR.map(([baslik, metin], i) => (
            <article key={baslik}>
              <span className="lp-step-no">{String(i + 1).padStart(2, "0")}</span>
              <h3>{baslik}</h3>
              <p>{metin}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-price">
        <p className="section-kicker">FİYAT</p>
        <h2>Tek plan. Gizli kademe yok.</h2>
        <div className="lp-price-card">
          <p className="lp-price-tag">
            ₺249 <span>/ay</span>
          </p>
          <p className="lp-price-note">yıllık ödemede · aylık ₺349</p>
          <ul>
            {[
              "Sınırsız arama ve filtre",
              "Sınırsız kanal takibi",
              "Sınırsız kaydetme ve klasör",
              "Viral olduğunda uyarı",
              "Fikir Doğrulayıcı (AI)",
            ].map((s) => (
              <li key={s}>
                <Check size={16} />
                {s}
              </li>
            ))}
          </ul>
          <Cta>Ücretsiz başla</Cta>
          <p className="lp-price-fine">Kart gerekmez. İlk keşif ücretsiz.</p>
        </div>
      </section>
    </main>
  );
}
