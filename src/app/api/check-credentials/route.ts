import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

type CredentialCheckRow = {
  id: string;
  nome: string;
  client_id: string;
  master_user: string;
  data_expiracao: string | null;
  status: string;
};

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { rows: credenciais } = await query<CredentialCheckRow>(
      `SELECT id, nome, client_id, master_user, data_expiracao, status
       FROM via_core.credenciais
       WHERE status = 'ativo'
       ORDER BY data_expiracao ASC`
    );

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const resultado = credenciais.map((credencial) => {
      const expiraEm = credencial.data_expiracao ? new Date(credencial.data_expiracao) : null;
      const diasRestantes =
        expiraEm === null
          ? null
          : Math.max(0, Math.ceil((expiraEm.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));

      let nivelAlerta: null | "critico" | "alto" | "medio" = null;
      if (diasRestantes !== null) {
        if (diasRestantes === 0) nivelAlerta = "critico";
        else if (diasRestantes <= 7) nivelAlerta = "alto";
        else if (diasRestantes <= 30) nivelAlerta = "medio";
      }

      return {
        id: credencial.id,
        nome: credencial.nome,
        clientId: credencial.client_id,
        masterUser: credencial.master_user,
        dataExpiracao: credencial.data_expiracao,
        diasRestantes,
        status: credencial.status,
        alerta: nivelAlerta !== null,
        nivelAlerta,
      };
    });

    return NextResponse.json({ credenciais: resultado });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[check-credentials] Erro ao buscar credenciais:", err.message);
    return NextResponse.json({ error: "Erro ao buscar credenciais" }, { status: 500 });
  }
}
