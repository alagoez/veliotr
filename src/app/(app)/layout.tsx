import { MobileNav, Sidebar } from "@/components/app/Sidebar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
      <MobileNav />
    </div>
  );
}
