import React, { useState, useEffect } from 'react';
import MenuSidebar from '../MenuSidebar';

function FigmaResultsPage({ 
  onBack, 
  userQuestion, 
  onToggleTheme, 
  isDarkMode, 
  currentThread, 
  isNewChat, 
  isNewChatActive, 
  onNewChat, 
  onThreadSelect, 
  onFirstMessage 
}) {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Handle initial question or thread loading
  useEffect(() => {
    if (isNewChat && userQuestion && !messages.length) {
      // Add user question as first message
      const userMsg = {
        type: 'user',
        text: userQuestion,
        timestamp: new Date()
      };
      setMessages([userMsg]);
      
      // Simulate AI response
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          const aiResponse = {
            type: 'assistant',
            text: `I'll help you with "${userQuestion}". Let me search for the most relevant information.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiResponse]);
          setIsTyping(false);
          
          // Create thread and notify parent
          if (onFirstMessage) {
            const newThread = {
              id: 'thread_' + Date.now(),
              title: userQuestion.length > 50 ? userQuestion.substring(0, 50) + '...' : userQuestion,
              conversation: [userMsg, aiResponse]
            };
            onFirstMessage(newThread);
          }
        }, 1500);
      }, 500);
    } else if (currentThread) {
      // Load existing thread
      setMessages(currentThread.conversation || []);
    }
  }, [userQuestion, isNewChat, currentThread, onFirstMessage]);

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const userMsg = {
        type: 'user',
        text: currentMessage.trim(),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMsg]);
      setCurrentMessage('');
      setIsTyping(true);
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          type: 'assistant',
          text: `Thank you for your question: "${userMsg.text}". I'm processing this request and will provide you with relevant information.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <MenuSidebar 
        onBack={onBack}
        onToggleTheme={onToggleTheme}
        isDarkMode={isDarkMode}
        onNewChat={onNewChat}
        onThreadSelect={onThreadSelect}
        currentActiveThread={currentThread}
        isNewChatActive={isNewChatActive}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h1 className="text-xl font-semibold">
            {currentThread?.title || 'New Chat'}
          </h1>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp?.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`flex-1 p-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FigmaResultsPage;