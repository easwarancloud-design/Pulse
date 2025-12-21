from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# import data either as a package or as a module when run directly
try:
    from . import data
except Exception:
    import data

app = FastAPI()

# Allow CORS for local development so the frontend (vite) can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatCreate(BaseModel):
    title: str = 'New chat'

class MessageCreate(BaseModel):
    role: str
    text: str

@app.get('/api/chats')
def chats_list():
    return data.list_chats()

@app.post('/api/chats')
def chats_create(body: ChatCreate):
    return data.create_chat(body.title)

@app.get('/api/chats/{chat_id}')
def chat_get(chat_id: str):
    chat = data.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail='not found')
    return chat

@app.post('/api/chats/{chat_id}/messages')
def chat_add_message(chat_id: str, msg: MessageCreate):
    m = data.add_message(chat_id, msg.role, msg.text)
    if not m:
        raise HTTPException(status_code=404, detail='chat not found')
    return m

@app.post('/api/chats/{chat_id}/title')
def chat_update_title(chat_id: str, body: ChatCreate):
    c = data.update_title(chat_id, body.title)
    if not c:
        raise HTTPException(status_code=404, detail='chat not found')
    return c

@app.get('/api/agents')
def agents():
    return [
        {"id": "agent-hr", "name": "HR Agent", "type": "hr"},
        {"id": "agent-jira", "name": "Jira Agent", "type": "jira"},
        {"id": "agent-snow", "name": "ServiceNow", "type": "servicenow"}
    ]


@app.get('/api/health')
def health():
    return {"ok": True}

if __name__ == '__main__':
    # Run the app directly: `python backend/main.py`
    # Note: reload=True spawns subprocesses and can be problematic when run this way,
    # so keep reload disabled here. Use `uvicorn backend.main:app --reload` for autoreload.
    uvicorn.run(app, host='127.0.0.1', port=8000)
