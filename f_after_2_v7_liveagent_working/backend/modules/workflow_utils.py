from modules.agent_dbs import redis_client,redis_client_async
import json
import requests
from typing import List, Dict, Any
from typing_extensions import TypedDict
import re
from modules.agent_state import AgentState
from datetime import datetime, timedelta
import pytz
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

SECRET_KEY = "c94b6f57e3c8431aadb75e2df74df6fc3f1895769c8246cfbba61ee13a8e79cc"
ALGORITHM = "HS256"




security = HTTPBearer()



def get_session_id(domain_id: str) -> str:
    key = f"session_meta:{domain_id}"
    existing =redis_client.get(key)

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

# async def get_chat_history(domain_id: str)-> List[Dict]:
#     history_json =await redis_client_async.get(f"latest_chat_history:{domain_id}")
#     if history_json:
#         return json.loads(history_json)
#     return []

async def get_chat_history(domain_id: str) -> List[Dict]:
    redis_key = f"latest_chat_history:{domain_id}"
    key_type = await redis_client_async.type(redis_key)

    if key_type != "string":
        await redis_client_async.delete(redis_key)
        return []

    history_json = await redis_client_async.get(redis_key)
    if history_json:
        return json.loads(history_json)
    return []

async def save_chat_history(domain_id: str, history: List[Dict]):
    redis_key = f"latest_chat_history:{domain_id}"
    await redis_client_async.set(redis_key, json.dumps(history))
    await redis_client_async.expire(redis_key, 15 * 60)

def gettoken():


    url = "https://api.horizon.elevancehealth.com/oauth2/token"

    payload='grant_type=client_credentials'
    headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    # Prod dhra Authorization': 'Basic a2JvbFpkOUpkQW9xTm5Gd1JqUWZRMDRDREtYRGlvdWk6OWUyYzliMzkyNDU0NDY2Yjk2YmNmN2RhYTJkOTE0N2Q='
    # non prod workforce agent 'Authorization': 'Basic V3p3azVZcWhHdzY2bXVzTWV3WUNsa000SE9BaGFxUG86MjI5NDk4MDE2OGM1NGJmZDk2ODk5ODgxODM1Y2FkMjk='
    'Authorization':'Basic bVVzeU9qMnlOQVNESnBScndRV1NiUDkzWmJ4akxjNDA6MWJlMjc2OTBjNWE3NGNjNzkxNzBlMGMyNDZmZWE5ZTY='
    }


    response = requests.request("POST", url, headers=headers, data=payload,verify=False)

    return response.json().get('access_token')


def extract_date_parts(date_string):
    try:
        current_date = datetime.now()
        specified_date = datetime.strptime(date_string, "%m/%d/%Y")

        years =relativedelta(current_date,specified_date).years
        months =relativedelta(current_date,specified_date).months
        days=relativedelta(current_date,specified_date).days

        return f'{years} Years, {months} Month(s), {days} Day(s)'
    except (ValueError, TypeError):
        return date_string


def get_workday_message_et():
    # Define US Eastern Time zone
    eastern = pytz.timezone('US/Eastern')
    now_et = datetime.now(eastern)
    local_hour = now_et.hour

    # Format today's and yesterday's date
    today_date = now_et.strftime("%B %d, %Y")
    yesterday_date = (now_et - timedelta(days=1)).strftime("%B %d, %Y")

    # Determine message based on hour
    if 0 <= local_hour < 9:
        return f"1:00 PM ET {yesterday_date}"
    elif 9 <= local_hour < 13:
        return f"9:00 AM ET {today_date}"
    elif 13 <= local_hour <= 23:
        return f"1:00 PM ET {today_date}"
    else:
        return "Issue with date format"


