"use client";

import { useEffect, useRef, useState } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, LogIn } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const SAVED_EMAIL_KEY = "via-core-saved-email";
const SAVED_PASSWORD_KEY = "via-core-saved-password";
const AUTH_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
const TURNSTILE_MAX_TOKEN_AGE_MS = 4 * 60 * 1000;

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileIssuedAt, setTurnstileIssuedAt] = useState<number | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.mustChangePassword) {
        router.replace("/trocar-senha");
        return;
      }
      router.replace("/dashboard");
    }
  }, [status, session?.user?.mustChangePassword, router]);

  useEffect(() => {
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    const savedPassword = localStorage.getItem(SAVED_PASSWORD_KEY);
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileIssuedAt(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!turnstileToken || !turnstileIssuedAt) {
      setError("Confirme que voce nao e um robo.");
      return;
    }

    if (Date.now() - turnstileIssuedAt > TURNSTILE_MAX_TOKEN_AGE_MS) {
      resetTurnstile();
      setError("Captcha expirado. Resolva novamente e tente de novo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        turnstileToken,
        redirect: false,
      });

      if (AUTH_DEBUG) {
        console.log("[login][signIn:result]", {
          ok: result?.ok,
          status: result?.status,
          error: result?.error,
          url: result?.url,
        });
      }

      const failed = Boolean(result?.error) || result?.ok === false;
      if (failed) {
        resetTurnstile();
        setError("Falha no login ou captcha expirado. Resolva o captcha e tente novamente.");
        return;
      }

      setTurnstileToken(null);
      setTurnstileIssuedAt(null);

      localStorage.setItem(SAVED_EMAIL_KEY, email);
      localStorage.setItem(SAVED_PASSWORD_KEY, password);
      const freshSession = await getSession();
      const nextPath = freshSession?.user?.mustChangePassword ? "/trocar-senha" : "/dashboard";
      router.push(nextPath);
      router.refresh();
    } catch (submitError: unknown) {
      if (AUTH_DEBUG) {
        console.error("[login][signIn:exception]", submitError);
      }
      resetTurnstile();
      setError("Erro inesperado ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-panel)" }}
    >
      <div
        className="w-full mx-4"
        style={{
          maxWidth: "480px",
          background: "var(--bg-panel-soft)",
          borderRadius: "16px",
          border: "1px solid var(--border-soft)",
          padding: "48px 44px",
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://viagroup.com.br/assets/via_group-22fac685.png"
            alt="Via Group"
            className="logo-dark"
            style={{ width: "160px", height: "auto", objectFit: "contain" }}
          />
        </div>

        <p
          className="text-center mb-8"
          style={{ color: "var(--text-secondary)", fontSize: "14px" }}
        >
          Insira suas credenciais para acessar o sistema
        </p>

        {error && (
          <div
            className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg"
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "var(--status-danger)",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-soft)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "var(--text-primary)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            {turnstileSiteKey ? (
              <div className="w-full flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                    setTurnstileIssuedAt(Date.now());
                  }}
                  onExpire={() => {
                    setTurnstileToken(null);
                    setTurnstileIssuedAt(null);
                  }}
                  onError={() => {
                    setTurnstileToken(null);
                    setTurnstileIssuedAt(null);
                    setError("Erro ao validar captcha. Tente novamente.");
                  }}
                />
              </div>
            ) : (
              <p style={{ color: "var(--status-danger)", fontSize: "13px" }}>
                NEXT_PUBLIC_TURNSTILE_SITE_KEY nao configurada.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full flex items-center justify-center gap-2 transition-all duration-150"
            style={{
              padding: "12px",
              background: loading ? "var(--brand-primary-hover)" : "var(--brand-primary)",
              color: "var(--bg-panel)",
              fontWeight: 600,
              fontSize: "15px",
              borderRadius: "8px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "var(--brand-primary-hover)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "var(--brand-primary)";
            }}
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <LogIn size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
