import type { NextAuthOptions, JWT } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

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
          console.log('[Auth] Email ou senha não fornecidos');
          return null;
        }

        console.log('[Auth] Tentando autenticar:', credentials.email);

        const { data: user, error } = await supabaseAdmin
          .from("usuarios")
          .select("id, nome, email, senha_hash, acesso, status, must_change_password")
          .eq("email", credentials.email)
          .eq("status", "Ativo")
          .single();

        if (error) {
          console.log('[Auth] Erro ao buscar usuário:', error.message);
          return null;
        }

        if (!user) {
          console.log('[Auth] Usuário não encontrado:', credentials.email);
          return null;
        }

        console.log('[Auth] Usuário encontrado:', user.nome);

        const passwordMatch = await bcrypt.compare(credentials.password, user.senha_hash);
        if (!passwordMatch) {
          console.log('[Auth] Senha incorreta');
          return null;
        }

        console.log('[Auth] Autenticação bem sucedida');

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.acesso === "Administrador do Locatário" ? "admin" : "user",
          mustChangePassword: user.must_change_password ?? false,
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
      }

      // Valida se o usuário ainda existe e está ativo no banco
      if (token.id) {
        const { data } = await supabaseAdmin
          .from("usuarios")
          .select("id, status")
          .eq("id", token.id)
          .eq("status", "Ativo")
          .single();

        if (!data) return null as unknown as JWT; // Invalida o token → redireciona para login
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
};
