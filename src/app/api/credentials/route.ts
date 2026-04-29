import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

type CredencialRow = {
  id: string;
  nome: string;
  tenant: string | null;
  client_id: string;
  client_secret: string | null;
  tenant_id: string;
  master_user: string;
  master_password: string | null;
  created_at: string | Date | null;
  secret_expiration: string | null;
  status: string;
};

type CredencialBody = {
  id?: string;
  nome?: string;
  tenant?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  usuarioPowerBI?: string;
  masterPassword?: string;
  dataExpiracao?: string;
  status?: string;
};

function mapRow(row: CredencialRow) {
  return {
    id: row.id,
    nome: row.nome,
    tenant: row.tenant ?? "",
    clientId: row.client_id,
    clientSecret: row.client_secret ? "••••••••" : "",
    tenantId: row.tenant_id,
    usuarioPowerBI: row.master_user,
    masterPassword: row.master_password ? "••••••••" : "",
    dataRegistro: row.created_at ? new Date(row.created_at).toLocaleDateString("pt-BR") : "",
    dataExpiracao: row.secret_expiration
      ? new Date(`${row.secret_expiration}T12:00:00`).toLocaleDateString("pt-BR")
      : "",
    status: row.status === "ativo" ? "Ativo" : "Inativo",
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { rows } = await query<CredencialRow>("SELECT * FROM via_core.credenciais ORDER BY created_at");
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[credentials][GET] Erro ao buscar credenciais:", err.message);
    return NextResponse.json({ error: "Erro ao buscar credenciais" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as CredencialBody;

  try {
    const data = await queryOne<CredencialRow>(
      `INSERT INTO via_core.credenciais (nome, tenant, client_id, client_secret, tenant_id, master_user, master_password, secret_expiration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        body.nome ?? "",
        body.tenant ?? "",
        body.clientId ?? "",
        body.clientSecret ?? "",
        body.tenantId ?? "",
        body.usuarioPowerBI ?? "",
        body.masterPassword ?? "",
        body.dataExpiracao ? body.dataExpiracao.split("/").reverse().join("-") : null,
        body.status === "Ativo" ? "ativo" : "inativo",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao inserir credencial" }, { status: 500 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[credentials][POST] Erro ao inserir credencial:", err.message);
    return NextResponse.json({ error: "Erro ao inserir credencial" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as CredencialBody;

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  setClauses.push(`nome = $${paramIdx++}`);
  params.push(body.nome);

  setClauses.push(`tenant = $${paramIdx++}`);
  params.push(body.tenant);

  setClauses.push(`client_id = $${paramIdx++}`);
  params.push(body.clientId);

  setClauses.push(`tenant_id = $${paramIdx++}`);
  params.push(body.tenantId);

  setClauses.push(`master_user = $${paramIdx++}`);
  params.push(body.usuarioPowerBI);

  setClauses.push(`secret_expiration = $${paramIdx++}`);
  params.push(body.dataExpiracao ? body.dataExpiracao.split("/").reverse().join("-") : null);

  setClauses.push(`status = $${paramIdx++}`);
  params.push(body.status === "Ativo" ? "ativo" : "inativo");

  if (body.clientSecret && body.clientSecret !== "••••••••") {
    setClauses.push(`client_secret = $${paramIdx++}`);
    params.push(body.clientSecret);
  }
  if (body.masterPassword && body.masterPassword !== "••••••••") {
    setClauses.push(`master_password = $${paramIdx++}`);
    params.push(body.masterPassword);
  }

  params.push(body.id);

  try {
    const data = await queryOne<CredencialRow>(
      `UPDATE via_core.credenciais SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (!data) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[credentials][PUT] Erro ao atualizar credencial:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar credencial" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  try {
    await query("DELETE FROM via_core.credenciais WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[credentials][DELETE] Erro ao excluir credencial:", err.message);
    return NextResponse.json({ error: "Erro ao excluir credencial" }, { status: 500 });
  }
}
