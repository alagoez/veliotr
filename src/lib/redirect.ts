/**
 * Yönlendirme hedefini doğrula (açık yönlendirme koruması).
 *
 * Dize öneki kontrolü YETERSİZDİR: WHATWG URL ayrıştırıcısı ters eğik çizgiyi
 * "/" gibi ele alır, yani "/\evil.com" hem startsWith("/") testini geçer hem de
 * https://evil.com/ adresine çözülür. Bu yüzden gerçekten ayrıştırıp origin'in
 * değişmediğini doğruluyoruz.
 */
export function safeNextPath(value: string | null): string {
  if (!value) return "/getting-started";
  const SENTINEL = "https://viralab.invalid";
  try {
    const parsed = new URL(value, SENTINEL);
    if (parsed.origin !== SENTINEL) return "/getting-started";
    return parsed.pathname + parsed.search;
  } catch {
    return "/getting-started";
  }
}
