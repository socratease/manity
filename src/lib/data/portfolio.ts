export interface User {
  name: string;
  team: string;
  profilePicture?: string;
}

export interface Activity {
  id: string;
  date: string;
  note: string;
  author: string;
}

export interface Subtask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: User;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: User;
  subtasks: Subtask[];
}

export interface Project {
  id: number | string;
  name: string;
  stakeholders: User[];
  status: 'planning' | 'active' | 'completed' | string;
  priority: 'high' | 'medium' | 'low' | string;
  progress: number;
  lastUpdate: string;
  description: string;
  executiveUpdate?: string;
  startDate?: string;
  targetDate?: string;
  plan: Task[];
  recentActivity: Activity[];
}

const STORAGE_KEY = 'manity.portfolio';

type ImportInput = File | string | null | undefined;

const addIdsToActivities = (activities: Omit<Activity, 'id'>[] | Activity[], prefix: string): Activity[] =>
  activities.map((activity, idx) => ({
    id: 'id' in activity && activity.id ? activity.id : `${prefix}-activity-${idx + 1}`,
    ...activity
  }));

export const defaultPortfolio: Project[] = [
  {
    id: 1,
    name: 'Website Redesign',
    stakeholders: [
      { name: 'Sarah Chen', team: 'Design' },
      { name: 'Marcus Rodriguez', team: 'Development' },
      { name: 'Emma Williams', team: 'Product' }
    ],
    status: 'active',
    priority: 'high',
    progress: 65,
    lastUpdate: 'Completed homepage mockups and user testing',
    description: 'Complete overhaul of company website with focus on improved user experience and modern design standards.',
    executiveUpdate: 'Complete overhaul of company website with focus on improved user experience and modern design standards.',
    startDate: '2025-10-15',
    targetDate: '2025-12-20',
    plan: [
      {
        id: 't1',
        title: 'Discovery & Research',
        status: 'completed',
        dueDate: '2025-11-01',
        completedDate: '2025-11-01',
        subtasks: [
          { id: 't1-1', title: 'Competitive analysis', status: 'completed', dueDate: '2025-10-22', completedDate: '2025-10-22' },
          { id: 't1-2', title: 'User interviews', status: 'completed', dueDate: '2025-10-28', completedDate: '2025-10-28' },
          { id: 't1-3', title: 'Analytics review', status: 'completed', dueDate: '2025-11-01', completedDate: '2025-11-01' }
        ]
      },
      {
        id: 't2',
        title: 'Design Phase',
        status: 'in-progress',
        dueDate: '2025-12-05',
        subtasks: [
          { id: 't2-1', title: 'Wireframes for all pages', status: 'completed', dueDate: '2025-11-20', completedDate: '2025-11-20' },
          { id: 't2-2', title: 'Homepage mockups', status: 'completed', dueDate: '2025-11-28', completedDate: '2025-11-28' },
          { id: 't2-3', title: 'Product page designs', status: 'in-progress', dueDate: '2025-12-03' },
          { id: 't2-4', title: 'Mobile responsive layouts', status: 'todo', dueDate: '2025-12-05' }
        ]
      },
      {
        id: 't3',
        title: 'Development',
        status: 'todo',
        dueDate: '2025-12-20',
        subtasks: [
          { id: 't3-1', title: 'Set up development environment', status: 'todo', dueDate: '2025-12-08' },
          { id: 't3-2', title: 'Build component library', status: 'todo', dueDate: '2025-12-12' },
          { id: 't3-3', title: 'Implement homepage', status: 'todo', dueDate: '2025-12-17' },
          { id: 't3-4', title: 'QA and testing', status: 'todo', dueDate: '2025-12-20' }
        ]
      }
    ],
    recentActivity: addIdsToActivities([
      { date: '2025-11-29T14:30:00', note: 'Received positive feedback from CEO on homepage design direction', author: 'You' },
      { date: '2025-11-28T16:15:00', note: 'Completed homepage mockups and shared with stakeholder group', author: 'You' },
      { date: '2025-11-28T09:00:00', note: 'Sarah suggested we explore darker color palette for contrast', author: 'Sarah Chen' },
      { date: '2025-11-25T11:30:00', note: 'User testing session with 12 participants - 85% positive feedback on navigation', author: 'You' },
      { date: '2025-11-22T15:45:00', note: 'Marcus raised concerns about mobile responsiveness in current mockups', author: 'Marcus Rodriguez' },
      { date: '2025-11-20T10:00:00', note: 'Completed first round of wireframes for all main pages', author: 'You' }
    ], 'p1')
  },
  {
    id: 2,
    name: 'Q4 Marketing Campaign',
    stakeholders: [
      { name: 'Jennifer Liu', team: 'Marketing' },
      { name: 'Alex Thompson', team: 'Creative' }
    ],
    status: 'active',
    priority: 'medium',
    progress: 40,
    lastUpdate: 'Draft content calendar completed, awaiting approval',
    description: 'Multi-channel marketing campaign to drive Q4 sales and brand awareness across social media, email, and paid advertising.',
    executiveUpdate: 'Multi-channel marketing campaign to drive Q4 sales and brand awareness across social media, email, and paid advertising.',
    startDate: '2025-11-01',
    targetDate: '2025-12-31',
    plan: [
      {
        id: 't1',
        title: 'Campaign Strategy',
        status: 'completed',
        dueDate: '2025-11-15',
        completedDate: '2025-11-15',
        subtasks: [
          { id: 't1-1', title: 'Define target audience', status: 'completed', dueDate: '2025-11-05', completedDate: '2025-11-05' },
          { id: 't1-2', title: 'Set campaign goals', status: 'completed', dueDate: '2025-11-10', completedDate: '2025-11-10' },
          { id: 't1-3', title: 'Budget planning', status: 'completed', dueDate: '2025-11-15', completedDate: '2025-11-14' }
        ]
      },
      {
        id: 't2',
        title: 'Content Creation',
        status: 'in-progress',
        dueDate: '2025-12-10',
        subtasks: [
          { id: 't2-1', title: 'Social media content calendar', status: 'completed', dueDate: '2025-11-29', completedDate: '2025-11-29' },
          { id: 't2-2', title: 'Email templates', status: 'in-progress', dueDate: '2025-12-05' },
          { id: 't2-3', title: 'Ad creative development', status: 'todo', dueDate: '2025-12-10' }
        ]
      },
      {
        id: 't3',
        title: 'Launch & Optimization',
        status: 'todo',
        dueDate: '2025-12-31',
        subtasks: [
          { id: 't3-1', title: 'Campaign launch', status: 'todo', dueDate: '2025-12-15' },
          { id: 't3-2', title: 'Monitor performance', status: 'todo', dueDate: '2025-12-25' },
          { id: 't3-3', title: 'A/B testing', status: 'todo', dueDate: '2025-12-31' }
        ]
      }
    ],
    recentActivity: addIdsToActivities([
      { date: '2025-11-29T13:00:00', note: 'Submitted content calendar for review by Jennifer and Alex', author: 'You' },
      { date: '2025-11-27T16:30:00', note: 'Met with marketing team to discuss strategy and timeline alignment', author: 'You' },
      { date: '2025-11-26T10:15:00', note: 'Jennifer approved the social media creative concepts', author: 'Jennifer Liu' },
      { date: '2025-11-24T14:00:00', note: 'Received initial budget estimates from finance team', author: 'You' }
    ], 'p2')
  },
  {
    id: 3,
    name: 'Customer Portal v2',
    stakeholders: [
      { name: 'David Park', team: 'Engineering' },
      { name: 'Lisa Anderson', team: 'Product' },
      { name: 'Tom Harris', team: 'Customer Success' }
    ],
    status: 'planning',
    priority: 'high',
    progress: 15,
    lastUpdate: 'Requirements gathering phase, initial wireframes drafted',
    description: 'Build next generation customer portal with enhanced self-service features, real-time support chat, and personalized dashboard.',
    executiveUpdate: 'Build next generation customer portal with enhanced self-service features, real-time support chat, and personalized dashboard.',
    startDate: '2025-11-15',
    targetDate: '2026-02-28',
    plan: [
      {
        id: 't1',
        title: 'Requirements & Planning',
        status: 'in-progress',
        dueDate: '2025-12-15',
        subtasks: [
          { id: 't1-1', title: 'Stakeholder interviews', status: 'in-progress', dueDate: '2025-12-05' },
          { id: 't1-2', title: 'Technical requirements doc', status: 'todo', dueDate: '2025-12-10' },
          { id: 't1-3', title: 'Architecture design', status: 'todo', dueDate: '2025-12-15' }
        ]
      },
      {
        id: 't2',
        title: 'Design & Prototyping',
        status: 'todo',
        dueDate: '2026-01-15',
        subtasks: [
          { id: 't2-1', title: 'User flows', status: 'todo', dueDate: '2025-12-20' },
          { id: 't2-2', title: 'UI designs', status: 'todo', dueDate: '2026-01-10' },
          { id: 't2-3', title: 'Interactive prototype', status: 'todo', dueDate: '2026-01-15' }
        ]
      }
    ],
    recentActivity: addIdsToActivities([
      { date: '2025-11-29T11:00:00', note: 'Interviewed 5 key customers about pain points with current portal', author: 'You' },
      { date: '2025-11-27T15:00:00', note: 'Product Lead suggested prioritizing mobile experience in v2', author: 'Product Lead' },
      { date: '2025-11-26T09:30:00', note: 'Initial wireframes shared with Customer Success team for feedback', author: 'You' }
    ], 'p3')
  }
];

export const loadPortfolio = (fallback: Project[] = defaultPortfolio): Project[] => {
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Unable to load portfolio data from storage.', error);
  }

  return fallback;
};

export const savePortfolio = (projects: Project[]): void => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('Unable to save portfolio data to storage.', error);
  }
};

export const getInitialPortfolio = (): Project[] => defaultPortfolio;

const normalizeSubtask = (subtask: Partial<Subtask>, idx: number): Subtask => ({
  id: subtask.id ?? `subtask-${idx + 1}`,
  title: typeof subtask.title === 'string' ? subtask.title : 'Untitled Subtask',
  status: subtask.status === 'in-progress' || subtask.status === 'completed' ? subtask.status : 'todo',
  dueDate: subtask.dueDate,
  completedDate: subtask.completedDate,
  assignee: subtask.assignee
});

const normalizeTask = (task: Partial<Task>, idx: number): Task => ({
  id: task.id ?? `task-${idx + 1}`,
  title: typeof task.title === 'string' ? task.title : 'Untitled Task',
  status: task.status === 'in-progress' || task.status === 'completed' ? task.status : 'todo',
  dueDate: task.dueDate,
  completedDate: task.completedDate,
  assignee: task.assignee,
  subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((subtask, subIdx) => normalizeSubtask(subtask, subIdx)) : []
});

const normalizeStakeholder = (stakeholder: Partial<User>, idx: number): User => ({
  name: typeof stakeholder.name === 'string' ? stakeholder.name : `Stakeholder ${idx + 1}`,
  team: typeof stakeholder.team === 'string' ? stakeholder.team : 'Team'
});

const normalizeActivity = (activity: Partial<Activity>, idx: number): Activity => ({
  id: activity.id ?? `activity-${idx + 1}`,
  date: typeof activity.date === 'string' ? activity.date : new Date().toISOString(),
  note: typeof activity.note === 'string' ? activity.note : '',
  author: typeof activity.author === 'string' ? activity.author : 'Unknown'
});

const clampProgress = (progress: unknown): number => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
};

const normalizeProject = (project: Partial<Project>, idx: number): Project => {
  const description = typeof project.description === 'string' ? project.description : '';
  const executiveUpdate = typeof project.executiveUpdate === 'string'
    ? project.executiveUpdate
    : description; // Initialize from description if not set

  return {
    id: project.id ?? idx + 1,
    name: typeof project.name === 'string' ? project.name : `Project ${idx + 1}`,
    stakeholders: Array.isArray(project.stakeholders)
      ? project.stakeholders.map((stakeholder, stakeholderIdx) => normalizeStakeholder(stakeholder, stakeholderIdx))
      : [],
    status: typeof project.status === 'string' ? project.status : 'planning',
    priority: typeof project.priority === 'string' ? project.priority : 'medium',
    progress: clampProgress(project.progress),
    lastUpdate: typeof project.lastUpdate === 'string' ? project.lastUpdate : '',
    description,
    executiveUpdate,
    startDate: project.startDate,
    targetDate: project.targetDate,
    plan: Array.isArray(project.plan) ? project.plan.map((task, taskIdx) => normalizeTask(task, taskIdx)) : [],
    recentActivity: Array.isArray(project.recentActivity)
      ? addIdsToActivities(project.recentActivity.map((activity, actIdx) => normalizeActivity(activity, actIdx)), `p${idx + 1}`)
      : []
  };
};

export const exportPortfolio = (projects: Project[]): string => {
  const normalizedProjects = Array.isArray(projects) ? projects.map((project, idx) => normalizeProject(project, idx)) : [];

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: normalizedProjects
  };

  return JSON.stringify(payload, null, 2);
};

export const importPortfolio = async (fileOrText: ImportInput): Promise<Project[]> => {
  if (!fileOrText) throw new Error('No data provided for import');

  let rawText: string;

  if (typeof File !== 'undefined' && fileOrText instanceof File) {
    rawText = await fileOrText.text();
  } else if (typeof fileOrText === 'string') {
    rawText = fileOrText;
  } else {
    throw new Error('Unsupported import type');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  const projects = Array.isArray((parsed as any)?.projects)
    ? (parsed as any).projects
    : Array.isArray(parsed)
      ? parsed
      : null;

  if (!projects) {
    throw new Error('No projects found in import data');
  }

  return projects.map((project, idx) => normalizeProject(project, idx));
};
