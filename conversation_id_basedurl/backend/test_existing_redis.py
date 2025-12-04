#!/usr/bin/env python3
"""
Test existing app Redis connections
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.agent_dbs import redis_client, redis_client_async
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def test_existing_redis():
    """Test the existing Redis connections from agent_dbs.py"""
    logger.info("🔄 Testing existing app Redis connections...")
    
    # Test sync Redis
    try:
        logger.info("Testing sync Redis client...")
        result = redis_client.ping()
        logger.info(f"✅ Sync Redis PING: {result}")
    except Exception as e:
        logger.error(f"❌ Sync Redis failed: {e}")
    
    # Test async Redis  
    try:
        logger.info("Testing async Redis client...")
        result = await redis_client_async.ping()
        logger.info(f"✅ Async Redis PING: {result}")
    except Exception as e:
        logger.error(f"❌ Async Redis failed: {e}")

if __name__ == "__main__":
    logger.info("🚀 Testing Existing App Redis")
    logger.info("=" * 35)
    asyncio.run(test_existing_redis())