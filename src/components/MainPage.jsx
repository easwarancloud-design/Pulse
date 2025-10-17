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

export default function MainPage({ onStartChat }) {
  const [query, setQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);

  const handleSubmit = (question) => {
    const finalQuestion = question || query;
    if (finalQuestion.trim()) {
      onStartChat(finalQuestion.trim());
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
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <div className="brand-main">
              <div className="pulse-icon-main">
                <IconPulse />
              </div>
              <span className="brand-text-main">Pulse</span>
            </div>
          </div>
          <nav className="header-nav">
            <a href="#" className="nav-link">Our Company</a>
            <a href="#" className="nav-link">Our Focus</a>
            <a href="#" className="nav-link">Our Initiatives</a>
            <a href="#" className="nav-link">Our Resources</a>
          </nav>
          <div className="header-right">
            <div className="enterprise-actions-header">
              <span>Enterprise Actions & Apps</span>
              <IconApps />
            </div>
            <div className="search-icon">🔍</div>
            <div className="stock-info">📈 ELV 467.86 3.23</div>
            <div className="user-info">
              <span>My HR</span>
              <span>Español</span>
              <div className="notification-badge">1</div>
              <div className="user-avatar"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="hero-section">
          <div className="greeting">
            <h1>Good morning, Jane!</h1>
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

          <div className="enterprise-actions">
            <span>Enterprise Actions & Apps</span>
            <IconApps />
          </div>
        </div>

        {/* Featured Content */}
        <div className="featured-section">
          <div className="featured-story">
            <span className="new-badge">NEW</span>
            <div className="story-content">
              <div className="story-image">
                <img src="/api/placeholder/300/200" alt="AI-Powered Search" />
              </div>
              <div className="story-text">
                <h3>AI-Powered Search Now Live in Pulse — Find What You Need Instantly</h3>
                <p>Oct 8 • 4 hours ago</p>
              </div>
            </div>
            <span className="featured-label">FEATURED STORY</span>
          </div>

          <div className="sidebar-content">
            <div className="todays-reminders">
              <h4>Todays Reminders</h4>
              <div className="reminder-item">
                <span>Don't forget to enroll in your benefits!</span>
                <span className="date-badge">OCT 2</span>
              </div>
              <div className="reminder-item">
                <span>Complete Peakon Employee Survey</span>
                <span className="date-badge">OCT 4</span>
              </div>
            </div>

            <div className="today-glance">
              <h4>Today at a Glance (09/12)</h4>
              <div className="reservation-info">
                <h5>PulsePoint Reservation</h5>
                <div className="location">
                  <span>740 W. Peachtree Street</span>
                  <span>Atlanta, GA</span>
                </div>
                <div className="workstation">
                  <span>Workstation 1-15A-135</span>
                  <span>All day</span>
                  <button className="check-in-btn">Check in</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* News Section */}
        <div className="news-section">
          <div className="news-tabs">
            <button className="tab active">Enterprise News</button>
            <button className="tab">My News</button>
          </div>
          
          <div className="news-search">
            <input type="text" placeholder="Search for News" className="news-search-input" />
            <div className="view-options">
              <button className="view-btn">≡</button>
              <button className="view-btn">▤</button>
            </div>
          </div>

          <div className="news-item">
            <span className="new-badge">NEW</span>
            <div className="news-content">
              <img src="/api/placeholder/200/120" alt="Carelon Impact" />
              <div className="news-text">
                <h4>Carelon Impact Ambassadors Program Celebrates Milestones</h4>
                <p>The Carelon Impact Ambassadors Program (CIAP) has...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}