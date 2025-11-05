import React, { useState } from 'react';
import axios from 'axios';
import { uuidv4 } from '../utils/workforceAgentUtils';

const ButtonRow = ({ domainid, onAgentConnect }) => {
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const cardStyle = (labelKey) => {
    const isSelected = labelKey === selectedGroup;
    return {
      width: "100%",
      maxWidth: "640px",
      padding: "14px 20px",
      marginBottom: "12px",
      borderRadius: "10px",
      border: isSelected ? "2px solid #1a366f" : "1px solid #dbe2ea",
      backgroundColor: isSelected ? "#eef4ff" : "#ffffff",
      color: "#1a366f",
      fontWeight: isSelected ? "600" : "500",
      fontSize: "14px",
      fontFamily: "Segoe UI, Elevance Sans, sans-serif",
      textAlign: "left",
      cursor: buttonsDisabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      boxShadow: isSelected ? "0 0 0 2px #cddff6" : "none",
      opacity: buttonsDisabled && !isSelected ? 0.6 : 1
    };
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

      await axios.post("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/user/to/agent/servicenow", payload, {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "8px" }}>
      <button
        style={cardStyle("AgenticHRAdvisor")}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("AgenticHRAdvisor")}
      >
        Manager coaching and coaching for corrective action
      </button>
      <button
        style={cardStyle("AgenticContactCenter")}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("AgenticContactCenter")}
      >
        Other HR support
      </button>
      <button
        style={cardStyle("HR Service Request")}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("HR Service Request")}
      >
        ServiceNow ticket catalog
      </button>
      <button
        style={cardStyle("Continue chatting")}
        disabled={buttonsDisabled}
        onClick={() => routeToGroup("Continue chatting")}
      >
        Continue chatting
      </button>
    </div>
  );
};

export default ButtonRow;