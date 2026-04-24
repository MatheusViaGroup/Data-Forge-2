"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import {
  Settings, CheckCircle2, Database, FileBarChart,
  ShieldCheck, Users, KeyRound, ArrowRight,
  AlertTriangle, Clock, AlertCircle,
} from "lucide-react";

const WORKSPACE_ID = "a3ee8010-31d5-48e7-a722-af10405fe8df";
const REPORT_ID    = "a0f8c4b4-5af5-4093-9c5e-1baf95375b59";

function InfoCard({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#2563eb]">{icon}</div>
        <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-[#0f172a] text-sm break-all leading-relaxed ${mono ? "font-mono bg-[#f8fafc] px-3 py-2 rounded-lg border border-[#e2e8f0]" : "font-semibold"}`}>{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Estado para alertas de expiração de credenciais
  const [alertas, setAlertas] = useState<any[]>([]);
  const [alertasLoading, setAlertasLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, status, router]);

  // Buscar alertas de expiração
  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/check-credentials")
        .then((r) => {
          if (!r.ok) throw new Error("Falha ao carregar alertas");
          return r.json();
        })
        .then((data) => {
          setAlertas(data.credenciais.filter((c: any) => c.alerta));
          setAlertasLoading(false);
        })
        .catch((err) => {
          console.error("[AdminPage] Erro ao buscar alertas:", err);
          setAlertasLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || session?.user?.role !== "admin") return null;

  return (
    <AppShell title="Administração" subtitle="Configurações e diagnóstico do portal">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-7">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] text-white shadow-lg shadow-blue-900/20">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-[#0f172a] font-bold text-xl tracking-tight">Painel Administrativo</h2>
            <p className="text-[#94a3b8] text-sm">Informações de configuração e ambiente</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/admin/dashboards" className="flex items-center justify-between bg-gradient-to-r from-[#eff6ff] to-[#dbeafe] border border-[#bfdbfe] rounded-2xl px-5 py-4 hover:from-[#dbeafe] hover:to-[#bfdbfe] transition-all group">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-900/20"><Database size={18} /></div>
              <div>
                <p className="text-[#1d4ed8] font-bold text-sm">Gerenciar Dashboards</p>
                <p className="text-[#3b82f6] text-xs mt-0.5">Adicionar e configurar relatórios</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#3b82f6] group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/admin/credenciais" className="flex items-center justify-between bg-gradient-to-r from-[#eff6ff] to-[#dbeafe] border border-[#bfdbfe] rounded-2xl px-5 py-4 hover:from-[#dbeafe] hover:to-[#bfdbfe] transition-all group">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-900/20"><KeyRound size={18} /></div>
              <div>
                <p className="text-[#1d4ed8] font-bold text-sm">Credenciais Power BI</p>
                <p className="text-[#3b82f6] text-xs mt-0.5">Client ID, Secret, Tenant e usuário</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#3b82f6] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Alertas de Expiração de Credenciais */}
        {session?.user?.role === "admin" && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6C757D] mb-3">Alertas de Expiração</h3>
            {alertasLoading ? (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 text-sm text-[#64748b]">
                Carregando alertas...
              </div>
            ) : alertas.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="text-green-800 text-sm font-medium">
                  ✅ Todas as credenciais estão com validade em dia.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.map((credencial) => {
                  const getCorAlerta = (nivel: string) => {
                    switch (nivel) {
                      case "crítico": return "bg-red-50 border-red-200 text-red-800";
                      case "alto": return "bg-orange-50 border-orange-200 text-orange-800";
                      case "médio": return "bg-yellow-50 border-yellow-200 text-yellow-800";
                      default: return "bg-gray-50 border-gray-200";
                    }
                  };
                  const getIconeAlerta = (nivel: string) => {
                    switch (nivel) {
                      case "crítico": return <AlertCircle className="text-red-500" size={18} />;
                      case "alto": return <AlertTriangle className="text-orange-500" size={18} />;
                      default: return <Clock className="text-yellow-500" size={18} />;
                    }
                  };
                  return (
                    <div
                      key={credencial.id}
                      className={`p-4 border rounded-xl flex items-start gap-3 ${getCorAlerta(credencial.nivelAlerta)}`}
                    >
                      <div className="mt-0.5">{getIconeAlerta(credencial.nivelAlerta)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{credencial.nome}</p>
                        <p className="text-xs opacity-80">
                          Credencial expira em <strong>{credencial.diasRestantes} dias</strong> ({credencial.dataExpiracao})
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          Usuário Power BI: <code className="bg-white/50 px-1 rounded text-[10px]">{credencial.masterUser}</code>
                        </p>
                      </div>
                      <a
                        href="/admin/credenciais"
                        className="text-xs font-medium underline hover:no-underline self-center"
                      >
                        Renovar
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
          <InfoCard icon={<Database size={16} />} label="Workspace ID padrão" value={WORKSPACE_ID} mono />
          <InfoCard icon={<FileBarChart size={16} />} label="Report ID padrão" value={REPORT_ID} mono />
        </div>

        <h3 className="text-[#475569] text-[10px] font-bold uppercase tracking-widest mb-4">Status do Sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <ShieldCheck size={14} />, label: "Autenticação Power BI", status: "Configurado", detail: "Master User (ROPC) via MSAL Node" },
            { icon: <Users size={14} />, label: "Sessão Atual", status: "Ativa", detail: `${session?.user?.name} · ${session?.user?.role}` },
            { icon: <Settings size={14} />, label: "Ambiente", status: "Next.js 14", detail: "App Router + CredentialsProvider" },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[#64748b] text-[10px] font-bold uppercase tracking-widest">{card.icon}{card.label}</div>
                <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />{card.status}
                </span>
              </div>
              <p className="text-[#94a3b8] text-xs">{card.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
