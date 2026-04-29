import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

type ParametroRlsRow = {
  id: string;
  nome: string;
  nome_parametro_powerbi: string | null;
  tipo: string | null;
  dashboard_id: string | null;
  tenant: string | null;
};

type ParametroRlsPayload = {
  id?: string;
  nome?: string;
  nomeParametroPowerBI?: string;
  tipo?: string;
  dashboardId?: string | null;
  tenant?: string;
};

function mapRow(row: ParametroRlsRow) {
  return {
    id: row.id,
    nome: row.nome,
    nomeParametroPowerBI: row.nome_parametro_powerbi ?? "",
    tipo: row.tipo ?? "Filial",
    dashboardId: row.dashboard_id ?? "",
    tenant: row.tenant ?? "",
  };
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  try {
    const { rows } = await query<ParametroRlsRow>(
      "SELECT * FROM via_core.parametros_rls ORDER BY created_at"
    );
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[parametros-rls][GET] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao buscar parâmetros RLS" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const body = (await request.json()) as ParametroRlsPayload;

  try {
    const data = await queryOne<ParametroRlsRow>(
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[parametros-rls][POST] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao inserir parâmetro RLS" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const body = (await request.json()) as ParametroRlsPayload;

  try {
    const data = await queryOne<ParametroRlsRow>(
      `UPDATE via_core.parametros_rls
       SET nome = $1, nome_parametro_powerbi = $2, tipo = $3, dashboard_id = $4, tenant = $5
       WHERE id = $6
       RETURNING *`,
      [
        body.nome ?? "",
        body.nomeParametroPowerBI ?? "",
        body.tipo ?? "Filial",
        body.dashboardId || null,
        body.tenant ?? "",
        body.id ?? "",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Parâmetro RLS não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[parametros-rls][PUT] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar parâmetro RLS" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  try {
    await query("DELETE FROM via_core.parametros_rls WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[parametros-rls][DELETE] Erro:", err.message);
    return NextResponse.json({ error: "Erro ao excluir parâmetro RLS" }, { status: 500 });
  }
}
