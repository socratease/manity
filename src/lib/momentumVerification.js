export function findProjectSnapshot(projects = [], reference) {
  if (!reference) return null;
  const normalized = `${reference}`.toLowerCase();
  return projects.find(project => `${project.id}`.toLowerCase() === normalized || project.name.toLowerCase() === normalized) || null;
}

function findTaskSnapshot(project, reference) {
  if (!project || !reference) return null;
  const normalized = `${reference}`.toLowerCase();
  return (project.plan || []).find(task => `${task.id}`.toLowerCase() === normalized || (task.title || '').toLowerCase() === normalized) || null;
}

function findSubtaskSnapshot(task, reference) {
  if (!task || !reference) return null;
  const normalized = `${reference}`.toLowerCase();
  return (task.subtasks || []).find(subtask => `${subtask.id}`.toLowerCase() === normalized || (subtask.title || '').toLowerCase() === normalized) || null;
}

function verifyProjectFields(action, project) {
  const issues = [];
  if (!project) return ['Project not found after action.'];

  if (action.name && project.name !== action.name) {
    issues.push(`Expected name "${action.name}", found "${project.name}".`);
  }
  if (action.status && project.status !== action.status) {
    issues.push(`Expected status ${action.status}, found ${project.status}.`);
  }
  if (action.priority && project.priority !== action.priority) {
    issues.push(`Expected priority ${action.priority}, found ${project.priority}.`);
  }
  if (typeof action.progress === 'number' && project.progress !== action.progress) {
    issues.push(`Expected progress ${action.progress}, found ${project.progress}.`);
  }
  if (action.targetDate && project.targetDate !== action.targetDate) {
    issues.push(`Expected target date ${action.targetDate}, found ${project.targetDate || 'unset'}.`);
  }
  if (action.description && project.description !== action.description) {
    issues.push('Project description did not match the requested value.');
  }

  return issues;
}

function verifyTaskFields(action, task) {
  const issues = [];
  if (!task) return ['Task not found after action.'];

  if (action.title && task.title !== action.title) {
    issues.push(`Expected title "${action.title}", found "${task.title}".`);
  }
  if (action.status && task.status !== action.status) {
    issues.push(`Expected status ${action.status}, found ${task.status}.`);
  }
  if (action.dueDate && task.dueDate !== action.dueDate) {
    issues.push(`Expected due date ${action.dueDate}, found ${task.dueDate || 'unset'}.`);
  }
  if (action.completedDate && task.completedDate !== action.completedDate) {
    issues.push(`Expected completion date ${action.completedDate}, found ${task.completedDate || 'unset'}.`);
  }
  if (action.assignee) {
    const expectedAssignee = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
    const foundAssignee = task.assignee?.name;
    if (expectedAssignee && expectedAssignee !== foundAssignee) {
      issues.push(`Expected assignee ${expectedAssignee}, found ${foundAssignee || 'unassigned'}.`);
    }
  }

  return issues;
}

function verifySubtaskFields(action, subtask) {
  const issues = [];
  if (!subtask) return ['Subtask not found after action.'];

  if (action.subtaskTitle && subtask.title !== action.subtaskTitle && action.title && subtask.title !== action.title) {
    issues.push(`Expected subtask title "${action.subtaskTitle || action.title}", found "${subtask.title}".`);
  }
  if (action.status && subtask.status !== action.status) {
    issues.push(`Expected status ${action.status}, found ${subtask.status}.`);
  }
  if (action.dueDate && subtask.dueDate !== action.dueDate) {
    issues.push(`Expected due date ${action.dueDate}, found ${subtask.dueDate || 'unset'}.`);
  }
  if (action.completedDate && subtask.completedDate !== action.completedDate) {
    issues.push(`Expected completion date ${action.completedDate}, found ${subtask.completedDate || 'unset'}.`);
  }
  if (action.assignee) {
    const expectedAssignee = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
    const foundAssignee = subtask.assignee?.name;
    if (expectedAssignee && expectedAssignee !== foundAssignee) {
      issues.push(`Expected assignee ${expectedAssignee}, found ${foundAssignee || 'unassigned'}.`);
    }
  }

  return issues;
}

function verifyCommentAction(action, project) {
  if (!project) return ['Project not found after action.'];
  const targetNote = (action.note || action.content || action.comment || '').trim();
  if (!targetNote) return [];
  const match = (project.recentActivity || []).some(activity => activity.note?.includes(targetNote));
  return match ? [] : ['Comment was not found in project activity.'];
}

function verifySendEmail(actionResult) {
  if (!actionResult) return ['No action result recorded for email.'];
  if (actionResult.error) return [`Email reported failure: ${actionResult.error}`];
  if (/failed/i.test(actionResult.label || '')) return ['Email action label indicates failure.'];
  return [];
}

function normalizeStakeholderNames(action) {
  const raw = Array.isArray(action.stakeholders)
    ? action.stakeholders
    : typeof action.stakeholders === 'string'
      ? action.stakeholders.split(',').map(name => name.trim()).filter(Boolean)
      : [];

  return raw
    .map(entry => typeof entry === 'string' ? entry : entry?.name)
    .filter(Boolean)
    .map(name => name.toLowerCase());
}

function verifyStakeholderAdditions(action, project) {
  if (!project) return ['Project not found after action.'];
  const expectedNames = normalizeStakeholderNames(action);
  if (expectedNames.length === 0) return ['No stakeholder names provided for verification.'];
  const projectNames = (project.stakeholders || []).map(s => s.name.toLowerCase());
  const missing = expectedNames.filter(name => !projectNames.includes(name));
  return missing.length > 0
    ? [`Missing stakeholders on project: ${missing.join(', ')}.`]
    : [];
}

function buildVerificationResult(discrepancies) {
  if (!discrepancies || discrepancies.length === 0) {
    return { status: 'passed', discrepancies: [] };
  }
  return { status: 'failed', discrepancies };
}

export function verifyThrustActions(actions = [], previousProjects = [], updatedProjects = [], actionResults = []) {
  const perAction = actions.map((action, idx) => {
    const result = actionResults[idx];

    // If the action was skipped or failed before execution, mark verification as skipped.
    if (!result || result.label?.toLowerCase().includes('skipped')) {
      return { status: 'skipped', discrepancies: ['Action was skipped before verification.'] };
    }

    const projectRef = action.projectId || action.projectName;
    const project = findProjectSnapshot(updatedProjects, projectRef);

    switch (action.type) {
      case 'create_project': {
        const createdProject = project || findProjectSnapshot(updatedProjects, action.name || action.projectName);
        return buildVerificationResult(verifyProjectFields(action, createdProject));
      }
      case 'update_project': {
        return buildVerificationResult(verifyProjectFields(action, project));
      }
      case 'add_stakeholders': {
        return buildVerificationResult(verifyStakeholderAdditions(action, project));
      }
      case 'add_task': {
        if (!project) return buildVerificationResult(['Project not found after action.']);
        const candidateTask = findTaskSnapshot(project, action.taskId) ||
          (project.plan || []).find(task => task.title === (action.title || action.name));
        const discrepancies = candidateTask ? [] : ['Task was not added to the project.'];
        return buildVerificationResult(discrepancies);
      }
      case 'update_task': {
        const task = project ? findTaskSnapshot(project, action.taskId || action.taskTitle) : null;
        return buildVerificationResult(verifyTaskFields(action, task));
      }
      case 'add_subtask': {
        const parentTask = project ? findTaskSnapshot(project, action.taskId || action.taskTitle) : null;
        if (!parentTask) {
          return buildVerificationResult(['Parent task not found after action.']);
        }
        const subtask = findSubtaskSnapshot(parentTask, action.subtaskId) ||
          (parentTask.subtasks || []).find(st => st.title === (action.subtaskTitle || action.title));
        const discrepancies = subtask ? [] : ['Subtask was not added to the task.'];
        return buildVerificationResult(discrepancies);
      }
      case 'update_subtask': {
        const parentTask = project ? findTaskSnapshot(project, action.taskId || action.taskTitle) : null;
        const subtask = parentTask ? findSubtaskSnapshot(parentTask, action.subtaskId || action.subtaskTitle) : null;
        return buildVerificationResult(verifySubtaskFields(action, subtask));
      }
      case 'comment': {
        return buildVerificationResult(verifyCommentAction(action, project));
      }
      case 'send_email': {
        return buildVerificationResult(verifySendEmail(result));
      }
      case 'query_portfolio':
        return { status: 'passed', discrepancies: [] };
      default:
        return { status: 'skipped', discrepancies: ['No verification implemented for this action type.'] };
    }
  });

  const discrepancies = perAction.flatMap((entry, idx) =>
    entry.status === 'failed'
      ? entry.discrepancies.map(desc => `Action ${idx + 1}: ${desc}`)
      : []
  );

  return {
    perAction,
    discrepancies,
    hasFailures: discrepancies.length > 0,
    summary: discrepancies.length === 0
      ? 'Verification passed for all actions.'
      : `Verification failed for ${discrepancies.length} item(s).`
  };
}
