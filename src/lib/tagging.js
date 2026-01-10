export const getAllTags = (people = [], projects = []) => {
  const tags = [];
  const knownPeople = new Set();

  people.forEach(person => {
    const team = person.team || 'Contributor';
    const display = `${person.name} (${team})`;
    knownPeople.add(display);
    tags.push({ type: 'person', value: person.id, display });
  });

  const stakeholderSet = new Set();
  projects.forEach(project => {
    (project.stakeholders || []).forEach(stakeholder => {
      const team = stakeholder.team || 'Contributor';
      const display = `${stakeholder.name} (${team})`;
      if (!knownPeople.has(display)) {
        stakeholderSet.add(display);
      }
    });
  });

  stakeholderSet.forEach(display => {
    tags.push({ type: 'person', value: display, display });
  });

  projects.forEach(project => {
    tags.push({ type: 'project', value: project.id, display: project.name });

    (project.plan || []).forEach(task => {
      tags.push({
        type: 'task',
        value: task.id,
        display: `${project.name} → ${task.title}`,
        projectId: project.id,
      });

      (task.subtasks || []).forEach(subtask => {
        tags.push({
          type: 'subtask',
          value: subtask.id,
          display: `${project.name} → ${task.title} → ${subtask.title}`,
          projectId: project.id,
          taskId: task.id,
        });
      });
    });
  });

  return tags;
};
