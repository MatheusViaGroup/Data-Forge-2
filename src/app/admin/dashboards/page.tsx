"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  LayoutGrid, Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, MoreVertical, Link2,
} from "lucide-react";
import { useDataStoreContext, Dashboard } from "@/contexts/DataStoreContext";
import { ImportExportXlsx, ImportResult } from "@/components/ImportExportXlsx";
import { CustomSelect } from "@/components/ui/CustomSelect";

type Feedback = { type: "success" | "error"; msg: string } | null;

export default function AdminDashboardsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { dashboards, isLoaded, loadAdminData, addDashboard, updateDashboard, deleteDashboard } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Menu dropdown
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Filtros
  const [filtroNome, setFiltroNome] = useState("");

  // Formulário
  const [form, setForm] = useState<Omit<Dashboard, "id"> & { id: string }>({
    id: "", nome: "", descricao: "", workspaceId: "", reportId: "", datasetId: "", ativo: true, rls: false, status: "Ativo", setor: "", urlCapa: "",
  });

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  // Filtrar dashboards
  const filtered = dashboards.filter(d => {
    const matchNome = d.nome.toLowerCase().includes(filtroNome.toLowerCase());
    return matchNome;
  });

  const openCreate = () => {
    setForm({ id: "", nome: "", descricao: "", workspaceId: "", reportId: "", datasetId: "", ativo: true, rls: false, status: "Ativo", setor: "", urlCapa: "" });
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (d: Dashboard) => {
    console.log("[EDIT] Abrindo edição para dashboard:", d);
    console.log("[EDIT] descricao:", d.descricao);
    console.log("[EDIT] setor:", d.setor);
    console.log("[EDIT] rls:", d.rls);
    console.log("[EDIT] rlsRole:", d.rlsRole);

    const novoForm = {
      id: d.id,
      nome: d.nome,
      descricao: d.descricao ?? "",
      workspaceId: d.workspaceId,
      reportId: d.reportId,
      datasetId: d.datasetId ?? "",
      ativo: d.ativo,
      rls: d.rls ?? false,
      status: d.status ?? "Ativo",
      setor: d.setor ?? "",
      prioridade: d.prioridade ?? "media",
      rlsRole: d.rlsRole ?? "",
      urlCapa: d.urlCapa ?? "",
    };

    console.log("[EDIT] Form preenchido:", novoForm);
    console.log("[EDIT] form.rls:", novoForm.rls);
    console.log("[EDIT] form.rlsRole:", novoForm.rlsRole);
    setForm(novoForm);
    setIsEdit(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.workspaceId || !form.reportId) {
      setFeedback({ type: "error", msg: "Nome, Workspace ID e Report ID são obrigatórios." });
      return;
    }

    console.log("[SAVE] Dados do formulário:", form);

    setSaving(true);
    setFeedback(null);

    try {
      if (isEdit) {
        console.log("[SAVE] Atualizando dashboard:", {
          id: form.id,
          nome: form.nome,
          descricao: form.descricao,
          setor: form.setor,
          workspaceId: form.workspaceId,
          reportId: form.reportId,
          datasetId: form.datasetId,
          ativo: form.ativo,
          rls: form.rls,
          status: form.status,
        });
        await updateDashboard(form.id, {
          nome: form.nome,
          descricao: form.descricao || undefined,
          workspaceId: form.workspaceId,
          reportId: form.reportId,
          datasetId: form.datasetId || undefined,
          ativo: form.ativo,
          rls: form.rls,
          status: form.status,
          setor: form.setor || undefined,
          urlCapa: form.urlCapa || undefined,
        });
        setFeedback({ type: "success", msg: "Dashboard atualizado com sucesso!" });
      } else {
        console.log("[SAVE] Criando dashboard:", {
          nome: form.nome,
          descricao: form.descricao,
          setor: form.setor,
          workspaceId: form.workspaceId,
          reportId: form.reportId,
          datasetId: form.datasetId,
          ativo: form.ativo,
          rls: form.rls,
          status: form.status,
        });
        await addDashboard({
          nome: form.nome,
          descricao: form.descricao ?? "",
          workspaceId: form.workspaceId,
          reportId: form.reportId,
          datasetId: form.datasetId ?? "",
          ativo: form.ativo,
          rls: form.rls,
          status: form.status,
          setor: form.setor ?? "",
          urlCapa: form.urlCapa ?? "",
        });
        setFeedback({ type: "success", msg: "Dashboard criado com sucesso!" });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar. Verifique sua conexão.";
      console.error("[SAVE] Erro:", err);
      setFeedback({ type: "error", msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este dashboard?")) return;

    setDeleting(id);
    try {
      await deleteDashboard(id);
      setFeedback({ type: "success", msg: "Dashboard excluído com sucesso!" });
    } catch {
      setFeedback({ type: "error", msg: "Erro ao excluir dashboard." });
    } finally {
      setDeleting(null);
    }
  };

  const toggleMenu = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('button')) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Dashboards">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Lista de Dashboards" subtitle="Gerencie os dashboards do sistema">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[var(--brand-primary)] font-bold text-2xl tracking-tight">Dashboards</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">{dashboards.length} dashboards cadastrados</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <ImportExportXlsx
              nomeTemplate="template_dashboards"
              cols={[
                { key: "nome",        header: "nome",        instrucao: "Nome do dashboard",                    exemplo: "Vendas Mensal" },
                { key: "descricao",   header: "descricao",   instrucao: "Descrição (opcional)",                  exemplo: "Relatório de vendas por mês" },
                { key: "workspaceId", header: "workspaceId", instrucao: "ID do Workspace Power BI",             exemplo: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { key: "reportId",    header: "reportId",    instrucao: "ID do Relatório Power BI",             exemplo: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { key: "datasetId",   header: "datasetId",   instrucao: "ID do Dataset Power BI (opcional)",    exemplo: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { key: "setor",       header: "setor",       instrucao: "Setor responsável (opcional)",          exemplo: "Comercial" },
                { key: "ativo",       header: "ativo",       instrucao: "TRUE ou FALSE",                        exemplo: "TRUE" },
                { key: "rls",         header: "rls",         instrucao: "TRUE se usa RLS, FALSE caso contrário", exemplo: "FALSE" },
                { key: "rlsRole",     header: "rlsRole",     instrucao: "Role do RLS (deixar vazio se não usa)", exemplo: "" },
                { key: "urlCapa",     header: "urlCapa",     instrucao: "URL da capa (SharePoint, opcional)",   exemplo: "" },
              ]}
              onImport={async (rows): Promise<ImportResult> => {
                let success = 0;
                const errors: string[] = [];
                for (const row of rows) {
                  if (!row.nome || !row.workspaceId || !row.reportId) {
                    errors.push(`Linha ignorada: nome, workspaceId e reportId são obrigatórios (nome: ${row.nome || "?"}).`);
                    continue;
                  }
                  try {
                    await addDashboard({
                      nome: row.nome,
                      descricao: row.descricao || "",
                      workspaceId: row.workspaceId,
                      reportId: row.reportId,
                      datasetId: row.datasetId || "",
                      setor: row.setor || "",
                      ativo: row.ativo?.toUpperCase() !== "FALSE",
                      rls: row.rls?.toUpperCase() === "TRUE",
                      rlsRole: row.rlsRole || "",
                      urlCapa: row.urlCapa || "",
                      status: "Ativo",
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
            >
              <Plus size={16} /> Novo Dashboard
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
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Pesquisar por Nome"
              className="w-full sm:min-w-[280px] sm:w-auto flex-1 px-5 py-2.5 bg-[var(--bg-input)] border-0 rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-soft)] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-input)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Descrição</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">RLS</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[var(--brand-primary)] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[var(--text-secondary)]">
                      Nenhum dashboard encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((d, idx) => (
                    <tr key={d.id} className={idx % 2 === 0 ? "bg-[var(--bg-panel)]" : "bg-[var(--bg-panel-soft)]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)] max-w-[200px] truncate">{d.nome}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)] max-w-[250px] truncate">{d.descricao}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={d.rls ? "text-[var(--brand-primary)] font-medium" : "text-[var(--text-secondary)]"}>
                          {d.rls ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--status-success)]/10 text-[var(--status-success)]">
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => toggleMenu(d.id, e)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bg-input)] transition-colors"
                          >
                            <MoreVertical size={16} className="text-[var(--text-secondary)]" />
                          </button>

                          {menuOpenId === d.id && (
                            <div
                              className="fixed bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-soft)] z-[9999] overflow-hidden w-40"
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                            >
                              <button
                                onClick={() => { setMenuOpenId(null); openEdit(d); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors text-left"
                              >
                                <Pencil size={14} className="text-[var(--brand-primary)]" /> Editar
                              </button>
                              <button
                                onClick={() => { setMenuOpenId(null); handleDelete(d.id); }}
                                disabled={deleting === d.id}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                              >
                                {deleting === d.id ? (
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

        {/* Rodapé */}
        <p className="text-center text-[var(--text-secondary)] text-xs mt-8">
          Via Labs
        </p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[var(--border-soft)] overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] flex-shrink-0">
              <h3 className="text-[var(--brand-primary)] font-bold text-lg">{isEdit ? "Editar Dashboard" : "Novo Dashboard"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nome *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                    placeholder="ex: Custo Por KM"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Descrição</label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                    placeholder="Descrição do dashboard"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Setor</label>
                  <input
                    type="text"
                    value={form.setor}
                    onChange={(e) => setForm({ ...form, setor: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                    placeholder="ex: Frota, RH"
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

              <div className="border-t border-[var(--border-soft)] pt-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">Dados de Segurança</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Workspace ID *</label>
                    <input
                      type="text"
                      value={form.workspaceId}
                      onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Report ID *</label>
                    <input
                      type="text"
                      value={form.reportId}
                      onChange={(e) => setForm({ ...form, reportId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Dataset ID</label>
                    <input
                      type="text"
                      value={form.datasetId}
                      onChange={(e) => setForm({ ...form, datasetId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              {/* URL Capa SharePoint */}
              <div className="border-t border-[var(--border-soft)] pt-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">Capa do Dashboard</p>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div
                    className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ width: 72, height: 72, background: "var(--bg-hover)", border: "1px solid var(--border-soft)" }}
                  >
                    {form.urlCapa ? (
                      <img
                        src={`/api/sp-image?url=${encodeURIComponent(form.urlCapa)}`}
                        alt="Capa"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Link2 size={22} style={{ color: "var(--text-subtle)" }} />
                    )}
                  </div>
                  {/* Campo URL */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.urlCapa ?? ""}
                      onChange={(e) => setForm({ ...form, urlCapa: e.target.value })}
                      placeholder="Cole o link compartilhado do SharePoint..."
                      className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 pl-1">
                      Cole o link de compartilhamento da imagem da pasta <strong>Fotos b&apos;i</strong> no SharePoint.
                    </p>
                    {form.urlCapa && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, urlCapa: "" }))}
                        className="mt-1 pl-1 text-xs text-red-500 hover:text-red-700"
                      >
                        Remover URL
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="rls"
                    checked={form.rls}
                    onChange={(e) => setForm({ ...form, rls: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-soft)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <label htmlFor="rls" className="text-sm text-[var(--text-primary)] font-medium">
                    Possui RLS?
                  </label>
                </div>
                {form.rls && (
                  <div>
                    <input
                      type="text"
                      value={form.rlsRole ?? ""}
                      onChange={(e) => setForm({ ...form, rlsRole: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[var(--bg-input)] border border-transparent rounded-full text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                      placeholder="Nome do Parametro"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1 pl-2">
                      O nome do parametro acima deve estar igual ao do B'i, a formalua que deve ser inserida no parametro é: <code className="bg-[#f1f5f9] px-1 rounded">CONTAINSSTRING(CUSTOMDATA(), [NOME_EXIBICAO])()</code>
                    </p>
                  </div>
                )}
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
                {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
