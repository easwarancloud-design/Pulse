// Central place to define which routes are public (no Okta) vs protected (Okta)
// and to build public identity params (domainId and userName) for embeds/links.

// Global mode: when true, treat ALL routes as public (no Okta)
export const ALL_PUBLIC = true;

// Central default identity for public mode
export const DEFAULT_PUBLIC_IDENTITY = {
  domainId: 'AG04333',
  userName: 'TestUser',
};

export const PUBLIC_ROUTES = [
  '/pulseembedded_demo',
  '/pulseembedded_old',
  // Add more specific public paths here when ALL_PUBLIC is false
];

export function isPublicPath(pathname) {
  if (ALL_PUBLIC) return true;
  // Exact match list for now; can be extended to support patterns
  return PUBLIC_ROUTES.includes(pathname);
}

// Reads userInfo from localStorage (populated post-Okta) and extracts identity
export function getPublicIdentity() {
  // In ALL_PUBLIC mode, always use central defaults
  if (ALL_PUBLIC) return { ...DEFAULT_PUBLIC_IDENTITY };
  // Otherwise derive from stored userInfo if present
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const domainId = info?.domainId || info?.domain_id || null;
    const userName = info?.given_name || info?.firstName || (info?.name?.split(' ')[0]) || null;
    if (!domainId && !userName) return null;
    return { domainId, userName };
  } catch {
    return null;
  }
}

// Build a query string like ?domainId=...&userName=... (plus optional extras)
export function buildPublicQuery(extraParams = {}) {
  const ident = getPublicIdentity();
  const params = new URLSearchParams();
  if (ident?.domainId) params.set('domainId', ident.domainId);
  if (ident?.userName) params.set('userName', ident.userName);

  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Ensure localStorage has a userInfo object consistent with public identity
export function ensurePublicIdentity() {
  if (!ALL_PUBLIC) return;
  try {
    const existing = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const info = {
      // Minimal shape used across the app
      domainId: DEFAULT_PUBLIC_IDENTITY.domainId,
      domain_id: DEFAULT_PUBLIC_IDENTITY.domainId,
      given_name: DEFAULT_PUBLIC_IDENTITY.userName,
      firstName: DEFAULT_PUBLIC_IDENTITY.userName,
      name: DEFAULT_PUBLIC_IDENTITY.userName,
      ...existing, // preserve any extra fields but override identity keys above
    };
    localStorage.setItem('userInfo', JSON.stringify(info));
  } catch {
    const info = {
      domainId: DEFAULT_PUBLIC_IDENTITY.domainId,
      domain_id: DEFAULT_PUBLIC_IDENTITY.domainId,
      given_name: DEFAULT_PUBLIC_IDENTITY.userName,
      firstName: DEFAULT_PUBLIC_IDENTITY.userName,
      name: DEFAULT_PUBLIC_IDENTITY.userName,
    };
    localStorage.setItem('userInfo', JSON.stringify(info));
  }
}
