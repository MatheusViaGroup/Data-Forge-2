import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import { decryptCredentialIfNeeded } from "@/lib/credentialCrypto";
import { resolveDashboardId, userCanAccessDashboard } from "@/lib/dashboardAccess";
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
  client_secret: string | null;
  master_user: string;
  master_password: string | null;
};

type UserDataRow = {
  filiais: string[] | null;
};

type CredentialResult = {
  id: string | null;
  clientId: string;
  tenantId: string;
  clientSecret: string;
  masterUser: string;
  masterPassword: string;
};

type InMemoryTokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 60_000;
const accessTokenCache = new Map<string, InMemoryTokenCacheEntry>();

async function getCredentials(): Promise<CredentialResult> {
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
      clientSecret: decryptCredentialIfNeeded(data.client_secret ?? ""),
      masterUser: data.master_user,
      masterPassword: decryptCredentialIfNeeded(data.master_password ?? ""),
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

function getCredentialCacheKey(creds: CredentialResult): string {
  if (creds.id) {
    return `db:${creds.id}`;
  }

  return `env:${creds.tenantId}:${creds.clientId}:${creds.masterUser}`;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const creds = await getCredentials();

  const cacheKey = getCredentialCacheKey(creds);
  const cachedToken = accessTokenCache.get(cacheKey);
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_EXPIRY_SAFETY_WINDOW_MS) {
    return cachedToken.token;
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
    throw new Error("Access token nao obtido");
  }

  const expiresAt = result.expiresOn?.getTime() ?? now + 3_600_000;
  accessTokenCache.set(cacheKey, { token: result.accessToken, expiresAt });

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
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as EmbedRequestBody;
    const { reportId, groupId, dashboardId, rls, rlsRole } = body;

    if (!reportId || !groupId) {
      return NextResponse.json({ error: "Parametros obrigatorios ausentes" }, { status: 400 });
    }

    const resolvedDashboardId = await resolveDashboardId(reportId, groupId);
    if (!resolvedDashboardId) {
      return NextResponse.json({ error: "Dashboard nao encontrado" }, { status: 404 });
    }

    if (dashboardId && dashboardId !== resolvedDashboardId) {
      return NextResponse.json(
        { error: "Dashboard informado nao corresponde ao reportId/groupId" },
        { status: 400 }
      );
    }

    const canAccessDashboard = userCanAccessDashboard(
      session.user.role,
      session.user.allowedDashboards,
      resolvedDashboardId
    );

    if (!canAccessDashboard) {
      return NextResponse.json({ error: "Acesso negado ao dashboard solicitado" }, { status: 403 });
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

    const userData = await queryOne<UserDataRow>(
      `SELECT filiais
       FROM via_core.usuarios
       WHERE email = $1
       LIMIT 1`,
      [session.user.email]
    );

    const isRlsBypassUser = session.user.role === "admin" || session.user.role === "matriz";
    const userFiliais = rls && !isRlsBypassUser ? userData?.filiais ?? [] : [];

    let resolvedRlsRole = rlsRole;
    let customData = "";

    if (rls) {
      const { rows: rlsParams } = await query<RlsParamRow>(
        `SELECT tipo, nome_parametro_powerbi
         FROM via_core.parametros_rls
         WHERE dashboard_id = $1`,
        [resolvedDashboardId]
      );

      const filialParam = rlsParams.find((param) => param.tipo === "Filial");
      if (filialParam) {
        resolvedRlsRole = filialParam.nome_parametro_powerbi ?? undefined;
      }

      const userParam = rlsParams.find(
        (param) => param.tipo === "UsuÃ¡rio" || param.tipo === "Usuario"
      );
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
      console.error("[embed-token-by-id] Erro ao buscar relatorio:", getErrorMessage(error));
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

    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isRlsBypassUser) {
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

    if (tokenRes.data.token && credsData.id && session.user.id) {
      try {
        await registerTokenUsage({
          token: tokenRes.data.token as string,
          dashboardId: resolvedDashboardId,
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
