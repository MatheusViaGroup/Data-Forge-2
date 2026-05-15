import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const { id, novaSenha } = (await request.json()) as { id?: string; novaSenha?: string };
  if (!id) {
    return NextResponse.json({ error: "ID do usuario e obrigatorio" }, { status: 400 });
  }

  const senhaCustomValida = typeof novaSenha === "string" && novaSenha.trim().length > 0;
  if (senhaCustomValida && novaSenha.trim().length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  const senhaPlain = senhaCustomValida ? novaSenha.trim() : crypto.randomBytes(8).toString("hex");
  const hash = await bcrypt.hash(senhaPlain, 10);

  try {
    await query(
      `UPDATE via_core.usuarios
       SET senha_hash = $1, must_change_password = true
       WHERE id = $2`,
      [hash, id]
    );

    return NextResponse.json({
      success: true,
      mustChangePassword: true,
      tempPassword: senhaCustomValida ? null : senhaPlain,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[reset-password] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
