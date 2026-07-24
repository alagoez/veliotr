import { chat } from "@/lib/gemini";
import type { ChatMessage, Video } from "@/lib/types";

type ChatRequest = {
  messages: ChatMessage[];
  niche?: string;
  folderVideos?: Video[];
};

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (!body.messages?.length) {
    return Response.json({ error: "Mesaj gerekli" }, { status: 400 });
  }
  // Bağlam boyutu koruması
  const messages = body.messages.slice(-12);

  try {
    const text = await chat(messages, body.niche, body.folderVideos);
    return Response.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return Response.json({ error: msg }, { status: 500 });
  }
}
