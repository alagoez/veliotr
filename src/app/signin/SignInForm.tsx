"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    if (!isSupabaseConfigured()) {
      setMessage("Demo modu aktif. Gerçek hesap için Supabase env değişkenlerini ekleyin.");
      setBusy(false); return;
    }
    try {
      const supabase = createClientSupabase();
      // Ağ takılırsa buton sonsuza kadar "Hazırlanıyor..." kalmasın: 15 sn
      // sonra yarış biter ve kullanıcı ne olduğunu öğrenir.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.")), 15_000),
      );
      const result = await Promise.race([
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password, options: { data: { display_name: name } } }),
        timeout,
      ]);
      if (result.error) setMessage(result.error.message);
      else if (mode === "signup") setMessage("Kayıt başarılı. E-posta doğrulamasını kontrol edin.");
      else {
      // `next`'i onurlandır: /home'dan yönlendirilen kullanıcı giriş sonrası
      // /home'a dönmeli. Aksi halde onboarding'e düşüp istediği yere hiç
      // ulaşamıyordu. Yalnızca uygulama içi yollar kabul ediliyor — açık
      // yönlendirme (open redirect) açığı doğmasın.
        const next = new URLSearchParams(window.location.search).get("next");
        const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
        router.push(safe ?? "/getting-started");
        router.refresh();
      }
    } catch (e) {
      // try/catch YOKTU: signInWithPassword hata fırlattığında (ağ hatası,
      // yapılandırma sorunu) setBusy(false) hiç çalışmıyordu — buton sonsuza
      // kadar "Hazırlanıyor..." kalıyor, kullanıcı hiçbir mesaj görmüyordu.
      setMessage(e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true); setMessage(null);
    if (!isSupabaseConfigured()) {
      setMessage("Demo modu aktif. Google girişi için Supabase env değişkenlerini ekleyin.");
      setBusy(false); return;
    }
    try {
      const supabase = createClientSupabase();
      const next = new URLSearchParams(window.location.search).get("next") || "/getting-started";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) { setMessage(error.message); setBusy(false); }
      // Hata yoksa tarayıcı Google'a gidiyor; busy true kalması doğru.
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Google girişi başlatılamadı.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="login-card">
      <div className="login-card-top"><span className="login-card-mark">▶</span><span className="login-card-status"><i /> Güvenli giriş</span></div>
      <div className="mt-10"><p className="section-kicker">VİRALAB STÜDYO</p><h2>{mode === "signin" ? "Tekrar hoş geldin." : "Viral ekibe katıl."}</h2><p className="login-card-copy">{mode === "signin" ? "Fikir üretmeye kaldığın yerden devam et." : "İlk keşif ücretsiz. Kanalın için yeni bir başlangıç yap."}</p></div>
      <div className="login-google-wrap"><button type="button" className="login-google" disabled={busy} onClick={signInWithGoogle}><span className="google-icon">G</span><span>Google ile devam et</span></button><div className="login-divider"><span>veya e-posta ile</span></div></div>
      <div className="login-fields">
        {mode === "signup" && <label>Adın<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nasıl hitap edelim?" /></label>}
        <label>E-posta<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="senin@email.com" /></label>
        <label>Şifre<div className="password-field"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter" /><button type="button" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
      </div>
      <button disabled={busy} className="login-submit">{busy ? "Hazırlanıyor..." : mode === "signin" ? "Stüdyoya gir" : "Ücretsiz başla"}<ArrowRight size={17} /></button>
      {message && <p className="login-message" aria-live="polite">{message}</p>}
      <div className="login-switch"><span>{mode === "signin" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}</span><button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Kayıt ol" : "Giriş yap"}</button></div>
      <p className="login-terms">Devam ederek <Link href="/kosullar">Kullanım Koşulları</Link> ve <Link href="/gizlilik">Gizlilik Politikası</Link>&apos;nı kabul edersin.</p>
      <Link href="/" className="login-back">← Ana sayfaya dön</Link>
    </form>
  );
}
