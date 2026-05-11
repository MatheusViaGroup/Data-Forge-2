import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const result = await query<{ planta: string }>(
      `SELECT planta FROM via_core.plantas ORDER BY planta`
    );
    return NextResponse.json({ entries: result.rows.map((r) => r.planta) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[plantas] Erro ao listar:", err.message);
    return NextResponse.json({ entries: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await req.json()) as { planta?: string };
  const nome = body.planta?.trim();

  if (!nome) {
    return NextResponse.json({ error: "Nome da planta é obrigatório" }, { status: 400 });
  }

  const existing = await queryOne<{ planta: string }>(
    `SELECT planta FROM via_core.plantas WHERE planta = $1`,
    [nome]
  );

  if (existing) {
    return NextResponse.json({ error: "Já existe uma planta com esse nome" }, { status: 409 });
  }

  await query(
    `INSERT INTO via_core.plantas (planta) VALUES ($1)`,
    [nome]
  );

  return NextResponse.json({ entry: nome });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await req.json()) as { planta?: string; novoNome?: string };
  const nomeAtual = body.planta?.trim();
  const novoNome = body.novoNome?.trim();

  if (!nomeAtual || !novoNome) {
    return NextResponse.json({ error: "Nome atual e novo nome são obrigatórios" }, { status: 400 });
  }

  const existing = await queryOne<{ planta: string }>(
    `SELECT planta FROM via_core.plantas WHERE planta = $1`,
    [nomeAtual]
  );

  if (!existing) {
    return NextResponse.json({ error: "Planta não encontrada" }, { status: 404 });
  }

  const duplicate = await queryOne<{ planta: string }>(
    `SELECT planta FROM via_core.plantas WHERE planta = $1 AND planta != $2`,
    [novoNome, nomeAtual]
  );

  if (duplicate) {
    return NextResponse.json({ error: "Já existe uma planta com esse nome" }, { status: 409 });
  }

  await query(
    `UPDATE via_core.plantas SET planta = $2, updated_at = NOW() WHERE planta = $1`,
    [nomeAtual, novoNome]
  );

  return NextResponse.json({ entry: novoNome });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const nome = searchParams.get("planta");

  if (!nome) {
    return NextResponse.json({ error: "Nome da planta é obrigatório" }, { status: 400 });
  }

  await query(
    `DELETE FROM via_core.plantas WHERE planta = $1`,
    [nome]
  );

  return NextResponse.json({ success: true });
}