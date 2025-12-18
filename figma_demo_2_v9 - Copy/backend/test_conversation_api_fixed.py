#!/usr/bin/env python3
"""
Test Script for Conversation API Endpoints - Modified for Test Environment
Tests all conversation storage and retrieval functionality
"""
import os
os.environ['ENVIRONMENT'] = 'test'  # Use test environment

import asyncio
import json
import logging
import requests
import time
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:8000"  
API_PREFIX = "/api/conversations"
TEST_USER_ID = "test_user_123" 
TEST_CONVERSATION_TITLE = "Test Conversation - API Testing"

def make_request(method, endpoint, **kwargs):
    """Helper function to make HTTP requests with proper error handling"""
    url = f"{BASE_URL}{API_PREFIX}{endpoint}"
    try:
        response = requests.request(method, url, timeout=30, **kwargs)
        logger.debug(f"{method.upper()} {url} -> {response.status_code}")
        return response
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection failed to {url} - Is server running?")
        return None
    except Exception as e:
        logger.error(f"Request failed: {e}")
        return None

async def test_health_check():
    """Test the health check endpoint"""
    logger.info("🏥 Testing health check endpoint...")
    response = make_request("GET", "/health")
    
    if response and response.status_code == 200:
        logger.info(f"✅ Health check passed: {response.json()}")
        return True
    else:
        if response:
            logger.error(f"❌ Health check failed: {response.status_code} - {response.text}")
        return False

async def test_create_conversation():
    """Test creating a new conversation"""
    logger.info("📝 Testing create conversation endpoint...")
    payload = {
        "user_id": TEST_USER_ID,
        "title": TEST_CONVERSATION_TITLE,
        "summary": "This is a test conversation for API validation",
        "metadata": {"test": True, "created_by": "test_script"}
    }
    
    response = make_request("POST", "/", json=payload)
    
    if response and response.status_code == 201:
        conversation = response.json()
        logger.info(f"✅ Created conversation ID: {conversation['id']}")
        return conversation['id']
    else:
        if response:
            logger.error(f"❌ Failed to create conversation: {response.status_code} - {response.text}")
        return None

async def test_add_messages(conversation_id):
    """Test adding messages to a conversation"""
    logger.info("💬 Testing add messages endpoint...")
    messages = [
        {
            "conversation_id": conversation_id,
            "message_type": "user",
            "content": "Hello, this is a test message from the user",
            "metadata": {"test": True},
            "token_count": 25
        },
        {
            "conversation_id": conversation_id,
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
            "conversation_id": conversation_id,
            "message_type": "user",
            "content": "Can you help me with conversation storage?",
            "token_count": 15
        },
        {
            "conversation_id": conversation_id,
            "message_type": "assistant", 
            "content": "Certainly! I can help you with conversation storage. Our system stores conversations in MySQL with Redis caching for fast retrieval.",
            "token_count": 45
        }
    ]
    
    message_ids = []
    for i, message_data in enumerate(messages):
        response = make_request("POST", f"/{conversation_id}/messages", json=message_data)
        
        if response and response.status_code == 201:
            message = response.json()
            message_ids.append(message['id'])
            logger.info(f"✅ Added message {i+1}: {message['id']}")
        else:
            if response:
                logger.error(f"❌ Failed to add message {i+1}: {response.status_code} - {response.text}")
    
    logger.info(f"📊 Added {len(message_ids)} out of {len(messages)} messages")
    return message_ids

async def test_get_conversation(conversation_id):
    """Test retrieving a conversation with all messages"""
    logger.info("🔍 Testing get conversation endpoint...")
    response = make_request("GET", f"/{conversation_id}", params={"include_messages": "true"})
    
    if response and response.status_code == 200:
        conversation = response.json()
        logger.info(f"✅ Retrieved conversation: '{conversation['title']}'")
        logger.info(f"📊 Message count: {len(conversation.get('messages', []))}")
        
        # Print first message content for verification
        messages = conversation.get('messages', [])
        if messages:
            first_msg = messages[0]
            logger.info(f"💬 First message: {first_msg['content'][:50]}...")
            
        return conversation
    else:
        if response:
            logger.error(f"❌ Failed to get conversation: {response.status_code} - {response.text}")
        return None

async def test_search_conversations():
    """Test searching conversations by title"""
    logger.info("🔎 Testing search conversations endpoint...")
    params = {
        "user_id": TEST_USER_ID,
        "query": "Test Conversation",
        "limit": 10
    }
    response = make_request("GET", "/search/", params=params)
    
    if response and response.status_code == 200:
        search_results = response.json()
        logger.info(f"✅ Search found {len(search_results['conversations'])} conversations")
        logger.info(f"📊 Search source: {search_results['source']}")
        return search_results
    else:
        if response:
            logger.error(f"❌ Search failed: {response.status_code} - {response.text}")
        return None

async def test_get_user_conversations():
    """Test getting all conversations for a user"""
    logger.info("👤 Testing get user conversations endpoint...")
    response = make_request("GET", f"/user/{TEST_USER_ID}", params={"limit": 20, "offset": 0})
    
    if response and response.status_code == 200:
        conversations = response.json()
        logger.info(f"✅ User has {len(conversations)} conversations")
        return conversations
    else:
        if response:
            logger.error(f"❌ Failed to get user conversations: {response.status_code} - {response.text}")
        return None

async def test_update_conversation(conversation_id):
    """Test updating conversation metadata"""
    logger.info("✏️ Testing update conversation endpoint...")
    update_data = {
        "title": "Updated Test Conversation Title",
        "summary": "Updated summary with new information",
        "metadata": {"test": True, "updated": True, "timestamp": datetime.now().isoformat()}
    }
    
    response = make_request("PUT", f"/{conversation_id}", json=update_data)
    
    if response and response.status_code == 200:
        conversation = response.json()
        logger.info(f"✅ Updated conversation title: '{conversation['title']}'")
        return conversation
    else:
        if response:
            logger.error(f"❌ Failed to update conversation: {response.status_code} - {response.text}")
        return None

async def test_bulk_add_messages(conversation_id):
    """Test bulk adding messages"""
    logger.info("📦 Testing bulk add messages endpoint...")
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
    
    response = make_request("POST", f"/{conversation_id}/messages/bulk", json=bulk_data)
    
    if response and response.status_code == 201:
        result = response.json()
        logger.info(f"✅ Bulk added {len(result['created_messages'])} messages")
        return result
    else:
        if response:
            logger.error(f"❌ Bulk add failed: {response.status_code} - {response.text}")
        return None

async def test_delete_conversation(conversation_id):
    """Test deleting a conversation"""
    logger.info("🗑️ Testing delete conversation endpoint...")
    response = make_request("DELETE", f"/{conversation_id}", params={"user_id": TEST_USER_ID})
    
    if response and response.status_code in [200, 204]:
        logger.info(f"✅ Successfully deleted conversation {conversation_id}")
        return True
    else:
        if response:
            logger.error(f"❌ Failed to delete conversation: {response.status_code} - {response.text}")
        return False

async def run_all_tests():
    """Run all API tests in sequence"""
    logger.info("🚀 Starting Comprehensive Conversation API Tests...")
    logger.info("=" * 60)
    
    # Track test results
    test_results = {}
    
    # Test 1: Health Check
    logger.info("\n📋 Test 1: Health Check")
    test_results['health'] = await test_health_check()
    if not test_results['health']:
        logger.error("❌ Health check failed - stopping tests")
        return test_results
    
    # Test 2: Create Conversation
    logger.info("\n📋 Test 2: Create Conversation")
    conversation_id = await test_create_conversation()
    test_results['create'] = conversation_id is not None
    if not conversation_id:
        logger.error("❌ Failed to create conversation - stopping tests")
        return test_results
    
    # Test 3: Add Messages
    logger.info("\n📋 Test 3: Add Individual Messages")
    message_ids = await test_add_messages(conversation_id)
    test_results['add_messages'] = len(message_ids) > 0
    
    # Test 4: Get Conversation
    logger.info("\n📋 Test 4: Get Conversation with Messages")
    conversation = await test_get_conversation(conversation_id)
    test_results['get_conversation'] = conversation is not None
    
    # Test 5: Update Conversation
    logger.info("\n📋 Test 5: Update Conversation")
    updated_conversation = await test_update_conversation(conversation_id)
    test_results['update_conversation'] = updated_conversation is not None
    
    # Test 6: Bulk Add Messages
    logger.info("\n📋 Test 6: Bulk Add Messages")
    bulk_result = await test_bulk_add_messages(conversation_id)
    test_results['bulk_add_messages'] = bulk_result is not None
    
    # Test 7: Search Conversations
    logger.info("\n📋 Test 7: Search Conversations")
    search_result = await test_search_conversations()
    test_results['search_conversations'] = search_result is not None
    
    # Test 8: Get User Conversations
    logger.info("\n📋 Test 8: Get User Conversations") 
    user_conversations = await test_get_user_conversations()
    test_results['get_user_conversations'] = user_conversations is not None
    
    # Test 9: Delete Conversation
    logger.info("\n📋 Test 9: Delete Conversation")
    delete_result = await test_delete_conversation(conversation_id)
    test_results['delete_conversation'] = delete_result
    
    # Test Summary
    logger.info("\n🎉 All API tests completed!")
    logger.info("=" * 60)
    
    # Print detailed summary
    logger.info("\n📊 Test Results Summary:")
    logger.info("-" * 40)
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name.ljust(25)} | {status}")
        if result:
            passed += 1
    
    logger.info("-" * 40)
    logger.info(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED! API is fully functional!")
    else:
        logger.info(f"⚠️ {total - passed} tests failed - check logs above for details")
    
    return test_results

async def main():
    """Main test function"""
    try:
        logger.info("🧪 Conversation API Test Suite")
        logger.info(f"🌐 Testing server at: {BASE_URL}{API_PREFIX}")
        logger.info(f"👤 Test user ID: {TEST_USER_ID}")
        logger.info("=" * 60)
        
        # Wait a moment for server to be ready
        await asyncio.sleep(1)
        
        test_results = await run_all_tests()
        
        # Return success if all tests passed
        all_passed = all(test_results.values())
        return 0 if all_passed else 1
        
    except Exception as e:
        logger.error(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)