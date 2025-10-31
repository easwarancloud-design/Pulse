import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const authenticated = await authService.ensureAuthenticated();
        
        if (authenticated) {
          // Get user information
          const userData = await authService.getUser();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#122F65] to-[#00123C]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#122F65] to-[#00123C]">
        <div className="text-center bg-white rounded-lg p-8 shadow-xl max-w-md mx-4">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-[#122F65]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access WorkPal. You will be redirected to Okta for secure authentication.
          </p>
          <button
            onClick={() => authService.redirectToLogin()}
            className="w-full bg-[#122F65] hover:bg-[#1e4a8c] text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Sign In with Okta
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Secure authentication powered by Okta
          </p>
        </div>
      </div>
    );
  }

  // If authenticated, render children with user context
  return React.cloneElement(children, { user, authService });
};

export default PrivateRoute;