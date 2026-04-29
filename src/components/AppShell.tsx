"use client";

import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/Sidebar";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
  topBar?: React.ReactNode;
}

function Shell({ title, subtitle, children, fullHeight, topBar }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen overflow-hidden" style={{ background: "var(--bg-panel)" }}>
      <Sidebar />

      {/* Conteúdo principal: empurra pela largura da sidebar (desktop) */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: collapsed ? "68px" : "230px" }}
      >
        {/* Topbar opcional (filtros, ações) */}
        {topBar && (
          <div
            className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 flex-shrink-0"
            style={{
              background: "var(--bg-panel)",
              borderBottom: "1px solid var(--border-soft)",
            }}
          >
            {topBar}
          </div>
        )}

        {/* Área scrollável */}
        <div className={`flex-1 min-h-0 ${fullHeight ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return <Shell {...props} />;
}
