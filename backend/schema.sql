-- Script de criação do banco de dados Via Group Portal BI
-- Execute este script no MySQL para criar as tabelas necessárias

CREATE DATABASE IF NOT EXISTS via_group_portal
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE via_group_portal;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    departamento VARCHAR(50) NOT NULL,
    acesso ENUM('Usuário', 'Administrador do Locatário') NOT NULL DEFAULT 'Usuário',
    status ENUM('Ativo', 'Inativo', 'Excluído') NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_departamento (departamento),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao VARCHAR(500),
    workspace_id VARCHAR(36) NOT NULL,
    report_id VARCHAR(36) NOT NULL,
    dataset_id VARCHAR(36),
    rls BOOLEAN DEFAULT FALSE,
    status ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
    setor VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_setor (setor),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Credenciais
CREATE TABLE IF NOT EXISTS credenciais (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tenant VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36) NOT NULL,
    client_secret TEXT,
    usuario_power_bi VARCHAR(100) NOT NULL,
    master_password VARCHAR(100),
    data_registro DATE NOT NULL,
    data_expiracao DATE,
    status ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_tenant (tenant),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir dados de exemplo (opcional)
INSERT INTO usuarios (id, nome, email, departamento, acesso, status) VALUES
('1', 'João Silva', 'joao.silva@viagroup.com.br', 'TI', 'Administrador do Locatário', 'Ativo'),
('2', 'Maria Santos', 'maria.santos@viagroup.com.br', 'RH', 'Usuário', 'Ativo'),
('3', 'Carlos Ferreira', 'carlos.ferreira@viagroup.com.br', 'TI', 'Administrador do Locatário', 'Ativo');

INSERT INTO dashboards (id, nome, descricao, workspace_id, report_id, dataset_id, rls, status, setor) VALUES
('1', 'Custo Por KM', 'Acompanhamento de custos por quilômetro rodado', 'ws1', 'rpt1', 'ds1', TRUE, 'Ativo', 'Financeiro'),
('2', 'Acidentes e Incidentes', 'Monitoramento de ocorrências na frota', 'ws2', 'rpt2', 'ds2', FALSE, 'Ativo', 'Segurança'),
('3', 'Acompanhamento de Frota', 'Status da frota em tempo real', 'ws3', 'rpt3', 'ds3', TRUE, 'Ativo', 'Frota');

-- Commit
COMMIT;
