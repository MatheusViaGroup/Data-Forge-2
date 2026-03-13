"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Limpa qualquer sessão ativa ao abrir a tela de login
  useEffect(() => {
    signOut({ redirect: false });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#FFFFFF" }}
    >
      {/* Card central */}
      <div
        className="w-full mx-4"
        style={{
          maxWidth: "480px",
          background: "#F2F3F5",
          borderRadius: "16px",
          border: "1px solid #E4E5E9",
          padding: "48px 44px",
        }}
      >
        {/* Logo Via Group */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://viagroup.com.br/assets/via_group-22fac685.png"
            alt="Via Group"
            style={{ width: "160px", height: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Subtítulo */}
        <p
          className="text-center mb-8"
          style={{ color: "#6B7280", fontSize: "14px" }}
        >
          Insira suas credenciais para acessar o sistema
        </p>

        {/* Erro */}
        {error && (
          <div
            className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg"
            style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#DC2626", fontSize: "13px" }}
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
              style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#1A1A2E", marginBottom: "6px" }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#FFFFFF",
                border: "1px solid #E4E5E9",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#1A1A2E",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#2454A4")}
              onBlur={e => (e.currentTarget.style.borderColor = "#E4E5E9")}
            />
          </div>

          {/* Senha */}
          <div>
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#1A1A2E", marginBottom: "6px" }}
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
                  background: "#FFFFFF",
                  border: "1px solid #E4E5E9",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#1A1A2E",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#2454A4")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E4E5E9")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#9CA3AF" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#2454A4")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 transition-all duration-150"
            style={{
              padding: "12px",
              background: loading ? "#3A6BC4" : "#2454A4",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "15px",
              borderRadius: "8px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = "#1B3D7B"); }}
            onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = "#2454A4"); }}
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
