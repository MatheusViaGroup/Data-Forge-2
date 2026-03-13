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
    <header className="h-[70px] bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 flex-shrink-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <MobileMenuButton />

        {/* Logo VIA GROUP */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4B5FBF]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[#4B5FBF] font-bold text-lg tracking-tight">VIA GROUP</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Usuário com Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 pl-4 border-l border-[#e2e8f0] hover:bg-[#F0F4F8] rounded-xl px-3 py-2 transition-colors"
          >
            <div className="hidden sm:block text-right">
              <p className="text-[#333333] text-sm font-semibold leading-tight">
                {session?.user?.name ?? "Usuário"}
              </p>
              <p className="text-[#6C757D] text-xs leading-tight">
                Via Group
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#4B5FBF] to-[#5A6FD6] text-white flex-shrink-0 shadow-md">
                <UserCircle size={20} />
              </div>
              <ChevronDown size={16} className={`text-[#6C757D] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop para fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />

              {/* Menu Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#e2e8f0] z-50 overflow-hidden">
                {/* Header do dropdown */}
                <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#F8FAFC]">
                  <p className="text-sm font-semibold text-[#333333]">
                    {session?.user?.name ?? "Usuário"}
                  </p>
                  <p className="text-xs text-[#6C757D] truncate">
                    {session?.user?.email ?? ""}
                  </p>
                </div>

                {/* Logout */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} />
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
