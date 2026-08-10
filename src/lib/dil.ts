/**
 * Başlık dili tespiti — TAMAMEN KURALLI, yapay zekâ yok.
 *
 * Neden kurallı: makinenin ana hattında bulanık karar istemiyoruz. Aynı başlık
 * her seferinde aynı sonucu vermeli; model güncellenince dünkü hükümler
 * değişmemeli.
 *
 * Karar sırası (ilk eşleşen kazanır):
 *   1. Latin dışı alfabe baskınsa            → other
 *   2. Türkçeye özgü harf varsa              → tr
 *   3. Türkçe ek/kelime kalıbı varsa         → tr
 *   4. Latin ama başka dilin işareti varsa   → other
 *   5. Kalanı                                → en
 *
 * Kanal kararı ayrı: tek başlık yanıltır (marka adı, emoji dolu başlık),
 * o yüzden son N başlığın ÇOĞUNLUĞU kararı verir.
 */

export type Dil = "tr" | "en" | "other";

/** ğ, ı, ş ve İ Türkçeye özgü. ç/ö/ü paylaşımlı olduğu için tek başına sayılmaz. */
const TR_HARF = /[ğışĞİŞ]/;

/** Latin dışı yazı sistemleri — tek geçişte elenir. */
const LATIN_DISI = /[؀-ۿऀ-ॿ฀-๿Ѐ-ӿ぀-ヿ一-鿿가-힯Ͱ-Ͽ֐-׿]/;

/** Türkçe işlev kelimeleri ve sık ekler. */
const TR_KELIME = /\b(ve|ile|için|bir|bu|şu|nasıl|neden|çok|daha|en|var|yok|oldu|yapt[ıi]|ben|sen|biz|siz|onlar|kendi|gibi|ama|fakat|sonra|önce|tarif|nasıl|püf|deneme|izle|abone|kanal)\b/i;

/** Latin alfabeli ama Türkçe/İngilizce olmayan dillerin belirteçleri. */
const DIGER_LATIN = new RegExp(
  [
    // İspanyolca / Portekizce
    "\\b(de|la|el|los|las|para|como|que|não|você|é|com|uma|mais|muito|por|isso|meu)\\b",
    // Endonezce / Malayca
    "\\b(yang|dan|untuk|ini|itu|saya|kamu|tidak|bisa|akan|dengan|dari|adalah)\\b",
    // Vietnamca
    "\\b(của|và|các|những|người|không|được|trong|một|này)\\b",
    // Almanca / Felemenkçe
    "\\b(und|der|die|das|nicht|ist|mit|für|ich|een|het|van|niet)\\b",
    // Fransızca
    "\\b(le|les|des|est|pour|dans|avec|vous|nous|c'est)\\b",
    // Filipince
    "\\b(ang|ng|sa|mga|ako|ikaw|hindi|kung|para)\\b",
  ].join("|"),
  "i",
);

/** Karakterlerin oranını ölçerken emoji, rakam ve noktalamayı sayma. */
function harfler(s: string): string {
  return s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\d\s\p{P}\p{S}]/gu, "");
}

export function baslikDili(baslik: string): Dil {
  const t = (baslik ?? "").trim();
  if (!t) return "other";

  // 1. Latin dışı yazı baskın mı? (%25 eşiği: tek bir emoji-benzeri işaret
  //    ya da alıntı kelime İngilizce başlığı elememeli)
  const h = harfler(t);
  if (h.length > 0) {
    const latinDisi = [...h].filter((c) => LATIN_DISI.test(c)).length;
    if (latinDisi / h.length > 0.25) return "other";
  }

  // 2-3. Türkçe
  if (TR_HARF.test(t)) return "tr";
  if (TR_KELIME.test(t)) return "tr";

  // 4. Latin ama başka dil
  if (DIGER_LATIN.test(t)) return "other";

  // 5. Kalanı İngilizce sayılır
  return "en";
}

/**
 * Kanal dili: son başlıkların çoğunluğu.
 * Tek başlık yanıltır — marka adı, sadece emoji, tek kelimelik başlık.
 * TR ve EN birlikte çoğunluğu oluşturuyorsa hangisi fazlaysa o seçilir;
 * ikisi toplamı yarıyı geçmiyorsa kanal 'other' sayılır ve elenir.
 */
export function kanalDili(basliklar: string[]): Dil {
  if (basliklar.length === 0) return "other";
  let tr = 0, en = 0;
  for (const b of basliklar) {
    const d = baslikDili(b);
    if (d === "tr") tr++;
    else if (d === "en") en++;
  }
  const kabul = tr + en;
  if (kabul * 2 <= basliklar.length) return "other";
  return tr >= en ? "tr" : "en";
}
