import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { get as apiGet } from './api';

const App = () => {
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
      />
  <ChatWindow chat={selectedChat} onSend={handleSendMessage} updateTitle={updateTitle} onUpdateMessage={handleUpdateMessage} chatHistory={allChats} onFirstUserMessage={handleFirstUserMessage} />
    </div>
  );
};

export default App;
