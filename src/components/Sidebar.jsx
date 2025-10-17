import React, { useState, useEffect } from 'react'
import { fetchAgentData } from '../api'

function IconPulse() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12h3l2-6 3 12 2-8 3 6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconAgent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconJira() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l6 12 6-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconServiceNow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 9h10M7 15h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 12h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5l-1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 19l-1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19L3.5 20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5L17.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Sidebar({ chats, activeChatId, onSelect, onNewChat, theme, setTheme, chatHistory, newChatDisabled }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [showSearchOnExpand, setShowSearchOnExpand] = useState(false)
  const [agents, setAgents] = useState([])
  const [backendOk, setBackendOk] = useState(null)
  const [agentInfo, setAgentInfo] = useState(null)

  // close any open chat-item menus when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e) => {
      const open = document.querySelectorAll('.chat-item.menu-open')
      open.forEach(item => { if (!item.contains(e.target)) item.classList.remove('menu-open') })
    }
    const onKey = (e) => { if (e.key === 'Escape') { const open = document.querySelectorAll('.chat-item.menu-open'); open.forEach(i => i.classList.remove('menu-open')) } }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => {
    let mounted = true
    import('../api').then(mod => mod.get('/agents')).then(data => { if (mounted) setAgents(data) }).catch(() => setAgents([]))
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    import('../api').then(mod => mod.get('/health')).then(() => { if (mounted) setBackendOk(true) }).catch(() => { if (mounted) setBackendOk(false) })
    return () => { mounted = false }
  }, [])

  const filtered = (chats || []).filter(c => (c.title || 'Untitled').toLowerCase().includes(query.toLowerCase()))

  const handleAgentClick = async (agentName) => {
    const data = await fetchAgentData(agentName)
    setAgentInfo(data)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Ensure the sidebar search-inner uses the exact light-mode color requested
  // Inline styles are applied as a runtime fallback to override any stubborn
  // external CSS specificity issues. This runs only when theme is light.
  useEffect(() => {
    const el = document.querySelector('.sidebar:not(.collapsed) .sidebar-search .search-inner')
    if (!el) return

    const setLightInitial = () => {
      // initial light border in light mode
      el.style.border = '1px solid rgba(2,6,23,0.04)'
      // ensure icon and input text use the requested OKLCH color (with hex fallback)
      const icon = el.querySelector('.search-icon')
      if (icon) {
        icon.style.color = '#102033'
        try { icon.style.color = 'oklch(.928 .0359 250.6 / 1)' } catch (e) {}
      }
      const input = el.querySelector('input')
      if (input) {
        input.style.color = '#102033'
        try { input.style.color = 'oklch(.928 .0359 250.6 / 1)' } catch (e) {}
        // caret color
        try { input.style.caretColor = 'oklch(.928 .0359 250.6 / 1)' } catch (e) {}
      }
    }

    const onFocusIn = () => {
      // darker border on click/focus
      el.style.border = '1px solid rgba(2,6,23,0.16)'
    }
    const onFocusOut = () => {
      // revert to light initial border
      el.style.border = '1px solid rgba(2,6,23,0.04)'
    }

    // Apply when theme is light; add listeners to handle focus changes
    if (theme === 'light') {
      setLightInitial()
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
      // also handle timing when element mounts later
      const t = setTimeout(setLightInitial, 120)
      return () => { clearTimeout(t); el.removeEventListener('focusin', onFocusIn); el.removeEventListener('focusout', onFocusOut); }
    } else {
      // remove inline overrides when not in light mode
      el.style.border = ''
      const icon = el.querySelector('.search-icon')
      if (icon) icon.style.color = ''
      const input = el.querySelector('input')
      if (input) { input.style.color = ''; try { input.style.caretColor = '' } catch (e) {} }
    }
  }, [theme])

  // Floating tooltip (append to body so it's not clipped by scrollable containers)
  const tooltipRef = React.useRef(null)
  const showTooltip = (el, text) => {
    hideTooltip()
    if (!el || !text) return
    const div = document.createElement('div')
    div.className = 'floating-tooltip'
    div.innerText = text
    // allow wrapping and set a reasonable max width relative to viewport
    const vw = Math.max(window.innerWidth || 800, 800)
    const maxW = Math.min(520, Math.floor(vw - 80))
    div.style.maxWidth = maxW + 'px'
    div.style.whiteSpace = 'normal'
    document.body.appendChild(div)
    // position helper: prefer right side if there is room, otherwise above/below centered
    const positionTooltip = (targetEl, tooltipEl) => {
      const r = targetEl.getBoundingClientRect()
      const td = tooltipEl.getBoundingClientRect()
      const spaceRight = window.innerWidth - r.right
      const spaceLeft = r.left
      const spaceAbove = r.top
      const spaceBelow = window.innerHeight - r.bottom

      // Prefer right side if it fits
      if (spaceRight > td.width + 12) {
        tooltipEl.style.left = (r.right + 8) + 'px'
        tooltipEl.style.top = (r.top + r.height / 2) + 'px'
        tooltipEl.style.transform = 'translate(0, -50%)'
        return
      }

      // If not, prefer above if enough room
      if (spaceAbove > td.height + 12) {
        tooltipEl.style.left = (r.left + r.width / 2) + 'px'
        tooltipEl.style.top = (r.top - 8) + 'px'
        tooltipEl.style.transform = 'translate(-50%, -100%)'
        return
      }

      // Otherwise place below
      tooltipEl.style.left = (r.left + r.width / 2) + 'px'
      tooltipEl.style.top = (r.bottom + 8) + 'px'
      tooltipEl.style.transform = 'translate(-50%, 0)'
    }

    positionTooltip(el, div)
    tooltipRef.current = div
  }
  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.remove()
      tooltipRef.current = null
    }
  }
  useEffect(() => { return () => { hideTooltip() } }, [])


  return (
    <aside className={"sidebar" + (collapsed ? ' collapsed' : '')}>
      <div className="sidebar-top">
        {collapsed ? (
            <div className="collapsed-toolbar">
            <button className="icon-only expand-btn" title="Expand" onClick={() => { setCollapsed(false); if (showSearchOnExpand) { setTimeout(()=> { const el = document.querySelector('.sidebar-search input'); el && el.focus(); setShowSearchOnExpand(false) }, 120) } }}>☰</button>
            <button className="icon-only back-btn" title="Back to Pulse" onClick={() => window.history.back()} aria-label="Back to Pulse"><IconBack /><span className="back-text">Back</span></button>
            <button className="icon-only search-btn" title="Search" onClick={() => { setCollapsed(false); setShowSearchOnExpand(true); setTimeout(()=> { const el = document.querySelector('.sidebar-search input'); el && el.focus(); }, 160) }} aria-label="Search"><IconSearch /></button>
          </div>
        ) : (
          <>
            <div className="brand-row">
              <div className="top-row">
                <div className="brand-left" style={{display:'flex',alignItems:'center',gap:8}}>
                  <div className="brand"><IconPulse /><span className="brand-text">Pulse</span></div>
                </div>
                <div className="top-right" style={{display:'flex',alignItems:'center',gap:8}}>
                  <button className="icon-only collapse-toggle" title="Collapse" onClick={() => { setCollapsed(true); }} aria-label="Collapse">☰</button>
                </div>
              </div>

              <div className="second-row">
                <div className="back-left" style={{display:'flex',alignItems:'center'}}>
                  <button className={"back-btn" + (theme === 'dark' ? ' dark' : ' light')} title="Back to Pulse" onClick={() => window.history.back()} aria-label="Back to Pulse"><IconBack /><span className="back-text">Back</span></button>
                </div>
                <div className="second-right" style={{display:'flex',alignItems:'center'}}>
                  <div className="top-actions">
                    <div className="theme-toggle" role="tablist" aria-label="Theme selector">
                      <button className={"theme-icon sun " + (theme === 'light' ? 'active' : '')} onClick={() => { setTheme('light'); document.documentElement.setAttribute('data-theme','light') }} aria-pressed={theme === 'light'} title="Light">
                        <IconSun />
                      </button>
                      <button className={"theme-icon moon " + (theme === 'dark' ? 'active' : '')} onClick={() => { setTheme('dark'); document.documentElement.setAttribute('data-theme','dark') }} aria-pressed={theme === 'dark'} title="Dark">
                        <IconMoon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* third row: search input */}
        <div className="sidebar-search" style={{width:'100%'}}>
          <div className="search-inner" style={{width:'100%'}}>
            <span className="search-icon"><IconSearch /></span>
            <input placeholder="Search chats" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>

      </div>

      

      <div className="agents">
        <div className="agents-title">Agents</div>
        <div className="agent-list">
          <div className="agent-item" onClick={() => handleAgentClick('HR Agent')}><span className="agent-icon"><IconAgent /></span><span>HR Agent</span></div>
          <div className="agent-item" onClick={() => handleAgentClick('Jira Agent')}><span className="agent-icon"><IconJira /></span><span>Jira Agent</span></div>
          <div className="agent-item" onClick={() => handleAgentClick('ServiceNow Agent')}><span className="agent-icon"><IconServiceNow /></span><span>ServiceNow</span></div>
        </div>
      </div>

  <div className="history-header">
    <div className="history-title">Previous Threads</div>
  </div>

      <div className="scrollable-area">
        {/* show ungrouped filtered list only when the user is searching to avoid duplicates */}
        {query.trim() ? (
          <div className="chat-list" role="list">
            {filtered.map(c => {
              const last = c.messages && c.messages.length ? c.messages[c.messages.length-1].text : ''
              const tooltip = `${c.title || 'Untitled'}${last ? ' — ' + last : ''}`
              return (
                <div key={c.id} role="listitem" className={"chat-item " + (c.id === activeChatId ? 'active' : '')}>
                  <div className="chat-body">
                    <div
                      className="chat-title"
                      data-tooltip={tooltip}
                      onClick={() => onSelect(c.id)}
                      onMouseEnter={(e) => showTooltip(e.currentTarget, tooltip)}
                      onMouseMove={(e) => {
                        const el = tooltipRef.current
                        if (el) {
                          const target = e.currentTarget
                          const r = target.getBoundingClientRect()
                          const td = el.getBoundingClientRect()
                          const spaceRight = window.innerWidth - r.right
                          if (spaceRight > td.width + 12) {
                            el.style.left = (r.right + 8) + 'px'
                            el.style.top = (r.top + r.height / 2) + 'px'
                            el.style.transform = 'translate(0, -50%)'
                          } else if (r.top > td.height + 12) {
                            el.style.left = (r.left + r.width / 2) + 'px'
                            el.style.top = (r.top - 8) + 'px'
                            el.style.transform = 'translate(-50%, -100%)'
                          } else {
                            el.style.left = (r.left + r.width / 2) + 'px'
                            el.style.top = (r.bottom + 8) + 'px'
                            el.style.transform = 'translate(-50%, 0)'
                          }
                        }
                      }}
                      onMouseLeave={() => hideTooltip()}
                    >
                      <span className="chat-icon"><IconChat /></span>
                      <span className="chat-title-text">{c.title || 'Untitled'}</span>
                    </div>

                    <button className="menu-btn" title="More" onClick={(e) => { e.stopPropagation(); const item = e.currentTarget.closest('.chat-item'); item.classList.toggle('menu-open'); }}>⋯</button>

                    <div className="menu-pop" role="menu">
                      <button className="menu-item" onClick={(e) => { e.stopPropagation(); const t = prompt('Rename chat', c.title || ''); if (t !== null) window.dispatchEvent(new CustomEvent('sidebar-rename', { detail: { id: c.id, title: t } })); const item = e.currentTarget.closest('.chat-item'); item && item.classList.remove('menu-open'); }}>Rename</button>
                      <button className="menu-item" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('sidebar-pin', { detail: { id: c.id } })); const item = e.currentTarget.closest('.chat-item'); item && item.classList.remove('menu-open'); }}>Pin</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {agentInfo && (
          <div className="agent-info">
            <h3>{agentInfo.name}</h3>
            <p>{agentInfo.description}</p>
          </div>
        )}

        <div className="chat-history" role="navigation" aria-label="Chat history grouped by time">
          {
            // Render groups in a predictable order
            (() => {
              const preferred = ['Today','Yesterday','Last Week','Last Month','Older']
              const present = []
              // include preferred keys first if present
              for (const k of preferred) if (chatHistory && chatHistory[k] && chatHistory[k].length) present.push([k, chatHistory[k]])
              // include any other keys after
              if (chatHistory) {
                for (const [k,v] of Object.entries(chatHistory)) {
                  if (!preferred.includes(k) && v && v.length) present.push([k,v])
                }
              }
              const seen = new Set()
              return present.map(([timeCategory, chats]) => (
                <div key={timeCategory} className="time-category">
                  <h3>{timeCategory} <span className="time-count">({chats.length})</span></h3>
                  {chats.map((chat) => {
                    if (!chat || !chat.id || seen.has(chat.id)) return null
                    seen.add(chat.id)
                              return (
                              <div
                        key={chat.id}
                        className={"chat-item " + (chat.id === activeChatId ? 'active' : '')}
                      >
                        <div className="chat-body">
                          {(() => {
                            const last = chat.messages && chat.messages.length ? chat.messages[chat.messages.length-1].text : ''
                            const tooltip = `${chat.title || 'Untitled'}${last ? ' — ' + last : ''}`
                            return (
                              <div
                                className="chat-title"
                                data-tooltip={tooltip}
                                onClick={() => onSelect(chat.id)}
                                onMouseEnter={(e) => showTooltip(e.currentTarget, tooltip)}
                                onMouseMove={(e) => { const el = tooltipRef.current; if (el) { const target = e.currentTarget; const r = target.getBoundingClientRect(); const td = el.getBoundingClientRect(); const spaceRight = window.innerWidth - r.right; if (spaceRight > td.width + 12) { el.style.left = (r.right + 8) + 'px'; el.style.top = (r.top + r.height / 2) + 'px'; el.style.transform = 'translate(0, -50%)'; } else { el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top - 8) + 'px'; el.style.transform = 'translate(-50%, -100%)'; } } }}
                                onMouseLeave={() => hideTooltip()}
                              >
                                <span className="chat-icon"><IconChat /></span>
                                <span className="chat-title-text">{chat.title || 'Untitled'}</span>
                              </div>
                            )
                          })()}

                          <button className="menu-btn" title="More" onClick={(e) => { e.stopPropagation(); const item = e.currentTarget.closest('.chat-item'); item.classList.toggle('menu-open'); }}>⋯</button>

                          <div className="menu-pop" role="menu">
                            <button className="menu-item" onClick={(e) => { e.stopPropagation(); const t = prompt('Rename chat', chat.title || ''); if (t !== null) window.dispatchEvent(new CustomEvent('sidebar-rename', { detail: { id: chat.id, title: t } })); const item = e.currentTarget.closest('.chat-item'); item && item.classList.remove('menu-open'); }}>Rename</button>
                            <button className="menu-item" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('sidebar-pin', { detail: { id: chat.id } })); const item = e.currentTarget.closest('.chat-item'); item && item.classList.remove('menu-open'); }}>Pin</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            })()
          }
        </div>
      </div>

      <div className="sidebar-bottom">
        <button className={"new-chat bottom" + (newChatDisabled ? ' disabled' : '')} onClick={(e) => { if (newChatDisabled) return; onNewChat && onNewChat(); }} title="New chat" aria-disabled={newChatDisabled}>+ New chat</button>
      </div>
    </aside>
  )
}
