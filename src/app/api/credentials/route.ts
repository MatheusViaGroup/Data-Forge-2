import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    tenant: row.tenant ?? "",
    clientId: row.client_id,
    clientSecret: row.client_secret ? "••••••••" : "",
    tenantId: row.tenant_id,
    usuarioPowerBI: row.master_user,
    masterPassword: row.master_password ? "••••••••" : "",
    dataRegistro: row.created_at
      ? new Date(row.created_at).toLocaleDateString("pt-BR")
      : "",
    dataExpiracao: row.secret_expiration
      ? new Date(row.secret_expiration + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    status: row.status === "ativo" ? "Ativo" : "Inativo",
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("credenciais")
    .select("*")
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
  const { data, error } = await supabaseAdmin
    .from("credenciais")
    .insert({
      nome: body.nome ?? "",
      tenant: body.tenant ?? "",
      client_id: body.clientId ?? "",
      client_secret: body.clientSecret ?? "",
      tenant_id: body.tenantId ?? "",
      master_user: body.usuarioPowerBI ?? "",
      master_password: body.masterPassword ?? "",
      secret_expiration: body.dataExpiracao
        ? body.dataExpiracao.split("/").reverse().join("-")
        : null,
      status: body.status === "Ativo" ? "ativo" : "inativo",
    })
    .select()
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
  const updates: any = {
    nome: body.nome,
    tenant: body.tenant,
    client_id: body.clientId,
    tenant_id: body.tenantId,
    master_user: body.usuarioPowerBI,
    secret_expiration: body.dataExpiracao
      ? body.dataExpiracao.split("/").reverse().join("-")
      : null,
    status: body.status === "Ativo" ? "ativo" : "inativo",
  };
  // Só atualiza secrets se vierem preenchidos (não placeholder)
  if (body.clientSecret && body.clientSecret !== "••••••••") {
    updates.client_secret = body.clientSecret;
  }
  if (body.masterPassword && body.masterPassword !== "••••••••") {
    updates.master_password = body.masterPassword;
  }
  const { data, error } = await supabaseAdmin
    .from("credenciais")
    .update(updates)
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

  const { error } = await supabaseAdmin.from("credenciais").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
