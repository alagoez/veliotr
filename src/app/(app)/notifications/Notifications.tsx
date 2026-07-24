"use client";

import { Bell, CheckCheck, TrendingUp } from "lucide-react";
import { fmtRelative } from "@/lib/format";
import { useStore } from "@/lib/store";

export function Notifications() {
  const store = useStore();

  return (
    <div className="mx-auto max-w-[760px] px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Bildirimler</h1>
          <p className="mt-1 text-sm text-muted">
            Takip ettiğin kanallardan viral sinyaller ve sistem mesajları.
          </p>
        </div>
        <button
          onClick={() => store.markAllRead()}
          className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <CheckCheck size={15} />
          Tümünü okundu say
        </button>
      </div>

      {!store.hydrated ? null : store.notifications.length === 0 ? (
        <div className="mt-16 text-center">
          <Bell size={32} className="mx-auto text-faint" />
          <p className="mt-3 text-lg font-medium">Bildirim yok</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {store.notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 rounded-xl border p-4 ${
                n.readAt
                  ? "border-edge-soft bg-surface"
                  : "border-brand/30 bg-brand/5"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  n.type === "viral-alert"
                    ? "bg-pos/15 text-pos"
                    : "bg-brand/15 text-brand-soft"
                }`}
              >
                {n.type === "viral-alert" ? <TrendingUp size={15} /> : <Bell size={15} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.body}</p>
                <p className="mt-1 text-[11px] text-faint">{fmtRelative(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
