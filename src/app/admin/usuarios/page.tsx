"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, RotateCcw, KeyRound, Eye, EyeOff,
  Search, Building2, LayoutDashboard,
} from "lucide-react";
import { useDataStoreContext, Usuario } from "@/contexts/DataStoreContext";

interface Filial {
  PLANTA_ID: string;
  PLANTA: string;
}

type Feedback = { type: "success" | "error"; msg: string } | null;

export default function UsuariosPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { usuarios, dashboards, acessosEspeciais, isLoaded, loadAdminData, addUsuario, updateUsuario, deleteUsuario } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Modal de redefinir senha
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<{ id: string; nome: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [senhaError, setSenhaError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Filiais
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loadingFiliais, setLoadingFiliais] = useState(false);
  const [buscaFilial, setBuscaFilial] = useState("");

  // Dashboards
  const [buscaDashboard, setBuscaDashboard] = useState("");

  // Acesso Especial
  const [acessoEspecialSelecionado, setAcessoEspecialSelecionado] = useState<string>("");

  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"Todos" | "Ativo" | "Excluído">("Todos");

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Formulário
  const [form, setForm] = useState<Omit<Usuario, "id"> & { id: string }>({
    id: "", nome: "", email: "", departamento: "", acesso: "Usuário", status: "Ativo", filiais: [], dashboards: [],
  });
  const [senhaEdicao, setSenhaEdicao] = useState("");
  const [showSenhaEdicao, setShowSenhaEdicao] = useState(false);

  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  // Carrega filiais quando abre o modal (uma vez só)
  useEffect(() => {
    if (!modalOpen) return;
    if (filiais.length > 0) return;
    setLoadingFiliais(true);
    fetch("/api/filiais")
      .then((r) => r.json())
      .then((d) => setFiliais(d.filiais ?? []))
      .catch(() => {})
      .finally(() => setLoadingFiliais(false));
  }, [modalOpen, filiais.length]);

  // Carrega dados admin quando a página monta
  useEffect(() => {
    if (authStatus === "authenticated") {
      loadAdminData();
    }
  }, [authStatus]);

  const toggleFilial = (planta: string) => {
    setForm((prev) => ({
      ...prev,
      filiais: prev.filiais.includes(planta)
        ? prev.filiais.filter((f) => f !== planta)
        : [...prev.filiais, planta],
    }));
  };

  const toggleDashboard = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dashboards: prev.dashboards.includes(id)
        ? prev.dashboards.filter((d) => d !== id)
        : [...prev.dashboards, id],
    }));
  };

  // Aplicar Acesso Especial - auto-seleciona filiais
  const aplicarAcessoEspecial = (acessoId: string) => {
    setAcessoEspecialSelecionado(acessoId);
    
    if (!acessoId) {
      // Se desmarcou o acesso, limpa as filiais
      setForm((prev) => ({ ...prev, filiais: [] }));
      return;
    }
    
    const acesso = acessosEspeciais.find((a) => a.id === acessoId);
    if (acesso && acesso.filiais) {
      // Adiciona as filiais do acesso especial (sem remover as já selecionadas)
      setForm((prev) => {
        const filiaisAtuais = new Set(prev.filiais);
        acesso.filiais.forEach((f) => filiaisAtuais.add(f));
        return { ...prev, filiais: Array.from(filiaisAtuais) };
      });
    }
  };

  const filiaisFiltradas = filiais.filter((f) =>
    f.PLANTA.toLowerCase().includes(buscaFilial.toLowerCase())
  );

  const dashboardsFiltrados = dashboards.filter((d) =>
    d.nome.toLowerCase().includes(buscaDashboard.toLowerCase())
  );

  const filtered = usuarios.filter(u => {
    const matchNome = u.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchEmail = u.email.toLowerCase().includes(filtroEmail.toLowerCase());
    const matchDepto = u.departamento.toLowerCase().includes(filtroDepartamento.toLowerCase());
    const matchStatus = filtroStatus === "Todos" || u.status === filtroStatus;
    return matchNome && matchEmail && matchDepto && matchStatus;
  });

  const totalPaginas = Math.ceil(filtered.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, filtered.length);
  const paginated = filtered.slice(inicio, fim);

  const openCreate = () => {
    setForm({ id: "", nome: "", email: "", departamento: "", acesso: "Usuário", status: "Ativo", filiais: [], dashboards: [] });
    setErros({});
    setSenhaEdicao("");
    setShowSenhaEdicao(false);
    setBuscaFilial("");
    setBuscaDashboard("");
    setAcessoEspecialSelecionado("");
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setForm({ ...u, id: u.id, dashboards: u.dashboards ?? [] });
    setErros({});
    setSenhaEdicao("");
    setShowSenhaEdicao(false);
    setBuscaFilial("");
    setBuscaDashboard("");
    setIsEdit(true);
    setModalOpen(true);
  };

  const validateForm = () => {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (!form.email.trim()) novosErros.email = "Email é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(form.email)) novosErros.email = "Email inválido";
    if (!form.departamento.trim()) novosErros.departamento = "Departamento é obrigatório";
    if (!isEdit && !senhaEdicao) novosErros.senhaEdicao = "Senha é obrigatória para novo usuário";
    if (senhaEdicao && senhaEdicao.length < 6) novosErros.senhaEdicao = "A senha deve ter pelo menos 6 caracteres";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (isEdit) {
        await updateUsuario(form.id, {
          nome: form.nome,
          email: form.email,
          departamento: form.departamento,
          acesso: form.acesso,
          status: form.status,
          filiais: form.filiais,
          dashboards: form.dashboards,
          ...(senhaEdicao ? { senha: senhaEdicao, must_change_password: false } : {}),
        });
        setFeedback({ type: "success", msg: "Usuário atualizado com sucesso!" });
      } else {
        await addUsuario({
          nome: form.nome,
          email: form.email,
          departamento: form.departamento,
          acesso: form.acesso,
          status: form.status,
          filiais: form.filiais,
          dashboards: form.dashboards,
          senha: senhaEdicao || "1234",
        });
        setFeedback({ type: "success", msg: "Usuário criado com sucesso!" });
      }
      setModalOpen(false);
    } catch {
      setFeedback({ type: "error", msg: "Erro ao salvar. Verifique sua conexão." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const usuario = usuarios.find(u => u.id === id);
    if (!confirm(`Tem certeza que deseja excluir o usuário "${usuario?.nome}"? Esta ação não pode ser desfeita.`)) return;
    
    setDeleting(id);
    try {
      await deleteUsuario(id);
      setFeedback({ type: "success", msg: "Usuário excluído com sucesso!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir usuário.";
      setFeedback({ type: "error", msg });
    } finally {
      setDeleting(null);
    }
  };

  // Abrir modal de redefinir senha
  const openResetPassword = (u: Usuario) => {
    setResettingUser({ id: u.id, nome: u.nome });
    setNovaSenha("");
    setConfirmarSenha("");
    setSenhaError("");
    setResetPasswordModalOpen(true);
  };

  // Redefinir senha
  const handleResetPassword = async () => {
    setSenhaError("");
    
    // Validações
    if (!novaSenha || novaSenha.length < 6) {
      setSenhaError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaError("As senhas não coincidem");
      return;
    }

    if (!resettingUser) return;
    
    setResettingPassword(true);
    try {
      await updateUsuario(resettingUser.id, { 
        senha: novaSenha, 
        must_change_password: true 
      });
      setFeedback({ type: "success", msg: `Senha de "${resettingUser.nome}" redefinida com sucesso!` });
      setResetPasswordModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao redefinir senha.";
      setSenhaError(msg);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleReativar = async (u: Usuario) => {
    try {
      await updateUsuario(u.id, { status: "Ativo" });
      setFeedback({ type: "success", msg: "Usuário reativado com sucesso!" });
    } catch {
      setFeedback({ type: "error", msg: "Erro ao reativar usuário." });
    }
  };


  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Usuários">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[#4B5FBF]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Usuários" subtitle="Gerencie os usuários e permissões de acesso">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#4B5FBF] font-bold text-2xl tracking-tight">Usuários</h2>
            <p className="text-[#6C757D] text-sm mt-0.5">Gerencie os usuários e permissões de acesso</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#28A745] hover:bg-[#218838] text-white text-sm font-semibold rounded-full transition-colors shadow-md">
            <Plus size={16} /> Novo Usuário
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full mb-6 text-sm font-medium border ${
            feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input type="text" value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} placeholder="Filtrar por Nome"
              className="flex-1 min-w-[200px] px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all" />
            <input type="text" value={filtroEmail} onChange={(e) => setFiltroEmail(e.target.value)} placeholder="Filtrar por Email"
              className="flex-1 min-w-[200px] px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all" />
            <input type="text" value={filtroDepartamento} onChange={(e) => setFiltroDepartamento(e.target.value)} placeholder="Filtrar por Departamento"
              className="flex-1 min-w-[200px] px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all" />
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "Todos" | "Ativo" | "Excluído")}
              className="px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all appearance-none cursor-pointer">
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Excluído">Excluído</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F4F8]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Departamento</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Filiais</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Dashboards</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Acesso</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {!isLoaded ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center"><Loader2 size={24} className="animate-spin text-[#4B5FBF] mx-auto" /></td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-[#6C757D]">Nenhum usuário encontrado</td></tr>
                ) : (
                  paginated.map((u, idx) => (
                    <tr key={u.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[#333333]">{u.nome}</td>
                      <td className="px-5 py-4 text-sm text-[#6C757D]">{u.email}</td>
                      <td className="px-5 py-4 text-sm text-[#6C757D]">{u.departamento}</td>
                      <td className="px-5 py-4 text-sm">
                        {u.filiais?.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="text-[#4B5FBF]" />
                            <span className="font-medium text-[#4B5FBF]">{u.filiais.length}</span>
                            <span className="text-[#6C757D]">filial{u.filiais.length !== 1 ? "is" : ""}</span>
                          </span>
                        ) : (
                          <span className="text-[#cbd5e1]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {u.dashboards?.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <LayoutDashboard size={13} className="text-[#28A745]" />
                            <span className="font-medium text-[#28A745]">{u.dashboards.length}</span>
                            <span className="text-[#6C757D]">dashboard{u.dashboards.length !== 1 ? "s" : ""}</span>
                          </span>
                        ) : (
                          <span className="text-[#cbd5e1]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="px-3 py-1 bg-[#4B5FBF]/10 text-[#4B5FBF] rounded-full text-xs font-medium">{u.acesso}</span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.status === "Ativo" ? "bg-[#28A745]/10 text-[#28A745]" : "bg-[#6C757D]/10 text-[#6C757D]"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(u)}
                            title="Editar"
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#4B5FBF]/10 transition-colors">
                            <Pencil size={15} className="text-[#4B5FBF]" />
                          </button>
                          <button onClick={() => openResetPassword(u)}
                            title="Redefinir senha"
                            disabled={deleting === u.id}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-amber-50 transition-colors disabled:opacity-50">
                            <KeyRound size={15} className="text-amber-500" />
                          </button>
                          {u.status === "Excluído" && (
                            <button onClick={() => handleReativar(u)}
                              title="Reativar"
                              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#28A745]/10 transition-colors">
                              <RotateCcw size={15} className="text-[#28A745]" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(u.id)}
                            title="Excluir"
                            disabled={deleting === u.id}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deleting === u.id ? (
                              <Loader2 size={15} className="text-red-500 animate-spin" />
                            ) : (
                              <Trash2 size={15} className="text-red-500" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {isLoaded && filtered.length > itensPorPagina && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6C757D]">Mostrar</span>
                <select value={itensPorPagina} onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                  className="px-3 py-1.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all">
                  <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                </select>
                <span className="text-sm text-[#6C757D]">Mostrando {inicio + 1} até {fim} de {filtered.length} itens</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaginaAtual(1)} disabled={paginaAtual === 1} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[#6C757D] hover:bg-[#F0F4F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={16} /></button>
                <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[#6C757D] hover:bg-[#F0F4F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                <span className="px-3 py-1.5 bg-[#4B5FBF] text-white text-sm font-semibold rounded-full">{paginaAtual}</span>
                <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[#6C757D] hover:bg-[#F0F4F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                <button onClick={() => setPaginaAtual(totalPaginas)} disabled={paginaAtual === totalPaginas} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[#6C757D] hover:bg-[#F0F4F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[#6C757D] text-xs mt-8">Kore Data - Conectamos dados para Gerar Resultados</p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#e2e8f0] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-shrink-0">
              <h3 className="text-[#4B5FBF] font-bold text-lg">{isEdit ? "Editar Usuário" : "Novo Usuário"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[#6C757D] hover:bg-[#F0F4F8] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nome Completo *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.nome ? "border-red-500" : "border-transparent"}`}
                  placeholder="Digite o nome completo" />
                {erros.nome && <p className="text-red-500 text-xs mt-1 ml-3">{erros.nome}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.email ? "border-red-500" : "border-transparent"}`}
                  placeholder="usuario@viagroup.com.br" />
                {erros.email && <p className="text-red-500 text-xs mt-1 ml-3">{erros.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Departamento *</label>
                <input type="text" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.departamento ? "border-red-500" : "border-transparent"}`}
                  placeholder="ex: TI, RH, Frota" />
                {erros.departamento && <p className="text-red-500 text-xs mt-1 ml-3">{erros.departamento}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nível de Acesso *</label>
                  <select value={form.acesso} onChange={(e) => setForm({ ...form, acesso: e.target.value as Usuario["acesso"] })}
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all appearance-none">
                    <option value="Usuário">Usuário</option>
                    <option value="Administrador do Locatário">Administrador do Locatário</option>
                  </select>
                </div>
                {isEdit && (
                  <div>
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Usuario["status"] })}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all appearance-none">
                      <option value="Ativo">Ativo</option>
                      <option value="Excluído">Excluído</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Senha (apenas criação) ou Nova Senha (edição) */}
              {!isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Senha Inicial *</label>
                  <div className="relative">
                    <input
                      type={showSenhaEdicao ? "text" : "password"}
                      value={senhaEdicao}
                      onChange={(e) => setSenhaEdicao(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12 ${erros.senhaEdicao ? "border-red-500" : "border-transparent"}`}
                    />
                    <button type="button" onClick={() => setShowSenhaEdicao(!showSenhaEdicao)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors">
                      {showSenhaEdicao ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {erros.senhaEdicao && <p className="text-red-500 text-xs mt-1 ml-3">{erros.senhaEdicao}</p>}
                  <p className="text-xs text-[#94a3b8] mt-1 ml-3">O usuário deverá trocar esta senha no primeiro login</p>
                </div>
              )}

              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">
                    Nova Senha <span className="text-[#94a3b8] font-normal">(deixe em branco para não alterar)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSenhaEdicao ? "text" : "password"}
                      value={senhaEdicao}
                      onChange={(e) => setSenhaEdicao(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12 ${erros.senhaEdicao ? "border-red-500" : "border-transparent"}`}
                    />
                    <button type="button" onClick={() => setShowSenhaEdicao(!showSenhaEdicao)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors">
                      {showSenhaEdicao ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {erros.senhaEdicao && <p className="text-red-500 text-xs mt-1 ml-3">{erros.senhaEdicao}</p>}
                </div>
              )}

              {/* Filiais (apenas para não-admins) */}
              {form.acesso !== "Administrador do Locatário" && (
                <div>
                  {/* Acesso Especial */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Acesso Especial</label>
                    <select
                      value={acessoEspecialSelecionado}
                      onChange={(e) => aplicarAcessoEspecial(e.target.value)}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all appearance-none"
                    >
                      <option value="">Selecione um acesso especial (opcional)</option>
                      {acessosEspeciais
                        .filter((a) => a.status === "Ativo")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome} {a.filiais?.length > 0 && `(${a.filiais.length} filiais)`}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-[#94a3b8] mt-1 ml-1">
                      Selecione um acesso para pré-selecionar filiais automaticamente
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#6C757D]">Filiais</label>
                    {form.filiais.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 bg-[#4B5FBF]/10 text-[#4B5FBF] rounded-full text-xs font-semibold">
                        <Building2 size={11} />
                        {form.filiais.length} selecionada{form.filiais.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="border border-[#e2e8f0] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e2e8f0] bg-[#F8FAFC]">
                      <Search size={14} className="text-[#94a3b8] flex-shrink-0" />
                      <input type="text" value={buscaFilial} onChange={(e) => setBuscaFilial(e.target.value)}
                        placeholder="Buscar filial..." className="flex-1 bg-transparent text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none" />
                      {buscaFilial && (
                        <button onClick={() => setBuscaFilial("")} className="text-[#94a3b8] hover:text-[#6C757D]"><X size={13} /></button>
                      )}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                      {loadingFiliais ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 size={20} className="animate-spin text-[#4B5FBF]" />
                        </div>
                      ) : filiaisFiltradas.length === 0 ? (
                        <p className="text-center text-[#94a3b8] text-sm py-6">Nenhuma filial encontrada</p>
                      ) : (
                        filiaisFiltradas.map((f) => {
                          const checked = form.filiais.includes(f.PLANTA);
                          return (
                            <label key={f.PLANTA}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[#F0F4F8] ${checked ? "bg-[#4B5FBF]/5" : ""}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleFilial(f.PLANTA)}
                                className="w-4 h-4 rounded border-[#cbd5e1] text-[#4B5FBF] focus:ring-[#4B5FBF] cursor-pointer flex-shrink-0" />
                              <span className={`text-sm leading-tight ${checked ? "text-[#4B5FBF] font-medium" : "text-[#333333]"}`}>
                                {f.PLANTA}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {form.filiais.length > 0 && !buscaFilial && (
                      <div className="border-t border-[#e2e8f0] px-4 py-2 bg-[#F8FAFC]">
                        <button onClick={() => setForm({ ...form, filiais: [] })}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                          Limpar seleção
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1 ml-1">Administradores têm acesso a todas as filiais automaticamente</p>
                </div>
              )}

              {/* Dashboards (apenas para não-admins) */}
              {form.acesso !== "Administrador do Locatário" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#6C757D]">Dashboards</label>
                    {form.dashboards.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 bg-[#28A745]/10 text-[#28A745] rounded-full text-xs font-semibold">
                        <LayoutDashboard size={11} />
                        {form.dashboards.length} selecionado{form.dashboards.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="border border-[#e2e8f0] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e2e8f0] bg-[#F8FAFC]">
                      <Search size={14} className="text-[#94a3b8] flex-shrink-0" />
                      <input type="text" value={buscaDashboard} onChange={(e) => setBuscaDashboard(e.target.value)}
                        placeholder="Buscar dashboard..." className="flex-1 bg-transparent text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none" />
                      {buscaDashboard && (
                        <button onClick={() => setBuscaDashboard("")} className="text-[#94a3b8] hover:text-[#6C757D]"><X size={13} /></button>
                      )}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: 180 }}>
                      {dashboardsFiltrados.length === 0 ? (
                        <p className="text-center text-[#94a3b8] text-sm py-6">Nenhum dashboard encontrado</p>
                      ) : (
                        dashboardsFiltrados.map((d) => {
                          const checked = form.dashboards.includes(d.id);
                          return (
                            <label key={d.id}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[#F0F4F8] ${checked ? "bg-[#28A745]/5" : ""}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleDashboard(d.id)}
                                className="w-4 h-4 rounded border-[#cbd5e1] text-[#28A745] focus:ring-[#28A745] cursor-pointer flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm leading-tight ${checked ? "text-[#28A745] font-medium" : "text-[#333333]"}`}>
                                  {d.nome}
                                </span>
                                {d.setor && (
                                  <span className="text-xs text-[#94a3b8] leading-tight">{d.setor}</span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {form.dashboards.length > 0 && !buscaDashboard && (
                      <div className="border-t border-[#e2e8f0] px-4 py-2 bg-[#F8FAFC]">
                        <button onClick={() => setForm({ ...form, dashboards: [] })}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                          Limpar seleção
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1 ml-1">Administradores têm acesso a todos os dashboards automaticamente</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F8FAFC] flex items-center justify-end gap-3 flex-shrink-0 border-t border-[#e2e8f0]">
              <button onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 border border-[#6C757D] text-[#6C757D] text-sm font-semibold rounded-full hover:bg-[#F0F4F8] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#4B5FBF] hover:bg-[#4040B0] text-white text-sm font-semibold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Redefinir Senha */}
      {resetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#e2e8f0] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <KeyRound size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[#4B5FBF] font-bold text-lg">Redefinir Senha</h3>
                  <p className="text-xs text-[#6C757D]">{resettingUser?.nome}</p>
                </div>
              </div>
              <button onClick={() => setResetPasswordModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[#6C757D] hover:bg-[#F0F4F8] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong className="font-semibold">Importante:</strong> O usuário será obrigado a trocar a senha no próximo login.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nova Senha *</label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12"
                  />
                  <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors">
                    {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Confirmar Senha *</label>
                <div className="relative">
                  <input
                    type={showConfirmarSenha ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all pr-12"
                  />
                  <button type="button" onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4B5FBF] transition-colors">
                    {showConfirmarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {senhaError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-full">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{senhaError}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F8FAFC] flex items-center justify-end gap-3 border-t border-[#e2e8f0]">
              <button onClick={() => setResetPasswordModalOpen(false)}
                className="px-6 py-2.5 border border-[#6C757D] text-[#6C757D] text-sm font-semibold rounded-full hover:bg-[#F0F4F8] transition-colors">
                Cancelar
              </button>
              <button onClick={handleResetPassword} disabled={resettingPassword}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#4B5FBF] hover:bg-[#4040B0] text-white text-sm font-semibold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {resettingPassword ? (
                  <><Loader2 size={14} className="animate-spin" />Redefinindo...</>
                ) : (
                  <><KeyRound size={14} />Redefinir Senha</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
