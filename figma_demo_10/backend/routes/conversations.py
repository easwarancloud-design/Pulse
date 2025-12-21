"""
FastAPI routes for conversation management
Provides REST endpoints for conversation CRUD operations, messaging, and search
"""
from fastapi import APIRouter, HTTPException, Query, Depends, Path, Request
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional, Union, Callable, Dict, Any
import logging, json, time, re
import requests

# Import our models and services
from models.conversation import (
    ConversationCreate, ConversationUpdate, ConversationResponse, ConversationSummary,
    MessageCreate, MessageResponse, BulkMessageCreate, BulkMessageResponse,
    SearchRequest, SearchResponse, UserSessionUpdate, UserSession,
    MessageFeedbackUpdate, APIResponse, ErrorResponse,
    ChatHistoryResponse, ChatHistoryEntry
)
from services.conversation_service import conversation_service
from Tasks.Workday.associate_info import store_associateinfo
from Tasks.Workday.payroll_hr import store_payrollhr
from modules.workflow_utils import jwt_auth

logger = logging.getLogger(__name__)

# Create router for conversation endpoints  
router = APIRouter(prefix="/api", tags=["conversations"])

# ================================================
# HEALTH CHECK ENDPOINT (must be before parameterized routes)
# ================================================

@router.get("/conversations/health")
async def health_check(
    domain_id: Optional[str] = Query(None, description="Optional domain ID for testing")
):
    """
    Health check endpoint for conversation service
    Note: domain_id is optional for health checks
    Full path: /api/conversations/health
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
# CACHE MANAGEMENT ENDPOINTS
# ================================================

@router.delete("/cache/clear/{domain_id}")
async def clear_user_cache(
    domain_id: str = Path(..., description="Domain ID to clear cache for")
):
    """
    Clear Redis cache for a specific domain user
    Full path: /api/cache/clear/{domain_id}
    
    This endpoint clears:
    - User conversations list cache
    - Individual conversation caches (optional, can be extended)
    
    Useful for debugging or forcing fresh data from database
    """
    try:
        from config.database import RedisKeys
        
        # Clear user conversations cache
        cache_key = RedisKeys.user_conversations(domain_id)
        deleted_count = await conversation_service.redis.delete(cache_key)
        
        # Optional: Clear conversation titles cache
        titles_key = f"conversations:titles:{domain_id}"
        titles_deleted = await conversation_service.redis.delete(titles_key)
        
        logger.info(f"Cleared cache for domain {domain_id}: {deleted_count + titles_deleted} keys deleted")
        
        return APIResponse(
            success=True,
            message=f"Cache cleared successfully for domain {domain_id}",
            data={
                "domain_id": domain_id,
                "keys_deleted": deleted_count + titles_deleted,
                "cache_keys_cleared": [
                    cache_key,
                    titles_key
                ]
            }
        )
    except Exception as e:
        logger.error(f"Failed to clear cache for domain {domain_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to clear cache: {str(e)}"
        )

# ================================================
# CONVERSATION ENDPOINTS
# ================================================

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate
):
    """
    Create a new conversation
    Full path: /api/conversations
    
    - **domain_id**: ID of the domain creating the conversation (in request body)
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

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Get a specific conversation with all messages
    
    - **conversation_id**: ID of the conversation to retrieve
    - **domain_id**: ID of the domain requesting the conversation
    """
    try:
        # Handle local conversation IDs - return 404 for non-existent local conversations
        if conversation_id.startswith('local_'):
            raise HTTPException(status_code=404, detail="Local conversation not found in storage")
            
        conversation = await conversation_service.get_conversation(conversation_id, domain_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve conversation: {str(e)}")

@router.post("/conversations/{conversation_id}/update", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    update_data: ConversationUpdate = ...,
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Update a conversation
    
    - **conversation_id**: ID of the conversation to update
    - **domain_id**: ID of the domain updating the conversation
    - **title**: New title for the conversation (optional)
    - **summary**: New summary for the conversation (optional)
    - **status**: New status for the conversation (optional)
    - **metadata**: New metadata for the conversation (optional)
    """
    try:
        conversation = await conversation_service.update_conversation(conversation_id, domain_id, update_data)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")

@router.post("/conversations/{conversation_id}/delete")
async def delete_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Delete a conversation (soft delete) - Using POST method for better compatibility
    
    - **conversation_id**: ID of the conversation to delete
    - **domain_id**: ID of the domain deleting the conversation
    """
    try:
        success = await conversation_service.delete_conversation(conversation_id, domain_id)
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

@router.get("/conversations/user/{domain_id}", response_model=List[ConversationSummary])
async def get_user_conversations(
    domain_id: str = Path(..., description="Domain ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of conversations to return"),
    offset: int = Query(0, ge=0, description="Number of conversations to skip")
):
    """
    Get all conversations for a domain with pagination
    
    - **domain_id**: ID of the domain
    - **limit**: Maximum number of conversations to return (1-100)
    - **offset**: Number of conversations to skip (for pagination)
    """
    try:
        # Ensure conversation_service is available
        if not hasattr(conversation_service, 'get_user_conversations'):
            logger.error("Conversation service not properly initialized")
            return []
            
        conversations = await conversation_service.get_user_conversations(domain_id, limit, offset)
        return conversations or []
    except Exception as e:
        logger.error(f"Failed to get conversations for domain {domain_id}: {e}")
        # Return empty list instead of raising 500 error to prevent frontend crashes
        return []

# ================================================
# MESSAGE ENDPOINTS
# ================================================

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(
    conversation_id: str = Path(..., description="Conversation ID"),
    message_data: MessageCreate = ...,
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Add a message to a conversation
    
    - **conversation_id**: ID of the conversation
    - **domain_id**: ID of the domain adding the message
    - **message_type**: Type of message (user, assistant, system)
    - **content**: Message content
    - **metadata**: Optional additional metadata
    - **reference_links**: Optional list of reference links
    - **token_count**: Optional token count for the message
    """
    try:
        message = await conversation_service.add_message(conversation_id, domain_id, message_data)
        if not message:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return message
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")

@router.post("/conversations/{conversation_id}/messages/bulk", response_model=BulkMessageResponse)
async def bulk_add_messages(
    conversation_id: str = Path(..., description="Conversation ID"),
    bulk_data: BulkMessageCreate = ...,
    domain_id: str = Query(..., description="Domain ID")
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
        
        result = await conversation_service.bulk_add_messages(bulk_data, domain_id)
        return result
    except Exception as e:
        logger.error(f"Failed to bulk add messages to conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add messages: {str(e)}")

@router.post("/conversations/{conversation_id}/messages/{chat_id}/update", response_model=MessageResponse)
async def update_message_content(
    conversation_id: str = Path(..., description="Conversation ID"),
    chat_id: str = Path(..., description="Chat ID (message identifier)"),
    message_data: MessageCreate = ...,
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Update an existing message content by chat_id (used for regenerated responses)
    
    - **conversation_id**: ID of the conversation
    - **chat_id**: Chat ID of the message to update
    - **domain_id**: Domain ID
    - **content**: New message content
    """
    try:
        logger.info(f"Updating message content for chat_id={chat_id} in conversation={conversation_id}")
        
        updated_message = await conversation_service.update_message_content(
            conversation_id, 
            chat_id, 
            domain_id,
            message_data.content,
            message_data.metadata
        )
        
        if not updated_message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return updated_message
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update message content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update message: {str(e)}")

# ================================================
###############################################
# Unified Chat Endpoint (History + Streaming)
###############################################

async def _build_chat_history(conversation_id: str, domainid: str, limit: int = 10, doc_id: Optional[str] = None) -> List[dict]:
    """Build chat history from cached recent messages (user/assistant only) filtered optionally by doc_id."""
    try:
        recent = await conversation_service.get_recent_messages(conversation_id, domainid, limit=limit, doc_id=doc_id)
    except Exception:
        return []
    history: List[dict] = []
    for msg in recent:
        if msg.message_type in ("user", "assistant"):
            history.append({"role": msg.message_type, "content": (msg.content or "").strip()})
            if len(history) >= limit:
                break
    return history

async def _build_chat_history_liveagent(conversation_id: str, domainid: str, limit: int = 10, doc_id: Optional[str] = None) -> List[dict]:
    """Build chat history strictly from Redis cache via ConversationService (no DB fallback).
    Includes user/assistant and liveagent messages. Returns list of dicts with role and content.
    role will be one of 'user', 'assistant', or 'agent' (mapped from 'liveagent').
    """
    try:
        recent = await conversation_service.get_recent_messages_cache_only(conversation_id, domainid, limit=limit, doc_id=doc_id)
    except Exception:
        return []
    history: List[dict] = []
    for msg in recent:
        mt = (msg.message_type or '').lower()
        if mt in ("user", "assistant", "liveagent"):
            role = mt if mt in ("user", "assistant") else "agent"
            history.append({"role": role, "content": (msg.content or "").strip(), "raw_type": mt})
            if len(history) >= limit:
                break
    return history

async def stream_response_wa(user_input: dict, conversation_id: Optional[str], domainid: str):
    """Copied streaming logic (adapted) from original app.stream_response, renamed.
    Does NOT alter the original function. Adds our cache TTL refresh after completion.
    """
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

    # Import workflow helpers from app without modifying them
    try:
        from app import clean_stream_text, clean_visible_text
    except Exception as e:
        yield f"Initialization error: {e}"
        return


    for output in app_wk.stream(user_input):
        if isinstance(output, dict) and output.get("classify_task", {}).get("task") == "get_liveagent":
            logger.info("Detected Live Agent Task")
            yield "<<LiveAgent>>"
            return

        if isinstance(output, dict) and "generate_response" in output:
            value = output["generate_response"]
            headers = value["response"]["headers"]
            payload = value["response"]["data"]
            purl = value["response"]["url"]
            pre_task = value["response"]["task"]

            try:
                response = requests.post(purl, headers=headers, data=payload, stream=True, verify=False, timeout=40)
                logger.info(f"Stream connection latency: {time.time() - start_time:.2f}s")

                if response.status_code != 200:
                    logger.info(f"response Error text :{response.text}, response code: {response.status_code}")
                    yield "Could not fetch response. Please check with Admin."
                    return

                buffer = ""
                first_chunk_time = None

                for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                    if not chunk:
                        continue

                    pattern = r"\nid:.*?\n\n"
                    text = re.sub(pattern, "", chunk, flags=re.DOTALL).replace("data: ", "").replace("Content-Length: 0", "")

                    if not first_chunk_time:
                        first_chunk_time = time.time()
                        logger.info(f"First content received after: {first_chunk_time - start_time:.2f}s")

                        if "<<" in text or ">>" in text:
                            match = re.search(r'<<(.*?)>>(.*)', text, re.DOTALL)
                            if match:
                                buffer = f"<<{match.group(1).strip()}>>"
                                buffer = buffer.replace("<<warning>1</warning>", f"<a href='{Initial_url}'>Initial Warning</a>\n<a href='{warning_url}'>Written Warning</a>")
                                buffer = buffer.replace("<termination>1</termination>>", f"\n<a href='{termination_url}'>Request a Termination</a>")
                                buffer = buffer.replace("<<warning>0</warning>", "").replace("<termination>0</termination>>", "")
                                case_creation = buffer
                                data = match.group(2).strip()
                                full_response += data
                                yield data
                            else:
                                full_response += text
                                yield text
                        else:
                            full_response += text
                            yield text
                    else:
                        full_response += text
                        yield text

                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    try:
                        cleaned_response = clean_stream_text(full_response)
                        policy_response = requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            data=json.dumps({"prompt": str(cleaned_response)}),
                            verify=False,
                            timeout=40
                        )
                        logger.info(f"HR policy API latency: {time.time() - start_time:.2f}s")

                        if policy_response.status_code == 200:
                            output_list = []
                            for item in policy_response.json():
                                if "document" in item:
                                    tags = item["document"].get("tags", [])
                                    title = next((t["value"] for t in tags if t.get("name") == "title"), None)
                                    url = next((t["value"] for t in tags if t.get("name") == "url"), None)
                                    if title and url:
                                        output_list.append(f'<a href="{url}">{title}</a>')
                            policy_links = "\n".join(list(dict.fromkeys(output_list))[:2])
                            final_block = ""
                            if clean_visible_text(policy_links):
                                final_block += "\n\n**Reference Links:**\n" + policy_links
                            if clean_visible_text(case_creation):
                                final_block += "\n\n**Create a case using these links:**\n" + case_creation
                            if final_block:
                                yield final_block
                        else:
                            yield "⚠️ Failed to retrieve Reference links."
                    except Exception as e:
                        logger.info(f"Policy retrieval error: {str(e)}")
                        yield "⚠️ Unable to fetch reference link."
            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")

    # Our cache TTL refresh (instead of legacy redis_client expirations)
    try:
        if conversation_id:
            await conversation_service._refresh_cache_expiry(conversation_id, domainid)
    except Exception:
        pass


@router.get("/workforceagent/chat")
async def unified_chat(
    request: Request,
    conversation_id: str = Query(..., description="Conversation ID for history & cache refresh"),
    token_payload=Depends(jwt_auth),
    limit: int = Query(10, ge=1, le=100, description="Max recent messages to seed chat history"),
    doc_id: Optional[str] = Query(None, description="Optional document ID filter applied to history")
):
    """Single endpoint combining history fetch + streaming response.
    Returns a streaming response; history is used internally for prompt context.
    Headers required: domainid, question.
    Query optional: conversation_id (for cache refresh and history), limit.
    """
    domainid = request.headers.get("domainid")
    question = request.headers.get("question")
    if not domainid or not question:
        raise HTTPException(status_code=400, detail="Missing 'domainid' or 'question' headers")
    token_domainid = token_payload.get("sub")
    if str(domainid).upper() != str(token_domainid).upper():
        raise HTTPException(status_code=403, detail=f"Unauthorized domainid:{domainid}")
    domainid_up = str(domainid).upper()
    chat_history = await _build_chat_history(conversation_id, domainid_up, limit, doc_id)
    user_input = {
        "query": question,
        "domainid": domainid_up,
        "chat_history": chat_history,
        "language": "en",
        "doc_id": doc_id
    }
    # When doc_id and domainid are present, use news_thread; otherwise fall back to stream_response_wa
    if doc_id and domainid_up:
        return StreamingResponse(
            news_thread(user_input, conversation_id, domainid_up, doc_id=doc_id, chat_history=chat_history),
            media_type="text/plain",
        )
    return StreamingResponse(stream_response_wa(user_input, conversation_id, domainid_up), media_type="text/plain")

@router.post("/conversations/{conversation_id}/messages/{message_id}/feedback")
async def update_message_feedback(
    conversation_id: str = Path(..., description="Conversation ID"),
    message_id: str = Path(..., description="Message ID"),
    feedback_data: MessageFeedbackUpdate = ...,
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Update message feedback (like/dislike/text) by message ID - Using POST method for consistency
    
    - **conversation_id**: ID of the conversation
    - **message_id**: ID of the message to update
    - **domain_id**: ID of the domain updating the feedback
    - **liked**: Feedback value (-1=dislike, 0=neutral, 1=like)
    - **feedback_text**: Optional feedback text
    """
    try:
        success = await conversation_service.update_message_feedback(
            conversation_id, message_id, domain_id, feedback_data.liked, feedback_data.feedback_text
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Message or conversation not found")
        
        return APIResponse(
            success=True,
            message="Feedback updated successfully",
            data={
                "conversation_id": conversation_id,
                "message_id": message_id,
                "liked": feedback_data.liked,
                "feedback_text": feedback_data.feedback_text
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update message feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update feedback: {str(e)}")

@router.post("/conversations/{conversation_id}/chat/{chat_id}/feedback")
async def update_chat_feedback(
    conversation_id: str = Path(..., description="Conversation ID"),
    chat_id: str = Path(..., description="Chat bubble ID from frontend"),
    feedback_data: MessageFeedbackUpdate = ...,
    domain_id: str = Query(..., description="Domain ID")
):
    """
    Update message feedback (like/dislike/text) by chat ID - Using POST method for consistency
    
    - **conversation_id**: ID of the conversation
    - **chat_id**: Frontend chat bubble ID (e.g., 'bot-1', 'assistant-2')
    - **domain_id**: ID of the domain updating the feedback
    - **liked**: Feedback value (-1=dislike, 0=neutral, 1=like)
    - **feedback_text**: Optional feedback text
    """
    try:
        success = await conversation_service.update_message_feedback_by_chat_id(
            conversation_id, chat_id, domain_id, feedback_data.liked, feedback_data.feedback_text
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Message with chat ID not found")
        
        return APIResponse(
            success=True,
            message="Feedback updated successfully",
            data={
                "conversation_id": conversation_id,
                "chat_id": chat_id,
                "liked": feedback_data.liked,
                "feedback_text": feedback_data.feedback_text
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update chat feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update feedback: {str(e)}")

# ================================================
# SEARCH ENDPOINTS
# ================================================

@router.get("/conversations/search/", response_model=SearchResponse)
async def search_conversations(
    domain_id: str = Query(..., description="Domain ID"),
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip")
):
    """
    Search conversations by title
    
    - **domain_id**: ID of the domain
    - **query**: Search query to match against conversation titles
    - **limit**: Maximum number of results to return (1-100)
    - **offset**: Number of results to skip (for pagination)
    """
    try:
        # Ensure conversation_service is available
        if not hasattr(conversation_service, 'search_conversations'):
            logger.error("Conversation service search not properly initialized")
            return SearchResponse(conversations=[], total=0, limit=limit, offset=offset)
            
        search_request = SearchRequest(
            domain_id=domain_id,
            query=query,
            limit=limit,
            offset=offset
        )
        
        results = await conversation_service.search_conversations(search_request)
        return results
    except Exception as e:
        logger.error(f"Failed to search conversations: {e}")
        # Return empty results instead of raising 500 error to prevent frontend crashes
        return SearchResponse(conversations=[], total=0, limit=limit, offset=offset)

@router.get("/conversations/search/titles", response_model=List[ConversationSummary])
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

@router.get("/conversations/session/{domain_id}", response_model=UserSession)
async def get_user_session(
    domain_id: str = Path(..., description="Domain ID")
):
    """
    Get current user session information

    - **domain_id**: ID of the domain
    """
    try:
        session = await conversation_service.get_user_session(domain_id)
        if not session:
            raise HTTPException(status_code=404, detail="User session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user session for {domain_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@router.post("/conversations/session/{domain_id}/update", response_model=UserSession)
async def update_user_session(
    domain_id: str = Path(..., description="Domain ID"),
    session_data: UserSessionUpdate = ...
):
    """
    Update user session information
    
    - **domain_id**: ID of the domain
    - **active_conversation_id**: ID of currently active conversation
    - **metadata**: Additional session metadata
    """
    try:
        session = await conversation_service.update_user_session(domain_id, session_data)
        return session
    except Exception as e:
        logger.error(f"Failed to update user session for {domain_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

# ================================================
# ERROR HANDLERS (MOVED TO MAIN APP)
# ================================================
# Note: Exception handlers should be added to the main FastAPI app, not the router

# @router.exception_handler(ValueError)
# async def value_error_handler(request, exc):
#     """Handle ValueError exceptions"""
#     return JSONResponse(
#         status_code=400,
#         content=ErrorResponse(
#             success=False,
#             message="Invalid request data",
#             error=str(exc)
#         ).dict()
#     )

# @router.exception_handler(Exception)
# async def general_exception_handler(request, exc):
#     """Handle general exceptions"""
#     logger.error(f"Unhandled exception in conversation routes: {exc}")
#     return JSONResponse(
#         status_code=500,
#         content=ErrorResponse(
#             success=False,
#             message="Internal server error",
#             error="An unexpected error occurred"
#         ).dict()
#     )

# ================================================
# UTILITY ENDPOINTS FOR DEVELOPMENT
# ================================================

@router.get("/conversations/debug/cache/{conversation_id}")
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

# ================================================
# Helper: Streaming news/thread fetcher (standalone)
# ================================================

async def news_thread(
    user_input: dict,
    conversation_id: Optional[str],
    domainid: str,
    doc_id: Optional[str] = None,
    chat_history: list = None,
):
    """Standalone streaming function using the same logic as stream_response_wa.

    Parameters:
    - user_input: dict containing query, domainid, chat_history, language, doc_id
    - conversation_id: conversation id for cache refresh
    - domainid: domain id (uppercase expected by callers)
    - doc_id: optional document id (not required by logic but accepted)
    """
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

    # Import workflow and helpers from app without modifying them
    try:
        from app import app_wk, clean_stream_text, clean_visible_text
    except Exception as e:
        yield f"Initialization error: {e}"
        return

    # Initialize Horizon API base, endpoint, and auth headers for policy calls
    url_base = "https://api.horizon.elevancehealth.com"
    end_point = "/v2/document/chats"  # used for Horizon chat streaming
    horizon_headers = {"Content-Type": "application/json"}
    try:
        from modules.workflow_utils import get_statetoken
        token = get_statetoken(domainid)
        horizon_headers["domainID"] = domainid
        horizon_headers["Authorization"] = f"Bearer {token}"
    except Exception as e:
        logger.info(f"Horizon token initialization failed in news_thread: {e}")
        horizon_headers.setdefault("domainID", domainid)

    # Build messages array from prompt, chat_history, and user query (ensure non-empty fallback)
    from urllib.parse import quote_plus
    try:
        # Import and use standardized news thread prompt provider
        from Tasks.Servicenow.hr_policy import get_newsthread_prompt
        prompt = get_newsthread_prompt()
    except Exception:
        prompt = ""
    user_query = user_input.get("query", "")
    messages = ([{"content": prompt, "role": "system"}] if prompt else [])
    if chat_history:
        messages.extend(chat_history)
    # Always include user's query so payload is never empty
    messages.append({"content": user_query, "role": "user"})

    # Direct invocation without app_wk.stream: expect user_input to already contain generate_response.response
    try:
        encoded_doc_id = quote_plus(str(doc_id)) if doc_id else None
        response = requests.post(
            (f"{url_base}{end_point}?q=any.tags.id={encoded_doc_id}" if encoded_doc_id else f"{url_base}{end_point}"),
            headers=horizon_headers,
            data=json.dumps({"messages": messages}),
            stream=True,
            verify=False,
            timeout=40,
        )
        logger.info(f"Stream connection latency: {time.time() - start_time:.2f}s")

        if response.status_code != 200:
            logger.info(f"response Error text :{response.text}, response code: {response.status_code}")
            yield "Could not fetch response. Please check with Admin."
            return

        buffer = ""
        first_chunk_time = None

        for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
            if not chunk:
                continue

            pattern = r"\nid:.*?\n\n"
            text = re.sub(pattern, "", chunk, flags=re.DOTALL).replace("data: ", "").replace("Content-Length: 0", "")

            if not first_chunk_time:
                first_chunk_time = time.time()
                logger.info(f"First content received after: {first_chunk_time - start_time:.2f}s")

                if "<<" in text or ">>" in text:
                    match = re.search(r'<<(.*?)>>(.*)', text, re.DOTALL)
                    if match:
                        buffer = f"<<{match.group(1).strip()}>>"
                        buffer = buffer.replace("<<warning>1</warning>", f"<a href='{Initial_url}'>Initial Warning</a>\n<a href='{warning_url}'>Written Warning</a>")
                        buffer = buffer.replace("<termination>1</termination>>", f"\n<a href='{termination_url}'>Request a Termination</a>")
                        buffer = buffer.replace("<<warning>0</warning>", "").replace("<termination>0</termination>>", "")
                        case_creation = buffer
                        data = match.group(2).strip()
                        full_response += data
                        yield data
                    else:
                        full_response += text
                        yield text
                else:
                    full_response += text
                    yield text
            else:
                full_response += text
                yield text

        # Always fetch HR policy links (removed conditional check on task)
        logger.info("Fetching HR policy links…")
        try:
            cleaned_response = clean_stream_text(full_response)
            policy_response = requests.post(
                (f"{url_base}/v2/document/searches?q=any.tags.id={encoded_doc_id}" if encoded_doc_id else f"{url_base}/v2/document/searches"),
                headers=horizon_headers,
                data=json.dumps({"prompt": str(cleaned_response)}),
                verify=False,
                timeout=40,
            )
            logger.info(f"HR policy API latency: {time.time() - start_time:.2f}s")

            if policy_response.status_code == 200:
                output_list = []
                for item in policy_response.json():
                    if "document" in item:
                        tags = item["document"].get("tags", [])
                        title = next((t["value"] for t in tags if t.get("name") == "title"), None)
                        url = next((t["value"] for t in tags if t.get("name") == "url"), None)
                        if title and url:
                            output_list.append(f'<a href="{url}">{title}</a>')
                policy_links = "\n".join(list(dict.fromkeys(output_list))[:2])
                final_block = ""
                if clean_visible_text(policy_links):
                    final_block += "\n\n**Reference Links:**\n" + policy_links
                if clean_visible_text(case_creation):
                    final_block += "\n\n**Create a case using these links:**\n" + case_creation
                if final_block:
                    yield final_block
            else:
                yield "⚠️ Failed to retrieve Reference links."
        except Exception as e:
            logger.info(f"Policy retrieval error: {str(e)}")
            yield "⚠️ Unable to fetch reference link."
    except Exception as e:
        logger.critical(f"Error connecting to downstream system: {str(e)}")
        yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input.get('query', '')}")
    logger.info(f"Response:{full_response}")

    # Our cache TTL refresh (instead of legacy redis_client expirations)
    try:
        if conversation_id:
            await conversation_service._refresh_cache_expiry(conversation_id, domainid)
    except Exception:
        pass


@router.post("/user/to/agent/servicenow")
async def user_to_agent(request: Request):
    payload = await request.json()
    logger.info(f"payload:{payload}")
    logger.info(f"USER {payload.get('userId')} AGENT [{payload.get('requestId')}]: {payload['message']['text']}")
    group_name= "d52b90d547baae1087c50b99e16d433c" if payload.get('agent_group')=='AgenticContactCenter' else "2f04d8c14732aa1087c50b99e16d4332"
    # Process history if text is "First_Message"

    domain_id = payload['userId'].upper()
    from modules.agent_dbs import redis_client
    demo =  redis_client.hget(f"in_demographicinfo:{domain_id}", "data")
    # logger.info('demo:',demo)
    if demo is None:
        store_associateinfo(domain_id)
        store_payrollhr(domain_id)
        demo =  redis_client.hget(f"in_demographicinfo:{domain_id}", "data")
    try:
        response = json.loads(demo)
        userid  = response["associate"]["DI"]
        email = response["associate"]["EI"]
        payload['username']=response["associate"]["FN"]
    except Exception:
        logger.critical('error in fetching name and email')
        userid  = domain_id
        email = "FNU.Shubham@elevancehealth.com"
        payload['username']="workpal User"

    # chat history (cache-only via conversation_service)
    if payload['message']['text'].strip() == "First_Message":
        first_message_send = True
        domain_id = payload['userId'].upper()
        # Determine active conversation_id (prefer explicit payload field if provided)
        conversation_id = payload.get('conversationId') or payload.get('conversation_id')
        if not conversation_id:
            try:
                session = await conversation_service.get_user_session(domain_id)
                conversation_id = session.active_conversation_id if session else None
                if not conversation_id:
                    logger.warning(f"[LiveAgent] No active conversation_id for domain={domain_id}; chat history will be empty.")
            except Exception as e:
                logger.warning(f"[LiveAgent] Failed to resolve conversation_id from session for domain={domain_id}: {e}")
                conversation_id = None

        chat_history_lines: List[str] = []
        if conversation_id:
            logger.info(f"[LiveAgent] Building chat history from cache: conversation_id={conversation_id}, domain={domain_id}")
            history = await _build_chat_history_liveagent(conversation_id, domain_id, limit=20)
            logger.info(f"[LiveAgent] chat_history items: count={len(history)}")
            for h in history:
                role = (h.get('role') or '').lower()
                content = (h.get('content') or '').strip()
                if not content:
                    continue
                if role == 'user':
                    chat_history_lines.append(f"{payload.get('username')}:{content}\n\n".strip())
                elif role == 'assistant':
                    chat_history_lines.append(f"Bot:{content}\n\n".strip())
                else:  # agent/liveagent
                    chat_history_lines.append(f"Agent:{content}\n\n".strip())

        # Log final history preview
        try:
            preview = "".join(chat_history_lines[:3])
            logger.info(f"[LiveAgent] chat_history_lines preview (first 3 entries):\n{preview}")
        except Exception:
            pass

        full_history = '\n'.join(chat_history_lines) or "[SYSYTEM] Hi, User wants need your help."
        payload['message']['text'] = full_history


    # Build request payload for ServiceNow
    outgoing_payload = {
        "requestId": payload.get("requestId"),
        "action":payload.get("action",""),
        "token": "vaacubed",
        "enterpriseId": "ServiceNow",
        "botToBot": True,
        "clientSessionId": payload.get("clientSessionId", ""),
        "silentMessage": False,
        "message": {
            "text": payload['message']['text'],
            "typed": True
        },
        "contextVariables": {"topic": group_name},
        "userId": userid,
        "emailId": email,
        "timestamp": payload.get("timestamp"),
        "timezone": payload.get("timezone", "America/New_York")
    }

    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic c3JjUkhSVkFBUEk6YyhzOjxDVipLXzAlRTdbcEhGKS44Rz55QE89bm5KTElidys/O19GNg=='
    }
    logger.info(f'outgoing_payload:{outgoing_payload}')
    try:
        response = requests.post(
            "https://elevancehealthdev.service-now.com/api/sn_va_as_service/bot/integration",
            headers=headers,
            json=outgoing_payload,
            verify=False
        )
        # logger.info(response.status_code)
        logger.info(response.text)

        return {
            "status": "forwarded",
            "requestId": payload.get("requestId"),
            "response": response.json()
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "requestId": payload.get("requestId"),
            "error": str(e)
        }
