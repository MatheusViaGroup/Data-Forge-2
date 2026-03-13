import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

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
  const { data, error } = await supabaseAdmin
    .from("acessos_especiais")
    .select("*")
    .order("nome");

  if (error) {
    console.error("Erro ao buscar acessos especiais:", error.message);
    return NextResponse.json({ entries: [] });
  }

  const entries = (data || []).map(mapRow);
  return NextResponse.json({ entries });
}

// ─── POST: cria novo ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("acessos_especiais")
    .insert({
      nome: body.nome ?? "",
      descricao: body.descricao ?? "",
      filiais: body.filiais ?? [],
      status: body.status ?? "Ativo",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, entry: mapRow(data) });
}

// ─── PUT: atualiza ────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("acessos_especiais")
    .update({
      nome: body.nome,
      descricao: body.descricao,
      filiais: body.filiais,
      status: body.status,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const { error } = await supabaseAdmin.from("acessos_especiais").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
