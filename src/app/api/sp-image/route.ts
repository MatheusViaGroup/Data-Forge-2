import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { queryOne } from "@/lib/db";
import { decryptCredentialIfNeeded } from "@/lib/credentialCrypto";
import * as msal from "@azure/msal-node";

function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return "u!" + base64;
}

export async function GET(request: NextRequest) {
  // Verificar sessão
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Parâmetro url obrigatório" }, { status: 400 });
  }

  // Validar que a URL pertence ao domínio SharePoint da organização (anti-SSRF)
  const allowedHosts = ["sharepoint.com", "viagroup.sharepoint.com"];
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  const hostAllowed = allowedHosts.some(
    (h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith("." + h)
  );
  if (!hostAllowed) {
    return NextResponse.json({ error: "Domínio não permitido" }, { status: 403 });
  }

  // Buscar credencial ativa (status pode ser "Ativo" ou "ativo")
  let cred;
  try {
    cred = await queryOne(
      `SELECT tenant_id, client_id, client_secret
       FROM via_core.credenciais
       WHERE status ILIKE 'ativo'
       LIMIT 1`
    );
  } catch (credError: any) {
    return NextResponse.json(
      { error: "Credencial ativa não encontrada", detail: credError?.message },
      { status: 500 }
    );
  }

  if (!cred) {
    return NextResponse.json(
      { error: "Credencial ativa não encontrada" },
      { status: 500 }
    );
  }

  // Obter token via client_credentials (app-only) — usa permissões Application (Sites.Read.All)
  let accessToken: string;
  try {
    const cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: cred.client_id as string,
        authority: `https://login.microsoftonline.com/${cred.tenant_id}`,
        clientSecret: decryptCredentialIfNeeded((cred.client_secret as string) ?? ""),
      },
    });

    const authResult = await cca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    if (!authResult?.accessToken) {
      return NextResponse.json({ error: "Token Graph não obtido (authResult vazio)" }, { status: 500 });
    }

    accessToken = authResult.accessToken;
  } catch (e: unknown) {
    const err = e as Error & { errorCode?: string; errorMessage?: string };
    return NextResponse.json(
      {
        error: "Falha ao obter token Graph via client_credentials",
        errorCode: err.errorCode,
        detail: err.errorMessage ?? err.message,
      },
      { status: 500 }
    );
  }

  // Buscar imagem via Graph API /shares/{encoded}/driveItem/content
  const encodedUrl = encodeSharingUrl(url);
  const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem/content`;

  console.log("[sp-image] Buscando:", graphUrl);

  const res = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "image/*, */*",
    },
    redirect: "follow",
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Graph API retornou erro",
        status: res.status,
        contentType,
        body: body.slice(0, 500),
        dica: res.status === 403
          ? "O app Azure não tem permissão Sites.Read.All ou Files.Read.All no Microsoft Graph. Adicione em Azure AD → App registrations → API permissions → Microsoft Graph → Application permissions → Sites.Read.All → Grant admin consent."
          : undefined,
      },
      { status: 502 }
    );
  }

  if (!contentType.startsWith("image/")) {
    const body = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Resposta não é imagem", contentType, body: body.slice(0, 300) },
      { status: 502 }
    );
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
