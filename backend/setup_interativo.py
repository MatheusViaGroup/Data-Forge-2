#!/usr/bin/env python3
"""
Script interativo para coletar dados de conexão MySQL
Execute este script e ele vai te guiar passo a passo
"""

import os
import sys
from pathlib import Path

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_cabecalho():
    print("=" * 70)
    print("📋 COLETOR DE DADOS DE CONEXÃO MYSQL - VIA GROUP PORTAL")
    print("=" * 70)
    print()

def perguntar_host():
    print("❓ ONDE SEU BANCO DE DADOS ESTÁ HOSPEDADO?")
    print()
    print("1. No meu computador local (Windows)")
    print("2. Em um servidor remoto (VPS, Oracle Cloud, AWS, etc.)")
    print("3. Em um serviço gerenciado (Oracle Cloud MySQL, AWS RDS, Azure)")
    print("4. Não tenho certeza / Preciso de ajuda")
    print()
    
    opcao = input("Escolha uma opção (1-4): ").strip()
    
    if opcao == "1":
        return "localhost", "3306"
    elif opcao == "2":
        print()
        print("📝 Você precisa do IP ou domínio do seu servidor.")
        print()
        print("No servidor, execute: curl ifconfig.me")
        print()
        host = input("Digite o HOST (IP ou domínio): ").strip()
        porta = input("Digite a PORTA (padrão 3306): ").strip() or "3306"
        return host, porta
    elif opcao == "3":
        print()
        print("☁️ SERVIÇO GERENCIADO")
        print()
        print("Oracle Cloud: mysql-xxxxx.mysql.oraclecloud.com")
        print("AWS RDS: xxxxx.region.rds.amazonaws.com")
        print("Azure: xxxxx.mysql.database.azure.com")
        print()
        host = input("Digite o HOST/ENDPOINT do serviço: ").strip()
        porta = input("Digite a PORTA (padrão 3306): ").strip() or "3306"
        return host, porta
    else:
        print()
        print("📖 Consulte o arquivo: COMO_DESCOBRIR_DADOS_MYSQL.md")
        print()
        input("Pressione Enter para sair...")
        sys.exit(1)

def perguntar_credenciais(host):
    print()
    print("=" * 70)
    print("🔐 CREDENCIAIS DE ACESSO")
    print("=" * 70)
    print()
    print(f"Host configurado: {host}")
    print()
    
    print("⚠️  VOCÊ JÁ TEM UM USUÁRIO CRIADO NO MYSQL?")
    print("1. Sim, já tenho usuário e senha")
    print("2. Não, preciso criar um usuário")
    print("3. Vou usar o root (não recomendado)")
    print()
    
    opcao = input("Escolha uma opção (1-3): ").strip()
    
    if opcao == "1":
        usuario = input("Digite o USUÁRIO: ").strip()
        senha = input("Digite a SENHA: ").strip()
        return usuario, senha
    elif opcao == "2":
        print()
        print("📝 Para criar um usuário, acesse o servidor e execute:")
        print()
        print("mysql -u root -p")
        print()
        print("CREATE USER 'via_user'@'%' IDENTIFIED BY 'SUA_SENHA';")
        print("CREATE DATABASE IF NOT EXISTS via_group_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print("GRANT ALL PRIVILEGES ON via_group_portal.* TO 'via_user'@'%';")
        print("FLUSH PRIVILEGES;")
        print("EXIT;")
        print()
        input("Após criar, pressione Enter para continuar...")
        
        usuario = input("Digite o USUÁRIO criado: ").strip()
        senha = input("Digite a SENHA: ").strip()
        return usuario, senha
    else:
        print()
        print("⚠️  Usar root não é recomendado em produção!")
        usuario = "root"
        senha = input("Digite a senha do root: ").strip()
        return usuario, senha

def perguntar_nome_banco():
    print()
    print("=" * 70)
    print("📦 NOME DO BANCO DE DADOS")
    print("=" * 70)
    print()
    
    print("O nome padrão é: via_group_portal")
    print()
    
    usar_padrao = input("Usar o padrão? (S/n): ").strip().lower()
    
    if usar_padrao == "n":
        return input("Digite o nome do banco de dados: ").strip()
    return "via_group_portal"

def salvar_config(host, porta, usuario, senha, banco):
    print()
    print("=" * 70)
    print("💾 SALVANDO CONFIGURAÇÕES")
    print("=" * 70)
    print()
    
    env_path = Path(__file__).parent / ".env"
    
    conteudo = f"""# ============================================
# CONFIGURAÇÕES DO BANCO DE DADOS MYSQL
# ============================================
# Gerado automaticamente em {__import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

# Host do MySQL (IP ou domínio do servidor)
DB_HOST={host}

# Porta do MySQL (padrão: 3306)
DB_PORT={porta}

# Usuário do banco de dados
DB_USER={usuario}

# Senha do usuário
DB_PASSWORD={senha}

# Nome do banco de dados
DB_NAME={banco}

# ============================================
# CONFIGURAÇÕES DA API
# ============================================

# Host da API (0.0.0.0 = acessível externamente)
API_HOST=0.0.0.0

# Porta da API
API_PORT=8000

# Modo debug (True para desenvolvimento, False para produção)
DEBUG=True

# ============================================
# SEGURANÇA
# ============================================

# Secret Key para JWT
SECRET_KEY={__import__('secrets').token_urlsafe(32)}
"""
    
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(conteudo)
    
    print("✅ Arquivo .env criado com sucesso!")
    print()
    print(f"📁 Local: {env_path}")
    print()
    print("📋 Resumo da configuração:")
    print(f"   Host: {host}")
    print(f"   Porta: {porta}")
    print(f"   Usuário: {usuario}")
    print(f"   Banco: {banco}")
    print()

def mostrar_proximos_passos():
    print("=" * 70)
    print("🚀 PRÓXIMOS PASSOS")
    print("=" * 70)
    print()
    print("1. Instale as dependências:")
    print("   pip install -r requirements.txt")
    print()
    print("2. Teste a conexão:")
    print("   python test_connection.py")
    print()
    print("3. Se sucesso, inicie a API:")
    print("   uvicorn main:app --reload")
    print()
    print("4. Acesse a documentação:")
    print("   http://localhost:8000/docs")
    print()
    print("=" * 70)
    print()

def main():
    limpar_tela()
    mostrar_cabecalho()
    
    try:
        # Coletar dados
        host, porta = perguntar_host()
        usuario, senha = perguntar_credenciais(host)
        banco = perguntar_nome_banco()
        
        # Salvar configuração
        salvar_config(host, porta, usuario, senha, banco)
        
        # Mostrar próximos passos
        mostrar_proximos_passos()
        
        input("Pressione Enter para sair...")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Processo cancelado pelo usuário.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
