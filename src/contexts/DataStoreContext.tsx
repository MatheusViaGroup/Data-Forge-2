"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useDataStore,
  Dashboard,
  Usuario,
  Credencial,
  ParametroRLS,
  AcessoEspecial,
  Setor,
} from "@/hooks/useDataStore";

export type { Dashboard, Usuario, Credencial, ParametroRLS, AcessoEspecial, Setor };

interface DataStoreContextType {
  dashboards: Dashboard[];
  usuarios: Usuario[];
  credenciais: Credencial[];
  parametrosRLS: ParametroRLS[];
  acessosEspeciais: AcessoEspecial[];
  setores: Setor[];
  isLoaded: boolean;

  loadAdminData: () => Promise<void>;
  addDashboard: (dashboard: Omit<Dashboard, "id">) => Promise<Dashboard>;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  getDashboardById: (id: string) => Dashboard | null;

  addUsuario: (usuario: Omit<Usuario, "id"> & { senha?: string }) => Promise<Usuario>;
  updateUsuario: (id: string, updates: Partial<Usuario> & { senha?: string; must_change_password?: boolean }) => Promise<void>;
  deleteUsuario: (id: string) => Promise<void>;

  addCredencial: (credencial: Omit<Credencial, "id">) => Promise<Credencial>;
  updateCredencial: (id: string, updates: Partial<Credencial>) => Promise<void>;
  deleteCredencial: (id: string) => Promise<void>;

  addParametroRLS: (parametro: Omit<ParametroRLS, "id">) => Promise<ParametroRLS>;
  updateParametroRLS: (id: string, updates: Partial<ParametroRLS>) => Promise<void>;
  deleteParametroRLS: (id: string) => Promise<void>;

  addAcessoEspecial: (acesso: Omit<AcessoEspecial, "id">) => Promise<AcessoEspecial>;
  updateAcessoEspecial: (id: string, updates: Partial<AcessoEspecial>) => Promise<void>;
  deleteAcessoEspecial: (id: string) => Promise<void>;

  addSetor: (setor: Omit<Setor, "id">) => Promise<Setor>;
  updateSetor: (id: string, updates: Partial<Setor>) => Promise<void>;
  deleteSetor: (id: string) => Promise<void>;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const dataStore = useDataStore();

  return (
    <DataStoreContext.Provider value={dataStore}>
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStoreContext() {
  const context = useContext(DataStoreContext);
  if (context === undefined) {
    console.warn("useDataStoreContext used outside DataStoreProvider - returning default values");
    return {
      dashboards: [],
      usuarios: [],
      credenciais: [],
      parametrosRLS: [],
      acessosEspeciais: [],
      setores: [],
      isLoaded: true,
      loadAdminData: async () => {},
      addDashboard: async () => { throw new Error("Not available"); },
      updateDashboard: async () => { throw new Error("Not available"); },
      deleteDashboard: async () => { throw new Error("Not available"); },
      getDashboardById: () => null,
      addUsuario: async () => { throw new Error("Not available"); },
      updateUsuario: async () => { throw new Error("Not available"); },
      deleteUsuario: async () => { throw new Error("Not available"); },
      addCredencial: async () => { throw new Error("Not available"); },
      updateCredencial: async () => { throw new Error("Not available"); },
      deleteCredencial: async () => { throw new Error("Not available"); },
      addParametroRLS: async () => { throw new Error("Not available"); },
      updateParametroRLS: async () => { throw new Error("Not available"); },
      deleteParametroRLS: async () => { throw new Error("Not available"); },
      addAcessoEspecial: async () => { throw new Error("Not available"); },
      updateAcessoEspecial: async () => { throw new Error("Not available"); },
      deleteAcessoEspecial: async () => { throw new Error("Not available"); },
      addSetor: async () => { throw new Error("Not available"); },
      updateSetor: async () => { throw new Error("Not available"); },
      deleteSetor: async () => { throw new Error("Not available"); },
    };
  }
  return context;
}
