import asyncio
from redis.asyncio import Redis
import redis.exceptions

async def test_redis_connection():
    try:
        redis_client_async = Redis(
            host="master.rediscluster.gywvad.use2.cache.amazonaws.com",
            port=6379,
            password="RedisCluster2025",
            decode_responses=True,
            ssl=True
        )
        response = await redis_client_async.ping()
        if response:
            print("✅ Redis connection successful!")
        else:
            print("❌ Redis ping failed.")
    except redis.exceptions.ConnectionError as e:
        print(f"Redis connection error: {e}")
        raise SystemExit("Failed to connect to Redis") from e
    finally:
        await redis_client_async.close()

# Run the async test
asyncio.run(test_redis_connection())