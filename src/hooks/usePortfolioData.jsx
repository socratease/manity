import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPortfolio, exportPortfolio, importPortfolio, loadPortfolio, savePortfolio } from '../lib/data/portfolio';

const PortfolioContext = createContext(null);

export const PortfolioProvider = ({ children }) => {
  const [projects, setProjects] = useState(() => loadPortfolio(defaultPortfolio));

  useEffect(() => {
    savePortfolio(projects);
  }, [projects]);

  const handleExport = () => {
    const data = exportPortfolio(projects);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manity-portfolio.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (fileOrText) => {
    const importedProjects = await importPortfolio(fileOrText);
    setProjects(importedProjects);
    savePortfolio(importedProjects);
    return importedProjects;
  };

  const value = useMemo(() => ({ projects, setProjects, handleExport, handleImport }), [projects]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolioData = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }
  return context;
};
