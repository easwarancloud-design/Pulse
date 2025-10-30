// appLogic.js
import { useCallback } from 'react';

export const RESULT_CONTEXT_STORAGE_KEY = 'aiResultNavigationContext';
export const DEFAULT_RESULT_BASE_ORIGIN = 'http://localhost:3002';
export const DEFAULT_PARENT_RETURN_URL = 'http://localhost:3003';

export function getStaticThreadsData() {
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
}

export function storeContextForResultPage(context) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(RESULT_CONTEXT_STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.warn('Failed to persist result page context.', error);
  }
}

export function consumeContextFromSession() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(RESULT_CONTEXT_STORAGE_KEY);
    if (!stored) return null;
    sessionStorage.removeItem(RESULT_CONTEXT_STORAGE_KEY);
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to read stored result page context.', error);
    sessionStorage.removeItem(RESULT_CONTEXT_STORAGE_KEY);
    return null;
  }
}

export function buildResultUrl(context, resultBaseOrigin) {
  const url = new URL('/resultpage', resultBaseOrigin);
  if (context.token) url.searchParams.set('token', context.token);
  if (context.type) url.searchParams.set('type', context.type);
  if (context.mode) url.searchParams.set('mode', context.mode);
  if (context.question) url.searchParams.set('question', context.question);
  if (context.conversationId) url.searchParams.set('conversationId', context.conversationId);
  if (context.source) url.searchParams.set('source', context.source);
  if (context.threadId) url.searchParams.set('threadId', context.threadId);
  if (context.returnUrl) url.searchParams.set('returnUrl', context.returnUrl);
  return url.toString();
}

export function attemptTopNavigation(targetUrl) {
  if (typeof window === 'undefined') return false;
  if (window.top && window.top !== window.self) {
    try {
      window.top.location.href = targetUrl;
      return true;
    } catch (error) {
      console.warn('Top-level navigation blocked; falling back to new tab.', error);
    }
  }
  return false;
}

export function openResultInNewTab(targetUrl) {
  if (typeof window === 'undefined') return;
  const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  if (!newWindow) {
    console.error('Unable to open result page in a new tab (popup may be blocked).');
  }
}

export function loadExistingConversation(conversationId, setCurrentThread, setUserQuestion, setIsNewChat, setIsNewChatActive, handleNewChat) {
  try {
    const staticThreads = getStaticThreadsData();
    let foundThread = staticThreads.find(thread => thread.id === conversationId);
    if (!foundThread) {
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
      handleNewChat();
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
    handleNewChat();
  }
}

export function getFirstTodayThread() {
  let threadsData;
  try {
    const stored = localStorage.getItem('chatThreads');
    if (stored) {
      threadsData = JSON.parse(stored);
    }
  } catch {}
  if (!threadsData || !threadsData.today || threadsData.today.length === 0) {
    threadsData = { today: getStaticThreadsData() };
  }
  return threadsData.today && threadsData.today.length > 0 ? threadsData.today[0] : null;
}
