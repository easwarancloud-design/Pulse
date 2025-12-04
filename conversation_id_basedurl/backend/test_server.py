#!/usr/bin/env python3
"""
Test Server for Conversation API - Uses Test Environment Only
"""
import os
os.environ['ENVIRONMENT'] = 'test'  # Force test environment

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import our test database manager
from test_environment import TestDatabaseManager

# Create the app
app = FastAPI(title="Conversation API Test Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global test database manager
test_db = TestDatabaseManager()

# Import and setup conversation routes
try:
    from routes.conversations import router as conversation_router
    # Import the conversation service to patch it
    from services.conversation_service import ConversationService
    
    # Patch the conversation service to use our test database
    class TestConversationService(ConversationService):
        async def initialize(self):
            """Initialize with test database"""
            await test_db.initialize()
            self.redis = test_db.redis
            # Override the MySQL connection method
            self.mysql = test_db.mysql_connection
            print("✅ Test conversation service initialized")
    
    # Replace the service instance
    from services import conversation_service
    conversation_service.conversation_service = TestConversationService()
    
    # Include the router
    app.include_router(conversation_router)
    print("✅ Conversation routes loaded with test database")
    
except ImportError as e:
    print(f"❌ Could not load conversation routes: {e}")

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Test FastAPI server running with test database",
        "environment": "test",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.on_event("startup")
async def startup_event():
    """Initialize test environment"""
    try:
        await test_db.initialize()
        print("✅ Test database initialized successfully")
        
        # Initialize conversation service if available
        if hasattr(conversation_service, 'conversation_service'):
            await conversation_service.conversation_service.initialize()
            print("✅ Conversation service initialized with test database")
    except Exception as e:
        print(f"❌ Startup failed: {e}")

@app.on_event("shutdown") 
async def shutdown_event():
    """Cleanup test environment"""
    try:
        await test_db.close()
        print("✅ Test database connections closed")
    except Exception as e:
        print(f"⚠️ Shutdown warning: {e}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Test Server with Test Database")
    uvicorn.run(app, host="127.0.0.1", port=8000)