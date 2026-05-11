const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==================== USUÁRIOS ====================

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  departamento: string;
  acesso: 'Usuário' | 'Administrador do Locatário';
  status: 'Ativo' | 'Excluído';
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  const res = await fetch(`${API_URL}/api/usuarios`);
  if (!res.ok) throw new Error('Erro ao buscar usuários');
  return res.json();
}

export async function createUsuario(data: Omit<Usuario, 'id'>): Promise<Usuario> {
  const res = await fetch(`${API_URL}/api/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar usuário');
  return res.json();
}

export async function updateUsuario(id: string, data: Partial<Usuario>): Promise<Usuario> {
  const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar usuário');
  return res.json();
}

export async function deleteUsuario(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao excluir usuário');
}


// ==================== DASHBOARDS ====================

export interface Dashboard {
  id: string;
  nome: string;
  descricao: string;
  workspaceId: string;
  reportId: string;
  datasetId: string;
  rls: boolean;
  status: 'Ativo' | 'Inativo';
  setor: string;
}

export async function fetchDashboards(): Promise<Dashboard[]> {
  const res = await fetch(`${API_URL}/api/dashboards`);
  if (!res.ok) throw new Error('Erro ao buscar dashboards');
  return res.json();
}

export async function createDashboard(data: Omit<Dashboard, 'id'>): Promise<Dashboard> {
  const res = await fetch(`${API_URL}/api/dashboards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: data.nome,
      descricao: data.descricao,
      workspaceId: data.workspaceId,
      reportId: data.reportId,
      datasetId: data.datasetId,
      rls: data.rls,
      status: data.status,
      setor: data.setor,
    }),
  });
  if (!res.ok) throw new Error('Erro ao criar dashboard');
  return res.json();
}

export async function updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
  const res = await fetch(`${API_URL}/api/dashboards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: data.nome,
      descricao: data.descricao,
      workspaceId: data.workspaceId,
      reportId: data.reportId,
      datasetId: data.datasetId,
      rls: data.rls,
      status: data.status,
      setor: data.setor,
    }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar dashboard');
  return res.json();
}

export async function deleteDashboard(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/dashboards/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao excluir dashboard');
}


// ==================== CREDENCIAIS ====================

export interface Credencial {
  id: string;
  nome: string;
  tenant: string;
  tenantId: string;
  usuarioPowerBI: string;
  dataRegistro: string;
  dataExpiracao: string;
  status: 'Ativo' | 'Inativo';
}

export async function fetchCredenciais(): Promise<Credencial[]> {
  const res = await fetch(`${API_URL}/api/credenciais`);
  if (!res.ok) throw new Error('Erro ao buscar credenciais');
  return res.json();
}

export async function createCredencial(data: Omit<Credencial, 'id' | 'dataRegistro'>): Promise<Credencial> {
  const res = await fetch(`${API_URL}/api/credenciais`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar credencial');
  return res.json();
}

export async function updateCredencial(id: string, data: Partial<Credencial>): Promise<Credencial> {
  const res = await fetch(`${API_URL}/api/credenciais/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar credencial');
  return res.json();
}

export async function deleteCredencial(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/credenciais/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao excluir credencial');
}
