"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Clock, Construction } from "lucide-react";

export default function VendasPage() {
  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-64 min-w-0">
        <Header
          title="Vendas & Metas"
          subtitle="Acompanhamento de performance comercial"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-sm border border-[#e2e8f0] p-12 max-w-md text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 mx-auto mb-5">
              <Construction size={28} className="text-amber-500" />
            </div>
            <h3 className="text-[#0f172a] font-bold text-lg mb-2">
              Em desenvolvimento
            </h3>
            <p className="text-[#64748b] text-sm leading-relaxed">
              O relatório de Vendas & Metas será configurado em breve.
              Configure o REPORT_ID nesta página para ativar.
            </p>
            <div className="mt-6 flex items-center gap-2 justify-center text-[var(--text-muted)] text-xs">
              <Clock size={13} />
              <span>Disponível em breve</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
