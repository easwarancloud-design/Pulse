// Utility functions for handling POST data and session management
// for the iframe breakout functionality

/**
 * Extract POST data from URL parameters or sessionStorage
 * This is a client-side workaround since React doesn't handle POST directly
 */
export const extractPostData = () => {
  try {
    // First, check if we have data in sessionStorage (from POST redirect)
    const sessionData = sessionStorage.getItem('pulsePostData');
    if (sessionData) {
      const data = JSON.parse(sessionData);
      // Clear the data after reading to prevent reuse
      sessionStorage.removeItem('pulsePostData');
      return data;
    }

    // Check URL hash for POST data (workaround for form submission)
    const hash = window.location.hash;
    if (hash && hash.startsWith('#postData=')) {
      const postDataParam = hash.substring('#postData='.length);
      const data = JSON.parse(decodeURIComponent(postDataParam));
      // Clear the hash
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
      return data;
    }

    // Check URL parameters as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const postDataParam = urlParams.get('postData');
    if (postDataParam) {
      return JSON.parse(decodeURIComponent(postDataParam));
    }

    return null;
  } catch (error) {
    console.error('Error extracting POST data:', error);
    return null;
  }
};

/**
 * Store POST data temporarily in sessionStorage
 * This simulates server-side session handling on the client
 */
export const storePostData = (data) => {
  try {
    sessionStorage.setItem('pulsePostData', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error storing POST data:', error);
    return false;
  }
};

/**
 * Create a thread object from POST data
 */
export const createThreadFromPostData = (postData) => {
  if (!postData) return null;

  if (postData.type === 'thread') {
    try {
      const conversation = postData.conversation ? JSON.parse(postData.conversation) : [];
      return {
        id: postData.threadId,
        title: postData.threadTitle,
        conversation: conversation
      };
    } catch (error) {
      console.error('Error parsing thread conversation:', error);
      return {
        id: postData.threadId,
        title: postData.threadTitle,
        conversation: []
      };
    }
  }

  if (postData.type === 'predefined' || postData.type === 'manual') {
    // Create a new thread for the question
    return {
      id: 'thread_' + Date.now(),
      title: postData.question.length > 50 ? postData.question.substring(0, 50) + '...' : postData.question,
      conversation: postData.type === 'manual' ? [
        {
          type: 'user',
          text: postData.question
        }
      ] : []
    };
  }

  return null;
};

/**
 * Get URL parameters for fallback navigation
 */
export const getUrlParams = () => {
  return new URLSearchParams(window.location.search);
};

/**
 * Check if the current page was accessed via iframe breakout
 */
export const isIframeBreakout = () => {
  try {
    // Check if there's POST data indicating iframe breakout
    const postData = extractPostData();
    if (postData && postData.source === 'pulseembedded') {
      return true;
    }
    
    // Check URL parameters for iframe breakout indicators
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fromPost') === 'true') {
      return true;
    }
    
    // Check sessionStorage for recent iframe breakout
    const sessionData = sessionStorage.getItem('pulsePostData');
    if (sessionData) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Get the static threads data (same as in App.js)
 */
export const getStaticThreadsData = () => {
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

/**
 * Load existing conversation by ID (checks both static and localStorage)
 */
export const loadExistingConversation = (conversationId) => {
  try {
    // First check static threads
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
    
    return foundThread;
  } catch (error) {
    console.error('Error loading conversation:', error);
    return null;
  }
};

/**
 * Determine initialization mode based on available data
 */
export const getInitializationMode = () => {
  const postData = extractPostData();
  const urlParams = getUrlParams();
  
  if (postData) {
    return {
      mode: 'postData',
      data: postData
    };
  }
  
  if (urlParams.get('threadId')) {
    return {
      mode: 'urlThread',
      data: {
        threadId: urlParams.get('threadId'),
        title: urlParams.get('title')
      }
    };
  }
  
  if (urlParams.get('question')) {
    return {
      mode: 'urlQuestion',
      data: {
        question: urlParams.get('question'),
        type: urlParams.get('type') || 'manual'
      }
    };
  }
  
  return {
    mode: 'default',
    data: null
  };
};