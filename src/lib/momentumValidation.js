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
const normalizeProjectName = name =>
  typeof name === 'string'
    ? name.trim()
    : '';

const normalizeProjectRef = ref => {
  if (typeof ref === 'string') {
    return ref.trim();
  }
  return ref;
};

export function resolveMomentumProjectRef(target, projects) {
  if (!target) return null;
  const normalizedTarget = normalizeProjectRef(target);
  const lowerTarget = `${normalizedTarget}`.toLowerCase();
  return projects.find(project =>
    `${project.id}` === `${normalizedTarget}` ||
    normalizeProjectName(project.name).toLowerCase() === lowerTarget
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

  // Track projects that will be created later in the batch so we can reorder dependent actions
  const futureCreatedProjects = new Set();
  actions.forEach(action => {
    if (action?.type === 'create_project') {
      const projectName = normalizeProjectName(action.name || action.projectName);
      if (projectName) {
        futureCreatedProjects.add(projectName.toLowerCase());
      }
    }
  });

  const deferredActions = new Map(); // projectName -> [{ action, idx, projectRef }]

  const processDeferredActions = projectName => {
    const normalized = projectName.toLowerCase();
    const queued = deferredActions.get(normalized) || [];
    deferredActions.delete(normalized);
    queued.forEach(({ action, idx, projectRef }) => {
      handleAction(action, idx, { allowDefer: false, projectRef });
    });
  };

  const handleAction = (action, idx, options = {}) => {
    const { allowDefer = true, projectRef: providedProjectRef } = options;

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
      const projectName = normalizeProjectName(action.name || action.projectName);
      if (!projectName) {
        errors.push(`Action ${idx + 1} (create_project) is missing a name or projectName.`);
        return;
      }
      // Track this project so subsequent actions can reference it
      pendingProjects.set(projectName.toLowerCase(), { name: projectName });
      validActions.push({ ...action, name: projectName, projectName });
      processDeferredActions(projectName);
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

    const projectRef = providedProjectRef ?? normalizeProjectRef(action.projectId ?? action.projectName);
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
        resolvedProject = pendingProject;
      }
    }

    if (!resolvedProject && allowDefer && typeof projectRef === 'string' && futureCreatedProjects.has(projectRef.toLowerCase())) {
      const queue = deferredActions.get(projectRef.toLowerCase()) || [];
      queue.push({ action, idx, projectRef });
      deferredActions.set(projectRef.toLowerCase(), queue);
      return;
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

    validActions.push({
      ...action,
      projectId: resolvedProject.id,
      projectName: resolvedProject.name
    });
  };

  actions.forEach((action, idx) => handleAction(action, idx));

  deferredActions.forEach(queue => {
    queue.forEach(({ action, idx, projectRef }) => {
      const ref = projectRef ?? action.projectName ?? action.projectId ?? 'unknown project';
      errors.push(`Action ${idx + 1} (${action.type}) references project "${ref}" that was scheduled to be created later in the batch, but no valid create_project action was found before validation completed.`);
    });
  });

  return { validActions, errors };
}
