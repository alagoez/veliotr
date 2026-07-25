// NICHE_CATALOG → DB niches tablosu (upsert). Yeni kanallar niche_slug FK'sı
// için bu satırlar gerekli. Çalıştırma: npm run sync-niches
import { createAdminSupabase } from "../src/lib/supabase/admin";
import { NICHE_CATALOG } from "../src/config/niches";

const db = createAdminSupabase();
const { error } = await db
  .from("niches")
  .upsert(NICHE_CATALOG.map((n) => ({ slug: n.slug, name: n.name })), { onConflict: "slug" });
if (error) throw new Error(error.message);
const { count } = await db.from("niches").select("slug", { count: "exact", head: true });
console.log(`niches senkron: ${count} niş`);
