#!/usr/bin/env python3
"""
Database Setup Script for Conversation Storage System
Runs the SQL schema to create tables, indexes, procedures, and initial data
"""
import asyncio
import logging
from config.database import get_sync_mysql_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup_database():
    """
    Initialize the conversation storage database schema
    """
    try:
        # Read the schema file
        with open('database/schema.sql', 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Connect to MySQL
        connection = get_sync_mysql_connection()
        
        try:
            with connection.cursor() as cursor:
                # Split the schema into individual statements
                # Handle MySQL delimiter changes
                statements = []
                current_statement = ""
                in_procedure = False
                
                for line in schema_sql.split('\n'):
                    line = line.strip()
                    
                    # Skip comments and empty lines
                    if not line or line.startswith('--') or line.startswith('/*'):
                        continue
                    
                    # Handle delimiter changes
                    if line.upper() == 'DELIMITER //':
                        in_procedure = True
                        continue
                    elif line.upper() == 'DELIMITER ;':
                        in_procedure = False
                        if current_statement.strip():
                            statements.append(current_statement.strip())
                            current_statement = ""
                        continue
                    
                    current_statement += line + "\n"
                    
                    # End of statement detection
                    if not in_procedure and line.endswith(';'):
                        statements.append(current_statement.strip())
                        current_statement = ""
                    elif in_procedure and line.endswith(' //'):
                        statements.append(current_statement.strip())
                        current_statement = ""
                
                # Add any remaining statement
                if current_statement.strip():
                    statements.append(current_statement.strip())
                
                # Execute each statement
                for i, statement in enumerate(statements):
                    if not statement or statement.isspace():
                        continue
                    
                    try:
                        logger.info(f"Executing statement {i+1}/{len(statements)}")
                        cursor.execute(statement)
                        connection.commit()
                        logger.info(f"✓ Statement {i+1} executed successfully")
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            logger.warning(f"⚠ Statement {i+1}: {e}")
                        else:
                            logger.error(f"✗ Failed to execute statement {i+1}: {e}")
                            logger.error(f"Statement: {statement[:200]}...")
                            raise
            
            logger.info("🎉 Database schema setup completed successfully!")
            
        finally:
            connection.close()
    
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        raise

async def verify_tables():
    """
    Verify that all tables were created successfully
    """
    try:
        connection = get_sync_mysql_connection()
        
        expected_tables = [
            'conversations',
            'messages', 
            'reference_links',
            'user_sessions'
        ]
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW TABLES")
                existing_tables = [row[0] for row in cursor.fetchall()]
                
                logger.info("📋 Verifying table creation...")
                
                for table in expected_tables:
                    if table in existing_tables:
                        logger.info(f"✓ Table '{table}' exists")
                    else:
                        logger.error(f"✗ Table '{table}' missing")
                        return False
                
                # Check table structures
                for table in expected_tables:
                    cursor.execute(f"DESCRIBE {table}")
                    columns = cursor.fetchall()
                    logger.info(f"📄 Table '{table}' has {len(columns)} columns")
                
                logger.info("🎉 All tables verified successfully!")
                return True
                
        finally:
            connection.close()
    
    except Exception as e:
        logger.error(f"❌ Table verification failed: {e}")
        return False

async def main():
    """
    Main setup function
    """
    logger.info("🚀 Starting conversation database setup...")
    
    try:
        await setup_database()
        await verify_tables()
        logger.info("✅ Database setup completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)