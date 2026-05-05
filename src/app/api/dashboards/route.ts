import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import {
  ensureSetoresSchema,
  findSetorByNome,
  getDashboardSetorMap,
  replaceDashboardSectorLinks,
  removeDashboardSectorLinksByDashboardId,
  syncUsersDashboardsBySetorId,
} from "@/lib/setores";

type DashboardRow = {
  id: string;
  nome: string;
  descricao: string | null;
  workspace_id: string;
  report_id: string;
  dataset_id: string | null;
  ativo: boolean;
  prioridade: string | null;
  setor: string | null;
  rls: boolean | null;
  rls_role: string | null;
  status: string | null;
  ["url-dash"]?: string | null;
  url_dash?: string | null;
  url_capa?: string | null;
  urlCapa?: string | null;
};

type DashboardRequestBody = {
  id?: string;
  nome?: string;
  descricao?: string;
  workspaceId?: string;
  reportId?: string;
  datasetId?: string;
  ativo?: boolean;
  prioridade?: string;
  setor?: string;
  rls?: boolean;
  rlsRole?: string;
  status?: string;
  urlCapa?: string;
  setorIds?: string[];
};

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

function normalizeSetorNames(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

async function resolveSetorIdsFromBody(setorIdsFromBody: unknown, setorNamesRaw: string | undefined): Promise<string[]> {
  const ids = normalizeIds(setorIdsFromBody);
  if (ids.length > 0) return ids;

  const names = normalizeSetorNames(setorNamesRaw);
  if (names.length === 0) return [];

  const resolved = await Promise.all(names.map(async (name) => findSetorByNome(name)));
  return Array.from(
    new Set(
      resolved
        .map((item) => item?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
}

function mapRow(row: DashboardRow) {
  const urlCapa = row["url-dash"] ?? row.url_dash ?? row.url_capa ?? row.urlCapa ?? "";

  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    workspaceId: row.workspace_id,
    reportId: row.report_id,
    datasetId: row.dataset_id ?? "",
    ativo: row.ativo,
    prioridade: row.prioridade ?? "media",
    setor: row.setor ?? "",
    rls: row.rls ?? false,
    rlsRole: row.rls_role ?? "",
    status: row.status ?? "Ativo",
    urlCapa,
    setorIds: [] as string[],
    setores: [] as string[],
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
  }

  try {
    await ensureSetoresSchema();

    const { rows } = await query<DashboardRow>(
      "SELECT * FROM via_core.dashboards ORDER BY created_at"
    );
    const setorMap = await getDashboardSetorMap();

    const all = rows.map((row) => {
      const mapped = mapRow(row);
      const setorInfo = setorMap.get(mapped.id);
      if (!setorInfo) {
        return { ...mapped, setor: "" };
      }

      const setorLabel = setorInfo.setorNomes.join(", ");
      return {
        ...mapped,
        setorIds: setorInfo.setorIds,
        setores: setorInfo.setorNomes,
        setor: setorLabel,
      };
    });

    const entries = all.filter((dashboard) => dashboard.ativo);
    return NextResponse.json({ entries, all });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][GET] Erro ao buscar dashboards:", err.message);
    return NextResponse.json({ error: "Erro ao buscar dashboards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as DashboardRequestBody;

  try {
    await ensureSetoresSchema();
    const setorIds = await resolveSetorIdsFromBody(body.setorIds, body.setor);

    const data = await queryOne<DashboardRow>(
      `INSERT INTO via_core.dashboards (nome, descricao, workspace_id, report_id, dataset_id, ativo, prioridade, setor, rls, rls_role, status, "url-dash")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        body.nome ?? "",
        body.descricao ?? "",
        body.workspaceId ?? "",
        body.reportId ?? "",
        body.datasetId ?? "",
        body.ativo ?? true,
        body.prioridade ?? "media",
        body.setor ?? "",
        body.rls ?? false,
        body.rlsRole ?? "",
        body.status ?? "Ativo",
        body.urlCapa ?? "",
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Erro ao inserir dashboard" }, { status: 500 });
    }

    if (body.rls) {
      try {
        await queryOne(
          `INSERT INTO via_core.parametros_rls (nome, nome_parametro_powerbi, tipo, dashboard_id, tenant)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [body.nome ?? `RLS ${data.id}`, body.rlsRole || "Filial", "Filial", data.id, "VIA GROUP"]
        );
      } catch (rlsError: unknown) {
        const err = rlsError as Error;
        console.error("[dashboards][POST] Erro ao criar parÃ¢metro RLS:", err.message);
      }
    }

    if (setorIds.length > 0) {
      await replaceDashboardSectorLinks(data.id, setorIds);
      for (const setorId of setorIds) {
        await syncUsersDashboardsBySetorId(setorId);
      }
    }

    const setorMap = await getDashboardSetorMap();
    const setorInfo = setorMap.get(data.id);
    const entry = mapRow(data);

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        setorIds: setorInfo?.setorIds ?? [],
        setores: setorInfo?.setorNomes ?? [],
        setor: setorInfo?.setorNomes.join(", ") ?? "",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][POST] Erro ao inserir dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao inserir dashboard" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as DashboardRequestBody;

  try {
    await ensureSetoresSchema();
    const setorIds = body.setorIds !== undefined
      ? await resolveSetorIdsFromBody(body.setorIds, body.setor)
      : undefined;

    const data = await queryOne<DashboardRow>(
      `UPDATE via_core.dashboards
       SET nome = $1, descricao = $2, workspace_id = $3, report_id = $4, dataset_id = $5,
           ativo = $6, prioridade = $7, setor = $8, rls = $9, rls_role = $10,
           status = $11, "url-dash" = $12
       WHERE id = $13
       RETURNING *`,
      [
        body.nome,
        body.descricao,
        body.workspaceId,
        body.reportId,
        body.datasetId,
        body.ativo,
        body.prioridade,
        body.setor,
        body.rls,
        body.rlsRole ?? "",
        body.status,
        body.urlCapa ?? "",
        body.id,
      ]
    );

    if (!data) {
      return NextResponse.json({ error: "Dashboard nÃ£o encontrado" }, { status: 404 });
    }

    if (body.rls && body.id) {
      const existingRls = await queryOne<{ id: string }>(
        "SELECT id FROM via_core.parametros_rls WHERE dashboard_id = $1 LIMIT 1",
        [body.id]
      );

      if (!existingRls) {
        try {
          await queryOne(
            `INSERT INTO via_core.parametros_rls (nome, nome_parametro_powerbi, tipo, dashboard_id, tenant)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [body.nome ?? `RLS ${data.id}`, body.rlsRole || "Filial", "Filial", body.id, "VIA GROUP"]
          );
        } catch (rlsError: unknown) {
          const err = rlsError as Error;
          console.error("[dashboards][PUT] Erro ao criar parÃ¢metro RLS:", err.message);
        }
      }
    }

    let setorInfo = { setorIds: [] as string[], setorNomes: [] as string[] };

    if (setorIds !== undefined) {
      const { previousSetorIds, nextSetorIds } = await replaceDashboardSectorLinks(data.id, setorIds);
      const nextSet = new Set(nextSetorIds);
      const previousSet = new Set(previousSetorIds);

      for (const setorId of previousSetorIds) {
        const removedFromSetor = !nextSet.has(setorId);
        if (removedFromSetor) {
          await syncUsersDashboardsBySetorId(setorId, [data.id]);
          continue;
        }
        await syncUsersDashboardsBySetorId(setorId);
      }

      for (const setorId of nextSetorIds) {
        if (!previousSet.has(setorId)) {
          await syncUsersDashboardsBySetorId(setorId);
        }
      }

      const setorMap = await getDashboardSetorMap();
      const mapped = setorMap.get(data.id);
      if (mapped) {
        setorInfo = mapped;
      }
    } else {
      const setorMap = await getDashboardSetorMap();
      const mapped = setorMap.get(data.id);
      if (mapped) {
        setorInfo = mapped;
      }
    }

    const entry = mapRow(data);
    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        setorIds: setorInfo.setorIds,
        setores: setorInfo.setorNomes,
        setor: setorInfo.setorNomes.join(", "),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][PUT] Erro ao atualizar dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar dashboard" }, { status: 500 });
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
    await ensureSetoresSchema();
    const affectedSetores = await removeDashboardSectorLinksByDashboardId(id);
    await query("DELETE FROM via_core.dashboards WHERE id = $1", [id]);

    for (const setorId of affectedSetores) {
      await syncUsersDashboardsBySetorId(setorId, [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][DELETE] Erro ao excluir dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao excluir dashboard" }, { status: 500 });
  }
}
