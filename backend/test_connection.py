#!/usr/bin/env python3
"""
Script de teste de conexão com o banco de dados MySQL
Execute este script para verificar se a configuração está correta
"""

import sys
import os

# Adicionar diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import db
from dotenv import load_dotenv

def main():
    print("=" * 60)
    print("TESTE DE CONEXÃO MYSQL - VIA GROUP PORTAL")
    print("=" * 60)
    
    # Carregar variáveis de ambiente
    load_dotenv()
    
    print("\n📋 Configuração Atual:")
    print(f"   Host: {os.getenv('DB_HOST', 'Não configurado')}")
    print(f"   Porta: {os.getenv('DB_PORT', 'Não configurado')}")
    print(f"   Usuário: {os.getenv('DB_USER', 'Não configurado')}")
    print(f"   Banco de Dados: {os.getenv('DB_NAME', 'Não configurado')}")
    print(f"   Charset: {os.getenv('DB_CHARSET', 'utf8mb4')}")
    print()
    
    # Verificar se todas as variáveis estão configuradas
    required_vars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print("❌ ERRO: Variáveis de ambiente faltando:")
        for var in missing:
            print(f"   - {var}")
        print("\nEdite o arquivo .env e preencha todas as configurações.")
        return 1
    
    print("🔍 Testando conexão...")
    print()
    
    # Testar conexão
    result = db.test_connection()
    
    if result["status"] == "connected":
        print("✅ SUCESSO! Conexão estabelecida!")
        print()
        print(f"   📊 Versão do MySQL: {result.get('mysql_version', 'N/A')}")
        print(f"   💾 Banco de Dados: {result.get('database', 'N/A')}")
        print(f"   🌐 Host: {result.get('host', 'N/A')}:{result.get('port', 'N/A')}")
        print()
        
        # Testar se as tabelas existem
        print("📋 Verificando tabelas...")
        tabelas = db.execute_query("SHOW TABLES")
        
        if tabelas:
            print(f"   ✅ {len(tabelas)} tabela(s) encontrada(s):")
            for tabela in tabelas:
                nome_tabela = list(tabela.values())[0]
                print(f"      - {nome_tabela}")
            
            # Contar registros
            print("\n📊 Registros nas tabelas:")
            for tabela in tabelas:
                nome_tabela = list(tabela.values())[0]
                count = db.execute_query(f"SELECT COUNT(*) as total FROM {nome_tabela}")
                if count:
                    print(f"      - {nome_tabela}: {count[0]['total']} registro(s)")
        else:
            print("   ⚠️  Nenhuma tabela encontrada!")
            print("   Execute o script schema.sql para criar as tabelas.")
        
        print()
        print("=" * 60)
        print("CONEXÃO CONFIGURADA COM SUCESSO! 🎉")
        print("=" * 60)
        return 0
        
    else:
        print("❌ ERRO NA CONEXÃO!")
        print()
        print(f"   Mensagem: {result.get('message', 'Erro desconhecido')}")
        print()
        print("Possíveis soluções:")
        print("   1. Verifique se o MySQL está rodando no servidor")
        print("   2. Confirme as credenciais no arquivo .env")
        print("   3. Verifique se a porta 3306 está liberada no firewall")
        print("   4. Teste a conexão manualmente:")
        print(f"      mysql -h {os.getenv('DB_HOST')} -P {os.getenv('DB_PORT')} -u {os.getenv('DB_USER')} -p")
        print()
        print("   5. Se usar SSH tunneling:")
        print(f"      ssh -L 3306:localhost:3306 usuario@seu-servidor.com")
        print()
        return 1


if __name__ == "__main__":
    exit(main())
