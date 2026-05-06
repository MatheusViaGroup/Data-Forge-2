"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  LayoutDashboard,
} from "lucide-react";
import { useDataStoreContext, Setor } from "@/contexts/DataStoreContext";
import { CustomMultiSelect } from "@/components/ui/CustomMultiSelect";

type Feedback = { type: "success" | "error"; msg: string } | null;

type SetorForm = {
  id: string;
  nome: string;
  dashboardIds: string[];
};

export default function AdminSetoresPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const {
    dashboards,
    setores,
    isLoaded,
    loadAdminData,
    addSetor,
    updateSetor,
    deleteSetor,
  } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [filtroNome, setFiltroNome] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [form, setForm] = useState<SetorForm>({ id: "", nome: "", dashboardIds: [] });

  const dashboardMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dashboard of dashboards) {
      map.set(dashboard.id, dashboard.nome);
    }
    return map;
  }, [dashboards]);

  const dashboardOptions = useMemo(
    () => dashboards.map((dashboard) => ({ value: dashboard.id, label: dashboard.nome })),
    [dashboards]
  );

  const filtered = useMemo(
    () => setores.filter((setor) => setor.nome.toLowerCase().includes(filtroNome.toLowerCase())),
    [setores, filtroNome]
  );

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [authStatus, router, session?.user?.role]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "admin") {
      void loadAdminData();
    }
  }, [authStatus, session?.user?.role, loadAdminData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("button")) {
        setMenuOpenId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreate = () => {
    setForm({ id: "", nome: "", dashboardIds: [] });
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (setor: Setor) => {
    setForm({
      id: setor.id,
      nome: setor.nome,
      dashboardIds: setor.dashboardIds ?? [],
    });
    setIsEdit(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setFeedback({ type: "error", msg: "Nome do setor é obrigatório." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      if (isEdit) {
        await updateSetor(form.id, {
          nome: form.nome.trim(),
          dashboardIds: form.dashboardIds,
        });
        setFeedback({ type: "success", msg: "Setor atualizado com sucesso!" });
      } else {
        await addSetor({
          nome: form.nome.trim(),
          dashboardIds: form.dashboardIds,
        });
        setFeedback({ type: "success", msg: "Setor criado com sucesso!" });
      }

      await loadAdminData();
      setModalOpen(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar setor.";
      setFeedback({ type: "error", msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este setor? Os usuários vinculados perderão o vínculo de setor.")) return;

    setDeleting(id);
    try {
      await deleteSetor(id);
      await loadAdminData();
      setFeedback({ type: "success", msg: "Setor excluído com sucesso!" });
    } catch {
      setFeedback({ type: "error", msg: "Erro ao excluir setor." });
    } finally {
      setDeleting(null);
    }
  };

  const toggleMenu = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 120;
    const openAbove = spaceBelow < dropdownHeight;

    setMenuPosition({
      top: openAbove
        ? rect.top + window.scrollY - dropdownHeight - 4
        : rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const formatDashboardNames = (ids: string[]) => {
    const names = ids
      .map((dashboardId) => dashboardMap.get(dashboardId))
      .filter((name): name is string => typeof name === "string");

    if (names.length === 0) return "Sem dashboards vinculados";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Setores">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Setores" subtitle="Gerencie setores e vínculos de dashboards">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[var(--brand-primary)] font-bold text-2xl tracking-tight">Setores</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">{setores.length} setores cadastrados</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
          >
            <Plus size={16} /> Novo Setor
          </button>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-full mb-6 text-sm font-medium border ${
              feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Pesquisar por Nome"
              className="w-full sm:min-w-[280px] sm:w-auto flex-1 px-5 py-2.5 bg-[var(--bg-input)] border-0 rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
            />
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-input)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Dashboards</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Vínculos</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[var(--brand-primary)] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-[var(--text-secondary)]">
                      Nenhum setor encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((setor, idx) => (
                    <tr key={setor.id} className={idx % 2 === 0 ? "bg-[var(--bg-panel)]" : "bg-[var(--bg-panel-soft)]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{setor.nome}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)] max-w-[280px] truncate">
                        {formatDashboardNames(setor.dashboardIds ?? [])}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="flex items-center gap-1 text-[var(--brand-primary)] font-medium">
                          <LayoutDashboard size={13} />
                          {(setor.dashboardIds ?? []).length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(event) => toggleMenu(setor.id, event)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bg-input)] transition-colors"
                          >
                            <MoreVertical size={16} className="text-[var(--text-secondary)]" />
                          </button>

                          {menuOpenId === setor.id && (
                            <div
                              className="fixed bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-soft)] z-[9999] overflow-hidden w-40"
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                            >
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  openEdit(setor);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors text-left"
                              >
                                <Pencil size={14} className="text-[var(--brand-primary)]" /> Editar
                              </button>
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  void handleDelete(setor.id);
                                }}
                                disabled={deleting === setor.id}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                              >
                                {deleting === setor.id ? (
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
        </div>

        <p className="text-center text-[var(--text-secondary)] text-xs mt-8">Via Labs</p>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[var(--border-soft)] overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] flex-shrink-0">
              <h3 className="text-[var(--brand-primary)] font-bold text-lg">{isEdit ? "Editar Setor" : "Novo Setor"}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                  placeholder="ex: Operações"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Dashboards Vinculados</label>
                <CustomMultiSelect
                  values={form.dashboardIds}
                  onChange={(dashboardIds) => setForm((prev) => ({ ...prev, dashboardIds }))}
                  options={dashboardOptions}
                  placeholder="Selecione os dashboards deste setor"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">
                  Você pode vincular dashboards sem setor nesta tela, a qualquer momento.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-panel-soft)] flex items-center justify-end gap-3 flex-shrink-0">
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
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
