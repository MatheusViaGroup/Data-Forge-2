"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { models } from "powerbi-client";
import AppShell from "@/components/AppShell";
import { Loader2, RefreshCw, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useDataStoreContext } from "@/contexts/DataStoreContext";
import { useSession } from "next-auth/react";

const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then(mod => mod.PowerBIEmbed),
  { ssr: false }
);

interface EmbedData  { accessToken: string; embedUrl: string; }
interface ApiError   { error: string; details?: string; errorCode?: string; }
type Status = "loading" | "success" | "error";
interface PowerBIEventDetailLike {
  message?: string;
  errorCode?: string;
}

export default function DashboardViewPage() {
  const params   = useParams();
  const router   = useRouter();
  const dashId   = params.id as string;
  const { data: session } = useSession(); // Adicionado para identificar usuÃ¡rio no cache
  const { getDashboardById, isLoaded } = useDataStoreContext();

  const dashboard = getDashboardById(dashId);
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [status,    setStatus]    = useState<Status>("loading");
  const [apiError,  setApiError]  = useState<ApiError | null>(null);
  const [isFocus,   setIsFocus]   = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const retriedWithoutCacheRef = useRef(false);


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

  const load = useCallback(async (opts?: { forceNewToken?: boolean }) => {
    if (!isLoaded) return;

    setStatus("loading");
    setApiError(null);
    setEmbedReady(false);
    if (!opts?.forceNewToken) retriedWithoutCacheRef.current = false;

    if (!dashboard) {
      router.push("/dashboard");
      return;
    }

    // â”€â”€â”€ Verificar cache no sessionStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const cacheKey = `pbi-embed-token:${dashboard.id}:${session?.user?.email || 'anonymous'}`;
    const canUseCache = !opts?.forceNewToken && (session?.user?.role === "admin" || !(dashboard.rls ?? false));
    const cached = canUseCache ? sessionStorage.getItem(cacheKey) : null;

    if (!canUseCache) {
      sessionStorage.removeItem(cacheKey);
      console.log("[Dashboard] Cache desativado para este contexto (RLS/force refresh).");
    }

    if (cached) {
      try {
        const { token, embedUrl, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Embed token vÃ¡lido por ~1 hora; reutilizar se < 55 minutos (margem de seguranÃ§a)
        if (age < 55 * 60 * 1000) {
          console.log("[Dashboard] Token reutilizado do cache (idade:", Math.round(age/60000), "min)");
          setEmbedData({ accessToken: token, embedUrl });
          setStatus("success");
          return; // Pula requisiÃ§Ã£o Ã  API
        } else {
        console.log("[Dashboard] Cache expirado, obtendo novo token...");
      }
      } catch (e) {
        console.warn("[Dashboard] Erro ao ler cache, ignorando:", e);
      }
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

      // Salvar no cache apenas quando permitido
      if (canUseCache) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            token: tokenData.accessToken,
            embedUrl: tokenData.embedUrl,
            timestamp: Date.now()
          }));
          console.log("[Dashboard] Token salvo no cache");
        } catch (storageError) {
          console.error("[Dashboard] Erro ao salvar cache:", storageError);
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error("[Dashboard] Erro inesperado:", e);
      setApiError({ error: "Erro inesperado", details: e.message });
      setStatus("error");
    }
  }, [dashboard, isLoaded, router, session?.user?.email, session?.user?.role]);

  useEffect(() => { load(); }, [load, isLoaded]);

  const isIgnorablePowerBIError = useCallback((event: unknown) => {
    try {
      const raw = JSON.stringify((event as { detail?: unknown })?.detail ?? event).toLowerCase();
      return (
        raw.includes("err_blocked_by_client") ||
        raw.includes("dc.services.visualstudio.com") ||
        raw.includes("copilotstatus") ||
        raw.includes("/explore/aclient/copilotstatus")
      );
    } catch {
      return false;
    }
  }, []);

  const getPowerBIEventDetails = useCallback((event: unknown) => {
    const detail = (event as { detail?: PowerBIEventDetailLike })?.detail;
    return {
      message: detail?.message || "",
      errorCode: detail?.errorCode || "",
      raw: JSON.stringify(detail ?? event).toLowerCase(),
    };
  }, []);

  useEffect(() => {
    if (status !== "success" || !embedData || embedReady) return;

    const timeout = setTimeout(() => {
      if (retriedWithoutCacheRef.current) {
        console.error("[Dashboard] Embed nÃ£o finalizou renderizaÃ§Ã£o apÃ³s retry.");
        setApiError({
          error: "O relatÃ³rio nÃ£o concluiu o carregamento",
          details: "Tente novamente. Se persistir, valide permissÃµes RLS (filiais/role) do usuÃ¡rio."
        });
        setStatus("error");
        return;
      }

      console.warn("[Dashboard] Timeout de render, tentando novamente sem cache...");
      retriedWithoutCacheRef.current = true;
      load({ forceNewToken: true });
    }, 30000);

    return () => clearTimeout(timeout);
  }, [status, embedData, embedReady, load]);

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
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
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
      subtitle={dashboard?.descricao || "RelatÃ³rio Power BI"}
      fullHeight
      topBar={backBar}
    >
      {/* â”€â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(!isLoaded || status === "loading") && (
        <div className="h-full flex flex-col items-center justify-center bg-[#f1f5f9]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center shadow-lg mb-4">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
          <p className="text-[#0f172a] font-semibold">Carregando relatÃ³rio...</p>
          <p className="text-[#94a3b8] text-sm mt-1">Conectando ao Power BI</p>
        </div>
      )}

      {/* â”€â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                <h3 className="text-[#0f172a] font-bold">Power BI Embed IndisponÃ­vel</h3>
                <p className="text-[#94a3b8] text-xs">Limite de tokens excedido</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-800">
                  <strong className="font-semibold">ðŸ”§ Modo de Desenvolvimento:</strong>
                  <br />
                  O limite de tokens de embed do Power BI foi excedido. Este Ã© um limite da Microsoft para capacidades compartilhadas (Pro/ProPlus).
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-[#333333] mb-2">SoluÃ§Ãµes:</p>
                <ul className="text-sm text-[#6C757D] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">âœ“</span>
                    <span><strong>ProduÃ§Ã£o:</strong> Contratar Power BI Embedded no Azure (~$300/mÃªs)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">âœ“</span>
                    <span><strong>Testes:</strong> Usar "Publish to Web" (dados pÃºblicos)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#28A745] font-bold">âœ“</span>
                    <span><strong>Aguardar:</strong> Tokens sÃ£o renovados periodicamente</span>
                  </li>
                </ul>
              </div>

              {apiError.errorCode === "DEV_MODE_LIMIT" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-800">
                    <strong className="font-semibold">ðŸ“– DocumentaÃ§Ã£o:</strong>
                    <br />
                    Consulte o arquivo <code className="bg-white px-2 py-0.5 rounded">POWER_BI_EMBED_ERROR.md</code> para instruÃ§Ãµes detalhadas.
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
              <button onClick={() => load()} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl transition-colors">
                <RefreshCw size={14} /> Tentar novamente
              </button>
              <Link href="/dashboard" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] text-sm font-semibold rounded-xl transition-colors border border-[#e2e8f0]">
                <ArrowLeft size={14} /> Voltar
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Power BI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
          <PowerBIEmbed
            embedConfig={embedConfig}
            cssClassName="w-full h-full"
            eventHandlers={new Map([
              ["loaded", () => {
                console.log("[PBI] Evento loaded");
                setEmbedReady(true);
                retriedWithoutCacheRef.current = false;
              }],
              ["rendered", () => {
                console.log("[PBI] Evento rendered");
                setEmbedReady(true);
                retriedWithoutCacheRef.current = false;
              }],
              ["error", (event: unknown) => {
                if (isIgnorablePowerBIError(event)) {
                  console.debug("[PBI] Aviso nao critico ignorado:", event);
                  return;
                }
                const { message, errorCode, raw } = getPowerBIEventDetails(event);
                const isTokenExpired = errorCode.toLowerCase() === "tokenexpired" || raw.includes("tokenexpired");

                // Durante interacoes de menu do visual (ex.: "mostrar ponto de dados como tabela"),
                // o SDK pode emitir eventos de erro nao bloqueantes. Nao derrubar o embed nesses casos.
                if (embedReady && !isTokenExpired) {
                  console.warn("[PBI] Erro nao bloqueante durante interacao. Embed mantido.", {
                    errorCode,
                    message,
                    event,
                  });
                  return;
                }

                if (isTokenExpired) {
                  console.warn("[PBI] Token expirado detectado. Renovando token de embed...");
                  load({ forceNewToken: true });
                  return;
                }

                console.error("[PBI] Erro bloqueante no embed:", event);
                setApiError({
                  error: "Erro ao renderizar o relatorio",
                  details: message || "O Power BI retornou um erro de embed para este usuario.",
                  errorCode: errorCode || undefined,
                });
                setStatus("error");
              }],
            ])}
          />
        </div>
      )}
    </AppShell>

  );
}

