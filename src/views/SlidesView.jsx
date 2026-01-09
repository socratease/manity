import React, { useState } from 'react';
import Slides from '../components/Slides';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { callOpenAIChat } from '../lib/llmClient';

export default function SlidesView() {
  const { projects, setProjects, updateProject } = usePortfolioData();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const generateExecSummary = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setIsGeneratingSummary(true);
    try {
      // Gather recent and upcoming project data
      const recentActivities = project.recentActivity.slice(0, 10).map(a => a.note).join('; ');
      const upcomingTasks = project.plan
        .flatMap(task => task.subtasks)
        .filter(st => {
          const dueDate = new Date(st.dueDate);
          const now = new Date();
          return dueDate > now;
        })
        .slice(0, 10)
        .map(st => st.title)
        .join('; ');

      const prompt = `Based on this project data, write a concise 2-3 sentence executive summary:

Project: ${project.name}
Status: ${project.status}
Priority: ${project.priority}
Recent Activities: ${recentActivities || 'None'}
Upcoming Tasks: ${upcomingTasks || 'None'}

Write a professional executive summary that highlights the project's current state and key activities.`;

      const response = await callOpenAIChat({
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      // Save the generated summary via API
      await updateProject(projectId, {
        executiveUpdate: response.content
      });
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <Slides
      projects={projects}
      setProjects={setProjects}
      onGenerateExecSummary={generateExecSummary}
      isGeneratingSummary={isGeneratingSummary}
      apiBaseUrl={
        import.meta.env.VITE_API_BASE ||
        import.meta.env.VITE_API_BASE_URL ||
        ''
      }
    />
  );
}
