/**
 * Demo hesabı oluşturur (e-posta doğrulaması atlanmış — anında giriş yapılır).
 *
 * Kullanım:
 *   npm run demo-user                         → varsayılan e-posta, rastgele şifre
 *   npm run demo-user -- demo@viralab.dev     → belirtilen e-posta
 *
 * Gerekli env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Not: Kullanıcı zaten varsa şifresi yenilenir (hesap silinmez).
 */
import { createAdminSupabase } from "../src/lib/supabase/admin";

const email = process.argv[2] ?? "demo@viralab.dev";

/** Okunabilir ama güçlü şifre: 3 kelime + 4 hane (kripto-güvenli rastgelelik). */
function makePassword(): string {
  const words = [
    "viral", "outlier", "kanal", "carpan", "medyan", "trend", "hook",
    "patlama", "kesfet", "radar", "sinyal", "izlenme",
  ];
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  const pick = (i: number) => words[bytes[i] % words.length];
  const digits = String(bytes[3] % 10000).padStart(4, "0");
  return `${pick(0)}-${pick(1)}-${pick(2)}-${digits}`;
}

const password = makePassword();
const db = createAdminSupabase();

// Var olan kullanıcıyı ara (aynı e-postayla ikinci kez çalıştırılabilsin)
const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("Kullanıcı listesi alınamadı:", listErr.message);
  process.exit(1);
}
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existing) {
  const { error } = await db.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Şifre güncellenemedi:", error.message);
    process.exit(1);
  }
  console.log("Mevcut demo hesabının şifresi yenilendi.\n");
} else {
  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // doğrulama e-postası beklemeden aktif
    user_metadata: { display_name: "Demo Kullanıcı" },
  });
  if (error) {
    console.error("Hesap oluşturulamadı:", error.message);
    process.exit(1);
  }
  console.log("Demo hesabı oluşturuldu.\n");
}

console.log("  E-posta : " + email);
console.log("  Şifre   : " + password);
console.log("\nGiriş: /signin → e-posta + şifre (doğrulama gerekmez)");
