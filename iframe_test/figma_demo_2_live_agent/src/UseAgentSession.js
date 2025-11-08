import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export default function useAgentSession(connectWebSocket, setMessages,domainid) {
  const [requestId, setRequestId] = useState(null);
  const [liveAgent, setLiveAgent] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);

  const socketRef = useRef(null);

  const startSession = () => {
    const sessionId = `REQ-${uuidv4()}`;
    setRequestId(sessionId);
    setLiveAgent(true);
    setChatEnded(false);

    if (typeof connectWebSocket === 'function') {
      socketRef.current = connectWebSocket(sessionId);
    } else {
      console.warn("connectWebSocket is not a function. WebSocket not initiated.");
    }
    return sessionId;
  };

  const endSession = () => {
    if (socketRef.current) {
      socketRef.current.close();
    //   socketRef.current = null;
    }
    setLiveAgent(false);
    setChatEnded(true);
  };

  const terminateSession = async (reason = "Disconnected from live agent.") => {
    console.log('calling terminate session:',reason)
    console.log('chat ended:',chatEnded)
    // if (chatEnded) return;
    endSession();

    const payload = {
      requestId,
      token: "vaacubed",
      botToBot: true,
      clientSessionId: "",
      silentMessage: false,
      message: {
        text: reason,
        typed: true
      },
      userId: domainid,
      emailId: "user@email.com",
      timestamp: Date.now(),
      timezone: "America/New_York",
      action: "END_CONVERSATION"
    };

    try {
      await axios.post("https://workforceagent.elevancehealth.com/user/to/agent/servicenow", payload, {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("❌ Failed to notify backend:", error.response?.data || error.message);
    }

    if (typeof setMessages === 'function') {
      setMessages(prev => [
        ...prev,
        {
          sender: "system",
          text: (
              <div style={{
              backgroundColor: "#f0f4f8",
              padding: "8px 12px",
              borderRadius: "6px",
              color: "#1a3673",
              fontWeight: "500",
              fontFamily: "Elevance Sans",
              marginBottom: "8px",
              textAlign: "center"
            }}>
                  {reason} You can continue chatting with the bot.
            </div>
          )
        }
      ]);
    }
  };

  return {
    requestId,
    liveAgent,
    chatEnded,
    startSession,
    endSession,
    terminateSession,
    socketRef
  };
}
