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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDataStoreContext, Dashboard } from "@/contexts/DataStoreContext";

/* ─── Card de Dashboard ─────────────────────────────────────────────────── */
function DashboardCard({ dash, viewMode }: { dash: Dashboard; viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div
        className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-150 cursor-pointer"
        style={{
          background: "#FFFFFF",
          border: "1px solid #EBEBEC",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(75,95,191,0.10)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")}
      >
        {/* Ícone */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 52, height: 52, background: "#EEF1FB" }}
        >
          <BarChart2 size={22} style={{ color: "#4B5FBF" }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: "#1A1A2E", fontSize: "14px" }}>
            {dash.nome}
          </p>
          {dash.descricao && (
            <p className="text-xs truncate mt-0.5" style={{ color: "#9CA3AF" }}>
              {dash.descricao}
            </p>
          )}
        </div>

        <Link
          href={`/dashboard/${dash.id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
          style={{ background: "#4B5FBF", color: "#FFFFFF", fontSize: "13px" }}
        >
          <ExternalLink size={14} /> Acessar
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/${dash.id}`}
      className="flex flex-col items-center p-6 rounded-2xl transition-all duration-150 cursor-pointer group"
      style={{
        background: "#FFFFFF",
        border: "1px solid #EBEBEC",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(75,95,191,0.12)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Ícone central */}
      <div
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{ width: 64, height: 64, background: "#EEF1FB" }}
      >
        <BarChart2 size={28} style={{ color: "#4B5FBF" }} />
      </div>

      {/* Nome */}
      <p
        className="font-semibold text-center leading-snug line-clamp-2"
        style={{ color: "#1A1A2E", fontSize: "13px" }}
      >
        {dash.nome}
      </p>

      {dash.descricao && (
        <p
          className="text-center mt-1 line-clamp-2"
          style={{ color: "#9CA3AF", fontSize: "11px" }}
        >
          {dash.descricao}
        </p>
      )}
    </Link>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { dashboards, isLoaded } = useDataStoreContext();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isAdmin = session?.user?.role === "admin";
  const userName = session?.user?.name ?? "Usuário";

  // Redireciona para login se não tiver sessão
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Tela de carregamento enquanto verifica a sessão
  if (status === "loading" || !session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F4F5F7" }}
      >
        <Loader2 size={30} className="animate-spin" style={{ color: "#4B5FBF" }} />
      </div>
    );
  }

  const filtered = dashboards.filter(
    (d) =>
      d.ativo &&
      (d.nome.toLowerCase().includes(search.toLowerCase()) ||
        d.descricao?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="p-8">
        {/* Boas-vindas */}
        <div className="mb-8">
          <h1 className="font-bold" style={{ color: "#1A1A2E", fontSize: "22px" }}>
            Boas-vindas, {userName.split(" ")[0]}!
          </h1>
          <p style={{ color: "#9CA3AF", fontSize: "14px", marginTop: "4px" }}>
            Selecione um relatório abaixo para visualizar seus dados.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Busca */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "#C4C6CC" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar dashboard..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: "#FFFFFF",
                border: "1px solid #EBEBEC",
                color: "#1A1A2E",
                outline: "none",
                fontSize: "13px",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#4B5FBF")}
              onBlur={e => (e.currentTarget.style.borderColor = "#EBEBEC")}
            />
          </div>

          {/* View toggle */}
          <div
            className="flex items-center rounded-xl p-1"
            style={{ background: "#FFFFFF", border: "1px solid #EBEBEC" }}
          >
            <button
              onClick={() => setViewMode("grid")}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: viewMode === "grid" ? "#4B5FBF" : "transparent",
                color: viewMode === "grid" ? "#FFFFFF" : "#9CA3AF",
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: viewMode === "list" ? "#4B5FBF" : "transparent",
                color: viewMode === "list" ? "#FFFFFF" : "#9CA3AF",
              }}
            >
              <List size={15} />
            </button>
          </div>

          {/* Adicionar (admin) */}
          {isAdmin && (
            <Link
              href="/admin/dashboards"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
              style={{ background: "#4B5FBF", color: "#FFFFFF", fontSize: "13px" }}
            >
              <Plus size={15} /> Adicionar
            </Link>
          )}
        </div>

        {/* Contador */}
        {isLoaded && (
          <p className="mb-4" style={{ color: "#C4C6CC", fontSize: "12px" }}>
            {filtered.length} dashboard{filtered.length !== 1 ? "s" : ""}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* Loading */}
        {!isLoaded && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={26} className="animate-spin" style={{ color: "#4B5FBF" }} />
          </div>
        )}

        {/* Empty */}
        {isLoaded && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
              style={{ background: "#FFFFFF", border: "1px solid #EBEBEC" }}
            >
              <BarChart2 size={28} style={{ color: "#C4C6CC" }} />
            </div>
            <h3 className="font-bold mb-2" style={{ color: "#1A1A2E", fontSize: "16px" }}>
              {search ? "Nenhum resultado" : "Nenhum dashboard cadastrado"}
            </h3>
            <p className="max-w-xs mb-6" style={{ color: "#9CA3AF", fontSize: "13px" }}>
              {search
                ? `Não encontramos dashboards para "${search}".`
                : "Adicione o primeiro dashboard Power BI para visualizá-lo aqui."}
            </p>
            {!search && isAdmin && (
              <Link
                href="/admin/dashboards"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all"
                style={{ background: "#4B5FBF", color: "#FFFFFF", fontSize: "13px" }}
              >
                <Plus size={15} /> Adicionar primeiro dashboard
              </Link>
            )}
          </div>
        )}

        {/* Grid ou List */}
        {isLoaded && filtered.length > 0 &&
          (viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((dash) => (
                <DashboardCard key={dash.id} dash={dash} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((dash) => (
                <DashboardCard key={dash.id} dash={dash} viewMode="list" />
              ))}
            </div>
          ))}
      </div>
    </AppShell>
  );
}
