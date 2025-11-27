#!/usr/bin/env python3
"""
Direct API Test - Tests conversation endpoints directly without HTTP server
Uses the test database environment directly
"""
import os
os.environ['ENVIRONMENT'] = 'test'

import asyncio
import json
import uuid
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Import test environment and services
from test_environment import TestDatabaseManager
from services.conversation_service import ConversationService
from models.conversation import (
    ConversationCreate, MessageCreate, ConversationUpdate,
    BulkMessageCreate
)

class DirectAPITester:
    """Direct API testing without HTTP server"""
    
    def __init__(self):
        self.db_manager = TestDatabaseManager()
        self.service = ConversationService()
        self.test_user_id = "test_user_123"
        self.conversation_id = None
        
    async def initialize(self):
        """Initialize test environment"""
        logger.info("🔧 Initializing direct API test environment...")
        await self.db_manager.initialize()
        
        # Patch the service to use our test database
        self.service.redis_client = self.db_manager.redis
        self.service.mysql_connection = self.db_manager.mysql_connection
        
        logger.info("✅ Test environment initialized")

    async def test_create_conversation(self):
        """Test creating a conversation"""
        logger.info("📝 Testing create conversation...")
        
        try:
            conversation_data = ConversationCreate(
                user_id=self.test_user_id,
                title="Test Conversation - Direct API Test",
                summary="A test conversation created via direct API testing",
                metadata={"test": True, "method": "direct_api"}
            )
            
            result = await self.service.create_conversation(conversation_data)
            self.conversation_id = result.id
            
            logger.info(f"✅ Created conversation: {result.id}")
            logger.info(f"   Title: {result.title}")
            logger.info(f"   User: {result.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Create conversation failed: {e}")
            return False

    async def test_add_message(self):
        """Test adding a message"""
        logger.info("💬 Testing add message...")
        
        try:
            message_data = MessageCreate(
                conversation_id=self.conversation_id,
                message_type="user",
                content="Hello, this is a test message for direct API testing!",
                metadata={"test": True},
                token_count=25
            )
            
            result = await self.service.add_message(message_data)
            
            logger.info(f"✅ Added message: {result.id}")
            logger.info(f"   Content: {result.content[:50]}...")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Add message failed: {e}")
            return None

    async def test_add_assistant_message(self):
        """Test adding an assistant message with reference links"""
        logger.info("🤖 Testing add assistant message with references...")
        
        try:
            message_data = MessageCreate(
                conversation_id=self.conversation_id,
                message_type="assistant",
                content="Hello! I can help you with conversation storage. Our system uses MySQL with Redis caching for optimal performance.",
                metadata={"test": True, "model": "test-assistant"},
                token_count=35,
                reference_links=[
                    {
                        "url": "https://example.com/conversation-storage-guide",
                        "title": "Conversation Storage Best Practices",
                        "reference_type": "documentation"
                    },
                    {
                        "url": "https://example.com/redis-caching",
                        "title": "Redis Caching for Chat Applications",
                        "reference_type": "tutorial"
                    }
                ]
            )
            
            result = await self.service.add_message(message_data)
            
            logger.info(f"✅ Added assistant message: {result.id}")
            logger.info(f"   Reference links: {len(result.reference_links)}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Add assistant message failed: {e}")
            return None

    async def test_get_conversation(self):
        """Test retrieving a conversation"""
        logger.info("🔍 Testing get conversation...")
        
        try:
            result = await self.service.get_conversation(
                self.conversation_id, 
                self.test_user_id, 
                include_messages=True
            )
            
            logger.info(f"✅ Retrieved conversation: {result.title}")
            logger.info(f"   Messages: {len(result.messages)}")
            logger.info(f"   Status: {result.status}")
            logger.info(f"   Token count: {result.total_tokens}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Get conversation failed: {e}")
            return False

    async def test_update_conversation(self):
        """Test updating a conversation"""
        logger.info("✏️ Testing update conversation...")
        
        try:
            update_data = ConversationUpdate(
                title="Updated Test Conversation - Direct API",
                summary="Updated summary via direct API testing",
                metadata={"test": True, "updated": True, "timestamp": datetime.now().isoformat()}
            )
            
            result = await self.service.update_conversation(
                self.conversation_id,
                self.test_user_id,
                update_data
            )
            
            logger.info(f"✅ Updated conversation: {result.title}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Update conversation failed: {e}")
            return False

    async def test_search_conversations(self):
        """Test searching conversations"""
        logger.info("🔎 Testing search conversations...")
        
        try:
            results = await self.service.search_conversations(
                self.test_user_id,
                "Test Conversation",
                limit=10
            )
            
            logger.info(f"✅ Search completed")
            logger.info(f"   Found conversations: {len(results.conversations)}")
            logger.info(f"   Search source: {results.source}")
            
            # Log titles of found conversations
            for conv in results.conversations:
                logger.info(f"   - {conv.title}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Search conversations failed: {e}")
            return False

    async def test_get_user_conversations(self):
        """Test getting user conversations"""
        logger.info("👤 Testing get user conversations...")
        
        try:
            conversations = await self.service.get_user_conversations(
                self.test_user_id,
                limit=20,
                offset=0
            )
            
            logger.info(f"✅ Retrieved user conversations")
            logger.info(f"   Total conversations: {len(conversations)}")
            
            for conv in conversations:
                logger.info(f"   - {conv.title} (Messages: {conv.message_count})")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Get user conversations failed: {e}")
            return False

    async def test_bulk_add_messages(self):
        """Test bulk adding messages"""
        logger.info("📦 Testing bulk add messages...")
        
        try:
            bulk_data = BulkMessageCreate(
                conversation_id=self.conversation_id,
                messages=[
                    MessageCreate(
                        conversation_id=self.conversation_id,
                        message_type="user",
                        content="This is bulk message 1",
                        token_count=10
                    ),
                    MessageCreate(
                        conversation_id=self.conversation_id,
                        message_type="assistant",
                        content="This is bulk response 1",
                        token_count=12
                    ),
                    MessageCreate(
                        conversation_id=self.conversation_id,
                        message_type="user",
                        content="This is bulk message 2",
                        token_count=11
                    )
                ]
            )
            
            result = await self.service.bulk_add_messages(bulk_data, self.test_user_id)
            
            logger.info(f"✅ Bulk added messages")
            logger.info(f"   Created: {len(result.created_messages)} messages")
            logger.info(f"   Total tokens: {result.total_tokens}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Bulk add messages failed: {e}")
            return False

    async def test_session_management(self):
        """Test session management"""
        logger.info("🔐 Testing session management...")
        
        try:
            # Update user session
            session = await self.service.update_user_session(
                self.test_user_id,
                active_conversation_id=self.conversation_id,
                metadata={"test_session": True}
            )
            
            logger.info(f"✅ Updated user session")
            logger.info(f"   User: {session.user_id}")
            logger.info(f"   Active conversation: {session.active_conversation_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Session management failed: {e}")
            return False

    async def run_all_tests(self):
        """Run all direct API tests"""
        logger.info("🚀 Starting Direct Conversation API Tests")
        logger.info("=" * 60)
        
        test_results = {}
        
        try:
            # Initialize
            await self.initialize()
            
            # Test 1: Create Conversation
            logger.info("\n📋 Test 1: Create Conversation")
            test_results['create_conversation'] = await self.test_create_conversation()
            
            if not test_results['create_conversation']:
                logger.error("❌ Cannot continue without conversation")
                return test_results
            
            # Test 2: Add User Message
            logger.info("\n📋 Test 2: Add User Message")
            user_msg_id = await self.test_add_message()
            test_results['add_user_message'] = user_msg_id is not None
            
            # Test 3: Add Assistant Message
            logger.info("\n📋 Test 3: Add Assistant Message with References")
            assistant_msg_id = await self.test_add_assistant_message()
            test_results['add_assistant_message'] = assistant_msg_id is not None
            
            # Test 4: Get Conversation
            logger.info("\n📋 Test 4: Get Conversation with Messages")
            test_results['get_conversation'] = await self.test_get_conversation()
            
            # Test 5: Update Conversation
            logger.info("\n📋 Test 5: Update Conversation")
            test_results['update_conversation'] = await self.test_update_conversation()
            
            # Test 6: Bulk Add Messages
            logger.info("\n📋 Test 6: Bulk Add Messages")
            test_results['bulk_add_messages'] = await self.test_bulk_add_messages()
            
            # Test 7: Search Conversations
            logger.info("\n📋 Test 7: Search Conversations")
            test_results['search_conversations'] = await self.test_search_conversations()
            
            # Test 8: Get User Conversations
            logger.info("\n📋 Test 8: Get User Conversations")
            test_results['get_user_conversations'] = await self.test_get_user_conversations()
            
            # Test 9: Session Management
            logger.info("\n📋 Test 9: Session Management")
            test_results['session_management'] = await self.test_session_management()
            
        except Exception as e:
            logger.error(f"❌ Test suite failed: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            # Cleanup
            try:
                await self.db_manager.close()
                logger.info("🧹 Test environment cleaned up")
            except:
                pass
        
        # Print Results
        logger.info("\n🎉 Direct API Tests Completed!")
        logger.info("=" * 60)
        
        logger.info("\n📊 Test Results Summary:")
        logger.info("-" * 50)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"{test_name.ljust(30)} | {status}")
            if result:
                passed += 1
        
        logger.info("-" * 50)
        logger.info(f"Total: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("🎉 ALL TESTS PASSED! Conversation API is fully functional!")
        else:
            logger.info(f"⚠️ {total - passed} tests failed")
        
        return test_results

async def main():
    """Main test function"""
    tester = DirectAPITester()
    test_results = await tester.run_all_tests()
    
    # Return appropriate exit code
    all_passed = all(test_results.values())
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())