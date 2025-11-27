#!/usr/bin/env python3
"""
Local Database Setup Instructions and Alternative Setup
"""
import logging
import sys
import subprocess
import os

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"✅ Docker found: {result.stdout.strip()}")
            return True
        else:
            logger.error("❌ Docker command failed")
            return False
    except FileNotFoundError:
        logger.error("❌ Docker not found in PATH")
        return False
    except subprocess.TimeoutExpired:
        logger.error("❌ Docker command timed out")
        return False
    except Exception as e:
        logger.error(f"❌ Docker check failed: {e}")
        return False

def check_mysql():
    """Check if MySQL is available locally"""
    try:
        result = subprocess.run(['mysql', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"✅ MySQL found: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    except Exception:
        pass
    
    logger.error("❌ MySQL not found locally")
    return False

def check_redis():
    """Check if Redis is available locally"""
    try:
        result = subprocess.run(['redis-server', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"✅ Redis found: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    except Exception:
        pass
    
    logger.error("❌ Redis not found locally")
    return False

def provide_installation_instructions():
    """Provide installation instructions based on what's missing"""
    logger.info("\n🔧 INSTALLATION INSTRUCTIONS")
    logger.info("=" * 50)
    
    logger.info("\n📋 Option 1: Install Docker Desktop (Recommended)")
    logger.info("1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/")
    logger.info("2. Install and restart your computer")
    logger.info("3. Start Docker Desktop")
    logger.info("4. Run: docker compose up -d")
    
    logger.info("\n📋 Option 2: Install Individual Components")
    logger.info("REDIS:")
    logger.info("- Download Redis for Windows: https://github.com/MicrosoftArchive/redis/releases")
    logger.info("- Or use Chocolatey: choco install redis-64")
    logger.info("- Start with: redis-server.exe")
    
    logger.info("\nMYSQL:")
    logger.info("- Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/")
    logger.info("- Or download XAMPP: https://www.apachefriends.org/download.html")
    logger.info("- Create database 'conversation_dev'")
    logger.info("- Create user 'pulse_user' with password 'pulse_password'")
    
    logger.info("\n📋 Option 3: Use Cloud Alternatives")
    logger.info("- Redis: Use Redis Cloud free tier")
    logger.info("- MySQL: Use PlanetScale, Railway, or MySQL Cloud")

def create_manual_setup_script():
    """Create a manual setup script for databases"""
    script_content = """
-- Manual MySQL Setup Script
-- Run this in MySQL Workbench or command line

-- Create database
CREATE DATABASE IF NOT EXISTS conversation_dev 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create user  
CREATE USER IF NOT EXISTS 'pulse_user'@'localhost' IDENTIFIED BY 'pulse_password';
CREATE USER IF NOT EXISTS 'pulse_user'@'%' IDENTIFIED BY 'pulse_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON conversation_dev.* TO 'pulse_user'@'localhost';
GRANT ALL PRIVILEGES ON conversation_dev.* TO 'pulse_user'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE conversation_dev;

-- Show success message
SELECT 'Database setup completed successfully!' as Status;
"""
    
    with open('setup_mysql_manual.sql', 'w') as f:
        f.write(script_content)
    
    logger.info("📄 Created 'setup_mysql_manual.sql' for manual MySQL setup")

def main():
    """Main function"""
    logger.info("🚀 Checking Local Database Setup")
    logger.info("=" * 40)
    
    docker_available = check_docker()
    mysql_available = check_mysql()
    redis_available = check_redis()
    
    if docker_available:
        logger.info("\n✅ Docker is available! You can use docker-compose.yml")
        logger.info("Run: docker compose up -d")
        logger.info("Then run the connection test")
    elif mysql_available and redis_available:
        logger.info("\n✅ Both MySQL and Redis are available locally!")
        logger.info("Make sure they're running and configured correctly")
    else:
        logger.info("\n❌ Local databases not fully available")
        provide_installation_instructions()
        create_manual_setup_script()
    
    logger.info("\n🔍 Next Steps:")
    logger.info("1. Install missing components above")
    logger.info("2. Run: python test_connections.py")
    logger.info("3. Run: python setup_database.py")
    logger.info("4. Run: python test_conversation_api.py")

if __name__ == "__main__":
    main()