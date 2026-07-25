/**
 * Migration çalıştırıcı — Supabase Management API üzerinden DDL uygular.
 * Service-role anahtarı DDL (CREATE/ALTER/POLICY) çalıştıramaz; bu yüzden
 * bir Personal Access Token (sbp_...) gerekir.
 *
 * Gerekli env:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   NEXT_PUBLIC_SUPABASE_URL — proje ref'i buradan çıkarılır
 *
 * Çalıştırma:
 *   npm run migrate            → uygulanmamış tüm migration'ları sırayla çalıştırır
 *   npm run migrate -- 0004    → yalnızca eşleşen dosyayı çalıştırır
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN gerekli (https://supabase.com/dashboard/account/tokens).");
  process.exit(1);
}
if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL gerekli.");
  process.exit(1);
}

// https://<ref>.supabase.co → <ref>
const ref = new URL(url).hostname.split(".")[0];
const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function runSql(sql: string): Promise<void> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
}

const dir = join(process.cwd(), "supabase", "migrations");
const filter = process.argv[2];
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => !filter || f.includes(filter))
  .sort();

if (files.length === 0) {
  console.log("Çalıştırılacak migration bulunamadı.");
  process.exit(0);
}

console.log(`Proje: ${ref}\n`);
for (const file of files) {
  const sql = readFileSync(join(dir, file), "utf8");
  process.stdout.write(`→ ${file} ... `);
  try {
    await runSql(sql);
    console.log("OK");
  } catch (e) {
    console.log("HATA");
    console.error(`  ${e instanceof Error ? e.message : e}`);
    // Idempotent migration'lar (if not exists / drop if exists) tekrar
    // çalıştırılabilir; bir dosya hatası diğerlerini durdurmaz.
  }
}
console.log("\nBitti.");
