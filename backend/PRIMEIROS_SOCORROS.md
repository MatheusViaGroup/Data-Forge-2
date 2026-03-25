# 🆘 Primeiros Socorros - Não Sei Meus Dados do MySQL

## Situação: "Não tenho certeza dos dados do MySQL"

### Passo 1: Descubra ONDE está seu MySQL

**Você se lembra onde o banco de dados está?**

- [ ] **No meu computador Windows** → Vá para "Cenário A"
- [ ] **Em um servidor que acesso por SSH** → Vá para "Cenário B"  
- [ ] **Em um serviço de nuvem (Oracle, AWS, Azure)** → Vá para "Cenário C"
- [ ] **Não faço ideia** → Vá para "Não Sei"

---

## Cenário A: MySQL no Seu Computador (Windows)

### 1. Verificar se MySQL está instalado

```powershell
# Abra o PowerShell e digite:
Get-Service -Name mysql*
```

**Se aparecer algo como "MySQL80" ou "MySQL" com status "Running":**
✅ MySQL está instalado e rodando!

### 2. Dados padrão (tente estes primeiro)

```
Host: localhost
Porta: 3306
Usuário: root
Senha: (a que você definiu na instalação)
```

### 3. Testar conexão

```bash
# Abra o Prompt ou PowerShell:
mysql -u root -p

# Digite a senha quando pedir
```

**Se conectar:**
- Anote: `Host=localhost, Porta=3306, Usuário=root`
- Pule para "Criar Banco de Dados" abaixo

### 4. Se não lembrar a senha do root

```bash
# Pare o MySQL
net stop mysql

# Inicie sem verificação de senha
mysqld --skip-grant-tables

# Em outro terminal:
mysql -u root

# No MySQL:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nova_senha_123';
FLUSH PRIVILEGES;
EXIT;

# Reinicie MySQL normalmente
net start mysql
```

---

## Cenário B: MySQL em Servidor Remoto (SSH)

### 1. Acessar o servidor

```bash
# No PowerShell ou Terminal:
ssh usuario@SEU_SERVIDOR

# Exemplo:
ssh root@192.168.1.100
# ou
ssh admin@meuservidor.com
```

### 2. Verificar MySQL no servidor

```bash
# Ver se MySQL está rodando:
sudo systemctl status mysql

# Ou:
sudo systemctl status mysqld
```

**Se estiver rodando, continue:**

### 3. Descobrir dados

```bash
# IP do servidor:
hostname -I

# Porta do MySQL:
mysql -u root -p -e "SHOW VARIABLES LIKE 'port';"

# Host:
mysql -u root -p -e "SHOW VARIABLES LIKE 'bind_address';"
```

### 4. Criar usuário para aplicação

```bash
mysql -u root -p

# No MySQL:
CREATE DATABASE IF NOT EXISTS via_group_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'via_user'@'%' IDENTIFIED BY 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Anote os dados

```
Host: (IP do servidor, ex: 192.168.1.100)
Porta: 3306
Usuário: via_user
Senha: (a que você definiu)
Banco: via_group_portal
```

---

## Cenário C: MySQL em Nuvem (Oracle Cloud, AWS, Azure)

### Oracle Cloud

1. **Acesse:** https://cloud.oracle.com
2. **Menu:** MySQL → HeatWave
3. **Clique no seu instance**
4. **Copie o "Endpoint"**

```
Host: mysql-xxxxx.mysql.oraclecloud.com
Porta: 3306
Usuário: admin
Senha: (a que você criou)
```

### AWS RDS

1. **Acesse:** https://console.aws.amazon.com/rds
2. **Clique em "Databases"**
3. **Clique no seu banco**
4. **Copie "Endpoint"**

```
Host: meu-banco.xxxxx.region.rds.amazonaws.com
Porta: 3306
```

### Azure MySQL

1. **Acesse:** https://portal.azure.com
2. **Azure Database for MySQL**
3. **Clique no seu servidor**
4. **Vá em "Connection strings"**

```
Host: meu-banco.mysql.database.azure.com
Porta: 3306
Usuário: admin@meu-banco
```

---

## Não Sei / Nunca Configurei

### Opção 1: Instalar MySQL Local (Recomendado para testes)

**Baixe e instale:**
https://dev.mysql.com/downloads/installer/

**Durante instalação:**
- Anote a senha do root que você definir
- Use porta padrão 3306

**Dados finais:**
```
Host: localhost
Porta: 3306
Usuário: root
Senha: (a que você definiu)
```

### Opção 2: Usar MySQL Portátil (Sem instalação)

**XAMPP (Windows):**
1. Baixe: https://www.apachefriends.org/
2. Instale e inicie o MySQL
3. Dados:
   ```
   Host: localhost
   Porta: 3306
   Usuário: root
   Senha: (em branco, sem senha)
   ```

### Opção 3: Criar Servidor Gratuito

**Oracle Cloud Free Tier:**
1. Acesse: https://www.oracle.com/cloud/free/
2. Crie conta gratuita
3. Crie um MySQL instance
4. Copie os dados do dashboard

---

## ✅ Após Descobrir os Dados

### 1. Preencha o arquivo `.env`

Abra: `c:\Projetos\via-group-portal-bi\backend\.env`

```env
DB_HOST=SEU_HOST_AQUI
DB_PORT=3306
DB_USER=SEU_USUARIO_AQUI
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=via_group_portal
```

### 2. Teste a conexão

```bash
cd c:\Projetos\via-group-portal-bi\backend

# Ativar ambiente virtual
venv\Scripts\activate

# Rodar teste
python test_connection.py
```

### 3. Se funcionar

```bash
# Iniciar API
uvicorn main:app --reload
```

---

## 📞 Script Automático

Existe um script que te guia passo a passo:

```bash
cd backend
python setup_interativo.py
```

Ele faz perguntas e configura o `.env` automaticamente!

---

## 📋 Template para Anotar

```
===========================================
DADOS MYSQL - VIA GROUP PORTAL
===========================================

HOST: _________________________
PORTA: _________________________
USUÁRIO: _________________________
SENHA: _________________________
BANCO: via_group_portal
===========================================
```

---

## ❓ Ainda com Dúvidas?

Responda estas perguntas:

1. **Você instalou o MySQL em algum lugar?**
   - Sim → Onde? (seu PC, servidor, nuvem)
   - Não → Precisa instalar (veja "Não Sei" acima)

2. **Você tem acesso a algum servidor?**
   - Sim → É seu ou de outra pessoa?
   - Não → Use MySQL local ou nuvem gratuita

3. **Você já usou MySQL antes?**
   - Sim → Onde estava o banco?
   - Não → Comece com MySQL local (XAMPP)

Com as respostas, fica mais fácil te ajudar!

---

**Via Labs**
