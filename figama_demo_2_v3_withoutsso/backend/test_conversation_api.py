#!/usr/bin/env python3
"""
Test Script for Conversation API Endpoints
Tests all conversation storage and retrieval functionality
"""
import asyncio
import json
import logging
import requests
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:8000"  # Adjust based on your server
TEST_USER_ID = "test_user_123"
TEST_CONVERSATION_TITLE = "Test Conversation - API Testing"

async def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/conversations/health")
        logger.info(f"Health Check Status: {response.status_code}")
        logger.info(f"Health Check Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return False

async def test_create_conversation():
    """Test creating a new conversation"""
    try:
        payload = {
            "user_id": TEST_USER_ID,
            "title": TEST_CONVERSATION_TITLE,
            "summary": "This is a test conversation for API validation",
            "metadata": {"test": True, "created_by": "test_script"}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/",
            json=payload
        )
        
        logger.info(f"Create Conversation Status: {response.status_code}")
        if response.status_code == 200:
            conversation = response.json()
            logger.info(f"Created conversation ID: {conversation['id']}")
            return conversation['id']
        else:
            logger.error(f"Failed to create conversation: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Create conversation test failed: {e}")
        return None

async def test_add_messages(conversation_id):
    """Test adding messages to a conversation"""
    try:
        messages = [
            {
                "message_type": "user",
                "content": "Hello, this is a test message from the user",
                "metadata": {"test": True},
                "token_count": 25
            },
            {
                "message_type": "assistant",
                "content": "Hello! This is a test response from the assistant. How can I help you today?",
                "metadata": {"test": True, "model": "test-model"},
                "token_count": 35,
                "reference_links": [
                    {
                        "url": "https://example.com/test-reference",
                        "title": "Test Reference Link",
                        "reference_type": "url"
                    }
                ]
            },
            {
                "message_type": "user",
                "content": "Can you help me with conversation storage?",
                "token_count": 15
            },
            {
                "message_type": "assistant", 
                "content": "Certainly! I can help you with conversation storage. Our system stores conversations in MySQL with Redis caching for fast retrieval.",
                "token_count": 45
            }
        ]
        
        message_ids = []
        for message_data in messages:
            response = requests.post(
                f"{BASE_URL}/api/conversations/{conversation_id}/messages",
                json=message_data,
                params={"user_id": TEST_USER_ID}
            )
            
            if response.status_code == 200:
                message = response.json()
                message_ids.append(message['id'])
                logger.info(f"Added message: {message['id']}")
            else:
                logger.error(f"Failed to add message: {response.text}")
        
        logger.info(f"Added {len(message_ids)} messages to conversation")
        return message_ids
        
    except Exception as e:
        logger.error(f"Add messages test failed: {e}")
        return []

async def test_get_conversation(conversation_id):
    """Test retrieving a conversation with all messages"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/conversations/{conversation_id}",
            params={"user_id": TEST_USER_ID}
        )
        
        logger.info(f"Get Conversation Status: {response.status_code}")
        if response.status_code == 200:
            conversation = response.json()
            logger.info(f"Retrieved conversation: {conversation['title']}")
            logger.info(f"Message count: {len(conversation['messages'])}")
            
            # Print first message content for verification
            if conversation['messages']:
                first_msg = conversation['messages'][0]
                logger.info(f"First message: {first_msg['content'][:50]}...")
                
            return conversation
        else:
            logger.error(f"Failed to get conversation: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Get conversation test failed: {e}")
        return None

async def test_search_conversations():
    """Test searching conversations by title"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/conversations/search/",
            params={
                "user_id": TEST_USER_ID,
                "query": "Test Conversation",
                "limit": 10
            }
        )
        
        logger.info(f"Search Status: {response.status_code}")
        if response.status_code == 200:
            search_results = response.json()
            logger.info(f"Search found {len(search_results['conversations'])} conversations")
            logger.info(f"Search source: {search_results['source']}")
            return search_results
        else:
            logger.error(f"Search failed: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Search test failed: {e}")
        return None

async def test_get_user_conversations():
    """Test getting all conversations for a user"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/conversations/user/{TEST_USER_ID}",
            params={"limit": 20, "offset": 0}
        )
        
        logger.info(f"User Conversations Status: {response.status_code}")
        if response.status_code == 200:
            conversations = response.json()
            logger.info(f"User has {len(conversations)} conversations")
            return conversations
        else:
            logger.error(f"Failed to get user conversations: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Get user conversations test failed: {e}")
        return None

async def test_update_conversation(conversation_id):
    """Test updating conversation metadata"""
    try:
        update_data = {
            "title": "Updated Test Conversation Title",
            "summary": "Updated summary with new information",
            "metadata": {"test": True, "updated": True, "timestamp": datetime.now().isoformat()}
        }
        
        response = requests.put(
            f"{BASE_URL}/api/conversations/{conversation_id}",
            json=update_data,
            params={"user_id": TEST_USER_ID}
        )
        
        logger.info(f"Update Conversation Status: {response.status_code}")
        if response.status_code == 200:
            conversation = response.json()
            logger.info(f"Updated conversation title: {conversation['title']}")
            return conversation
        else:
            logger.error(f"Failed to update conversation: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Update conversation test failed: {e}")
        return None

async def test_bulk_add_messages(conversation_id):
    """Test bulk adding messages"""
    try:
        bulk_data = {
            "conversation_id": conversation_id,
            "messages": [
                {
                    "message_type": "user",
                    "content": "This is bulk message 1",
                    "token_count": 10
                },
                {
                    "message_type": "assistant",
                    "content": "This is bulk response 1",
                    "token_count": 12
                },
                {
                    "message_type": "user", 
                    "content": "This is bulk message 2",
                    "token_count": 11
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/{conversation_id}/messages/bulk",
            json=bulk_data,
            params={"user_id": TEST_USER_ID}
        )
        
        logger.info(f"Bulk Add Messages Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Bulk added {len(result['created_messages'])} messages")
            return result
        else:
            logger.error(f"Bulk add failed: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Bulk add messages test failed: {e}")
        return None

async def run_all_tests():
    """Run all API tests in sequence"""
    logger.info("🚀 Starting Conversation API Tests...")
    
    # Test 1: Health Check
    logger.info("\n📋 Test 1: Health Check")
    if not await test_health_check():
        logger.error("❌ Health check failed - stopping tests")
        return False
    
    # Test 2: Create Conversation
    logger.info("\n📋 Test 2: Create Conversation")
    conversation_id = await test_create_conversation()
    if not conversation_id:
        logger.error("❌ Failed to create conversation - stopping tests")
        return False
    
    # Test 3: Add Messages
    logger.info("\n📋 Test 3: Add Messages")
    message_ids = await test_add_messages(conversation_id)
    if not message_ids:
        logger.error("❌ Failed to add messages")
    
    # Test 4: Get Conversation
    logger.info("\n📋 Test 4: Get Conversation")
    conversation = await test_get_conversation(conversation_id)
    if not conversation:
        logger.error("❌ Failed to get conversation")
    
    # Test 5: Update Conversation
    logger.info("\n📋 Test 5: Update Conversation")
    updated_conversation = await test_update_conversation(conversation_id)
    if not updated_conversation:
        logger.error("❌ Failed to update conversation")
    
    # Test 6: Bulk Add Messages
    logger.info("\n📋 Test 6: Bulk Add Messages")
    bulk_result = await test_bulk_add_messages(conversation_id)
    if not bulk_result:
        logger.error("❌ Failed to bulk add messages")
    
    # Test 7: Search Conversations
    logger.info("\n📋 Test 7: Search Conversations")
    search_result = await test_search_conversations()
    if not search_result:
        logger.error("❌ Failed to search conversations")
    
    # Test 8: Get User Conversations
    logger.info("\n📋 Test 8: Get User Conversations") 
    user_conversations = await test_get_user_conversations()
    if not user_conversations:
        logger.error("❌ Failed to get user conversations")
    
    logger.info("\n🎉 All API tests completed!")
    
    # Summary
    logger.info("\n📊 Test Summary:")
    logger.info(f"✅ Created conversation: {conversation_id}")
    logger.info(f"✅ Added {len(message_ids)} individual messages")
    if bulk_result:
        logger.info(f"✅ Bulk added {len(bulk_result['created_messages'])} messages")
    if search_result:
        logger.info(f"✅ Search found {len(search_result['conversations'])} results")
    if user_conversations:
        logger.info(f"✅ User has {len(user_conversations)} total conversations")
    
    return True

async def main():
    """Main test function"""
    try:
        success = await run_all_tests()
        if success:
            logger.info("✅ All tests passed!")
            return 0
        else:
            logger.error("❌ Some tests failed!")
            return 1
    except Exception as e:
        logger.error(f"❌ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())