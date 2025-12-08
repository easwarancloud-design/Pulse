/**
 * Live Agent Service
 * Handles WebSocket connections and live agent interactions
 */

import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { LIVE_AGENT, TIMING } from '../config/constants';

class LiveAgentService {
  constructor() {
    this.socket = null;
    this.requestId = null;
    this.inactivityTimer = null;
    this.isConnected = false;
  }

  /**
   * Route to a live agent group
   * @param {string} groupName - Agent group name
   * @param {string} domainId - Domain ID
   * @param {Function} onMessage - Callback for incoming messages
   * @param {Function} onConnect - Callback when connected
   * @param {Function} onDisconnect - Callback when disconnected
   * @param {Function} onError - Callback for errors
   * @returns {Promise<string>} Request ID
   */
  async routeToAgent(groupName, domainId, onMessage, onConnect, onDisconnect, onError) {
    try {
      const requestId = Date.now().toString();
      const currentTimestamp = Date.now();

      const payload = {
        requestId,
        token: LIVE_AGENT.DEFAULT_TOKEN,
        botToBot: true,
        clientSessionId: '',
        silentMessage: false,
        message: { text: LIVE_AGENT.FIRST_MESSAGE, typed: true },
        userId: domainId,
        emailId: 'user@elevancehealth.com',
        username: 'User',
        agent_group: groupName,
        timestamp: currentTimestamp,
        timezone: LIVE_AGENT.TIMEZONE,
        action: LIVE_AGENT.ACTION_TYPES.SWITCH,
        topic: { name: groupName }
      };

      await axios.post(API_ENDPOINTS.USER_TO_AGENT, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Connect to WebSocket
      await this.connectWebSocket(requestId, domainId, onMessage, onConnect, onDisconnect, onError);

      return requestId;

    } catch (error) {
      console.error('❌ Routing to agent failed:', error.response?.data || error.message);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  /**
   * Connect to WebSocket for live agent
   * @param {string} requestId - Request ID
   * @param {string} domainId - Domain ID
   * @param {Function} onMessage - Callback for incoming messages
   * @param {Function} onConnect - Callback when connected
   * @param {Function} onDisconnect - Callback when disconnected
   * @param {Function} onError - Callback for errors
   */
  async connectWebSocket(requestId, domainId, onMessage, onConnect, onDisconnect, onError) {
    try {
      const ws = new WebSocket(API_ENDPOINTS.WEBSOCKET(requestId));
      this.socket = ws;
      this.requestId = requestId;
      this.isConnected = false;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.resetInactivityTimer(domainId, onDisconnect);
        if (onConnect) {
          onConnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const directText = typeof msg?.text === 'string' ? msg.text : '';
          const fromBody = Array.isArray(msg?.body)
            ? (msg.body.find(b => b.uiType === 'OutputText' && b.value)?.value || '')
            : '';
          const completed = msg?.completed === true;
          const agentName = msg?.agentName;
          const text = directText || fromBody || '';

          this.resetInactivityTimer(domainId, onDisconnect);

          // Handle completion
          if (completed) {
            this.terminate('Live agent session ended.', domainId, onDisconnect);
            return;
          }

          // Handle no agents available
          const lowerText = text.toLowerCase();
          if (lowerText.includes('no agents available') || lowerText.includes('please try again later')) {
            this.terminate(text || 'No agents available. Ending session.', domainId, onDisconnect);
            return;
          }

          if (lowerText.includes('your chat with the live agent has ended')) {
            this.terminate('Disconnected from the live agent.', domainId, onDisconnect);
            return;
          }

          // Normal message
          if (onMessage) {
            onMessage({ text, agentName });
          }

        } catch (err) {
          console.error('🚨 Failed to parse WebSocket message:', err);
          this.terminate('Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.', domainId, onDisconnect);
        }
      };

      ws.onerror = (e) => {
        console.error('❌ WebSocket error', e);
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        this.isConnected = false;
        if (this.inactivityTimer) {
          clearTimeout(this.inactivityTimer);
          this.inactivityTimer = null;
        }
        this.socket = null;
      };

    } catch (e) {
      console.error('Error opening WebSocket:', e);
      if (onError) {
        onError(e);
      }
      throw e;
    }
  }

  /**
   * Send message through WebSocket
   * @param {string} message - Message to send
   * @param {string} domainId - Domain ID
   */
  sendMessage(message, domainId) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ WebSocket not connected');
      return;
    }

    const payload = {
      requestId: this.requestId,
      token: LIVE_AGENT.DEFAULT_TOKEN,
      botToBot: true,
      clientSessionId: '',
      silentMessage: false,
      message: { text: message, typed: true },
      userId: domainId,
      emailId: 'user@email.com',
      timestamp: Date.now(),
      timezone: LIVE_AGENT.TIMEZONE
    };

    this.socket.send(JSON.stringify(payload));
    this.resetInactivityTimer(domainId, null);
  }

  /**
   * Terminate live agent session
   * @param {string} reason - Reason for termination
   * @param {string} domainId - Domain ID
   * @param {Function} onDisconnect - Callback when disconnected
   */
  async terminate(reason = 'Disconnected from live agent.', domainId, onDisconnect) {
    try {
      this.isConnected = false;
      
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {
          console.error('Error closing socket:', e);
        }
        this.socket = null;
      }

      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }

      // Notify backend END_CONVERSATION
      if (this.requestId) {
        const payload = {
          requestId: this.requestId,
          token: LIVE_AGENT.DEFAULT_TOKEN,
          botToBot: true,
          clientSessionId: '',
          silentMessage: false,
          message: { text: reason, typed: true },
          userId: domainId,
          emailId: 'user@email.com',
          timestamp: Date.now(),
          timezone: LIVE_AGENT.TIMEZONE,
          action: LIVE_AGENT.ACTION_TYPES.END_CONVERSATION
        };

        try {
          await fetch(API_ENDPOINTS.USER_TO_AGENT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (postErr) {
          console.error('❌ Failed to notify backend:', postErr);
        }
      }

      if (onDisconnect) {
        onDisconnect(reason);
      }

    } catch (e) {
      console.error('Error terminating live agent session:', e);
    }
  }

  /**
   * Reset inactivity timer
   * @private
   */
  resetInactivityTimer(domainId, onDisconnect) {
    if (!this.isConnected) return;

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.terminate('Live agent chat ended due to inactivity.', domainId, onDisconnect);
    }, TIMING.INACTIVITY_LIMIT);
  }

  /**
   * Check if live agent is connected
   * @returns {boolean}
   */
  isLiveAgentConnected() {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Cleanup - disconnect and clear timers
   */
  cleanup() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.isConnected = false;
    this.requestId = null;
  }
}

// Export singleton instance
export const liveAgentService = new LiveAgentService();

export default liveAgentService;
