# ✅ Configuração do Servidor - VIA GROUP PORTAL

## 📋 Seus Dados de Conexão

```
Servidor: Oracle Cloud
IP: 160.238.195.221
Porta: 3306
Usuário: via_user
Banco: via_group_portal
```

---

## 🚀 O QUE FAZER AGORA (Passo a Passo)

### ✅ Passo 1: Testar Conexão com o Servidor

No seu computador (Windows):

```bash
# 1. Abra o PowerShell ou Terminal

# 2. Navegue até a pasta do backend
cd c:\Projetos\via-group-portal-bi\backend

# 3. Ative o ambiente virtual
venv\Scripts\activate

# 4. Execute o teste de conexão
python testar_conexao.py
```

**Se aparecer "✅ SUCESSO! Conexão estabelecida!"** → Vá para o Passo 2

**Se aparecer ERRO:** → Veja a seção "Solução de Problemas" abaixo

---

### ✅ Passo 2: Criar as Tabelas no Banco de Dados

Se o teste de conexão funcionou, agora vamos criar as tabelas:

#### Opção A: Usando MySQL Workbench (Recomendado)

1. **Abra o MySQL Workbench**
2. **Clique em "+"** ao lado de "MySQL Connections"
3. **Preencha:**
   - Connection Name: `Via Group Portal`
   - Hostname: `160.238.195.221`
   - Port: `3306`
   - Username: `via_user`
   - Password: `x3W7Wmai4rLA9F3f`
4. **Clique em "Test Connection"** → Deve funcionar!
5. **Clique em "OK"**
6. **Clique na conexão criada**
7. **Abra o arquivo:** `c:\Projetos\via-group-portal-bi\backend\schema.sql`
8. **Copie todo o conteúdo**
9. **Cole no MySQL Workbench e execute**

#### Opção B: Usando Linha de Comando

```bash
# No PowerShell ou CMD:
mysql -h 160.238.195.221 -u via_user -p via_group_portal < schema.sql

# Quando pedir a senha, digite: x3W7Wmai4rLA9F3f
```

#### Opção C: Via SSH (se tiver acesso)

```bash
# Acessar servidor
ssh root@160.238.195.221

# Copiar script para o servidor (do seu computador)
scp schema.sql root@160.238.195.221:/root/

# No servidor:
mysql -u via_user -p via_group_portal < /root/schema.sql
```

---

### ✅ Passo 3: Verificar se as Tabelas Foram Criadas

```bash
# MySQL Workbench:
USE via_group_portal;
SHOW TABLES;

# Ou linha de comando:
mysql -h 160.238.195.221 -u via_user -p via_group_portal -e "SHOW TABLES;"
```

**Deve aparecer:**
```
+----------------------------+
| Tables_in_via_group_portal |
+----------------------------+
| usuarios                   |
| dashboards                 |
| credenciais                |
+----------------------------+
```

---

### ✅ Passo 4: Iniciar a API Backend

```bash
# No PowerShell ou Terminal:
cd c:\Projetos\via-group-portal-bi\backend
venv\Scripts\activate

# Iniciar API
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Saída esperada:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

### ✅ Passo 5: Testar a API

Abra o navegador e acesse:

1. **Documentação Swagger:** http://localhost:8000/docs
2. **Health Check:** http://localhost:8000/health
3. **Teste DB:** http://localhost:8000/db/test

**Deve aparecer:**
```json
{
  "status": "healthy",
  "database": "connected",
  "details": {
    "status": "connected",
    "mysql_version": "8.0.xx",
    "database": "via_group_portal"
  }
}
```

---

### ✅ Passo 6: Iniciar o Frontend

Abra **outro terminal** e execute:

```bash
# Navegue até a raiz do projeto
cd c:\Projetos\via-group-portal-bi

# Instale as dependências (se ainda não fez)
npm install

# Iniciar frontend
npm run dev
```

**Acesse:** http://localhost:3000

**Login:**
- Email: `admin@viagroup.com.br`
- Senha: `admin123`

---

## 🔧 Solução de Problemas

### ❌ Erro: "Can't connect to MySQL server"

**Causa:** Firewall do Oracle Cloud bloqueando a porta 3306

**Solução:**

1. **Acesse Oracle Cloud Console:**
   https://cloud.oracle.com

2. **Vá em:** Networking → Virtual Cloud Networks

3. **Clique na sua VCN**

4. **Clique em Security Lists**

5. **Adicione Ingress Rule:**
   ```
   Source CIDR: 0.0.0.0/0
   Destination Port Range: 3306
   Protocol: TCP
   Description: MySQL Access
   ```

6. **Salve**

---

### ❌ Erro: "Access denied for user 'via_user'"

**Solução:**

```bash
# Acesse o servidor via SSH:
ssh root@160.238.195.221

# No servidor:
mysql -u root -p

# No MySQL:
USE via_group_portal;
SELECT user, host FROM mysql.user;

# Verifique se via_user está com host '%'
# Se não estiver, recrie:
DROP USER 'via_user'@'localhost';
CREATE USER 'via_user'@'%' IDENTIFIED BY 'x3W7Wmai4rLA9F3f';
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

---

### ❌ Erro: "Unknown database 'via_group_portal'"

**Solução:**

```bash
# Acesse o servidor ou use MySQL Workbench:
mysql -h 160.238.195.221 -u root -p

# Crie o banco:
CREATE DATABASE IF NOT EXISTS via_group_portal
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

# Conceda permissões:
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;
```

---

### ❌ Erro: "Timeout" ou "Connection timed out"

**Causa:** Firewall ou bind-address incorreto

**Solução:**

```bash
# No servidor (via SSH):
ssh root@160.238.195.221

# Verificar bind-address:
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Altere para:
bind-address = 0.0.0.0

# Reinicie MySQL:
sudo systemctl restart mysql
```

---

## 📊 Resumo dos Comandos

### Backend (Terminal 1)
```bash
cd c:\Projetos\via-group-portal-bi\backend
venv\Scripts\activate
uvicorn main:app --reload
```

### Frontend (Terminal 2)
```bash
cd c:\Projetos\via-group-portal-bi
npm run dev
```

### Testar Conexão
```bash
cd c:\Projetos\via-group-portal-bi\backend
venv\Scripts\activate
python testar_conexao.py
```

---

## ✅ Checklist Final

Marque conforme for completando:

- [ ] Teste de conexão funcionou (`python testar_conexao.py`)
- [ ] Tabelas criadas no banco (`schema.sql` executado)
- [ ] API rodando sem erros (`uvicorn main:app --reload`)
- [ ] Health check OK (`http://localhost:8000/health`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] Login funcionando (`http://localhost:3000/login`)
- [ ] CRUD de usuários funcionando
- [ ] CRUD de dashboards funcionando
- [ ] CRUD de credenciais funcionando

---

## 📞 Endpoints da API

Com a API rodando, acesse:

- **Documentação:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health
- **DB Test:** http://localhost:8000/db/test
- **Usuários:** http://localhost:8000/api/usuarios
- **Dashboards:** http://localhost:8000/api/dashboards
- **Credenciais:** http://localhost:8000/api/credenciais

---

## 🎯 Próxima Ação

**Execute agora:**

```bash
cd c:\Projetos\via-group-portal-bi\backend
venv\Scripts\activate
python testar_conexao.py
```

**Me avise o resultado!** Se funcionar, vamos para os próximos passos. Se der erro, me mostre o erro que eu te ajudo a resolver.

---

**Kore Data - Conectamos dados para Gerar Resultados**
