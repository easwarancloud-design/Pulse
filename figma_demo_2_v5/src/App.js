import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Security, LoginCallback } from '@okta/okta-react';
import { ThemeProvider } from './context/ThemeContext';
import { oktaAuth } from './oktaConfig';
import PrivateRoute from './PrivateRoute';
import AppContent from './AppContent';
import './App.css';


function AppWrapper() {
  const navigate = useNavigate();


return (
    <Security
      oktaAuth={oktaAuth}
      restoreOriginalUri={async (_oktaAuth, originalUri) => {
        navigate(originalUri || '/', { replace: true });
      }}
    >
      <ThemeProvider>
        <Routes>
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppContent />
              </PrivateRoute>
            }
          />
        </Routes>
      </ThemeProvider>
    </Security>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}
