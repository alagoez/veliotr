import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
