"""
Conversation Service Layer
Handles business logic for conversation storage, retrieval, and caching
Integrates Redis caching with MySQL persistence
"""
import json
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
    
    async def initialize(self):
        """Initialize service with database connections"""
        await db_manager.initialize()
        self.redis = db_manager.redis
        self.mysql = db_manager.mysql_connection
    
    # ================================================
    # CONVERSATION CRUD OPERATIONS
    # ================================================
    
    async def create_conversation(self, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation"""
        conversation_id = create_conversation_id()
        now = datetime.utcnow()
        
        conversation = Conversation(
            id=conversation_id,
            user_id=conversation_data.user_id,
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
            # Insert into MySQL
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    INSERT INTO conversations 
                    (id, user_id, title, summary, status, metadata, message_count, total_tokens, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    conversation.id, conversation.user_id, conversation.title,
                    conversation.summary, conversation.status.value,
                    json.dumps(conversation.metadata), conversation.message_count,
                    conversation.total_tokens, conversation.created_at, conversation.updated_at
                ))
                await conn.commit()
            
            # Cache in Redis
            await self._cache_conversation(conversation)
            await self._update_user_conversations_cache(conversation.user_id, conversation)
            await self._cache_conversation_title(conversation.user_id, conversation.id, conversation.title)
            
            # Update user session
            await self._update_user_session_activity(conversation.user_id, conversation.id)
            
            logger.info(f"Created conversation {conversation_id} for user {conversation.user_id}")
            return ConversationResponse(**conversation.dict(), messages=[])
            
        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            raise
    
    async def get_conversation(self, conversation_id: str, user_id: str) -> Optional[ConversationResponse]:
        """Get conversation by ID with all messages"""
        try:
            # Try Redis cache first
            cached_conversation = await self._get_cached_conversation(conversation_id)
            if cached_conversation and cached_conversation.user_id == user_id:
                # Get cached messages
                messages = await self._get_cached_messages(conversation_id)
                return ConversationResponse(**cached_conversation.dict(), messages=messages)
            
            # Fallback to database
            conversation = await self._get_conversation_from_db(conversation_id, user_id)
            if not conversation:
                return None
            
            messages = await self._get_messages_from_db(conversation_id)
            
            # Cache the results
            await self._cache_conversation(conversation)
            await self._cache_messages(conversation_id, messages)
            
            return ConversationResponse(**conversation.dict(), messages=messages)
            
        except Exception as e:
            logger.error(f"Failed to get conversation {conversation_id}: {e}")
            raise
    
    async def update_conversation(self, conversation_id: str, user_id: str, 
                                update_data: ConversationUpdate) -> Optional[ConversationResponse]:
        """Update conversation"""
        try:
            # Get existing conversation
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                return None
            
            # Prepare update data
            update_fields = {}
            update_values = []
            
            if update_data.title is not None:
                update_fields['title'] = '%s'
                update_values.append(update_data.title)
            
            if update_data.summary is not None:
                update_fields['summary'] = '%s'
                update_values.append(update_data.summary)
            
            if update_data.status is not None:
                update_fields['status'] = '%s'
                update_values.append(update_data.status.value)
            
            if update_data.metadata is not None:
                update_fields['metadata'] = '%s'
                update_values.append(json.dumps(update_data.metadata))
            
            if not update_fields:
                return conversation
            
            update_fields['updated_at'] = 'NOW()'
            
            # Update in MySQL
            set_clause = ', '.join([f"{field} = {value}" for field, value in update_fields.items()])
            update_values.extend([conversation_id, user_id])
            
            async with self.mysql() as (cursor, conn):
                await cursor.execute(f"""
                    UPDATE conversations 
                    SET {set_clause}
                    WHERE id = %s AND user_id = %s
                """, update_values)
                await conn.commit()
            
            # Get updated conversation
            updated_conversation = await self.get_conversation(conversation_id, user_id)
            
            # Update caches
            if updated_conversation:
                await self._cache_conversation(updated_conversation)
                if update_data.title:
                    await self._cache_conversation_title(user_id, conversation_id, update_data.title)
            
            logger.info(f"Updated conversation {conversation_id}")
            return updated_conversation
            
        except Exception as e:
            logger.error(f"Failed to update conversation {conversation_id}: {e}")
            raise
    
    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete conversation (soft delete)"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    UPDATE conversations 
                    SET status = 'deleted', updated_at = NOW()
                    WHERE id = %s AND user_id = %s
                """, (conversation_id, user_id))
                affected_rows = cursor.rowcount
                await conn.commit()
            
            if affected_rows > 0:
                # Remove from caches
                await self._remove_conversation_from_cache(user_id, conversation_id)
                logger.info(f"Deleted conversation {conversation_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            raise
    
    # ================================================
    # MESSAGE OPERATIONS
    # ================================================
    
    async def add_message(self, conversation_id: str, user_id: str, 
                         message_data: MessageCreate) -> Optional[MessageResponse]:
        """Add message to conversation"""
        try:
            # Verify conversation exists and belongs to user
            conversation = await self._get_conversation_from_db(conversation_id, user_id)
            if not conversation:
                return None
            
            message_id = create_message_id()
            now = datetime.utcnow()
            
            message = Message(
                id=message_id,
                conversation_id=conversation_id,
                message_type=message_data.message_type,
                content=message_data.content,
                metadata=message_data.metadata or {},
                token_count=message_data.token_count,
                created_at=now,
                updated_at=now
            )
            
            # Insert message into MySQL
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    INSERT INTO messages 
                    (id, conversation_id, message_type, content, metadata, token_count, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    message.id, message.conversation_id, message.message_type.value,
                    message.content, json.dumps(message.metadata), message.token_count,
                    message.created_at, message.updated_at
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
            
            # Update conversation cache
            await self._add_message_to_cache(conversation_id, message)
            await self._update_user_session_activity(user_id, conversation_id)
            
            # Note: Conversation stats are updated by database trigger
            
            logger.info(f"Added message {message_id} to conversation {conversation_id}")
            return MessageResponse(**message.dict())
            
        except Exception as e:
            logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
            raise
    
    async def bulk_add_messages(self, bulk_data: BulkMessageCreate, user_id: str) -> BulkMessageResponse:
        """Add multiple messages to a conversation"""
        try:
            # Verify conversation exists
            conversation = await self._get_conversation_from_db(bulk_data.conversation_id, user_id)
            if not conversation:
                raise ValueError(f"Conversation {bulk_data.conversation_id} not found")
            
            created_messages = []
            failed_messages = []
            
            for message_data in bulk_data.messages:
                try:
                    message = await self.add_message(bulk_data.conversation_id, user_id, message_data)
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
    
    # ================================================
    # SEARCH OPERATIONS
    # ================================================
    
    async def search_conversations(self, search_request: SearchRequest) -> SearchResponse:
        """Search conversations by title (Redis first, then database fallback)"""
        try:
            # Try Redis search first
            redis_results = await self._search_titles_from_redis(
                search_request.user_id, 
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
    
    async def get_user_conversations(self, user_id: str, limit: int = 20, 
                                   offset: int = 0) -> List[ConversationSummary]:
        """Get user's conversations with pagination"""
        try:
            # Try Redis cache first
            cached_conversations = await self._get_user_conversations_from_cache(user_id, limit, offset)
            if cached_conversations:
                return cached_conversations
            
            # Fallback to database
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT id, user_id, title, summary, status, message_count, 
                           last_message_at, created_at, updated_at
                    FROM conversations
                    WHERE user_id = %s AND status != 'deleted'
                    ORDER BY COALESCE(last_message_at, created_at) DESC
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
                
                rows = await cursor.fetchall()
            
            conversations = [
                ConversationSummary(
                    id=row['id'],
                    user_id=row['user_id'],
                    title=row['title'],
                    summary=row['summary'],
                    status=ConversationStatus(row['status']),
                    message_count=row['message_count'] or 0,
                    last_message_at=row['last_message_at'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                for row in rows
            ]
            
            # Cache the results
            await self._cache_user_conversations(user_id, conversations)
            
            return conversations
            
        except Exception as e:
            logger.error(f"Failed to get conversations for user {user_id}: {e}")
            raise
    
    # ================================================
    # USER SESSION OPERATIONS
    # ================================================
    
    async def update_user_session(self, user_id: str, 
                                session_update: UserSessionUpdate) -> UserSession:
        """Update user session"""
        try:
            now = datetime.utcnow()
            
            # Update in database
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    INSERT INTO user_sessions (user_id, last_activity, active_conversation_id, metadata, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    last_activity = VALUES(last_activity),
                    active_conversation_id = VALUES(active_conversation_id),
                    metadata = VALUES(metadata),
                    updated_at = VALUES(updated_at)
                """, (
                    user_id, now, session_update.active_conversation_id,
                    json.dumps(session_update.metadata or {}), now
                ))
                await conn.commit()
            
            # Update Redis cache
            session_key = RedisKeys.user_session(user_id)
            session_data = {
                'user_id': user_id,
                'last_activity': now.isoformat(),
                'active_conversation_id': session_update.active_conversation_id,
                'metadata': json.dumps(session_update.metadata or {})
            }
            
            await self.redis.hset(session_key, mapping=session_data)
            await self.redis.expire(session_key, REDIS_TTL_SECONDS)
            
            return UserSession(
                user_id=user_id,
                last_activity=now,
                active_conversation_id=session_update.active_conversation_id,
                metadata=session_update.metadata or {}
            )
            
        except Exception as e:
            logger.error(f"Failed to update user session for {user_id}: {e}")
            raise
    
    # ================================================
    # PRIVATE HELPER METHODS
    # ================================================
    
    async def _cache_conversation(self, conversation: Conversation):
        """Cache conversation in Redis"""
        try:
            key = RedisKeys.conversation_cache(conversation.id)
            await self.redis.hset(key, mapping=conversation.dict())
            await self.redis.expire(key, REDIS_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Failed to cache conversation {conversation.id}: {e}")
    
    async def _get_cached_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation from Redis cache"""
        try:
            key = RedisKeys.conversation_cache(conversation_id)
            data = await self.redis.hgetall(key)
            if data:
                # Refresh TTL
                await self.redis.expire(key, REDIS_TTL_SECONDS)
                return Conversation(**data)
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached conversation {conversation_id}: {e}")
            return None
    
    async def _cache_conversation_title(self, user_id: str, conversation_id: str, title: str):
        """Cache conversation title for search"""
        try:
            key = RedisKeys.conversation_titles(user_id)
            timestamp = datetime.utcnow().timestamp()
            await self.redis.hset(key, conversation_id, json.dumps({
                'title': title,
                'updated_at': timestamp
            }))
            await self.redis.expire(key, REDIS_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Failed to cache title for conversation {conversation_id}: {e}")
    
    async def _search_titles_from_redis(self, user_id: str, query: str, limit: int, offset: int) -> List[ConversationSummary]:
        """Search conversation titles from Redis cache"""
        try:
            key = RedisKeys.conversation_titles(user_id)
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
                # Get full conversation from cache if available
                conversation = await self._get_cached_conversation(match['id'])
                if conversation and conversation.user_id == user_id:
                    results.append(ConversationSummary(
                        id=conversation.id,
                        user_id=conversation.user_id,
                        title=conversation.title,
                        summary=conversation.summary,
                        status=conversation.status,
                        message_count=conversation.message_count,
                        last_message_at=conversation.last_message_at,
                        created_at=conversation.created_at,
                        updated_at=conversation.updated_at
                    ))
            
            # Refresh TTL
            await self.redis.expire(key, REDIS_TTL_SECONDS)
            return results
            
        except Exception as e:
            logger.warning(f"Failed to search titles from Redis: {e}")
            return []
    
    async def _get_conversation_from_db(self, conversation_id: str, user_id: str) -> Optional[Conversation]:
        """Get conversation from database"""
        try:
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT * FROM conversations 
                    WHERE id = %s AND user_id = %s AND status != 'deleted'
                """, (conversation_id, user_id))
                
                row = await cursor.fetchone()
                
            if row:
                return Conversation(
                    id=row['id'],
                    user_id=row['user_id'],
                    title=row['title'],
                    summary=row['summary'],
                    status=ConversationStatus(row['status']),
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    message_count=row['message_count'] or 0,
                    total_tokens=row['total_tokens'] or 0,
                    last_message_at=row['last_message_at'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get conversation from DB: {e}")
            raise
    
    async def _search_conversations_from_db(self, search_request: SearchRequest) -> Tuple[List[ConversationSummary], int]:
        """Search conversations from database"""
        try:
            # Count total results
            async with self.mysql() as (cursor, conn):
                await cursor.execute("""
                    SELECT COUNT(*) as total
                    FROM conversations
                    WHERE user_id = %s AND status != 'deleted'
                    AND (title LIKE %s OR summary LIKE %s)
                """, (
                    search_request.user_id,
                    f"%{search_request.query}%",
                    f"%{search_request.query}%"
                ))
                
                total_result = await cursor.fetchone()
                total_count = total_result['total'] if total_result else 0
                
                # Get paginated results
                await cursor.execute("""
                    SELECT id, user_id, title, summary, status, message_count,
                           last_message_at, created_at, updated_at
                    FROM conversations
                    WHERE user_id = %s AND status != 'deleted'
                    AND (title LIKE %s OR summary LIKE %s)
                    ORDER BY COALESCE(last_message_at, created_at) DESC
                    LIMIT %s OFFSET %s
                """, (
                    search_request.user_id,
                    f"%{search_request.query}%",
                    f"%{search_request.query}%",
                    search_request.limit,
                    search_request.offset
                ))
                
                rows = await cursor.fetchall()
            
            conversations = [
                ConversationSummary(
                    id=row['id'],
                    user_id=row['user_id'],
                    title=row['title'],
                    summary=row['summary'],
                    status=ConversationStatus(row['status']),
                    message_count=row['message_count'] or 0,
                    last_message_at=row['last_message_at'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                for row in rows
            ]
            
            return conversations, total_count
            
        except Exception as e:
            logger.error(f"Failed to search conversations from DB: {e}")
            raise
    
    async def _update_user_session_activity(self, user_id: str, conversation_id: str = None):
        """Update user session activity"""
        try:
            session_update = UserSessionUpdate(
                active_conversation_id=conversation_id,
                metadata={'last_activity_source': 'conversation_service'}
            )
            await self.update_user_session(user_id, session_update)
        except Exception as e:
            logger.warning(f"Failed to update user session activity: {e}")

# Global service instance
conversation_service = ConversationService()