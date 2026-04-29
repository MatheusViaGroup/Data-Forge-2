import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { ADMIN_TENANT_ACCESS, authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import { registerTokenUsage } from "@/lib/tokenUsage";

type EmbedRequestBody = {
  reportId?: string;
  groupId?: string;
  dashboardId?: string;
  rls?: boolean;
  rlsRole?: string;
};

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
    console.error("[embed-token-by-id] Erro ao verificar colunas de cache:", err.message);
    hasCredentialTokenCacheColumns = false;
  }

  return hasCredentialTokenCacheColumns;
}

async function getCredentials(): Promise<CredentialsResult> {
  const data = await queryOne<CredentialRow>(
    `SELECT id, client_id, tenant_id, client_secret, master_user, master_password
     FROM via_core.credenciais
     WHERE status = 'ativo'
     LIMIT 1`
  );

  if (data) {
    return {
      id: data.id,
      clientId: data.client_id,
      tenantId: data.tenant_id,
      clientSecret: data.client_secret,
      masterUser: data.master_user,
      masterPassword: data.master_password,
    };
  }

  return {
    id: null,
    clientId: process.env.POWERBI_CLIENT_ID ?? "",
    tenantId: process.env.POWERBI_TENANT_ID ?? "",
    clientSecret: process.env.POWERBI_CLIENT_SECRET ?? "",
    masterUser: process.env.POWERBI_MASTER_USER ?? "",
    masterPassword: process.env.POWERBI_MASTER_PASSWORD ?? "",
  };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const creds = await getCredentials();

  if (await canUseCredentialTokenCache()) {
    try {
      if (creds.id) {
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
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[embed-token-by-id] Erro ao ler cache do token no banco:", err.message);
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
    throw new Error("Access token não obtido");
  }

  const expiresAt = result.expiresOn?.getTime() ?? now + 3_600_000;

  if (await canUseCredentialTokenCache()) {
    try {
      if (creds.id) {
        await query(
          `UPDATE via_core.credenciais
           SET cached_access_token = $1,
               token_expires_at = $2
           WHERE id = $3`,
          [result.accessToken, new Date(expiresAt).toISOString(), creds.id]
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[embed-token-by-id] Erro ao salvar cache do token no banco:", err.message);
    }
  }

  return result.accessToken;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data;
    if (typeof apiMessage === "string") return apiMessage;
    if (apiMessage && typeof apiMessage === "object" && "message" in apiMessage) {
      const message = (apiMessage as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    if (error.message) return error.message;
  }

  if (error instanceof Error) return error.message;
  return "Erro desconhecido";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as EmbedRequestBody;
    const { reportId, groupId, dashboardId, rls, rlsRole } = body;

    if (!reportId || !groupId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    const credsData = await queryOne<{ id: string }>(
      `SELECT id
       FROM via_core.credenciais
       WHERE status = 'ativo'
       LIMIT 1`
    );

    if (!credsData) {
      console.error("[embed-token-by-id] Nenhuma credencial ativa encontrada");
      return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
    }

    const userData = await queryOne<{ filiais: string[] | null; acesso: string }>(
      `SELECT filiais, acesso
       FROM via_core.usuarios
       WHERE email = $1
       LIMIT 1`,
      [session.user.email]
    );

    const isAdmin =
      userData?.acesso === ADMIN_TENANT_ACCESS || userData?.acesso === "Matriz";
    const userFiliais = rls && !isAdmin ? userData?.filiais ?? [] : [];

    let resolvedRlsRole = rlsRole;
    let customData = "";

    if (rls && dashboardId) {
      const { rows: rlsParams } = await query<RlsParamRow>(
        `SELECT tipo, nome_parametro_powerbi
         FROM via_core.parametros_rls
         WHERE dashboard_id = $1`,
        [dashboardId]
      );

      const filialParam = rlsParams.find((param) => param.tipo === "Filial");
      if (filialParam) {
        resolvedRlsRole = filialParam.nome_parametro_powerbi ?? undefined;
      }

      const userParam = rlsParams.find((param) => param.tipo === "Usuário");
      if (userParam && !filialParam) {
        customData = session.user.email;
        resolvedRlsRole = userParam.nome_parametro_powerbi ?? undefined;
      }
    }

    const accessToken = await getAccessToken();

    let reportRes;
    try {
      reportRes = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (error: unknown) {
      console.error("[embed-token-by-id] Erro ao buscar relatório:", getErrorMessage(error));
      return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
    }

    const embedUrl = reportRes.data.embedUrl as string;
    const datasetId = reportRes.data.datasetId as string | undefined;

    const generateTokenBody: {
      accessLevel: "View";
      expiration: Date;
      identities?: Array<{
        username: string;
        roles: string[];
        customData: string;
        datasets: string[];
      }>;
    } = {
      accessLevel: "View",
      expiration: new Date(Date.now() + 8 * 60 * 60 * 1000),
    };

    const customDataFormatado =
      customData || (userFiliais.length > 0 ? userFiliais.map((filial) => `"${filial}"`).join(",") : "");

    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isAdmin) {
      generateTokenBody.identities = [
        {
          username: session.user.email,
          roles: [resolvedRlsRole],
          customData: customDataFormatado,
          datasets: [datasetId],
        },
      ];
    }

    let tokenRes;
    try {
      tokenRes = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`,
        generateTokenBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: unknown) {
      console.error("[embed-token-by-id] Erro ao gerar token de embed:", getErrorMessage(error));
      return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
    }

    if (tokenRes.data.token && credsData.id && dashboardId && session.user.id) {
      try {
        await registerTokenUsage({
          token: tokenRes.data.token as string,
          dashboardId,
          userId: session.user.id,
          credentialId: credsData.id,
          expiresAt: generateTokenBody.expiration.toISOString(),
          ipAddress:
            request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || null,
          userAgent: request.headers.get("user-agent") || null,
        });
      } catch (error: unknown) {
        const err = error as Error;
        console.error("[embed-token-by-id] Erro ao registrar uso do token:", err.message);
      }
    }

    return NextResponse.json({
      accessToken: tokenRes.data.token,
      embedUrl,
      reportName: reportRes.data.name,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[embed-token-by-id] Erro inesperado:", err.message);
    return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
  }
}
