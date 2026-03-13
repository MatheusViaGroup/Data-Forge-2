# 🚀 Guia Rápido - Configuração do Banco de Dados Remoto

## Passo 1: Editar o arquivo `.env`

Abra o arquivo `backend\.env` e preencha com os dados do seu servidor:

```env
DB_HOST=seu-servidor.com          # IP ou domínio do servidor
DB_PORT=3306                       # Porta do MySQL
DB_USER=via_user                   # Usuário do banco
DB_PASSWORD=sua_senha_forte        # Senha do usuário
DB_NAME=via_group_portal           # Nome do banco de dados
```

---

## Passo 2: Acessar o Servidor via SSH

```bash
# Windows (PowerShell ou Terminal)
ssh usuario@seu-servidor.com

# Ou use PuTTY
```

---

## Passo 3: Criar o Banco de Dados no Servidor

```bash
# Acessar MySQL como root
mysql -u root -p

# No MySQL:
CREATE DATABASE IF NOT EXISTS via_group_portal
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

CREATE USER 'via_user'@'%' IDENTIFIED BY 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

---

## Passo 4: Copiar e Executar o Script SQL

No seu computador local (Windows):

```powershell
# Copiar script para o servidor
scp c:\Projetos\via-group-portal-bi\backend\schema.sql usuario@seu-servidor.com:/home/usuario/
```

No servidor (via SSH):

```bash
# Executar o script
mysql -u root -p via_group_portal < /home/usuario/schema.sql
```

---

## Passo 5: Configurar MySQL para Acesso Remoto

No servidor:

```bash
# Editar configuração do MySQL
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Comente ou altere:
# bind-address = 127.0.0.1
# Para:
bind-address = 0.0.0.0

# Reiniciar MySQL
sudo systemctl restart mysql

# Liberar porta no firewall
sudo ufw allow 3306/tcp
```

---

## Passo 6: Testar Conexão no Seu Computador

```bash
# Testar conexão MySQL
mysql -h seu-servidor.com -P 3306 -u via_user -p
```

Se conectar, está tudo certo!

---

## Passo 7: Testar com o Script Python

No seu computador local:

```bash
cd c:\Projetos\via-group-portal-bi\backend

# Ativar ambiente virtual
venv\Scripts\activate

# Rodar teste de conexão
python test_connection.py
```

---

## 🔒 Opção: SSH Tunneling (Mais Seguro)

Em vez de liberar a porta 3306, use túnel SSH:

```bash
# No seu computador, crie o túnel:
ssh -L 3306:localhost:3306 -N -f usuario@seu-servidor.com

# No .env, use:
DB_HOST=localhost
```

O `-N -f` mantém o túnel em background.

---

## ✅ Verificação Final

1. ✅ Banco de dados criado no servidor
2. ✅ Usuário e permissões configurados
3. ✅ Script SQL executado (tabelas criadas)
4. ✅ MySQL configurado para acesso remoto
5. ✅ Firewall liberado na porta 3306
6. ✅ Arquivo `.env` configurado
7. ✅ Teste de conexão bem-sucedido

---

## 🐛 Problemas Comuns

### "Can't connect to MySQL server"

- Verifique se o MySQL está rodando: `sudo systemctl status mysql`
- Verifique o firewall: `sudo ufw status`
- Teste localmente no servidor: `mysql -u via_user -p`

### "Access denied for user"

- Verifique as credenciais no `.env`
- Confirme que o usuário foi criado: `SELECT user, host FROM mysql.user;`
- Verifique as permissões: `SHOW GRANTS FOR 'via_user'@'%';`

### "Host is not allowed to connect"

- O MySQL está restrito a localhost
- Altere o `bind-address` para `0.0.0.0`
- Ou use SSH Tunneling

---

## 📞 Próximos Passos

Após configurar o banco de dados:

1. Inicie a API: `uvicorn main:app --reload`
2. Acesse: `http://localhost:8000/docs`
3. Teste o endpoint `/db/test` para verificar a conexão
4. Inicie o frontend: `npm run dev`
