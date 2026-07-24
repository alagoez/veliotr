"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { brand } from "@/config/brand";

const FEATURES = [
  "Sınırsız arama",
  "Gelişmiş filtreler",
  "Sınırsız video kaydetme",
  "Sınırsız rakip takibi",
  "Viral uyarıları",
  "Fikir Doğrulayıcı (AI)",
  "Varoluş Krizi Geçir",
];

export function Billing() {
  const params = useSearchParams();
  const status = params.get("status");
  const [busy, setBusy] = useState<"monthly" | "annual" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const checkout = async (plan: "monthly" | "annual") => {
    setBusy(plan);
    setNotice(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(
        data.message ??
          "Ödeme başlatılamadı. Stripe anahtarları eklenince bu buton gerçek Checkout'a gider.",
      );
    } catch {
      setNotice("Bağlantı hatası — tekrar dene.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[860px] px-5 py-6">
      <h1 className="font-display text-xl font-semibold">Abonelik</h1>
      <p className="mt-1 text-sm text-muted">
        Sıradaki videon patlamaya hazır mı? İzlenmeyen video çekme kısır döngüsünü kır.
      </p>

      {status === "success" && (
        <div className="mt-4 rounded-xl border border-pos/40 bg-pos/10 p-4 text-sm text-pos">
          Ödeme başarılı! {brand.name} Pro aktif — iyi araştırmalar 🎉
        </div>
      )}
      {status === "cancelled" && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          Ödeme iptal edildi. Fikrini değiştirirsen buradayız.
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-xl border border-glow/30 bg-glow/10 p-4 text-sm text-glow">
          {notice}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Yıllık */}
        <div className="relative rounded-2xl border border-brand/50 bg-surface p-6">
          <span className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
            {brand.pricing.discountBadge}
          </span>
          <p className="text-sm font-medium text-muted">Pro Yıllık</p>
          <p className="mt-2">
            <span className="font-display text-3xl font-bold">
              {brand.pricing.currency}
              {brand.pricing.annualMonthly}
            </span>
            <span className="text-sm text-muted">/ay</span>
          </p>
          <p className="text-xs text-faint">
            yıllık {brand.pricing.currency}
            {brand.pricing.annualTotal.toLocaleString("tr-TR")} ·{" "}
            <s>
              {brand.pricing.currency}
              {brand.pricing.monthly}/ay
            </s>
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink/90">
                <Check size={14} className="text-pos" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => checkout("annual")}
            disabled={busy !== null}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            <Zap size={15} />
            {busy === "annual" ? "Yönlendiriliyor..." : "HEMEN BAŞLA"}
          </button>
          <p className="mt-2 text-center text-[11px] text-faint">*İstediğin zaman iptal et</p>
        </div>

        {/* Aylık */}
        <div className="rounded-2xl border border-edge bg-surface p-6">
          <p className="text-sm font-medium text-muted">Pro Aylık</p>
          <p className="mt-2">
            <span className="font-display text-3xl font-bold">
              {brand.pricing.currency}
              {brand.pricing.monthly}
            </span>
            <span className="text-sm text-muted">/ay</span>
          </p>
          <p className="text-xs text-faint">taahhüt yok</p>
          <ul className="mt-4 flex flex-col gap-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink/90">
                <Check size={14} className="text-pos" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => checkout("monthly")}
            disabled={busy !== null}
            className="mt-5 w-full rounded-xl border border-edge bg-raised py-3 text-sm font-semibold text-ink transition-colors hover:border-brand/50 disabled:opacity-50"
          >
            {busy === "monthly" ? "Yönlendiriliyor..." : "HEMEN BAŞLA"}
          </button>
          <p className="mt-2 text-center text-[11px] text-faint">*İstediğin zaman iptal et</p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-faint">
        İlk ayını riske girmeden dene — bir döner parasına.
      </p>
    </div>
  );
}
