import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import { registerTokenUsage } from "@/lib/tokenUsage";

type RlsParamRow = {
  tipo: string;
  nome_parametro_powerbi: string | null;
};

type CredentialRow = {
  id: string;
  client_id: string;
  tenant_id: string;
  client_secret: string;
  master_user: string;
  master_password: string;
};

type CredentialTokenCacheRow = {
  cached_access_token: string | null;
  token_expires_at: string | null;
};

type CredentialsResult = {
  id: string | null;
  clientId: string;
  tenantId: string;
  clientSecret: string;
  masterUser: string;
  masterPassword: string;
};

let hasCredentialTokenCacheColumns: boolean | null = null;

async function canUseCredentialTokenCache(): Promise<boolean> {
  if (hasCredentialTokenCacheColumns !== null) {
    return hasCredentialTokenCacheColumns;
  }

  try {
    const { rows } = await query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'via_core'
         AND table_name = 'credenciais'
         AND column_name IN ('cached_access_token', 'token_expires_at')`
    );

    const columns = new Set(rows.map((row) => row.column_name));
    hasCredentialTokenCacheColumns =
      columns.has("cached_access_token") && columns.has("token_expires_at");
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[embed-token] Erro ao verificar colunas de cache no banco:", err.message);
    hasCredentialTokenCacheColumns = false;
  }

  return hasCredentialTokenCacheColumns;
}

async function getCredentials() {
  const data = await queryOne<CredentialRow>(
    `SELECT id, client_id, tenant_id, client_secret, master_user, master_password
     FROM via_core.credenciais
     WHERE status = 'ativo'
     LIMIT 1`
  );

  if (data) {
    return {
      id: data.id as string,
      clientId: data.client_id as string,
      tenantId: data.tenant_id as string,
      clientSecret: data.client_secret as string,
      masterUser: data.master_user as string,
      masterPassword: data.master_password as string,
    };
  }

  return {
    id: null,
    clientId: process.env.POWERBI_CLIENT_ID as string,
    tenantId: process.env.POWERBI_TENANT_ID as string,
    clientSecret: process.env.POWERBI_CLIENT_SECRET as string,
    masterUser: process.env.POWERBI_MASTER_USER as string,
    masterPassword: process.env.POWERBI_MASTER_PASSWORD as string,
  };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const creds = (await getCredentials()) as CredentialsResult;

  if (await canUseCredentialTokenCache()) {
    try {
      const dbCache = await queryOne<CredentialTokenCacheRow>(
        `SELECT cached_access_token, token_expires_at
         FROM via_core.credenciais
         WHERE id = $1
         LIMIT 1`,
        [creds.id]
      );

      if (dbCache?.cached_access_token && dbCache.token_expires_at) {
        const expiresAt = new Date(dbCache.token_expires_at).getTime();
        if (expiresAt > now + 60_000) {
          return dbCache.cached_access_token;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[embed-token] Erro ao ler cache de token no banco:", err.message);
    }
  }

  const msalConfig: msal.Configuration = {
    auth: {
      clientId: creds.clientId,
      authority: `https://login.microsoftonline.com/${creds.tenantId}`,
      clientSecret: creds.clientSecret,
    },
  };


  const cca = new msal.ConfidentialClientApplication(msalConfig);

  const result = await cca.acquireTokenByUsernamePassword({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
    username: creds.masterUser,
    password: creds.masterPassword,
  });


  if (!result?.accessToken) {
    console.error("[MSAL] ERRO: Token não obtido!");
    throw new Error("Token não obtido do Azure AD");
  }

  const expiresAt = result.expiresOn?.getTime() ?? now + 3_600_000;

  if (await canUseCredentialTokenCache()) {
    try {
      await query(
        `UPDATE via_core.credenciais
         SET cached_access_token = $1,
             token_expires_at = $2
         WHERE id = $3`,
        [result.accessToken, new Date(expiresAt).toISOString(), creds.id]
      );
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[embed-token] Erro ao salvar cache de token no banco:", err.message);
    }
  }

  return result.accessToken;
}

export async function POST(request: NextRequest) {

  try {
    // STEP 1: Session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.error("ERRO: Usuário não autenticado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // STEP 2: Parse body
    const body = await request.json();

    const { reportId, groupId, dashboardId, rls, rlsRole } = body;
    if (!reportId || !groupId) {
      console.error("ERRO: reportId e groupId são obrigatórios");
      return NextResponse.json({ error: "reportId e groupId obrigatórios" }, { status: 400 });
    }

    // STEP 3: Buscar credenciais
    let credsData;
    try {
      credsData = await queryOne(
        `SELECT id, client_id, tenant_id, client_secret, master_user, master_password, status
         FROM via_core.credenciais
         WHERE status = 'ativo'
         LIMIT 1`
      );
    } catch (credsError: any) {
      console.error("ERRO ao buscar credenciais:", credsError.message);
      console.error("Detalhes:", credsError);
      return NextResponse.json({
        error: "Credenciais não encontradas",
        details: credsError.message,
        step: 3
      }, { status: 500 });
    }

    if (!credsData) {
      console.error("ERRO: Nenhuma credencial ativa encontrada");
      return NextResponse.json({
        error: "Nenhuma credencial ativa encontrada no banco",
        step: 3
      }, { status: 500 });
    }


    // STEP 4: Buscar dados do usuário para RLS
    let userFiliais: string[] = [];
    let customData = "";
    let isAdmin = false;

    // Verifica se o usuário é admin
    const userData = await queryOne<{ filiais: string[]; acesso: string }>(
      `SELECT filiais, acesso FROM via_core.usuarios WHERE email = $1 LIMIT 1`,
      [session.user.email]
    );

    // Matriz tem todas as filiais liberadas (sem filtro RLS por filial)
    isAdmin = userData?.acesso === "Administrador do Locatário" || userData?.acesso === "Matriz";

    if (rls && !isAdmin) {
      // Apenas busca filiais se NÃO for admin
      // Agora filiais já contém os NOMES das filiais, não IDs
      userFiliais = userData?.filiais ?? [];
    } else if (isAdmin) {
    }

    // STEP 5: Buscar parâmetros RLS
    let resolvedRlsRole = rlsRole as string | undefined;
    let customDataOrigem = "nome"; // Padrão: usar nome da filial


    if (rls && dashboardId) {

      const { rows: rlsParams } = await query<RlsParamRow>(
        `SELECT tipo, nome_parametro_powerbi FROM via_core.parametros_rls WHERE dashboard_id = $1`,
        [dashboardId]
      );


      if (rlsParams && rlsParams.length > 0) {
        rlsParams.forEach((p, i: number) => {
        });

        const filialParam = rlsParams.find((p) => p.tipo === "Filial");
        if (filialParam) {
          resolvedRlsRole = filialParam.nome_parametro_powerbi ?? undefined;
        }
        const userParam = rlsParams.find((p) => p.tipo === "Usuário");
        if (userParam && !filialParam) {
          customData = session.user.email ?? "";
          resolvedRlsRole = userParam.nome_parametro_powerbi ?? undefined;
        }
      } else {
      }
    } else {
    }

    // STEP 6: Obter access token do Azure

    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (azureError: unknown) {
      const err = azureError as Error;
      console.error("ERRO ao obter token do Azure:");
      console.error("   Mensagem:", err.message);
      console.error("   Stack:", err.stack);
      return NextResponse.json({
        error: "Falha ao autenticar no Azure AD",
        details: err.message,
        step: 6
      }, { status: 500 });
    }

    // STEP 7: Buscar informações do relatório
    const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}`;

    let reportRes;
    try {
      reportRes = await axios.get(reportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (reportError: unknown) {
      const err = reportError as any;
      console.error("ERRO ao buscar relatório:");
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
    const generateTokenBody: any = {
      accessLevel: "View",
      // Aumentar validade para 8 horas (28800 segundos) - máximo permitido
      expiration: new Date(Date.now() + 8 * 60 * 60 * 1000)
    };

    // Formatar customData como string entre aspas (para texto no Power BI)
    const customDataFormatado = userFiliais.length > 0
      ? userFiliais.map(f => `"${f}"`).join(",")
      : "";


    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isAdmin) {
      generateTokenBody.identities = [
        {
          username: session.user.email,
          roles: [resolvedRlsRole],
          customData: customDataFormatado,
          datasets: [datasetId],
        },
      ];
    } else {
    }

    const tokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`;

    let tokenRes;
    try {
      tokenRes = await axios.post(tokenUrl, generateTokenBody, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
      });
    } catch (tokenError: unknown) {
      const err = tokenError as any;
      console.error("ERRO ao gerar token de embed:");
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
    // Registrar uso do token (auditoria)
    if (tokenRes.data.token && credsData?.id) {
      try {
        await registerTokenUsage({
          token: tokenRes.data.token,
          dashboardId,
          userId: String(session.user.id),
          credentialId: String(credsData.id),
          expiresAt: generateTokenBody.expiration.toISOString(),
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || null,
          userAgent: request.headers.get("user-agent") || null,
        });
      } catch (regError) {
        console.error("[embed-token] Erro ao chamar registro de uso:", regError);
        // Nao falha a requisicao se registro der erro
      }
    }

    // STEP 9: Retornar sucesso

    return NextResponse.json({
      accessToken: tokenRes.data.token,
      embedUrl,
      reportName: reportRes.data.name,
    });

  } catch (error: unknown) {
    const err = error as Error & { errorCode?: string; errorMessage?: string; response?: { data: unknown } };
    console.error("\n" + "=".repeat(60));
    console.error("[API] ERRO DESCONHECIDO");
    console.error("=".repeat(60));
    console.error("Erro:", err.message);
    console.error("Stack:", err.stack);
    console.error("Response:", JSON.stringify(err.response?.data, null, 2));
    console.error("=".repeat(60) + "\n");

    return NextResponse.json(
      { error: "Erro inesperado", details: err.message },
      { status: 500 }
    );
  }
}
