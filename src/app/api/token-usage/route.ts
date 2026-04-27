import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
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
    const existing = await queryOne(
      "SELECT id FROM via_core.uso_tokens WHERE token_hash = $1 LIMIT 1",
      [tokenHash]
    );

    if (existing) {
      console.log("[token-usage] Token já registrado anteriormente:", tokenHash.substring(0, 16));
      return NextResponse.json({ success: true, message: "Token já registrado" });
    }

    // Inserir novo registro
    const inserted = await queryOne(
      `INSERT INTO via_core.uso_tokens (id, token_hash, dashboard_id, user_id, credential_id, expires_at, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        crypto.randomUUID(),
        tokenHash,
        dashboardId,
        session.user.id,
        credentialId,
        expiresAtDate.toISOString(),
        request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || null,
        request.headers.get("user-agent") || null,
        "ativo",
      ]
    );

    if (!inserted) {
      console.error("[token-usage] Erro ao registrar token: nenhum dado retornado");
      return NextResponse.json({ error: "Falha ao registrar token" }, { status: 500 });
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
