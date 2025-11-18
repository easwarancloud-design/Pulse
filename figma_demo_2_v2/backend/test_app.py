#!/usr/bin/env python3
"""
Minimal FastAPI Test App for Conversation Endpoints Only
"""
import os
os.environ['ENVIRONMENT'] = 'test'  # Use test environment

import asyncio
import json
import uuid
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create minimal app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import conversation router
try:
    from routes.conversations import router as conversation_router
    from services.conversation_service import conversation_service
    app.include_router(conversation_router)
    CONVERSATION_ROUTES_AVAILABLE = True
    print("✅ Conversation routes loaded successfully")
except ImportError as e:
    CONVERSATION_ROUTES_AVAILABLE = False
    print(f"⚠️ Could not load conversation routes: {e}")

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Test FastAPI server running",
        "conversation_routes": CONVERSATION_ROUTES_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.on_event("startup")
async def startup_event():
    """Initialize conversation service"""
    if CONVERSATION_ROUTES_AVAILABLE:
        try:
            await conversation_service.initialize()
            print("✅ Conversation service initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize conversation service: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)