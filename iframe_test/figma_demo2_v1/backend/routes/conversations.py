"""
FastAPI routes for conversation management
Provides REST endpoints for conversation CRUD operations, messaging, and search
"""
from fastapi import APIRouter, HTTPException, Query, Depends, Path
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging

# Import our models and services
from models.conversation import (
    ConversationCreate, ConversationUpdate, ConversationResponse, ConversationSummary,
    MessageCreate, MessageResponse, BulkMessageCreate, BulkMessageResponse,
    SearchRequest, SearchResponse, UserSessionUpdate, UserSession,
    APIResponse, ErrorResponse
)
from services.conversation_service import conversation_service

logger = logging.getLogger(__name__)

# Create router for conversation endpoints
router = APIRouter(prefix="/api/conversations", tags=["conversations"])

# ================================================
# CONVERSATION ENDPOINTS
# ================================================

@router.post("/", response_model=ConversationResponse)
async def create_conversation(conversation_data: ConversationCreate):
    """
    Create a new conversation
    
    - **user_id**: ID of the user creating the conversation
    - **title**: Title of the conversation
    - **summary**: Optional summary of the conversation
    - **metadata**: Optional additional metadata
    """
    try:
        conversation = await conversation_service.create_conversation(conversation_data)
        return conversation
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    user_id: str = Query(..., description="User ID")
):
    """
    Get a specific conversation with all messages
    
    - **conversation_id**: ID of the conversation to retrieve
    - **user_id**: ID of the user requesting the conversation
    """
    try:
        conversation = await conversation_service.get_conversation(conversation_id, user_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve conversation: {str(e)}")

@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    update_data: ConversationUpdate = ...,
    user_id: str = Query(..., description="User ID")
):
    """
    Update a conversation
    
    - **conversation_id**: ID of the conversation to update
    - **user_id**: ID of the user updating the conversation
    - **title**: New title for the conversation (optional)
    - **summary**: New summary for the conversation (optional)
    - **status**: New status for the conversation (optional)
    - **metadata**: New metadata for the conversation (optional)
    """
    try:
        conversation = await conversation_service.update_conversation(conversation_id, user_id, update_data)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    user_id: str = Query(..., description="User ID")
):
    """
    Delete a conversation (soft delete)
    
    - **conversation_id**: ID of the conversation to delete
    - **user_id**: ID of the user deleting the conversation
    """
    try:
        success = await conversation_service.delete_conversation(conversation_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return APIResponse(
            success=True,
            message="Conversation deleted successfully",
            data={"conversation_id": conversation_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

# ================================================
# USER CONVERSATIONS
# ================================================

@router.get("/user/{user_id}", response_model=List[ConversationSummary])
async def get_user_conversations(
    user_id: str = Path(..., description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of conversations to return"),
    offset: int = Query(0, ge=0, description="Number of conversations to skip")
):
    """
    Get all conversations for a user with pagination
    
    - **user_id**: ID of the user
    - **limit**: Maximum number of conversations to return (1-100)
    - **offset**: Number of conversations to skip (for pagination)
    """
    try:
        conversations = await conversation_service.get_user_conversations(user_id, limit, offset)
        return conversations
    except Exception as e:
        logger.error(f"Failed to get conversations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve conversations: {str(e)}")

# ================================================
# MESSAGE ENDPOINTS
# ================================================

@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(
    conversation_id: str = Path(..., description="Conversation ID"),
    message_data: MessageCreate = ...,
    user_id: str = Query(..., description="User ID")
):
    """
    Add a message to a conversation
    
    - **conversation_id**: ID of the conversation
    - **user_id**: ID of the user adding the message
    - **message_type**: Type of message (user, assistant, system)
    - **content**: Message content
    - **metadata**: Optional additional metadata
    - **reference_links**: Optional list of reference links
    - **token_count**: Optional token count for the message
    """
    try:
        message = await conversation_service.add_message(conversation_id, user_id, message_data)
        if not message:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return message
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")

@router.post("/{conversation_id}/messages/bulk", response_model=BulkMessageResponse)
async def bulk_add_messages(
    conversation_id: str = Path(..., description="Conversation ID"),
    bulk_data: BulkMessageCreate = ...,
    user_id: str = Query(..., description="User ID")
):
    """
    Add multiple messages to a conversation
    
    - **conversation_id**: ID of the conversation
    - **user_id**: ID of the user adding the messages
    - **messages**: List of messages to add
    """
    try:
        # Ensure conversation_id matches
        bulk_data.conversation_id = conversation_id
        
        result = await conversation_service.bulk_add_messages(bulk_data, user_id)
        return result
    except Exception as e:
        logger.error(f"Failed to bulk add messages to conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add messages: {str(e)}")

# ================================================
# SEARCH ENDPOINTS
# ================================================

@router.get("/search/", response_model=SearchResponse)
async def search_conversations(
    user_id: str = Query(..., description="User ID"),
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip")
):
    """
    Search conversations by title
    
    - **user_id**: ID of the user
    - **query**: Search query to match against conversation titles
    - **limit**: Maximum number of results to return (1-100)
    - **offset**: Number of results to skip (for pagination)
    """
    try:
        search_request = SearchRequest(
            user_id=user_id,
            query=query,
            limit=limit,
            offset=offset
        )
        
        results = await conversation_service.search_conversations(search_request)
        return results
    except Exception as e:
        logger.error(f"Failed to search conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/search/titles", response_model=List[ConversationSummary])
async def search_conversation_titles(
    user_id: str = Query(..., description="User ID"),
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results to return")
):
    """
    Search conversation titles (Redis-optimized endpoint)
    
    - **user_id**: ID of the user
    - **query**: Search query to match against conversation titles
    - **limit**: Maximum number of results to return (1-50)
    """
    try:
        search_request = SearchRequest(
            user_id=user_id,
            query=query,
            limit=limit,
            offset=0
        )
        
        results = await conversation_service.search_conversations(search_request)
        return results.conversations
    except Exception as e:
        logger.error(f"Failed to search conversation titles: {e}")
        raise HTTPException(status_code=500, detail=f"Title search failed: {str(e)}")

# ================================================
# USER SESSION ENDPOINTS
# ================================================

@router.put("/session/{user_id}", response_model=UserSession)
async def update_user_session(
    user_id: str = Path(..., description="User ID"),
    session_data: UserSessionUpdate = ...
):
    """
    Update user session information
    
    - **user_id**: ID of the user
    - **active_conversation_id**: ID of currently active conversation
    - **metadata**: Additional session metadata
    """
    try:
        session = await conversation_service.update_user_session(user_id, session_data)
        return session
    except Exception as e:
        logger.error(f"Failed to update user session for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

# ================================================
# HEALTH CHECK ENDPOINTS
# ================================================

@router.get("/health")
async def health_check():
    """
    Health check endpoint for conversation service
    """
    try:
        # Test Redis connection
        await conversation_service.redis.ping()
        
        # Test MySQL connection
        async with conversation_service.mysql() as (cursor, conn):
            await cursor.execute("SELECT 1")
            await cursor.fetchone()
        
        return APIResponse(
            success=True,
            message="Conversation service is healthy",
            data={
                "redis": "connected",
                "mysql": "connected",
                "service": "running"
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content=ErrorResponse(
                success=False,
                message="Service unavailable",
                error=str(e),
                details={
                    "redis": "disconnected" if "redis" in str(e).lower() else "unknown",
                    "mysql": "disconnected" if "mysql" in str(e).lower() else "unknown",
                    "service": "unhealthy"
                }
            ).dict()
        )

# ================================================
# ERROR HANDLERS
# ================================================

@router.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            success=False,
            message="Invalid request data",
            error=str(exc)
        ).dict()
    )

@router.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception in conversation routes: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            success=False,
            message="Internal server error",
            error="An unexpected error occurred"
        ).dict()
    )

# ================================================
# UTILITY ENDPOINTS FOR DEVELOPMENT
# ================================================

@router.get("/debug/cache/{conversation_id}")
async def debug_cache_status(
    conversation_id: str = Path(..., description="Conversation ID")
):
    """
    Debug endpoint to check cache status (development only)
    """
    try:
        # Check if conversation exists in cache
        cached_conversation = await conversation_service._get_cached_conversation(conversation_id)
        
        # Check Redis keys
        redis_keys = {
            "conversation_cache": f"conversation:{conversation_id}",
            "conversation_messages": f"conversation:{conversation_id}:messages"
        }
        
        key_status = {}
        for key_name, redis_key in redis_keys.items():
            exists = await conversation_service.redis.exists(redis_key)
            ttl = await conversation_service.redis.ttl(redis_key) if exists else None
            key_status[key_name] = {
                "exists": bool(exists),
                "ttl_seconds": ttl
            }
        
        return APIResponse(
            success=True,
            message="Cache debug information",
            data={
                "conversation_id": conversation_id,
                "cached_conversation_exists": cached_conversation is not None,
                "redis_keys": key_status
            }
        )
    except Exception as e:
        logger.error(f"Debug cache status failed: {e}")
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")

# Export the router
__all__ = ["router"]