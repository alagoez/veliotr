import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirect";

/** Yönlendirme tabanı: yapılandırılmış uygulama adresi (Host başlığı sahtelenebilir). */
function redirectBase(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const base = redirectBase(request);

  if (!code) return NextResponse.redirect(new URL(`/signin?error=oauth_callback_failed`, base));

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/signin?error=oauth_callback_failed`, base));

  return NextResponse.redirect(new URL(next, base));
}
