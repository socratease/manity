/**
 * Agent Context Helpers
 *
 * Utility functions for resolving projects, tasks, people, and other entities.
 * These are shared across all tools.
 */

import type {
  Project,
  Task,
  Person,
  Activity,
  Stakeholder,
  StakeholderEntry,
  ToolContextHelpers,
} from '../types';

/**
 * Resolve a project by ID or name from a list of projects.
 */
export function resolveProject(
  target: string | number | undefined,
  projects: Project[],
  projectLookup: Map<string, string | number>
): Project | null {
  if (!target) return null;

  const normalizedTarget = `${target}`.toLowerCase();
  const mappedId = projectLookup.get(normalizedTarget);
  const lookupTarget = mappedId || target;
  const lowerTarget = `${lookupTarget}`.toLowerCase();

  return (
    projects.find(
      p => `${p.id}` === `${lookupTarget}` || p.name.toLowerCase() === lowerTarget
    ) || null
  );
}

/**
 * Resolve a task within a project by ID or title.
 */
export function resolveTask(
  project: Project | null,
  target: string | undefined
): Task | null {
  if (!project || !target) return null;

  const lowerTarget = `${target}`.toLowerCase();
  return (
    project.plan.find(
      task => `${task.id}` === `${target}` || task.title.toLowerCase() === lowerTarget
    ) || null
  );
}

/**
 * Resolve a subtask within a task by ID or title.
 * Reuses resolveTask by treating subtasks as a plan.
 */
export function resolveSubtask(
  task: Task | null,
  target: string | undefined
): Task | null {
  if (!task || !target) return null;

  const lowerTarget = `${target}`.toLowerCase();
  const subtasks = task.subtasks || [];
  return (
    subtasks.find(
      st => `${st.id}` === `${target}` || st.title.toLowerCase() === lowerTarget
    ) as Task | null
  ) || null;
}

/**
 * Find a person by name (case-insensitive).
 */
export function findPersonByName(name: string, people: Person[]): Person | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return people.find(person => person.name?.toLowerCase() === lower) || null;
}

/**
 * Deep clone a project to allow safe mutations.
 */
export function cloneProjectDeep(project: Project): Project {
  return {
    ...project,
    stakeholders: project.stakeholders.map(s => ({ ...s })),
    plan: project.plan.map(task => ({
      ...task,
      subtasks: (task.subtasks || []).map(subtask => ({ ...subtask })),
      assignee: task.assignee ? { ...task.assignee } : null,
    })),
    recentActivity: project.recentActivity.map(a => ({ ...a })),
  };
}

/**
 * Generate a unique activity ID.
 */
export function generateActivityId(): string {
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique task ID.
 */
export function generateTaskId(): string {
  return `ai-task-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique subtask ID.
 */
export function generateSubtaskId(): string {
  return `ai-subtask-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique project ID.
 */
export function generateProjectId(): string {
  return `ai-project-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Sync project activity - updates lastUpdate based on most recent activity.
 */
export function syncProjectActivity(
  project: Project,
  newActivities?: Activity[]
): Project {
  const activities = newActivities || project.recentActivity;
  const lastActivity = activities[0];

  return {
    ...project,
    recentActivity: activities,
    lastUpdate: lastActivity?.date || project.lastUpdate,
  };
}

/**
 * Normalize a single stakeholder entry.
 */
export function normalizeStakeholderEntry(
  entry: string | StakeholderEntry | Stakeholder
): Stakeholder | null {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const name = entry.trim();
    if (!name) return null;
    return { name, team: undefined };
  }

  if (typeof entry === 'object' && entry.name) {
    return {
      name: entry.name.trim(),
      team: entry.team,
      email: 'email' in entry ? entry.email : undefined,
    };
  }

  return null;
}

/**
 * Normalize a list of stakeholder entries.
 */
export function normalizeStakeholderList(
  stakeholders: (string | StakeholderEntry | Stakeholder)[]
): Stakeholder[] {
  const seen = new Set<string>();
  const result: Stakeholder[] = [];

  for (const entry of stakeholders) {
    const normalized = normalizeStakeholderEntry(entry);
    if (normalized && !seen.has(normalized.name.toLowerCase())) {
      seen.add(normalized.name.toLowerCase());
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Describe a due date for human-readable display.
 */
export function describeDueDate(date: string | undefined): string {
  if (!date) return 'no due date set';
  try {
    return `due ${new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
  } catch {
    return 'no due date set';
  }
}

/**
 * Build a project lookup map for fast resolution.
 */
export function buildProjectLookup(
  projects: Project[]
): Map<string, string | number> {
  const lookup = new Map<string, string | number>();

  for (const project of projects) {
    lookup.set(`${project.id}`.toLowerCase(), project.id);
    lookup.set(project.name.toLowerCase(), project.id);
  }

  return lookup;
}

/**
 * Create a ToolContextHelpers object from state.
 */
export function createHelpers(
  projects: Project[],
  projectLookup: Map<string, string | number>,
  people: Person[],
  syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project,
  normalizeStakeholderListFn?: (stakeholders: StakeholderEntry[]) => Stakeholder[]
): ToolContextHelpers {
  return {
    resolveProject: (target) => resolveProject(target, projects, projectLookup),
    resolveTask: (project, target) => resolveTask(project, target),
    findPersonByName: (name) => findPersonByName(name, people),
    cloneProjectDeep,
    generateActivityId,
    syncProjectActivity: syncProjectActivityFn || syncProjectActivity,
    normalizeStakeholderList: normalizeStakeholderListFn || normalizeStakeholderList,
    describeDueDate,
  };
}
