// oktaConfig.js
import { OktaAuth } from '@okta/okta-auth-js';

const oktaConfig = {
  issuer: "https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297",
  clientId: "0oaxn8hlb28dSKReo297",
  redirectUri: typeof window !== "undefined"
    ? window.location.origin + "/?acs"
    : "https://workforceagent.slvr-dig-empmgt.awsdns.internal.das/?acs",
  pkce: true,
  scopes: ["openid", "profile", "email"]
};

export const oktaAuth = new OktaAuth(oktaConfig);
