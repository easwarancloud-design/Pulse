#!/usr/bin/env python3
"""
Quick Test of Conversation API - Manual Server Test
"""
import os
os.environ['ENVIRONMENT'] = 'test'

import asyncio
import httpx
import json
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def test_api_endpoints():
    """Test API endpoints with manual server"""
    base_url = "http://localhost:8000"
    
    logger.info("🧪 Testing Conversation API Endpoints")
    logger.info("=" * 50)
    
    try:
        async with httpx.AsyncClient() as client:
            # Test 1: Health check
            logger.info("1. Testing health endpoint...")
            try:
                response = await client.get(f"{base_url}/")
                assert response.status_code == 200
                data = response.json()
                logger.info(f"✅ Health response: {data}")
            except Exception as e:
                logger.error(f"❌ Health check failed: {e}")
                return
            
            # Test 2: Create conversation
            logger.info("2. Testing create conversation...")
            try:
                conversation_data = {
                    "user_id": "test_user_123",
                    "title": "Test Conversation from Quick Test",
                    "summary": "A test conversation created via quick test",
                    "metadata": {"source": "quick_test", "test_id": str(uuid.uuid4())}
                }
                
                response = await client.post(
                    f"{base_url}/conversations",
                    json=conversation_data
                )
                
                if response.status_code == 201:
                    data = response.json()
                    conv_id = data['id']
                    logger.info(f"✅ Created conversation: {conv_id}")
                    
                    # Test 3: Add message
                    logger.info("3. Testing add message...")
                    message_data = {
                        "conversation_id": conv_id,
                        "message_type": "user",
                        "content": "Hello, this is a test message!",
                        "metadata": {"timestamp": "2024-01-01T12:00:00Z"},
                        "token_count": 15
                    }
                    
                    response = await client.post(
                        f"{base_url}/conversations/{conv_id}/messages",
                        json=message_data
                    )
                    
                    if response.status_code == 201:
                        msg_data = response.json()
                        logger.info(f"✅ Added message: {msg_data['id']}")
                        
                        # Test 4: Get messages
                        logger.info("4. Testing get messages...")
                        response = await client.get(f"{base_url}/conversations/{conv_id}/messages")
                        
                        if response.status_code == 200:
                            messages = response.json()
                            logger.info(f"✅ Retrieved {len(messages['messages'])} messages")
                        else:
                            logger.error(f"❌ Get messages failed: {response.status_code} - {response.text}")
                    else:
                        logger.error(f"❌ Add message failed: {response.status_code} - {response.text}")
                else:
                    logger.error(f"❌ Create conversation failed: {response.status_code} - {response.text}")
                    
            except Exception as e:
                logger.error(f"❌ Conversation test failed: {e}")
                
        logger.info("\n🎉 API tests completed!")
        logger.info("\nTo test manually:")
        logger.info("1. Start server: python test_app.py")
        logger.info("2. Run this test: python quick_api_test.py")
        
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        logger.info("\nMake sure the server is running:")
        logger.info("python test_app.py")

if __name__ == "__main__":
    asyncio.run(test_api_endpoints())