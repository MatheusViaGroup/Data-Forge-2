#!/usr/bin/env python3
"""
Script de teste de conexão com o servidor Oracle Cloud MySQL
"""

import sys
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

print("=" * 70)
print("🧪 TESTE DE CONEXÃO - VIA GROUP PORTAL")
print("=" * 70)
print()

# Mostrar configuração
print("📋 Configuração Atual:")
print(f"   🌐 Host: {os.getenv('DB_HOST')}")
print(f"   🔌 Porta: {os.getenv('DB_PORT')}")
print(f"   👤 Usuário: {os.getenv('DB_USER')}")
print(f"   💾 Banco: {os.getenv('DB_NAME')}")
print()

print("⏳ Testando conexão com o servidor Oracle Cloud...")
print()

try:
    import mysql.connector
    from mysql.connector import Error
    
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        connect_timeout=10
    )
    
    if conn.is_connected():
        print("✅ SUCESSO! Conexão estabelecida!")
        print()
        
        cursor = conn.cursor()
        
        # Versão do MySQL
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"   📊 MySQL Versão: {version}")
        
        # Banco de dados atual
        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()[0]
        print(f"   💾 Banco de Dados: {database}")
        
        # Usuário atual
        cursor.execute("SELECT USER()")
        user = cursor.fetchone()[0]
        print(f"   👤 Usuário: {user}")
        
        # Verificar tabelas
        cursor.execute("SHOW TABLES")
        tabelas = cursor.fetchall()
        
        print()
        if tabelas:
            print(f"   📋 {len(tabelas)} tabela(s) encontrada(s):")
            for tabela in tabelas:
                print(f"      ✓ {tabela[0]}")
        else:
            print("   ⚠️  Nenhuma tabela encontrada!")
            print("   📝 Execute o script schema.sql para criar as tabelas.")
        
        cursor.close()
        conn.close()
        
        print()
        print("=" * 70)
        print("🎉 CONEXÃO CONFIGURADA COM SUCESSO!")
        print("=" * 70)
        print()
        print("🚀 PRÓXIMOS PASSOS:")
        print()
        print("1. Se as tabelas não existem, execute:")
        print("   mysql -h 160.238.195.221 -u via_user -p via_group_portal < schema.sql")
        print()
        print("2. Inicie a API:")
        print("   uvicorn main:app --reload")
        print()
        print("3. Acesse a documentação:")
        print("   http://localhost:8000/docs")
        print()
        print("4. Teste os endpoints:")
        print("   http://localhost:8000/health")
        print("   http://localhost:8000/db/test")
        print()
        
    else:
        print("❌ Falha na conexão!")
        
except Error as e:
    print("❌ ERRO NA CONEXÃO!")
    print()
    print(f"   Código do Erro: {e.errno}")
    print(f"   Mensagem: {e.msg}")
    print()
    print("🔧 POSSÍVEIS SOLUÇÕES:")
    print()
    print("1. Verifique se o MySQL está rodando no servidor:")
    print("   ssh root@160.238.195.221")
    print("   sudo systemctl status mysql")
    print()
    print("2. Verifique se a porta 3306 está liberada no firewall:")
    print("   No Oracle Cloud Console, verifique as Security Lists")
    print("   Adicione regra: Porta 3306 TCP")
    print()
    print("3. Verifique o bind-address no MySQL:")
    print("   ssh root@160.238.195.221")
    print("   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf")
    print("   bind-address = 0.0.0.0")
    print()
    print("4. Teste a conexão manualmente:")
    print("   mysql -h 160.238.195.221 -u via_user -p")
    print()
    sys.exit(1)
    
except Exception as e:
    print("❌ ERRO INESPERADO!")
    print()
    print(f"   {str(e)}")
    print()
    print("🔧 VERIFIQUE:")
    print("   - Se as dependências estão instaladas: pip install -r requirements.txt")
    print("   - Se o arquivo .env está configurado corretamente")
    print()
    sys.exit(1)
