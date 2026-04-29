import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

async function getCredentials() {
  const data = await queryOne(
    `SELECT client_id, tenant_id, client_secret, master_user, master_password
     FROM via_core.credenciais
     WHERE status = 'ativo'
     LIMIT 1`
  );

  if (data) {
    console.log("[embed-token] Usando credenciais do banco");
    return {
      clientId: data.client_id as string,
      tenantId: data.tenant_id as string,
      clientSecret: data.client_secret as string,
      masterUser: data.master_user as string,
      masterPassword: data.master_password as string,
    };
  }

  console.log("[embed-token] Fallback para variáveis de ambiente");
  return {
    clientId: process.env.POWERBI_CLIENT_ID as string,
    tenantId: process.env.POWERBI_TENANT_ID as string,
    clientSecret: process.env.POWERBI_CLIENT_SECRET as string,
    masterUser: process.env.POWERBI_MASTER_USER as string,
    masterPassword: process.env.POWERBI_MASTER_PASSWORD as string,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, groupId } = body;

    console.log("\n========================================");
    console.log("[embed-token] Nova requisição");
    console.log("[embed-token] reportId:", reportId);
    console.log("[embed-token] groupId:", groupId);
    console.log("========================================\n");

    if (!reportId || !groupId) {
      return NextResponse.json(
        { error: "reportId e groupId são obrigatórios" },
        { status: 400 }
      );
    }

    const creds = await getCredentials();

    if (!creds.clientId || !creds.tenantId || !creds.masterUser || !creds.masterPassword) {
      console.error("[embed-token] Credenciais incompletas:", {
        clientId: !!creds.clientId,
        tenantId: !!creds.tenantId,
        masterUser: !!creds.masterUser,
        masterPassword: !!creds.masterPassword,
      });
      return NextResponse.json(
        { error: "Credenciais Power BI não configuradas. Acesse Admin → Credenciais Power BI." },
        { status: 500 }
      );
    }

    // ─── 1. Configurar MSAL ───────────────────────────────────────────────────
    const authority = `https://login.microsoftonline.com/${creds.tenantId}`;
    console.log("[embed-token] authority:", authority);

    const msalConfig: msal.Configuration = {
      auth: {
        clientId: creds.clientId,
        authority,
        clientSecret: creds.clientSecret,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message) => {
            console.log(`[MSAL][${level}] ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Warning,
        },
      },
    };

    const cca = new msal.ConfidentialClientApplication(msalConfig);

    const tokenRequest: msal.UsernamePasswordRequest = {
      scopes: ["https://analysis.windows.net/powerbi/api/.default"],
      username: creds.masterUser,
      password: creds.masterPassword,
    };

    // ─── 2. Adquirir access token via Master User (ROPC) ─────────────────────
    console.log("[embed-token] Iniciando acquireTokenByUsernamePassword...");

    let authResult: msal.AuthenticationResult | null;
    try {
      authResult = await cca.acquireTokenByUsernamePassword(tokenRequest);
    } catch (authError: unknown) {
      const err = authError as Error & {
        errorCode?: string;
        errorMessage?: string;
        subError?: string;
        correlationId?: string;
        errorNo?: string;
        response?: unknown;
      };

      console.error("\n========================================");
      console.error("[embed-token] ERRO NA AUTENTICAÇÃO AZURE AD");
      console.error("message       :", err.message);
      console.error("errorCode     :", err.errorCode);
      console.error("errorMessage  :", err.errorMessage);
      console.error("subError      :", err.subError);
      console.error("correlationId :", err.correlationId);
      console.error("stack         :", err.stack);
      console.error("========================================\n");

      // Traduz os códigos mais comuns para mensagens amigáveis
      let userFriendly = err.errorMessage ?? err.message;
      if (err.errorCode === "AADSTS50126") userFriendly = "Usuário ou senha incorretos (AADSTS50126)";
      if (err.errorCode === "AADSTS50076") userFriendly = "A conta exige autenticação multifator (MFA) — não suportado em ROPC (AADSTS50076)";
      if (err.errorCode === "AADSTS70011") userFriendly = "Scope inválido para este app (AADSTS70011)";
      if (err.errorCode === "AADSTS7000218") userFriendly = "Client Secret incorreto ou expirado (AADSTS7000218)";
      if (err.errorCode === "AADSTS90002") userFriendly = "Tenant ID não encontrado (AADSTS90002)";
      if (err.errorCode === "AADSTS700016") userFriendly = "Client ID não encontrado no tenant (AADSTS700016)";
      if (err.errorCode === "AADSTS65001") userFriendly = "O app não tem permissão para acessar o Power BI — conceda consentimento no Azure AD (AADSTS65001)";
      if (err.errorCode === "AADSTS50034") userFriendly = "Usuário não existe neste tenant (AADSTS50034)";

      return NextResponse.json(
        {
          error: "Falha na autenticação Azure AD",
          details: userFriendly,
          errorCode: err.errorCode,
          subError: err.subError,
        },
        { status: 500 }
      );
    }

    if (!authResult?.accessToken) {
      console.error("[embed-token] authResult retornou sem accessToken:", authResult);
      return NextResponse.json({ error: "Access token não obtido" }, { status: 500 });
    }

    console.log("[embed-token] Access token obtido com sucesso");
    console.log("[embed-token] tokenType:", authResult.tokenType);
    console.log("[embed-token] expiresOn:", authResult.expiresOn);

    // ─── 3. Buscar embedUrl do relatório ─────────────────────────────────────
    console.log("[embed-token] Buscando embedUrl do relatório...");

    let embedUrl: string;
    try {
      const reportResponse = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${authResult.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      embedUrl = reportResponse.data.embedUrl;
      console.log("[embed-token] embedUrl obtida:", embedUrl);
    } catch (reportError: unknown) {
      const err = reportError as Error & { response?: { data: unknown; status: number } };
      console.error("[embed-token] Erro ao buscar relatório:");
      console.error("  status HTTP :", err.response?.status);
      console.error("  response    :", JSON.stringify(err.response?.data, null, 2));
      console.error("  message     :", err.message);
      return NextResponse.json(
        {
          error: "Falha ao buscar informações do relatório",
          details: `HTTP ${err.response?.status} — ${err.message}`,
        },
        { status: 500 }
      );
    }

    // ─── 4. Gerar Embed Token ─────────────────────────────────────────────────
    console.log("[embed-token] Gerando embed token...");

    let embedToken: string;
    try {
      const tokenResponse = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`,
        { accessLevel: "View" },
        {
          headers: {
            Authorization: `Bearer ${authResult.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      embedToken = tokenResponse.data.token;
      console.log("[embed-token] Embed token gerado com sucesso");
    } catch (tokenError: unknown) {
      const err = tokenError as Error & { response?: { data: unknown; status: number } };
      console.error("[embed-token] Erro ao gerar embed token:");
      console.error("  status HTTP :", err.response?.status);
      console.error("  response    :", JSON.stringify(err.response?.data, null, 2));
      console.error("  message     :", err.message);
      return NextResponse.json(
        {
          error: "Falha ao gerar embed token",
          details: `HTTP ${err.response?.status} — ${err.message}`,
        },
        { status: 500 }
      );
    }

    console.log("[embed-token] Tudo OK — retornando accessToken + embedUrl\n");
    return NextResponse.json({ accessToken: embedToken, embedUrl });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[embed-token] Erro inesperado:", err.message);
    console.error(err.stack);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: err.message },
      { status: 500 }
    );
  }
}
