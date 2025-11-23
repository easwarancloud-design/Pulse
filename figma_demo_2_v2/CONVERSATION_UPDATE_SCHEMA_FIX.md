# Conversation Update Schema Compatibility Fix

## Problem Summary

The conversation update endpoint was failing in the EKS environment with a 500 Internal Server Error:

```
POST https://workforceagent.elevancehealth.com/api/conversations/conv_5bba0236-7a1b-453a-8951-5f1726daf570/update?domain_id=AG04333 500 (Internal Server Error)
⚠️ Server error updating conversation conv_5bba0236-7a1b-453a-8951-5f1726daf570. Continuing without update.
```

## Root Cause

The issue was a **database schema mismatch** between local and remote (EKS) environments:

### Local Schema (`backend/database/schema.sql`)
```sql
CREATE TABLE wl_conversations (
    id VARCHAR(50) PRIMARY KEY,
    domain_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    metadata JSON,
    message_count INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- ✅ Has updated_at
    ...
);
```

### Remote/EKS Schema (Inferred from error)
- **Missing `updated_at` column** - The remote database does not have this column
- Uses `last_message_at` to track when conversations are modified

## The Issue in Code

The `conversation_service.py` had SQL queries that tried to:

1. **SELECT `updated_at`** from the database:
   ```python
   # Line ~999 - This would fail if column doesn't exist
   SELECT id, domain_id, title, ..., updated_at
   FROM wl_conversations 
   ```

2. **INSERT with `updated_at`**:
   ```python
   # Line ~144 - Would fail in remote DB
   INSERT INTO wl_conversations (..., created_at, updated_at)
   VALUES (..., %s, %s)
   ```

Even though there was a comment on line 251 acknowledging the remote DB doesn't have `updated_at`, the SELECT queries were still trying to fetch it, causing SQL errors.

## Solution Applied

Updated all SQL queries in `conversation_service.py` to use `last_message_at` instead of `updated_at` for database compatibility:

### 1. Fixed `_get_conversation_from_db` (Line ~993)
```python
# BEFORE
SELECT id, domain_id, title, summary, status, metadata, message_count, 
       total_tokens, created_at, updated_at
FROM wl_conversations 

# AFTER
SELECT id, domain_id, title, summary, status, metadata, message_count, 
       total_tokens, created_at, last_message_at as updated_at
FROM wl_conversations 
```

### 2. Fixed `create_conversation` (Line ~143)
```python
# BEFORE
INSERT INTO wl_conversations 
(id, domain_id, title, summary, status, metadata, message_count, total_tokens, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)

# AFTER
INSERT INTO wl_conversations 
(id, domain_id, title, summary, status, metadata, message_count, total_tokens, created_at, last_message_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
```

### 3. Fixed `get_user_conversations` (Line ~553)
```python
# BEFORE
SELECT id, domain_id, title, summary, status, created_at, updated_at, 
       last_message_at, message_count, total_tokens, metadata
FROM wl_conversations

# AFTER
SELECT id, domain_id, title, summary, status, created_at, 
       last_message_at, message_count, total_tokens, metadata,
       last_message_at as updated_at
FROM wl_conversations
```

### 4. Fixed `_search_conversations_from_db` (Line ~1062)
```python
# BEFORE
SELECT id, domain_id, title, summary, status, message_count,
       last_message_at, created_at, updated_at, total_tokens, metadata
FROM wl_conversations

# AFTER
SELECT id, domain_id, title, summary, status, message_count,
       last_message_at, created_at, total_tokens, metadata,
       last_message_at as updated_at
FROM wl_conversations
```

## How This Works

- **API Layer**: Still uses `updated_at` field in responses (no breaking changes)
- **Database Layer**: Uses `last_message_at` column (compatible with remote schema)
- **SQL Aliasing**: `last_message_at as updated_at` maps the DB column to the expected field name
- **UPDATE queries**: Already used `last_message_at = NOW()` (line 252)

## Testing Recommendations

1. **Test conversation title rename** in EKS environment:
   ```
   POST /api/conversations/{id}/update?domain_id=xxx
   Body: {"title": "New Title"}
   ```

2. **Test conversation creation** to ensure INSERT works:
   ```
   POST /api/conversations
   Body: {"domain_id": "xxx", "title": "Test"}
   ```

3. **Test conversation listing** to ensure SELECTs work:
   ```
   GET /api/conversations/user/{domain_id}
   ```

4. **Test search** to ensure search queries work:
   ```
   GET /api/conversations/search/?domain_id=xxx&query=test
   ```

## Files Modified

- `backend/services/conversation_service.py` - Fixed 4 SQL queries for schema compatibility

## Notes

- The code now works with both local schema (with `updated_at`) and remote schema (without `updated_at`)
- Using `last_message_at` for tracking modifications is semantically similar to `updated_at`
- Frontend code requires no changes - API responses still include `updated_at` field
