import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import PulseEmbeddedOld from './PulseEmbeddedOld';
import ChatIntegrationDemo from './components/ChatIntegrationDemo';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { hybridChatService } from './services/hybridChatService';
import './App.css';

function AppContent() {
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle URL parameters for result page
  React.useEffect(() => {
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
          // Manual input - create new chat with immediate response
          setUserQuestion('');
          setIsNewChat(false);
          setIsNewChatActive(false);
          
          const newThread = {
            id: 'thread_' + Date.now(),
            title: query.length > 50 ? query.substring(0, 50) + '...' : query,
            conversation: [
              {
                type: 'user',
                text: query
              }
            ]
          };
          setCurrentThread(newThread);
        }
      }
    }
  }, [location]);

  // Auto-load first conversation on page refresh/initialization
  useEffect(() => {
    const autoLoadFirstConversation = async () => {
      // Only auto-load if we're on resultpage, have no current thread, and no URL params
      if (location.pathname === '/resultpage' && 
          !currentThread && 
          !location.search && 
          !isNewChat && 
          !isNewChatActive) {
        
        try {
          // Get user info to set user ID
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const userId = userInfo.domainId || userInfo.domain_id;
          
          if (userId) {
            hybridChatService.setUserId(userId);
            
            // Get conversation history to find the first conversation
            const conversations = await hybridChatService.getConversationHistory(10, 0, true);
            
            if (conversations && conversations.length > 0) {
              const firstConversation = conversations[0];
              console.log('🔄 Auto-loading first conversation on page refresh:', firstConversation.title);
              
              // Load the first conversation using the existing handleThreadSelect logic
              await handleThreadSelect(firstConversation);
            } else {
              console.log('📝 No conversations found, staying on default view');
            }
          }
        } catch (error) {
          console.error('❌ Failed to auto-load first conversation:', error);
          // Stay on default view if auto-load fails
        }
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
      // Manual input - create new chat with immediate response
      setUserQuestion(''); // Clear since we'll show response immediately
      setIsNewChat(false);
      setIsNewChatActive(false);
      
      const newThread = {
        id: 'thread_' + Date.now(),
        title: question.length > 50 ? question.substring(0, 50) + '...' : question,
        conversation: [
          {
            type: 'user',
            text: question
          }
        ]
      };
      setCurrentThread(newThread);
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
      const fullConversation = await hybridChatService.getConversation(conversationId);
      
      if (fullConversation && fullConversation.conversation) {
        // Use the conversation data from API
        setCurrentThread({
          id: conversationId,
          title: fullConversation.title || 'Conversation',
          conversation: fullConversation.conversation
        });
        setUserQuestion('');
        setIsNewChat(false);
        setIsNewChatActive(false);
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
    
    // Navigate to result page for new chat
    navigate('/resultpage');
    
    // Note: Thread will be saved to API when first message is sent
  };

  const handleThreadSelect = async (thread) => {
    try {
      console.log('🔍 Loading conversation:', thread.id);
      
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
      console.log('🔄 Attempting to load conversation from API...');
      
      const fullConversation = await hybridChatService.getConversation(thread.id, {
        includeMessages: true,
        forceRefresh: false // Use cache if available
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
        
        // Normalize the conversation structure for ChatPage
        const normalizedMessages = [];
        
        // If we have a pre-created conversation array (fallback case), use it
        if (fullConversation.conversation && Array.isArray(fullConversation.conversation)) {
          normalizedMessages.push(...fullConversation.conversation);
        }
        // Otherwise, if the API returns messages array, convert them to chat format
        else if (fullConversation.messages && Array.isArray(fullConversation.messages)) {
          fullConversation.messages.forEach((msg, index) => {
            normalizedMessages.push({
              id: index + 1,
              type: msg.message_type || msg.type || 'user',
              text: msg.content || msg.message_text || msg.text || '',
              showTable: false,
              isWelcome: false,
              originalMsg: msg // Keep original for debugging
            });
          });
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
      
      // Always provide a fallback to prevent the UI from breaking
      console.log('🔄 Using fallback conversation structure');
      setCurrentThread({
        ...thread,
        conversation: [
          {
            id: 1,
            type: 'assistant',
            text: 'Hello! I\'m here to help you with any questions you might have.',
            isWelcome: true
          }
        ],
        isLocal: true,
        hasError: true
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
            <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} />
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
            <PulseEmbedded />
          </div>
        } 
      />
      <Route 
        path="/pulseembedded_old" 
        element={
          <div className="App">
            <PulseEmbeddedOld />
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
            />
          </div>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
