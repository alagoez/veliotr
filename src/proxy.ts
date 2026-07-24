import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProtected = request.nextUrl.pathname.startsWith("/home")
    || request.nextUrl.pathname.startsWith("/saved-")
    || request.nextUrl.pathname.startsWith("/notifications")
    || request.nextUrl.pathname.startsWith("/billing")
    || request.nextUrl.pathname.startsWith("/idea-validator")
    || request.nextUrl.pathname.startsWith("/alerts")
    || request.nextUrl.pathname.startsWith("/shorts")
    || request.nextUrl.pathname.startsWith("/databases")
    || request.nextUrl.pathname.startsWith("/player")
    || request.nextUrl.pathname.startsWith("/learn")
    || request.nextUrl.pathname.startsWith("/getting-started");
  if (!url || !key) {
    if (process.env.NODE_ENV === "production" && isProtected && process.env.DEMO_MODE !== "true") {
      return new NextResponse("Viralab yapılandırması eksik.", { status: 503 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const signin = request.nextUrl.clone();
    signin.pathname = "/signin";
    signin.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signin);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
