import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

// Codifica a sharing URL para o formato aceito pela Graph API
function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return "u!" + base64;
}

async function getAzureToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Erro ao obter token Azure");
  return data.access_token as string;
}

// Cache simples do token em memória (evita buscar a cada request)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  // Busca credencial ativa do banco
  const { data: cred, error } = await supabaseAdmin
    .from("credenciais")
    .select("tenant_id, client_id, client_secret")
    .eq("status", "ativo")
    .limit(1)
    .single();

  if (error || !cred) throw new Error("Nenhuma credencial ativa encontrada");

  const token = await getAzureToken(cred.tenant_id, cred.client_id, cred.client_secret);
  cachedToken = { token, expiresAt: now + 55 * 60 * 1000 }; // 55 min
  return token;
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

  try {
    const token = await getToken();

    // Tenta via sharing link (Graph API)
    const encodedUrl = encodeSharingUrl(url);
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem/content`;

    const imgRes = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
    });

    if (!imgRes.ok) {
      // Fallback: tenta o URL diretamente com o token
      const directRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!directRes.ok) {
        return NextResponse.json({ error: `Falha ao buscar imagem: ${directRes.status}` }, { status: 502 });
      }
      const buf = await directRes.arrayBuffer();
      const ct = directRes.headers.get("content-type") ?? "image/png";
      return new NextResponse(buf, {
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600" },
      });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
