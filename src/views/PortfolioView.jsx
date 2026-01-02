import React from 'react';
import { Plus, Users, Clock, CheckCircle2, Circle, ChevronRight, MessageCircle, Trash2 } from 'lucide-react';
import PersonPicker from '../components/PersonPicker';

export default function PortfolioView({
  projects,
  userActiveProjects,
  userCompletedProjects,
  otherActiveProjects,
  otherCompletedProjects,
  loggedInUser,
  visibleProjects,
  onViewProject,
  onOpenNewProject,
  onDeleteProject,
  projectDeletionEnabled,
  renderProjectCard
}) {
  return (
    <>
      <div style={styles.projectsSection}>
        {visibleProjects.length === 0 ? (
          <div style={styles.emptyState}>
            No projects found. Create a new project to get started.
          </div>
        ) : (
          <>
            {/* Your Active Projects */}
            <div style={styles.sectionHeaderRow}>
              <div>
                <h3 style={styles.sectionTitle}>Your Active Projects</h3>
                <p style={styles.sectionSubtitle}>{userActiveProjects.length} in progress</p>
              </div>
            </div>

            {userActiveProjects.length === 0 ? (
              <div style={styles.emptyState}>
                {loggedInUser ? `No active projects for ${loggedInUser}.` : 'No active projects for you.'}
              </div>
            ) : (
              <div style={styles.projectsGrid}>
                {userActiveProjects.map((project, index) => renderProjectCard(project, index))}
              </div>
            )}

            {/* Other Active Projects */}
            {otherActiveProjects.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionTitle}>Other Active Projects</h3>
                    <p style={styles.sectionSubtitle}>{otherActiveProjects.length} in progress</p>
                  </div>
                </div>
                <div style={styles.projectsGrid}>
                  {otherActiveProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length))}
                </div>
              </div>
            )}

            {/* Your Completed Projects */}
            {userCompletedProjects.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionTitle}>Your Completed & Closed</h3>
                    <p style={styles.sectionSubtitle}>{userCompletedProjects.length} wrapped up</p>
                  </div>
                </div>
                <div style={styles.projectsGrid}>
                  {userCompletedProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length + otherActiveProjects.length))}
                </div>
              </div>
            )}

            {/* Other Completed Projects */}
            {otherCompletedProjects.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionTitle}>Other Completed & Closed</h3>
                    <p style={styles.sectionSubtitle}>{otherCompletedProjects.length} wrapped up</p>
                  </div>
                </div>
                <div style={styles.projectsGrid}>
                  {otherCompletedProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length + otherActiveProjects.length + userCompletedProjects.length))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

const styles = {
  projectsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  sectionSubtitle: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },
  emptyState: {
    gridColumn: '1 / -1',
    padding: '24px',
    border: '1px dashed var(--cloud)',
    borderRadius: '12px',
    textAlign: 'center',
    backgroundColor: '#fff',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '24px',
  },
};
