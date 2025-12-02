import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPortfolio, exportPortfolio, importPortfolio, loadPortfolio, savePortfolio } from '../lib/data/portfolio';

const PortfolioContext = createContext(null);

export const PortfolioProvider = ({ children }) => {
  const [projects, setProjects] = useState(() => loadPortfolio(defaultPortfolio));

  useEffect(() => {
    savePortfolio(projects);
  }, [projects]);

  const handleExport = (projectId) => {
    let data, filename;
    if (projectId && projectId !== 'all') {
      // Export single project
      const project = projects.find(p => p.id == projectId);
      if (project) {
        data = exportPortfolio([project]);
        filename = `manity-${project.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      } else {
        console.error('Project not found');
        return;
      }
    } else {
      // Export all projects
      data = exportPortfolio(projects);
      filename = 'manity-portfolio.json';
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (fileOrText, mode = 'replace') => {
    const importedProjects = await importPortfolio(fileOrText);

    if (mode === 'merge') {
      // Merge imported projects with existing ones
      const mergedProjects = [...projects];
      importedProjects.forEach(importedProject => {
        const existingIndex = mergedProjects.findIndex(p => p.id === importedProject.id);
        if (existingIndex >= 0) {
          // Replace existing project
          mergedProjects[existingIndex] = importedProject;
        } else {
          // Add new project
          mergedProjects.push(importedProject);
        }
      });
      setProjects(mergedProjects);
      savePortfolio(mergedProjects);
      return mergedProjects;
    } else {
      // Replace all projects
      setProjects(importedProjects);
      savePortfolio(importedProjects);
      return importedProjects;
    }
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
