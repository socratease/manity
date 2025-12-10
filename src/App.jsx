import React, { useState } from "react";
import ManityApp from "./ManityApp";
import SettingsModal from "./components/SettingsModal";
import { PortfolioProvider, usePortfolioData } from "./hooks/usePortfolioData";

function AppContent() {
  const { projects, handleExport, handleImport } = usePortfolioData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({});

  const openSettings = (data) => {
    setSettingsData(data || {});
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
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
      <ManityApp onOpenSettings={openSettings} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        onExport={handleExport}
        onImport={handleImportWrapper}
        projects={projects}
        loggedInUser={settingsData.loggedInUser}
        setLoggedInUser={settingsData.setLoggedInUser}
        allStakeholders={settingsData.allStakeholders}
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
