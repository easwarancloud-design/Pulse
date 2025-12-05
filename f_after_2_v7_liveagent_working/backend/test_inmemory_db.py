#!/usr/bin/env python3
"""
In-Memory Database Testing Setup
Uses fakeredis and sqlite for testing conversation API without external dependencies
"""
import sqlite3
import logging
from contextlib import asynccontextmanager
import asyncio
import json
from datetime import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class InMemoryRedis:
    """Simple in-memory Redis simulation"""
    
    def __init__(self):
        self.data = {}
        self.expirations = {}
    
    def hset(self, key, mapping=None, **kwargs):
        """Set hash fields"""
        if key not in self.data:
            self.data[key] = {}
        
        if mapping:
            self.data[key].update(mapping)
        if kwargs:
            self.data[key].update(kwargs)
    
    def hgetall(self, key):
        """Get all hash fields"""
        return self.data.get(key, {})
    
    def hget(self, key, field):
        """Get single hash field"""
        return self.data.get(key, {}).get(field)
    
    def set(self, key, value, ex=None):
        """Set key-value"""
        self.data[key] = value
        if ex:
            self.expirations[key] = datetime.now().timestamp() + ex
    
    def get(self, key):
        """Get value"""
        # Check expiration
        if key in self.expirations:
            if datetime.now().timestamp() > self.expirations[key]:
                if key in self.data:
                    del self.data[key]
                del self.expirations[key]
                return None
        return self.data.get(key)
    
    def expire(self, key, seconds):
        """Set expiration"""
        if key in self.data:
            self.expirations[key] = datetime.now().timestamp() + seconds
    
    def ping(self):
        """Ping test"""
        return True
    
    async def ping_async(self):
        """Async ping test"""
        return True
    
    def exists(self, key):
        """Check if key exists"""
        return key in self.data
    
    def ttl(self, key):
        """Get TTL"""
        if key in self.expirations:
            remaining = self.expirations[key] - datetime.now().timestamp()
            return int(remaining) if remaining > 0 else -1
        return -1
    
    def close(self):
        """Close connection"""
        pass

class InMemoryMySQL:
    """Simple SQLite-based MySQL simulation"""
    
    def __init__(self, db_path=":memory:"):
        self.db_path = db_path
        self.connection = None
        self._setup_database()
    
    def _setup_database(self):
        """Setup SQLite database with conversation tables"""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row  # Dict-like access
        
        # Create tables
        cursor = self.connection.cursor()
        
        # Conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT,
                status TEXT DEFAULT 'active',
                metadata TEXT,
                message_count INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                last_message_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                message_type TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                token_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        """)
        
        # Reference links table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reference_links (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                url TEXT NOT NULL,
                title TEXT,
                reference_type TEXT DEFAULT 'url',
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            )
        """)
        
        # User sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                user_id TEXT PRIMARY KEY,
                session_id TEXT,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active_conversation_id TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.connection.commit()
        logger.info("✅ In-memory SQLite database setup completed")
    
    @asynccontextmanager
    async def cursor(self):
        """Async context manager for database cursor"""
        cursor = self.connection.cursor()
        try:
            yield cursor
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
        finally:
            cursor.close()
    
    def execute(self, query, params=None):
        """Execute query"""
        cursor = self.connection.cursor()
        try:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            self.connection.commit()
            return cursor
        except Exception:
            self.connection.rollback()
            raise
    
    def fetchone(self, cursor):
        """Fetch one result as dict"""
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def fetchall(self, cursor):
        """Fetch all results as list of dicts"""
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    
    def close(self):
        """Close connection"""
        if self.connection:
            self.connection.close()

class InMemoryDatabaseManager:
    """In-memory database manager for testing"""
    
    def __init__(self):
        self.redis = InMemoryRedis()
        self.mysql = InMemoryMySQL()
        self.initialized = False
    
    async def initialize(self):
        """Initialize connections"""
        logger.info("🔄 Initializing in-memory databases...")
        self.initialized = True
        logger.info("✅ In-memory databases initialized")
    
    async def close(self):
        """Close connections"""
        self.redis.close()
        self.mysql.close()
    
    @asynccontextmanager
    async def mysql_connection(self):
        """MySQL connection context manager"""
        async with self.mysql.cursor() as cursor:
            
            class MockConnection:
                def __init__(self, mysql_instance):
                    self.mysql = mysql_instance
                
                async def commit(self):
                    pass  # Auto-commit in SQLite
            
            yield cursor, MockConnection(self.mysql)

# Test the in-memory setup
async def test_in_memory_setup():
    """Test the in-memory database setup"""
    logger.info("🧪 Testing In-Memory Database Setup")
    logger.info("=" * 40)
    
    # Initialize
    db_manager = InMemoryDatabaseManager()
    await db_manager.initialize()
    
    # Test Redis
    logger.info("Testing in-memory Redis...")
    try:
        await db_manager.redis.ping_async()
        db_manager.redis.set("test_key", "test_value", ex=300)
        value = db_manager.redis.get("test_key")
        assert value == "test_value"
        logger.info("✅ Redis simulation working")
    except Exception as e:
        logger.error(f"❌ Redis test failed: {e}")
    
    # Test MySQL
    logger.info("Testing in-memory MySQL...")
    try:
        async with db_manager.mysql_connection() as (cursor, conn):
            await cursor.execute("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)", 
                                ("test_conv", "test_user", "Test Conversation"))
            
            await cursor.execute("SELECT * FROM conversations WHERE id = ?", ("test_conv",))
            row = await cursor.fetchone()
            
            if row and row['title'] == 'Test Conversation':
                logger.info("✅ MySQL simulation working")
            else:
                logger.error("❌ MySQL test failed: No data returned")
    except Exception as e:
        logger.error(f"❌ MySQL test failed: {e}")
    
    await db_manager.close()
    logger.info("🎉 In-memory database tests completed")

if __name__ == "__main__":
    asyncio.run(test_in_memory_setup())