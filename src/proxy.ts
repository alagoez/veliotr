import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Korunan alan — negatif lookahead yerine açık include listesi.
 * (Eski matcher ".*\.(png|svg|...)$" ile biten HER yolu hariç tutuyordu:
 *  /player/abc.png gibi dinamik route'lar proxy'yi tamamen atlıyordu.)
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/saved-",
  "/notifications",
  "/billing",
  "/idea-validator",
  "/alerts",
  "/shorts",
  "/databases",
  "/player",
  "/learn",
  "/getting-started",
];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!url || !key) {
    // Yapılandırma eksikse fail-closed: NODE_ENV'e güvenme (staging/konteyner
    // ortamlarında "production" olmayabilir). Yalnızca açık dev opt-in'i geçer.
    const devOptIn =
      process.env.DEMO_MODE === "true" && process.env.NODE_ENV === "development";
    if (isProtected && !devOptIn) {
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
    signin.searchParams.set("next", path);
    const redirect = NextResponse.redirect(signin);
    // Oturum yenileme sırasında kuyruğa alınan çerezleri (genelde temizleme
    // çerezleri) taşı — yoksa tarayıcı bayat token'ı tekrar tekrar gönderir.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    "/home/:path*",
    "/saved-videos/:path*",
    "/saved-channels/:path*",
    "/notifications/:path*",
    "/billing/:path*",
    "/idea-validator/:path*",
    "/alerts/:path*",
    "/shorts/:path*",
    "/databases/:path*",
    "/player/:path*",
    "/learn/:path*",
    "/getting-started/:path*",
  ],
};
