import React, { useState } from "react";
import ManityApp from "./ManityApp";
import SettingsModal from "./components/SettingsModal";
import { PortfolioProvider, usePortfolioData } from "./hooks/usePortfolioData";

function AppContent() {
  const { projects, handleExport, handleImport, emailSettings, refreshEmailSettings, saveEmailSettings } = usePortfolioData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({});

  const openSettings = (data) => {
    setSettingsData(data || {});
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  // Wrapper to update both ManityApp state and local settingsData
  const handleSetLoggedInUser = (newUser) => {
    if (settingsData.setLoggedInUser) {
      settingsData.setLoggedInUser(newUser);
    }
    setSettingsData(prev => ({ ...prev, loggedInUser: newUser }));
  };

  const handleToggleDataPage = (shouldShow) => {
    if (settingsData.setShowDataPage) {
      settingsData.setShowDataPage(shouldShow);
    }
    setSettingsData(prev => ({ ...prev, showDataPage: shouldShow }));
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
        setLoggedInUser={handleSetLoggedInUser}
        allStakeholders={settingsData.allStakeholders}
        emailSettings={emailSettings}
        onSaveEmailSettings={saveEmailSettings}
        onRefreshEmailSettings={refreshEmailSettings}
        showDataPage={settingsData.showDataPage}
        onToggleDataPage={handleToggleDataPage}
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
