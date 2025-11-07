// hooks/useToken.js
import { useState } from 'react';
import { mockGetToken } from '../utils/mockWorkforceAgent';

export const useAccessToken = () => {
  const [tokenMap, setTokenMap] = useState({});
  const [useMock, setUseMock] = useState(false);

  const getToken = async (domainId, forceReal = false) => {
    const expiryKey = `access_expiry_${domainId}`;
    const tokenKey = `access_token_${domainId}`;
    const expiry = localStorage.getItem(expiryKey);

    // If forcing real API, skip cache check and mock mode
    if (!forceReal && tokenMap[domainId] && expiry && Date.now() < Number(expiry)) {
      return tokenMap[domainId];
    }

    try {
      console.log('🔑 Fetching token for domain:', domainId, forceReal ? '(forcing real API)' : '');
      const res = await fetch("https://workforceagent.elevancehealth.com/token", {
        method: "POST",
        headers: {
          Authorization: "Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ domainid: domainId })
      });

      console.log('🔑 Token response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Token fetch error:', res.status, errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      const newToken = json.access_token;
      
      console.log('✅ Token received successfully');
      
      // Decode JWT to check the domain ID
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        console.log('🏷️ Token domain ID (sub):', payload.sub);
      } catch (e) {
        console.warn('Could not decode token payload:', e);
      }

      localStorage.setItem(tokenKey, newToken);
      localStorage.setItem(expiryKey, (Date.now() + 3 * 60 * 60 * 1000).toString());
      setTokenMap((prev) => ({ ...prev, [domainId]: newToken }));

      return newToken;
      
    } catch (error) {
      // Only fall back to mock if not forcing real API
      if (forceReal) {
        console.error('🚫 Real API forced but failed:', error.message);
        throw error;
      }
      
      console.warn('Real API not accessible, falling back to mock mode:', error.message);
      setUseMock(true);
      
      // Use mock token for testing
      const mockToken = await mockGetToken(domainId);
      localStorage.setItem(tokenKey, mockToken);
      localStorage.setItem(expiryKey, (Date.now() + 3 * 60 * 60 * 1000).toString());
      setTokenMap((prev) => ({ ...prev, [domainId]: mockToken }));
      
      return mockToken;
    }
  };

  return { getToken, useMock };
};