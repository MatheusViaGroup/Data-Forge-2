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
        fixed top-0 left-0 h-screen bg-[#4B5FBF] flex flex-col
        transition-all duration-300 ease-in-out z-50
        ${collapsed ? "w-[90px]" : "w-[90px]"}
      `}
    >
      {/* Logo DATA FORGE vertical */}
      <div className="flex items-center justify-center py-6 border-b border-white/10">
        <div className="flex flex-col items-center gap-1">
          <span className="text-white font-bold text-xs tracking-widest leading-tight">DATA</span>
          <span className="text-white font-bold text-xs tracking-widest leading-tight">FORGE</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
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
                  className={`
                    flex flex-col items-center justify-center gap-1 py-3 px-2
                    rounded-xl transition-all duration-200 group relative
                    ${isActive
                      ? "bg-white/20 text-white border-l-2 border-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-[9px] font-medium text-center leading-tight">{item.label}</span>
                  
                  {/* Tooltip quando colapsado (futuro) */}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Rodapé da Sidebar - Botão Expandir/Colapsar */}
      <div className="flex items-center justify-center pb-6 border-t border-white/10 pt-4">
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
        >
          <ChevronRight size={16} className="transition-transform" />
        </button>
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
      className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-[#4B5FBF] text-white"
    >
      <LayoutGrid size={18} />
    </button>
  );
}
