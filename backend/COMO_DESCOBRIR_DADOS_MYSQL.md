# 📋 Guia: Como Descobrir os Dados de Conexão do MySQL

## Cenário 1: Você tem acesso SSH ao servidor

### 1. Acesse o servidor via SSH

```bash
# No Windows (PowerShell ou Terminal):
ssh usuario@seu-servidor.com

# Ou use PuTTY (interface gráfica)
```

### 2. Verificar se MySQL está instalado e rodando

```bash
# Verificar status do MySQL
sudo systemctl status mysql

# Ou
sudo systemctl status mysqld

# Se não estiver rodando, inicie:
sudo systemctl start mysql
```

### 3. Descobrir a porta do MySQL

```bash
# Método 1: Verificar configuração
sudo grep -r "port" /etc/mysql/

# Método 2: Verificar porta em uso
sudo netstat -tlnp | grep mysql

# Método 3: Usar MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'port';"
```

**Saída esperada:**
```
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| port          | 3306  |
+---------------+-------+
```

### 4. Descobrir o bind-address (onde MySQL está escutando)

```bash
# Verificar configuração
sudo grep "bind-address" /etc/mysql/mysql.conf.d/mysqld.cnf

# Ou
mysql -u root -p -e "SHOW VARIABLES LIKE 'bind_address';"
```

**Saídas possíveis:**
- `127.0.0.1` = Apenas local (precisa mudar para acesso remoto)
- `0.0.0.0` = Todas as interfaces (já permite acesso remoto)
- `IP_ESPECIFICO` = Apenas daquele IP

### 5. Criar usuário para a aplicação

```bash
# Acessar MySQL como root
mysql -u root -p

# Dentro do MySQL:

# Ver usuários existentes
SELECT user, host FROM mysql.user;

# Criar novo usuário (SUBSTITUA 'senha_forte_123' pela sua senha)
CREATE USER 'via_user'@'%' IDENTIFIED BY 'senha_forte_123';

# Ou criar usuário restrito a um IP específico (mais seguro)
-- CREATE USER 'via_user'@'189.123.45.67' IDENTIFIED BY 'senha_forte_123';

# Criar banco de dados
CREATE DATABASE IF NOT EXISTS via_group_portal
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

# Conceder permissões
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;

# Verificar permissões
SHOW GRANTS FOR 'via_user'@'%';

# Sair
EXIT;
```

### 6. Descobrir o IP/Domínio do servidor

```bash
# IP público do servidor
curl ifconfig.me

# Ou
hostname -I

# Ou ver todas as interfaces de rede
ip addr show
```

**Anote o IP que aparece!**

---

## Cenário 2: MySQL está no SEU computador local (Windows)

### 1. Verificar se MySQL está instalado

```powershell
# No PowerShell:
Get-Service -Name mysql*

# Ou ver serviços do Windows:
services.msc
```

### 2. Descobrir porta e host

```bash
# Conectar ao MySQL local
mysql -u root -p

# Dentro do MySQL:
SHOW VARIABLES LIKE 'port';
SHOW VARIABLES LIKE 'bind_address';
```

### 3. Dados padrão do MySQL local

```
Host: localhost ou 127.0.0.1
Porta: 3306
Usuário: root
Senha: (a que você definiu na instalação)
```

---

## Cenário 3: MySQL em Nuvem (AWS, Azure, Oracle Cloud, etc.)

### Oracle Cloud (que você mencionou)

1. **Acesse o Console da Oracle Cloud**
2. **Vá em:** MySQL → HeatWave / MySQL Service
3. **Clique no seu instance**
4. **Copie o "Endpoint" ou "Connection String"**

**Dados típicos Oracle Cloud:**
```
Host: mysql-xxxxx.mysql.oraclecloud.com
Porta: 3306
Usuário: admin (ou o que você criou)
Senha: (a que você definiu)
```

### AWS RDS

1. **Acesse:** AWS Console → RDS → Databases
2. **Clique no seu banco**
3. **Copie "Endpoint"**

**Dados típicos AWS:**
```
Host: meu-banco.xxxxxx.region.rds.amazonaws.com
Porta: 3306
```

### Azure MySQL

1. **Acesse:** Azure Portal → Azure Database for MySQL
2. **Vá em:** Connection strings
3. **Copie o host**

**Dados típicos Azure:**
```
Host: meu-banco.mysql.database.azure.com
Porta: 3306
Usuário: admin@meu-banco
```

---

## 📝 Template para Anotar os Dados

Copie e preencha:

```
===========================================
DADOS DE CONEXÃO MYSQL - VIA GROUP
===========================================

HOST (servidor): _________________________
   Ex: 192.168.1.100
   Ex: mysql-xxxxx.oraclecloud.com
   Ex: localhost (se for local)

PORTA: _________________________
   Padrão: 3306

USUÁRIO: _________________________
   Ex: via_user, root, admin

SENHA: _________________________
   (anote em local seguro!)

BANCO DE DADOS: via_group_portal
   (este já está definido)

===========================================
```

---

## 🔧 Testar Conexão Manualmente

### Do seu computador Windows:

```bash
# MySQL Workbench (recomendado)
# 1. Abra MySQL Workbench
# 2. Clique em "+" ao lado de "MySQL Connections"
# 3. Preencha com os dados acima
# 4. Clique em "Test Connection"

# Ou via linha de comando:
mysql -h SEU_HOST -P 3306 -u via_user -p

# Se conectar, os dados estão corretos!
```

---

## 🔐 Habilitar Acesso Remoto (se necessário)

### Se MySQL está no servidor remoto:

```bash
# 1. Editar configuração do MySQL
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# 2. Alterar bind-address:
# De: bind-address = 127.0.0.1
# Para: bind-address = 0.0.0.0

# 3. Reiniciar MySQL
sudo systemctl restart mysql

# 4. Liberar porta no firewall
sudo ufw allow 3306/tcp
sudo ufw status
```

### Ou usar SSH Tunneling (mais seguro):

```bash
# No seu computador:
ssh -L 3306:localhost:3306 -N -f usuario@seu-servidor.com

# No .env use:
DB_HOST=localhost
DB_PORT=3306
```

O túnel SSH cria uma conexão segura e você não precisa expor o MySQL diretamente.

---

## ❓ Perguntas Frequentes

### "Não sei a senha do root do MySQL"

No servidor:
```bash
# Resetar senha root (Ubuntu)
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables &
mysql -u root
> UPDATE mysql.user SET authentication_string=PASSWORD('nova_senha') WHERE User='root';
> FLUSH PRIVILEGES;
> EXIT;
sudo systemctl start mysql
```

### "Não consigo conectar remotamente"

1. Verifique bind-address: `mysql -u root -p -e "SHOW VARIABLES LIKE 'bind_address';"`
2. Verifique firewall: `sudo ufw status`
3. Verifique usuário: `mysql -u root -p -e "SELECT user, host FROM mysql.user;"`

### "MySQL não está instalado"

No servidor Ubuntu/Debian:
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

---

## ✅ Checklist

- [ ] Acessei o servidor via SSH ou console
- [ ] Verifiquei que MySQL está rodando
- [ ] Descobri o HOST (IP ou domínio)
- [ ] Descobri a PORTA (geralmente 3306)
- [ ] Criei usuário `via_user` com senha
- [ ] Criei banco de dados `via_group_portal`
- [ ] Concedi permissões ao usuário
- [ ] Testei conexão manualmente
- [ ] Anotei todos os dados no template

---

## 📞 Próximo Passo

Com os dados em mãos, preencha o arquivo `backend/.env`:

```env
DB_HOST=preencha_aqui
DB_PORT=3306
DB_USER=via_user
DB_PASSWORD=preencha_aqui
DB_NAME=via_group_portal
```

Depois execute:
```bash
cd backend
python test_connection.py
```
