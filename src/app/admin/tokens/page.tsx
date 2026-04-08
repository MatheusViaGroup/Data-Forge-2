"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  BarChart3, Activity, Calendar, AlertTriangle,
  RefreshCw, TrendingUp, Users, Database, KeyRound
} from "lucide-react";

interface StatsData {
  period: string;
  startDate: string;
  endDate: string;
  totalTokens: number;
  byDashboard: { nome: string; count: number }[];
  byUser: { nome: string; count: number }[];
  byCredential: { nome: string; count: number }[];
  limitReached: boolean;
  tokensRemaining: number | null;
  warning: string | null;
}

export default function TokenMonitorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const fetchStats = async (p: "today" | "week" | "month") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/token-stats?period=${p}`);
      if (!res.ok) throw new Error("Falha ao buscar estatísticas");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchStats(period);
    }
  }, [session, period]);

  if (status === "loading" || session?.user?.role !== "admin") {
    return (
      <AppShell title="Monitor de Tokens">
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#4B5FBF]" />
            <span className="text-[#64748b]">Carregando...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const getLimitColor = () => {
    if (!stats) return "";
    if (stats.limitReached) return "text-red-600";
    if (stats.tokensRemaining && stats.tokensRemaining < 100) return "text-orange-600";
    return "text-green-600";
  };

  const getProgressWidth = () => {
    if (!stats || stats.tokensRemaining === null) return 0;
    const used = 1000 - stats.tokensRemaining;
    return Math.min(100, (used / 1000) * 100);
  };

  return (
    <AppShell title="Monitor de Tokens" subtitle="Consumo de embed tokens do Power BI">
      <div className="p-4 md:p-6 lg:p-8">

        {/* Seletor de período */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-[#4B5FBF] text-white"
                    : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
                }`}
              >
                {p === "today" ? "Hoje" : p === "week" ? "Esta Semana" : "Este Mês"}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchStats(period)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-[#4B5FBF]" />
          </div>
        ) : stats ? (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-7">
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center">
                    <Activity className="text-[#2563eb]" size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Total Tokens</span>
                </div>
                <p className="text-2xl font-bold text-[#0f172a]">{stats.totalTokens.toLocaleString()}</p>
                <p className="text-xs text-[#64748b] mt-1">
                  {period === "today" ? "Hoje" : period === "week" ? "Últimos 7 dias" : "Este mês"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                    <Database className="text-[#16a34a]" size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Dashboards</span>
                </div>
                <p className="text-2xl font-bold text-[#0f172a]">{stats.byDashboard.length}</p>
                <p className="text-xs text-[#64748b] mt-1">Relatórios ativos</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#fef3cd] border border-[#fde68a] flex items-center justify-center">
                    <Users className="text-[#d97706]" size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Usuários</span>
                </div>
                <p className="text-2xl font-bold text-[#0f172a]">{stats.byUser.length}</p>
                <p className="text-xs text-[#64748b] mt-1">Únicos neste período</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center">
                    <KeyRound className="text-[#dc2626]" size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Limite Diário</span>
                </div>
                <p className={`text-2xl font-bold ${getLimitColor()}`}>
                  {stats.tokensRemaining !== null ? stats.tokensRemaining.toLocaleString() : "∞"}
                </p>
                <p className="text-xs text-[#64748b] mt-1">Tokens restantes</p>
                {stats.limitReached && (
                  <div className="mt-2 flex items-center gap-1 text-red-600 text-xs">
                    <AlertTriangle size={12} />
                    <span>Limite atingido!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de progresso do limite (apenas para hoje) */}
            {period === "today" && stats.tokensRemaining !== null && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 mb-7">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#64748b]">Uso do limite diário (Power BI Pro)</span>
                  <span className="text-sm font-bold text-[#0f172a]">
                    {1000 - stats.tokensRemaining} / 1000
                  </span>
                </div>
                <div className="w-full bg-[#f1f5f9] rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.limitReached ? "bg-red-500" : getProgressWidth() > 80 ? "bg-orange-500" : "bg-[#4B5FBF]"
                    }`}
                    style={{ width: `${getProgressWidth()}%` }}
                  />
                </div>
                {stats.warning && (
                  <p className="text-xs text-[#64748b] mt-2 italic">{stats.warning}</p>
                )}
              </div>
            )}

            {/* Tabelas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tokens por Dashboard */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#4B5FBF]" />
                  <h3 className="font-bold text-[#0f172a]">Tokens por Dashboard</h3>
                </div>
                <div className="p-5">
                  {stats.byDashboard.length === 0 ? (
                    <p className="text-[#64748b] text-sm text-center py-8">Nenhum token usado neste período</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.byDashboard.slice(0, 10).map((dash, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0f172a] truncate">{dash.nome}</p>
                            <div className="w-full bg-[#f1f5f9] rounded-full h-2 mt-1 overflow-hidden">
                              <div
                                className="bg-[#4B5FBF] h-full"
                                style={{ width: `${(dash.count / stats.totalTokens) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4 text-sm font-bold text-[#0f172a]">{dash.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tokens por Usuário */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                  <Users size={18} className="text-[#4B5FBF]" />
                  <h3 className="font-bold text-[#0f172a]">Tokens por Usuário</h3>
                </div>
                <div className="p-5">
                  {stats.byUser.length === 0 ? (
                    <p className="text-[#64748b] text-sm text-center py-8">Nenhum token usado neste período</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.byUser.slice(0, 10).map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0f172a] truncate">{user.nome}</p>
                            <div className="w-full bg-[#f1f5f9] rounded-full h-2 mt-1 overflow-hidden">
                              <div
                                className="bg-[#10b981] h-full"
                                style={{ width: `${(user.count / stats.totalTokens) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4 text-sm font-bold text-[#0f172a]">{user.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tokens por Credencial */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                  <KeyRound size={18} className="text-[#4B5FBF]" />
                  <h3 className="font-bold text-[#0f172a]">Tokens por Credencial</h3>
                </div>
                <div className="p-5">
                  {stats.byCredential.length === 0 ? (
                    <p className="text-[#64748b] text-sm text-center py-8">Nenhum token usado neste período</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.byCredential.slice(0, 10).map((cred, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0f172a] truncate">{cred.nome}</p>
                            <div className="w-full bg-[#f1f5f9] rounded-full h-2 mt-1 overflow-hidden">
                              <div
                                className="bg-[#f59e0b] h-full"
                                style={{ width: `${(cred.count / stats.totalTokens) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4 text-sm font-bold text-[#0f172a]">{cred.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações técnicas */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#4B5FBF]" />
                  <h3 className="font-bold text-[#0f172a]">Informações</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-[#64748b] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">Período</p>
                      <p className="text-xs text-[#64748b]">
                        {new Date(stats.startDate).toLocaleDateString("pt-BR")} - {new Date(stats.endDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-[#f59e0b] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">Nota importante</p>
                      <p className="text-xs text-[#64748b] leading-relaxed">
                        {stats.warning || "Power BI Embedded não tem limite fixo de tokens. Consulte sua captive capacity no Azure."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#64748b] mb-1">Média de uso</p>
                    <p className="text-lg font-bold text-[#0f172a]">
                      {stats.byDashboard.length > 0
                        ? Math.round(stats.totalTokens / stats.byDashboard.length)
                        : 0}{" "}
                      <span className="text-sm font-normal text-[#64748b]">tokens/dashboard</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <BarChart3 size={48} className="mx-auto text-[#cbd5e1] mb-3" />
            <p className="text-[#64748b]">Nenhuma estatística disponível</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
