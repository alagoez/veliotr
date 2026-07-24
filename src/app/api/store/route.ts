import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

const StateSchema = z.object({
  folders: z.array(z.unknown()).max(500),
  saved: z.array(z.unknown()).max(5000),
  tracked: z.array(z.unknown()).max(1000),
  notifications: z.array(z.unknown()).max(500),
  alertThreshold: z.number().finite().min(1).max(100),
  niche: z.string().max(100).optional(),
});

export async function GET() {
  if (isDemoMode()) return Response.json({ state: null, demo: true });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "auth_required" }, { status: 401 });
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("app_state").select("state, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return Response.json({ error: "state_unavailable" }, { status: 503 });
  return Response.json({ state: data?.state ?? null, updatedAt: data?.updated_at ?? null, demo: false });
}

export async function PUT(request: Request) {
  if (isDemoMode()) return Response.json({ saved: false, demo: true });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "auth_required" }, { status: 401 });
  const parsed = StateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_state" }, { status: 400 });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("app_state").upsert({
    user_id: user.id,
    state: parsed.data,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return Response.json({ error: "state_unavailable" }, { status: 503 });
  return Response.json({ saved: true, demo: false });
}
