# Conversation Update 500 Error - Debugging Guide

## Current Issue
Still getting 500 error when updating conversation titles in EKS:
```
POST https://workforceagent.elevancehealth.com/api/conversations/conv_8047f3cb-a64a-48ac-86b7-fdcce1910868/update?domain_id=AG04333 500 (Internal Server Error)
```

## Changes Made

### 1. Fixed UPDATE Statement (Line ~252)
**Changed from:**
```python
update_fields.append("last_message_at = NOW()")
```

**Changed to:**
```python
update_fields.append("updated_at = NOW()")
```

**Reason:** The local schema shows `updated_at` exists with `ON UPDATE CURRENT_TIMESTAMP`. The remote DB likely has the same column.

### 2. Added Detailed Logging
Added extensive logging to track execution flow:
- Line ~220: Log what data is being updated
- Line ~265: Log the exact SQL query and parameter values
- Line ~273: Log successful update row count
- Line ~277: Log when fetching updated conversation
- Line ~289: Log full exception with stack trace (`exc_info=True`)

## Next Steps to Debug

### Step 1: Check Backend Logs in EKS
Look for these log messages in CloudWatch (or your log service):

```
INFO - Updating conversation conv_xxx for domain AG04333 with data: {...}
INFO - Executing UPDATE query: UPDATE wl_conversations SET title = %s, updated_at = NOW() WHERE id = %s AND domain_id = %s with values: [...]
ERROR - Failed to update conversation conv_xxx: <ACTUAL ERROR MESSAGE>
```

The ERROR log will show the **actual Python exception** that's causing the 500 error.

### Step 2: Test Locally First
Run the test script to verify it works in your local environment:

```powershell
cd backend
python test_conversation_update.py
```

Edit the script to use your actual conversation ID and domain ID.

### Step 3: Check Database Schema in EKS
The actual table in EKS might have different columns. Connect to your EKS MySQL database and run:

```sql
DESCRIBE wl_conversations;
```

This will show you the **exact columns** that exist. Look for:
- Does `updated_at` column exist?
- Does `last_message_at` column exist?
- What is the exact column type?
- Does it have `ON UPDATE CURRENT_TIMESTAMP`?

### Step 4: Common Error Scenarios

#### Scenario A: Column doesn't exist
**Error:** `Unknown column 'updated_at' in 'field list'`

**Fix:** Change line 252 to use a column that exists (maybe `last_message_at`)

#### Scenario B: Read-only database user
**Error:** `UPDATE command denied to user 'xxx'@'xxx' for table 'wl_conversations'`

**Fix:** Grant UPDATE permission to your database user

#### Scenario C: Conversation doesn't exist
**Error:** None, but `cursor.rowcount == 0`

**Fix:** Verify the conversation exists in the database:
```sql
SELECT * FROM wl_conversations WHERE id = 'conv_8047f3cb-a64a-48ac-86b7-fdcce1910868' AND domain_id = 'AG04333';
```

#### Scenario D: Database connection issue
**Error:** `Lost connection to MySQL server during query`

**Fix:** Check database connection settings and network

#### Scenario E: Enum value mismatch
**Error:** `Data truncated for column 'status'`

**Fix:** Check if status enum values match between local and remote schemas

## Files Modified

1. `backend/services/conversation_service.py`
   - Line ~252: Changed to `updated_at = NOW()`
   - Lines ~220, 265, 273, 277, 289: Added detailed logging
   - Line ~289: Added `exc_info=True` for full stack traces

2. `backend/test_conversation_update.py` (NEW)
   - Test script to verify update works

## How to Get the Real Error

The frontend is catching the error and logging a generic message. To see the **actual error**:

### Option 1: Check Backend Logs
```bash
# If using kubectl
kubectl logs -f <pod-name> -n <namespace>

# If using AWS CloudWatch
# Navigate to CloudWatch > Log groups > Your EKS log group
# Filter by "Failed to update conversation"
```

### Option 2: Test with curl
```bash
curl -X POST "https://workforceagent.elevancehealth.com/api/conversations/conv_8047f3cb-a64a-48ac-86b7-fdcce1910868/update?domain_id=AG04333" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Update"}'
```

This should return a JSON response with the actual error message.

### Option 3: Check API Response in Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Trigger the update
4. Click on the failed request
5. Go to "Response" tab
6. Look for the `detail` field in the JSON response

Example response:
```json
{
  "detail": "Unknown column 'updated_at' in 'field list'"
}
```

## Expected Successful Flow

When working correctly, you should see these logs:
```
INFO - Updating conversation conv_8047f3cb-a64a-48ac-86b7-fdcce1910868 for domain AG04333 with data: {'title': 'Test Update Fixed', 'summary': None, 'status': None, 'metadata': None}
INFO - Executing UPDATE query: UPDATE wl_conversations SET title = %s, updated_at = NOW() WHERE id = %s AND domain_id = %s with values: ['Test Update Fixed', 'conv_8047f3cb-a64a-48ac-86b7-fdcce1910868', 'AG04333']
INFO - Successfully updated 1 row(s)
INFO - Fetching updated conversation conv_8047f3cb-a64a-48ac-86b7-fdcce1910868
INFO - Successfully updated conversation conv_8047f3cb-a64a-48ac-86b7-fdcce1910868
```

## Action Items

1. ✅ Deploy the updated `conversation_service.py` to EKS
2. 🔍 Check the backend logs to find the actual error message
3. 📊 Share the error message so we can fix the root cause
4. 🧪 Optionally: Run `test_conversation_update.py` locally first to verify

Please check the logs and share the actual error message, and I can provide a targeted fix!
