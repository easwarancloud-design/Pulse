#!/usr/bin/env python3
"""
Simple Test Environment for Conversation API
Uses fakeredis and in-memory SQLite for testing without external dependencies
"""
import os
os.environ['ENVIRONMENT'] = 'test'  # Set test environment

import logging
import asyncio
import json
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Install fakeredis for better Redis simulation
try:
    import fakeredis
    import fakeredis.aioredis
    HAVE_FAKEREDIS = True
    logger.info("✅ Using fakeredis for Redis simulation")
except ImportError:
    HAVE_FAKEREDIS = False
    logger.info("ℹ️ fakeredis not available, using simple simulation")

import sqlite3
from contextlib import asynccontextmanager

class TestDatabaseManager:
    """Test database manager using in-memory databases"""
    
    def __init__(self):
        self._redis_client = None
        self._sqlite_conn = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize test databases"""
        logger.info("🔄 Initializing test databases...")
        
        # Setup Redis simulation
        if HAVE_FAKEREDIS:
            self._redis_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
        else:
            self._redis_client = SimpleRedisSimulation()
        
        # Setup SQLite
        self._sqlite_conn = sqlite3.connect(":memory:", check_same_thread=False)
        self._sqlite_conn.row_factory = sqlite3.Row
        self._setup_sqlite_schema()
        
        self.initialized = True
        logger.info("✅ Test databases initialized")
    
    def _setup_sqlite_schema(self):
        """Setup SQLite schema"""
        cursor = self._sqlite_conn.cursor()
        
        # Conversations table
        cursor.execute("""
            CREATE TABLE conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT,
                status TEXT DEFAULT 'active',
                metadata TEXT,
                message_count INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                last_message_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Messages table
        cursor.execute("""
            CREATE TABLE messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                message_type TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                token_count INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        """)
        
        # Reference links table
        cursor.execute("""
            CREATE TABLE reference_links (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                url TEXT NOT NULL,
                title TEXT,
                reference_type TEXT DEFAULT 'url',
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            )
        """)
        
        # User sessions table
        cursor.execute("""
            CREATE TABLE user_sessions (
                user_id TEXT PRIMARY KEY,
                session_id TEXT,
                last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
                active_conversation_id TEXT,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self._sqlite_conn.commit()
        cursor.close()
    
    @property
    def redis(self):
        """Get Redis client"""
        return self._redis_client
    
    @asynccontextmanager
    async def mysql_connection(self):
        """MySQL connection simulation"""
        cursor = self._sqlite_conn.cursor()
        
        class MockConn:
            async def commit(self):
                pass  # SQLite auto-commits
        
        class AsyncCursor:
            def __init__(self, sync_cursor, conn):
                self.cursor = sync_cursor
                self.conn = conn
                self.rowcount = 0
            
            async def execute(self, query, params=None):
                try:
                    if params:
                        self.cursor.execute(query, params)
                    else:
                        self.cursor.execute(query)
                    self.rowcount = self.cursor.rowcount
                    self.conn.commit()
                except Exception as e:
                    logger.error(f"SQL Error: {e}")
                    logger.error(f"Query: {query}")
                    logger.error(f"Params: {params}")
                    raise
            
            async def fetchone(self):
                row = self.cursor.fetchone()
                return dict(row) if row else None
            
            async def fetchall(self):
                rows = self.cursor.fetchall()
                return [dict(row) for row in rows]
        
        async_cursor = AsyncCursor(cursor, self._sqlite_conn)
        try:
            yield async_cursor, MockConn()
        finally:
            cursor.close()
    
    async def close(self):
        """Close connections"""
        if self._redis_client and hasattr(self._redis_client, 'close'):
            await self._redis_client.close()
        if self._sqlite_conn:
            self._sqlite_conn.close()

class SimpleRedisSimulation:
    """Simple Redis simulation for when fakeredis is not available"""
    
    def __init__(self):
        self.data = {}
    
    async def ping(self):
        return True
    
    async def hset(self, key, mapping=None, **kwargs):
        if key not in self.data:
            self.data[key] = {}
        if mapping:
            self.data[key].update(mapping)
        if kwargs:
            self.data[key].update(kwargs)
    
    async def hgetall(self, key):
        return self.data.get(key, {})
    
    async def set(self, key, value, ex=None):
        self.data[key] = value
    
    async def get(self, key):
        return self.data.get(key)
    
    async def expire(self, key, seconds):
        pass  # Simplified - no actual expiration
    
    async def exists(self, key):
        return key in self.data
    
    async def ttl(self, key):
        return -1  # No expiration tracking
    
    async def close(self):
        pass

# Test the setup
async def test_conversation_api_setup():
    """Test basic conversation operations"""
    logger.info("🧪 Testing Conversation API with Test Databases")
    logger.info("=" * 50)
    
    # Initialize test database
    db_manager = TestDatabaseManager()
    await db_manager.initialize()
    
    try:
        # Test 1: Redis operations
        logger.info("1. Testing Redis operations...")
        await db_manager.redis.set("test_key", "test_value")
        value = await db_manager.redis.get("test_key")
        assert value == "test_value"
        logger.info("✅ Redis operations working")
        
        # Test 2: MySQL operations
        logger.info("2. Testing MySQL operations...")
        async with db_manager.mysql_connection() as (cursor, conn):
            # Insert test conversation
            conv_id = f"conv_{uuid.uuid4()}"
            await cursor.execute(
                "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                (conv_id, "test_user", "Test Conversation")
            )
            
            # Fetch conversation
            await cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
            row = await cursor.fetchone()
            
            assert row is not None
            assert row['title'] == 'Test Conversation'
            logger.info("✅ MySQL operations working")
        
        # Test 3: Message operations  
        logger.info("3. Testing message operations...")
        async with db_manager.mysql_connection() as (cursor, conn):
            # Insert test message
            msg_id = f"msg_{uuid.uuid4()}"
            await cursor.execute(
                "INSERT INTO messages (id, conversation_id, message_type, content) VALUES (?, ?, ?, ?)",
                (msg_id, conv_id, "user", "Hello, this is a test message")
            )
            
            # Fetch message
            await cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
            row = await cursor.fetchone()
            
            assert row is not None
            assert row['content'] == 'Hello, this is a test message'
            logger.info("✅ Message operations working")
        
        # Test 4: Redis title caching simulation
        logger.info("4. Testing Redis title caching...")
        title_key = "user:test_user:titles"
        title_data = {conv_id: json.dumps({"title": "Test Conversation", "updated_at": datetime.now().timestamp()})}
        await db_manager.redis.hset(title_key, mapping=title_data)
        
        cached_titles = await db_manager.redis.hgetall(title_key)
        assert conv_id in cached_titles
        logger.info("✅ Redis title caching working")
        
        logger.info("\n🎉 ALL TESTS PASSED! Conversation API setup is working!")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        raise
    finally:
        await db_manager.close()

# Install fakeredis if needed
async def install_fakeredis():
    """Try to install fakeredis for better testing"""
    try:
        import subprocess
        logger.info("📦 Installing fakeredis for better Redis simulation...")
        result = subprocess.run([
            'python', '-m', 'pip', 'install', 'fakeredis'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            logger.info("✅ fakeredis installed successfully")
            return True
        else:
            logger.warning(f"⚠️ fakeredis installation failed: {result.stderr}")
            return False
    except Exception as e:
        logger.warning(f"⚠️ Could not install fakeredis: {e}")
        return False

async def main():
    """Main function"""
    # Try to install fakeredis if not available
    if not HAVE_FAKEREDIS:
        await install_fakeredis()
    
    # Run tests
    await test_conversation_api_setup()
    
    logger.info("\n🚀 Next Steps:")
    logger.info("1. The test environment is working!")
    logger.info("2. You can now test the conversation API endpoints")
    logger.info("3. To start the FastAPI server with test databases:")
    logger.info("   Set ENVIRONMENT=test and run: python -m uvicorn app:app --reload")

if __name__ == "__main__":
    asyncio.run(main())