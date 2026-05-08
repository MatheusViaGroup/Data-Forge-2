import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import { decryptCredentialIfNeeded } from "@/lib/credentialCrypto";
import { resolveDashboardId, userCanAccessDashboard } from "@/lib/dashboardAccess";
import { registerTokenUsage } from "@/lib/tokenUsage";
import { decryptCredentialValue } from "@/lib/credentialCrypto";

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
<<<<<<< HEAD
=======
};

type UserDataRow = {
  filiais: string[] | null;
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
};

type CredentialResult = {
  id: string | null;
  clientId: string;
  tenantId: string;
  clientSecret: string;
  masterUser: string;
  masterPassword: string;
};

<<<<<<< HEAD
type DashboardLookupRow = {
  id: string;
};

type UserFiliaisRow = {
  filiais: string[] | null;
};

type MemoryTokenCache = {
  token: string;
  expiresAt: number;
  cacheKey: string;
};

let memoryTokenCache: MemoryTokenCache | null = null;

function buildCredentialCacheKey(creds: CredentialsResult): string {
  return `${creds.id ?? "env"}|${creds.clientId}|${creds.tenantId}|${creds.masterUser}`;
}

async function getCredentials(): Promise<CredentialsResult> {
=======
type InMemoryTokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 60_000;
const accessTokenCache = new Map<string, InMemoryTokenCacheEntry>();

async function getCredentials(): Promise<CredentialResult> {
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
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
<<<<<<< HEAD
      clientSecret: decryptCredentialValue(data.client_secret ?? ""),
      masterUser: data.master_user,
      masterPassword: decryptCredentialValue(data.master_password ?? ""),
=======
      clientSecret: decryptCredentialIfNeeded(data.client_secret ?? ""),
      masterUser: data.master_user,
      masterPassword: decryptCredentialIfNeeded(data.master_password ?? ""),
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
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

<<<<<<< HEAD
async function getAccessToken(creds: CredentialsResult): Promise<string> {
=======
function getCredentialCacheKey(creds: CredentialResult): string {
  if (creds.id) {
    return `db:${creds.id}`;
  }

  return `env:${creds.tenantId}:${creds.clientId}:${creds.masterUser}`;
}

async function getAccessToken(): Promise<string> {
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
  const now = Date.now();
  const cacheKey = buildCredentialCacheKey(creds);

<<<<<<< HEAD
  if (memoryTokenCache && memoryTokenCache.cacheKey === cacheKey && memoryTokenCache.expiresAt > now + 60_000) {
    return memoryTokenCache.token;
=======
  const cacheKey = getCredentialCacheKey(creds);
  const cachedToken = accessTokenCache.get(cacheKey);
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_EXPIRY_SAFETY_WINDOW_MS) {
    return cachedToken.token;
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
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
<<<<<<< HEAD
  memoryTokenCache = {
    token: result.accessToken,
    expiresAt,
    cacheKey,
  };
=======
  accessTokenCache.set(cacheKey, { token: result.accessToken, expiresAt });
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc

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
<<<<<<< HEAD
=======
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
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
    }

    const dashboard = await queryOne<DashboardLookupRow>(
      `SELECT id
       FROM via_core.dashboards
       WHERE report_id = $1 AND workspace_id = $2
       LIMIT 1`,
      [reportId, groupId]
    );

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard nao encontrado" }, { status: 404 });
    }

    const resolvedDashboardId = dashboard.id;

    if (dashboardId && dashboardId !== resolvedDashboardId) {
      return NextResponse.json({ error: "Requisicao inconsistente para o dashboard" }, { status: 403 });
    }

    const isPrivileged = session.user.role === "admin" || session.user.role === "matriz";

    if (!isPrivileged) {
      const allowed = new Set(session.user.allowedDashboards ?? []);
      if (!allowed.has(resolvedDashboardId)) {
        return NextResponse.json({ error: "Sem permissao para este dashboard" }, { status: 403 });
      }
    }

    const creds = await getCredentials();
    if (!creds.clientId || !creds.tenantId || !creds.clientSecret || !creds.masterUser || !creds.masterPassword) {
      console.error("[embed-token-by-id] Credenciais Power BI incompletas");
      return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
    }

<<<<<<< HEAD
    let userFiliais: string[] = [];
    if (rls && !isPrivileged) {
      const userData = await queryOne<UserFiliaisRow>(
        `SELECT filiais
         FROM via_core.usuarios
         WHERE email = $1
         LIMIT 1`,
        [session.user.email]
      );

      userFiliais = userData?.filiais ?? [];
    }
=======
    const userData = await queryOne<UserDataRow>(
      `SELECT filiais
       FROM via_core.usuarios
       WHERE email = $1
       LIMIT 1`,
      [session.user.email]
    );

    const isRlsBypassUser = session.user.role === "admin" || session.user.role === "matriz";
    const userFiliais = rls && !isRlsBypassUser ? userData?.filiais ?? [] : [];
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc

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
<<<<<<< HEAD
        (param) => param.tipo === "Usuario" || param.tipo === "Usuário"
=======
        (param) => param.tipo === "UsuÃ¡rio" || param.tipo === "Usuario"
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
      );
      if (userParam && !filialParam) {
        customData = session.user.email;
        resolvedRlsRole = userParam.nome_parametro_powerbi ?? undefined;
      }
    }

    const accessToken = await getAccessToken(creds);

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

<<<<<<< HEAD
    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isPrivileged) {
=======
    if (rls && resolvedRlsRole && datasetId && customDataFormatado && !isRlsBypassUser) {
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
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

<<<<<<< HEAD
    if (tokenRes.data.token && creds.id && session.user.id) {
=======
    if (tokenRes.data.token && credsData.id && session.user.id) {
>>>>>>> 5d8d2ecef750b4fb47df91a876f77e076f54f8cc
      try {
        await registerTokenUsage({
          token: tokenRes.data.token as string,
          dashboardId: resolvedDashboardId,
          userId: session.user.id,
          credentialId: creds.id,
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
    if (err.message.includes("CREDENTIAL_ENCRYPTION_KEY")) {
      return NextResponse.json(
        { error: "CREDENTIAL_ENCRYPTION_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Falha ao gerar token de embed" }, { status: 500 });
  }
}
