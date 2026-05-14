"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function TrocarSenhaPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!senhaForteRegex.test(novaSenha)) {
      setErro("Use no minimo 8 caracteres, com letra maiuscula, minuscula e numero.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas nao coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha }),
      });

      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? "Erro ao alterar senha.");
        return;
      }

      setSucesso(true);
      setTimeout(async () => {
        await signOut({ redirect: false });
        router.push("/login");
      }, 2000);
    } catch {
      setErro("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-panel)" }}>
      <div
        className="w-full"
        style={{
          maxWidth: "520px",
          background: "var(--bg-panel-soft)",
          borderRadius: "16px",
          border: "1px solid var(--border-soft)",
          padding: "42px 38px",
          boxShadow: "var(--shadow-card)",
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

        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "var(--bg-input)" }}>
            <ShieldCheck size={22} className="text-[var(--brand-primary)]" />
          </div>
          <h1 className="text-center text-[var(--text-primary)] text-[27px] font-bold leading-[1.2]">
            Defina sua nova senha
          </h1>
          <p className="text-center text-sm mt-2" style={{ color: "var(--text-secondary)", maxWidth: "420px" }}>
            {session?.user?.name ? `Ola, ${session.user.name.split(" ")[0]}! ` : ""}
            Por seguranca, crie uma senha pessoal para acessar o portal.
          </p>
        </div>

        {sucesso ? (
          <div className="flex flex-col items-center gap-3 py-3">
            <CheckCircle2 size={38} className="text-[var(--status-success)]" />
            <p className="text-[var(--status-success)] font-semibold text-center">
              Senha alterada com sucesso!
            </p>
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              Redirecionando para o login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-secondary)",
              }}
            >
              Sua senha deve ter no minimo 8 caracteres, incluindo letra maiuscula, minuscula e numero.
            </div>

            {erro && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-lg"
                style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "var(--status-danger)", fontSize: "13px" }}
              >
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="nova-senha"
                style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}
              >
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="nova-senha"
                  type={showNova ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
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
                  onClick={() => setShowNova(!showNova)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  aria-label={showNova ? "Ocultar senha" : "Exibir senha"}
                >
                  {showNova ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmar-senha"
                style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}
              >
                Confirmar nova senha
              </label>
              <div className="relative">
                <input
                  id="confirmar-senha"
                  type={showConfirmar ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
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
                  onClick={() => setShowConfirmar(!showConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  aria-label={showConfirmar ? "Ocultar senha" : "Exibir senha"}
                >
                  {showConfirmar ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {confirmarSenha && (
                <p className={`text-xs mt-1 ${novaSenha === confirmarSenha ? "text-[var(--status-success)]" : "text-red-500"}`}>
                  {novaSenha === confirmarSenha ? "As senhas coincidem." : "As senhas nao coincidem."}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
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
                  Salvando...
                </>
              ) : (
                "Definir nova senha"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
