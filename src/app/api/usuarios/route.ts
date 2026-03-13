import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    departamento: row.departamento ?? "",
    acesso: row.acesso,
    status: row.status,
    filiais: row.filiais ?? [],
    dashboards: row.dashboards ?? [],
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, departamento, acesso, status, filiais, dashboards")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: (data || []).map(mapRow) });
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const senhaHash = await bcrypt.hash("1234", 10);

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .insert({
      nome: body.nome ?? "",
      email: body.email ?? "",
      senha_hash: senhaHash,
      departamento: body.departamento ?? "",
      acesso: body.acesso ?? "Usuário",
      status: body.status ?? "Ativo",
      filiais: body.filiais ?? [],
      dashboards: body.dashboards ?? [],
      must_change_password: true,
    })
    .select("id, nome, email, departamento, acesso, status, filiais, dashboards")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, entry: mapRow(data) });
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {};
  if (body.nome !== undefined) updates.nome = body.nome;
  if (body.email !== undefined) updates.email = body.email;
  if (body.departamento !== undefined) updates.departamento = body.departamento;
  if (body.acesso !== undefined) updates.acesso = body.acesso;
  if (body.status !== undefined) updates.status = body.status;
  if (body.filiais !== undefined) updates.filiais = body.filiais;
  if (body.dashboards !== undefined) updates.dashboards = body.dashboards;
  if (body.must_change_password !== undefined) updates.must_change_password = body.must_change_password;
  if (body.senha) {
    updates.senha_hash = await bcrypt.hash(body.senha, 10);
  }

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .update(updates)
    .eq("id", body.id)
    .select("id, nome, email, departamento, acesso, status, filiais, dashboards")
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

  const { error } = await supabaseAdmin.from("usuarios").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
