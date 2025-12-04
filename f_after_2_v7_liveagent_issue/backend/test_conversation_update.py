"""
Test script to verify conversation update works correctly
Run this to test the update functionality before deploying to EKS
"""
import asyncio
import logging
from services.conversation_service import conversation_service
from models.conversation import ConversationUpdate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_update():
    """Test updating a conversation title"""
    try:
        # Initialize the service
        await conversation_service.initialize()
        
        # Test parameters - CHANGE THESE to match your actual data
        conversation_id = "conv_8047f3cb-a64a-48ac-86b7-fdcce1910868"  # Use your actual conversation ID
        domain_id = "AG04333"  # Use your actual domain ID
        new_title = "Test Update Fixed"
        
        print(f"\n{'='*60}")
        print(f"Testing conversation update...")
        print(f"Conversation ID: {conversation_id}")
        print(f"Domain ID: {domain_id}")
        print(f"New Title: {new_title}")
        print(f"{'='*60}\n")
        
        # Create update data
        update_data = ConversationUpdate(title=new_title)
        
        # Perform the update
        result = await conversation_service.update_conversation(
            conversation_id=conversation_id,
            domain_id=domain_id,
            update_data=update_data
        )
        
        if result:
            print(f"\n✅ SUCCESS! Conversation updated:")
            print(f"   ID: {result.id}")
            print(f"   Title: {result.title}")
            print(f"   Domain ID: {result.domain_id}")
            print(f"   Updated At: {result.updated_at}")
            print(f"   Message Count: {result.message_count}")
        else:
            print(f"\n❌ FAILED! Conversation not found or update failed")
        
        print(f"\n{'='*60}\n")
        
    except Exception as e:
        print(f"\n❌ ERROR occurred:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_update())
