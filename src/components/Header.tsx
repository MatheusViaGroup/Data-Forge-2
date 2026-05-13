"use client";

import { MobileMenuButton } from "@/components/Sidebar";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="h-[64px] flex items-center px-6 flex-shrink-0 z-30"
      style={{
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="flex items-center gap-4">
        <MobileMenuButton />

        <div className="flex flex-col">
          <h1
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-strong)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
