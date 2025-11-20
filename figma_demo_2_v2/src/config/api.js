/**
 * API Configuration
 * Central location for all API endpoints and configurations
 */

// Base URLs
export const API_BASE_URLS = {
  WORKFORCE_AGENT: 'https://workforceagent.elevancehealth.com',
  SERVICE_NOW: 'https://elevancehealth.service-now.com',
  OKTA: 'https://portalssoqa.elevancehealth.com',
  // Use local FastAPI server for conversation storage (for development)
  LOCAL_CONVERSATION_API: 'https://workforceagent.elevancehealth.com',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Workforce Agent endpoints
  WORKFORCE_CHAT: `${API_BASE_URLS.WORKFORCE_AGENT}/workforceagent/chat`,
  TOKEN: `${API_BASE_URLS.WORKFORCE_AGENT}/token`,
  USER_TO_AGENT: `${API_BASE_URLS.WORKFORCE_AGENT}/user/to/agent/servicenow`,
  PREDEFINED_QUESTIONS: `${API_BASE_URLS.WORKFORCE_AGENT}/api/predefined_questions`,
  WEBSOCKET: (requestId) => `wss://workforceagent.elevancehealth.com/ws/${requestId}`,
  
  // Local Conversation API endpoints
  CONVERSATIONS: `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations`,
  CONVERSATION_BY_ID: (conversationId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/${conversationId}`,
  CONVERSATION_DELETE: (conversationId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/${conversationId}/delete`,
  CONVERSATION_MESSAGES: (conversationId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/${conversationId}/messages`,
  CONVERSATION_MESSAGES_BULK: (conversationId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/${conversationId}/messages/bulk`,
  CONVERSATION_SEARCH: `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/search`,
  USER_CONVERSATIONS: (userId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/user/${userId}`,
  USER_SESSION: (userId) => `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/session/${userId}`,
  CONVERSATION_HEALTH: `${API_BASE_URLS.LOCAL_CONVERSATION_API}/api/conversations/health`,
  
  // ServiceNow endpoints
  SERVICENOW_HR_CATALOG: `${API_BASE_URLS.SERVICE_NOW}/esc?id=elevance_health_hrsd_catalog`,
  
  // Okta endpoints
  OKTA_OAUTH: `${API_BASE_URLS.OKTA}/oauth2/ausefjy7k3J5S1AXz297`,
};

// API Headers
export const API_HEADERS = {
  JSON: {
    'Content-Type': 'application/json',
  },
  WORKFORCE_AUTH: (token, domainId, question) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'domainid': domainId.toUpperCase(),
    ...(question && { 'question': question }),
  }),
  TOKEN_AUTH: {
    'Authorization': 'Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==',
    'Content-Type': 'application/json',
  },
};

// API Request Options
export const API_OPTIONS = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export default {
  API_BASE_URLS,
  API_ENDPOINTS,
  API_HEADERS,
  API_OPTIONS,
};
