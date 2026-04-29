import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";function mapRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    tenant: row.tenant ?? "",
    clientId: row.client_id,
    clientSecret: row.client_secret ? "••••••••" : "",
    tenantId: row.tenant_id,
    usuarioPowerBI: row.master_user,
    masterPassword: row.master_password ? "••••••••" : "",
    dataRegistro: row.created_at
      ? new Date(row.created_at).toLocaleDateString("pt-BR")
      : "",
    dataExpiracao: row.secret_expiration
      ? new Date(row.secret_expiration + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    status: row.status === "ativo" ? "Ativo" : "Inativo",
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { rows } = await query(
      "SELECT * FROM via_core.credenciais ORDER BY created_at"
    );
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const data = await queryOne(
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
        body.dataExpiracao
          ? body.dataExpiracao.split("/").reverse().join("-")
          : null,
        body.status === "Ativo" ? "ativo" : "inativo",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao inserir credencial" }, { status: 500 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();

  // Build dynamic SET clause
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
  params.push(
    body.dataExpiracao
      ? body.dataExpiracao.split("/").reverse().join("-")
      : null
  );

  setClauses.push(`status = $${paramIdx++}`);
  params.push(body.status === "Ativo" ? "ativo" : "inativo");

  // Só atualiza secrets se vierem preenchidos (não placeholder)
  if (body.clientSecret && body.clientSecret !== "••••••••") {
    setClauses.push(`client_secret = $${paramIdx++}`);
    params.push(body.clientSecret);
  }
  if (body.masterPassword && body.masterPassword !== "••••••••") {
    setClauses.push(`master_password = $${paramIdx++}`);
    params.push(body.masterPassword);
  }

  // id is the last parameter
  params.push(body.id);

  try {
    const data = await queryOne(
      `UPDATE via_core.credenciais SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (!data) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
