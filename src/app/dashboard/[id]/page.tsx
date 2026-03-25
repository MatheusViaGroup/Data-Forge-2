"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { models } from "powerbi-client";
import AppShell from "@/components/AppShell";
import { Loader2, RefreshCw, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useDataStoreContext } from "@/contexts/DataStoreContext";

const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then(mod => mod.PowerBIEmbed),
  { ssr: false }
);

interface EmbedData  { accessToken: string; embedUrl: string; }
interface ApiError   { error: string; details?: string; errorCode?: string; }
type Status = "loading" | "success" | "error";

export default function DashboardViewPage() {
  const params   = useParams();
  const router   = useRouter();
  const dashId   = params.id as string;
  const { getDashboardById, isLoaded } = useDataStoreContext();

  const dashboard = getDashboardById(dashId);
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [status,    setStatus]    = useState<Status>("loading");
  const [apiError,  setApiError]  = useState<ApiError | null>(null);
  const [isFocus,   setIsFocus]   = useState(false);
  const embedContainerRef = useRef<HTMLDivElement>(null);


  const toggleFocus = useCallback(() => {
    if (!document.fullscreenElement) {
      embedContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFocus(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const load = useCallback(async () => {
    if (!isLoaded) return;

    setStatus("loading"); setApiError(null);

    if (!dashboard) {
      router.push("/dashboard");
      return;
    }

    // Chama API para gerar token de embed
    try {
      console.log("[Dashboard] Solicitando token de embed...");
      console.log("[Dashboard] reportId:", dashboard.reportId);
      console.log("[Dashboard] groupId:", dashboard.workspaceId);
      
      const tokenData = await fetch("/api/embed-token-by-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: dashboard.reportId,
          groupId: dashboard.workspaceId,
          dashboardId: dashboard.id,
          rls: dashboard.rls ?? false,
          rlsRole: dashboard.rlsRole ?? "",
        }),
      }).then(r => r.json());

      console.log("[Dashboard] Resposta da API:", tokenData);

      if (!tokenData.accessToken) { 
        console.error("[Dashboard] Erro: sem access token");
        setApiError(tokenData); 
        setStatus("error"); 
        return; 
      }

      console.log("[Dashboard] Token obtido com sucesso!");
      setEmbedData({ accessToken: tokenData.accessToken, embedUrl: tokenData.embedUrl });
      setStatus("success");
    } catch (err: unknown) {
      const e = err as Error;
      console.error("[Dashboard] Erro inesperado:", e);
      setApiError({ error: "Erro inesperado", details: e.message });
      setStatus("error");
    }
  }, [dashboard, isLoaded, router]);

  useEffect(() => { load(); }, [load, isLoaded]);

  const embedConfig = embedData && dashboard ? {
    type: "report" as const,
    id: dashboard.reportId,
    embedUrl: embedData.embedUrl,
    accessToken: embedData.accessToken,
    tokenType: models.TokenType.Embed,
    settings: {
      filterPaneEnabled: false,
      navContentPaneEnabled: true, // barra de abas nativa do Power BI
      background: models.BackgroundType.Default,
    },
  } : undefined;

  const backBar = (
    <div className="flex items-center justify-between w-full">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-[#64748b] hover:text-[#2563eb] text-xs font-medium transition-colors"
      >
        <ArrowLeft size={13} /> Voltar para dashboards
      </Link>
      <button
        onClick={toggleFocus}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#e2e8f0] bg-white hover:bg-[#4B5FBF] hover:text-white hover:border-[#4B5FBF] text-[#4B5FBF] transition-all shadow-sm"
      >
        {isFocus ? <><Minimize2 size={13} /> Sair do foco</> : <><Maximize2 size={13} /> Modo Foco</>}
      </button>
    </div>
  );

  return (
    <AppShell
      title={dashboard?.nome ?? "Carregando..."}
      subtitle={dashboard?.descricao || "Relatório Power BI"}
      fullHeight
      topBar={backBar}
    >
      {/* ─── Loading ─────────────────────────────────────────────────────── */}
      {(!isLoaded || status === "loading") && (
        <div className="h-full flex flex-col items-center justify-center bg-[#f1f5f9]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center shadow-lg mb-4">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
          <p className="text-[#0f172a] font-semibold">Carregando relatório...</p>
          <p className="text-[#94a3b8] text-sm mt-1">Conectando ao Power BI</p>
        </div>
      )}

      {/* ─── Error ───────────────────────────────────────────────────────── */}
      {status === "error" && apiError && (
        <div className="h-full flex items-center justify-center bg-[#f1f5f9] p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] w-full max-w-2xl">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[#0f172a] font-bold">Power BI Embed Indisponível</h3>
                <p className="text-[#94a3b8] text-xs">Limite de tokens excedido</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-800">
                  <strong className="font-semibold">🔧 Modo de Desenvolvimento:</strong>
                  <br />
                  O limite de tokens de embed do Power BI foi excedido. Este é um limite da Microsoft para capacidades compartilhadas (Pro/ProPlus).
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-[#333333] mb-2">Soluções:</p>
                <ul className="text-sm text-[#6C757D] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">✓</span>
                    <span><strong>Produção:</strong> Contratar Power BI Embedded no Azure (~$300/mês)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">✓</span>
                    <span><strong>Testes:</strong> Usar "Publish to Web" (dados públicos)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">✓</span>
                    <span><strong>Aguardar:</strong> Tokens são renovados periodicamente</span>
                  </li>
                </ul>
              </div>

              {apiError.errorCode === "DEV_MODE_LIMIT" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-800">
                    <strong className="font-semibold">📖 Documentação:</strong>
                    <br />
                    Consulte o arquivo <code className="bg-white px-2 py-0.5 rounded">POWER_BI_EMBED_ERROR.md</code> para instruções detalhadas.
                  </p>
                </div>
              )}

              {apiError.errorCode && apiError.errorCode !== "DEV_MODE_LIMIT" && (
                <>
                  <p className="text-red-600 font-semibold text-sm">{apiError.error}</p>
                  {apiError.details && <p className="text-[#64748b] text-xs bg-red-50 border border-red-100 rounded-lg px-4 py-3 leading-relaxed">{apiError.details}</p>}
                </>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={load} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl transition-colors">
                <RefreshCw size={14} /> Tentar novamente
              </button>
              <Link href="/dashboard" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] text-sm font-semibold rounded-xl transition-colors border border-[#e2e8f0]">
                <ArrowLeft size={14} /> Voltar
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Power BI ────────────────────────────────────────────────────── */}
      {status === "success" && embedData && embedConfig && (
        <div ref={embedContainerRef} className="powerbi-container h-full relative">
          {isFocus && (
            <button
              onClick={toggleFocus}
              className="absolute top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/50 hover:bg-black/70 text-white transition-all shadow-lg backdrop-blur-sm"
            >
              <Minimize2 size={13} /> Sair do foco
            </button>
          )}
          <div className="powerbi-shifter">
            <PowerBIEmbed
              embedConfig={embedConfig}
              cssClassName="w-full h-full"
              eventHandlers={new Map([
                ["error", (event: unknown) => {
                  console.error("[PBI] Erro no embed:", event);
                }],
              ])}
            />
          </div>
        </div>
      )}
    </AppShell>

  );
}
