import React, { useState, useRef, useEffect } from 'react';

/**
 * Debug component to display message state information
 * Add this temporarily to ChatPage.jsx to debug the multi-message issue
 */
const DebugMessagesPanel = ({ messages, currentThread, isVisible = false }) => {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.debug-header')) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Early return after all hooks
  if (!isVisible) return null;

  const debugStyle = {
    position: 'fixed',
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: '350px',
    maxHeight: '70vh',
    overflow: 'auto',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    color: '#ffffff',
    border: '1px solid #444',
    borderRadius: '8px',
    fontSize: '11px',
    fontFamily: 'monospace',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(5px)',
    resize: 'both',
    minWidth: '250px',
    minHeight: '200px',
    cursor: isDragging ? 'grabbing' : 'default'
  };

  const headerStyle = {
    padding: '8px 12px',
    backgroundColor: '#333',
    borderRadius: '8px 8px 0 0',
    cursor: 'grab',
    borderBottom: '1px solid #555',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none'
  };

  const contentStyle = {
    padding: '12px',
    maxHeight: 'calc(70vh - 40px)',
    overflow: 'auto'
  };

  return (
    <div ref={panelRef} style={debugStyle} onMouseDown={handleMouseDown}>
      <div className="debug-header" style={headerStyle}>
        <span style={{ color: '#00ff00', fontWeight: 'bold' }}>🐛 Messages Debug Panel</span>
        <span style={{ color: '#888', fontSize: '10px' }}>📌 Drag me!</span>
      </div>
      
      <div style={contentStyle}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Messages State:</strong> {messages?.length || 0} items
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>Thread ID:</strong> {currentThread?.id || 'None'}
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>Thread Conversation:</strong> {currentThread?.conversation?.length || 0} items
        </div>
        
        <div style={{ marginBottom: '10px', fontSize: '10px', color: '#ff9999' }}>
          <strong>🔍 Issue:</strong> If State {'>'}  Thread when switching back, messages not saved to API
        </div>
        
        {messages && messages.length > 0 && (
          <div>
            <strong>Messages in State:</strong>
            {messages.map((msg, index) => (
              <div key={index} style={{ 
                padding: '4px', 
                margin: '2px 0', 
                backgroundColor: index % 2 === 0 ? '#333' : '#555',
                borderRadius: '4px'
              }}>
                <div style={{ color: '#00ffff' }}>
                  #{msg.id} | {msg.type}
                </div>
                <div style={{ color: '#ffff00' }}>
                  {msg.text?.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        )}
        
        {currentThread?.conversation && currentThread.conversation.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <strong>Raw Thread Conversation:</strong>
            {currentThread.conversation.map((msg, index) => (
              <div key={index} style={{ 
                padding: '4px', 
                margin: '2px 0', 
                backgroundColor: '#444',
                borderRadius: '4px'
              }}>
                <div style={{ color: '#ff9900' }}>
                  #{msg.id} | {msg.type}
                </div>
                <div style={{ color: '#99ff99' }}>
                  {msg.text?.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugMessagesPanel;