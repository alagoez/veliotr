import { chat } from "@/lib/gemini";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import { detectPromptInjection } from "@/lib/security";
import { ChatRequestSchema } from "@/lib/validators";
import type { Video } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { FREE_QUOTA, getEntitlement, PRO_QUOTA } from "@/lib/entitlement";

export async function POST(request: Request) {
  try {
    const user = isDemoMode() ? null : await getCurrentUser();
    if (!isDemoMode() && !user) {
      return Response.json({ error: "auth_required" }, { status: 401 });
    }
    // Kademeye göre kota: Gemini çağrısı doğrudan maliyet doğurur, bu yüzden
    // ücretsiz hesaplar günlük tavana bağlanır (bkz. lib/entitlement.ts).
    const identity = user?.id ?? requestIdentifier(request);
    const { pro } = await getEntitlement(user?.id ?? null);
    const dailyCap = pro ? PRO_QUOTA.chatPerDay : FREE_QUOTA.chatPerDay;
    checkRateLimit(`chat:min:${identity}`, 15);
    checkRateLimit(`chat:day:${identity}`, dailyCap, 24 * 60 * 60 * 1000);
    const parsed = ChatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz sohbet isteği", details: parsed.error.flatten() }, { status: 400 });
    }
    // Enjeksiyon taraması yalnızca mesajlara uygulanıyordu; oysa folderVideos
    // istemciden gelip DAHA YÜKSEK güvenle (sistem talimatına) yerleştiriliyor.
    const untrusted = [
      ...parsed.data.messages.map((m) => m.content),
      ...(parsed.data.folderVideos ?? []).flatMap((v) => [v.title, v.channelTitle]),
    ];
    if (untrusted.some((text) => detectPromptInjection(text))) {
      return Response.json({ error: "Bu istek güvenlik nedeniyle işlenemedi." }, { status: 400 });
    }
    const text = await chat(parsed.data.messages, parsed.data.niche, parsed.data.folderVideos as Video[] | undefined);
    return Response.json({ text });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(Math.ceil((error.resetAt - Date.now()) / 1000)) } });
    }
    // Ham hata mesajı sızdırılmaz (sütun/kısıt adları keşif bilgisi verir).
    console.error("[chat] hata:", error);
    return Response.json({ error: "Sohbet şu anda yanıt veremiyor." }, { status: 500 });
  }
}
