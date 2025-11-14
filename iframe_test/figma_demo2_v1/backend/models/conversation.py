"""
Pydantic models for conversation storage system
Defines data structures for conversations, messages, and reference links
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class MessageType(str, Enum):
    """Message types in conversation"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ReferenceType(str, Enum):
    """Types of reference links"""
    URL = "url"
    DOCUMENT = "document"
    API = "api"
    DATABASE = "database"
    OTHER = "other"

class ConversationStatus(str, Enum):
    """Conversation status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

# Base Models
class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Reference Link Models
class ReferenceLink(BaseModel):
    """Reference link data model"""
    id: Optional[str] = None
    message_id: str
    url: str = Field(..., description="The reference URL")
    title: Optional[str] = Field(None, description="Link title or description")
    reference_type: ReferenceType = ReferenceType.URL
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ReferenceLinkCreate(BaseModel):
    """Create reference link request"""
    url: str = Field(..., description="The reference URL")
    title: Optional[str] = None
    reference_type: ReferenceType = ReferenceType.URL
    metadata: Optional[Dict[str, Any]] = None

class ReferenceLinkResponse(ReferenceLink):
    """Reference link response model"""
    pass

# Message Models
class Message(TimestampMixin):
    """Message data model"""
    id: Optional[str] = None
    conversation_id: str
    message_type: MessageType
    content: str = Field(..., description="Message content")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional message metadata")
    reference_links: Optional[List[ReferenceLink]] = Field(default_factory=list)
    token_count: Optional[int] = Field(None, description="Token count for the message")
    
    @validator('content')
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class MessageCreate(BaseModel):
    """Create message request"""
    message_type: MessageType
    content: str = Field(..., description="Message content")
    metadata: Optional[Dict[str, Any]] = None
    reference_links: Optional[List[ReferenceLinkCreate]] = Field(default_factory=list)
    token_count: Optional[int] = None
    
    @validator('content')
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()

class MessageResponse(Message):
    """Message response model"""
    pass

# Conversation Models
class Conversation(TimestampMixin):
    """Conversation data model"""
    id: Optional[str] = None
    user_id: str = Field(..., description="User ID who owns the conversation")
    title: str = Field(..., description="Conversation title")
    summary: Optional[str] = Field(None, description="Conversation summary")
    status: ConversationStatus = ConversationStatus.ACTIVE
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional conversation metadata")
    message_count: Optional[int] = Field(0, description="Number of messages in conversation")
    total_tokens: Optional[int] = Field(0, description="Total tokens used in conversation")
    last_message_at: Optional[datetime] = Field(None, description="Timestamp of last message")
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Conversation title cannot be empty')
        return v.strip()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ConversationCreate(BaseModel):
    """Create conversation request"""
    user_id: str = Field(..., description="User ID who owns the conversation")
    title: str = Field(..., description="Conversation title")
    summary: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Conversation title cannot be empty')
        return v.strip()

class ConversationUpdate(BaseModel):
    """Update conversation request"""
    title: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[ConversationStatus] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Conversation title cannot be empty')
        return v.strip() if v else v

class ConversationResponse(Conversation):
    """Conversation response model"""
    messages: Optional[List[MessageResponse]] = Field(default_factory=list)

class ConversationSummary(BaseModel):
    """Conversation summary for list views"""
    id: str
    user_id: str
    title: str
    summary: Optional[str] = None
    status: ConversationStatus
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# Search Models
class SearchRequest(BaseModel):
    """Search conversations request"""
    user_id: str
    query: str = Field(..., description="Search query")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Number of results to return")
    offset: Optional[int] = Field(0, ge=0, description="Number of results to skip")

class SearchResponse(BaseModel):
    """Search results response"""
    conversations: List[ConversationSummary]
    total_count: int
    query: str
    limit: int
    offset: int
    source: str = Field(..., description="Source of search results (cache/database)")

# User Session Models
class UserSession(BaseModel):
    """User session data model"""
    user_id: str
    session_id: Optional[str] = None
    last_activity: Optional[datetime] = None
    active_conversation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class UserSessionUpdate(BaseModel):
    """Update user session request"""
    active_conversation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# Bulk Operations Models
class BulkMessageCreate(BaseModel):
    """Create multiple messages in a conversation"""
    conversation_id: str
    messages: List[MessageCreate] = Field(..., description="List of messages to create")

class BulkMessageResponse(BaseModel):
    """Response for bulk message creation"""
    conversation_id: str
    created_messages: List[MessageResponse]
    failed_messages: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

# API Response Models
class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None
    error: Optional[str] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    message: str
    error: str
    details: Optional[Dict[str, Any]] = None

# Utility functions for model operations
def generate_id() -> str:
    """Generate a unique ID for database records"""
    return str(uuid.uuid4())

def create_conversation_id() -> str:
    """Generate a conversation ID"""
    return f"conv_{generate_id()}"

def create_message_id() -> str:
    """Generate a message ID"""
    return f"msg_{generate_id()}"

def create_reference_id() -> str:
    """Generate a reference link ID"""
    return f"ref_{generate_id()}"