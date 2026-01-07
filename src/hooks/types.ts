/**
 * Type definitions for domain hooks
 */

import type { Person, Project, Activity, Task, Subtask } from '../types';

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * usePeople hook return type
 */
export interface UsePeopleReturn {
  people: Person[];
  isLoading: boolean;
  error: string | null;
  findPersonByName: (name: string) => Person | null;
  findPersonById: (id: string) => Person | null;
  personRefForApi: (input: string | Person | null | undefined) => PersonRef | null;
  refreshPeople: () => Promise<void>;
  createPerson: (person: PersonPayload) => Promise<Person>;
  updatePerson: (personId: string, updates: Partial<PersonPayload>) => Promise<Person>;
  deletePerson: (personId: string) => Promise<void>;
}

/**
 * Person payload for API operations
 */
export interface PersonPayload {
  name: string;
  team?: string;
  email?: string | null;
}

/**
 * Person reference for API payloads
 */
export interface PersonRef {
  id?: string | null;
  name: string;
  team?: string;
  email?: string | null;
}

/**
 * useProjects hook options
 */
export interface UseProjectsOptions {
  personRefForApi?: (input: unknown) => PersonRef | null;
}

/**
 * useProjects hook return type
 */
export interface UseProjectsReturn {
  projects: Project[];
  setProjects: (updater: Project[] | ((prev: Project[]) => Project[])) => void;
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  createProject: (project: ProjectPayload) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<ProjectPayload>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  addTask: (projectId: string, task: TaskPayload) => Promise<Project>;
  updateTask: (projectId: string, taskId: string, updates: Partial<TaskPayload>) => Promise<Project>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  addSubtask: (projectId: string, taskId: string, subtask: SubtaskPayload) => Promise<Project>;
  updateSubtask: (projectId: string, taskId: string, subtaskId: string, updates: Partial<SubtaskPayload>) => Promise<Project>;
  deleteSubtask: (projectId: string, taskId: string, subtaskId: string) => Promise<void>;
  addActivity: (projectId: string, activity: ActivityPayload) => Promise<Project>;
  updateActivity: (projectId: string, activityId: string, updates: Partial<ActivityPayload>) => Promise<Project>;
  deleteActivity: (projectId: string, activityId: string) => Promise<void>;
}

/**
 * Project payload for API operations
 */
export interface ProjectPayload {
  name?: string;
  projectName?: string;
  status?: string;
  priority?: string;
  progress?: number;
  description?: string;
  executiveUpdate?: string;
  lastUpdate?: string;
  startDate?: string;
  targetDate?: string;
  stakeholders?: (PersonRef | string)[];
  plan?: TaskPayload[];
  recentActivity?: ActivityPayload[];
}

/**
 * Task payload for API operations
 */
export interface TaskPayload {
  id?: string;
  title: string;
  status?: string;
  dueDate?: string | null;
  completedDate?: string | null;
  assignee?: PersonRef | string | null;
  assigneeId?: string | null;
  subtasks?: SubtaskPayload[];
}

/**
 * Subtask payload for API operations
 */
export interface SubtaskPayload {
  id?: string;
  title: string;
  status?: string;
  dueDate?: string | null;
  completedDate?: string | null;
  assignee?: PersonRef | string | null;
  assigneeId?: string | null;
}

/**
 * Activity payload for API operations
 */
export interface ActivityPayload {
  id?: string;
  date?: string;
  note: string;
  author?: string;
  authorId?: string | null;
  authorPerson?: PersonRef | null;
  taskContext?: string | null;
}

/**
 * Email settings stored in localStorage
 */
export interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  fromAddress: string;
  useTLS: boolean;
}

/**
 * useEmailSettings hook return type
 */
export interface UseEmailSettingsReturn {
  emailSettings: EmailSettings;
  isSending: boolean;
  error: string | null;
  refreshEmailSettings: () => EmailSettings;
  saveEmailSettings: (settings: EmailSettings) => EmailSettings;
  sendEmail: (options: SendEmailOptions) => Promise<unknown>;
}

/**
 * Send email options
 */
export interface SendEmailOptions {
  recipients: string[];
  subject: string;
  body: string;
}

/**
 * useDataExport hook options
 */
export interface UseDataExportOptions {
  onProjectsImported?: (projects: Project[]) => void;
}

/**
 * useDataExport hook return type
 */
export interface UseDataExportReturn {
  isExporting: boolean;
  isImporting: boolean;
  error: string | null;
  handleExport: (projectId?: string) => void;
  handleImport: (fileOrText: File | string, mode?: 'replace' | 'merge') => Promise<Project[]>;
}
