"""
Database configuration and connection management for conversation storage
Supports both development (local) and production (AWS) environments
"""
import redis
from redis.asyncio import Redis
import pymysql
from pymysql.cursors import DictCursor
import aiomysql
import asyncio
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

# Load environment variables
env_file = '.env'
if os.path.exists(env_file):
    load_dotenv(env_file)

# Configure logging
logger = logging.getLogger(__name__)

# Production AWS Configuration (always)
REDIS_HOST = "master.rediscluster.gywvad.use2.cache.amazonaws.com"
REDIS_PORT = 6379
REDIS_PASSWORD = "RedisCluster2025"
REDIS_SSL = True

MYSQL_HOST = "aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com"
MYSQL_PORT = 3306
MYSQL_USER = "SRC_INTHELP_SLVR_WRITE"
MYSQL_PASSWORD = "S7vcCw96uY$o0f%W"
MYSQL_DATABASE = "aamsqlapm1009705dev"
MYSQL_SSL = {"fake_flag_to_enable_tls": True}

logger.info("🚀 Using PRODUCTION configuration (AWS databases)")

# Connection Pool Configuration
MYSQL_POOL_SIZE = int(os.getenv('MYSQL_POOL_SIZE', '5'))
REDIS_TTL_SECONDS = int(os.getenv('REDIS_TTL_SECONDS', '900'))  # 15 minutes

class DatabaseManager:
    """Manages database connections and connection pools"""
    
    def __init__(self):
        self._redis_client = None
        self._redis_async_client = None
        self._mysql_pool = None
        
    async def initialize(self):
        """Initialize async database connections"""
        try:
            # Initialize Redis async client
            self._redis_async_client = Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                decode_responses=True,
                ssl=REDIS_SSL
            )
            
            # Test Redis connection
            await self._redis_async_client.ping()
            logger.info("Redis async connection established successfully")
            
            # Initialize MySQL connection pool
            mysql_config = {
                'host': MYSQL_HOST,
                'port': MYSQL_PORT,
                'user': MYSQL_USER,
                'password': MYSQL_PASSWORD,
                'db': MYSQL_DATABASE,
                'minsize': 2,
                'maxsize': MYSQL_POOL_SIZE,
                'cursorclass': aiomysql.DictCursor,
                'autocommit': True
            }
            
            # Add SSL for production
            if MYSQL_SSL:
                mysql_config['ssl'] = MYSQL_SSL
            
            self._mysql_pool = await aiomysql.create_pool(**mysql_config)
            logger.info("MySQL connection pool created successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def close(self):
        """Close all database connections"""
        if self._redis_async_client:
            await self._redis_async_client.close()
        if self._mysql_pool:
            self._mysql_pool.close()
            await self._mysql_pool.wait_closed()
    
    @property
    def redis(self) -> Redis:
        """Get async Redis client"""
        if not self._redis_async_client:
            raise RuntimeError("Redis client not initialized")
        return self._redis_async_client
    
    @asynccontextmanager
    async def mysql_connection(self):
        """Get MySQL connection from pool"""
        if not self._mysql_pool:
            raise RuntimeError("MySQL pool not initialized")
        
        async with self._mysql_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                yield cursor, conn

# Global database manager instance
db_manager = DatabaseManager()

# Synchronous Redis client for non-async operations (compatibility with existing code)
def get_sync_redis_client():
    """Get synchronous Redis client"""
    try:
        return redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=True,
            ssl=REDIS_SSL
        )
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Sync Redis connection error: {e}")
        raise

# Synchronous MySQL connection (compatibility with existing code)
def get_sync_mysql_connection():
    """Get synchronous MySQL connection"""
    try:
        mysql_config = {
            'host': MYSQL_HOST,
            'port': MYSQL_PORT,
            'user': MYSQL_USER,
            'database': MYSQL_DATABASE,
            'password': MYSQL_PASSWORD,
            'cursorclass': DictCursor
        }
        
        # Add SSL for production
        if MYSQL_SSL:
            mysql_config['ssl'] = MYSQL_SSL
            
        return pymysql.connect(**mysql_config)
    except Exception as e:
        logger.error(f"MySQL connection error: {e}")
        raise

# Redis key patterns for conversation data
class RedisKeys:
    """Redis key patterns for conversation storage"""
    
    @staticmethod
    def user_conversations(domain_id: str) -> str:
        """Key for domain's conversation list"""
        return f"domain:{domain_id}:conversations"
    
    @staticmethod
    def conversation_titles(domain_id: str) -> str:
        """Key for domain's conversation titles (for search)"""
        return f"domain:{domain_id}:titles"
    
    @staticmethod
    def conversation_cache(conversation_id: str) -> str:
        """Key for full conversation cache"""
        return f"conversation:{conversation_id}"
    
    @staticmethod
    def conversation_messages(conversation_id: str) -> str:
        """Key for conversation messages cache"""
        return f"conversation:{conversation_id}:messages"
    
    @staticmethod
    def user_session(domain_id: str) -> str:
        """Key for domain session activity"""
        return f"domain:{domain_id}:session"
    
    @staticmethod
    def user_activity(domain_id: str) -> str:
        """Key for domain activity tracking"""
        return f"domain:{domain_id}:activity"
    
    @staticmethod
    def message_feedback(conversation_id: str, message_id: str) -> str:
        """Key for message feedback cache"""
        return f"conversation:{conversation_id}:message:{message_id}:feedback"
    
    @staticmethod
    def search_results(domain_id: str, query: str) -> str:
        """Key for search results cache"""
        return f"domain:{domain_id}:search:{query}"