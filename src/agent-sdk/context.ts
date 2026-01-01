/**
 * Tool Execution Context
 *
 * Provides a context for tools to access state and track deltas.
 * Uses a singleton pattern that gets set before agent execution.
 */

import type {
  Delta,
  Project,
  Task,
  Subtask,
  Person,
  Stakeholder,
  StakeholderEntry,
  Activity,
} from '../agent/types';
import type { ToolServices } from './types';

/**
 * Context available to tools during execution
 */
export interface ToolExecutionContext {
  // State
  projects: Project[];
  workingProjects: Project[];
  people: Person[];
  loggedInUser: string;

  // Project lookup map
  projectLookup: Map<string, string | number>;

  // Services
  services: ToolServices;

  // Helpers
  resolveProject: (target: string | number | undefined) => Project | null;
  resolveTask: (project: Project | null, target: string | undefined) => Task | null;
  resolveSubtask: (task: Task | null, target: string | undefined) => Subtask | null;
  findPersonByName: (name: string) => Person | null;
  generateActivityId: () => string;
  generateTaskId: () => string;
  generateSubtaskId: () => string;
  cloneProjectDeep: (project: Project) => Project;
  syncProjectActivity: (project: Project, activities?: Activity[]) => Project;
  normalizeStakeholderList: (stakeholders: StakeholderEntry[]) => Stakeholder[];
  describeDueDate: (date: string | undefined) => string;

  // Delta tracking
  trackDelta: (delta: Delta) => void;
  trackDeltas: (deltas: Delta[]) => void;
  getDeltas: () => Delta[];
  clearDeltas: () => void;

  // Entity tracking
  trackUpdatedEntity: (id: string | number) => void;
  getUpdatedEntityIds: () => (string | number)[];
}

// Singleton context
let currentContext: ToolExecutionContext | null = null;

/**
 * Set the current tool execution context
 */
export function setToolContext(ctx: ToolExecutionContext): void {
  currentContext = ctx;
}

/**
 * Get the current tool execution context
 * Throws if not initialized
 */
export function getToolContext(): ToolExecutionContext {
  if (!currentContext) {
    throw new Error('Tool context not initialized. Call setToolContext before executing tools.');
  }
  return currentContext;
}

/**
 * Clear the current tool context
 */
export function clearToolContext(): void {
  currentContext = null;
}

/**
 * Check if a context is currently set
 */
export function hasToolContext(): boolean {
  return currentContext !== null;
}

/**
 * Build a project lookup map for name/ID resolution
 */
export function buildProjectLookup(projects: Project[]): Map<string, string | number> {
  const lookup = new Map<string, string | number>();
  for (const project of projects) {
    // Map by ID
    lookup.set(String(project.id), project.id);
    lookup.set(String(project.id).toLowerCase(), project.id);

    // Map by name (case-insensitive)
    lookup.set(project.name.toLowerCase(), project.id);

    // Map by name with common variations
    const normalized = project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    lookup.set(normalized, project.id);
  }
  return lookup;
}

/**
 * Deep clone a project
 */
export function cloneProjectDeep(project: Project): Project {
  return JSON.parse(JSON.stringify(project));
}

/**
 * Create a full tool execution context
 */
export function createToolExecutionContext(
  projects: Project[],
  people: Person[],
  loggedInUser: string,
  services: ToolServices
): ToolExecutionContext {
  const workingProjects = projects.map(cloneProjectDeep);
  const projectLookup = buildProjectLookup(workingProjects);
  const deltas: Delta[] = [];
  const updatedEntityIds = new Set<string | number>();

  // Resolve project by ID or name
  const resolveProject = (target: string | number | undefined): Project | null => {
    if (target === undefined || target === null) return null;
    const key = String(target).toLowerCase();
    const projectId = projectLookup.get(key);
    if (!projectId) return null;
    return workingProjects.find(p => p.id === projectId) || null;
  };

  // Resolve task within a project
  const resolveTask = (project: Project | null, target: string | undefined): Task | null => {
    if (!project || !target) return null;
    const normalizedTarget = target.toLowerCase();
    return project.plan.find(
      t => t.id === target ||
           t.id?.toLowerCase() === normalizedTarget ||
           t.title.toLowerCase() === normalizedTarget ||
           t.title.toLowerCase().includes(normalizedTarget)
    ) || null;
  };

  // Resolve subtask within a task
  const resolveSubtask = (task: Task | null, target: string | undefined): Subtask | null => {
    if (!task || !target) return null;
    const normalizedTarget = target.toLowerCase();
    return task.subtasks?.find(
      st => st.id === target ||
            st.id?.toLowerCase() === normalizedTarget ||
            st.title.toLowerCase() === normalizedTarget ||
            st.title.toLowerCase().includes(normalizedTarget)
    ) || null;
  };

  // Find person by name
  const findPersonByName = (name: string): Person | null => {
    if (!name) return null;
    const normalized = name.toLowerCase().trim();
    return people.find(p => p.name.toLowerCase() === normalized) || null;
  };

  // Generate unique IDs
  const generateActivityId = () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Sync project activity
  const syncProjectActivity = (project: Project, activities?: Activity[]): Project => {
    if (activities) {
      project.recentActivity = activities;
    }
    project.recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (project.recentActivity.length > 0) {
      project.lastUpdate = project.recentActivity[0].note;
    }
    return project;
  };

  // Normalize stakeholders
  const normalizeStakeholderList = (stakeholders: StakeholderEntry[]): Stakeholder[] => {
    return stakeholders.map(s => ({
      name: s.name,
      team: s.team || '',
      email: undefined,
    }));
  };

  // Describe due date
  const describeDueDate = (date: string | undefined): string => {
    if (!date) return 'No due date';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return {
    projects,
    workingProjects,
    people,
    loggedInUser,
    projectLookup,
    services,

    // Helpers
    resolveProject,
    resolveTask,
    resolveSubtask,
    findPersonByName,
    generateActivityId,
    generateTaskId,
    generateSubtaskId,
    cloneProjectDeep,
    syncProjectActivity,
    normalizeStakeholderList,
    describeDueDate,

    // Delta tracking
    trackDelta: (delta) => deltas.push(delta),
    trackDeltas: (ds) => deltas.push(...ds),
    getDeltas: () => [...deltas],
    clearDeltas: () => { deltas.length = 0; },

    // Entity tracking
    trackUpdatedEntity: (id) => updatedEntityIds.add(id),
    getUpdatedEntityIds: () => Array.from(updatedEntityIds),
  };
}
