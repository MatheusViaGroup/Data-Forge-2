"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  // Limpa qualquer sessão ativa ao abrir a tela de login
  useEffect(() => {
    signOut({ redirect: false });
  }, []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #5A6FD6 0%, #4040B0 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative w-full max-w-[520px] mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ borderRadius: "16px" }}>
          <div className="px-12 py-10">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#333333] mb-2">Faça Login</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-full">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  autoComplete="off"
                  required
                  className="w-full px-6 py-3.5 bg-[#F0F4F8] border-0 rounded-full text-[#333333] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full px-6 py-3.5 bg-[#F0F4F8] border-0 rounded-full text-[#333333] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all ${rememberMe ? "bg-[#4B5FBF] border-[#4B5FBF]" : "border-[#cbd5e1] bg-white"}`}>
                      {rememberMe && (
                        <Check size={12} className="text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-[#6C757D]">Lembrar de mim</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#4B5FBF] hover:bg-[#4040B0] text-white font-semibold text-sm rounded-full transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2e8f0]" />
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3.5 bg-[#00AEEF] hover:bg-[#0096D6] text-white font-semibold text-sm rounded-full transition-all duration-200 shadow-lg flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="white" />
                  <rect x="11" y="1" width="9" height="9" fill="white" />
                  <rect x="1" y="11" width="9" height="9" fill="white" />
                  <rect x="11" y="11" width="9" height="9" fill="white" />
                </svg>
                Entrar com Microsoft
              </button>
            </form>

            <div className="text-center mt-6">
              <a href="#" className="text-sm text-[#00AEEF] hover:text-[#4B5FBF] font-medium transition-colors">
                Esqueci minha senha
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          Via Core — Portal de Inteligência Via Group
        </p>
      </div>
    </div>
  );
}
