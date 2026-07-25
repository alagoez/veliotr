import { search } from "@/lib/search";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import { SearchRequestSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const user = isDemoMode() ? null : await getCurrentUser();
    if (!isDemoMode() && !user) {
      return Response.json({ error: "auth_required" }, { status: 401 });
    }
    checkRateLimit(`search:${user?.id ?? requestIdentifier(request)}`, 60);
    const parsed = SearchRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz arama parametreleri", details: parsed.error.flatten() }, { status: 400 });
    }
    return Response.json(await search(parsed.data));
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(Math.ceil((error.resetAt - Date.now()) / 1000)) } });
    }
    // Ham PostgREST hatası sızdırılmaz (sütun/kısıt adları keşif bilgisidir).
    console.error("[search] hata:", error);
    return Response.json({ error: "Arama şu anda yapılamıyor." }, { status: 500 });
  }
}
