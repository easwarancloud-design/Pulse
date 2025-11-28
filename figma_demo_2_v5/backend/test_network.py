#!/usr/bin/env python3
"""
Network Connectivity Test for Database Servers
Tests basic TCP connectivity to Redis and MySQL servers
"""
import socket
import logging
from contextlib import closing

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Server configurations
REDIS_HOST = "master.rediscluster.gywvad.use2.cache.amazonaws.com"
REDIS_PORT = 6379

MYSQL_HOST = "aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com"
MYSQL_PORT = 3306

def test_tcp_connection(host, port, service_name, timeout=10):
    """
    Test TCP connectivity to a host and port
    """
    logger.info(f"🔌 Testing {service_name} connectivity to {host}:{port}")
    
    try:
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            
            if result == 0:
                logger.info(f"✅ {service_name} TCP connection successful!")
                return True
            else:
                logger.error(f"❌ {service_name} TCP connection failed - Error code: {result}")
                return False
                
    except socket.gaierror as e:
        logger.error(f"❌ {service_name} DNS resolution failed: {e}")
        return False
    except socket.timeout:
        logger.error(f"❌ {service_name} connection timeout after {timeout} seconds")
        return False
    except Exception as e:
        logger.error(f"❌ {service_name} connection error: {e}")
        return False

def test_dns_resolution(host, service_name):
    """
    Test DNS resolution for a hostname
    """
    logger.info(f"🔍 Testing DNS resolution for {service_name}: {host}")
    
    try:
        ip = socket.gethostbyname(host)
        logger.info(f"✅ {service_name} DNS resolved to: {ip}")
        return True, ip
    except socket.gaierror as e:
        logger.error(f"❌ {service_name} DNS resolution failed: {e}")
        return False, None

def main():
    """
    Main test function
    """
    logger.info("🚀 Starting Network Connectivity Tests")
    logger.info("=" * 55)
    
    results = []
    
    # Test DNS resolution
    logger.info("\n🔍 DNS RESOLUTION TESTS")
    logger.info("-" * 30)
    
    redis_dns_ok, redis_ip = test_dns_resolution(REDIS_HOST, "Redis")
    mysql_dns_ok, mysql_ip = test_dns_resolution(MYSQL_HOST, "MySQL")
    
    # Test TCP connectivity
    logger.info("\n🔌 TCP CONNECTIVITY TESTS")
    logger.info("-" * 30)
    
    if redis_dns_ok:
        redis_tcp_ok = test_tcp_connection(REDIS_HOST, REDIS_PORT, "Redis")
        results.append(("Redis TCP", redis_tcp_ok))
    else:
        results.append(("Redis TCP", False))
    
    if mysql_dns_ok:
        mysql_tcp_ok = test_tcp_connection(MYSQL_HOST, MYSQL_PORT, "MySQL")
        results.append(("MySQL TCP", mysql_tcp_ok))
    else:
        results.append(("MySQL TCP", False))
    
    # Additional network information
    logger.info("\n🌐 NETWORK INFORMATION")
    logger.info("-" * 30)
    
    try:
        # Get local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        logger.info(f"📍 Local IP address: {local_ip}")
    except Exception as e:
        logger.error(f"❌ Could not determine local IP: {e}")
    
    # Test internet connectivity
    internet_ok = test_tcp_connection("8.8.8.8", 53, "Internet (Google DNS)", timeout=5)
    results.append(("Internet", internet_ok))
    
    # Summary
    logger.info("\n" + "=" * 55)
    logger.info("📊 TEST RESULTS SUMMARY")
    logger.info("=" * 55)
    
    passed_tests = 0
    total_tests = len(results)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{test_name}: {status}")
        if passed:
            passed_tests += 1
    
    logger.info("-" * 55)
    logger.info(f"TOTAL: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        logger.info("✅ All network tests passed!")
        return 0
    else:
        logger.error(f"❌ {total_tests - passed_tests} test(s) failed.")
        
        # Provide troubleshooting guidance
        logger.info("\n🔧 TROUBLESHOOTING TIPS:")
        if not internet_ok:
            logger.info("• No internet connectivity - check your network connection")
        else:
            logger.info("• Internet connectivity OK but database servers unreachable")
            logger.info("• Check if you're connected to the correct VPN (Atlanta)")
            logger.info("• Verify firewall rules allow outbound connections to ports 6379 and 3306")
            logger.info("• AWS Security Groups might need to allow your IP address")
            logger.info("• Contact network/cloud admin if issues persist")
        
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)