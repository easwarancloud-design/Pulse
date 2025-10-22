import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MainPage from './components/MainPage';
import EmbeddedPage from './components/EmbeddedPage';
import { get as apiGet } from './api';

const App = () => {
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'chat'
  const [initialQuestion, setInitialQuestion] = useState('');
  
  const [chatHistory, setChatHistory] = useState({
    Today: [
      { id: '1', title: 'How to improve UI', messages: [{ role: 'bot', text: 'Focus on contrast, spacing and consistent typography.' }] },
    ],
    Yesterday: [
      { id: '2', title: 'React performance', messages: [{ role: 'bot', text: 'Use memoization and avoid unnecessary re-renders.' }] },
    ],
    'Last Week': [
      { id: '3', title: 'New chat', messages: [] },
    ],
    'Last Month': [
      { id: '4', title: 'New chat', messages: [] },
    ],
  });

  // initialize theme from the document (main.jsx sets data-theme='light' by default)
  const [theme, setTheme] = useState(() => {
    try {
      return (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light'
    } catch (e) { return 'light' }
  });

  // flatten chats for sidebar list search
  const allChats = Object.values(chatHistory).flat();

  const [selectedChat, setSelectedChat] = useState(allChats[0] || null);
  // disable creating additional "New chat" items until the user asks the first question
  const [newChatDisabled, setNewChatDisabled] = useState(false);

  const handleSelectChat = async (chatId) => {
    // find local chat first
    const local = allChats.find(c => c.id === chatId);
    try {
      // try backend call: /chats/:id
      const resp = await apiGet(`/chats/${chatId}`);
      // assume resp has { id, title, messages }
      setSelectedChat(resp);
    } catch (err) {
      // fallback to local
      if (local) setSelectedChat(local);
    }
  };

  const handleNewChat = () => {
    // If there is already an empty chat (no messages), reuse it instead of creating another
    const existingEmpty = Object.values(chatHistory).flat().find(c => !(c.messages && c.messages.length))
    if (existingEmpty) {
      // Move the existing empty chat to the top of Today so it's visible and select it
      setChatHistory(prev => {
        const updated = { ...prev }
        for (const key of Object.keys(updated)) {
          updated[key] = (updated[key] || []).filter(ch => ch.id !== existingEmpty.id)
        }
        updated.Today = [existingEmpty, ...(updated.Today || [])]
        return updated
      })
      setSelectedChat(existingEmpty)
      return
    }

    // Otherwise create a new chat
    const newChat = { id: Date.now().toString(), title: 'New chat', messages: [] };
    setChatHistory(prev => ({
      ...prev,
      Today: [newChat, ...(prev.Today || [])],
    }));
    setSelectedChat(newChat);
    // disable the New chat button until the user sends the first question in this chat
    setNewChatDisabled(true);
  };

  const handleSendMessage = (chatId, message) => {
    // append message to chat in chatHistory and to selectedChat
    setChatHistory(prev => {
      const updated = { ...prev };
      // find which bucket contains the chat
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].map(c => {
          if (c.id === chatId) return { ...c, messages: [...c.messages, message] };
          return c;
        });
      }
      return updated;
    });

    setSelectedChat(prev => prev && prev.id === chatId ? { ...prev, messages: [...(prev.messages||[]), message] } : prev);
  };

  const handleFirstUserMessage = (chatId) => {
    // re-enable New chat button after the user has entered the first question
    setNewChatDisabled(false);
  };

  const handleUpdateMessage = (chatId, messageId, newMessage) => {
    // replace a message in-place (by id) in chatHistory and selectedChat
    setChatHistory(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].map(c => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: (c.messages || []).map(m => m.id === messageId ? { ...m, ...newMessage } : m)
          };
        });
      }
      return updated;
    });

    setSelectedChat(prev => prev && prev.id === chatId ? { ...prev, messages: (prev.messages || []).map(m => m.id === messageId ? { ...m, ...newMessage } : m) } : prev);
  };

  const updateTitle = (chatId, title) => {
    setChatHistory(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].map(c => c.id === chatId ? { ...c, title } : c);
      }
      return updated;
    });
    setSelectedChat(prev => prev && prev.id === chatId ? { ...prev, title } : prev);
  };

  // Generate AI response based on question content
  const generateResponse = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('ai') || lowerQuestion.includes('artificial intelligence')) {
      return "Our AI initiatives are expanding rapidly across multiple divisions. We've recently launched AI-powered search capabilities in Pulse, implemented intelligent document processing in HR, and are rolling out predictive analytics for supply chain optimization. The AI steering committee meets monthly to evaluate new opportunities and ensure responsible deployment of AI technologies.";
    }
    
    if (lowerQuestion.includes('learning') || lowerQuestion.includes('training')) {
      return "You have 2 required learning modules pending: 'Cybersecurity Awareness 2024' (due Oct 25) and 'Compliance Training Update' (due Nov 15). Additionally, there are 5 optional courses available in your learning path including 'Advanced Excel Techniques' and 'Leadership Fundamentals'. You can access all training materials through the Learning Management System in your employee portal.";
    }
    
    if (lowerQuestion.includes('office') || lowerQuestion.includes('who') || lowerQuestion.includes('today')) {
      return "Today's office occupancy shows 42% capacity across all floors. Key personnel in the office include: Sarah Chen (Marketing), Michael Rodriguez (Engineering), Lisa Wong (Finance), and David Thompson (Operations). The executive team is attending the quarterly board meeting in Conference Room A. Desk booking shows 15 hot desks available for walk-ins.";
    }
    
    if (lowerQuestion.includes('password') || lowerQuestion.includes('reset')) {
      return "To reset your password in the company portal: 1) Go to portal.company.com 2) Click 'Forgot Password' 3) Enter your employee ID or email 4) Check your email for reset link 5) Follow the link and create a new password meeting our security requirements (12+ characters, mix of letters/numbers/symbols). For immediate assistance, contact IT Help Desk at ext. 4357.";
    }
    
    if (lowerQuestion.includes('software') || lowerQuestion.includes('installation') || lowerQuestion.includes('install')) {
      return "Software installation requests: 1) Submit request through IT Service Portal 2) Select 'Software Request' from catalog 3) Provide business justification and approval from your manager 4) IT Security will review for compliance 5) Average approval time is 3-5 business days 6) Installation will be scheduled via ServiceNow. For approved software list, check the IT Knowledge Base.";
    }
    
    if (lowerQuestion.includes('payroll') || lowerQuestion.includes('salary') || lowerQuestion.includes('pay')) {
      return "Access your payroll information through the Employee Self-Service portal: 1) Login to ESS.company.com 2) Navigate to 'Payroll & Benefits' 3) View pay stubs, tax documents, and direct deposit settings 4) Update banking information if needed. For payroll questions, contact HR at hr@company.com or call 555-0123. Pay dates are the 15th and last day of each month.";
    }
    
    if (lowerQuestion.includes('help desk') || lowerQuestion.includes('ticket') || lowerQuestion.includes('support')) {
      return "Submit help desk tickets through our ServiceNow portal: 1) Go to helpdesk.company.com 2) Login with your company credentials 3) Click 'Request Something' or 'Report an Issue' 4) Fill out the form with detailed description 5) Attach screenshots if helpful 6) Submit and note your ticket number. You'll receive email updates on progress. For urgent issues, call 555-HELP (4357).";
    }
    
    if (lowerQuestion.includes('meeting room') || lowerQuestion.includes('book') || lowerQuestion.includes('reserve')) {
      return "Book meeting rooms through Outlook or the Room Booking System: 1) In Outlook, create new meeting 2) Click 'Add a room' 3) Select from available rooms 4) Or use the web portal at rooms.company.com 5) Filter by capacity, equipment needed, location 6) Select time slot and confirm booking. Rooms can be reserved up to 30 days in advance. For technical support in rooms, contact facilities at ext. 5678.";
    }
    
    if (lowerQuestion.includes('remote work') || lowerQuestion.includes('work from home') || lowerQuestion.includes('policy')) {
      return "Remote work policy allows up to 3 days per week remote work with manager approval. Requirements: 1) Complete remote work agreement 2) Ensure secure home office setup 3) Maintain regular communication with team 4) Use company VPN for all work activities 5) Attend mandatory in-person meetings. Full policy document available on the HR portal under 'Workplace Flexibility Guidelines'.";
    }
    
    if (lowerQuestion.includes('personal information') || lowerQuestion.includes('hr system') || lowerQuestion.includes('update')) {
      return "Update personal information in the HR system: 1) Login to Employee Self-Service portal 2) Go to 'My Profile' section 3) Update address, phone, emergency contacts 4) Submit changes for approval 5) Some changes (like name, SSN) require documentation - contact HR directly. Changes typically process within 24-48 hours. For sensitive updates, visit HR in person with required documentation.";
    }
    
    if (lowerQuestion.includes('security') || lowerQuestion.includes('sensitive data') || lowerQuestion.includes('protocol')) {
      return "Security protocols for sensitive data: 1) All sensitive data must be classified (Public, Internal, Confidential, Restricted) 2) Use company-approved cloud storage only 3) Enable encryption for data at rest and in transit 4) Follow clean desk policy 5) Report any security incidents immediately to security@company.com 6) Complete annual security training. For detailed guidelines, review the Information Security Policy on the compliance portal.";
    }
    
    if (lowerQuestion.includes('vpn') || lowerQuestion.includes('remote access') || lowerQuestion.includes('company resources')) {
      return "Access VPN and company resources remotely: 1) Download Cisco AnyConnect from IT portal 2) Use your domain credentials to login 3) Connect to appropriate VPN gateway (US-East, US-West, EU) 4) Access internal systems normally 5) For mobile devices, use Microsoft Authenticator for MFA 6) VPN is required for all remote access to company systems. Troubleshooting guide available at it.company.com/vpn-help.";
    }
    
    // Default response for unmatched questions
    return "I understand you're looking for information about: " + question + ". I'm here to help with company-related questions, policies, procedures, and resources. Could you provide a bit more detail about what specific information you need? You can also try rephrasing your question or contact the appropriate department directly for specialized assistance.";
  };

  // Handle starting a new chat from main page
  const handleStartChat = (question) => {
    // Create a new chat with the initial question
    const userMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: question 
    };

    // Generate AI response
    const botResponse = {
      id: (Date.now() + 1).toString(),
      role: 'bot', 
      text: generateResponse(question)
    };

    const newChat = { 
      id: Date.now().toString(), 
      title: question.length > 50 ? question.substring(0, 50) + '...' : question, 
      messages: [userMessage, botResponse]
    };
    
    setChatHistory(prev => ({
      ...prev,
      Today: [newChat, ...(prev.Today || [])],
    }));
    
    setSelectedChat(newChat);
    setInitialQuestion(question);
    setCurrentView('chat');
  };

  // Handle going back to main page
  const handleBackToMain = () => {
    setCurrentView('main');
    setInitialQuestion('');
  };

  // listen for custom events dispatched by Sidebar menu buttons
  React.useEffect(() => {
    function onRename(e) {
      const { id, title } = e.detail || {}
      if (id && title) updateTitle(id, title)
    }
    function onPin(e) {
      const { id } = e.detail || {}
      if (!id) return
      setChatHistory(prev => {
        const updated = { ...prev };
        // find and toggle pinned flag on the chat
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
        }
        return updated;
      })
    }
    window.addEventListener('sidebar-rename', onRename)
    window.addEventListener('sidebar-pin', onPin)
    return () => { window.removeEventListener('sidebar-rename', onRename); window.removeEventListener('sidebar-pin', onPin) }
  }, [])

  return (
    <Router basename="/workpal">
      <Routes>
        {/* Embedded route for iframe integration */}
        <Route path="/pulsemain/embedded" element={<EmbeddedPage onStartChat={handleStartChat} />} />
        
        {/* Main application routes */}
        <Route path="/*" element={
          <>
            {/* Show main page or chat result page */}
            {currentView === 'main' ? (
              <MainPage onStartChat={handleStartChat} />
            ) : (
              <div className="app">
                <Sidebar
                  chats={allChats}
                  activeChatId={selectedChat?.id}
                  onSelect={handleSelectChat}
                  onNewChat={handleNewChat}
                  newChatDisabled={newChatDisabled}
                  theme={theme}
                  setTheme={setTheme}
                  chatHistory={chatHistory}
                  onBackToMain={handleBackToMain}
                />
                <ChatWindow 
                  chat={selectedChat} 
                  onSend={handleSendMessage} 
                  updateTitle={updateTitle} 
                  onUpdateMessage={handleUpdateMessage} 
                  chatHistory={allChats} 
                  onFirstUserMessage={handleFirstUserMessage}
                  initialQuestion={initialQuestion}
                />
              </div>
            )}
          </>
        } />
      </Routes>
    </Router>
  );
};

export default App;
