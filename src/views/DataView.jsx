import React from 'react';
import DataPage from '../components/DataPage';
import { usePortfolioData } from '../hooks/usePortfolioData';

export default function DataView() {
  const {
    projects,
    people,
    updateProject,
    deleteProject,
    updateTask,
    deleteTask,
    updateSubtask,
    deleteSubtask,
    updateActivity,
    deleteActivity,
    updatePerson,
    deletePerson
  } = usePortfolioData();

  return (
    <DataPage
      projects={projects}
      people={people}
      onUpdateProject={updateProject}
      onDeleteProject={deleteProject}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
      onUpdateSubtask={updateSubtask}
      onDeleteSubtask={deleteSubtask}
      onUpdateActivity={updateActivity}
      onDeleteActivity={deleteActivity}
      onUpdatePerson={updatePerson}
      onDeletePerson={deletePerson}
    />
  );
}
