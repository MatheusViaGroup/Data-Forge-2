# Via Group Portal BI - Backend API

Backend em Python com FastAPI para o Portal de Inteligência Via Group.

## Requisitos

- Python 3.9+
- MySQL (Oracle Cloud ou local)

## Instalação

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual (Windows)
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

## Configuração

1. Copie `.env.example` para `.env`
2. Preencha as credenciais do banco de dados

## Execução

```bash
# Desenvolvimento (com auto-reload)
uvicorn main:app --reload

# Produção
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/{id}` - Atualizar usuário
- `DELETE /api/usuarios/{id}` - Excluir usuário

- `GET /api/dashboards` - Listar dashboards
- `POST /api/dashboards` - Criar dashboard
- `PUT /api/dashboards/{id}` - Atualizar dashboard
- `DELETE /api/dashboards/{id}` - Excluir dashboard

- `GET /api/credenciais` - Listar credenciais
- `POST /api/credenciais` - Criar credencial
- `PUT /api/credenciais/{id}` - Atualizar credencial
- `DELETE /api/credenciais/{id}` - Excluir credencial

## Documentação

Acesse `/docs` para a documentação Swagger UI automática.
