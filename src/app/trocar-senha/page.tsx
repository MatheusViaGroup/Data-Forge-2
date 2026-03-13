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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
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
      // Após 2s, faz logout para que o usuário entre com a nova senha (token atualizado)
      setTimeout(async () => {
        await signOut({ redirect: false });
        router.push("/login");
      }, 2000);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #5A6FD6 0%, #4040B0 100%)" }}
    >
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative w-full max-w-[480px] mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-10 py-10">
            {/* Ícone + Título */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#4B5FBF]/10 mb-4">
                <ShieldCheck size={28} className="text-[#4B5FBF]" />
              </div>
              <h1 className="text-xl font-bold text-[#333333] text-center">
                Defina sua nova senha
              </h1>
              <p className="text-sm text-[#6C757D] text-center mt-2">
                {session?.user?.name
                  ? `Olá, ${session.user.name.split(" ")[0]}! `
                  : ""}
                Por segurança, crie uma senha pessoal para acessar o portal.
              </p>
            </div>

            {/* Sucesso */}
            {sucesso ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 size={40} className="text-[#28A745]" />
                <p className="text-[#28A745] font-semibold text-center">
                  Senha alterada com sucesso!
                </p>
                <p className="text-[#6C757D] text-sm text-center">
                  Redirecionando para o login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Erro */}
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-full">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                {/* Nova senha */}
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5 ml-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNova ? "text" : "password"}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-6 py-3.5 bg-[#F0F4F8] border-0 rounded-full text-[#333333] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNova(!showNova)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors"
                    >
                      {showNova ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5 ml-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmar ? "text" : "password"}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      className="w-full px-6 py-3.5 bg-[#F0F4F8] border-0 rounded-full text-[#333333] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(!showConfirmar)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors"
                    >
                      {showConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {/* Indicador de match */}
                  {confirmarSenha && (
                    <p className={`text-xs mt-1 ml-3 ${novaSenha === confirmarSenha ? "text-[#28A745]" : "text-red-500"}`}>
                      {novaSenha === confirmarSenha ? "✓ As senhas coincidem" : "As senhas não coincidem"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#4B5FBF] hover:bg-[#4040B0] text-white font-semibold text-sm rounded-full transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Definir nova senha"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          Kore Data - Conectamos dados para Gerar Resultados
        </p>
      </div>
    </div>
  );
}
