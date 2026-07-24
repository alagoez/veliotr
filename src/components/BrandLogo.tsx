import Image from "next/image";

export function BrandLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/viralab-logo.png"
      alt="Viralab"
      width={1069}
      height={224}
      priority={priority}
      className={`brand-logo ${className}`}
    />
  );
}
