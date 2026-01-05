import React, { useMemo } from 'react';
import ForceDirectedTimeline from '../components/ForceDirectedTimeline';
import { useUIStore } from '../store';
import { usePortfolioData } from '../hooks/usePortfolioData';

export default function TimelineView() {
  const { projects } = usePortfolioData();
  const { timelineView } = useUIStore();

  // Aggregate all tasks with due dates from all projects
  const { tasksWithDueDates, earliestDate, endDate } = useMemo(() => {
    const tasks = [];
    const dueDates = [];
    const candidates = [];
    const rangeEndCandidates = [];

    const addDueDate = (dateValue) => {
      if (!dateValue) return null;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return null;
      dueDates.push(parsed);
      return parsed;
    };

    const addCandidate = (dateValue, targetArray) => {
      if (!dateValue) return;
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        targetArray.push(parsed);
      }
    };

    // Iterate through all projects
    projects.forEach(project => {
      // Process tasks and subtasks
      (project.plan || []).forEach(task => {
        const parsedTaskDueDate = addDueDate(task.dueDate);

        // Add task itself if it has a due date
        if (parsedTaskDueDate) {
          tasks.push({
            id: `${project.id}-task-${task.id}`,
            title: task.title,
            dueDate: parsedTaskDueDate.toISOString(),
            status: task.status || 'todo',
            taskTitle: task.title,
            projectId: project.id,
            projectName: project.name
          });
        }

        // Add subtasks with due dates
        (task.subtasks || []).forEach(subtask => {
          const parsedDueDate = addDueDate(subtask.dueDate);
          if (parsedDueDate) {
            tasks.push({
              id: `${project.id}-subtask-${subtask.id || task.id}-${subtask.title}`,
              title: subtask.title,
              dueDate: parsedDueDate.toISOString(),
              status: subtask.status || 'todo',
              taskTitle: task.title,
              projectId: project.id,
              projectName: project.name
            });
          }
        });
      });

      // Add project dates to candidates
      addCandidate(project.startDate, candidates);
      addCandidate(project.targetDate, candidates);
      addCandidate(project.targetDate, rangeEndCandidates);
    });

    // Add all due dates to candidates
    dueDates.forEach(date => {
      candidates.push(date);
      rangeEndCandidates.push(date);
    });

    const earliestDate = candidates.length > 0
      ? new Date(Math.min(...candidates.map(date => date.getTime())))
      : new Date();

    const latestDate = rangeEndCandidates.length > 0
      ? new Date(Math.max(...rangeEndCandidates.map(date => date.getTime())))
      : new Date(earliestDate);

    const bufferDays = 7;
    const endDate = new Date(latestDate);
    endDate.setDate(endDate.getDate() + bufferDays);

    return {
      tasksWithDueDates: tasks,
      earliestDate: earliestDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }, [projects]);

  if (tasksWithDueDates.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyStateContent}>
          <h3 style={styles.emptyStateTitle}>No Timeline Data</h3>
          <p style={styles.emptyStateText}>
            Add due dates to tasks and subtasks to see them on the timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ForceDirectedTimeline
        tasks={tasksWithDueDates}
        startDate={earliestDate}
        endDate={endDate}
      />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    fontFamily: "'Crimson Pro', Georgia, serif",
  },
  emptyStateContent: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '500px',
  },
  emptyStateTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#3A3631',
    marginBottom: '12px',
  },
  emptyStateText: {
    fontSize: '16px',
    color: '#6B6554',
    lineHeight: '1.6',
  },
};
