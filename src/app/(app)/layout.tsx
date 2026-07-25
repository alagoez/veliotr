import { redirect } from "next/navigation";
import { MobileNav, Sidebar } from "@/components/app/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

/**
 * İkinci savunma hattı — proxy tek başına yeterli değil.
 * (Next.js dokümanı da yetkilendirmenin sunucu tarafında ayrıca
 *  doğrulanmasını, middleware'e güvenilmemesini söylüyor.)
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isDemoMode()) {
    const user = await getCurrentUser();
    if (!user) redirect("/signin");
  }
  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
      <MobileNav />
    </div>
  );
}
