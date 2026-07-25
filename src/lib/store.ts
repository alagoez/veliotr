"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AppNotification,
  Channel,
  Folder,
  SavedVideo,
  TrackedChannel,
  Video,
} from "@/lib/types";

/**
 * Kullanıcı durumu — MVP'de localStorage'da tutulur (demo + gerçek mod).
 * Supabase auth bağlandığında bu katman sunucu senkronuna genişletilir
 * (şema hazır: folders/saved_videos/tracked_channels — bkz. migration).
 */

const KEY = "viralab-store-v1";
const EVT = "viralab-store-changed";

export type StoreShape = {
  folders: Folder[];
  saved: SavedVideo[];
  tracked: TrackedChannel[];
  notifications: AppNotification[];
  alertThreshold: number;
  niche?: string;
};

const DEFAULTS: StoreShape = {
  folders: [{ id: "f_default", name: "Genel", createdAt: new Date(0).toISOString() }],
  saved: [],
  tracked: [],
  notifications: [
    {
      id: "n_welcome",
      type: "system",
      title: "Viralab'e hoş geldin 🎉",
      body: "Keşfet'te outlier videoları bul, beğendiklerini klasörlere kaydet, rakiplerini takibe al.",
      createdAt: new Date().toISOString(),
    },
  ],
  alertThreshold: 3,
};

function read(key = KEY): StoreShape {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<StoreShape>) };
  } catch {
    return DEFAULTS;
  }
}

function write(next: StoreShape, key = KEY) {
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useStore() {
  const [state, setState] = useState<StoreShape>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [storageKey, setStorageKey] = useState(KEY);

  useEffect(() => {
    const active = { current: true };
    void (async () => {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        const data = (await response.json()) as { state?: StoreShape | null; userId?: string | null };
        const key = data.userId ? `${KEY}:${data.userId}` : KEY;
        if (!active.current) return;
        setStorageKey(key);
        const next = data.state ? { ...DEFAULTS, ...data.state } : read(key);
        setState(next);
        write(next, key);
      } catch {
        // Hata durumunda da isim alanlı anahtardan oku — global anahtara
        // düşmek paylaşılan cihazda başka kullanıcının verisini yükler.
        if (active.current) setState(read(storageKey));
      } finally {
        if (active.current) setHydrated(true);
      }
    })();
    const onChange = () => setState(read(storageKey));
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      active.current = false;
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [storageKey]);

  const update = useCallback((fn: (s: StoreShape) => StoreShape) => {
    const next = fn(read(storageKey));
    write(next, storageKey);
    void fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }, [storageKey]);

  const createFolder = useCallback(
    (name: string): string => {
      const id = `f_${Date.now().toString(36)}`;
      update((s) => ({
        ...s,
        folders: [...s.folders, { id, name, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [update],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      update((s) => ({
        ...s,
        folders: s.folders.filter((f) => f.id !== folderId),
        saved: s.saved.filter((v) => v.folderId !== folderId),
      }));
    },
    [update],
  );

  const saveVideo = useCallback(
    (video: Video, folderId: string) => {
      update((s) => {
        if (s.saved.some((x) => x.video.id === video.id && x.folderId === folderId)) return s;
        return {
          ...s,
          saved: [
            {
              id: `sv_${Date.now().toString(36)}`,
              folderId,
              video,
              tags: [],
              createdAt: new Date().toISOString(),
            },
            ...s.saved,
          ],
        };
      });
    },
    [update],
  );

  const unsaveVideo = useCallback(
    (savedId: string) => {
      update((s) => ({ ...s, saved: s.saved.filter((x) => x.id !== savedId) }));
    },
    [update],
  );

  const setNote = useCallback(
    (savedId: string, note: string) => {
      update((s) => ({
        ...s,
        saved: s.saved.map((x) => (x.id === savedId ? { ...x, note } : x)),
      }));
    },
    [update],
  );

  const toggleTag = useCallback(
    (savedId: string, tag: string) => {
      update((s) => ({
        ...s,
        saved: s.saved.map((x) =>
          x.id === savedId
            ? {
                ...x,
                tags: x.tags.includes(tag)
                  ? x.tags.filter((t) => t !== tag)
                  : [...x.tags, tag],
              }
            : x,
        ),
      }));
    },
    [update],
  );

  const trackChannel = useCallback(
    (channel: Channel) => {
      update((s) => {
        if (s.tracked.some((t) => t.channel.id === channel.id)) return s;
        return {
          ...s,
          tracked: [
            {
              id: `tc_${Date.now().toString(36)}`,
              channel,
              createdAt: new Date().toISOString(),
            },
            ...s.tracked,
          ],
        };
      });
    },
    [update],
  );

  const untrackChannel = useCallback(
    (channelId: string) => {
      update((s) => ({
        ...s,
        tracked: s.tracked.filter((t) => t.channel.id !== channelId),
      }));
    },
    [update],
  );

  const pushNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt">) => {
      update((s) => ({
        ...s,
        notifications: [
          { ...n, id: `n_${Date.now().toString(36)}`, createdAt: new Date().toISOString() },
          ...s.notifications,
        ].slice(0, 100),
      }));
    },
    [update],
  );

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    update((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, readAt: n.readAt ?? now })),
    }));
  }, [update]);

  const setAlertThreshold = useCallback(
    (v: number) => update((s) => ({ ...s, alertThreshold: v })),
    [update],
  );

  const setNiche = useCallback(
    (niche?: string) => update((s) => ({ ...s, niche })),
    [update],
  );

  return {
    ...state,
    hydrated,
    createFolder,
    deleteFolder,
    saveVideo,
    unsaveVideo,
    setNote,
    toggleTag,
    trackChannel,
    untrackChannel,
    pushNotification,
    markAllRead,
    setAlertThreshold,
    setNiche,
  };
}

export function isSaved(saved: SavedVideo[], videoId: string): boolean {
  return saved.some((s) => s.video.id === videoId);
}

export function isTracked(tracked: TrackedChannel[], channelId: string): boolean {
  return tracked.some((t) => t.channel.id === channelId);
}
