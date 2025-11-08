// hooks/useToken.js
import { useState } from 'react';

export const useAccessToken = () => {
  const [tokenMap, setTokenMap] = useState({});

  const getToken = async (domainId, forceReal = false) => {
    const expiryKey = `access_expiry_${domainId}`;
    const tokenKey = `access_token_${domainId}`;
    const expiry = localStorage.getItem(expiryKey);

    // If forcing real API, skip cache check
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

      localStorage.setItem(tokenKey, newToken);
      localStorage.setItem(expiryKey, (Date.now() + 3 * 60 * 60 * 1000).toString());
      setTokenMap((prev) => ({ ...prev, [domainId]: newToken }));

      return newToken;
      
    } catch (error) {
      console.error('🚫 Token API failed:', error.message);
      throw error;
    }
  };

  return { getToken };
};