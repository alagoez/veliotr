"use client";

import { useEffect, useRef, useState } from "react";
import { FolderPlus, Folder as FolderIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Video } from "@/lib/types";

export function SaveMenu({ video, onClose }: { video: Video; onClose: () => void }) {
  const store = useStore();
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-edge bg-raised p-2 shadow-xl shadow-black/40"
    >
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-faint">
        Klasöre kaydet
      </p>
      <div className="max-h-44 overflow-y-auto">
        {store.folders.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              store.saveVideo(video, f.id);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink/90 hover:bg-hover"
          >
            <FolderIcon size={14} className="text-muted" />
            {f.name}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          const id = store.createFolder(name);
          store.saveVideo(video, id);
          setNewName("");
          onClose();
        }}
        className="mt-1 flex items-center gap-1.5 border-t border-edge-soft pt-2"
      >
        <FolderPlus size={14} className="ml-1 shrink-0 text-muted" />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni klasör..."
          className="w-full rounded-md bg-surface px-2 py-1 text-[13px] outline-none placeholder:text-faint"
        />
      </form>
    </div>
  );
}
