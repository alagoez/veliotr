"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase/client";

/**
 * Çıkış — hem Supabase oturumunu hem yerel önbelleği temizler.
 * Denetim notu: uygulamada hiç çıkış kontrolü yoktu; paylaşılan bir cihazda
 * ne oturum ne de localStorage'daki araştırma verisi temizlenebiliyordu.
 */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      const supabase = createClientSupabase();
      await supabase.auth.signOut();
    } catch {
      // oturum zaten düşmüş olabilir — yine de yereli temizle
    }
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("viralab-store")) window.localStorage.removeItem(key);
      }
    } catch {
      // depolama erişilemiyorsa sessiz geç
    }
    window.location.href = "/signin";
  };

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
    >
      <LogOut size={14} />
      {busy ? "Çıkılıyor..." : "Çıkış yap"}
    </button>
  );
}
