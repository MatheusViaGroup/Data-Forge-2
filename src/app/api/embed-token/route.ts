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

  console.log("[embed-token] Fallback para variÃƒÂ¡veis de ambiente");
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
      return NextResponse.json({ error: "NÃƒÂ£o autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, groupId } = body;

    console.log("\n========================================");
    console.log("[embed-token] Nova requisiÃƒÂ§ÃƒÂ£o");
    console.log("[embed-token] reportId:", reportId);
    console.log("[embed-token] groupId:", groupId);
    console.log("========================================\n");

    if (!reportId || !groupId) {
      return NextResponse.json(
        { error: "reportId e groupId sÃƒÂ£o obrigatÃƒÂ³rios" },
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
        { error: "Credenciais Power BI nÃƒÂ£o configuradas. Acesse Admin Ã¢â€ â€™ Credenciais Power BI." },
        { status: 500 }
      );
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ 1. Configurar MSAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ 2. Adquirir access token via Master User (ROPC) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
      console.error("[embed-token] ERRO NA AUTENTICAÃƒâ€¡ÃƒÆ’O AZURE AD");
      console.error("message       :", err.message);
      console.error("errorCode     :", err.errorCode);
      console.error("errorMessage  :", err.errorMessage);
      console.error("subError      :", err.subError);
      console.error("correlationId :", err.correlationId);
      console.error("stack         :", err.stack);
      console.error("========================================\n");

      // Traduz os cÃƒÂ³digos mais comuns para mensagens amigÃƒÂ¡veis
      let userFriendly = err.errorMessage ?? err.message;
      if (err.errorCode === "AADSTS50126") userFriendly = "UsuÃƒÂ¡rio ou senha incorretos (AADSTS50126)";
      if (err.errorCode === "AADSTS50076") userFriendly = "A conta exige autenticaÃƒÂ§ÃƒÂ£o multifator (MFA) Ã¢â‚¬â€ nÃƒÂ£o suportado em ROPC (AADSTS50076)";
      if (err.errorCode === "AADSTS70011") userFriendly = "Scope invÃƒÂ¡lido para este app (AADSTS70011)";
      if (err.errorCode === "AADSTS7000218") userFriendly = "Client Secret incorreto ou expirado (AADSTS7000218)";
      if (err.errorCode === "AADSTS90002") userFriendly = "Tenant ID nÃƒÂ£o encontrado (AADSTS90002)";
      if (err.errorCode === "AADSTS700016") userFriendly = "Client ID nÃƒÂ£o encontrado no tenant (AADSTS700016)";
      if (err.errorCode === "AADSTS65001") userFriendly = "O app nÃƒÂ£o tem permissÃƒÂ£o para acessar o Power BI Ã¢â‚¬â€ conceda consentimento no Azure AD (AADSTS65001)";
      if (err.errorCode === "AADSTS50034") userFriendly = "UsuÃƒÂ¡rio nÃƒÂ£o existe neste tenant (AADSTS50034)";

      return NextResponse.json(
        {
          error: "Falha na autenticaÃƒÂ§ÃƒÂ£o Azure AD",
          details: userFriendly,
          errorCode: err.errorCode,
          subError: err.subError,
        },
        { status: 500 }
      );
    }

    if (!authResult?.accessToken) {
      console.error("[embed-token] authResult retornou sem accessToken:", authResult);
      return NextResponse.json({ error: "Access token nÃƒÂ£o obtido" }, { status: 500 });
    }

    console.log("[embed-token] Access token obtido com sucesso");
    console.log("[embed-token] tokenType:", authResult.tokenType);
    console.log("[embed-token] expiresOn:", authResult.expiresOn);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ 3. Buscar embedUrl do relatÃƒÂ³rio Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    console.log("[embed-token] Buscando embedUrl do relatÃƒÂ³rio...");

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
      console.error("[embed-token] Erro ao buscar relatÃƒÂ³rio:");
      console.error("  status HTTP :", err.response?.status);
      console.error("  response    :", JSON.stringify(err.response?.data, null, 2));
      console.error("  message     :", err.message);
      return NextResponse.json(
        {
          error: "Falha ao buscar informaÃƒÂ§ÃƒÂµes do relatÃƒÂ³rio",
          details: `HTTP ${err.response?.status} Ã¢â‚¬â€ ${err.message}`,
        },
        { status: 500 }
      );
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ 4. Gerar Embed Token Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
          details: `HTTP ${err.response?.status} Ã¢â‚¬â€ ${err.message}`,
        },
        { status: 500 }
      );
    }

    console.log("[embed-token] Tudo OK Ã¢â‚¬â€ retornando accessToken + embedUrl\n");
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
