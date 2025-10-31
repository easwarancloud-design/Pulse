import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ChatIcon from './components/ChatIcon';
import './PulseEmbedded.css';

const PulseEmbedded = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [allThreads, setAllThreads] = useState([]);
  const [showAboutBox, setShowAboutBox] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [formData, setFormData] = useState(null);
  const inputRef = useRef(null);

  // Check if we're running in an iframe
  React.useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // Array of 9 predefined questions
  const allQuestions = [
    // Set 1 (0-2)
    'Share the latest company updates on AI developments',
    'What required learning do I have?',
    'What are the recent product launches from our competitors?',
    
    // Set 2 (3-5)
    'What are the current market trends in our industry?',
    'Show me this month\'s sales performance',
    'What compliance training is due this quarter?',
    
    // Set 3 (6-8)
    'What are the upcoming regulatory changes?',
    'Show me the latest customer feedback analysis',
    'What are the key insights from our recent survey?'
  ];

  // Get current set of 3 questions
  const getCurrentQuestions = () => {
    const startIndex = currentQuestionSet * 3;
    return allQuestions.slice(startIndex, startIndex + 3);
  };

  // Cycle to next set of questions
  const handleRefresh = () => {
    setCurrentQuestionSet((prev) => (prev + 1) % 3); // 3 sets total
  };

  // Load threads from multiple sources (like main page)
  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const threadsData = JSON.parse(stored);
        const allThreadsList = [
          ...(threadsData.today || []),
          ...(threadsData.yesterday || []),
          ...(threadsData.lastWeek || []),
          ...(threadsData.last30Days || [])
        ];
        return allThreadsList;
      }
    } catch (error) {
      console.error('Error loading threads from localStorage:', error);
    }
    return [];
  };

  // Load static threads (same as main page)
  const getStaticThreadsData = () => {
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

  // Load threads on component mount (combine static and localStorage like main page)
  useEffect(() => {
    const staticThreads = getStaticThreadsData();
    const localStorageThreads = loadThreadsFromStorage();
    const combinedThreads = [...localStorageThreads, ...staticThreads];
    setAllThreads(combinedThreads);
  }, []);

  // Get filtered suggestions based on search query (like main page)
  const getFilteredSuggestions = (query) => {
    if (!query.trim()) {
      // Return top 6 most recent threads when no search query
      return allThreads.slice(0, 6);
    }
    
    // Filter threads by title containing the search query (case insensitive)
    const filtered = allThreads.filter(thread =>
      thread.title.toLowerCase().includes(query.toLowerCase())
    );
    
    return filtered.slice(0, 6);
  };

  // Handle input focus - show suggestions (like main page)
  const handleInputFocus = () => {
    const currentSuggestions = getFilteredSuggestions(searchQuery);
    setSuggestions(currentSuggestions);
    setShowSuggestions(true);
  };

  // Handle input change - filter suggestions (like main page)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const filteredSuggestions = getFilteredSuggestions(value);
    setSuggestions(filteredSuggestions);
    setShowSuggestions(true);
  };

  // Handle suggestion click (enhanced like main page)
  const handleSuggestionClick = (suggestion) => {
    console.log('Clicked suggestion:', suggestion);
    
    if (typeof suggestion === 'string') {
      // Handle predefined question suggestions
      setSearchQuery('');
      setShowSuggestions(false);
      // Trigger search with predefined question
      handleSearch(suggestion, null, 'predefined');
    } else {
      // Handle thread suggestions
      setSearchQuery(suggestion.title);
      setShowSuggestions(false);
      // Trigger search with thread selection
      handleSearch(suggestion.title, suggestion.id, 'thread_selection');
    }
  };

  // Handle predefined question click (like main page)
  const handleQuestionClick = (question) => {
    console.log('Clicked question:', question);
    setSearchQuery('');
    setShowSuggestions(false);
    // Trigger search with predefined question
    handleSearch(question, null, 'predefined');
  };

  // Enhanced search handler (like main page)
  const handleSearch = (queryText = null, threadId = null, source = 'manual_search') => {
    const query = queryText || searchQuery;
    
    if (!query.trim()) return;

    console.log('Search initiated:', {
      query,
      threadId,
      source
    });

    // Prepare form data for submission (enhanced with source tracking)
    const searchData = {
      searchQuery: query,
      threadId: threadId || null,
      source: source,
      timestamp: new Date().toISOString()
    };

    setFormData(searchData);
  };

  // Handle key press for search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle input blur - hide suggestions with delay (like main page)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // FormSubmitter component to handle POST submission
  const FormSubmitter = ({ data }) => {
    const formRef = useRef(null);

    useEffect(() => {
      if (data && formRef.current) {
        console.log('Submitting form with data:', data);
        formRef.current.submit();
      }
    }, [data]);

    if (!data) return null;

    return (
      <form 
        ref={formRef}
        action="/resultpage" 
        method="POST" 
        target="_top"
        style={{ display: 'none' }}
      >
        <input type="hidden" name="searchQuery" value={data.searchQuery} />
        <input type="hidden" name="threadId" value={data.threadId || ''} />
        <input type="hidden" name="source" value={data.source} />
        <input type="hidden" name="timestamp" value={data.timestamp} />
      </form>
    );
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Render dropdown content
  const renderDropdownContent = () => (
    <>
      {/* Header */}
      <div 
        className="text-white/70 mb-3 pb-2"
        style={{ 
          fontSize: '13px',
          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        Previous Conversations
      </div>

      {/* Content - No scrollable wrapper, show all items */}
      <div>
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            onClick={() => handleSuggestionClick(suggestion)}
            className="flex items-center py-2 px-1 hover:bg-white/10 cursor-pointer transition-all duration-200"
            style={{
              marginBottom: index < suggestions.length - 1 ? '1px' : '0',
              minHeight: '32px'
            }}
          >
            <div className="w-4 h-4 mr-3 flex-shrink-0">
              <ChatIcon className="w-4 h-4" color="#87D2F7" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p 
                className="text-white font-medium truncate text-left" 
                style={{ 
                  fontSize: '14px', 
                  lineHeight: '18px',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  textAlign: 'left'
                }}
              >
                {suggestion.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div 
      className="relative"
      style={{
        background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
        padding: 'clamp(16px, 4vw, 32px) clamp(16px, 10vw, 128px) 24px clamp(16px, 10vw, 128px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '24px',
        minHeight: '100vh'
      }}
    >
      <FormSubmitter data={formData} />
      
      {/* Background Effects - same as main page */}
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

      {/* Content */}
      <div className="relative w-full" style={{ zIndex: 10 }}>
        <div className="flex justify-between items-center mb-6">
          <div 
            className="text-white"
            style={{
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '24px',
              fontWeight: '400',
              lineHeight: '150%'
            }}
          >
            Welcome, Jane!
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 w-full max-w-[1184px] mx-auto relative"
          ref={inputRef}
        >
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
          </div>

          {/* Suggestions Dropdown - iframe breakout using Portal */}
          {showSuggestions && suggestions.length > 0 && (
            isInIframe ? (
              // Portal rendering to break out of iframe
              createPortal(
                <div 
                  className="scrollbar-hide"
                  style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90vw',
                    maxWidth: '600px',
                    maxHeight: '320px',
                    borderRadius: '16px',
                    border: '2px solid #2861BB',
                    background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
                    padding: '12px 16px',
                    boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 999999,
                    overflowY: 'auto'
                  }}
                >
                  {renderDropdownContent()}
                </div>,
                // Try to render in parent document, fall back to current document
                (() => {
                  try {
                    // Check if we can access parent document
                    if (window.parent && window.parent !== window && window.parent.document) {
                      return window.parent.document.body;
                    }
                  } catch (e) {
                    // Cross-origin restriction, fall back to current document
                  }
                  return document.body;
                })()
              )
            ) : (
              // Normal dropdown for non-iframe context - exact same styling as main page
              <div 
                className="absolute left-0 right-0 scrollbar-hide"
                style={{
                  top: 'calc(100% + 8px)',
                  width: '100%',
                  maxWidth: '1184px',
                  maxHeight: '320px',
                  borderRadius: '16px',
                  border: '2px solid #2861BB',
                  background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
                  padding: '12px 16px',
                  boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 9999,
                  overflowY: 'auto'
                }}
              >
                {renderDropdownContent()}
              </div>
            )
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
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.2297 8.46742C16.741 9.50225 17 10.7056 17 12C17 16.7461 13.175 20.6292 8.5 20.6292C8.33398 20.6292 8.16133 20.6124 7.99531 20.6022L10.1203 22.7865L8.925 24L5.33906 20.3865L4.75469 19.7663L5.33906 19.1461L8.925 15.5326L10.1203 16.7461L8.04844 18.8764C8.19453 18.8865 8.35059 18.9034 8.5 18.9034C12.2387 18.9034 15.3 15.7955 15.3 12C15.3 11.2247 15.2104 10.4528 14.9547 9.7618L16.2297 8.46742ZM8.075 0L11.6609 3.61348L12.2453 4.23371L11.6609 4.85393L8.075 8.46742L6.87969 7.25393L8.95156 5.12359C8.80547 5.11348 8.64941 5.09663 8.5 5.09663C4.76133 5.09663 1.7 8.20449 1.7 12C1.7 12.7753 1.87598 13.5472 2.04531 14.2382L0.770312 15.5326C0.258984 14.4978 0 13.2944 0 12C0 7.25393 3.825 3.37079 8.5 3.37079C8.67265 3.37079 8.83535 3.38764 9.00469 3.39775L6.87969 1.21348L8.075 0Z" fill="white"/>
                </svg>
              </div>
            </button>
            <div className="flex justify-between items-center gap-2 md:gap-4 flex-1 ml-2 md:ml-4">
              {getCurrentQuestions().map((question, index) => (
                <button
                  key={`${currentQuestionSet}-${index}`}
                  onClick={() => handleQuestionClick(question)}
                  className="flex items-center px-2 md:px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity relative group flex-1"
                  title={question}
                  style={{
                    borderRadius: '100px',
                    border: '1px solid #44B8F3',
                    background: 'rgba(5, 15, 38, 0.40)',
                    minWidth: '0',
                    maxWidth: 'calc((100vw - 200px) / 3)'
                  }}
                >
                  <div 
                    className="text-white truncate w-full text-sm md:text-base"
                    style={{
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: 'clamp(12px, 2.5vw, 16px)',
                      fontWeight: '400',
                      lineHeight: 'normal'
                    }}
                  >
                    {question}
                  </div>
                  
                  {/* Hover tooltip for full question */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-normal max-w-xs text-center">
                    {question}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Learn More About AI Button - positioned on next line */}
          <div className="flex justify-end w-full mt-2">
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
          </div>
        </div>
      </div>

      {/* About Box Popup - same styling as main page */}
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