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

// Client credentials flow (app-only)
async function getAppToken(tenantId: string, clientId: string, clientSecret: string, scope: string): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AppToken error: ${data.error} - ${data.error_description}`);
  return data.access_token as string;
}

// ROPC flow (user token via master_user + master_password)
async function getUserToken(tenantId: string, clientId: string, clientSecret: string, username: string, password: string, scope: string): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
      scope,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`UserToken error: ${data.error} - ${data.error_description}`);
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
    .select("tenant_id, client_id, client_secret, master_user, master_password")
    .eq("status", "ativo")
    .limit(1)
    .single();

  if (credError || !cred) {
    return NextResponse.json({ error: "Credencial ativa não encontrada", detail: credError?.message }, { status: 500 });
  }

  const errors: string[] = [];
  const fetchHeaders = { "User-Agent": "Mozilla/5.0 (compatible; ViaCore/1.0)", Accept: "image/*, */*" };
  const encodedUrl = encodeSharingUrl(url);

  // ── T1: ROPC (master user) + Graph /shares/{encoded}/driveItem/content ────
  try {
    const userToken = await getUserToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      cred.master_user, cred.master_password,
      "https://graph.microsoft.com/Files.Read.All Sites.Read.All offline_access"
    );
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem/content`;
    console.log("[sp-image] T1 ROPC+Graph:", graphUrl);

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${userToken}`, ...fetchHeaders },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.startsWith("image/")) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
      });
    }
    const body = await res.text().catch(() => "");
    errors.push(`T1-ROPC+Graph: ${res.status} / ${ct} / ${body.slice(0, 300)}`);
  } catch (e) {
    errors.push(`T1-ROPC+Graph exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── T2: ROPC (master user) + SharePoint REST API ──────────────────────────
  try {
    const spHost = "https://vialacteoscombr.sharepoint.com";
    const userSpToken = await getUserToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      cred.master_user, cred.master_password,
      `${spHost}/AllSites.Read`
    );
    console.log("[sp-image] T2 ROPC+SP direto:", url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${userSpToken}`, ...fetchHeaders },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.startsWith("image/")) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
      });
    }
    const body = await res.text().catch(() => "");
    errors.push(`T2-ROPC+SP: ${res.status} / ${ct} / ${body.slice(0, 300)}`);
  } catch (e) {
    errors.push(`T2-ROPC+SP exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── T3: App-only token + Graph /shares/{encoded}/driveItem/content ─────────
  try {
    const appToken = await getAppToken(
      cred.tenant_id, cred.client_id, cred.client_secret,
      "https://graph.microsoft.com/.default"
    );
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem/content`;
    console.log("[sp-image] T3 AppOnly+Graph:", graphUrl);

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${appToken}`, ...fetchHeaders },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.startsWith("image/")) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
      });
    }
    const body = await res.text().catch(() => "");
    errors.push(`T3-AppOnly+Graph: ${res.status} / ${ct} / ${body.slice(0, 300)}`);
  } catch (e) {
    errors.push(`T3-AppOnly+Graph exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.error("[sp-image] Todas tentativas falharam:", errors);
  return NextResponse.json({ error: "Falha ao buscar imagem", attempts: errors }, { status: 502 });
}
