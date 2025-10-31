from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import uuid
from datetime import datetime

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation storage (in production, use a real database)
conversations = {}

def create_conversation_thread(title: str, initial_query: str, thread_id: str = None):
    """Create or update a conversation thread"""
    if thread_id and thread_id in conversations:
        # Return existing conversation
        return conversations[thread_id]
    
    # Create new conversation
    new_thread_id = thread_id or str(uuid.uuid4())
    conversations[new_thread_id] = {
        "id": new_thread_id,
        "title": title,
        "messages": [
            {"type": "user", "text": initial_query, "timestamp": datetime.now().isoformat()},
            {"type": "assistant", "text": f"I understand you're asking about: {initial_query}. Let me help you with that.", "timestamp": datetime.now().isoformat()}
        ],
        "created_at": datetime.now().isoformat()
    }
    return conversations[new_thread_id]

def get_back_button_target(context: str, current_page: str = "pulse"):
    """Determine the back button target based on context"""
    if context == "iframe":
        if current_page == "pulse":
            return "http://localhost:3000/pulse"  # Back to pulse page in iframe
        else:
            return "http://localhost:3000/pulse"  # Default iframe back
    else:
        if current_page == "pulse":
            return "http://localhost:3000/pulseembedded"  # Back to embedded pulse page
        else:
            return "http://localhost:3000/"  # Back to main page

@app.post("/pulsehandler")
async def handle_pulse_form(
    search: str = Form(...),
    source: str = Form(...),
    threadId: Optional[str] = Form(None),
    timestamp: str = Form(...),
    context: str = Form("embedded"),
    currentPage: str = Form("pulse")
):
    """Handle form submissions from the Pulse embedded component and redirect to React result page"""
    
    print(f"Received form submission: search='{search}', source='{source}', threadId='{threadId}', context='{context}', currentPage='{currentPage}'")
    
    conversation = None
    
    if source == "thread_selection" and threadId:
        # User clicked on an existing conversation from dropdown
        if threadId in conversations:
            conversation = conversations[threadId]
        else:
            # Handle predefined static threads
            static_threads = {
                'lw1': {
                    'id': 'lw1',
                    'title': 'Can you create a service IT ticket for me ...',
                    'messages': [
                        {'type': 'user', 'text': 'Can you create a service IT ticket for me to reset my password?'},
                        {'type': 'assistant', 'text': 'I\'d be happy to help you create a service IT ticket for password reset. Let me guide you through the process.'}
                    ]
                },
                'lw2': {
                    'id': 'lw2',
                    'title': 'Can you find confluence pages related ...',
                    'messages': [
                        {'type': 'user', 'text': 'Can you find confluence pages related to our project documentation?'},
                        {'type': 'assistant', 'text': 'I\'ll search for confluence pages related to your project. Here are the relevant documents I found...'}
                    ]
                },
                'lw3': {
                    'id': 'lw3',
                    'title': 'What are the latest project updates for ...',
                    'messages': [
                        {'type': 'user', 'text': 'What are the latest project updates for the Q4 initiatives?'},
                        {'type': 'assistant', 'text': 'Here are the latest updates for your Q4 initiatives based on the most recent data...'}
                    ]
                },
                'lw4': {
                    'id': 'lw4',
                    'title': 'What are the key metrics we should ...',
                    'messages': [
                        {'type': 'user', 'text': 'What are the key metrics we should track for our team performance?'},
                        {'type': 'assistant', 'text': 'Based on your team\'s objectives, here are the key performance metrics you should track...'}
                    ]
                },
                'l30d1': {
                    'id': 'l30d1',
                    'title': 'How do I access the company VPN ...',
                    'messages': [
                        {'type': 'user', 'text': 'How do I access the company VPN from my home office?'},
                        {'type': 'assistant', 'text': 'Here\'s a step-by-step guide to access the company VPN from your home office...'}
                    ]
                },
                'l30d2': {
                    'id': 'l30d2',
                    'title': 'What are the holiday schedules for ...',
                    'messages': [
                        {'type': 'user', 'text': 'What are the holiday schedules for this year?'},
                        {'type': 'assistant', 'text': 'Here are the company holiday schedules for this year...'}
                    ]
                }
            }
            
            if threadId in static_threads:
                conversation = static_threads[threadId]
            else:
                # Create a new conversation if thread not found
                conversation = create_conversation_thread(f"Discussion about: {search}", search, threadId)
    
    elif source == "predefined":
        # Predefined question - show in input, create new conversation
        conversation = create_conversation_thread(f"Question: {search}", search)
    
    elif source == "manual_search":
        # Manual search - create new conversation
        conversation = create_conversation_thread(f"Search: {search}", search)
    
    else:
        # Fallback - create new conversation
        conversation = create_conversation_thread(f"Query: {search}", search)
    
    # Store conversation data for the React app to fetch
    session_id = str(uuid.uuid4())
    conversations[session_id] = {
        "conversation": conversation,
        "source": source,
        "context": context,
        "currentPage": currentPage,
        "searchQuery": search,
        "backTarget": get_back_button_target(context, currentPage)
    }
    
    # Build URL parameters for React result page
    from urllib.parse import urlencode
    params = {
        "sessionId": session_id,
        "search": search,
        "source": source,
        "threadId": threadId or "",
        "context": context,
        "currentPage": currentPage
    }
    
    # Redirect to React result page
    result_url = f"http://localhost:3000/resultpage?{urlencode(params)}"
    return RedirectResponse(url=result_url, status_code=302)

# New API endpoint to get conversation data for React
@app.get("/api/conversation/{session_id}")
async def get_conversation_data(session_id: str):
    """Get conversation data for React result page"""
    if session_id in conversations:
        return conversations[session_id]
    else:
        return {"error": "Session not found"}, 404

# Health check endpoint
@app.get("/")
async def read_root():
    return {"message": "WorkPal Backend API is running", "status": "healthy"}

# Get all conversations endpoint
@app.get("/conversations")
async def get_conversations():
    return {"conversations": list(conversations.values())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)