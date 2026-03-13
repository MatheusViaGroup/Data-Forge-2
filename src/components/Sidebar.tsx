"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  Users,
  LayoutGrid,
  KeyRound,
  ShieldCheck,
  UserCheck,
  EyeOff,
  Eye,
  Power,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { label: "Início", href: "/dashboard", icon: Home, roles: ["admin", "user"] },
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
  const userName = session?.user?.name ?? "Usuário";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className="fixed top-0 left-0 h-screen hidden md:flex flex-col z-50 transition-all duration-300"
        style={{
          width: collapsed ? "0px" : "230px",
          background: "#FFFFFF",
          borderRight: "1px solid #EBEBEC",
          overflow: "hidden",
          minWidth: collapsed ? "0px" : "230px",
        }}
      >
        {/* Logo VIA CORE */}
        <div className="flex items-center gap-2 px-6 pt-6 pb-5">
          {/* Ícone logo */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "#4B5FBF" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L9 7L12 13L15 9L21 17H3Z" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span style={{ fontWeight: 800, fontSize: "15px", color: "#1A1A2E", letterSpacing: "-0.01em" }}>
              VIA
            </span>
            <span style={{ fontWeight: 500, fontSize: "9px", color: "#4B5FBF", letterSpacing: "0.18em", marginTop: "-1px" }}>
              CORE
            </span>
          </div>
        </div>

        {/* Avatar do usuário */}
        <div className="px-4 mb-4">
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#F7F8FA" }}
          >
            {/* Avatar circular com iniciais */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4B5FBF 0%, #6875D8 100%)" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "#1A1A2E" }}
              >
                {userName}
              </p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {userRole === "admin" ? "Administrador" : "Usuário"}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <p
            className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#C4C6CC" }}
          >
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (!item.roles.includes(userRole)) return null;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                    style={{
                      background: isActive ? "#EEF1FB" : "transparent",
                      color: isActive ? "#4B5FBF" : "#6B7280",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "14px",
                    }}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé: Esconder Menu + Sair */}
        <div className="px-3 pb-6 space-y-0.5" style={{ borderTop: "1px solid #F2F2F3", paddingTop: "12px" }}>
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150"
            style={{ color: "#6B7280", fontSize: "14px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <EyeOff size={17} strokeWidth={1.8} />
            Esconder Menu
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150"
            style={{ color: "#6B7280", fontSize: "14px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Power size={17} strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      {/* Botão para reabrir sidebar quando colapsada */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex fixed top-5 left-4 z-50 items-center justify-center w-9 h-9 rounded-xl shadow-md transition-all"
          style={{ background: "#4B5FBF", color: "white" }}
          title="Mostrar menu"
        >
          <Eye size={16} />
        </button>
      )}
    </>
  );
}

// Mobile menu button
export function MobileMenuButton() {
  const { toggleMobile } = useSidebar();
  return (
    <button
      onClick={toggleMobile}
      className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-white"
      style={{ background: "#4B5FBF" }}
    >
      <LayoutGrid size={18} />
    </button>
  );
}
