-- 1) Threads
CREATE TABLE IF NOT EXISTS wa_threads (
  id            CHAR(36)     NOT NULL,        -- UUID threadId (use chatid in UI)
  domain_id     VARCHAR(64)  NOT NULL,
  session_id    VARCHAR(128) NULL,
  title_id      VARCHAR(128) NULL,
  title         VARCHAR(512) NULL,
  mode          ENUM('bot','agent','mixed') NOT NULL DEFAULT 'bot',
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  closed_at     DATETIME(6)  NULL,
  message_count INT          NOT NULL DEFAULT 0,
  last_preview  TEXT         NULL,            -- sanitized last message preview
  last_sender   ENUM('user','bot','agent','system') NULL,
  PRIMARY KEY (id),
  KEY idx_threads_domain_updated (domain_id, updated_at),
  FULLTEXT KEY ft_threads_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Messages
CREATE TABLE IF NOT EXISTS wa_messages (
  id             CHAR(36)     NOT NULL,        -- UUID messageId
  thread_id      CHAR(36)     NOT NULL,
  sender_type    ENUM('user','bot','agent','system') NOT NULL,
  completed      TINYINT(1)   NOT NULL DEFAULT 1,  -- 0 while streaming; set 1 on finalize
  text_encrypted LONGTEXT     NULL,                -- PROTECT-encrypted blob
  text_plain     LONGTEXT     NULL,                -- sanitized plaintext for search (no PII)
  agent_name     VARCHAR(128) NULL,                -- for agent messages
  meta_json      JSON         NULL,                -- ref links, case links, etc.
  created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_messages_thread_created (thread_id, created_at),
  FULLTEXT KEY ft_messages_text_plain (text_plain),
  CONSTRAINT fk_messages_thread FOREIGN KEY (thread_id) REFERENCES wa_threads(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Reactions (per-message like/dislike by user)
CREATE TABLE IF NOT EXISTS wa_reactions (
  id          CHAR(36)    NOT NULL,           -- UUID
  thread_id   CHAR(36)    NOT NULL,
  message_id  CHAR(36)    NOT NULL,
  domain_id   VARCHAR(64) NOT NULL,
  user_id     VARCHAR(128) NOT NULL,          -- the reacting user (domain member)
  score       TINYINT     NOT NULL,           -- -1 dislike, 0 neutral/remove, 1 like
  comment_enc LONGTEXT    NULL,               -- optional PROTECT-encrypted comment
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reaction_identity (thread_id, message_id, domain_id, user_id),
  KEY idx_reactions_thread (thread_id),
  CONSTRAINT fk_reactions_thread FOREIGN KEY (thread_id) REFERENCES wa_threads(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reactions_message FOREIGN KEY (message_id) REFERENCES wa_messages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: denormalized aggregates if you want quick counts without computing on the fly
-- ALTER TABLE wa_threads ADD COLUMN likes_count INT NOT NULL DEFAULT 0, ADD COLUMN dislikes_count INT NOT NULL DEFAULT 0;