import React, { useState, useEffect } from 'react';
import PeopleGraph from '../components/PeopleGraph';
import { useUIStore } from '../store';
import { usePortfolioData } from '../hooks/usePortfolioData';

const PeopleView = () => {
  const { people, projects, updatePerson, deletePerson } = usePortfolioData();
  const { setActiveView, setViewingProjectId, featuredPersonId } = useUIStore();

  // Manage logged-in user state with localStorage
  const [loggedInUser, setLoggedInUser] = useState(() => {
    return localStorage.getItem('manity_logged_in_user') || '';
  });

  // Sync loggedInUser to localStorage
  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('manity_logged_in_user', loggedInUser);
    } else {
      localStorage.removeItem('manity_logged_in_user');
    }
  }, [loggedInUser]);

  const handleNavigateToProject = (projectId) => {
    setActiveView('overview');
    setViewingProjectId(projectId);
  };

  return (
    <PeopleGraph
      people={people}
      projects={projects}
      onUpdatePerson={updatePerson}
      onDeletePerson={deletePerson}
      onViewProject={handleNavigateToProject}
      onLoginAs={(personName) => setLoggedInUser(personName)}
      loggedInUser={loggedInUser}
      featuredPersonId={featuredPersonId}
    />
  );
};

export default PeopleView;
