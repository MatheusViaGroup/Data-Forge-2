import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";function mapRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    nomeParametroPowerBI: row.nome_parametro_powerbi ?? "",
    tipo: row.tipo ?? "Filial",
    dashboardId: row.dashboard_id ?? "",
    tenant: row.tenant ?? "",
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
      "SELECT * FROM via_core.parametros_rls ORDER BY created_at"
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
      `INSERT INTO via_core.parametros_rls (nome, nome_parametro_powerbi, tipo, dashboard_id, tenant)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        body.nome ?? "",
        body.nomeParametroPowerBI ?? "",
        body.tipo ?? "Filial",
        body.dashboardId || null,
        body.tenant ?? "",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao inserir parâmetro RLS" }, { status: 500 });
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

  try {
    const data = await queryOne(
      `UPDATE via_core.parametros_rls
       SET nome = $1, nome_parametro_powerbi = $2, tipo = $3, dashboard_id = $4, tenant = $5
       WHERE id = $6
       RETURNING *`,
      [
        body.nome,
        body.nomeParametroPowerBI,
        body.tipo,
        body.dashboardId || null,
        body.tenant,
        body.id,
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Parâmetro RLS não encontrado" }, { status: 404 });
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
    await query("DELETE FROM via_core.parametros_rls WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
