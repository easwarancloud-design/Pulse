import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { liveAgentService } from '../services/liveAgentService';
import { API_ENDPOINTS } from '../config/api';

/**
 * ButtonRow Component - Live Agent Routing Buttons
 * 
 * Button behavior:
 * - When a live agent button is clicked, ALL buttons become disabled
 * - The selected button gets highlighted with a border and different background
 * - Buttons remain DISABLED during the entire live agent session
 * - Buttons are re-enabled ONLY when:
 *   1. Live agent session ends (parent calls resetButtons via ref)
 *   2. Error occurs during routing
 *   3. "Continue chatting" or "ServiceNow catalog" is clicked (no live agent session)
 * 
 * @param {string} domainid - Domain ID for routing
 * @param {function} onAgentConnect - Callback for agent connection events
 * @param {boolean} isDarkMode - Dark mode flag
 * @param {ref} ref - Forward ref to expose resetButtons function to parent
 */
const ButtonRow = forwardRef(({ domainid, onAgentConnect, isDarkMode = false }, ref) => {
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(isDarkMode);
  // Always reflect parent-provided theme; avoid sticky detection overriding prop
  const themeIsDark = !!isDarkMode;

  // Expose reset function to parent component
  useImperativeHandle(ref, () => ({
    resetButtons: () => {
      setButtonsDisabled(false);
      setSelectedGroup(null);
    }
    ,
    // Allow parent to programmatically highlight a specific option (rehydration)
    setSelectedGroup: (groupName) => {
      setSelectedGroup(groupName);
    }
  }));

  // Better theme detection using multiple methods
  useEffect(() => {
    let mounted = true;

    const detectTheme = () => {
      if (!mounted) return;
      
      try {
        // Method 1: Check for dark mode class on body or html
        const isDark = document.body.classList.contains('dark') || 
                      document.documentElement.classList.contains('dark') ||
                      document.body.getAttribute('data-theme') === 'dark';
        
        // Method 2: Check theme toggle switch state  
        const toggleInput = document.querySelector('input[type="checkbox"][role="switch"]') || 
                           document.querySelector('.theme-toggle input') ||
                           document.querySelector('input[type="checkbox"]');
        
        let themeFromToggle = null;
        if (toggleInput) {
          themeFromToggle = toggleInput.checked;
        }

        // Method 3: Check computed styles for dark background
        const bodyStyles = window.getComputedStyle(document.body);
        const bgColor = bodyStyles.backgroundColor;
        const isDarkFromBg = bgColor === 'rgb(0, 11, 35)' || 
                            bgColor === 'rgb(7, 32, 86)' ||
                            bgColor.includes('rgb(0') ||
                            bodyStyles.color === 'rgb(255, 255, 255)';

        // Use the most reliable detection method
  const fallbackTheme = isDark || isDarkFromBg || isDarkMode;
  let detectedTheme = fallbackTheme;

        if (themeFromToggle === true) {
          detectedTheme = true;
        } else if (themeFromToggle === false) {
          // Only accept a "light" reading if other signals also agree
          detectedTheme = fallbackTheme;
        }
        
        // Track detected theme for diagnostics, but rendering uses isDarkMode prop
        setCurrentTheme(detectedTheme);
      } catch (error) {
        // Fallback to prop if detection fails
        setCurrentTheme(isDarkMode);
      }
    };

    // Initial detection
    detectTheme();

    // Set up multiple observers
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
      childList: true,
      subtree: true
    });

    // Also observe html element
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    // Backup polling
  const interval = setInterval(detectTheme, 300);

    // Listen to custom theme change events
    const handleThemeChange = (e) => {
      if (mounted) {
        setCurrentTheme(e.detail?.isDarkMode ?? e.detail);
      }
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('darkModeToggle', handleThemeChange);

    return () => {
      mounted = false;
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('darkModeToggle', handleThemeChange);
    };
  }, [isDarkMode]);

  // Note: Buttons should remain disabled during live agent session
  // They will only be re-enabled when the session ends or on error
  // Removed auto-reset timer that was incorrectly re-enabling buttons

  const cardStyle = (labelKey) => {
    const isSelected = labelKey === selectedGroup;
    const isServiceNow = labelKey === "HR Service Request";

    if (themeIsDark) { // Dark mode styling
      return {
        width: "100%",
        maxWidth: "640px",
        padding: "14px 20px",
        marginBottom: "12px",
        borderRadius: "10px",
        // Force ServiceNow button to use the same theme as live agent buttons in dark mode
        border: isSelected ? "2px solid #44B8F3" : "1px solid #2861BB",
        backgroundColor: isSelected ? "#1F3E81" : "#122F65",
        fontWeight: isSelected ? "600" : "500",
        fontSize: "14px",
        fontFamily: "Segoe UI, Elevance Sans, sans-serif",
        textAlign: "left",
        cursor: buttonsDisabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 0 0 2px #2861BB" : (isServiceNow ? "none" : "none"),
        opacity: buttonsDisabled && !isSelected ? 0.6 : 1
      };
    } else {
      return {
        width: "100%",
        maxWidth: "640px",
        padding: "14px 20px",
        marginBottom: "12px",
        borderRadius: "10px",
        border: isSelected ? "2px solid #1a366f" : "1px solid #dbe2ea",
        backgroundColor: "transparent", // Always transparent in light mode
        fontWeight: isSelected ? "600" : "500",
        fontSize: "14px",
        fontFamily: "Segoe UI, Elevance Sans, sans-serif",
        textAlign: "left",
        cursor: buttonsDisabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 0 0 2px #cddff6" : "none",
        opacity: buttonsDisabled && !isSelected ? 0.6 : 1
      };
    }
  };

  const routeToGroup = async (groupName) => {
    setButtonsDisabled(true);
    setSelectedGroup(groupName);

    if (groupName === "Continue chatting") {
      if (onAgentConnect) {
        onAgentConnect({
          type: 'continue',
          message: "You may continue chatting here.",
          group: groupName
        });
      }
      // Keep buttons disabled and highlighted until parent resets them
      // Parent will call resetButtons() to re-enable after continue action
      return;
    }

    if (groupName === "HR Service Request") {
      const url = API_ENDPOINTS.SERVICENOW_HR_CATALOG;
      // Do not open a new tab here; we'll show the link bubble in chat
      setSelectedGroup("HR Service Request");
      setButtonsDisabled(false);
      if (onAgentConnect) {
        onAgentConnect({ type: 'servicenow_catalog_opened', url, group: groupName });
      }
      return;
    }

    // Handle live agent routing using service
    try {
      if (onAgentConnect) {
        onAgentConnect({
          type: 'connecting',
          message: "Connecting to a live agent, please hold…",
          group: groupName
        });
      }

      const requestId = await liveAgentService.routeToAgent(
        groupName,
        domainid || "AG40333",
        null, // onMessage - handled by parent component
        null, // onConnect - handled by parent component
        null, // onDisconnect - handled by parent component
        (error) => {
          console.error("❌ Routing to agent failed:", error);
          if (onAgentConnect) {
            onAgentConnect({
              type: 'error',
              message: "Failed to connect to live agent. Please try again."
            });
          }
          // Re-enable buttons on error
          setButtonsDisabled(false);
          setSelectedGroup(null);
        }
      );

      if (onAgentConnect) {
        onAgentConnect({
          type: 'transferred',
          message: "You're being transferred to a live agent.",
          requestId,
          group: groupName
        });
      }
      
      // Keep buttons disabled during live agent session
      // They will be re-enabled when the session ends (handled by parent component)

    } catch (error) {
      console.error("❌ Routing to agent failed:", error.message);
      
      if (onAgentConnect) {
        onAgentConnect({
          type: 'error',
          message: "Failed to connect to live agent. Please try again.",
          group: groupName
        });
      }
      
      // Re-enable buttons on error
      setButtonsDisabled(false);
      setSelectedGroup(null);
    }
  };

  useEffect(() => {
    const buttons = document.querySelectorAll('.button-row-action');
    buttons.forEach((btn) => {
      if (themeIsDark) {
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      } else {
        btn.style.setProperty('color', '#1a366f', 'important');
        btn.style.setProperty('-webkit-text-fill-color', '#1a366f', 'important');
      }
    });
  }, [themeIsDark]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "8px" }}>
      <style>
        {`
          .force-white-text, .force-white-text * {
            color: white !important;
            -webkit-text-fill-color: white !important;
            text-shadow: none !important;
          }
          .force-blue-text, .force-blue-text * {
            color: #1a366f !important;
            -webkit-text-fill-color: #1a366f !important;
          }
        `}
      </style>
      <button
        style={cardStyle("AgenticHRAdvisor")}
  className={`button-row-action ${themeIsDark ? "force-white-text" : "force-blue-text"}`}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("AgenticHRAdvisor")}
      >
  <span style={{color: themeIsDark ? "white" : "#1a366f"}}>
          Manager coaching and coaching for corrective action
        </span>
      </button>
      <button
        style={cardStyle("AgenticContactCenter")}
  className={`button-row-action ${themeIsDark ? "force-white-text" : "force-blue-text"}`}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("AgenticContactCenter")}
      >
  <span style={{color: themeIsDark ? "white" : "#1a366f"}}>
          Other HR support
        </span>
      </button>
      <button
        style={cardStyle("HR Service Request")}
  className={`button-row-action ${themeIsDark ? "force-white-text" : "force-blue-text"}`}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("HR Service Request")}
      >
  <span style={{color: themeIsDark ? "white" : "#1a366f"}}>
          ServiceNow ticket catalog
        </span>
      </button>
      <button
        style={cardStyle("Continue chatting")}
  className={`button-row-action ${themeIsDark ? "force-white-text" : "force-blue-text"}`}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("Continue chatting")}
      >
  <span style={{color: themeIsDark ? "white" : "#1a366f"}}>
          Continue chatting
        </span>
      </button>
    </div>
  );
});

ButtonRow.displayName = 'ButtonRow';

export default ButtonRow;