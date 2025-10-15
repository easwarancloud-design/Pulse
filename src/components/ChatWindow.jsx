import React, { useState, useEffect, useRef } from 'react'
import { CopyRegular, CopyFilled, ThumbLikeRegular, ThumbLikeFilled, ThumbDislikeRegular, ThumbDislikeFilled } from '../icons/FluentIcons'
import SendIcon from '@mui/icons-material/Send'
import MicIcon from '@mui/icons-material/Mic'
// fetchAgentData removed: not needed in ChatWindow
import PropTypes from 'prop-types'

// using MUI SendIcon (imported above)

function BotMessage({ msg, onCopy, onDislike, onLike, onReload, state }) {
  return (
    <div className="message bot">
      <div className="message-body">{msg.text}</div>
      <div className="message-actions">
        <button className={"icon-btn" + (state.copied === msg.id ? ' copied' : '')} onClick={() => onCopy(msg)} title="Copy">
          {state.copied === msg.id ? <CopyFilled /> : <CopyRegular />}
          {state.copied === msg.id && <span className="copied-label" aria-hidden>Copied</span>}
        </button>
        <button className="icon-btn" onClick={() => onLike(msg)} title="Like">{state.liked === msg.id ? <ThumbLikeFilled /> : <ThumbLikeRegular />}</button>
        <button className={"icon-btn" + (state.liked === msg.id ? ' active' : '')} onClick={() => onDislike(msg)} title="Dislike">{state.disliked === msg.id ? <ThumbDislikeFilled /> : <ThumbDislikeRegular />}</button>
        <button className="icon-btn" onClick={() => onReload && onReload(msg)} title="Reload">⟳</button>
      </div>
    </div>
  )
}

export default function ChatWindow({ chat, onSend, updateTitle, chatHistory = [] }) {
  const [input, setInput] = useState('')
  // initialize localChat defensively so renders won't crash if chat is undefined
  const [localChat, setLocalChat] = useState(chat ?? { title: 'Untitled', messages: [] })
  const [touched, setTouched] = useState(false)
  const [state, setState] = useState({ liked: null, disliked: null, copied: null })
  // local messages are stored on localChat.messages; no separate messages/agentView state needed
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(localChat.title || '')
  const refEnd = useRef(null)

  useEffect(() => {
    setLocalChat(chat ?? { title: 'Untitled', messages: [] })
    // Reset 'touched' when switching to a different chat so the first user message
    // can update the title for each new chat (avoid only working once)
    setTouched(false)
    setTitleDraft((chat && chat.title) || '')
  }, [chat])

  useEffect(() => {
    refEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localChat])

  // also scroll when messages length changes
  useEffect(() => {
    refEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localChat.messages && localChat.messages.length])

  // clear copied state after 1s so filled icon reverts
  useEffect(() => {
    if (!state.copied) return
    const t = setTimeout(() => setState(s => ({ ...s, copied: null })), 1000)
    return () => clearTimeout(t)
  }, [state.copied])

  useEffect(() => {
    setTitleDraft(localChat.title || '')
  }, [localChat.title])

  function saveTitle() {
    if (!localChat?.id) return
    const title = (titleDraft || 'Untitled').slice(0, 100)
    updateTitle?.(localChat.id, title)
    setEditingTitle(false)
  }

  if (!chat) return <div className="chat-window empty">No chat selected</div>

  function send() {
    if (!input.trim()) return
    // include impersonation in message metadata (sample)
    const message = { id: Date.now().toString(), role: 'user', text: input }
    // use localChat safely when checking or updating title
    const currentTitle = localChat?.title ?? ''
    if (!touched && (currentTitle === 'New chat' || currentTitle === 'Untitled')) {
      const newTitle = input.slice(0, 30)
      // update parent state
      updateTitle?.(chat?.id, newTitle)
      // also update local chat immediately so the header updates without waiting for parent props
      setLocalChat(prev => prev && prev.id === chat?.id ? { ...prev, title: newTitle } : prev)
      setTouched(true)
    }
    onSend?.(chat?.id, message)

    setTimeout(() => {
      const bot = { id: Date.now().toString() + 'b', role: 'bot', text: 'This is a simulated response for: ' + input }
      onSend?.(chat?.id, bot)
    }, 700)

    setInput('')
  }

  function onCopy(msg) { navigator.clipboard?.writeText(msg.text); setState(s => ({ ...s, copied: msg.id })) }
  function onDislike(msg) { setState(s => ({ ...s, disliked: msg.id, liked: s.liked === msg.id ? null : s.liked })) }
  function onLike(msg) { setState(s => ({ ...s, liked: msg.id, disliked: s.disliked === msg.id ? null : s.disliked })) }
  function onReload(msg) {
    // naive reload: append a new bot message simulating a refreshed reply
    const re = { id: Date.now().toString() + 'r', role: 'bot', text: 'Reloaded response for: ' + (msg?.text?.slice(0,120) || '') }
    onSend?.(chat?.id, re)
  }


  // impersonation removed from ChatWindow

  // agent/chat history click handlers are handled in Sidebar; keep minimal local behavior

  // handleSendMessage removed — use send() which routes through parent onSend

  const employees = [
    { name: 'Desai, Priya', id: 'AG123456', email: 'Priya.Desai@elevancehealth.com', status: 'Incomplete' },
    { name: 'Garcia, Sophia', id: 'AG123456', email: 'Sophia.Garcia@elevancehealth.com', status: 'Incomplete' },
    { name: 'Johnson, Alex', id: 'AG123456', email: 'Alex.Johnson@elevancehealth.com', status: 'Incomplete' },
    { name: 'Lin, Marco', id: 'AG123456', email: 'Marco.Lin@elevancehealth.com', status: 'Incomplete' },
    { name: 'Miller, Ethan', id: 'AG123456', email: 'Ethan.Miller@elevancehealth.com', status: 'Incomplete' },
  ];

  return (
    <div className="chat-window">
      <div className="header">
        <div style={{display:'flex', alignItems:'center', gap:12, justifyContent:'space-between'}}>
          {editingTitle ? (
            <input
              className="chat-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle() }}
              autoFocus
            />
          ) : (
            <h2 style={{margin:0, cursor:'text'}} onDoubleClick={() => setEditingTitle(true)}>{localChat.title}</h2>
          )}
         </div>
       </div>

      <div className="content-area">
        {localChat.title && localChat.title.toLowerCase().includes('dashboard') ? (
          <div className="dashboard">
            <h2>Who from my team hasn’t completed the Cyber Security Training?</h2>
            <div className="stats">
              <div className="stat">
                <h3>5</h3>
                <p>Employees have not completed training</p>
              </div>
              <div className="stat">
                <h3>19</h3>
                <p>Employees completed training</p>
              </div>
              <div className="stat">
                <h3>24</h3>
                <p>Total Employees reporting to you</p>
              </div>
            </div>
            <table className="details">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.email}>
                    <td>{employee.name}</td>
                    <td>{employee.id}</td>
                    <td>{employee.email}</td>
                    <td>{employee.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="messages">
              {localChat.messages && localChat.messages.length ? (
                localChat.messages.map((message) => (
                  message.role === 'bot' ? (
                    <BotMessage key={message.id || message.text} msg={message} onCopy={onCopy} onLike={onLike} onDislike={onDislike} onReload={onReload} state={state} />
                  ) : (
                    <div key={message.id || message.text} className={`message ${message.role}`}>
                      {message.text}
                    </div>
                  )
                ))
              ) : (
                <div className="no-messages">No messages yet — start the conversation.</div>
              )}
          </div>
        )}
      </div>

      {/* show composer only for normal chats (not dashboards) */}
      {!localChat.title?.toLowerCase().includes('dashboard') && (
        <div className="input-area">
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Ask Workpal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <div className="action-group">
              <button className="send-btn" aria-label="Send" onClick={send}><SendIcon /></button>
              <button className="mic-btn" aria-label="Microphone" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const el = document.createElement('div'); el.className='mic-tooltip'; el.innerText='Work in progress'; el.style.position='fixed'; el.style.left = (rect.left + rect.width/2 - 60) + 'px'; el.style.top = (rect.top - 40) + 'px'; document.body.appendChild(el); setTimeout(()=> el.remove(), 1200) }}>
                <MicIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* dashboard fallback (no longer needed here) */}
    </div>
  )
}

ChatWindow.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    messages: PropTypes.array,
  }),
  onSend: PropTypes.func,
  updateTitle: PropTypes.func,
  chatHistory: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

// BotMessage prop types (kept at file bottom)
BotMessage.propTypes = {
  msg: PropTypes.shape({ id: PropTypes.string, text: PropTypes.string }).isRequired,
  onCopy: PropTypes.func,
  onDislike: PropTypes.func,
  onLike: PropTypes.func,
  onReload: PropTypes.func,
  state: PropTypes.object,
}
