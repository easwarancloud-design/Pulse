// oktaConfig.js (moved to src)
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';

// Ensure redirectUri matches the current origin (fixes 400 on /authorize if port differs)
const redirectUri = `${window.location.origin}/login/callback`;

const oktaConfig = {
  issuer: "https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297",
  clientId: "0oaxn8hlb28dSKReo297",
  redirectUri,
  pkce: true,
  scopes: ["openid", "profile", "email"],
  // Single authoritative restoreOriginalUri callback (remove from <Security> to avoid duplicates)
  restoreOriginalUri: async (_oktaAuth, originalUri) => {
    const relativeUrl = toRelativeUrl(originalUri || '/', window.location.origin);
    // Use replace to avoid adding extra entries to history
    window.location.replace(relativeUrl);
  }
};

export const oktaAuth = new OktaAuth(oktaConfig);
