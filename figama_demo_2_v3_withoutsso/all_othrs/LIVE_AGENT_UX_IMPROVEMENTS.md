# Live Agent Card UX Improvements

## Overview
This document describes the improvements made to the Live Agent Card user experience to ensure users must select a button when the live agent card appears.

## Problem Statement
Previously:
1. When the live agent card appeared, users could still type in the input field
2. The "Continue chatting" button immediately re-enabled all buttons and didn't behave consistently with other live agent buttons
3. There was no enforcement that users must make a selection when presented with the live agent card

## Solution Implemented

### 1. Input Field Disabling
**Files Modified:** `src/ChatPage.jsx`

#### Changes:
- Added new state: `isLiveAgentCardShowing` to track when the live agent card requires user interaction
- Updated input field to be disabled when `isLiveAgentCardShowing || loading`
- Added visual feedback with `cursor-not-allowed` and `opacity-50` classes when disabled

#### State Management:
```javascript
// Line ~543
const [isLiveAgentCardShowing, setIsLiveAgentCardShowing] = useState(false);
```

#### Input Element Update:
```javascript
// Line ~1714
<input
  type="text"
  disabled={isLiveAgentCardShowing || loading}
  className={`... ${(isLiveAgentCardShowing || loading) ? 'cursor-not-allowed opacity-50' : ''}`}
/>
```

#### State Setting Triggers:
The `isLiveAgentCardShowing` state is set to `true` when:
- Live agent marker detected in short responses (line ~227)
- Live agent marker detected after streaming (line ~368)

The state is set to `false` when:
- User selects "Continue chatting" button (line ~648)
- User selects a live agent button (line ~654)
- Error occurs during agent routing (line ~672)

### 2. "Continue Chatting" Button Behavior
**Files Modified:** `src/components/ButtonRow.jsx`

#### Previous Behavior:
```javascript
if (groupName === "Continue chatting") {
  onAgentConnect({ type: 'continue', ... });
  // ❌ Immediately reset buttons
  setButtonsDisabled(false);
  setSelectedGroup(null);
  return;
}
```

#### New Behavior:
```javascript
if (groupName === "Continue chatting") {
  onAgentConnect({ type: 'continue', ... });
  // ✅ Keep buttons disabled and highlighted
  // Parent will call resetButtons() to re-enable
  return;
}
```

**Result:** The "Continue chatting" button now:
- Highlights when clicked (blue border in dark mode, dark blue border in light mode)
- Disables all buttons (same as other live agent buttons)
- Stays in this state until the parent component resets it

### 3. Parent Component Handler Updates
**Files Modified:** `src/ChatPage.jsx`

#### handleLiveAgentConnect Function Updates:

**For "Continue" Action:**
```javascript
if (info.type === 'continue') {
  setMessages(...);
  terminateLiveAgent(...);
  // ✅ Reset buttons via ref
  if (buttonRowRef.current) {
    buttonRowRef.current.resetButtons();
  }
  // ✅ Re-enable input
  setIsLiveAgentCardShowing(false);
  return;
}
```

**For "Connecting" Action:**
```javascript
if (info.type === 'connecting') {
  setMessages(...);
  // ✅ Hide live agent card since user made selection
  setIsLiveAgentCardShowing(false);
  return;
}
```

**For "Error" Action:**
```javascript
if (info.type === 'error') {
  setMessages(...);
  // ✅ Reset buttons on error
  if (buttonRowRef.current) {
    buttonRowRef.current.resetButtons();
  }
  // ✅ Re-enable input on error
  setIsLiveAgentCardShowing(false);
}
```

## User Flow

### Scenario 1: User Chooses to Continue Chatting
1. Live agent card appears
2. Input field is **disabled** (cursor-not-allowed, opacity reduced)
3. All buttons are **enabled** and ready for selection
4. User clicks "Continue chatting"
5. Button **highlights** and all buttons become **disabled**
6. System message appears: "You may continue chatting here."
7. Buttons **reset** (re-enabled, no highlight)
8. Input field **re-enables**
9. User can continue typing normally

### Scenario 2: User Chooses a Live Agent
1. Live agent card appears
2. Input field is **disabled**
3. All buttons are **enabled**
4. User clicks any live agent button (e.g., "Manager coaching...")
5. Button **highlights** and all buttons become **disabled**
6. System message: "Connecting to a live agent, please hold…"
7. Input field **re-enables** (card hidden)
8. Buttons remain **disabled** during entire live agent session
9. After session ends, buttons **reset** automatically

### Scenario 3: Error During Routing
1. Live agent card appears
2. Input field is **disabled**
3. User clicks a live agent button
4. Button **highlights**, all buttons **disabled**
5. Error occurs (e.g., network issue)
6. Error message appears
7. Buttons **reset** (re-enabled)
8. Input field **re-enables**
9. User can try again

## Technical Details

### State Dependencies
```
isLiveAgentCardShowing (ChatPage state)
  ├─ Set to true when: Live agent marker detected
  ├─ Set to false when: User selects any button, or error occurs
  └─ Controls: Input field disabled state

buttonsDisabled (ButtonRow state)
  ├─ Set to true when: Any button clicked
  ├─ Set to false when: Parent calls resetButtons() via ref
  └─ Controls: All button disabled states

selectedGroup (ButtonRow state)
  ├─ Set to button name when: Button clicked
  ├─ Set to null when: Parent calls resetButtons() via ref
  └─ Controls: Button highlight styling
```

### Control Flow
```
Live Agent Card Shown
  ↓
Input Disabled (isLiveAgentCardShowing = true)
  ↓
User Clicks Button
  ↓
Button Highlighted (selectedGroup = button name)
All Buttons Disabled (buttonsDisabled = true)
  ↓
┌─────────────────────┬──────────────────────┬─────────────────┐
│ Continue Chatting   │ Live Agent Button    │ Error Occurs    │
├─────────────────────┼──────────────────────┼─────────────────┤
│ resetButtons()      │ Start WebSocket      │ resetButtons()  │
│ isLiveAgentCard=    │ isLiveAgentCard=     │ isLiveAgentCard=│
│   false             │   false              │   false         │
└─────────────────────┴──────────────────────┴─────────────────┘
  ↓                     ↓                      ↓
Input Re-enabled      Input Re-enabled     Input Re-enabled
Buttons Re-enabled    Buttons Stay         Buttons Re-enabled
                      Disabled
```

## Benefits

1. **Forced Selection**: Users cannot bypass the live agent card by continuing to type
2. **Consistent Behavior**: All buttons (including "Continue chatting") behave the same way:
   - Highlight on click
   - Disable all buttons
   - Stay disabled until action completes or parent resets
3. **Clear Visual Feedback**: 
   - Disabled input has cursor-not-allowed and reduced opacity
   - Selected button has blue border and different background
   - Other buttons appear dimmed when disabled
4. **Error Recovery**: On error, system automatically resets to allow user to retry
5. **Better UX**: Users understand they need to make a choice before proceeding

## Code Quality

✅ No TypeScript/ESLint errors
✅ Consistent naming conventions
✅ Clear state management
✅ Proper cleanup in error cases
✅ Documented behavior in code comments
✅ Maintains existing functionality
✅ Backwards compatible with existing code

## Testing Recommendations

1. **Live Agent Card Appearance**
   - Verify input is disabled when card appears
   - Verify all buttons are enabled initially

2. **Continue Chatting Flow**
   - Click "Continue chatting"
   - Verify button highlights
   - Verify all buttons disable
   - Verify system message appears
   - Verify buttons reset after action
   - Verify input re-enables

3. **Live Agent Selection Flow**
   - Click any live agent button
   - Verify button highlights
   - Verify all buttons disable
   - Verify connection message appears
   - Verify input re-enables after card hides
   - Verify buttons stay disabled during session

4. **Error Handling**
   - Simulate network error
   - Verify error message appears
   - Verify buttons reset
   - Verify input re-enables
   - Verify user can retry

5. **Dark/Light Mode**
   - Test button highlighting in both themes
   - Verify colors are appropriate
   - Check disabled state appearance

## Related Files

- `src/ChatPage.jsx` - Main chat interface with input control
- `src/components/ButtonRow.jsx` - Live agent button component
- `src/services/liveAgentService.js` - WebSocket service
- `BUTTONROW_USAGE.md` - ButtonRow component documentation
- `ARCHITECTURE.md` - Overall system architecture

## Version History

- **v1.0** (Current) - Initial implementation of input disabling and consistent button behavior
