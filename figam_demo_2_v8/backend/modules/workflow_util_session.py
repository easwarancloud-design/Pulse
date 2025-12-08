from modules.agent_dbs import redis_client
import json
import requests
from typing import List, Dict, Any
from typing_extensions import TypedDict
import re
from modules.agent_state import AgentState
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
from datetime import datetime, timedelta

SECRET_KEY = "c94b6f57e3c8431aadb75e2df74df6fc3f1895769c8246cfbba61ee13a8e79cc"
ALGORITHM = "HS256"




security = HTTPBearer()



def get_session_id(domain_id: str) -> str:
    key = f"session_meta:{domain_id}"
    existing = redis_client.get(key)

    now = datetime.utcnow()
    if existing:
        session_info = json.loads(existing)
        last_used = datetime.strptime(session_info["last_active"], "%Y-%m-%dT%H:%M:%S")
        if (now - last_used).total_seconds() < 900:  # Less than 15 mins
            return session_info["session_id"]

    # New session needed
    new_session_id = str(uuid.uuid4())
    meta = {
        "session_id": new_session_id,
        "last_active": now.strftime("%Y-%m-%dT%H:%M:%S")
    }
    redis_client.set(key, json.dumps(meta))
    redis_client.expire(key, 6 * 60 * 60)  # Maintain for 6 hours
    return new_session_id

def jwt_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired token"
        )

def create_access_token(domainid: str, expires_delta: timedelta = None):
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=3))
    to_encode = {"sub": domainid, "exp": expire}
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def replace_short_names(data,mapping):
    # print(data)
    if isinstance(data,dict):
        new_dict={}
        for key,value in data.items():
            new_key=mapping.get(key,key)
            # print(new_key)
            new_dict[new_key]=replace_short_names(value,mapping)
        return new_dict
    if isinstance(data,list):
        new_list=[replace_short_names(item,mapping) for item in data]
        return new_list
    else:
        return data


def get_statetoken(domain_id: str)->str:
    token =redis_client.get(f"token:{domain_id}")
    if token:
        return token
    else:
        token=gettoken()
        redis_client.set(f"token:{domain_id}", str(token))
        redis_client.expire(f"token:{domain_id}",7140)
        return token

# def get_chat_history(domain_id: str)-> List[Dict]:
#     history_json =redis_client.get(f"chat_history:{domain_id}")
#     if history_json:
#         return json.loads(history_json)
#     return []
# def save_chat_history(domain_id: str, history: List[Dict]):
#     redis_client.set(f"chat_history:{domain_id}", json.dumps(history))
#     redis_client.expire(f"chat_history:{domain_id}",6 * 60 * 60)

def save_chat_history(domain_id: str, session_id: str, history: List[Dict]):
    key = f"chat_history:{domain_id}:{session_id}"

    # Redis store (TTL = 30 days)
    redis_client.set(key, json.dumps(history))
    redis_client.expire(key, 30 * 24 * 60 * 60)

    # Redis session tracker
    redis_client.lpush(f"chat_sessions:{domain_id}", session_id)
    redis_client.ltrim(f"chat_sessions:{domain_id}", 0, 49)  # Keep last 50 sessions

def get_chat_history(domain_id: str, session_id: str) -> List[Dict]:
    key = f"chat_history:{domain_id}:{session_id}"
    history_json = redis_client.get(key)
    return json.loads(history_json) if history_json else []

def gettoken():

    url = "https://api.horizon.elevancehealth.com/oauth2/token"

    payload='grant_type=client_credentials'
    headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    # Prod Authorization': 'Basic a2JvbFpkOUpkQW9xTm5Gd1JqUWZRMDRDREtYRGlvdWk6OWUyYzliMzkyNDU0NDY2Yjk2YmNmN2RhYTJkOTE0N2Q='
    'Authorization': 'Basic V3p3azVZcWhHdzY2bXVzTWV3WUNsa000SE9BaGFxUG86MjI5NDk4MDE2OGM1NGJmZDk2ODk5ODgxODM1Y2FkMjk='
    }


    response = requests.request("POST", url, headers=headers, data=payload,verify=False)

    return response.json().get('access_token')


def cleanup_old_sessions():
    now = datetime.utcnow()
    for key in redis_client.scan_iter("session_meta:*"):
        session_meta = json.loads(redis_client.get(key))
        created_at = session_meta.get("created_at")
        if created_at and datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%S") < now - timedelta(days=30):
            domain_id, session_id = key.split(":")[1], key.split(":")[2]
            redis_client.delete(f"chat_bundle:{domain_id}:{session_id}")
            redis_client.delete(key)

def update_session_meta(domain_id, session_id):
    meta_key = f"session_meta:{domain_id}:{session_id}"
    now = datetime.utcnow()
    metadata = {
        "created_at": now.strftime("%Y-%m-%dT%H:%M:%S"),
        "last_active": now.strftime("%Y-%m-%dT%H:%M:%S"),
        "is_active": True
    }
    redis_client.set(meta_key, json.dumps(metadata))
    redis_client.expire(meta_key, 30 * 24 * 60 * 60)

def save_chat_bundle(domain_id, session_id, question, response):
    key = f"chat_bundle:{domain_id}:{session_id}"
    payload = {
        "question": question,
        "response": response,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    }
    redis_client.rpush(key, json.dumps(payload))
    redis_client.expire(key, 30 * 24 * 60 * 60)

