import React, { useState, useEffect, useRef } from 'react';
import './Home.css';
import { useAccessToken } from './hooks/useToken';
import Help from './hooks/help'
import { useLayoutEffect } from 'react';
import axios from 'axios';
import SendIcon from '@mui/icons-material/Send';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // Example if using Material UI

import FeedbackIcon from '@mui/icons-material/Feedback';
import ChatIcon from '@mui/icons-material/Chat';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAgentSession from './hooks/useAgentSession'
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

import {
  ThumbLikeRegular,
  ThumbDislikeRegular,
  CopyRegular,CopyFilled,
  CommentMultipleRegular,
  ThumbLikeFilled,
  ThumbDislikeFilled,
} from '@fluentui/react-icons';


// var domainid = '';
var UserName;
var Question;
var Answer;
var Liked;
var INSERT_TS;
var color = 'light';
var inputdId;
var button;
var count = 0;
var FeedbackQuestion = '';
var FeedbackAnswer = '';

function CHATBOT({ user, mode }) {

  const [showConfirm, setShowConfirm] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [domainid, setDomainid] = useState('');
  const [sessionid, setSessionid] = useState('');

  const [feedback, setFeedback] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const hasMoreMessagesRef = useRef(true);


  const [messages, setMessages] = useState([]);
  const [feedbackMessages, setFeedbackMessages] = useState([]);
  const [notificationMessages, setNotificationMessages] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [domId, setDomId] = useState('');
  const [timestamp, setTimestamp] = useState([]);
  const messagesEndRef = useRef(null)

  const [isMinimized, setIsMinimized] = useState(true);
  const chatContainerRef = useRef(null);
  const nextOffsetRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasInitialLoadRef = useRef(false);

  const [isClicked, setIsClicked] = useState(false);
  const [isFeedbackClicked, setIsFeedbackClicked] = useState(false);
  const [isNotificationsClicked, setIsNotificationsClicked] = useState(false);
  const [copyClicked, setCopyClicked] = useState(false);

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const [inputValueDid, setInputValueDid] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSaveFeedbackClicked, setIsSaveFeedbackClicked] = useState(false);

  const [showBotInfo, setShowBotInfo] = useState(false);

  const [agentName, setAgentName] = useState(null);
  const firstLiveAgentMessageShown = useRef(false);

  const toggleBotInfo = () => {
    setShowBotInfo(prev => !prev);
  };

  const { getToken } = useAccessToken();

  /*useEffect(() => {
    const storedDomain = localStorage.getItem('domainid');
    if (storedDomain) setDomainid(storedDomain);
  }, []);
*/
  const userInfo = {
    userId: domainid,
    emailId: "easwaran.perumal@elevancehealth.com",
    token: "vaacubed",
    timezone: "America/New_York",
  };

  const [hasWelcomed, setHasWelcomed] = useState(false);


        //skip welcome message for entirely for adming mode
/*useEffect(() => {
  if (mode !== 'admin' && domainid && !hasWelcomed) {
    sendDomainid(domainid);
    setHasWelcomed(true);
  }
}, [domainid]);
*/
/*useEffect(() => {
  if (!hasWelcomed && domainid) {
    sendDomainid(domainid);
    setHasWelcomed(true);
  }
}, [domainid]);

*/

/*useEffect(() => {
  if (mode !== 'admin' && user?.domainid) {
    sendDomainid(user.domainid);
  }
}, [user]);
*/

/*useEffect(() => {
  if (mode !== 'admin') {
    if (user?.domainid) {
      setDomainid(user.domainid);
    } else { console.log( "⚠️ You are not logged in, please refresh and try again.");
    //  setMessages(prev => [
     //   ...prev,
      //  { text: "⚠️ You are not logged in, please refresh and try again.", sender: 'bot' }
      //]);
    }
  }
}, [user]);
*/



        const handleClick = () => {
    setCopyClicked(!copyClicked);
  };

  function darkMode() {
    setIsClicked(isClicked => !isClicked);
    console.log(isClicked)
    if (isClicked == false){
      color = "dark"
    } else {
      color = "light"
    }

    console.log(color)
  }



  const toggleMinimize = () => {

    var x = document.getElementById("embed");
    console.log(x)


    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
    setIsMinimized(!isMinimized);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);

    return () => clearTimeout(timer);
  }, [messages]);

  const generateSessionId = () => {
    const now = new Date();

    // Format the datetime into a compact number (YYYYMMDDHHMMSS)
    const sessionid = parseInt(
      `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}` +
      `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
    );
     localStorage.setItem('sessionid', sessionid);
    setSessionid(sessionid);


    return sessionid;
  };

 useEffect(() => {
    if (mode === 'admin') {
      console.log('admin mode domainid:', domainid);
      // const storedDomain = localStorage.getItem('domainid');
      // if (storedDomain) setDomainid(storedDomain);
    } else {
      if (user?.domainID && user.domainID !== domainid) {
        setDomainid(user.domainID);
      } // Lock to authenticated user's domain

       // let sessionid = localStorage.getItem('session_id');
        if (!sessionid) {
         generateSessionId();
         //localStorage.setItem('sessionid', newsessionid);
         //setSessionid(newsessionid);
        }
        //console.log('current user session id:', sessionid);

            // Trigger welcome message only once
      if (!hasWelcomed && user.domainID) {
        sendDomainid(user.domainID);
        setHasWelcomed(true);
      }

      }
  }, [mode, user]);



  /*useEffect(() => {
    if (!localStorage.getItem('session_id')) {
      const sessionId = generateSessionId();
      localStorage.setItem('session_id', sessionId);
      console.log('Session started:', sessionId);
    }
  }, []);

*/

 /* useEffect(() => {
    if (mode === 'admin') {
      const storedDomain = localStorage.getItem('domainid');
      if (storedDomain) setDomainid(storedDomain);
    } else {
      if (user?.domainID) {
        setDomainid(user.domainID); // Lock to authenticated user's domain
        localStorage.setItem('domainid', user.domainID); // ✅ Sync to localStorage
      }
    }
  }, [mode, user]);
*/
/*  const ButtonRow = () => {

    const [buttonsDisabled, setButtonsDisabled] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const buttonStyle = (disabled, labelKey) => {
      const isSelected = labelKey === selectedGroup;
      return {
        padding: "8px 16px",
        margin: "6px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        backgroundColor: isSelected ? "#e6f0ff" : "#ffffff", // calm light blue
        color: isSelected ? "#1a3673" : "#1a3673",            // professional navy
        fontWeight: isSelected ? "600" : "500",
        cursor: "default",
        boxShadow: isSelected ? "inset 0 0 0 1px #a0c4ff" : "none",
        opacity: disabled ? 0.6 : 1,
      };
    };

    // Logic hooks below should be in scope or passed as props if needed:
    const routeToGroup = async (groupName) => {
      setButtonsDisabled(true);
      setSelectedGroup(groupName); // in routeToGroup
      setIsInputDisabled(false);
      setShowConfirm(false);
      // startSession();
      const requestId = startSession();
      console.log('requestId:',requestId)

      const currentTimestamp = Date.now();
      postResponse(domainid, "None", `[SYSTEM] User selected agent name [${groupName}]`, 0,uuidv4(),"agent");
      postResponse(domainid, "None", "[SYSTEM] Connecting to a live agent, please hold…", 0,uuidv4(),"agent");
      console.log(`[SYSTEM] User selected agent name ${groupName}`);
      const payload = {
        requestId,
        token: "vaacubed",
        botToBot: true,
        clientSessionId: "",
        silentMessage: false,
        message: {
          text: "First_Message",
          typed: true
        },
        userId: userInfo?.userId || "AL31376",
        emailId: userInfo?.emailId || "easwaran.perumal@gmail.com",
        username: "Easwar",
        agent_group:groupName,
        timestamp: currentTimestamp,
        timezone: "America/New_York",
        action: "SWITCH",
        topic: {
          name: groupName
        }
      };

      console.log("payload:", payload);

      try {

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
                Connecting to a live agent, please hold…
              </div>
            )
          }
        ]);

        await axios.post("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/user/to/agent/servicenow", payload, {
          headers: { "Content-Type": "application/json" }
        });

        postResponse(domainid, "None", "[SYSTEM] Connecting to a live agent, please hold…", 0,uuidv4(),"agent");

      } catch (error) {
        console.error("❌ Routing to agent failed:", error.response?.data || error.message);
        // postResponse(domainid, "None", "[SYSTEM] Routing to agent failed.", 0,uuidv4(),"agent");
        // You can also log to external error tracking service here
      }




      postResponse(domainid, "None", "[SYSTEM] You're being transferred to a live agent.", 0,uuidv4(),"agent");
      setShowConfirm(false);
    };


    const continueChat = () => {
      setButtonsDisabled(true); // disable all buttons
      setIsInputDisabled(false); // allow bot chat to resume
      setSelectedGroup("continueChat"); // in continueChat
      setShowConfirm(false);
      if (liveAgent) {
        endSession();
      }

      setMessages(prev => [
        ...prev,
        {
          sender: "system",
          text: (
            <div style={{
              backgroundColor: "#eef5fb",          // soft blue
              padding: "10px 14px",
              borderRadius: "8px",
              color: "#1a3673",                    // professional navy
              fontWeight: "500",
              fontFamily: "Elevance Sans, sans-serif",
              margin: "10px auto",
              maxWidth: "400px",
              textAlign: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
            }}>
              You're continuing with the Chat. Let's keep going.
            </div>
          )
        }
      ]);

      postResponse(domainid, "None", "[SYSTEM] You're continuing with the Chat. Let's keep going.", 0,uuidv4(),"agent");
    };



    return (

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: "12px" }}>
  <button
    style={buttonStyle(buttonsDisabled, "AgenticHRAdvisor")}
    disabled={buttonsDisabled}
    onClick={() => routeToGroup("AgenticHRAdvisor")}
  >
    Talk to Live Agent - Manager Coaching
  </button>
  <button
    style={buttonStyle(buttonsDisabled, "AgenticContactCenter")}
    disabled={buttonsDisabled}
    onClick={() => routeToGroup("AgenticContactCenter")}
  >
    Talk to Live Agent - HR Support
  </button>
  <button
    style={buttonStyle(buttonsDisabled, "continueChat")}
    disabled={buttonsDisabled}
    onClick={continueChat}
  >
    Stay with Workforce Agent
  </button>
</div>
    );
  };

*/

  const ButtonRow = () => {
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
      setIsInputDisabled(false);
      setShowConfirm(false);

      if (groupName === "Continue chatting") {
        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            text: (
              <div style={{
                backgroundColor: "#f0f4f8",
                padding: "12px 16px",
                borderRadius: "8px",
                color: "#1a3673",
                fontWeight: "500",
                fontFamily: "Segoe UI, Elevance Sans",
                marginBottom: "8px",
                textAlign: "center"
              }}>
                You may continue chatting here.
              </div>
            )
          }
        ]);
        return;
      }

      if (groupName === "HR Service Request") {
        window.open("https://elevancehealth.service-now.com/esc?id=elevance_health_hrsd_catalog", "_blank");
        return;
      }

      const requestId = startSession();
      const currentTimestamp = Date.now();

      postResponse(domainid, "None", `[SYSTEM] User selected agent name [${groupName}]`, 0, uuidv4(), "agent");
      postResponse(domainid, "None", "[SYSTEM] Connecting to a live agent, please hold…", 0, uuidv4(), "agent");

      const payload = {
        requestId,
        token: "vaacubed",
        botToBot: true,
        clientSessionId: "",
        silentMessage: false,
        message: { text: "First_Message", typed: true },
        userId: userInfo?.userId || "AL31376",
        emailId: userInfo?.emailId || "easwaran.perumal@gmail.com",
        username: "Easwar",
        agent_group: groupName,
        timestamp: currentTimestamp,
        timezone: "America/New_York",
        action: "SWITCH",
        topic: { name: groupName }
      };

      try {
        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            text: (
              <div style={{
                backgroundColor: "#f0f4f8",
                padding: "12px 16px",
                borderRadius: "8px",
                color: "#1a3673",
                fontWeight: "500",
                fontFamily: "Segoe UI, Elevance Sans",
                marginBottom: "8px",
                textAlign: "center"
              }}>
                Connecting to a live agent, please hold…
              </div>
            )
          }
        ]);

        await axios.post("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/user/to/agent/servicenow", payload, {
          headers: { "Content-Type": "application/json" }
        });

        postResponse(domainid, "None", "[SYSTEM] Connecting to a live agent, please hold…", 0, uuidv4(), "agent");

      } catch (error) {
        console.error("❌ Routing to agent failed:", error.response?.data || error.message);
      }

      postResponse(domainid, "None", "[SYSTEM] You're being transferred to a live agent.", 0, uuidv4(), "agent");
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

/*const sendMessage = async () => {
  if (!input.trim()) return;

  const session_id =  Date.now().toString();  // Ensure sessionTime is set
  const question_text = input;
  const DomainId=localStorage.getItem('domainid', '');

  setMessages(prev => [...prev, { sender: "user", text: input, time: new Date().toISOString()
}]);
  setInput("");
  setLoading(true);

  let chat_id = "";
  let partialMessage = "";
  let liveAgentTriggered = false;

  try {
    const token = await getToken(domainid);

    const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        question: input,
        domainid,
      },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      console.log('chunk:',chunk);
      if (chunk.includes("<<LiveAgent>>")) {
        setShowConfirm(false);
        setIsInputDisabled(true);
         setMessages(prev => [
          ...prev,
          {
            sender: "system",
            time: new Date().toISOString(),
            text: (
              <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <ButtonRow />
              </div>
            )
          }
        ]);

        liveAgentTriggered = true;
        chat_id = uuidv4();
        // postResponse(domainid, "None", "[SYSTEM] Choose live agent", 0, chat_id,"agent");
        break;
      }

      if (!liveAgentTriggered) {
        partialMessage += chunk;

        setMessages(prev => {
          const updated = [...prev];
          const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
          if (botMessage) {
            botMessage.text = partialMessage;
          } else {
            chat_id = uuidv4();
            updated.push({
              chat_id,
              sender: "bot",
              text: partialMessage,
              completed: false,
              time: new Date().toISOString()
            });
          }
          return updated;
        });
      }
    }

    if (!liveAgentTriggered && !partialMessage.trim()) {
  chat_id = uuidv4();
  setMessages(prev => [
    ...prev,
    {
      chat_id,
      sender: "bot",
      text: "⚠️ Unable to fetch response.",
      completed: true,
      time: new Date().toISOString()
    }
  ]);
}

    if (!liveAgentTriggered) {
      let latestChatId = "";
      chat_id = uuidv4();
      setMessages(prev => {
        const updated = [...prev];
        const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
        if (botMessage) {
          botMessage.completed = true;
          latestChatId = botMessage.chat_id || chat_id;
        }
        return updated;
      });

      // Record metadata for feedback and history
      const response_text = partialMessage;
      const feedback_score = 0;  // default
      console.log(response_text)
      console.log(latestChatId || chat_id)
      postResponse(domainid,question_text, response_text, feedback_score, latestChatId || chat_id, "bot");

    }

  }

  // catch (error) {
  //   console.error("Error fetching the data:", error);
  //   setMessages(prev => [...prev, { text: "Unable to fetch response, Please try again.", sender: "bot",time: new Date().toISOString()  }]);
  // }

catch (error) {
  console.error("Error fetching the data:", error);
  setMessages(prev => {
    const updated = [...prev];
    const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
    if (botMessage) {
      // If backend explicitly sent a reference link failure
      if (partialMessage && partialMessage.includes("⚠️ Failed to retrieve Reference links")) {
        botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
      } else if (partialMessage) {
        // Partial content but not completed
        botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
      } else {
        // No partial content at all
        botMessage.text = "⚠️ Unable to fetch response.";
      }
      botMessage.completed = true;
    } else {
      // No bot message exists at all, create one
      updated.push({
        sender: "bot",
        text: partialMessage
          ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
          : "⚠️ Unable to fetch response.",
        completed: true,
        time: new Date().toISOString()
      });
    }
    return updated;
  });
}

  finally {
    setLoading(false);
  }
};
*/

 const sendMessage = async () => {
    if (!input.trim()) return;

    const question_text = input;
    const domainid = localStorage.getItem('domainid', '');
    const botChatId = uuidv4();

    setMessages(prev => [
      ...prev,
      {
        sender: "user",
        text: input,
        time: new Date().toISOString()
      },
      {
        chat_id: botChatId,
        sender: "bot",
        text: "",
        completed: false,
        time: new Date().toISOString()
      }
    ]);

    setInput("");
    setLoading(true);

    let partialMessage = "";
    let liveAgentTriggered = false;
    let leftoverIdLine = ""; // buffer for incomplete id lines

    try {
      const token = await getToken(domainid);
      const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          question: input,
          domainid,
        },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });

        if (chunk.includes("<<LiveAgent>>")) {
          setShowConfirm(false);
          setIsInputDisabled(true);
          setMessages(prev => [
            ...prev,
            {
              sender: "system",
              time: new Date().toISOString(),
              text: (
                <div style={{
                  backgroundColor: "#f9fbfc",
                  padding: "20px",
                  borderRadius: "12px",
                  marginBottom: "16px",
                  fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                  color: "#1a366f",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  maxWidth: "640px",
                  marginLeft: "auto",
                  marginRight: "auto",
                  lineHeight: "1.5"
                }}>
                  <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                    If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                    If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                    If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                  </p>
                  <ButtonRow />
                </div>
              )
            }
          ]);
          liveAgentTriggered = true;
          break;
        }

        if (!liveAgentTriggered) {
          // const words = chunk.split(/(\s+)/); // includes spaces and line breaks
          console.log('chunk:',chunk)

          // Prepend leftover from previous chunk
          if (leftoverIdLine) {
            chunk = leftoverIdLine + chunk;
            leftoverIdLine = "";
          }

          // Check if chunk ends with incomplete id line
          const idLineMatch = chunk.match(/id:[^\n]*$/);
          if (idLineMatch) {
            leftoverIdLine = idLineMatch[0]; // store for next chunk
            chunk = chunk.replace(/id:[^\n]*$/, ""); // remove partial id line
          }
          //const cleanedChunk = chunk.replace(/(^|\n)id:[^\n]*\n?/gi, "");
          //chunk.replace(/(^|\n)id:[^\n]*(\n|$)/gi, "")

          const cleanedChunk = chunk
                .replace(/\nid:.*?\n\n/g, '')               // Remove block IDs prefixed with newline
                .replace(/(^|\n)id:.*?\n\n/g, '')           // Remove standalone ID blocks
                .replace(/(^|\n)id:[^\n]*\n/g, '');         // Remove single-line ID entries with one newline

          const words = cleanedChunk.split(/(\s+)/);

          console.log('cleanedChunk:',cleanedChunk)

          for (const word of words) {
            partialMessage += word;

            setMessages(prev =>
              prev.map(msg =>
                msg.chat_id === botChatId
                  ? { ...msg, text: partialMessage }
                  : msg
              )
            );

            await new Promise(resolve => setTimeout(resolve, 15)); // ⏳ slow down for realism
          }
        }
      }

      if (!liveAgentTriggered) {
        setMessages(prev =>
          prev.map(msg =>
            msg.chat_id === botChatId
              ? { ...msg, completed: true }
              : msg
          )
        );
        postResponse(domainid, question_text, partialMessage, 0, botChatId, "bot");
      }

    } catch (error) {
      console.error("Error fetching the data:", error);
      setMessages(prev => {
        const updated = [...prev];
        const botMessage = updated.find(msg => msg.chat_id === botChatId);
        if (botMessage) {
          botMessage.text = partialMessage
            ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
            : "⚠️ Unable to fetch response.";
          botMessage.completed = true;
        } else {
          updated.push({
            chat_id: botChatId,
            sender: "bot",
            text: partialMessage
              ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
              : "⚠️ Unable to fetch response.",
            completed: true,
            time: new Date().toISOString()
          });
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };




const sendMessage_working_have_id_displayissue = async () => {
  if (!input.trim()) return;

  const question_text = input;
  const domainid = localStorage.getItem('domainid', '');
  const botChatId = uuidv4(); // Unique ID for bot message

  // ✅ Push both user and bot placeholders immediately
  setMessages(prev => [
    ...prev,
    {
      sender: "user",
      text: input,
      time: new Date().toISOString()
    },
    {
      chat_id: botChatId,
      sender: "bot",
      text: "",
      completed: false,
      time: new Date().toISOString()
    }
  ]);

  setInput("");
  setLoading(true);

  let partialMessage = "";
  let liveAgentTriggered = false;

  try {
    const token = await getToken(domainid);
    const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        question: input,
        domainid,
      },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk.includes("<<LiveAgent>>")) {
        setShowConfirm(false);
        setIsInputDisabled(true);
        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            time: new Date().toISOString(),
            text: (
              <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <ButtonRow />
              </div>
            )
          }
        ]);
        liveAgentTriggered = true;
        break;
      }

      if (!liveAgentTriggered) {
        partialMessage += chunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.chat_id === botChatId
              ? { ...msg, text: partialMessage }
              : msg
          )
        );
      }
    }

    if (!liveAgentTriggered) {
      setMessages(prev =>
        prev.map(msg =>
          msg.chat_id === botChatId
            ? { ...msg, completed: true }
            : msg
        )
      );
      postResponse(domainid, question_text, partialMessage, 0, botChatId, "bot");
    }

  } catch (error) {
    console.error("Error fetching the data:", error);
    setMessages(prev => {
      const updated = [...prev];
      const botMessage = updated.find(msg => msg.chat_id === botChatId);
      if (botMessage) {
        if (partialMessage && partialMessage.includes("⚠️ Failed to retrieve Reference links")) {
          botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
        } else if (partialMessage) {
          botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
        } else {
          botMessage.text = "⚠️ Unable to fetch response.";
        }
        botMessage.completed = true;
      } else {
        updated.push({
          chat_id: botChatId,
          sender: "bot",
          text: partialMessage
            ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
            : "⚠️ Unable to fetch response.",
          completed: true,
          time: new Date().toISOString()
        });
      }
      return updated;
    });
  } finally {
    setLoading(false);
  }
};


const sendMessage_old = async () => {
  if (!input.trim()) return;

  const question_text = input;
  const domainid = localStorage.getItem('domainid', '');

  // Step 1: Add user message and wait for it to render
  setMessages(prev => [
    ...prev,
    {
      sender: "user",
      text: input,
      time: new Date().toISOString()
    }
  ]);

  setInput("");
  setLoading(true);

  // Step 2: Wait briefly to ensure user message is rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  let chat_id = "";
  let partialMessage = "";
  let liveAgentTriggered = false;

  try {
    const token = await getToken(domainid);

    const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        question: input,
        domainid,
      },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk.includes("<<LiveAgent>>")) {
        setShowConfirm(false);
        setIsInputDisabled(true);
        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            time: new Date().toISOString(),
            text: (
              <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <ButtonRow />
              </div>
            )
          }
        ]);
        liveAgentTriggered = true;
        chat_id = uuidv4();
        break;
      }

      if (!liveAgentTriggered) {
        partialMessage += chunk;

        setMessages(prev => {
          const updated = [...prev];
          const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
          if (botMessage) {
            botMessage.text = partialMessage;
          } else {
            chat_id = uuidv4();
            updated.push({
              chat_id,
              sender: "bot",
              text: partialMessage,
              completed: false,
              time: new Date().toISOString()
            });
          }
          return updated;
        });
      }
    }

    if (!liveAgentTriggered) {
      let latestChatId = "";
      chat_id = uuidv4();
      setMessages(prev => {
        const updated = [...prev];
        const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
        if (botMessage) {
          botMessage.completed = true;
          latestChatId = botMessage.chat_id || chat_id;
        }
        return updated;
      });

      const response_text = partialMessage;
      const feedback_score = 0;
      postResponse(domainid, question_text, response_text, feedback_score, latestChatId || chat_id, "bot");
    }

  } catch (error) {
    console.error("Error fetching the data:", error);
    setMessages(prev => {
      const updated = [...prev];
      const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
      if (botMessage) {
        botMessage.text = partialMessage
          ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
          : "⚠️ Unable to fetch response.";
        botMessage.completed = true;
      } else {
        updated.push({
          sender: "bot",
          text: partialMessage
            ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
            : "⚠️ Unable to fetch response.",
          completed: true,
          time: new Date().toISOString()
        });
      }
      return updated;
    });
  } finally {
    setLoading(false);
  }
};


const sendMessage_original = async () => {
  //if (!input.trim()) return;

  //const session_id =  Date.now().toString();  // Ensure sessionTime is set
  const question_text = input;
  const DomainId=localStorage.getItem('domainid', '');
  console.log('question:',input);
  setMessages(prev => [...prev, { sender: "user", text: input, time: new Date().toISOString()
}]);
  setInput("");
  setLoading(true);
  await new Promise(resolve => setTimeout(resolve, 5000));

  let chat_id = "";
  let partialMessage = "";
  let liveAgentTriggered = false;

  try {
    const token = await getToken(domainid);

    const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        question: input,
        domainid,
      },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk.includes("<<LiveAgent>>")) {
        setShowConfirm(false);
        setIsInputDisabled(true);
         setMessages(prev => [
          ...prev,
          {
            sender: "system",
            time: new Date().toISOString(),
            text: (
              <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <ButtonRow />
              </div>
            )
          }
        ]);

        liveAgentTriggered = true;
        chat_id = uuidv4();
        // postResponse(domainid, "None", "[SYSTEM] Choose live agent", 0, chat_id,"agent");
        break;
      }

      if (!liveAgentTriggered) {
        partialMessage += chunk;

        setMessages(prev => {
          const updated = [...prev];
          const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
          if (botMessage) {
            botMessage.text = partialMessage;
          } else {
            chat_id = uuidv4();
            updated.push({
              chat_id,
              sender: "bot",
              text: partialMessage,
              completed: false,
              time: new Date().toISOString()
            });
          }
          return updated;
        });
      }
    }

    if (!liveAgentTriggered) {
      let latestChatId = "";
      chat_id = uuidv4();
      setMessages(prev => {
        const updated = [...prev];
        const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
        if (botMessage) {
          botMessage.completed = true;
          latestChatId = botMessage.chat_id || chat_id;
        }
        return updated;
      });

      // Record metadata for feedback and history
      const response_text = partialMessage;
      const feedback_score = 0;  // default
      console.log(response_text)
      console.log(latestChatId || chat_id)
      postResponse(domainid,question_text, response_text, feedback_score, latestChatId || chat_id, "bot");

    }

  }

  // catch (error) {
  //   console.error("Error fetching the data:", error);
  //   setMessages(prev => [...prev, { text: "Unable to fetch response, Please try again.", sender: "bot",time: new Date().toISOString()  }]);
  // }

catch (error) {
  console.error("Error fetching the data:", error);
  setMessages(prev => {
    const updated = [...prev];
    const botMessage = updated.find(msg => msg.sender === "bot" && !msg.completed);
    if (botMessage) {
      // If backend explicitly sent a reference link failure
      if (partialMessage && partialMessage.includes("⚠️ Failed to retrieve Reference links")) {
        botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
      } else if (partialMessage) {
        // Partial content but not completed
        botMessage.text = `${partialMessage}\n\n⚠️ Unable to fetch reference link.`;
      } else {
        // No partial content at all
        botMessage.text = "⚠️ Unable to fetch response.";
      }
      botMessage.completed = true;
    } else {
      // No bot message exists at all, create one
      updated.push({
        sender: "bot",
        text: partialMessage
          ? `${partialMessage}\n\n⚠️ Unable to fetch reference link.`
          : "⚠️ Unable to fetch response.",
        completed: true,
        time: new Date().toISOString()
      });
    }
    return updated;
  });
}

  finally {
    setLoading(false);
  }
};



/*
const sendMessage = async () => {
  if (!input.trim()) return;

  const session_id = Date.now().toString();
  const question_text = input;
  const domainid = localStorage.getItem('domainid', '');
  const botChatId = uuidv4();
  let partialMessage = "";
  let liveAgentTriggered = false;
  let streamFailed = false;
  let hasRealContent = false;

  // Show user message immediately
  setMessages(prev => [
    ...prev,
    {
      sender: "user",
      text: input,
      time: new Date().toISOString()
    },
    {
      chat_id: botChatId,
      sender: "bot",
      text: "",
      completed: false,
      hasContent: false,
      time: new Date().toISOString()
    }
  ]);

  setInput("");
  setLoading(true);

  try {
    const token = await getToken(domainid);

    const response = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        question: input,
        domainid,
      },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // 🔹 Live Agent Trigger
      if (chunk.includes("<<LiveAgent>>")) {
        liveAgentTriggered = true;

        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            time: new Date().toISOString(),
            text: (
              <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <ButtonRow />
              </div>
            )
          }
        ]);
        break;
      }

      // 🔹 Policy Link Status Messages
      if (chunk.includes("⏳ Fetching policy links") || chunk.includes("⏳ Still fetching policy links")) {
        const statusText = chunk.includes("Still")
          ? "⏳ Still retrieving reference links..._"
          : "⏳ Fetching reference links..._";

        // setMessages(prev =>
        //   prev.map(msg =>
        //     msg.chat_id === botChatId
        //       ? { ...msg, text: `${partialMessage}\n\n${statusText}` }
        //       : msg
        //   )
        // );
        continue;
      }

      // 🔹 First Real Content
      if (!hasRealContent && chunk.trim().length > 0) {
        hasRealContent = true;
        setMessages(prev =>
          prev.map(msg =>
            msg.chat_id === botChatId
              ? { ...msg, hasContent: true }
              : msg
          )
        );
      }

      // 🔹 Stream Bot Response
      partialMessage += chunk;
      setMessages(prev =>
        prev.map(msg =>
          msg.chat_id === botChatId
            ? { ...msg, text: partialMessage }
            : msg
        )
      );
    }

    // 🔹 Finalize Bot Message
    if (!liveAgentTriggered) {
      setMessages(prev =>
        prev.map(msg =>
          msg.chat_id === botChatId
            ? { ...msg, completed: true }
            : msg
        )
      );

      postResponse(domainid, question_text, partialMessage, 0, botChatId, "bot");
    }

  } catch (error) {
    console.error("❌ Streaming failed:", error);
    streamFailed = true;

    setMessages(prev =>
      prev.map(msg =>
        msg.chat_id === botChatId
          ? {
              ...msg,
              completed: true,
              hasContent: hasRealContent,
              text: partialMessage
                ? `${partialMessage}\n\n⚠️ Unable to complete response. Please try again.`
                : "⚠️ Unable to fetch response. Please try again."
            }
          : msg
      )
    );
  } finally {
    setLoading(false);
  }
};
*/

  const sendLiveAgentMessage = async () => {
    if (!input.trim()) return;

    // const id = chatId || requestId;
    const id = requestId;
    const currentTimestamp = Date.now();

    const payload = {
      requestId: id,
      token: "vaacubed",
      botToBot: true,
      clientSessionId: "",
      silentMessage: false,
      message: {
        text: input,
        typed: true
      },
      userId: userInfo?.userId || "AL31376",
      emailId: userInfo?.emailId || "easwaran.perumal@elevancehealth.com",
      timestamp: currentTimestamp,
      timezone: "America/New_York"
    };

    try {
      await axios.post("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/user/to/agent/servicenow", payload, {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("💥 Live agent message failed:", error.response?.data || error.message);
      // optional: track error in analytics or monitoring
    }
    postResponse(domainid, input, "", 0, uuidv4(),"agent");
    setMessages(prev => [...prev, { sender: "user", text: input,time: new Date().toISOString()  }]);
    setInput("");
  };

const INACTIVITY_LIMIT = 19 * 60 * 1000; // 19 minutes in ms
let inactivityTimer =null;

const renderLiveAgentMessage = (text, isFirst, agentName) => (

  <div style={{
    backgroundColor: "#f4f7fc",
    padding: "10px 14px",
    borderLeft: "4px solid #1a366f",
    borderRadius: "6px",
    color: "#212121",
    fontFamily: "Elevance Sans",
    fontSize: "16px",
    lineHeight: "1.5",
    marginBottom: "10px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
  }}>
    {isFirst && agentName &&  (
      <div style={{
        color: "#1a366f",
        fontWeight: "600",
        fontSize: "15px",
        marginBottom: "6px"
      }}>
            {agentName}
      </div>
    )}
    {text}
  </div>
);


/*const connectWebSocket = (id) => {
  // const socket = new WebSocket(`ws://localhost:6789/ws/${id}`);
  const socket = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${id}`);

  //  {
  //   rejectUnauthorized: false // ✅ disables SSL verification
  // });

  const resetInactivityTimer = () => {
    if (!liveAgent || chatEnded) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("🕒 WebSocket idle for 19 minutes. Ending session...");
      postResponse(domainid, "None", "[SYSTEM] Live agent chat ended due to inactivity.", 0,uuidv4(),"agent");
      terminateSession("Live agent chat ended due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
    resetInactivityTimer();
  };

  socket.onmessage = (event) => {
    try {
      console.log("📩 Raw message received:", event.data);
      const msg = JSON.parse(event.data);
      const text = msg?.text?.toLowerCase() || "";
      console.log("📩 text:", msg.text);
      console.log("👤 agent name:", msg.agentName);
      console.log('lowercase text:',text)

      resetInactivityTimer();


      if (text.includes("[system]")) {
        console.log("🔚 System message");
        return;
      }
      else  if (text.includes("your chat with the live agent has ended")) {
        console.log("🔚 Detected live agent chat closure");
        postResponse(domainid, "None", "[SYSTEM] Disconnected from the live agent.", 0,uuidv4(),"agent");
        terminateSession("Disconnected from the live agent.");

      } else if (text.includes("there are no agents available at the moment")) {
        console.log("🔚 No agents available");

        postResponse(domainid, "None", "[SYSTEM] No agents available. Ending session.", 0, uuidv4(), "agent");
        terminateSession("Disconnected. No agents are available at the moment. Please try again later.");
      }
      else {
        console.log("🔚 chat message print");
        postResponse(domainid, "", msg.text, 0, uuidv4(),"agent");
        setMessages(prev => {
          const isFirstLiveMessage = !prev.some(m => m.sender === "live_agent");
          return [
            ...prev,
            {
              sender: "live_agent",
              text: renderLiveAgentMessage(msg.text, isFirstLiveMessage, msg.agentName)
            }
          ];
        });
      }
    } catch (err) {
      console.error("🚨 Failed to parse WebSocket message:", err);
      postResponse(domainid, "None", "[SYSTEM] Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.", 0,uuidv4(),"agent");
      terminateSession("Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.");
    }
  };
  socket.onclose = () => {
    console.log("🔌 WebSocket closed");
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
    socketRef.current = null;
  };

  socket.onerror = (e) => console.error("❌ WebSocket error", e);

  socketRef.current = socket;
  return socket;

};
  */

/*const connectWebSocket = (id) => {
  //const socket = new WebSocket(`wss://workforceagent-liveagent.nginx.plat-dig-sharedservdigital2.awsdns.internal.das/ws/${id}`);
const socket = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${id}`);
  const resetInactivityTimer = () => {
    if (!liveAgent || chatEnded) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("🕒 WebSocket idle for 19 minutes. Ending session...");
      postResponse(domainid, "None", "[SYSTEM] Live agent chat ended due to inactivity.", 0, uuidv4(), "agent");
      terminateSession("Live agent chat ended due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
    resetInactivityTimer();
  };

  socket.onmessage = (event) => {
    try {
            console.log("📩 Raw message received event data:", event.data);
      const msg = JSON.parse(event.data);
      console.log("📩 Raw message received json msg:", msg);

      const systemText = msg?.message?.text || "";
      const body = msg?.body || [];
      const completed = msg?.completed === true;

      resetInactivityTimer();

      // Terminate if completed
      if (completed) {
        console.log("🔚 Session marked as completed");
        postResponse(domainid, "None", "[SYSTEM] Live agent session ended.", 0, uuidv4(), "agent");
        terminateSession("Live agent session ended.");
        return;
      }

      // Extract meaningful body message
      const outputText = body.find(b => b.uiType === "OutputText" && b.value);
      const text = outputText?.value?.trim().toLowerCase() || "";

      // Handle known system messages
      if (text.includes("no agents available")) {
        console.log("🔚 No agents available");
        postResponse(domainid, "None", "[SYSTEM] No agents available. Ending session.", 0, uuidv4(), "agent");
        terminateSession("Disconnected. No agents are available at the moment. Please try again later.");
        return;
      }

      if (text.includes("please try again later")) {
        console.log("🔚 Retry message");
        postResponse(domainid, "None", `[SYSTEM] ${outputText.value}`, 0, uuidv4(), "agent");
        terminateSession("Live agent unavailable. Please try again later.");
        return;
      }

      // Determine if this is the first live agent message
      const isFirstLiveMessage = !messages.some(m => m.sender === "live_agent");

      // If valid agent message
      if (outputText) {
        postResponse(domainid, "", outputText.value, 0, uuidv4(), "agent");
        setMessages(prev => [
          ...prev,
          {
            sender: "live_agent",
            text: renderLiveAgentMessage(outputText.value, isFirstLiveMessage),
          }
        ]);
      } else {
        console.log("ℹ️ No actionable message in body");
      }

    } catch (err) {
      console.error("🚨 Failed to parse WebSocket message:", err);
      postResponse(domainid, "None", "[SYSTEM] Technical issue. Please try again later.", 0, uuidv4(), "agent");
      terminateSession("Live agent session disconnected due to a technical issue.");
    }
  };

  socket.onclose = () => {
    console.log("🔌 WebSocket closed");
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
    socketRef.current = null;
  };

  //socket.onerror = (e) => console.error("❌ WebSocket error", e);
socket.onerror = (e) => {
  console.error("❌ WebSocket error", e);

  // Show technical error message to user
  postResponse(domainid, "None", "[SYSTEM] A technical issue occurred. Please try reconnecting.", 0, uuidv4(), "agent");

  // Terminate session gracefully
  terminateSession("Live agent session disconnected due to a technical issue.Please try after some time.");
};

  socketRef.current = socket;
  return socket;
};
*/



/*const connectWebSocket = (id) => {
  const socket = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${id}`);

  const resetInactivityTimer = () => {
    if (!liveAgent || chatEnded) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("🕒 WebSocket idle for 19 minutes. Ending session...");
      postResponse(domainid, "None", "[SYSTEM] Live agent chat ended due to inactivity.", 0, uuidv4(), "agent");
      terminateSession("Live agent chat ended due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
    resetInactivityTimer();
  };

  socket.onmessage = (event) => {
    try {
      console.log("📩 Raw message received event data:", event.data);
      const msg = JSON.parse(event.data);
      console.log("📩 Raw message received json msg:", msg);

      const systemText = msg?.message?.text || "";
      const body = msg?.body || [];
      const completed = msg?.completed === true;

      resetInactivityTimer();

      if (completed) {
        console.log("🔚 Session marked as completed");
        postResponse(domainid, "None", "[SYSTEM] Live agent session ended.", 0, uuidv4(), "agent");
        terminateSession("Live agent session ended.");
        return;
      }

      // 🔍 Extract wait time message
      const waitTimeMsg = body.find(
        b => b.uiType === "ActionMsg" &&
             b.actionType === "StartSpinner" &&
             b.spinnerType === "wait_time" &&
             b.waitTime
      );

      if (waitTimeMsg) {
        console.log(`⏳ Estimated wait time: ${waitTimeMsg.waitTime}`);
        setMessages(prev => [
          ...prev,
          {
            sender: "system",
            text: `Connecting to a live agent. Estimated wait time: ${waitTimeMsg.waitTime}`
          }
        ]);
      }

      // 🔍 Extract agent message
      const outputText = body.find(b => b.uiType === "OutputText" && b.value);
      const agentInfo = outputText?.agentInfo;
      const isAgentMessage = agentInfo?.sentFromAgent === true;
      const agentName = agentInfo?.agentName || null;

      const text = outputText?.value?.trim().toLowerCase() || "";

      // Handle known system messages
      if (text.includes("no agents available")) {
        console.log("🔚 No agents available");
        postResponse(domainid, "None", "[SYSTEM] No agents available. Ending session.", 0, uuidv4(), "agent");
        // terminateSession("Disconnected. No agents are available at the moment. Please try again later.");
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
              No agents are available at the moment. Please try again later.
              </div>
            )
          }
        ]);

        return;
      }

      if (text.includes("please try again later")) {
        console.log("🔚 Retry message");
        postResponse(domainid, "None", `[SYSTEM] ${outputText.value}`, 0, uuidv4(), "agent");
        // terminateSession("Live agent unavailable. Please try again later.");
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
              No agents are available at the moment. Please try again later.
              </div>
            )
          }
        ]);
        return;
      }

      // ✅ Mark first live agent message only if agentName is present
      const isFirstLiveMessage = agentName && !messages.some(m => m.sender === "live_agent");

      if (outputText) {
        const displayText = agentName ? `${agentName}: ${outputText.value}` : outputText.value;

        postResponse(domainid, "", displayText, 0, uuidv4(), "agent");

        setMessages(prev => [
          ...prev,
          {
            sender: "live_agent",
            text: renderLiveAgentMessage(displayText, isFirstLiveMessage),
          }
        ]);
      } else {
        console.log(" No actionable message in body");
      }

    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
      postResponse(domainid, "None", "[SYSTEM] Technical issue. Please try again later.", 0, uuidv4(), "agent");
      terminateSession("Live agent session disconnected due to a technical issue.");
    }
  };

  socket.onclose = () => {
    console.log("🔌 WebSocket closed");
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
    socketRef.current = null;
  };

  socket.onerror = (e) => {
    console.error("❌ WebSocket error", e);
    postResponse(domainid, "None", "[SYSTEM] A technical issue occurred. Please try after some time.", 0, uuidv4(), "agent");
    terminateSession("Live agent session disconnected due to a technical issue. Please try after some time.");
  };

  socketRef.current = socket;
};
*/


const connectWebSocket = (id) => {
  const socket = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${id}`);

  const resetInactivityTimer = () => {
    if (!liveAgent || chatEnded) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("🕒 WebSocket idle for 19 minutes. Ending session...");
      postResponse(domainid, "None", "[SYSTEM] Live agent chat ended due to inactivity.", 0, uuidv4(), "agent");
      terminateSession("Live agent chat ended due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
    resetInactivityTimer();
  };

  socket.onmessage = (event) => {
    try {
      console.log("📩 Raw message received event data:", event.data);
      const msg = JSON.parse(event.data);
      console.log("📩 Raw message received json msg:", msg);

      const systemText = msg?.message?.text || "";
      const body = msg?.body || [];
      const completed = msg?.completed === true;

      resetInactivityTimer();

      if (completed) {
        console.log("🔚 Session marked as completed");
        postResponse(domainid, "None", "[SYSTEM] Live agent session ended.", 0, uuidv4(), "agent");
        terminateSession("Live agent session ended.");
        return;
      }

      // 🔍 Extract wait time message
      const waitTimeMsg = body.find(
        b => b.uiType === "ActionMsg" &&
             b.actionType === "StartSpinner" &&
             b.spinnerType === "wait_time" &&
             b.waitTime
      );

      if (waitTimeMsg) {
        console.log(`⏳ Estimated wait time: ${waitTimeMsg.waitTime}`);
        postResponse(domainid, "None",`Connecting to a live agent. Estimated wait time: ${waitTimeMsg.waitTime}`, 0, uuidv4(), "agent");
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
              Connecting to a live agent. Estimated wait time: {waitTimeMsg.waitTime}
              </div>
            )
          }
        ]);

      }

      // 🔍 Extract agent message
      const outputText = body.find(b => b.uiType === "OutputText" && b.value);
      const agentInfo = outputText?.agentInfo;
      const isAgentMessage = agentInfo?.sentFromAgent === true;
      const agentName = agentInfo?.agentName || null;


      const text = outputText?.value?.trim().toLowerCase() || "";

      // Handle known system messages
      if (text.includes("no agents available")) {
        console.log("🔚 No agents available");
        postResponse(domainid, "None", "[SYSTEM] No agents available. Ending session.", 0, uuidv4(), "agent");
        // terminateSession("Disconnected. No agents are available at the moment. Please try again later.");
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
              No agents are available at the moment. Please try again later.
              </div>
            )
          }
        ]);

        return;
      }

      if (text.includes("please try again later")) {
        console.log("🔚 Retry message");
        postResponse(domainid, "None", `[SYSTEM] ${outputText.value}`, 0, uuidv4(), "agent");
        // terminateSession("Live agent unavailable. Please try again later.");
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
              No agents are available at the moment. Please try again later.
              </div>
            )
          }
        ]);
        return;
      }
      // ✅ Mark first live agent message only if agentName is present

      let isFirstLiveMessage = false;

      if (agentName && !firstLiveAgentMessageShown.current) {
        isFirstLiveMessage = true;
        firstLiveAgentMessageShown.current = true;
        setAgentName(agentName); // Store for header
      }

      if (outputText) {
        const displayText = agentName ? outputText.value : `[SYSTEM] ${outputText.value}`;

        postResponse(domainid, "", displayText, 0, uuidv4(), "agent");

        if (agentName) {
          postResponse(domainid, "", `${agentName}: ${outputText.value}`, 0, uuidv4(), "agent");
          setMessages(prev => [
            ...prev,
            {
              sender: "live_agent",
              text: renderLiveAgentMessage(outputText.value,isFirstLiveMessage, agentName),
            }
          ]);
        } else {
          // Fallback to system-style message
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
                  {outputText.value}
                </div>
              )
            }
          ]);
        }
      } else {
        console.log(" No actionable message in body");
      }

    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
      postResponse(domainid, "None", "[SYSTEM] Technical issue. Please try again later.", 0, uuidv4(), "agent");
      terminateSession("Live agent session disconnected due to a technical issue.");
    }
  };

  socket.onclose = () => {
    console.log("🔌 WebSocket closed");
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
    socketRef.current = null;
  };

  socket.onerror = (e) => {
    console.error("❌ WebSocket error", e);
    postResponse(domainid, "None", "[SYSTEM] A technical issue occurred. Please try after some time.", 0, uuidv4(), "agent");
    terminateSession("Live agent session disconnected due to a technical issue. Please try after some time.");
  };

  socketRef.current = socket;
  return socket;
};



const {
  requestId,
  liveAgent,
  chatEnded,
  startSession,
  endSession,
  terminateSession,
  socketRef
} = useAgentSession(connectWebSocket,setMessages,domainid);




useEffect(() => {
  return () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    clearTimeout(inactivityTimer);
  };
}, []);

  const confirmEndChat = () => {
    setShowConfirm(true);
    setIsInputDisabled(true); // lock input while confirming
  };

  const cancelEndChat = () => {
    setShowConfirm(false);
    setIsInputDisabled(false); // allow typing again
  };

  const endChat = async () => {
    setShowConfirm(false);        // Hide End Chat confirmation
    setIsInputDisabled(false);    // Allow bot chat to resume
    postResponse(domainid, "None", "[SYSTEM] You have ended the conversation.", 0,uuidv4(),"agent");
    await terminateSession("You have ended the conversation.");
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }


  };

  const handleFeedbackInputChange = (e) => {
    const value = e.target.value;
    setFeedbackInput(value);

    // ✅ Only reset feedback state if user starts typing again
    if (isSaveFeedbackClicked && value.trim() !== '') {
      setIsSaveFeedbackClicked(false);
    }
  };

  const handleFeedbackKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (feedbackInput.trim() !== '') {
        saveFeebackMessage(); // ✅ Only submit if there's actual content
      }
    }
  };

  let datenow = new Date();

  function generateDatabaseDateTime(date) {
    return date.toISOString().replace("T"," ").substring(0, 19);
  }

  const postResponse = async (domain_id, question_text, response_text, feedback_score, chat_id, chat_type="bot") => {
    try {
      let sessionid = localStorage.getItem('sessionid');
      if (!sessionid) {
               sessionid = generateSessionId();
          setSessionid(sessionid);
      };
      const response = await axios.post('https://associatebot.slvr-dig-empmgt.awsdns.internal.das/chathistory', {
        domain_id: domain_id,
        session_id: sessionid,
        question_text: question_text,
        response_text: response_text,
        feedback_score: feedback_score,
        chat_id: chat_id,
        chat_type:chat_type
      });
      console.log('Response:', response.data);
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const hasScrolledInitially = useRef(false);

  useLayoutEffect(() => {
    if (!hasScrolledInitially.current && Array.isArray(messages) && messages.length > 0) {
      const scrollToBottom = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      };
      // Pass 1
      scrollToBottom();
      // Pass 2 after next layout frame
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom();
          hasScrolledInitially.current = true;
        }, 0);
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!hasScrolledInitially.current) {
      const observer = new ResizeObserver(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });

      if (chatContainerRef.current) observer.observe(chatContainerRef.current);
      return () => observer.disconnect();
    }
  }, []);



    useEffect(() => {
      const container = chatContainerRef.current;
      if (!container) return;


      const handleScroll = () => {
        if (
          container.scrollTop === 0 &&
          !isFetchingRef.current &&
          hasMoreMessagesRef.current
        ) {
          isFetchingRef.current = true;

          const prevScrollHeight = container.scrollHeight;

          fetchChatHistory(domainid, nextOffsetRef.current, 2).then((newMessages) => {
            isFetchingRef.current = false;

            // ✅ Always increment offset by limit
            nextOffsetRef.current += 2;

            if (Array.isArray(newMessages) && newMessages.length > 0) {
              requestAnimationFrame(() => {
                const newScrollHeight = container.scrollHeight;
                const diff = newScrollHeight - prevScrollHeight;
                container.scrollTop = diff;
              });
            } else {
              // ✅ No more messages — stop further fetching
              hasMoreMessagesRef.current = false;
              console.log("Reached end of chat history.");
            }
          });
        }
      };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, [domainid]);

  const fetchLatestChatHistory = async (domainId) => {
    let messageHandled=false;
    try {
      const token = await getToken(domainId);
      const response = await fetch('https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/latest_chathistory', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          domainid: domainId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch history');

      const { chats } = await response.json();
      console.log('chat loaded:', chats);


      if (!chats || chats.length === 0) {
        console.log('No messages found, calling fallback...');
        hasInitialLoadRef.current = true;
        await fetchChatHistory(domainId, 0, 2);
        nextOffsetRef.current = 2;
        return [];
      }


      let groupNameSelected = null;

      const newMessages = chats.flatMap((msg) => {
        const messages = [];
        msg.response_text = msg.response_text?.replace(/\|/g, ',') || '';

        // ✅ Add question only if not empty or "None"
        if (
          msg.question_text &&
          msg.question_text.trim() !== '' &&
          msg.question_text.trim() !== 'None'
        ) {
                const utcTime = DateTime.fromFormat(msg.INSERT_TS, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
          messages.push({
            chat_id: `${msg.chat_id}`,
            session_id: msg.session_id,
            sender: 'user',
            text: msg.question_text,
            completed: true,
            feedback_score: null,
            time: utcTime.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss'),
          });
        }

        // ✅ Handle group selection parsing
        const groupMatch = msg.response_text.match(/\[SYSTEM\]\s*User selected agent name\s*\[(.*?)\]/);
        if (groupMatch && groupMatch[1]) {
          groupNameSelected = groupMatch[1].trim();
          console.log('groupNameSelected',groupNameSelected)
        }
        console.log(msg.response_text)
        console.log(groupMatch)

        // ✅ Handle Choose Live Agent System message
        if (msg.response_text.includes('[SYSTEM] User selected agent name')) {
          messageHandled=true;
          messages.push({
            sender: 'system',
            text: (
                <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: '12px',
                  }}
                >
                  {[
 { label: 'Manager coaching and coaching for corrective action', value: 'AgenticHRAdvisor' },
  { label: 'Other HR support', value: 'AgenticContactCenter' },
  { label: 'ServiceNow ticket catalog', value: 'HR Service Request' },
  { label: 'Continue chatting', value: 'Continue chatting' },
                  ]
.map(({ label, value }, idx) => {

  const selected =
    groupNameSelected && groupNameSelected.trim().toLowerCase() === value.toLowerCase();
  return (
    <button
      key={idx}
      style={{
        padding: '8px 16px',
        margin: '6px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        backgroundColor: selected ? '#d0e1ff' : '#fff',
        color: '#1a3673',
        cursor: 'default',
        fontWeight: selected ? '600' : '500',
        fontFamily: 'Elevance Sans, sans-serif',
        boxShadow: selected ? 'inset 0 0 0 1px #a0c4ff' : 'none',
        opacity: 0.6,
      }}
      disabled
    >
      {label}
    </button>
  );
})}
                </div>
              </div>
            ),
          });
          return messages;
        }

        // ✅ Handle disconnection system messages
        const disconnectReasons = [
          '[SYSTEM] Disconnected from the live agent.',
          '[SYSTEM] Disconnected from the live agent due to inactivity.',
          '[SYSTEM] You have ended the conversation.',
          '[SYSTEM] Live agent chat ended due to inactivity.',
          '[SYSTEM] Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.',
        ];
        const disconnectMatch = disconnectReasons.find((reason) =>
          msg.response_text.includes(reason)
        );

        /*if (disconnectMatch) {
          messageHandled=true;
          const sanitizedText = disconnectMatch.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
            /*text: (
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
                    {sanitizedText} You can continue chatting with the bot.
              </div>
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
                {sanitizedText} You can continue chatting with the bot.
              </div>
            ),
          });
          return messages;
        }  */

        if (disconnectMatch) {
          messageHandled=true;
          const sanitizedText = disconnectMatch.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
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
                {sanitizedText} You can continue chatting with the bot.
              </div>
            ),
          });
          return messages;
        }


        const styledSystemMessages = [
          "[SYSTEM] You're being transferred to a live agent.",
          "[SYSTEM] Connecting to a live agent, please hold…",
          "[SYSTEM] You're continuing with the Chat. Let's keep going.",
          "Live agent session ended.",
          "No agents available. Ending session.",
          "Connecting to a live agent. Estimated wait time",
          "Please stand by while I connect you to a live agent",
          "You have ended the conversation."
        ];

        const matchedSystemMessage = styledSystemMessages.find((text) =>
          msg.response_text.includes(text)
        );

        if (matchedSystemMessage) {
          messageHandled=true;
          const sanitizedText = matchedSystemMessage.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
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
                {sanitizedText}
              </div>
            ),
          });
          return messages;
        }


        // ✅ Add valid response_text, even if question skipped
        if (!messageHandled && msg.response_text && msg.response_text.trim() !== '') {
          const sanitizedText = msg.response_text.replace('[SYSTEM]', '').trim();
          const utcTime = DateTime.fromFormat(msg.INSERT_TS, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
                messages.push({
            chat_id: `${msg.chat_id}`,
            session_id: msg.session_id,
            sender: msg.chat_type === 'bot' ? 'bot' : 'agent',
            text: sanitizedText,
            completed: true,
            feedback_score: msg.feedback_score,
            time: utcTime.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss'),
          });
        }

        return messages;
      });

      // ✅ Push to state
      setMessages((prev) => [...newMessages, ...prev]);

      // ✅ Handle feedback score mapping
      setFeedback((prev) => {
        const updated = { ...prev };
        newMessages.forEach((msg) => {
          const isResponse = msg.sender === 'bot' || msg.sender === 'agent';
          if (isResponse && msg.chat_id) {
            const score = String(msg.feedback_score);
            updated[msg.chat_id] =
            score === '1'
                ? 'like'
                : score === '-1'
                ? 'dislike'
                : null;
          }
        });
        return updated;
      });

      console.log('New Messages:', newMessages);
      return newMessages;
    } catch (error) {
      console.error('Chat history error:', error);
      return [];
    }
  };


  const fetchChatHistory = async (domainId, offset = 0, limit = 2) => {
    let messageHandled = false;
    try {
      const token = await getToken(domainId);
      const response = await fetch(`https://associatebot.slvr-dig-empmgt.awsdns.internal.das/chathistory?offset=${offset}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          domainid: domainId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch history');

      const { chats } = await response.json();
      console.log('chat loaded:', chats);

      let groupNameSelected = null;

      const newMessages = chats.flatMap((msg) => {
        const messages = [];
        msg.response_text = msg.response_text?.replace(/\|/g, ',') || '';
        // ✅ Add question only if not empty or "None"
        if (
          msg.question_text &&
          msg.question_text.trim() !== '' &&
          msg.question_text.trim() !== 'None'
        ) {
                const utcTime = DateTime.fromFormat(msg.INSERT_TS, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
          messages.push({
            chat_id: `${msg.chat_id}`,
            session_id: msg.session_id,
            sender: 'user',
            text: msg.question_text,
            completed: true,
            feedback_score: null,
            time: utcTime.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss'),
          });
        }

        // ✅ Handle group selection parsing
        const groupMatch = msg.response_text.match(/\[SYSTEM\] User selected agent name \[(.*?)\]/);
        if (groupMatch) groupNameSelected = groupMatch[1];

        // ✅ Handle Choose Live Agent System message
        if (msg.response_text.includes('[SYSTEM] User selected agent name')) {
          messageHandled=true;
          messages.push({
            sender: 'system',
            text: (
                    <div style={{
                backgroundColor: "#f9fbfc",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                color: "#1a366f",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                  If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on<strong>"Manager coaching and coaching for corrective action"</strong>.<br /><br />
                  If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.<br /><br />
                  If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: '12px',
                  }}
                >
                  {[
                 { label: 'Manager coaching and coaching for corrective action', value: 'AgenticHRAdvisor' },
  { label: 'Other HR support', value: 'AgenticContactCenter' },
  { label: 'ServiceNow ticket catalog', value: 'HR Service Request' },
  { label: 'Continue chatting', value: 'Continue chatting' },
                  ].map(({ label, value }, idx) => {

                  const selected = value === groupNameSelected;
                  return (
                    <button
                      key={idx}
                      style={{
                        padding: '8px 16px',
                        margin: '6px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        backgroundColor: selected ? '#d0e1ff' : '#fff',
                        color: '#1a3673',
                        cursor: 'default',
                        fontWeight: selected ? '600' : '500',
                        fontFamily: 'Elevance Sans, sans-serif',
                        boxShadow: selected ? 'inset 0 0 0 1px #a0c4ff' : 'none',
                        opacity: 0.6,
                      }}
                      disabled
                    >
                      {label}
                    </button>
                  );
                })}
                </div>
              </div>
            ),
          });
          return messages;
        }

        // ✅ Handle disconnection system messages
        const disconnectReasons = [
          '[SYSTEM] Disconnected from the live agent.',
          '[SYSTEM] Disconnected from the live agent due to inactivity.',
          '[SYSTEM] You have ended the conversation.',
          '[SYSTEM] Live agent chat ended due to inactivity.',
          '[SYSTEM] Apologies—your live agent session was disconnected due to a technical issue. Kindly try again later.',
        ];
        const disconnectMatch = disconnectReasons.find((reason) =>
          msg.response_text.includes(reason)
        );

        /*if (disconnectMatch) {
          messageHandled=true;
          const sanitizedText = disconnectMatch.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
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
                    {sanitizedText} You can continue chatting with the bot.
              </div>
            ),
          });
          return messages;
        }
        */
           if (disconnectMatch) {
          messageHandled=true;
          const sanitizedText = disconnectMatch.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
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
                {sanitizedText} You can continue chatting with the bot.
              </div>
            ),
          });
          return messages;
        }

        const styledSystemMessages = [
          "[SYSTEM] You're being transferred to a live agent.",
          "[SYSTEM] Connecting to a live agent, please hold…",
          "[SYSTEM] You're continuing with the Chat. Let's keep going.",
          "Live agent session ended.",
          "No agents available. Ending session.",
          "Connecting to a live agent. Estimated wait time",
          "Please stand by while I connect you to a live agent"
        ];

        const matchedSystemMessage = styledSystemMessages.find((text) =>
          msg.response_text.includes(text)
        );

        if (matchedSystemMessage) {
          messageHandled=true;
          const sanitizedText = matchedSystemMessage.replace('[SYSTEM]', '').trim();
          messages.push({
            sender: 'system',
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
                {sanitizedText}
              </div>
            ),
          });
          return messages;
        }

        // ✅ Add valid response_text, even if question skipped
        if (!messageHandled && msg.response_text && msg.response_text.trim() !== '') {
          const sanitizedText = msg.response_text.replace('[SYSTEM]', '').trim();
          const utcTime = DateTime.fromFormat(msg.INSERT_TS, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
                messages.push({
            chat_id: `${msg.chat_id}`,
            session_id: msg.session_id,
            sender: msg.chat_type || 'agent',
            text: sanitizedText,
            completed: true,
            feedback_score: msg.feedback_score,
            time: utcTime.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss'),
          });
        }

        return messages;
      });

      // ✅ Push to state
      setMessages((prev) => [...newMessages, ...prev]);

      // ✅ Handle feedback score mapping
      setFeedback((prev) => {
        const updated = { ...prev };
        newMessages.forEach((msg) => {
          const isResponse = msg.sender === 'bot' || msg.sender === 'agent';
          if (isResponse && msg.chat_id) {
            const score = String(msg.feedback_score);
            updated[msg.chat_id] =
            score === '1'
                ? 'like'
                : score === '-1'
                ? 'dislike'
                : null;
          }
        });
        return updated;
      });

      console.log('New Messages:', newMessages);
      return newMessages;
    } catch (error) {
      console.error('Chat history error:', error);
      return [];
    }
  };

  const sendDomainid = async (overrideDomainid) => {
    /*if (inputValue.trim() === '') {
      console.log("Domain ID is empty.");
      return '';
    }

    // ✅ Store and sync domain ID
    localStorage.setItem('domainid', inputValue);
    setDomainid(inputValue); // Optional: updates React state
    setInputValue(inputValue); // Optional: reflects value in input field
    // await fetchChatHistory(inputValue);
  */

  const domainToUse = overrideDomainid || inputValue;
 console.log("send domain id to use:",domainToUse)
          if (!domainToUse.trim()) return;

  localStorage.setItem('domainid', domainToUse);
  setDomainid(domainToUse);
  setInputValue(domainToUse);


    setLoading(true);
    try {
      await fetchLatestChatHistory(domainToUse); // handles fallback too
    } catch (error) {
      console.error('Error during initial load:', error);
    } finally {
      setLoading(false);
    }
    setInput(''); // Clears any auxiliary input
    setLoading(true);

    try {
      // ✅ Use inputValue directly for token and request
      const token = await getToken(domainToUse);

      const response = await fetch('https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          domainid: domainToUse
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setHasWelcomed(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialMessage += decoder.decode(value, { stream: true });
        setLoading(false);

        setMessages(prevMessages => {
          const updated = [...prevMessages];
          const botMessage = updated.find(msg => msg.sender === 'bot' && !msg.completed);

          if (botMessage) {
            botMessage.text = partialMessage;
          } else {
            updated.push({ text: partialMessage, sender: 'bot', completed: false,hasContent: false  });
          }

          return updated;
        });
      }

      // ✅ Mark final bot message as completed
      setMessages(prevMessages => {
        const updated = [...prevMessages];
        const botMessage = updated.find(msg => msg.sender === 'bot' && !msg.completed);

        if (botMessage) {
          botMessage.completed = false;
          botMessage.hasContent = false;
        }

        return updated;
      });

      // logMetaData(input, partialMessage, false);

    } catch (error) {
      console.error("Error fetching the data:", error);
      setMessages(prev => [...prev, { text: "Unable to fetch data, Please try again.", sender: 'bot' }]);
    } finally {
      setLoading(false);
    }

    return inputValue; // ✅ Return the actual domain ID used
  };

const textWithBreaks = (msg) => {

  const formattedTex = msg
  .replace(/\*\*(.+?)\*\*/g, (_, boldText) => `<b>${boldText.trim()}</b>`)  // Handle bold formatting robustly
  .replace(/["]+/g, '')                             // Remove all single/double quotes
  .replace(/- \*\*/g, '• **')                        // Convert markdown-style list items
  .replace(/\\n/g, '<br />')                         // Literal \n to <br>
  .replace(/ {3}- /g, '   • ')                       // Indented dashes to bullets
  .replace(/\nid:.*?\n\n/g, '')                      // Remove block IDs prefixed with newline
  .replace(/id:.*?\n\n/g, '')                        // Remove standalone ID blocks
  //.replace(/\s*id:\s*\w+\s*,?/gi, '')                // ✅ NEW: Remove inline id: blocks
  .replace(/data:\s*/gi, '')                         // Remove all "data:" prefixes (case-insensitive)
  .replace(/\n{3,}/g, '\n\n')                        // if there are 3 or more consecutive newlines reduce to 2 new lines
  .replace(/\*\*([^\*]+?)\*\*/gs, (_, boldText) => `<b>${boldText.trim()}</b>`)

  .replace(/<a/gi, '<a target="_blank"');
  const formattedTexQuote = formattedTex.replace("'", "&apos;");

  return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
};

const textWithBreaksFeedback = (msg) => {
  const formattedTex = msg.replace(/['"]+/g, '').replace(/- \*\*/g,'• **').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\\n/g, '<br />').replace(/   - /g,'   • ').replace(/<a/g, '<a target="_blank"');
  const formattedTexQuote = formattedTex.replace("'", "&apos;");

  return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
};

const textWithBreaksNotification = (msg) => {
  const formattedTex = msg.replace(/['"]+/g, '').replace(/- \*\*/g,'• **').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\\n/g, '<br />').replace(/   - /g,'   • ').replace(/<a/g, '<a target="_blank"');
  const formattedTexQuote = formattedTex.replace("'", "&apos;");


  return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
};



 window.localStorage.setItem("bg", "")


  function getTimeStamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }


  const handleSend = async () => {
    if (!input.trim()) return;

    // const id = chatId ||`REQ-${uuidv4()}`;

    const id = requestId;

    const payload = {
      ...userInfo,
      requestId: id,
      message: { text: input, typed: true },
      timestamp: Date.now(),
      botToBot: true,
      silentMessage: false,
    };

    // 🔄 Choose endpoint based on liveAgent flag
    const endpoint = liveAgent
      ? "https://associatebot.slvr-dig-empmgt.awsdns.internal.das/user/to/agent/servicenow"
      : "https://associatebot.slvr-dig-empmgt.awsdns.internal.das/workforceagent/chat";

    await axios.post(endpoint, payload);
    setMessages((prev) => [...prev, { from: "user", text: input }]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

function copyToClipboard(content) {
  const container = document.createElement('div');
  container.innerHTML = content;
  container.style.position = 'fixed';
  container.style.pointerEvents = 'none';
  container.style.opacity = 0;
  document.body.appendChild(container);

  window.getSelection().removeAllRanges();
  const range = document.createRange();
  range.selectNode(container);
  window.getSelection().addRange(range);
  document.execCommand('copy');
  document.body.removeChild(container);
}


  const handleCopy = (text,index) => {
    const copyText = text.replace(/['"]+/g, '').replace(/- \*\*/g,'• **').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\\n/g, '<br />').replace(/   - /g,'   • ').replace(/<b>(.*?)<\/b>/g, '$1');

    var id = "content-"+index
    var htmlEditor = document.getElementById(id).innerHTML;
    copyToClipboard(htmlEditor)
    setCopiedIndex(index);

    setTimeout(() => {
      setCopiedIndex(null);
    }, 1500); // Reset after 1.5 seconds

  };

  const handleFeedbackLike = (msg, type) => {
    const chat_id = msg.chat_id;
    const response_text = msg.text;
    const question_msg = messages.find(m => m.chat_id === chat_id && m.sender === 'user');
    const question_text = question_msg?.text || "";

    const domain_id = domainid;
    const feedback_score = 1;

    if (!chat_id) {
      console.warn("❌ Missing chat_id — can't submit feedback");
      return;
    }

    postResponse(domain_id, question_text, response_text, feedback_score, chat_id,"bot");


    setFeedback(prev => ({
      ...prev,
      [chat_id]: prev[chat_id] === type ? null : type
    }));

    setLiked(true);
    setDisliked(false);
  };

  const handleFeedbackDislike = (msg, type) => {
    const chat_id = msg.chat_id;
    const response_text = msg.text;
    const question_msg = messages.find(m => m.chat_id === chat_id && m.sender === 'user');
    const question_text = question_msg?.text || "";

    const domain_id = domainid;
    const feedback_score = -1;

    if (!chat_id) {
      console.warn("❌ Missing chat_id — can't submit feedback");
      return;
    }

    postResponse(domain_id, question_text, response_text, feedback_score, chat_id,"bot");

    setFeedback(prev => ({
      ...prev,
      [chat_id]: prev[chat_id] === type ? null : type
    }));

    setDisliked(true);
    setLiked(false);
  };

  // const sendFeedback = (index) => {
  //   const chatid = messages[index]?.chat_id;
  //   if (!chatid) return;

  //   setIsFeedbackClicked(true);

  //   // Toggle UI boxes
  //   const initialBoxes = document.getElementById('initial-text-boxes');
  //   const alternateBoxes = document.getElementById('alternate-text-boxes');
  //   const initialInputBoxes = document.getElementById('initial-input-boxes');
  //   const alternateInputBoxes = document.getElementById('alternate-input-boxes');

  //   if (initialBoxes.style.display === 'none') {
  //     initialBoxes.style.display = 'flex';
  //     alternateBoxes.style.display = 'none';
  //     initialInputBoxes.style.display = 'flex';
  //     alternateInputBoxes.style.display = 'none';
  //   } else {
  //     initialBoxes.style.display = 'none';
  //     alternateBoxes.style.display = 'flex';
  //     initialInputBoxes.style.display = 'none';
  //     alternateInputBoxes.style.display = 'flex';
  //   }

  //   // ✅ Pass chatid to feedback submission
  //   saveFeebackMessage(chatid);
  // };

  const sendFeedback = async (index) => {
    const chatid = messages[index]?.chat_id;
    console.log('feedback chat id:',chatid)
    if (!chatid) return;
    setActiveChatId(chatid);
    UserName = domainid
    if (index === 0){
    Question = "hello"
    Answer = messages[index].text
    console.log(messages)
    } else {
    Question = messages[index-1].text
    Answer = messages[index].text
    }

    FeedbackQuestion = Question
    FeedbackAnswer = Answer

    const userMessage1 = { text: Question, sender: 'feedbackQuestion',time: getTimeStamp() };
    setFeedbackMessages(prevMessages => [...prevMessages, userMessage1]);

    const userMessage2 = { text: Answer, sender: 'feedbackAnswer',time: getTimeStamp() };
    setFeedbackMessages(prevMessages => [...prevMessages, userMessage2]);



    const initialBoxes = document.getElementById('initial-text-boxes');
    const alternateBoxes = document.getElementById('alternate-text-boxes');
    const initialInputBoxes = document.getElementById('initial-input-boxes');
    const alternateInputBoxes = document.getElementById('alternate-input-boxes');
    console.log(initialBoxes);

    setIsFeedbackClicked(isFeedbackClicked => !isFeedbackClicked);

    if (initialBoxes.style.display === 'none') {
        initialBoxes.style.display = 'flex';
        alternateBoxes.style.display = 'none';

        initialInputBoxes.style.display = 'flex';
        alternateInputBoxes.style.display = 'none';
    } else {
        initialBoxes.style.display = 'none';
        alternateBoxes.style.display = 'flex';

        initialInputBoxes.style.display = 'none';
        alternateInputBoxes.style.display = 'flex';
    }

};





const saveFeebackMessage = async () => {
  if (!feedbackInput.trim()) return;

  // ✅ If no chatid passed, generate one for general feedback
  const finalChatId = activeChatId || uuidv4();

  try {
    await axios.post('https://associatebot.slvr-dig-empmgt.awsdns.internal.das/feedback', {
      chatid: finalChatId,
      domainid,
      Feedback: feedbackInput.trim()
    });

    setIsSaveFeedbackClicked(true);
    setFeedbackInput('');
    setActiveChatId(null); // ✅ Reset after submission
  } catch (error) {
    console.error("Error submitting feedback:", error);
  }
};


  const handleChange = (e) => {
    const value =  e.target.value.trim();
    console.log('value')
    console.log(value)
    setInputValue(value);
    setIsButtonDisabled(value.trim() === '');


    var x = document.getElementById("buttondId");
    console.log(x)


    if (x.style.backgroundColor === "rgb(173, 216, 230)" && value.length != 7) {
      x.style.backgroundColor = "rgb(173, 216, 230)";
    } else {
      x.style.backgroundColor = "rgb(26, 54, 115)";
    }

  };

  const handleClickDiD = () => {
    setIsButtonDisabled(true);

    var x = document.getElementById("buttondId");
    console.log(x)


    if (x.style.backgroundColor === "rgb(26, 54, 115)") {
      x.style.backgroundColor = "rgb(173, 216, 230)";
    } else {
      x.style.backgroundColor = "rgb(26, 54, 115)";
    }
  }

  /*const IdleMonitor = ({ onIdle }) => {
    const idleRef = React.useRef(0);
    const [showTimeoutModal, setShowTimeoutModal] = React.useState(false);

    React.useEffect(() => {
      const idleInterval = setInterval(() => {
        idleRef.current += 1;
        if (idleRef.current > 900) { // 15 minutes
          console.log("🚨 User inactive for 15 minutes");
          setShowTimeoutModal(true);
          clearInterval(idleInterval);
        }
      }, 1000); // Every second

      const resetIdleRef = () => {
        idleRef.current = 0;
      };

      document.body.addEventListener('mousemove', resetIdleRef);
      document.body.addEventListener('keypress', resetIdleRef);

      return () => {
        document.body.removeEventListener('mousemove', resetIdleRef);
        document.body.removeEventListener('keypress', resetIdleRef);
        clearInterval(idleInterval);
      };
    }, []);

    const handleOk = () => {
      setShowTimeoutModal(false);
      if (typeof onIdle === 'function') onIdle();

      // Clear previous session
      localStorage.clear();

      // ✅ Generate new session ID before reload
      const newSessionId = generateSessionId();
      localStorage.setItem('session_id', newSessionId);
      console.log('New session ID after idle timeout:', newSessionId);

      window.location.reload();
    };*/

const IdleMonitor = ({ onIdle }) => {
    const idleTimerRef = useRef(null);
    const idleCounterRef = useRef(0);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);

    useEffect(() => {
      // Start the idle timer
      idleTimerRef.current = setInterval(() => {
        idleCounterRef.current += 1;
        if (idleCounterRef.current > 900) { // 15 minutes
          console.log("🚨 User inactive for 15 minutes");
          setShowTimeoutModal(true);
        }
      }, 1000); // Check every second

      // Reset idle counter on user activity
      const resetIdleCounter = () => {
        idleCounterRef.current = 0;
      };

      const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      activityEvents.forEach(event =>
        document.body.addEventListener(event, resetIdleCounter)
      );

      // Cleanup on unmount
      return () => {
        activityEvents.forEach(event =>
          document.body.removeEventListener(event, resetIdleCounter)
        );
        clearInterval(idleTimerRef.current);
      };
    }, []);

    const handleOk = () => {
      setShowTimeoutModal(false);

      if (typeof onIdle === 'function') {
        onIdle();
      }

      // Clear session and rotate ID
      localStorage.clear();
      const newSessionId = generateSessionId();
      localStorage.setItem('sessionid', newSessionId);
      console.log('New session ID after idle timeout:', newSessionId);

      window.location.reload();
    };

    return (
      <>
        {showTimeoutModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '24px 32px',
              borderRadius: '10px',
              boxShadow: '0 0 12px rgba(0,0,0,0.1)',
              textAlign: 'center',
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
              maxWidth: '360px'
            }}>
              <h3 style={{ marginBottom: '16px' }}>Session Timed Out</h3>
              <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                You've been inactive. To protect your information, your session has expired.
              </p>
              <button
                onClick={handleOk}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#1a3673',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));

  const logout = async () => {
    const domainInStorage = localStorage.getItem('domainid');
    console.log('Domain before logout:', domainInStorage);

    if (count === 0) {
      const partialMessage = 'logged out due to inactivity';
      setMessages(prev => [...prev, { text: partialMessage, sender: 'logout', completed: false }]);
      count += 1;

      setInputValue('');
      setIsButtonDisabled(true);
      localStorage.removeItem('domainid');
      setDomainid('');
      setIsInputDisabled(true);

      const x = document.getElementById('buttondId');
      if (x) {
        const currentColor = x.style.backgroundColor;
        x.style.backgroundColor =
          currentColor === 'rgb(26, 54, 115)' ? 'rgb(173, 216, 230)' : 'rgb(26, 54, 115)';
      }

      console.log('✅ User has been logged out due to inactivity.');

      // 👋 Graceful live agent session termination if active
      if (liveAgent && socketRef.current) {
        postResponse(domainid, "None", "[SYSTEM] Disconnected from the live agent due to inactivity.", 0,uuidv4(),"agent");
        await terminateSession("Disconnected from the live agent due to inactivity.");
      }

    } else if (count === 1 && messages.text !== 'logged out due to inactivity') {
      count = 0;
    } else {
      await delay(1000);
      console.log('Waited 1s');
    }
  };

  function toggleTextBoxes() {

      const initialBoxes = document.getElementById('initial-text-boxes');
      const alternateBoxes = document.getElementById('alternate-text-boxes');
      const initialInputBoxes = document.getElementById('initial-input-boxes');
      const alternateInputBoxes = document.getElementById('alternate-input-boxes');
      const alternateNotificationBoxes = document.getElementById('alternate-notification-boxes');
      console.log(initialBoxes);


      setIsFeedbackClicked(isFeedbackClicked => !isFeedbackClicked);
      //setIsSaveFeedbackClicked(isSaveFeedbackClicked => !isSaveFeedbackClicked);


      if (initialBoxes.style.display === 'none') {
          initialBoxes.style.display = 'flex';
          alternateBoxes.style.display = 'none';

          initialInputBoxes.style.display = 'flex';
          alternateInputBoxes.style.display = 'none';

          alternateNotificationBoxes.style.display = 'none';

          setFeedbackMessages([]);

      } else {
          initialBoxes.style.display = 'none';
          alternateBoxes.style.display = 'flex';

          initialInputBoxes.style.display = 'none';
          alternateInputBoxes.style.display = 'flex';

          setFeedbackMessages([]);

      }

      setFeedbackInput('');
      setIsSaveFeedbackClicked(false);
  }


  const backToChat = async () => {

      const initialBoxes = document.getElementById('initial-text-boxes');
      const alternateBoxes = document.getElementById('alternate-notification-boxes');
      const initialInputBoxes = document.getElementById('initial-input-boxes');
      const alternateInputBoxes = document.getElementById('alternate-input-boxes');

      const alternateTextBoxes = document.getElementById('alternate-text-boxes');

      if (initialBoxes.style.display === 'none') {
          initialBoxes.style.display = 'flex';
          alternateBoxes.style.display = 'none';

          initialInputBoxes.style.display = 'flex';
          alternateInputBoxes.style.display = 'none';

          alternateTextBoxes.style.display = 'none';

      } else {
          initialBoxes.style.display = 'none';
          alternateBoxes.style.display = 'flex';

          initialInputBoxes.style.display = 'none';
          alternateInputBoxes.style.display = 'flex';
      }
      setIsSaveFeedbackClicked(isSaveFeedbackClicked => !isSaveFeedbackClicked);
  }


  function formatTimestamp(ts) {
    const date = new Date(ts);
    const now = new Date();

    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const sameMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const sameYear = date.getFullYear() === now.getFullYear();

    const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (isToday) return `${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    if (daysAgo < 7) {
      return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`; // Mon 1:06 PM
    }
    if (sameMonth || daysAgo < 30) {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`; // Aug 5 1:06 PM
    }
    if (daysAgo < 90) {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`; // Jul 12 1:06 PM
    }

    return `${date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })} ${time}`; // Jun 10 1:06 PM
  }


  // ########################



  return (

<div
  style={{
    height: '100vh',
    width: '100%',
    backgroundColor: '#f2f2f2',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '10px',
    fontFamily: 'Segoe UI, sans-serif',

  }}
>
  {/* 🔵 Header */}
  <div
    style={{
      backgroundColor: '#1a3673',
      color: '#fff',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopLeftRadius: '0px',
      borderTopRightRadius: '0px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <img
        src={require('./main_logo_2.jpg')}
        alt="Company Logo"
        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
      />
      <span style={{ fontSize: '20px', fontWeight: 600 }}>
        {liveAgent && agentName ? `${agentName}` : 'Workforce Agent'}
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center' }}>
  <button
    title="Submit Feedback"
    onClick={toggleTextBoxes}
    style={{
      marginRight: '8px', // smaller spacing than gap
      background: 'none',
      border: 'none',
      color: '#f9fafb',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
  >
    {isFeedbackClicked ? (
      <ChatIcon style={{ fontSize: '22px' }} />
    ) : (
      <CommentMultipleRegular style={{ fontSize: 22 }} />
    )}
  </button>

  <button
    title="About Workforce Agent"
    onClick={toggleBotInfo}
    style={{
      backgroundColor: 'transparent',
      border: 'none',
      color: '#f9fafb',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
  >
    <HelpOutlineIcon style={{ fontSize: '22px' }} />
  </button>
</div>

  </div>

    {/* 💬 Chat Body */}
    {/* Your messages start here */}

{showBotInfo && (
  <Help title="About Workforce Agent" onClose={() => setShowBotInfo(false)}>
    <p>Workforce Agent is your smart HR assistant designed to support:</p>
    <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
      <li>📋 HR Policy Questions</li>
      <li>👥 Workday Worker Information</li>
      <li>🏠 Hybrid Work Arrangements</li>
      <li>💰 Compensation & Benefits</li>
      <li>🕒 Time and Absence Management</li>
      <li>💬 Live Agent Connection</li>
    </ul>
    <p style={{ marginTop: '12px' }}>
      Your conversations are secure, and we're here to provide clear, reliable guidance.
    </p>
  </Help>
)}
{/*<div className={`chat-input-did-${color}`}>
            <input
            type="text"
            value={inputValue}

            onChange={handleChange}

            placeholder="Enter domain id"
            className={`chat-input ${color} text`}
            style={{paddingLeft: '10px'}}
            id="textdId"


            />
            <button disabled={isButtonDisabled} id="buttondId" style={{backgroundColor: "#1a3673"}} onClick={() => { sendDomainid(); handleClickDiD();}}>Enter</button>
          </div>
*/}

{mode === 'admin' && (
  <div className={`chat-input-did-${color}`}>
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder="Enter domain id"
      className={`chat-input ${color} text`}
      style={{ paddingLeft: '10px' }}
      id="textdId"
    />
    <button
      disabled={isButtonDisabled}
      id="buttondId"
      style={{ backgroundColor: "#1a3673" }}
      onClick={() => {
        sendDomainid();
        handleClickDiD();
      }}
    >
      Enter
    </button>
  </div>
)}

      {!minimized && (
        <>
          <div className={`chat-messages-feedback-${color}`} id={"alternate-text-boxes"} style={{display : 'none'}}>

              <div>

                  {feedbackMessages.map((msg, index) => (
                    <React.Fragment key={index}>
                      <div className={`message ${msg.sender}`}>

                        <div className="icon">{msg.sender === 'feedbackAnswer' || msg.sender === 'bot' ? <img id="test-img" src={require('./main_logo_2.jpg')} width={30} height={30} /> : <img id="test-img" src={require('./user-icon.jpg')} width={30} height={30} />}</div>


                        <div className={`bubble-feedback-${color}`}><div id={`content-${index}`}><pre style={{whiteSpace: "pre-wrap",fontFamily: 'Elevance Sans'}}>{textWithBreaksFeedback(msg.text)}</pre></div>

                        </div>

                        <div ref={messagesEndRef} />
                      </div>
                    </React.Fragment>
                  ))}

                  <br/>
              </div>

<div className={`chat-input-${color}`}>

{!isSaveFeedbackClicked ? (
  <textarea
    cols="225"
    rows="15"
    maxLength="2000"
    type="text"
    value={feedbackInput}
    onChange={handleFeedbackInputChange}
    onKeyDown={handleFeedbackKeyDown}
    placeholder="Enter feedback here"
    disabled={loading}
    style={{ paddingLeft: '10px', borderRadius: '5px' }}
  />
) : (
  <div
  style={{
    maxWidth: '600px',
    margin: '60px auto 40px auto', // top, horizontal, bottom spacing
    padding: '24px 32px',
    borderRadius: '12px',
    backgroundColor: '#f9fafc',
    border: '1px solid #dce3ea',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
    color: '#2e2e2e',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    textAlign: 'center',
    fontFamily: 'Segoe UI, Roboto, sans-serif'
  }}
>
  <p style={{ margin: 0 }}>
    Your feedback has been submitted successfully.
    <br />
    Thank you for helping us improve.
  </p>
</div>
)}

</div>

              <div className={`chat-input-feedback-${color}`} style={{float: "right"}}>
              <button
  onClick={() => { saveFeebackMessage(); }}
  disabled={isSaveFeedbackClicked}
  style={{
    float: "right",
    backgroundColor: isSaveFeedbackClicked ? "#cccccc" : "#1a3673",
    color: "#f9fafb",
    cursor: isSaveFeedbackClicked ? "not-allowed" : "pointer",
    borderStyle: "none"
  }}
>
  {isSaveFeedbackClicked ? 'Submitted' : 'Submit Feedback'}
</button>
              <button onClick={() => { toggleTextBoxes();}} style={{float: "left"}}>Back To Chat</button>
              </div>

          </div>

          <div className={`chat-messages-notification-${color}`} id={"alternate-notification-boxes"} style={{display : 'none'}}>

              <div>

                    <pre style={{whiteSpace: "pre-wrap",fontFamily: 'Elevance Sans', width: '100%'}}>{textWithBreaksNotification(notificationMessages)}</pre>

              </div>
              <div className={`chat-input-feedback-${color}`} style={{float: "right"}}>
              <button onClick={() => { backToChat();}} style={{float: "left"}}>Back To Chat</button>
              </div>
          </div>

          <div className={`chat-messages-${color}`} id={"initial-text-boxes"} style={{display : 'flex'}}>

          <div
  ref={chatContainerRef}
  style={{
    //height: '600px',         // 🟨 Set your desired height
    overflowY: 'auto',       // 🟦 Enable vertical scrolling
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#fff'       // Optional: background color
  }}
>

{messages.map((msg, index) => (
  <React.Fragment key={index}>
  {/* Wrapper for timestamp + message row */}
  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>

    {/* ⏱️ Timestamp ABOVE the row */}
    {msg.time && (
  <div
    style={{
      fontSize: '0.75rem',
      color: '#888',
      fontStyle: 'italic',
      opacity: 0.7,
      marginBottom: '4px',
      textAlign: msg.sender === 'user' ? 'right' : 'left',
      paddingLeft: msg.sender === 'user' ? '0' : '44px',
      paddingRight: msg.sender === 'user' ? '44px' : '0'
    }}
  >
    {formatTimestamp(msg.time)}
  </div>
)}

    {/* 👤 Icon + 💬 Bubble in horizontal row */}
    <div
      className={`message ${msg.sender}`}
      data-chatid={msg.chat_id || ""}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}
    >
      {/* Icon */}
      <div className="icon">
        <img
          id="test-img"
          src={
            msg.sender === 'bot' || msg.sender === 'logout'
              ? require('./main_logo_2.jpg')
              : require('./user-icon.jpg')
          }
          width={30}
          height={30}
          alt={msg.sender}
        />
      </div>

      {/* Bubble + Actions */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          className={`bubble-${color}`}
          style={{
            marginBottom: '4px',
            borderRadius: '8px'
          }}
        >
          <div id={`content-${index}`}>
            {typeof msg.text === 'string' ? (
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Elevance Sans',
                  margin: 0
                }}
              >
                {textWithBreaks(msg.text)}
              </pre>
            ) : (
              msg.text
            )}
          </div>
        </div>

        {/* Actions */}
        {(msg.sender === 'bot' || msg.sender === 'agent')  && (msg.hasContent || msg.completed) && (
          <div
            className="actions"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '14px',
              marginTop: '6px',
              paddingRight: '16px',
              paddingLeft: '16px'
            }}
          >
            <button
      title="Like"
      className={`actions-${color}`}
      onClick={() => handleFeedbackLike(msg, 'like')}
      >
      {feedback[msg.chat_id] === 'like' ? (
        <ThumbLikeFilled style={{ fontSize: 22, color: '#0078d4' }} />
      ) : (
        <ThumbLikeRegular
          style={{
            fontSize: 22,
            color: feedback[msg.chat_id] === 'like' ? '#0078d4' : '#333',
            transition: 'color 0.2s ease',
          }}
        />
      )}
    </button>

    <button
      title="Dislike"
      className={`actions-${color}`}
      onClick={() => handleFeedbackDislike(msg, 'dislike')}
    >
      {feedback[msg.chat_id] === 'dislike' ? (
        <ThumbDislikeFilled style={{ fontSize: 22, color: '#555' }} />
      ) : (
        <ThumbDislikeRegular
          style={{
            fontSize: 22,
            color: feedback[msg.chat_id] === 'dislike' ? '#0078d4' : '#333',
            transition: 'color 0.2s ease',
          }}
        />
      )}
    </button>

<button
  title="Copy"
  className={`actions-${color}`}
  onClick={() => handleCopy(msg.text, index)}
>
  {copiedIndex === index ? (
    <CopyFilled style={{ fontSize: 22, color: '#3D5A80' }} />
  ) : (
    <CopyRegular style={{ fontSize: 22 }} />
  )}
</button>

<ToastContainer />
<button
  title="Submit Feedback"
  className={`actions-${color}`}
  onClick={() => sendFeedback(index)}
>
  <CommentMultipleRegular style={{ fontSize: 22 }} />
</button>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* Logout bubble */}
  {msg.sender === 'logout' && <div className={`bubble-${color}`}></div>}
</React.Fragment>
))}

{/* <div ref={messagesEndRef} /> */}
{liveAgent && <div ref={messagesEndRef} />}
</div>
            {loading && <div className="message bot"><img src={require('./loading.gif')}  width={40} height={40} /></div>}
            <div ref={messagesEndRef} />
            <IdleMonitor onIdle={logout} />
          </div>

          <div className={`chat-input-${color}`} id={"alternate-input-boxes"} style={{display : 'none'}}>



          </div>
          {liveAgent && !chatEnded && !showConfirm && !isInputDisabled && (
  <div style={{ textAlign: "center", marginBottom: "8px" }}>
    <button
      onClick={confirmEndChat}
      style={{
        background: "transparent",
        border: "none",
        color: "#1a3673",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: "600",
        textDecoration: "none",
      }}
    >
      End Chat
    </button>
  </div>
)}
{showConfirm && (
  <div style={{ textAlign: "center", marginBottom: "8px" }}>
    <span style={{ marginRight: "12px", fontWeight: "600", color: "#1a3673" }}>
      End Chat?
    </span>
    <button
      onClick={endChat}
      style={{
        background: "transparent",
        border: "none",
        color: "#1a3673",
        cursor: "pointer",
        fontWeight: "bold",
        padding: "4px 12px",
        borderRadius: "4px",
        marginRight: "10px",
        borderBottom: "1px solid #1a3673",
      }}
    >
      Yes
    </button>
    <button
      onClick={cancelEndChat}
      style={{
        background: "transparent",
        border: "none",
        color: "#1a3673",
        cursor: "pointer",
        fontWeight: "bold",
        padding: "4px 12px",
        borderRadius: "4px",
        borderBottom: "1px solid #1a3673",
      }}
    >
      No
    </button>
  </div>
)}

{/* text input area */}
<div
  className={`chat-input-${color}`}
  id="initial-input-boxes"
  style={{
    position: 'relative',
    padding: '10px',
    backgroundColor: '#fff',
    borderTop: '1px solid #ddd',
    boxShadow: '0 -1px 6px rgba(0,0,0,0.05)',
  }}
>
  <textarea
    value={input}
    onChange={handleInputChange}
    onKeyDown={(e) => {
      if (
        e.key === 'Enter' &&
        !isInputDisabled &&
        !loading &&
        !showConfirm
      ) {
        liveAgent ? sendLiveAgentMessage() : sendMessage();
      }
    }}
    placeholder="Type your reply here"
    disabled={isInputDisabled || loading}
    rows="3"
    cols="20"
    onMouseEnter={(e) => {
      e.target.style.borderColor = '#999';
      e.target.style.boxShadow = '0 0 0 2px rgba(26, 54, 115, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.target.style.borderColor = '#ccc';
      e.target.style.boxShadow = 'none';
    }}
    style={{
      width: '100%',
      borderRadius: '6px',
      border: '1px solid #ccc',
      padding: '10px 40px 10px 10px',
      fontSize: '14px',
      resize: 'none',
      outline: 'none',
      cursor: isInputDisabled ? 'not-allowed' : 'text',
      opacity: isInputDisabled ? 0.5 : 1,
      backgroundColor: '#fdfdfd',
      transition: 'all 0.2s ease',
    }}
  />
  <button
    onClick={liveAgent ? sendLiveAgentMessage : sendMessage}
    disabled={isInputDisabled || loading}
    style={{
      position: 'absolute',
      right: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      padding: '8px',
      cursor: isInputDisabled ? 'not-allowed' : 'pointer',
      opacity: isInputDisabled ? 0.5 : 1,
      transition: 'opacity 0.2s ease',
    }}
  >
    <SendIcon style={{ fontSize: '20px', color: '#1a3673' }} />
  </button>
</div>
        </>
      )}
    </div>
  );
}

export default CHATBOT;
