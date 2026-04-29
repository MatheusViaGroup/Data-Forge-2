import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { registerTokenUsage } from "@/lib/tokenUsage";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { token, dashboardId, credentialId, expiresAt } = body;

    if (!token || !dashboardId || !credentialId || !expiresAt) {
      return NextResponse.json(
        { error: "Token, dashboardId, credentialId e expiresAt sÃ£o obrigatÃ³rios" },
        { status: 400 }
      );
    }

    const result = await registerTokenUsage({
      token,
      dashboardId,
      userId: session.user.id,
      credentialId,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || null,
      userAgent: request.headers.get("user-agent") || null,
    });

    if (result.duplicate) {
      return NextResponse.json({ success: true, message: "Token jÃ¡ registrado" });
    }

    if (!result.id) {
      return NextResponse.json({ error: "Falha ao registrar token" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[token-usage] Erro inesperado:", err.message);
    return NextResponse.json({ error: "Erro interno", details: err.message }, { status: 500 });
  }
}
