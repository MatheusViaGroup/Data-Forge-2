"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const userButtonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (!userButtonRef.current) return;

    const rect = userButtonRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const margin = 8;
    const menuWidth = menuRef.current?.offsetWidth ?? 208;
    const menuHeight = menuRef.current?.offsetHeight ?? 200;

    let left = rect.right - menuWidth;
    let top = rect.bottom + margin;

    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = rect.top - menuHeight - margin;
    }

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding));

    setMenuStyle({
      position: "fixed",
      top,
      left,
      width: menuWidth,
      zIndex: 10000,
      maxWidth: "calc(100vw - 1rem)",
    });
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    updateDropdownPosition();
    const handleViewportChange = () => updateDropdownPosition();

    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, [dropdownOpen, updateDropdownPosition]);

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

      <div className="flex items-center gap-3">
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

        <div className="w-px h-8 hidden sm:block" style={{ background: "#F1F5F9" }} />

        <div ref={userButtonRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150"
            style={{ background: dropdownOpen ? "#F8FAFC" : "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={(e) => (e.currentTarget.style.background = dropdownOpen ? "#F8FAFC" : "transparent")}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
                boxShadow: "0 2px 6px rgba(15,23,42,0.25)",
              }}
            >
              <UserCircle size={17} color="white" />
            </div>

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

          {dropdownOpen && mounted && (
            <>
              <div className="fixed inset-0 z-[9990]" onClick={() => setDropdownOpen(false)} />
              {menuStyle && createPortal(
                <div
                  ref={menuRef}
                  style={menuStyle}
                  className="overflow-hidden"
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #F1F5F9",
                      borderRadius: "16px",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)",
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
                        {session?.user?.name ?? "Usuário"}
                      </p>
                      <p style={{ fontSize: "11px", color: "#94A3B8" }} className="truncate">
                        {session?.user?.email ?? ""}
                      </p>
                    </div>

                    <div className="py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors"
                        style={{ fontSize: "13px", color: "#EF4444" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <LogOut size={16} />
                        Sair
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
