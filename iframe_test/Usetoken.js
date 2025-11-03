// hooks/useToken.js
import { useState } from 'react';

export const useAccessToken = () => {
  const [tokenMap, setTokenMap] = useState({});

  const getToken = async (domainId) => {
    const expiryKey = `access_expiry_${domainId}`;
    const tokenKey = `access_token_${domainId}`;
    const expiry = localStorage.getItem(expiryKey);

    if (tokenMap[domainId] && expiry && Date.now() < Number(expiry)) {
      return tokenMap[domainId];
    }

    const res = await fetch("https://associatebot.slvr-dig-empmgt.awsdns.internal.das/token", {
      method: "POST",
      headers: {
        Authorization: "Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domainid: domainId })
    });

    const json = await res.json();
    const newToken = json.access_token;

    localStorage.setItem(tokenKey, newToken);
    localStorage.setItem(expiryKey, (Date.now() + 3 * 60 * 60 * 1000).toString());
    setTokenMap((prev) => ({ ...prev, [domainId]: newToken }));

    return newToken;
  };

  return { getToken };
};
