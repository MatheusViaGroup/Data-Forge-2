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
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await queryOne<UserRow>(
          `SELECT id, nome, email, senha_hash, acesso, status, must_change_password, dashboards
           FROM via_core.usuarios
           WHERE email = $1 AND status = 'Ativo'
           LIMIT 1`,
          [credentials.email]
        );

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.senha_hash);
        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role:
            user.acesso === "Administrador do LocatÃ¡rio"
              ? "admin"
              : user.acesso === "Matriz"
                ? "matriz"
                : "user",
          mustChangePassword: user.must_change_password ?? false,
          allowedDashboards: user.acesso === "Administrador do LocatÃ¡rio" ? [] : (user.dashboards ?? []),
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
        const data = await queryOne<SessionRefreshRow>(
          `SELECT id, status, dashboards, acesso
           FROM via_core.usuarios
           WHERE id = $1 AND status = 'Ativo'
           LIMIT 1`,
          [token.id as string]
        );

        if (!data) return null as unknown as JWT;

        token.role =
          data.acesso === "Administrador do LocatÃ¡rio"
            ? "admin"
            : data.acesso === "Matriz"
              ? "matriz"
              : "user";

        token.allowedDashboards =
          data.acesso === "Administrador do LocatÃ¡rio"
            ? []
            : (data.dashboards ?? []);
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
  secret: process.env.NEXTAUTH_SECRET,
};
