import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/getting-started";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const origin = request.nextUrl.origin;

  if (!code) return NextResponse.redirect(new URL(`/signin?error=oauth_callback_failed`, origin));

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/signin?error=oauth_callback_failed`, origin));

  return NextResponse.redirect(new URL(next, origin));
}
