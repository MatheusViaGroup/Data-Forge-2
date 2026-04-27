import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { rows } = await query(
      "SELECT id, nome, email, departamento, acesso, status, filiais, dashboards FROM via_core.usuarios ORDER BY created_at"
    );
    return NextResponse.json({ entries: rows.map(mapRow) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
  const senhaPlain = body.senha || crypto.randomBytes(8).toString("hex");
  console.log("  - Senha fornecida pelo admin:", body.senha ? "SIM" : "NÃO (gerada automaticamente)");
  const senhaHash = await bcrypt.hash(senhaPlain, 10);
  console.log("Senha hash gerada:", senhaHash.substring(0, 20) + "...");

  // STEP 4: Insert no banco
  console.log("\n[STEP 4] Inserindo no banco...");
  const insertData = {
    nome: body.nome ?? "",
    email: body.email ?? "",
    senha_hash: senhaHash,
    departamento: (body.departamento ?? "").toUpperCase(),
    acesso: body.acesso ?? "Usuário",
    status: body.status ?? "Ativo",
    filiais: normalizeStringArray(body.filiais),
    dashboards: body.dashboards ?? [],
    must_change_password: true,
  };
  console.log("Dados para insert:", JSON.stringify(insertData, null, 2));

  try {
    const data = await queryOne(
      `INSERT INTO via_core.usuarios (nome, email, senha_hash, departamento, acesso, status, filiais, dashboards, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9)
       RETURNING id, nome, email, departamento, acesso, status, filiais, dashboards`,
      [
        insertData.nome,
        insertData.email,
        insertData.senha_hash,
        insertData.departamento,
        insertData.acesso,
        insertData.status,
        insertData.filiais,
        JSON.stringify(insertData.dashboards),
        insertData.must_change_password,
      ]
    );

    if (!data) {
      console.error("\n❌ [USUARIOS API] ERRO: Insert retornou sem dados");
      console.log("\n" + "=".repeat(60));
      return NextResponse.json({ error: "Erro ao inserir usuário" }, { status: 500 });
    }

    console.log("\n✅ [USUARIOS API] Usuário criado com sucesso!");
    console.log("  - ID:", data.id);
    console.log("  - Nome:", data.nome);
    console.log("  - Email:", data.email);
    console.log("  - Acesso:", data.acesso);
    console.log("  - Status:", data.status);
    console.log("  - Filiais:", (data.filiais as any[])?.length ?? 0, "filiais");
    console.log("  - Dashboards:", (data.dashboards as any[])?.length ?? 0, "dashboards");
    console.log("\n" + "=".repeat(60) + "\n");

    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
    console.error("\n❌ [USUARIOS API] ERRO AO INSERIR:");
    console.error("  - Message:", error.message);
    console.error("  - Code:", error.code ?? "N/A");
    console.error("  - Details:", error.detail ?? "N/A");
    console.error("  - Hint:", error.hint ?? "N/A");
    console.error("  - Full error:", JSON.stringify(error, null, 2));
    console.log("\n" + "=".repeat(60));
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.detail,
        hint: error.hint,
      },
      { status: 500 }
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();

  // Build dynamic SET clause
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
    setClauses.push(`departamento = $${paramIdx++}`);
    params.push(body.departamento.toUpperCase());
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
  if (body.dashboards !== undefined) {
    setClauses.push(`dashboards = $${paramIdx++}::jsonb`);
    params.push(JSON.stringify(body.dashboards));
  }
  if (body.must_change_password !== undefined) {
    setClauses.push(`must_change_password = $${paramIdx++}`);
    params.push(body.must_change_password);
  }
  if (body.senha) {
    const senhaHash = await bcrypt.hash(body.senha, 10);
    setClauses.push(`senha_hash = $${paramIdx++}`);
    params.push(senhaHash);
  }

  // id is the last parameter
  params.push(body.id);

  try {
    const data = await queryOne(
      `UPDATE via_core.usuarios SET ${setClauses.join(", ")} WHERE id = $${paramIdx}
       RETURNING id, nome, email, departamento, acesso, status, filiais, dashboards`,
      params
    );

    if (!data) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: mapRow(data) });
  } catch (error: any) {
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
    await query("DELETE FROM via_core.usuarios WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
