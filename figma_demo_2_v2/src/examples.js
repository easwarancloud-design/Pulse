// Example usage of the refactored services
// This file demonstrates how to use the new service layer

import { tokenService } from './services/tokenService';
import { workforceAgentService } from './services/workforceAgentService';
import { liveAgentService } from './services/liveAgentService';
import { API_ENDPOINTS } from './config/api';
import { DOMAIN_CONFIG, ERROR_MESSAGES, TIMING } from './config/constants';
import { formatTextWithLinks, extractReferenceLinks } from './utils/messageFormatter';

// ===================================
// 1. TOKEN SERVICE EXAMPLES
// ===================================

async function exampleGetToken() {
  try {
    // Get token (with automatic caching)
    const token = await tokenService.getToken(DOMAIN_CONFIG.DEFAULT_DOMAIN_ID);
    console.log('Token received:', token);
    
    // Force fresh token (skip cache)
    const freshToken = await tokenService.getToken(DOMAIN_CONFIG.DEFAULT_DOMAIN_ID, true);
    console.log('Fresh token:', freshToken);
    
    // Clear token
    tokenService.clearToken(DOMAIN_CONFIG.DEFAULT_DOMAIN_ID);
    console.log('Token cleared');
    
  } catch (error) {
    console.error('Token error:', error);
  }
}

// ===================================
// 2. WORKFORCE AGENT SERVICE EXAMPLES
// ===================================

async function exampleSendChatMessage() {
  const question = 'What is my PTO balance?';
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  
  try {
    const result = await workforceAgentService.sendMessage(
      question,
      domainId,
      // onChunk - called for each streaming chunk
      (partialText) => {
        console.log('Streaming:', partialText);
        // Update UI with partial text here
      },
      // onComplete - called when streaming finishes
      () => {
        console.log('Streaming complete');
        // Mark as complete in UI
      },
      // onError - called if error occurs
      (error) => {
        console.error('Chat error:', error);
        // Show error message to user
      }
    );
    
    if (result.isLiveAgent) {
      console.log('Live agent routing detected');
      // Handle live agent routing
    } else {
      console.log('Full response:', result.fullResponse);
      // Display final response
    }
    
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

// ===================================
// 3. LIVE AGENT SERVICE EXAMPLES
// ===================================

async function exampleConnectToLiveAgent() {
  const groupName = 'AgenticHRAdvisor'; // or 'AgenticContactCenter'
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  
  try {
    const requestId = await liveAgentService.routeToAgent(
      groupName,
      domainId,
      // onMessage - called when agent sends message
      (message) => {
        console.log('Agent message:', message.text);
        console.log('Agent name:', message.agentName);
        // Display message in UI
      },
      // onConnect - called when connected
      () => {
        console.log('Connected to live agent');
        // Show connected status in UI
      },
      // onDisconnect - called when disconnected
      (reason) => {
        console.log('Disconnected:', reason);
        // Show disconnection message
      },
      // onError - called on error
      (error) => {
        console.error('Live agent error:', error);
        // Show error to user
      }
    );
    
    console.log('Live agent request ID:', requestId);
    
  } catch (error) {
    console.error('Failed to connect to live agent:', error);
  }
}

async function exampleSendLiveAgentMessage() {
  const message = 'I need help with my benefits enrollment';
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  
  // Send message through active WebSocket connection
  liveAgentService.sendMessage(message, domainId);
}

async function exampleEndLiveAgentSession() {
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  
  // Terminate the live agent session
  await liveAgentService.terminate(
    'User ended the conversation',
    domainId,
    (reason) => {
      console.log('Session ended:', reason);
      // Update UI to show session ended
    }
  );
}

// ===================================
// 4. MESSAGE FORMATTING EXAMPLES
// ===================================

function exampleFormatMessage() {
  const rawText = '**Hello!** This is a message with \\n line breaks and **bold text**.';
  
  // Format text with HTML rendering
  const formattedComponent = formatTextWithLinks(rawText);
  // Returns a React component with proper formatting
  
  return formattedComponent;
}

function exampleExtractLinks() {
  const textWithLinks = 'Check out <a href="https://example.com">this link</a> and <a href="https://test.com">another one</a>';
  
  const links = extractReferenceLinks(textWithLinks);
  // Returns: [
  //   { url: 'https://example.com', title: 'this link' },
  //   { url: 'https://test.com', title: 'another one' }
  // ]
  
  console.log('Extracted links:', links);
}

// ===================================
// 5. USING CONSTANTS
// ===================================

function exampleUseConstants() {
  // Get default domain ID
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID; // 'AG04333'
  
  // Get storage keys
  const tokenKey = STORAGE_KEYS.ACCESS_TOKEN(domainId); // 'access_token_AG04333'
  
  // Get timing values
  const timeout = TIMING.INACTIVITY_LIMIT; // 19 minutes in ms
  
  // Get error messages
  const errorMsg = ERROR_MESSAGES.NETWORK_ERROR; // User-friendly network error
  
  console.log({ domainId, tokenKey, timeout, errorMsg });
}

// ===================================
// 6. USING API ENDPOINTS
// ===================================

async function exampleUseApiEndpoints() {
  // Get token endpoint
  const tokenUrl = API_ENDPOINTS.TOKEN;
  // 'https://workforceagent.elevancehealth.com/token'
  
  // Get chat endpoint
  const chatUrl = API_ENDPOINTS.WORKFORCE_CHAT;
  // 'https://workforceagent.elevancehealth.com/workforceagent/chat'
  
  // Get WebSocket endpoint
  const requestId = '1234567890';
  const wsUrl = API_ENDPOINTS.WEBSOCKET(requestId);
  // 'wss://workforceagent.elevancehealth.com/ws/1234567890'
  
  // Open ServiceNow catalog
  window.open(API_ENDPOINTS.SERVICENOW_HR_CATALOG, '_blank');
  
  console.log({ tokenUrl, chatUrl, wsUrl });
}

// ===================================
// 7. COMPLETE WORKFLOW EXAMPLE
// ===================================

async function exampleCompleteWorkflow() {
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  const question = 'Can you help me with my benefits?';
  
  try {
    // Step 1: Send initial question
    console.log('Sending question...');
    const result = await workforceAgentService.sendMessage(
      question,
      domainId,
      (chunk) => console.log('Chunk:', chunk),
      () => console.log('Complete'),
      (error) => console.error('Error:', error)
    );
    
    // Step 2: Check if live agent is needed
    if (result.isLiveAgent) {
      console.log('Routing to live agent...');
      
      // Step 3: Connect to live agent
      const requestId = await liveAgentService.routeToAgent(
        'AgenticContactCenter',
        domainId,
        (msg) => console.log('Agent:', msg.text),
        () => console.log('Connected'),
        (reason) => console.log('Ended:', reason),
        (error) => console.error('Error:', error)
      );
      
      console.log('Live agent session:', requestId);
      
      // Step 4: Send messages to live agent
      setTimeout(() => {
        liveAgentService.sendMessage('I need more information', domainId);
      }, 5000);
      
      // Step 5: End session after 1 minute (example)
      setTimeout(async () => {
        await liveAgentService.terminate('Conversation complete', domainId);
      }, 60000);
      
    } else {
      // Regular bot response
      console.log('Bot response:', result.fullResponse);
      
      // Format the response
      const formatted = formatTextWithLinks(result.fullResponse);
      
      // Extract any reference links
      const links = extractReferenceLinks(result.fullResponse);
      console.log('Reference links:', links);
    }
    
  } catch (error) {
    console.error('Workflow failed:', error);
    // Show error to user
    alert(ERROR_MESSAGES.DEFAULT_ERROR);
  }
}

// ===================================
// 8. ERROR HANDLING EXAMPLE
// ===================================

async function exampleErrorHandling() {
  const domainId = DOMAIN_CONFIG.DEFAULT_DOMAIN_ID;
  
  try {
    const result = await workforceAgentService.sendMessage(
      'Test question',
      domainId,
      (chunk) => {},
      () => {},
      (error) => {
        // Categorize error
        let userMessage = ERROR_MESSAGES.DEFAULT_ERROR;
        
        if (error.message.includes('Failed to fetch')) {
          userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('401')) {
          userMessage = ERROR_MESSAGES.AUTH_FAILED;
        } else if (error.message.includes('403')) {
          userMessage = ERROR_MESSAGES.ACCESS_DENIED;
        } else if (error.message.includes('500')) {
          userMessage = ERROR_MESSAGES.SERVER_ERROR;
        } else if (error.message.includes('503')) {
          userMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
        }
        
        // Show to user
        console.error('User-friendly error:', userMessage);
        alert(userMessage);
      }
    );
    
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

// ===================================
// EXPORTS (for use in React components)
// ===================================

export const examples = {
  exampleGetToken,
  exampleSendChatMessage,
  exampleConnectToLiveAgent,
  exampleSendLiveAgentMessage,
  exampleEndLiveAgentSession,
  exampleFormatMessage,
  exampleExtractLinks,
  exampleUseConstants,
  exampleUseApiEndpoints,
  exampleCompleteWorkflow,
  exampleErrorHandling,
};

// To use in a React component:
// import { examples } from './examples';
// examples.exampleSendChatMessage();
