"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

export interface Dashboard {
  id: string;
  nome: string;
  descricao: string;
  workspaceId: string;
  reportId: string;
  datasetId: string;
  ativo: boolean;
  prioridade?: "alta" | "media" | "baixa";
  setor?: string;
  rls?: boolean;
  rlsRole?: string;
  status?: "Ativo" | "Inativo";
  urlCapa?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  departamento: string;
  acesso: "Administrador do Locatário" | "Usuário" | "Matriz";
  status: "Ativo" | "Excluído";
  filiais: string[];
  dashboards: string[];
}

export interface ParametroRLS {
  id: string;
  nome: string;
  nomeParametroPowerBI: string;
  tipo: string;
  dashboardId: string;
  tenant: string;
}

export interface Credencial {
  id: string;
  nome: string;
  tenantId: string;
  usuarioPowerBI: string;
  dataRegistro: string;
  dataExpiracao: string;
  status: "Ativo" | "Inativo";
  tenant: string;
  clientId: string;
  clientSecret: string;
  masterPassword: string;
}

export interface AcessoEspecial {
  id: string;
  nome: string;
  descricao: string;
  filiais: string[];
  status: "Ativo" | "Inativo";
}

export function useDataStore() {
  const { status, data: session } = useSession();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [parametrosRLS, setParametrosRLS] = useState<ParametroRLS[]>([]);
  const [acessosEspeciais, setAcessosEspeciais] = useState<AcessoEspecial[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      setDashboards([]);
      setIsLoaded(false);
      setLoadedForUser(null);
      return;
    }

    const userKey = session?.user?.email ?? "authenticated-user";
    if (loadedForUser === userKey) return;

    setIsLoaded(false);

    // Carrega dashboards assim que a sessao estiver autenticada.
    fetch("/api/dashboards")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao buscar dashboards");
        return r.json();
      })
      .then((dashData) => {
        setDashboards(dashData.all ?? []);
        setLoadedForUser(userKey);
      })
      .catch((err) => {
        console.warn("Erro ao carregar dashboards:", err.message);
        setDashboards([]);
      })
      .finally(() => setIsLoaded(true));
  }, [status, session?.user?.email, loadedForUser]);

  // ─── Dashboard operations ──────────────────────────────────────────────────
  const addDashboard = useCallback(async (dashboard: Omit<Dashboard, "id">) => {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dashboard),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar dashboard");
    setDashboards((prev) => [...prev, json.entry]);
    return json.entry as Dashboard;
  }, []);

  const updateDashboard = useCallback(async (id: string, updates: Partial<Dashboard>) => {
    const res = await fetch("/api/dashboards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar dashboard");
    setDashboards((prev) => prev.map((d) => (d.id === id ? json.entry : d)));
  }, []);

  const deleteDashboard = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboards?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir dashboard");
    setDashboards((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const getDashboardById = useCallback(
    (id: string) => dashboards.find((d) => d.id === id) || null,
    [dashboards]
  );

  // ─── Usuario operations ────────────────────────────────────────────────────
  const addUsuario = useCallback(async (usuario: Omit<Usuario, "id"> & { senha?: string }) => {
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar usuário");
    setUsuarios((prev) => [...prev, json.entry]);
    return json.entry as Usuario;
  }, []);

  const updateUsuario = useCallback(async (id: string, updates: Partial<Usuario> & { senha?: string; must_change_password?: boolean }) => {
    const res = await fetch("/api/usuarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar usuário");
    setUsuarios((prev) => prev.map((u) => (u.id === id ? json.entry : u)));
  }, []);

  const deleteUsuario = useCallback(async (id: string) => {
    const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir usuário");
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // ─── ParametroRLS operations ───────────────────────────────────────────────
  const addParametroRLS = useCallback(async (parametro: Omit<ParametroRLS, "id">) => {
    const res = await fetch("/api/parametros-rls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parametro),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar parâmetro RLS");
    setParametrosRLS((prev) => [...prev, json.entry]);
    return json.entry as ParametroRLS;
  }, []);

  const updateParametroRLS = useCallback(async (id: string, updates: Partial<ParametroRLS>) => {
    const res = await fetch("/api/parametros-rls", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar parâmetro RLS");
    setParametrosRLS((prev) => prev.map((p) => (p.id === id ? json.entry : p)));
  }, []);

  const deleteParametroRLS = useCallback(async (id: string) => {
    const res = await fetch(`/api/parametros-rls?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir parâmetro RLS");
    setParametrosRLS((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─── Credencial operations ─────────────────────────────────────────────────
  const addCredencial = useCallback(async (credencial: Omit<Credencial, "id">) => {
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credencial),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar credencial");
    setCredenciais((prev) => [...prev, json.entry]);
    return json.entry as Credencial;
  }, []);

  const updateCredencial = useCallback(async (id: string, updates: Partial<Credencial>) => {
    const res = await fetch("/api/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar credencial");
    setCredenciais((prev) => prev.map((c) => (c.id === id ? json.entry : c)));
  }, []);

  const deleteCredencial = useCallback(async (id: string) => {
    const res = await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir credencial");
    setCredenciais((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ─── AcessoEspecial operations ─────────────────────────────────────────────
  const addAcessoEspecial = useCallback(async (acesso: Omit<AcessoEspecial, "id">) => {
    const res = await fetch("/api/acessos-especiais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(acesso),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar acesso especial");
    setAcessosEspeciais((prev) => [...prev, json.entry]);
    return json.entry as AcessoEspecial;
  }, []);

  const updateAcessoEspecial = useCallback(async (id: string, updates: Partial<AcessoEspecial>) => {
    const res = await fetch("/api/acessos-especiais", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar acesso especial");
    setAcessosEspeciais((prev) => prev.map((a) => (a.id === id ? json.entry : a)));
  }, []);

  const deleteAcessoEspecial = useCallback(async (id: string) => {
    const res = await fetch(`/api/acessos-especiais?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir acesso especial");
    setAcessosEspeciais((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ─── Load admin data on demand ─────────────────────────────────────────────
  const loadAdminData = useCallback(async () => {
    // Verifica se já está carregado (mas não bloqueia se acessosEspeciais estiver vazio)
    if (usuarios.length > 0 && credenciais.length > 0 && parametrosRLS.length > 0) {
      // Se já tem os dados principais, só carrega acessos_especiais se ainda não tiver
      if (acessosEspeciais.length === 0) {
        try {
          const acessosData = await fetch("/api/acessos-especiais").then((r) => r.json());
          setAcessosEspeciais(acessosData.entries ?? []);
        } catch (error) {
          console.error("Erro ao carregar acessos especiais:", error);
        }
      }
      return;
    }
    
    try {
      const [userData, credData, rlsData, acessosData] = await Promise.all([
        fetch("/api/usuarios").then((r) => r.json()),
        fetch("/api/credentials").then((r) => r.json()),
        fetch("/api/parametros-rls").then((r) => r.json()),
        fetch("/api/acessos-especiais").then((r) => r.json()),
      ]);
      setUsuarios(userData.entries ?? []);
      setCredenciais(credData.entries ?? []);
      setParametrosRLS(rlsData.entries ?? []);
      setAcessosEspeciais(acessosData.entries ?? []);
    } catch (error) {
      console.error("Erro ao carregar dados administrativos:", error);
    }
  }, [usuarios.length, credenciais.length, parametrosRLS.length, acessosEspeciais.length]);

  return {
    dashboards,
    usuarios,
    credenciais,
    parametrosRLS,
    acessosEspeciais,
    isLoaded,
    loadAdminData,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    getDashboardById,
    addUsuario,
    updateUsuario,
    deleteUsuario,
    addCredencial,
    updateCredencial,
    deleteCredencial,
    addParametroRLS,
    updateParametroRLS,
    deleteParametroRLS,
    addAcessoEspecial,
    updateAcessoEspecial,
    deleteAcessoEspecial,
  };
}
