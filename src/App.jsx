import React, { useState, useEffect } from "react";
import ManityApp from "./ManityApp";
import SettingsModal from "./components/SettingsModal";
import { useApiKey } from "./hooks/useApiKey";
import { PortfolioProvider, usePortfolioData } from "./hooks/usePortfolioData";

function AppContent() {
  const { apiKey, setApiKey, clearApiKey, hasStoredKey } = useApiKey();
  const { projects, handleExport, handleImport } = usePortfolioData();
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

  const handleImportWrapper = async (file) => {
    try {
      await handleImport(file, 'merge');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <>
      <ManityApp onOpenSettings={openSettings} apiKey={apiKey} />
      <SettingsModal
        isOpen={isSettingsOpen}
        tempKey={tempKey}
        hasStoredKey={hasStoredKey}
        onTempKeyChange={setTempKey}
        onSave={handleSave}
        onClear={handleClear}
        onClose={closeSettings}
        onExport={handleExport}
        onImport={handleImportWrapper}
        projects={projects}
      />
    </>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}
