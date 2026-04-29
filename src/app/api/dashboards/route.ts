import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

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
};

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
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { rows } = await query<DashboardRow>("SELECT * FROM via_core.dashboards ORDER BY created_at");
    const all = rows.map(mapRow);
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
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as DashboardRequestBody;

  try {
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
        console.error("[dashboards][POST] Erro ao criar parâmetro RLS:", err.message);
      }
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][POST] Erro ao inserir dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao inserir dashboard" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as DashboardRequestBody;

  try {
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
      return NextResponse.json({ error: "Dashboard não encontrado" }, { status: 404 });
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
          console.error("[dashboards][PUT] Erro ao criar parâmetro RLS:", err.message);
        }
      }
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][PUT] Erro ao atualizar dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao atualizar dashboard" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  try {
    await query("DELETE FROM via_core.dashboards WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[dashboards][DELETE] Erro ao excluir dashboard:", err.message);
    return NextResponse.json({ error: "Erro ao excluir dashboard" }, { status: 500 });
  }
}
