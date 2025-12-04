/**
 * Workforce Agent Service
 * Handles all workforce agent API interactions
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';
import { tokenService } from './tokenService';
import { cleanStreamText } from '../utils/workforceAgentUtils';
import { LIVE_AGENT_MARKERS } from '../config/constants';

class WorkforceAgentService {
  /**
   * Send a message to the workforce agent and handle streaming response
   * @param {string} question - The question to ask
   * @param {string} domainId - Domain ID for authentication
   * @param {Function} onChunk - Callback for each chunk of streamed data
   * @param {Function} onComplete - Callback when streaming is complete
   * @param {Function} onError - Callback for errors
   * @returns {Promise<{isLiveAgent: boolean, fullResponse: string}>}
   */
  async sendMessage(question, domainId, onChunk, onComplete, onError) {
    const apiStartTime = performance.now();
    let partialMessage = '';
    let liveAgentTriggered = false;
    let streamBuffer = '';
    let liveAgentPartialDetected = false;
    let leftoverIdLine = '';
    let chunkCount = 0;
    let firstChunkReceived = false;

    try {
      // Get authentication token
      const token = await tokenService.getToken(domainId);
      
      console.log('📤 API Request started at:', new Date().toISOString());
      console.log('🔑 Token received:', token ? 'Yes' : 'No');
      console.log('📍 Domain ID:', domainId);
      console.log('❓ Question:', question);
      
      // Make API request
      const response = await fetch(API_ENDPOINTS.WORKFORCE_CHAT, {
        method: 'GET',
        headers: API_HEADERS.WORKFORCE_AUTH(token, domainId, question),
      });

      console.log('📡 Response status:', response.status);
      
      const responseStartTime = performance.now();
      console.log('📥 API Response received at:', new Date().toISOString());
      console.log('⏱️ Time to first response:', (responseStartTime - apiStartTime).toFixed(2), 'ms');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check for short responses (might be control signals)
      const responseClone = response.clone();
      const responseText = await responseClone.text();

      if (responseText.length < 50) {
        const shortText = (responseText || '').trim();

        // Detect live agent control signal
        if (LIVE_AGENT_MARKERS.DETECTION_REGEX.test(shortText)) {
          return { isLiveAgent: true, fullResponse: '' };
        } else {
          const cleanedShort = cleanStreamText(shortText) || 'Empty response received from API';
          return { isLiveAgent: false, fullResponse: cleanedShort };
        }
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!firstChunkReceived) {
          const firstChunkTime = performance.now();
          console.log('🎯 First chunk received at:', new Date().toISOString());
          console.log('⏱️ Time to first chunk:', (firstChunkTime - apiStartTime).toFixed(2), 'ms');
          firstChunkReceived = true;
        }

        chunkCount++;
        let chunk = decoder.decode(value, { stream: true });
        streamBuffer += chunk;
        console.log(`📦 Full text chunk ${chunkCount}:`, chunk);

        // Detect partial live agent marker
        if (!liveAgentTriggered && LIVE_AGENT_MARKERS.PARTIAL_REGEX.test(chunk) && !chunk.includes(LIVE_AGENT_MARKERS.FULL)) {
          liveAgentPartialDetected = true;
        }

        // Detect full marker in accumulated buffer
        const markerIndex = streamBuffer.indexOf(LIVE_AGENT_MARKERS.FULL);
        if (markerIndex !== -1) {
          const beforeMarker = streamBuffer.slice(0, markerIndex);
          if (beforeMarker && beforeMarker.length > 0) {
            const cleanedBeforeMarker = this._cleanChunk(beforeMarker);
            const wordsPre = cleanedBeforeMarker.split(/(\s+)/);
            for (const word of wordsPre) {
              if (!word) continue;
              partialMessage += word;
              if (onChunk) {
                onChunk(cleanStreamText(partialMessage));
              }
              await this._delay(5);
            }
          }
          liveAgentTriggered = true;
          break;
        }

        // Handle leftover ID lines
        if (leftoverIdLine) {
          chunk = leftoverIdLine + chunk;
          leftoverIdLine = '';
        }

        // Check if chunk ends with incomplete id line
        const idLineMatch = chunk.match(/id:[^\n]*$/);
        if (idLineMatch) {
          leftoverIdLine = idLineMatch[0];
          chunk = chunk.replace(/id:[^\n]*$/, '');
        }

        // Remove partial marker if detected
        if (liveAgentPartialDetected && chunk.includes('<<Live') && !chunk.includes(LIVE_AGENT_MARKERS.FULL)) {
          chunk = chunk.substring(0, chunk.indexOf('<<Live'));
        }

        // Clean and stream the chunk
        const cleanedChunk = this._cleanChunk(chunk);
        const words = cleanedChunk.split(/(\s+)/);

        for (const word of words) {
          partialMessage += word;
          if (onChunk) {
            onChunk(cleanStreamText(partialMessage));
          }
          await this._delay(5);
        }
      }

      const completionTime = performance.now();
      console.log('✅ Streaming completed at:', new Date().toISOString());
      console.log('⏱️ Total response time:', ((completionTime - apiStartTime) / 1000).toFixed(2), 'seconds');
      console.log('📊 Total chunks received:', chunkCount);

      if (onComplete) {
        onComplete();
      }

      return {
        isLiveAgent: liveAgentTriggered,
        fullResponse: cleanStreamText(partialMessage)
      };

    } catch (error) {
      const errorTime = performance.now();
      console.error('💥 API Error at:', new Date().toISOString());
      console.error('⏱️ Time until error:', (errorTime - apiStartTime).toFixed(2), 'ms');
      console.error('❌ Error details:', error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }

  /**
   * Clean chunk by removing ID lines and unwanted formatting
   * @private
   */
  _cleanChunk(chunk) {
    return chunk
      .replace(/\nid:.*?\n\n/g, '')
      .replace(/(^|\n)id:.*?\n\n/g, '')
      .replace(/(^|\n)id:[^\n]*\n/g, '');
  }

  /**
   * Delay helper for streaming effect
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const workforceAgentService = new WorkforceAgentService();

export default workforceAgentService;
