import "server-only";
import { query, queryOne } from "@/lib/db";

type SetorRow = {
  id: string;
  nome: string;
<<<<<<< HEAD
  created_at: string | Date;
  updated_at: string | Date;
=======
>>>>>>> stag
};

type DashboardSetorRow = {
  dashboard_id: string;
  setor_id: string;
};

type UsuarioSetorSyncRow = {
  id: string;
  dashboards_manual_add: unknown;
  dashboards_manual_remove: unknown;
};

type UsuarioSetorDeleteRow = {
  id: string;
  dashboards_manual_add: unknown;
};

let schemaEnsured = false;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
<<<<<<< HEAD

=======
>>>>>>> stag
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function ensureSetoresSchema(): Promise<void> {
  if (schemaEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS via_core.setores (
<<<<<<< HEAD
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
=======
      id TEXT PRIMARY KEY,
>>>>>>> stag
      nome TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS via_core.dashboard_setores (
      dashboard_id TEXT NOT NULL,
      setor_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (dashboard_id, setor_id)
    )
  `);

  await query(`
    ALTER TABLE via_core.usuarios
    ADD COLUMN IF NOT EXISTS setor_id TEXT
  `);

  await query(`
    ALTER TABLE via_core.usuarios
    ADD COLUMN IF NOT EXISTS dashboards_manual_add JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await query(`
    ALTER TABLE via_core.usuarios
    ADD COLUMN IF NOT EXISTS dashboards_manual_remove JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  schemaEnsured = true;
}

export async function listSetores(): Promise<Array<{ id: string; nome: string; dashboardIds: string[] }>> {
  await ensureSetoresSchema();

  const { rows: setoresRows } = await query<SetorRow>(
<<<<<<< HEAD
    `SELECT id, nome, created_at, updated_at
=======
    `SELECT id, nome
>>>>>>> stag
     FROM via_core.setores
     ORDER BY nome`
  );

  const { rows: linkRows } = await query<DashboardSetorRow>(
    `SELECT dashboard_id, setor_id
     FROM via_core.dashboard_setores`
  );

<<<<<<< HEAD
  const idsBySetor = new Map<string, string[]>();
  for (const row of linkRows) {
    const current = idsBySetor.get(row.setor_id) ?? [];
    current.push(row.dashboard_id);
    idsBySetor.set(row.setor_id, current);
=======
  const dashboardIdsBySetorId = new Map<string, string[]>();
  for (const row of linkRows) {
    const current = dashboardIdsBySetorId.get(row.setor_id) ?? [];
    current.push(row.dashboard_id);
    dashboardIdsBySetorId.set(row.setor_id, current);
>>>>>>> stag
  }

  return setoresRows.map((setor) => ({
    id: setor.id,
    nome: setor.nome,
<<<<<<< HEAD
    dashboardIds: unique(idsBySetor.get(setor.id) ?? []),
=======
    dashboardIds: unique(dashboardIdsBySetorId.get(setor.id) ?? []),
>>>>>>> stag
  }));
}

export async function getDashboardSetorMap(): Promise<Map<string, { setorIds: string[]; setorNomes: string[] }>> {
  await ensureSetoresSchema();

  const { rows } = await query<{ dashboard_id: string; setor_id: string; nome: string }>(
    `SELECT ds.dashboard_id, ds.setor_id, s.nome
     FROM via_core.dashboard_setores ds
     INNER JOIN via_core.setores s ON s.id = ds.setor_id`
  );

  const map = new Map<string, { setorIds: string[]; setorNomes: string[] }>();
  for (const row of rows) {
    const current = map.get(row.dashboard_id) ?? { setorIds: [], setorNomes: [] };
    current.setorIds.push(row.setor_id);
    current.setorNomes.push(row.nome);
    map.set(row.dashboard_id, current);
  }

<<<<<<< HEAD
  for (const [dashboardId, value] of map) {
=======
  for (const [dashboardId, value] of Array.from(map.entries())) {
>>>>>>> stag
    map.set(dashboardId, {
      setorIds: unique(value.setorIds),
      setorNomes: unique(value.setorNomes),
    });
  }

  return map;
}

export async function getSectorDashboardIds(setorId: string): Promise<string[]> {
  await ensureSetoresSchema();

  const { rows } = await query<{ dashboard_id: string }>(
    `SELECT dashboard_id
     FROM via_core.dashboard_setores
     WHERE setor_id = $1`,
    [setorId]
  );

  return unique(rows.map((row) => row.dashboard_id));
}

export async function replaceDashboardSectorLinks(
  dashboardId: string,
  setorIds: string[]
): Promise<{ previousSetorIds: string[]; nextSetorIds: string[] }> {
  await ensureSetoresSchema();

  const nextSetorIds = unique(setorIds.filter((id) => id.trim().length > 0));

  const { rows: previousRows } = await query<{ setor_id: string }>(
    `SELECT setor_id
     FROM via_core.dashboard_setores
     WHERE dashboard_id = $1`,
    [dashboardId]
  );
  const previousSetorIds = unique(previousRows.map((row) => row.setor_id));

<<<<<<< HEAD
  await query(`DELETE FROM via_core.dashboard_setores WHERE dashboard_id = $1`, [dashboardId]);
=======
  await query(
    `DELETE FROM via_core.dashboard_setores
     WHERE dashboard_id = $1`,
    [dashboardId]
  );
>>>>>>> stag

  for (const setorId of nextSetorIds) {
    await query(
      `INSERT INTO via_core.dashboard_setores (dashboard_id, setor_id)
       VALUES ($1, $2)
       ON CONFLICT (dashboard_id, setor_id) DO NOTHING`,
      [dashboardId, setorId]
    );
  }

  return { previousSetorIds, nextSetorIds };
}

export async function replaceSetorDashboardLinks(
  setorId: string,
  dashboardIds: string[]
): Promise<{ previousDashboardIds: string[]; nextDashboardIds: string[] }> {
  await ensureSetoresSchema();

  const nextDashboardIds = unique(dashboardIds.filter((id) => id.trim().length > 0));

  const { rows: previousRows } = await query<{ dashboard_id: string }>(
    `SELECT dashboard_id
     FROM via_core.dashboard_setores
     WHERE setor_id = $1`,
    [setorId]
  );
  const previousDashboardIds = unique(previousRows.map((row) => row.dashboard_id));

<<<<<<< HEAD
  await query(`DELETE FROM via_core.dashboard_setores WHERE setor_id = $1`, [setorId]);
=======
  await query(
    `DELETE FROM via_core.dashboard_setores
     WHERE setor_id = $1`,
    [setorId]
  );
>>>>>>> stag

  for (const dashboardId of nextDashboardIds) {
    await query(
      `INSERT INTO via_core.dashboard_setores (dashboard_id, setor_id)
       VALUES ($1, $2)
       ON CONFLICT (dashboard_id, setor_id) DO NOTHING`,
      [dashboardId, setorId]
    );
  }

  return { previousDashboardIds, nextDashboardIds };
}

export async function removeDashboardSectorLinksByDashboardId(dashboardId: string): Promise<string[]> {
  await ensureSetoresSchema();

  const { rows } = await query<{ setor_id: string }>(
    `SELECT setor_id
     FROM via_core.dashboard_setores
     WHERE dashboard_id = $1`,
    [dashboardId]
  );

<<<<<<< HEAD
  await query(`DELETE FROM via_core.dashboard_setores WHERE dashboard_id = $1`, [dashboardId]);
=======
  await query(
    `DELETE FROM via_core.dashboard_setores
     WHERE dashboard_id = $1`,
    [dashboardId]
  );

>>>>>>> stag
  return unique(rows.map((row) => row.setor_id));
}

export async function syncUsersDashboardsBySetorId(
  setorId: string,
  forceRemoveDashboardIds: string[] = []
): Promise<void> {
  await ensureSetoresSchema();

  const forceRemoveSet = new Set(forceRemoveDashboardIds);
<<<<<<< HEAD
  const baseDashboards = await getSectorDashboardIds(setorId);
=======
  const dashboardIdsDoSetor = await getSectorDashboardIds(setorId);
>>>>>>> stag

  const { rows: usersRows } = await query<UsuarioSetorSyncRow>(
    `SELECT id, dashboards_manual_add, dashboards_manual_remove
     FROM via_core.usuarios
     WHERE setor_id = $1`,
    [setorId]
  );

  for (const user of usersRows) {
    const manualAdd = normalizeStringArray(user.dashboards_manual_add).filter((id) => !forceRemoveSet.has(id));
    const manualRemove = normalizeStringArray(user.dashboards_manual_remove).filter((id) => !forceRemoveSet.has(id));
<<<<<<< HEAD
    const manualRemoveSet = new Set(manualRemove);

    const inherited = baseDashboards.filter((dashboardId) => !manualRemoveSet.has(dashboardId));
=======
    const removeSet = new Set(manualRemove);

    const inherited = dashboardIdsDoSetor.filter((dashboardId) => !removeSet.has(dashboardId));
>>>>>>> stag
    const finalDashboards = unique([...inherited, ...manualAdd]).filter((id) => !forceRemoveSet.has(id));

    await query(
      `UPDATE via_core.usuarios
       SET dashboards = $1::jsonb,
           dashboards_manual_add = $2::jsonb,
           dashboards_manual_remove = $3::jsonb
       WHERE id = $4`,
      [JSON.stringify(finalDashboards), JSON.stringify(manualAdd), JSON.stringify(manualRemove), user.id]
    );
  }
}

export async function unlinkUsersFromSetor(setorId: string): Promise<void> {
  await ensureSetoresSchema();

<<<<<<< HEAD
  const removedSetorDashboards = new Set(await getSectorDashboardIds(setorId));

=======
  const removedDashboardsSet = new Set(await getSectorDashboardIds(setorId));
>>>>>>> stag
  const { rows } = await query<UsuarioSetorDeleteRow>(
    `SELECT id, dashboards_manual_add
     FROM via_core.usuarios
     WHERE setor_id = $1`,
    [setorId]
  );

  for (const user of rows) {
    const manualAdd = normalizeStringArray(user.dashboards_manual_add).filter(
<<<<<<< HEAD
      (dashboardId) => !removedSetorDashboards.has(dashboardId)
=======
      (dashboardId) => !removedDashboardsSet.has(dashboardId)
>>>>>>> stag
    );

    await query(
      `UPDATE via_core.usuarios
       SET setor_id = NULL,
           dashboards = $1::jsonb,
           dashboards_manual_add = $2::jsonb,
           dashboards_manual_remove = '[]'::jsonb
       WHERE id = $3`,
      [JSON.stringify(manualAdd), JSON.stringify(manualAdd), user.id]
    );
  }
}

export async function findSetorByNome(nome: string): Promise<{ id: string; nome: string } | null> {
  await ensureSetoresSchema();

  const value = nome.trim();
  if (!value) return null;

  const row = await queryOne<{ id: string; nome: string }>(
    `SELECT id, nome
     FROM via_core.setores
     WHERE LOWER(nome) = LOWER($1)
     LIMIT 1`,
    [value]
  );

  return row ?? null;
}
