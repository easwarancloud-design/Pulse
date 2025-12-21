"""
Conversation Service Layer
Handles business logic for conversation storage, retrieval, and caching
Integrates Redis caching with MySQL persistence
"""
import json
import base64
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import asyncio

# Import our configuration and models
from config.database import db_manager, RedisKeys, REDIS_TTL_SECONDS
from models.conversation import (
    Conversation, ConversationCreate, ConversationUpdate, ConversationResponse,
    ConversationSummary, Message, MessageCreate, MessageResponse,
    ReferenceLink, ReferenceLinkCreate, UserSession, UserSessionUpdate,
    SearchRequest, SearchResponse, BulkMessageCreate, BulkMessageResponse,
    create_conversation_id, create_message_id, create_reference_id,
    MessageType, ConversationStatus
)

logger = logging.getLogger(__name__)

class ConversationService:
    """Service class for conversation operations with Redis caching"""
    
    def __init__(self):
        self.redis = None
        self.mysql = None
        # Lazy import to avoid circulars during tooling/tests
        try:
            from protegrity_tester import encrypt as _p_encrypt, decrypt as _p_decrypt  # type: ignore
            self._p_encrypt = _p_encrypt
            self._p_decrypt = _p_decrypt
        except Exception as e:
            logger.warning(f"Protegrity client not available; encryption disabled: {e}")
            self._p_encrypt = None
            self._p_decrypt = None
    
    async def initialize(self):
        """Initialize service with database connections"""
        await db_manager.initialize()
        self.redis = db_manager.redis
        self.mysql = db_manager.mysql_connection
    
    # ================================================
    # DATABASE MAPPING FUNCTIONS
    # ================================================
    
    def _map_db_to_api_conversation(self, db_row: Dict[str, Any]) -> Conversation:
        """Map database columns to API model"""
        # Map database status to ConversationStatus enum
        db_status = db_row.get('status', 'active')
        if db_status == 'active':
            status = ConversationStatus.ACTIVE
        elif db_status == 'archived':
            status = ConversationStatus.ARCHIVED  
        elif db_status == 'deleted':
            status = ConversationStatus.DELETED
        else:
            status = ConversationStatus.ACTIVE  # Default fallback
            
        return Conversation(
            id=db_row['id'],  # Use 'id' directly (schema uses 'id' as primary key)
            domain_id=db_row['domain_id'],   # domain_id -> domain_id
            title=db_row['title'],
            summary=db_row.get('summary', ''),  # Default if missing
            status=status,
            metadata=json.loads(db_row.get('metadata', '{}')) if isinstance(db_row.get('metadata'), str) else (db_row.get('metadata') or {}),
            message_count=db_row.get('message_count', 0),
            total_tokens=db_row.get('total_tokens', 0),  # Include total_tokens from schema
            created_at=db_row['created_at'],
            updated_at=db_row['updated_at']
        )

    def _map_db_to_api_message(self, db_row: Dict[str, Any]) -> Message:
        """Map database columns to API model"""
        return Message(
            id=str(db_row['id']),     # id -> id
            conversation_id=db_row['conversation_id'],
            chat_id=db_row.get('chat_id'),    # Frontend chat bubble ID
            message_type=MessageType(db_row['message_type']),
            content=db_row['content'],    # content (may be encrypted; decrypt at fetch sites)
            metadata=json.loads(db_row.get('metadata', '{}')) if isinstance(db_row.get('metadata'), str) else (db_row.get('metadata') or {}),
            created_at=db_row['created_at'],
            updated_at=db_row.get('updated_at', db_row['created_at']),
            # Feedback fields
            liked=db_row.get('liked', 0),
            feedback_text=db_row.get('feedback_text'),
            feedback_at=db_row.get('feedback_at')
        )
    
    def _map_api_to_db_conversation(self, conversation: Conversation) -> Dict[str, Any]:
        """Map API model to database columns"""
        return {
            'id': conversation.id,
            'domain_id': conversation.domain_id,  # domain_id -> domain_id
            'title': conversation.title,
            'summary': conversation.summary,  # Add missing summary field
            'status': conversation.status.value,  # Map status enum to string
            'metadata': json.dumps(conversation.metadata) if conversation.metadata else None,
            'message_count': conversation.message_count,
            'total_tokens': conversation.total_tokens,
            'created_at': conversation.created_at,
            'updated_at': conversation.updated_at
        }
    
    def _map_api_to_db_message(self, message: Message) -> Dict[str, Any]:
        """Map API model to database columns"""
        return {
            'id': message.id,
            'conversation_id': message.conversation_id,
            'chat_id': message.chat_id,  # Frontend chat bubble ID
            'message_type': message.message_type.value,
            'content': message.content,  # content (should already be transformed for DB)
            'metadata': json.dumps(message.metadata) if message.metadata else None,
            'token_count': getattr(message, 'token_count', None),
            'created_at': message.created_at,
            'liked': getattr(message, 'liked', 0),
            'feedback_text': getattr(message, 'feedback_text', None),
            'feedback_at': getattr(message, 'feedback_at', None)
        }

    # ================================================
    # ENCRYPTION / DECRYPTION HELPERS
    # ================================================

    async def _encrypt_text(self, plaintext: Optional[str]) -> Optional[str]:
        """Encrypt plaintext using Protegrity and return base64-encoded ciphertext string.
        If Protegrity client is not available or plaintext is empty, returns input.
        """
        if not plaintext:
            return plaintext
        if not self._p_encrypt:
            logger.info("Protegrity encrypt unavailable; storing plaintext.")
            return plaintext
        try:
            logger.debug(f"Encrypting content via Protegrity (len={len(plaintext)}).")
            raw = await asyncio.to_thread(self._p_encrypt, plaintext.encode('utf-8'))
            enc_b64 = base64.b64encode(raw).decode('ascii')
            logger.info(f"Encryption succeeded; ciphertext length={len(enc_b64)}.")
            return enc_b64
        except Exception as e:
            logger.error(f"Encryption failed; storing plaintext fallback. Error={e}")
            return plaintext

    async def _decrypt_text(self, enc_b64: Optional[str]) -> Optional[str]:
        """Decrypt base64-encoded ciphertext using Protegrity; if not valid/enabled, return input."""
        if enc_b64 is None:
            return enc_b64
        if not self._p_decrypt:
            # No client configured; assume already plaintext
            logger.info("Protegrity decrypt unavailable; assuming plaintext.")
            return enc_b64
        try:
            # Try base64 decode; if fails, it's likely plaintext
            enc_bytes = base64.b64decode(enc_b64, validate=False)
        except Exception:
            logger.debug("Value not base64; treating as plaintext.")
            return enc_b64
        try:
            logger.debug(f"Decrypting content via Protegrity (ciphertext len={len(enc_b64)}).")
            dec = await asyncio.to_thread(self._p_decrypt, enc_bytes)
            dec_text = dec.decode('utf-8', errors='replace')
            logger.info(f"Decryption succeeded; plaintext length={len(dec_text)}.")
            return dec_text
        except Exception:
            # Not a valid protected payload; treat as plaintext
            logger.warning("Decryption failed; returning original value as plaintext.")
            return enc_b64

    async def _prepare_metadata_for_store(self, metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Clone metadata and encrypt only the 'question_context' value if present (string).
        Adds a boolean flag 'question_context_enc' to aid future detection.
        """
        if not metadata:
            return metadata
        try:
            new_meta = dict(metadata)
        except Exception:
            return metadata
        qc = new_meta.get('question_context')
        if isinstance(qc, str) and qc:
            enc_qc = await self._encrypt_text(qc)
            new_meta['question_context'] = enc_qc
            new_meta['question_context_enc'] = True
        return new_meta

    async def _prepare_metadata_for_api(self, metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Clone metadata and decrypt 'question_context' if it looks encrypted or flagged."""
        if not metadata:
            return metadata
        try:
            new_meta = dict(metadata)
        except Exception:
            return metadata
        qc = new_meta.get('question_context')
        flagged = bool(new_meta.get('question_context_enc'))
        if isinstance(qc, str) and qc:
            dec_qc = await self._decrypt_text(qc) if flagged or qc else qc
            new_meta['question_context'] = dec_qc
            # Keep the flag for internal use, or remove if you prefer not to expose
            # new_meta.pop('question_context_enc', None)
        return new_meta
    
    # ================================================
    # CONVERSATION CRUD OPERATIONS
    # ================================================
    
    async def create_conversation(self, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation"""
        conversation_id = create_conversation_id()
        now = datetime.utcnow()
        
        conversation = Conversation(
            id=conversation_id,
            domain_id=conversation_data.domain_id,
            title=conversation_data.title,
            summary=conversation_data.summary,
            status=ConversationStatus.ACTIVE,
            metadata=conversation_data.metadata or {},
            message_count=0,
            total_tokens=0,
            created_at=now,
            updated_at=now
        )
        
        try:
            # Insert into MySQL using mapped columns
            db_data = self._map_api_to_db_conversation(conversation)
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    INSERT INTO wl_conversations 
                    (id, domain_id, title, summary, status, metadata, message_count, total_tokens, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    db_data['id'], db_data['domain_id'], db_data['title'],
                    db_data['summary'], db_data['status'], db_data['metadata'], 
                    db_data['message_count'], db_data['total_tokens'],
                    db_data['created_at'], db_data['updated_at']
                ))
                await conn.commit()
            
            # Cache in Redis with TTL
            await self._cache_conversation(conversation)
            await self._update_user_conversations_cache(conversation.domain_id, conversation)
            await self._cache_conversation_title(conversation.domain_id, conversation.id, conversation.title)
            
            # Update user session activity with cache refresh
            await self._refresh_cache_expiry(conversation_id, conversation.domain_id)
            
            logger.info(f"Created conversation {conversation_id} for domain {conversation.domain_id}")
            return ConversationResponse(**conversation.dict(), messages=[])
            
        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            raise
    
    async def get_conversation(self, conversation_id: str, domain_id: str) -> Optional[ConversationResponse]:
        """Get conversation by ID with all messages"""
        try:
            # Try Redis cache first
            cached_conversation = await self._get_cached_conversation(conversation_id)
            if cached_conversation and cached_conversation.domain_id == domain_id:
                # Get cached messages
                messages = await self._get_cached_messages(conversation_id)
                # Convert Message objects to MessageResponse objects for proper Pydantic validation
                message_responses = []
                for msg in messages:
                    try:
                        message_responses.append(MessageResponse(**msg.dict()))
                    except Exception as e:
                        logger.warning(f"Failed to convert cached message {msg.id} to MessageResponse: {e}")
                        # Skip invalid messages rather than failing the entire request
                        continue
                # Refresh cache expiry on access
                await self._refresh_cache_expiry(conversation_id, domain_id)
                return ConversationResponse(**cached_conversation.dict(), messages=message_responses)
            
            # Fallback to database
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                return None
            
            messages = await self._get_messages_from_db(conversation_id)
            
            # Cache the results with TTL
            await self._cache_conversation(conversation)
            await self._cache_messages(conversation_id, messages)
            
            # Convert Message objects to MessageResponse objects for proper Pydantic validation
            message_responses = []
            for msg in messages:
                try:
                    message_responses.append(MessageResponse(**msg.dict()))
                except Exception as e:
                    logger.warning(f"Failed to convert message {msg.id} to MessageResponse: {e}")
                    # Skip invalid messages rather than failing the entire request
                    continue
            
            return ConversationResponse(**conversation.dict(), messages=message_responses)
            
        except Exception as e:
            logger.error(f"Failed to get conversation {conversation_id}: {e}")
            raise
    
    async def update_conversation(self, conversation_id: str, domain_id: str, 
                                update_data: ConversationUpdate) -> Optional[ConversationResponse]:
        """Update conversation"""
        try:
            logger.info(f"Updating conversation {conversation_id} for domain {domain_id} with data: {update_data.dict()}")
            
            # Get existing conversation
            existing_conversation = await self.get_conversation(conversation_id, domain_id)
            if not existing_conversation:
                logger.warning(f"Conversation {conversation_id} not found for domain {domain_id}")
                return None
            
            # Prepare update data with proper field mapping
            update_fields = []
            update_values = []
            
            if update_data.title is not None:
                update_fields.append("title = %s")
                update_values.append(update_data.title)
            
            if update_data.summary is not None:
                update_fields.append("summary = %s") 
                update_values.append(update_data.summary)
            
            if update_data.status is not None:
                # Map status enum to database value
                update_fields.append("status = %s")
                update_values.append(update_data.status.value)
            
            if update_data.metadata is not None:
                update_fields.append("metadata = %s")
                update_values.append(json.dumps(update_data.metadata))
            
            # Don't update if no fields to change
            if not update_fields:
                return existing_conversation
            
            # Explicitly set updated_at to trigger timestamp update
            update_fields.append("updated_at = NOW()")
            
            # Add WHERE clause parameters
            update_values.extend([conversation_id, domain_id])
            
            # Update in MySQL with safe parameterized query
            set_clause = ', '.join(update_fields)
            
            async with self.mysql() as (cursor, conn):
                query = f"""
                    UPDATE wl_conversations 
                    SET {set_clause}
                    WHERE id = %s AND domain_id = %s
                """
                logger.info(f"Executing UPDATE query: {query} with values: {update_values}")
                await cursor.execute(query, update_values)
                
                # Check if any rows were affected
                if cursor.rowcount == 0:
                    logger.warning(f"No conversation found to update: {conversation_id} for domain {domain_id}")
                    return None
                    
                logger.info(f"Successfully updated {cursor.rowcount} row(s)")
                await conn.commit()
            
            # Get updated conversation
            logger.info(f"Fetching updated conversation {conversation_id}")
            updated_conversation = await self.get_conversation(conversation_id, domain_id)
            
            # Update caches
            if updated_conversation:
                # Convert ConversationResponse to Conversation for caching
                conversation_for_cache = Conversation(
                    id=updated_conversation.id,
                    domain_id=updated_conversation.domain_id,
                    title=updated_conversation.title,
                    summary=updated_conversation.summary,
                    status=updated_conversation.status,
                    metadata=updated_conversation.metadata,
                    message_count=updated_conversation.message_count,
                    total_tokens=updated_conversation.total_tokens,
                    last_message_at=updated_conversation.last_message_at,
                    created_at=updated_conversation.created_at,
                    updated_at=updated_conversation.updated_at
                )
                await self._cache_conversation(conversation_for_cache)
                if update_data.title:
                    await self._cache_conversation_title(domain_id, conversation_id, update_data.title)
                    # Invalidate user conversations cache to ensure fresh data on next fetch
                    user_conv_key = RedisKeys.user_conversations(domain_id)
                    await self.redis.delete(user_conv_key)
                    logger.info(f"Invalidated user conversations cache for domain {domain_id} after title update")
            
            logger.info(f"Successfully updated conversation {conversation_id}")
            return updated_conversation
            
        except Exception as e:
            logger.error(f"Failed to update conversation {conversation_id}: {e}", exc_info=True)
            raise
    
    async def delete_conversation(self, conversation_id: str, domain_id: str) -> bool:
        """Delete conversation (soft delete by setting status to 'deleted')"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    UPDATE wl_conversations 
                    SET status = 'deleted'
                    WHERE id = %s AND domain_id = %s AND status != 'deleted'
                """, (conversation_id, domain_id))
                affected_rows = cursor.rowcount
                await conn.commit()
            
            if affected_rows > 0:
                # Remove from caches 
                await self._remove_conversation_from_cache(domain_id, conversation_id)
                logger.info(f"Deleted conversation {conversation_id} (set status to deleted)")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            raise
    
    # ================================================
    # MESSAGE OPERATIONS
    # ================================================
    
    async def add_message(self, conversation_id: str, domain_id: str, 
                         message_data: MessageCreate) -> Optional[MessageResponse]:
        """Add message to conversation (or update if chat_id exists for regenerated responses)"""
        try:
            # Verify conversation exists and belongs to domain
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                return None
            
            now = datetime.utcnow()
            
            # Check if message with this chat_id already exists (for regenerated responses)
            existing_message = None
            if message_data.chat_id:
                async with self.mysql() as (cursor, conn):
                    await cursor.execute("""
                        SELECT * FROM wl_messages 
                        WHERE chat_id = %s AND conversation_id = %s
                    """, (message_data.chat_id, conversation_id))
                    existing_message = await cursor.fetchone()
            
            # If message exists, UPDATE it (regenerated response)
            if existing_message:
                logger.info(f"Message with chat_id={message_data.chat_id} exists, updating content (regenerated)")
                
                # Merge metadata
                current_metadata = existing_message.get('metadata', {}) if existing_message.get('metadata') else {}
                if message_data.metadata:
                    current_metadata.update(message_data.metadata)
                    current_metadata['regenerated'] = True
                    current_metadata['regenerated_at'] = now.isoformat()

                # Encrypt content and selective metadata for DB store
                enc_content = await self._encrypt_text(message_data.content)
                enc_metadata = await self._prepare_metadata_for_store(current_metadata)
                
                async with self.mysql() as (cursor, conn):
                    await cursor.execute("""
                        UPDATE wl_messages 
                        SET content = %s, metadata = %s, updated_at = %s
                        WHERE chat_id = %s AND conversation_id = %s
                    """, (enc_content, json.dumps(enc_metadata), now, message_data.chat_id, conversation_id))
                    await conn.commit()
                    
                    # Get updated message
                    await cursor.execute("""
                        SELECT * FROM wl_messages 
                        WHERE chat_id = %s AND conversation_id = %s
                    """, (message_data.chat_id, conversation_id))
                    updated_result = await cursor.fetchone()
                
                # Decrypt for API/cache
                dec_content = await self._decrypt_text(updated_result.get('content'))
                raw_meta = updated_result.get('metadata', {})
                meta_dict = json.loads(raw_meta) if isinstance(raw_meta, str) and raw_meta else (raw_meta or {})
                dec_meta = await self._prepare_metadata_for_api(meta_dict)
                message = Message(
                    id=str(updated_result['id']),
                    conversation_id=str(updated_result['conversation_id']),
                    message_type=updated_result['message_type'],
                    content=dec_content,
                    chat_id=updated_result.get('chat_id'),
                    metadata=dec_meta or {},
                    reference_links=[],
                    liked=updated_result.get('liked', 0),
                    feedback_text=updated_result.get('feedback_text'),
                    created_at=updated_result['created_at'],
                    updated_at=updated_result.get('updated_at')
                )
                
                # Invalidate cache
                # Update cached messages list (replace by chat_id) for consistency
                await self._replace_cached_message(conversation_id, message, match_chat_id=message_data.chat_id)
                # Update cached conversation timestamp if present
                await self._touch_cached_conversation(conversation_id)
                logger.info(f"Updated message {message.id} (regenerated response) and refreshed cache")
                
            else:
                # New message - INSERT
                message_id = create_message_id()
                
                message = Message(
                    id=message_id,
                    conversation_id=conversation_id,
                    chat_id=message_data.chat_id,  # Include chat_id from frontend
                    message_type=message_data.message_type,
                    content=message_data.content,
                    metadata=message_data.metadata or {},
                    created_at=now,
                    updated_at=now
                )
                
                # Prepare encrypted payloads for DB
                enc_content = await self._encrypt_text(message.content)
                enc_metadata = await self._prepare_metadata_for_store(message.metadata)
                db_data = self._map_api_to_db_message(message)
                db_data['content'] = enc_content
                db_data['metadata'] = json.dumps(enc_metadata) if enc_metadata else None
                async with self.mysql() as (cursor, conn):
                    await cursor.execute("""
                        INSERT INTO wl_messages 
                        (id, conversation_id, chat_id, message_type, content, metadata, token_count, created_at, liked, feedback_text, feedback_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        db_data['id'], db_data['conversation_id'], db_data['chat_id'], 
                        db_data['message_type'], db_data['content'], db_data['metadata'], 
                        db_data['token_count'], db_data['created_at'],
                        db_data['liked'], db_data['feedback_text'], db_data['feedback_at']
                    ))
                    await conn.commit()
            
            # Add reference links if provided
            reference_links = []
            if message_data.reference_links:
                for ref_data in message_data.reference_links:
                    ref_link = await self._add_reference_link(message_id, ref_data)
                    if ref_link:
                        reference_links.append(ref_link)
            
            message.reference_links = reference_links
            
            # Update conversation cache and refresh expiry
            await self._add_message_to_cache(conversation_id, message)
            await self._refresh_cache_expiry(conversation_id, domain_id)
            
            # Note: Conversation stats are updated by database trigger
            
            logger.info(f"Added message {message_id} to conversation {conversation_id}")
            return MessageResponse(**message.dict())
            
        except Exception as e:
            logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
            raise
    
    async def bulk_add_messages(self, bulk_data: BulkMessageCreate, domain_id: str) -> BulkMessageResponse:
        """Add multiple messages to a conversation"""
        try:
            # Verify conversation exists
            conversation = await self._get_conversation_from_db(bulk_data.conversation_id, domain_id)
            if not conversation:
                raise ValueError(f"Conversation {bulk_data.conversation_id} not found")
            
            created_messages = []
            failed_messages = []
            
            for message_data in bulk_data.messages:
                try:
                    message = await self.add_message(bulk_data.conversation_id, domain_id, message_data)
                    if message:
                        created_messages.append(message)
                    else:
                        failed_messages.append({
                            "message_data": message_data.dict(),
                            "error": "Failed to create message"
                        })
                except Exception as e:
                    failed_messages.append({
                        "message_data": message_data.dict(),
                        "error": str(e)
                    })
            
            return BulkMessageResponse(
                conversation_id=bulk_data.conversation_id,
                created_messages=created_messages,
                failed_messages=failed_messages
            )
            
        except Exception as e:
            logger.error(f"Failed to bulk add messages: {e}")
            raise
    
    async def update_message_feedback(self, conversation_id: str, message_id: str, domain_id: str, 
                                    liked: int = 0, feedback_text: str = None) -> bool:
        """Update message feedback (like/dislike/text)"""
        try:
            # Verify conversation belongs to domain
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                return False
            
            now = datetime.utcnow()
            
            # Update in MySQL
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    UPDATE wl_messages 
                    SET liked = %s, feedback_text = %s, feedback_at = %s
                    WHERE id = %s AND conversation_id = %s
                """, (liked, feedback_text, now if liked != 0 or feedback_text else None, message_id, conversation_id))
                
                affected_rows = cursor.rowcount
                await conn.commit()
            
            if affected_rows > 0:
                # Update Redis cache
                await self._update_message_feedback_in_cache(conversation_id, message_id, liked, feedback_text, now)
                
                # Reset expiry time on domain activity
                await self._refresh_cache_expiry(conversation_id, domain_id)
                
                logger.info(f"Updated feedback for message {message_id} in conversation {conversation_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to update message feedback: {e}")
            raise

    async def update_message_feedback_by_chat_id(self, conversation_id: str, chat_id: str, domain_id: str, 
                                                liked: int = 0, feedback_text: str = None) -> bool:
        """Update message feedback (like/dislike/text) by chat ID"""
        try:
            # Verify conversation belongs to domain
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                return False
            
            now = datetime.utcnow()
            
            # Update in MySQL using chat_id
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    UPDATE wl_messages 
                    SET liked = %s, feedback_text = %s, feedback_at = %s
                    WHERE chat_id = %s AND conversation_id = %s
                """, (liked, feedback_text, now if liked != 0 or feedback_text else None, chat_id, conversation_id))
                affected_rows = cursor.rowcount
                
                # Get the message_id for cache update
                await cursor.execute("""
                    SELECT id FROM wl_messages 
                    WHERE chat_id = %s AND conversation_id = %s
                """, (chat_id, conversation_id))
                result = await cursor.fetchone()
                message_id = str(result['id']) if result else None
                
                await conn.commit()
            
            if affected_rows > 0 and message_id:
                # Update cache
                await self._update_message_feedback_in_cache(conversation_id, message_id, liked, feedback_text, now)
                logger.info(f"Updated feedback for chat_id {chat_id} (message {message_id}) in conversation {conversation_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to update message feedback by chat_id: {e}")
            raise

    async def update_message_content(self, conversation_id: str, chat_id: str, domain_id: str,
                                     new_content: str, metadata: dict = None) -> Optional[Message]:
        """Update message content by chat_id (used for regenerated responses)"""
        try:
            logger.info(f"Updating message content for chat_id={chat_id} in conversation={conversation_id}")
            
            # Verify conversation belongs to domain
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                logger.error(f"Conversation {conversation_id} not found for domain {domain_id}")
                return None
            
            now = datetime.utcnow()
            
            # Update in MySQL using chat_id
            async with self.mysql() as (cursor, conn):
                # First, get the current message
                await cursor.execute("""
                    SELECT * FROM wl_messages 
                    WHERE chat_id = %s AND conversation_id = %s
                """, (chat_id, conversation_id))
                result = await cursor.fetchone()
                
                if not result:
                    logger.error(f"Message with chat_id={chat_id} not found in conversation {conversation_id}")
                    return None
                
                # Merge metadata
                current_metadata = result.get('metadata', {}) if result.get('metadata') else {}
                if metadata:
                    current_metadata.update(metadata)
                    current_metadata['regenerated'] = True
                    current_metadata['regenerated_at'] = now.isoformat()
                
                # Encrypt new content and selective metadata for DB
                enc_content = await self._encrypt_text(new_content)
                enc_metadata = await self._prepare_metadata_for_store(current_metadata)

                # Update the message content
                await cursor.execute("""
                    UPDATE wl_messages 
                    SET content = %s, metadata = %s, updated_at = %s
                    WHERE chat_id = %s AND conversation_id = %s
                """, (enc_content, json.dumps(enc_metadata), now, chat_id, conversation_id))
                
                affected_rows = cursor.rowcount
                await conn.commit()
                
                # Get the updated message
                await cursor.execute("""
                    SELECT * FROM wl_messages 
                    WHERE chat_id = %s AND conversation_id = %s
                """, (chat_id, conversation_id))
                updated_result = await cursor.fetchone()
            
            if affected_rows > 0 and updated_result:
                # Create Message object
                dec_content = await self._decrypt_text(updated_result.get('content'))
                raw_meta = updated_result.get('metadata', {})
                meta_dict = json.loads(raw_meta) if isinstance(raw_meta, str) and raw_meta else (raw_meta or {})
                dec_meta = await self._prepare_metadata_for_api(meta_dict)
                updated_message = Message(
                    id=str(updated_result['id']),
                    conversation_id=str(updated_result['conversation_id']),
                    message_type=updated_result['message_type'],
                    content=dec_content,
                    chat_id=updated_result.get('chat_id'),
                    metadata=dec_meta or {},
                    reference_links=[],
                    liked=updated_result.get('liked', 0),
                    feedback_text=updated_result.get('feedback_text'),
                    created_at=updated_result['created_at'],
                    updated_at=updated_result.get('updated_at')
                )
                
                # Update conversation's updated_at timestamp
                await self._update_conversation_timestamp(conversation_id)
                
                # Replace message in cache instead of invalidating entire conversation cache
                await self._replace_cached_message(conversation_id, updated_message, match_chat_id=chat_id)
                # Touch cached conversation updated_at if present
                await self._touch_cached_conversation(conversation_id)
                # Refresh TTLs
                await self._refresh_cache_expiry(conversation_id, domain_id)
                logger.info(f"Updated cached message for chat_id={chat_id} without full invalidation")
                
                logger.info(f"Successfully updated message content for chat_id={chat_id}")
                return updated_message
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to update message content: {e}")
            raise
    
    async def _update_conversation_timestamp(self, conversation_id: str):
        """Update conversation's updated_at timestamp"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    UPDATE wl_conversations 
                    SET updated_at = NOW()
                    WHERE id = %s
                """, (conversation_id,))
                await conn.commit()
        except Exception as e:
            logger.error(f"Failed to update conversation timestamp: {e}")

    # ================================================
    # CHAT HISTORY / RECENT MESSAGES
    # ================================================

    async def get_recent_messages(self, conversation_id: str, domain_id: str, limit: int = 10, doc_id: Optional[str] = None) -> List[MessageResponse]:
        """Return most recent messages for a conversation (Redis-first, fallback to DB).
        Optional doc_id filter: if provided, will include only messages whose metadata contains
        'doc_id' equal to the given value OR whose metadata lists include that doc_id.
        Assumptions (due to lack of explicit schema):
          - metadata may contain 'doc_id' str or list of 'doc_ids' under keys like 'documents', 'sources'.
          - Filtering performed in-memory after retrieval.
        """
        # Validate conversation ownership quickly via DB (cheap single-row) if cache miss
        try:
            # Attempt to fetch messages from cache
            cached_messages = await self._get_cached_messages(conversation_id)
            if cached_messages:
                messages = cached_messages
            else:
                # Fallback to DB (will decrypt inside helper)
                messages = await self._get_messages_from_db(conversation_id)

            # If conversation not found at all, ensure belonging domain
            conversation = await self._get_conversation_from_db(conversation_id, domain_id)
            if not conversation:
                return []

            # Apply doc_id filtering if requested
            if doc_id:
                filtered = []
                for m in messages:
                    md = m.metadata or {}
                    if md.get('doc_id') == doc_id:
                        filtered.append(m)
                        continue
                    # check common list containers
                    for key in ('documents', 'sources', 'docs'):
                        val = md.get(key)
                        if isinstance(val, list) and doc_id in val:
                            filtered.append(m)
                            break
                messages = filtered

            # Take last N messages (most recent). Stored ascending by created_at.
            recent = messages[-limit:] if limit and len(messages) > limit else messages

            # Convert to MessageResponse (already decrypted in cache/DB fetch path)
            response_list: List[MessageResponse] = []
            for msg in recent:
                try:
                    response_list.append(MessageResponse(**msg.dict()))
                except Exception as e:
                    logger.warning(f"Failed to convert message {msg.id} to response: {e}")
            # Refresh expiry since access occurred
            await self._refresh_cache_expiry(conversation_id, domain_id)
            return response_list
        except Exception as e:
            logger.error(f"Failed to get recent messages for {conversation_id}: {e}")
            return []

    async def get_recent_messages_cache_only(self, conversation_id: str, domain_id: str, limit: int = 10, doc_id: Optional[str] = None) -> List[MessageResponse]:
        """Return most recent messages for a conversation from Redis cache ONLY.
        No database fallback. Optional doc_id filter.
        """
        try:
            # Fetch messages strictly from cache
            messages = await self._get_cached_messages(conversation_id)
            if not messages:
                return []

            # Optional doc_id filtering
            if doc_id:
                filtered = []
                for m in messages:
                    md = m.metadata or {}
                    if md.get('doc_id') == doc_id:
                        filtered.append(m)
                        continue
                    for key in ('documents', 'sources', 'docs'):
                        val = md.get(key)
                        if isinstance(val, list) and doc_id in val:
                            filtered.append(m)
                            break
                messages = filtered

            # Take last N messages
            recent = messages[-limit:] if limit and len(messages) > limit else messages

            # Convert to MessageResponse
            response_list: List[MessageResponse] = []
            for msg in recent:
                try:
                    response_list.append(MessageResponse(**msg.dict()))
                except Exception as e:
                    logger.warning(f"Failed to convert cached message {msg.id} to MessageResponse: {e}")

            # Refresh TTLs on access
            await self._refresh_cache_expiry(conversation_id, domain_id)
            return response_list
        except Exception as e:
            logger.error(f"Failed to get recent messages (cache-only) for {conversation_id}: {e}")
            return []

    # ================================================
    # CACHE MUTATION HELPERS FOR MESSAGE UPDATES
    # ================================================

    async def _replace_cached_message(self, conversation_id: str, new_message: Message, match_chat_id: Optional[str] = None):
        """Replace an existing cached message (by id or chat_id) with new_message. If cache absent, skip."""
        try:
            messages = await self._get_cached_messages(conversation_id)
            if not messages:
                return  # nothing to do
            replaced = False
            for idx, m in enumerate(messages):
                if (match_chat_id and m.chat_id == match_chat_id) or m.id == new_message.id:
                    messages[idx] = new_message
                    replaced = True
                    break
            if replaced:
                await self._cache_messages(conversation_id, messages)
                logger.debug(f"Replaced cached message in conversation {conversation_id} (chat_id={match_chat_id})")
        except Exception as e:
            logger.warning(f"Failed to replace cached message for conversation {conversation_id}: {e}")

    async def _touch_cached_conversation(self, conversation_id: str):
        """Update only the updated_at timestamp of a cached conversation (if present) to now."""
        try:
            cached = await self._get_cached_conversation(conversation_id)
            if not cached:
                return
            cached.updated_at = datetime.utcnow()
            await self._cache_conversation(cached)
        except Exception as e:
            logger.debug(f"Failed to touch cached conversation {conversation_id}: {e}")

    # ================================================
    # SEARCH OPERATIONS
    # ================================================
    
    async def search_conversations(self, search_request: SearchRequest) -> SearchResponse:
        """Search conversations by title (Redis first, then database fallback)"""
        try:
            # Try Redis search first
            redis_results = await self._search_titles_from_redis(
                search_request.domain_id, 
                search_request.query, 
                search_request.limit,
                search_request.offset
            )
            
            if redis_results:
                total_count = len(redis_results) + search_request.offset
                return SearchResponse(
                    conversations=redis_results,
                    total_count=total_count,
                    query=search_request.query,
                    limit=search_request.limit,
                    offset=search_request.offset,
                    source="cache"
                )
            
            # Fallback to database search
            db_results, total_count = await self._search_conversations_from_db(search_request)
            
            return SearchResponse(
                conversations=db_results,
                total_count=total_count,
                query=search_request.query,
                limit=search_request.limit,
                offset=search_request.offset,
                source="database"
            )
            
        except Exception as e:
            logger.error(f"Failed to search conversations: {e}")
            raise
    
    async def get_user_conversations(self, domain_id: str, limit: int = 20, 
                                   offset: int = 0) -> List[ConversationSummary]:
        """Get domain's conversations with pagination"""
        try:
            # Try Redis cache first
            cached_conversations = await self._get_user_conversations_from_cache(domain_id, limit, offset)
            if cached_conversations:
                # Refresh cache expiry on access
                cache_key = RedisKeys.user_conversations(domain_id)
                await self.redis.expire(cache_key, REDIS_TTL_SECONDS)
                return cached_conversations
            
            # Fallback to database using correct column names
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT id, domain_id, title, summary, status, created_at, updated_at, 
                           last_message_at, message_count, total_tokens, metadata
                    FROM wl_conversations
                    WHERE domain_id = %s AND status != 'deleted'
                    ORDER BY COALESCE(last_message_at, created_at) DESC
                    LIMIT %s OFFSET %s
                """, (domain_id, limit + 50, 0))  # Get extra for caching
                
                rows = await cursor.fetchall()
            
            conversations = []
            for row in rows:
                conv = self._map_db_to_api_conversation(row)
                conversations.append(ConversationSummary(
                    id=conv.id,
                    domain_id=conv.domain_id,
                    title=conv.title,
                    summary=conv.summary,
                    status=conv.status,
                    message_count=conv.message_count,
                    last_message_at=row.get('last_message_at'),
                    created_at=conv.created_at,
                    updated_at=conv.updated_at
                ))
            
            # Cache the results with TTL
            await self._cache_user_conversations(domain_id, conversations)
            
            # Return requested slice
            return conversations[offset:offset+limit]
            
        except Exception as e:
            logger.error(f"Failed to get conversations for domain {domain_id}: {e}")
            raise
    
    # ================================================
    # USER SESSION OPERATIONS
    # ================================================
    
    async def update_user_session(self, domain_id: str, 
                                session_update: UserSessionUpdate) -> UserSession:
        """Update user session"""
        try:
            now = datetime.utcnow()
            
            # Generate session_id if not provided
            session_id = session_update.metadata.get('session_id') if session_update.metadata else None
            if not session_id:
                # Import here to avoid circular dependency
                from modules.workflow_util_session import get_session_id
                session_id = get_session_id(domain_id)
            
            # Update in database
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    INSERT INTO wl_user_sessions (domain_id, session_id, last_activity, active_conversation_id, metadata, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    session_id = VALUES(session_id),
                    last_activity = VALUES(last_activity),
                    active_conversation_id = VALUES(active_conversation_id),
                    metadata = VALUES(metadata),
                    updated_at = VALUES(updated_at)
                """, (
                    domain_id, session_id, now, session_update.active_conversation_id,
                    json.dumps(session_update.metadata or {}), now
                ))
                await conn.commit()
            
            # Update Redis cache
            session_key = RedisKeys.user_session(domain_id)
            session_data = {
                'domain_id': domain_id,
                'session_id': session_id,
                'last_activity': now.isoformat(),
                'active_conversation_id': session_update.active_conversation_id,
                'metadata': json.dumps(session_update.metadata or {})
            }
            
            await self.redis.hset(session_key, mapping=session_data)
            await self.redis.expire(session_key, REDIS_TTL_SECONDS)
            
            return UserSession(
                domain_id=domain_id,
                session_id=session_id,
                last_activity=now,
                active_conversation_id=session_update.active_conversation_id,
                metadata=session_update.metadata or {}
            )
            
        except Exception as e:
            logger.error(f"Failed to update user session for {domain_id}: {e}")
            raise

    async def get_user_session(self, domain_id: str) -> Optional[UserSession]:
        """Get current user session"""
        try:
            # Try Redis cache first
            session_key = RedisKeys.user_session(domain_id)
            cached_session = await self.redis.hgetall(session_key)
            
            if cached_session:
                return UserSession(
                    domain_id=cached_session.get('domain_id', domain_id),
                    session_id=cached_session.get('session_id'),
                    last_activity=datetime.fromisoformat(cached_session['last_activity']) if cached_session.get('last_activity') else None,
                    active_conversation_id=cached_session.get('active_conversation_id'),
                    metadata=json.loads(cached_session.get('metadata', '{}'))
                )
            
            # Fallback to database
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT domain_id, session_id, last_activity, active_conversation_id, metadata
                    FROM wl_user_sessions 
                    WHERE domain_id = %s
                """, (domain_id,))
                
                row = await cursor.fetchone()
                
                if row:
                    return UserSession(
                        domain_id=row['domain_id'],
                        session_id=row.get('session_id'),
                        last_activity=row.get('last_activity'),
                        active_conversation_id=row.get('active_conversation_id'),
                        metadata=json.loads(row.get('metadata', '{}')) if row.get('metadata') else {}
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user session for {domain_id}: {e}")
            return None
    
    # ================================================
    # PRIVATE HELPER METHODS
    # ================================================
    
    async def _cache_conversation(self, conversation: Conversation):
        """Cache conversation in Redis with TTL"""
        try:
            key = RedisKeys.conversation_cache(conversation.id)
            conversation_data = conversation.dict()
            # Convert datetime objects to ISO strings for JSON serialization
            for field in ['created_at', 'updated_at']:
                if conversation_data.get(field):
                    conversation_data[field] = conversation_data[field].isoformat()
            await self.redis.setex(key, REDIS_TTL_SECONDS, json.dumps(conversation_data))
            logger.debug(f"Cached conversation {conversation.id}")
        except Exception as e:
            logger.warning(f"Failed to cache conversation {conversation.id}: {e}")
    
    async def _get_cached_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation from Redis cache"""
        try:
            key = RedisKeys.conversation_cache(conversation_id)
            data = await self.redis.get(key)
            if data:
                conversation_data = json.loads(data)
                # Convert ISO strings back to datetime objects
                for field in ['created_at', 'updated_at']:
                    if conversation_data.get(field):
                        conversation_data[field] = datetime.fromisoformat(conversation_data[field])
                return Conversation(**conversation_data)
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached conversation {conversation_id}: {e}")
            return None
    
    async def _cache_messages(self, conversation_id: str, messages: List[Message]):
        """Cache conversation messages with TTL"""
        try:
            key = RedisKeys.conversation_messages(conversation_id)
            messages_data = []
            for msg in messages:
                msg_data = msg.dict()
                # Convert datetime objects to ISO strings
                for field in ['created_at', 'updated_at', 'feedback_at']:
                    if msg_data.get(field):
                        msg_data[field] = msg_data[field].isoformat()
                messages_data.append(msg_data)
            await self.redis.setex(key, REDIS_TTL_SECONDS, json.dumps(messages_data))
            logger.debug(f"Cached {len(messages)} messages for conversation {conversation_id}")
        except Exception as e:
            logger.warning(f"Failed to cache messages for conversation {conversation_id}: {e}")
    
    async def _get_cached_messages(self, conversation_id: str) -> List[Message]:
        """Get conversation messages from Redis cache"""
        try:
            key = RedisKeys.conversation_messages(conversation_id)
            data = await self.redis.get(key)
            if data:
                messages_data = json.loads(data)
                messages = []
                for msg_data in messages_data:
                    # Convert ISO strings back to datetime objects
                    for field in ['created_at', 'updated_at', 'feedback_at']:
                        if msg_data.get(field):
                            msg_data[field] = datetime.fromisoformat(msg_data[field])
                    messages.append(Message(**msg_data))
                return messages
            return []
        except Exception as e:
            logger.warning(f"Failed to get cached messages for conversation {conversation_id}: {e}")
            return []
    
    async def _add_message_to_cache(self, conversation_id: str, message: Message):
        """Add a message to the cached message list"""
        try:
            # Get current cached messages
            messages = await self._get_cached_messages(conversation_id)
            # Add new message
            messages.append(message)
            # Re-cache with updated list
            await self._cache_messages(conversation_id, messages)
            logger.debug(f"Added message {message.id} to cache for conversation {conversation_id}")
        except Exception as e:
            logger.warning(f"Failed to add message to cache for conversation {conversation_id}: {e}")
    
    async def _refresh_cache_expiry(self, conversation_id: str, domain_id: str):
        """Reset expiry time to 15 minutes on domain activity"""
        try:
            pipe = self.redis.pipeline()
            
            # Refresh conversation cache
            conv_key = RedisKeys.conversation_cache(conversation_id)
            pipe.expire(conv_key, REDIS_TTL_SECONDS)
            
            # Refresh messages cache
            msg_key = RedisKeys.conversation_messages(conversation_id)
            pipe.expire(msg_key, REDIS_TTL_SECONDS)
            
            # Refresh domain conversation list
            user_key = RedisKeys.user_conversations(domain_id)
            pipe.expire(user_key, REDIS_TTL_SECONDS)
            
            # Update domain activity timestamp
            activity_key = RedisKeys.user_activity(domain_id)
            pipe.setex(activity_key, REDIS_TTL_SECONDS, datetime.utcnow().isoformat())
            
            await pipe.execute()
            logger.debug(f"Refreshed cache expiry for conversation {conversation_id} and domain {domain_id}")
        except Exception as e:
            logger.warning(f"Failed to refresh cache expiry: {e}")
    
    async def _cache_user_conversations(self, domain_id: str, conversations: List[ConversationSummary]):
        """Cache domain conversation list with TTL"""
        try:
            key = RedisKeys.user_conversations(domain_id)
            conversations_data = []
            for conv in conversations:
                conv_data = conv.dict()
                # Convert datetime objects to ISO strings
                for field in ['created_at', 'updated_at', 'last_message_at']:
                    if conv_data.get(field):
                        conv_data[field] = conv_data[field].isoformat()
                conversations_data.append(conv_data)
            await self.redis.setex(key, REDIS_TTL_SECONDS, json.dumps(conversations_data))
            logger.debug(f"Cached {len(conversations)} conversations for domain {domain_id}")
        except Exception as e:
            logger.warning(f"Failed to cache conversations for domain {domain_id}: {e}")
    
    async def _get_user_conversations_from_cache(self, domain_id: str, limit: int, offset: int) -> Optional[List[ConversationSummary]]:
        """Get domain conversations from Redis cache"""
        try:
            key = RedisKeys.user_conversations(domain_id)
            data = await self.redis.get(key)
            if data:
                conversations_data = json.loads(data)
                conversations = []
                for conv_data in conversations_data:
                    # Skip deleted conversations from cache
                    if conv_data.get('status') == 'deleted':
                        continue
                    
                    # Convert ISO strings back to datetime objects
                    for field in ['created_at', 'updated_at', 'last_message_at']:
                        if conv_data.get(field):
                            conv_data[field] = datetime.fromisoformat(conv_data[field])
                    conversations.append(ConversationSummary(**conv_data))
                # Apply pagination
                return conversations[offset:offset+limit]
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached conversations for domain {domain_id}: {e}")
            return None
    
    async def _update_user_conversations_cache(self, domain_id: str, new_conversation: Conversation):
        """Update domain conversations cache with new conversation"""
        try:
            # Get current cached conversations
            cached_conversations = await self._get_user_conversations_from_cache(domain_id, 100, 0)  # Get all cached
            if cached_conversations is None:
                cached_conversations = []
            
            # Add new conversation at the beginning
            new_summary = ConversationSummary(
                id=new_conversation.id,
                domain_id=new_conversation.domain_id,
                title=new_conversation.title,
                summary=new_conversation.summary,
                status=new_conversation.status,
                message_count=new_conversation.message_count,
                last_message_at=new_conversation.updated_at,  # Use updated_at as last_message_at
                created_at=new_conversation.created_at,
                updated_at=new_conversation.updated_at
            )
            cached_conversations.insert(0, new_summary)
            
            # Keep only the most recent 50 conversations
            cached_conversations = cached_conversations[:50]
            
            # Re-cache
            await self._cache_user_conversations(domain_id, cached_conversations)
            logger.debug(f"Updated user conversations cache for domain {domain_id}")
        except Exception as e:
            logger.warning(f"Failed to update user conversations cache: {e}")
    
    async def _update_message_feedback_in_cache(self, conversation_id: str, message_id: str, 
                                               liked: int, feedback_text: str, feedback_at: datetime):
        """Update message feedback in Redis cache"""
        try:
            # Get current cached messages
            messages = await self._get_cached_messages(conversation_id)
            
            # Find and update the specific message
            for message in messages:
                if message.id == str(message_id):
                    message.liked = liked
                    message.feedback_text = feedback_text
                    message.feedback_at = feedback_at if liked != 0 or feedback_text else None
                    break
            
            # Re-cache updated messages
            await self._cache_messages(conversation_id, messages)
            
            # Also cache specific feedback for quick access
            feedback_key = RedisKeys.message_feedback(conversation_id, str(message_id))
            feedback_data = {
                'liked': liked,
                'feedback_text': feedback_text,
                'feedback_at': feedback_at.isoformat() if feedback_at else None
            }
            await self.redis.setex(feedback_key, REDIS_TTL_SECONDS, json.dumps(feedback_data))
            
            logger.debug(f"Updated feedback cache for message {message_id}")
        except Exception as e:
            logger.warning(f"Failed to update message feedback in cache: {e}")
    
    async def _cache_conversation_title(self, domain_id: str, conversation_id: str, title: str):
        """Cache conversation title for search"""
        try:
            key = RedisKeys.conversation_titles(domain_id)
            timestamp = datetime.utcnow().timestamp()
            await self.redis.hset(key, conversation_id, json.dumps({
                'title': title,
                'updated_at': timestamp
            }))
            await self.redis.expire(key, REDIS_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Failed to cache title for conversation {conversation_id}: {e}")

    async def _remove_conversation_from_cache(self, domain_id: str, conversation_id: str):
        """Remove conversation from all caches when deleted"""
        try:
            # 1. Remove individual conversation cache
            conv_key = RedisKeys.conversation_cache(conversation_id)
            await self.redis.delete(conv_key)
            
            # 2. Remove conversation messages cache
            msg_key = RedisKeys.conversation_messages(conversation_id)
            await self.redis.delete(msg_key)
            
            # 3. Remove from user conversations cache by invalidating the entire cache
            # (easier than trying to filter out one conversation from JSON)
            user_conv_key = RedisKeys.user_conversations(domain_id)
            await self.redis.delete(user_conv_key)
            
            # 4. Remove from conversation titles cache
            titles_key = RedisKeys.conversation_titles(domain_id)
            await self.redis.hdel(titles_key, conversation_id)
            
            logger.debug(f"Removed conversation {conversation_id} from all caches")
        except Exception as e:
            logger.warning(f"Failed to remove conversation {conversation_id} from cache: {e}")
    
    async def _search_titles_from_redis(self, domain_id: str, query: str, limit: int, offset: int) -> List[ConversationSummary]:
        """Search conversation titles from Redis cache"""
        try:
            key = RedisKeys.conversation_titles(domain_id)
            all_titles = await self.redis.hgetall(key)
            
            if not all_titles:
                return []
            
            # Filter titles containing query (case-insensitive)
            matches = []
            for conversation_id, title_data in all_titles.items():
                try:
                    data = json.loads(title_data)
                    if query.lower() in data['title'].lower():
                        matches.append({
                            'id': conversation_id,
                            'title': data['title'],
                            'updated_at': datetime.fromtimestamp(data['updated_at'])
                        })
                except (json.JSONDecodeError, KeyError):
                    continue
            
            # Sort by updated_at descending and apply pagination
            matches.sort(key=lambda x: x['updated_at'], reverse=True)
            paginated_matches = matches[offset:offset + limit]
            
            # Convert to ConversationSummary objects
            results = []
            for match in paginated_matches:
                # Get full conversation from cache if available (commented out for now)
                # conversation = await self._get_cached_conversation(match['id'])
                # if conversation and conversation.domain_id == domain_id:
                #     results.append(ConversationSummary(
                #         id=conversation.id,
                #         domain_id=conversation.domain_id,
                #         title=conversation.title,
                #         summary=conversation.summary,
                #         status=conversation.status,
                #         message_count=conversation.message_count,
                #         last_message_at=conversation.last_message_at,
                #         created_at=conversation.created_at,
                #         updated_at=conversation.updated_at
                #     ))
                pass  # TODO: Implement non-cache fallback
            
            # Refresh TTL
            await self.redis.expire(key, REDIS_TTL_SECONDS)
            return results
            
        except Exception as e:
            logger.warning(f"Failed to search titles from Redis: {e}")
            return []
    
    async def _get_conversation_from_db(self, conversation_id: str, domain_id: str) -> Optional[Conversation]:
        """Get conversation from database"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT id, domain_id, title, summary, status, metadata, message_count, 
                           total_tokens, created_at, updated_at
                    FROM wl_conversations 
                    WHERE id = %s AND domain_id = %s AND status != 'deleted'
                """, (conversation_id, domain_id))
                
                row = await cursor.fetchone()
                
            if row:
                return self._map_db_to_api_conversation(row)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get conversation from DB: {e}")
            raise
    
    async def _get_messages_from_db(self, conversation_id: str) -> List[Message]:
        """Get conversation messages from database"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT id, conversation_id, chat_id, message_type, content,
                           metadata, token_count, created_at, updated_at, liked, feedback_text, feedback_at
                    FROM wl_messages
                    WHERE conversation_id = %s
                    ORDER BY created_at ASC
                """, (conversation_id,))
                
                rows = await cursor.fetchall()
            
            messages = []
            for row in rows:
                # Decrypt content and selective metadata for API
                raw_meta = row.get('metadata', {})
                meta_dict = json.loads(raw_meta) if isinstance(raw_meta, str) and raw_meta else (raw_meta or {})
                dec_content = await self._decrypt_text(row.get('content'))
                dec_meta = await self._prepare_metadata_for_api(meta_dict)
                message = Message(
                    id=str(row['id']),
                    conversation_id=row['conversation_id'],
                    chat_id=row.get('chat_id'),
                    message_type=MessageType(row['message_type']),
                    content=dec_content,
                    metadata=dec_meta or {},
                    created_at=row['created_at'],
                    updated_at=row.get('updated_at', row['created_at']),
                    liked=row.get('liked', 0),
                    feedback_text=row.get('feedback_text'),
                    feedback_at=row.get('feedback_at')
                )
                messages.append(message)
            
            return messages
            
        except Exception as e:
            logger.error(f"Failed to get messages from DB for conversation {conversation_id}: {e}")
            raise
    
    async def _search_conversations_from_db(self, search_request: SearchRequest) -> Tuple[List[ConversationSummary], int]:
        """Search conversations from database"""
        try:
            # Count total results
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT COUNT(*) as total
                    FROM wl_conversations
                    WHERE domain_id = %s AND status != 'deleted'
                    AND (title LIKE %s OR summary LIKE %s)
                """, (
                    search_request.domain_id,
                    f"%{search_request.query}%",
                    f"%{search_request.query}%"
                ))
                
                total_result = await cursor.fetchone()
                total_count = total_result['total'] if total_result else 0
                
                # Get paginated results
                await cursor.execute("""
                    SELECT id, domain_id, title, summary, status, message_count,
                           last_message_at, created_at, updated_at, total_tokens, metadata
                    FROM wl_conversations
                    WHERE domain_id = %s AND status != 'deleted'
                    AND (title LIKE %s OR summary LIKE %s)
                    ORDER BY COALESCE(last_message_at, created_at) DESC
                    LIMIT %s OFFSET %s
                """, (
                    search_request.domain_id,
                    f"%{search_request.query}%",
                    f"%{search_request.query}%",
                    search_request.limit,
                    search_request.offset
                ))
                
                rows = await cursor.fetchall()
            
            conversations = []
            for row in rows:
                conv = self._map_db_to_api_conversation(row)
                conversations.append(ConversationSummary(
                    id=conv.id,
                    domain_id=conv.domain_id,
                    title=conv.title,
                    summary=conv.summary,
                    status=conv.status,
                    message_count=conv.message_count,
                    last_message_at=row.get('last_message_at'),
                    created_at=conv.created_at,
                    updated_at=conv.updated_at
                ))
            
            return conversations, total_count
            
        except Exception as e:
            logger.error(f"Failed to search conversations from DB: {e}")
            raise
    
    async def _update_user_session_activity(self, domain_id: str, conversation_id: str = None):
        """Update domain session activity"""
        try:
            session_update = UserSessionUpdate(
                active_conversation_id=conversation_id,
                metadata={'last_activity_source': 'conversation_service'}
            )
            await self.update_user_session(domain_id, session_update)
        except Exception as e:
            logger.warning(f"Failed to update user session activity: {e}")

# Global service instance
conversation_service = ConversationService()