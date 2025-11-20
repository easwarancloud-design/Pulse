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
-- DROP TABLE IF EXISTS wl_reference_links;
-- DROP TABLE IF EXISTS wl_messages;
-- DROP TABLE IF EXISTS wl_conversations;
-- DROP TABLE IF EXISTS wl_user_sessions;

-- ================================================
-- 1. WL_CONVERSATIONS TABLE
-- ================================================
-- Stores conversation metadata and summary information
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_domain_id (domain_id),
    INDEX idx_status (status),
    INDEX idx_last_message_at (last_message_at),
    INDEX idx_created_at (created_at),
    INDEX idx_domain_status (domain_id, status),
    INDEX idx_domain_created (domain_id, created_at),
    
    -- Full-text search index for title and summary
    FULLTEXT INDEX ft_title_summary (title, summary)
);

-- ================================================
-- 2. WL_MESSAGES TABLE
-- ================================================
-- Stores individual messages within conversations
CREATE TABLE wl_messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    chat_id VARCHAR(100) DEFAULT NULL COMMENT 'Frontend chat bubble ID for feedback mapping',
    message_type ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON,
    token_count INT,
    -- Feedback fields for like/dislike functionality
    liked TINYINT DEFAULT 0 COMMENT '-1=dislike, 0=neutral, 1=like',
    feedback_text TEXT DEFAULT NULL COMMENT 'User feedback text',
    feedback_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When feedback was given',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (conversation_id) REFERENCES wl_conversations(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_chat_id (chat_id),
    INDEX idx_message_type (message_type),
    INDEX idx_created_at (created_at),
    INDEX idx_conversation_created (conversation_id, created_at),
    INDEX idx_feedback_liked (liked),
    
    -- Full-text search index for message content
    FULLTEXT INDEX ft_content (content)
);

-- ================================================
-- 3. WL_REFERENCE_LINKS TABLE
-- ================================================
-- Stores reference links found in messages
CREATE TABLE wl_reference_links (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(500),
    reference_type ENUM('url', 'document', 'api', 'database', 'other') DEFAULT 'url',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (message_id) REFERENCES wl_messages(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_message_id (message_id),
    INDEX idx_reference_type (reference_type),
    INDEX idx_created_at (created_at),
    
    -- Full-text search index for URL and title
    FULLTEXT INDEX ft_url_title (url, title)
);

-- ================================================
-- 4. WL_USER_SESSIONS TABLE
-- ================================================
-- Tracks user session data and activity
CREATE TABLE wl_user_sessions (
    domain_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active_conversation_id VARCHAR(50),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (optional - conversation might be deleted)
    FOREIGN KEY (active_conversation_id) REFERENCES wl_conversations(id) ON DELETE SET NULL,
    
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
    FROM wl_messages 
    WHERE conversation_id = conv_id;
    
    -- Update conversation record
    UPDATE wl_conversations 
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
    DELETE FROM wl_user_sessions 
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
    SELECT COUNT(*) INTO msg_count FROM wl_messages WHERE conversation_id = conv_id;
    RETURN msg_count;
END //
DELIMITER ;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger to automatically update conversation stats when message is inserted
DELIMITER //
CREATE TRIGGER after_message_insert
    AFTER INSERT ON wl_messages
    FOR EACH ROW
BEGIN
    CALL UpdateConversationStats(NEW.conversation_id);
END //
DELIMITER ;

-- Trigger to automatically update conversation stats when message is deleted
DELIMITER //
CREATE TRIGGER after_message_delete
    AFTER DELETE ON wl_messages
    FOR EACH ROW
BEGIN
    CALL UpdateConversationStats(OLD.conversation_id);
END //
DELIMITER ;

-- Trigger to update user session activity
DELIMITER //
CREATE TRIGGER after_message_insert_session
    AFTER INSERT ON wl_messages
    FOR EACH ROW
BEGIN
    -- Update user session last activity when they send a message
    IF NEW.message_type = 'user' THEN
        INSERT INTO wl_user_sessions (domain_id, last_activity, active_conversation_id)
        SELECT c.domain_id, NOW(), NEW.conversation_id
        FROM wl_conversations c
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
-- ALTER TABLE wl_conversations ADD INDEX idx_user_title (user_id, title(100));
-- ALTER TABLE wl_messages ADD INDEX idx_conv_type_created (conversation_id, message_type, created_at);

-- ================================================
-- VIEWS FOR COMMON QUERIES (REMOVED UNUSED VIEWS)
-- ================================================

-- View for conversation summaries with latest message info
CREATE VIEW conversation_summaries AS
SELECT 
    c.id,
    c.domain_id,
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
FROM wl_conversations c
LEFT JOIN wl_messages m ON c.id = m.conversation_id 
    AND m.created_at = c.last_message_at
WHERE c.status != 'deleted'
ORDER BY c.last_message_at DESC;

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
INSERT INTO wl_conversations (id, domain_id, title) 
VALUES ('conv_123', 'AG04333', 'My First Conversation');

-- Insert messages with chat_id for frontend mapping
INSERT INTO wl_messages (id, conversation_id, chat_id, message_type, content, token_count) 
VALUES 
  ('msg_789', 'conv_123', 'user-1', 'user', 'Hello, how can you help me?', 25),
  ('msg_790', 'conv_123', 'bot-1', 'assistant', 'I can help you with various tasks!', 30);

-- Update feedback for a specific response using chat_id
UPDATE wl_messages 
SET liked = 1, feedback_text = 'Very helpful response', feedback_at = NOW()
WHERE chat_id = 'bot-1' AND conversation_id = 'conv_123';

-- Search conversations by title
SELECT * FROM wl_conversations 
WHERE domain_id = 'AG04333' 
    AND MATCH(title, summary) AGAINST('help support' IN NATURAL LANGUAGE MODE);

-- Get conversation with all messages including chat_ids and feedback
SELECT 
    c.*, 
    m.id as message_id, 
    m.chat_id,
    m.message_type, 
    m.content, 
    m.liked,
    m.feedback_text,
    m.feedback_at,
    m.created_at as message_created_at
FROM wl_conversations c
LEFT JOIN wl_messages m ON c.id = m.conversation_id
WHERE c.id = 'conv_123'
ORDER BY m.created_at;
*/