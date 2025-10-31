import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import PulseEmbedded from './PulseEmbedded';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { extractPostData, createThreadFromPostData, getInitializationMode } from './utils/postDataUtils';
import './App.css';

function AppContent() {
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const [postData, setPostData] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for POST data and URL parameters on component mount and route changes
  useEffect(() => {
    const initMode = getInitializationMode();
    
    if (initMode.mode === 'postData') {
      setPostData(initMode.data);
      
      // If we're not on resultpage, navigate there
      if (location.pathname !== '/resultpage') {
        navigate('/resultpage', { replace: true });
      }
    } else if (location.pathname === '/resultpage') {
      // Check for URL parameters (from embedded component)
      const urlParams = new URLSearchParams(location.search);
      const query = urlParams.get('q');
      const source = urlParams.get('source');
      const threadId = urlParams.get('threadId');
      
      if (query) {
        console.log('Processing URL parameters:', { query, source, threadId });
        
        if (threadId) {
          // Load existing conversation by ID
          loadExistingConversation(threadId);
        } else if (source === 'predefined') {
          // Predefined question - create new chat with question in input field
          setUserQuestion(query); // This will be used to pre-fill the input
          setIsNewChat(true);
          setIsNewChatActive(true);
          
          const newThread = {
            id: 'thread_' + Date.now(),
            title: 'New Chat', // Start with "New Chat" title
            conversation: []
          };
          setCurrentThread(newThread);
        } else {
          // Manual input - create new chat with immediate response
          setUserQuestion(''); // Clear since we'll show response immediately
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
        
        // Clean up URL by removing search parameters
        navigate('/resultpage', { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  const navigateToResults = (question, conversationId = null, type = null) => {
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
    
    // Navigate to result page
    navigate('/resultpage');
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
    setUserQuestion('');
    setCurrentThread(null);
    setIsNewChat(false);
    setIsNewChatActive(false);
    
    // Navigate back to main page
    navigate('/');
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
          <PrivateRoute authService={authService}>
            {(user) => (
              <div className="App">
                <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} user={user} authService={authService} />
              </div>
            )}
          </PrivateRoute>
        } 
      />
      <Route 
        path="/pulsemain" 
        element={
          <PrivateRoute authService={authService}>
            {(user) => (
              <div className="App">
                <PulseMain onSearch={navigateToResults} onNewChat={handleNewChat} user={user} authService={authService} />
              </div>
            )}
          </PrivateRoute>
        } 
      />
      <Route 
        path="/pulse" 
        element={<PulseEmbedded />} 
      />
      <Route 
        path="/pulseembedded" 
        element={
          <PrivateRoute authService={authService}>
            {(user) => <PulseEmbedded user={user} authService={authService} />}
          </PrivateRoute>
        } 
      />
      <Route 
        path="/resultpage" 
        element={
          <PrivateRoute authService={authService}>
            {(user) => (
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
                  postData={postData}
                  onPostDataProcessed={() => setPostData(null)}
                  user={user}
                  authService={authService}
                />
              </div>
            )}
          </PrivateRoute>
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
