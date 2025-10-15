import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// default to light theme so the UI initially matches the requested look
try { document.documentElement.setAttribute('data-theme','light') } catch (e) {}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
