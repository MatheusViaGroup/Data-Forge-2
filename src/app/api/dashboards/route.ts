import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
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
    urlCapa: row["url-dash"] ?? "",
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
      "SELECT * FROM via_core.dashboards ORDER BY created_at"
    );

    const all = rows.map(mapRow);
    console.log("[API GET] Dashboards carregados:", all.length);
    all.forEach(d => {
      console.log(`  - ${d.nome}: rls=${d.rls}, rlsRole="${d.rlsRole}"`);
    });

    const entries = all.filter((d) => d.ativo);
    return NextResponse.json({ entries, all });
  } catch (error: any) {
    console.error("[API GET] Erro ao buscar dashboards:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: cria novo ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  console.log("[API POST] Body recebido:", body);
  console.log("[API POST] descricao:", body.descricao);
  console.log("[API POST] setor:", body.setor);

  try {
    const data = await queryOne(
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
      console.error("[API POST] Erro ao inserir: nenhum dado retornado");
      return NextResponse.json({ error: "Erro ao inserir dashboard" }, { status: 500 });
    }

    console.log("[API POST] Dados inseridos com sucesso:", data);

    // Se RLS estiver ativado, cria parâmetro RLS automaticamente
    if (body.rls && data) {
      try {
        await queryOne(
          `INSERT INTO via_core.parametros_rls (nome, nome_parametro_powerbi, tipo, dashboard_id, tenant)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            body.nome ?? "RLS " + data.id,
            body.rlsRole || "Filial",
            "Filial",
            data.id,
            "VIA GROUP",
          ]
        );
      } catch (rlsError: any) {
        console.error("Erro ao criar parâmetro RLS:", rlsError.message);
      }
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    console.error("[API POST] Erro ao inserir:", error.message);
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
  console.log("[API PUT] Body recebido:", body);
  console.log("[API PUT] descricao:", body.descricao);
  console.log("[API PUT] setor:", body.setor);

  try {
    const data = await queryOne(
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
      console.error("[API PUT] Erro ao atualizar: nenhum dado retornado");
      return NextResponse.json({ error: "Dashboard não encontrado" }, { status: 404 });
    }

    console.log("[API PUT] Dados atualizados com sucesso:", data);

    // Se RLS estiver ativado, verifica se existe parâmetro RLS
    if (body.rls && data) {
      const existingRls = await queryOne(
        "SELECT id FROM via_core.parametros_rls WHERE dashboard_id = $1 LIMIT 1",
        [body.id]
      );

      if (!existingRls) {
        try {
          await queryOne(
            `INSERT INTO via_core.parametros_rls (nome, nome_parametro_powerbi, tipo, dashboard_id, tenant)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              body.nome ?? "RLS " + data.id,
              body.rlsRole || "Filial",
              "Filial",
              body.id,
              "VIA GROUP",
            ]
          );
        } catch (rlsError: any) {
          console.error("Erro ao criar parâmetro RLS:", rlsError.message);
        }
      }
    }

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    console.error("[API PUT] Erro ao atualizar:", error.message);
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
    await query("DELETE FROM via_core.dashboards WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
