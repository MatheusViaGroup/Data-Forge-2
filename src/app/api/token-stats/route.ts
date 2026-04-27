import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get("period") || "today"; // today, week, month
  const dashboardId = searchParams.get("dashboardId") || null;
  const userId = searchParams.get("userId") || null;

  // Determinar intervalo de datas
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "today":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
  }

  // Build dynamic query for uso_tokens
  const conditions: string[] = [
    `created_at >= $1`,
    `status = 'ativo'`,
  ];
  const params: unknown[] = [startDate.toISOString()];
  let paramIdx = 2;

  if (dashboardId) {
    conditions.push(`dashboard_id = $${paramIdx++}`);
    params.push(dashboardId);
  }
  if (userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(userId);
  }

  try {
    const { rows: tokens } = await query(
      `SELECT id, created_at, dashboard_id, user_id, credential_id, status
       FROM via_core.uso_tokens
       WHERE ${conditions.join(" AND ")}`,
      params
    );

    // Buscar nomes de dashboards em uma query separada (para não precisar de join)
    const allTokens = tokens || [];
    const dashboardIds = Array.from(new Set(allTokens.map((t: any) => t.dashboard_id).filter((id: any): id is string => !!id)));
    const userIds = Array.from(new Set(allTokens.map((t: any) => t.user_id).filter((id: any): id is string => !!id)));
    const credentialIds = Array.from(new Set(allTokens.map((t: any) => t.credential_id).filter((id: any): id is string => !!id)));

    const [dashboardsRes, usuariosRes, credenciaisRes] = await Promise.all([
      dashboardIds.length > 0
        ? query("SELECT id, nome FROM via_core.dashboards WHERE id = ANY($1)", [dashboardIds])
        : Promise.resolve({ rows: [] }),
      userIds.length > 0
        ? query("SELECT id, nome, email FROM via_core.usuarios WHERE id = ANY($1)", [userIds])
        : Promise.resolve({ rows: [] }),
      credentialIds.length > 0
        ? query("SELECT id, nome FROM via_core.credenciais WHERE id = ANY($1)", [credentialIds])
        : Promise.resolve({ rows: [] }),
    ]);

    const dashboardsMap = new Map(dashboardsRes.rows?.map((d: any) => [d.id, d.nome]) || []);
    const usuariosMap = new Map(usuariosRes.rows?.map((u: any) => [u.id, `${u.nome} (${u.email})`]) || []);
    const credenciaisMap = new Map(credenciaisRes.rows?.map((c: any) => [c.id, c.nome]) || []);

    // Agrupar por dashboard
    const byDashboard = new Map<string, { nome: string; count: number }>();
    allTokens.filter((t: any) => t.dashboard_id).forEach((t: any) => {
      const nome = dashboardsMap.get(t.dashboard_id) || t.dashboard_id;
      const current = byDashboard.get(t.dashboard_id) || { nome, count: 0 };
      byDashboard.set(t.dashboard_id, { nome, count: current.count + 1 });
    });

    // Agrupar por usuário
    const byUser = new Map<string, { nome: string; count: number }>();
    allTokens.filter((t: any) => t.user_id).forEach((t: any) => {
      const nome = usuariosMap.get(t.user_id) || t.user_id;
      const current = byUser.get(t.user_id) || { nome, count: 0 };
      byUser.set(t.user_id, { nome, count: current.count + 1 });
    });

    // Agrupar por credencial
    const byCredential = new Map<string, { nome: string; count: number }>();
    allTokens.filter((t: any) => t.credential_id).forEach((t: any) => {
      const nome = credenciaisMap.get(t.credential_id) || t.credential_id;
      const current = byCredential.get(t.credential_id) || { nome, count: 0 };
      byCredential.set(t.credential_id, { nome, count: current.count + 1 });
    });

    // Estimar limite restante
    // Power BI Pro: ~1000 tokens/dia (https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-token)
    // Power BI Embedded: baseado na capacidade (Premium) - não temos essa info
    const limiteDiarioPro = 1000;
    const totalTokensPeriodo = allTokens.length || 0;
    let tokensRemaining = null;
    let limitReached = false;

    if (period === "today") {
      // Estimativa para Power BI Pro
      tokensRemaining = Math.max(0, limiteDiarioPro - totalTokensPeriodo);
      limitReached = totalTokensPeriodo >= limiteDiarioPro;
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalTokens: totalTokensPeriodo,
      byDashboard: Array.from(byDashboard.values()).sort((a, b) => b.count - a.count),
      byUser: Array.from(byUser.values()).sort((a, b) => b.count - a.count),
      byCredential: Array.from(byCredential.values()).sort((a, b) => b.count - a.count),
      limitReached,
      tokensRemaining,
      warning: period === "today"
        ? "Limite de 1000 tokens/dia é estimativa para Power BI Pro. Para Embedded, consulte sua capacidade no Azure."
        : null,
    });
  } catch (error: any) {
    console.error("[token-stats] Erro ao buscar tokens:", error.message);
    return NextResponse.json({ error: "Erro ao buscar estatísticas", details: error.message }, { status: 500 });
  }
}
