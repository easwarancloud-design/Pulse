/**
 * Chat Service Integration Tester
 * Simple component to test the hybrid chat service integration
 */

import React, { useState, useEffect } from 'react';
import { hybridChatService } from '../services/hybridChatService';

const ChatServiceTester = () => {
  const [status, setStatus] = useState('Initializing...');
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    testChatService();
  }, []);

  const addTestResult = (test, success, details) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testChatService = async () => {
    try {
      setStatus('Testing chat service...');
      
      // Test 1: Service initialization
      const serviceStatus = hybridChatService.getServiceStatus();
      addTestResult(
        'Service Initialization', 
        serviceStatus.initialized,
        `Local API: ${serviceStatus.localAPIAvailable}, Fallback: ${serviceStatus.fallbackEnabled}`
      );

      // Test 2: Health check
      try {
        await hybridChatService.initializeService();
        addTestResult('Health Check', true, 'Service initialized successfully');
      } catch (error) {
        addTestResult('Health Check', false, `Health check failed: ${error.message}`);
      }

      // Test 3: Save test question
      try {
        await hybridChatService.saveUserQuestion(
          'Test question: What is the weather today?',
          { source: 'test_component', test: true }
        );
        addTestResult('Save Question', true, 'Question saved successfully');
      } catch (error) {
        addTestResult('Save Question', false, `Save failed: ${error.message}`);
      }

      // Test 4: Save test response
      try {
        await hybridChatService.saveAssistantResponse(
          'Test response: The weather is sunny today.',
          'Test question: What is the weather today?',
          { source: 'test_component', test: true }
        );
        addTestResult('Save Response', true, 'Response saved successfully');
      } catch (error) {
        addTestResult('Save Response', false, `Save failed: ${error.message}`);
      }

      // Test 5: Search conversations
      try {
        const searchResults = await hybridChatService.searchConversationHistory('weather', 10);
        addTestResult(
          'Search Conversations', 
          true, 
          `Found ${Array.isArray(searchResults) ? searchResults.length : 0} results`
        );
      } catch (error) {
        addTestResult('Search Conversations', false, `Search failed: ${error.message}`);
      }

      // Test 6: Get conversation history
      try {
        const history = await hybridChatService.getConversationHistory(10);
        addTestResult(
          'Get History', 
          true, 
          `Retrieved ${Array.isArray(history) ? history.length : 0} conversations`
        );
      } catch (error) {
        addTestResult('Get History', false, `History retrieval failed: ${error.message}`);
      }

      setStatus('Testing completed!');

    } catch (error) {
      setStatus(`Testing failed: ${error.message}`);
      addTestResult('Overall Test', false, error.message);
    }
  };

  const retestService = () => {
    setTestResults([]);
    setStatus('Retesting...');
    testChatService();
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #007bff', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa' 
    }}>
      <h3 style={{ color: '#007bff', marginBottom: '15px' }}>
        🧪 Chat Service Integration Tester
      </h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Status:</strong> <span style={{ color: status.includes('failed') ? '#dc3545' : '#28a745' }}>
          {status}
        </span>
      </div>

      <button 
        onClick={retestService}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '15px'
        }}
      >
        🔄 Retest Service
      </button>

      <h4 style={{ marginBottom: '10px' }}>Test Results:</h4>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {testResults.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            No test results yet...
          </div>
        ) : (
          testResults.map((result, index) => (
            <div 
              key={index}
              style={{
                padding: '8px 12px',
                margin: '4px 0',
                borderLeft: `4px solid ${result.success ? '#28a745' : '#dc3545'}`,
                backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                borderRadius: '4px'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                {result.success ? '✅' : '❌'} {result.test}
                <span style={{ 
                  float: 'right', 
                  fontSize: '0.8em', 
                  color: '#6c757d' 
                }}>
                  {result.timestamp}
                </span>
              </div>
              <div style={{ 
                fontSize: '0.9em', 
                color: '#495057',
                marginTop: '4px' 
              }}>
                {result.details}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <strong>💡 How it works:</strong><br />
        • If local FastAPI server is available → uses API endpoints<br />
        • If FastAPI server is down → automatically falls back to localStorage<br />
        • Frontend chat will work regardless of backend status
      </div>
    </div>
  );
};

export default ChatServiceTester;