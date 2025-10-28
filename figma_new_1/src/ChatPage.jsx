import React, { useState, useRef, useEffect } from 'react';
import MenuSidebar from './MenuSidebar';

const ChatPage = ({ onBack, userQuestion, onToggleTheme, isDarkMode, currentThread, isNewChat, isNewChatActive, onNewChat, onThreadSelect, onFirstMessage }) => {
  const [userInput, setUserInput] = useState(() => {
    // Pre-fill input if this is a new chat with a predefined question
    if (isNewChat && userQuestion && currentThread?.title === 'New Chat') {
      return userQuestion;
    }
    return '';
  });
  
  const [messages, setMessages] = useState(() => {
    if (currentThread?.conversation && currentThread.conversation.length > 0) {
      // Load existing conversation from thread
      return currentThread.conversation.map((msg, index) => ({
        id: index + 1,
        type: msg.type,
        text: msg.text,
        showTable: msg.showTable || (msg.type === 'assistant' && index === 1), // Show table for first assistant response
        isWelcome: msg.isWelcome || false
      }));
    } else if (userQuestion && !isNewChat && !currentThread?.conversation?.length) {
      // Coming from main page with a manual question - show immediate response
      return [
        {
          id: 1,
          type: 'user',
          text: userQuestion
        },
        {
          id: 2,
          type: 'assistant',
          text: 'Based on the latest records, this is currently where your team members stand in regards to the Do The Right Thing: Cyber Security Training 2025:',
          showTable: true
        }
      ];
    } else if (isNewChat) {
      // New chat - show welcome message but don't pre-fill if question is for input
      return [
        {
          id: 1,
          type: 'assistant',
          text: 'Hi, how can I help you today?',
          isWelcome: true,
          suggestions: [
            'Workday questions',
            'Pulse HR policies',
            'Employee benefits',
            'IT support tickets'
          ]
        }
      ];
    } else {
      return [
        {
          id: 1,
          type: 'user',
          text: 'Who from my team  hasn\'t completed the Cyber Security Training?'
        },
        {
          id: 2,
          type: 'assistant',
          text: 'Based on the latest records, this is currently where your team members stand in regards to the Do The Right Thing: Cyber Security Training 2025:',
          showTable: true
        }
      ];
    }
  });
  const [likedMessages, setLikedMessages] = useState(new Set());
  const [dislikedMessages, setDislikedMessages] = useState(new Set());
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save thread when coming from main page
  useEffect(() => {
    if (userQuestion && !isNewChat && currentThread && messages.length >= 2) {
      const threadToSave = {
        ...currentThread,
        conversation: messages
      };
      saveThreadToStorage(threadToSave);
    }
  }, [userQuestion, isNewChat, currentThread, messages]);

  // Update messages when thread changes
  useEffect(() => {
    if (currentThread?.conversation && !isNewChat && !userQuestion) {
      const threadMessages = currentThread.conversation.map((msg, index) => ({
        id: index + 1,
        type: msg.type,
        text: msg.text,
        showTable: msg.showTable || (msg.type === 'assistant' && index === 1),
        isWelcome: msg.isWelcome || false
      }));
      setMessages(threadMessages);
    }
  }, [currentThread, isNewChat, userQuestion]);

  // Handle new chat initialization
  useEffect(() => {
    if (isNewChat && currentThread && currentThread.conversation.length === 0) {
      const welcomeMessages = [
        {
          id: 1,
          type: 'assistant',
          text: 'Hello! I\'m here to help you with any questions you might have. You can ask me about:',
          isWelcome: true,
          suggestions: [
            'Creating IT service tickets',
            'Finding confluence documentation', 
            'Project updates and metrics',
            'HR policies and procedures',
            'Team management insights'
          ]
        }
      ];
      setMessages(welcomeMessages);
    }
  }, [isNewChat, currentThread]);

  const generateResponse = (userMessage) => {
    // Simple response logic based on keywords
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('ticket') || lowerMessage.includes('it service')) {
      return 'I\'ll help you create an IT service ticket. Please provide me with the following details: 1) Issue description, 2) Priority level, 3) Department, and I\'ll process your request immediately. You can expect a response within 2-4 hours during business hours.';
    } else if (lowerMessage.includes('confluence') || lowerMessage.includes('document')) {
      return 'I\'ve searched our confluence database and found several relevant documents. Here are the most recent and relevant pages that match your query. The documents include setup guides, troubleshooting steps, and best practices. Would you like me to summarize any specific document or help you find additional resources?';
    } else if (lowerMessage.includes('team') || lowerMessage.includes('training')) {
      return 'Based on the latest records from our HR system, I can provide you with detailed training completion status for your team members. Currently, there are 5 employees who haven\'t completed the required training, and 19 who have successfully finished. I can help you send reminders or schedule additional training sessions if needed.';
    } else if (lowerMessage.includes('project') || lowerMessage.includes('update')) {
      return 'Here are the latest project updates from our project management system. The Q4 initiatives are progressing well with 75% completion rate. Key milestones achieved this week include infrastructure setup and initial testing phase. Next steps involve user acceptance testing and deployment preparation.';
    } else if (lowerMessage.includes('jira') || lowerMessage.includes('bug') || lowerMessage.includes('issue')) {
      return 'I can help you with Jira-related tasks. Whether you need to create a new ticket, check the status of existing issues, or get reports on project progress, I\'m here to assist. Currently, there are 12 open tickets in your assigned projects, with 3 marked as high priority.';
    } else if (lowerMessage.includes('servicenow') || lowerMessage.includes('service now')) {
      return 'ServiceNow integration is available for various IT service requests. I can help you create incidents, service requests, or check the status of existing tickets. Our average resolution time is 24 hours for standard requests and 4 hours for urgent issues.';
    } else {
      return 'Thank you for your question! I\'m here to help you with IT services, documentation, HR queries, project information, Jira tasks, and ServiceNow requests. Could you provide more details about what specific assistance you need? I can help with creating tickets, finding documents, checking project status, or managing team information.';
    }
  };

  const saveThreadToStorage = (thread) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      const threads = stored ? JSON.parse(stored) : { today: [], lastWeek: [], last30Days: [] };
      
      // Add to today's threads
      const existingIndex = threads.today.findIndex(t => t.id === thread.id);
      if (existingIndex >= 0) {
        threads.today[existingIndex] = thread;
      } else {
        threads.today.unshift(thread);
      }
      
      localStorage.setItem('chatThreads', JSON.stringify(threads));
    } catch (error) {
      console.error('Error saving thread to localStorage:', error);
    }
  };

  const handleSendMessage = () => {
    if (userInput.trim()) {
      const userMessage = {
        id: messages.length + 1,
        type: 'user',
        text: userInput
      };
      
      const assistantResponse = {
        id: messages.length + 2,
        type: 'assistant',
        text: generateResponse(userInput),
        showTable: false // Subsequent messages show text only
      };
      
      const newMessages = [...messages, userMessage, assistantResponse];
      setMessages(newMessages);
      
      // If this is a new chat, update the existing thread with the first message
      if (isNewChat && currentThread && currentThread.conversation.length === 0) {
        const updatedThread = {
          ...currentThread,
          title: userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput,
          conversation: newMessages
        };
        saveThreadToStorage(updatedThread);
        onFirstMessage && onFirstMessage(updatedThread);
      } else if (currentThread) {
        // Update existing thread
        const updatedThread = {
          ...currentThread,
          conversation: newMessages
        };
        saveThreadToStorage(updatedThread);
      } else if (userQuestion && !currentThread) {
        // Create thread for main page question
        const newThread = {
          id: 'thread_' + Date.now(),
          title: userQuestion.length > 50 ? userQuestion.substring(0, 50) + '...' : userQuestion,
          conversation: newMessages
        };
        saveThreadToStorage(newThread);
        onFirstMessage && onFirstMessage(newThread);
      }
      
      setUserInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLike = (messageId) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        setDislikedMessages(prevDisliked => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislike = (messageId) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        setLikedMessages(prevLiked => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(messageId);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : 'bg-[#F9FAFB]'}`}>
      {/* Background effects for dark mode */}
      {isDarkMode && (
        <svg className="absolute inset-0 w-full h-full" width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <ellipse cx="72.952" cy="-5.77807" rx="421.367" ry="309.125" transform="rotate(1.42975 72.952 -5.77807)" fill="url(#paint1_radial)"/>
          <ellipse cx="465.481" cy="-49.3628" rx="431.18" ry="315.872" transform="rotate(1.42975 465.481 -49.3628)" fill="url(#paint2_radial)"/>
          <ellipse cx="856.305" cy="-99.1147" rx="321.392" ry="338.565" transform="rotate(1.42975 856.305 -99.1147)" fill="url(#paint3_radial)"/>
          <ellipse cx="1124.44" cy="-99.7899" rx="285.204" ry="425.66" transform="rotate(1.42975 1124.44 -99.7899)" fill="url(#paint4_radial)"/>
          <defs>
            <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(72.952 -5.77808) rotate(90) scale(309.125 421.367)">
              <stop stopColor="#44B8F3" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#44B8F3" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint2_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(465.481 -49.3628) rotate(90) scale(315.872 431.18)">
              <stop stopColor="#44F3B3" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#44F3B3" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint3_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(856.305 -99.1147) rotate(90) scale(338.565 321.392)">
              <stop stopColor="#F8D666" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#F8D666" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint4_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1124.44 -99.7899) rotate(90) scale(425.66 285.204)">
              <stop stopColor="#E3725F" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#E3725F" stopOpacity="0"/>
            </radialGradient>
          </defs>
        </svg>
      )}

      {/* Left Sidebar - Use MenuSidebar Component */}
      <MenuSidebar 
        onBack={onBack} 
        onToggleTheme={onToggleTheme}
        isDarkMode={isDarkMode}
        onNewChat={onNewChat}
        onThreadSelect={onThreadSelect}
        currentActiveThread={currentThread}
        isNewChatActive={isNewChatActive}
      />

      {/* Right Chat Window */}
      <div className={`flex-1 flex flex-col h-screen relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : ''}`}>
        {/* Chat Messages Area - Scrollable */}
        <div className={`flex-1 overflow-y-auto p-5 ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : ''}`}>
          <div 
            className="mx-auto"
            style={{
              display: 'flex',
              width: '760px',
              paddingTop: '24px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '32px',
              alignSelf: 'stretch'
            }}
          >
            {messages.map((message) => (
              <div key={message.id} style={{ width: '100%' }}>
                {message.type === 'user' ? (
                  <div className="flex justify-end">
                    <div className={`${isDarkMode ? 'bg-[#1F3E81]' : 'bg-[#E3F4FD]'} rounded-[32px_0_32px_32px] px-6 py-3 max-w-[467px]`}>
                      <p className={`${isDarkMode ? 'text-white' : 'text-[#231E33]'} text-sm leading-[21px]`}>{message.text}</p>
                    </div>
                  </div>
                ) : message.isWelcome ? (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed`}>
                      {message.text}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {message.suggestions?.map((suggestion, index) => (
                        <button 
                          key={index} 
                          onClick={() => {
                            setUserInput(`Tell me about ${suggestion.toLowerCase()}`);
                          }}
                          className={`${isDarkMode ? 'bg-[#1F3E81] text-[#A0BEEA] hover:bg-[#2A4A8C]' : 'bg-[#F7F7F7] text-[#333333] hover:bg-[#E7E7E7]'} rounded p-3 text-sm text-left transition-colors cursor-pointer`}
                        >
                          • {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed text-left`} style={{ lineHeight: '1.6', textAlign: 'left' }}>
                      {message.text}
                    </div>

                    {/* Show table for first response or when showTable is true */}
                    {message.showTable && (
                      <div className={`${isDarkMode ? 'bg-[#1F3E81] border-[#2861BB]' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden shadow-sm`}>
                        <table className="w-full text-sm">
                          <thead className={isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-50'}>
                            <tr>
                              <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Name</th>
                              <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employee ID</th>
                              <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Email</th>
                              <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Status</th>
                            </tr>
                          </thead>
                          <tbody className={`${isDarkMode ? 'divide-[#2861BB]' : 'divide-gray-200'} divide-y`}>
                            <tr>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deepl, Priya</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Priya.Deepl@elevancehealth.com</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                  Not Started
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Garcia, Sophia</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Sophia.Garcia@elevancehealth.com</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                  Not Started
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Johnson, Alex</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Alex.Johnson@elevancehealth.com</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                  Not Started
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lin, Marco</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Marco.Lin@elevancehealth.com</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                  Not Started
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Miller, Ethan</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                              <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Ethan.Miller@elevancehealth.com</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                  Not Started
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 py-1 relative">
                      <button 
                        onClick={() => handleLike(message.id)}
                        className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded relative`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M10.4523 1.85164C10.4644 2.59944 10.2347 3.33122 9.79726 3.93842C9.68341 4.11134 9.53661 4.26023 9.36523 4.37664L9.23284 4.87051H13.2395C13.8703 4.86951 14.4679 5.15291 14.8656 5.64171C15.2632 6.13052 15.4186 6.77245 15.2882 7.38855L13.7831 14.3445C13.5786 15.3107 12.7237 16.0016 11.7344 16H0V4.87051H3.1984L7.92282 0.196127L8.1458 0.00136137H8.42453C9.49319 -0.0381125 10.3959 0.785607 10.4523 1.85164ZM8.64751 1.45515L4.18091 5.8513V14.6088H11.7344C12.0666 14.6169 12.3582 14.3898 12.4312 14.0662L13.9155 7.11032C13.9619 6.90478 13.9125 6.6893 13.7811 6.52438C13.6498 6.35945 13.4506 6.26285 13.2395 6.2617H7.42808L7.665 5.3922L8.07612 3.82712L8.16671 3.54193L8.40362 3.41672C8.52613 3.33722 8.63058 3.23295 8.71022 3.11066C8.96206 2.74073 9.08453 2.29816 9.05863 1.85164C9.05863 1.636 8.94017 1.51775 8.64751 1.45515ZM2.78727 6.2617H1.39364V14.6088H2.78727V6.2617Z" fill={likedMessages.has(message.id) ? "#44B8F3" : (isDarkMode ? "#A0BEEA" : "#787777")}/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDislike(message.id)}
                        className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded`}
                      >
                        <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M8.42453 16.0268C9.49319 16.0664 10.3959 15.2412 10.4523 14.1733C10.4644 13.4242 10.2347 12.6911 9.79726 12.0828C9.68341 11.9096 9.53662 11.7604 9.36523 11.6438L9.23284 11.1491H13.2395C13.8703 11.1501 14.4679 10.8662 14.8656 10.3765C15.2632 9.88687 15.4186 9.24381 15.2882 8.62661L13.7831 1.65843C13.5786 0.69052 12.7237 -0.00156462 11.7344 6.66159e-06H0V11.1491H3.19839L7.92282 15.8317L8.1458 16.0268H8.42453ZM4.18091 10.1666V1.39364H11.7344C12.0666 1.38552 12.3582 1.61303 12.4312 1.93716L13.9155 8.90534C13.9619 9.11124 13.9125 9.32709 13.7811 9.49231C13.6498 9.65753 13.4506 9.7543 13.2395 9.75546H7.42808L7.665 10.6265L8.07612 12.1943L8.16671 12.48L8.40362 12.6054C8.52613 12.6851 8.63058 12.7895 8.71022 12.912C8.96206 13.2826 9.08453 13.726 9.05863 14.1733C9.05863 14.3893 8.94017 14.5078 8.64751 14.5705L4.18091 10.1666ZM1.39364 1.39364H2.78727V9.75546H1.39364V1.39364Z" fill={dislikedMessages.has(message.id) ? "#CB0042" : (isDarkMode ? "#A0BEEA" : "#787777")}/>
                        </svg>
                      </button>
                      <button className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded`}>
                        <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M13.4513 10.4167L14.6667 10.9167C13.5183 13.8932 10.7039 16 7.33333 16C4.9567 16 2.8427 14.9245 1.40075 13.2708V15.3333H0.082397V10.6667H4.69663V12H2.08052C3.27528 13.5911 5.17299 14.6667 7.33333 14.6667C10.1606 14.6667 12.4909 12.9062 13.4513 10.4167ZM7.33333 0C9.6868 0 11.8214 1.05469 13.2659 2.72917V0.666668H14.5843V5.33333H9.97004V4H12.5655C11.3759 2.39323 9.47051 1.33333 7.33333 1.33333C4.50609 1.33333 2.1758 3.09375 1.21536 5.58333L0 5.08333C1.14841 2.10677 3.96278 0 7.33333 0Z" fill={isDarkMode ? "#A0BEEA" : "#787777"}/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleCopy(message.text, message.id)}
                        className={`p-1.5 hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} rounded relative`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0V0.727273V11.6364V12.3636H0.727273H2.90909V10.9091H1.45455V1.45455H10.9091V2.90909H12.3636V0.727273V0H11.6364H0.727273H0ZM3.63636 3.63636V4.36364V15.2727V16H4.36364H15.2727H16V15.2727V4.36364V3.63636H15.2727H4.36364H3.63636ZM5.09091 5.09091H14.5455V14.5455H5.09091V5.09091Z" fill={isDarkMode ? "#A0BEEA" : "#787777"}/>
                        </svg>
                        {copiedMessage === message.id && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                            Copied!
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className={`p-5 ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : 'bg-[#F9FAFB] border-gray-200 border-t'} flex-shrink-0`}>
          <div className="max-w-[760px] mx-auto">
            <div 
              className={`flex items-center gap-3 px-4 py-3 border-2 shadow-lg ${isDarkMode ? 'border-[#2861BB]' : 'bg-white border-[#44B8F3] rounded-full'}`}
              style={isDarkMode ? {
                borderRadius: '999px',
                border: '2px solid #2861BB',
                background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
              } : {}}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 24C10.4551 18.1296 5.87044 13.5449 0 12C5.87044 10.4551 10.4551 5.87044 12 0C13.5449 5.87044 18.1296 10.4551 24 12C18.1296 13.5449 13.5449 18.1296 12 24Z" fill="url(#paint0_linear_gradient)"/>
                <defs>
                  <linearGradient id="paint0_linear_gradient" x1="18.0351" y1="6.01092" x2="6.01958" y2="16.5376" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#44B8F3"/>
                    <stop offset="1" stopColor="#2861BB"/>
                  </linearGradient>
                </defs>
              </svg>
              
              <input
                type="text"
                placeholder={isInputFocused ? "" : "Ask anything"}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={`flex-1 bg-transparent border-none outline-none ${isDarkMode ? 'text-[#A0BEEA] placeholder-[#A0BEEA]' : 'text-[#787777] placeholder-[#787777]'} text-xl`}
              />
              
              <button 
                onClick={handleSendMessage}
                className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors`}
              >
                <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.975 17.0004L18.2437 10.7671C18.9525 10.4754 18.9525 9.52542 18.2437 9.23375L2.975 3.00042C2.3975 2.75875 1.75875 3.16709 1.75875 3.75875L1.75 7.60042C1.75 8.01709 2.07375 8.37542 2.51125 8.42542L14.875 10.0004L2.51125 11.5671C2.07375 11.6254 1.75 11.9838 1.75 12.4004L1.75875 16.2421C1.75875 16.8338 2.3975 17.2421 2.975 17.0004Z" fill="#949494"/>
                </svg>
              </button>
              
              <button className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9989 14C13.6776 14 15.0328 12.66 15.0328 11V5C15.0328 3.34 13.6776 2 11.9989 2C10.3202 2 8.9651 3.34 8.9651 5V11C8.9651 12.66 10.3202 14 11.9989 14ZM17.9756 11C17.48 11 17.0654 11.36 16.9845 11.85C16.5699 14.2 14.4968 16 11.9989 16C9.50107 16 7.42796 14.2 7.01333 11.85C6.93243 11.36 6.51781 11 6.02228 11C5.40541 11 4.91999 11.54 5.01101 12.14C5.50653 15.14 7.93359 17.49 10.9876 17.92V20C10.9876 20.55 11.4427 21 11.9989 21C12.5551 21 13.0102 20.55 13.0102 20V17.92C16.0643 17.49 18.4913 15.14 18.9868 12.14C19.088 11.54 18.5924 11 17.9756 11Z" fill="#0C7DB6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
