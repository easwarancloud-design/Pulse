import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import PulseEmbeddedOld from './PulseEmbeddedOld';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';
import { Security, useOktaAuth } from '@okta/okta-react';
import { oktaAuth } from './oktaConfig';
import PrivateRoute from './PrivateRoute';

function AppContent() {
  const { oktaAuth, authState } = useOktaAuth();
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract user information when authenticated
  useEffect(() => {
    if (authState?.isAuthenticated) {
      oktaAuth.getUser().then((user) => {
        setUserInfo({
          name: user.name || user.given_name || 'User',
          firstName: user.given_name,
          lastName: user.family_name,
          email: user.email,
          fullName: `${user.given_name} ${user.family_name}`.trim(),
          preferred_username: user.preferred_username,
          domainId: (user?.preferred_username?.split('@')[0] || user?.email?.split('@')[0] || 'AG04333')
        });
      }).catch(console.error);
    }
  }, [authState, oktaAuth]);

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

  const loadExistingConversation = (conversationId) => {
    try {
      // API-only mode - no static data or localStorage
      console.warn('🔍 Conversation loading from API only. ConversationId:', conversationId);
      
      // Create empty thread and let ChatPage handle API loading
      const emptyThread = {
        id: conversationId,
        title: 'Loading...',
        conversation: []
      };
      
      setCurrentThread(emptyThread);
      setUserQuestion('');
      setIsNewChat(false);
      setIsNewChatActive(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
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

    // Note: Thread saving now handled via API in ChatPage component
  };

  const handleThreadSelect = (thread) => {
    setCurrentThread(thread);
    setIsNewChat(false);
    setIsNewChatActive(false);
    setUserQuestion('');
    navigate('/resultpage');
  };

  const handleFirstMessage = (newThread) => {
    setIsNewChatActive(false);
    setCurrentThread(newThread);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="App">
            <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} userInfo={userInfo} />
          </div>
        }
      />
      <Route
        path="/pulseembedded"
        element={
          <div className="App">
            <PulseEmbedded userInfo={userInfo} />
          </div>
        }
      />
      <Route
        path="/pulseembedded_old"
        element={
          <div className="App">
            <PulseEmbeddedOld userInfo={userInfo} />
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
              userInfo={userInfo}
            />
          </div>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={() => {}}>
        <ThemeProvider>
          <PrivateRoute>
            <AppContent />
          </PrivateRoute>
        </ThemeProvider>
      </Security>
    </BrowserRouter>
  );
}

export default App;
