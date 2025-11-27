from typing import Dict, List
from datetime import datetime

def now_id():
    return str(int(datetime.utcnow().timestamp() * 1000))

_chats: Dict[str, Dict] = {}

def seed():
    c1 = {
        "id": "1",
        "title": "How to improve UI",
        "messages": [
            {"id": "m1", "role": "user", "text": "How can I improve the UI for my app?"},
            {"id": "m2", "role": "bot", "text": "Focus on contrast, spacing and consistent typography."}
        ]
    }
    c2 = {
        "id": "2",
        "title": "React performance",
        "messages": [
            {"id": "m3", "role": "user", "text": "How to optimize React apps?"},
            {"id": "m4", "role": "bot", "text": "Use memoization, avoid anonymous functions in props, and code-split."}
        ]
    }
    _chats[c1['id']] = c1
    _chats[c2['id']] = c2

def list_chats():
    return list(_chats.values())

def get_chat(chat_id: str):
    return _chats.get(chat_id)

def create_chat(title: str = 'New chat'):
    cid = now_id()
    chat = {"id": cid, "title": title, "messages": []}
    _chats[cid] = chat
    return chat

def update_title(chat_id: str, title: str):
    chat = _chats.get(chat_id)
    if chat:
        chat['title'] = title
    return chat

def add_message(chat_id: str, role: str, text: str):
    chat = _chats.get(chat_id)
    if not chat:
        return None
    mid = now_id()
    msg = {"id": mid, "role": role, "text": text}
    chat['messages'].append(msg)
    return msg

# seed on import
seed()
