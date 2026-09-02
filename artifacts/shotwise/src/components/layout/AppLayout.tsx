import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background font-sans relative">
      <div className="absolute inset-0 pointer-events-none film-grain" />
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto film-grid relative z-10 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  )
}
