"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus, Pencil, Trash2, Loader2, X, Save,
  CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";
import { useDataStoreContext, ParametroRLS } from "@/contexts/DataStoreContext";
import { ImportExportXlsx, ImportResult } from "@/components/ImportExportXlsx";
import { CustomSelect } from "@/components/ui/CustomSelect";

type Feedback = { type: "success" | "error"; msg: string } | null;

const TIPOS = ["Filial", "Usuário", "Departamento", "Personalizado"];

const emptyForm = (): Omit<ParametroRLS, "id"> & { id: string } => ({
  id: "",
  nome: "",
  nomeParametroPowerBI: "",
  tipo: "Filial",
  dashboardId: "",
  tenant: "",
});

export default function ParametrosRLSPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const {
    parametrosRLS,
    dashboards,
    credenciais,
    isLoaded,
    loadAdminData,
    addParametroRLS,
    updateParametroRLS,
    deleteParametroRLS,
  } = useDataStoreContext();

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [filtroNome, setFiltroNome] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [erros, setErros] = useState<Record<string, string>>({});

  // Carrega dados admin quando a página monta
  useEffect(() => {
    if (authStatus === "authenticated") {
      loadAdminData();
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "admin") router.push("/dashboard");
  }, [session, authStatus, router]);

  const filtered = parametrosRLS.filter((p) =>
    p.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
    p.nomeParametroPowerBI.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const openCreate = () => {
    setForm(emptyForm());
    setErros({});
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (p: ParametroRLS) => {
    setForm({ ...p });
    setErros({});
    setIsEdit(true);
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório";
    if (!form.nomeParametroPowerBI.trim()) e.nomeParametroPowerBI = "Nome do parâmetro no Power BI é obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        nome: form.nome,
        nomeParametroPowerBI: form.nomeParametroPowerBI,
        tipo: form.tipo,
        dashboardId: form.dashboardId,
        tenant: form.tenant,
      };
      if (isEdit) {
        await updateParametroRLS(form.id, payload);
        setFeedback({ type: "success", msg: "Parâmetro atualizado com sucesso!" });
      } else {
        await addParametroRLS(payload);
        setFeedback({ type: "success", msg: "Parâmetro criado com sucesso!" });
      }
      setModalOpen(false);
    } catch {
      setFeedback({ type: "error", msg: "Erro ao salvar. Verifique sua conexão." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este parâmetro RLS?")) return;
    try {
      await deleteParametroRLS(id);
      setFeedback({ type: "success", msg: "Parâmetro excluído com sucesso!" });
    } catch {
      setFeedback({ type: "error", msg: "Erro ao excluir parâmetro." });
    }
  };

  const getDashboardNome = (id: string) =>
    dashboards.find((d) => d.id === id)?.nome ?? "—";

  if (authStatus === "authenticated" && session?.user?.role !== "admin") {
    return (
      <AppShell title="Parâmetros RLS">
        <div className="flex items-center justify-center h-full">
          <Loader2 size={28} className="animate-spin text-[#4B5FBF]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Parâmetros RLS" subtitle="Configure os parâmetros de Row Level Security">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#4B5FBF] font-bold text-2xl tracking-tight">Parâmetros RLS</h2>
            <p className="text-[#6C757D] text-sm mt-0.5">
              Configure os parâmetros de segurança por linha do Power BI
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ImportExportXlsx
              nomeTemplate="template_rls"
              cols={[
                { key: "nome",                 header: "nome",                 instrucao: "Nome do parâmetro RLS",                                  exemplo: "Filial do Usuário" },
                { key: "nomeParametroPowerBI",  header: "nomeParametroPowerBI", instrucao: "Nome exato do parâmetro no Power BI",                    exemplo: "UserFilial" },
                { key: "tipo",                 header: "tipo",                 instrucao: "Filial  /  Usuário  /  Departamento  /  Personalizado",   exemplo: "Filial" },
                { key: "dashboardId",          header: "dashboardId",          instrucao: "ID do Dashboard (UUID do banco de dados)",                exemplo: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { key: "tenant",               header: "tenant",               instrucao: "Tenant / domínio da organização",                        exemplo: "viagroup.com" },
              ]}
              onImport={async (rows): Promise<ImportResult> => {
                let success = 0;
                const errors: string[] = [];
                for (const row of rows) {
                  if (!row.nome || !row.nomeParametroPowerBI || !row.dashboardId) {
                    errors.push(`Linha ignorada: nome, nomeParametroPowerBI e dashboardId são obrigatórios (nome: ${row.nome || "?"}).`);
                    continue;
                  }
                  try {
                    await addParametroRLS({
                      nome: row.nome,
                      nomeParametroPowerBI: row.nomeParametroPowerBI,
                      tipo: row.tipo || "Filial",
                      dashboardId: row.dashboardId,
                      tenant: row.tenant || "",
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#28A745] hover:bg-[#218838] text-white text-sm font-semibold rounded-full transition-colors shadow-md"
            >
              <Plus size={16} /> Novo Parâmetro
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full mb-6 text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filtro */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card p-4 mb-6">
          <input
            type="text"
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            placeholder="Pesquisar por nome ou parâmetro Power BI..."
            className="w-full px-5 py-2.5 bg-[#F0F4F8] border-0 rounded-full text-sm text-[#333333] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all"
          />
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e2e8f0]">
            <p className="text-[#6C757D] text-sm font-medium">
              {filtered.length} parâmetro{filtered.length !== 1 ? "s" : ""} cadastrado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F4F8]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Nome (Portal)</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Parâmetro Power BI</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Tipo</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Dashboard</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Tenant</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {!isLoaded ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-[#4B5FBF] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#6C757D]">
                      Nenhum parâmetro RLS encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                      <td className="px-5 py-4 text-sm font-medium text-[#333333]">
                        <span className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-[#4B5FBF] flex-shrink-0" />
                          {p.nome}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <code className="px-2 py-0.5 bg-[#F0F4F8] text-[#4B5FBF] rounded text-xs font-mono">
                          {p.nomeParametroPowerBI}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="px-3 py-1 bg-[#4B5FBF]/10 text-[#4B5FBF] rounded-full text-xs font-medium">
                          {p.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#6C757D]">
                        {p.dashboardId ? getDashboardNome(p.dashboardId) : <span className="text-[#cbd5e1]">—</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#6C757D]">
                        {p.tenant || <span className="text-[#cbd5e1]">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#4B5FBF]/10 transition-colors"
                          >
                            <Pencil size={15} className="text-[#4B5FBF]" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Excluir"
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloco informativo */}
        <div className="mt-6 bg-[#4B5FBF]/5 border border-[#4B5FBF]/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#4B5FBF] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#4B5FBF] mb-1">Como funciona a integração RLS</p>
              <p className="text-xs text-[#6C757D] leading-relaxed">
                Cada parâmetro define a relação entre o portal e o Power BI.
                O <strong>Nome do Parâmetro no Power BI</strong> deve corresponder ao campo usado na DAX da Role RLS.
                Para tipo <strong>Filial</strong>, o sistema envia automaticamente as filiais do usuário como <code className="bg-white px-1 rounded">CUSTOMDATA()</code> ao gerar o token de embed.
                Exemplo DAX: <code className="bg-white px-1 rounded">FIND([PLANTA_ID], CUSTOMDATA(), 1, 0) &gt; 0</code>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[#6C757D] text-xs mt-8">
          Via Labs
        </p>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#e2e8f0] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-shrink-0">
              <h3 className="text-[#4B5FBF] font-bold text-lg">
                {isEdit ? "Editar RLS Parameter" : "Novo Parâmetro RLS"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-[#6C757D] hover:bg-[#F0F4F8] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.nome ? "border-red-500" : "border-transparent"}`}
                  placeholder="ex: Filial Custo por KM"
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1 ml-3">{erros.nome}</p>}
                <p className="text-xs text-[#94a3b8] mt-1 ml-3">Identificador interno no portal</p>
              </div>

              {/* Nome do Parâmetro no Power BI */}
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Nome do Parâmetro no Power BI *</label>
                <input
                  type="text"
                  value={form.nomeParametroPowerBI}
                  onChange={(e) => setForm({ ...form, nomeParametroPowerBI: e.target.value })}
                  className={`w-full px-5 py-2.5 bg-[#F0F4F8] border rounded-full text-sm text-[#333333] font-mono focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all ${erros.nomeParametroPowerBI ? "border-red-500" : "border-transparent"}`}
                  placeholder="ex: Filial"
                />
                {erros.nomeParametroPowerBI && (
                  <p className="text-red-500 text-xs mt-1 ml-3">{erros.nomeParametroPowerBI}</p>
                )}
                <p className="text-xs text-[#94a3b8] mt-1 ml-3">
                  Nome usado nas regras de RLS dentro do Power BI Desktop
                </p>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Tipo</label>
                <CustomSelect
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v })}
                  options={TIPOS.map(t => ({ value: t, label: t }))}
                />
              </div>

              {/* Dashboard */}
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Dashboard</label>
                <CustomSelect
                  value={form.dashboardId}
                  onValueChange={(v) => setForm({ ...form, dashboardId: v })}
                  placeholder="— Selecione um dashboard —"
                  options={dashboards.map(d => ({ value: d.id, label: d.nome }))}
                />
              </div>

              {/* Tenant */}
              <div>
                <label className="block text-xs font-semibold text-[#6C757D] mb-1.5">Tenant</label>
                <CustomSelect
                  value={form.tenant}
                  onValueChange={(v) => setForm({ ...form, tenant: v })}
                  placeholder="— Selecione um tenant —"
                  options={credenciais.map(c => ({ value: c.tenant, label: `${c.tenant} (${c.nome})` }))}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8FAFC] flex items-center justify-end gap-3 flex-shrink-0 border-t border-[#e2e8f0]">
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
                {saving
                  ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
                  : <><Save size={14} />{isEdit ? "Atualizar" : "Salvar"}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
