"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  KeyRound, Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, MoreVertical, Eye, EyeOff,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useDataStoreContext, Credencial } from "@/contexts/DataStoreContext";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";

type Feedback = { type: "success" | "error"; msg: string } | null;

export default function CredenciaisPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { credenciais, isLoaded, loadAdminData, addCredencial, updateCredencial, deleteCredencial } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Menu dropdown
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Carrega dados admin quando a página monta
  useEffect(() => {
    if (authStatus === "authenticated") {
      loadAdminData();
    }
  }, [authStatus]);

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Verifica se clicou fora de qualquer botão de menu
      if (!target.closest('button')) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Formulário
  const [form, setForm] = useState<Omit<Credencial, "id"> & { id: string }>({
    id: "",
    nome: "",
    tenantId: "",
    usuarioPowerBI: "",
    dataRegistro: "",
    dataExpiracao: "",
    status: "Ativo",
    tenant: "VIA GROUP",
    clientId: "",
    clientSecret: "",
    masterPassword: "",
  });

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  // Paginação
  const totalPaginas = Math.ceil(credenciais.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, credenciais.length);
  const paginated = credenciais.slice(inicio, fim);

  const openCreate = () => {
    setForm({
      id: "",
      nome: "",
      tenantId: "",
      usuarioPowerBI: "",
      dataRegistro: new Date().toLocaleDateString("pt-BR"),
      dataExpiracao: "",
      status: "Ativo",
      tenant: "VIA GROUP",
      clientId: "",
      clientSecret: "",
      masterPassword: "",
    });
    setShowSecret(false);
    setShowPass(false);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (c: Credencial) => {
    setForm({
      id: c.id,
      nome: c.nome,
      tenant: c.tenant,
      tenantId: c.tenantId,
      clientId: c.clientId,
      clientSecret: c.clientSecret,
      usuarioPowerBI: c.usuarioPowerBI,
      masterPassword: c.masterPassword,
      dataRegistro: c.dataRegistro,
      dataExpiracao: c.dataExpiracao,
      status: c.status,
    });
    setShowSecret(false);
    setShowPass(false);
    setIsEdit(true);
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const handleSave = async () => {
    if (!form.nome || !form.clientId || !form.tenantId || !form.usuarioPowerBI) {
      setFeedback({ type: "error", msg: "Nome, Client ID, Tenant ID e usuário são obrigatórios." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      if (isEdit) {
        await updateCredencial(form.id, {
          nome: form.nome,
          tenantId: form.tenantId,
          usuarioPowerBI: form.usuarioPowerBI,
          dataExpiracao: form.dataExpiracao,
          status: form.status,
          tenant: form.tenant,
          clientId: form.clientId,
          clientSecret: form.clientSecret,
          masterPassword: form.masterPassword,
        });
        setFeedback({ type: "success", msg: "Credencial atualizada com sucesso!" });
      } else {
        await addCredencial({
          nome: form.nome,
          tenantId: form.tenantId,
          usuarioPowerBI: form.usuarioPowerBI,
          dataRegistro: form.dataRegistro,
          dataExpiracao: form.dataExpiracao,
          status: form.status,
          tenant: form.tenant,
          clientId: form.clientId,
          clientSecret: form.clientSecret,
          masterPassword: form.masterPassword,
        });
        setFeedback({ type: "success", msg: "Credencial criada com sucesso!" });
      }
      setModalOpen(false);
    } catch {
      setFeedback({ type: "error", msg: "Erro ao salvar. Verifique sua conexão." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const credencial = credenciais.find(c => c.id === id);
    if (!confirm(`Tem certeza que deseja excluir a credencial "${credencial?.nome}"? Esta ação não pode ser desfeita.`)) return;

    setDeleting(id);
    try {
      await deleteCredencial(id);
      setFeedback({ type: "success", msg: "Credencial excluída com sucesso!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir credencial.";
      setFeedback({ type: "error", msg });
    } finally {
      setDeleting(null);
    }
  };

  const toggleMenu = (id: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const DROPDOWN_HEIGHT = 120;
    const openAbove = spaceBelow < DROPDOWN_HEIGHT;

    setMenuPosition({
      top: openAbove
        ? rect.top + window.scrollY - DROPDOWN_HEIGHT - 4
        : rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Credenciais">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Credenciais" subtitle="Gerencie as integrações com Power BI">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[var(--brand-primary)] font-bold text-2xl tracking-tight">Credenciais</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">{credenciais.length} credencial{credenciais.length !== 1 ? "is" : ""} cadastrada{credenciais.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
          >
            <Plus size={16} /> Novo Registro
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

        {/* Tabela */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-input)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Tenant ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Usuário Power BI</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Data de Registro</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Data de Expiração</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[var(--brand-primary)] mx-auto" />
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-[var(--text-secondary)]">
                      Nenhuma credencial encontrada
                    </td>
                  </tr>
                ) : (
                  paginated.map((c, idx) => (
                    <tr key={c.id} className={idx % 2 === 0 ? "bg-[var(--bg-panel)]" : "bg-[var(--bg-panel-soft)]"}>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{c.id}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{c.nome}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)] font-mono">{c.tenantId}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{c.usuarioPowerBI}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{c.dataRegistro}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{c.dataExpiracao}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === "Ativo"
                            ? "bg-[var(--status-success)]/10 text-[var(--status-success)]"
                            : "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="relative">
                          <button
                            onClick={(e) => toggleMenu(c.id, e)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bg-input)] transition-colors"
                          >
                            <MoreVertical size={16} className="text-[var(--text-secondary)]" />
                          </button>

                          {menuOpenId === c.id && (
                            <div 
                              className="fixed bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[#e2e8f0] z-[9999] overflow-hidden w-40"
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                            >
                              <button
                                onClick={() => openEdit(c)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors text-left"
                              >
                                <Pencil size={14} className="text-[var(--brand-primary)]" /> Editar
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={deleting === c.id}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                              >
                                {deleting === c.id ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" /> Excluindo...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={14} /> Excluir
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {isLoaded && credenciais.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-[var(--border-soft)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap shrink-0">Mostrar</span>
                <CustomSelect
                  value={String(itensPorPagina)}
                  onValueChange={(v) => { setItensPorPagina(Number(v)); setPaginaAtual(1); }}
                  options={[
                    { value: "5", label: "5" },
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                  ]}
                  className="w-[72px] min-w-[72px] shrink-0"
                />
                <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                  Mostrando {inicio + 1} até {fim} de {credenciais.length} itens
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaAtual(1)}
                  disabled={paginaAtual === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-full">
                  {paginaAtual}
                </span>

                <button
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setPaginaAtual(totalPaginas)}
                  disabled={paginaAtual === totalPaginas}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <p className="text-center text-[var(--text-secondary)] text-xs mt-8">
          Via Labs
        </p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[#e2e8f0] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] sticky top-0 bg-[var(--bg-panel)] z-10">
              <h3 className="text-[var(--brand-primary)] font-bold text-lg">{isEdit ? "Editar Credencial" : "Novo Registro"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Dados Básicos */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Dados Básicos</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nome *</label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="ex: Credencial Principal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Tenant</label>
                    <CustomSelect
                      value={form.tenant}
                      onValueChange={(v) => setForm({ ...form, tenant: v })}
                      options={[
                        { value: "VIA GROUP", label: "VIA GROUP" },
                        { value: "VIA LACTEOS", label: "VIA LACTEOS" },
                        { value: "VIA ALIMENTOS", label: "VIA ALIMENTOS" },
                        { value: "VIA LOGÍSTICA", label: "VIA LOGÍSTICA" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Data de Expiração</label>
                    <DatePicker
                      value={form.dataExpiracao}
                      onChange={(v) => setForm({ ...form, dataExpiracao: v })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Status</label>
                    <CustomSelect
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as any })}
                      options={[
                        { value: "Ativo", label: "Ativo" },
                        { value: "Inativo", label: "Inativo" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Azure AD */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Azure AD</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Client ID *</label>
                    <input
                      type="text"
                      value={form.clientId}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Tenant ID *</label>
                    <input
                      type="text"
                      value={form.tenantId}
                      onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Client Secret</label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={form.clientSecret}
                        onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                        className="w-full px-5 py-2.5 pr-12 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                        placeholder="Valor do client secret"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master User */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Master User</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Usuário Power BI *</label>
                    <input
                      type="email"
                      value={form.usuarioPowerBI}
                      onChange={(e) => setForm({ ...form, usuarioPowerBI: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="usuario@empresa.com.br"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Senha</label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.masterPassword}
                        onChange={(e) => setForm({ ...form, masterPassword: e.target.value })}
                        className="w-full px-5 py-2.5 pr-12 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                        placeholder="Senha do master user"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-panel-soft)] flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 border border-[var(--text-secondary)] text-[var(--text-secondary)] text-sm font-semibold rounded-full hover:bg-[var(--bg-input)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
