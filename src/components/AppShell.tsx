"use client";

import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
  topBar?: React.ReactNode;
}

function Shell({ title, subtitle, children, fullHeight, topBar }: AppShellProps) {
  const { collapsed } = useSidebar();
  const sidebarW = "md:pl-[90px]";

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden">
      <Sidebar />
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarW}`}>
        <Header title={title} subtitle={subtitle} />
        {topBar && (
          <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[#e2e8f0] flex-shrink-0">
            {topBar}
          </div>
        )}
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
