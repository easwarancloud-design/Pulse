# ButtonRow Component - Usage Guide

## Overview
The `ButtonRow` component provides buttons for routing to live agents. It manages button state (enabled/disabled) and visual feedback during live agent sessions.

## Key Behavior

### Button States
1. **Default State**: All buttons enabled and ready to click
2. **During Live Agent Session**: All buttons disabled, selected button highlighted
3. **After Session Ends**: All buttons re-enabled (must be triggered by parent)

### When Buttons are Disabled
- ✅ User clicks a live agent button (AgenticHRAdvisor or AgenticContactCenter)
- ✅ Buttons remain disabled during the entire live agent session
- ✅ Visual feedback: Selected button highlighted, others dimmed

### When Buttons are Re-enabled
- ✅ Live agent session ends (parent calls `resetButtons()`)
- ✅ Error occurs during routing
- ✅ User clicks "Continue chatting" (no live agent session started)
- ✅ User clicks "ServiceNow catalog" (just opens new window)

## Usage in Parent Component

### Basic Setup

```javascript
import React, { useRef } from 'react';
import ButtonRow from './components/ButtonRow';

function ChatPage() {
  const buttonRowRef = useRef(null);
  
  const handleAgentConnect = (info) => {
    if (info.type === 'transferred') {
      console.log('User transferred to live agent');
      // Buttons remain disabled automatically
    }
  };
  
  const handleSessionEnd = () => {
    // Re-enable buttons when live agent session ends
    if (buttonRowRef.current) {
      buttonRowRef.current.resetButtons();
    }
  };
  
  return (
    <div>
      <ButtonRow 
        ref={buttonRowRef}
        domainid="AG04333"
        onAgentConnect={handleAgentConnect}
        isDarkMode={false}
      />
      
      {/* Your chat interface here */}
    </div>
  );
}
```

### Complete Example with Live Agent Integration

```javascript
import React, { useRef, useState } from 'react';
import ButtonRow from './components/ButtonRow';
import { liveAgentService } from './services/liveAgentService';

function ChatPage() {
  const buttonRowRef = useRef(null);
  const [liveAgentActive, setLiveAgentActive] = useState(false);
  
  const handleAgentConnect = async (info) => {
    if (info.type === 'connecting') {
      console.log('Connecting to live agent...');
      // Buttons are automatically disabled
    }
    
    if (info.type === 'transferred' && info.requestId) {
      console.log('Transferred to live agent');
      setLiveAgentActive(true);
      
      // Connect WebSocket (buttons remain disabled)
      await connectWebSocket(info.requestId);
    }
    
    if (info.type === 'error') {
      console.error('Connection failed');
      // Buttons automatically re-enabled on error
      setLiveAgentActive(false);
    }
    
    if (info.type === 'continue') {
      console.log('User chose to continue with bot');
      // Buttons automatically re-enabled
      setLiveAgentActive(false);
    }
  };
  
  const connectWebSocket = async (requestId) => {
    // Setup WebSocket handlers
    liveAgentService.connectWebSocket(
      requestId,
      'AG04333',
      (message) => handleLiveAgentMessage(message),
      () => console.log('WebSocket connected'),
      (reason) => handleSessionEnd(reason),
      (error) => handleSessionError(error)
    );
  };
  
  const handleSessionEnd = (reason) => {
    console.log('Live agent session ended:', reason);
    setLiveAgentActive(false);
    
    // IMPORTANT: Re-enable buttons when session ends
    if (buttonRowRef.current) {
      buttonRowRef.current.resetButtons();
    }
  };
  
  const handleSessionError = (error) => {
    console.error('Live agent error:', error);
    setLiveAgentActive(false);
    
    // Re-enable buttons on error (already done automatically, but good practice)
    if (buttonRowRef.current) {
      buttonRowRef.current.resetButtons();
    }
  };
  
  const handleLiveAgentMessage = (message) => {
    console.log('Agent message:', message.text);
    // Display message in UI
  };
  
  return (
    <div>
      {liveAgentActive && (
        <div className="live-agent-indicator">
          🟢 Connected to live agent
        </div>
      )}
      
      <ButtonRow 
        ref={buttonRowRef}
        domainid="AG04333"
        onAgentConnect={handleAgentConnect}
        isDarkMode={false}
      />
    </div>
  );
}

export default ChatPage;
```

## API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `domainid` | string | No | Domain ID for authentication (defaults to "AG40333") |
| `onAgentConnect` | function | No | Callback for agent connection events |
| `isDarkMode` | boolean | No | Enable dark mode styling |
| `ref` | React.Ref | No | Forward ref to access resetButtons method |

### Ref Methods

#### `resetButtons()`
Re-enables all buttons and clears selection.

**When to call:**
- Live agent session ends
- User disconnects from live agent
- Session times out

**Example:**
```javascript
buttonRowRef.current.resetButtons();
```

### Callback Events (`onAgentConnect`)

The `onAgentConnect` callback receives an object with the following structure:

#### `type: 'connecting'`
```javascript
{
  type: 'connecting',
  message: 'Connecting to a live agent, please hold…'
}
```
**Action:** Show connecting message to user

#### `type: 'transferred'`
```javascript
{
  type: 'transferred',
  message: "You're being transferred to a live agent.",
  requestId: '1699564800000'
}
```
**Action:** Connect WebSocket using requestId

#### `type: 'error'`
```javascript
{
  type: 'error',
  message: 'Failed to connect to live agent. Please try again.'
}
```
**Action:** Display error message (buttons automatically re-enabled)

#### `type: 'continue'`
```javascript
{
  type: 'continue',
  message: 'You may continue chatting here.'
}
```
**Action:** User chose to continue with bot (buttons automatically re-enabled)

## Button Groups

### AgenticHRAdvisor
- **Label:** "Manager coaching and coaching for corrective action"
- **Purpose:** HR advisory services for managers
- **Behavior:** Disables all buttons, starts live agent session

### AgenticContactCenter
- **Label:** "Other HR support"
- **Purpose:** General HR questions and support
- **Behavior:** Disables all buttons, starts live agent session

### HR Service Request
- **Label:** "ServiceNow ticket catalog"
- **Purpose:** Opens ServiceNow catalog in new window
- **Behavior:** Opens link, buttons remain enabled (no live agent session)

### Continue chatting
- **Label:** "Continue chatting"
- **Purpose:** Continue with bot instead of live agent
- **Behavior:** Dismisses live agent card, buttons remain enabled

## Visual States

### Normal State
```
┌────────────────────────────────┐
│ Manager coaching and...        │  ← Border: #2861BB (dark) or #dbe2ea (light)
└────────────────────────────────┘

┌────────────────────────────────┐
│ Other HR support               │
└────────────────────────────────┘
```

### Selected State (During Live Agent Session)
```
┌════════════════════════════════┐
║ Manager coaching and...        ║  ← Border: #44B8F3 (dark) or #1a366f (light)
║                                ║  ← Background: #1F3E81 (dark) or transparent (light)
└════════════════════════════════┘  ← Box shadow

┌────────────────────────────────┐
│ Other HR support (dimmed)      │  ← Opacity: 0.6
└────────────────────────────────┘
```

## Common Issues and Solutions

### Issue: Buttons re-enable too early
**Problem:** Buttons become enabled before live agent session ends

**Solution:** 
- Remove any setTimeout that calls `setButtonsDisabled(false)`
- Only re-enable via `resetButtons()` when session actually ends

### Issue: Buttons stay disabled after session ends
**Problem:** Buttons don't re-enable when live agent disconnects

**Solution:**
- Call `buttonRowRef.current.resetButtons()` in your disconnect handler
- Make sure the ref is properly attached to ButtonRow component

### Issue: Multiple buttons appear selected
**Problem:** Selection state not clearing properly

**Solution:**
- Call `resetButtons()` which resets both disabled state AND selection
- Don't manually set selection state from parent component

## Testing Checklist

- [ ] Click live agent button → All buttons disabled
- [ ] Selected button shows highlight/border
- [ ] Unselected buttons show dimmed appearance
- [ ] Buttons stay disabled during "Connecting..." message
- [ ] Buttons stay disabled during "Transferred to agent" message
- [ ] Buttons stay disabled during live agent conversation
- [ ] Buttons re-enable when live agent session ends
- [ ] Buttons re-enable on connection error
- [ ] "Continue chatting" → buttons stay enabled
- [ ] "ServiceNow catalog" → buttons stay enabled, new window opens

## Migration from Old Version

### Before (Auto-reset after 3 seconds - INCORRECT)
```javascript
useEffect(() => {
  if (selectedGroup) {
    const timer = setTimeout(() => {
      setSelectedGroup(null);
      setButtonsDisabled(false);  // ❌ Wrong!
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [selectedGroup]);
```

### After (Manual reset when session ends - CORRECT)
```javascript
// In ButtonRow: Removed auto-reset timer

// In Parent Component:
const handleSessionEnd = () => {
  if (buttonRowRef.current) {
    buttonRowRef.current.resetButtons();  // ✅ Correct!
  }
};
```

---

Last Updated: November 10, 2025
