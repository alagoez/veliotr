"use client";

import { useState } from "react";
import { Folder as FolderIcon, FolderPlus, Trash2, Tag, StickyNote } from "lucide-react";
import { Thumb } from "@/components/app/Thumb";
import { fmtCompact, fmtMultiplier, fmtRelative } from "@/lib/format";
import { useStore } from "@/lib/store";

export function SavedVideos() {
  const store = useStore();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState<Record<string, string>>({});

  const shown = store.saved.filter(
    (s) => activeFolder === null || s.folderId === activeFolder,
  );

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6">
      <h1 className="font-display text-xl font-semibold">Kaydedilenler</h1>
      <p className="mt-1 text-sm text-muted">
        Tüm araştırman tek yerde — klasörler, etiketler ve notlarla.
      </p>

      {/* Klasör çubuğu */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFolder(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFolder === null
              ? "border-brand/60 bg-brand/15 text-brand-soft"
              : "border-edge bg-raised text-muted hover:text-ink"
          }`}
        >
          Tümü ({store.saved.length})
        </button>
        {store.folders.map((f) => {
          const count = store.saved.filter((s) => s.folderId === f.id).length;
          return (
            <span key={f.id} className="group flex items-center">
              <button
                onClick={() => setActiveFolder(f.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFolder === f.id
                    ? "border-brand/60 bg-brand/15 text-brand-soft"
                    : "border-edge bg-raised text-muted hover:text-ink"
                }`}
              >
                <FolderIcon size={12} />
                {f.name} ({count})
              </button>
              {f.id !== "f_default" && (
                <button
                  onClick={() => {
                    store.deleteFolder(f.id);
                    if (activeFolder === f.id) setActiveFolder(null);
                  }}
                  className="ml-0.5 hidden rounded p-1 text-faint hover:text-warn group-hover:block"
                  title="Klasörü sil"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          );
        })}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newFolder.trim();
            if (!name) return;
            store.createFolder(name);
            setNewFolder("");
          }}
          className="flex items-center gap-1.5"
        >
          <FolderPlus size={14} className="text-faint" />
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="Yeni klasör"
            className="w-28 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs outline-none placeholder:text-faint focus:border-brand/60"
          />
        </form>
      </div>

      {/* Liste */}
      {!store.hydrated ? null : shown.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg font-medium">Henüz kayıt yok</p>
          <p className="mt-1 text-sm text-muted">
            Keşfet&apos;te beğendiğin videoların altındaki &quot;Kaydet&quot; butonunu kullan.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {shown.map((s) => (
            <div
              key={s.id}
              className="flex gap-4 rounded-xl border border-edge-soft bg-surface p-3 max-sm:flex-col"
            >
              <div className="w-56 shrink-0 max-sm:w-full">
                <Thumb video={s.video} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug">{s.video.title}</h3>
                  <span className="shrink-0 rounded-full border border-pos/40 bg-pos/15 px-2 py-0.5 text-xs font-semibold text-pos">
                    {fmtMultiplier(s.video.outlierScore)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {s.video.channelTitle} · {fmtCompact(s.video.views)} izlenme ·{" "}
                  {fmtRelative(s.video.publishedAt)} · kaydedildi{" "}
                  {fmtRelative(s.createdAt)}
                </p>

                {/* Etiketler */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Tag size={12} className="text-faint" />
                  {s.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => store.toggleTag(s.id, t)}
                      className="rounded-full bg-glow/10 px-2 py-0.5 text-[11px] text-glow hover:bg-glow/20"
                      title="Etiketi kaldır"
                    >
                      {t} ×
                    </button>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = (tagDraft[s.id] ?? "").trim();
                      if (!t) return;
                      store.toggleTag(s.id, t);
                      setTagDraft((d) => ({ ...d, [s.id]: "" }));
                    }}
                  >
                    <input
                      value={tagDraft[s.id] ?? ""}
                      onChange={(e) =>
                        setTagDraft((d) => ({ ...d, [s.id]: e.target.value }))
                      }
                      placeholder="+ etiket"
                      className="w-20 rounded-full bg-raised px-2 py-0.5 text-[11px] outline-none placeholder:text-faint"
                    />
                  </form>
                </div>

                {/* Not */}
                <div className="mt-2">
                  {editingNote === s.id ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full rounded-lg border border-edge bg-raised px-2.5 py-1.5 text-xs outline-none focus:border-brand/60"
                        placeholder="Bu video hakkında not al..."
                      />
                      <button
                        onClick={() => {
                          store.setNote(s.id, noteDraft);
                          setEditingNote(null);
                        }}
                        className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-soft"
                      >
                        Kaydet
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNote(s.id);
                        setNoteDraft(s.note ?? "");
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-ink"
                    >
                      <StickyNote size={12} />
                      {s.note ? s.note : "Not ekle..."}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => store.unsaveVideo(s.id)}
                className="shrink-0 self-start rounded-lg p-2 text-faint transition-colors hover:text-warn"
                title="Kaydı sil"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
