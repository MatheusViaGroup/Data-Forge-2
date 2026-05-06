import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

type AcessoEspecialRow = {
  id: string;
  nome: string;
  descricao: string | null;
  filiais: string[] | null;
  status: string | null;
};

type AcessoEspecialBody = {
  id?: string;
  nome?: string;
  descricao?: string;
  filiais?: string[];
  status?: string;
};

type SessionLike = {
  user?: {
    role?: string;
  };
} | null;

function mapRow(row: AcessoEspecialRow) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    filiais: row.filiais ?? [],
    status: row.status ?? "Ativo",
  };
}

function ensureAdmin(session: SessionLike) {
  return session?.user?.role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  try {
    const { rows } = await query<AcessoEspecialRow>(
      "SELECT * FROM via_core.acessos_especiais ORDER BY nome"
    );
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[acessos-especiais][GET] Erro ao buscar acessos especiais:", err.message);
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as AcessoEspecialBody;

  try {
    const data = await queryOne<AcessoEspecialRow>(
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
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as AcessoEspecialBody;

  try {
    const data = await queryOne<AcessoEspecialRow>(
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
      return NextResponse.json({ error: "Acesso especial nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  try {
    await query("DELETE FROM via_core.acessos_especiais WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
