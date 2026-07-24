"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Folder as FolderIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

const GENERAL_PROMPTS = [
  "Bana viral video fikirleri ver",
  "Nişimde şu an ne trend?",
  "Kopyalayabileceğim outlier videolar bul",
  "En çok hangi başlık kalıpları öne çıkıyor?",
  "Şu an en iyi çalışan hook'lar neler?",
  "Yüksek izlenmeli küçük kanal outlier'ları bul",
  "İlham için hangi komşu nişlere bakmalıyım?",
  "Son dönemde hangi konular beklenenden iyi gidiyor?",
];

const FOLDER_PROMPTS = [
  "Bu klasördeki hook'lardan ne öğrenebilirim?",
  "Buradaki hangi kalıp en çok izlenmeyi getirir?",
  "Bu klasörden ilhamla 10 başlık yaz",
  "Buradaki ortak paketleme kalıpları neler?",
];

/** Basit güvenli render: satırlar + bold */
function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="text-ink">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    return (
      <p key={i} className={line.trim() === "" ? "h-2" : ""}>
        {parts}
      </p>
    );
  });
}

export function IdeaValidator() {
  const store = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [folderId, setFolderId] = useState<string | "">("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const folderVideos = folderId
        ? store.saved.filter((s) => s.folderId === folderId).map((s) => s.video)
        : undefined;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, niche: store.niche, folderVideos }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setMessages((m) => [
        ...m,
        {
          role: "model",
          content: data.text ?? `Hata: ${data.error ?? "bilinmeyen"}`,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "model", content: "Bağlantı hatası — tekrar dener misin?" },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const prompts = folderId ? FOLDER_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="mx-auto flex h-screen max-w-[880px] flex-col px-6 py-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="ai-orb shrink-0" aria-hidden />
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Fikir Doğrulayıcı
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              İndeksine ve klasörlerine dayanan araştırma asistanı.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FolderIcon size={14} className="text-faint" />
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="rounded-xl border border-edge bg-surface px-3 py-2 text-xs outline-none focus:border-brand/60"
            title="Klasör bağlamı"
          >
            <option value="">Genel (tüm indeks)</option>
            {store.folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mesajlar */}
      <div className="glass-panel mt-4 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="font-display text-base font-semibold">
              Ne araştırmak istersin?
            </p>
            <p className="mt-1 text-xs text-faint">
              Bir öneri seç ya da kendi sorunu yaz.
            </p>
            <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
              {prompts.map((p) => (
                <button key={p} onClick={() => send(p)} className="chip">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bubble-user" : "bubble-ai"
                }`}
              >
                {renderContent(m.content)}
              </div>
            ))}
            {busy && (
              <div className="bubble-ai flex max-w-[85%] items-center gap-2.5 px-4 py-3.5">
                <span className="typing-dots" aria-label="Yazıyor">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Giriş */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            folderId
              ? "Bu klasör hakkında soru sor..."
              : "Örn: Finans nişinde Shorts için 5 video fikri öner"
          }
          className="search-command w-full rounded-2xl border border-edge bg-surface px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-glow text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
