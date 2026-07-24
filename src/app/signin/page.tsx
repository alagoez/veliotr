import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./SignInForm";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = { title: "Giriş yap" };

export default function SignInPage() {
  return (
    <main className="login-shell">
      <div className="login-ambient" aria-hidden="true">
        <span className="login-blob login-blob-one" />
        <span className="login-blob login-blob-two" />
        <span className="login-spark login-spark-one" />
        <span className="login-spark login-spark-two" />
      </div>
      <div className="login-layout">
        <section className="login-intro">
          <Link href="/" className="login-brand"><BrandLogo /></Link>
          <p className="section-kicker mt-16">VERİYLE VİRAL OL</p>
          <h1>Bir sonraki <em>viral fikrin</em> burada.</h1>
          <p className="login-intro-copy">Kanalını büyütecek fikirleri, başlıkları ve rakip içgörülerini tek bir güçlü çalışma alanında topla.</p>
          <div className="login-proof-grid"><div><strong>10M+</strong><span>video içgörüsü</span></div><div><strong>4.9/5</strong><span>üretici puanı</span></div><div><strong>24/7</strong><span>fikir akışı</span></div></div>
        </section>
        <SignInForm />
      </div>
    </main>
  );
}
