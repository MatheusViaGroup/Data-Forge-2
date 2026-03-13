from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"
    EXCLUIDO = "Excluído"


class AcessoEnum(str, Enum):
    USUARIO = "Usuário"
    ADMINISTRADOR = "Administrador do Locatário"


# ==================== USUÁRIOS ====================

class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    departamento: str = Field(..., min_length=1, max_length=50)
    acesso: AcessoEnum = AcessoEnum.USUARIO
    status: StatusEnum = StatusEnum.ATIVO


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    departamento: Optional[str] = Field(None, min_length=1, max_length=50)
    acesso: Optional[AcessoEnum] = None
    status: Optional[StatusEnum] = None


class UsuarioResponse(BaseModel):
    id: str
    nome: str
    email: str
    departamento: str
    acesso: str
    status: str
    
    class Config:
        from_attributes = True


# ==================== DASHBOARDS ====================

class DashboardCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = Field(None, max_length=500)
    workspace_id: str = Field(..., alias="workspaceId")
    report_id: str = Field(..., alias="reportId")
    dataset_id: Optional[str] = Field(None, alias="datasetId")
    rls: bool = False
    status: StatusEnum = StatusEnum.ATIVO
    setor: Optional[str] = Field(None, max_length=50)


class DashboardUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = Field(None, max_length=500)
    workspace_id: Optional[str] = Field(None, alias="workspaceId")
    report_id: Optional[str] = Field(None, alias="reportId")
    dataset_id: Optional[str] = Field(None, alias="datasetId")
    rls: Optional[bool] = None
    status: Optional[StatusEnum] = None
    setor: Optional[str] = Field(None, max_length=50)


class DashboardResponse(BaseModel):
    id: str
    nome: str
    descricao: Optional[str]
    workspaceId: str
    reportId: str
    datasetId: Optional[str]
    rls: bool
    status: str
    setor: Optional[str]
    
    class Config:
        from_attributes = True


# ==================== CREDENCIAIS ====================

class CredencialCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    tenant: str = Field(..., max_length=50)
    tenant_id: str = Field(..., alias="tenantId")
    client_id: str = Field(..., alias="clientId")
    client_secret: Optional[str] = Field(None, alias="clientSecret")
    usuario_power_bi: str = Field(..., alias="usuarioPowerBI")
    master_password: Optional[str] = Field(None, alias="masterPassword")
    data_expiracao: Optional[str] = Field(None, alias="dataExpiracao")
    status: StatusEnum = StatusEnum.ATIVO


class CredencialUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    tenant: Optional[str] = Field(None, max_length=50)
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    client_id: Optional[str] = Field(None, alias="clientId")
    client_secret: Optional[str] = Field(None, alias="clientSecret")
    usuario_power_bi: Optional[str] = Field(None, alias="usuarioPowerBI")
    master_password: Optional[str] = Field(None, alias="masterPassword")
    data_expiracao: Optional[str] = Field(None, alias="dataExpiracao")
    status: Optional[StatusEnum] = None


class CredencialResponse(BaseModel):
    id: str
    nome: str
    tenant: str
    tenantId: str
    usuarioPowerBI: str
    data_registro: str
    data_expiracao: Optional[str]
    status: str
    
    class Config:
        from_attributes = True


# ==================== RESPOSTAS PADRÃO ====================

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
