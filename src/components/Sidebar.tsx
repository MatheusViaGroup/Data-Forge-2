"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Users,
  LayoutGrid,
  KeyRound,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Hexagon,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home, roles: ["admin", "user"] },
  { label: "Usuários", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
  { label: "Dashboards", href: "/admin/dashboards", icon: LayoutGrid, roles: ["admin"] },
  { label: "Credenciais", href: "/admin/credenciais", icon: KeyRound, roles: ["admin"] },
  { label: "Acessos", href: "/admin/acessos-especiais", icon: UserCheck, roles: ["admin"] },
  { label: "RLS", href: "/admin/parametros-rls", icon: ShieldCheck, roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggleCollapsed } = useSidebar();
  const userRole = session?.user?.role ?? "user";

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen flex flex-col
        transition-all duration-300 ease-in-out z-50
        ${collapsed ? "w-[80px]" : "w-[80px]"}
      `}
      style={{
        background: "linear-gradient(180deg, #0A0F1E 0%, #0D1526 60%, #0A1020 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo VIA CORE */}
      <div className="flex flex-col items-center justify-center py-5 gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Ícone hexagonal */}
        <div className="relative flex items-center justify-center w-9 h-9">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
              boxShadow: "0 0 16px rgba(99,102,241,0.4)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,255,255,0.15)" />
              <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="2" y1="7" x2="22" y2="17" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="22" y1="7" x2="2" y2="17" stroke="white" strokeWidth="1.2" opacity="0.5" />
            </svg>
          </div>
        </div>
        {/* Texto VIA CORE */}
        <div className="flex flex-col items-center gap-0">
          <span style={{ color: "#818CF8", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", lineHeight: 1.2 }}>VIA</span>
          <span style={{ color: "#ffffff", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", lineHeight: 1.2 }}>CORE</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const visible = item.roles.includes(userRole);

            if (!visible) return null;

            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl transition-all duration-200 group relative"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(129,140,248,0.15) 100%)"
                      : "transparent",
                    border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                    color: isActive ? "#818CF8" : "rgba(255,255,255,0.45)",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                    }
                  }}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span style={{ fontSize: "8px", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                    {item.label}
                  </span>

                  {/* Indicador ativo */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                      style={{ background: "#6366F1" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="flex items-center justify-center pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Badge Via Labs */}
        <div className="flex flex-col items-center gap-2">
          <span
            style={{
              fontSize: "7px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.2)",
              textTransform: "uppercase",
            }}
          >
            Via Labs
          </span>
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Botão de menu mobile
export function MobileMenuButton() {
  const { toggleMobile } = useSidebar();
  return (
    <button
      onClick={toggleMobile}
      className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-white"
      style={{ background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)" }}
    >
      <LayoutGrid size={18} />
    </button>
  );
}
