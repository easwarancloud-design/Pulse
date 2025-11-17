import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import PulseEmbeddedOld from './PulseEmbeddedOld';
import ChatServiceTester from './components/ChatServiceTester';
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
      // Try to load the full conversation from API
      const fullConversation = await hybridChatService.getConversation(thread.id);
      
      if (fullConversation && fullConversation.conversation) {
        // Use the full conversation data from API
        setCurrentThread({
          ...thread,
          conversation: fullConversation.conversation
        });
      } else {
        // Fall back to the thread data we already have
        setCurrentThread(thread);
      }
    } catch (error) {
      console.error('Error loading conversation from API, using cached data:', error);
      // Fall back to the thread data we already have
      setCurrentThread(thread);
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
        path="/test-chat-service" 
        element={
          <div className="App">
            <ChatServiceTester />
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
