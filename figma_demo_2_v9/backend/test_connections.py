#!/usr/bin/env python3
"""
Connection Test Script for MySQL and Redis
Tests database connectivity using the credentials from the backend configuration
"""
import sys
import asyncio
import logging
import time
from datetime import datetime
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def test_redis_sync():
    """Test synchronous Redis connection"""
    logger.info("🔄 Testing Redis synchronous connection...")
    
    try:
        import redis
        
        # Use the same credentials as in database.py
        redis_client = redis.Redis(
            host="master.rediscluster.gywvad.use2.cache.amazonaws.com",
            port="6379",
            password="RedisCluster2025",
            decode_responses=True,
            ssl=True
        )
        
        # Test basic operations
        start_time = time.time()
        
        # Test ping
        pong = redis_client.ping()
        ping_time = time.time() - start_time
        
        if pong:
            logger.info(f"✅ Redis PING successful in {ping_time:.3f}s")
        
        # Test set/get operations
        test_key = f"connection_test:{int(time.time())}"
        test_value = {"timestamp": datetime.now().isoformat(), "test": True}
        
        # Set operation
        start_time = time.time()
        redis_client.set(test_key, json.dumps(test_value), ex=60)  # 60 second TTL
        set_time = time.time() - start_time
        logger.info(f"✅ Redis SET operation completed in {set_time:.3f}s")
        
        # Get operation
        start_time = time.time()
        retrieved_value = redis_client.get(test_key)
        get_time = time.time() - start_time
        
        if retrieved_value:
            parsed_value = json.loads(retrieved_value)
            logger.info(f"✅ Redis GET operation completed in {get_time:.3f}s")
            logger.info(f"   Retrieved data: {parsed_value}")
        
        # Test hash operations (used by conversation service)
        hash_key = f"hash_test:{int(time.time())}"
        start_time = time.time()
        redis_client.hset(hash_key, mapping={
            "field1": "value1",
            "field2": "value2",
            "timestamp": datetime.now().isoformat()
        })
        redis_client.expire(hash_key, 60)
        hash_time = time.time() - start_time
        logger.info(f"✅ Redis HSET operation completed in {hash_time:.3f}s")
        
        # Test hash retrieval
        start_time = time.time()
        hash_data = redis_client.hgetall(hash_key)
        hget_time = time.time() - start_time
        logger.info(f"✅ Redis HGETALL operation completed in {hget_time:.3f}s")
        logger.info(f"   Hash data: {hash_data}")
        
        # Cleanup test keys
        redis_client.delete(test_key, hash_key)
        logger.info("🧹 Cleaned up test keys")
        
        # Get Redis info
        info = redis_client.info()
        logger.info(f"📊 Redis Server Info:")
        logger.info(f"   Version: {info.get('redis_version', 'Unknown')}")
        logger.info(f"   Connected clients: {info.get('connected_clients', 'Unknown')}")
        logger.info(f"   Used memory: {info.get('used_memory_human', 'Unknown')}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False

async def test_redis_async():
    """Test asynchronous Redis connection"""
    logger.info("🔄 Testing Redis asynchronous connection...")
    
    try:
        from redis.asyncio import Redis
        
        # Use the same credentials as in database.py
        redis_client = Redis(
            host="master.rediscluster.gywvad.use2.cache.amazonaws.com",
            port="6379",
            password="RedisCluster2025",
            decode_responses=True,
            ssl=True
        )
        
        # Test basic operations
        start_time = time.time()
        
        # Test ping
        pong = await redis_client.ping()
        ping_time = time.time() - start_time
        
        if pong:
            logger.info(f"✅ Redis async PING successful in {ping_time:.3f}s")
        
        # Test async operations
        test_key = f"async_test:{int(time.time())}"
        test_data = {"async": True, "timestamp": datetime.now().isoformat()}
        
        start_time = time.time()
        await redis_client.set(test_key, json.dumps(test_data), ex=60)
        set_time = time.time() - start_time
        logger.info(f"✅ Redis async SET operation completed in {set_time:.3f}s")
        
        start_time = time.time()
        retrieved = await redis_client.get(test_key)
        get_time = time.time() - start_time
        
        if retrieved:
            logger.info(f"✅ Redis async GET operation completed in {get_time:.3f}s")
            logger.info(f"   Retrieved async data: {json.loads(retrieved)}")
        
        # Cleanup
        await redis_client.delete(test_key)
        await redis_client.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Redis async connection failed: {e}")
        return False

def test_mysql_sync():
    """Test synchronous MySQL connection"""
    logger.info("🔄 Testing MySQL synchronous connection...")
    
    try:
        import pymysql
        
        # Use the same credentials as in database.py
        connection = pymysql.connect(
            host="aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com",
            user="SRC_INTHELP_SLVR_WRITE",
            database="aamsqlapm1009705dev",
            password="S7vcCw96uY$o0f%W",
            ssl={"fake_flag_to_enable_tls": True}
        )
        
        logger.info("✅ MySQL connection established successfully")
        
        # Test basic operations
        with connection.cursor() as cursor:
            
            # Test server version
            start_time = time.time()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            version_time = time.time() - start_time
            logger.info(f"✅ MySQL version query completed in {version_time:.3f}s")
            logger.info(f"   MySQL Version: {version[0] if version else 'Unknown'}")
            
            # Test current database
            start_time = time.time()
            cursor.execute("SELECT DATABASE()")
            db_name = cursor.fetchone()
            db_time = time.time() - start_time
            logger.info(f"✅ Database query completed in {db_time:.3f}s")
            logger.info(f"   Current Database: {db_name[0] if db_name else 'Unknown'}")
            
            # Test current timestamp
            start_time = time.time()
            cursor.execute("SELECT NOW() as current_time")
            timestamp = cursor.fetchone()
            time_query_time = time.time() - start_time
            logger.info(f"✅ Timestamp query completed in {time_query_time:.3f}s")
            logger.info(f"   Server Time: {timestamp[0] if timestamp else 'Unknown'}")
            
            # Check if conversation tables exist
            start_time = time.time()
            cursor.execute("SHOW TABLES LIKE 'conversations'")
            conversations_table = cursor.fetchone()
            
            cursor.execute("SHOW TABLES LIKE 'messages'")
            messages_table = cursor.fetchone()
            
            cursor.execute("SHOW TABLES LIKE 'reference_links'")
            ref_links_table = cursor.fetchone()
            
            cursor.execute("SHOW TABLES LIKE 'user_sessions'")
            sessions_table = cursor.fetchone()
            
            tables_time = time.time() - start_time
            logger.info(f"✅ Table existence check completed in {tables_time:.3f}s")
            
            # Report table status
            tables_status = {
                'conversations': bool(conversations_table),
                'messages': bool(messages_table), 
                'reference_links': bool(ref_links_table),
                'user_sessions': bool(sessions_table)
            }
            
            logger.info("📋 Conversation system tables status:")
            for table, exists in tables_status.items():
                status = "✅ EXISTS" if exists else "❌ MISSING"
                logger.info(f"   {table}: {status}")
            
            if not all(tables_status.values()):
                logger.warning("⚠️  Some conversation tables are missing. Run setup_database.py to create them.")
            else:
                logger.info("🎉 All conversation system tables are present!")
                
                # Test a simple query on existing tables
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM conversations")
                    conv_count = cursor.fetchone()
                    logger.info(f"   Conversations count: {conv_count[0] if conv_count else 0}")
                    
                    cursor.execute("SELECT COUNT(*) as count FROM messages")
                    msg_count = cursor.fetchone()
                    logger.info(f"   Messages count: {msg_count[0] if msg_count else 0}")
                    
                except Exception as e:
                    logger.warning(f"⚠️  Could not query conversation tables: {e}")
            
            # Test connection pool simulation (multiple queries)
            start_time = time.time()
            for i in range(5):
                cursor.execute("SELECT 1")
                cursor.fetchone()
            pool_test_time = time.time() - start_time
            logger.info(f"✅ Connection pool simulation (5 queries) completed in {pool_test_time:.3f}s")
        
        connection.close()
        logger.info("🔌 MySQL connection closed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MySQL connection failed: {e}")
        return False

async def test_mysql_async():
    """Test asynchronous MySQL connection"""
    logger.info("🔄 Testing MySQL asynchronous connection...")
    
    try:
        import aiomysql
        
        # Create async connection pool
        pool = await aiomysql.create_pool(
            host="aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com",
            user="SRC_INTHELP_SLVR_WRITE",
            password="S7vcCw96uY$o0f%W",
            db="aamsqlapm1009705dev",
            minsize=1,
            maxsize=3,
            ssl={"fake_flag_to_enable_tls": True}
        )
        
        logger.info("✅ MySQL async connection pool created successfully")
        
        # Test async operations
        async with pool.acquire() as connection:
            async with connection.cursor() as cursor:
                
                # Test async query
                start_time = time.time()
                await cursor.execute("SELECT VERSION() as version, NOW() as current_time")
                result = await cursor.fetchone()
                async_query_time = time.time() - start_time
                
                logger.info(f"✅ MySQL async query completed in {async_query_time:.3f}s")
                logger.info(f"   Async result: Version={result[0]}, Time={result[1]}")
                
                # Test multiple concurrent-style queries
                start_time = time.time()
                for i in range(3):
                    await cursor.execute(f"SELECT {i+1} as test_number")
                    await cursor.fetchone()
                concurrent_test_time = time.time() - start_time
                logger.info(f"✅ Multiple async queries completed in {concurrent_test_time:.3f}s")
        
        pool.close()
        await pool.wait_closed()
        logger.info("🔌 MySQL async pool closed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MySQL async connection failed: {e}")
        return False

def test_conversation_service_imports():
    """Test if conversation service dependencies can be imported"""
    logger.info("🔄 Testing conversation service imports...")
    
    try:
        # Test if we can import our modules
        import sys
        import os
        
        # Add backend directory to path
        backend_path = os.path.dirname(os.path.abspath(__file__))
        if backend_path not in sys.path:
            sys.path.append(backend_path)
        
        # Try importing our modules
        from config.database import db_manager, RedisKeys
        logger.info("✅ Successfully imported database configuration")
        
        from models.conversation import ConversationCreate, MessageCreate
        logger.info("✅ Successfully imported conversation models")
        
        # Test RedisKeys functionality
        test_user_id = "test_user_123"
        redis_keys = {
            "user_conversations": RedisKeys.user_conversations(test_user_id),
            "conversation_titles": RedisKeys.conversation_titles(test_user_id),
            "user_session": RedisKeys.user_session(test_user_id)
        }
        
        logger.info("✅ Redis key generation working:")
        for key_name, key_value in redis_keys.items():
            logger.info(f"   {key_name}: {key_value}")
        
        # Test model creation
        test_conversation = ConversationCreate(
            user_id=test_user_id,
            title="Test Conversation",
            summary="This is a test"
        )
        logger.info(f"✅ ConversationCreate model works: {test_conversation.title}")
        
        test_message = MessageCreate(
            message_type="user",
            content="Test message content",
            token_count=15
        )
        logger.info(f"✅ MessageCreate model works: {test_message.message_type}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Import test failed: {e}")
        return False

async def run_all_tests():
    """Run all connection tests"""
    logger.info("🚀 Starting Database Connection Tests")
    logger.info("=" * 60)
    
    test_results = {
        "redis_sync": False,
        "redis_async": False,
        "mysql_sync": False,
        "mysql_async": False,
        "imports": False
    }
    
    # Test 1: Redis Sync
    logger.info("\n📡 REDIS SYNCHRONOUS CONNECTION TEST")
    logger.info("-" * 40)
    test_results["redis_sync"] = test_redis_sync()
    
    # Test 2: Redis Async
    logger.info("\n📡 REDIS ASYNCHRONOUS CONNECTION TEST")
    logger.info("-" * 40)
    test_results["redis_async"] = await test_redis_async()
    
    # Test 3: MySQL Sync
    logger.info("\n🗄️  MYSQL SYNCHRONOUS CONNECTION TEST")
    logger.info("-" * 40)
    test_results["mysql_sync"] = test_mysql_sync()
    
    # Test 4: MySQL Async
    logger.info("\n🗄️  MYSQL ASYNCHRONOUS CONNECTION TEST") 
    logger.info("-" * 40)
    test_results["mysql_async"] = await test_mysql_async()
    
    # Test 5: Service Imports
    logger.info("\n📦 CONVERSATION SERVICE IMPORT TEST")
    logger.info("-" * 40)
    test_results["imports"] = test_conversation_service_imports()
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 TEST RESULTS SUMMARY")
    logger.info("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name.upper().replace('_', ' ')}: {status}")
    
    logger.info("-" * 60)
    logger.info(f"TOTAL: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        logger.info("🎉 ALL TESTS PASSED! Your database connections are ready!")
        return 0
    else:
        logger.error(f"❌ {total_tests - passed_tests} test(s) failed. Please check your configuration.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(run_all_tests())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("\n⏹️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Test execution failed: {e}")
        sys.exit(1)