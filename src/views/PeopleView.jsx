import React from 'react';
import PeopleGraph from '../components/PeopleGraph';
import { Plus } from 'lucide-react';

export default function PeopleView({
  people,
  projects,
  onUpdatePerson,
  onDeletePerson,
  onViewProject,
  setLoggedInUser,
  loggedInUser,
  featuredPersonId,
  onAddPerson
}) {
  return (
    <>
      <header style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>People</h2>
          <p style={styles.pageSubtitle}>
            Manage people in your portfolio
          </p>
        </div>
        <button
          onClick={onAddPerson}
          style={styles.newProjectButton}
        >
          <Plus size={18} />
          Add Person
        </button>
      </header>

      <div style={{ marginTop: '16px' }}>
        <PeopleGraph
          people={people}
          projects={projects}
          onUpdatePerson={onUpdatePerson}
          onDeletePerson={onDeletePerson}
          onViewProject={onViewProject}
          onLoginAs={(personName) => {
            setLoggedInUser(personName);
            localStorage.setItem('manity_logged_in_user', personName);
          }}
          loggedInUser={loggedInUser}
          featuredPersonId={featuredPersonId}
        />
      </div>
    </>
  );
}

const styles = {
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: 'var(--stone)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  newProjectButton: {
    padding: '12px 18px',
    border: '1px solid var(--earth)',
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontWeight: '700',
    boxShadow: '0 10px 30px rgba(139, 111, 71, 0.25)',
  },
};
