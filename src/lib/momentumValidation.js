/**
 * Momentum action validation utilities
 *
 * These functions validate agentic actions before they are applied to projects.
 */

export const supportedMomentumActions = [
  'comment',
  'add_task',
  'update_task',
  'add_subtask',
  'update_subtask',
  'update_project',
  'create_project',
  'add_person',
  'send_email',
  'query_portfolio'
];

/**
 * Resolves a project reference (ID or name) to a project object
 * @param {string|number} target - Project ID or name to resolve
 * @param {Array} projects - Array of project objects to search
 * @returns {Object|null} - Resolved project or null if not found
 */
export function resolveMomentumProjectRef(target, projects) {
  if (!target) return null;
  const lowerTarget = `${target}`.toLowerCase();
  return projects.find(project =>
    `${project.id}` === `${target}` ||
    project.name.toLowerCase() === lowerTarget
  ) || null;
}

/**
 * Validates an array of Momentum actions
 * @param {Array} actions - Actions to validate
 * @param {Array} projects - Current projects for reference resolution
 * @returns {Object} - { validActions, errors }
 */
export function validateThrustActions(actions = [], projects = []) {
  const errors = [];

  if (!Array.isArray(actions)) {
    return { validActions: [], errors: ['Momentum returned an invalid actions payload (not an array).'] };
  }

  const validActions = [];
  // Track projects being created in this batch so subsequent actions can reference them
  const pendingProjects = new Map(); // projectName -> temporary project object
  // Track tasks being created in this batch so subtasks can reference them
  const pendingTasks = new Map(); // projectId -> Map(taskId/taskTitle -> temporary task object)

  actions.forEach((action, idx) => {
    if (!action || typeof action !== 'object') {
      errors.push(`Action ${idx + 1} was not an object.`);
      return;
    }

    if (!action.type) {
      errors.push(`Action ${idx + 1} is missing a type.`);
      return;
    }

    if (!supportedMomentumActions.includes(action.type)) {
      errors.push(`Action ${idx + 1} uses unsupported type "${action.type}".`);
      return;
    }

    // create_project doesn't need a projectId - it creates a new project
    if (action.type === 'create_project') {
      const projectName = action.name || action.projectName;
      if (!projectName) {
        errors.push(`Action ${idx + 1} (create_project) is missing a name or projectName.`);
        return;
      }
      // Track this project so subsequent actions can reference it
      pendingProjects.set(projectName.toLowerCase(), { name: projectName });
      validActions.push(action);
      return;
    }

    if (action.type === 'add_person') {
      const personName = action.name || action.personName;
      if (!personName) {
        errors.push(`Action ${idx + 1} (add_person) is missing a name or personName.`);
        return;
      }
      validActions.push({ ...action, name: personName });
      return;
    }

    if (action.type === 'query_portfolio') {
      const detailLevel = ['summary', 'detailed'].includes(action.detailLevel)
        ? action.detailLevel
        : 'summary';
      const scope = ['portfolio', 'project', 'people'].includes(action.scope)
        ? action.scope
        : action.projectId || action.projectName
          ? 'project'
          : 'portfolio';

      const projectRef = action.projectId ?? action.projectName;
      if (projectRef) {
        const resolvedProject = resolveMomentumProjectRef(projectRef, projects);
        if (!resolvedProject) {
          errors.push(`Action ${idx + 1} (query_portfolio) references unknown project "${projectRef}".`);
          return;
        }

        validActions.push({
          ...action,
          projectId: resolvedProject.id,
          projectName: resolvedProject.name,
          scope,
          detailLevel
        });
        return;
      }

      validActions.push({
        ...action,
        scope,
        detailLevel
      });
      return;
    }

    if (action.type === 'send_email') {
      const recipients = Array.isArray(action.recipients)
        ? action.recipients
        : typeof action.recipients === 'string'
          ? action.recipients.split(',').map(r => r.trim()).filter(Boolean)
          : [];

      if (!recipients.length) {
        errors.push(`Action ${idx + 1} (send_email) is missing recipients.`);
        return;
      }
      if (!action.subject) {
        errors.push(`Action ${idx + 1} (send_email) is missing a subject.`);
        return;
      }
      if (!action.body) {
        errors.push(`Action ${idx + 1} (send_email) is missing a body.`);
        return;
      }

      validActions.push({
        ...action,
        recipients
      });
      return;
    }

    const projectRef = action.projectId ?? action.projectName;
    if (!projectRef) {
      errors.push(`Action ${idx + 1} (${action.type}) is missing a projectId or projectName.`);
      return;
    }

    // Try to resolve from existing projects first
    let resolvedProject = resolveMomentumProjectRef(projectRef, projects);

    // If not found in existing projects, check if it's being created in this batch
    if (!resolvedProject && typeof projectRef === 'string') {
      const pendingProject = pendingProjects.get(projectRef.toLowerCase());
      if (pendingProject) {
        // Allow reference to project being created in same batch
        // The action will be executed after the create_project action
        validActions.push(action);
        return;
      }
    }

    if (!resolvedProject) {
      errors.push(`Action ${idx + 1} (${action.type}) references unknown project "${projectRef}".`);
      return;
    }

    if (action.type === 'comment') {
      const note = (action.note || action.content || action.comment || '').trim();
      if (!note) {
        errors.push(`Action ${idx + 1} (comment) is missing a note/comment body.`);
        return;
      }

      validActions.push({
        ...action,
        note,
        projectId: resolvedProject.id,
        projectName: resolvedProject.name
      });
      return;
    }

    // Track add_task actions for subtask references
    if (action.type === 'add_task') {
      const taskId = action.taskId || action.title;
      const taskTitle = action.title;
      const projectId = resolvedProject?.id || action.projectId || action.projectName;

      if (taskId || taskTitle) {
        if (!pendingTasks.has(projectId)) {
          pendingTasks.set(projectId, new Map());
        }
        const projectTasks = pendingTasks.get(projectId);
        if (taskId) projectTasks.set(taskId.toLowerCase(), { id: taskId, title: taskTitle });
        if (taskTitle) projectTasks.set(taskTitle.toLowerCase(), { id: taskId, title: taskTitle });
      }
    }

    // For add_subtask, validate that the task reference exists
    if (action.type === 'add_subtask') {
      const taskRef = action.taskId || action.taskTitle;
      if (!taskRef) {
        errors.push(`Action ${idx + 1} (add_subtask) is missing a taskId or taskTitle.`);
        return;
      }

      const projectId = resolvedProject?.id || action.projectId || action.projectName;
      const lowerTaskRef = taskRef.toLowerCase();

      // Check if task exists in current projects
      const taskExistsInProject = resolvedProject?.plan?.some(task =>
        `${task.id}` === `${taskRef}` || task.title.toLowerCase() === lowerTaskRef
      );

      // Check if task is being created in this batch
      const pendingProjectTasks = pendingTasks.get(projectId);
      const taskExistsInPending = pendingProjectTasks?.has(lowerTaskRef);

      if (!taskExistsInProject && !taskExistsInPending) {
        // Allow subtask creation anyway - it will be skipped at execution if task doesn't exist
        // This allows the LLM to create tasks and subtasks in the same batch
        // The execution logic will handle the actual task lookup
      }
    }

    validActions.push({
      ...action,
      projectId: resolvedProject?.id,
      projectName: resolvedProject?.name
    });
  });

  return { validActions, errors };
}
