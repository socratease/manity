import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPortfolio, loadPortfolio, savePortfolio } from '../lib/data/portfolio';

const PortfolioContext = createContext(null);

export const PortfolioProvider = ({ children }) => {
  const [projects, setProjects] = useState(() => loadPortfolio(defaultPortfolio));

  useEffect(() => {
    savePortfolio(projects);
  }, [projects]);

  const value = useMemo(() => ({ projects, setProjects }), [projects]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolioData = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }
  return context;
};
