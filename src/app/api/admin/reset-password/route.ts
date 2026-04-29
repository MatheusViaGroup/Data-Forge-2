import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
  }

  const tempPassword = crypto.randomBytes(8).toString("hex");
  const hash = await bcrypt.hash(tempPassword, 10);

  try {
    await query(
      `UPDATE via_core.usuarios
       SET senha_hash = $1, must_change_password = true
       WHERE id = $2`,
      [hash, id]
    );

    return NextResponse.json({ success: true, tempPassword });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[reset-password] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
