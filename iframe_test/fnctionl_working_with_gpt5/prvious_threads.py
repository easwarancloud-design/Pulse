# threads_api.py
from __future__ import annotations

import json
import time
import uuid
import math
from datetime import datetime, timedelta
from typing import List, Optional, Literal, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body, status
from pydantic import BaseModel, Field
from redis.asyncio import Redis

# IMPORT your own app utilities
# from modules.workflow_utils import jwt_auth
# from your_db_module import get_mysql_conn_async
# from your_sanitize_module import clean_visible_text  # strip HTML/PII as needed
# from your_encrypt_module import protect_encrypt  # PROTECT API wrapper

router = APIRouter(prefix="", tags=["threads"])

# ----- Models

SenderType = Literal["user", "bot", "agent", "system"]
ModeType = Literal["bot", "agent", "mixed"]

class MessageIn(BaseModel):
    messageId: Optional[str] = None          # supply to enforce idempotency
    senderType: SenderType
    text: str = ""
    completed: bool = True
    agentName: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class ThreadCreateIn(BaseModel):
    threadId: Optional[str] = None
    sessionId: Optional[str] = None
    title: Optional[str] = None
    titleId: Optional[str] = None
    mode: ModeType = "bot"

class ThreadCard(BaseModel):
    threadId: str
    title: Optional[str]
    mode: ModeType
    updatedAt: str
    lastPreview: Optional[str]
    lastSender: Optional[SenderType]
    messageCount: int
    # Per-user reaction hints (optional; computed on demand)
    liked: Optional[bool] = None
    disliked: Optional[bool] = None

class ThreadDetail(BaseModel):
    threadId: str
    domainId: str
    sessionId: Optional[str]
    title: Optional[str]
    titleId: Optional[str]
    mode: ModeType
    createdAt: str
    updatedAt: str
    closedAt: Optional[str]
    messages: List[Dict[str, Any]]  # {id,senderType,text,completed,createdAt,agentName,meta}
    reactions: Dict[str, int] = {}  # messageId -> score for current user

class ReactionIn(BaseModel):
    threadId: str
    messageId: str
    score: int = Field(..., description="-1 dislike, 0 clear, 1 like")
    comment: Optional[str] = None

# ----- Helpers (replace with your implementations)

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def to_epoch_ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)

def sanitize_text(txt: str) -> str:
    # Replace with your real cleaner: remove HTML, collapse whitespace, strip sensitive
    return " ".join(txt.replace("\n", " ").split()).strip()

async def protect_encrypt(text: str) -> str:
    # Replace with your PROTECT call; return encrypted string
    return text

def ensure_uuid(val: Optional[str]) -> str:
    try:
        if val:
            uuid.UUID(str(val))
            return val
    except Exception:
        pass
    return str(uuid.uuid4())

# Inject these via your app factory or DI in real code:
redis_client: Redis = None
async def get_db():
    # return an async connection or context that exposes .execute and .fetch
    raise NotImplementedError

async def require_auth(request: Request, token_payload=Depends(...)):
    # Replace with: token_payload=Depends(jwt_auth)
    # and validate header domainid
    domainid = request.headers.get("domainid")
    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid header")
    token_domain = (token_payload.get("sub") or "").upper()
    if (domainid or "").upper() != token_domain:
        raise HTTPException(status_code=403, detail="Forbidden: domain mismatch")
    return (domainid.upper(), token_payload)

# ----- Redis Keys

def k_domain_threads(domain: str) -> str:
    return f"wa:domain:{domain}:threads"

def k_thread_summary(thread_id: str) -> str:
    return f"wa:thread:{thread_id}:summary"

def k_thread_messages(thread_id: str) -> str:
    return f"wa:thread:{thread_id}:messages"

def k_thread_user_reactions(thread_id: str, domain: str, user: str) -> str:
    return f"wa:thread:{thread_id}:reactions:{domain}:{user}"

MAX_THREADS_PER_DOMAIN = 500
THREAD_MESSAGES_TTL_SEC = 30 * 24 * 3600  # 30 days
USER_REACTIONS_TTL_SEC = 24 * 3600        # 1 day

# ----- DB statements (pseudo; use your driver param style)

SQL_INSERT_THREAD = """
INSERT INTO wa_threads (id, domain_id, session_id, title_id, title, mode, message_count, last_preview, last_sender)
VALUES (%s,%s,%s,%s,%s,%s,0,NULL,NULL)
ON DUPLICATE KEY UPDATE updated_at=NOW(6), mode=VALUES(mode)
"""

SQL_GET_THREAD = "SELECT * FROM wa_threads WHERE id=%s AND domain_id=%s"

SQL_UPDATE_THREAD_TITLE = """
UPDATE wa_threads SET title=%s, title_id=%s, updated_at=NOW(6) WHERE id=%s AND domain_id=%s
"""

SQL_BUMP_THREAD_ON_MESSAGE = """
UPDATE wa_threads
SET updated_at=NOW(6), message_count = message_count + 1, last_preview=%s, last_sender=%s
WHERE id=%s AND domain_id=%s
"""

SQL_INSERT_MESSAGE = """
INSERT INTO wa_messages (id, thread_id, sender_type, completed, text_encrypted, text_plain, agent_name, meta_json)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
"""

SQL_SELECT_MESSAGES = """
SELECT id, sender_type, completed, text_plain, agent_name, meta_json, created_at
FROM wa_messages
WHERE thread_id=%s
ORDER BY created_at ASC
"""

SQL_UPSERT_REACTION = """
INSERT INTO wa_reactions (id, thread_id, message_id, domain_id, user_id, score, comment_enc)
VALUES (%s,%s,%s,%s,%s,%s,%s)
ON DUPLICATE KEY UPDATE score=VALUES(score), comment_enc=VALUES(comment_enc), updated_at=NOW(6)
"""

SQL_LIST_THREADS_PAGE = """
SELECT id, title, mode, updated_at, last_preview, last_sender, message_count
FROM wa_threads
WHERE domain_id=%s
ORDER BY updated_at DESC
LIMIT %s OFFSET %s
"""

SQL_SEARCH_THREADS = """
SELECT DISTINCT t.id, t.title, t.mode, t.updated_at, t.last_preview, t.last_sender, t.message_count
FROM wa_threads t
LEFT JOIN wa_messages m ON m.thread_id = t.id
WHERE t.domain_id=%s AND (
  (t.title IS NOT NULL AND MATCH(t.title) AGAINST(%s IN NATURAL LANGUAGE MODE))
  OR (m.text_plain IS NOT NULL AND MATCH(m.text_plain) AGAINST(%s IN NATURAL LANGUAGE MODE))
)
ORDER BY t.updated_at DESC
LIMIT %s OFFSET %s
"""

# ----- Routes

@router.post("/threads", response_model=ThreadCard)
async def create_thread(data: ThreadCreateIn, request: Request, auth=Depends(require_auth)):
    domainid, token = auth
    thread_id = ensure_uuid(data.threadId)
    session_id = data.sessionId
    title = data.title
    title_id = data.titleId
    mode: ModeType = data.mode or "bot"

    # DB
    db = await get_db()
    await db.execute(SQL_INSERT_THREAD, (thread_id, domainid, session_id, title_id, title, mode))

    # Redis: ZSET + summary
    now_ms = int(time.time() * 1000)
    await redis_client.zadd(k_domain_threads(domainid), {thread_id: now_ms})
    await redis_client.hset(
        k_thread_summary(thread_id),
        mapping={
            "title": title or "",
            "titleId": title_id or "",
            "mode": mode,
            "updatedAt": now_iso(),
            "lastPreview": "",
            "lastSender": "",
            "messageCount": 0,
            "domainId": domainid
        }
    )

    # domain trimming
    zkey = k_domain_threads(domainid)
    count = await redis_client.zcard(zkey)
    if count and count > MAX_THREADS_PER_DOMAIN:
        # remove oldest beyond limit
        to_trim = count - MAX_THREADS_PER_DOMAIN
        old_ids = await redis_client.zrange(zkey, 0, to_trim - 1)
        if old_ids:
            await redis_client.zrem(zkey, *old_ids)
            # optionally clean per-thread caches
            for tid in old_ids:
                await redis_client.delete(k_thread_summary(tid))
                await redis_client.delete(k_thread_messages(tid))

    return ThreadCard(
        threadId=thread_id, title=title, mode=mode,
        updatedAt=now_iso(), lastPreview=None, lastSender=None, messageCount=0
    )

@router.get("/threads", response_model=List[ThreadCard])
async def list_threads(
    request: Request,
    auth=Depends(require_auth),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, gt=0, le=100),
    q: Optional[str] = Query(None, description="Search query")
):
    domainid, token = auth
    db = await get_db()

    if q:
        rows = await db.fetch(SQL_SEARCH_THREADS, (domainid, q, q, limit, offset))
    else:
        rows = await db.fetch(SQL_LIST_THREADS_PAGE, (domainid, limit, offset))

    cards: List[ThreadCard] = []
    for r in rows:
        cards.append(
            ThreadCard(
                threadId=r["id"],
                title=r["title"],
                mode=r["mode"],
                updatedAt=r["updated_at"].isoformat()+"Z",
                lastPreview=r["last_preview"],
                lastSender=r["last_sender"],
                messageCount=r["message_count"]
            )
        )
    return cards

@router.get("/threads/{threadId}", response_model=ThreadDetail)
async def get_thread(threadId: str, request: Request, auth=Depends(require_auth)):
    domainid, token = auth
    user_id = token.get("user") or token.get("sub")  # adapt to your JWT
    db = await get_db()

    # Thread row
    thr = await db.fetch_one(SQL_GET_THREAD, (threadId, domainid))
    if not thr:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Messages (try Redis first)
    r_msgs = await redis_client.lrange(k_thread_messages(threadId), 0, -1)
    messages: List[Dict[str, Any]] = []
    if r_msgs:
        messages = [json.loads(x) for x in r_msgs]
    else:
        rows = await db.fetch(SQL_SELECT_MESSAGES, (threadId,))
        for r in rows:
            msg = {
                "id": r["id"],
                "senderType": r["sender_type"],
                "completed": bool(r["completed"]),
                "text": r["text_plain"],   # return sanitized text to UI
                "agentName": r["agent_name"],
                "meta": json.loads(r["meta_json"]) if r["meta_json"] else None,
                "createdAt": r["created_at"].isoformat()+"Z"
            }
            messages.append(msg)
        # warm cache
        if messages:
            async with redis_client.pipeline(transaction=False) as pipe:
                for m in messages:
                    pipe.rpush(k_thread_messages(threadId), json.dumps(m, ensure_ascii=False))
                pipe.expire(k_thread_messages(threadId), THREAD_MESSAGES_TTL_SEC)
                await pipe.execute()

    # Per-user reactions
    rx_key = k_thread_user_reactions(threadId, domainid, user_id)
    rx_map = await redis_client.hgetall(rx_key) or {}
    # Fallback to DB only if needed (you could add a query to fetch user reactions per thread)
    reactions = {k: int(v) for k, v in rx_map.items()}

    return ThreadDetail(
        threadId=thr["id"],
        domainId=thr["domain_id"],
        sessionId=thr["session_id"],
        title=thr["title"],
        titleId=thr["title_id"],
        mode=thr["mode"],
        createdAt=thr["created_at"].isoformat()+"Z",
        updatedAt=thr["updated_at"].isoformat()+"Z",
        closedAt=thr["closed_at"].isoformat()+"Z" if thr["closed_at"] else None,
        messages=messages,
        reactions=reactions
    )

@router.patch("/threads/{threadId}/title", response_model=ThreadCard)
async def rename_thread(
    threadId: str,
    payload: Dict[str, Optional[str]] = Body(...),
    request: Request = None,
    auth=Depends(require_auth)
):
    domainid, token = auth
    title = payload.get("title")
    title_id = payload.get("titleId")

    db = await get_db()
    await db.execute(SQL_UPDATE_THREAD_TITLE, (title, title_id, threadId, domainid))

    # Update Redis summary
    await redis_client.hset(k_thread_summary(threadId), mapping={
        "title": title or "",
        "titleId": title_id or "",
        "updatedAt": now_iso()
    })

    # bump in ZSET
    await redis_client.zadd(k_domain_threads(domainid), {threadId: int(time.time()*1000)})

    # Return latest card (simple fetch)
    thr = await db.fetch_one(SQL_GET_THREAD, (threadId, domainid))
    return ThreadCard(
        threadId=thr["id"],
        title=thr["title"],
        mode=thr["mode"],
        updatedAt=thr["updated_at"].isoformat()+"Z",
        lastPreview=thr["last_preview"],
        lastSender=thr["last_sender"],
        messageCount=thr["message_count"]
    )

@router.post("/threads/{threadId}/messages")
async def append_message(
    threadId: str,
    msg: MessageIn,
    request: Request,
    auth=Depends(require_auth)
):
    domainid, token = auth
    user_id = token.get("user") or token.get("sub")

    db = await get_db()
    # Ensure thread exists
    thr = await db.fetch_one(SQL_GET_THREAD, (threadId, domainid))
    if not thr:
        raise HTTPException(status_code=404, detail="Thread not found")

    message_id = ensure_uuid(msg.messageId)
    # Sanitize and encrypt
    text_plain = sanitize_text(msg.text or "")
    text_encrypted = await protect_encrypt(msg.text or "")

    meta_json = json.dumps(msg.meta, ensure_ascii=False) if msg.meta else None

    await db.execute(
        SQL_INSERT_MESSAGE,
        (
            message_id, threadId, msg.senderType, int(bool(msg.completed)),
            text_encrypted, text_plain, msg.agentName, meta_json
        )
    )

    # Update thread summary
    await db.execute(
        SQL_BUMP_THREAD_ON_MESSAGE,
        (text_plain[:1000], msg.senderType, threadId, domainid)  # preview truncated to 1000 chars
    )

    # Redis: append message, update summary and recency
    m_out = {
        "id": message_id,
        "senderType": msg.senderType,
        "completed": bool(msg.completed),
        "text": text_plain,
        "agentName": msg.agentName,
        "meta": msg.meta,
        "createdAt": now_iso()
    }
    async with redis_client.pipeline(transaction=False) as pipe:
        pipe.rpush(k_thread_messages(threadId), json.dumps(m_out, ensure_ascii=False))
        pipe.expire(k_thread_messages(threadId), THREAD_MESSAGES_TTL_SEC)
        pipe.hset(k_thread_summary(threadId), mapping={
            "lastPreview": text_plain[:1000],
            "lastSender": msg.senderType,
            "updatedAt": now_iso()
        })
        pipe.zadd(k_domain_threads(domainid), {threadId: int(time.time()*1000)})
        await pipe.execute()

    return {"ok": True, "threadId": threadId, "messageId": message_id}

@router.post("/reactions")
async def set_reaction(
    payload: ReactionIn,
    request: Request,
    auth=Depends(require_auth)
):
    domainid, token = auth
    user_id = token.get("user") or token.get("sub")

    if payload.score not in (-1, 0, 1):
        raise HTTPException(status_code=400, detail="Invalid score")

    # Optional encrypt for comment
    comment_enc = await protect_encrypt(payload.comment) if payload.comment else None

    db = await get_db()
    rid = str(uuid.uuid4())
    await db.execute(
        SQL_UPSERT_REACTION,
        (rid, payload.threadId, payload.messageId, domainid, user_id, payload.score, comment_enc)
    )

    # Update Redis per-user map
    rx_key = k_thread_user_reactions(payload.threadId, domainid, user_id)
    if payload.score == 0:
        await redis_client.hdel(rx_key, payload.messageId)
    else:
        await redis_client.hset(rx_key, payload.messageId, str(payload.score))
    await redis_client.expire(rx_key, USER_REACTIONS_TTL_SEC)

    return {"ok": True, "threadId": payload.threadId, "messageId": payload.messageId, "score": payload.score}

# Optional: simple search endpoint; you may already filter with ?q= on /threads
@router.get("/search", response_model=List[ThreadCard])
async def search_threads(
    request: Request,
    auth=Depends(require_auth),
    q: str = Query(..., min_length=2),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, gt=0, le=100)
):
    domainid, token = auth
    db = await get_db()
    rows = await db.fetch(SQL_SEARCH_THREADS, (domainid, q, q, limit, offset))
    return [
        ThreadCard(
            threadId=r["id"],
            title=r["title"],
            mode=r["mode"],
            updatedAt=r["updated_at"].isoformat()+"Z",
            lastPreview=r["last_preview"],
            lastSender=r["last_sender"],
            messageCount=r["message_count"]
        )
        for r in rows
    ]