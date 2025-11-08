import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MenuSidebar from './MenuSidebar';
import { useAccessToken } from './components/UseToken';
import ButtonRow from './components/ButtonRow';
import { uuidv4, cleanStreamText } from './utils/workforceAgentUtils';
import { localChatHistory } from './utils/localChatHistory';

// Text formatting utilities
const formatTextWithLinks = (text) => {
  if (text == null) return '';

  // If we've been given a React node (e.g., JSX for live agent card), just return it
  if (typeof text !== 'string') return text;

  let formattedText = text;

  // Safety: strip any live-agent control markers before HTML formatting
  formattedText = formattedText
    .replace(/<<\s*LiveAgent\s*>>/gi, '')
    .replace(/<\s*LiveAgent\s*>/gi, '');

  // If text already has <strong> tags, don't process it again
  if (formattedText.includes('<strong>')) {
    const formattedTexQuote = formattedText.replace(/'/g, "&apos;");
    return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
  }
  
  // Step 1: Remove Reference Links sections FIRST (before processing bold text)
  formattedText = formattedText
    .replace(/\*\*Reference Links?:\*\*[\s\S]*$/gmi, '')  // Remove from "**Reference Links:**" to end
    .replace(/Reference Links?:[\s\S]*$/gmi, '')          // Remove from "Reference Links:" to end  
    .replace(/\*{4,}/g, '')                              // Remove multiple asterisks (****)
    .replace(/<a href[^>]*>.*?<\/a>/gi, '')              // Remove all HTML anchor tags
    .replace(/Time Away/gi, '')
    .replace(/Paid Time Off Policy/gi, '')
    .replace(/Service Contract Act Paid Time Off Policy/gi, '')
    .replace(/Paid Parental Leave Policy/gi, '')
    .replace(/School Related Leaves Policy/gi, '')
    .replace(/Wellness Days Off/gi, '')
    .replace(/My Choice PTO Policy/gi, '')
    .replace(/id:\s*[A-Za-z0-9_-]+/gi, '')              // Remove ID blocks more aggressively
    .replace(/data:\s*/gi, '');                         // Remove all "data:" prefixes (case-insensitive)
    
  // Step 2: Process text formatting (quotes, line breaks)
  formattedText = formattedText
    .replace(/["']+/g, '')                              // Remove all single/double quotes
    .replace(/\\n/g, '<br />')                          // Literal \n to <br>
    .replace(/\n/g, '<br />')                           // Convert actual newlines to <br>
    .replace(/ {3}- /g, '   • ')                        // Indented dashes to bullets
    .replace(/\n{3,}/g, '\n\n')                         // if there are 3 or more consecutive newlines reduce to 2 new lines
    .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '<br /><br />'); // Reduce triple line breaks to double
    
  // Step 3: Handle list items (preserve ** for bold)
  formattedText = formattedText.replace(/- (\*\*[^*]+\*\*)/g, '• $1');
    
  // Step 4: FINAL - Convert **text** to bold (this must be LAST)
  // Use inline style to guarantee bold rendering regardless of external CSS
  formattedText = formattedText.replace(/\*\*([^*\n]+?)\*\*/g, '<strong style="font-weight:800; font-variation-settings: \"wght\" 800;">$1</strong>');
    
  // Final cleanup: collapse excessive breaks and trim trailing space/breaks
  formattedText = formattedText
    // Reduce 3+ <br> to 2
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*?){3,}/gi, '<br /><br />')
    // Remove trailing <br> and whitespace
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*)+$/i, '')
    // Collapse multiple spaces
    .replace(/\s{3,}/g, ' ');

  const formattedTexQuote = formattedText.replace(/'/g, "&apos;");

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: formattedTexQuote }} 
      className="formatted-text-content"
    />
  );
};

// Extract reference links from text
const extractReferenceLinks = (text) => {
  if (!text) return [];
  
  const links = [];
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = linkPattern.exec(text)) !== null) {
    const [, url, title] = match;
    links.push({ url, title });
  }
  
  return links;
};

const ChatPage = ({ onBack, userQuestion, onToggleTheme, isDarkMode, currentThread, isNewChat, isNewChatActive, onNewChat, onThreadSelect, onFirstMessage, userInfo }) => {
  const location = useLocation();
  const { getToken } = useAccessToken();
  
  // Parse URL parameters for embedded navigation
  const urlParams = new URLSearchParams(location.search);
  const urlQuery = urlParams.get('query');
  const urlConversationId = urlParams.get('conversationId');
  const urlType = urlParams.get('type');

  // Use URL parameters if available, otherwise use props
  const effectiveQuestion = urlQuery || userQuestion;
  const effectiveType = urlType;
  
  // Workforce agent state
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [apiTriggered, setApiTriggered] = useState(false); // Flag to prevent infinite loops
  
  // Reference links sidebar state
  const [showReferenceLinks, setShowReferenceLinks] = useState(false);
  const [currentReferenceLinks, setCurrentReferenceLinks] = useState([]);
  
  // Default/fallback domain ID. Prefer Okta-derived domainId from userInfo when available.
  const DEFAULT_DOMAIN_ID = 'AG04333';
  const RESOLVED_DOMAIN_ID = DEFAULT_DOMAIN_ID;

  const sendWorkforceAgentMessage = async (inputText, replaceExisting = false) => {
    if (loading) return; // Prevent duplicate calls
    
    setLoading(true);
    setApiTriggered(true);
    
    let partialMessage = '';
    let liveAgentTriggered = false; 
    const botChatId = `msg_${Date.now()}`;
    
    const domainid = DEFAULT_DOMAIN_ID; // Use AG04333 as default
    const apiStartTime = performance.now(); // Move outside try block

    // Quick connectivity check
    console.log('🔍 Checking network connectivity...');
    try {
      await fetch('https://httpbin.org/get', { method: 'HEAD', mode: 'no-cors' });
      console.log('✅ Basic network connectivity confirmed');
    } catch (connectivityError) {
      console.warn('⚠️ Basic connectivity check failed:', connectivityError.message);
    }

    let userMessage, botMessage;

    if (replaceExisting && messages.length >= 2) {
      // Update existing messages instead of adding new ones
      userMessage = { ...messages[0], text: inputText };
      botMessage = { 
        ...messages[1], 
        text: '', 
        completed: false, 
        chat_id: botChatId 
      };
      setMessages([userMessage, botMessage]);
    } else {
      // Add user message and empty bot message immediately
      userMessage = { id: messages.length + 1, type: 'user', text: inputText };
      botMessage = { 
        id: messages.length + 2, 
        type: 'assistant', 
        text: '', 
        completed: false, 
        chat_id: botChatId 
      };
      setMessages(prev => [...prev, userMessage, botMessage]);
    }

    try {
      const token = await getToken(DEFAULT_DOMAIN_ID);
      console.log('📤 API Request started at:', new Date().toISOString());
      console.log('🔑 Token received:', token ? 'Yes' : 'No');
      console.log('📍 Domain ID:', domainid);
      console.log('❓ Question:', inputText);
      
      const response = await fetch(`https://workforceagent.elevancehealth.com/workforceagent/chat`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          question: inputText,
          domainid: domainid.toUpperCase(),
        },
      }).catch(fetchError => {
        console.error('🚨 Fetch failed:', fetchError);
        console.error('🌐 Network error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        throw new Error(`Network request failed: ${fetchError.message}`);
      });

      console.log('📡 Response status:', response.status);
      
      const responseStartTime = performance.now();
      console.log('📥 API Response received at:', new Date().toISOString());
      console.log('⏱️ Time to first response:', (responseStartTime - apiStartTime).toFixed(2), 'ms');

      if (!response.ok) {
        console.error('❌ API Error:', response.status, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clone the response so we can check content without consuming the stream
      const responseClone = response.clone();
      const responseText = await responseClone.text();

      // If response is short, it might be a simple message OR a control marker like <<LiveAgent>>.
      if (responseText.length < 50) {
        const shortText = (responseText || '').trim();

        // Detect live agent control signal in short responses as well
        if (/<<\s*LiveAgent\s*>>/i.test(shortText) || /<\s*LiveAgent\s*>/i.test(shortText)) {
          setMessages(prev => prev.map(msg => 
            msg.chat_id === botChatId 
              ? {
                  ...msg,
                  type: 'system',
                  isLiveAgentCard: true,
                  text: null,
                  completed: true
                }
              : msg
          ));
        } else {
          // Regular short text response
          const cleanedShort = cleanStreamText(shortText) || 'Empty response received from API';
          setMessages(prev => prev.map(msg =>
            msg.chat_id === botChatId
              ? { ...msg, type: 'assistant', text: cleanedShort, completed: true }
              : msg
          ));
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftoverIdLine = '';
      let firstChunkReceived = false;
      let chunkCount = 0;
  // Buffer to accumulate raw stream for detecting control markers spanning chunk boundaries
  let streamBuffer = '';
  // Track if we've trimmed a partial live-agent marker start
  let liveAgentPartialDetected = false;

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
        streamBuffer += chunk; // append to global buffer for cross-chunk detection
        console.log(`📦 Full text chunk ${chunkCount}:`, chunk);

        // If chunk contains start of marker but not full marker, mark partial and strip it from processing portion
        if (!liveAgentTriggered && /<<Live(Agent)?>?/i.test(chunk) && !chunk.includes('<<LiveAgent>>')) {
          liveAgentPartialDetected = true;
        }

        // Detect full marker in accumulated buffer (handles split across chunks)
        const markerIndex = streamBuffer.indexOf('<<LiveAgent>>');
        if (markerIndex !== -1) {
          // Process only text BEFORE the marker (if any not yet streamed)
          const beforeMarker = streamBuffer.slice(0, markerIndex);
          if (beforeMarker && beforeMarker.length > 0) {
            // Clean IDs similar to normal chunk cleaning
            const cleanedBeforeMarker = beforeMarker
              .replace(/\nid:.*?\n\n/g, '')
              .replace(/(^|\n)id:.*?\n\n/g, '')
              .replace(/(^|\n)id:[^\n]*\n/g, '');
            const wordsPre = cleanedBeforeMarker.split(/(\s+)/);
            for (const word of wordsPre) {
              if (!word) continue;
              partialMessage += word;
              try {
                setMessages(prev => prev.map(msg =>
                  msg.chat_id === botChatId
                    ? { ...msg, text: cleanStreamText(partialMessage) }
                    : msg
                ));
              } catch (updateError) {
                console.error('Error updating message state (pre-marker):', updateError);
              }
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
          liveAgentTriggered = true;
          break; // Stop reading further
        }

        // Handle leftover ID lines from previous chunks
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

        // If we detected partial marker start previously, remove any trailing partial from current processing text
        if (liveAgentPartialDetected && chunk.includes('<<Live') && !chunk.includes('<<LiveAgent>>')) {
          // Cut off from the marker start so it won't render
            chunk = chunk.substring(0, chunk.indexOf('<<Live'));
        }

        // Clean the chunk of ID lines and unwanted formatting
        const cleanedChunk = chunk
          .replace(/\nid:.*?\n\n/g, '')
          .replace(/(^|\n)id:.*?\n\n/g, '')
          .replace(/(^|\n)id:[^\n]*\n/g, '');

        // Split into words for realistic streaming effect
        const words = cleanedChunk.split(/(\s+)/);

        for (const word of words) {
          partialMessage += word;

          try {
            setMessages(prev => prev.map(msg =>
              msg.chat_id === botChatId
                ? { ...msg, text: cleanStreamText(partialMessage) }
                : msg
            ));
          } catch (updateError) {
            console.error('Error updating message state:', updateError);
          }

          // Faster streaming effect - reduced from 15ms to 5ms
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      const completionTime = performance.now();
      console.log('✅ Streaming completed at:', new Date().toISOString());
      console.log('⏱️ Total response time:', ((completionTime - apiStartTime) / 1000).toFixed(2), 'seconds');
      console.log('📊 Total chunks received:', chunkCount);

      // Handle live agent routing
      if (liveAgentTriggered) {
        setMessages(prev => prev.map(msg => 
          msg.chat_id === botChatId 
            ? {
                ...msg,
                type: 'system',
                isLiveAgentCard: true,
                text: null,
                completed: true
              }
            : msg
        ));
      } else {
        // Mark bot message as completed
        setMessages(prev => prev.map(msg =>
          msg.chat_id === botChatId
            ? { ...msg, completed: true, text: cleanStreamText(partialMessage) }
            : msg
        ));

        // Save to local chat history
        localChatHistory.saveChatEntry({
          chat_id: botChatId,
          session_id: Date.now().toString(),
          domain_id: domainid,
          question_text: inputText,
          response_text: partialMessage,
          chat_type: 'bot',
          feedback_score: 0,
          title: inputText.length > 50 ? inputText.substring(0, 50) + '...' : inputText
        });
      }

    } catch (error) {
      const errorTime = performance.now();
      console.error('💥 API Error at:', new Date().toISOString());
      console.error('⏱️ Time until error:', (errorTime - apiStartTime).toFixed(2), 'ms');
      console.error('❌ Error details:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Partial message received:', partialMessage ? partialMessage.substring(0, 100) : 'None');
      
      // Determine user-friendly error message based on error type
      let userErrorMessage = '⚠️ Unable to fetch response. Please try again.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        userErrorMessage = '🌐 Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP error! status: 401')) {
        userErrorMessage = '🔐 Authentication failed. Please refresh the page and try again.';
      } else if (error.message.includes('HTTP error! status: 403')) {
        userErrorMessage = '🚫 Access denied. You may not have permission to access this service.';
      } else if (error.message.includes('HTTP error! status: 500')) {
        userErrorMessage = '⚙️ Server error. The service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('HTTP error! status: 503')) {
        userErrorMessage = '🔧 Service temporarily unavailable. Please try again in a few moments.';
      }
      
      setMessages(prev => prev.map(msg =>
        msg.chat_id === botChatId
          ? {
              ...msg,
              completed: true,
              text: partialMessage 
                ? `${cleanStreamText(partialMessage)}\n\n${userErrorMessage}`
                : userErrorMessage
            }
          : msg
      ));
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
    }
  };

  const [userInput, setUserInput] = useState(() => {
    // Pre-fill input if this is a new chat with a predefined question
    if ((isNewChat && effectiveQuestion && (currentThread?.title === 'New Chat' || effectiveType === 'predefined')) || 
        (urlQuery && urlType === 'predefined')) {
      return effectiveQuestion;
    }
    return '';
  });
  
  const [messages, setMessages] = useState(() => {
    // Priority 0: Handle URL parameters from embedded navigation
    if (urlQuery && urlType === 'manual') {
      return [
        {
          id: 1,
          type: 'user',
          text: urlQuery
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    }
    
    // Priority 1: Manual input from main page - show question and prepare for API call
    if (currentThread?.conversation?.length === 1 && currentThread.conversation[0].type === 'user') {
      return [
        {
          id: 1,
          type: 'user',
          text: currentThread.conversation[0].text
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    }
    
    // Priority 2: Load existing conversation from current thread (with multiple messages)
    else if (currentThread?.conversation && currentThread.conversation.length > 1) {
      return currentThread.conversation.map((msg, index) => ({
        id: index + 1,
        type: msg.type,
        text: msg.text,
        showTable: msg.showTable || false,
        isWelcome: msg.isWelcome || false
      }));
    } 
    
    // Priority 3: Coming from main page with a manual question (legacy support)
    else if (effectiveQuestion && !isNewChat && !currentThread?.conversation?.length && !urlType) {
      return [
        {
          id: 1,
          type: 'user',
          text: effectiveQuestion
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    } 
    
    // Priority 4: New chat or predefined questions - show welcome message or prepare for input
    else if (isNewChat || (urlQuery && urlType === 'predefined')) {
      return [
        {
          id: 1,
          type: 'assistant',
          text: 'Hello! I\'m here to help you with any questions you might have.',
          isWelcome: true
        }
      ];
    } 
    
    // Priority 5: Default fallback
    else {
      return [
        {
          id: 1,
          type: 'user',
          text: 'Who from my team  hasn\'t completed the Cyber Security Training?'
        },
        {
          id: 2,
          type: 'assistant',
          text: 'Based on the latest records, this is currently where your team members stand in regards to the Do The Right Thing: Cyber Security Training 2025:',
          showTable: true
        }
      ];
    }
  });
  const [likedMessages, setLikedMessages] = useState(new Set());
  const [dislikedMessages, setDislikedMessages] = useState(new Set());
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef(null);

  // Live Agent session state
  const [liveAgent, setLiveAgent] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const requestIdRef = useRef(null);
  const socketRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_LIMIT = 19 * 60 * 1000; // 19 minutes

  const resetInactivityTimer = (domainid) => {
    if (!liveAgent || chatEnded) return;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      terminateLiveAgent("Live agent chat ended due to inactivity.", domainid);
    }, INACTIVITY_LIMIT);
  };

  const renderLiveAgentMessage = (text, isFirst, agentName) => (
    <div style={{
      backgroundColor: "transparent",
      padding: "10px 14px",
      borderLeft: `4px solid ${isDarkMode ? '#44B8F3' : '#1a366f'}`,
      borderRadius: "6px",
      color: isDarkMode ? "#FFFFFF" : "#212121",
      fontFamily: "Elevance Sans, Segoe UI, sans-serif",
      fontSize: "16px",
      lineHeight: "1.5",
      marginBottom: "10px"
    }}>
      {isFirst && agentName && (
        <div style={{
          color: isDarkMode ? "#A0BEEA" : "#1a366f",
          fontWeight: 600,
          fontSize: "15px",
          marginBottom: "6px"
        }}>
          {agentName}
        </div>
      )}
      {text}
    </div>
  );

  const terminateLiveAgent = async (reason = "Disconnected from live agent.", domainidParam) => {
    try {
      const domainid = domainidParam || RESOLVED_DOMAIN_ID;
      setLiveAgent(false);
      setChatEnded(true);
      if (socketRef.current) {
        try { socketRef.current.close(); } catch {}
        socketRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Notify backend END_CONVERSATION
      const payload = {
        requestId: requestIdRef.current,
        token: "vaacubed",
        botToBot: true,
        clientSessionId: "",
        silentMessage: false,
        message: { text: reason, typed: true },
        userId: domainid,
        emailId: "user@email.com",
        timestamp: Date.now(),
        timezone: "America/New_York",
        action: "END_CONVERSATION"
      };

      try {
        await fetch('https://workforceagent.elevancehealth.com/user/to/agent/servicenow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (postErr) {
        console.error('❌ Failed to notify backend:', postErr);
      }

      // UI message
      setMessages(prev => ([...prev, {
        id: prev.length + 1,
        type: 'system',
        text: `${reason} You can continue chatting with the bot.`
      }]));
    } catch (e) {
      console.error('Error terminating live agent session:', e);
    }
  };

  const handleLiveAgentConnect = (info) => {
    if (!info) return;

    if (info.type === 'continue') {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      terminateLiveAgent('You chose to continue with the bot.', RESOLVED_DOMAIN_ID);
      return;
    }

    if (info.type === 'connecting') {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      return;
    }

    if (info.type === 'transferred' && info.requestId) {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      connectWebSocket(info.requestId, RESOLVED_DOMAIN_ID);
      return;
    }

    if (info.type === 'error') {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
    }
  };

  const connectWebSocket = (requestId, domainid) => {
    try {
      const ws = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${requestId}`);
      socketRef.current = ws;
      requestIdRef.current = requestId;
      setLiveAgent(true);
      setChatEnded(false);

      const isFirstMessage = () => !messages.some(m => m.type === 'live_agent');

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        resetInactivityTimer(domainid);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Try both payload shapes from samples
          const directText = typeof msg?.text === 'string' ? msg.text : '';
          const lower = directText.toLowerCase();
          const fromBody = Array.isArray(msg?.body)
            ? (msg.body.find(b => b.uiType === 'OutputText' && b.value)?.value || '')
            : '';
          const completed = msg?.completed === true;
          const agentName = msg?.agentName;
          const text = directText || fromBody || '';

          resetInactivityTimer(domainid);

          // System conditions
          if (completed) {
            postSystemAndTerminate('Live agent session ended.', domainid);
            return;
          }

          const lowerText = text.toLowerCase();
          if (lowerText.includes('no agents available')) {
            postSystemAndTerminate('No agents available. Ending session.', domainid);
            return;
          }
          if (lowerText.includes('please try again later')) {
            postSystemAndTerminate(text, domainid);
            return;
          }
          if (lower.includes('your chat with the live agent has ended')) {
            postSystemAndTerminate('Disconnected from the live agent.', domainid);
            return;
          }

          // Normal agent message
          setMessages(prev => ([...prev, {
            id: prev.length + 1,
            type: 'live_agent',
            text: renderLiveAgentMessage(text, isFirstMessage(), agentName)
          }]));
        } catch (err) {
          console.error('🚨 Failed to parse WebSocket message:', err);
          postSystemAndTerminate('Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.', domainid);
        }
      };

      ws.onerror = (e) => {
        console.error('❌ WebSocket error', e);
        postSystemAndTerminate('A technical issue occurred. Please try reconnecting.', domainid);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        socketRef.current = null;
      };
    } catch (e) {
      console.error('Error opening WebSocket:', e);
      postSystemAndTerminate('A technical issue occurred. Please try reconnecting.', domainid);
    }
  };

  const postSystemAndTerminate = (message, domainid) => {
    setMessages(prev => ([...prev, {
      id: prev.length + 1,
      type: 'system',
      text: message
    }]));
    terminateLiveAgent(message, domainid);
  };

  const confirmEndChat = () => {
    setShowConfirm(true);
  };

  const cancelEndChat = () => {
    setShowConfirm(false);
  };

  const endChat = async () => {
    setShowConfirm(false);
    await terminateLiveAgent("You have ended the conversation.", RESOLVED_DOMAIN_ID);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Cleanup timers and websocket on unmount or thread change
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Close live agent session when switching threads
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setLiveAgent(false);
      setChatEnded(true);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [currentThread?.id]);

  // Ensure domain ID is properly set in localStorage
  useEffect(() => {
    // Always sync localStorage domainid to resolved domain (Okta preferred)
    const existing = localStorage.getItem('domainid');
    if (existing !== RESOLVED_DOMAIN_ID) {
      localStorage.setItem('domainid', RESOLVED_DOMAIN_ID);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save thread when coming from main page or when messages are updated
  useEffect(() => {
    if (currentThread && messages.length >= 2) {
      // Check if this is a manual input with response (coming from main page or URL)
      const isManualInput = (currentThread.conversation?.length === 1 && 
                           currentThread.conversation[0].type === 'user' &&
                           messages.length === 2 &&
                           messages[0].type === 'user' &&
                           messages[1].type === 'assistant') ||
                           (urlQuery && urlType === 'manual');
      
      if (isManualInput || (effectiveQuestion && !isNewChat)) {
        const threadToSave = {
          ...currentThread,
          conversation: messages
        };
        saveThreadToStorage(threadToSave);
      }
    }
  }, [effectiveQuestion, isNewChat, currentThread, messages, urlQuery, urlType]);

  // Handle manual input case - save the conversation with response
  useEffect(() => {
    if (currentThread?.conversation?.length === 1 && 
        currentThread.conversation[0].type === 'user' && 
        messages.length === 2) {
      const threadToSave = {
        ...currentThread,
        conversation: messages
      };
      saveThreadToStorage(threadToSave);
    }
  }, [currentThread, messages]);

  // Update messages when thread changes
  useEffect(() => {
    if (currentThread?.conversation && currentThread.conversation.length > 1) {
      // Load conversation history from the selected thread (only for multi-message conversations)
      const threadMessages = currentThread.conversation.map((msg, index) => ({
        id: index + 1,
        type: msg.type,
        text: msg.text,
        showTable: msg.showTable || false,
        isWelcome: msg.isWelcome || false
      }));
      setMessages(threadMessages);
      // Clear the input when switching to an existing thread
      setUserInput('');
    } else if (isNewChat && currentThread && (!currentThread.conversation || currentThread.conversation.length === 0)) {
      // Show welcome message for new chats without conversation
      const welcomeMessages = [
        {
          id: 1,
          type: 'assistant',
          text: 'Hello! I\'m here to help you with any questions you might have.',
          isWelcome: true
        }
      ];
      setMessages(welcomeMessages);
    }
    // Note: Don't override messages for single-message conversations (manual input) 
    // because useState already handled the response generation
  }, [currentThread, isNewChat]);

  // Clear input when switching to existing threads
  useEffect(() => {
    if (currentThread?.conversation && currentThread.conversation.length > 0) {
      setUserInput('');
    }
    // Reset API trigger flag when switching threads
    setApiTriggered(false);
  }, [currentThread?.id]);

  // Auto-trigger live API for questions from main page or embedded page
  useEffect(() => {
    const shouldCallLiveAPI = (
      // Manual question from main page (Legacy support - Priority 3)
      (effectiveQuestion && !isNewChat && !currentThread?.conversation?.length && !urlType) ||
      // Manual question from URL parameters (embedded page)
      (urlQuery && urlType === 'manual')
    );

    if (shouldCallLiveAPI && effectiveQuestion && !apiTriggered) {
      // Replace the default response with live API call
      const questionText = urlQuery || effectiveQuestion;
      setApiTriggered(true); // Set flag to prevent re-execution
      
      // Clear URL parameters immediately after processing to prevent refresh issues
      if (urlQuery || urlType) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      sendWorkforceAgentMessage(questionText, true); // true = replace existing
    }
  }, [effectiveQuestion, urlQuery, urlType, isNewChat, currentThread?.id, apiTriggered]);

  const saveThreadToStorage = (thread) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      let threads;
      
      if (stored) {
        threads = JSON.parse(stored);
      } else {
        // If no stored data exists, get the default threads from MenuSidebar's loadThreadsFromStorage
        threads = getDefaultThreadsData();
      }
      
      // Ensure all categories exist
      if (!threads.today) threads.today = [];
      if (!threads.yesterday) threads.yesterday = [];
      if (!threads.lastWeek) threads.lastWeek = [];
      if (!threads.last30Days) threads.last30Days = [];
      
      // Add to today's threads
      const existingIndex = threads.today.findIndex(t => t.id === thread.id);
      if (existingIndex >= 0) {
        threads.today[existingIndex] = thread;
      } else {
        threads.today.unshift(thread);
      }
      
      localStorage.setItem('chatThreads', JSON.stringify(threads));
    } catch (error) {
      console.error('Error saving thread to localStorage:', error);
    }
  };

  // Function to get default threads data (same as in MenuSidebar)
  const getDefaultThreadsData = () => {
    return {
      today: [
        {
          id: 't1',
          title: 'How to submit sick leave in Workday?',
          conversation: [
            { type: 'user', text: 'How do I submit sick leave requests in Workday?' },
            { type: 'assistant', text: 'To submit sick leave in Workday: 1) Go to Workday homepage > "Time" tile, 2) Click "Request Time Off", 3) Select "Sick Leave" from the dropdown, 4) Choose your dates and duration (full day or partial), 5) Add notes if needed, 6) Submit for approval. For same-day sick leave, you can also call your manager and submit the request when you return. No doctor\'s note required for absences under 3 consecutive days.' }
          ]
        },
        {
          id: 't2',
          title: 'Understanding our compensation review cycle',
          conversation: [
            { type: 'user', text: 'When does our compensation review happen and how does it work?' },
            { type: 'assistant', text: 'Our compensation review occurs annually in March. The process includes: salary benchmarking against market data, performance rating consideration, budget allocation per department, and manager recommendations. Merit increases range from 2-8% based on performance and market position. Promotions are evaluated separately in Q4. You\'ll receive notification of any changes by April 1st, effective with the April payroll.' }
          ]
        },
        {
          id: 't3',
          title: 'How to access employee handbook in Workday?',
          conversation: [
            { type: 'user', text: 'Where can I find the employee handbook and company policies in Workday?' },
            { type: 'assistant', text: 'Access the employee handbook in Workday by: 1) Logging into Workday, 2) Click on the "Benefits" worklet, 3) Select "View All Benefits", 4) Look for "Resources and Documents" section, 5) Click "Employee Handbook". You can also find specific policies under "Company" > "Company Documents" > "HR Policies". The handbook is updated quarterly, and you\'ll be notified of major policy changes via email.' }
          ]
        },
        {
          id: 't4',
          title: 'Requesting flexible work arrangements',
          conversation: [
            { type: 'user', text: 'How do I request flexible work arrangements or schedule changes?' },
            { type: 'assistant', text: 'To request flexible work arrangements: 1) Discuss with your manager first to ensure business needs are met, 2) Complete the "Flexible Work Request" form in Workday under "Actions" > "Job Change" > "Request Flexible Work", 3) Specify your requested schedule, work location, and business justification, 4) Submit for manager and HR approval. Requests are typically processed within 5-7 business days. Arrangements are reviewed every 6 months.' }
          ]
        },
        {
          id: 't5',
          title: 'How to view pay statements in Workday?',
          conversation: [
            { type: 'user', text: 'Where do I find my pay statements and tax documents in Workday?' },
            { type: 'assistant', text: 'View your pay information in Workday by: 1) Go to "Pay" worklet on homepage, 2) Click "View Pay" to see current and past pay statements, 3) For tax documents, go to "Pay" > "Tax Documents" to access W-2s and other forms, 4) You can download PDFs or view online. Pay statements are available immediately after each payroll run (bi-weekly on Fridays). Set up email notifications under "Pay" > "Pay Preferences" to get alerts when new statements are available.' }
          ]
        }
      ],
      yesterday: [
        {
          id: 'y1',
          title: 'FMLA leave application process',
          conversation: [
            { type: 'user', text: 'How do I apply for FMLA leave and what documentation is required?' },
            { type: 'assistant', text: 'To apply for FMLA leave: 1) Contact HR at least 30 days in advance (or ASAP for emergencies), 2) Complete the FMLA request form in Workday under "Benefits" > "Leave of Absence", 3) Obtain medical certification from your healthcare provider using Form DOL-WH-380-E, 4) Submit all documentation to leave@company.com. You\'re eligible if you\'ve worked 1,250+ hours in the past 12 months. FMLA provides up to 12 weeks unpaid leave with job protection and continued health benefits.' }
          ]
        },
        {
          id: 'y2',
          title: 'Emergency contact updates in Workday',
          conversation: [
            { type: 'user', text: 'How do I update my emergency contacts and personal information in Workday?' },
            { type: 'assistant', text: 'Update your emergency contacts in Workday: 1) Go to "Personal Information" worklet, 2) Click "Emergency Contacts", 3) Add, edit, or remove contacts as needed, 4) Include full name, relationship, phone numbers, and address, 5) Save changes. Also update your personal address, phone number, and email under "Personal Information" > "Contact Information". Keep this information current as it\'s used for emergency notifications and important company communications.' }
          ]
        },
        {
          id: 'y3',
          title: 'Dependent coverage and life events',
          conversation: [
            { type: 'user', text: 'How do I add dependents to my benefits after a qualifying life event?' },
            { type: 'assistant', text: 'After a qualifying life event (marriage, birth, adoption, etc.): 1) You have 30 days to make changes, 2) Go to Workday "Benefits" > "Change Benefits", 3) Select your qualifying event type, 4) Add dependents with their information and required documents, 5) Adjust your benefit selections, 6) Submit by the 30-day deadline. Required documents include marriage certificates, birth certificates, or adoption papers. Changes are effective the first of the month following your event date.' }
          ]
        },
        {
          id: 'y4',
          title: 'Workday mobile app setup and features',
          conversation: [
            { type: 'user', text: 'How do I set up the Workday mobile app and what can I do with it?' },
            { type: 'assistant', text: 'Download the Workday app from your app store and sign in with your company credentials. Key features include: time tracking and time-off requests, pay statement viewing, benefits information access, emergency contact updates, and company directory search. Enable push notifications to get alerts for important deadlines. You can also approve team member requests if you\'re a manager. The app syncs with the desktop version in real-time.' }
          ]
        }
      ],
      lastWeek: [
        {
          id: 'lw1',
          title: 'Annual enrollment period and deadlines',
          conversation: [
            { type: 'user', text: 'When is annual enrollment and what changes can I make to my benefits?' },
            { type: 'assistant', text: 'Annual enrollment runs November 1-15 each year. During this period, you can: change health insurance plans, adjust FSA/HSA contributions, modify life insurance coverage, update dependent coverage, and select voluntary benefits like legal services or pet insurance. If you don\'t make changes, your current elections continue (except FSA, which resets to $0). Review the benefits fair materials and attend information sessions. Changes are effective January 1st.' }
          ]
        },
        {
          id: 'lw2',
          title: 'Tuition reimbursement program requirements',
          conversation: [
            { type: 'user', text: 'What are the requirements for tuition reimbursement and how do I apply?' },
            { type: 'assistant', text: 'Tuition reimbursement eligibility: 1) Employed for 12+ months, 2) Course must be job-related or lead to degree in your field, 3) Maintain "C" grade or better, 4) Pre-approval required. Apply through Workday "Learning" > "Tuition Assistance" before enrollment. Reimbursement is up to $5,000/year for undergraduate and $7,500/year for graduate courses. Submit receipts and transcripts within 60 days of course completion. Two-year commitment required post-graduation.' }
          ]
        },
        {
          id: 'lw3',
          title: 'Workers compensation claim process',
          conversation: [
            { type: 'user', text: 'What should I do if I get injured at work? How do I file a workers comp claim?' },
            { type: 'assistant', text: 'For workplace injuries: 1) Seek immediate medical attention if needed, 2) Report to your supervisor immediately, 3) Call our 24/7 injury hotline: 1-800-INJURY-1, 4) Complete incident report in Workday within 24 hours, 5) Follow up with designated medical provider. Keep all medical documentation and receipts. You may be eligible for medical coverage and wage replacement. Return-to-work accommodations are available. Contact HR for guidance throughout the process.' }
          ]
        },
        {
          id: 'lw4',
          title: 'Sabbatical leave policy and eligibility',
          conversation: [
            { type: 'user', text: 'Does our company offer sabbatical leave? What are the requirements?' },
            { type: 'assistant', text: 'Sabbatical leave is available after 7 years of continuous employment. You can take 3-6 months unpaid leave for professional development, research, travel, or personal enrichment. Requirements: submit proposal 6 months in advance, demonstrate how it benefits your role/company, arrange coverage for your responsibilities, commit to returning for minimum 2 years. During sabbatical, benefits continue with employee contribution. Apply through Workday "Actions" > "Request Leave of Absence" > "Sabbatical".' }
          ]
        },
        {
          id: 'lw5',
          title: 'Internal job posting and transfer process',
          conversation: [
            { type: 'user', text: 'How do I apply for internal job postings and what\'s the transfer process?' },
            { type: 'assistant', text: 'Internal job applications: 1) Browse open positions in Workday "Career" worklet, 2) Click "Find Jobs" to search by location, department, or keywords, 3) Apply directly through Workday with updated profile, 4) Notify your current manager after applying, 5) Complete any required assessments. Interview process is similar to external hires. If selected, typical notice period is 2-4 weeks. You must be in current role for 12+ months and have satisfactory performance to be eligible for transfer.' }
          ]
        }
      ],
      last30Days: [
        {
          id: 'l30d1',
          title: 'Stock purchase plan enrollment',
          conversation: [
            { type: 'user', text: 'How does the employee stock purchase plan work and how do I enroll?' },
            { type: 'assistant', text: 'Our Employee Stock Purchase Plan (ESPP) allows you to buy company stock at a 15% discount. Enrollment periods are twice yearly (May and November). You can contribute 1-15% of your base salary through payroll deduction. Stock purchases occur at the end of each 6-month period at the lower of the beginning or ending price, minus 15% discount. Enroll in Workday "Benefits" > "Stock Purchase Plan". Minimum tenure of 6 months required. You can sell immediately or hold for long-term investment.' }
          ]
        },
        {
          id: 'l30d2',
          title: 'Exit interview process and final pay',
          conversation: [
            { type: 'user', text: 'What happens during the exit process when leaving the company?' },
            { type: 'assistant', text: 'Exit process includes: 1) Two weeks notice (or per your contract), 2) Exit interview with HR (scheduled automatically), 3) Return company property (laptop, badge, phone), 4) Knowledge transfer documentation, 5) Final paycheck includes unused vacation (per state law), 6) COBRA benefits information, 7) 401k rollover options, 8) Reference policy acknowledgment. Your final pay will be processed on your last day or next regular payroll, depending on state requirements. Access to systems is removed on your last day.' }
          ]
        },
        {
          id: 'l30d3',
          title: 'Jury duty leave and compensation',
          conversation: [
            { type: 'user', text: 'What\'s our policy for jury duty leave and will I still get paid?' },
            { type: 'assistant', text: 'Jury duty leave policy: 1) Notify your manager immediately upon receiving jury summons, 2) Submit copy of summons to HR, 3) Company provides full pay for first 5 days of jury service, 4) Submit jury duty certificate for payroll processing, 5) You keep any jury compensation received. If service extends beyond 5 days, additional time is unpaid but job-protected. Night shift employees should request day shift consideration. Use Workday to request "Jury Duty" time off type. Court parking and mileage may be reimbursed.' }
          ]
        },
        {
          id: 'l30d4',
          title: 'Volunteer time off program benefits',
          conversation: [
            { type: 'user', text: 'Does the company offer volunteer time off? How does the program work?' },
            { type: 'assistant', text: 'Yes! Our Volunteer Time Off (VTO) program provides 16 hours (2 days) of paid time annually for volunteer activities with qualified 501(c)(3) organizations. To use VTO: 1) Confirm organization\'s nonprofit status, 2) Submit volunteer opportunity for pre-approval via Workday "Time" > "Request Volunteer Time Off", 3) Include organization details and volunteer description, 4) Complete volunteer service, 5) Submit verification form with organization signature. VTO hours don\'t roll over and are separate from regular PTO.' }
          ]
        },
        {
          id: 'l30d5',
          title: 'Lactation support and mother\'s room access',
          conversation: [
            { type: 'user', text: 'What lactation support does the company provide for nursing mothers?' },
            { type: 'assistant', text: 'Lactation support includes: dedicated mother\'s rooms on each floor with comfortable seating, refrigeration for milk storage, and privacy locks. Rooms can be reserved through Workday "Space Reservations". You\'re entitled to reasonable break time for pumping for up to one year. Flexible schedule accommodations available through your manager. The company also provides lactation consultants, breast pump rental/purchase assistance, and shipping supplies for business travel. Contact HR for access card programming and additional resources.' }
          ]
        }
      ]
    };
  };

  const handleSendMessage = async () => {
    if (userInput.trim() && !loading && !showConfirm) {
      // Capture the question then clear input immediately so it disappears while streaming starts
      const questionToSend = userInput.trim();
      setUserInput(''); // clear before triggering API
      // Use workforce agent for real responses
      await sendWorkforceAgentMessage(questionToSend);
      
      // Update thread management (existing logic)
      if (isNewChat && currentThread && currentThread.conversation.length === 0) {
        const updatedThread = {
          ...currentThread,
          title: questionToSend.length > 50 ? questionToSend.substring(0, 50) + '...' : questionToSend,
          conversation: messages
        };
        saveThreadToStorage(updatedThread);
        onFirstMessage && onFirstMessage(updatedThread);
      } else if (currentThread) {
        // Update existing thread
        const updatedThread = {
          ...currentThread,
          conversation: messages
        };
        saveThreadToStorage(updatedThread);
      } else if (userQuestion && !currentThread) {
        // Create thread for main page question
        const newThread = {
          id: 'thread_' + Date.now(),
          title: questionToSend.length > 50 ? questionToSend.substring(0, 50) + '...' : questionToSend,
          conversation: messages
        };
        saveThreadToStorage(newThread);
        onFirstMessage && onFirstMessage(newThread);
      }
      
      // Already cleared above; do not set again
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showConfirm) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLike = (messageId) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        setDislikedMessages(prevDisliked => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislike = (messageId) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        setLikedMessages(prevLiked => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(messageId);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Handle reload/regenerate response
  const handleReload = async (messageId) => {
    try {
      // Find the message to reload
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;
      
      const messageToReload = messages[messageIndex];
      
      // Find the preceding user message
      let userQuestion = '';
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          userQuestion = messages[i].text;
          break;
        }
      }
      
      if (!userQuestion) {
        return;
      }
      
      // Set as currently streaming message
      setStreamingMessageId(messageId);
      
      // Set loading state for this message
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: '', isRegenerating: true, completed: false }
          : msg
      ));
      
      // Get fresh token for reload
  const domainId = (userInfo?.domainId || localStorage.getItem('domainid') || DEFAULT_DOMAIN_ID).toUpperCase();
      
      let token;
      try {
  token = await getToken(domainId, true); // Force real API using resolved domain
      } catch (tokenError) {
        console.error('❌ Token fetch failed:', tokenError);
        throw new Error(`Failed to get authentication token: ${tokenError.message}`);
      }
      
      if (!token) {
        throw new Error('Failed to get authentication token - token is null');
      }
      
      console.log('🚀 API Call for reload - endpoint:', "https://workforceagent.elevancehealth.com/workforceagent/chat");
      
      let response;
      try {
        // Always call the real workforce agent API for reload
        response = await fetch("https://workforceagent.elevancehealth.com/workforceagent/chat", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            question: userQuestion,
            domainid: domainId.toUpperCase(),
          },
        });
      } catch (fetchError) {
        console.error('❌ Fetch failed:', fetchError);
        throw new Error(`Network request failed: ${fetchError.message}`);
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Check for live agent trigger
        if (chunk.includes("<<LiveAgent>>")) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, text: "🔄 Connecting you to a live agent. Please wait...", isRegenerating: false, completed: true }
                : msg
          ));
          break;
        }
        
        fullResponse += chunk;
        
        // Update message with streaming content (apply text cleaning)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: cleanStreamText(fullResponse), isRegenerating: true, completed: false }
              : msg
        ));
      }
      
      // Mark as complete and stop streaming (apply final text cleaning)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: cleanStreamText(fullResponse), isRegenerating: false, completed: true }
          : msg
      ));
      
      setStreamingMessageId(null);
      
    } catch (error) {
      console.error('❌ Failed to reload response:', error);
      
      // Show error message and stop streaming
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              text: `Failed to regenerate response: ${error.message}. Please try again.`,
              isRegenerating: false,
              completed: true 
            }
          : msg
      ));
      
      setStreamingMessageId(null);
    }
  };

  const handleReferenceLinks = (messageText, messageId) => {
    const links = extractReferenceLinks(messageText);
    if (links.length > 0) {
      setCurrentReferenceLinks(links);
      setShowReferenceLinks(true);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : 'bg-[#F9FAFB]'}`}>
      {/* Background effects for dark mode */}
      {isDarkMode && (
        <svg className="absolute inset-0 w-full h-full" width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <ellipse cx="72.952" cy="-5.77807" rx="421.367" ry="309.125" transform="rotate(1.42975 72.952 -5.77807)" fill="url(#paint1_radial)"/>
          <ellipse cx="465.481" cy="-49.3628" rx="431.18" ry="315.872" transform="rotate(1.42975 465.481 -49.3628)" fill="url(#paint2_radial)"/>
          <ellipse cx="856.305" cy="-99.1147" rx="321.392" ry="338.565" transform="rotate(1.42975 856.305 -99.1147)" fill="url(#paint3_radial)"/>
          <ellipse cx="1124.44" cy="-99.7899" rx="285.204" ry="425.66" transform="rotate(1.42975 1124.44 -99.7899)" fill="url(#paint4_radial)"/>
          <defs>
            <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(72.952 -5.77808) rotate(90) scale(309.125 421.367)">
              <stop stopColor="#44B8F3" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#44B8F3" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint2_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(465.481 -49.3628) rotate(90) scale(315.872 431.18)">
              <stop stopColor="#44F3B3" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#44F3B3" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint3_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(856.305 -99.1147) rotate(90) scale(338.565 321.392)">
              <stop stopColor="#F8D666" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#F8D666" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint4_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1124.44 -99.7899) rotate(90) scale(425.66 285.204)">
              <stop stopColor="#E3725F" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#E3725F" stopOpacity="0"/>
            </radialGradient>
          </defs>
        </svg>
      )}

      {/* Left Sidebar - Use MenuSidebar Component */}
      <MenuSidebar 
        onBack={onBack} 
        onToggleTheme={onToggleTheme}
        isDarkMode={isDarkMode}
        onNewChat={onNewChat}
        onThreadSelect={onThreadSelect}
        currentActiveThread={currentThread}
        isNewChatActive={isNewChatActive}
      />

      {/* Right Chat Window */}
      <div className={`flex-1 flex flex-col h-screen relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : ''}`}>
        {/* Chat Messages Area - Scrollable */}
        <div className={`flex-1 overflow-y-auto p-5`}>
          <div 
            className="mx-auto"
            style={{
              display: 'flex',
              width: '760px',
              paddingTop: '24px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '32px',
              alignSelf: 'stretch'
            }}
          >
            {messages.map((message) => (
              <div key={message.id} style={{ width: '100%' }}>
                {message.type === 'user' ? (
                  <div className="flex justify-end">
                    <div className={`${isDarkMode ? 'bg-[#1F3E81]' : 'bg-[#E3F4FD]'} rounded-[32px_0_32px_32px] px-6 py-3 max-w-[467px]`}>
                      <p className={`${isDarkMode ? 'text-white' : 'text-[#231E33]'} text-sm leading-[21px]`}>{message.text}</p>
                    </div>
                  </div>
                ) : message.isWelcome ? (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed`}>
                      {message.text}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {message.suggestions?.map((suggestion, index) => (
                        <button 
                          key={index} 
                          onClick={() => {
                            setUserInput(`Tell me about ${suggestion.toLowerCase()}`);
                          }}
                          className={`${isDarkMode ? 'bg-[#1F3E81] text-[#A0BEEA] hover:bg-[#2A4A8C]' : 'bg-[#F7F7F7] text-[#333333] hover:bg-[#E7E7E7]'} rounded p-3 text-sm text-left transition-colors cursor-pointer`}
                        >
                          • {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : message.type === 'system' ? (
                  // System messages - check if already JSX styled or plain text
                  <div className="space-y-4">
                    {message.isLiveAgentCard ? (
                      <div style={{
                        backgroundColor: isDarkMode ? "#122F65" : "#f9fbfc",
                        padding: "20px",
                        borderRadius: "12px",
                        marginBottom: "16px",
                        fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                        color: isDarkMode ? "#A0BEEA" : "#1a366f",
                        boxShadow: isDarkMode ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "0 1px 3px rgba(0, 0, 0, 0.04)",
                        maxWidth: "640px",
                        marginLeft: "auto",
                        marginRight: "auto",
                        lineHeight: "1.5"
                      }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "18px", textAlign: "left", letterSpacing: "0.2px" }}>
                          <span style={{ display: 'block', marginBottom: '12px' }}>
                            If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on <strong>"Manager coaching and coaching for corrective action"</strong>.
                          </span>
                          <span style={{ display: 'block', marginBottom: '12px' }}>
                            If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.
                          </span>
                          <span style={{ display: 'block' }}>
                            If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                          </span>
                        </p>
                        <ButtonRow
                          domainid={RESOLVED_DOMAIN_ID}
                          isDarkMode={isDarkMode}
                          onAgentConnect={handleLiveAgentConnect}
                        />
                      </div>
                    ) : typeof message.text === 'string' ? (
                      // Plain text system messages get styled
                      <div className={`p-3 rounded-lg ${
                        isDarkMode 
                          ? 'bg-transparent text-white' 
                          : 'bg-[#f8f9fa] text-[#2c3e50]'
                      } text-center font-medium`}>
                        {message.text}
                      </div>
                    ) : (
                      // Other JSX system messages render as-is
                      message.text
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed text-left`} style={{ lineHeight: '1.6', textAlign: 'left' }}>
                        {formatTextWithLinks(message.text)}
                        {/* Show typing indicator for streaming messages */}
                        {!message.completed && (message.chat_id === streamingMessageId || message.id === streamingMessageId) && (
                          <span className="inline-flex ml-1">
                            <span className="animate-pulse">●</span>
                            <span className="animate-pulse animation-delay-200">●</span>
                            <span className="animate-pulse animation-delay-400">●</span>
                          </span>
                        )}
                        {/* Show regenerating indicator */}
                        {message.isRegenerating && (
                          <span className={`inline-flex ml-2 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            🔄 Regenerating...
                          </span>
                        )}
                      </div>

                      {/* Show table for first response or when showTable is true */}
                      {message.showTable && (
                        <div className={`${isDarkMode ? 'bg-transparent border-[#2861BB]' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden shadow-sm`}>
                          <table className="w-full text-sm">
                            <thead className={isDarkMode ? 'bg-transparent' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Name</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employee ID</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Email</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Status</th>
                              </tr>
                            </thead>
                            <tbody className={`${isDarkMode ? 'divide-[#2861BB]' : 'divide-gray-200'} divide-y`}>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deepl, Priya</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Priya.Deepl@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Garcia, Sophia</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Sophia.Garcia@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Johnson, Alex</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Alex.Johnson@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lin, Marco</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Marco.Lin@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Miller, Ethan</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Ethan.Miller@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Show only after assistant message is complete (or non-streamed legacy), never while streaming */}
                    {message.type === 'assistant' &&
                     !message.isWelcome &&
                     message.type !== 'system' &&
                     // Must be completed if it was streamed
                     ((message.completed === true) ||
                      // Or it's a legacy/non-streamed assistant message with some text
                      ((message.completed === undefined) && message.text && message.text.trim().length > 0)) &&
                     // Extra guard: hide icons for the message currently streaming
                     (message.chat_id ? (message.chat_id !== streamingMessageId) : (message.id !== streamingMessageId)) && (
                      <div className="flex items-center gap-2 py-1 relative mt-2">
                        <button 
                          onClick={() => handleLike(message.id)}
                          className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded relative`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M10.4523 1.85164C10.4644 2.59944 10.2347 3.33122 9.79726 3.93842C9.68341 4.11134 9.53661 4.26023 9.36523 4.37664L9.23284 4.87051H13.2395C13.8703 4.86951 14.4679 5.15291 14.8656 5.64171C15.2632 6.13052 15.4186 6.77245 15.2882 7.38855L13.7831 14.3445C13.5786 15.3107 12.7237 16.0016 11.7344 16H0V4.87051H3.1984L7.92282 0.196127L8.1458 0.00136137H8.42453C9.49319 -0.0381125 10.3959 0.785607 10.4523 1.85164ZM8.64751 1.45515L4.18091 5.8513V14.6088H11.7344C12.0666 14.6169 12.3582 14.3898 12.4312 14.0662L13.9155 7.11032C13.9619 6.90478 13.9125 6.6893 13.7811 6.52438C13.6498 6.35945 13.4506 6.26285 13.2395 6.2617H7.42808L7.665 5.3922L8.07612 3.82712L8.16671 3.54193L8.40362 3.41672C8.52613 3.33722 8.63058 3.23295 8.71022 3.11066C8.96206 2.74073 9.08453 2.29816 9.05863 1.85164C9.05863 1.636 8.94017 1.51775 8.64751 1.45515ZM2.78727 6.2617H1.39364V14.6088H2.78727V6.2617Z" fill={likedMessages.has(message.id) ? "#44B8F3" : (isDarkMode ? "#A0BEEA" : "#787777")}/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDislike(message.id)}
                          className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded`}
                        >
                          <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.42453 16.0268C9.49319 16.0664 10.3959 15.2412 10.4523 14.1733C10.4644 13.4242 10.2347 12.6911 9.79726 12.0828C9.68341 11.9096 9.53662 11.7604 9.36523 11.6438L9.23284 11.1491H13.2395C13.8703 11.1501 14.4679 10.8662 14.8656 10.3765C15.2632 9.88687 15.4186 9.24381 15.2882 8.62661L13.7831 1.65843C13.5786 0.69052 12.7237 -0.00156462 11.7344 6.66159e-06H0V11.1491H3.19839L7.92282 15.8317L8.1458 16.0268H8.42453ZM4.18091 10.1666V1.39364H11.7344C12.0666 1.38552 12.3582 1.61303 12.4312 1.93716L13.9155 8.90534C13.9619 9.11124 13.9125 9.32709 13.7811 9.49231C13.6498 9.65753 13.4506 9.7543 13.2395 9.75546H7.42808L7.665 10.6265L8.07612 12.1943L8.16671 12.48L8.40362 12.6054C8.52613 12.6851 8.63058 12.7895 8.71022 12.912C8.96206 13.2826 9.08453 13.726 9.05863 14.1733C9.05863 14.3893 8.94017 14.5078 8.64751 14.5705L4.18091 10.1666ZM1.39364 1.39364H2.78727V9.75546H1.39364V1.39364Z" fill={dislikedMessages.has(message.id) ? "#CB0042" : (isDarkMode ? "#A0BEEA" : "#787777")}/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleReload(message.id)}
                          className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded`}
                          title="Reload/Regenerate response"
                        >
                          <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M13.4513 10.4167L14.6667 10.9167C13.5183 13.8932 10.7039 16 7.33333 16C4.9567 16 2.8427 14.9245 1.40075 13.2708V15.3333H0.082397V10.6667H4.69663V12H2.08052C3.27528 13.5911 5.17299 14.6667 7.33333 14.6667C10.1606 14.6667 12.4909 12.9062 13.4513 10.4167ZM7.33333 0C9.6868 0 11.8214 1.05469 13.2659 2.72917V0.666668H14.5843V5.33333H9.97004V4H12.5655C11.3759 2.39323 9.47051 1.33333 7.33333 1.33333C4.50609 1.33333 2.1758 3.09375 1.21536 5.58333L0 5.08333C1.14841 2.10677 3.96278 0 7.33333 0Z" fill={isDarkMode ? "#A0BEEA" : "#787777"}/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleCopy(message.text, message.id)}
                          className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded relative`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0V0.727273V11.6364V12.3636H0.727273H2.90909V10.9091H1.45455V1.45455H10.9091V2.90909H12.3636V0.727273V0H11.6364H0.727273H0ZM3.63636 3.63636V4.36364V15.2727V16H4.36364H15.2727H16V15.2727V4.36364V3.63636H15.2727H4.36364H3.63636ZM5.09091 5.09091H14.5455V14.5455H5.09091V5.09091Z" fill={isDarkMode ? "#A0BEEA" : "#787777"}/>
                          </svg>
                          {copiedMessage === message.id && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                              Copied!
                            </div>
                          )}
                        </button>
                        
                        {/* Reference Links Icon */}
                        <button 
                          onClick={() => handleReferenceLinks(message.text, message.id)}
                          className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded relative ${
                            extractReferenceLinks(message.text).length === 0 
                              ? 'opacity-30 cursor-not-allowed' 
                              : ''
                          }`}
                          disabled={extractReferenceLinks(message.text).length === 0}
                          title={extractReferenceLinks(message.text).length > 0 ? 'View Reference Links' : 'No reference links available'}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.5 1C5.67157 1 5 1.67157 5 2.5C5 3.32843 5.67157 4 6.5 4H9.5C10.3284 4 11 3.32843 11 2.5C11 1.67157 10.3284 1 9.5 1H6.5ZM3.5 2.5C3.5 0.84315 4.84315 -0.5 6.5 -0.5H9.5C11.1569 -0.5 12.5 0.84315 12.5 2.5C12.5 4.15685 11.1569 5.5 9.5 5.5H6.5C4.84315 5.5 3.5 4.15685 3.5 2.5ZM6.5 12C5.67157 12 5 12.6716 5 13.5C5 14.3284 5.67157 15 6.5 15H9.5C10.3284 15 11 14.3284 11 13.5C11 12.6716 10.3284 12 9.5 12H6.5ZM3.5 13.5C3.5 11.8431 4.84315 10.5 6.5 10.5H9.5C11.1569 10.5 12.5 11.8431 12.5 13.5C12.5 15.1569 11.1569 16.5 9.5 16.5H6.5C4.84315 16.5 3.5 15.1569 3.5 13.5ZM8 6.75C8.41421 6.75 8.75 7.08579 8.75 7.5V8.5C8.75 8.91421 8.41421 9.25 8 9.25C7.58579 9.25 7.25 8.91421 7.25 8.5V7.5C7.25 7.08579 7.58579 6.75 8 6.75Z" 
                              fill={extractReferenceLinks(message.text).length === 0 
                                ? (isDarkMode ? "#555" : "#ccc") 
                                : (isDarkMode ? "#A0BEEA" : "#787777")
                              }
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className={`p-5 ${isDarkMode ? '' : 'bg-[#F9FAFB] border-gray-200 border-t'} flex-shrink-0`}>
          {/* End Chat Controls for Live Agent - Above Input */}
          {liveAgent && !chatEnded && !showConfirm && (
            <div className="max-w-[760px] mx-auto mb-3">
              <div className="text-center">
                <button
                  onClick={confirmEndChat}
                  className={`px-4 py-2 rounded-full border transition-all hover:shadow-md ${
                    isDarkMode 
                      ? 'bg-transparent border-[#A0BEEA] text-[#A0BEEA] hover:bg-[#A0BEEA] hover:text-[#072056]' 
                      : 'bg-white border-[#1a3673] text-[#1a3673] hover:bg-[#1a3673] hover:text-white'
                  }`}
                >
                  End Chat
                </button>
              </div>
            </div>
          )}
          {showConfirm && (
            <div className="max-w-[760px] mx-auto mb-3">
              <div className="text-center">
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${
                  isDarkMode 
                    ? 'bg-transparent border-[#A0BEEA] text-white' 
                    : 'bg-white border-[#1a3673] text-[#1a3673]'
                }`}>
                  <span className="font-semibold">End Chat?</span>
                  <button
                    onClick={endChat}
                    className={`px-3 py-1 rounded-full font-bold transition-all ${
                      isDarkMode 
                        ? 'bg-[#A0BEEA] text-[#072056] hover:bg-white' 
                        : 'bg-[#1a3673] text-white hover:bg-[#0f1f4d]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={cancelEndChat}
                    className={`px-3 py-1 rounded-full font-bold border transition-all ${
                      isDarkMode 
                        ? 'border-[#A0BEEA] text-[#A0BEEA] hover:bg-[#A0BEEA] hover:text-[#072056]' 
                        : 'border-[#1a3673] text-[#1a3673] hover:bg-[#1a3673] hover:text-white'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-w-[760px] mx-auto">
            <div 
              className={`flex items-center gap-3 px-4 py-3 border-2 shadow-lg ${isDarkMode ? 'border-[#2861BB]' : 'bg-white border-[#44B8F3] rounded-full'}`}
              style={isDarkMode ? {
                borderRadius: '999px',
                border: '2px solid #2861BB',
                background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
              } : {}}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 24C10.4551 18.1296 5.87044 13.5449 0 12C5.87044 10.4551 10.4551 5.87044 12 0C13.5449 5.87044 18.1296 10.4551 24 12C18.1296 13.5449 13.5449 18.1296 12 24Z" fill="url(#paint0_linear_gradient)"/>
                <defs>
                  <linearGradient id="paint0_linear_gradient" x1="18.0351" y1="6.01092" x2="6.01958" y2="16.5376" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#44B8F3"/>
                    <stop offset="1" stopColor="#2861BB"/>
                  </linearGradient>
                </defs>
              </svg>
              
              <input
                type="text"
                placeholder={isInputFocused ? "" : "Ask anything"}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={`flex-1 bg-transparent border-none outline-none text-xl ${
                  isDarkMode 
                    ? 'text-white placeholder-[#A0BEEA]' 
                    : 'text-[#2861BB] placeholder-[#787777]'
                }`}
              />
              
              <button 
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
                className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.975 17.0004L18.2437 10.7671C18.9525 10.4754 18.9525 9.52542 18.2437 9.23375L2.975 3.00042C2.3975 2.75875 1.75875 3.16709 1.75875 3.75875L1.75 7.60042C1.75 8.01709 2.07375 8.37542 2.51125 8.42542L14.875 10.0004L2.51125 11.5671C2.07375 11.6254 1.75 11.9838 1.75 12.4004L1.75875 16.2421C1.75875 16.8338 2.3975 17.2421 2.975 17.0004Z" fill="#0C7DB6"/>
                  </svg>
                )}
              </button>
              
              <button className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9989 14C13.6776 14 15.0328 12.66 15.0328 11V5C15.0328 3.34 13.6776 2 11.9989 2C10.3202 2 8.9651 3.34 8.9651 5V11C8.9651 12.66 10.3202 14 11.9989 14ZM17.9756 11C17.48 11 17.0654 11.36 16.9845 11.85C16.5699 14.2 14.4968 16 11.9989 16C9.50107 16 7.42796 14.2 7.01333 11.85C6.93243 11.36 6.51781 11 6.02228 11C5.40541 11 4.91999 11.54 5.01101 12.14C5.50653 15.14 7.93359 17.49 10.9876 17.92V20C10.9876 20.55 11.4427 21 11.9989 21C12.5551 21 13.0102 20.55 13.0102 20V17.92C16.0643 17.49 18.4913 15.14 18.9868 12.14C19.088 11.54 18.5924 11 17.9756 11Z" fill="#949494"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reference Links Sidebar */}
      {showReferenceLinks && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowReferenceLinks(false)}
          />
          
          {/* Sidebar */}
          <div className={`absolute right-0 top-0 h-full w-80 ${
            isDarkMode ? 'bg-[#072056]' : 'bg-white'
          } shadow-xl transform transition-transform duration-300 ease-in-out`}>
            
            {/* Header */}
            <div className={`p-4 border-b ${
              isDarkMode ? 'border-[#2861BB]' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-[#1a366f]'
                }`}>
                  📚 Reference Links
                </h2>
                <button
                  onClick={() => setShowReferenceLinks(false)}
                  aria-label="Close Reference Links"
                  className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 
                    ${isDarkMode ? 'hover:bg-[#1F3E81] text-[#A0BEEA] focus:ring-[#2861BB]' : 'hover:bg-gray-100 text-gray-600 focus:ring-blue-300'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'
              }`}>
                Sources ({currentReferenceLinks.length})
              </p>
            </div>
            
            {/* Links List */}
            <div className="p-4 h-full overflow-y-auto">
              <div className="space-y-3">
                {currentReferenceLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      isDarkMode 
                        ? 'bg-[#1F3E81] border-[#2861BB] hover:bg-[#2A4A8C] text-white' 
                        : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8.636 2.273L6.18 4.727V4H4.727V8.364H6.18V7.636L8.636 10.091L10.364 8.364V9.09H11.818V4.727H10.364V5.455L8.636 2.273ZM14.545 0V1.455H16V0H14.545ZM12.364 0V1.455H13.818V0H12.364ZM10.182 0V1.455H11.636V0H10.182ZM8 0V1.455H9.455V0H8ZM5.818 0V1.455H7.273V0H5.818ZM3.636 0V1.455H5.091V0H3.636ZM1.455 0V1.455H2.909V0H1.455ZM0 1.455V2.909H1.455V1.455H0ZM0 3.636V5.091H1.455V3.636H0ZM0 5.818V7.273H1.455V5.818H0ZM0 8V9.455H1.455V8H0ZM0 10.182V11.636H1.455V10.182H0ZM0 12.364V13.818H1.455V12.364H0ZM0 14.545V16H1.455V14.545H0ZM1.455 16H2.909V14.545H1.455V16ZM3.636 16H5.091V14.545H3.636V16ZM5.818 16H7.273V14.545H5.818V16ZM8 16H9.455V14.545H8V16ZM10.182 16H11.636V14.545H10.182V16ZM12.364 16H13.818V14.545H12.364V16ZM14.545 16H16V14.545H14.545V16ZM16 12.364V13.818H14.545V12.364H16ZM16 10.182V11.636H14.545V10.182H16ZM16 8V9.455H14.545V8H16ZM16 5.818V7.273H14.545V5.818H16ZM16 3.636V5.091H14.545V3.636H16ZM16 1.455V2.909H14.545V1.455H16Z" 
                            fill={isDarkMode ? "#A0BEEA" : "#1a366f"}
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm leading-tight ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {link.title}
                        </h3>
                        <p className={`text-xs mt-1 truncate ${
                          isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-500'
                        }`}>
                          {link.url}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 0H12V4L10.5 2.5L7 6L6 5L9.5 1.5L8 0ZM10 8V10H2V2H6L5 1H2C1.45 1 1 1.45 1 2V10C1 10.55 1.45 11 2 11H10C10.55 11 11 10.55 11 10V7L10 8Z" 
                            fill={isDarkMode ? "#A0BEEA" : "#6B7280"}
                          />
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              
              {currentReferenceLinks.length === 0 && (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-500'
                }`}>
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p>No reference links available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
