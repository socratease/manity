import React, { useState, useEffect } from "react";
import ManityApp from "./ManityApp";
import SettingsModal from "./components/SettingsModal";
import { useApiKey } from "./hooks/useApiKey";
import { PortfolioProvider } from "./hooks/usePortfolioData";

export default function App() {
  const { apiKey, setApiKey, clearApiKey, hasStoredKey } = useApiKey();
  const [tempKey, setTempKey] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = () => {
    setIsSettingsOpen(true);
    setTempKey(apiKey ? "********" : "");
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    if (apiKey) {
      setTempKey("********");
    }
  }, [apiKey]);

  const handleSave = () => {
    if (tempKey && tempKey !== "********") {
      setApiKey(tempKey.trim());
    }
    setIsSettingsOpen(false);
  };

  const handleClear = () => {
    clearApiKey();
    setTempKey("");
  };

  return (
    <>
      <PortfolioProvider>
        <ManityApp onOpenSettings={openSettings} />
      </PortfolioProvider>
      <SettingsModal
        isOpen={isSettingsOpen}
        tempKey={tempKey}
        hasStoredKey={hasStoredKey}
        onTempKeyChange={setTempKey}
        onSave={handleSave}
        onClear={handleClear}
        onClose={closeSettings}
      />
    </>
  );
}
