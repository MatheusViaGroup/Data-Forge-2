import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { novaSenha } = (await request.json()) as { novaSenha?: string };
  const senhaValida =
    typeof novaSenha === "string" &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(novaSenha);

  if (!senhaValida) {
    return NextResponse.json(
      {
        error:
          "A senha deve ter minimo 8 caracteres, uma letra maiuscula, uma minuscula e um numero",
      },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(novaSenha, 10);

  try {
    await query(
      `UPDATE via_core.usuarios
       SET senha_hash = $1, must_change_password = false
       WHERE id = $2`,
      [hash, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[change-password] Erro ao atualizar senha:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 });
  }
}
