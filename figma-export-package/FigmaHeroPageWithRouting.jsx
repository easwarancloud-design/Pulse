import React, { useState } from 'react';
import { RotateCw, Send, Mic, ChevronRight, Briefcase, Users } from 'lucide-react';

// Custom AI Icon for the Search Bar (from main page)
const AISearchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17.47 16.29C16.03 14.73 14.15 13.5 12 13.5C9.85 13.5 7.97 14.73 6.53 16.29C5.23 14.93 4.5 13.5 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 13.5 18.77 14.93 17.47 16.29ZM12 8C10.34 8 9 9.34 9 11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11C15 9.34 13.66 8 12 8Z" fill="#3B82F6"/>
  </svg>
);

// Custom icon for the "Share" action button
const ShareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2.5L15 8.5L21.5 9.5L16.5 14.5L17.5 21L12 18L6.5 21L7.5 14.5L2.5 9.5L9 8.5L12 2.5Z" />
  </svg>
);

const QuickActionButton = ({ text, icon: Icon, onClick }) => {
  // Truncate text if it's too long
  const truncateText = (text, maxLength = 45) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleClick = () => {
    console.log('QuickActionButton clicked:', text);
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center px-3 py-2 bg-[#1A2F5A] text-white/90 text-xs rounded-full border border-white/20 hover:bg-[#253E6D] transition-colors whitespace-nowrap min-w-0 flex-1 max-w-xs cursor-pointer"
      title={text} // Show full text on hover
      style={{ zIndex: 999 }}
    >
      <Icon className="w-3 h-3 mr-2 text-blue-300 flex-shrink-0 pointer-events-none" /> 
      <span className="truncate pointer-events-none">{truncateText(text)}</span>
    </div>
  );
};

const FigmaHeroPageWithRouting = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);

  // Define 9 questions that will rotate in groups of 3 (from main page)
  const allQuestions = [
    // Set 1 (0-2)
    { text: "How might we improve user onboarding experience?", icon: ShareIcon },
    { text: "What's the best approach for mobile-first design?", icon: Briefcase },
    { text: "How can we make our interface more accessible?", icon: Users },
    // Set 2 (3-5)
    { text: "What are the latest trends in UI/UX design?", icon: Briefcase },
    { text: "How do we optimize for better user engagement?", icon: ShareIcon },
    { text: "What's the best way to conduct user research?", icon: Users },
    // Set 3 (6-8)
    { text: "How can we improve our design system consistency?", icon: Briefcase },
    { text: "What are effective micro-interaction patterns?", icon: Users },
    { text: "How do we balance aesthetics with functionality?", icon: ShareIcon }
  ];

  // Get current set of 3 questions
  const getCurrentQuestions = () => {
    const startIndex = currentQuestionSet * 3;
    return allQuestions.slice(startIndex, startIndex + 3);
  };

  // Handle refresh button click to cycle through question sets
  const handleRefresh = () => {
    setCurrentQuestionSet((prev) => {
      const newSet = (prev + 1) % 3;
      console.log(`Question set changed from ${prev} to ${newSet}`);
      return newSet;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim(), { type: 'new', method: 'POST' });
      }
    }
  };

  const handleQuestionClick = (question) => {
    setSearchQuery(question.text);
    // Auto-submit when clicking a suggested question
    if (onSearch) {
      onSearch(question.text, { type: 'new', method: 'POST' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  // Gradient style from main page
  const gradientStyle = {
    background: 'radial-gradient(ellipse at 70% 40%, #1B549B 0%, #001133 90%)',
    backgroundColor: '#001133', // Fallback
  };

  return (
    <div className="relative overflow-hidden min-h-screen" style={gradientStyle}>
      <div className="max-w-5xl mx-auto px-8 py-8 sm:px-12 lg:px-16 relative z-10">
        {/* Gradient Blur Effect */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="w-1/2 h-full bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-light text-white">
            Ask AI to research with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-semibold">
              Figma
            </span>
          </h1>
        </div>

        {/* Subheading */}
        <p className="text-xl text-white/70 mb-8">
          Research UX with AI
        </p>

        {/* Full-width Search Input Bar - matching main page style */}
        <form onSubmit={handleSubmit} className="relative bg-[#1A2F5A] rounded-xl flex items-center p-1 mb-6 shadow-2xl transition-all ring-2 ring-blue-500 border border-transparent w-full">
          <AISearchIcon className="w-8 h-8 ml-3 mr-2 text-blue-400" />
          <input
            type="text"
            placeholder="Ask anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow bg-transparent text-lg text-white placeholder-white/70 py-4 focus:outline-none"
          />
          <button 
            type="submit"
            className="p-2 mr-2 rounded-full hover:bg-white/10 transition-colors"
            title="Send"
          >
            <Send className="w-6 h-6 text-white/70 hover:text-white transition-colors" />
          </button>
          <Mic className="w-6 h-6 mr-4 text-white/70 cursor-pointer hover:text-white transition-colors" />
        </form>

        {/* Refresh Icon and Quick Action Buttons - all in same line */}
        <div className="flex items-center mb-6">
          {/* Refresh Icon on the left */}
          <div 
            onClick={handleRefresh}
            className="p-3 mr-4 rounded-full text-blue-300 hover:text-white transition-colors bg-[#1A2F5A] border border-white/20 shadow-lg cursor-pointer"
            title="Refresh questions"
            style={{ zIndex: 1000 }}
          >
            <RotateCw className="w-5 h-5 pointer-events-none" />
          </div>
          {/* Quick action buttons - display current set of 3 questions in single line */}
          <div className="flex gap-3 overflow-hidden flex-1">
            {getCurrentQuestions().map((question, index) => (
              <QuickActionButton 
                key={`${currentQuestionSet}-${index}`}
                text={question.text} 
                icon={question.icon}
                onClick={() => handleQuestionClick(question)}
              />
            ))}
          </div>
        </div>
        
        {/* Learn More link positioned to the right */}
        <div className="flex justify-end">
          <p className="text-sm text-blue-300 flex items-center font-medium">
            Press Enter or click the send button to search
            <ChevronRight className="w-4 h-4 ml-1" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default FigmaHeroPageWithRouting;