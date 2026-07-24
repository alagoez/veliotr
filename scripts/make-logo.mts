/**
 * Marka logosu üretimi: "viralab logo.png" → arka plan kaldırılmış
 * public/brand/viralab-logo.png + kare app ikonu (src/app/icon.png).
 *
 * Yöntem: global renk anahtarı (arka plan beyaza yakın, logo doygun turuncu)
 * — böylece "a"/"b" harflerinin İÇİNDEKİ kapalı beyaz boşluklar da şeffaflaşır.
 * Kenar pikselleri unblend edilir ki koyu zeminde beyaz hale oluşmasın.
 *
 * Çalıştırma: npx tsx scripts/make-logo.mts
 */
import sharp from "sharp";
import { join } from "node:path";

const SRC = join(process.cwd(), "..", "viralab logo.png");
const OUT_LOGO = join(process.cwd(), "public", "brand", "viralab-logo.png");
const OUT_ICON = join(process.cwd(), "src", "app", "icon.png");

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Arka plan rengi: dört köşenin ortalaması
const corners = [
  0,
  (width - 1) * channels,
  (height - 1) * width * channels,
  ((height - 1) * width + (width - 1)) * channels,
];
const bg = [0, 1, 2].map((c) =>
  Math.round(corners.reduce((a, o) => a + data[o + c], 0) / corners.length),
);

const LO = 10; // bu mesafenin altı: tamamen arka plan
const HI = 70; // bu mesafenin üstü: tamamen logo

for (let i = 0; i < width * height; i++) {
  const o = i * channels;
  const dr = data[o] - bg[0];
  const dg = data[o + 1] - bg[1];
  const db = data[o + 2] - bg[2];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);

  if (dist <= LO) {
    data[o + 3] = 0;
  } else if (dist < HI) {
    // Kenar: alpha'yı mesafeye göre ver + rengi unblend et (beyaz hale önlemi)
    const a = (dist - LO) / (HI - LO);
    data[o + 3] = Math.round(a * 255);
    for (let c = 0; c < 3; c++) {
      const un = (data[o + c] - (1 - a) * bg[c]) / a;
      data[o + c] = Math.max(0, Math.min(255, Math.round(un)));
    }
  }
}

// Şeffaf kenar boşluklarını kırp, makul boyuta indir, kaydet
const cut = sharp(data, { raw: { width, height, channels: 4 } }).png();
const trimmed = await cut.trim().toBuffer();
await sharp(trimmed).resize({ width: 1200, withoutEnlargement: true }).png().toFile(OUT_LOGO);

const logoMeta = await sharp(OUT_LOGO).metadata();
console.log(`Logo: ${logoMeta.width}x${logoMeta.height} → ${OUT_LOGO}`);

// App ikonu: soldaki play işareti (~ilk %15) → kırp → tekrar trim → kare → 512px
const markW = Math.round((logoMeta.width ?? 1200) * 0.18);
const mark = await sharp(OUT_LOGO)
  .extract({ left: 0, top: 0, width: markW, height: logoMeta.height ?? 300 })
  .trim()
  .toBuffer();
const mm = await sharp(mark).metadata();
const side = Math.max(mm.width ?? 0, mm.height ?? 0);
const pad = Math.round(side * 0.12);
await sharp(mark)
  .extend({
    top: pad + Math.floor((side - (mm.height ?? 0)) / 2),
    bottom: pad + Math.ceil((side - (mm.height ?? 0)) / 2),
    left: pad + Math.floor((side - (mm.width ?? 0)) / 2),
    right: pad + Math.ceil((side - (mm.width ?? 0)) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(512, 512)
  .png()
  .toFile(OUT_ICON);
console.log(`Ikon: 512x512 → ${OUT_ICON}`);
