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
  'add_person'
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

    validActions.push({
      ...action,
      projectId: resolvedProject.id,
      projectName: resolvedProject.name
    });
  });

  return { validActions, errors };
}
