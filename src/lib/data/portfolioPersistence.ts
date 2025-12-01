const STORAGE_KEY = 'manity-portfolio';

const ensureString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const ensureNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

const ensureArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? value as T[] : [];

const normalizeSubtask = (subtask: any, index: number, taskId: string) => ({
  id: ensureString(subtask?.id, `${taskId}-subtask-${index + 1}`),
  title: ensureString(subtask?.title, `Subtask ${index + 1}`),
  status: ensureString(subtask?.status, 'todo'),
  dueDate: ensureString(subtask?.dueDate),
  completedDate: ensureString(subtask?.completedDate),
});

const normalizeTask = (task: any, index: number, projectId: string) => {
  const taskId = ensureString(task?.id, `${projectId}-task-${index + 1}`);
  const subtasks = ensureArray(task?.subtasks).map((sub, subIdx) =>
    normalizeSubtask(sub, subIdx, taskId)
  );

  return {
    id: taskId,
    title: ensureString(task?.title, `Task ${index + 1}`),
    status: ensureString(task?.status, 'todo'),
    dueDate: ensureString(task?.dueDate),
    completedDate: ensureString(task?.completedDate),
    subtasks,
  };
};

const normalizeActivity = (activity: any, index: number, projectId: string) => ({
  id: ensureString(activity?.id, `${projectId}-activity-${index + 1}`),
  date: ensureString(activity?.date),
  note: ensureString(activity?.note, 'Update'),
  author: ensureString(activity?.author, 'Unknown'),
});

const normalizeStakeholder = (stakeholder: any, index: number) => ({
  name: ensureString(stakeholder?.name, `Stakeholder ${index + 1}`),
  team: ensureString(stakeholder?.team, 'Team'),
});

const normalizeProject = (project: any, index: number) => {
  const projectId = ensureString(project?.id, `project-${index + 1}`);
  const plan = ensureArray(project?.plan).map((task, taskIndex) =>
    normalizeTask(task, taskIndex, projectId)
  );

  const stakeholders = ensureArray(project?.stakeholders).map((stakeholder, stakeholderIndex) =>
    normalizeStakeholder(stakeholder, stakeholderIndex)
  );

  const recentActivity = ensureArray(project?.recentActivity).map((activity, activityIndex) =>
    normalizeActivity(activity, activityIndex, projectId)
  );

  return {
    id: projectId,
    name: ensureString(project?.name, `Project ${index + 1}`),
    stakeholders,
    status: ensureString(project?.status, 'planning'),
    priority: ensureString(project?.priority, 'medium'),
    progress: Math.min(100, Math.max(0, ensureNumber(project?.progress, 0))),
    lastUpdate: ensureString(project?.lastUpdate),
    description: ensureString(project?.description),
    startDate: ensureString(project?.startDate),
    targetDate: ensureString(project?.targetDate),
    plan,
    recentActivity,
  };
};

const normalizePortfolio = (raw: any) => {
  const projects = Array.isArray(raw?.projects) ? raw.projects : Array.isArray(raw) ? raw : [];
  if (!projects.length) {
    throw new Error('Portfolio must include at least one project.');
  }

  return projects.map((project, index) => normalizeProject(project, index));
};

export const loadPortfolio = (fallback: any) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return structuredClone(fallback);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(fallback);

    const parsed = JSON.parse(stored);
    return normalizePortfolio(parsed);
  } catch (error) {
    console.warn('Unable to load stored portfolio, falling back to defaults.', error);
    try {
      return structuredClone(fallback);
    } catch {
      return JSON.parse(JSON.stringify(fallback));
    }
  }
};

export const savePortfolio = (portfolio: any) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  } catch (error) {
    console.warn('Unable to persist portfolio to storage.', error);
  }
};

export const exportPortfolio = (portfolio: any) => {
  const normalized = normalizePortfolio({ projects: portfolio });
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: normalized,
  };
  return JSON.stringify(payload, null, 2);
};

export const importPortfolio = async (fileOrString: File | string) => {
  let content: string;

  if (typeof fileOrString === 'string') {
    content = fileOrString;
  } else if (typeof File !== 'undefined' && fileOrString instanceof File) {
    content = await fileOrString.text();
  } else {
    throw new Error('Unsupported import source.');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('The selected file is not valid JSON.');
  }

  const normalized = normalizePortfolio(parsed.projects ? parsed : { projects: parsed });
  savePortfolio(normalized);
  return normalized;
};
