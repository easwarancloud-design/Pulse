import React, { useState, useCallback, useMemo, createContext, useContext, useRef, useEffect } from 'react';
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

// Import the Builder.io generated sidebar
import MenuSidebar from './MenuSidebar';

// Import agent images
import jiraAgentImage from './assets/lightmode_imges/10/image 11.png';
import serviceNowAgentImage from './assets/lightmode_imges/10/image 18.png';

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
  { name: 'Jira Agent', image: jiraAgentImage, color: '#2b65f3' },
  { name: 'Service Now Agent', image: serviceNowAgentImage, color: '#00ad58' },
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

// --- UTILITY COMPONENTS (Adapted for theme) ---

const CustomIcon = ({ src, size = 24, className = '', style = {} }) => (
  <img 
    src={src} 
    alt="icon" 
    width={size} 
    height={size} 
    className={className} 
    style={{ 
      filter: style.color ? `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)` : undefined,
      ...style 
    }} 
  />
);

const AgentIcon = ({ Icon, image, color }) => {
  if (image) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-sm overflow-hidden" style={{ backgroundColor: color }}>
        <img 
          src={image} 
          alt="Agent" 
          className="w-6 h-6 object-contain"
          onError={(e) => {
            console.log('Image failed to load:', image);
            // Fallback to colored circle with initial
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<span class="text-white text-xs font-bold">${e.target.alt.charAt(0)}</span>`;
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm" style={{ color }}>
      <Icon size={16} strokeWidth={2.5} />
    </div>
  );
};

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

// Message Action Icons component for individual messages
const MessageActionIcons = ({ messageId, onActionClick }) => {
  const { theme, colors } = useTheme();
  const [actionStates, setActionStates] = useState({
    liked: false,
    disliked: false,
    copied: false,
    showCopiedText: false
  });

  const iconColor = theme === 'dark' ? colors.TEXT_HIGH_CONTRAST : colors.TEXT_LOW_CONTRAST;

  const handleAction = (action) => {
    if (action === 'copy') {
      // Copy functionality
      const messageText = document.querySelector(`[data-message-id="${messageId}"]`)?.textContent || '';
      navigator.clipboard.writeText(messageText);
      
      setActionStates(prev => ({ 
        ...prev, 
        copied: true, 
        showCopiedText: true 
      }));
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setActionStates(prev => ({ 
          ...prev, 
          copied: false, 
          showCopiedText: false 
        }));
      }, 2000);
    } else if (action === 'like') {
      setActionStates(prev => ({ 
        ...prev, 
        liked: !prev.liked, 
        disliked: false 
      }));
    } else if (action === 'dislike') {
      setActionStates(prev => ({ 
        ...prev, 
        disliked: !prev.disliked, 
        liked: false 
      }));
    }
    
    if (onActionClick) {
      onActionClick(messageId, action);
    }
  };

  return (
    <>
      {/* Copy Button with Tooltip */}
      <div className="relative">
        <button 
          className="p-1 transition-colors hover:opacity-80" 
          style={{ color: actionStates.copied ? colors.PRIMARY_COLOR : iconColor }}
          title="Copy"
          onClick={() => handleAction('copy')}
        >
          <Copy size={16} fill={actionStates.copied ? 'currentColor' : 'none'} />
        </button>
        {actionStates.showCopiedText && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
            Copied!
          </div>
        )}
      </div>

      {/* Like Button */}
      <button 
        className="p-1 transition-colors hover:opacity-80" 
        style={{ color: actionStates.liked ? colors.PRIMARY_COLOR : iconColor }}
        title="Like"
        onClick={() => handleAction('like')}
      >
        <ThumbsUp size={16} fill={actionStates.liked ? 'currentColor' : 'none'} />
      </button>

      {/* Dislike Button */}
      <button 
        className="p-1 transition-colors hover:opacity-80" 
        style={{ color: actionStates.disliked ? colors.RED_INCOMPLETE : iconColor }}
        title="Dislike"
        onClick={() => handleAction('dislike')}
      >
        <ThumbsDown size={16} fill={actionStates.disliked ? 'currentColor' : 'none'} />
      </button>

      {/* Reload Button */}
      <button 
        className="p-1 transition-colors hover:opacity-80" 
        style={{ color: iconColor }}
        title="Reload/Regenerate"
        onClick={() => handleAction('reload')}
      >
        <RotateCw size={16} />
      </button>
    </>
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

const ExpandedSidebar = ({ agents, threads, onBack, onAddNewChat, onSelectChat, chats }) => {
  const { colors } = useTheme();
  
  const ThreadLink = ({ children, onClick }) => (
    <a
      href="#"
      onClick={onClick}
      title={children} // Add tooltip with full title
      className="flex items-start p-1.5 rounded-lg text-sm transition-colors cursor-pointer hover:opacity-80 w-full"
      style={{
        color: colors.PRIMARY_COLOR, // Thread links use primary blue in both modes
        backgroundColor: colors.SURFACE_BG === '#121e33' ? 'transparent' : 'white', // Base background
      }}
    >
      <MessageSquare size={16} style={{ color: colors.PRIMARY_COLOR }} className="mr-1 mt-0.5 flex-shrink-0" />
      <span className="truncate hover:underline min-w-0 flex-1">{children}</span>
    </a>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Search Input */}
      <div className="flex-shrink-0 px-4 mt-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg focus:ring-0 focus:border-blue-500"
            style={{
              backgroundColor: colors.BUBBLE_BG_SYSTEM,
              color: colors.TEXT_HIGH_CONTRAST,
              borderColor: colors.BORDER,
            }}
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.TEXT_LOW_CONTRAST }} />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
        {/* Agents Section */}
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
                <AgentIcon Icon={agent.icon} image={agent.image} color={agent.color} />
                <span className="ml-3 text-sm" style={{ color: colors.TEXT_HIGH_CONTRAST }}>{agent.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div className="my-2" style={{ borderTop: `1px solid ${colors.BORDER}` }}></div>

        {/* Previous Threads Section */}
        <div className="pr-2">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-1 mt-3 text-left truncate" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>Previous Threads</h3>
          {threads.map((group, index) => (
            <div key={index} className="mb-4 overflow-hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-1 mt-3 text-left truncate" style={{ color: colors.TEXT_LOW_CONTRAST }}>{group.group}</h3>
              <div className="space-y-0.5 overflow-hidden">
                {group.links.map((link, linkIndex) => {
                  // Find the corresponding chat for this link
                  const correspondingChat = chats.find(chat => chat.title === link);
                  return (
                    <div key={linkIndex} className="w-full overflow-hidden">
                      <ThreadLink 
                        onClick={() => correspondingChat && onSelectChat(correspondingChat.id)}
                      >
                        {link}
                      </ThreadLink>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CollapsedSidebar = ({ onBack }) => {
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
        onClick={onBack}
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

const Sidebar = ({ isExpanded, toggleExpand, onBack, groupedChats, addNewChat, chats, onSelectChat }) => {
  const { theme, setTheme, colors } = useTheme();
  
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
      className={`h-full flex-shrink-0 relative flex flex-col transition-all duration-300 overflow-hidden`}
      style={{
        display: 'flex',
        width: isExpanded ? (theme === 'light' ? '295px' : '23%') : '64px',
        padding: isExpanded && theme === 'light' ? '24px 16px' : undefined,
        flexDirection: 'column',
        alignItems: theme === 'light' && isExpanded ? 'center' : undefined,
        gap: theme === 'light' && isExpanded ? '24px' : undefined,
        flexShrink: 0,
        alignSelf: 'stretch',
        minWidth: isExpanded ? (theme === 'light' ? '295px' : '200px') : '64px',
        maxWidth: isExpanded ? (theme === 'light' ? '295px' : '300px') : '64px',
        backgroundColor: theme === 'light' ? '#FFF' : colors.SURFACE_BG,
        borderColor: colors.BORDER,
        borderRightWidth: '1px',
        boxShadow: theme === 'light' ? '0 20px 40px 0 rgba(0, 47, 189, 0.10)' : '0 0 10px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Top Header Section */}
      <div className={`p-4 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} flex-shrink-0`} style={{ borderBottom: `1px solid ${colors.BORDER}` }}>
        {isExpanded ? (
          <>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 mr-2" style={{ borderColor: colors.PRIMARY_COLOR }}></div>
              <span className="text-xl font-bold" style={{ color: colors.TEXT_HIGH_CONTRAST }}>Pulse</span>
              <div className="w-4 h-4 border-2 ml-2" style={{ borderColor: colors.PRIMARY_COLOR }}></div>
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
            onClick={onBack}
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
          <ExpandedSidebar 
            agents={AGENTS} 
            threads={groupedChats} 
            onBack={onBack} 
            onAddNewChat={addNewChat}
            onSelectChat={onSelectChat}
            chats={chats}
          />
        ) : (
          <CollapsedSidebar onBack={onBack} />
        )}
      </div>

      {/* New Chat Button (Fixed at Bottom) */}
      <div className={`p-4 flex-shrink-0`} style={{ borderTop: `1px solid ${colors.BORDER}` }}>
        <button
          onClick={addNewChat}
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

const ChatBubble = ({ children, isUser, isStreaming, messageId, onActionClick }) => {
  const { colors } = useTheme();

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className="flex flex-col max-w-2xl w-full">
        <div
          className={`p-4 rounded-xl font-medium ${isUser ? 'ml-auto text-right' : 'mr-auto text-left'}`}
          style={{
            backgroundColor: isUser ? colors.BUBBLE_BG_USER : 'transparent', // Background color for user messages only
            color: isUser ? colors.TEXT_HIGH_CONTRAST : colors.TEXT_HIGH_CONTRAST, // Adjusted text color for user messages
            borderRadius: isUser ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem',
            maxWidth: 'fit-content',
            border: 'none' // No borders for any messages
          }}
        >
          <div className="text-sm text-left">
            {children}
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-current ml-1 animate-pulse">|</span>
            )}
          </div>
        </div>
        
        {/* Action Icons - only show for system messages (not user messages) */}
        {!isUser && (
          <div className="flex items-center space-x-2 mt-2 ml-1">
            <MessageActionIcons messageId={messageId} onActionClick={onActionClick} />
          </div>
        )}
      </div>
    </div>
  );
};

const DataTableComponent = ({ onActionClick }) => {
  const { colors } = useTheme();

  return (
    <div className="w-full mt-4">
      {/* Data Cards */}
      <div className="flex space-x-4 mb-8">
        <div className="p-4 rounded-xl border flex-1 min-w-[180px] shadow-md" style={{ backgroundColor: colors.SURFACE_BG, borderColor: colors.BORDER }}>
          <p className="text-4xl font-extrabold mb-1" style={{ color: colors.RED_INCOMPLETE }}>5</p>
          <p className="text-sm font-medium mb-2" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>Employees have not completed training</p>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" style={{ color: colors.TEXT_LOW_CONTRAST }} />
            <span className="text-xs font-semibold" style={{ color: colors.TEXT_LOW_CONTRAST }}>Workday</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex-1 min-w-[180px] shadow-md" style={{ backgroundColor: colors.SURFACE_BG, borderColor: colors.BORDER }}>
          <p className="text-4xl font-extrabold mb-1" style={{ color: colors.AGENT_GREEN }}>19</p>
          <p className="text-sm font-medium mb-2" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>Employees completed training</p>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" style={{ color: colors.TEXT_LOW_CONTRAST }} />
            <span className="text-xs font-semibold" style={{ color: colors.TEXT_LOW_CONTRAST }}>Workday</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex-1 min-w-[180px] shadow-md" style={{ backgroundColor: colors.SURFACE_BG, borderColor: colors.BORDER }}>
          <p className="text-4xl font-extrabold mb-1" style={{ color: colors.AGENT_BLUE }}>24</p>
          <p className="text-sm font-medium mb-2" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>Total Employees reporting to you</p>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" style={{ color: colors.TEXT_LOW_CONTRAST }} />
            <span className="text-xs font-semibold" style={{ color: colors.TEXT_LOW_CONTRAST }}>Workday</span>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <h4 className="text-base font-bold mb-3" style={{ color: colors.TEXT_HIGH_CONTRAST }}>Who hasn't completed training:</h4>
      <div className="rounded-xl shadow-md overflow-hidden" style={{ backgroundColor: colors.SURFACE_BG, border: `1px solid ${colors.BORDER}` }}>
        {/* Table Header */}
        <div className="flex p-4 text-sm font-semibold" style={{ color: colors.TEXT_MEDIUM_CONTRAST, borderBottom: `1px solid ${colors.BORDER}` }}>
          <span className="w-1/4">Name</span>
          <span className="w-1/4">Employee ID</span>
          <span className="w-1/3">Email</span>
          <span className="w-auto">Status</span>
        </div>

        {/* Table Rows */}
        {[
          { name: 'Desai, Priyo', id: 'AG123456', email: 'Priyo.Desai@relevancehealth.com', status: 'Incomplete' },
          { name: 'Garcia, Sophia', id: 'AG123456', email: 'Sophia.Garcia@relevancehealth.com', status: 'Incomplete' },
          { name: 'Johnson, Alex', id: 'AG123456', email: 'Alex.Johnson@relevancehealth.com', status: 'Incomplete' },
          { name: 'Lin, Marco', id: 'AG123456', email: 'Marco.Lin@relevancehealth.com', status: 'Incomplete' },
          { name: 'Miller, Ethan', id: 'AG123456', email: 'Ethan.Miller@relevancehealth.com', status: 'Incomplete' }
        ].map((row, index) => (
          <div
            key={index}
            className="flex p-4 text-sm border-b last:border-b-0 transition-colors"
            style={{ borderColor: colors.BORDER, backgroundColor: colors.SURFACE_BG }}
            onMouseEnter={(e) => {
              if (colors.SURFACE_BG === '#121e33') {
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

      <p className="text-base mt-8" style={{ color: colors.TEXT_MEDIUM_CONTRAST }}>
        Do you want me to send email reminders to those team members?
      </p>

      {/* Action Icons for Data Table Response */}
      <div className="flex items-center space-x-2 mt-4">
        <MessageActionIcons messageId="3" onActionClick={onActionClick} />
      </div>
    </div>
  );
};

const MainContent = ({ userQuestion, currentChat, onUpdateChatTitle, refreshTrigger }) => {
  const { colors } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef(null);
  const [chatMessages, setChatMessages] = useState(() => {
    // Use current chat's messages if available
    if (currentChat?.messages && currentChat.messages.length > 0) {
      return [...currentChat.messages];
    }
    
    // For new chats or chats without messages, start empty
    if (currentChat?.title === 'New Chat') {
      return [];
    }
    
    // Fallback for other cases
    const initialQuestion = currentChat?.title || userQuestion || "Who from my team hasn't completed the Cyber Security Training?";
    
    return [
      {
        id: 1,
        isUser: true,
        text: initialQuestion,
        timestamp: new Date()
      },
      {
        id: 2,
        isUser: false,
        text: "Give me a moment",
        hasSourceIcons: true,
        isLoading: true,
        timestamp: new Date()
      }
    ];
  });

  // Auto-start streaming for the initial data response
  useEffect(() => {
    const timer = setTimeout(() => {
      // Replace loading message with data response that has table format
      setChatMessages(prev => prev.filter(msg => !msg.isLoading));
      
      const streamingMessage = {
        id: 3,
        isUser: false,
        text: "Based on the latest records, this is currently where your team members stand in regards to the Do The Right Thing: Cyber Security Training 2025:",
        isStreaming: false,
        hasDataTable: true, // Special flag for rendering data table
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, streamingMessage]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle chat changes - load messages for selected chat
  useEffect(() => {
    if (currentChat?.title === 'New Chat') {
      setChatMessages([
        {
          id: 1,
          isUser: false,
          text: "Hello! I'm your AI assistant. I can help you with various tasks like finding information, analyzing data, creating reports, and much more. What would you like to know or work on today?",
          timestamp: new Date()
        }
      ]);
    } else if (currentChat?.messages) {
      setChatMessages([...currentChat.messages]);
    }
  }, [refreshTrigger, currentChat?.id]);

  const handleSendMessage = () => {
    if (inputValue.trim() && !isStreaming) {
      const userInput = inputValue.trim();
      setInputValue('');
      setIsStreaming(true);

      // Generate title from first question if current chat is "New Chat"
      if (currentChat?.title === 'New Chat' && onUpdateChatTitle) {
        const generatedTitle = userInput.length > 50 
          ? userInput.substring(0, 50) + '...' 
          : userInput;
        onUpdateChatTitle(currentChat.id, generatedTitle);
      }

      // Add user message
      const userMessage = {
        id: Date.now(),
        isUser: true,
        text: userInput,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, userMessage]);

      // Add initial "Give me a moment" message
      const loadingMessage = {
        id: Date.now() + 1,
        isUser: false,
        text: "Give me a moment",
        hasSourceIcons: true,
        isLoading: true,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, loadingMessage]);

      // After 2 seconds, start streaming the actual response
      setTimeout(() => {
        const fullResponse = `I understand you're asking about "${userInput}". Let me analyze this information and provide you with relevant insights based on the available data from our systems.`;
        
        // Remove loading message and start streaming
        setChatMessages(prev => prev.filter(msg => !msg.isLoading));
        
        const streamingMessage = {
          id: Date.now() + 2,
          isUser: false,
          text: "",
          isStreaming: true,
          fullText: fullResponse,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, streamingMessage]);
        
        // Stream text word by word
        streamText(fullResponse, Date.now() + 2);
      }, 2000);
    }
  };

  const streamText = (fullText, messageId) => {
    const words = fullText.split(' ');
    let currentIndex = 0;

    const streamInterval = setInterval(() => {
      if (currentIndex < words.length) {
        const currentText = words.slice(0, currentIndex + 1).join(' ');
        
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, text: currentText }
              : msg
          )
        );
        currentIndex++;
      } else {
        // Streaming complete
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
        setIsStreaming(false);
        clearInterval(streamInterval);
      }
    }, 100); // Stream one word every 100ms
  };

  const handleActionClick = (messageId, action) => {
    console.log(`Action ${action} clicked for message ${messageId}`);
    
    if (action === 'reload') {
      // Find the message and regenerate it with additional text
      setChatMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId && !msg.isUser) {
            return {
              ...msg,
              text: msg.text + " [Regenerated] Here's additional context and updated information based on the latest data analysis."
            };
          }
          return msg;
        })
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col flex-grow h-full overflow-hidden">
      {/* Chat History Area (Scrollable) */}
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto px-12 py-8">
        {/* Dynamic Chat Messages */}
        {chatMessages.map((message) => (
          <div key={message.id}>
            <ChatBubble 
              isUser={message.isUser} 
              isStreaming={message.isStreaming}
              messageId={message.id}
              onActionClick={handleActionClick}
            >
              <div data-message-id={message.id}>
                {message.text}
                {message.hasSourceIcons && (
                  <div className="flex items-center text-sm font-normal mt-2" style={{ color: colors.TEXT_LOW_CONTRAST }}>
                    Fetching Data from:
                    <SourceIcon text="Service Now" color={colors.AGENT_GREEN} />
                    <SourceIcon text="Workday" color={colors.AGENT_TEAL} />
                    <SourceIcon text="Pulse" color={colors.PRIMARY_COLOR} />
                    <SourceIcon text="Outlook" color={colors.AGENT_BLUE} />
                  </div>
                )}
              </div>
            </ChatBubble>
            {message.hasDataTable && (
              <div className="mb-6 mx-auto w-full max-w-6xl">
                <DataTableComponent onActionClick={handleActionClick} />
              </div>
            )}
          </div>
        ))}

        {/* All content is now handled dynamically through chatMessages */}
      </div>

      {/* Bottom Input Bar (Fixed) */}
      <div className="flex-shrink-0 px-12 py-4" style={{ background: colors.MAIN_BG }}>
        <div
          className="flex items-center p-3 rounded-full border"
          style={{ 
            borderColor: colors.PRIMARY_COLOR, 
            background: colors.MAIN_BG === 'radial-gradient(at 50% 15%, #182845, #0b1626 90%)' ? colors.MAIN_BG : 'white'
          }}
        >
          <input
            type="text"
            placeholder={isStreaming ? "Processing your request..." : "Ask anything"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isStreaming}
            className="flex-grow text-lg focus:outline-none bg-transparent pl-4"
            style={{ 
              color: colors.TEXT_HIGH_CONTRAST,
              opacity: isStreaming ? 0.5 : 1
            }}
          />
          <button
            onClick={handleSendMessage}
            className="mr-3 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: (inputValue.trim() && !isStreaming) ? colors.PRIMARY_COLOR : colors.TEXT_LOW_CONTRAST }}
            disabled={!inputValue.trim() || isStreaming}
          >
            <Send size={24} />
          </button>
          <Mic size={24} className="cursor-pointer hover:opacity-80" style={{ color: colors.TEXT_LOW_CONTRAST }} />
        </div>
      </div>
    </div>
  );
};

// --- APP COMPONENT ---

const App = ({ onBack, userQuestion }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chats, setChats] = useState([
    {
      id: 1,
      title: userQuestion || "Who from my team hasn't completed the Cyber Security Training?",
      group: 'Today',
      timestamp: new Date(),
      messages: [
        {
          id: 1,
          isUser: true,
          text: userQuestion || "Who from my team hasn't completed the Cyber Security Training?",
          timestamp: new Date()
        },
        {
          id: 2,
          isUser: false,
          text: "Give me a moment",
          hasSourceIcons: true,
          isLoading: true,
          timestamp: new Date()
        }
      ]
    },
    // Yesterday chats
    {
      id: 2,
      title: "Can you create a service IT ticket for printer issue?",
      group: 'Yesterday',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "Can you create a service IT ticket for printer issue?",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          isUser: false,
          text: "I'll help you create a service ticket for the printer issue. Could you provide more details about the specific problem you're experiencing?",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 3,
      title: "What are the latest project updates from the team?",
      group: 'Yesterday',
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "What are the latest project updates from the team?",
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000)
        },
        {
          id: 2,
          isUser: false,
          text: "Here are the latest project updates from your team based on recent communications and reports...",
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000)
        }
      ]
    },
    // Last week chats
    {
      id: 4,
      title: "Can you find confluence pages related to API documentation?",
      group: 'Last week',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "Can you find confluence pages related to API documentation?",
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          isUser: false,
          text: "I found several Confluence pages related to API documentation. Here are the most relevant ones...",
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 5,
      title: "What are the key metrics we should track for Q4?",
      group: 'Last week',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "What are the key metrics we should track for Q4?",
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    // Last month chats
    {
      id: 6,
      title: "Help me analyze our customer satisfaction survey results",
      group: 'Last month',
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "Help me analyze our customer satisfaction survey results",
          timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          isUser: false,
          text: "I'll help you analyze the customer satisfaction survey results. Let me break down the key findings and trends...",
          timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 7,
      title: "Create a summary report for the monthly team meeting",
      group: 'Last month',
      timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      messages: [
        {
          id: 1,
          isUser: true,
          text: "Create a summary report for the monthly team meeting",
          timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        }
      ]
    }
  ]);
  const themeManager = useThemeManager();
  
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const addNewChat = useCallback(() => {
    const newChatId = Math.max(...chats.map(c => c.id)) + 1;
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      group: 'Today',
      timestamp: new Date(),
      messages: []
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh in MainContent
  }, [chats]);

  const selectChat = useCallback((chatId) => {
    setCurrentChatId(chatId);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const updateChatTitle = useCallback((chatId, newTitle) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
  }, []);

  // Group chats by time periods
  const groupedChats = useMemo(() => {
    const groups = {};
    chats.forEach(chat => {
      if (!groups[chat.group]) {
        groups[chat.group] = [];
      }
      groups[chat.group].push(chat);
    });
    
    // Convert to array format with counts
    return Object.entries(groups).map(([group, chatList]) => ({
      group: `${group} (${chatList.length})`,
      links: chatList.map(chat => chat.title)
    }));
  }, [chats]);

  const currentChat = chats.find(chat => chat.id === currentChatId);

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
        {/* Builder.io Generated Sidebar */}
        <MenuSidebar onBack={onBack} />

        {/* Main Content Area */}
        <MainContent 
          userQuestion={userQuestion} 
          currentChat={currentChat}
          onUpdateChatTitle={updateChatTitle}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
