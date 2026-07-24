import Image from "next/image";

export function BrandLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/velio-assets/velio-logo.png"
      alt="Viralab"
      width={350}
      height={100}
      priority={priority}
      className={`brand-logo ${className}`}
    />
  );
}
