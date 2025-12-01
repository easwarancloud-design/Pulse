import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import MainPage from './MainPage.jsx';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import PulseEmbeddedDemo from './PulseEmbeddedDemo';
import ChatIntegrationDemo from './components/ChatIntegrationDemo';
import { useTheme } from './context/ThemeContext';
import { hybridChatService } from './services/hybridChatService';
import { conversationCacheService } from './services/conversationCacheService';
import { localConversationManager } from './services/localConversationManager';
import './App.css';

import { oktaAuth } from './oktaConfig';
import PrivateRoute from './PrivateRoute';
import { Security, useOktaAuth } from '@okta/okta-react';

function AppContent() {
  const { oktaAuth, authState } = useOktaAuth();
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState(() => {
  // Initialize from localStorage if available
  try {
    return JSON.parse(localStorage.getItem('userInfo')) || null;
  } catch {
    return null;
  }
});

// Extract user information when authenticated
useEffect(() => {
  if (authState?.isAuthenticated) {
    oktaAuth.getUser()
      .then((user) => {
        // 👇 Log the entire user object to see all keys
        console.log('Okta user object:', user);
        const info = {
          name: user.name || user.given_name || 'User',
          firstName: user.given_name,
          lastName: user.family_name,
          email: user.email,
          domainId: user.domainID
,
          fullName: `${user.given_name} ${user.family_name}`.trim(),
        };
        setUserInfo(info);
        localStorage.setItem('userInfo', JSON.stringify(info)); // persist to localStorage
      })
      .catch(console.error);
  }
}, [authState, oktaAuth]);

// Centralized domainId resolution
  const resolvedDomainId = React.useMemo(() => {
    if (userInfo?.domainId) return userInfo.domainId;
    try {
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return stored.domainId || stored.domain_id || null; // no default fallback
    } catch {
      return null;
    }
  }, [userInfo]);

  // Ref for immediate sidebar conversation addition
  const addConversationImmediateRef = useRef(null);

  // Handle URL parameters for result page
  React.useEffect(() => {
    // 🧹 Clean up old local storage on app start
    localConversationManager.cleanupOldConversations();

    if (location.pathname === '/resultpage') {
      const params = new URLSearchParams(location.search);
      const query = params.get('query');
      const conversationId = params.get('conversationId');
      const type = params.get('type');

      if (query) {
        if (conversationId) {
          // Load existing conversation by ID
          loadExistingConversation(conversationId);
        } else if (type === 'predefined') {
          // Predefined question - create new chat with question in input field
          setUserQuestion(query);
          setIsNewChat(true);
          setIsNewChatActive(true);

          const newThread = {
            id: 'thread_' + Date.now(),
            title: 'New Chat',
            conversation: []
          };
          setCurrentThread(newThread);
        } else if (type === 'manual') {
          // Manual input coming from embedded/main page.
          // Root cause of duplication: we previously pre-populated the thread with the user message AND
          // ChatPage's initializer added another user+assistant placeholder, then the thread-change effect
          // injected a fallback/welcome message. Net result: two user messages + two assistant messages + two chats.
          // Fix: do NOT pre-populate conversation here. Instead pass the question via userQuestion and let ChatPage
          // create the initial user+assistant pair exactly once and stream the response. Keep isNewChat=false so
          // ChatPage auto-trigger logic (manual question path) still fires; provide an empty conversation to avoid
          // the thread-change effect injecting an extra welcome/fallback message (guard added in ChatPage).
          setUserQuestion(query);
          setIsNewChat(false);
          setIsNewChatActive(false);
          setCurrentThread({
            id: 'thread_' + Date.now(),
            title: 'New Chat',
            conversation: []
          });
        }
      }
    }
  }, [location]);

  // Auto-load first conversation on page refresh/initialization
  useEffect(() => {
    const autoLoadFirstConversation = async () => {
      console.log('🔍 Auto-load check:', {
        pathname: location.pathname,
        currentThread: !!currentThread,
        search: location.search,
        isNewChat,
        isNewChatActive
      });

      // Only auto-load if we're on resultpage, have no current thread, and no URL params
      if (location.pathname === '/resultpage' &&
          !currentThread &&
          !location.search &&
          !isNewChat &&
          !isNewChatActive) {

        console.log('✅ Conditions met, attempting to auto-load first conversation');

        try {
          // Get user info to set user ID
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const userId = userInfo.domainId || userInfo.domain_id || null; // Use only Okta-derived ID

          console.log('👤 Using user ID for auto-load:', userId);
          if (!userId) {
            console.warn('⚠️ No domainId found in Okta user; skipping auto-load');
            return; // do not proceed without a real domain ID
          }
          hybridChatService.setUserId(userId);

          // Get conversation history to find the first conversation
          const conversations = await hybridChatService.getConversationHistory(10, 0, true);
          console.log('📚 Found conversations:', conversations?.length || 0);

          if (conversations && conversations.length > 0) {
            const firstConversation = conversations[0];
            console.log('🔄 Auto-loading first conversation on page refresh:', firstConversation.title);

            // Load the first conversation using the existing handleThreadSelect logic
            await handleThreadSelect(firstConversation);
          } else {
            console.log('📝 No conversations found, staying on default view');
          }
        } catch (error) {
          console.error('❌ Failed to auto-load first conversation:', error);
          // Stay on default view if auto-load fails
        }
      } else {
        console.log('⏭️ Skipping auto-load: conditions not met');
      }
    };

    // Delay slightly to allow other initialization to complete
    const timeoutId = setTimeout(autoLoadFirstConversation, 500);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, currentThread, isNewChat, isNewChatActive]);

  const navigateToResults = (question, conversationId = null, type = null) => {
    // Create URL parameters
    const params = new URLSearchParams({
      query: question,
      ...(conversationId && { conversationId }),
      ...(type && { type })
    });

    if (conversationId) {
      // Load existing conversation by ID
      loadExistingConversation(conversationId);
    } else if (type === 'predefined') {
      // Predefined question - create new chat with question in input field
      setUserQuestion(question); // This will be used to pre-fill the input
      setIsNewChat(true);
      setIsNewChatActive(true);

      const newThread = {
        id: 'thread_' + Date.now(),
        title: 'New Chat', // Start with "New Chat" title
        conversation: []
      };
      setCurrentThread(newThread);
    } else if (type === 'manual') {
      // Manual input - DON'T create thread here; let ChatPage handle it to avoid duplicates
      setUserQuestion('');
      setIsNewChat(false);
      setIsNewChatActive(false);
      setCurrentThread(null); // Clear thread so ChatPage creates it properly
    } else {
      // Default behavior (backward compatibility)
      setUserQuestion(question);
      setIsNewChat(false);
      setIsNewChatActive(false);

      const newThread = {
        id: 'thread_' + Date.now(),
        title: question.length > 50 ? question.substring(0, 50) + '...' : question,
        conversation: []
      };
      setCurrentThread(newThread);
    }

    // Navigate to result page with parameters
    navigate(`/resultpage?${params.toString()}`);
  };

  const loadExistingConversation = async (conversationId) => {
    try {
      // Try to load conversation from API first
      const fullConversation = await hybridChatService.getConversation(conversationId, {
        includeMessages: true,
        forceRefresh: true
      });

      if (fullConversation) {
        // Normalize possible shapes (conversation array or messages array)
        let normalizedMessages = [];
        if (Array.isArray(fullConversation.conversation)) {
          normalizedMessages = fullConversation.conversation;
        } else if (Array.isArray(fullConversation.messages)) {
          normalizedMessages = fullConversation.messages.map((msg, index) => ({
            id: msg.id || `local_${index + 1}`,
            backend_id: msg.id,
            chat_id: msg.chat_id || null,
            type: msg.message_type || msg.type || 'user',
            text: msg.content || msg.message_text || msg.text || '',
            showTable: false,
            isWelcome: false,
            originalMsg: msg
          }));
        }

        // If no messages returned, add a default welcome message so UI is consistent
        if (normalizedMessages.length === 0) {
          normalizedMessages = [{
            id: 1,
            type: 'assistant',
            text: 'Welcome! You can start by typing your message below.',
            isWelcome: true
          }];
        }

        // Apply to state so ChatPage highlights this conversation on the left
        setCurrentThread({
          id: fullConversation.id || conversationId,
          title: fullConversation.title || 'Conversation',
          conversation: normalizedMessages
        });

        // Ensure subsequent sends append to this conversation instead of creating a new one
        try {
          hybridChatService.setActiveConversation(fullConversation.id || conversationId);
        } catch (e) {
          console.warn('Failed to set active conversation ID:', e?.message || e);
        }

        // Clear any new-chat flags
        setUserQuestion('');
        setIsNewChat(false);
        setIsNewChatActive(false);

        // Save locally for instant reloads
        try {
          localConversationManager.saveCompleteConversation(
            fullConversation.id || conversationId,
            fullConversation.title || 'Conversation',
            normalizedMessages
          );
        } catch (e) {
          // non-fatal
        }
      } else {
        console.error('Conversation not found:', conversationId);
        // Fallback to new chat
        handleNewChat();
      }
    } catch (error) {
      console.error('Error loading conversation from API:', error);
      handleNewChat();
    }
  };

  const navigateToMain = () => {
    // Check if we came from iframe context
    const urlParams = new URLSearchParams(location.search);
    const fromIframe = urlParams.get('fromIframe') === 'true';
    const parentUrl = urlParams.get('parentUrl');
    const hasUrlParams = urlParams.has('query') || urlParams.has('type');

    // Detect if we're currently in an iframe context
    const isInIframe = () => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    };

    if (fromIframe || hasUrlParams) {
      // If we came from iframe breakout, try to go back to the parent
      try {
        if (parentUrl && parentUrl !== 'unknown' && parentUrl !== 'false') {
          // We have the parent URL, navigate back to it
          window.location.href = parentUrl;
        } else if (window.history.length > 1) {
          // Try to go back in browser history
          window.history.back();
        } else {
          // Try to close the window (for popup scenarios)
          window.close();
          // If window.close() doesn't work, show a message or navigate to main
          setTimeout(() => {
            alert('Please close this tab to return to the previous application.');
          }, 100);
        }
      } catch (error) {
        console.error('Cannot navigate back to parent:', error);
        // Fallback: try to close window or navigate to main page
        try {
          window.close();
          setTimeout(() => {
            navigate('/');
          }, 100);
        } catch (e) {
          navigate('/');
        }
      }
    } else {
      // Normal navigation within the app
      setUserQuestion('');
      setCurrentThread(null);
      setIsNewChat(false);
      setIsNewChatActive(false);
      navigate('/');
    }
  };

  const handleNewChat = () => {
    // Create a new thread immediately when "New Chat" is clicked
    const newThread = {
      id: 'thread_' + Date.now(),
      title: 'New Chat',
      conversation: []
    };

    setIsNewChat(true);
    setIsNewChatActive(true);
    setCurrentThread(newThread);
    setUserQuestion('');

    // 🎯 Immediately add "New Chat" to sidebar (UI responsiveness)
    if (addConversationImmediateRef.current) {
      console.log('🎯 Adding "New Chat" to sidebar immediately', newThread.id);
      addConversationImmediateRef.current.addConversation(newThread.id, 'New Chat');
    } else {
      console.warn('⚠️ addConversationImmediateRef.current is null - cannot add to sidebar');
    }

    // Navigate to result page for new chat
    navigate('/resultpage');

    // Note: Thread will be saved to API when first message is sent
  };

  const handleThreadSelect = async (thread) => {
    try {
      console.log('🔍 Loading conversation:', thread.id);

      // Immediately reflect selection in UI to avoid showing previous conversation while loading
      setCurrentThread({ id: thread.id, title: thread.title, conversation: [] });
      setIsNewChat(false);
      setIsNewChatActive(false);
      setUserQuestion('');
      navigate('/resultpage');

      // 🔥 Clear any cached data for this conversation before loading
      if (typeof conversationCacheService !== 'undefined') {
        console.log('🗑️ Pre-clearing cache for conversation:', thread.id);
        conversationCacheService.remove(thread.id);
      }

      // Get user info to set user ID
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const userId = userInfo.domainId || userInfo.domain_id;

      if (userId) {
        hybridChatService.setUserId(userId);
      }

      // Check if this is a local conversation that was never saved
      if (thread.id.startsWith('local_')) {
        console.log('📝 Local conversation detected, using cached data');
        setCurrentThread(thread);
        setIsNewChat(false);
        setIsNewChatActive(false);
        setUserQuestion('');
        navigate('/resultpage');
        return;
      }

      // Try to load the full conversation from API
      console.log('🔄 Attempting to load conversation...');

      // 💾 FIRST: Check local storage for instant response
      const localData = localConversationManager.getLocalConversation(thread.id);

      // 🔍 VALIDATION: Check if localStorage has old format (numeric IDs instead of UUIDs)
      const hasOldFormat = localData && localData.messages && localData.messages.some(msg =>
        typeof msg.id === 'number' || (typeof msg.id === 'string' && !msg.id.startsWith('msg_') && !msg.id.startsWith('local_'))
      );

      if (hasOldFormat) {
        console.warn('⚠️ Detected old localStorage format with numeric IDs - clearing and reloading from API');
        localConversationManager.deleteConversation(thread.id);
        // Fall through to API load below
      }
      else if (localData && localData.messages.length > 0) {
        console.log('💾 Found local data with', localData.messages.length, 'messages - showing immediately');
        const localThread = localConversationManager.formatForChatPage(localData);
        setCurrentThread(localThread);
        hybridChatService.setActiveConversation(thread.id);
        setIsNewChat(false);
        setIsNewChatActive(false);
        setUserQuestion('');
        navigate('/resultpage');

        // Still load from API in background to sync any new messages
        setTimeout(async () => {
          try {
            console.log('🌐 Background sync: Loading from API to check for updates...');
            const apiData = await hybridChatService.getConversation(thread.id, {
              includeMessages: true,
              forceRefresh: true
            });

            if (apiData && apiData.messages && apiData.messages.length > localData.messages.length) {
              console.log('🔄 API has more messages - updating local storage and UI');

              // Convert API messages to normalized format (PRESERVE UUIDs!)
              const normalizedApiMessages = apiData.messages.map((msg, index) => ({
                id: msg.id || `local_${index + 1}`,  // ✅ Preserve backend UUID
                backend_id: msg.id,                   // Keep backend ID separately
                chat_id: msg.chat_id || null,         // ✅ Preserve chat_id
                type: msg.message_type || msg.type || 'user',
                text: msg.content || msg.message_text || msg.text || '',
                showTable: false,
                isWelcome: false,
                originalMsg: msg
              }));

              // Update local storage with complete conversation
              localConversationManager.saveCompleteConversation(
                thread.id,
                apiData.title || thread.title,
                normalizedApiMessages
              );

              // Update current thread to show new messages
              setCurrentThread(prevThread => ({
                ...prevThread,
                conversation: normalizedApiMessages,
                title: apiData.title || prevThread.title
              }));

              console.log('✅ Local storage and UI updated with new messages from API');
            }
          } catch (error) {
            console.log('⚠️ Background sync failed (non-critical):', error.message);
          }
        }, 100);
        return;
      }

      // 🌐 FALLBACK: Load from API if no local data
      console.log('🌐 No local data found - loading from API...');
      const fullConversation = await hybridChatService.getConversation(thread.id, {
        includeMessages: true,
        forceRefresh: true // 🔥 FORCE FRESH DATA to see new messages
      });

      // Check if we got an error object instead of conversation data
      if (fullConversation && fullConversation.error) {
        console.log(`⚠️ API returned error: ${fullConversation.error} - ${fullConversation.message}`);

        let fallbackMessage = 'Welcome! You can start a new conversation by typing your message below.';

        if (fullConversation.error === 'validation_error') {
          fallbackMessage = 'This conversation exists but cannot be loaded due to a data format issue. You can continue chatting by typing your message below.';
        } else if (fullConversation.error === 'not_found') {
          fallbackMessage = 'This conversation was not found. You can start a new conversation by typing your message below.';
        } else if (fullConversation.error === 'database_error') {
          fallbackMessage = 'Unable to load this conversation due to a database issue. You can continue chatting by typing your message below.';
        } else {
          fallbackMessage = 'Unable to load this conversation. You can continue chatting by typing your message below.';
        }

        setCurrentThread({
          ...thread,
          conversation: [
            {
              id: 1,
              type: 'assistant',
              text: fallbackMessage,
              isWelcome: true
            }
          ],
          isLocal: true,
          hasError: fullConversation.error
        });
      }
      else if (fullConversation) {
        console.log('✅ Loaded conversation from API:', fullConversation.title || 'No title');
        console.log('🔍 DEBUG: Full conversation data:', {
          hasConversationArray: !!fullConversation.conversation,
          conversationLength: fullConversation.conversation?.length,
          hasMessagesArray: !!fullConversation.messages,
          messagesLength: fullConversation.messages?.length,
          messagesSample: fullConversation.messages?.slice(0, 2).map(m => ({
            type: m.message_type,
            content: m.content?.substring(0, 30) + '...'
          }))
        });

        // Normalize the conversation structure for ChatPage
        const normalizedMessages = [];

        // If we have a pre-created conversation array (fallback case), use it
        if (fullConversation.conversation && Array.isArray(fullConversation.conversation)) {
          console.log('📋 Using conversation array from API');
          normalizedMessages.push(...fullConversation.conversation);
        }
        // Otherwise, if the API returns messages array, convert them to chat format
        else if (fullConversation.messages && Array.isArray(fullConversation.messages)) {
          console.log('📋 Converting messages array to conversation format. Messages count:', fullConversation.messages.length);
          console.log('🔍 RAW BACKEND MESSAGES (first 2):', fullConversation.messages.slice(0, 2).map(msg => ({
            allKeys: Object.keys(msg),
            id: msg.id,
            chat_id: msg.chat_id,
            message_type: msg.message_type,
            content: msg.content?.substring(0, 50)
          })));

          fullConversation.messages.forEach((msg, index) => {
            const normalizedMsg = {
              id: msg.id || `local_${index + 1}`,  // ✅ Preserve backend UUID
              backend_id: msg.id,                   // Keep backend ID separately
              chat_id: msg.chat_id || null,         // ✅ Preserve chat_id from backend
              type: msg.message_type || msg.type || 'user',
              text: msg.content || msg.message_text || msg.text || '',
              showTable: false,
              isWelcome: false,
              originalMsg: msg // Keep original for debugging
            };
            console.log(`  📝 Normalized message ${index + 1}:`, {
              id: normalizedMsg.id,
              backend_id: normalizedMsg.backend_id,
              chat_id: normalizedMsg.chat_id,
              type: normalizedMsg.type,
              text: normalizedMsg.text.substring(0, 30) + '...'
            });
            normalizedMessages.push(normalizedMsg);
          });
          console.log('✅ Final normalized messages count:', normalizedMessages.length);
        }

        // If no messages, add a welcome message
        if (normalizedMessages.length === 0) {
          normalizedMessages.push({
            id: 1,
            type: 'assistant',
            text: 'Welcome! You can start by typing your message below.',
            isWelcome: true
          });
        }

        // Set the normalized conversation structure that ChatPage expects
        setCurrentThread({
          ...thread,
          id: fullConversation.id || thread.id,
          title: fullConversation.title || thread.title,
          conversation: normalizedMessages, // Array of message objects for ChatPage
          apiData: fullConversation // Keep original API data for debugging
        });

        // � SAVE TO LOCAL STORAGE: Store complete conversation for future instant loading
        const conversationId = fullConversation.id || thread.id;
        const conversationTitle = fullConversation.title || thread.title;
        console.log('💾 Saving API conversation to local storage:', {
          conversationId,
          title: conversationTitle,
          messageCount: normalizedMessages.length
        });

        localConversationManager.saveCompleteConversation(
          conversationId,
          conversationTitle,
          normalizedMessages
        );

        // 🔥 CRITICAL: Set active conversation ID so new messages don't create duplicate chats
        console.log('🎯 Setting active conversation ID:', conversationId);
        hybridChatService.setActiveConversation(conversationId);
      } else {
        // No conversation data from API (null returned)
        console.log('⚠️ No conversation data from API - using cached thread data with welcome message');

        setCurrentThread({
          ...thread,
          conversation: [
            {
              id: 1,
              type: 'assistant',
              text: 'Welcome! You can start by typing your message below.',
              isWelcome: true
            }
          ],
          isLocal: true // Mark as local so we know it's not fully synced
        });
      }
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        conversationId: thread.id
      });

      // Provide specific error messages based on error type
      let fallbackMessage = 'Hello! I\'m here to help you with any questions you might have.';

      if (error.message.includes('404') || error.message.includes('not found')) {
        fallbackMessage = `The conversation "${thread.title || thread.id}" could not be found. This may happen if the conversation was deleted ormoved. You can start a new conversation by typing your message below.`;
      } else if (error.message.includes('400')) {
        fallbackMessage = 'There was an issue loading this conversation due to invalid data. You can start a new conversation by typing your message below.';
      } else if (error.message.includes('500')) {
        fallbackMessage = 'There was a server error loading this conversation. You can try again later or start a new conversation below.';
      } else {
        fallbackMessage = `Unable to load the conversation "${thread.title || thread.id}". You can start a new conversation by typing your message below.`;
      }

      // Always provide a fallback to prevent the UI from breaking
      console.log('🔄 Using enhanced fallback conversation structure with specific error message');
      setCurrentThread({
        ...thread,
        conversation: [
          {
            id: 1,
            type: 'assistant',
            text: fallbackMessage,
            isWelcome: true,
            isError: true,
            errorType: error.message.includes('404') ? '404' :
                      error.message.includes('400') ? '400' :
                      error.message.includes('500') ? '500' : 'unknown'
          }
        ],
        isLocal: true,
        hasError: true,
        errorMessage: error.message
      });
    }

    setIsNewChat(false);
    setIsNewChatActive(false);
    setUserQuestion('');
    navigate('/resultpage');
  };

  const handleFirstMessage = (newThread) => {
    setIsNewChatActive(false);
    setCurrentThread(newThread);
  };

  const handleThreadUpdate = (updatedThread) => {
    setCurrentThread(updatedThread);
    console.log('🔄 Thread updated in App.js:', updatedThread.title);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="App">
            <MainPage onSearch={navigateToResults} onNewChat={handleNewChat} />
          </div>
        }
      />
      <Route
        path="/demo-chat"
        element={
          <div className="App">
            <ChatIntegrationDemo />
          </div>
        }
      />
      <Route
        path="/pulsemain"
        element={
          <div className="App">
            <PulseMain onSearch={navigateToResults} onNewChat={handleNewChat} />
          </div>
        }
      />
      <Route
        path="/pulseembedded"
        element={
          <div className="App">
            <PulseEmbedded domainId={resolvedDomainId} />
          </div>
        }
      />
      {/** Alias route to handle common typo `/pulseembeded` (single 'd') */}
      <Route
        path="/pulseembeded"
        element={
          <div className="App">
            <PulseEmbedded domainId={resolvedDomainId} />
          </div>
        }
      />
      <Route
        path="/pulseembedded_demo"
        element={
          <div className="App">
            <PulseEmbeddedDemo domainId={resolvedDomainId} />
          </div>
        }
      />
      <Route
        path="/pulse_demo"
        element={
          <div className="App">
            <PulseEmbeddedDemo domainId={resolvedDomainId} />
          </div>
        }
      />
      <Route
        path="/resultpage"
        element={
          <div className="App">
            <ChatPage
              onBack={navigateToMain}
              userQuestion={userQuestion}
              onToggleTheme={toggleTheme}
              isDarkMode={isDarkMode}
              currentThread={currentThread}
              isNewChat={isNewChat}
              isNewChatActive={isNewChatActive}
              onNewChat={handleNewChat}
              onThreadSelect={handleThreadSelect}
              onFirstMessage={handleFirstMessage}
              onThreadUpdate={handleThreadUpdate}
              addConversationImmediateRef={addConversationImmediateRef}
            />
          </div>
        }
      />
    </Routes>
  );
}

export default AppContent;
