import React, { useState } from 'react';

const FigmaHeroPageWithRouting = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);

  // Array of 9 predefined questions
  const allQuestions = [
    // Set 1 (0-2)
    'Share the latest company updates on AI developments',
    'What required learning do I have?',
    'Whose in the office today?',
    // Set 2 (3-5)
    'What are the upcoming project deadlines?',
    'Show me my recent performance reviews',
    'What are the current company policies?',
    // Set 3 (6-8)
    'Find available meeting rooms for today',
    'What are the latest HR announcements?',
    'Show me my vacation balance and requests'
  ];

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
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim(), { type: 'new', method: 'POST' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    // Don't auto-search, just populate the input for editing
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
        padding: '32px 128px 24px 128px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
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
              Good morning, Jane!
            </div>
            <div className="flex items-center gap-2.5">
              <div 
                className="text-white text-center"
                style={{
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  lineHeight: '150%'
                }}
              >
                Enterprise Actions & Apps
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6199_120709)">
                  <path d="M4 8H8V4H4V8ZM10 20H14V16H10V20ZM4 20H8V16H4V20ZM4 14H8V10H4V14ZM10 14H14V10H10V14ZM16 4V8H20V4H16ZM10 8H14V4H10V8ZM16 14H20V10H16V14ZM16 20H20V16H16V20Z" fill="white"/>
                </g>
                <defs>
                  <clipPath id="clip0_6199_120709">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2.5 w-full max-w-[1184px] mx-auto">
            <div 
              className="flex items-center w-full px-4 py-3"
              style={{
                minHeight: '56px',
                borderRadius: '999px',
                border: '2px solid #2861BB',
                background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
              }}
            >
              <div className="flex items-center gap-2 flex-1">
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-transparent border-none outline-none text-white placeholder-white flex-1"
                  style={{
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '18px',
                    fontWeight: '400',
                    lineHeight: '150%',
                    width: '100%',
                    minWidth: '0'
                  }}
                />
              </div>
              <div className="flex items-center gap-0 ml-2">
                <button 
                  onClick={handleSearch}
                  className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M1.33333 0C0.596954 0 0 0.596954 0 1.33333V5.33333C0.000889163 5.8993 0.358985 6.40303 0.893229 6.58984C1.03457 6.64002 1.18336 6.66599 1.33333 6.66667C1.33811 6.66669 1.34288 6.66669 1.34766 6.66667L9.33333 8L1.34766 9.33463C1.34288 9.33418 1.33811 9.33374 1.33333 9.33333C1.18292 9.33386 1.03368 9.35983 0.891927 9.41016C0.358196 9.59741 0.000695057 10.101 0 10.6667V14.6667C0 15.403 0.596954 16 1.33333 16C1.56548 15.9996 1.79348 15.9385 1.99479 15.8229H1.99609L15.5938 8.61458L15.5951 8.61198C15.8403 8.50731 15.9995 8.26661 16 8C16.0004 7.73213 15.8403 7.49006 15.5938 7.38542L1.99609 0.177083C1.7944 0.0612606 1.56592 0.000212161 1.33333 0Z" fill="white" fillOpacity="0.3"/>
                  </svg>
                </button>
                <button className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.9989 14C13.6776 14 15.0328 12.66 15.0328 11V5C15.0328 3.34 13.6776 2 11.9989 2C10.3202 2 8.9651 3.34 8.9651 5V11C8.9651 12.66 10.3202 14 11.9989 14ZM17.9756 11C17.48 11 17.0654 11.36 16.9845 11.85C16.5699 14.2 14.4968 16 11.9989 16C9.50107 16 7.42796 14.2 7.01333 11.85C6.93243 11.36 6.51781 11 6.02228 11C5.40541 11 4.91999 11.54 5.01101 12.14C5.50653 15.14 7.93359 17.49 10.9876 17.92V20C10.9876 20.55 11.4427 21 11.9989 21C12.5551 21 13.0102 20.55 13.0102 20V17.92C16.0643 17.49 18.4913 15.14 18.9868 12.14C19.088 11.54 18.5924 11 17.9756 11Z" fill="white"/>
                  </svg>
                </button>
              </div>
            </div>
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
              <div className="flex justify-between items-center gap-4 flex-1 ml-4">
                {getCurrentQuestions().map((question, index) => (
                  <button
                    key={`${currentQuestionSet}-${index}`}
                    onClick={() => handleSuggestionClick(question)}
                    className="flex items-center px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0 relative group"
                    style={{
                      borderRadius: '100px',
                      border: '1px solid #44B8F3',
                      background: 'rgba(5, 15, 38, 0.40)',
                      maxWidth: '350px',
                      minHeight: '50px'
                    }}
                    title={question}
                  >
                    <div 
                      className="text-white text-center w-full truncate"
                      style={{
                        fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '16px',
                        fontWeight: '400',
                        lineHeight: '1.3'
                      }}
                    >
                      {question.length > 35 ? question.substring(0, 35) + '...' : question}
                    </div>
                    
                    {/* Tooltip for long questions */}
                    {question.length > 35 && (
                      <div 
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 max-w-xs text-center"
                        style={{
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}
                      >
                        {question}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center mt-4 w-full">
            <div 
              className="text-white cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal'
              }}
            >
              Learn More About AI  
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.20729 4.19293C5.9309 4.44905 5.9309 4.8628 6.20729 5.11893L8.95697 7.66708L6.20729 10.2152C5.9309 10.4714 5.9309 10.8851 6.20729 11.1412C6.48368 11.3974 6.93014 11.3974 7.20653 11.1412L10.4594 8.1268C10.7358 7.87067 10.7358 7.45692 10.4594 7.20079L7.20653 4.18636C6.93723 3.9368 6.48368 3.9368 6.20729 4.19293Z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>
  );
};

export default FigmaHeroPageWithRouting;