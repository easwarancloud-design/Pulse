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

  // When landing on the result page directly (including iframe -> top GET#hash):
  // 1) Try to consume session context (same-origin or parent-set)
  // 2) Else parse search or hash params to construct context
  useEffect(() => {
    if (location.pathname !== '/resultpage') return;
    // Avoid reapplying
    if (appliedContextTokenRef.current) return;

    // Try session context first
    let ctx = null;
    try { ctx = consumeContextFromSession(); } catch {}

    // If no session, parse search or hash
    if (!ctx && typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
      const hash = new URLSearchParams(rawHash);
      const params = (search && (search.get('type') || search.get('question') || search.get('conversationId'))) ? search : hash;
      if (params) {
        const type = params.get('type') || null;
        const question = params.get('question') || '';
        const conversationId = params.get('conversationId') || null;
        const ru = params.get('returnUrl') || '/';
        ctx = {
          token: `nav_${Date.now()}`,
          timestamp: Date.now(),
          type,
          question,
          conversationId,
          returnUrl: ru,
          source: 'hash',
        };
      }
    }

    if (!ctx) {
      // Standalone access: initialize a clean new chat with welcome message
      const baseThreadId = `thread_${Date.now()}`;
      const newThread = { id: baseThreadId, title: 'New Chat', conversation: [] };
      setCurrentThread(newThread);
      setUserQuestion('');
      setIsNewChat(true);
      setIsNewChatActive(true);
      setReturnUrl('/pulsemain');
      return;
    }

    appliedContextTokenRef.current = ctx.token || 'applied';
    setReturnUrl(ctx.returnUrl || '/');

    const normalizedQuestion = (ctx.question || '').trim();
    const baseThreadId = `thread_${Date.now()}`;

    if (ctx.conversationId) {
      // Load existing conversation
      loadExistingConversation(
        ctx.conversationId,
        setCurrentThread,
        setUserQuestion,
        setIsNewChat,
        setIsNewChatActive,
        () => {
          // Fallback to new chat if not found
          const newThread = { id: baseThreadId, title: 'New Chat', conversation: [] };
          setCurrentThread(newThread);
          setUserQuestion('');
          setIsNewChat(true);
          setIsNewChatActive(true);
        }
      );
    } else if (ctx.type === 'predefined' && normalizedQuestion) {
      // New chat, prefill input, no auto-response
      const newThread = { id: baseThreadId, title: 'New Chat', conversation: [] };
      setCurrentThread(newThread);
      setUserQuestion(normalizedQuestion);
      setIsNewChat(true);
      setIsNewChatActive(true);
    } else if (ctx.type === 'manual' && normalizedQuestion) {
      // Manual question: show user message and response immediately
      const newThread = {
        id: baseThreadId,
        title: normalizedQuestion.length > 50 ? normalizedQuestion.substring(0, 50) + '...' : normalizedQuestion,
        conversation: [ { type: 'user', text: normalizedQuestion } ]
      };
      setCurrentThread(newThread);
      setUserQuestion('');
      setIsNewChat(false);
      setIsNewChatActive(false);
    } else if (normalizedQuestion) {
      // Default: treat as predefined text in input
      const newThread = { id: baseThreadId, title: 'New Chat', conversation: [] };
      setCurrentThread(newThread);
      setUserQuestion(normalizedQuestion);
      setIsNewChat(true);
      setIsNewChatActive(true);
    }
    // Optional: clean URL hash/search token once applied to keep URL tidy
    try {
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {}
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
    // Prefer explicit returnUrl (can be absolute or path). Fallbacks: parentReturnUrl, then '/pulsemain', then '/'
    const destination = returnUrl || parentReturnUrl || '/pulsemain' || '/';
    const inIframe = typeof window !== 'undefined' && window.top && window.top !== window.self;
    if (inIframe) {
      // Navigate top window to the destination; supports absolute URLs and paths relative to parent origin
      window.top.location.href = destination;
      return;
    }
    if (/^https?:\/\//i.test(destination)) {
      window.location.href = destination;
    } else {
      navigate(destination);
    }
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
