// API base URL: prefer environment variable set by Vite, fallback to /api
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function get(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/* Add dummy API call for agents */
export function fetchAgentData(agentName) {
  // Dummy API response
  const dummyData = {
    'HR Agent': { name: 'HR Agent', description: 'Handles HR-related queries.' },
    'Jira Agent': { name: 'Jira Agent', description: 'Manages Jira tickets and issues.' },
    'ServiceNow Agent': { name: 'ServiceNow Agent', description: 'Handles ServiceNow tasks and incidents.' },
  };

  return new Promise((resolve) => {
    setTimeout(() => resolve(dummyData[agentName] || { name: agentName, description: 'No data available.' }), 500);
  });
}
