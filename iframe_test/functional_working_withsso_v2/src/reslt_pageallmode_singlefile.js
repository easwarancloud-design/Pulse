import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Send,
  Mic,
  Zap,
  Briefcase,
  Layers,
  CheckCircle,
  PanelLeft,
  Sun,
  Moon, // Added Moon icon
  Square,
  MoreHorizontal,
  RotateCw,
  Clock,
  MessageSquare,
  Bookmark,
  Calendar,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// --- THEME CONTEXT & HOOKS ---
// Updated context to expose setTheme for icon-based switching
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, setTheme: () => {} });

const useTheme = () => useContext(ThemeContext);

const useThemeManager = () => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const getThemeColors = useMemo(() => {
    if (theme === 'dark') {
      return {
        // Core Colors
        PRIMARY_COLOR: '#0070c9',
        RED_INCOMPLETE: '#ef4444',
        AGENT_TEAL: '#00a3ad',
        AGENT_BLUE: '#2b65f3',
        AGENT_GREEN: '#00ad58',
        
        // Backgrounds & Surfaces
        // Switched MAIN_BG to a CSS radial-gradient string to match the subtle ambient dark look
        MAIN_BG: 'radial-gradient(at 50% 15%, #182845, #0b1626 90%)', 
        SURFACE_BG: '#121e33', // Darker surface for sidebar/cards
        BUBBLE_BG_SYSTEM: '#192842', // System message bubble
        BUBBLE_BG_USER: '#0d386b', // User message bubble (still blue, but dark)
        
        // Text & Icons
        TEXT_HIGH_CONTRAST: '#f7f8fa', // Pulse, Back, Agent Names (White)
        TEXT_MEDIUM_CONTRAST: '#a0a7b4', // Headers (Agents, Threads), Main Content Text
        TEXT_LOW_CONTRAST: '#6b7280', // Placeholder, Sub-headers (Last week)
        BORDER: '#1e293b', // Darker border color
      };
    } else {
      return {
        // Core Colors (Light Mode)
        PRIMARY_COLOR: '#0070c9',
        RED_INCOMPLETE: '#ef4444',
        AGENT_TEAL: '#00a3ad',
        AGENT_BLUE: '#2b65f3',
        AGENT_GREEN: '#00ad58',

        // Backgrounds & Surfaces (Light Mode)
        MAIN_BG: '#f7f8fa', // Uniform color string for light mode
        SURFACE_BG: '#ffffff',
        BUBBLE_BG_SYSTEM: '#f0f3f5',
        BUBBLE_BG_USER: '#e6f0fa',

        // Text & Icons (Light Mode)
        TEXT_HIGH_CONTRAST: '#1f2937', // text-gray-900
        TEXT_MEDIUM_CONTRAST: '#374151', // text-gray-700 (for less prominent headers)
        TEXT_LOW_CONTRAST: '#9ca3af', // text-gray-400 (for low contrast items)
        BORDER: '#e0e0e0',
      };
    }
  }, [theme]);

  // Exposing setTheme for direct theme switching from the toggle group
  return { theme, toggleTheme, setTheme, colors: getThemeColors };
};

// --- MOCK DATA (No change) ---
const AGENTS = [
  { name: 'HR Assistant', icon: Briefcase, color: '#00a3ad' },
  { name: 'Jira Agent', icon: Layers, color: '#2b65f3' },
  { name: 'Service Now Agent', icon: CheckCircle, color: '#00ad58' },
];

const THREADS = [
  { group: 'Last week (4)', links: [
    'Can you create a service IT ticke...',
    'Can you find confluence pages r...',
    'What are the latest project upd...',
    'What are the key metrics we sho...',
  ]},
  { group: 'Last 30 days (10)', links: [
    'Can you create a service IT ticke...',
    'Can you create a service IT ticke...',
    'Can you create a service IT ticke...',
  ]},
];

const DATA_TABLE = [
  { name: 'Desai, Priyo', id: 'AG123456', email: 'Priyo.Desai@relevancehealth.com', status: 'Incomplete' },
  { name: 'Garcia, Sophia', id: 'AG123456', email: 'Sophia.Garcia@relevancehealth.com', status: 'Incomplete' },
  { name: 'Johnson, Alex', id: 'AG123456', email: 'Alex.Johnson@relevancehealth.com', status: 'Incomplete' },
  { name: 'Lin, Marco', id: 'AG123456', email: 'Marco.Lin@relevancehealth.com', status: 'Incomplete' },
  { name: 'Miller, Ethan', id: 'AG123456', email: 'Ethan.Miller@relevancehealth.com', status: 'Incomplete' },
];

// --- UTILITY COMPONENTS (Adapted for theme) ---

const AgentIcon = ({ Icon, color }) => (
  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm" style={{ color }}>
    <Icon size={16} strokeWidth={2.5} />
  </div>
);

const SourceIcon = ({ text, color }) => {
  const { colors } = useTheme();
  const isDark = colors.SURFACE_BG === '#121e33'; // Check if dark mode based on a reliable color

  return (
    <div
      className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors"
      style={{
        color: color,
        border: `1px solid ${color}`,
        backgroundColor: isDark ? colors.BUBBLE_BG_SYSTEM : 'white',
      }}
    >
      {text}
    </div>
  );
};

// New Action Icons component for re-use
const ActionIcons = () => {
  const { theme, colors } = useTheme();
  
  // Set color to white in dark mode, and low contrast text in light mode (matching the original light design)
  const iconColor = theme === 'dark' ? colors.TEXT_HIGH_CONTRAST : colors.TEXT_LOW_CONTRAST;

  return (
    <div className="flex items-center space-x-2 mt-2 ml-1" style={{ color: iconColor }}>
      <button className="p-1 transition-colors hover:opacity-80" style={{ color: iconColor }} title="Copy">
        <Copy size={16} />
      </button>
      <button className="p-1 transition-colors hover:opacity-80" style={{ color: iconColor }} title="Like">
        <ThumbsUp size={16} />
      </button>
      <button className="p-1 transition-colors hover:opacity-80" style={{ color: iconColor }} title="Dislike">
        <ThumbsDown size={16} />
      </button>
      <button className="p-1 transition-colors hover:opacity-80" style={{ color: iconColor }} title="Reload/Regenerate">
        <RotateCw size={16} />
      </button>
    </div>
  );
};


// --- SIDEBAR COMPONENTS (Adapted for theme) ---

const ExpandedSidebar = ({ agents, threads }) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter threads based on search query
  const getFilteredThreads = () => {
    if (!searchQuery.trim()) {
      return threads;
    }
    
    return threads.map(group => ({
      ...group,
      links: group.links.filter(link =>
        link.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.links.length > 0);
  };
  
  const filteredThreads = getFilteredThreads();
  const isSearching = searchQuery.trim().length > 0;
  
  const ThreadLink = ({ children }) => (
    <a
      href="#"
      title={children}
      className="flex items-start p-2 rounded-lg text-sm transition-all duration-200 cursor-pointer hover:opacity-80"
      style={{
        color: colors.PRIMARY_COLOR, // Thread links use primary blue in both modes
        backgroundColor: 'transparent', // Base background
      }}
      onMouseEnter={(e) => {
        const hoverBg = colors.SURFACE_BG === '#121e33' ? colors.BUBBLE_BG_SYSTEM : '#f3f4f6';
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <MessageSquare size={16} style={{ color: colors.PRIMARY_COLOR }} className="mr-2 mt-0.5 flex-shrink-0" />
      <span className="truncate hover:underline min-w-0 flex-1">{children}</span>
    </a>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 pb-4">
      {/* Search Input */}
      <div className="mt-4 mb-4 relative">
        <input
          type="text"
          placeholder="Search previous threads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg focus:ring-0 focus:border-blue-500"
          style={{
            backgroundColor: colors.BUBBLE_BG_SYSTEM,
            color: colors.TEXT_HIGH_CONTRAST,
            borderColor: colors.BORDER,
          }}
        />
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.TEXT_LOW_CONTRAST }} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80"
            style={{ color: colors.TEXT_LOW_CONTRAST }}
          >
            ×
          </button>
        )}
      </div>

      {/* Agents Section - Hidden when searching */}
      {!isSearching && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>Agents</h3>
          <div className="space-y-1">
            {agents.map((agent, index) => (
              <a
                key={index}
                href="#"
                className="flex items-center p-2 rounded-lg transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  // Hover effect logic
                  '--tw-bg-opacity': 1,
                }}
              onMouseEnter={(e) => {
                const hoverBg = colors.SURFACE_BG === '#121e33' ? colors.BUBBLE_BG_SYSTEM : '#f3f4f6'; // Custom hover color
                e.currentTarget.style.backgroundColor = hoverBg; 
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <AgentIcon Icon={agent.icon} color={agent.color} />
              <span className="ml-3 text-sm" style={{ color: colors.TEXT_HIGH_CONTRAST }}>{agent.name}</span>
            </a>
          ))}
        </div>
      </div>
      )}

      {/* Separator - Only show when not searching */}
      {!isSearching && (
        <div className="my-2" style={{ borderTop: `1px solid ${colors.BORDER}` }}></div>
      )}

      {/* Previous Threads Section */}
      <div className="flex-grow overflow-y-visible pr-2">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-1 mt-3" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>
          {isSearching ? `Search Results (${filteredThreads.reduce((sum, group) => sum + group.links.length, 0)})` : 'Previous Threads'}
        </h3>
        {(isSearching ? filteredThreads : threads).map((group, index) => (
          <div key={index} className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1 mt-3" style={{ color: colors.TEXT_LOW_CONTRAST }}>
              {group.group} {group.links.length > 0 && `(${group.links.length})`}
            </h3>
            <div className="space-y-0.5">
              {group.links.map((link, linkIndex) => (
                <ThreadLink key={linkIndex}>{link}</ThreadLink>
              ))}
            </div>
          </div>
        ))}
        
        {/* No results message */}
        {isSearching && filteredThreads.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: colors.TEXT_LOW_CONTRAST }}>
              No threads found matching "{searchQuery}"
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs hover:underline"
              style={{ color: colors.PRIMARY_COLOR }}
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CollapsedSidebar = () => {
  const { colors } = useTheme();
  
  const iconStyle = { color: colors.TEXT_LOW_CONTRAST };
  const buttonClassName = "p-2.5 rounded-lg transition-colors hover:bg-opacity-10";
  const hoverBg = colors.SURFACE_BG === '#121e33' ? colors.BUBBLE_BG_SYSTEM : '#f3f4f6';

  return (
    <div className="flex flex-col h-full items-center py-4 space-y-6">
      {/* Back Button */}
      <button 
        className={buttonClassName} 
        title="Back"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <ArrowLeft size={24} style={iconStyle} />
      </button>
      {/* Search Button */}
      <button 
        className={buttonClassName} 
        title="Search"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Search size={24} style={iconStyle} />
      </button>
    </div>
  );
};

const Sidebar = ({ isExpanded, toggleExpand }) => {
  const { theme, setTheme, colors } = useTheme();
  const sidebarWidth = isExpanded ? 'w-[300px]' : 'w-16'; // 300px vs 64px
  
  // Dynamic styling for the "New chat" button based on the theme
  const isDark = theme === 'dark';
  const buttonStyle = isDark
    ? {
        // Changed to solid primary blue background for dark mode (matching image)
        backgroundColor: colors.PRIMARY_COLOR, 
        color: 'white', // White text and icon
        border: 'none',
      }
    : {
        backgroundColor: colors.PRIMARY_COLOR, // Blue background
        color: 'white', // White text
        border: 'none',
      };
      
  // Dynamic class name for the "New chat" button
  const buttonClassName = `w-full flex items-center justify-center font-semibold transition-all 
    ${isExpanded ? 'py-3 px-4 rounded-2xl shadow-md hover:shadow-lg' : 'p-3 rounded-full shadow-md hover:shadow-lg'}
    text-white // Ensure text is white in both modes since the button background is blue in both modes now
  `;


  return (
    <div
      className={`h-full flex-shrink-0 relative flex flex-col transition-all duration-300`}
      style={{
        width: sidebarWidth,
        backgroundColor: colors.SURFACE_BG,
        borderColor: colors.BORDER,
        borderRightWidth: '1px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Top Header Section */}
      <div className={`p-4 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} flex-shrink-0`} style={{ borderBottom: `1px solid ${colors.BORDER}` }}>
        {isExpanded ? (
          <>
            <div className="flex items-center">
              <Zap size={24} style={{ color: colors.PRIMARY_COLOR }} className="mr-2" />
              <span className="text-xl font-bold" style={{ color: colors.TEXT_HIGH_CONTRAST }}>Pulse</span>
            </div>
            {/* Removed the redundant Sun icon button */}
            <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleExpand}
                  className="p-2 rounded-full transition-colors"
                  // *** CHANGE 1: Collapse icon color set to white in dark mode ***
                  style={{ color: colors.TEXT_HIGH_CONTRAST }} 
                  title="Collapse Sidebar"
                >
                    <PanelLeft size={20} />
                </button>
            </div>
          </>
        ) : (
          // In collapsed mode, the top icon is the Square (Pause/Stop) as per the image
          <button
            onClick={toggleExpand}
            className="p-2.5 rounded-lg transition-colors"
            style={{ color: colors.TEXT_LOW_CONTRAST }}
            title="Expand/Pause"
          >
            <Square size={24} />
          </button>
        )}
      </div>

      {isExpanded && (
        // The "Back" button section matches the image
        <div className="p-4 flex items-center justify-start flex-shrink-0" style={{ borderBottom: `1px solid ${colors.BORDER}` }}>
          {/* Back arrow and text use TEXT_HIGH_CONTRAST */}
          <button 
            className="p-2 rounded-full transition-colors" 
            style={{ color: colors.TEXT_HIGH_CONTRAST }}
            title="Back"
            onMouseEnter={(e) => { 
                const hoverBg = colors.SURFACE_BG === '#121e33' ? colors.BUBBLE_BG_SYSTEM : '#f3f4f6';
                e.currentTarget.style.backgroundColor = hoverBg; 
            }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="ml-3 text-sm font-semibold" style={{ color: colors.TEXT_HIGH_CONTRAST }}>Back</span>
          
          {/* Theme Toggle Switch with Icons */}
          <div className="ml-auto flex items-center">
            {/* The switch group */}
            <div 
              className="flex items-center p-0.5 rounded-full" 
              style={{ backgroundColor: colors.BUBBLE_BG_SYSTEM }} // Use bubble BG as the track color
            >
              {/* Light Mode Button (Sun) */}
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'shadow-md' : ''}`}
                style={{
                  backgroundColor: theme === 'light' ? colors.SURFACE_BG : 'transparent',
                  color: theme === 'light' ? colors.TEXT_HIGH_CONTRAST : colors.TEXT_LOW_CONTRAST,
                }}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
              {/* Dark Mode Button (Moon) */}
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'shadow-md' : ''}`}
                style={{
                  backgroundColor: theme === 'dark' ? colors.SURFACE_BG : 'transparent',
                  color: theme === 'dark' ? colors.TEXT_HIGH_CONTRAST : colors.TEXT_LOW_CONTRAST,
                }}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
            </div>
            
            <button className="p-2 ml-2 rounded-full transition-colors" style={{ color: colors.TEXT_LOW_CONTRAST }} title="Options">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      )}


      {/* Main Content Area */}
      <div className="flex-grow overflow-hidden">
        {isExpanded ? (
          <ExpandedSidebar agents={AGENTS} threads={THREADS} />
        ) : (
          <CollapsedSidebar />
        )}
      </div>

      {/* New Chat Button (Fixed at Bottom) */}
      <div className={`p-4 flex-shrink-0`} style={{ borderTop: `1px solid ${colors.BORDER}` }}>
        <button
          className={buttonClassName}
          style={buttonStyle} // Apply the dynamic style object
          title="New Chat"
        >
          <Plus size={isExpanded ? 20 : 24} className={isExpanded ? 'mr-2' : ''} />
          {isExpanded && 'New chat'}
        </button>
      </div>
    </div>
  );
};

// --- MAIN CONTENT COMPONENTS (Adapted for theme) ---

const ChatBubble = ({ children, isUser }) => {
  const { colors } = useTheme();

  // Removed action icons from this component to be placed specifically in MainContent
  return (
    <div className={`max-w-2xl ${isUser ? 'ml-auto' : 'mr-auto'}`}>
      <div
        className={`p-4 rounded-xl font-medium`}
        style={{
          backgroundColor: isUser ? colors.BUBBLE_BG_USER : colors.BUBBLE_BG_SYSTEM,
          color: isUser ? (colors.SURFACE_BG === '#121e33' ? colors.TEXT_HIGH_CONTRAST : colors.PRIMARY_COLOR) : colors.TEXT_HIGH_CONTRAST,
          borderRadius: isUser ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem', // Custom rounded corners
          maxWidth: 'fit-content'
        }}
      >
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

const DataCard = ({ count, label, source, color }) => {
  const { colors } = useTheme();

  return (
    <div
      className="p-4 rounded-xl border flex-1 min-w-[180px] shadow-md"
      style={{
        backgroundColor: colors.SURFACE_BG,
        borderColor: colors.BORDER,
      }}
    >
      <p className="text-4xl font-extrabold mb-1" style={{ color }}>{count}</p>
      <p className="text-sm font-medium mb-2" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>{label}</p>
      <div className="flex items-center">
        <Clock size={14} className="mr-1" style={{ color: colors.TEXT_LOW_CONTRAST }} />
        <span className="text-xs font-semibold" style={{ color: colors.TEXT_LOW_CONTRAST }}>{source}</span>
      </div>
    </div>
  );
};

const MainContent = () => {
  const { colors } = useTheme();

  return (
    <div className="flex flex-col flex-grow h-full overflow-hidden">
      {/* Chat History Area (Scrollable) */}
      <div className="flex-grow overflow-y-auto p-8">
        {/* User Query */}
        <ChatBubble isUser={true}>
          Who from my team hasn't completed the Cyber Security Training?
        </ChatBubble>

        {/* System Response (Fetching Data from) - No Action Icons Here */}
        <div className="mt-8 mb-6 mx-auto w-full max-w-2xl">
          <ChatBubble isUser={false}>
            Give me a moment
            <div className="flex items-center text-sm font-normal mt-2" style={{ color: colors.TEXT_LOW_CONTRAST }}>
              Fetching Data from:
              <SourceIcon text="Service Now" color={colors.AGENT_GREEN} />
              <SourceIcon text="Workday" color={colors.AGENT_TEAL} />
              <SourceIcon text="Pulse" color={colors.PRIMARY_COLOR} />
              <SourceIcon text="Outlook" color={colors.AGENT_BLUE} />
            </div>
          </ChatBubble>
        </div>

        {/* System Response (Expanded Data Table) - The Main Agent Output */}
        <div className="mt-8 mb-6 mx-auto w-full max-w-6xl">
          <p className="text-base mb-6 max-w-4xl" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>
            Based on the latest records, this is currently where your team members stand in regards to the
            <span className="font-bold ml-1">Do The Right Thing: Cyber Security Training 2025:</span>
          </p>

          {/* Data Cards */}
          <div className="flex space-x-4 mb-8">
            <DataCard count={5} label="Employees have not completed training" source="Workday" color={colors.RED_INCOMPLETE} />
            <DataCard count={19} label="Employees completed training" source="Workday" color={colors.AGENT_GREEN} />
            <DataCard count={24} label="Total Employees reporting to you" source="Workday" color={colors.AGENT_BLUE} />
          </div>

          {/* Detailed Table */}
          <h4 className="text-base font-bold mb-3" style={{ color: colors.TEXT_HIGH_CONTRAST }}>Who hasn't completed training:</h4>
          <div
            className="rounded-xl shadow-md overflow-hidden"
            style={{
              backgroundColor: colors.SURFACE_BG,
              border: `1px solid ${colors.BORDER}`,
            }}
          >
            {/* Table Header */}
            <div
              className="flex p-4 text-sm font-semibold"
              style={{
                color: colors.TEXT_MEDIUM_CONTRAST,
                borderBottom: `1px solid ${colors.BORDER}`,
              }}
            >
              <span className="w-1/4">Name</span>
              <span className="w-1/4">Employee ID</span>
              <span className="w-1/3">Email</span>
              <span className="w-auto">Status</span>
            </div>

            {/* Table Rows */}
            {DATA_TABLE.map((row, index) => (
              <div
                key={index}
                className="flex p-4 text-sm border-b last:border-b-0 transition-colors"
                style={{
                  borderColor: colors.BORDER,
                  backgroundColor: colors.SURFACE_BG,
                }}
                onMouseEnter={(e) => {
                  if (colors.SURFACE_BG === '#121e33') { // Check for dark mode
                    e.currentTarget.style.backgroundColor = colors.BUBBLE_BG_SYSTEM;
                  } else {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.SURFACE_BG;
                }}
              >
                <span className="w-1/4" style={{ color: colors.TEXT_HIGH_CONTRAST }}>{row.name}</span>
                <span className="w-1/4" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>{row.id}</span>
                <span className="w-1/3" style={{ color: colors.TEXT_HIGH_CONTRAST }}>{row.email}</span>
                <span className="w-auto font-medium" style={{ color: colors.RED_INCOMPLETE }}>{row.status}</span>
              </div>
            ))}
          </div>

          {/* Table Footer Actions (Data specific actions) */}
          <div className="flex items-center mt-4 space-x-4" style={{ color: colors.TEXT_LOW_CONTRAST }}>
            <RotateCw size={18} className="cursor-pointer hover:opacity-80" title="Refresh" />
            <Bookmark size={18} className="cursor-pointer hover:opacity-80" title="Bookmark" />
            <Calendar size={18} className="cursor-pointer hover:opacity-80" title="Schedule" />
          </div>

          {/* Follow-up Question */}
          <p className="text-base mt-8" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>
            Do you want me to send email reminders to those team members?
          </p>
        </div>
        
        {/* Action Icons placed after the main data response block, aligned with the actions in the image */}
        <div className="mx-auto w-full max-w-6xl pl-1">
          <ActionIcons />
        </div>
      </div>

      {/* Bottom Input Bar (Fixed) */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: `1px solid ${colors.BORDER}`, backgroundColor: colors.SURFACE_BG }}>
        <div
          className="mx-auto max-w-5xl flex items-center p-3 rounded-full border"
          style={{ borderColor: colors.PRIMARY_COLOR, backgroundColor: colors.BUBBLE_BG_SYSTEM }}
        >
          <input
            type="text"
            placeholder="Ask anything"
            className="flex-grow text-lg focus:outline-none bg-transparent"
            style={{ color: colors.TEXT_HIGH_CONTRAST }}
          />
          <Send size={24} className="mr-3 cursor-pointer hover:opacity-80" style={{ color: colors.TEXT_HIGH_CONTRAST }} />
          <Mic size={24} className="cursor-pointer hover:opacity-80" style={{ color: colors.TEXT_LOW_CONTRAST }} />
        </div>
      </div>
    </div>
  );
};

// --- APP COMPONENT ---

const App = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const themeManager = useThemeManager();
  
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Determine the background style based on whether MAIN_BG is a gradient string or a hex color
  // This allows us to use `background` for gradients and `backgroundColor` for solid colors
  const mainBgStyle = themeManager.colors.MAIN_BG.startsWith('#')
    ? { backgroundColor: themeManager.colors.MAIN_BG }
    : { background: themeManager.colors.MAIN_BG };

  return (
    <ThemeContext.Provider value={themeManager}>
      {/* Main Container */}
      <div
        className="flex h-screen w-screen transition-colors duration-300"
        style={{
          fontFamily: 'Inter, sans-serif',
          color: themeManager.colors.TEXT_MEDIUM_CONTRAST,
          ...mainBgStyle, // Apply the dynamically generated background style
        }}
      >
        {/* Sidebar Component */}
        <Sidebar isExpanded={isExpanded} toggleExpand={toggleExpand} />

        {/* Main Content Area */}
        <MainContent />
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
