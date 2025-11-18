// hooks/useToken.js
import { useState } from 'react';
import { tokenService } from '../services/tokenService';

export const useAccessToken = () => {
  const [tokenMap, setTokenMap] = useState({});

  const getToken = async (domainId, forceReal = false) => {
    try {
      const token = await tokenService.getToken(domainId, forceReal);
      
      // Update local token map for compatibility
      setTokenMap((prev) => ({ ...prev, [domainId]: token }));
      
      return token;
    } catch (error) {
      console.error('🚫 Token fetch failed:', error.message);
      throw error;
    }
  };

  return { getToken };
};