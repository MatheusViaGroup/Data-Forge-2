import { NextRequest, NextResponse } from "next/server";
import * as msal from "@azure/msal-node";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { queryOne } from "@/lib/db";
import { decryptCredentialValue } from "@/lib/credentialCrypto";

type CredentialRow = {
  client_id: string;
  tenant_id: string;
  client_secret: string | null;
  master_user: string;
  master_password: string | null;
};

type CredentialsResult = {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  masterUser: string;
  masterPassword: string;
};

type DashboardLookupRow = {
  id: string;
};

async function getCredentials(): Promise<CredentialsResult> {
  const data = await queryOne<CredentialRow>(
    `SELECT client_id, tenant_id, client_secret, master_user, master_password
     FROM via_core.credenciais
     WHERE status = 'ativo'
     LIMIT 1`
  );

  if (data) {
    return {
      clientId: data.client_id,
      tenantId: data.tenant_id,
      clientSecret: decryptCredentialValue(data.client_secret ?? ""),
      masterUser: data.master_user,
      masterPassword: decryptCredentialValue(data.master_password ?? ""),
    };
  }

  return {
    clientId: process.env.POWERBI_CLIENT_ID ?? "",
    tenantId: process.env.POWERBI_TENANT_ID ?? "",
    clientSecret: process.env.POWERBI_CLIENT_SECRET ?? "",
    masterUser: process.env.POWERBI_MASTER_USER ?? "",
    masterPassword: process.env.POWERBI_MASTER_PASSWORD ?? "",
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data;
    if (typeof apiMessage === "string") return apiMessage;
    if (apiMessage && typeof apiMessage === "object" && "message" in apiMessage) {
      const message = (apiMessage as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    return error.message;
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

    const body = (await request.json()) as { reportId?: string; groupId?: string };
    const { reportId, groupId } = body;

    if (!reportId || !groupId) {
      return NextResponse.json({ error: "reportId e groupId sao obrigatorios" }, { status: 400 });
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

    const isPrivileged = session.user.role === "admin" || session.user.role === "matriz";
    if (!isPrivileged) {
      const allowed = new Set(session.user.allowedDashboards ?? []);
      if (!allowed.has(dashboard.id)) {
        return NextResponse.json({ error: "Sem permissao para este dashboard" }, { status: 403 });
      }
    }

    const creds = await getCredentials();
    if (!creds.clientId || !creds.tenantId || !creds.clientSecret || !creds.masterUser || !creds.masterPassword) {
      return NextResponse.json({ error: "Credenciais Power BI nao configuradas" }, { status: 500 });
    }

    const msalConfig: msal.Configuration = {
      auth: {
        clientId: creds.clientId,
        authority: `https://login.microsoftonline.com/${creds.tenantId}`,
        clientSecret: creds.clientSecret,
      },
    };

    const cca = new msal.ConfidentialClientApplication(msalConfig);
    const authResult = await cca.acquireTokenByUsernamePassword({
      scopes: ["https://analysis.windows.net/powerbi/api/.default"],
      username: creds.masterUser,
      password: creds.masterPassword,
    });

    if (!authResult?.accessToken) {
      return NextResponse.json({ error: "Access token nao obtido" }, { status: 500 });
    }

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

      embedUrl = reportResponse.data.embedUrl as string;
    } catch (error: unknown) {
      console.error("[embed-token] Erro ao buscar relatorio:", getErrorMessage(error));
      return NextResponse.json({ error: "Falha ao buscar relatorio" }, { status: 500 });
    }

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

      embedToken = tokenResponse.data.token as string;
    } catch (error: unknown) {
      console.error("[embed-token] Erro ao gerar embed token:", getErrorMessage(error));
      return NextResponse.json({ error: "Falha ao gerar embed token" }, { status: 500 });
    }

    return NextResponse.json({ accessToken: embedToken, embedUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[embed-token] Erro inesperado:", err.message);
    if (err.message.includes("CREDENTIAL_ENCRYPTION_KEY")) {
      return NextResponse.json(
        { error: "CREDENTIAL_ENCRYPTION_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Erro interno do servidor", details: err.message }, { status: 500 });
  }
}
