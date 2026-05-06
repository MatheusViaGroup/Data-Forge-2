import "server-only";
import { queryOne } from "@/lib/db";

type DashboardLookupRow = {
  id: string;
};

export async function resolveDashboardId(reportId: string, groupId: string): Promise<string | null> {
  const dashboard = await queryOne<DashboardLookupRow>(
    `SELECT id
     FROM via_core.dashboards
     WHERE report_id = $1
       AND workspace_id = $2
     LIMIT 1`,
    [reportId, groupId]
  );

  return dashboard?.id ?? null;
}

export function userCanAccessDashboard(
  role: string | undefined,
  allowedDashboards: string[] | undefined,
  dashboardId: string
): boolean {
  if (role === "admin") {
    return true;
  }

  if (!allowedDashboards || allowedDashboards.length === 0) {
    return false;
  }

  return allowedDashboards.includes(dashboardId);
}
