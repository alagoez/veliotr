import { isDemoMode, isProductionReady, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  const productionReady = isProductionReady();

  if (!configured) {
    const demo = isDemoMode();
    return Response.json(
      {
        status: demo ? "demo" : "not_ready",
        database: "not_configured",
        demo,
        timestamp: new Date().toISOString(),
      },
      { status: demo ? 200 : 503 },
    );
  }

  if (!productionReady) {
    return Response.json(
      {
        status: "not_ready",
        database: "configured",
        demo: false,
        missing: [
          !process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
          !process.env.NEXT_PUBLIC_APP_URL ? "NEXT_PUBLIC_APP_URL" : null,
        ].filter(Boolean),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { count, error } = await admin
      .from("videos")
      .select("id", { count: "exact", head: true });

    if (error) {
      return Response.json(
        { status: "degraded", database: "error", demo: false, timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }

    return Response.json({
      status: count && count > 0 ? "ok" : "degraded",
      database: "connected",
      videoCount: count ?? 0,
      demo: false,
      timestamp: new Date().toISOString(),
    }, { status: count && count > 0 ? 200 : 503 });
  } catch {
    return Response.json(
      { status: "degraded", database: "unreachable", demo: false, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
