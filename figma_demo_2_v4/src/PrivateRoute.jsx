// PrivateRoute.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';

const PrivateRoute = ({ children }) => {
  const { authState, oktaAuth } = useOktaAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state) {
        try {
          const tokens = await oktaAuth.token.parseFromUrl();
          const accessToken = tokens?.tokens?.accessToken;
          const idToken = tokens?.tokens?.idToken;

          oktaAuth.tokenManager.setTokens(tokens.tokens);

          const user = await oktaAuth.token.getUserInfo(accessToken, idToken);
          setUserDetails(user);

          const originalPath = sessionStorage.getItem('originalPath');
          sessionStorage.removeItem('originalPath');
          navigate(originalPath || '/', { replace: true });
        } catch (err) {
          console.error('Error during token parsing', err);
        }
      } else if (!authState?.isPending && !authState?.isAuthenticated) {
              //sessionStorage.setItem('originalPath', location.pathname);
        sessionStorage.setItem('originalPath', location.pathname + location.search);
              oktaAuth.signInWithRedirect();
      }
    };

    handleAuthRedirect();
  }, [authState, location, oktaAuth, navigate]);

  // After authentication, fetch and persist Okta user profile for app-wide use
  useEffect(() => {
    const storeUserInfo = async () => {
      try {
        if (!authState || !authState.isAuthenticated) return;

        // Prefer token-based userInfo; fallback to getUser
        let profile = null;
        try {
          const tokens = await oktaAuth.tokenManager.getTokens();
          const accessToken = tokens?.accessToken;
          const idToken = tokens?.idToken;
          if (accessToken && idToken) {
            profile = await oktaAuth.token.getUserInfo(accessToken, idToken);
          }
        } catch (_) {
          // ignore and fallback below
        }
        if (!profile) {
          profile = await oktaAuth.getUser();
        }

        if (!profile) return;

        const domainId =
          profile.domainId ||
          profile.domain_id ||
          profile.preferred_username ||
          profile.login ||
          profile.sub ||
          'AG04333';
        const firstName = profile.given_name || profile.firstName || (profile.name ? profile.name.split(' ')[0] : 'User');
        const lastName = profile.family_name || profile.lastName || (profile.name && profile.name.split(' ')[1] ? profile.name.split(' ')[1] : '');

        const userInfo = {
          domainId,
          firstName,
          lastName,
          email: profile.email,
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        setUserDetails(userInfo);
      } catch (e) {
        // Non-fatal; keep any existing defaults
      }
    };

    storeUserInfo();
  }, [authState, oktaAuth]);

  if (!authState || authState.isPending) return null;
  if (!authState.isAuthenticated) return null;

  return <>{children}</>;
};

export default PrivateRoute;
