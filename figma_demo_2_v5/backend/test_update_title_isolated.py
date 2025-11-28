"""
Isolated test for conversation title update
Tests the exact API endpoint that's failing in production
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_update_isolated():
    """Test just the database update without service layer"""
    from config.database import db_manager
    import logging
    
    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    try:
        # Initialize database
        await db_manager.initialize()
        
        # Test data - CHANGE THESE to your actual values
        conversation_id = "conv_8047f3cb-a64a-48ac-86b7-fdcce1910868"
        domain_id = "AG04333"
        new_title = "Test Update Fixed - Direct SQL"
        
        print(f"\n{'='*70}")
        print(f"Testing Direct SQL Update")
        print(f"{'='*70}")
        print(f"Conversation ID: {conversation_id}")
        print(f"Domain ID: {domain_id}")
        print(f"New Title: {new_title}")
        print(f"{'='*70}\n")
        
        # Step 1: Check if conversation exists
        print("Step 1: Checking if conversation exists...")
        async with db_manager.mysql_connection() as (cursor, conn):
            await cursor.execute("""
                SELECT id, domain_id, title, status, created_at, updated_at
                FROM wl_conversations 
                WHERE id = %s AND domain_id = %s
            """, (conversation_id, domain_id))
            
            existing = await cursor.fetchone()
            
            if not existing:
                print("❌ ERROR: Conversation not found in database!")
                print(f"   Searched for: id={conversation_id}, domain_id={domain_id}")
                
                # Show what conversations exist for this domain
                await cursor.execute("""
                    SELECT id, title, domain_id, status 
                    FROM wl_conversations 
                    WHERE domain_id = %s 
                    LIMIT 5
                """, (domain_id,))
                all_convs = await cursor.fetchall()
                
                if all_convs:
                    print(f"\n   Found {len(all_convs)} conversations for domain {domain_id}:")
                    for conv in all_convs:
                        print(f"   - {conv['id']}: {conv['title']} (status: {conv['status']})")
                else:
                    print(f"\n   No conversations found for domain {domain_id}")
                
                return
            
            print(f"✅ Found conversation:")
            print(f"   ID: {existing['id']}")
            print(f"   Current Title: {existing['title']}")
            print(f"   Domain ID: {existing['domain_id']}")
            print(f"   Status: {existing['status']}")
            print(f"   Updated At: {existing['updated_at']}")
        
        # Step 2: Perform the UPDATE
        print(f"\nStep 2: Updating title to '{new_title}'...")
        
        async with db_manager.mysql_connection() as (cursor, conn):
            # Build the query exactly as the service does
            update_fields = ["title = %s", "updated_at = NOW()"]
            set_clause = ', '.join(update_fields)
            update_values = [new_title, conversation_id, domain_id]
            
            query = f"""
                UPDATE wl_conversations 
                SET {set_clause}
                WHERE id = %s AND domain_id = %s
            """
            
            print(f"   SQL Query: {query}")
            print(f"   Values: {update_values}")
            
            try:
                await cursor.execute(query, update_values)
                rows_affected = cursor.rowcount
                await conn.commit()
                
                print(f"✅ UPDATE executed successfully")
                print(f"   Rows affected: {rows_affected}")
                
                if rows_affected == 0:
                    print("⚠️  WARNING: No rows were updated!")
                    print("   This means either:")
                    print("   - The conversation doesn't exist")
                    print("   - The WHERE clause didn't match")
                    print("   - The database user lacks UPDATE permission")
                
            except Exception as update_error:
                print(f"❌ UPDATE FAILED with error:")
                print(f"   {type(update_error).__name__}: {str(update_error)}")
                import traceback
                traceback.print_exc()
                return
        
        # Step 3: Verify the update
        print(f"\nStep 3: Verifying the update...")
        
        async with db_manager.mysql_connection() as (cursor, conn):
            await cursor.execute("""
                SELECT id, domain_id, title, status, created_at, updated_at
                FROM wl_conversations 
                WHERE id = %s AND domain_id = %s
            """, (conversation_id, domain_id))
            
            updated = await cursor.fetchone()
            
            if updated:
                print(f"✅ Verification successful:")
                print(f"   ID: {updated['id']}")
                print(f"   New Title: {updated['title']}")
                print(f"   Domain ID: {updated['domain_id']}")
                print(f"   Status: {updated['status']}")
                print(f"   Updated At: {updated['updated_at']}")
                
                if updated['title'] == new_title:
                    print(f"\n🎉 SUCCESS! Title was updated correctly!")
                else:
                    print(f"\n❌ MISMATCH! Title was not updated correctly")
                    print(f"   Expected: {new_title}")
                    print(f"   Got: {updated['title']}")
            else:
                print(f"❌ ERROR: Could not find conversation after update!")
        
        print(f"\n{'='*70}\n")
        
    except Exception as e:
        print(f"\n❌ Test failed with error:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

async def test_update_via_service():
    """Test using the actual conversation service"""
    from services.conversation_service import conversation_service
    from models.conversation import ConversationUpdate
    import logging
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        # Initialize the service
        await conversation_service.initialize()
        
        # Test parameters - CHANGE THESE to match your actual data
        conversation_id = "conv_8047f3cb-a64a-48ac-86b7-fdcce1910868"
        domain_id = "AG04333"
        new_title = "Test Update Fixed - Via Service"
        
        print(f"\n{'='*70}")
        print(f"Testing via Conversation Service")
        print(f"{'='*70}")
        print(f"Conversation ID: {conversation_id}")
        print(f"Domain ID: {domain_id}")
        print(f"New Title: {new_title}")
        print(f"{'='*70}\n")
        
        # Create update data
        update_data = ConversationUpdate(title=new_title)
        
        # Perform the update
        result = await conversation_service.update_conversation(
            conversation_id=conversation_id,
            domain_id=domain_id,
            update_data=update_data
        )
        
        if result:
            print(f"\n✅ SUCCESS! Conversation updated via service:")
            print(f"   ID: {result.id}")
            print(f"   Title: {result.title}")
            print(f"   Domain ID: {result.domain_id}")
            print(f"   Updated At: {result.updated_at}")
            print(f"   Message Count: {result.message_count}")
        else:
            print(f"\n❌ FAILED! Service returned None (conversation not found)")
        
        print(f"\n{'='*70}\n")
        
    except Exception as e:
        print(f"\n❌ Test failed with error:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

async def main():
    """Run both tests"""
    print("\n" + "="*70)
    print("CONVERSATION UPDATE TEST SUITE")
    print("="*70)
    
    # Test 1: Direct SQL
    print("\n### TEST 1: Direct SQL Update (bypasses service layer)")
    await test_update_isolated()
    
    # Test 2: Via Service
    print("\n### TEST 2: Update via Conversation Service")
    await test_update_via_service()

if __name__ == "__main__":
    asyncio.run(main())
