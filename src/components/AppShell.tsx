"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebar } from "@/contexts/SidebarContext";

interface AppShellProps {
  title: string;
  subtitle?: string;
  fullHeight?: boolean;
  topBar?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, fullHeight, topBar, children }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className={fullHeight ? "h-screen" : "min-h-screen"} style={{ background: "var(--bg-main)" }}>
      <Sidebar />
      <div
        className={`flex flex-col transition-all duration-300 max-md:ml-0 ${fullHeight ? "h-screen" : "min-h-screen"}`}
        style={{ marginLeft: collapsed ? 68 : 230 }}
      >
        <Header title={title} subtitle={subtitle} />
        {topBar}
        <main className={`flex-1 ${fullHeight ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
