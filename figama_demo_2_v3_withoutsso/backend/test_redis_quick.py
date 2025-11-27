#!/usr/bin/env python3
"""
Quick Redis Connection Test
"""
import redis
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_redis_quick():
    """Quick Redis connection test"""
    try:
        logger.info("🔄 Testing Redis connection...")
        
        client = redis.Redis(
            host="master.rediscluster.gywvad.use2.cache.amazonaws.com",
            port="6379", 
            password="RedisCluster2025",
            decode_responses=True,
            ssl=True,
            socket_connect_timeout=5
        )
        
        # Try to ping
        result = client.ping()
        logger.info(f"✅ Redis PING successful: {result}")
        
        # Try a simple operation
        client.set("test_key", "test_value", ex=10)
        value = client.get("test_key")
        logger.info(f"✅ Redis SET/GET successful: {value}")
        
        return True
        
    except redis.ConnectionError as e:
        logger.error(f"❌ Redis Connection Error: {e}")
        return False
    except redis.TimeoutError as e:
        logger.error(f"❌ Redis Timeout Error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Redis General Error: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Quick Redis Test")
    logger.info("=" * 30)
    
    if test_redis_quick():
        logger.info("✅ REDIS IS WORKING!")
    else:
        logger.error("❌ REDIS IS NOT WORKING!")
        logger.info("\n🔧 Possible fixes:")
        logger.info("1. Check Windows Firewall settings")
        logger.info("2. Run Python as Administrator") 
        logger.info("3. Contact IT about port 6379 access")
        logger.info("4. Try different VPN endpoint")