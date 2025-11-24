import { useOktaAuth } from '@okta/okta-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { authState, oktaAuth } = useOktaAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authState?.isPending && !authState?.isAuthenticated) {
      oktaAuth.signInWithRedirect({ originalUri: location.pathname + location.search });
    }
  }, [authState, oktaAuth, location]);

  if (!authState || authState.isPending) {
    return null; // or a loading spinner
  }

  if (!authState.isAuthenticated) {
    return null; // user is being redirected
  }

  return <>{children}</>;
};

export default PrivateRoute;
