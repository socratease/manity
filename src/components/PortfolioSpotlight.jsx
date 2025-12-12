import React, { useMemo } from 'react';
import { Sparkles, Users, FolderKanban, ArrowUpRight } from 'lucide-react';
import Avatar from './ui/Avatar';

const palette = ['#8B6F47', '#7A9B76', '#D67C5C', '#E8A75D', '#6B6554'];

const getTeamColor = (team = '') => {
  if (!team) return palette[palette.length - 1];
  const normalized = team.toLowerCase();
  const index = Math.abs(normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % palette.length;
  return palette[index];
};

const getStatusColor = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('active')) return 'var(--earth)';
  if (normalized.includes('planning') || normalized.includes('draft')) return 'var(--amber)';
  if (normalized.includes('completed') || normalized.includes('closed')) return 'var(--sage)';
  return 'var(--stone)';
};

const PortfolioSpotlight = ({ projects = [], people = [], onSelectProject = () => {}, onOpenPeople = () => {} }) => {
  const activeProjects = useMemo(
    () => projects.filter(project => !['completed', 'closed'].includes((project.status || '').toLowerCase())),
    [projects]
  );

  const completedProjects = useMemo(
    () => projects.filter(project => ['completed', 'closed'].includes((project.status || '').toLowerCase())),
    [projects]
  );

  const featuredProjects = useMemo(
    () => [...projects].sort((a, b) => (b.progress || 0) - (a.progress || 0)).slice(0, 4),
    [projects]
  );

  const featuredPeople = useMemo(() => people.slice(0, 8), [people]);

  return (
    <section style={styles.wrapper}>
      <div style={styles.topRow}>
        <div style={styles.metaBadge}>
          <Sparkles size={16} style={{ color: 'var(--earth)' }} />
          <span>Portfolio spotlight</span>
        </div>
        <div style={styles.metaActions}>
          <button style={styles.linkButton} onClick={onOpenPeople}>
            <Users size={14} />
            View team
          </button>
        </div>
      </div>

      <div style={styles.panelGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <div>
              <p style={styles.eyebrow}>Health overview</p>
              <h3 style={styles.title}>Keep the portfolio in orbit</h3>
            </div>
            <div style={styles.summaryStats}>
              <div style={styles.statPill}>
                <span style={styles.statValue}>{activeProjects.length}</span>
                <span style={styles.statLabel}>Active</span>
              </div>
              <div style={styles.statPill}>
                <span style={styles.statValue}>{completedProjects.length}</span>
                <span style={styles.statLabel}>Completed</span>
              </div>
              <div style={styles.statPill}>
                <span style={styles.statValue}>{people.length}</span>
                <span style={styles.statLabel}>People</span>
              </div>
            </div>
          </div>
          <p style={styles.subtitle}>
            A quick snapshot of the humans and work moving your roadmap forward. Click any project to jump into details.
          </p>

          <div style={styles.peopleRow}>
            <div style={styles.peopleHeader}>
              <Users size={16} style={{ color: 'var(--stone)' }} />
              <span style={styles.peopleLabel}>People in this workspace</span>
            </div>
            <div style={styles.avatarStack}>
              {featuredPeople.length === 0 ? (
                <span style={styles.emptyText}>No people yet. Add someone to get started.</span>
              ) : (
                featuredPeople.map((person, idx) => (
                  <div key={person.id || person.name || idx} style={{ ...styles.avatarWrapper, zIndex: featuredPeople.length - idx }}>
                    <Avatar
                      name={person.name || 'Unknown'}
                      color={getTeamColor(person.team)}
                      size="sm"
                      bordered
                    />
                  </div>
                ))
              )}
              {people.length > featuredPeople.length && (
                <div style={styles.moreAvatar}>+{people.length - featuredPeople.length}</div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.projectsCard}>
          <div style={styles.projectsHeader}>
            <div style={styles.projectsTitleRow}>
              <FolderKanban size={18} style={{ color: 'var(--earth)' }} />
              <div>
                <p style={styles.eyebrow}>Projects</p>
                <h4 style={styles.projectsTitle}>Front-burner work</h4>
              </div>
            </div>
            <span style={styles.projectsCaption}>Sorted by progress</span>
          </div>

          <div style={styles.projectsList}>
            {featuredProjects.length === 0 ? (
              <div style={styles.emptyText}>No projects yet. Create one to get moving.</div>
            ) : (
              featuredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  style={styles.projectRow}
                >
                  <div style={styles.projectMain}>
                    <div style={styles.projectName}>{project.name}</div>
                    <div style={styles.projectMeta}>
                      <span style={{ ...styles.statusBadge, color: getStatusColor(project.status), borderColor: getStatusColor(project.status) }}>
                        {project.status}
                      </span>
                      <span style={styles.priorityText}>{project.priority || '—'} priority</span>
                    </div>
                  </div>
                  <div style={styles.projectRight}>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${Math.min(Math.max(project.progress || 0, 0), 100)}%` }} />
                    </div>
                    <ArrowUpRight size={16} style={{ color: 'var(--stone)' }} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const styles = {
  wrapper: {
    background: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '12px',
    backgroundColor: 'var(--cream)',
    color: 'var(--charcoal)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.2px',
    textTransform: 'uppercase',
  },
  metaActions: {
    display: 'flex',
    gap: '8px',
  },
  linkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    color: 'var(--charcoal)',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  panelGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '16px',
    alignItems: 'stretch',
  },
  summaryCard: {
    borderRadius: '12px',
    border: '1px solid var(--cloud)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF8F3 100%)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
  },
  summaryStats: {
    display: 'flex',
    gap: '10px',
  },
  statPill: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    padding: '10px 12px',
    minWidth: '72px',
    textAlign: 'center',
    boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--charcoal)',
    marginBottom: '2px',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--stone)',
    letterSpacing: '0.2px',
  },
  eyebrow: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--stone)',
    marginBottom: '2px',
    fontWeight: 700,
  },
  title: {
    fontSize: '20px',
    color: 'var(--charcoal)',
    margin: 0,
    fontFamily: "'Crimson Pro', Georgia, serif",
  },
  subtitle: {
    margin: 0,
    color: 'var(--stone)',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  peopleRow: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  peopleHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    color: 'var(--stone)',
    fontWeight: 600,
  },
  peopleLabel: {
    fontSize: '13px',
    color: 'var(--charcoal)',
  },
  avatarStack: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  avatarWrapper: {
    borderRadius: '50%',
    boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
  },
  moreAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px dashed var(--cloud)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--stone)',
    fontWeight: 700,
    fontSize: '12px',
  },
  projectsCard: {
    borderRadius: '12px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  projectsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectsTitleRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  projectsTitle: {
    margin: 0,
    color: 'var(--charcoal)',
    fontSize: '18px',
    fontWeight: 800,
  },
  projectsCaption: {
    color: 'var(--stone)',
    fontSize: '12px',
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  projectRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  projectMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start',
  },
  projectName: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--charcoal)',
    margin: 0,
  },
  projectMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    fontSize: '12px',
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid var(--stone)',
    backgroundColor: '#FFFFFF',
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  priorityText: {
    fontSize: '12px',
    color: 'var(--stone)',
  },
  projectRight: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    minWidth: '140px',
  },
  progressBar: {
    height: '8px',
    borderRadius: '999px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, var(--earth) 0%, var(--sage) 100%)',
    transition: 'width 0.3s ease',
  },
  emptyText: {
    color: 'var(--stone)',
    fontSize: '13px',
  },
};

export default PortfolioSpotlight;
