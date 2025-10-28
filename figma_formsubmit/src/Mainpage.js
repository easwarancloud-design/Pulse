import React, { useState } from 'react';
// Import RotateCw for the missing refresh button, and Send for the send icon
import {
  Menu, ChevronDown, Search, Bell, Mic, LayoutGrid, Globe, Compass, Users, MapPin, Briefcase, ChevronRight, Check, RotateCw, Send
} from 'lucide-react';
import AISearchHero from './components/AISearchHero';

// --- Icon Components ---
// Custom/Branding Icon (The 'Pulse' logo icon)
const PulseLogo = () => (
  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4ZM10 16L14 12L10 8V16Z" fill="#3B82F6"/>
  </svg>
);

// Custom AI Icon for the Search Bar (simulating the unique graphic)
const AISearchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17.47 16.29C16.03 14.73 14.15 13.5 12 13.5C9.85 13.5 7.97 14.73 6.53 16.29C5.23 14.93 4.5 13.5 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 13.5 18.77 14.93 17.47 16.29ZM12 8C10.34 8 9 9.34 9 11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11C15 9.34 13.66 8 12 8Z" fill="#3B82F6"/>
  </svg>
);

// Custom icon for the "Share" action button (stylized pulse/share icon from the image)
const ShareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Simple, stylized four-pointed star/diamond. Using fill for consistency with the image */}
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2.5L15 8.5L21.5 9.5L16.5 14.5L17.5 21L12 18L6.5 21L7.5 14.5L2.5 9.5L9 8.5L12 2.5Z" />
  </svg>
);


// Placeholder Avatar
const Avatar = () => (
  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 bg-blue-400 flex items-center justify-center text-sm font-semibold text-white">
    JA
  </div>
);

// Mock data for the news feed
const newsItems = [
  { id: 1, tag: 'NEW', title: 'Carelon Impact Ambassadors Program (CIAP) begins recruitment for 2024!', time: '1 min ago' },
  { id: 2, tag: 'UPDATE', title: 'Workplace Safety: Refresher Training mandatory for all employees.', time: '2 hours ago' },
  { id: 3, tag: 'SPOTLIGHT', title: 'Celebrating Jane Doe: Q3 Top Performer in Sales.', time: 'Yesterday' },
  { id: 4, tag: 'NEW', title: 'Launch of the new Mental Wellness Resource Hub.', time: '1 day ago' },
];

// --- Sub-Components ---

const PrimaryNavbar = () => (
  <header className="bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      {/* Left side - Logo and Primary Links */}
      <div className="flex items-center space-x-6">
        <a href="#" className="flex items-center text-indigo-600 font-bold text-lg">
          <PulseLogo />
          Pulse
        </a>
        {[
          'Our Company', 'Our Focus', 'Our Initiatives', 'Our Resources'
        ].map(item => (
          <a key={item} href="#" className="hidden lg:flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600 group">
            {item}
            <ChevronDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </a>
        ))}
      </div>

      {/* Right side - Utility Links and Profile */}
      <div className="flex items-center space-x-6">
        {/* Metric Display */}
        <div className="hidden sm:flex items-center text-sm font-semibold">
          <span className="text-gray-600 mr-1">ELV</span>
          <span className="text-indigo-600">467.86</span>
          <span className="text-green-500 ml-2">3.23</span>
        </div>

        {/* Icons */}
        <Search className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />
        <Bell className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />

        {/* User Actions */}
        <div className="hidden sm:flex items-center space-x-4">
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">My HR</a>
          <div className="border-l border-gray-300 h-6"></div>
          <a 
            href="/pulsemain" 
            className="text-sm font-medium text-blue-600 hover:text-blue-800 font-semibold"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/pulsemain');
              window.location.reload();
            }}
          >
            PulseMain
          </a>
          <div className="border-l border-gray-300 h-6"></div>
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600 flex items-center">
            <Globe className="w-4 h-4 mr-1" />
            Español
          </a>
        </div>

        {/* Avatar */}
        <a href="#" className="flex items-center space-x-2">
          <Avatar />
        </a>
      </div>
    </div>
  </header>
);

const HeroSection = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0);

  // Define 9 questions that will rotate in groups of 3
  const allQuestions = [
    // Set 1 (0-2)
    { text: "Share the latest company updates on AI developments", icon: ShareIcon },
    { text: "What required learning do I have?", icon: Briefcase },
    { text: "Whose in the office today?", icon: Users },
    // Set 2 (3-5)
    { text: "What are the upcoming team meetings?", icon: Briefcase },
    { text: "Show me recent project updates", icon: ShareIcon },
    { text: "What training sessions are available?", icon: Users },
    // Set 3 (6-8)
    { text: "What are my pending tasks?", icon: Briefcase },
    { text: "Who is working remotely today?", icon: Users },
    { text: "Share company news and announcements", icon: ShareIcon }
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // --- REFINED GRADIENT ANALYSIS ---
  // Adjusted for a deeper, more professional base and a higher, sharper blue glow
  const gradientStyle = {
    // New gradient: Near-black navy (#001133) fading out from a brighter, centered-right blue glow (#1B549B).
    background: 'radial-gradient(ellipse at 70% 40%, #1B549B 0%, #001133 90%)',
    backgroundColor: '#001133', // Fallback
  };

  return (
    <div className="relative overflow-hidden" style={gradientStyle}>
      <div className="max-w-5xl mx-auto px-8 py-8 sm:px-12 lg:px-16 relative z-10">
        {/* Gradient Blur Effect */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="w-1/2 h-full bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2"></div>
        </div>

        {/* Header with Enterprise Actions */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-light text-white">Good morning, <span className="font-semibold">Jane!</span></h1>
          <div className="flex items-center space-x-2 text-sm text-white/70">
            <span>Enterprise Actions & Apps</span>
            <LayoutGrid className="w-5 h-5 text-white/90 cursor-pointer" />
          </div>
        </div>

        {/* Full-width Search Input Bar - matching second image */}
        <div className="relative bg-[#1A2F5A] rounded-xl flex items-center p-1 mb-6 shadow-2xl transition-all ring-2 ring-blue-500 border border-transparent w-full">
          <AISearchIcon className="w-8 h-8 ml-3 mr-2 text-blue-400" />
          <input
            type="text"
            placeholder="What do you need to find today?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow bg-transparent text-lg text-white placeholder-white/70 py-4 focus:outline-none"
          />
          <button 
            onClick={handleSearch}
            className="p-2 mr-2 rounded-full hover:bg-white/10 transition-colors"
            title="Send"
          >
            <Send className="w-6 h-6 text-white/70 hover:text-white transition-colors" />
          </button>
          <Mic className="w-6 h-6 mr-4 text-white/70 cursor-pointer hover:text-white transition-colors" />
        </div>

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
                    onClick={() => {
                      console.log('Question clicked:', question.text);
                      setSearchQuery(question.text);
                    }}
                  />
                ))}
            </div>
        </div>
        
        {/* Learn More link positioned to the right */}
        <div className="flex justify-end">
          <a href="#" className="text-sm text-blue-300 hover:text-blue-200 transition-colors flex items-center font-medium">
            Learn More About AI
            <ChevronRight className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};

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

const MainContentLayout = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left Column - News and Story (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <FeaturedStoryCard />
        <NewsFeed />
      </div>

      {/* Right Column - Reminders and At a Glance (1/3 width on large screens) */}
      <div className="lg:col-span-1 space-y-8">
        <RemindersCard />
        <AtAGlanceCard />
      </div>
    </div>
  </div>
);

const FeaturedStoryCard = () => (
  <div className="relative mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
    {/* Story Image */}
    <div className="relative h-48 sm:h-64 overflow-hidden">
      <img
        src="https://placehold.co/1200x600/1e40af/ffffff?text=AI-Powered+Search+Live"
        alt="Woman smiling, wearing glasses"
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1200x600/1e40af/ffffff?text=Image+Not+Available"; }}
      />
      <div className="absolute top-4 left-4 flex space-x-2">
        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">NEW</span>
      </div>
    </div>

    {/* Content */}
    <div className="p-6">
      <div className="flex items-center mb-2">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-100 rounded">FEATURED STORY</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 leading-tight">
        AI-Powered Search Now Live in Pulse — Find What You Need Instantly
      </h2>
      <p className="text-sm text-gray-500">
        Oct 8 • 4 hours ago
      </p>
    </div>
  </div>
);

const NewsFeed = () => {
  const [activeTab, setActiveTab] = useState('enterprise');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <TabButton name="Enterprise News" id="enterprise" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton name="My News" id="my" activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center justify-between space-x-4 mb-6">
        <div className="relative flex-grow">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for News"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
        </div>
        <div className="flex space-x-2 text-gray-500">
          <button className="p-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {newsItems.map(item => (
          <NewsItem key={item.id} {...item} />
        ))}
        <div className="pt-4 text-center">
            <button className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
                Load More News
            </button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ name, id, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`pb-3 mr-6 text-base font-medium transition-colors ${
      activeTab === id
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {name}
  </button>
);

const NewsItem = ({ tag, title, time }) => (
  <a href="#" className="flex items-start p-4 hover:bg-gray-50 transition-colors rounded-lg border-b border-gray-100 last:border-b-0">
    <div className="flex-shrink-0 mr-4 mt-1">
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
        tag === 'NEW' ? 'bg-indigo-600 text-white' : tag === 'UPDATE' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-800'
      }`}>
        {tag}
      </span>
    </div>
    <div className="flex-grow">
      <p className="text-gray-800 font-medium hover:text-blue-600 transition-colors">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{time}</p>
    </div>
  </a>
);

const RemindersCard = () => (
  <div className="bg-[#F0F8FF] rounded-xl p-6 shadow-md border border-blue-200">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-800">Todays Reminders</h3>
      <a href="#" className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors">View More</a>
    </div>

    <div className="space-y-4">
      <ReminderItem
        text="Don't forget to enroll in your benefits!"
        linkText="Enroll Now"
        date="OCT 2"
        isUrgent={true}
      />
      <ReminderItem
        text="Complete Peakon Employee Survey"
        linkText="Complete Survey"
        date="OCT 4"
        isUrgent={false}
      />
    </div>
  </div>
);

const ReminderItem = ({ text, linkText, date, isUrgent }) => (
  <div className="flex justify-between items-start border-t border-blue-200 pt-4">
    <div className="flex-grow pr-4">
      <p className="text-gray-800 leading-snug">{text}</p>
      <a href="#" className="text-sm text-blue-600 hover:underline mt-1 block">
        {linkText}
      </a>
    </div>
    <div className={`text-right ${isUrgent ? 'text-orange-600' : 'text-gray-500'}`}>
      <span className={`text-sm font-bold px-2 py-1 rounded-md ${isUrgent ? 'bg-orange-100' : 'bg-gray-100'} shadow-sm`}>{date}</span>
    </div>
  </div>
);

const AtAGlanceCard = () => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Today at a Glance <span className="text-sm font-normal text-gray-500">(09/12)</span></h3>

    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
        <MapPin className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
        PulsePoint Reservation
      </h4>
      <div className="pl-7 space-y-2 text-sm">
        <p className="text-gray-700">740 W. Peachtree Street</p>
        <p className="text-gray-500 text-xs">Atlanta, GA</p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <p className="text-gray-700 flex items-center">
            <Check className="w-4 h-4 text-green-500 mr-1" />
            Workstation 1-15A-135 <span className="text-xs text-blue-600 ml-2 font-medium">All day</span>
          </p>
          <a href="#" className="text-blue-600 font-medium hover:text-blue-800 transition-colors text-sm">Check in</a>
        </div>
      </div>
    </div>
  </div>
);


// --- Main App Component ---

const App = ({ onSearch }) => {
  return (
    // Use the Inter font, which is the default for modern Tailwind
    <div className="font-sans min-h-screen bg-gray-50">
      <PrimaryNavbar />
      <AISearchHero onSearch={onSearch} />
      <MainContentLayout />

    </div>
  );
};

export default App;
