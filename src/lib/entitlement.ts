import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Abonelik yetkisi.
 * Denetim notu: `subscriptions` tablosu webhook tarafından doğru doldurulmasına
 * rağmen HİÇBİR kod yolu okumuyordu — ücretsiz hesap sınırsız Gemini/arama
 * harcatabiliyordu (doğrudan maliyet + gelir kaybı).
 *
 * Yetki `profiles.plan`'dan DEĞİL `subscriptions`'tan okunur: profiles satırını
 * kullanıcı kendisi güncelleyebiliyor (RLS `for all`), subscriptions ise yalnızca
 * service-role tarafından yazılabilir.
 */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type Entitlement = { pro: boolean };

export async function getEntitlement(userId: string | null): Promise<Entitlement> {
  if (!userId || !isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { pro: false };
  }
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .in("status", [...ACTIVE_STATUSES])
      .limit(1)
      .maybeSingle();
    return { pro: Boolean(data) };
  } catch {
    return { pro: false }; // fail-closed
  }
}

/** Ücretsiz kademe günlük kotaları (plan.md §6). */
export const FREE_QUOTA = {
  chatPerDay: 10,
  searchPerMinute: 20,
} as const;

export const PRO_QUOTA = {
  chatPerDay: 500,
  searchPerMinute: 60,
} as const;
