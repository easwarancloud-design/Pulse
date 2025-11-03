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

  if (!authState || authState.isPending) return null;
  if (!authState.isAuthenticated) return null;

  return <>{children}</>;
};

export default PrivateRoute;
