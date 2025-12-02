import redis
from redis.asyncio import Redis
import pymysql

try:
    redis_client_async=Redis(host = "master.rediscluster.gywvad.use2.cache.amazonaws.com", port="6379", password="RedisCluster2025",decode_responses=True, ssl=True)
    # redis_client=redis.Redis(host = "master.rediscluster.gywvad.use2.cache.amazonaws.com", port="6379", password="RedisCluster2025",decode_responses=True, ssl=True)
except redis.exceptions.ConnectionError as e:
    print(f"redis connection error {e}")
    raise SystemExit("Failed to connect to redis") from e

try:
    redis_client=redis.Redis(host = "master.rediscluster.gywvad.use2.cache.amazonaws.com", port="6379", password="RedisCluster2025",decode_responses=True, ssl=True)
    
except redis.exceptions.ConnectionError as e:
    print(f"redis connection error {e}")
    raise SystemExit("Failed to connect to redis") from e

def get_db():
    return pymysql.connect(
        host="aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com",
        user="SRC_INTHELP_SLVR_WRITE",
        database="aamsqlapm1009705dev",
        password="S7vcCw96uY$o0f%W",
        ssl={"fake_flag_to_enable_tls": True}
    )
