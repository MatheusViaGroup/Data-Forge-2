import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

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
  };
}

// ─── GET: lista todos ─────────────────────────────────────────────────────────
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("dashboards")
    .select("*")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data || []).map(mapRow);
  console.log("[API GET] Dashboards carregados:", all.length);
  all.forEach(d => {
    console.log(`  - ${d.nome}: rls=${d.rls}, rlsRole="${d.rlsRole}"`);
  });
  
  const entries = all.filter((d) => d.ativo);
  return NextResponse.json({ entries, all });
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
  
  const { data, error } = await supabaseAdmin
    .from("dashboards")
    .insert({
      nome: body.nome ?? "",
      descricao: body.descricao ?? "",
      workspace_id: body.workspaceId ?? "",
      report_id: body.reportId ?? "",
      dataset_id: body.datasetId ?? "",
      ativo: body.ativo ?? true,
      prioridade: body.prioridade ?? "media",
      setor: body.setor ?? "",
      rls: body.rls ?? false,
      rls_role: body.rlsRole ?? "",
      status: body.status ?? "Ativo",
    })
    .select()
    .single();

  if (error) {
    console.error("[API POST] Erro ao inserir:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  console.log("[API POST] Dados inseridos com sucesso:", data);

  // Se RLS estiver ativado, cria parâmetro RLS automaticamente
  if (body.rls && data) {
    const { error: rlsError } = await supabaseAdmin
      .from("parametros_rls")
      .insert({
        nome: body.nome ?? "RLS " + data.id,
        nome_parametro_powerbi: body.rlsRole || "Filial",
        tipo: "Filial",
        dashboard_id: data.id,
        tenant: "VIA GROUP",
      });

    if (rlsError) {
      console.error("Erro ao criar parâmetro RLS:", rlsError.message);
    }
  }

  return NextResponse.json({ success: true, entry: mapRow(data) });
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
  
  const { data, error } = await supabaseAdmin
    .from("dashboards")
    .update({
      nome: body.nome,
      descricao: body.descricao,
      workspace_id: body.workspaceId,
      report_id: body.reportId,
      dataset_id: body.datasetId,
      ativo: body.ativo,
      prioridade: body.prioridade,
      setor: body.setor,
      rls: body.rls,
      rls_role: body.rlsRole ?? "",
      status: body.status,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    console.error("[API PUT] Erro ao atualizar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  console.log("[API PUT] Dados atualizados com sucesso:", data);

  // Se RLS estiver ativado, verifica se existe parâmetro RLS
  if (body.rls && data) {
    // Verifica se já existe parâmetro RLS para este dashboard
    const { data: existingRls } = await supabaseAdmin
      .from("parametros_rls")
      .select("id")
      .eq("dashboard_id", body.id)
      .single();

    if (!existingRls) {
      // Não existe, cria automaticamente
      const { error: rlsError } = await supabaseAdmin
        .from("parametros_rls")
        .insert({
          nome: body.nome ?? "RLS " + data.id,
          nome_parametro_powerbi: body.rlsRole || "Filial",
          tipo: "Filial",
          dashboard_id: body.id,
          tenant: "VIA GROUP",
        });

      if (rlsError) {
        console.error("Erro ao criar parâmetro RLS:", rlsError.message);
      }
    }
  }

  return NextResponse.json({ success: true, entry: mapRow(data) });
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

  const { error } = await supabaseAdmin.from("dashboards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
