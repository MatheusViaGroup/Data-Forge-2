"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { UserCircle, LogOut, ChevronDown } from "lucide-react";
import { MobileMenuButton } from "@/components/Sidebar";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <header
      className="h-[64px] flex items-center justify-between px-6 flex-shrink-0 z-30"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #F1F5F9",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Esquerda: mobile button + título da página */}
      <div className="flex items-center gap-4">
        <MobileMenuButton />

        <div className="flex flex-col">
          <h1
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 400 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Direita: usuário */}
      <div className="flex items-center gap-3">
        {/* Badge Via Core */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(129,140,248,0.08) 100%)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <div
            className="w-4 h-4 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)" }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#6366F1", letterSpacing: "0.03em" }}>
            Via Core
          </span>
        </div>

        {/* Divisor */}
        <div className="w-px h-8 hidden sm:block" style={{ background: "#F1F5F9" }} />

        {/* Usuário com Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150"
            style={{ background: dropdownOpen ? "#F8FAFC" : "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = dropdownOpen ? "#F8FAFC" : "transparent")}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
                boxShadow: "0 2px 6px rgba(15,23,42,0.25)",
              }}
            >
              <UserCircle size={17} color="white" />
            </div>

            {/* Nome */}
            <div className="hidden sm:block text-left">
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", lineHeight: 1.3 }}>
                {session?.user?.name ?? "Usuário"}
              </p>
              <p style={{ fontSize: "10px", color: "#94A3B8", lineHeight: 1.3 }}>
                Via Group
              </p>
            </div>

            <ChevronDown
              size={14}
              style={{
                color: "#94A3B8",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-52 z-50 overflow-hidden"
                style={{
                  background: "#ffffff",
                  border: "1px solid #F1F5F9",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)",
                }}
              >
                {/* Header dropdown */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
                    {session?.user?.name ?? "Usuário"}
                  </p>
                  <p style={{ fontSize: "11px", color: "#94A3B8" }} className="truncate">
                    {session?.user?.email ?? ""}
                  </p>
                </div>

                {/* Logout */}
                <div className="py-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ fontSize: "13px", color: "#EF4444" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
