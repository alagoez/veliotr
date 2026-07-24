import { chat } from "@/lib/gemini";
import { checkRateLimit, RateLimitError, requestIdentifier } from "@/lib/rate-limit";
import { detectPromptInjection } from "@/lib/security";
import { ChatRequestSchema } from "@/lib/validators";
import type { Video } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const user = isDemoMode() ? null : await getCurrentUser();
    if (!isDemoMode() && !user) {
      return Response.json({ error: "auth_required" }, { status: 401 });
    }
    checkRateLimit(`chat:${user?.id ?? requestIdentifier(request)}`, 15);
    const parsed = ChatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz sohbet isteği", details: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.messages.some((message) => detectPromptInjection(message.content))) {
      return Response.json({ error: "Bu istek güvenlik nedeniyle işlenemedi." }, { status: 400 });
    }
    const text = await chat(parsed.data.messages, parsed.data.niche, parsed.data.folderVideos as Video[] | undefined);
    return Response.json({ text });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(Math.ceil((error.resetAt - Date.now()) / 1000)) } });
    }
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return Response.json({ error: message }, { status: 500 });
  }
}
