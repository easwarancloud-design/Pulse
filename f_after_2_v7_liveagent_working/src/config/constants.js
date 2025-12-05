/**
 * Application Constants
 * Central location for all app-wide constants
 */

// Domain Configuration
export const DOMAIN_CONFIG = {
  DEFAULT_DOMAIN_ID: null,
  STORAGE_KEY_PREFIX: 'pulse_',
};

// Storage Keys
export const STORAGE_KEYS = {
  DOMAIN_ID: 'domainid',
  ACCESS_TOKEN: (domainId) => `access_token_${domainId}`,
  ACCESS_EXPIRY: (domainId) => `access_expiry_${domainId}`,
  CHAT_THREADS: 'chatThreads',
  USER_PREFERENCES: 'userPreferences',
};

// Timing Constants
export const TIMING = {
  TOKEN_EXPIRY: 3 * 60 * 60 * 1000, // 3 hours
  INACTIVITY_LIMIT: 19 * 60 * 1000, // 19 minutes
  STREAMING_WORD_DELAY: 5, // milliseconds
  COPY_FEEDBACK_DURATION: 2000, // 2 seconds
  SELECTION_RESET_DELAY: 3000, // 3 seconds
};

// Live Agent Configuration
export const LIVE_AGENT = {
  GROUPS: {
    HR_ADVISOR: 'AgenticHRAdvisor',
    CONTACT_CENTER: 'AgenticContactCenter',
  },
  DEFAULT_TOKEN: 'vaacubed',
  TIMEZONE: 'America/New_York',
  FIRST_MESSAGE: 'First_Message',
  ACTION_TYPES: {
    SWITCH: 'SWITCH',
    END_CONVERSATION: 'END_CONVERSATION',
  },
};

// Message Types
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  LIVE_AGENT: 'live_agent',
};

// Thread Categories
export const THREAD_CATEGORIES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_WEEK: 'lastWeek',
  LAST_30_DAYS: 'last30Days',
};

// UI Constants
export const UI = {
  MAX_MESSAGE_WIDTH: '760px',
  MAX_THREAD_TITLE_LENGTH: 50,
  REFERENCE_LINKS_WIDTH: '320px',
  DEFAULT_CHAT_TITLE: 'New Chat',
  WELCOME_MESSAGE: 'Hello! I\'m here to help you with any questions you might have.',
};

// Performance Constants
export const PERFORMANCE = {
  MAX_RESULTS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '🌐 Network connection issue. Please check your internet connection and try again.',
  AUTH_FAILED: '🔐 Authentication failed. Please refresh the page and try again.',
  ACCESS_DENIED: '🚫 Access denied. You may not have permission to access this service.',
  SERVER_ERROR: '⚙️ Server error. The service is temporarily unavailable. Please try again later.',
  SERVICE_UNAVAILABLE: '🔧 Service temporarily unavailable. Please try again in a few moments.',
  DEFAULT_ERROR: '⚠️ Unable to fetch response. Please try again.',
  LIVE_AGENT_DISCONNECTED: 'Disconnected from the live agent.',
  LIVE_AGENT_NO_AGENTS: 'No agents available. Ending session.',
  LIVE_AGENT_TECHNICAL_ISSUE: 'Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.',
};

// LiveAgent Markers
export const LIVE_AGENT_MARKERS = {
  FULL: '<<LiveAgent>>',
  PARTIAL_REGEX: /<<Live(Agent)?>?/i,
  DETECTION_REGEX: /<<\s*LiveAgent\s*>>/i,
};

export default {
  DOMAIN_CONFIG,
  STORAGE_KEYS,
  TIMING,
  LIVE_AGENT,
  MESSAGE_TYPES,
  THREAD_CATEGORIES,
  UI,
  PERFORMANCE,
  ERROR_MESSAGES,
  LIVE_AGENT_MARKERS,
};
