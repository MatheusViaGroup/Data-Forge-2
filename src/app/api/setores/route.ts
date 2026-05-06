import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import {
  ensureSetoresSchema,
  listSetores,
  replaceSetorDashboardLinks,
  syncUsersDashboardsBySetorId,
  unlinkUsersFromSetor,
} from "@/lib/setores";

type SetorBody = {
  id?: string;
  nome?: string;
  dashboardIds?: string[];
};

type PgError = Error & { code?: string };

function normalizeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    await ensureSetoresSchema();
    const entries = await listSetores();
    return NextResponse.json({ entries });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[setores][GET] Erro ao listar setores:", err.message);
    return NextResponse.json({ error: "Erro ao listar setores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const body = (await request.json()) as SetorBody;
  const nome = body.nome?.trim() ?? "";
  const dashboardIds = normalizeIds(body.dashboardIds);

  if (!nome) {
    return NextResponse.json({ error: "Nome do setor é obrigatório" }, { status: 400 });
  }

  try {
    await ensureSetoresSchema();
    const setorId = crypto.randomUUID();

    const created = await queryOne<{ id: string; nome: string }>(
      `INSERT INTO via_core.setores (id, nome)
       VALUES ($1, $2)
       RETURNING id, nome`,
      [setorId, nome]
    );

    if (!created) {
      return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
    }

    if (dashboardIds.length > 0) {
      await replaceSetorDashboardLinks(created.id, dashboardIds);
      await syncUsersDashboardsBySetorId(created.id);
    }

    return NextResponse.json({
      success: true,
      entry: {
        id: created.id,
        nome: created.nome,
        dashboardIds,
      },
    });
  } catch (error: unknown) {
    const err = error as PgError;
    console.error("[setores][POST] Erro ao criar setor:", err.message);

    if (err.code === "23505") {
      return NextResponse.json({ error: "Nome de setor já cadastrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const body = (await request.json()) as SetorBody;
  const id = body.id?.trim() ?? "";
  const nome = body.nome?.trim();
  const hasDashboardsPayload = body.dashboardIds !== undefined;
  const dashboardIds = normalizeIds(body.dashboardIds);

  if (!id) {
    return NextResponse.json({ error: "ID do setor é obrigatório" }, { status: 400 });
  }

  try {
    await ensureSetoresSchema();

    if (nome !== undefined) {
      if (!nome) {
        return NextResponse.json({ error: "Nome do setor é obrigatório" }, { status: 400 });
      }

      await query(
        `UPDATE via_core.setores
         SET nome = $1, updated_at = NOW()
         WHERE id = $2`,
        [nome, id]
      );
    }

    if (hasDashboardsPayload) {
      const { previousDashboardIds, nextDashboardIds } = await replaceSetorDashboardLinks(id, dashboardIds);
      const nextSet = new Set(nextDashboardIds);
      const removedDashboardIds = previousDashboardIds.filter((dashboardId) => !nextSet.has(dashboardId));
      await syncUsersDashboardsBySetorId(id, removedDashboardIds);
    }

    const updated = await queryOne<{ id: string; nome: string }>(
      `SELECT id, nome
       FROM via_core.setores
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (!updated) {
      return NextResponse.json({ error: "Setor não encontrado" }, { status: 404 });
    }

    const finalDashboardIds = hasDashboardsPayload
      ? dashboardIds
      : (await listSetores()).find((setor) => setor.id === id)?.dashboardIds ?? [];

    return NextResponse.json({
      success: true,
      entry: {
        id: updated.id,
        nome: updated.nome,
        dashboardIds: finalDashboardIds,
      },
    });
  } catch (error: unknown) {
    const err = error as PgError;
    console.error("[setores][PUT] Erro ao atualizar setor:", err.message);

    if (err.code === "23505") {
      return NextResponse.json({ error: "Nome de setor já cadastrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "Erro ao atualizar setor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  try {
    await ensureSetoresSchema();
    await unlinkUsersFromSetor(id);
    await query(`DELETE FROM via_core.dashboard_setores WHERE setor_id = $1`, [id]);
    await query(`DELETE FROM via_core.setores WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[setores][DELETE] Erro ao excluir setor:", err.message);
    return NextResponse.json({ error: "Erro ao excluir setor" }, { status: 500 });
  }
}
