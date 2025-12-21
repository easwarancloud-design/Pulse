/**
 * Chat Integration Demo
 * Shows how the hybrid chat service works in a real chat scenario
 */

import React, { useState } from 'react';
import { hybridChatService } from '../services/hybridChatService';

const ChatIntegrationDemo = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: '🤖 Welcome! This demo shows the hybrid chat service integration.',
      timestamp: Date.now()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addMessage = (type, text, metadata = {}) => {
    const newMessage = {
      id: Date.now(),
      type,
      text,
      timestamp: Date.now(),
      ...metadata
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const simulateWorkforceAgentResponse = (question) => {
    // Simulate different responses based on keywords
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('weather')) {
      return 'The weather today is sunny with a temperature of 72°F. Perfect for outdoor activities!';
    } else if (questionLower.includes('hello') || questionLower.includes('hi')) {
      return 'Hello! I am your AI assistant. How can I help you today?';
    } else if (questionLower.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    } else if (questionLower.includes('help')) {
      return 'I can help you with various tasks. Try asking me about the weather, time, or general questions!';
    } else {
      return `Thank you for your question: "${question}". This is a simulated response showing how the hybrid chat service stores conversations while preserving live response functionality.`;
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const questionText = userInput.trim();
    setUserInput('');
    setLoading(true);

    try {
      // Add user message
      const userMessage = addMessage('user', questionText);

      // Add loading message
      const loadingMessage = addMessage('assistant', '🤔 Thinking...', { loading: true });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get simulated response
      const responseText = simulateWorkforceAgentResponse(questionText);

      // Update loading message with response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, text: responseText, loading: false, completed: true }
          : msg
      ));

      // 🔄 Use hybrid chat service (same as in real ChatPage)
      try {
        await hybridChatService.saveUserQuestion(
          questionText, 
          { source: 'demo_page', timestamp: Date.now() }
        );
        
        await hybridChatService.saveAssistantResponse(
          responseText,
          questionText,
          { 
            source: 'demo_agent',
            simulated: true,
            timestamp: Date.now()
          }
        );

        // Add status message
        addMessage('system', '✅ Conversation saved via hybrid chat service!', { 
          success: true 
        });

      } catch (storageError) {
        console.warn('Storage failed, using localStorage fallback:', storageError);
        addMessage('system', '⚠️ FastAPI unavailable, using localStorage fallback', { 
          warning: true 
        });
      }

    } catch (error) {
      console.error('Demo error:', error);
      addMessage('system', `❌ Error: ${error.message}`, { error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearDemo = () => {
    setMessages([
      {
        id: 1,
        type: 'system',
        text: '🤖 Demo cleared! Try asking a question.',
        timestamp: Date.now()
      }
    ]);
  };

  const getMessageStyle = (msg) => {
    const baseStyle = {
      padding: '10px 15px',
      margin: '8px 0',
      borderRadius: '8px',
      maxWidth: '80%',
    };

    switch (msg.type) {
      case 'user':
        return {
          ...baseStyle,
          backgroundColor: '#007bff',
          color: 'white',
          alignSelf: 'flex-end',
          marginLeft: 'auto'
        };
      case 'assistant':
        return {
          ...baseStyle,
          backgroundColor: msg.loading ? '#f8f9fa' : '#e9ecef',
          color: '#495057',
          alignSelf: 'flex-start',
          borderLeft: msg.loading ? '3px solid #007bff' : 'none'
        };
      case 'system':
        return {
          ...baseStyle,
          backgroundColor: msg.success ? '#d4edda' : msg.warning ? '#fff3cd' : msg.error ? '#f8d7da' : '#e2e3e5',
          color: msg.success ? '#155724' : msg.warning ? '#856404' : msg.error ? '#721c24' : '#495057',
          alignSelf: 'center',
          maxWidth: '90%',
          fontSize: '0.9em',
          fontStyle: 'italic'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '20px auto', 
      padding: '20px',
      border: '1px solid #dee2e6',
      borderRadius: '12px',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ 
        marginBottom: '20px', 
        textAlign: 'center',
        borderBottom: '2px solid #007bff',
        paddingBottom: '15px'
      }}>
        <h2 style={{ color: '#007bff', margin: '0 0 10px 0' }}>
          💬 Chat Integration Demo
        </h2>
        <p style={{ 
          margin: '0', 
          color: '#6c757d', 
          fontSize: '1em'
        }}>
          Test the hybrid chat service with simulated responses
        </p>
      </div>

      <div style={{
        height: '400px',
        overflowY: 'auto',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={getMessageStyle(msg)}>
            {msg.text}
            <div style={{ 
              fontSize: '0.7em', 
              opacity: 0.7, 
              marginTop: '4px'
            }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message... (try: weather, hello, time, help)"
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !userInput.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? '⌛' : '📤'} Send
        </button>
        <button
          onClick={clearDemo}
          style={{
            padding: '10px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🗑️ Clear
        </button>
      </div>

      <div style={{ 
        marginTop: '15px', 
        padding: '15px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '8px',
        fontSize: '0.9em'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>
          🔧 How This Works:
        </h4>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
          <li>Questions and responses are saved via the <strong>hybrid chat service</strong></li>
          <li>If FastAPI server (localhost:8000) is running → saves to conversation API</li>
          <li>If FastAPI server is down → automatically falls back to localStorage</li>
          <li>Live response functionality uses original workforce agent API</li>
          <li>Conversation history is preserved regardless of backend status</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatIntegrationDemo;