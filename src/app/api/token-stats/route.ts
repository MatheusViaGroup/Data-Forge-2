import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

type UsageTokenRow = {
  id: string;
  created_at: string;
  dashboard_id: string | null;
  user_id: string | null;
  credential_id: string | null;
  status: string;
};

type DashboardNameRow = {
  id: string;
  nome: string;
};

type UsuarioNameRow = {
  id: string;
  nome: string;
  email: string;
};

type CredentialNameRow = {
  id: string;
  nome: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get("period") || "today";
  const dashboardId = searchParams.get("dashboardId") || null;
  const userId = searchParams.get("userId") || null;

  if (dashboardId && !UUID_REGEX.test(dashboardId)) {
    return NextResponse.json({ error: "dashboardId inválido" }, { status: 400 });
  }
  if (userId && !UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: "userId inválido" }, { status: 400 });
  }

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

  const conditions: string[] = [`created_at >= $1`, `status = 'ativo'`];
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
    const { rows: tokens } = await query<UsageTokenRow>(
      `SELECT id, created_at, dashboard_id, user_id, credential_id, status
       FROM via_core.uso_tokens
       WHERE ${conditions.join(" AND ")}`,
      params
    );

    const allTokens = tokens ?? [];
    const dashboardIds = Array.from(new Set(allTokens.map((token) => token.dashboard_id).filter((id): id is string => Boolean(id))));
    const userIds = Array.from(new Set(allTokens.map((token) => token.user_id).filter((id): id is string => Boolean(id))));
    const credentialIds = Array.from(new Set(allTokens.map((token) => token.credential_id).filter((id): id is string => Boolean(id))));

    const [dashboardsRes, usuariosRes, credenciaisRes] = await Promise.all([
      dashboardIds.length > 0
        ? query<DashboardNameRow>("SELECT id, nome FROM via_core.dashboards WHERE id = ANY($1)", [dashboardIds])
        : Promise.resolve({ rows: [] as DashboardNameRow[] }),
      userIds.length > 0
        ? query<UsuarioNameRow>("SELECT id, nome, email FROM via_core.usuarios WHERE id = ANY($1)", [userIds])
        : Promise.resolve({ rows: [] as UsuarioNameRow[] }),
      credentialIds.length > 0
        ? query<CredentialNameRow>("SELECT id, nome FROM via_core.credenciais WHERE id = ANY($1)", [credentialIds])
        : Promise.resolve({ rows: [] as CredentialNameRow[] }),
    ]);

    const dashboardsMap = new Map(dashboardsRes.rows.map((dashboard) => [dashboard.id, dashboard.nome]));
    const usuariosMap = new Map(usuariosRes.rows.map((usuario) => [usuario.id, `${usuario.nome} (${usuario.email})`]));
    const credenciaisMap = new Map(credenciaisRes.rows.map((credencial) => [credencial.id, credencial.nome]));

    const byDashboard = new Map<string, { nome: string; count: number }>();
    allTokens
      .filter((token) => token.dashboard_id)
      .forEach((token) => {
        const key = token.dashboard_id as string;
        const nome = dashboardsMap.get(key) || key;
        const current = byDashboard.get(key) || { nome, count: 0 };
        byDashboard.set(key, { nome, count: current.count + 1 });
      });

    const byUser = new Map<string, { nome: string; count: number }>();
    allTokens
      .filter((token) => token.user_id)
      .forEach((token) => {
        const key = token.user_id as string;
        const nome = usuariosMap.get(key) || key;
        const current = byUser.get(key) || { nome, count: 0 };
        byUser.set(key, { nome, count: current.count + 1 });
      });

    const byCredential = new Map<string, { nome: string; count: number }>();
    allTokens
      .filter((token) => token.credential_id)
      .forEach((token) => {
        const key = token.credential_id as string;
        const nome = credenciaisMap.get(key) || key;
        const current = byCredential.get(key) || { nome, count: 0 };
        byCredential.set(key, { nome, count: current.count + 1 });
      });

    const limiteDiarioPro = 1000;
    const totalTokensPeriodo = allTokens.length;
    let tokensRemaining: number | null = null;
    let limitReached = false;

    if (period === "today") {
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
      warning:
        period === "today"
          ? "Limite de 1000 tokens/dia é estimativa para Power BI Pro. Para Embedded, consulte sua capacidade no Azure."
          : null,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[token-stats] Erro ao buscar estatísticas:", err.message);
    return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
  }
}
