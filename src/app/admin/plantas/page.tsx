"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Building2,
} from "lucide-react";
import { ImportExportXlsx, ImportResult } from "@/components/ImportExportXlsx";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type Feedback = { type: "success" | "error"; msg: string } | null;

export default function PlantasPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [plantas, setPlantas] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Formulário
  const [formNome, setFormNome] = useState("");
  const [editNomeAtual, setEditNomeAtual] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  // Filtros
  const [filtroNome, setFiltroNome] = useState("");

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const { confirm, dialogProps } = useConfirmDialog();

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") loadPlantas();
  }, [authStatus]);

  const loadPlantas = async () => {
    setIsLoaded(false);
    try {
      const res = await fetch("/api/plantas");
      if (!res.ok) throw new Error("Erro ao buscar plantas");
      const data = (await res.json()) as { entries: string[] };
      setPlantas(data.entries ?? []);
    } catch {
      setPlantas([]);
    } finally {
      setIsLoaded(true);
    }
  };

  const filtered = plantas.filter((p) =>
    p.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const totalPaginas = Math.ceil(filtered.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, filtered.length);
  const paginated = filtered.slice(inicio, fim);

  const openCreate = () => {
    setFormNome("");
    setEditNomeAtual("");
    setErros({});
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (nome: string) => {
    setFormNome(nome);
    setEditNomeAtual(nome);
    setErros({});
    setIsEdit(true);
    setModalOpen(true);
  };

  const validateForm = () => {
    const novosErros: Record<string, string> = {};
    if (!formNome.trim()) novosErros.nome = "Nome da planta é obrigatório";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (isEdit) {
        const res = await fetch("/api/plantas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planta: editNomeAtual, novoNome: formNome.trim() }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar planta");
        setFeedback({ type: "success", msg: "Planta atualizada com sucesso!" });
      } else {
        const res = await fetch("/api/plantas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planta: formNome.trim() }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Erro ao criar planta");
        setFeedback({ type: "success", msg: "Planta criada com sucesso!" });
      }
      setModalOpen(false);
      await loadPlantas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar planta.";
      setFeedback({ type: "error", msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (nome: string) => {
    if (!await confirm({ title: "Excluir Planta", message: `Tem certeza que deseja excluir a planta "${nome}"?`, confirmLabel: "Excluir", variant: "danger" })) return;
    setDeleting(nome);
    try {
      const res = await fetch(`/api/plantas?planta=${encodeURIComponent(nome)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir planta");
      setFeedback({ type: "success", msg: "Planta excluída com sucesso!" });
      await loadPlantas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir planta.";
      setFeedback({ type: "error", msg });
    } finally {
      setDeleting(null);
    }
  };

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Plantas">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Plantas" subtitle="Gerencie as plantas cadastradas no sistema">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[var(--brand-primary)] font-bold text-2xl tracking-tight">Plantas</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">Gerencie as plantas cadastradas no sistema</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ImportExportXlsx
              nomeTemplate="template_plantas"
              cols={[
                { key: "planta", header: "planta", instrucao: "Nome da planta (único)", exemplo: "VP - Matriz" },
              ]}
              onImport={async (rows): Promise<ImportResult> => {
                let success = 0;
                const errors: string[] = [];
                for (const row of rows) {
                  if (!row.planta) {
                    errors.push(`Linha ignorada: nome da planta é obrigatório.`);
                    continue;
                  }
                  try {
                    const res = await fetch("/api/plantas", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ planta: row.planta.trim() }),
                    });
                    if (!res.ok) {
                      const json = (await res.json()) as { error?: string };
                      throw new Error(json.error ?? "Erro");
                    }
                    success++;
                  } catch (e) {
                    errors.push(`Erro ao criar "${row.planta}": ${e instanceof Error ? e.message : String(e)}`);
                  }
                }
                if (success > 0) await loadPlantas();
                return { success, errors };
              }}
            />
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold rounded-full transition-colors shadow-md">
              <Plus size={16} /> Nova Planta
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
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input type="text" value={filtroNome} onChange={(e) => { setFiltroNome(e.target.value); setPaginaAtual(1); }} placeholder="Filtrar por Nome"
              className="flex-1 min-w-[200px] px-5 py-2.5 bg-[var(--bg-input)] border-0 rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all" />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-input)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Nome da Planta</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {!isLoaded ? (
                  <tr><td colSpan={2} className="px-5 py-12 text-center"><Loader2 size={24} className="animate-spin text-[var(--brand-primary)] mx-auto" /></td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-12 text-center text-[var(--text-secondary)]">Nenhuma planta encontrada</td></tr>
                ) : (
                  paginated.map((nome, idx) => (
                    <tr key={nome} className={idx % 2 === 0 ? "bg-[var(--bg-panel)]" : "bg-[var(--bg-panel-soft)]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
                        <span className="flex items-center gap-2">
                          <Building2 size={14} className="text-[var(--brand-primary)]" />
                          {nome}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(nome)}
                            title="Editar"
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--brand-primary)]/10 transition-colors">
                            <Pencil size={15} className="text-[var(--brand-primary)]" />
                          </button>
                          <button onClick={() => handleDelete(nome)}
                            title="Excluir"
                            disabled={deleting === nome}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deleting === nome ? (
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
                <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">Mostrando {inicio + 1} até {fim} de {filtered.length} itens</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaginaAtual(1)} disabled={paginaAtual === 1} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={16} /></button>
                <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                <span className="px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-full">{paginaAtual}</span>
                <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                <button onClick={() => setPaginaAtual(totalPaginas)} disabled={paginaAtual === totalPaginas} className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e2e8f0] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[var(--text-secondary)] text-xs mt-8">Via Labs</p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-md border border-[#e2e8f0] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-shrink-0">
              <h3 className="text-[var(--brand-primary)] font-bold text-lg">{isEdit ? "Editar Planta" : "Nova Planta"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nome da Planta *</label>
                <input type="text" value={formNome} onChange={(e) => setFormNome(e.target.value)}
                  className={`w-full px-5 py-2.5 bg-[var(--bg-input)] border rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.nome ? "border-red-500" : "border-transparent"}`}
                  placeholder="Ex: VP - Matriz" />
                {erros.nome && <p className="text-red-500 text-xs mt-1 ml-3">{erros.nome}</p>}
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-panel-soft)] flex items-center justify-end gap-3 flex-shrink-0 border-t border-[#e2e8f0]">
              <button onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 border border-[var(--text-secondary)] text-[var(--text-secondary)] text-sm font-semibold rounded-full hover:bg-[var(--bg-input)] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </AppShell>
  );
}