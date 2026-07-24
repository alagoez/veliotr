import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "İletişim" };

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-xl px-5 py-24">
      <h1 className="font-display text-3xl font-bold">Bize Ulaş</h1>
      <p className="mt-3 text-sm text-muted">
        Soru, öneri veya iş birliği için yaz — en kısa sürede dönüş yapacağız!
      </p>

      <form
        className="mt-8 flex flex-col gap-4"
        action={`mailto:${brand.supportEmail}`}
        method="post"
        encType="text/plain"
      >
        <input
          name="isim"
          placeholder="Adın"
          required
          className="rounded-xl border border-edge bg-surface px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
        />
        <input
          name="eposta"
          type="email"
          placeholder="E-posta adresin"
          required
          className="rounded-xl border border-edge bg-surface px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
        />
        <textarea
          name="mesaj"
          placeholder="Mesajın"
          rows={5}
          required
          className="rounded-xl border border-edge bg-surface px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-soft"
        >
          Gönder
        </button>
      </form>

      <p className="mt-6 flex items-center gap-2 text-sm text-muted">
        <Mail size={15} />
        {brand.supportEmail}
      </p>
    </section>
  );
}
