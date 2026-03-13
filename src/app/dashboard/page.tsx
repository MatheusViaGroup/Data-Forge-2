"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  LayoutGrid,
  List,
  ExternalLink,
  Plus,
  Loader2,
  BarChart2,
  Search,
  Star,
  Flame,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useDataStoreContext, Dashboard } from "@/contexts/DataStoreContext";

const prioridadeConfig = {
  alta: { color: "bg-red-100 text-red-700 border-red-200", icon: Flame, iconColor: "text-orange-500" },
  media: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Flame, iconColor: "text-yellow-500" },
  baixa: { color: "bg-gray-100 text-gray-600 border-gray-200", icon: Flame, iconColor: "text-gray-400" },
};

/* ─── Thumbnail card ──────────────────────────────────────────────────────── */
function DashboardCard({ dash, viewMode }: { dash: Dashboard; viewMode: "grid" | "list" }) {
  const prioridade = prioridadeConfig[dash.prioridade || "baixa"];
  const IconPrioridade = prioridade.icon;

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card hover:shadow-soft transition-all duration-200 flex items-center gap-4 px-5 py-4">
        {/* Mini thumb */}
        <div className="relative rounded-xl overflow-hidden flex-shrink-0 border border-[#e2e8f0]" style={{ width: 120, height: 80, background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <BarChart2 size={32} className="text-white/40" />
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#6366F1] font-bold text-sm">{dash.nome}</p>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border flex items-center gap-1 ${prioridade.color}`}>
              <IconPrioridade size={10} />
              {dash.prioridade === "alta" ? "Alta" : dash.prioridade === "media" ? "Média" : "Baixa"}
            </span>
          </div>
          {dash.descricao && <p className="text-[#6C757D] text-xs mt-0.5 truncate">{dash.descricao}</p>}
        </div>
        <Link href={`/dashboard/${dash.id}`} className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-full transition-colors flex-shrink-0 shadow-md">
          <ExternalLink size={13} /> Acessar
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card overflow-hidden flex flex-col hover:shadow-soft transition-all duration-200 group">
      {/* Thumbnail */}
      <div className="relative border-b border-[#e2e8f0]" style={{ height: 160, background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)" }}>
        {/* Ícone de preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BarChart2 size={48} className="text-white/30" />
        </div>
        
        {/* Prioridade */}
        <button className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[9px] font-semibold border flex items-center gap-1 ${prioridade.color}`}>
          <IconPrioridade size={10} className={prioridade.iconColor} />
          {dash.prioridade === "alta" ? "Alta" : dash.prioridade === "media" ? "Média" : "Baixa"}
        </button>
        
        {/* Favorito */}
        <button className="absolute top-3 left-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-[#e2e8f0] text-[#cbd5e1] hover:text-yellow-400 transition-colors shadow-sm">
          <Star size={13} />
        </button>
      </div>
      
      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
        <h3 className="text-[#6366F1] font-bold text-sm leading-snug line-clamp-2 mb-1 text-center">{dash.nome}</h3>
        {dash.descricao && <p className="text-[#6C757D] text-[11px] leading-relaxed line-clamp-2 mb-3 text-center">{dash.descricao}</p>}
        <div className="mt-auto">
          <Link href={`/dashboard/${dash.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-full transition-colors shadow-md">
            <ExternalLink size={13} /> Acessar Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session } = useSession();
  const { dashboards, isLoaded } = useDataStoreContext();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isAdmin = session?.user?.role === "admin";

  const filtered = dashboards.filter(d =>
    d.ativo && (
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.descricao?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <AppShell title="Meus Dashboards" subtitle="Selecione um relatório para visualizar">
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
          {/* Toggle visualização */}
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-[#e2e8f0] rounded-full p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${viewMode === "grid" ? "bg-[#6366F1] text-white shadow" : "text-[#6C757D] hover:text-[#6366F1]"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${viewMode === "list" ? "bg-[#6366F1] text-white shadow" : "text-[#6C757D] hover:text-[#6366F1]"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Busca */}
          <div className="relative flex-1 w-full lg:max-w-sm lg:ml-auto">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar Dashboard..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all shadow-sm"
            />
          </div>

          {/* Botão Pesquisar */}
          <button className="flex items-center gap-2 px-5 py-2.5 border border-[#6366F1] text-[#6366F1] text-sm font-semibold rounded-full transition-colors hover:bg-[#6366F1] hover:text-white whitespace-nowrap">
            <Search size={15} /> Pesquisar
          </button>

          {/* Add button (admin only) */}
          {isAdmin && (
            <Link href="/admin/dashboards" className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-full transition-colors shadow-md whitespace-nowrap">
              <Plus size={15} /> Adicionar
            </Link>
          )}
        </div>

        {/* Count */}
        {isLoaded && (
          <p className="text-[#6C757D] text-xs mb-4">
            Mostrando {filtered.length} dashboard{filtered.length !== 1 ? "s" : ""}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* Loading */}
        {!isLoaded && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#6366F1]" />
          </div>
        )}

        {/* Empty */}
        {isLoaded && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white border border-[#e2e8f0] shadow-card flex items-center justify-center mb-5">
              <BarChart2 size={32} className="text-[#cbd5e1]" />
            </div>
            <h3 className="text-[#333333] font-bold text-lg mb-2">
              {search ? "Nenhum resultado" : "Nenhum dashboard cadastrado"}
            </h3>
            <p className="text-[#6C757D] text-sm max-w-xs mb-6">
              {search ? `Não encontramos dashboards para "${search}".` : "Adicione o primeiro dashboard Power BI para visualizá-lo aqui."}
            </p>
            {!search && isAdmin && (
              <Link href="/admin/dashboards" className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold rounded-full transition-colors shadow-md">
                <Plus size={15} /> Adicionar primeiro dashboard
              </Link>
            )}
          </div>
        )}

        {/* Grid or List */}
        {isLoaded && filtered.length > 0 && (
          viewMode === "grid"
            ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(dash => <DashboardCard key={dash.id} dash={dash} viewMode="grid" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(dash => <DashboardCard key={dash.id} dash={dash} viewMode="list" />)}
              </div>
            )
        )}
      </div>
    </AppShell>
  );
}
