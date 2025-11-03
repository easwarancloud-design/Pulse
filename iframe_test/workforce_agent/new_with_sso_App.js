import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';
import { Security, useOktaAuth } from '@okta/okta-react';
import { oktaAuth } from './oktaConfig';
import PrivateRoute from './PrivateRoute';

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

  const loadExistingConversation = (conversationId) => {
    try {
      // First check MenuSidebarDark for static data
      const staticThreads = getStaticThreadsData();
      let foundThread = staticThreads.find(thread => thread.id === conversationId);

      if (!foundThread) {
        // Check localStorage for saved threads
        const stored = localStorage.getItem('chatThreads');
        if (stored) {
          const threadsData = JSON.parse(stored);
          const allStoredThreads = [
            ...(threadsData.today || []),
            ...(threadsData.yesterday || []),
            ...(threadsData.lastWeek || []),
            ...(threadsData.last30Days || [])
          ];
          foundThread = allStoredThreads.find(thread => thread.id === conversationId);
        }
      }

      if (foundThread) {
        setCurrentThread(foundThread);
        setUserQuestion('');
        setIsNewChat(false);
        setIsNewChatActive(false);
      } else {
        console.error('Conversation not found:', conversationId);
        // Fallback to new chat
        handleNewChat();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      handleNewChat();
    }
  };

  // Helper function to get static threads from MenuSidebarDark
  const getStaticThreadsData = () => {
    // This should match the data structure in MenuSidebarDark.jsx
    return [
      {
        id: 'lw1',
        title: 'Can you create a service IT ticket for me ...',
        conversation: [
          { type: 'user', text: 'Can you create a service IT ticket for me to reset my password?' },
          { type: 'assistant', text: 'I\'d be happy to help you create a service IT ticket for password reset. Let me guide you through the process.' }
        ]
      },
      {
        id: 'lw2',
        title: 'Can you find confluence pages related ...',
        conversation: [
          { type: 'user', text: 'Can you find confluence pages related to our project documentation?' },
          { type: 'assistant', text: 'I\'ll search for confluence pages related to your project. Here are the relevant documents I found...' }
        ]
      },
      {
        id: 'lw3',
        title: 'What are the latest project updates for ...',
        conversation: [
          { type: 'user', text: 'What are the latest project updates for the Q4 initiatives?' },
          { type: 'assistant', text: 'Here are the latest updates for your Q4 initiatives based on the most recent data...' }
        ]
      },
      {
        id: 'lw4',
        title: 'What are the key metrics we should ...',
        conversation: [
          { type: 'user', text: 'What are the key metrics we should track for our team performance?' },
          { type: 'assistant', text: 'Based on your team\'s objectives, here are the key performance metrics you should track...' }
        ]
      },
      {
        id: 'l30d1',
        title: 'How do I access the company VPN ...',
        conversation: [
          { type: 'user', text: 'How do I access the company VPN from my home office?' },
          { type: 'assistant', text: 'Here\'s a step-by-step guide to access the company VPN from your home office...' }
        ]
      },
      {
        id: 'l30d2',
        title: 'What are the holiday schedules for ...',
        conversation: [
          { type: 'user', text: 'What are the holiday schedules for this year?' },
          { type: 'assistant', text: 'Here are the company holiday schedules for this year...' }
        ]
      }
    ];
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

    // Save the new thread to localStorage in the grouped format
    try {
      const stored = localStorage.getItem('chatThreads');
      let threadsData;

      if (stored) {
        threadsData = JSON.parse(stored);
        // Ensure the structure exists
        if (!threadsData.today) threadsData.today = [];
        if (!threadsData.yesterday) threadsData.yesterday = [];
        if (!threadsData.lastWeek) threadsData.lastWeek = [];
        if (!threadsData.last30Days) threadsData.last30Days = [];
      } else {
        // Create the initial structure if none exists
        threadsData = {
          today: [],
          yesterday: [],
          lastWeek: [],
          last30Days: []
        };
      }

      // Add the new thread to today's category
      threadsData.today.unshift(newThread);

      localStorage.setItem('chatThreads', JSON.stringify(threadsData));
    } catch (error) {
      console.error('Error saving new thread to localStorage:', error);
    }
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
            <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} />
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

// function App() {
//   return (
//     <ThemeProvider>
//       <Router>
//         <AppContent />
//       </Router>
//     </ThemeProvider>
//   );
// }


function App() {
    return (
      <BrowserRouter>
          <Security oktaAuth={oktaAuth} restoreOriginalUri={() => {}}>
             <ThemeProvider>
            <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AppContent />
                </PrivateRoute>
              }
            />
            <Route
              path="/resultpage"
              element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/pulsemain"
              element={
                <PrivateRoute>
                  <PulseMain />
                </PrivateRoute>
              }
            />
              <Route
              path="/pulseembedded"
              element={
                <PrivateRoute>
                  <PulseEmbedded />
                </PrivateRoute>
              }
            />
          </Routes>
            </ThemeProvider>
        </Security>
      </BrowserRouter>
    );
  }

export default App;
