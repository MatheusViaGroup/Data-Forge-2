import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

function mapRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    filiais: row.filiais ?? [],
    status: row.status ?? "Ativo",
  };
}

// ─── GET: lista todos ─────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { rows } = await query(
      "SELECT * FROM via_core.acessos_especiais ORDER BY nome"
    );
    const entries = rows.map(mapRow);
    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error("Erro ao buscar acessos especiais:", error.message);
    return NextResponse.json({ entries: [] });
  }
}

// ─── POST: cria novo ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const data = await queryOne(
      `INSERT INTO via_core.acessos_especiais (nome, descricao, filiais, status)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING *`,
      [
        body.nome ?? "",
        body.descricao ?? "",
        JSON.stringify(body.filiais ?? []),
        body.status ?? "Ativo",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao inserir acesso especial" }, { status: 500 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT: atualiza ────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const data = await queryOne(
      `UPDATE via_core.acessos_especiais
       SET nome = $1, descricao = $2, filiais = $3::jsonb, status = $4
       WHERE id = $5
       RETURNING *`,
      [
        body.nome,
        body.descricao,
        JSON.stringify(body.filiais),
        body.status,
        body.id,
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Acesso especial não encontrado" }, { status: 404 });
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
    await query("DELETE FROM via_core.acessos_especiais WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
