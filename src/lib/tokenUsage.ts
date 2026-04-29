import crypto from "crypto";
import { query, queryOne } from "@/lib/db";

interface RegisterTokenUsageParams {
  token: string;
  dashboardId: string;
  userId: string;
  credentialId: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Store only a hash of the embed token for safer auditing.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function registerTokenUsage(params: RegisterTokenUsageParams): Promise<{
  success: boolean;
  id?: string;
  duplicate?: boolean;
}> {
  const tokenHash = hashToken(params.token);
  const expiresAtDate = new Date(params.expiresAt);

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM via_core.uso_tokens WHERE token_hash = $1 LIMIT 1",
    [tokenHash]
  );

  if (existing) {
    return { success: true, duplicate: true, id: existing.id };
  }

  const inserted = await queryOne<{ id: string }>(
    `INSERT INTO via_core.uso_tokens (id, token_hash, dashboard_id, user_id, credential_id, expires_at, ip_address, user_agent, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      crypto.randomUUID(),
      tokenHash,
      params.dashboardId,
      params.userId,
      params.credentialId,
      expiresAtDate.toISOString(),
      params.ipAddress ?? null,
      params.userAgent ?? null,
      "ativo",
    ]
  );

  if (!inserted) {
    throw new Error("Falha ao registrar token");
  }

  return { success: true, id: inserted.id };
}

