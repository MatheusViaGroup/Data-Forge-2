from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uuid
from datetime import datetime

from database import db
from models import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    DashboardCreate, DashboardUpdate, DashboardResponse,
    CredencialCreate, CredencialUpdate, CredencialResponse,
    MessageResponse, ErrorResponse, StatusEnum
)

app = FastAPI(
    title="Via Group Portal BI API",
    description="API para gerenciamento do Portal de Inteligência Via Group",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== USUÁRIOS ====================

@app.get("/api/usuarios", response_model=List[UsuarioResponse], tags=["Usuários"])
async def listar_usuarios():
    """Lista todos os usuários do sistema"""
    query = "SELECT * FROM usuarios ORDER BY nome"
    resultados = db.execute_query(query)
    
    if resultados is None:
        raise HTTPException(status_code=500, detail="Erro ao buscar usuários")
    
    return [formatar_usuario(r) for r in resultados]


@app.post("/api/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, tags=["Usuários"])
async def criar_usuario(usuario: UsuarioCreate):
    """Cria um novo usuário"""
    usuario_id = str(uuid.uuid4())
    query = """
        INSERT INTO usuarios (id, nome, email, departamento, acesso, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    params = (
        usuario_id,
        usuario.nome,
        usuario.email,
        usuario.departamento,
        usuario.acesso.value,
        usuario.status.value
    )
    
    resultado = db.execute_query(query, params)
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")
    
    return UsuarioResponse(
        id=usuario_id,
        nome=usuario.nome,
        email=usuario.email,
        departamento=usuario.departamento,
        acesso=usuario.acesso.value,
        status=usuario.status.value
    )


@app.put("/api/usuarios/{id}", response_model=UsuarioResponse, tags=["Usuários"])
async def atualizar_usuario(id: str, usuario: UsuarioUpdate):
    """Atualiza um usuário existente"""
    campos = []
    params = []
    
    if usuario.nome:
        campos.append("nome = %s")
        params.append(usuario.nome)
    if usuario.email:
        campos.append("email = %s")
        params.append(usuario.email)
    if usuario.departamento:
        campos.append("departamento = %s")
        params.append(usuario.departamento)
    if usuario.acesso:
        campos.append("acesso = %s")
        params.append(usuario.acesso.value)
    if usuario.status:
        campos.append("status = %s")
        params.append(usuario.status.value)
    
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    campos.append("updated_at = NOW()")
    params.append(id)
    
    query = f"UPDATE usuarios SET {', '.join(campos)} WHERE id = %s"
    resultado = db.execute_query(query, tuple(params))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário")
    
    return await buscar_usuario_por_id(id)


@app.delete("/api/usuarios/{id}", response_model=MessageResponse, tags=["Usuários"])
async def excluir_usuario(id: str):
    """Exclui um usuário"""
    query = "DELETE FROM usuarios WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao excluir usuário")
    
    return {"message": "Usuário excluído com sucesso"}


async def buscar_usuario_por_id(id: str) -> UsuarioResponse:
    query = "SELECT * FROM usuarios WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return formatar_usuario(resultado[0])


def formatar_usuario(row: dict) -> UsuarioResponse:
    return UsuarioResponse(
        id=str(row["id"]),
        nome=row["nome"],
        email=row["email"],
        departamento=row["departamento"],
        acesso=row["acesso"],
        status=row["status"]
    )


# ==================== DASHBOARDS ====================

@app.get("/api/dashboards", response_model=List[DashboardResponse], tags=["Dashboards"])
async def listar_dashboards():
    """Lista todos os dashboards do sistema"""
    query = "SELECT * FROM dashboards ORDER BY nome"
    resultados = db.execute_query(query)
    
    if resultados is None:
        raise HTTPException(status_code=500, detail="Erro ao buscar dashboards")
    
    return [formatar_dashboard(r) for r in resultados]


@app.post("/api/dashboards", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboards"])
async def criar_dashboard(dashboard: DashboardCreate):
    """Cria um novo dashboard"""
    dashboard_id = str(uuid.uuid4())
    query = """
        INSERT INTO dashboards (id, nome, descricao, workspace_id, report_id, dataset_id, rls, status, setor, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    params = (
        dashboard_id,
        dashboard.nome,
        dashboard.descricao,
        dashboard.workspace_id,
        dashboard.report_id,
        dashboard.dataset_id,
        dashboard.rls,
        dashboard.status.value,
        dashboard.setor
    )
    
    resultado = db.execute_query(query, params)
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao criar dashboard")
    
    return DashboardResponse(
        id=dashboard_id,
        nome=dashboard.nome,
        descricao=dashboard.descricao,
        workspaceId=dashboard.workspace_id,
        reportId=dashboard.report_id,
        datasetId=dashboard.dataset_id,
        rls=dashboard.rls,
        status=dashboard.status.value,
        setor=dashboard.setor
    )


@app.put("/api/dashboards/{id}", response_model=DashboardResponse, tags=["Dashboards"])
async def atualizar_dashboard(id: str, dashboard: DashboardUpdate):
    """Atualiza um dashboard existente"""
    campos = []
    params = []
    
    if dashboard.nome:
        campos.append("nome = %s")
        params.append(dashboard.nome)
    if dashboard.descricao is not None:
        campos.append("descricao = %s")
        params.append(dashboard.descricao)
    if dashboard.workspace_id:
        campos.append("workspace_id = %s")
        params.append(dashboard.workspace_id)
    if dashboard.report_id:
        campos.append("report_id = %s")
        params.append(dashboard.report_id)
    if dashboard.dataset_id is not None:
        campos.append("dataset_id = %s")
        params.append(dashboard.dataset_id)
    if dashboard.rls is not None:
        campos.append("rls = %s")
        params.append(dashboard.rls)
    if dashboard.status:
        campos.append("status = %s")
        params.append(dashboard.status.value)
    if dashboard.setor is not None:
        campos.append("setor = %s")
        params.append(dashboard.setor)
    
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    campos.append("updated_at = NOW()")
    params.append(id)
    
    query = f"UPDATE dashboards SET {', '.join(campos)} WHERE id = %s"
    resultado = db.execute_query(query, tuple(params))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao atualizar dashboard")
    
    return await buscar_dashboard_por_id(id)


@app.delete("/api/dashboards/{id}", response_model=MessageResponse, tags=["Dashboards"])
async def excluir_dashboard(id: str):
    """Exclui um dashboard"""
    query = "DELETE FROM dashboards WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao excluir dashboard")
    
    return {"message": "Dashboard excluído com sucesso"}


async def buscar_dashboard_por_id(id: str) -> DashboardResponse:
    query = "SELECT * FROM dashboards WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado")
    
    return formatar_dashboard(resultado[0])


def formatar_dashboard(row: dict) -> DashboardResponse:
    return DashboardResponse(
        id=str(row["id"]),
        nome=row["nome"],
        descricao=row["descricao"],
        workspaceId=row["workspace_id"],
        reportId=row["report_id"],
        datasetId=row["dataset_id"],
        rls=row["rls"],
        status=row["status"],
        setor=row["setor"]
    )


# ==================== CREDENCIAIS ====================

@app.get("/api/credenciais", response_model=List[CredencialResponse], tags=["Credenciais"])
async def listar_credenciais():
    """Lista todas as credenciais do sistema"""
    query = "SELECT * FROM credenciais ORDER BY nome"
    resultados = db.execute_query(query)
    
    if resultados is None:
        raise HTTPException(status_code=500, detail="Erro ao buscar credenciais")
    
    return [formatar_credencial(r) for r in resultados]


@app.post("/api/credenciais", response_model=CredencialResponse, status_code=status.HTTP_201_CREATED, tags=["Credenciais"])
async def criar_credencial(credencial: CredencialCreate):
    """Cria uma nova credencial"""
    credencial_id = str(uuid.uuid4())
    data_registro = datetime.now().strftime("%d/%m/%Y")
    
    query = """
        INSERT INTO credenciais (id, nome, tenant, tenant_id, client_id, client_secret, usuario_power_bi, master_password, data_registro, data_expiracao, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    params = (
        credencial_id,
        credencial.nome,
        credencial.tenant,
        credencial.tenant_id,
        credencial.client_id,
        credencial.client_secret,
        credencial.usuario_power_bi,
        credencial.master_password,
        data_registro,
        credencial.data_expiracao,
        credencial.status.value
    )
    
    resultado = db.execute_query(query, params)
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao criar credencial")
    
    return CredencialResponse(
        id=credencial_id,
        nome=credencial.nome,
        tenant=credencial.tenant,
        tenantId=credencial.tenant_id,
        usuarioPowerBI=credencial.usuario_power_bi,
        data_registro=data_registro,
        data_expiracao=credencial.data_expiracao,
        status=credencial.status.value
    )


@app.put("/api/credenciais/{id}", response_model=CredencialResponse, tags=["Credenciais"])
async def atualizar_credencial(id: str, credencial: CredencialUpdate):
    """Atualiza uma credencial existente"""
    campos = []
    params = []
    
    if credencial.nome:
        campos.append("nome = %s")
        params.append(credencial.nome)
    if credencial.tenant:
        campos.append("tenant = %s")
        params.append(credencial.tenant)
    if credencial.tenant_id:
        campos.append("tenant_id = %s")
        params.append(credencial.tenant_id)
    if credencial.client_id:
        campos.append("client_id = %s")
        params.append(credencial.client_id)
    if credencial.client_secret is not None:
        campos.append("client_secret = %s")
        params.append(credencial.client_secret)
    if credencial.usuario_power_bi:
        campos.append("usuario_power_bi = %s")
        params.append(credencial.usuario_power_bi)
    if credencial.master_password is not None:
        campos.append("master_password = %s")
        params.append(credencial.master_password)
    if credencial.data_expiracao is not None:
        campos.append("data_expiracao = %s")
        params.append(credencial.data_expiracao)
    if credencial.status:
        campos.append("status = %s")
        params.append(credencial.status.value)
    
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    campos.append("updated_at = NOW()")
    params.append(id)
    
    query = f"UPDATE credenciais SET {', '.join(campos)} WHERE id = %s"
    resultado = db.execute_query(query, tuple(params))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao atualizar credencial")
    
    return await buscar_credencial_por_id(id)


@app.delete("/api/credenciais/{id}", response_model=MessageResponse, tags=["Credenciais"])
async def excluir_credencial(id: str):
    """Exclui uma credencial"""
    query = "DELETE FROM credenciais WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro ao excluir credencial")
    
    return {"message": "Credencial excluída com sucesso"}


async def buscar_credencial_por_id(id: str) -> CredencialResponse:
    query = "SELECT * FROM credenciais WHERE id = %s"
    resultado = db.execute_query(query, (id,))
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")
    
    return formatar_credencial(resultado[0])


def formatar_credencial(row: dict) -> CredencialResponse:
    # Formatar data_registro para PT-BR
    data_registro = row["data_registro"]
    if isinstance(data_registro, datetime):
        data_registro = data_registro.strftime("%d/%m/%Y")
    
    return CredencialResponse(
        id=str(row["id"]),
        nome=row["nome"],
        tenant=row["tenant"],
        tenantId=row["tenant_id"],
        usuarioPowerBI=row["usuario_power_bi"],
        data_registro=data_registro,
        data_expiracao=row["data_expiracao"],
        status=row["status"]
    )


# ==================== HEALTH CHECK ====================

@app.get("/health", tags=["Health"])
async def health_check():
    """Verifica o status da API e do banco de dados"""
    try:
        result = db.test_connection()
        if result["status"] == "connected":
            return {
                "status": "healthy",
                "database": "connected",
                "details": result
            }
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "details": result
        }
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


@app.get("/db/test", tags=["Health"])
async def test_database_connection():
    """Testa a conexão com o banco de dados e retorna informações detalhadas"""
    return db.test_connection()


# ==================== INICIALIZAÇÃO ====================

@app.on_event("startup")
async def startup_event():
    """Conecta ao banco de dados na inicialização"""
    db.connect()


@app.on_event("shutdown")
async def shutdown_event():
    """Desconecta do banco de dados no desligamento"""
    db.disconnect()
