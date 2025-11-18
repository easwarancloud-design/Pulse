-- =====================================================
-- DATABASE CREATION
-- =====================================================

CREATE DATABASE IF NOT EXISTS `pulse_conversations` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `pulse_conversations`;

-- =====================================================
-- TABLE 1: conversations
-- Stores main conversation/thread details
-- =====================================================

DROP TABLE IF EXISTS `wl_conversations`;

CREATE TABLE `wl_conversations` (
  `conversation_id` VARCHAR(36) PRIMARY KEY COMMENT 'UUID for conversation',
  `domain_id` VARCHAR(50) NOT NULL COMMENT 'User domain ID (e.g., AG04333)',
  `title` VARCHAR(255) NOT NULL COMMENT 'Conversation title (auto-generated from first message)',
  `summary` TEXT DEFAULT NULL COMMENT 'Conversation summary/description',
  `metadata` JSON DEFAULT NULL COMMENT 'Additional conversation metadata',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When conversation started',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
  `last_message_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of last message',
  `message_count` INT DEFAULT 0 COMMENT 'Total number of messages in conversation',
  `is_archived` BOOLEAN DEFAULT FALSE COMMENT 'Whether conversation is archived',
  `session_id` VARCHAR(100) DEFAULT NULL COMMENT 'Session identifier',
  `first_name` VARCHAR(100) DEFAULT NULL COMMENT 'User first name',
  `last_name` VARCHAR(100) DEFAULT NULL COMMENT 'User last name',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'User email',
  
  -- Indexes for fast retrieval
  INDEX `idx_domain_id` (`domain_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_last_message_at` (`last_message_at`),
  INDEX `idx_domain_created` (`domain_id`, `created_at` DESC),
  INDEX `idx_domain_last_msg` (`domain_id`, `last_message_at` DESC),
  INDEX `idx_archived` (`is_archived`, `domain_id`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Main conversations table';

-- =====================================================
-- TABLE 2: wl_messages
-- Stores individual messages in conversations
-- =====================================================

DROP TABLE IF EXISTS `wl_messages`;

CREATE TABLE `wl_messages` (
  `message_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing message ID',
  `conversation_id` VARCHAR(36) NOT NULL COMMENT 'FK to conversations',
  `chat_id` VARCHAR(100) DEFAULT NULL COMMENT 'Frontend chat bubble ID',
  `message_type` ENUM('user', 'assistant', 'system', 'live_agent') NOT NULL COMMENT 'Type of message',
  `message_text` TEXT NOT NULL COMMENT 'Cleaned message text (for display)',
  `original_text` TEXT DEFAULT NULL COMMENT 'Original text with HTML/links',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When message was created',
  `is_live_agent` BOOLEAN DEFAULT FALSE COMMENT 'Whether from live agent',
  `agent_name` VARCHAR(100) DEFAULT NULL COMMENT 'Live agent name if applicable',
  `liked` TINYINT DEFAULT 0 COMMENT '-1=dislike, 0=neutral, 1=like',
  `feedback_text` TEXT DEFAULT NULL COMMENT 'User feedback text',
  `feedback_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When feedback was given',
  `metadata` JSON DEFAULT NULL COMMENT 'Additional metadata (optional)',
  
  -- Foreign key
  FOREIGN KEY (`conversation_id`) 
    REFERENCES `wl_conversations`(`conversation_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  -- Indexes
  INDEX `idx_conversation_id` (`conversation_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_chat_id` (`chat_id`),
  INDEX `idx_message_type` (`message_type`),
  INDEX `idx_liked` (`liked`),
  
  -- Full-text search index for message search
  FULLTEXT INDEX `idx_fulltext_message` (`message_text`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual messages in conversations';

-- =====================================================
-- TABLE 3: wl_reference_links
-- Stores reference links associated with messages
-- =====================================================

DROP TABLE IF EXISTS `wl_reference_links`;

CREATE TABLE `wl_reference_links` (
  `link_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing link ID',
  `message_id` BIGINT NOT NULL COMMENT 'FK to messages',
  `url` TEXT NOT NULL COMMENT 'Full URL of reference',
  `title` VARCHAR(500) DEFAULT NULL COMMENT 'Link title/description',
  `source_type` VARCHAR(50) DEFAULT NULL COMMENT 'Type: policy, document, wiki, kb, etc',
  `display_order` INT DEFAULT 0 COMMENT 'Order to display links',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When link was added',
  
  -- Foreign key
  FOREIGN KEY (`message_id`) 
    REFERENCES `wl_messages`(`message_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  -- Indexes
  INDEX `idx_message_id` (`message_id`),
  INDEX `idx_source_type` (`source_type`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reference links for messages';

-- =====================================================
-- TABLE 4: wl_user_sessions (Optional - for analytics)
-- Tracks user sessions for analytics/audit
-- =====================================================

DROP TABLE IF EXISTS `wl_user_sessions`;

CREATE TABLE `wl_user_sessions` (
  `session_id` VARCHAR(100) PRIMARY KEY COMMENT 'Session identifier',
  `domain_id` VARCHAR(50) NOT NULL COMMENT 'User domain ID',
  `conversation_id` VARCHAR(36) DEFAULT NULL COMMENT 'Current conversation ID',
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last activity timestamp',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Session start time',
  `user_agent` TEXT DEFAULT NULL COMMENT 'Browser user agent',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'User IP address',
  
  -- Indexes
  INDEX `idx_domain_id` (`domain_id`),
  INDEX `idx_last_activity` (`last_activity`),
  INDEX `idx_conversation_id` (`conversation_id`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User sessions for analytics (optional)';

-- =====================================================
-- TABLE 5: wl_conversation_analytics (Optional)
-- Aggregated analytics per conversation
-- =====================================================

DROP TABLE IF EXISTS `wl_conversation_analytics`;

CREATE TABLE `wl_conversation_analytics` (
  `analytics_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(36) NOT NULL UNIQUE,
  `total_messages` INT DEFAULT 0,
  `user_messages` INT DEFAULT 0,
  `assistant_messages` INT DEFAULT 0,
  `live_agent_messages` INT DEFAULT 0,
  `total_likes` INT DEFAULT 0,
  `total_dislikes` INT DEFAULT 0,
  `avg_response_time_ms` INT DEFAULT 0,
  `has_reference_links` BOOLEAN DEFAULT FALSE,
  `total_reference_links` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (`conversation_id`) 
    REFERENCES `wl_conversations`(`conversation_id`) 
    ON DELETE CASCADE,
  
  -- Index
  INDEX `idx_conversation_id` (`conversation_id`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Analytics aggregated per conversation';

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Recent conversations with message preview
DROP VIEW IF EXISTS `v_recent_conversations`;

CREATE VIEW `v_recent_conversations` AS
SELECT 
  c.conversation_id,
  c.domain_id,
  c.title,
  c.created_at,
  c.last_message_at,
  c.message_count,
  c.is_archived,
  (SELECT m.message_text 
   FROM wl_messages m 
   WHERE m.conversation_id = c.conversation_id 
   ORDER BY m.created_at ASC 
   LIMIT 1) AS first_message_preview,
  (SELECT m.message_text 
   FROM wl_messages m 
   WHERE m.conversation_id = c.conversation_id 
   ORDER BY m.created_at DESC 
   LIMIT 1) AS last_message_preview,
  (SELECT COUNT(*) 
   FROM wl_reference_links rl 
   INNER JOIN wl_messages m ON rl.message_id = m.message_id 
   WHERE m.conversation_id = c.conversation_id) AS total_reference_links
FROM wl_conversations c
ORDER BY c.last_message_at DESC;

-- View: Today's conversations grouped by hour
DROP VIEW IF EXISTS `v_conversations_today`;

CREATE VIEW `v_conversations_today` AS
SELECT 
  DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS hour_bucket,
  COUNT(*) AS conversation_count,
  COUNT(DISTINCT domain_id) AS unique_users
FROM wl_conversations
WHERE DATE(created_at) = CURDATE()
GROUP BY hour_bucket
ORDER BY hour_bucket DESC;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure: Get conversation with all messages and links
DROP PROCEDURE IF EXISTS `sp_get_conversation_full`;

DELIMITER //

CREATE PROCEDURE `sp_get_conversation_full`(
  IN p_conversation_id VARCHAR(36)
)
BEGIN
  -- Get conversation details
  SELECT * FROM wl_conversations WHERE conversation_id = p_conversation_id;
  
  -- Get all messages
  SELECT 
    m.*,
    (SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'link_id', rl.link_id,
        'url', rl.url,
        'title', rl.title,
        'source_type', rl.source_type
      )
    ) FROM wl_reference_links rl WHERE rl.message_id = m.message_id) AS reference_links
  FROM wl_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END //

DELIMITER ;

-- Procedure: Archive old conversations
DROP PROCEDURE IF EXISTS `sp_archive_old_conversations`;

DELIMITER //

CREATE PROCEDURE `sp_archive_old_conversations`(
  IN p_days_old INT
)
BEGIN
  UPDATE wl_conversations
  SET is_archived = TRUE
  WHERE last_message_at < DATE_SUB(NOW(), INTERVAL p_days_old DAY)
    AND is_archived = FALSE;
  
  SELECT ROW_COUNT() AS archived_count;
END //

DELIMITER ;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample conversation
INSERT INTO wl_conversations (conversation_id, domain_id, title, message_count)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'AG04333', 'Email Update Question', 2);

-- Insert sample messages
INSERT INTO wl_messages (conversation_id, chat_id, message_type, message_text, original_text)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'user-1', 'user', 'How do I update my email?', 'How do I update my email?'),
  ('550e8400-e29b-41d4-a716-446655440000', 'bot-1', 'assistant', 'To update your email, go to Workday and navigate to Personal Information.', 'To update your email, go to Workday and navigate to <a href="https://workday.com">Personal Information</a>.');

-- Insert sample reference links
INSERT INTO wl_reference_links (message_id, url, title, source_type, display_order)
VALUES 
  (2, 'https://workday.elevancehealth.com/personal-info', 'Personal Information Page', 'workday', 0),
  (2, 'https://policy.elevancehealth.com/email-policy', 'Email Update Policy', 'policy', 1);

-- =====================================================
-- TRIGGERS (Optional - for analytics)
-- =====================================================

-- Trigger: Update conversation analytics on message insert
DROP TRIGGER IF EXISTS `tr_update_analytics_on_insert`;

DELIMITER //

CREATE TRIGGER `tr_update_analytics_on_insert`
AFTER INSERT ON wl_messages
FOR EACH ROW
BEGIN
  INSERT INTO wl_conversation_analytics (conversation_id, total_messages)
  VALUES (NEW.conversation_id, 1)
  ON DUPLICATE KEY UPDATE
    total_messages = total_messages + 1,
    user_messages = user_messages + IF(NEW.message_type = 'user', 1, 0),
    assistant_messages = assistant_messages + IF(NEW.message_type = 'assistant', 1, 0),
    live_agent_messages = live_agent_messages + IF(NEW.is_live_agent = TRUE, 1, 0);
END //

DELIMITER ;

-- Trigger: Update analytics on feedback
DROP TRIGGER IF EXISTS `tr_update_analytics_on_feedback`;

DELIMITER //

CREATE TRIGGER `tr_update_analytics_on_feedback`
AFTER UPDATE ON wl_messages
FOR EACH ROW
BEGIN
  IF NEW.liked != OLD.liked THEN
    UPDATE wl_conversation_analytics
    SET 
      total_likes = total_likes + IF(NEW.liked = 1, 1, IF(OLD.liked = 1, -1, 0)),
      total_dislikes = total_dislikes + IF(NEW.liked = -1, 1, IF(OLD.liked = -1, -1, 0))
    WHERE conversation_id = NEW.conversation_id;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX `idx_domain_date_range` ON wl_conversations(domain_id, created_at, last_message_at);
CREATE INDEX `idx_message_conversation_type` ON wl_messages(conversation_id, message_type, created_at);

-- =====================================================
-- DATABASE MAINTENANCE
-- =====================================================

-- Optimize tables
OPTIMIZE TABLE wl_conversations;
OPTIMIZE TABLE wl_messages;
OPTIMIZE TABLE wl_reference_links;

-- Analyze tables for query optimization
ANALYZE TABLE wl_conversations;
ANALYZE TABLE wl_messages;
ANALYZE TABLE wl_reference_links;

-- =====================================================
-- GRANTS (Adjust username/password as needed)
-- =====================================================

-- Create application user
CREATE USER IF NOT EXISTS 'pulse_app'@'%' IDENTIFIED BY 'your_secure_password_here';

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON pulse_conversations.* TO 'pulse_app'@'%';
GRANT EXECUTE ON pulse_conversations.* TO 'pulse_app'@'%';

FLUSH PRIVILEGES;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show all tables
SHOW TABLES;

-- Show table structures
DESCRIBE wl_conversations;
DESCRIBE wl_messages;
DESCRIBE wl_reference_links;
DESCRIBE wl_user_sessions;
DESCRIBE wl_conversation_analytics;

-- Show indexes
SHOW INDEX FROM wl_conversations;
SHOW INDEX FROM wl_messages;
SHOW INDEX FROM wl_reference_links;

-- Test sample data
SELECT * FROM wl_conversations;
SELECT * FROM wl_messages;
SELECT * FROM wl_reference_links;

-- Test views
SELECT * FROM v_recent_conversations LIMIT 10;
SELECT * FROM v_conversations_today;

-- =====================================================
-- END OF DDL
-- =====================================================