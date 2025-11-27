// oktaConfig.js
import { OktaAuth } from '@okta/okta-auth-js';

const oktaConfig = {
  issuer: "https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297", // your Okta authorization server
  clientId: "0oaxn8hlb28dSKReo297", // your Okta app client ID
  redirectUri: window.location.origin + "/login/callback", // must match Okta Admin Console
  pkce: true,
  scopes: ["openid", "profile", "email"]
};

export const oktaAuth = new OktaAuth(oktaConfig);
