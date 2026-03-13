import mysql.connector
from mysql.connector import Error, pooling
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Database:
    _instance: Optional['Database'] = None
    _connection_pool = None
    _pool_name = "via_group_pool"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def _get_pool_config(self) -> Dict[str, Any]:
        """Retorna configuração do pool de conexões"""
        return {
            "pool_name": self._pool_name,
            "pool_size": int(os.getenv("DB_POOL_SIZE", 5)),
            "pool_reset_session": True,
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", 3306)),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASSWORD", ""),
            "database": os.getenv("DB_NAME", "via_group_portal"),
            "charset": os.getenv("DB_CHARSET", "utf8mb4"),
            "use_unicode": True,
            "autocommit": True,
        }
    
    def connect(self):
        """Estabelece conexão com o banco de dados MySQL usando pool"""
        try:
            if self._connection_pool is not None:
                return self._connection_pool
            
            pool_config = self._get_pool_config()
            
            logger.info(f"Tentando conectar ao MySQL em {pool_config['host']}:{pool_config['port']}")
            
            self._connection_pool = pooling.MySQLConnectionPool(**pool_config)
            
            # Testar conexão
            conn = self._connection_pool.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            
            logger.info("Conexão com MySQL estabelecida com sucesso!")
            return self._connection_pool
            
        except Error as e:
            logger.error(f"Erro ao conectar ao banco de dados: {e}")
            self._connection_pool = None
            return None
        except Exception as e:
            logger.error(f"Erro inesperado ao conectar: {e}")
            self._connection_pool = None
            return None
    
    def get_connection(self):
        """Obtém uma conexão do pool"""
        pool = self.connect()
        if pool:
            try:
                return pool.get_connection()
            except Error as e:
                logger.error(f"Erro ao obter conexão do pool: {e}")
                # Tentar reconectar
                self._connection_pool = None
                return self.connect()
        return None
    
    def disconnect(self):
        """Fecha todas as conexões do pool"""
        if self._connection_pool:
            logger.info("Fechando pool de conexões...")
            # MySQL Connector não tem método direto para fechar pool
            # As conexões serão fechadas quando o processo terminar
            self._connection_pool = None
    
    def execute_query(self, query: str, params: tuple = None) -> Optional[Any]:
        """
        Executa uma query e retorna o resultado
        
        Args:
            query: SQL query
            params: Parâmetros para a query
            
        Returns:
            Resultado da query ou None em caso de erro
        """
        conn = None
        cursor = None
        
        try:
            conn = self.get_connection()
            if not conn:
                logger.error("Não foi possível obter conexão")
                return None
            
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            # Para SELECT, retorna resultados
            if query.strip().upper().startswith('SELECT'):
                resultados = cursor.fetchall()
                return resultados
            
            # Para INSERT, UPDATE, DELETE
            conn.commit()
            return cursor.rowcount
            
        except Error as e:
            logger.error(f"Erro ao executar query: {e}")
            if conn:
                conn.rollback()
            return None
        except Exception as e:
            logger.error(f"Erro inesperado: {e}")
            if conn:
                conn.rollback()
            return None
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()
    
    def execute_many(self, query: str, params_list: list) -> Optional[int]:
        """
        Executa uma query múltiplas vezes com diferentes parâmetros
        
        Args:
            query: SQL query
            params_list: Lista de tuplas com parâmetros
            
        Returns:
            Número de linhas afetadas ou None em caso de erro
        """
        conn = None
        cursor = None
        
        try:
            conn = self.get_connection()
            if not conn:
                return None
            
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            conn.commit()
            return cursor.rowcount
            
        except Error as e:
            logger.error(f"Erro ao executar queries múltiplas: {e}")
            if conn:
                conn.rollback()
            return None
        except Exception as e:
            logger.error(f"Erro inesperado: {e}")
            if conn:
                conn.rollback()
            return None
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Testa a conexão e retorna informações
        
        Returns:
            Dict com status e informações da conexão
        """
        try:
            pool = self.connect()
            if not pool:
                return {
                    "status": "error",
                    "message": "Não foi possível conectar ao banco de dados"
                }
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Obter versão do MySQL
            cursor.execute("SELECT VERSION() as version")
            version = cursor.fetchone()['version']
            
            # Obter banco de dados atual
            cursor.execute("SELECT DATABASE() as database")
            database = cursor.fetchone()['database']
            
            cursor.close()
            conn.close()
            
            return {
                "status": "connected",
                "message": "Conexão estabelecida com sucesso",
                "mysql_version": version,
                "database": database,
                "host": os.getenv("DB_HOST"),
                "port": os.getenv("DB_PORT")
            }
            
        except Error as e:
            return {
                "status": "error",
                "message": str(e)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro inesperado: {str(e)}"
            }


# Instância singleton do banco de dados
db = Database()
