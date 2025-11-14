"""
Database configuration and connection management for conversation storage
Uses existing Redis and MySQL credentials from agent_dbs.py
"""
import redis
from redis.asyncio import Redis
import pymysql
from pymysql.cursors import DictCursor
import aiomysql
import asyncio
from contextlib import asynccontextmanager
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Redis Configuration
REDIS_HOST = "master.rediscluster.gywvad.use2.cache.amazonaws.com"
REDIS_PORT = "6379"
REDIS_PASSWORD = "RedisCluster2025"

# MySQL Configuration
MYSQL_HOST = "aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com"
MYSQL_USER = "SRC_INTHELP_SLVR_WRITE"
MYSQL_PASSWORD = "S7vcCw96uY$o0f%W"
MYSQL_DATABASE = "aamsqlapm1009705dev"

# Connection Pool Configuration
MYSQL_POOL_SIZE = 10
REDIS_TTL_SECONDS = 900  # 15 minutes

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
                ssl=True
            )
            
            # Test Redis connection
            await self._redis_async_client.ping()
            logger.info("Redis async connection established successfully")
            
            # Initialize MySQL connection pool
            self._mysql_pool = await aiomysql.create_pool(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                db=MYSQL_DATABASE,
                minsize=5,
                maxsize=MYSQL_POOL_SIZE,
                cursorclass=aiomysql.DictCursor,
                ssl={"fake_flag_to_enable_tls": True},
                autocommit=True
            )
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
            ssl=True
        )
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Sync Redis connection error: {e}")
        raise

# Synchronous MySQL connection (compatibility with existing code)
def get_sync_mysql_connection():
    """Get synchronous MySQL connection"""
    try:
        return pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            database=MYSQL_DATABASE,
            password=MYSQL_PASSWORD,
            ssl={"fake_flag_to_enable_tls": True},
            cursorclass=DictCursor
        )
    except Exception as e:
        logger.error(f"MySQL connection error: {e}")
        raise

# Redis key patterns for conversation data
class RedisKeys:
    """Redis key patterns for conversation storage"""
    
    @staticmethod
    def user_conversations(user_id: str) -> str:
        """Key for user's conversation list"""
        return f"user:{user_id}:conversations"
    
    @staticmethod
    def conversation_titles(user_id: str) -> str:
        """Key for user's conversation titles (for search)"""
        return f"user:{user_id}:titles"
    
    @staticmethod
    def conversation_cache(conversation_id: str) -> str:
        """Key for full conversation cache"""
        return f"conversation:{conversation_id}"
    
    @staticmethod
    def conversation_messages(conversation_id: str) -> str:
        """Key for conversation messages cache"""
        return f"conversation:{conversation_id}:messages"
    
    @staticmethod
    def user_session(user_id: str) -> str:
        """Key for user session activity"""
        return f"user:{user_id}:session"