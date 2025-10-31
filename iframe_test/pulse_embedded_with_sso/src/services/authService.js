import { OktaAuth } from '@okta/okta-auth-js';

const oktaConfig = {
  issuer: "https://dev-71811048.oktapreview.com/oauth2/ausJsJy8t39561qCy297",
  clientId: "0oan6h1bSSeR6N0e297",
  redirectUri: window.location.origin + '/login/callback',
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
};

const oktaAuth = new OktaAuth(oktaConfig);

class AuthService {
  constructor() {
    this.oktaAuth = oktaAuth;
    this.handleRedirect();
  }

  async handleRedirect() {
    try {
      // Check if we're returning from Okta callback
      if (this.oktaAuth.isLoginRedirect()) {
        await this.oktaAuth.handleLoginRedirect();
        // Remove the code and state from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Error handling redirect:', error);
    }
  }

  async isAuthenticated() {
    try {
      const accessToken = await this.oktaAuth.tokenManager.get('accessToken');
      const idToken = await this.oktaAuth.tokenManager.get('idToken');
      return !!(accessToken && idToken);
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async signIn() {
    try {
      const tokens = await this.oktaAuth.token.parseFromUrl();
      this.oktaAuth.tokenManager.setTokens(tokens);
      
      // Store tokens in session storage for manual handling
      const accessToken = tokens.accessToken;
      const idToken = tokens.idToken;
      
      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken.accessToken);
        this.oktaAuth.tokenManager.add('accessToken', accessToken);
      }
      
      if (idToken) {
        sessionStorage.setItem('idToken', idToken.idToken);
        this.oktaAuth.tokenManager.add('idToken', idToken);
      }
      
      // Get original path from session storage and redirect
      const originalPath = sessionStorage.getItem('originalPath') || '/';
      sessionStorage.removeItem('originalPath');
      window.location.pathname = originalPath;
      
    } catch (error) {
      console.error('Error during sign in:', error);
      // If parsing fails, redirect to Okta
      this.redirectToLogin();
    }
  }

  redirectToLogin() {
    // Store current path to redirect back after login
    sessionStorage.setItem('originalPath', window.location.pathname);
    this.oktaAuth.signInWithRedirect();
  }

  async signOut() {
    try {
      // Clear tokens from token manager
      this.oktaAuth.tokenManager.clear();
      
      // Clear session storage
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('idToken');
      sessionStorage.removeItem('originalPath');
      
      // Sign out from Okta
      await this.oktaAuth.signOut();
      
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }

  async getUser() {
    try {
      const idToken = await this.oktaAuth.tokenManager.get('idToken');
      if (idToken && idToken.claims) {
        return {
          name: idToken.claims.name || idToken.claims.preferred_username || 'User',
          email: idToken.claims.email,
          sub: idToken.claims.sub
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getAccessToken() {
    try {
      const accessToken = await this.oktaAuth.tokenManager.get('accessToken');
      return accessToken ? accessToken.accessToken : null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Manual token handling methods
  getStoredAccessToken() {
    return sessionStorage.getItem('accessToken');
  }

  getStoredIdToken() {
    return sessionStorage.getItem('idToken');
  }

  isTokenValid(token) {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async ensureAuthenticated() {
    const isAuth = await this.isAuthenticated();
    const storedToken = this.getStoredAccessToken();
    
    if (!isAuth && (!storedToken || !this.isTokenValid(storedToken))) {
      this.redirectToLogin();
      return false;
    }
    
    return true;
  }
}

const authService = new AuthService();
export default authService;