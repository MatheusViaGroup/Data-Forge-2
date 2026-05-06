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
  setorIds?: string[];
  setores?: string[];
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
  setorId?: string;
  dashboardsManualAdd?: string[];
  dashboardsManualRemove?: string[];
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

export interface Setor {
  id: string;
  nome: string;
  dashboardIds: string[];
}

export function useDataStore() {
  const { status, data: session } = useSession();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [parametrosRLS, setParametrosRLS] = useState<ParametroRLS[]>([]);
  const [acessosEspeciais, setAcessosEspeciais] = useState<AcessoEspecial[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
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

    fetch("/api/dashboards")
      .then((response) => {
        if (!response.ok) throw new Error("Erro ao buscar dashboards");
        return response.json();
      })
<<<<<<< HEAD
      .then((dashData: { all?: Dashboard[] }) => {
        setDashboards(dashData.all ?? []);
=======
      .then((dashData: { all?: Dashboard[]; entries?: Dashboard[] }) => {
        setDashboards(dashData.all ?? dashData.entries ?? []);
>>>>>>> stag
        setLoadedForUser(userKey);
      })
      .catch((error: Error) => {
        console.warn("Erro ao carregar dashboards:", error.message);
        setDashboards([]);
      })
      .finally(() => setIsLoaded(true));
  }, [status, session?.user?.email, loadedForUser]);

  const addDashboard = useCallback(async (dashboard: Omit<Dashboard, "id">) => {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dashboard),
    });
    const json = (await res.json()) as { error?: string; entry: Dashboard };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar dashboard");
    setDashboards((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateDashboard = useCallback(async (id: string, updates: Partial<Dashboard>) => {
    const res = await fetch("/api/dashboards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = (await res.json()) as { error?: string; entry: Dashboard };
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar dashboard");
    setDashboards((prev) => prev.map((dashboard) => (dashboard.id === id ? json.entry : dashboard)));
  }, []);

  const deleteDashboard = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboards?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir dashboard");
    setDashboards((prev) => prev.filter((dashboard) => dashboard.id !== id));
  }, []);

  const getDashboardById = useCallback(
    (id: string) => dashboards.find((dashboard) => dashboard.id === id) ?? null,
    [dashboards]
  );

  const addUsuario = useCallback(async (usuario: Omit<Usuario, "id"> & { senha?: string }) => {
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    });
    const json = (await res.json()) as { error?: string; entry: Usuario };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar usuário");
    setUsuarios((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateUsuario = useCallback(
    async (id: string, updates: Partial<Usuario> & { senha?: string; must_change_password?: boolean }) => {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = (await res.json()) as { error?: string; entry: Usuario };
      if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar usuário");
      setUsuarios((prev) => prev.map((usuario) => (usuario.id === id ? json.entry : usuario)));
    },
    []
  );

  const deleteUsuario = useCallback(async (id: string) => {
    const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir usuário");
    setUsuarios((prev) => prev.filter((usuario) => usuario.id !== id));
  }, []);

  const addParametroRLS = useCallback(async (parametro: Omit<ParametroRLS, "id">) => {
    const res = await fetch("/api/parametros-rls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parametro),
    });
    const json = (await res.json()) as { error?: string; entry: ParametroRLS };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar parâmetro RLS");
    setParametrosRLS((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateParametroRLS = useCallback(async (id: string, updates: Partial<ParametroRLS>) => {
    const res = await fetch("/api/parametros-rls", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = (await res.json()) as { error?: string; entry: ParametroRLS };
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar parâmetro RLS");
    setParametrosRLS((prev) => prev.map((parametro) => (parametro.id === id ? json.entry : parametro)));
  }, []);

  const deleteParametroRLS = useCallback(async (id: string) => {
    const res = await fetch(`/api/parametros-rls?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir parâmetro RLS");
    setParametrosRLS((prev) => prev.filter((parametro) => parametro.id !== id));
  }, []);

  const addCredencial = useCallback(async (credencial: Omit<Credencial, "id">) => {
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credencial),
    });
    const json = (await res.json()) as { error?: string; entry: Credencial };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar credencial");
    setCredenciais((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateCredencial = useCallback(async (id: string, updates: Partial<Credencial>) => {
    const res = await fetch("/api/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = (await res.json()) as { error?: string; entry: Credencial };
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar credencial");
    setCredenciais((prev) => prev.map((credencial) => (credencial.id === id ? json.entry : credencial)));
  }, []);

  const deleteCredencial = useCallback(async (id: string) => {
    const res = await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir credencial");
    setCredenciais((prev) => prev.filter((credencial) => credencial.id !== id));
  }, []);

  const addAcessoEspecial = useCallback(async (acesso: Omit<AcessoEspecial, "id">) => {
    const res = await fetch("/api/acessos-especiais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(acesso),
    });
    const json = (await res.json()) as { error?: string; entry: AcessoEspecial };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar acesso especial");
    setAcessosEspeciais((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateAcessoEspecial = useCallback(async (id: string, updates: Partial<AcessoEspecial>) => {
    const res = await fetch("/api/acessos-especiais", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = (await res.json()) as { error?: string; entry: AcessoEspecial };
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar acesso especial");
    setAcessosEspeciais((prev) => prev.map((acesso) => (acesso.id === id ? json.entry : acesso)));
  }, []);

  const deleteAcessoEspecial = useCallback(async (id: string) => {
    const res = await fetch(`/api/acessos-especiais?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir acesso especial");
    setAcessosEspeciais((prev) => prev.filter((acesso) => acesso.id !== id));
  }, []);

  const addSetor = useCallback(async (setor: Omit<Setor, "id">) => {
    const res = await fetch("/api/setores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setor),
    });
    const json = (await res.json()) as { error?: string; entry: Setor };
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar setor");
    setSetores((prev) => [...prev, json.entry]);
    return json.entry;
  }, []);

  const updateSetor = useCallback(async (id: string, updates: Partial<Setor>) => {
    const res = await fetch("/api/setores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = (await res.json()) as { error?: string; entry: Setor };
    if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar setor");
    setSetores((prev) => prev.map((setor) => (setor.id === id ? json.entry : setor)));
  }, []);

  const deleteSetor = useCallback(async (id: string) => {
    const res = await fetch(`/api/setores?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir setor");
    setSetores((prev) => prev.filter((setor) => setor.id !== id));
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      const [dashData, userData, credData, rlsData, acessosData, setoresData] = await Promise.all([
        fetch("/api/dashboards").then((response) => response.json()) as Promise<{ all?: Dashboard[]; entries?: Dashboard[] }>,
        fetch("/api/usuarios").then((response) => response.json()) as Promise<{ entries?: Usuario[] }>,
        fetch("/api/credentials").then((response) => response.json()) as Promise<{ entries?: Credencial[] }>,
        fetch("/api/parametros-rls").then((response) => response.json()) as Promise<{ entries?: ParametroRLS[] }>,
        fetch("/api/acessos-especiais").then((response) => response.json()) as Promise<{ entries?: AcessoEspecial[] }>,
        fetch("/api/setores").then((response) => response.json()) as Promise<{ entries?: Setor[] }>,
      ]);

      setDashboards(dashData.all ?? dashData.entries ?? []);
      setUsuarios(userData.entries ?? []);
      setCredenciais(credData.entries ?? []);
      setParametrosRLS(rlsData.entries ?? []);
      setAcessosEspeciais(acessosData.entries ?? []);
      setSetores(setoresData.entries ?? []);
    } catch (error) {
      console.error("Erro ao carregar dados administrativos:", error);
    }
  }, []);

  return {
    dashboards,
    usuarios,
    credenciais,
    parametrosRLS,
    acessosEspeciais,
    setores,
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
    addSetor,
    updateSetor,
    deleteSetor,
  };
}
