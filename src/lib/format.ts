const compact = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("tr-TR");

/** 1400000 → "1,4 Mn" · 97000 → "97 B" */
export function fmtCompact(n: number): string {
  return compact.format(n);
}

export function fmtPlain(n: number): string {
  return plain.format(n);
}

/** 14.4 → "14,4x" */
export function fmtMultiplier(x: number): string {
  return `${x.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}x`;
}

/** saniye → "12:34" veya "1:02:34" */
export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** ISO tarih → "3 hafta önce" */
export function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < day) return "bugün";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  const years = Math.floor(days / 365);
  return `${years} yıl önce`;
}

/** Yüzde: 0.042 → "%4,2" */
export function fmtPercent(x: number): string {
  return `%${(x * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function fmtCurrency(n: number): string {
  return `₺${plain.format(n)}`;
}
