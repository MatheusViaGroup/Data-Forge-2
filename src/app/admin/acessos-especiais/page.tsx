"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, Search, Building2, MoreVertical,
} from "lucide-react";
import { useDataStoreContext, AcessoEspecial } from "@/contexts/DataStoreContext";
import { ImportExportXlsx, ImportResult } from "@/components/ImportExportXlsx";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface Filial {
  PLANTA_ID: string;
  PLANTA: string;
}

type Feedback = { type: "success" | "error"; msg: string } | null;

export default function AcessosEspeciaisPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { acessosEspeciais, isLoaded, loadAdminData, addAcessoEspecial, updateAcessoEspecial, deleteAcessoEspecial } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Filiais
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loadingFiliais, setLoadingFiliais] = useState(false);
  const [buscaFilial, setBuscaFilial] = useState("");

  // Filtros
  const [filtroNome, setFiltroNome] = useState("");

  // FormulÃ¡rio
  const [form, setForm] = useState<Omit<AcessoEspecial, "id"> & { id: string }>({
    id: "", nome: "", descricao: "", filiais: [], status: "Ativo",
  });

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  // Carrega filiais quando abre o modal (uma vez sÃ³)
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

  // Carrega dados admin quando a pÃ¡gina monta
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

  const filiaisFiltradas = filiais.filter((f) =>
    f.PLANTA.toLowerCase().includes(buscaFilial.toLowerCase())
  );

  const filtered = acessosEspeciais.filter(a => {
    const matchNome = a.nome.toLowerCase().includes(filtroNome.toLowerCase());
    return matchNome;
  });

  const openCreate = () => {
    setForm({ id: "", nome: "", descricao: "", filiais: [], status: "Ativo" });
    setBuscaFilial("");
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (a: AcessoEspecial) => {
    setForm({ ...a, id: a.id, filiais: a.filiais ?? [] });
    setBuscaFilial("");
    setIsEdit(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) {
      setFeedback({ type: "error", msg: "Nome Ã© obrigatÃ³rio." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      if (isEdit) {
        await updateAcessoEspecial(form.id, {
          nome: form.nome,
          descricao: form.descricao,
          filiais: form.filiais,
          status: form.status,
        });
        setFeedback({ type: "success", msg: "Acesso Especial atualizado com sucesso!" });
      } else {
        await addAcessoEspecial({
          nome: form.nome,
          descricao: form.descricao,
          filiais: form.filiais,
          status: form.status,
        });
        setFeedback({ type: "success", msg: "Acesso Especial criado com sucesso!" });
      }
      setModalOpen(false);
    } catch {
      setFeedback({ type: "error", msg: "Erro ao salvar. Verifique sua conexÃ£o." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const acesso = acessosEspeciais.find(a => a.id === id);
    if (!confirm(`Tem certeza que deseja excluir o acesso "${acesso?.nome}"?`)) return;

    setDeleting(id);
    try {
      await deleteAcessoEspecial(id);
      setFeedback({ type: "success", msg: "Acesso Especial excluÃ­do com sucesso!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir acesso especial.";
      setFeedback({ type: "error", msg });
    } finally {
      setDeleting(null);
    }
  };

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Acessos Especiais">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Acessos Especiais" subtitle="Gerencie perfis de acesso com filiais prÃ©-selecionadas">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[var(--brand-primary)] font-bold text-2xl tracking-tight">Acessos Especiais</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">{acessosEspeciais.length} acesso{acessosEspeciais.length !== 1 ? "s" : ""} cadastrado{acessosEspeciais.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ImportExportXlsx
              nomeTemplate="template_acessos_especiais"
              cols={[
                { key: "nome",      header: "nome",      instrucao: "Nome do acesso especial",                     exemplo: "Acesso Filial SP" },
                { key: "descricao", header: "descricao", instrucao: "DescriÃ§Ã£o (opcional)",                          exemplo: "Acesso para filiais de SÃ£o Paulo" },
                { key: "filiais",   header: "filiais",   instrucao: "CÃ³digos de filiais separados por vÃ­rgula",      exemplo: "AB01,AB02,AB03" },
                { key: "status",    header: "status",    instrucao: "Ativo ou Inativo",                              exemplo: "Ativo" },
              ]}
              onImport={async (rows): Promise<ImportResult> => {
                let success = 0;
                const errors: string[] = [];
                for (const row of rows) {
                  if (!row.nome) {
                    errors.push(`Linha ignorada: campo "nome" Ã© obrigatÃ³rio.`);
                    continue;
                  }
                  try {
                    await addAcessoEspecial({
                      nome: row.nome,
                      descricao: row.descricao || "",
                      filiais: row.filiais ? row.filiais.split(",").map(s => s.trim()).filter(Boolean) : [],
                      status: row.status === "Inativo" ? "Inativo" : "Ativo",
                    });
                    success++;
                  } catch (e) {
                    errors.push(`Erro ao criar "${row.nome}": ${e instanceof Error ? e.message : String(e)}`);
                  }
                }
                if (success > 0) loadAdminData();
                return { success, errors };
              }}
            />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--status-success)] hover:bg-[color-mix(in srgb, var(--status-success) 82%, black)] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
            >
              <Plus size={16} /> Novo Acesso
            </button>
          </div>
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
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[#e2e8f0] shadow-card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Pesquisar por Nome"
              className="flex-1 min-w-[300px] px-5 py-2.5 bg-[var(--bg-input)] border-0 rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[#e2e8f0] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-input)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">DescriÃ§Ã£o</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Filiais</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">AÃ§Ãµes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[var(--brand-primary)] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[var(--text-secondary)]">
                      Nenhum acesso especial encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((a, idx) => (
                    <tr key={a.id} className={idx % 2 === 0 ? "bg-white" : "bg-[var(--bg-panel-soft)]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{a.nome}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{a.descricao}</td>
                      <td className="px-5 py-4 text-sm">
                        {a.filiais?.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="text-[var(--brand-primary)]" />
                            <span className="font-medium text-[var(--brand-primary)]">{a.filiais.length}</span>
                            <span className="text-[var(--text-secondary)]">filial{a.filiais.length !== 1 ? "is" : ""}</span>
                          </span>
                        ) : (
                          <span className="text-[#cbd5e1]">â€”</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          a.status === "Ativo"
                            ? "bg-[var(--status-success)]/10 text-[var(--status-success)]"
                            : "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const menu = document.getElementById(`menu-${a.id}`);
                              if (menu) {
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const DROPDOWN_HEIGHT = 120;
                                const openAbove = spaceBelow < DROPDOWN_HEIGHT;
                                menu.style.top = openAbove
                                  ? `${rect.top + window.scrollY - DROPDOWN_HEIGHT - 4}px`
                                  : `${rect.bottom + window.scrollY + 4}px`;
                                menu.style.right = `${window.innerWidth - rect.right}px`;
                                menu.style.display = menu.style.display === "block" ? "none" : "block";
                              }
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bg-input)] transition-colors"
                          >
                            <MoreVertical size={16} className="text-[var(--text-secondary)]" />
                          </button>

                          <div
                            id={`menu-${a.id}`}
                            className="hidden fixed bg-white rounded-xl shadow-2xl border border-[#e2e8f0] z-[9999] overflow-hidden w-40"
                          >
                            <button
                              onClick={() => { openEdit(a); document.getElementById(`menu-${a.id}`)!.style.display = "none"; }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors text-left"
                            >
                              <Pencil size={14} className="text-[var(--brand-primary)]" /> Editar
                            </button>
                            <button
                              onClick={() => { handleDelete(a.id); document.getElementById(`menu-${a.id}`)!.style.display = "none"; }}
                              disabled={deleting === a.id}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            >
                              {deleting === a.id ? (
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RodapÃ© */}
        <p className="text-center text-[var(--text-secondary)] text-xs mt-8">
          Via Labs
        </p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[#e2e8f0] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-shrink-0">
              <h3 className="text-[var(--brand-primary)] font-bold text-lg">{isEdit ? "Editar Acesso Especial" : "Novo Acesso Especial"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                  placeholder="ex: Acesso Diretoria"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">DescriÃ§Ã£o</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                  placeholder="DescriÃ§Ã£o do acesso especial"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Status</label>
                <CustomSelect
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as "Ativo" | "Inativo" })}
                  options={[
                    { value: "Ativo", label: "Ativo" },
                    { value: "Inativo", label: "Inativo" },
                  ]}
                />
              </div>

              {/* Filiais */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Filiais</label>
                  {form.filiais.length > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-xs font-semibold">
                      <Building2 size={11} />
                      {form.filiais.length} selecionada{form.filiais.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="border border-[#e2e8f0] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e2e8f0] bg-[var(--bg-panel-soft)]">
                    <Search size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                    <input
                      type="text"
                      value={buscaFilial}
                      onChange={(e) => setBuscaFilial(e.target.value)}
                      placeholder="Buscar filial..."
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    />
                    {buscaFilial && (
                      <button onClick={() => setBuscaFilial("")} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    {loadingFiliais ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-[var(--brand-primary)]" />
                      </div>
                    ) : filiaisFiltradas.length === 0 ? (
                      <p className="text-center text-[var(--text-muted)] text-sm py-6">Nenhuma filial encontrada</p>
                    ) : (
                      filiaisFiltradas.map((f) => {
                        const checked = form.filiais.includes(f.PLANTA);
                        return (
                          <label
                            key={f.PLANTA}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-input)] ${
                              checked ? "bg-[var(--brand-primary)]/5" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFilial(f.PLANTA)}
                              className="w-4 h-4 rounded border-[#cbd5e1] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer flex-shrink-0"
                            />
                            <span className={`text-sm leading-tight ${
                              checked ? "text-[var(--brand-primary)] font-medium" : "text-[var(--text-primary)]"
                            }`}>
                              {f.PLANTA}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {form.filiais.length > 0 && !buscaFilial && (
                    <div className="border-t border-[#e2e8f0] px-4 py-2 bg-[var(--bg-panel-soft)]">
                      <button
                        onClick={() => setForm({ ...form, filiais: [] })}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Limpar seleÃ§Ã£o
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 ml-1">
                  Este acesso serÃ¡ usado para prÃ©-selecionar filiais na criaÃ§Ã£o de usuÃ¡rios
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-panel-soft)] flex items-center justify-end gap-3 flex-shrink-0 border-t border-[#e2e8f0]">
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
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                ) : (
                  <><Save size={14} /> Salvar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
