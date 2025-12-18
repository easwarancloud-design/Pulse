import { useOktaAuth } from '@okta/okta-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isPublicPath } from './config/accessControl';

const PrivateRoute = ({ children }) => {
  const { authState, oktaAuth } = useOktaAuth();
  const location = useLocation();

  // Use centralized access control list for public routes
  const allowAnonymous = isPublicPath(location.pathname);

  useEffect(() => {
    if (!allowAnonymous && !authState?.isPending && !authState?.isAuthenticated) {
      oktaAuth.signInWithRedirect({ originalUri: location.pathname + location.search });
    }
  }, [authState, oktaAuth, location, allowAnonymous]);

  if (!allowAnonymous && (!authState || authState.isPending)) {
    return null; // or a loading spinner
  }

  if (!allowAnonymous && !authState.isAuthenticated) {
    return null; // user is being redirected
  }

  return <>{children}</>;
};

export default PrivateRoute;
