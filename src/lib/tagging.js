export const getAllTags = (people = [], projects = []) => {
  const tags = [];

  people.forEach(person => {
    const personString = `${person.name} (${person.team})`;
    tags.push({ type: 'person', value: person.id, display: personString });
  });

  const allStakeholders = new Set();
  projects.forEach(project => {
    project.stakeholders.forEach(stakeholder => {
      const stakeholderString = `${stakeholder.name} (${stakeholder.team})`;
      const existsInPeople = people.some(
        person => person.name === stakeholder.name && person.team === stakeholder.team
      );
      if (!existsInPeople) {
        allStakeholders.add(stakeholderString);
      }
    });
  });

  allStakeholders.forEach(name => {
    tags.push({ type: 'person', value: name, display: name });
  });

  projects.forEach(project => {
    tags.push({ type: 'project', value: project.id, display: project.name });

    project.plan.forEach(task => {
      tags.push({
        type: 'task',
        value: task.id,
        display: `${project.name} → ${task.title}`,
        projectId: project.id
      });

      task.subtasks.forEach(subtask => {
        tags.push({
          type: 'subtask',
          value: subtask.id,
          display: `${project.name} → ${task.title} → ${subtask.title}`,
          projectId: project.id,
          taskId: task.id
        });
      });
    });
  });

  return tags;
};

export const insertTagAtCursor = ({ text = '', cursorPosition = 0, tagDisplay = '' }) => {
  const textBeforeCursor = text.substring(0, cursorPosition);
  const textAfterCursor = text.substring(cursorPosition);
  const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

  if (lastAtSymbol === -1) {
    return { text, cursorPosition };
  }

  const beforeAt = text.substring(0, lastAtSymbol);
  const tagText = `@${tagDisplay}`;
  const newText = `${beforeAt}${tagText} ${textAfterCursor}`;
  const newCursorPosition = (beforeAt + tagText + ' ').length;

  return { text: newText, cursorPosition: newCursorPosition };
};

export const parseTaggedText = (text) => {
  if (!text) return [];

  const parts = [];
  let currentIndex = 0;

  const combinedRegex = /(?<!\S)@\[([^\]]+)\]\(([^:]+):([^)]+)\)|(?<!\S)@([\w\s\(\),→.'-]+)(?=\s|$|[.!?])/g;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, match.index)
      });
    }

    if (match[1]) {
      parts.push({
        type: 'tag',
        tagType: match[2],
        display: match[1],
        value: match[3]
      });
    } else if (match[4]) {
      parts.push({
        type: 'tag',
        tagType: 'unknown',
        display: match[4],
        value: match[4]
      });
    }

    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex)
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};
