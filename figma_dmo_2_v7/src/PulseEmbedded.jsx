import React, { useState, useEffect, useRef } from 'react';
import ChatIcon from './components/ChatIcon';
import { fetchPredefinedQuestions } from './services/predefinedQuestionsService';
import hybridChatService from './services/hybridChatService';
import { API_ENDPOINTS } from './config/api';

// Utility function to detect if running inside iframe
const isInIframe = () => {
  try {
    return window !== window.parent;
  } catch (e) {
    // Cross-origin iframe will throw error when accessing parent
    return true;
  }
};

// Utility function to capture parent URL safely
const getParentUrl = () => {
  try {
    // Try to get parent URL if same-origin
    return window.parent.location.href;
    // return 'https://qa1-pulse-next.elevancehealth.com/v3/home';
  } catch (e) {
    // Cross-origin - use document.referrer as fallback
    return document.referrer || window.location.href;
  }
};

// Universal form submission handler (always use form submit on this page)
const handleFormSubmission = (query, type = 'manual', additionalData = {}) => {

  console.group('🚀 DYNAMIC FORM SUBMISSION STARTED (PulseEmbedded)');
  console.log('📝 Input parameters:', { query, type, additionalData });

  // Create form element
  const form = document.createElement('form');
  form.method = 'GET';
  // Always route to the current app's origin (where this embedded app is running)
  // Example: http://localhost:3002/resultpage in local dev
  form.action = `${window.location.origin}/resultpage`;
  form.target ='_top'; // Break out of iframe
  form.style.display = 'none';

  console.log('🏗️ Form element created with attributes:', {
    method: form.method,
    action: form.action,
    target: form.target,
    display: form.style.display
  });

  // Resolve parent URL for back navigation (PulseEmbedded-specific behavior)
  const DEFAULT_PARENT_URL = 'https://qa1-pulse-next.elevancehealth.com/v3/home';
  const candidateParentUrl = (typeof window !== 'undefined' && window.__PULSE_PARENT_URL) || document.referrer || '';
  const resolvedParentUrl = candidateParentUrl && candidateParentUrl.trim().length > 0
    ? candidateParentUrl
    : DEFAULT_PARENT_URL;

  console.log('🔗 Resolved parentUrl for submission:', {
    __PULSE_PARENT_URL: (typeof window !== 'undefined' && window.__PULSE_PARENT_URL) || null,
    documentReferrer: document.referrer || null,
    chosen: resolvedParentUrl
  });

  // Prepare all form data
  const formData = {
    query: query,
    type: type,
    // Include any caller-provided data first
    ...additionalData,
    // Always include iframe context flags and trusted parent URL for back navigation.
    // Prefer dynamic parent URL captured via postMessage, then referrer; fallback to QA1 default for PulseEmbedded.
    fromIframe: 'true',
    parentUrl: resolvedParentUrl,
    selfUrl: window.location.href
  };

  console.log('📦 Complete form data to be sent:', formData);

  // Create and append input fields
  console.log('➕ Creating hidden input fields:');
  Object.keys(formData).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
    form.appendChild(input);

    console.log(`   📋 ${key}: "${formData[key]}"`);
  });

  // Log complete form HTML
  console.log('🏗️ Complete form HTML structure:', form.outerHTML);

  // Create FormData object for verification
  const formDataObj = new FormData(form);
  console.log('📋 FormData verification:');
  for (let [key, value] of formDataObj.entries()) {
    console.log(`   ✅ ${key}: "${value}"`);
  }

  // Append to DOM
  document.body.appendChild(form);
  console.log('✅ Form appended to DOM body');

  // Submit immediately (removed artificial 2s delay used for earlier debugging)
  console.log('🚀 Submitting form immediately - navigating to results page!');
  form.submit();
  console.groupEnd();

  return true; // Always use form submission on this page
};

// Accept domainId directly (single source of truth from AppContent)
const PulseEmbedded = ({ userInfo, domainId }) => {
  // Guard refs to avoid duplicate fetch logging in React 18 StrictMode while still allowing domainId changes
  const lastFetchedDomainIdRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [allThreads, setAllThreads] = useState([]);
  const [showAboutBox, setShowAboutBox] = useState(false);
  // Track which source populated the threads list for logging/diagnostics ('api' | 'hybrid' | 'none')
  const [threadsSourceState, setThreadsSourceState] = useState('none');

  // Predefined questions (dynamic, with fallback defaults)
  const [allQuestions, setAllQuestions] = useState([
    'What is the process for employees to access or review the company’s HR policies?',
    "How often are HR policies reviewed or updated, and who is responsible for that review?",
    "Are employees required to acknowledge that they have read and understood HR policies?",
    "How are policy changes communicated to employees across the organization?",
    "What should employees do if they are uncertain about the interpretation of a policy?",
    "What is the company’s policy on paid time off (PTO), and how is it accrued?",
    "How should employees request vacation or sick leave, and what notice is required?",
    "What is the policy for unplanned absences or emergencies?",
    "Are there specific guidelines for working remotely or flexible scheduling?"
  ]);

  // Fetch predefined questions on mount (mimic PulseEmbeddedOld logic)
  useEffect(() => {
    const loadPredefinedQuestions = async () => {
      const effectiveDomainId = domainId || userInfo?.domainId || userInfo?.domain_id || null;
      if (!effectiveDomainId) {
        console.warn('⚠️ No domainId for predefined questions in PulseEmbedded; skipping fetch');
        return;
      }
      try {
        const questions = await fetchPredefinedQuestions(effectiveDomainId);
        if (Array.isArray(questions) && questions.length > 0) {
          setAllQuestions(questions);
        }
      } catch (e) {
        console.warn('⚠️ Failed to fetch predefined questions, using fallback set:', e.message);
      }
    };
    loadPredefinedQuestions();
  }, [domainId, userInfo?.domainId, userInfo?.domain_id]);

  // Send dropdown data to parent window for overlay display
  const showDropdownInParent = (suggestions, inputRect) => {
    if (isInIframe() && window.parent) {
      try {
        // Test if parent supports our integration
        window.parent.postMessage({
          type: 'PULSE_INTEGRATION_TEST'
        }, '*');

        // Wait for response to see if parent supports enhanced integration
        setTimeout(() => {
          // If no response received, parent doesn't support enhanced mode
          // We'll use internal dropdown with reduced suggestions
        }, 100);

        window.parent.postMessage({
          type: 'PULSE_SHOW_DROPDOWN',
          data: {
            suggestions,
            position: {
              x: inputRect.left,
              y: inputRect.bottom,
              width: inputRect.width
            },
            iframeId: 'pulseIframe' // Help parent identify which iframe
          }
        }, '*');
      } catch (error) {
        console.error('Cannot send message to parent:', error);
        // Fallback to internal dropdown
        setShowSuggestions(true);
      }
    }
  };

  // Hide dropdown in parent window
  const hideDropdownInParent = () => {
    if (isInIframe() && window.parent) {
      try {
        window.parent.postMessage({
          type: 'PULSE_HIDE_DROPDOWN'
        }, '*');
      } catch (error) {
        console.error('Cannot send message to parent:', error);
      }
    }
  };

  // Listen for dropdown selection from parent
  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data?.type === 'PULSE_DROPDOWN_SELECTION') {
        const suggestion = event.data.data;
        handleSuggestionClick(suggestion);
        return;
      }
      if (event?.data?.type === 'PULSE_INTEGRATION_SUPPORTED') {
        // Parent supports enhanced integration
        setParentSupportsBreakout(true);
      }

      // Capture parent URL from trusted origin for back navigation
      try {
        if (event.origin === 'https://qa1-pulse-next.elevancehealth.com' && event?.data?.PULSE_PAGE_URL) {
          console.log('[iFrame] message event received:', event);
          console.log('Message from parent:', event.data.PULSE_PAGE_URL);
          // Store globally so form submission (outside component scope) can read it
          if (typeof window !== 'undefined') {
            window.__PULSE_PARENT_URL = event.data.PULSE_PAGE_URL;
          }
        }
      } catch (_) {
        // ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // State to track if parent supports breakout
  const [parentSupportsBreakout, setParentSupportsBreakout] = React.useState(false);

  // Handle navigation to result page (iframe breakout or normal navigation)
  const navigateToResults = (question, conversationId = null, type = null) => {
    // Try form submission for iframe breakout first
    if (handleFormSubmission(question, type || 'manual', {
      conversationId: conversationId || '',
      fromPulseEmbedded: 'true'
    })) {
      // Form submission successful, exit early
      return;
    }

    // Fallback to original navigation for non-iframe contexts
    const params = new URLSearchParams({
      query: question,
      ...(conversationId && { conversationId }),
      ...(type && { type }),
      // Add iframe context information
      fromIframe: 'false',
      //parentUrl: 'pulseembedded'
      parentUrl: 'https://qa1-pulse-next.elevancehealth.com/v3/home'
    });

    const resultUrl = `/resultpage?${params.toString()}`;
    // Normal navigation within same window
    window.location.href = resultUrl;
  };

  // Load recent threads from API (with hybrid service fallback) - mimic PulseEmbeddedOld
  const loadThreadsFromAPI = async () => {
    const DEFAULT_DOMAIN_ID = domainId || userInfo?.domainId || userInfo?.domain_id || null;
    if (!DEFAULT_DOMAIN_ID) {
      console.warn('⚠️ No domainId for loading threads; skipping fetch');
      return [];
    }
    // Prevent starting a second simultaneous fetch (e.g., StrictMode double invoke) for same domain
    if (fetchInFlightRef.current) {
      console.log('↺ Skipping threads fetch: fetch already in flight for domainId:', DEFAULT_DOMAIN_ID);
      return [];
    }
    fetchInFlightRef.current = true;
    console.group('🧵 Conversation threads fetch (PulseEmbedded)');
    console.log('DomainID resolved:', DEFAULT_DOMAIN_ID);
    let threadsSource = 'none';
    try {
      // Attempt direct API call first
      const endpoint = `${API_ENDPOINTS.USER_CONVERSATIONS(DEFAULT_DOMAIN_ID)}?limit=10`;
      console.log('Attempting direct API fetch:', endpoint);
      const directResp = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (directResp.ok) {
        const raw = await directResp.json();
        console.log('📨 Raw API conversations payload:', raw);
        let conversations = raw;
        if (raw?.conversations) conversations = raw.conversations;
        if (raw?.data) conversations = raw.data;
        if (Array.isArray(conversations) && conversations.length > 0) {
          threadsSource = 'api';
          console.log(`✅ Source: direct API (${conversations.length} conversations)`);
          console.log('🧪 Mapped conversations sample (up to 3):', conversations.slice(0, 3));
          const mapped = conversations.map(conv => ({
            id: conv.id,
            title: conv.title || 'Untitled Conversation',
            conversation: (conv.messages || []).map(msg => ({
              type: msg.message_type,
              text: msg.content
            }))
          }));
          console.log('📄 Dropdown-ready mapped titles (first 5):', mapped.slice(0, 5).map(t => t.title));
          setThreadsSourceState('api');
          console.groupEnd();
          fetchInFlightRef.current = false;
          return mapped;
        }
        console.log('ℹ️ Direct API responded but no conversations array with items. Raw value:', raw);
      } else {
        console.warn('⚠️ Direct API conversations fetch failed (status):', directResp.status);
      }
    } catch (err) {
      console.warn('⚠️ Direct API error (will try hybrid fallback):', err.message);
    }

    // Hybrid service fallback
    try {
      if (!DEFAULT_DOMAIN_ID) return [];
      console.log('Attempting hybrid service fallback...');
      hybridChatService.setUserId(DEFAULT_DOMAIN_ID);
      const conversations = await hybridChatService.getConversationHistory(10);
      if (Array.isArray(conversations) && conversations.length > 0) {
        threadsSource = 'hybrid';
        console.log(`✅ Source: hybrid service (${conversations.length} conversations)`);
        const mapped = conversations.map(conv => ({
          id: conv.id,
          title: conv.title || 'Untitled Conversation',
          conversation: (conv.messages || []).map(msg => ({
            type: msg.message_type,
            text: msg.content
          }))
        }));
        console.log('📄 Dropdown-ready mapped titles (first 5):', mapped.slice(0, 5).map(t => t.title));
        setThreadsSourceState('hybrid');
        console.groupEnd();
        return mapped;
      }
      console.log('ℹ️ Hybrid service returned empty conversation list.');
    } catch (hybridErr) {
      console.warn('⚠️ Hybrid fallback failed:', hybridErr.message);
    }
    console.warn('⚠️ No conversations from API or hybrid service; returning empty array.');
    console.groupEnd();
    fetchInFlightRef.current = false;
    setThreadsSourceState('none');
    return [];
  };

  useEffect(() => {
    const effectiveDomainId = domainId || userInfo?.domainId || userInfo?.domain_id || null;
    if (!effectiveDomainId) return;
    // Skip if we already fetched for this domain (prevents StrictMode duplicate) but allow new domain changes
    if (lastFetchedDomainIdRef.current === effectiveDomainId) {
      return;
    }
    lastFetchedDomainIdRef.current = effectiveDomainId;
    (async () => {
      const threads = await loadThreadsFromAPI();
      // Only set if we actually received mapped threads (empty array acceptable)
      setAllThreads(Array.isArray(threads) ? threads : []);
      try {
        console.group('📥 Threads loaded for dropdown');
        console.log('Source:', threadsSourceState);
        console.log('Total threads:', Array.isArray(threads) ? threads.length : 0);
        console.log('Preview (first 5):', (Array.isArray(threads) ? threads : []).slice(0, 5).map(t => ({ id: t.id, title: t.title })));
        console.groupEnd();
      } catch (_) {}
    })();
  }, [domainId, userInfo?.domainId, userInfo?.domain_id]);

  // Get filtered suggestions based on search query
  const getFilteredSuggestions = (query) => {
    // First filter out "New Chat" titles
    const validThreads = allThreads.filter(thread =>
      thread.title && thread.title.trim() !== 'New Chat'
    );

    // If no data from API/hybrid, show placeholder entry
    if (!Array.isArray(allThreads) || validThreads.length === 0) {
      return [{ id: 'no-prev', title: 'No previous conversations', isPlaceholder: true }];
    }

    if (!query.trim()) {
      // Always show only 3 suggestions (user request)
      const top = validThreads.slice(0, 3);
      try {
        console.groupCollapsed('🔎 Suggestions (no query)');
        console.log('Source:', threadsSourceState, 'Available:', validThreads.length);
        console.log('Top 3:', top.map(t => ({ id: t.id, title: t.title })));
        console.groupEnd();
      } catch (_) {}
      return top;
    }

    // Filter threads by title containing the search query (case insensitive)
    const filtered = validThreads.filter(thread =>
      thread.title.toLowerCase().includes(query.toLowerCase())
    );

    // Always limit to 3 suggestions
    const limited = filtered.slice(0, 3);
    try {
      console.groupCollapsed('🔎 Suggestions (filtered)');
      console.log('Query:', query);
      console.log('Source:', threadsSourceState, 'Available:', validThreads.length, 'Matched:', filtered.length);
      console.log('Top 3:', limited.map(t => ({ id: t.id, title: t.title })));
      console.groupEnd();
    } catch (_) {}
    return limited;
  };

  // Handle input focus - show suggestions only if not already shown
  const handleInputFocus = () => {
    // Focus should not automatically open dropdown, let click handle it
    // This prevents unwanted opening when tabbing through elements
    const currentSuggestions = getFilteredSuggestions(searchQuery);
    try {
      console.log('👁️ Input focused. Current suggestions:', currentSuggestions.map(s => (typeof s === 'string' ? s : s.title)));
    } catch (_) {}
    setSuggestions(currentSuggestions);
  };

  // Handle input change - filter suggestions
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    const filteredSuggestions = getFilteredSuggestions(value);
    setSuggestions(filteredSuggestions);

    if (filteredSuggestions.length > 0) {
      if (isInIframe()) {
        // Try enhanced integration
        const inputElement = e.target;
        const rect = inputElement.getBoundingClientRect();
        showDropdownInParent(filteredSuggestions, rect);

        // Always show internal dropdown as fallback
        setShowSuggestions(true);
        try {
          console.log('📋 Showing dropdown (iframe mode). Items:', filteredSuggestions.map(s => (typeof s === 'string' ? s : s.title)));
        } catch (_) {}
      } else {
        // Normal dropdown
        setShowSuggestions(true);
        try {
          console.log('📋 Showing dropdown (inline). Items:', filteredSuggestions.map(s => (typeof s === 'string' ? s : s.title)));
        } catch (_) {}
      }
    } else {
      if (isInIframe()) {
        hideDropdownInParent();
        setShowSuggestions(false);
        try { console.log('📭 Hiding dropdown (no suggestions) [iframe]'); } catch (_) {}
      } else {
        setShowSuggestions(false);
        try { console.log('📭 Hiding dropdown (no suggestions)'); } catch (_) {}
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    // Ignore placeholder item
    if (suggestion?.isPlaceholder || suggestion?.id === 'no-prev') {
      setShowSuggestions(false);
      if (isInIframe()) hideDropdownInParent();
      return;
    }

    // Hide dropdown first
    if (isInIframe()) {
      hideDropdownInParent();
    } else {
      setShowSuggestions(false);
    }

    if (typeof suggestion === 'string') {
      try { console.log('🖱️ Predefined suggestion clicked:', suggestion); } catch (_) {}
      // Handle predefined question suggestions - use form submission if in iframe
      if (handleFormSubmission(suggestion, 'predefined', {
        fromSuggestion: 'true'
      })) {
        // Form submission successful, clear input and exit
        setSearchQuery('');
        return;
      }

      // Fallback for non-iframe contexts
      setSearchQuery('');
      navigateToResults(suggestion, null, 'predefined');
    } else {
      try { console.log('🖱️ Thread suggestion clicked:', { id: suggestion.id, title: suggestion.title }); } catch (_) {}
      // Handle thread suggestions - use form submission if in iframe
      if (handleFormSubmission(suggestion.title, 'thread', {
        conversationId: suggestion.id,
        fromThread: 'true'
      })) {
        // Form submission successful, clear input and exit
        setSearchQuery('');
        return;
      }

      // Fallback for non-iframe contexts
      setSearchQuery(suggestion.title);
      navigateToResults(suggestion.title, suggestion.id);
    }
  };

  // Handle input click - toggle dropdown state
  const handleInputClick = () => {
    if (showSuggestions) {
      // Close dropdown if already open
      if (isInIframe()) {
        hideDropdownInParent();
      }
      setShowSuggestions(false);
    } else {
      // Open dropdown if closed
      const currentSuggestions = getFilteredSuggestions(searchQuery);
      setSuggestions(currentSuggestions);

      if (currentSuggestions.length > 0) {
        if (isInIframe()) {
          // Try enhanced integration first
          const inputElement = document.querySelector('input[type="text"]');
          if (inputElement) {
            const rect = inputElement.getBoundingClientRect();
            showDropdownInParent(currentSuggestions, rect);
          }

          // Always show internal dropdown as fallback (with fewer items)
          setTimeout(() => {
            setShowSuggestions(true);
          }, 150);
        } else {
          // Normal dropdown
          setShowSuggestions(true);
        }
      }
    }
  };

  // Handle input blur - hide suggestions with delay to allow for clicks
  const handleInputBlur = () => {
    setTimeout(() => {
      if (isInIframe()) {
        hideDropdownInParent();
      } else {
        setShowSuggestions(false);
      }
    }, 200);
  };

  // Get current set of 3 questions
  const getCurrentQuestions = () => {
    const startIndex = currentQuestionSet * 3;
    return allQuestions.slice(startIndex, startIndex + 3);
  };

  const handleRefresh = () => {
    // Cycle through sets: 0 -> 1 -> 2 -> 0
    setCurrentQuestionSet((prev) => (prev + 1) % 3);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Try form submission for iframe breakout first
      if (handleFormSubmission(searchQuery.trim(), 'manual', {
        fromSearch: 'true'
      })) {
        // Form submission successful, clear input and exit
        setSearchQuery('');
        return;
      }

      // Fallback to normal navigation for non-iframe contexts
      navigateToResults(searchQuery.trim(), null, 'manual');
      setSearchQuery('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        //background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        gap: '24px'
      }}
    >
      <svg
        className="absolute"
        style={{
          width: '1437px',
          height: '697px',
          top: '-474px',
          left: '0',
          pointerEvents: 'none'
        }}
        width="1437"
        height="223"
        viewBox="0 0 1437 223"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="344.94" cy="-29" rx="344.94" ry="252" fill="url(#paint0_radial_6199_120697)"/>
        <ellipse cx="665.278" cy="-72.5" rx="352.974" ry="257.5" fill="url(#paint1_radial_6199_120697)"/>
        <ellipse cx="984.106" cy="-121" rx="263.099" ry="276" fill="url(#paint2_radial_6199_120697)"/>
        <ellipse cx="1203.53" cy="-127" rx="233.475" ry="347" fill="url(#paint3_radial_6199_120697)"/>
        <defs>
          <radialGradient id="paint0_radial_6199_120697" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(344.94 -29) rotate(90) scale(252 344.94)">
            <stop stopColor="#44B8F3" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#44B8F3" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="paint1_radial_6199_120697" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(665.278 -72.5) rotate(90) scale(257.5 352.974)">
            <stop stopColor="#44F3B3" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#44F3B3" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="paint2_radial_6199_120697" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(984.106 -121) rotate(90) scale(276 263.099)">
            <stop stopColor="#F8D666" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F8D666" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="paint3_radial_6199_120697" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1203.53 -127) rotate(90) scale(347 233.475)">
            <stop stopColor="#E3725F" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#E3725F" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>

      <div className="relative w-full" style={{ zIndex: 10 }}>
        {/* <div className="flex justify-between items-center mb-6">
          <div
            className="text-white"
            style={{
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '24px',
              fontWeight: '400',
              lineHeight: '150%'
            }}
          >
            Welcome, {userInfo?.firstName || 'User'}!
          </div>
        </div> */}

        <div className="flex flex-col items-start gap-2.5 w-full max-w-[1184px] mx-auto relative">
          <div
            className="flex items-center justify-between w-full px-4 py-3 gap-2"
            style={{
              height: '56px',
              borderRadius: '999px',
              border: '2px solid #2861BB',
              background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32.0003 15.9847C24.175 18.052 18.0679 24.1708 16.0156 32C13.9483 24.1748 7.8295 18.0677 0.000272721 16.0154C7.82554 13.9481 13.9326 7.82927 15.9849 4.3842e-05C18.0522 7.82532 24.171 13.9324 32.0003 15.9847Z" fill="url(#paint0_linear_6199_120715)"/>
                <defs>
                  <linearGradient id="paint0_linear_6199_120715" x1="24.9996" y1="15.3216" x2="24.3843" y2="6.17172" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#44B8F3"/>
                    <stop offset="1" stopColor="#7BFFFE"/>
                  </linearGradient>
                </defs>
              </svg>
              <input
                type="text"
                placeholder="What do you need to find today?"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                onBlur={handleInputBlur}
                onKeyPress={handleKeyPress}
                className="bg-transparent border-none outline-none flex-1 min-w-0"
                style={{
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '20px',
                  fontWeight: '400',
                  lineHeight: '150%',
                  width: 'auto',
                  maxWidth: '100%',
                  overflow: 'visible',
                  color: 'white',
                  '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.7)'
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-0 px-1 flex-shrink-0">
              <button
                onClick={handleSearch}
                className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M1.33333 0C0.596954 0 0 0.596954 0 1.33333V5.33333C0.000889163 5.8993 0.358985 6.40303 0.893229 6.58984C1.03457 6.64002 1.18336 6.66599 1.33333 6.66667C1.33811 6.66669 1.34288 6.66669 1.34766 6.66667L9.33333 8L1.34766 9.33463C1.34288 9.33418 1.33811 9.33374 1.33333 9.33333C1.18292 9.33386 1.03368 9.35983 0.891927 9.41016C0.358196 9.59741 0.000695057 10.101 0 10.6667V14.6667C0 15.403 0.596954 16 1.33333 16C1.56548 15.9996 1.79348 15.9385 1.99479 15.8229H1.99609L15.5938 8.61458L15.5951 8.61198C15.8403 8.50731 15.9995 8.26661 16 8C16.0004 7.73213 15.8403 7.49006 15.5938 7.38542L1.99609 0.177083C1.7944 0.0612606 1.56592 0.000212161 1.33333 0Z" fill="white"/>
                </svg>
              </button>
              <button className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9989 14C13.6776 14 15.0328 12.66 15.0328 11V5C15.0328 3.34 13.6776 2 11.9989 2C10.3202 2 8.9651 3.34 8.9651 5V11C8.9651 12.66 10.3202 14 11.9989 14ZM17.9756 11C17.48 11 17.0654 11.36 16.9845 11.85C16.5699 14.2 14.4968 16 11.9989 16C9.50107 16 7.42796 14.2 7.01333 11.85C6.93243 11.36 6.51781 11 6.02228 11C5.40541 11 4.91999 11.54 5.01101 12.14C5.50653 15.14 7.93359 17.49 10.9876 17.92V20C10.9876 20.55 11.4427 21 11.9989 21C12.5551 21 13.0102 20.55 13.0102 20V17.92C16.0643 17.49 18.4913 15.14 18.9868 12.14C19.088 11.54 18.5924 11 17.9756 11Z" fill="white" fillOpacity="0.3"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Suggestions Dropdown - Increased count for iframe, compact design */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 scrollbar-hide"
              style={{
                top: 'calc(100% + 1px)',
                width: '100%',
                maxWidth: '1184px',
                maxHeight: isInIframe() ? '180px' : '320px', // Increased height for 3 items
                borderRadius: '16px',
                border: '2px solid #2861BB',
                background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
                padding: '12px', // Increased padding since no header
                boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
                overflowY: 'auto'
              }}
            >
              {/* Scrollable content - compact for iframe */}
              <div
                style={{
                  maxHeight: isInIframe() ? '160px' : '300px',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                className="scrollbar-hide"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-start w-full hover:bg-white/10 cursor-pointer transition-all duration-200"
                    style={{
                      padding: isInIframe() ? '4px 6px' : '4px 6px',
                      marginBottom: index < suggestions.length - 1 ? '4px' : '0',
                      // Allow rows to grow for multi-line titles
                      alignItems: 'flex-start'
                    }}
                  >
                    <div className="w-3 h-3 mr-2 flex-shrink-0">
                      <ChatIcon className="w-3 h-3" color="#87D2F7" />
                    </div>
                    <div className="flex-1 text-left w-full">
                      <p
                        className="text-white font-medium text-left whitespace-normal break-words"
                        title={(() => {
                          if (typeof suggestion === 'string') return suggestion;
                          const t = (suggestion?.title || '').trim();
                          const looksTruncated = /\.{3}$|…$/.test(t);
                          if (looksTruncated && Array.isArray(suggestion?.conversation)) {
                            const firstUser = suggestion.conversation.find(m => (m?.type || m?.message_type) === 'user');
                            return (firstUser?.text || t);
                          }
                          return t;
                        })()}
                        style={{
                          display: 'block',
                          fontSize: isInIframe() ? '13px' : '14px',
                          lineHeight: isInIframe() ? '8px' : '8px',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          textAlign: 'left',
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          hyphens: 'auto'
                        }}
                      >
                        {(() => {
                          if (typeof suggestion === 'string') return suggestion;
                          const t = (suggestion?.title || '').trim();
                          const looksTruncated = /\.{3}$|…$/.test(t);
                          if (looksTruncated && Array.isArray(suggestion?.conversation)) {
                            const firstUser = suggestion.conversation.find(m => (m?.type || m?.message_type) === 'user');
                            return (firstUser?.text || t);
                          }
                          return t;
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center items-start gap-2 w-full max-w-[1184px] mx-auto mt-6">
          <div className="flex justify-between items-center w-full">
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: '45px',
                height: '45px',
                padding: '12px 16px',
                borderRadius: '100px',
                border: '1px solid #44B8F3',
                background: 'rgba(5, 15, 38, 0.40)'
              }}
            >
              <div className="w-6 h-6 flex-shrink-0 relative">
                <svg
                  className="absolute"
                  style={{ width: '17px', height: '24px', left: '4px', top: '0' }}
                  width="17"
                  height="24"
                  viewBox="0 0 17 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Corrected refresh icon path to match PulseEmbeddedDemo (fixed malformed numeric sequence) */}
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.2297 8.46742C16.741 9.50225 17 10.7056 17 12C17 16.7461 13.175 20.6292 8.5 20.6292C8.33398 20.6292 8.16133 20.6124 7.99531 20.6022L10.1203 22.7865L8.925 24L5.33906 20.3865L4.75469 19.7663L5.33906 19.1461L8.925 15.5326L10.1203 16.7461L8.04844 18.8764C8.19453 18.8865 8.35059 18.9034 8.5 18.9034C12.2387 18.9034 15.3 15.7955 15.3 12C15.3 11.2247 15.2104 10.4528 14.9547 9.7618L16.2297 8.46742ZM8.075 0L11.6609 3.61348L12.2453 4.23371L11.6609 4.85393L8.075 8.46742L6.87969 7.25393L8.95156 5.12359C8.80547 5.11348 8.64941 5.09663 8.5 5.09663C4.76133 5.09663 1.7 8.20449 1.7 12C1.7 12.7753 1.87598 13.5472 2.04531 14.2382L0.770312 15.5326C0.258984 14.4978 0 13.2944 0 12C0 7.25393 3.825 3.37079 8.5 3.37079C8.67265 3.37079 8.83535 3.38764 9.00469 3.39775L6.87969 1.21348L8.075 0Z" fill="white"/>
                </svg>
              </div>
            </button>
            <div
              className="ml-2 md:ml-4 flex-1"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.35fr', // first two smaller, third bigger
                columnGap: '12px',
                rowGap: '0px',
                alignItems: 'stretch'
              }}
            >
              {(() => {
                // Pick current 3 questions, sort by length ASC so last is longest
                const current3 = allQuestions
                  .slice(currentQuestionSet * 3, currentQuestionSet * 3 + 3)
                  .filter(q => typeof q === 'string');
                const displayQuestions = [...current3].sort((a, b) => a.length - b.length);
                return displayQuestions.map((question, idx) => (
                  <button
                    key={`${currentQuestionSet}-${idx}`}
                    onClick={() => handleSuggestionClick(question)}
                    title={question}
                    aria-label={question}
                    className="flex items-center px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity relative group"
                    style={{
                      borderRadius: '100px',
                      border: '1px solid #44B8F3',
                      background: 'rgba(5, 15, 38, 0.40)',
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      className="text-white truncate w-full text-sm md:text-base text-center"
                      style={{
                        fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: 'clamp(12px, 2.5vw, 16px)',
                        fontWeight: '400',
                        lineHeight: 'normal',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {question}
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Learn More About AI Button - positioned on next line */}
          {/* <div className="flex justify-end w-full mt-2">
            <button
              onClick={() => setShowAboutBox(!showAboutBox)}
              className="text-white hover:text-blue-400 transition-colors text-sm underline bg-transparent p-1"
              style={{
                fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                fontSize: '14px',
                fontWeight: '400',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              Learn More About AI
            </button>
          </div> */}
        </div>
      </div>

      {/* About Box Popup */}
      {showAboutBox && (
        <div
          className="absolute bottom-24 right-8 bg-white rounded-lg shadow-lg p-4 w-80 z-50"
            style={{
              border: '1px solid #e5e7eb',
              marginBottom: '8px'
            }}
          >
            <div className="text-gray-800 text-sm">
              <h3 className="font-semibold mb-2 text-gray-900">About This Application</h3>
              <p className="mb-2">
                This AI-powered assistant helps you with workplace queries, HR policies, and Workday-related questions.
              </p>
              <p className="mb-2">
                Simply type your question or select from the suggested prompts to get started.
              </p>
              <p className="text-xs text-gray-600">
                Powered by advanced AI technology to provide accurate and helpful responses.
              </p>
            </div>

            {/* Close button arrow pointing to the "Learn More" button */}
            <div className="absolute bottom-0 right-8 transform translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
          </div>
        )}
    </div>
  );
};

export default PulseEmbedded;
