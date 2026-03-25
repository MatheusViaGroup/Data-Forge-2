import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

async function getCredentials() {
  const { data } = await supabaseAdmin
    .from("credenciais")
    .select("client_id, tenant_id, client_secret, master_user, master_password")
    .eq("status", "ativo")
    .limit(1)
    .single();

  if (data) {
    return {
      clientId: data.client_id,
      tenantId: data.tenant_id,
      clientSecret: data.client_secret,
      masterUser: data.master_user,
      masterPassword: data.master_password,
    };
  }

  return {
    clientId: process.env.POWERBI_CLIENT_ID as string,
    tenantId: process.env.POWERBI_TENANT_ID as string,
    clientSecret: process.env.POWERBI_CLIENT_SECRET as string,
    masterUser: process.env.POWERBI_MASTER_USER as string,
    masterPassword: process.env.POWERBI_MASTER_PASSWORD as string,
  };
}

// Cache em memória do access token (evita múltiplas chamadas ao Azure)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    console.log("[MSAL] Usando token em cache...");
    return cachedToken.token;
  }

  console.log("[MSAL] Buscando credenciais...");
  const creds = await getCredentials();
  
  console.log("[MSAL] Credenciais obtidas:", {
    clientId: creds.clientId ? "✓" : "✗",
    tenantId: creds.tenantId ? "✓" : "✗",
    clientSecret: creds.clientSecret ? "✓ (oculto)" : "✗",
    masterUser: creds.masterUser ? "✓" : "✗",
    masterPassword: creds.masterPassword ? "✓ (oculto)" : "✗",
  });

  const msalConfig: msal.Configuration = {
    auth: {
      clientId: creds.clientId,
      authority: `https://login.microsoftonline.com/${creds.tenantId}`,
      clientSecret: creds.clientSecret,
    },
  };

  console.log("[MSAL] Configurando aplicação MSAL...");
  console.log("[MSAL] Authority:", msalConfig.auth.authority);
  console.log("[MSAL] Client ID:", msalConfig.auth.clientId);
  console.log("[MSAL] Scopes: https://analysis.windows.net/powerbi/api/.default");
  console.log("[MSAL] Username:", creds.masterUser);

  const cca = new msal.ConfidentialClientApplication(msalConfig);
  
  console.log("[MSAL] Solicitando token por username/password...");
  const result = await cca.acquireTokenByUsernamePassword({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
    username: creds.masterUser,
    password: creds.masterPassword,
  });

  console.log("[MSAL] Resposta do Azure:", result ? "✓" : "✗");
  console.log("[MSAL] Token expires on:", result?.expiresOn);

  if (!result?.accessToken) {
    console.error("[MSAL] ERRO: Token não obtido!");
    throw new Error("Token não obtido do Azure AD");
  }

  cachedToken = {
    token: result.accessToken,
    expiresAt: result.expiresOn?.getTime() ?? now + 3_600_000,
  };

  console.log("[MSAL] Token armazenado em cache com sucesso!");
  return cachedToken.token;
}

export async function POST(request: NextRequest) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 [API] INICIANDO GERAÇÃO DE TOKEN");
  console.log("=".repeat(60));
  
  const stepLog = (step: number, msg: string) => {
    console.log(`\n[STEP ${step}] ${msg}`);
    console.log("-".repeat(60));
  };
  
  try {
    // STEP 1: Session
    stepLog(1, "Verificando sessão do usuário");
    const session = await getServerSession(authOptions);
    console.log("Email:", session?.user?.email ?? "NENHUMA SESSION");
    
    if (!session?.user?.email) {
      console.error("❌ ERRO: Usuário não autenticado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // STEP 2: Parse body
    stepLog(2, "Lendo dados da requisição");
    const body = await request.json();
    console.log("reportId:", body.reportId ?? "NÃO INFORMADO");
    console.log("groupId:", body.groupId ?? "NÃO INFORMADO");
    console.log("dashboardId:", body.dashboardId ?? "NÃO INFORMADO");
    console.log("rls:", body.rls ?? false);
    console.log("rlsRole:", body.rlsRole ?? "NÃO INFORMADO");
    
    const { reportId, groupId, dashboardId, rls, rlsRole } = body;
    if (!reportId || !groupId) {
      console.error("❌ ERRO: reportId e groupId são obrigatórios");
      return NextResponse.json({ error: "reportId e groupId obrigatórios" }, { status: 400 });
    }

    // STEP 3: Buscar credenciais
    stepLog(3, "Buscando credenciais no Supabase");
    const { data: credsData, error: credsError } = await supabaseAdmin
      .from("credenciais")
      .select("client_id, tenant_id, client_secret, master_user, master_password, status")
      .eq("status", "ativo")
      .limit(1)
      .single();

    if (credsError) {
      console.error("❌ ERRO ao buscar credenciais:", credsError.message);
      console.error("Detalhes:", credsError);
      return NextResponse.json({
        error: "Credenciais não encontradas",
        details: credsError.message,
        step: 3
      }, { status: 500 });
    }

    if (!credsData) {
      console.error("❌ ERRO: Nenhuma credencial ativa encontrada");
      return NextResponse.json({
        error: "Nenhuma credencial ativa encontrada no banco",
        step: 3
      }, { status: 500 });
    }

    console.log("✅ Credenciais encontradas:");
    console.log("   - client_id:", credsData.client_id ? "✓" : "✗");
    console.log("   - tenant_id:", credsData.tenant_id ? "✓" : "✗");
    console.log("   - client_secret:", credsData.client_secret ? "✓" : "✗");
    console.log("   - master_user:", credsData.master_user ? "✓" : "✗");
    console.log("   - master_password:", credsData.master_password ? "✓" : "✗");

    // STEP 4: Buscar dados do usuário para RLS
    stepLog(4, "Buscando dados do usuário para RLS");
    let userFiliais: string[] = [];
    let customData = "";
    let isAdmin = false;

    // Verifica se o usuário é admin
    const { data: userData } = await supabaseAdmin
      .from("usuarios")
      .select("filiais, acesso")
      .eq("email", session.user.email)
      .single();

    // Matriz tem todas as filiais liberadas (sem filtro RLS por filial)
    isAdmin = userData?.acesso === "Administrador do Locatário" || userData?.acesso === "Matriz";
    console.log("Usuário é ADMIN:", isAdmin);

    if (rls && !isAdmin) {
      // Apenas busca filiais se NÃO for admin
      // Agora filiais já contém os NOMES das filiais, não IDs
      userFiliais = userData?.filiais ?? [];
      console.log("Filiais (NOMES) do usuário:", userFiliais);
    } else if (isAdmin) {
      console.log("⏭️  Pulando RLS - usuário é ADMINISTRADOR");
    }

    // STEP 5: Buscar parâmetros RLS
    stepLog(5, "Buscando parâmetros RLS do dashboard");
    let resolvedRlsRole = rlsRole as string | undefined;
    let customDataOrigem = "nome"; // Padrão: usar nome da filial
    
    console.log("rls (do request):", rls);
    console.log("rlsRole (do request):", rlsRole);
    console.log("dashboardId:", dashboardId);
    
    if (rls && dashboardId) {
      console.log("\n🔍 BUSCANDO PARAMETROS RLS...");
      console.log("Tabela: parametros_rls");
      console.log("dashboard_id buscado:", dashboardId);
      
      const { data: rlsParams, error: rlsError } = await supabaseAdmin
        .from("parametros_rls")
        .select("tipo, nome_parametro_powerbi")
        .eq("dashboard_id", dashboardId);

      console.log("Erro na query:", rlsError ?? "NENHUM");
      console.log("Resultados encontrados:", rlsParams?.length ?? 0);
      console.log("Dados:", JSON.stringify(rlsParams, null, 2));

      if (rlsParams && rlsParams.length > 0) {
        console.log("Parâmetros RLS encontrados:", rlsParams.length);
        rlsParams.forEach((p, i) => {
          console.log(`  [${i}] tipo: "${p.tipo}", nome_parametro_powerbi: "${p.nome_parametro_powerbi}"`);
        });

        const filialParam = rlsParams.find((p) => p.tipo === "Filial");
        if (filialParam) {
          resolvedRlsRole = filialParam.nome_parametro_powerbi;
          console.log("Tipo: Filial");
          console.log("  resolvedRlsRole:", resolvedRlsRole);
        }
        const userParam = rlsParams.find((p) => p.tipo === "Usuário");
        if (userParam && !filialParam) {
          customData = session.user.email ?? "";
          resolvedRlsRole = userParam.nome_parametro_powerbi;
          console.log("Tipo: Usuário");
        }
      } else {
        console.log("⚠️ Nenhum parâmetro RLS encontrado para este dashboard");
      }
    } else {
      console.log("⚠️ RLS desativado ou dashboardId não informado");
      console.log("  rls:", rls);
      console.log("  dashboardId:", dashboardId);
    }

    // STEP 6: Obter access token do Azure
    stepLog(6, "Solicitando access token ao Azure AD");
    console.log("Tenant ID:", credsData.tenant_id);
    console.log("Client ID:", credsData.client_id);
    console.log("Master User:", credsData.master_user);
    
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
      console.log("✅ Access token obtido com sucesso!");
      console.log("   Token length:", accessToken.length);
      console.log("   Primeiros chars:", accessToken.substring(0, 20) + "...");
    } catch (azureError: unknown) {
      const err = azureError as Error;
      console.error("❌ ERRO ao obter token do Azure:");
      console.error("   Mensagem:", err.message);
      console.error("   Stack:", err.stack);
      return NextResponse.json({ 
        error: "Falha ao autenticar no Azure AD",
        details: err.message,
        step: 6
      }, { status: 500 });
    }

    // STEP 7: Buscar informações do relatório
    stepLog(7, "Buscando informações do relatório no Power BI");
    const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}`;
    console.log("URL:", reportUrl);
    
    let reportRes;
    try {
      reportRes = await axios.get(reportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log("✅ Relatório encontrado:");
      console.log("   Nome:", reportRes.data.name);
      console.log("   Embed URL:", reportRes.data.embedUrl?.substring(0, 50) + "...");
    } catch (reportError: unknown) {
      const err = reportError as any;
      console.error("❌ ERRO ao buscar relatório:");
      console.error("   Status:", err.response?.status);
      console.error("   Mensagem:", err.response?.data?.message ?? err.message);
      return NextResponse.json({ 
        error: "Relatório não encontrado no Power BI",
        details: err.response?.data?.message ?? err.message,
        step: 7,
        reportId,
        groupId
      }, { status: 500 });
    }
    
    const embedUrl = reportRes.data.embedUrl;
    const datasetId = reportRes.data.datasetId;

    // STEP 8: Gerar token de embed
    stepLog(8, "Gerando token de embed");
    const generateTokenBody: any = { accessLevel: "View" };

    // Formatar customData como string entre aspas (para texto no Power BI)
    const customDataFormatado = userFiliais.length > 0 
      ? userFiliais.map(f => `"${f}"`).join(",")
      : "";

    console.log("\n📊 VERIFICAÇÃO RLS:");
    console.log("   rls:", rls);
    console.log("   resolvedRlsRole:", resolvedRlsRole);
    console.log("   datasetId:", datasetId);
    console.log("   customData (formatado):", customDataFormatado);
    console.log("   userFiliais (nomes):", userFiliais);
    console.log("   isAdmin:", isAdmin);

    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isAdmin) {
      generateTokenBody.identities = [
        {
          username: session.user.email,
          roles: [resolvedRlsRole],
          customData: customDataFormatado,
          datasets: [datasetId],
        },
      ];
      console.log("\n✅ RLS CONFIGURADO:");
      console.log("   username:", session.user.email);
      console.log("   roles:", [resolvedRlsRole]);
      console.log("   customData:", customDataFormatado);
      console.log("   datasets:", [datasetId]);
    } else {
      console.log("\n⚠️ RLS NÃO CONFIGURADO:");
      if (!rls) console.log("   → rls está false");
      if (!resolvedRlsRole) console.log("   → resolvedRlsRole está vazio");
      if (!datasetId) console.log("   → datasetId não informado");
      if (!customDataFormatado) console.log("   → customData está vazio");
      if (isAdmin) console.log("   → usuário é ADMINISTRADOR (acesso total)");
    }

    const tokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`;
    console.log("URL:", tokenUrl);

    let tokenRes;
    try {
      tokenRes = await axios.post(tokenUrl, generateTokenBody, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
      });
      console.log("✅ Token gerado com sucesso!");
      console.log("   Token length:", tokenRes.data.token?.length);
    } catch (tokenError: unknown) {
      const err = tokenError as any;
      console.error("❌ ERRO ao gerar token de embed:");
      console.error("   Status:", err.response?.status);
      console.error("   Error Code:", err.response?.data?.errorCode);
      console.error("   Message:", err.response?.data?.message);
      console.error("   Details:", JSON.stringify(err.response?.data, null, 2));
      return NextResponse.json({ 
        error: "Falha ao gerar token de embed",
        errorCode: err.response?.data?.errorCode,
        details: err.response?.data?.message ?? err.message,
        step: 8,
        powerBIResponse: err.response?.data
      }, { status: 500 });
    }

    // STEP 9: Retornar sucesso
    stepLog(9, "Retornando token para o frontend");
    console.log("✅ PROCESSO CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      accessToken: tokenRes.data.token,
      embedUrl,
      reportName: reportRes.data.name,
    });
    
  } catch (error: unknown) {
    const err = error as Error & { errorCode?: string; errorMessage?: string; response?: { data: unknown } };
    console.error("\n" + "=".repeat(60));
    console.error("❌ [API] ERRO DESCONHECIDO");
    console.error("=".repeat(60));
    console.error("Erro:", err.message);
    console.error("Stack:", err.stack);
    console.error("Response:", JSON.stringify(err.response?.data, null, 2));
    console.error("=".repeat(60) + "\n");
    
    return NextResponse.json(
      { error: "Erro inesperado", details: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
