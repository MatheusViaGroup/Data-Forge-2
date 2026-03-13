"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  LayoutGrid, Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, MoreVertical,
} from "lucide-react";
import { useDataStoreContext, Dashboard } from "@/contexts/DataStoreContext";

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
    id: "", nome: "", descricao: "", workspaceId: "", reportId: "", datasetId: "", ativo: true, rls: false, status: "Ativo", setor: "",
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
    setForm({ id: "", nome: "", descricao: "", workspaceId: "", reportId: "", datasetId: "", ativo: true, rls: false, status: "Ativo", setor: "" });
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
          descricao: form.descricao || undefined,
          workspaceId: form.workspaceId,
          reportId: form.reportId,
          datasetId: form.datasetId || undefined,
          ativo: form.ativo,
          rls: form.rls,
          status: form.status,
          setor: form.setor || undefined,
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
    setMenuPosition({
      top: rect.bottom + window.scrollY + 4,
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
          <Loader2 size={28} className="animate-spin text-[#4B5FBF]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Lista de Dashboards" subtitle="Gerencie os dashboards do sistema">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#4B5FBF] font-bold text-2xl tracking-tight">Dashboards</h2>
            <p className="text-[#6C757D] text-sm mt-0.5">{dashboards.length} dashboards cadastrados</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#28A745] hover:bg-[#218838] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
          >
            <Plus size={16} /> Novo Dashboard
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
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Pesquisar por Nome"
              className="flex-1 min-w-[300px] px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F4F8]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Descrição</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">RLS</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[#4B5FBF] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#6C757D]">
                      Nenhum dashboard encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((d, idx) => (
                    <tr key={d.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[#333333]">{d.nome}</td>
                      <td className="px-5 py-4 text-sm text-[#6C757D]">{d.descricao}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={d.rls ? "text-[#4B5FBF] font-medium" : "text-[#6C757D]"}>
                          {d.rls ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#28A745]/10 text-[#28A745]">
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => toggleMenu(d.id, e)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F0F4F8] transition-colors"
                          >
                            <MoreVertical size={16} className="text-[#6C757D]" />
                          </button>

                          {menuOpenId === d.id && (
                            <div
                              className="fixed bg-white rounded-xl shadow-2xl border border-[#e2e8f0] z-[9999] overflow-hidden w-40"
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                            >
                              <button
                                onClick={() => { setMenuOpenId(null); openEdit(d); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#333333] hover:bg-[#F0F4F8] transition-colors text-left"
                              >
                                <Pencil size={14} className="text-[#4B5FBF]" /> Editar
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
        <p className="text-center text-[#6C757D] text-xs mt-8">
          Via Labs
        </p>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#e2e8f0] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
              <h3 className="text-[#4B5FBF] font-bold text-lg">{isEdit ? "Editar Dashboard" : "Novo Dashboard"}</h3>
              <button onClick={() => setModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-full text-[#6C757D] hover:bg-[#F0F4F8] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nome *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                    placeholder="ex: Custo Por KM"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Descrição</label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                    placeholder="Descrição do dashboard"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Setor</label>
                  <input
                    type="text"
                    value={form.setor}
                    onChange={(e) => setForm({ ...form, setor: e.target.value })}
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                    placeholder="ex: Frota, RH"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all appearance-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[#e2e8f0] pt-4">
                <p className="text-xs font-semibold text-[#6C757D] mb-3">Dados de Segurança</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Workspace ID *</label>
                    <input
                      type="text"
                      value={form.workspaceId}
                      onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] font-mono focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Report ID *</label>
                    <input
                      type="text"
                      value={form.reportId}
                      onChange={(e) => setForm({ ...form, reportId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] font-mono focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Dataset ID</label>
                    <input
                      type="text"
                      value={form.datasetId}
                      onChange={(e) => setForm({ ...form, datasetId: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] font-mono focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
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
                    className="w-4 h-4 rounded border-[#e2e8f0] text-[#4B5FBF] focus:ring-[#4B5FBF]"
                  />
                  <label htmlFor="rls" className="text-sm text-[#333333] font-medium">
                    Possui RLS (Row Level Security) por Filiais
                  </label>
                </div>
                {form.rls && (
                  <div>
                    <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nome da Role RLS (conforme configurado no Power BI Desktop)</label>
                    <input
                      type="text"
                      value={form.rlsRole ?? ""}
                      onChange={(e) => setForm({ ...form, rlsRole: e.target.value })}
                      className="w-full px-5 py-2.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#333333] font-mono focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
                      placeholder="ex: FilialRole"
                    />
                    <p className="text-xs text-[#94a3b8] mt-1 pl-2">
                      O DAX da role deve usar <code className="bg-[#f1f5f9] px-1 rounded">CUSTOMDATA()</code> para filtrar por filial. Ex: <code className="bg-[#f1f5f9] px-1 rounded">FIND([PLANTA_ID], CUSTOMDATA(), 1, 0) &gt; 0</code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8FAFC] flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 border border-[#6C757D] text-[#6C757D] text-sm font-semibold rounded-full hover:bg-[#F0F4F8] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#4B5FBF] hover:bg-[#4040B0] text-white text-sm font-semibold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
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
