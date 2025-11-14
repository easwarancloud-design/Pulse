-- ================================================
-- Conversation Storage System Database Schema
-- ================================================
-- This script creates the necessary tables for storing
-- conversations, messages, reference links, and user sessions
-- 
-- Tables:
-- 1. conversations - Main conversation metadata
-- 2. messages - Individual messages within conversations
-- 3. reference_links - URL references found in messages
-- 4. user_sessions - User session and activity tracking
-- ================================================

-- Drop tables if they exist (for clean setup)
-- Remove these DROP statements in production
-- DROP TABLE IF EXISTS reference_links;
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS conversations;
-- DROP TABLE IF EXISTS user_sessions;

-- ================================================
-- 1. CONVERSATIONS TABLE
-- ================================================
-- Stores conversation metadata and summary information
CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    metadata JSON,
    message_count INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_last_message_at (last_message_at),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_created (user_id, created_at),
    
    -- Full-text search index for title and summary
    FULLTEXT INDEX ft_title_summary (title, summary)
);

-- ================================================
-- 2. MESSAGES TABLE
-- ================================================
-- Stores individual messages within conversations
CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    message_type ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON,
    token_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_message_type (message_type),
    INDEX idx_created_at (created_at),
    INDEX idx_conversation_created (conversation_id, created_at),
    
    -- Full-text search index for message content
    FULLTEXT INDEX ft_content (content)
);

-- ================================================
-- 3. REFERENCE_LINKS TABLE
-- ================================================
-- Stores reference links found in messages
CREATE TABLE reference_links (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(500),
    reference_type ENUM('url', 'document', 'api', 'database', 'other') DEFAULT 'url',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_message_id (message_id),
    INDEX idx_reference_type (reference_type),
    INDEX idx_created_at (created_at),
    
    -- Full-text search index for URL and title
    FULLTEXT INDEX ft_url_title (url, title)
);

-- ================================================
-- 4. USER_SESSIONS TABLE
-- ================================================
-- Tracks user session data and activity
CREATE TABLE user_sessions (
    user_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active_conversation_id VARCHAR(50),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (optional - conversation might be deleted)
    FOREIGN KEY (active_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_session_id (session_id),
    INDEX idx_last_activity (last_activity),
    INDEX idx_active_conversation (active_conversation_id)
);

-- ================================================
-- STORED PROCEDURES AND FUNCTIONS
-- ================================================

-- Procedure to update conversation statistics
DELIMITER //
CREATE PROCEDURE UpdateConversationStats(IN conv_id VARCHAR(50))
BEGIN
    DECLARE msg_count INT DEFAULT 0;
    DECLARE total_tokens_sum INT DEFAULT 0;
    DECLARE last_msg_time TIMESTAMP DEFAULT NULL;
    
    -- Calculate message count and total tokens
    SELECT 
        COUNT(*), 
        COALESCE(SUM(token_count), 0),
        MAX(created_at)
    INTO msg_count, total_tokens_sum, last_msg_time
    FROM messages 
    WHERE conversation_id = conv_id;
    
    -- Update conversation record
    UPDATE conversations 
    SET 
        message_count = msg_count,
        total_tokens = total_tokens_sum,
        last_message_at = last_msg_time,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = conv_id;
END //
DELIMITER ;

-- Procedure to cleanup old sessions
DELIMITER //
CREATE PROCEDURE CleanupOldSessions(IN days_old INT)
BEGIN
    DELETE FROM user_sessions 
    WHERE last_activity < DATE_SUB(NOW(), INTERVAL days_old DAY);
END //
DELIMITER ;

-- Function to get conversation message count
DELIMITER //
CREATE FUNCTION GetConversationMessageCount(conv_id VARCHAR(50))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE msg_count INT DEFAULT 0;
    SELECT COUNT(*) INTO msg_count FROM messages WHERE conversation_id = conv_id;
    RETURN msg_count;
END //
DELIMITER ;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger to automatically update conversation stats when message is inserted
DELIMITER //
CREATE TRIGGER after_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
BEGIN
    CALL UpdateConversationStats(NEW.conversation_id);
END //
DELIMITER ;

-- Trigger to automatically update conversation stats when message is deleted
DELIMITER //
CREATE TRIGGER after_message_delete
    AFTER DELETE ON messages
    FOR EACH ROW
BEGIN
    CALL UpdateConversationStats(OLD.conversation_id);
END //
DELIMITER ;

-- Trigger to update user session activity
DELIMITER //
CREATE TRIGGER after_message_insert_session
    AFTER INSERT ON messages
    FOR EACH ROW
BEGIN
    -- Update user session last activity when they send a message
    IF NEW.message_type = 'user' THEN
        INSERT INTO user_sessions (user_id, last_activity, active_conversation_id)
        SELECT c.user_id, NOW(), NEW.conversation_id
        FROM conversations c
        WHERE c.id = NEW.conversation_id
        ON DUPLICATE KEY UPDATE 
            last_activity = NOW(),
            active_conversation_id = NEW.conversation_id;
    END IF;
END //
DELIMITER ;

DELIMITER ;

-- ================================================
-- INITIAL DATA AND CONFIGURATION
-- ================================================

-- Create indexes for better performance (if not created above)
-- ALTER TABLE conversations ADD INDEX idx_user_title (user_id, title(100));
-- ALTER TABLE messages ADD INDEX idx_conv_type_created (conversation_id, message_type, created_at);

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- View for conversation summaries with latest message info
CREATE VIEW conversation_summaries AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.summary,
    c.status,
    c.message_count,
    c.total_tokens,
    c.last_message_at,
    c.created_at,
    c.updated_at,
    m.content as latest_message_content,
    m.message_type as latest_message_type
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id 
    AND m.created_at = c.last_message_at
WHERE c.status != 'deleted'
ORDER BY c.last_message_at DESC;

-- View for active conversations with recent activity
CREATE VIEW recent_conversations AS
SELECT 
    c.*,
    us.last_activity as user_last_activity
FROM conversations c
LEFT JOIN user_sessions us ON c.user_id = us.user_id
WHERE c.status = 'active'
    AND c.last_message_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY COALESCE(c.last_message_at, c.created_at) DESC;

-- ================================================
-- PERFORMANCE OPTIMIZATION HINTS
-- ================================================
-- 1. Consider partitioning messages table by date if volume is high
-- 2. Archive old conversations to separate tables
-- 3. Use Redis caching for frequently accessed conversations
-- 4. Monitor query performance and add indexes as needed
-- 5. Regular cleanup of deleted conversations and old sessions

-- ================================================
-- USAGE EXAMPLES
-- ================================================
/*
-- Insert a new conversation
INSERT INTO conversations (id, user_id, title) 
VALUES ('conv_123', 'user_456', 'My First Conversation');

-- Insert a message
INSERT INTO messages (id, conversation_id, message_type, content, token_count) 
VALUES ('msg_789', 'conv_123', 'user', 'Hello, how can you help me?', 25);

-- Search conversations by title
SELECT * FROM conversations 
WHERE user_id = 'user_456' 
    AND MATCH(title, summary) AGAINST('help support' IN NATURAL LANGUAGE MODE);

-- Get conversation with all messages
SELECT 
    c.*, 
    m.id as message_id, 
    m.message_type, 
    m.content, 
    m.created_at as message_created_at
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.id = 'conv_123'
ORDER BY m.created_at;
*/