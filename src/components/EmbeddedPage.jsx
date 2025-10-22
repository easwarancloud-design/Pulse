import React, { useState } from 'react';

function IconPulse() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12h3l2-6 3 12 2-8 3 6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconMic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="22,2 15,22 11,13 2,9 22,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconApps() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="15" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="15" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

const QUESTION_SETS = [
  [
    "Share the latest company updates on AI developments",
    "What required learning do I have?", 
    "Whose in the office today?"
  ],
  [
    "How to improve team productivity?",
    "What are our quarterly goals?",
    "When is the next all-hands meeting?"
  ],
  [
    "How to submit expense reports?",
    "What's our vacation policy?",
    "Where can I find IT support?"
  ]
];

export default function EmbeddedPage({ onStartChat, userName = "Jane" }) {
  const [query, setQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);

  const handleSubmit = (question) => {
    const finalQuestion = question || query;
    if (finalQuestion.trim()) {
      if (onStartChat) {
        onStartChat(finalQuestion.trim());
      } else {
        // Default behavior for embedded mode - could post message to parent window
        window.parent.postMessage({
          type: 'PULSE_SEARCH',
          query: finalQuestion.trim()
        }, '*');
      }
    }
  };

  const handleQuestionSelect = (question) => {
    setQuery(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const refreshQuestions = () => {
    setCurrentQuestionSet((prev) => (prev + 1) % QUESTION_SETS.length);
  };

  const currentQuestions = QUESTION_SETS[currentQuestionSet];

  return (
    <div className="embedded-page">
      <div className="embedded-container">
        <div className="greeting">
          <h1>Good morning, {userName}!</h1>
        </div>
        
        <div className="search-section">
          <div className="main-search-wrapper">
            <div className="main-search-icon">
              <IconPulse />
            </div>
            <input
              type="text"
              placeholder="What do you need to find today?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="main-search-input"
            />
            <button className="main-mic-btn">
              <IconMic />
            </button>
            <button className="main-send-btn" onClick={() => handleSubmit()}>
              <IconSend />
            </button>
          </div>
        </div>

        <div className="suggestions-section">
          <div className="suggestions-row">
            <button className="refresh-btn" onClick={refreshQuestions} title="Refresh suggestions">
              <IconRefresh />
            </button>
            
            {currentQuestions.map((question, index) => (
              <button
                key={`${currentQuestionSet}-${index}`}
                className="suggestion-btn"
                onClick={() => handleQuestionSelect(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}