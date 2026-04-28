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
  Moon,
  Sun,
  Power,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
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
      {/* Sidebar Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Mobile */}
      <aside
        className="fixed top-0 left-0 h-screen flex md:hidden flex-col z-50 transition-transform duration-300"
        style={{
          width: "260px",
          background: "var(--bg-panel)",
          borderRight: "1px solid var(--border-soft)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Logo Via Group */}
        <div
          className="flex flex-col items-center pt-6 pb-5"
          style={{ paddingLeft: "20px", paddingRight: "20px" }}
        >
          <img
            src="https://viagroup.com.br/assets/via_group-22fac685.png"
            alt="Via Group"
            className="logo-dark"
            style={{ width: "110px", height: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Avatar do usuário */}
        <div className="mb-4" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
          <div
            className="flex items-center rounded-xl"
            style={{ background: "var(--bg-panel-soft)", padding: "12px", gap: "12px" }}
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-cyan) 100%)" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {userRole === "admin" ? "Administrador" : "Usuário"}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
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
                    onClick={closeMobile}
                    className="flex items-center rounded-xl transition-all duration-150"
                    style={{
                      background: isActive ? "var(--bg-hover)" : "transparent",
                      color: isActive ? "var(--brand-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "14px",
                      padding: "10px 12px",
                      gap: "12px",
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé */}
        <div
          className="pb-6 space-y-0.5"
          style={{ borderTop: "1px solid var(--border-default)", paddingTop: "12px", paddingLeft: "12px", paddingRight: "12px" }}
        >
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex items-center w-full rounded-xl transition-all duration-150"
            style={{
              color: "var(--text-secondary)", fontSize: "14px",
              padding: "10px 12px",
              gap: "12px",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--status-danger) 12%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Power size={18} strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      {/* Sidebar Desktop */}
      <aside
        className="fixed top-0 left-0 h-screen hidden md:flex flex-col z-30"
        style={{
          width: collapsed ? "68px" : "230px",
          background: "var(--bg-panel)",
          borderRight: "1px solid var(--border-soft)",
          overflow: "hidden",
        }}
      >
        {/* Logo VIA GROUP + CORE */}
        <div
          className="flex flex-col items-center pt-6 pb-5"
          style={{ paddingLeft: collapsed ? "12px" : "20px", paddingRight: collapsed ? "12px" : "20px" }}
        >
          {/* Logo oficial Via Group */}
          {collapsed ? (
            <img
              src="https://auth.viagroup.com.br/_nuxt/via-group-icon-colorful.fd863302.png"
              alt="Via Group"
              className="logo-dark"
              style={{ width: "36px", height: "36px", objectFit: "contain", transition: "opacity 0.3s" }}
            />
          ) : (
            <img
              src="https://viagroup.com.br/assets/via_group-22fac685.png"
              alt="Via Group"
              className="logo-dark"
              style={{ width: "110px", height: "auto", objectFit: "contain", transition: "opacity 0.3s" }}
            />
          )}
        </div>

        {/* Avatar do usuário */}
        <div className="mb-4" style={{ paddingLeft: collapsed ? "14px" : "16px", paddingRight: collapsed ? "14px" : "16px" }}>
          <div
            className="flex items-center rounded-xl"
            style={{ background: "var(--bg-panel-soft)", padding: collapsed ? "8px" : "12px", gap: collapsed ? 0 : "12px", justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-cyan) 100%)" }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {userRole === "admin" ? "Administrador" : "Usuário"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto" style={{ paddingLeft: collapsed ? "8px" : "12px", paddingRight: collapsed ? "8px" : "12px" }}>
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
              Menu
            </p>
          )}
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
                    title={collapsed ? item.label : undefined}
                    className="flex items-center rounded-xl transition-all duration-150"
                    style={{
                      background: isActive ? "var(--bg-hover)" : "transparent",
                      color: isActive ? "var(--brand-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "14px",
                      padding: collapsed ? "10px" : "10px 12px",
                      gap: collapsed ? 0 : "12px",
                      justifyContent: collapsed ? "center" : "flex-start",
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé: Esconder Menu + Sair */}
        <div
          className="pb-6 space-y-0.5"
          style={{ borderTop: "1px solid var(--border-default)", paddingTop: "12px", paddingLeft: collapsed ? "8px" : "12px", paddingRight: collapsed ? "8px" : "12px" }}
        >
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Mostrar menu" : "Esconder menu"}
            className="flex items-center w-full rounded-xl transition-all duration-150"
            style={{
              color: "var(--text-secondary)", fontSize: "14px",
              padding: collapsed ? "10px" : "10px 12px",
              gap: collapsed ? 0 : "12px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-panel-soft)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {collapsed ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
            {!collapsed && "Esconder Menu"}
          </button>

          <button
            onClick={toggleTheme}
            title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            className="flex items-center w-full rounded-xl transition-all duration-150"
            style={{
              color: "var(--text-secondary)", fontSize: "14px",
              padding: collapsed ? "10px" : "10px 12px",
              gap: collapsed ? 0 : "12px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-panel-soft)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            {!collapsed && (isDark ? "Tema Claro" : "Tema Escuro")}
          </button>

          <button
            onClick={handleLogout}
            title="Sair"
            className="flex items-center w-full rounded-xl transition-all duration-150"
            style={{
              color: "var(--text-secondary)", fontSize: "14px",
              padding: collapsed ? "10px" : "10px 12px",
              gap: collapsed ? 0 : "12px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--status-danger) 12%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Power size={18} strokeWidth={1.8} />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>
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
      style={{ background: "var(--brand-primary)" }}
    >
      <LayoutGrid size={18} />
    </button>
  );
}


