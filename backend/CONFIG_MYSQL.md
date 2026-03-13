# Guia de Configuração - MySQL Remoto

## Passo 1: Acessar o Servidor via SSH

```bash
# No Windows, use PowerShell ou Terminal
ssh usuario@seu-servidor.com

# Ou use PuTTY se preferir interface gráfica
```

## Passo 2: Criar o Banco de Dados

```bash
# Acesse o MySQL
mysql -u root -p

# Dentro do MySQL, execute:
CREATE DATABASE IF NOT EXISTS via_group_portal
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

# Criar usuário específico para a aplicação (RECOMENDADO)
CREATE USER 'via_user'@'%' IDENTIFIED BY 'senha_forte_aqui';

# Conceder permissões
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;

# Sair do MySQL
EXIT;
```

## Passo 3: Copiar Script SQL para o Servidor

No seu computador local (Windows):

```powershell
# Copiar o script schema.sql para o servidor
scp c:\Projetos\via-group-portal-bi\backend\schema.sql usuario@seu-servidor.com:/home/usuario/
```

## Passo 4: Executar o Script no Servidor

```bash
# No servidor, execute o script
mysql -u root -p via_group_portal < /home/usuario/schema.sql

# Ou dentro do MySQL:
mysql -u root -p
USE via_group_portal;
source /home/usuario/schema.sql;
```

## Passo 5: Verificar se o MySQL está Acessível Remotamente

```bash
# No servidor, verifique o bind-address
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Comente ou altere a linha:
# bind-address = 127.0.0.1
# Para:
bind-address = 0.0.0.0

# Reinicie o MySQL
sudo systemctl restart mysql
```

## Passo 6: Liberar Porta no Firewall (se necessário)

```bash
# Ubuntu/Debian
sudo ufw allow 3306/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --zone=public --add-port=3306/tcp --permanent
sudo firewall-cmd --reload
```

## Passo 7: Testar Conexão Remota

```bash
# No seu computador local, teste a conexão
mysql -h seu-servidor.com -P 3306 -u via_user -p

# Ou use o MySQL Workbench para testar visualmente
```

---

## 🔒 Dicas de Segurança

1. **Use SSH Tunneling** (Recomendado):
   ```bash
   ssh -L 3306:localhost:3306 usuario@seu-servidor.com
   ```
   Assim o MySQL fica acessível localmente na porta 3306 via túnel SSH.

2. **Restrinja IPs no MySQL**:
   ```sql
   -- Em vez de '%' para todos os IPs, use IP específico
   CREATE USER 'via_user'@'189.123.45.67' IDENTIFIED BY 'senha';
   ```

3. **Use SSL no MySQL**:
   Configure certificados SSL para conexão criptografada.

4. **Senha Forte**:
   Use pelo menos 16 caracteres com letras, números e símbolos.

---

## 📝 Informações Necessárias

Anote estas informações para configurar o backend:

- **Host**: `seu-servidor.com` ou IP do servidor
- **Porta**: `3306` (padrão)
- **Usuário**: `via_user` (ou o que você criou)
- **Senha**: `senha_forte_aqui`
- **Banco de Dados**: `via_group_portal`
