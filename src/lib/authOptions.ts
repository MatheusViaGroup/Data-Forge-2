import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";

interface UserRow extends Record<string, unknown> {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  acesso: string;
  status: string;
  must_change_password: boolean;
  dashboards: string[];
}

interface SessionRefreshRow extends Record<string, unknown> {
  id: string;
  status: string;
  dashboards: string[] | null;
  acesso: string;
  must_change_password: boolean;
}

interface TurnstileVerifyResponse extends Record<string, unknown> {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

export const ADMIN_TENANT_ACCESS = "Administrador do Locatário";
const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";
const REQUIRED_ENV_VARS = ["NEXTAUTH_SECRET", "DATABASE_URL", "TURNSTILE_SECRET_KEY"] as const;

const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error(`[auth][env] Missing required env vars: ${missingEnvVars.join(", ")}`);
}
if (!process.env.NEXTAUTH_URL) {
  console.warn(
    "[auth][env] NEXTAUTH_URL is not set. In Vercel, set it to your public URL (e.g. https://viagroup.vercel.app)."
  );
}

function logAuth(
  level: "info" | "warn" | "error",
  stage: string,
  details?: Record<string, unknown>
): void {
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (details) {
    fn(`[auth][${stage}]`, details);
    return;
  }
  fn(`[auth][${stage}]`);
}

function maskEmail(email: string): string {
  const [localPart, domainPart] = email.split("@");
  if (!domainPart) return "***";
  const head = localPart.slice(0, 2);
  return `${head}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domainPart}`;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function accessToRole(acesso: string): "admin" | "total" | "matriz" | "user" {
  if (acesso === ADMIN_TENANT_ACCESS) return "admin";
  if (acesso === "Usuário Total") return "total";
  if (acesso === "Matriz") return "matriz";
  return "user";
}

function resolveAllowedDashboards(acesso: string, dashboards: string[] | null | undefined): string[] {
  if (acesso === ADMIN_TENANT_ACCESS || acesso === "Usuário Total") {
    return [];
  }
  return dashboards ?? [];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
      },
      async authorize(credentials, req) {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const forwardedFor = firstHeaderValue(headers["x-forwarded-for"]);
        const clientIp = forwardedFor?.split(",")[0]?.trim() || null;
        const userAgent = firstHeaderValue(headers["user-agent"]) ?? "unknown";

        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";
        const turnstileToken = credentials?.turnstileToken ?? "";

        if (AUTH_DEBUG) {
          logAuth("info", "authorize:start", {
            requestId,
            email: email ? maskEmail(email) : "(empty)",
            hasPassword: password.length > 0,
            hasTurnstileToken: turnstileToken.length > 0,
            clientIp,
            userAgent,
          });
        }

        if (!email || !password) {
          logAuth("warn", "authorize:missing-credentials", {
            requestId,
            email: email ? maskEmail(email) : "(empty)",
          });
          return null;
        }

        if (!turnstileToken) {
          logAuth("warn", "authorize:missing-turnstile-token", { requestId, email: maskEmail(email) });
          return null;
        }

        if (!process.env.TURNSTILE_SECRET_KEY) {
          logAuth("error", "authorize:missing-turnstile-secret", { requestId });
          return null;
        }

        try {
          const turnstilePayload = new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
          });

          if (clientIp) {
            turnstilePayload.set("remoteip", clientIp);
          }

          const turnstileRes = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: turnstilePayload.toString(),
            }
          );

          if (!turnstileRes.ok) {
            logAuth("warn", "authorize:turnstile-http-failure", {
              requestId,
              email: maskEmail(email),
              status: turnstileRes.status,
            });
            return null;
          }

          const turnstileData = (await turnstileRes.json()) as TurnstileVerifyResponse;
          if (!turnstileData.success) {
            logAuth("warn", "authorize:turnstile-invalid", {
              requestId,
              email: maskEmail(email),
              hostname: turnstileData.hostname ?? null,
              errors: turnstileData["error-codes"] ?? [],
            });
            return null;
          }
        } catch (error: unknown) {
          const err = error as Error;
          logAuth("error", "authorize:turnstile-exception", {
            requestId,
            email: maskEmail(email),
            message: err.message,
          });
          return null;
        }

        let user: UserRow | null = null;
        try {
          user = await queryOne<UserRow>(
            `SELECT id, nome, email, senha_hash, acesso, status, must_change_password, dashboards
             FROM via_core.usuarios
             WHERE LOWER(email) = LOWER($1) AND status = 'Ativo'
             LIMIT 1`,
            [email]
          );
        } catch (error: unknown) {
          const err = error as Error;
          logAuth("error", "authorize:db-exception", {
            requestId,
            email: maskEmail(email),
            message: err.message,
          });
          return null;
        }

        if (!user) {
          logAuth("warn", "authorize:user-not-found-or-inactive", {
            requestId,
            email: maskEmail(email),
          });
          return null;
        }

        if (!user.senha_hash) {
          logAuth("error", "authorize:missing-password-hash", {
            requestId,
            email: maskEmail(email),
            userId: user.id,
          });
          return null;
        }

        let passwordMatch = false;
        try {
          passwordMatch = await bcrypt.compare(password, user.senha_hash);
        } catch (error: unknown) {
          const err = error as Error;
          logAuth("error", "authorize:bcrypt-exception", {
            requestId,
            email: maskEmail(email),
            userId: user.id,
            message: err.message,
          });
          return null;
        }

        if (!passwordMatch) {
          logAuth("warn", "authorize:password-mismatch", {
            requestId,
            email: maskEmail(email),
            userId: user.id,
          });
          return null;
        }

        if (AUTH_DEBUG) {
          logAuth("info", "authorize:success", {
            requestId,
            email: maskEmail(user.email),
            userId: user.id,
            access: user.acesso,
          });
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: accessToRole(user.acesso),
          mustChangePassword: user.must_change_password ?? false,
          allowedDashboards: resolveAllowedDashboards(user.acesso, user.dashboards),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.allowedDashboards = user.allowedDashboards ?? [];
      }

      // Revalida status e acessos a cada request de JWT
      if (token.id) {
        try {
          const data = await queryOne<SessionRefreshRow>(
            `SELECT id, status, dashboards, acesso, must_change_password
             FROM via_core.usuarios
             WHERE id = $1 AND status = 'Ativo'
             LIMIT 1`,
            [token.id as string]
          );

          if (!data) {
            logAuth("warn", "jwt:user-not-found-or-inactive", { userId: token.id as string });
            return null as unknown as JWT;
          }

          token.role = accessToRole(data.acesso);
          token.allowedDashboards = resolveAllowedDashboards(data.acesso, data.dashboards);
          token.mustChangePassword = data.must_change_password ?? false;
        } catch (error: unknown) {
          const err = error as Error;
          logAuth("error", "jwt:refresh-exception", {
            userId: token.id as string,
            message: err.message,
          });
          return token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
        session.user.allowedDashboards = (token.allowedDashboards as string[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  debug: AUTH_DEBUG,
  logger: {
    error(code, ...message) {
      console.error("[next-auth][error]", code, ...message);
    },
    warn(code, ...message) {
      console.warn("[next-auth][warn]", code, ...message);
    },
    debug(code, ...message) {
      if (AUTH_DEBUG) {
        console.log("[next-auth][debug]", code, ...message);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
