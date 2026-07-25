import { createClient } from "@supabase/supabase-js";

/** Service-role istemcisi — YALNIZCA sunucu tarafında (MCP, worker).
 *  RLS'i atlar; asla istemciye sızdırma. */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
