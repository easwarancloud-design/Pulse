import React, { useState, useEffect } from 'react';
import { Search, Plus, ArrowLeft, Sun, Edit2, Trash2, Check, X } from 'lucide-react';
import ChatIcon from './components/ChatIcon';
import JiraIcon from './components/JiraIcon';
import ServiceNowIcon from './components/ServiceNowIcon';

const MenuSidebar = ({ 
  onBack, 
  onToggleTheme, 
  isDarkMode, 
  onNewChat, 
  onThreadSelect, 
  currentActiveThread, 
  isNewChatActive,
  searchQuery = '',
  isSearchActive = false,
  onSearch = () => {}
}) => {
  const [isDarkModeLocal, setIsDarkModeLocal] = useState(isDarkMode || false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filteredThreads, setFilteredThreads] = useState({
    today: [],
    yesterday: [],
    lastWeek: [],
    last30Days: []
  });

  // Load threads from localStorage or use default
  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading threads from localStorage:', error);
    }
    return {
      today: [],
      lastWeek: [
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
        }
      ],
      last30Days: [
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
      ]
    };
  };

  const [allThreads, setAllThreads] = useState(loadThreadsFromStorage());
  
  // Refresh threads when component mounts or when localStorage changes
  useEffect(() => {
    const refreshThreads = () => {
      setAllThreads(loadThreadsFromStorage());
    };
    
    // Listen for storage events to refresh when other tabs update localStorage
    window.addEventListener('storage', refreshThreads);
    
    // Also set up an interval to refresh periodically (in case same-tab updates don't trigger storage event)
    const interval = setInterval(refreshThreads, 1000);
    
    return () => {
      window.removeEventListener('storage', refreshThreads);
      clearInterval(interval);
    };
  }, []);
  
  // Filter threads based on search query
  useEffect(() => {
    if (!searchQuery || searchQuery.length === 0) {
      setFilteredThreads({
        today: [],
        yesterday: [],
        lastWeek: [],
        last30Days: []
      });
      return;
    }

    const query = searchQuery.toLowerCase();
    
    const filtered = {
      today: allThreads.today.filter(thread => 
        thread.title.toLowerCase().includes(query)
      ),
      yesterday: [], // Add yesterday logic if needed
      lastWeek: allThreads.lastWeek.filter(thread => 
        thread.title.toLowerCase().includes(query)
      ),
      last30Days: allThreads.last30Days.filter(thread => 
        thread.title.toLowerCase().includes(query)
      )
    };

    setFilteredThreads(filtered);
  }, [searchQuery, allThreads]);
  
  // Handle thread rename
  const handleRenameThread = (threadId, newTitle) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const threads = JSON.parse(stored);
        
        // Find and update the thread in the appropriate category
        const categories = ['today', 'lastWeek', 'last30Days'];
        for (const category of categories) {
          const threadIndex = threads[category].findIndex(t => t.id === threadId);
          if (threadIndex !== -1) {
            threads[category][threadIndex].title = newTitle;
            localStorage.setItem('chatThreads', JSON.stringify(threads));
            setAllThreads(threads);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error renaming thread:', error);
    }
    setEditingThreadId(null);
    setEditingTitle('');
  };

  // Handle thread deletion
  const handleDeleteThread = (threadId) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const threads = JSON.parse(stored);
        
        // Find and remove the thread from the appropriate category
        const categories = ['today', 'lastWeek', 'last30Days'];
        for (const category of categories) {
          threads[category] = threads[category].filter(t => t.id !== threadId);
        }
        
        localStorage.setItem('chatThreads', JSON.stringify(threads));
        setAllThreads(threads);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
    setShowDeleteConfirm(null);
  };
  
  // Start editing a thread title
  const startEditing = (thread, e) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditingTitle('');
  };

  // Helper function to render a thread item
  const renderThreadItem = (thread) => (
    <div
      key={thread.id}
      onClick={() => onThreadSelect(thread)}
      className={`group flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors w-full ${
        currentActiveThread?.id === thread.id
          ? (isDarkMode ? 'bg-[#1F3E81]' : 'bg-blue-50')
          : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
      }`}
    >
      <ChatIcon className="w-6 h-6 flex-shrink-0" color={isDarkMode ? "#FFF" : "#2861BB"} />
      
      {editingThreadId === thread.id ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRenameThread(thread.id, editingTitle);
              } else if (e.key === 'Escape') {
                cancelEditing();
              }
            }}
            className="flex-1 px-2 py-1 text-sm border rounded"
            style={{ 
              background: isDarkMode ? '#1F3E81' : '#FFF',
              color: isDarkMode ? '#FFF' : '#000',
              border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
            }}
            autoFocus
          />
          <button
            onClick={() => handleRenameThread(thread.id, editingTitle)}
            className="p-1 hover:opacity-70"
          >
            <Check size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
          </button>
          <button
            onClick={cancelEditing}
            className="p-1 hover:opacity-70"
          >
            <X size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
          </button>
        </div>
      ) : (
        <>
          <span
            className="flex-1 min-w-0"
            style={isDarkMode ? {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              color: '#FFF',
              textOverflow: 'ellipsis',
              fontFamily: 'Elevance Sans',
              fontSize: '14px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '16px'
            } : {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              color: '#2861BB',
              textOverflow: 'ellipsis',
              fontFamily: 'Elevance Sans',
              fontSize: '14px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '16px'
            }}
          >
            {thread.title}
          </span>
          
          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => startEditing(thread, e)}
              className="p-1 hover:opacity-70"
              title="Rename conversation"
            >
              <Edit2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(thread.id);
              }}
              className="p-1 hover:opacity-70"
              title="Delete conversation"
            >
              <Trash2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
            </button>
          </div>
        </>
      )}
    </div>
  );

  const agents = [
    { id: 1, name: 'HR Assistant', type: 'hr', bgColor: '#44B8F3' },
    { id: 2, name: 'Jira Agent', type: 'jira' },
    { id: 3, name: 'Service Now Agent', type: 'servicenow' }
  ];

  return (
    <div className={`${isCollapsed ? 'w-[80px]' : 'w-[295px]'} ${isDarkMode ? 'bg-[#03112F]' : 'bg-white'} flex flex-col h-screen shadow-[0_20px_40px_0_rgba(0,47,189,0.10)] transition-all duration-300`}>
      {/* Fixed Top Section */}
      <div className="flex flex-col px-4 pt-6 pb-4 gap-6 flex-shrink-0">
        {/* Top Header */}
        <div className="flex h-10 items-center justify-between">
          {/* Logo - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex-1">
              <svg width="162" height="23" viewBox="0 0 162 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.06779 9.46522L10.8003 21.3309C10.8528 21.5547 10.911 21.6206 10.9647 21.6666C11.0594 21.7479 11.1884 21.7785 11.3227 21.7785C11.4472 21.7846 11.534 21.7383 11.636 21.6666C11.7379 21.5949 11.849 21.4501 11.8853 21.3309L15.7121 10.7418H23.4121C23.781 10.7418 24.018 10.6272 24.2789 10.3663C24.5397 10.1054 24.7264 9.72825 24.7264 9.35934C24.7264 8.99042 24.5397 8.61324 24.2789 8.35238C24.018 8.09152 23.781 7.95985 23.4121 7.95985H14.757C14.4873 7.95995 14.2251 8.04819 14.0102 8.21114C13.7954 8.37409 13.6397 8.60281 13.5669 8.86245L11.7648 15.292L9.06262 2.08694C9.03931 1.96406 8.93299 1.83366 8.83885 1.75129C8.74472 1.66893 8.6281 1.6462 8.5032 1.63941C8.37863 1.63205 8.27051 1.68067 8.16755 1.75118C8.06458 1.82169 7.98196 1.96806 7.94378 2.08686L5.598 8.53479H1.391C1.02208 8.53479 0.668277 8.68135 0.407414 8.94221C0.146551 9.20307 0 9.55688 0 9.92579C0 10.2947 0.146551 10.6485 0.407414 10.9094C0.668277 11.1702 1.02208 11.3168 1.391 11.3168H6.47896C6.76814 11.3172 7.04991 11.2254 7.28337 11.0547C7.51683 10.8841 7.68982 10.6435 7.77723 10.3678L8.06779 9.46522Z" fill="#87D2F7"/>
                <path d="M58.428 19.0425L58.8024 21.9626L58.6278 22.0208C58.1438 22.1821 57.5237 22.3142 57.022 22.3142C56.0327 22.3142 55.0543 21.9837 54.3236 21.2278C53.5923 20.4713 53.1329 19.3136 53.1329 17.7046V0H56.3372V17.7359C56.3372 18.3534 56.5057 18.738 56.7254 18.9673C56.9452 19.1967 57.2424 19.2978 57.5545 19.2978C57.7359 19.2978 57.9562 19.2447 58.1556 19.1592L58.428 19.0425Z" fill="#2861BB"/>
                <path d="M41.0709 6.54746V15.073C41.0709 16.3462 41.442 17.3865 42.0727 18.1052C42.701 18.8212 43.6015 19.2351 44.7004 19.2351C45.8162 19.2351 46.7328 18.8203 47.3726 18.1038C48.0144 17.3849 48.3926 16.345 48.3926 15.073V6.54746H51.6283V15.2923C51.6283 17.3783 50.9455 19.1297 49.727 20.3604C48.5083 21.5913 46.772 22.2829 44.7004 22.2829C42.644 22.2829 40.9231 21.5909 39.7162 20.3596C38.5098 19.1287 37.8352 17.3775 37.8352 15.2923V6.54746H41.0709Z" fill="#2861BB"/>
                <path d="M21.6836 11.7076V22.0005H24.9506V14.6698H28.8621C31.2348 14.6698 33.2238 14.0249 34.624 12.8682C36.0282 11.7082 36.8238 10.0464 36.8238 8.05524C36.8238 6.06479 36.0365 4.41063 34.6437 3.25811C33.255 2.10898 31.2815 1.47198 28.9247 1.47198H21.6836V6.78473H24.9506V4.45705H29.1754C30.4661 4.45705 31.5311 4.82136 32.2693 5.44577C33.0041 6.06722 33.4314 6.95921 33.4314 8.05524C33.4314 9.15155 33.0039 10.0518 32.2684 10.6812C31.5298 11.3133 30.4649 11.6848 29.1754 11.6848L25.0625 11.7076H21.6836Z" fill="#2861BB"/>
                <path d="M70.0517 10.1616L70.2596 10.2778L71.5557 7.57458L71.3542 7.47767C69.7039 6.68425 68.0728 6.17111 65.9942 6.17111C62.2837 6.17111 60.1315 8.20265 60.1315 10.5928C60.1315 12.1069 60.6925 13.1271 61.5423 13.8447C62.3794 14.5514 63.484 14.9534 64.552 15.2714C64.8425 15.358 65.129 15.438 65.4077 15.5159L65.4083 15.5161L65.4086 15.5162C66.1732 15.7299 66.8792 15.9272 67.4495 16.1962C67.8335 16.3774 68.1339 16.5821 68.3378 16.8285C68.5374 17.0697 68.6526 17.3604 68.6526 17.7355C68.6526 18.2586 68.437 18.6902 67.9861 19C67.5246 19.317 66.8003 19.5167 65.7749 19.5167C64.1011 19.5167 62.6651 19.0315 60.9908 18.1634L60.7836 18.056L59.5343 20.7382L59.7087 20.8416C61.2792 21.771 63.3237 22.3765 65.587 22.3765C67.5331 22.3765 69.0971 21.89 70.1802 21.0531C71.2677 20.2128 71.857 19.028 71.857 17.6729C71.857 16.1816 71.2992 15.1769 70.4553 14.4694C69.6244 13.7729 68.5279 13.3749 67.4683 13.057C67.1935 12.9746 66.9224 12.8978 66.6582 12.8229L66.6579 12.8228C65.884 12.6035 65.1689 12.4008 64.5937 12.1232C64.213 11.9394 63.9147 11.7316 63.712 11.4817C63.5134 11.2367 63.3985 10.9415 63.3985 10.5615C63.3985 10.1036 63.6205 9.74157 64.0665 9.48229C64.5239 9.21638 65.2154 9.06229 66.1195 9.06229C67.5124 9.06229 69.0099 9.57945 70.0517 10.1616Z" fill="#2861BB"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M86.8791 19.9419L86.7502 20.0807C85.479 21.4497 83.2851 22.3765 80.822 22.3765C76.1193 22.3765 72.735 18.7309 72.735 14.2581C72.735 9.79532 75.9845 6.17111 80.3834 6.17111C84.7116 6.17111 88.0005 9.63024 88.0005 13.9762C88.0005 14.1695 87.9924 14.4098 87.9764 14.6307C87.9608 14.845 87.9363 15.0622 87.8979 15.1968L87.8515 15.3591H76.0706C76.4919 17.7276 78.3396 19.4541 80.916 19.4541C82.5504 19.4541 83.9966 18.8182 84.9556 17.8592L85.1357 17.6791L86.8791 19.9419ZM83.1469 10.0031C82.4236 9.34997 81.4914 8.99958 80.4147 8.99958C78.2826 8.99958 76.7049 10.4685 76.154 12.6247H84.587C84.3237 11.4915 83.8198 10.6109 83.1469 10.0031Z" fill="#2861BB"/>
              </svg>
            </div>
          )}

          {/* Menu Icon - Clickable, centered when collapsed */}
          <div className={`${isCollapsed ? 'flex justify-center w-full' : 'flex-shrink-0'}`}>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:opacity-70">
              <svg width="20" height="20" viewBox="0 0 42 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8V32H34V8H8ZM10.1667 10.1818H17.75V29.8182H10.1667V10.1818ZM19.9167 10.1818H31.8333V29.8182H19.9167V10.1818Z" fill={isDarkMode ? '#FFF' : '#2861BB'}/>
              </svg>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex h-10 items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-1 hover:opacity-70"
          >
            <ArrowLeft size={20} color={isDarkMode ? "#FFF" : "#2861BB"} />
          </button>
          
          {!isCollapsed && (
            <span 
              style={{ 
                color: isDarkMode ? '#FFF' : '#2861BB', 
                fontSize: '16px', 
                fontWeight: 600, 
                lineHeight: '16px' 
              }}
            >
              Back to search
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Section */}
        <div className="flex flex-col px-4 pb-6 gap-6 flex-1 overflow-y-auto">
          {/* Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={onToggleTheme}
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: '36px',
                height: '36px',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #44B8F3',
                background: 'rgba(5, 15, 38, 0.40)'
              }}
            >
              <Sun size={20} color="#44B8F3" />
            </button>
            
            {!isCollapsed && (
              <span style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600 }}>
                Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
              </span>
            )}
          </div>

          {/* Agents Section */}
          <div className="flex flex-col items-start gap-4">
            {/* Agents Header */}
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 w-full px-2">
                <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
                  Agents
                </div>
              </div>
            )}

            {/* Agent Buttons */}
            <div className="flex flex-col items-start gap-3 w-full">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:opacity-80 transition-opacity"
                  style={{
                    background: agent.bgColor || '#44B8F3',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                  }}
                >
                  {agent.type === 'hr' && <ChatIcon className="w-6 h-6 flex-shrink-0" color="#FFF" />}
                  {agent.type === 'jira' && <JiraIcon className="w-6 h-6 flex-shrink-0" />}
                  {agent.type === 'servicenow' && <ServiceNowIcon className="w-6 h-6 flex-shrink-0" />}
                  
                  {!isCollapsed && (
                    <span className="text-white text-sm font-medium">
                      {agent.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Section */}
          {!isCollapsed && (
            <div className="w-full px-2 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: isDarkMode ? '#999' : '#666' }} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  style={{
                    backgroundColor: isDarkMode ? '#1a2332' : '#f8f9fa',
                    borderColor: isDarkMode ? '#374151' : '#d1d5db',
                    color: isDarkMode ? '#fff' : '#374151'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
                    style={{ color: isDarkMode ? '#999' : '#666' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Previous Threads Section */}
          <div className="flex flex-col items-start gap-4 mb-6">
            {/* Divider */}
            <div className="w-full h-px" style={{ backgroundColor: isDarkMode ? '#444' : '#CCC' }} />

            {/* Previous Threads Header */}
            <div className="flex items-center gap-2.5 w-full px-2">
              <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
                {isSearchActive ? `Search Results for "${searchQuery}"` : 'Previous Threads'}
              </div>
            </div>

            {/* Search Results or Normal Threads List */}
            {isSearchActive ? (
              // Show search results
              <div className="flex flex-col items-start gap-6 w-full">
                {(() => {
                  const hasResults = Object.values(filteredThreads).some(threads => threads.length > 0);
                  
                  if (!hasResults) {
                    return (
                      <div className="w-full px-2 py-8 text-center" style={{ color: isDarkMode ? '#999' : '#666' }}>
                        No conversations found for "{searchQuery}"
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Today Search Results */}
                      {filteredThreads.today.length > 0 && (
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center gap-2.5 w-full pl-2">
                            <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                              Today ({filteredThreads.today.length})
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 w-full">
                            {filteredThreads.today.map((thread) => (
                              <div key={thread.id} className="w-full">
                                {renderThreadItem(thread)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Last Week Search Results */}
                      {filteredThreads.lastWeek.length > 0 && (
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center gap-2.5 w-full pl-2">
                            <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                              Last Week ({filteredThreads.lastWeek.length})
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 w-full">
                            {filteredThreads.lastWeek.map((thread) => (
                              <div key={thread.id} className="w-full">
                                {renderThreadItem(thread)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Last 30 Days Search Results */}
                      {filteredThreads.last30Days.length > 0 && (
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center gap-2.5 w-full pl-2">
                            <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                              Last 30 Days ({filteredThreads.last30Days.length})
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 w-full">
                            {filteredThreads.last30Days.map((thread) => (
                              <div key={thread.id} className="w-full">
                                {renderThreadItem(thread)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              // Show normal threads list
              <div className="flex flex-col items-start gap-6 w-full">
                {/* Today Section */}
                {allThreads.today.length > 0 && (
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2.5 w-full pl-2">
                      <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                        Today ({allThreads.today.length})
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 w-full">
                      {allThreads.today.map((thread) => (
                        <div key={thread.id} className="w-full">
                          {renderThreadItem(thread)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Week Section */}
                {allThreads.lastWeek.length > 0 && (
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2.5 w-full pl-2">
                      <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                        Last week ({allThreads.lastWeek.length})
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 w-full">
                      {allThreads.lastWeek.map((thread) => (
                        <div key={thread.id} className="w-full">
                          {renderThreadItem(thread)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last 30 Days Section */}
                {allThreads.last30Days.length > 0 && (
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2.5 w-full pl-2">
                      <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                        Last 30 days ({allThreads.last30Days.length})
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 w-full">
                      {allThreads.last30Days.map((thread) => (
                        <div key={thread.id} className="w-full">
                          {renderThreadItem(thread)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Button - Fixed at Bottom */}
      <div
        className="flex h-[66px] items-center justify-center px-3 py-3 border-t flex-shrink-0"
        style={{ borderColor: isDarkMode ? '#444' : '#CCC', backgroundColor: isDarkMode ? '#03112F' : '#FFF' }}
      >
        <button
          onClick={() => onNewChat && onNewChat()}
          disabled={isNewChatActive}
          className={`flex items-center justify-center gap-1 transition-colors ${
            isCollapsed ? 'w-10 h-10 rounded' : 'w-full h-10 rounded'
          } ${
            isNewChatActive 
              ? 'bg-gray-300 cursor-not-allowed' 
              : (isDarkMode ? 'bg-[#2861BB] hover:bg-[#1F4B8A]' : 'bg-[#2861BB] hover:bg-[#1F4B8A]')
          }`}
        >
          <Plus size={20} color="#FFF" />
          {!isCollapsed && (
            <span className="text-white text-sm font-medium">
              New Chat
            </span>
          )}
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4" style={{ backgroundColor: isDarkMode ? '#1F3E81' : '#FFF' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#FFF' : '#000' }}>
              Delete Conversation
            </h3>
            <p className="mb-4" style={{ color: isDarkMode ? '#CCC' : '#666' }}>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteThread(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 px-4 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: isDarkMode ? '#444' : '#E5E7EB',
                  color: isDarkMode ? '#FFF' : '#374151'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuSidebar;