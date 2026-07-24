"use client";

import { RotateCcw } from "lucide-react";
import { NICHES } from "@/lib/demo/data";
import type { RangeFilter, SearchFilters } from "@/lib/types";

type Props = {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
};

function RangeField({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value?: RangeFilter;
  onChange: (v: RangeFilter | undefined) => void;
  step?: number;
  hint?: string;
}) {
  const set = (key: "min" | "max", raw: string) => {
    const n = raw === "" ? undefined : Number(raw);
    const next = { ...value, [key]: Number.isFinite(n as number) ? n : undefined };
    if (next.min === undefined && next.max === undefined) onChange(undefined);
    else onChange(next);
  };
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between text-xs font-medium text-muted">
        {label}
        {hint && <span className="text-[10px] text-faint">{hint}</span>}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          step={step}
          placeholder="min"
          value={value?.min ?? ""}
          onChange={(e) => set("min", e.target.value)}
          className="w-full rounded-lg border border-edge bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-faint focus:border-brand/60"
        />
        <span className="text-faint">–</span>
        <input
          type="number"
          inputMode="numeric"
          step={step}
          placeholder="max"
          value={value?.max ?? ""}
          onChange={(e) => set("max", e.target.value)}
          className="w-full rounded-lg border border-edge bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-faint focus:border-brand/60"
        />
      </div>
    </div>
  );
}

const DATE_PRESETS = [
  { v: "all", label: "Tüm Zamanlar" },
  { v: "today", label: "Bugün" },
  { v: "this-week", label: "Bu Hafta" },
  { v: "last-week", label: "Geçen Hafta" },
  { v: "this-month", label: "Bu Ay" },
  { v: "last-month", label: "Geçen Ay" },
] as const;

const MULT_CHIPS = [
  { min: 2, label: "2x+" },
  { min: 5, label: "5x+" },
  { min: 10, label: "10x+" },
] as const;

export function FilterPanel({ filters, onChange }: Props) {
  const patch = (p: Partial<SearchFilters>) => onChange({ ...filters, ...p });

  return (
    <div className="filter-panel flex w-64 shrink-0 flex-col gap-4 max-lg:w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filtreler</h2>
        <button
          onClick={() => onChange({ q: filters.q })}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink"
        >
          <RotateCcw size={12} />
          Tümünü sıfırla
        </button>
      </div>

      {/* Çarpan hızlı çipleri */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Çarpan (outlier)</p>
        <div className="mb-2 flex gap-1.5">
          {MULT_CHIPS.map((c) => (
            <button
              key={c.min}
              onClick={() =>
                patch({
                  multiplier:
                    filters.multiplier?.min === c.min ? undefined : { min: c.min },
                })
              }
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.multiplier?.min === c.min
                  ? "border-pos/50 bg-pos/15 text-pos"
                  : "border-edge bg-raised text-muted hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <RangeField
          label="Özel aralık"
          value={filters.multiplier}
          onChange={(v) => patch({ multiplier: v })}
          step={0.5}
        />
      </div>

      {/* Niş */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Niş</p>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => (
            <button
              key={n.slug}
              onClick={() =>
                patch({ niche: filters.niche === n.slug ? undefined : n.slug })
              }
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filters.niche === n.slug
                  ? "border-brand/60 bg-brand/15 text-brand-soft"
                  : "border-edge bg-raised text-muted hover:text-ink"
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tarih */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Tarih</p>
        <select
          value={filters.datePreset ?? "all"}
          onChange={(e) =>
            patch({ datePreset: e.target.value as SearchFilters["datePreset"] })
          }
          className="w-full rounded-lg border border-edge bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand/60"
        >
          {DATE_PRESETS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Format */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Format</p>
        <div className="flex gap-1.5">
          {[
            { v: undefined, label: "Hepsi" },
            { v: false, label: "Uzun video" },
            { v: true, label: "Shorts" },
          ].map((o) => (
            <button
              key={String(o.v)}
              onClick={() => patch({ isShort: o.v })}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filters.isShort === o.v
                  ? "border-glow/50 bg-glow/10 text-glow"
                  : "border-edge bg-raised text-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <RangeField label="İzlenme" value={filters.views} onChange={(v) => patch({ views: v })} />
      <RangeField
        label="Abone"
        value={filters.subscribers}
        onChange={(v) => patch({ subscribers: v })}
      />
      <RangeField
        label="Video süresi (sn)"
        value={filters.durationSec}
        onChange={(v) => patch({ durationSec: v })}
      />
      <RangeField
        label="İzlenme : Abone"
        value={filters.viewsToSubs}
        onChange={(v) => patch({ viewsToSubs: v })}
        step={0.1}
      />
      <RangeField
        label="Medyan izlenme"
        value={filters.medianViews}
        onChange={(v) => patch({ medianViews: v })}
      />
      <RangeField label="Beğeni" value={filters.likes} onChange={(v) => patch({ likes: v })} />
      <RangeField
        label="Yorum"
        value={filters.comments}
        onChange={(v) => patch({ comments: v })}
      />
      <RangeField
        label="Etkileşim oranı (%)"
        value={filters.engagement}
        onChange={(v) => patch({ engagement: v })}
        step={0.1}
        hint="(beğeni+yorum)/izlenme"
      />
    </div>
  );
}
