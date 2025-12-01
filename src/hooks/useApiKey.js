import { useState, useEffect } from "react";

const STORAGE_KEY = "manity_api_key_v1";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApiKeyState(stored);
      }
    } catch {
      // localStorage might be unavailable in some environments
    }
  }, []);

  const setApiKey = (key) => {
    setApiKeyState(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore
    }
  };

  const clearApiKey = () => {
    setApiKeyState("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    hasStoredKey: Boolean(apiKey),
  };
}
