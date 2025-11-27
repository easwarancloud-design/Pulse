// oktaConfig.js (moved to src)
import { OktaAuth } from '@okta/okta-auth-js';

// Ensure redirectUri matches the current origin (fixes 400 on /authorize if port differs)
const redirectUri = `${window.location.origin}/login/callback`;

const oktaConfig = {
  issuer: "https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297",
  clientId: "0oaxn8hlb28dSKReo297",
  redirectUri,
  pkce: true,
  scopes: ["openid", "profile", "email"],
};

export const oktaAuth = new OktaAuth(oktaConfig);
