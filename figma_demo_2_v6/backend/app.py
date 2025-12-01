import json
import logging
import re
from datetime import datetime, timedelta
import time 
import jsonify
import http.client
import ssl
import os
import asyncio
import concurrent.futures

import uvicorn
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Body
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi import APIRouter, Query

from modules.workflow_utils import create_access_token,jwt_auth
from modules.workflow_utils import get_chat_history, save_chat_history,gettoken, get_statetoken
from modules.agent_dbs import redis_client
from routes.conversations import router as conversation_router
from services.conversation_service import conversation_service
from Tasks.Workday.associate_info import store_associateinfo
from Tasks.Workday.payroll_hr import store_payrollhr
import agent_workflow
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict ,List
import redis
import pymysql
import io
import csv
import requests
from redis.asyncio import Redis
import warnings
warnings.filterwarnings("ignore")
from fastapi import FastAPI, Request
from logging_utils.async_logger import setup_async_logging

from fastapi import Request, HTTPException
import uuid


import ast
from fastapi.responses import JSONResponse

# import logging
# logging.disable(logging.INFO)

# Initialize async logging with EST timestamps and daily rotation
logger=setup_async_logging()

logging.getLogger("watchfiles").disabled = True
app = FastAPI()

# Include conversation routes
app.include_router(conversation_router)

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

origins = [
    "https://workforceagent.slvr-dig-empmgt.awsdns.internal.das",  # your React app's domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



PROTECT_DECRYPT_URL = "https://pty-emp-api.awse1.anthem.com/static/unprotect/csv"
PROTECT_API_URL = "https://pty-emp-api.awse1.anthem.com/static/protect/csv"
PROTECT_AUTH_HEADER = "Basic U1JDX1BFUF9IUkxBS0U6O2d5OW9hM19yeSlRaiFuTjVfT1o0aHJYTA=="

REDIS_TTL_SECONDS = 900  # 15 minutes


redis_client_async = None

@app.on_event("startup")
async def startup_redis():
    global redis_client_async
    redis_client_async=Redis(host = "master.rediscluster.gywvad.use2.cache.amazonaws.com", port="6379", password="RedisCluster2025",decode_responses=True, ssl=True,ssl_cert_reqs="none")

@app.on_event("shutdown")
async def shutdown_event():
    await redis_client_async.close()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

class ChatEntry(BaseModel):
    chat_id: Optional[str] = None           # 🔹 New UUID for each chat
    session_id: Optional[str] = None
    domain_id: str
    question_text: Optional[str] = None
    response_text: Optional[str] = None
    chat_type: Optional[str] = "bot"
    feedback_score: Optional[int] = 0

class MessagePayload(BaseModel):
    text: str
    typed: bool

class TopicPayload(BaseModel):
    name: str

class ChatMessage(BaseModel):
    requestId: str
    token: str
    botToBot: bool
    clientSessionId: Optional[str]
    silentMessage: bool
    message: MessagePayload
    userId: str
    emailId: EmailStr
    timestamp: int
    timezone: str
    action: Optional[str] = None
    topic: Optional[TopicPayload] = None
    username: Optional[str] = None
    agent_group: Optional[str] = None

class DomainRequest(BaseModel):
    domainid: str


class TitleRequest(BaseModel):
    domainid: str
    user_query: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import secrets

security = HTTPBasic()

# ✅ Use real secrets in production
VALID_USERNAME = "src_workforce_agent_user"
VALID_PASSWORD = "topsecret123"

@app.post("/api/generate_title")
def generate_title(req: TitleRequest):

    url = "https://api.horizon.elevancehealth.com"
    end_point="/v2/text/chats"  
    # Get token
    token = get_statetoken(req.domainid)

    # Headers
    headers = {
        'Content-Type': 'application/json',
        'domainID': req.domainid,
        'Authorization': f'Bearer {token}'
    }

    # Prompt: instruct model to avoid PII
    system_prompt = (
        "You are a title generator for chat threads. "
        "Generate a short, clear title summarizing the user's first question. "
        "Do not include any personal names, dates of birth, phone numbers, emails, or other PII. "
        "If the question contains PII, replace it with a generic placeholder. "
        "Example: 'Raju birthday date?' → 'Birthday date?'"
    )

    payload = json.dumps({
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.user_query}
        ],
        "stream": False
    })

    # Call Horizon API
    response = requests.post(url + end_point, headers=headers, data=payload, verify=False)

    if response.status_code == 200:
        result = response.json()
        logger.info("########### generate title ##########")
        logger.info(result)

        # Extract title (depends on API response format)
        #title = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        title = result.get("message", {}).get("content", "").strip()
        return {"title": title}
    else:
        logger.error(f"Error: {response.status_code}, {response.text}")
        print(response.text)
        return {"title": req.user_query}


@app.post("/api/predefined_questions")
def get_predefined_questions(request: DomainRequest):
    domainid = request.domainid
    print('domainid:',domainid)

    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid")
    # Default role
    role = "Associate"

    try:
        # Connect to Redis   
        # Fetch associate data
        associate_raw = redis_client.hget("demographic_info", str(domainid))
        if associate_raw:
            associate_data = json.loads(associate_raw)
            subordinates = ast.literal_eval(associate_data.get("subordinates", "[]"))
            if subordinates:
                role = "Manager"
    except Exception as e:
        print(f"Redis error: {e}")
        # role remains "Associate"

    try:
        # Connect to MySQL
        inthelp = get_connection()

        cursor = inthelp.cursor()
        query = f"SELECT Question FROM wl_topquestions WHERE AudienceType='{role}' LIMIT 9"
        cursor.execute(query)
        raw_questions = cursor.fetchall()
        questions_list = [q[0] for q in raw_questions]

        return JSONResponse(content={"role": role, "questions": questions_list})

    except Exception as e:
        print(f"MySQL error: {e}")
        return JSONResponse(content={"error": "Failed to fetch questions"}, status_code=500)


def encrypt_pair(question, answer):
    safe_question = question.replace('"', r'\"').replace(',','|')
    safe_answer = answer.replace('"', r'\"').replace(',','|')

    column_names="firstName,firstName"
    data=safe_question+","+safe_answer
    payload=f"{column_names}\r\n"+data

    headers = {
        'Authorization': PROTECT_AUTH_HEADER,
        'Content-Type': 'text/plain; charset=utf-8'
    }
    response = requests.post(PROTECT_API_URL, headers=headers, data=payload.encode("utf-8"),verify=False)
    if response.status_code==200:
        encrypted_data=response.text.replace("firstName,firstName","").split(",")
        return encrypted_data
    else: return 

def get_connection():
    return pymysql.connect(
        host="aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com",
        user="SRC_INTHELP_SLVR_WRITE",
        password="S7vcCw96uY$o0f%W",
        database="aamsqlapm1009705dev",
        ssl={"fake_flag_to_enable_tls": True}
    )


def clean_for_json(obj):
    # Convert all datetime fields to ISO strings
    return {
        key: (value.isoformat() if isinstance(value, datetime) else value)
        for key, value in obj.items()
    }


def parse_and_structure(text, headers):
    text = text.split("\r\n", 1)[-1]
    values = text.split(",")
    result = []
    buffer = []

    i = 0
    while i < len(values):
        buffer.append(values[i])
        
        if len(buffer) == len(headers):
            last_field = buffer[-1]
            parts = last_field.split("\r\n", 1)

            if len(parts) == 2:
                buffer[-1] = parts[0].strip()
                result.append(dict(zip(headers, buffer)))

                buffer = [parts[1].strip()]
            else:
                result.append(dict(zip(headers, buffer)))
                buffer = []

        i += 1

    # if buffer:
    #     result.append(dict(zip(headers, buffer)))

    if buffer:
        buffer = [field.replace("|", ",") for field in buffer]
        result.append(dict(zip(headers, buffer)))

    return result

def unprotect_process(p_data):
    # logger.info(p_data)
    column_names="firstName,firstName,column3,colum4,colum5,colum6,colun7"
    payload="\r\n".join([",".join([str(i).replace(',','|').replace('None','') for i in i.values()]) for i in  p_data])

    payload_unpro=f"{column_names}\r\n"+payload
    # logger.info("csv:",payload_unpro)
    headers = {
    'Authorization': PROTECT_AUTH_HEADER,
    'Content-Type': 'text/plain; charset=utf-8'
    }
    response = requests.post(PROTECT_DECRYPT_URL, headers=headers, data=payload_unpro.encode("utf-8"),verify=False)
    # logger.info(repr(response.text))
    raw_text = response.text # Your decrypted payload

    custom_columns = [
    "question_text",
    "response_text",
    "session_id",
    "chat_type",
    "feedback_score",
    "INSERT_TS",
    "chat_id"
    ]
    structured_data = parse_and_structure(raw_text, custom_columns)
    return structured_data


@app.post("/feedback")
async def feedback_post(request: Request):
    data = await request.json()

    domainid = data.get("domainid")
    chatid = data.get("chatid")
    feedback_text = data.get("Feedback")

    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid")

    if not chatid:
        chatid = str(uuid.uuid4())

    if not feedback_text:
        raise HTTPException(status_code=400, detail="Missing feedback")

    # ✅ Encrypt using existing encrypt_pair function
    encrypted_result = encrypt_pair(feedback_text, "dummy")
    encrypted_feedback = encrypted_result[0] if encrypted_result else None

    if not encrypted_feedback:
        raise HTTPException(status_code=500, detail="Encryption failed")

    # ✅ Store encrypted feedback
    mydb = get_connection()
    mycursor = mydb.cursor()

    sql = """INSERT INTO WA_Feedback_details (chat_history_id, domain_id, feedback_text) VALUES (%s, %s, %s)"""
    values = (chatid, domainid, encrypted_feedback)

    mycursor.execute(sql, values)
    mydb.commit()

    mycursor.close()
    mydb.close()

    return {"message": "Feedback recorded", "chatid": chatid}


@app.get("/chathistory")
async def get_chathistory(
    request: Request,
    offset: int = Query(0),
    limit: int = Query(2),
    token_payload=Depends(jwt_auth)
):

    domainid = request.headers.get("domainid")
    token_domainid = token_payload.get("sub").upper()

    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid header")
    domainid=domainid.upper()
    if domainid!= token_domainid:
        raise HTTPException(status_code=403, detail=f"Unauthorized domainid: {domainid}")

    redis_key = f"chathistory_thirty_days:{domainid}"

    # Try Redis first
    try:
        cached = await redis_client_async.lrange(redis_key, 0, -1)
    except Exception as e:
        logger.critical(f"Redis error:{repr(e)}")
        raise HTTPException(status_code=500, detail="Redis fetch failed")
    if cached:
        logger.info("Redis hit")
        chat_list = [json.loads(chat) for chat in cached]
    else:
        logger.info("Redis miss — loading from MySQL")
        chat_list = []
        connection = get_connection()
        try:
            with connection.cursor(pymysql.cursors.DictCursor) as cursor:
                thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
                query = """
                    SELECT  question_text,response_text,session_id,chat_type, feedback_score, INSERT_TS,chat_id
            FROM WA_ChatHistory
            WHERE domain_id = %s AND INSERT_TS >= %s
            ORDER BY ID DESC
                """
                cursor.execute(query, (domainid, thirty_days_ago))
                rows = cursor.fetchall()
                # logger.info("my sql data:",rows)
                decrypted_data=unprotect_process(rows)
                chat_list = list(decrypted_data)
                # logger.info("chat_list:",chat_list)

                # After decrypting
                if not decrypted_data or all(not item.get("question_text") for item in decrypted_data):
                    logger.info("No meaningful chat history found — skipping cache.")
                    chat_list = []
                else:
                    chat_list = list(decrypted_data)
                # Proceed with caching

                # Cache in Redis
                if chat_list:
                    pipe = await redis_client_async.pipeline()
                    pipe.delete(redis_key)
                    # logger.info('after delete')
                    for item in reversed(chat_list):
                        # logger.info("rpush")
                        pipe.lpush(redis_key, json.dumps(clean_for_json(item)))
                    
                    pipe.expire(redis_key, REDIS_TTL_SECONDS)
                    await pipe.execute()
                    logger.info('all done')

        finally:
            connection.close()

    # Paginate in-memory for scroll-up
    logger.info(f"Total chats in cache: {len(chat_list)}, requested offset: {offset}, limit: {limit}")
    # paged_chats = chat_list[offset:offset + limit]
    paged_chats = chat_list[offset:offset + limit][::-1]
    return {
        "domain_id": domainid,
        "offset": offset,
        "limit": limit,
        "total_loaded": len(chat_list),
        "chats": paged_chats
    }

@app.post("/chathistory")
async def handle_chathistory(request: Request):
    payload = await request.json()
    data = ChatEntry(**payload)
    # logger.info("data:",data)
    domainid=data.domain_id.upper()
     # 🔐 Encrypt question and response before storing
    encrypted_question, encrypted_response = encrypt_pair(
        data.question_text or "",
        data.response_text or ""
    )

    # logger.info("encrypted_response:",encrypted_response)

    redis_key = f"chathistory_thirty_days:{domainid}"
    if await redis_client_async.exists(redis_key):
        await redis_client_async.expire(redis_key, REDIS_TTL_SECONDS)

    connection = get_connection()

    # fetch latest chat history
    # history=await get_chat_history(domainid)
    history_raw = await redis_client_async.get(f"latest_chat_history:{domainid}")
    try:
        history = json.loads(history_raw) if history_raw else []
    except Exception as e:
        logger.error(f"Error parsing history from Redis:{repr(e)}")
        history = []
    # logger.info("feedback score:",data.question_text)
    # logger.info("feedback score:",data.response_text)
    # logger.info("feedback score:",data.feedback_score)
    # logger.info("feedback score:",type(data.feedback_score))
    # logger.info('chat_id:',data.chat_id)

    try:
        with connection.cursor() as cursor:
            if data.feedback_score in [1, -1] and data.chat_id:
                logger.info('update statment')

                # ✅ Update feedback based on chat_id
                sql = """
                    UPDATE WA_ChatHistory
                    SET feedback_score = %s, UPDATE_TS = CURRENT_TIMESTAMP
                    WHERE chat_id = %s
                """
                cursor.execute(sql, (data.feedback_score, data.chat_id))

                if history:
                    for chat in history:
                        if chat.get("chat_id") == data.chat_id:
                            chat["feedback_score"] = data.feedback_score
                            chat["UPDATE_TS"] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                            break
                    # await save_chat_history(domainid, history)    
                    redis_key = f"latest_chat_history:{domainid}"
                    await redis_client_async.set(redis_key, json.dumps(history))
                    await redis_client_async.expire(redis_key, 900)     
        
            else:
                # ✅ Insert new chat with generated chat_id
                logger.info('insert statment')
                sql = """
                    INSERT INTO WA_ChatHistory (
                        chat_id, session_id, domain_id,
                        question_text, response_text, chat_type
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    data.chat_id,
                    data.session_id,
                    data.domain_id,
                    encrypted_question,
                    encrypted_response,
                    data.chat_type
                ))

                latest_chat = {
                    "chat_id": data.chat_id,
                    "session_id": data.session_id,
                    "domain_id": data.domain_id,
                    "question_text": data.question_text,
                    "response_text": data.response_text,
                    "chat_type": data.chat_type,
                    "feedback_score": data.feedback_score,
                    "INSERT_TS": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                }

                # await redis_client.lpush(redis_key, json.dumps(clean_for_json(latest_chat)))
                # await redis_client.expire(redis_key, REDIS_TTL_SECONDS)

                # history.append({"content": full_response.strip(), "role": "assistant"})
                if not history:
                    history = []                
                
                history.append(latest_chat)
                # await save_chat_history(domainid, history)
                redis_key = f"latest_chat_history:{domainid}"
                await redis_client_async.set(redis_key, json.dumps(history))
                await redis_client_async.expire(redis_key, 900)
                # logger.info("store history:",history)


        connection.commit()
    finally:
        connection.close()

    return {"status": "success"}

@app.get("/workforceagent/latest_chathistory")
async def chathistory(request: Request, token_payload=Depends(jwt_auth)):
    domainid = request.headers.get("domainid")
    token_domainid = token_payload.get("sub").upper()

    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid header")
    domainid=domainid.upper()
    if domainid!= token_domainid:
        raise HTTPException(status_code=403, detail=f"Unauthorized domainid: {domainid}")
    from fastapi.responses import JSONResponse

    try:
        # history = await get_chat_history(str(domainid)) 
        logger.info(f'doaminid fethch{domainid}')
        import json

        history_bytes = await redis_client_async.get(f"latest_chat_history:{domainid}")
        # logger.info('fetch chat history_bytes:',history_bytes)
        if not history_bytes:
            history = []
        else:
            # logger.info('before')
            history = json.loads(history_bytes)
            # logger.info('fetch chat hsitory:',history)

        return {
            "domain_id": domainid,
            "chats": history
        }
    except Exception as e:        
        return JSONResponse(content=[])



@app.post("/token")
def generate_token(
    credentials: HTTPBasicCredentials = Depends(security),
    domainid: str = Body(..., embed=True)
):
    if not (
        secrets.compare_digest(credentials.username, VALID_USERNAME) and
        secrets.compare_digest(credentials.password, VALID_PASSWORD)
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    expiry = timedelta(hours=3)
    token, expires_at = create_access_token(domainid, expires_delta=expiry)
    ttl = int(expiry.total_seconds())

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ttl,
        "expires_at": expires_at.isoformat() + "Z"
    }

@app.get("/workforceagent/chat/user")

async def chat_user(request: Request, token_payload=Depends(jwt_auth)):
    domainid = request.headers.get("domainid").upper() 
    token_domainid = token_payload.get("sub")
    logger.info(f"TOKEN sub:{token_domainid} , HEADER domainid:{domainid}")
    if not domainid:
        raise HTTPException(status_code=400, detail="Missing domainid")

    if domainid != str(token_domainid).upper():
        raise HTTPException(status_code=403, detail=f"Unauthorized domainid:{domainid}")
    
    demo =  redis_client.hget(f"in_demographicinfo:{domainid}", "data")
    
    if demo is None:
        associate=store_associateinfo(domainid)
        payroll=store_payrollhr(domainid)
        demo =  redis_client.hget(f"in_demographicinfo:{domainid}", "data")
    try:
        response = json.loads(demo)
        name = response["associate"]["FN"]
    except Exception:
        return "Hi,\n\nYou don't have access to this application. Please check with Admin."

    welcome = (
        f"Hi {name},\n\n"
        "I am your Workforce Agent powered by GenAI document intelligence! I am here to help you with common questions.\n\n"
        "If this is a life-threatening emergency, call 911. For urgent business needs, contact HR Support at 866-777-9636.\n\n"
        "<i>Workforce Agent utilizes Artificial Intelligence to generate certain responses. All responses should be verified for accuracy, and the Workforce Agent should aid, not replace human decision-making.</i>"
    )
    return welcome

@app.get("/auth/pulsedomainid")
async def get_pulse_domainid(request: Request):
    pulse_token = request.headers.get("pulse-authorization")
    if not pulse_token:
        raise HTTPException(status_code=400, detail="Missing Pulse token")

    redis_key = f"pulse_token:{pulse_token}"
    cached_domainid = redis_client.get(redis_key)

    if cached_domainid:
        domainid = cached_domainid.decode("utf-8")
        source = "cache"
    else:
        try:
            conn = http.client.HTTPSConnection("securefed.anthem.com", context=ssl._create_unverified_context())
            conn.connect()
            conn.request("GET", "/idp/userinfo.openid", "", {"Authorization": pulse_token})
            response = conn.getresponse()
            output = response.read().decode()

            if "error" in output:
                raise HTTPException(status_code=403, detail="Invalid Pulse token")

            domainid = json.loads(output).get("sub")
            if not domainid:
                raise HTTPException(status_code=403, detail="Domain ID not found")

            redis_client.set(redis_key, domainid, ex=3600)
            source = "live"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Pulse token validation failed: {str(e)}")

    return {"domainid": domainid, "source": source}


@app.on_event("startup")
async def startup_event():
    global app_wk
    app_wk = agent_workflow.workflow.compile()
    
    # Initialize conversation service
    try:
        await conversation_service.initialize()
        logger.info("Conversation service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize conversation service: {e}")
        # Don't fail startup, but log the error

def clean_visible_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)  # Strip HTML
    text = re.sub(r"\s+", " ", text)     # Condense whitespace
    return text.strip()


def repair_formatting(buffer):
    # for i in range(1, 10):
        # buffer = re.sub(fr'(^|\n){i} (?=\*\*)', f'\n{i}\uFE0F\u20E3 ', buffer) for Emoji

    buffer = re.sub(r'\*\*\s*(.*?)\s*\*\*', r'**\1**', buffer)
    buffer = re.sub(r"\n(https?://[^\s]+)", r" \1", buffer)
    buffer = re.sub(r"(?<!\n)(- |\u2022 )", r"\n\1", buffer)
    buffer = re.sub(r"(?<![\n\r])\n(?![\n\-•])", " ", buffer)

    return buffer.strip()
 
'''async def stream_response(user_input: dict):
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    # history = get_chat_history(user_input["domainid"])
    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

    for output in app_wk.stream(user_input):
        # logger.info('output:',output)
        if isinstance(output, dict) and output.get("classify_task", {}).get("task") == "get_liveagent":
            
            logger.info("Detected Live Agent Task")
            yield "🔄 Connecting you to a live agent. Please wait..."
            
            # Optionally, return a signal for frontend to initiate WebSocket
            yield "<<LiveAgent>>"
            return

        # if isinstance(output, dict) and output.get("classify_task", {}).get("task") == "generate_response":        
        if isinstance(output, dict) and "generate_response" in output:
            value = output["generate_response"]
            headers = value["response"]["headers"]
            payload = value["response"]["data"]
            purl = value["response"]["url"]
            pre_task = value["response"]["task"]

            try:
                stream_start = time.time()
                response = requests.post(purl, headers=headers, data=payload, stream=True, verify=False, timeout=20)
                logger.info(f"Stream connection latency: {time.time() - stream_start:.2f}s")

                if response.status_code != 200:
                    yield "Could not fetch response. Please check with Admin."
                    continue

                buffer = ""
                start = False
                first_chunk_time = None

                for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                    # logger.info("chunk:",repr(chunk))
                    if not chunk:
                        continue
                    
                    pattern=r"\nid:.*?\n\n"
                    text=re.sub(pattern,"",chunk,flags=re.DOTALL).replace("data: ","").replace("Content-Length: 0","")
                    # logger.info("text:",text)

                    if not first_chunk_time:
                        first_chunk_time = time.time()
                        logger.info(f"First content received after: {first_chunk_time - start_time:.2f}s")                  
    
                        if "<<" in text or ">>" in text:

                            match = re.search(r'<<(.*?)>>(.*)', text, re.DOTALL)

                            if match:
                                buffer = match.group(1).strip()
                                buffer="<<"+buffer+">>"
                                buffer = buffer.replace("<<warning>1</warning>", f"<a href='{Initial_url}'>Initial Warning</a>\n<a href='{warning_url}'>Written Warning</a>")
                                buffer = buffer.replace("<termination>1</termination>>", f"\n<a href='{termination_url}'>Request a Termination</a>")
                                buffer = buffer.replace("<<warning>0</warning>", "").replace("<termination>0</termination>>", "")
                                case_creation = buffer                                                                      
                                data = match.group(2).strip()
                                # logger.info("buffer:", buffer)
                                # logger.info("data:", data)
                                full_response +=data
                                yield data
                            else:
                                # logger.info("Pattern not found")
                                full_response +=text
                                yield text
                        else:
                                # logger.info("Pattern not found")
                                full_response +=text
                                yield text
                    else:
                        full_response +=text
                        yield text


                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    policy_start = time.time()
                    try:
                        policy_response = requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            data=json.dumps({"prompt": full_response}),
                            verify=False,
                            timeout=15
                        )
                        logger.info(f"HR policy API latency: {time.time() - policy_start:.2f}s")

                        if policy_response.status_code == 200:
                            output_list = []
                            for item in policy_response.json():
                                if "document" in item:
                                    tags = item["document"].get("tags", [])
                                    title = next((t["value"] for t in tags if t.get("name") == "title"), None)
                                    url = next((t["value"] for t in tags if t.get("name") == "url"), None)
                                    if title and url:
                                        output_list.append(f'<a href="{url}">{title}</a>')

                            policy_links = "\n".join(list(dict.fromkeys(output_list)))
                            final_block = ""

                            if clean_visible_text(policy_links):
                                final_block += "\n\n**Reference Links:**\n" + policy_links
                            if clean_visible_text(case_creation):
                                final_block += "\n\n**Create a case using these links:**\n" + case_creation
                            if final_block:
                                yield final_block
                    except Exception as e:
                        logger.info(f"Policy retrieval error: {str(e)}")

            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield f"Error in fetch response, Please try again."
    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")    
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")
    redis_client.expire(f"in_demographicinfo:{user_input['domainid']}", 900)
    redis_client.expire(f"in_payrollinfo:{user_input['domainid']}", 900)

    demographic = redis_client.hget(f"in_demographicinfo:{user_input['domainid']}", "data")
    if demographic is None:
        store_associateinfo(user_input['domainid'])
        store_payrollhr(user_input['domainid'])
'''
# without stream live for 60 sec
async def stream_response_original(user_input: dict):
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

    for output in app_wk.stream(user_input):
        if isinstance(output, dict) and output.get("classify_task", {}).get("task") == "get_liveagent":
            logger.info("Detected Live Agent Task")
            #yield "🔄 Connecting you to a live agent. Please wait..."
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
                #logger.info(f"response text :{response.text}")
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

                # ✅ Only run second request if first succeeded
                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    try:
                        policy_response = requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            data=json.dumps({"prompt": full_response}),
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

                            policy_links = "\n".join(list(dict.fromkeys(output_list)))
                            final_block = ""

                            if clean_visible_text(policy_links):
                                final_block += "\n\n**Reference Links:**\n" + policy_links
                            if clean_visible_text(case_creation):
                                final_block += "\n\n**Create a case using these links:**\n" + case_creation
                            if final_block:
                                yield final_block
                        else:
                            logger.info(f"Policy retrieval error status code: {policy_response.status_code}")

                    except Exception as e:
                        logger.info(f"Policy retrieval error: {str(e)}")

            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")

    redis_client.expire(f"in_demographicinfo:{user_input['domainid']}", 900)
    redis_client.expire(f"in_payrollinfo:{user_input['domainid']}", 900)

    demographic = redis_client.hget(f"in_demographicinfo:{user_input['domainid']}", "data")
    if demographic is None:
        store_associateinfo(user_input['domainid'])
        store_payrollhr(user_input['domainid'])



def clean_stream_text(msg: str) -> str:
    if not msg:
        return msg
    # Remove markdown bold markers but keep the text
    msg = re.sub(r"\*\*(.+?)\*\*", lambda m: m.group(1).strip(), msg)
    # Remove all quotes
    msg = msg.replace('"', '').replace("'", "")
    # Convert markdown-style list items
    msg = msg.replace("- **", "• **")
    # Literal \n to actual newline
    msg = msg.replace("\\n", "\n")
    # Indented dashes to bullets
    msg = msg.replace("   - ", "   • ")
    # Remove block IDs
    msg = re.sub(r"\nid:.*?\n\n", "", msg)
    msg = re.sub(r"id:.*?\n\n", "", msg)
    msg = re.sub(r"\s*id:\s*\w+\s*", "", msg, flags=re.IGNORECASE)
    # Remove all "data:" prefixes
    msg = re.sub(r"data:\s*", "", msg, flags=re.IGNORECASE)
    # Collapse 3+ newlines to 2
    msg = re.sub(r"\n{3,}", "\n\n", msg)
    return msg.strip()

async def stream_response(user_input: dict):
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

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

                # ✅ Only run second request if first succeeded
                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    try:
                        cleaned_response = clean_stream_text(full_response)
                        logger.info(f'header:{headers}')
                        logger.info(f'full response:{cleaned_response}')
                        policy_response = requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            #data=json.dumps({"prompt": str(user_input['query'])}),
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

                            #policy_links = "\n".join(list(dict.fromkeys(output_list)))
                            policy_links = "\n".join(list(dict.fromkeys(output_list))[:2])
                            final_block = ""

                            if clean_visible_text(policy_links):
                                final_block += "\n\n**Reference Links:**\n" + policy_links
                            if clean_visible_text(case_creation):
                                final_block += "\n\n**Create a case using these links:**\n" + case_creation
                            if final_block:
                                yield final_block
                        else:
                            logger.info(f"Policy retrieval error status code: {policy_response.status_code}")
                            yield "⚠️ Failed to retrieve Reference links."  # NEW

                    except Exception as e:
                        logger.info(f"Policy retrieval error: {str(e)}")
                        yield "⚠️ Unable to fetch reference link."  # NEW

            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")

    redis_client.expire(f"in_demographicinfo:{user_input['domainid']}", 900)
    redis_client.expire(f"in_payrollinfo:{user_input['domainid']}", 900)

    demographic = redis_client.hget(f"in_demographicinfo:{user_input['domainid']}", "data")
    if demographic is None:
        store_associateinfo(user_input['domainid'])
        store_payrollhr(user_input['domainid'])


async def stream_response_samewith60(user_input: dict):
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

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
                response = requests.post(purl, headers=headers, data=payload, stream=True, verify=False, timeout=20)
                logger.info(f"Stream connection latency: {time.time() - start_time:.2f}s")

                if response.status_code != 200:
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

                # ✅ Second request for policy links
                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    yield "\n\n⏳ Fetching policy links. Please wait...\n\n"

                    def fetch_policy_links_sync(headers, full_response):
                        return requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            data=json.dumps({"prompt": full_response}),
                            verify=False,
                            timeout=60
                        )

                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        future = pool.submit(fetch_policy_links_sync, headers, full_response)

                        keep_alive_start = time.time()
                        while not future.done():
                            await asyncio.sleep(5)
                            yield "⏳ Still fetching policy links...\n\n"
                            if time.time() - keep_alive_start > 60:
                                yield "⚠️ Reference link retrieval is taking longer than expected.\n\n"
                                break

                        try:
                            policy_response = future.result()
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

                                policy_links = "\n".join(list(dict.fromkeys(output_list)))
                                final_block = ""

                                if clean_visible_text(policy_links):
                                    final_block += "\n\n**Reference Links:**\n" + policy_links
                                if clean_visible_text(case_creation):
                                    final_block += "\n\n**Create a case using these links:**\n" + case_creation

                                if final_block:
                                    logger.info("Yielding final block separately")
                                    yield "\n\n"  # flush gap
                                    await asyncio.sleep(0)  # let loop flush
                                    yield final_block
                                else:
                                    logger.warning("Policy response was 200 but no usable content found.")
                            else:
                                logger.info(f"Policy retrieval error status code: {policy_response.status_code}")
                                yield "⚠️ Failed to retrieve Reference links.\n\n"

                        except Exception as e:
                            logger.info(f"Reference retrieval error: {str(e)}")
                            yield f"❌ Error fetching Reference links: {str(e)}\n\n"

            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")

    redis_client.expire(f"in_demographicinfo:{user_input['domainid']}", 900)
    redis_client.expire(f"in_payrollinfo:{user_input['domainid']}", 900)

    demographic = redis_client.hget(f"in_demographicinfo:{user_input['domainid']}", "data")
    if demographic is None:
        store_associateinfo(user_input['domainid'])
        store_payrollhr(user_input['domainid'])

async def stream_response_with60(user_input: dict):
    start_time = time.time()
    logger.info(f"Stream started at: {start_time}")

    full_response = ""
    case_creation = ""
    policy_links = ""

    Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4"
    warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c"
    termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0"

    for output in app_wk.stream(user_input):
        if isinstance(output, dict) and output.get("classify_task", {}).get("task") == "get_liveagent":
            logger.info("Detected Live Agent Task")
            # yield "🔄 Connecting you to a live agent. Please wait..."
            yield "<<LiveAgent>>"
            return

        if isinstance(output, dict) and "generate_response" in output:
            value = output["generate_response"]
            headers = value["response"]["headers"]
            payload = value["response"]["data"]
            purl = value["response"]["url"]
            pre_task = value["response"]["task"]

            try:
                response = requests.post(purl, headers=headers, data=payload, stream=True, verify=False, timeout=20)
                logger.info(f"Stream connection latency: {time.time() - start_time:.2f}s")

                if response.status_code != 200:
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

                # ✅ Only run second request if first succeeded
                if pre_task == "get_hrpolicy":
                    logger.info("Fetching HR policy links…")
                    yield "\n\n⏳ Fetching policy links. Please wait...\n\n"  # [ADDED]

                    def fetch_policy_links_sync(headers, full_response):
                        # time.sleep(61)
                        return requests.post(
                            "https://api.horizon.elevancehealth.com/v2/document/searches",
                            headers=headers,
                            data=json.dumps({"prompt": full_response}),
                            verify=False,
                            timeout=60  # [ADDED] Increased timeout
                        )

                    with concurrent.futures.ThreadPoolExecutor() as pool:  # [ADDED]
                        future = pool.submit(fetch_policy_links_sync, headers, full_response)  # [ADDED]

                        keep_alive_start = time.time()  # [ADDED]
                        while not future.done():  # [ADDED]
                            await asyncio.sleep(5)  # [ADDED]
                            yield "⏳ Still fetching policy links...\n\n"  # [ADDED]
                            if time.time() - keep_alive_start > 60:  # [ADDED]
                                yield "⚠️ Reference link retrieval is taking longer than expected.\n\n"  # [ADDED]
                                break  # [ADDED]

                        try:
                            policy_response = future.result()  # [ADDED]
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

                                policy_links = "\n".join(list(dict.fromkeys(output_list)))
                                final_block = ""

                                if clean_visible_text(policy_links):
                                    final_block += "\n\n**Reference Links:**\n" + policy_links
                                if clean_visible_text(case_creation):
                                    final_block += "\n\n**Create a case using these links:**\n" + case_creation
                                if final_block:
                                    logger.info(f"Yielding final block: {final_block}")
                                    yield final_block
                                else:
                                    logger.warning("Policy response was 200 but no usable content found.")
                            else:
                                logger.info(f"Policy retrieval error status code: {policy_response.status_code}")
                                yield "⚠️ Failed to retrieve Reference  links.\n\n"  # [ADDED]

                        except Exception as e:
                            logger.info(f"Reference retrieval error: {str(e)}")
                            yield f"❌ Error fetching Reference links: {str(e)}\n\n"  # [ADDED]


            except Exception as e:
                logger.critical(f"Error connecting to downstream system: {str(e)}")
                yield "Error in fetch response, Please try again."

    logger.info(f"Total end-to-end duration: {time.time() - start_time:.2f}s")
    logger.info(f"Question:{user_input['query']}")
    logger.info(f"Response:{full_response}")

    redis_client.expire(f"in_demographicinfo:{user_input['domainid']}", 900)
    redis_client.expire(f"in_payrollinfo:{user_input['domainid']}", 900)

    demographic = redis_client.hget(f"in_demographicinfo:{user_input['domainid']}", "data")
    if demographic is None:
        store_associateinfo(user_input['domainid'])
        store_payrollhr(user_input['domainid'])


async def build_prompt_history(domain_id: str) -> List[Dict]:
    domain_id = domain_id.upper()

    chat_history=[]

    history_raw = await redis_client_async.get(f"latest_chat_history:{domain_id}")
    try:
        history = json.loads(history_raw) if history_raw else []
    except Exception as e:
        logger.error(f"Error parsing history from Redis:{repr(e)}")
        history = []
    
    for chat in history:
        # logger.info('chat:',chat)
        if chat.get("chat_type") == "bot":
            if len(chat.get("response_text"))>0 and chat.get("response_text")=='Could not fetch response. Please check with Admin.':
                continue
            else: 
                chat_history.append({
                        "role": "user",
                        "content": chat.get("question_text", "").strip()
                    })
                chat_history.append({
                        "role": "assistant",
                        "content": chat.get("response_text", "").strip()
                    })
                if len(chat_history) > 9 : return chat_history
    
    
    if not chat_history:
        logger.info('fetching from 30 days data')        
        cached = await redis_client_async.lrange(f"chathistory_thirty_days:{domain_id}", 0, -1)
        history_raw =cached
        # logger.info("history_raw:",history_raw)
        # logger.info('type:',type(history_raw))
        try:
            history = history_raw if history_raw else []
        except Exception as e:
            logger.error(f"Error parsing history from Redis:{repr(e)}")
            history = []
        
        for chat in history:
            try:
                chat=json.loads(chat)
            except:
                continue
            if chat.get("chat_type") == "bot":
                if len(chat.get("response_text"))>0 and chat.get("response_text")=='Could not fetch response. Please check with Admin.':
                    continue
                else: 
                    chat_history.append({
                            "role": "user",
                            "content": chat.get("question_text", "").strip()
                        })
                    chat_history.append({
                            "role": "assistant",
                            "content": chat.get("response_text", "").strip()
                        })
                    if len(chat_history) > 9 : return list(reversed(chat_history))

    return chat_history


@app.get("/workforceagent/chat")
async def chat(request: Request, token_payload=Depends(jwt_auth)):
    domainid = request.headers.get("domainid").upper()   
    question = request.headers.get("question")
    token_domainid = token_payload.get("sub")

    if domainid != str(token_domainid).upper():
        raise HTTPException(status_code=403, detail=f"Unauthorized domainid:{domainid}")

    if not all([domainid, question]):
        raise HTTPException(status_code=400, detail="Missing 'domainid' or 'question' headers")
    domainid=domainid.upper()
    # logger.info('before prompt')
    history = await build_prompt_history(domainid) or []    
    # logger.info(f'prompt hisotry:{history}')
    user_input = {
        "query": question,
        "domainid": domainid,
        "chat_history":history,
        "language": "en"
    }
    return StreamingResponse(stream_response(user_input), media_type="text/plain")

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Hello, bot user!",
        "timestamp": str(datetime.utcnow())
    }

def extract_message_text(data: dict) -> str:
    """
    Extracts a clean message text from the ServiceNow payload.
    Prioritizes body.value from OutputText-type entries, then falls back to message.text.
    """
    body_items = data.get("body", [])
    for item in body_items:
        if item.get("uiType") == "OutputText" and "value" in item:
            return item["value"]

    # Fallback to message.text if no suitable value found
    return data.get("message", {}).get("text", "")

@app.post("/post")
async def post_from_servicenow(request: Request):
    body = await request.body()
    logger.info(body)
    data = json.loads(body)

    request_id = data.get("requestId")
    message_text = extract_message_text(data)

    logger.info(f"📨 ServiceNow ➡️ USER [{request_id}]: {message_text}")

    try:  

        redis_client.publish(f"chat:{request_id}", json.dumps({
            "from": "agent",
            "text": message_text,
            "agentId": data.get("body", [{}])[0].get("agentInfo", {}).get("agentId"),
            "agentName": data.get("body", [{}])[0].get("agentInfo", {}).get("agentName")
        }))
    except Exception as e:
        logger.info(f"🔴 Redis publish failed: {e}")

    return { "status": "received", "requestId": request_id }



def clean_stream_text(msg: str) -> str:
    if not msg:
        return msg
    # Remove markdown bold markers but keep the text
    msg = re.sub(r"\*\*(.+?)\*\*", lambda m: m.group(1).strip(), msg)
    # Remove all quotes
    msg = msg.replace('"', '').replace("'", "")
    # Convert markdown-style list items
    msg = msg.replace("- **", "• **")
    # Literal \n to actual newline
    msg = msg.replace("\\n", "\n")
    # Indented dashes to bullets
    msg = msg.replace("   - ", "   • ")
    # Remove block IDs
    msg = re.sub(r"\nid:.*?\n\n", "", msg)
    msg = re.sub(r"id:.*?\n\n", "", msg)
    msg = re.sub(r"\s*id:\s*\w+\s*", "", msg, flags=re.IGNORECASE)
    # Remove all "data:" prefixes
    msg = re.sub(r"data:\s*", "", msg, flags=re.IGNORECASE)
    # Collapse 3+ newlines to 2
    msg = re.sub(r"\n{3,}", "\n\n", msg)
    #print('################################msge:',msg)
    return msg.strip()


@app.post("/user/to/agent/servicenow")
async def user_to_agent(request: Request):
    payload = await request.json()    
    logger.info(f"payload:{payload}")
    logger.info(f"USER {payload.get('userId')} AGENT [{payload.get('requestId')}]: {payload['message']['text']}")
    group_name= "d52b90d547baae1087c50b99e16d433c" if payload.get('agent_group')=='AgenticContactCenter' else "2f04d8c14732aa1087c50b99e16d4332"
    # Process history if text is "First_Message"
    '''if payload['message']['text'].strip() == "First_Message":
        first_message_send=True
        domain_id = payload['userId'].upper()
        chat_history = []
        history_raw = await redis_client_async.get(f"latest_chat_history:{domain_id}")
        
        try:
            history = json.loads(history_raw) if history_raw else []
        except Exception as e:
            logger.error(f"Error parsing history from Redis:{repr(e)}")
            history = []

        for chat in history:

            responder = "Bot" if chat.get("chat_type") == "bot" else "Agent"

            if chat.get("question_text") and chat.get("question_text") != "None":
                chat_history.append(f"{payload.get('username')}:{chat.get('question_text', '')}\n\n".strip())
            if chat.get("response_text"):
                chat_history.append(f"{responder}:{chat.get('response_text', '')}\n\n".strip())

        full_history = '\n'.join(chat_history) or "[SYSTEM] Hi, User wants need your help."
        payload['message']['text'] = full_history
    '''

    domain_id = payload['userId'].upper()
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
        payload['username']="unkown_user"

    #chat history
    if payload['message']['text'].strip() == "First_Message":
        first_message_send=True
        domain_id = payload['userId'].upper()
        chat_history = []
        history_raw = await redis_client_async.get(f"latest_chat_history:{domain_id}")

        try:
            history = json.loads(history_raw) if history_raw else []
        except Exception as e:
            logger.error(f"Error parsing history from Redis:{repr(e)}")
            history = []

        for chat in history:

            responder = "Bot" if chat.get("chat_type") == "bot" else "Agent"

            if chat.get("question_text") and chat.get("question_text") != "None":
                chat_history.append(f"{payload.get('username')}:{chat.get('question_text', '')}\n\n".strip())
            if chat.get("response_text"):
                chat_history.append(f"{responder}:{clean_stream_text(chat.get('response_text', ''))}\n\n".strip())

        full_history = '\n'.join(chat_history) or "[SYSYTEM] Hi, User wants need your help."
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

#if __name__ == "__main__":    
#    uvicorn.run("app:app", host="0.0.0.0", port=80, reload=True, log_config=None)
