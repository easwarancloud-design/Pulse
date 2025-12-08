const express = require('express')
const app = express()
app.use(express.json())

function nowId() { return String(Date.now()) }

const chats = {
  '1': {
    id: '1', title: 'How to improve UI', messages: [
      { id: 'm1', role: 'user', text: 'How can I improve the UI for my app?' },
      { id: 'm2', role: 'bot', text: 'Focus on contrast, spacing and consistent typography.' }
    ]
  },
  '2': {
    id: '2', title: 'React performance', messages: [
      { id: 'm3', role: 'user', text: 'How to optimize React apps?' },
      { id: 'm4', role: 'bot', text: 'Use memoization, avoid anonymous functions in props, and code-split.' }
    ]
  }
}

app.get('/api/chats', (req, res) => {
  res.json(Object.values(chats))
})

app.post('/api/chats', (req, res) => {
  const title = (req.body && req.body.title) || 'New chat'
  const id = nowId()
  const chat = { id, title, messages: [] }
  chats[id] = chat
  res.json(chat)
})

app.get('/api/chats/:id', (req, res) => {
  const c = chats[req.params.id]
  if (!c) return res.status(404).json({ error: 'not found' })
  res.json(c)
})

app.post('/api/chats/:id/messages', (req, res) => {
  const c = chats[req.params.id]
  if (!c) return res.status(404).json({ error: 'not found' })
  const { role, text } = req.body
  const m = { id: nowId(), role, text }
  c.messages.push(m)
  res.json(m)
})

app.post('/api/chats/:id/title', (req, res) => {
  const c = chats[req.params.id]
  if (!c) return res.status(404).json({ error: 'not found' })
  c.title = req.body.title || c.title
  res.json(c)
})

app.get('/api/agents', (req, res) => {
  res.json([
    { id: 'agent-hr', name: 'HR Agent', type: 'hr' },
    { id: 'agent-jira', name: 'Jira Agent', type: 'jira' },
    { id: 'agent-snow', name: 'ServiceNow', type: 'servicenow' }
  ])
})

const port = process.env.PORT || 8000
app.listen(port, () => console.log(`Mock backend running on http://localhost:${port}`))
