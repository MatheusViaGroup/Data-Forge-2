import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return "u!" + base64;
}

async function getAzureToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  scope: string
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token error: ${data.error} - ${data.error_description}`);
  }
  return data.access_token as string;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Parâmetro url obrigatório" }, { status: 400 });
  }

  // Busca credencial ativa
  const { data: cred, error: credError } = await supabaseAdmin
    .from("credenciais")
    .select("tenant_id, client_id, client_secret")
    .eq("status", "ativo")
    .limit(1)
    .single();

  if (credError || !cred) {
    console.error("[sp-image] Credencial não encontrada:", credError?.message);
    return NextResponse.json(
      { error: "Nenhuma credencial ativa encontrada", detail: credError?.message },
      { status: 500 }
    );
  }

  const errors: string[] = [];

  // ── Tentativa 1: Graph API /shares/{encoded}/driveItem/content ────────────
  try {
    const graphToken = await getAzureToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      "https://graph.microsoft.com/.default"
    );
    const encodedUrl = encodeSharingUrl(url);
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem/content`;

    console.log("[sp-image] Tentativa 1 - Graph shares:", graphUrl);
    const res1 = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${graphToken}` },
      redirect: "follow",
    });

    if (res1.ok) {
      const ct = res1.headers.get("content-type") ?? "image/png";
      if (ct.startsWith("image/")) {
        const buf = await res1.arrayBuffer();
        return new NextResponse(buf, {
          headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
        });
      }
    }
    const body1 = await res1.text();
    errors.push(`Graph/shares: ${res1.status} - ${body1.slice(0, 200)}`);
  } catch (e) {
    errors.push(`Graph/shares exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Tentativa 2: URL direto com token Graph ───────────────────────────────
  try {
    const graphToken = await getAzureToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      "https://graph.microsoft.com/.default"
    );
    console.log("[sp-image] Tentativa 2 - URL direto + token Graph:", url);
    const res2 = await fetch(url, {
      headers: { Authorization: `Bearer ${graphToken}` },
      redirect: "follow",
    });

    if (res2.ok) {
      const ct = res2.headers.get("content-type") ?? "image/png";
      if (ct.startsWith("image/")) {
        const buf = await res2.arrayBuffer();
        return new NextResponse(buf, {
          headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
        });
      }
    }
    const body2 = await res2.text();
    errors.push(`Direct+GraphToken: ${res2.status} - ${body2.slice(0, 200)}`);
  } catch (e) {
    errors.push(`Direct+GraphToken exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Tentativa 3: SharePoint REST API com token SP ─────────────────────────
  try {
    const spHost = new URL(url).origin; // ex: https://vialacteoscombr.sharepoint.com
    const spToken = await getAzureToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      `${spHost}/.default`
    );

    console.log("[sp-image] Tentativa 3 - URL direto + token SP:", url);
    const res3 = await fetch(url, {
      headers: { Authorization: `Bearer ${spToken}` },
      redirect: "follow",
    });

    if (res3.ok) {
      const ct = res3.headers.get("content-type") ?? "image/png";
      if (ct.startsWith("image/")) {
        const buf = await res3.arrayBuffer();
        return new NextResponse(buf, {
          headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
        });
      }
    }
    const body3 = await res3.text();
    errors.push(`Direct+SPToken: ${res3.status} - ${body3.slice(0, 200)}`);
  } catch (e) {
    errors.push(`Direct+SPToken exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Todas as tentativas falharam — retorna erro com detalhes para debug
  console.error("[sp-image] Todas tentativas falharam:", errors);
  return NextResponse.json({ error: "Falha ao buscar imagem", attempts: errors }, { status: 502 });
}
