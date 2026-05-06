import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ensureSetoresSchema, getSectorDashboardIds } from "@/lib/setores";

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  departamento: string | null;
  acesso: string;
  status: string;
  filiais: string[] | null;
  dashboards: unknown;
  setor_id: string | null;
  dashboards_manual_add: unknown;
  dashboards_manual_remove: unknown;
};

type UsuarioCurrentRow = {
  id: string;
  dashboards: unknown;
  setor_id: string | null;
<<<<<<< HEAD
  dashboards_manual_add: unknown;
  dashboards_manual_remove: unknown;
=======
>>>>>>> stag
};

type PgError = Error & {
  code?: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

<<<<<<< HEAD
=======
function normalizeSetorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

>>>>>>> stag
async function computeDashboardState(
  setorId: string | null,
  selectedDashboards: string[]
): Promise<{ finalDashboards: string[]; manualAdd: string[]; manualRemove: string[] }> {
  const selected = unique(selectedDashboards);

  if (!setorId) {
    return {
      finalDashboards: selected,
      manualAdd: selected,
      manualRemove: [],
    };
  }

<<<<<<< HEAD
  const sectorDashboardIds = await getSectorDashboardIds(setorId);
  const sectorSet = new Set(sectorDashboardIds);
  const selectedSet = new Set(selected);

  const manualAdd = selected.filter((dashboardId) => !sectorSet.has(dashboardId));
  const manualRemove = sectorDashboardIds.filter((dashboardId) => !selectedSet.has(dashboardId));

  const removeSet = new Set(manualRemove);
  const finalDashboards = unique([
    ...sectorDashboardIds.filter((dashboardId) => !removeSet.has(dashboardId)),
    ...manualAdd,
  ]);
=======
  const dashboardsDoSetor = await getSectorDashboardIds(setorId);
  const dashboardsDoSetorSet = new Set(dashboardsDoSetor);
  const selectedSet = new Set(selected);

  const manualAdd = selected.filter((dashboardId) => !dashboardsDoSetorSet.has(dashboardId));
  const manualRemove = dashboardsDoSetor.filter((dashboardId) => !selectedSet.has(dashboardId));
  const manualRemoveSet = new Set(manualRemove);

  const inherited = dashboardsDoSetor.filter((dashboardId) => !manualRemoveSet.has(dashboardId));
  const finalDashboards = unique([...inherited, ...manualAdd]);
>>>>>>> stag

  return {
    finalDashboards,
    manualAdd,
    manualRemove,
  };
}

function mapRow(row: UsuarioRow) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    departamento: row.departamento ?? "",
    acesso: row.acesso,
    status: row.status,
    filiais: row.filiais ?? [],
    dashboards: normalizeStringArray(row.dashboards),
    setorId: row.setor_id ?? "",
    dashboardsManualAdd: normalizeStringArray(row.dashboards_manual_add),
    dashboardsManualRemove: normalizeStringArray(row.dashboards_manual_remove),
  };
}

<<<<<<< HEAD
function normalizeSetorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

=======
>>>>>>> stag
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  try {
    await ensureSetoresSchema();
    const { rows } = await query<UsuarioRow>(
      `SELECT id, nome, email, departamento, acesso, status, filiais, dashboards,
              setor_id, dashboards_manual_add, dashboards_manual_remove
       FROM via_core.usuarios
       ORDER BY created_at`
    );
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[usuarios][GET] Erro ao buscar usuÃ¡rios:", err.message);
    return NextResponse.json({ error: "Erro ao buscar usuÃ¡rios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  await ensureSetoresSchema();

  const body = (await request.json()) as Record<string, unknown>;
  const senhaInformada = typeof body.senha === "string" ? body.senha : "";
  const senhaPlain = senhaInformada || crypto.randomBytes(8).toString("hex");
  const senhaHash = await bcrypt.hash(senhaPlain, 10);

  const nome = typeof body.nome === "string" ? body.nome : "";
  const email = typeof body.email === "string" ? body.email : "";
  const departamentoRaw = typeof body.departamento === "string" ? body.departamento : "";
  const acesso = typeof body.acesso === "string" ? body.acesso : "UsuÃ¡rio";
  const status = typeof body.status === "string" ? body.status : "Ativo";
  const filiais = normalizeStringArray(body.filiais);
  const dashboards = normalizeStringArray(body.dashboards);
  const setorId = normalizeSetorId(body.setorId);

  const dashboardState = await computeDashboardState(setorId, dashboards);

  try {
    const data = await queryOne<UsuarioRow>(
      `INSERT INTO via_core.usuarios
<<<<<<< HEAD
         (nome, email, senha_hash, departamento, acesso, status, filiais, dashboards, must_change_password, setor_id, dashboards_manual_add, dashboards_manual_remove)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11::jsonb, $12::jsonb)
=======
        (nome, email, senha_hash, departamento, acesso, status, filiais, dashboards, must_change_password, setor_id, dashboards_manual_add, dashboards_manual_remove)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11::jsonb, $12::jsonb)
>>>>>>> stag
       RETURNING id, nome, email, departamento, acesso, status, filiais, dashboards, setor_id, dashboards_manual_add, dashboards_manual_remove`,
      [
        nome,
        email,
        senhaHash,
        departamentoRaw.toUpperCase(),
        acesso,
        status,
        filiais,
        JSON.stringify(dashboardState.finalDashboards),
        true,
        setorId,
        JSON.stringify(dashboardState.manualAdd),
        JSON.stringify(dashboardState.manualRemove),
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao criar usuÃ¡rio" }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as PgError;
    console.error("[usuarios][POST] Erro ao criar usuÃ¡rio:", err.message);

    if (err.code === "23505") {
      return NextResponse.json({ error: "E-mail jÃ¡ cadastrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "Erro ao criar usuÃ¡rio" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  await ensureSetoresSchema();

  const body = (await request.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
<<<<<<< HEAD
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const current = await queryOne<UsuarioCurrentRow>(
    `SELECT id, dashboards, setor_id, dashboards_manual_add, dashboards_manual_remove
=======
    return NextResponse.json({ error: "id obrigatÃ³rio" }, { status: 400 });
  }

  const current = await queryOne<UsuarioCurrentRow>(
    `SELECT id, dashboards, setor_id
>>>>>>> stag
     FROM via_core.usuarios
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (!current) {
<<<<<<< HEAD
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
=======
    return NextResponse.json({ error: "UsuÃ¡rio nÃ£o encontrado" }, { status: 404 });
>>>>>>> stag
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (body.nome !== undefined) {
    setClauses.push(`nome = $${paramIdx++}`);
    params.push(body.nome);
  }
  if (body.email !== undefined) {
    setClauses.push(`email = $${paramIdx++}`);
    params.push(body.email);
  }
  if (body.departamento !== undefined) {
    const departamento = typeof body.departamento === "string" ? body.departamento.toUpperCase() : "";
    setClauses.push(`departamento = $${paramIdx++}`);
    params.push(departamento);
  }
  if (body.acesso !== undefined) {
    setClauses.push(`acesso = $${paramIdx++}`);
    params.push(body.acesso);
  }
  if (body.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    params.push(body.status);
  }
  if (body.filiais !== undefined) {
    setClauses.push(`filiais = $${paramIdx++}::text[]`);
    params.push(normalizeStringArray(body.filiais));
  }
  if (body.must_change_password !== undefined) {
    setClauses.push(`must_change_password = $${paramIdx++}`);
    params.push(body.must_change_password);
  }
  if (typeof body.senha === "string" && body.senha) {
    const senhaHash = await bcrypt.hash(body.senha, 10);
    setClauses.push(`senha_hash = $${paramIdx++}`);
    params.push(senhaHash);
  }

  const setorIdProvided = body.setorId !== undefined;
  const dashboardsProvided = body.dashboards !== undefined;

  if (setorIdProvided || dashboardsProvided) {
    const nextSetorId =
<<<<<<< HEAD
      body.setorId !== undefined ? normalizeSetorId(body.setorId) : normalizeSetorId(current.setor_id);
=======
      setorIdProvided ? normalizeSetorId(body.setorId) : normalizeSetorId(current.setor_id);
>>>>>>> stag

    let selectedDashboards: string[];
    if (dashboardsProvided) {
      selectedDashboards = normalizeStringArray(body.dashboards);
    } else if (setorIdProvided && nextSetorId && nextSetorId !== current.setor_id) {
      selectedDashboards = await getSectorDashboardIds(nextSetorId);
    } else {
      selectedDashboards = normalizeStringArray(current.dashboards);
    }

    const dashboardState = await computeDashboardState(nextSetorId, selectedDashboards);

    if (nextSetorId) {
      setClauses.push(`setor_id = $${paramIdx++}`);
      params.push(nextSetorId);
    } else {
<<<<<<< HEAD
      setClauses.push(`setor_id = NULL`);
=======
      setClauses.push("setor_id = NULL");
>>>>>>> stag
    }

    setClauses.push(`dashboards = $${paramIdx++}::jsonb`);
    params.push(JSON.stringify(dashboardState.finalDashboards));

    setClauses.push(`dashboards_manual_add = $${paramIdx++}::jsonb`);
    params.push(JSON.stringify(dashboardState.manualAdd));

    setClauses.push(`dashboards_manual_remove = $${paramIdx++}::jsonb`);
    params.push(JSON.stringify(dashboardState.manualRemove));
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  params.push(id);

  try {
    const data = await queryOne<UsuarioRow>(
      `UPDATE via_core.usuarios SET ${setClauses.join(", ")} WHERE id = $${paramIdx}
       RETURNING id, nome, email, departamento, acesso, status, filiais, dashboards, setor_id, dashboards_manual_add, dashboards_manual_remove`,
      params
    );

    if (!data) {
      return NextResponse.json({ error: "UsuÃ¡rio nÃ£o encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[usuarios][PUT] Erro ao atualizar usuÃ¡rio:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar usuÃ¡rio" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatÃ³rio" }, { status: 400 });

  try {
    await query("DELETE FROM via_core.usuarios WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[usuarios][DELETE] Erro ao excluir usuÃ¡rio:", err.message);
    return NextResponse.json({ error: "Erro ao excluir usuÃ¡rio" }, { status: 500 });
  }
}
