"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebar } from "@/contexts/SidebarContext";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, children }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-main)" }}>
      <Sidebar />
      <div
        className="flex flex-col min-h-screen transition-all duration-300 max-md:ml-0"
        style={{ marginLeft: collapsed ? 68 : 230 }}
      >
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
