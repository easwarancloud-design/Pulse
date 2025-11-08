import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { uuidv4 } from '../utils/workforceAgentUtils';

const ButtonRow = ({ domainid, onAgentConnect, isDarkMode = false }) => {
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(isDarkMode);
  const themeIsDark = isDarkMode || currentTheme;

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

  // Reset selection after a delay to prevent persistent selection state
  useEffect(() => {
    if (selectedGroup) {
      const timer = setTimeout(() => {
        setSelectedGroup(null);
        setButtonsDisabled(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedGroup]);

  const cardStyle = (labelKey) => {
    const isSelected = labelKey === selectedGroup;
    
    // Debug: log current theme detection
    console.log('ButtonRow theme detection:', { currentTheme, isDarkMode, themeIsDark, labelKey });
    
    if (themeIsDark) { // Dark mode styling
      return {
        width: "100%",
        maxWidth: "640px",
        padding: "14px 20px",
        marginBottom: "12px",
        borderRadius: "10px",
        border: isSelected ? "2px solid #44B8F3" : "1px solid #2861BB",
        backgroundColor: isSelected ? "#1F3E81" : "#122F65",
        fontWeight: isSelected ? "600" : "500",
        fontSize: "14px",
        fontFamily: "Segoe UI, Elevance Sans, sans-serif",
        textAlign: "left",
        cursor: buttonsDisabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 0 0 2px #2861BB" : "none",
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
          message: "You may continue chatting here."
        });
      }
      return;
    }

    if (groupName === "HR Service Request") {
      window.open("https://elevancehealth.service-now.com/esc?id=elevance_health_hrsd_catalog", "_blank");
      setButtonsDisabled(false);
      return;
    }

    // Handle live agent routing
    try {
      const requestId = Date.now().toString();
      const currentTimestamp = Date.now();

      const userInfo = {
        userId: domainid || "AG40333",
        emailId: "user@elevancehealth.com",
        token: "vaacubed",
        timezone: "America/New_York",
      };

      const payload = {
        requestId,
        token: "vaacubed",
        botToBot: true,
        clientSessionId: "",
        silentMessage: false,
        message: { text: "First_Message", typed: true },
        userId: userInfo.userId,
        emailId: userInfo.emailId,
        username: "User",
        agent_group: groupName,
        timestamp: currentTimestamp,
        timezone: "America/New_York",
        action: "SWITCH",
        topic: { name: groupName }
      };

      if (onAgentConnect) {
        onAgentConnect({
          type: 'connecting',
          message: "Connecting to a live agent, please hold…"
        });
      }

      await axios.post("https://workforceagent.elevancehealth.com/user/to/agent/servicenow", payload, {
        headers: { "Content-Type": "application/json" }
      });

      if (onAgentConnect) {
        onAgentConnect({
          type: 'transferred',
          message: "You're being transferred to a live agent.",
          requestId
        });
      }

    } catch (error) {
      console.error("❌ Routing to agent failed:", error.response?.data || error.message);
      
      if (onAgentConnect) {
        onAgentConnect({
          type: 'error',
          message: "Failed to connect to live agent. Please try again."
        });
      }
      
      setButtonsDisabled(false);
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
};

export default ButtonRow;