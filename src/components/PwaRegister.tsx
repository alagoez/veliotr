"use client";

import { useEffect } from "react";

/** Service worker kaydı — yalnızca production'da (dev'de HMR ile çakışır). */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
