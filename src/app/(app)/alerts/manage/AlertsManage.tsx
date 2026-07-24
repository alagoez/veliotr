"use client";

import { BellRing } from "lucide-react";
import { useStore } from "@/lib/store";

const THRESHOLDS = [2, 3, 5, 10] as const;

export function AlertsManage() {
  const store = useStore();

  return (
    <div className="mx-auto max-w-[680px] px-5 py-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">Uyarıları Yönet</h1>
      <p className="mt-1 text-sm text-muted">
        Takip ettiğin bir kanal viral video çıkardığında ne zaman haber verelim?
      </p>

      <div className="mt-6 glass-panel p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pos/15 text-pos">
            <BellRing size={18} />
          </span>
          <div>
            <p className="text-sm font-medium">Viral eşiği (çarpan)</p>
            <p className="text-xs text-muted">
              Video, kanal medyanının bu katına ulaşırsa &quot;viral&quot; sayılır.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {THRESHOLDS.map((t) => (
            <button
              key={t}
              onClick={() => store.setAlertThreshold(t)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                store.alertThreshold === t
                  ? "border-pos/50 bg-pos/15 text-pos"
                  : "border-edge bg-raised text-muted hover:text-ink"
              }`}
            >
              {t}x+
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-faint">
          Şu an <span className="text-ink">{store.tracked.length}</span> kanal takip
          ediyorsun. Uyarılar Kanallarım ve Bildirimler sayfalarında görünür; e-posta
          bildirimi Faz 2&apos;de geliyor (bkz. plan.md yol haritası).
        </p>
      </div>
    </div>
  );
}
