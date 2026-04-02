import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

// Gera hash SHA-256 do token para armazenamento seguro
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { token, dashboardId, credentialId, expiresAt, reportId, groupId } = body;

    if (!token || !dashboardId || !credentialId || !expiresAt) {
      return NextResponse.json(
        { error: "Token, dashboardId, credentialId e expiresAt são obrigatórios" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const expiresAtDate = new Date(expiresAt);

    // Verificar se já existe registro com mesmo hash (evita duplicatas)
    const { data: existing } = await supabaseAdmin
      .from("uso_tokens")
      .select("id")
      .eq("token_hash", tokenHash)
      .single();

    if (existing) {
      console.log("[token-usage] Token já registrado anteriormente:", tokenHash.substring(0, 16));
      return NextResponse.json({ success: true, message: "Token já registrado" });
    }

    // Inserir novo registro
    const { data: inserted, error } = await supabaseAdmin
      .from("uso_tokens")
      .insert({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        dashboard_id: dashboardId,
        user_id: session.user.id,
        credential_id: credentialId,
        expires_at: expiresAtDate.toISOString(),
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || null,
        user_agent: request.headers.get("user-agent") || null,
        status: "ativo",
      })
      .select()
      .single();

    if (error) {
      console.error("[token-usage] Erro ao registrar token:", error.message);
      return NextResponse.json({ error: "Falha ao registrar token", details: error.message }, { status: 500 });
    }

    console.log("[token-usage] Token registrado com sucesso:", {
      id: inserted.id,
      tokenHash: tokenHash.substring(0, 16),
      dashboardId,
      userId: session.user.id,
      expiresAt: expiresAtDate,
    });

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[token-usage] Erro inesperado:", err.message);
    return NextResponse.json({ error: "Erro interno", details: err.message }, { status: 500 });
  }
}
