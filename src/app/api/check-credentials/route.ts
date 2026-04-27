import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Apenas administradores podem verificar expiração
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  // Busca todas as credenciais ativas
  try {
    const { rows: credenciais } = await query(
      `SELECT id, nome, client_id, master_user, data_expiracao, status, created_at
       FROM via_core.credenciais
       WHERE status = 'ativo'
       ORDER BY data_expiracao ASC`
    );

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Normalizar para início do dia

    const resultado = credenciais.map((c: any) => {
      const expiraCerta = c.data_expiracao ? new Date(c.data_expiracao) : null;
      const diasRestantes = expiraCerta
        ? Math.max(0, Math.ceil((expiraCerta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      // Determinar nível de alerta
      let nivelAlerta: null | "crítico" | "alto" | "médio" = null;
      if (diasRestantes !== null) {
        if (diasRestantes === 0) nivelAlerta = "crítico";
        else if (diasRestantes <= 7) nivelAlerta = "alto";
        else if (diasRestantes <= 30) nivelAlerta = "médio";
      }

      return {
        id: c.id,
        nome: c.nome,
        clientId: c.client_id,
        masterUser: c.master_user,
        dataExpiracao: c.data_expiracao,
        diasRestantes,
        status: c.status,
        alerta: nivelAlerta !== null,
        nivelAlerta: nivelAlerta,
      };
    });

    return NextResponse.json({ credenciais: resultado });
  } catch (error: any) {
    console.error("[check-credentials] Erro ao buscar credenciais:", error.message);
    return NextResponse.json({ error: "Erro ao buscar credenciais", details: error.message }, { status: 500 });
  }
}
