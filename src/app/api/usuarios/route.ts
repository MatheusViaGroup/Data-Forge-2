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
  console.log("\n" + "=".repeat(60));
  console.log("🔵 [USUARIOS API] POST - INICIANDO");
  console.log("=".repeat(60));

  // STEP 1: Session
  console.log("\n[STEP 1] Verificando sessão...");
  const session = await getServerSession(authOptions);
  console.log("Session:", session ? "✓" : "✗");
  console.log("User role:", session?.user?.role ?? "NENHUMA");
  
  if (!session || session.user?.role !== "admin") {
    console.error("❌ ERRO: Usuário não autorizado");
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  // STEP 2: Parse body
  console.log("\n[STEP 2] Lendo body da requisição...");
  const body = await request.json();
  console.log("Body recebido:");
  console.log("  - nome:", body.nome ?? "NÃO INFORMADO");
  console.log("  - email:", body.email ?? "NÃO INFORMADO");
  console.log("  - departamento:", body.departamento ?? "NÃO INFORMADO");
  console.log("  - acesso:", body.acesso ?? "NÃO INFORMADO");
  console.log("  - status:", body.status ?? "NÃO INFORMADO");
  console.log("  - filiais:", body.filiais ?? "NÃO INFORMADO");
  console.log("  - dashboards:", body.dashboards ?? "NÃO INFORMADO");

  // STEP 3: Hash senha
  console.log("\n[STEP 3] Gerando hash da senha...");
  const senhaHash = await bcrypt.hash("1234", 10);
  console.log("Senha hash gerada:", senhaHash.substring(0, 20) + "...");

  // STEP 4: Insert no Supabase
  console.log("\n[STEP 4] Inserindo no Supabase...");
  const insertData = {
    nome: body.nome ?? "",
    email: body.email ?? "",
    senha_hash: senhaHash,
    departamento: body.departamento ?? "",
    acesso: body.acesso ?? "Usuário",
    status: body.status ?? "Ativo",
    filiais: body.filiais ?? [],
    dashboards: body.dashboards ?? [],
    must_change_password: true,
  };
  console.log("Dados para insert:", JSON.stringify(insertData, null, 2));

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .insert(insertData)
    .select("id, nome, email, departamento, acesso, status, filiais, dashboards")
    .single();

  if (error) {
    console.error("\n❌ [USUARIOS API] ERRO AO INSERIR:");
    console.error("  - Message:", error.message);
    console.error("  - Code:", (error as any).code ?? "N/A");
    console.error("  - Details:", (error as any).details ?? "N/A");
    console.error("  - Hint:", (error as any).hint ?? "N/A");
    console.error("  - Full error:", JSON.stringify(error, null, 2));
    console.log("\n" + "=".repeat(60));
    return NextResponse.json({ 
      error: error.message, 
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint
    }, { status: 500 });
  }

  console.log("\n✅ [USUARIOS API] Usuário criado com sucesso!");
  console.log("  - ID:", data.id);
  console.log("  - Nome:", data.nome);
  console.log("  - Email:", data.email);
  console.log("  - Acesso:", data.acesso);
  console.log("  - Status:", data.status);
  console.log("  - Filiais:", data.filiais?.length ?? 0, "filiais");
  console.log("  - Dashboards:", data.dashboards?.length ?? 0, "dashboards");
  console.log("\n" + "=".repeat(60) + "\n");

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
