import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import './App.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  RESULT_CONTEXT_STORAGE_KEY,
  DEFAULT_RESULT_BASE_ORIGIN,
  DEFAULT_PARENT_RETURN_URL,
  getStaticThreadsData,
  storeContextForResultPage,
  consumeContextFromSession,
  buildResultUrl,
  attemptTopNavigation,
  openResultInNewTab,
  loadExistingConversation,
  getFirstTodayThread
} from './appLogic';

function AppContent() {
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [returnUrl, setReturnUrl] = useState('/');
  const appliedContextTokenRef = useRef(null);
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_RESULT_BASE_ORIGIN;
  const resultBaseOrigin = process.env.REACT_APP_RESULT_BASE_ORIGIN || runtimeOrigin;
  const parentReturnUrl = process.env.REACT_APP_PARENT_RETURN_URL || DEFAULT_PARENT_RETURN_URL;

  useEffect(() => {
    if (location.pathname !== '/resultpage') {
      appliedContextTokenRef.current = null;
      setReturnUrl('/');
    }
  }, [location.pathname]);

  // Restore navigation logic for iframe/fullscreen
  // ...existing code...

  const navigateToResults = (question, conversationId = null, type = null) => {
    const normalizedQuestion = (question || '').trim();
    const timestamp = Date.now();
    const navigationToken = `nav_${timestamp}`;
    const baseThreadId = `thread_${timestamp}`;
    const inIframe = typeof window !== 'undefined' && window.top && window.top !== window.self;
  const docReferrer = typeof document !== 'undefined' ? document.referrer : '';
  // If embedded in iframe, prefer referrer or configured parentReturnUrl.
  // Otherwise, return to the current route (e.g., '/' or '/pulsemain').
  const returnTarget = inIframe ? (docReferrer || parentReturnUrl) : (location?.pathname || '/');
    const context = {
      token: navigationToken,
      timestamp,
      question: normalizedQuestion,
      conversationId: conversationId || null,
      type: type || null,
      source: 'pulse-hero',
      returnUrl: returnTarget
    };

    setReturnUrl(returnTarget);

    if (conversationId) {
      context.mode = 'existing';
      loadExistingConversation(conversationId, setCurrentThread, setUserQuestion, setIsNewChat, setIsNewChatActive, () => {});
      context.isNewChat = false;
      context.isNewChatActive = false;
      context.userQuestion = '';
    } else if (type === 'predefined' && normalizedQuestion) {
      // For predefined, set up a new chat with question in input, no conversation, wait for user submit
      const newThread = {
        id: baseThreadId,
        title: 'New Chat',
        conversation: []
      };
      setUserQuestion(normalizedQuestion);
      setIsNewChat(true);
      setIsNewChatActive(true);
      setCurrentThread(newThread);

      // Capture referrer or parent URL for return
  const docReferrer = typeof document !== 'undefined' ? document.referrer : '';
  const returnTarget = inIframe ? (docReferrer || parentReturnUrl) : (location?.pathname || '/');
      context.mode = 'predefined';
      context.userQuestion = normalizedQuestion;
      context.isNewChat = true;
      context.isNewChatActive = true;
      context.currentThread = newThread;
      context.threadId = newThread.id;
      context.returnUrl = returnTarget;
      storeContextForResultPage(context);
      const targetUrl = buildResultUrl(context, resultBaseOrigin);
      if (inIframe) {
        window.top.location.href = targetUrl;
      } else {
        navigate(targetUrl.replace(resultBaseOrigin, ''));
      }
      return;
    } else if (type === 'manual' && normalizedQuestion) {
      // For manual, set up a new thread and show response immediately
      const newThread = {
        id: baseThreadId,
        title: normalizedQuestion.length > 50 ? normalizedQuestion.substring(0, 50) + '...' : normalizedQuestion,
        conversation: [
          {
            type: 'user',
            text: normalizedQuestion
          }
        ]
      };
      setUserQuestion('');
      setIsNewChat(false);
      setIsNewChatActive(false);
      setCurrentThread(newThread);

      context.mode = 'manual';
      context.currentThread = newThread;
      context.threadId = newThread.id;
      context.isNewChat = false;
      context.isNewChatActive = false;
      context.userQuestion = '';
    } else if (type === 'manual' && normalizedQuestion) {
      const newThread = {
        id: baseThreadId,
        title: normalizedQuestion.length > 50 ? normalizedQuestion.substring(0, 50) + '...' : normalizedQuestion,
        conversation: [
          {
            type: 'user',
            text: normalizedQuestion
          }
        ]
      };
      setUserQuestion('');
      setIsNewChat(false);
      setIsNewChatActive(false);
      setCurrentThread(newThread);

      context.mode = 'manual';
      context.currentThread = newThread;
      context.threadId = newThread.id;
      context.isNewChat = false;
      context.isNewChatActive = false;
      context.userQuestion = '';
    } else if (normalizedQuestion) {
      const newThread = {
        id: baseThreadId,
        title: normalizedQuestion.length > 50 ? normalizedQuestion.substring(0, 50) + '...' : normalizedQuestion,
        conversation: []
      };
      setUserQuestion(normalizedQuestion);
      setIsNewChat(false);
      setIsNewChatActive(false);
      setCurrentThread(newThread);

      context.mode = 'default';
      context.currentThread = newThread;
      context.threadId = newThread.id;
      context.isNewChat = false;
      context.isNewChatActive = false;
      context.userQuestion = normalizedQuestion;
    }

    storeContextForResultPage(context);

    const targetUrl = buildResultUrl(context, resultBaseOrigin);

    if (inIframe) {
      const navigated = attemptTopNavigation(targetUrl);
      if (!navigated) {
        openResultInNewTab(targetUrl);
      }
    } else {
      navigate('/resultpage');
    }
  };

  // Back navigation handler
  const handleBack = () => {
    // Always use parentReturnUrl if in iframe or if context.returnUrl is set
    const destination = returnUrl || parentReturnUrl || '/';
    if (window.top && window.top !== window.self) {
      window.top.location.href = parentReturnUrl;
    } else if (/^https?:\/\//i.test(destination)) {
      window.location.href = destination;
    } else {
      navigate(destination);
    }
    // ...existing code...
  };

  // Start a new chat and navigate to result page
  const handleNewChat = () => {
    const ts = Date.now();
    const newThread = { id: `thread_${ts}`, title: 'New Chat', conversation: [] };
    setCurrentThread(newThread);
    setUserQuestion('');
    setIsNewChat(true);
    setIsNewChatActive(true);
    navigate('/resultpage');
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
        path="/resultpage"
        element={
          <div className="App">
            <ChatPage
              onBack={handleBack}
              userQuestion={userQuestion}
              onToggleTheme={toggleTheme}
              isDarkMode={isDarkMode}
              currentThread={currentThread}
              isNewChat={isNewChat}
              isNewChatActive={isNewChatActive}
              onNewChat={handleNewChat}
              onThreadSelect={() => {}}
              onFirstMessage={() => {}}
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
