# Fix for 404 Error on Message Update Endpoint

## Problem
Getting 404 error when calling:
```
POST https://workforceagent.elevancehealth.com/api/conversations/{id}/messages/{chat_id}/update
```

## Root Cause
The new route was added to `backend/routes/conversations.py` but the **backend server hasn't been restarted** to load the new route.

## Solution

### ✅ RESTART YOUR BACKEND SERVER

The backend needs to be restarted to pick up the new route definition.

#### If running locally with uvicorn:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### If running in production/EKS:

You need to:
1. **Deploy the updated files**:
   - `backend/routes/conversations.py` (new route added)
   - `backend/services/conversation_service.py` (new function added)

2. **Restart the pods**:
   ```bash
   kubectl rollout restart deployment/workforce-agent -n your-namespace
   ```
   
   OR restart via your deployment process

### ✅ Verify the Route is Loaded

After restarting, you can verify the route exists by checking the OpenAPI docs:

```
https://workforceagent.elevancehealth.com/docs
```

Look for:
```
POST /api/conversations/{conversation_id}/messages/{chat_id}/update
```

### ✅ Test the Endpoint

Run the test script:
```powershell
powershell -ExecutionPolicy Bypass -File test-regenerate-api.ps1
```

Expected output:
```
✓ SUCCESS - Message updated!
  Updated Message ID: msg_xxx
  Updated Content: This is a REGENERATED response...
  Updated At: 2025-11-22T...
```

## Files Modified (Already Done)

### Backend:
- ✅ `backend/routes/conversations.py` - Line 260: Added new route
- ✅ `backend/services/conversation_service.py` - Line 515: Added `update_message_content()` function

### Frontend:
- ✅ `src/config/api.js` - Added `CONVERSATION_MESSAGE_UPDATE` endpoint
- ✅ `src/services/conversationStorageService.js` - Added `updateMessageContent()` function  
- ✅ `src/ChatPage.jsx` - Line 2030: Changed to call UPDATE API

## What Changed

### New Backend Route (conversations.py):
```python
@router.post("/conversations/{conversation_id}/messages/{chat_id}/update", 
             response_model=MessageResponse)
async def update_message_content(
    conversation_id: str = Path(...),
    chat_id: str = Path(...),
    message_data: MessageCreate = ...,
    domain_id: str = Query(...)
):
    # Updates message content in database
    # Marks as regenerated in metadata
    # Invalidates cache
```

### New Service Function (conversation_service.py):
```python
async def update_message_content(
    self, conversation_id: str, chat_id: str, domain_id: str,
    new_content: str, metadata: dict = None
) -> Optional[Message]:
    # Find message by chat_id
    # Update content and metadata
    # Mark as regenerated
    # Invalidate cache
```

## Quick Checklist

- [ ] Backend code updated with new route and service function
- [ ] Backend server restarted (or pods redeployed)
- [ ] Verified route exists in `/docs` endpoint
- [ ] Tested with `test-regenerate-api.ps1`
- [ ] Frontend updated (api.js, conversationStorageService.js, ChatPage.jsx)
- [ ] Tested regenerate button in UI
- [ ] Verified Network tab shows UPDATE API call
- [ ] Verified response persists after page refresh

## Next Steps

1. **Restart your backend server** (most important!)
2. Run `test-regenerate-api.ps1` to verify the endpoint works
3. Test in the UI by clicking the regenerate button
4. Check browser Network tab for the UPDATE API call
5. Verify the regenerated response persists after refresh

---

**The route is already in your code - it just needs the server to restart to load it!** 🔄
