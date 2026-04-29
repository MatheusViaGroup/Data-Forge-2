"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, LogIn } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

const SAVED_EMAIL_KEY = "via-core-saved-email";
const SAVED_PASSWORD_KEY = "via-core-saved-password";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Se já está autenticado, redireciona direto para o dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // Carrega e-mail e senha salvos no localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    const savedPassword = localStorage.getItem(SAVED_PASSWORD_KEY);
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Confirme que voc\u00ea n\u00e3o \u00e9 um rob\u00f4.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      turnstileToken,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      setLoading(false);
    } else {
      // Salva e-mail e senha para preencher automaticamente no próximo login
      localStorage.setItem(SAVED_EMAIL_KEY, email);
      localStorage.setItem(SAVED_PASSWORD_KEY, password);
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-panel)" }}
    >
      {/* Card central */}
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
        {/* Logo Via Group */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://viagroup.com.br/assets/via_group-22fac685.png"
            alt="Via Group"
            className="logo-dark"
            style={{ width: "160px", height: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Subtítulo */}
        <p
          className="text-center mb-8"
          style={{ color: "var(--text-secondary)", fontSize: "14px" }}
        >
          Insira suas credenciais para acessar o sistema
        </p>

        {/* Erro */}
        {error && (
          <div
            className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg"
            style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "var(--status-danger)", fontSize: "13px" }}
          >
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}
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
              onFocus={e => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-soft)")}
            />
          </div>

          {/* Senha */}
          <div>
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}
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
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-soft)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--brand-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Botao Entrar */}
          <div className="pt-2">
            {turnstileSiteKey ? (
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => {
                  setTurnstileToken(null);
                  setError("Erro ao validar captcha. Tente novamente.");
                }}
              />
            ) : (
              <p style={{ color: "var(--status-danger)", fontSize: "13px" }}>
                NEXT_PUBLIC_TURNSTILE_SITE_KEY n\u00e3o configurada.
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
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = "var(--brand-primary-hover)"); }}
            onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = "var(--brand-primary)"); }}
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
