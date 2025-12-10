import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Mail,
  Users,
  Briefcase,
  MessageCircle,
  ChevronRight,
  Edit2,
  Check,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react';

const SAMPLE_PEOPLE = [
  { id: 'p1', name: 'Sarah Chen', team: 'Engineering', email: 'sarah@company.com' },
  { id: 'p2', name: 'Marcus Johnson', team: 'Design', email: 'marcus@company.com' },
  { id: 'p3', name: 'Elena Rodriguez', team: 'Product', email: 'elena@company.com' },
  { id: 'p4', name: 'James Wilson', team: 'Engineering', email: 'james@company.com' },
  { id: 'p5', name: 'Aisha Patel', team: 'Marketing', email: 'aisha@company.com' },
  { id: 'p6', name: 'David Kim', team: 'Engineering', email: 'david@company.com' },
  { id: 'p7', name: 'Rachel Thompson', team: 'Design', email: 'rachel@company.com' },
  { id: 'p8', name: 'Chris Graves', team: 'Admin', email: 'chris@company.com' },
  { id: 'p9', name: 'Nina Foster', team: 'Product', email: 'nina@company.com' },
  { id: 'p10', name: 'Alex Rivera', team: 'Sales', email: 'alex@company.com' }
];

const SAMPLE_PROJECTS = [
  {
    id: 'proj1',
    name: 'Mobile App Redesign',
    status: 'active',
    priority: 'high',
    stakeholders: [
      { name: 'Sarah Chen' },
      { name: 'Marcus Johnson' },
      { name: 'Elena Rodriguez' },
      { name: 'Rachel Thompson' }
    ],
    recentActivity: [
      { id: 'a1', author: 'Sarah Chen', note: 'Completed the new authentication flow', date: new Date(Date.now() - 86400000).toISOString() },
      { id: 'a2', author: 'Marcus Johnson', note: 'Updated design system components', date: new Date(Date.now() - 172800000).toISOString() },
      { id: 'a3', author: 'Elena Rodriguez', note: 'Reviewed sprint backlog priorities', date: new Date(Date.now() - 259200000).toISOString() }
    ]
  },
  {
    id: 'proj2',
    name: 'API Infrastructure',
    status: 'active',
    priority: 'high',
    stakeholders: [
      { name: 'Sarah Chen' },
      { name: 'James Wilson' },
      { name: 'David Kim' },
      { name: 'Chris Graves' }
    ],
    recentActivity: [
      { id: 'a4', author: 'James Wilson', note: 'Deployed new caching layer', date: new Date(Date.now() - 43200000).toISOString() },
      { id: 'a5', author: 'David Kim', note: 'Fixed rate limiting issues', date: new Date(Date.now() - 129600000).toISOString() }
    ]
  },
  {
    id: 'proj3',
    name: 'Marketing Campaign Q1',
    status: 'active',
    priority: 'medium',
    stakeholders: [
      { name: 'Aisha Patel' },
      { name: 'Elena Rodriguez' },
      { name: 'Alex Rivera' },
      { name: 'Marcus Johnson' }
    ],
    recentActivity: [
      { id: 'a6', author: 'Aisha Patel', note: 'Finalized campaign creative assets', date: new Date(Date.now() - 21600000).toISOString() },
      { id: 'a7', author: 'Alex Rivera', note: 'Updated sales enablement docs', date: new Date(Date.now() - 345600000).toISOString() }
    ]
  },
  {
    id: 'proj4',
    name: 'Customer Portal',
    status: 'planning',
    priority: 'medium',
    stakeholders: [
      { name: 'Nina Foster' },
      { name: 'Rachel Thompson' },
      { name: 'David Kim' },
      { name: 'Chris Graves' }
    ],
    recentActivity: [
      { id: 'a8', author: 'Nina Foster', note: 'Completed requirements gathering', date: new Date(Date.now() - 518400000).toISOString() },
      { id: 'a9', author: 'Rachel Thompson', note: 'Created initial wireframes', date: new Date(Date.now() - 604800000).toISOString() }
    ]
  },
  {
    id: 'proj5',
    name: 'Data Analytics Dashboard',
    status: 'active',
    priority: 'high',
    stakeholders: [
      { name: 'James Wilson' },
      { name: 'Nina Foster' },
      { name: 'Elena Rodriguez' }
    ],
    recentActivity: [
      { id: 'a10', author: 'James Wilson', note: 'Implemented real-time data pipeline', date: new Date(Date.now() - 64800000).toISOString() }
    ]
  },
  {
    id: 'proj6',
    name: 'Brand Refresh',
    status: 'completed',
    priority: 'low',
    stakeholders: [
      { name: 'Marcus Johnson' },
      { name: 'Aisha Patel' },
      { name: 'Chris Graves' }
    ],
    recentActivity: [
      { id: 'a11', author: 'Marcus Johnson', note: 'Delivered final brand guidelines', date: new Date(Date.now() - 1209600000).toISOString() }
    ]
  }
];

const PeopleGraph = ({
  people: propPeople = [],
  projects: propProjects = [],
  onUpdatePerson,
  onDeletePerson,
  onViewProject
}) => {
  const people = propPeople.length > 0 ? propPeople : SAMPLE_PEOPLE;
  const projects = propProjects.length > 0 ? propProjects : SAMPLE_PROJECTS;
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', team: '', email: '' });

  const teamColors = useMemo(() => {
    const baseColors = new Map([
      ['Admin', '#8B6F47'],
      ['Engineering', '#7A9B76'],
      ['Design', '#D67C5C'],
      ['Product', '#E8A75D'],
      ['Marketing', '#9B7AB7'],
      ['Sales', '#5BA3B0'],
      ['Operations', '#B08B7A'],
      ['Contributor', '#6B6554']
    ]);

    const palette = ['#5BA3B0', '#7A9B76', '#D67C5C', '#E8A75D', '#9B7AB7', '#B08B7A', '#4C7A9F', '#A3B65C', '#C45C9B'];

    const teamsInData = Array.from(new Set(people.map(person => person.team || 'Contributor')));
    let paletteIndex = 0;

    const colorMap = new Map();

    teamsInData.forEach(team => {
      if (baseColors.has(team)) {
        colorMap.set(team, baseColors.get(team));
      } else {
        colorMap.set(team, palette[paletteIndex % palette.length]);
        paletteIndex += 1;
      }
    });

    return colorMap;
  }, [people]);

  useEffect(() => {
    const styleId = 'people-graph-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const graphData = useMemo(() => {
    const nodeMap = new Map();
    const edgeMap = new Map();

    people.forEach(person => {
      nodeMap.set(person.id, {
        id: person.id,
        name: person.name,
        team: person.team,
        email: person.email,
        projectCount: 0,
        projects: [],
        activities: [],
        connections: new Set()
      });
    });

    projects.forEach(project => {
      const projectPeople = [];

      project.stakeholders?.forEach(stakeholder => {
        const person = people.find(p => p.name.toLowerCase() === stakeholder.name.toLowerCase());
        if (person && nodeMap.has(person.id)) {
          projectPeople.push(person.id);
          const node = nodeMap.get(person.id);
          node.projectCount++;
          node.projects.push({
            id: project.id,
            name: project.name,
            status: project.status,
            priority: project.priority
          });
        }
      });

      project.recentActivity?.forEach(activity => {
        const person = people.find(p => p.name.toLowerCase() === activity.author?.toLowerCase());
        if (person && nodeMap.has(person.id)) {
          const node = nodeMap.get(person.id);
          if (!node.projects.find(p => p.id === project.id)) {
            node.projectCount++;
            node.projects.push({
              id: project.id,
              name: project.name,
              status: project.status,
              priority: project.priority
            });
            projectPeople.push(person.id);
          }
          node.activities.push({
            ...activity,
            projectId: project.id,
            projectName: project.name
          });
        }
      });

      for (let i = 0; i < projectPeople.length; i++) {
        for (let j = i + 1; j < projectPeople.length; j++) {
          const id1 = projectPeople[i];
          const id2 = projectPeople[j];
          const edgeKey = [id1, id2].sort().join('-');

          if (edgeMap.has(edgeKey)) {
            edgeMap.get(edgeKey).weight++;
            edgeMap.get(edgeKey).sharedProjects.push(project.name);
          } else {
            edgeMap.set(edgeKey, {
              source: id1,
              target: id2,
              weight: 1,
              sharedProjects: [project.name]
            });
          }

          nodeMap.get(id1).connections.add(id2);
          nodeMap.get(id2).connections.add(id1);
        }
      }
    });

    nodeMap.forEach(node => {
      node.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      node.activities = node.activities.slice(0, 10);
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
  }, [people, projects]);

  useEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    setDimensions({ width, height });

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const initialNodes = graphData.nodes.map((node, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius: Math.max(24, Math.min(48, 20 + node.projectCount * 6))
      };
    });

    setNodes(initialNodes);
    setEdges(graphData.edges);
  }, [graphData]);

  useEffect(() => {
    if (nodes.length === 0) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));

        const dragId = draggedNode?.id;
        const hoverId = hoveredNode;

        newNodes.forEach(node => {
          if (node.id === dragId || node.id === hoverId) return;
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.vx += dx * 0.0008;
          node.vy += dy * 0.0008;
        });

        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const nodeA = newNodes[i];
            const nodeB = newNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = nodeA.radius + nodeB.radius + 40;

            if (dist < minDist * 2) {
              const force = ((minDist * 2 - dist) / dist) * 0.02;
              const fx = dx * force;
              const fy = dy * force;

              if (nodeA.id !== dragId && nodeA.id !== hoverId) {
                nodeA.vx -= fx;
                nodeA.vy -= fy;
              }
              if (nodeB.id !== dragId && nodeB.id !== hoverId) {
                nodeB.vx += fx;
                nodeB.vy += fy;
              }
            }
          }
        }

        edges.forEach(edge => {
          const source = newNodes.find(n => n.id === edge.source);
          const target = newNodes.find(n => n.id === edge.target);
          if (!source || !target) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = 150 + (3 - edge.weight) * 30;
          const force = (dist - idealDist) * 0.003 * Math.sqrt(edge.weight);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (source.id !== dragId && source.id !== hoverId) {
            source.vx += fx;
            source.vy += fy;
          }
          if (target.id !== dragId && target.id !== hoverId) {
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        newNodes.forEach(node => {
          if (node.id === dragId || node.id === hoverId) {
            node.vx = 0;
            node.vy = 0;
            return;
          }

          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;

          const padding = node.radius + 20;
          node.x = Math.max(padding, Math.min(width - padding, node.x));
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        });

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, edges, dimensions, draggedNode, hoveredNode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      setGraphOffset({ x: 0, y: 0 });
      return;
    }

    const node = nodes.find(n => n.id === selectedNode.id);
    if (!node) {
      setGraphOffset({ x: 0, y: 0 });
      return;
    }

    const calloutWidth = 360;
    const calloutPadding = 40;
    const { width, height } = dimensions;

    let offsetX = 0;
    let offsetY = 0;

    const showOnRight = node.x < width / 2;

    if (showOnRight) {
      const spaceNeeded = node.x + node.radius + calloutWidth + calloutPadding;
      if (spaceNeeded > width) {
        offsetX = -(spaceNeeded - width + 60);
      }
    } else {
      const spaceNeeded = calloutWidth + calloutPadding + node.radius;
      if (node.x < spaceNeeded) {
        offsetX = spaceNeeded - node.x + 60;
      }
    }

    const calloutHeight = 480;
    if (node.y - 100 < 20) {
      offsetY = 100 - node.y + 40;
    } else if (node.y + calloutHeight - 100 > height - 20) {
      offsetY = -(node.y + calloutHeight - 100 - height + 60);
    }

    setGraphOffset({ x: offsetX, y: offsetY });
  }, [selectedNode, nodes, dimensions]);

  const getInitials = (name) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  const getAvatarInitials = (name) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getTeamColor = (team) => {
    return teamColors.get(team) || '#6B6554';
  };

  const handleMouseDown = useCallback((e, node) => {
    e.stopPropagation();
    setDraggedNode(node);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggedNode || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(prev => prev.map(n =>
      n.id === draggedNode.id
        ? { ...n, x, y, vx: 0, vy: 0 }
        : n
    ));
  }, [draggedNode]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const handleNodeClick = useCallback((e, node) => {
    e.stopPropagation();
    if (draggedNode) return;

    setSelectedNode(node);
    setEditForm({
      name: node.name,
      team: node.team,
      email: node.email || ''
    });
    setIsEditing(false);
  }, [draggedNode]);

  const handleBackgroundClick = useCallback(() => {
    if (!draggedNode) {
      setSelectedNode(null);
      setIsEditing(false);
    }
  }, [draggedNode]);

  const handleSaveEdit = useCallback(async () => {
    if (selectedNode && onUpdatePerson) {
      await onUpdatePerson(selectedNode.id, editForm);
      setIsEditing(false);
    }
  }, [selectedNode, editForm, onUpdatePerson]);

  const handleDelete = useCallback(async () => {
    if (selectedNode && onDeletePerson) {
      if (window.confirm(`Delete ${selectedNode.name}?`)) {
        await onDeletePerson(selectedNode.id);
        setSelectedNode(null);
      }
    }
  }, [selectedNode, onDeletePerson]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority) => {
    const colors = { high: '#D67C5C', medium: '#E8A75D', low: '#7A9B76' };
    return colors[priority] || '#6B6554';
  };

  const connectedIds = useMemo(() => {
    if (!hoveredNode) return new Set();
    const node = nodes.find(n => n.id === hoveredNode);
    return node ? node.connections : new Set();
  }, [hoveredNode, nodes]);

  return (
    <div style={styles.container} ref={containerRef}>
      <svg
        ref={svgRef}
        style={styles.svg}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        <defs>
          {edges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;

            const gradientId = `edge-gradient-${edge.source}-${edge.target}`;
            return (
              <linearGradient
                key={gradientId}
                id={gradientId}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={getTeamColor(source.team)} stopOpacity="0.4" />
                <stop offset="50%" stopColor="#E8E3D8" stopOpacity="0.6" />
                <stop offset="100%" stopColor={getTeamColor(target.team)} stopOpacity="0.4" />
              </linearGradient>
            );
          })}

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
          </filter>
        </defs>

        <g
          style={{
            transform: `translate(${graphOffset.x}px, ${graphOffset.y}px)`,
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <g className="edges">
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              const isHighlighted = hoveredNode === source.id || hoveredNode === target.id;
              const isSelected = selectedNode?.id === source.id || selectedNode?.id === target.id;
              const gradientId = `edge-gradient-${edge.source}-${edge.target}`;

              return (
                <g key={`${edge.source}-${edge.target}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={`url(#${gradientId})`}
                    strokeWidth={Math.max(2, edge.weight * 2)}
                    strokeLinecap="round"
                    style={{
                      opacity: selectedNode ? (isSelected ? 1 : 0.1) : (isHighlighted ? 1 : 0.5),
                      transition: 'opacity 0.3s ease'
                    }}
                  />
                  <circle
                    r="3"
                    fill={getTeamColor(source.team)}
                    style={{
                      opacity: isHighlighted && !selectedNode ? 1 : 0,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M${source.x},${source.y} L${target.x},${target.y}`}
                    />
                  </circle>
                </g>
              );
            })}
          </g>

          <g className="nodes">
            {nodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const isConnected = connectedIds.has(node.id);
              const isSelected = selectedNode?.id === node.id;
              const isDimmed = selectedNode && !isSelected && !selectedNode.connections.has(node.id);
              const teamColor = getTeamColor(node.team);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{
                    cursor: draggedNode?.id === node.id ? 'grabbing' : 'pointer',
                    opacity: isDimmed ? 0.3 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  <circle
                    r={node.radius * 2 + 30}
                    fill="transparent"
                    stroke="none"
                    onMouseDown={(e) => handleMouseDown(e, node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={(e) => handleNodeClick(e, node)}
                    style={{ cursor: draggedNode?.id === node.id ? 'grabbing' : 'pointer' }}
                  />

                  <circle
                    r={node.radius + 6}
                    fill="none"
                    stroke={teamColor}
                    strokeWidth="2"
                    strokeDasharray="3 5"
                    style={{
                      opacity: isHovered && !selectedNode ? 0.4 : 0,
                      transition: 'opacity 0.3s ease',
                      pointerEvents: 'none'
                    }}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="360"
                      to="0"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  <circle
                    r={node.radius}
                    fill={`${teamColor}15`}
                    stroke={teamColor}
                    strokeWidth={isHovered || isSelected ? 3 : 2}
                    filter={isHovered ? 'url(#glow)' : 'url(#shadow)'}
                    style={{
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'transform 0.2s ease, stroke-width 0.2s ease',
                      pointerEvents: 'none'
                    }}
                  />

                  <circle
                    r={node.radius - 4}
                    fill={`url(#node-gradient-${node.id})`}
                    style={{ pointerEvents: 'none' }}
                  />
                  <defs>
                    <radialGradient id={`node-gradient-${node.id}`}>
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor={`${teamColor}30`} />
                    </radialGradient>
                  </defs>

                  <text
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: node.radius * 0.5,
                      fontWeight: '700',
                      fontFamily: "'Inter', sans-serif",
                      fill: teamColor,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {getAvatarInitials(node.name)}
                  </text>

                  <text
                    y={node.radius + 16}
                    textAnchor="middle"
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      fontFamily: "'Inter', sans-serif",
                      fill: '#3A3631',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: isHovered || isSelected ? 1 : 0.8
                    }}
                  >
                    {getInitials(node.name)}
                  </text>

                  {node.projectCount > 0 && (
                    <g transform={`translate(${node.radius * 0.7}, ${-node.radius * 0.7})`}>
                      <circle
                        r="10"
                        fill={teamColor}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          fontFamily: "'Inter', sans-serif",
                          fill: '#FFFFFF',
                          pointerEvents: 'none'
                        }}
                      >
                        {node.projectCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {hoveredNode && !selectedNode && !draggedNode && (() => {
        const node = nodes.find(n => n.id === hoveredNode);
        if (!node) return null;

        return (
          <div
            style={{
              ...styles.tooltip,
              left: Math.min(node.x + node.radius + 20, dimensions.width - 220),
              top: Math.max(20, Math.min(node.y - 40, dimensions.height - 120))
            }}
          >
            <div style={styles.tooltipHeader}>
              <div
                style={{
                  ...styles.tooltipAvatar,
                  backgroundColor: `${getTeamColor(node.team)}20`,
                  color: getTeamColor(node.team)
                }}
              >
                {getAvatarInitials(node.name)}
              </div>
              <div>
                <div style={styles.tooltipName}>{node.name}</div>
                <div style={styles.tooltipTeam}>{node.team}</div>
              </div>
            </div>
            <div style={styles.tooltipStats}>
              <div style={styles.tooltipStat}>
                <Briefcase size={12} />
                <span>{node.projectCount} project{node.projectCount !== 1 ? 's' : ''}</span>
              </div>
              <div style={styles.tooltipStat}>
                <Users size={12} />
                <span>{node.connections.size} connection{node.connections.size !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={styles.tooltipHint}>Click for details</div>
          </div>
        );
      })()}

      {selectedNode && (() => {
        const node = nodes.find(n => n.id === selectedNode.id);
        if (!node) return null;

        const calloutWidth = 340;
        const calloutMaxHeight = Math.min(500, dimensions.height - 60);
        const padding = 20;

        const nodeX = node.x + graphOffset.x;
        const nodeY = node.y + graphOffset.y;

        const showOnRight = nodeX < dimensions.width / 2;
        const calloutX = showOnRight
          ? nodeX + node.radius + 30
          : nodeX - node.radius - calloutWidth - 30;

        let calloutY = nodeY - 100;
        calloutY = Math.max(padding, Math.min(dimensions.height - calloutMaxHeight - padding, calloutY));

        const connectorStartX = showOnRight ? nodeX + node.radius + 4 : nodeX - node.radius - 4;
        const connectorEndX = showOnRight ? calloutX : calloutX + calloutWidth;
        const connectorY = Math.min(Math.max(nodeY, calloutY + 40), calloutY + calloutMaxHeight - 40);

        const teamColor = getTeamColor(selectedNode.team);

        return (
          <>
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 299,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <path
                d={`M ${connectorStartX} ${nodeY}
                Q ${(connectorStartX + connectorEndX) / 2} ${nodeY},
                  ${connectorEndX} ${connectorY}`}
                fill="none"
                stroke={teamColor}
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.6"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <circle
                cx={connectorStartX}
                cy={nodeY}
                r="4"
                fill={teamColor}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <circle
                cx={connectorEndX}
                cy={connectorY}
                r="4"
                fill={teamColor}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                left: calloutX,
                top: calloutY,
                width: calloutWidth,
                maxHeight: calloutMaxHeight,
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px ${teamColor}30`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 300,
                overflow: 'hidden',
                animation: 'scaleIn 0.25s ease',
                transformOrigin: showOnRight ? 'left center' : 'right center'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ maxHeight: calloutMaxHeight, overflowY: 'auto' }}>
                <div style={{
                  background: `linear-gradient(135deg, ${teamColor}15 0%, ${teamColor}05 100%)`,
                  padding: '20px 20px 16px',
                  borderBottom: `1px solid ${teamColor}20`,
                  position: 'relative'
                }}>
                  <button
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      color: '#6B6554',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedNode(null)}
                  >
                    <X size={16} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: `${teamColor}20`,
                        border: `3px solid ${teamColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        fontFamily: "'Inter', sans-serif",
                        color: teamColor,
                        flexShrink: 0
                      }}
                    >
                      {getAvatarInitials(selectedNode.name)}
                    </div>

                    {isEditing ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Name"
                          style={styles.calloutInput}
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editForm.team}
                          onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}
                          placeholder="Team"
                          style={styles.calloutInput}
                        />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="Email"
                          style={styles.calloutInput}
                        />
                      </div>
                    ) : (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#3A3631',
                          letterSpacing: '-0.3px'
                        }}>
                          {selectedNode.name}
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                          fontSize: '13px',
                          color: teamColor,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: '600'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: teamColor
                          }} />
                          {selectedNode.team}
                        </div>
                        {selectedNode.email && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            fontSize: '12px',
                            color: '#6B6554',
                            fontFamily: "'Inter', sans-serif"
                          }}>
                            <Mail size={12} />
                            {selectedNode.email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    {isEditing ? (
                      <>
                        <button style={styles.calloutSaveBtn} onClick={handleSaveEdit}>
                          <Check size={14} />
                          Save
                        </button>
                        <button style={styles.calloutCancelBtn} onClick={() => setIsEditing(false)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button style={styles.calloutEditBtn} onClick={() => setIsEditing(true)}>
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button style={styles.calloutDeleteBtn} onClick={handleDelete}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1px',
                  backgroundColor: '#E8E3D8',
                  borderBottom: '1px solid #E8E3D8'
                }}>
                  {[
                    { icon: Briefcase, value: selectedNode.projectCount, label: 'Projects', color: '#8B6F47' },
                    { icon: Users, value: selectedNode.connections.size, label: 'Connections', color: '#7A9B76' },
                    { icon: MessageCircle, value: selectedNode.activities.length, label: 'Activities', color: '#E8A75D' }
                  ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} style={{
                      backgroundColor: '#FFFFFF',
                      padding: '12px 8px',
                      textAlign: 'center'
                    }}>
                      <Icon size={16} style={{ color, marginBottom: '4px' }} />
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#3A3631' }}>{value}</div>
                      <div style={{ fontSize: '10px', color: '#6B6554', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <h4 style={styles.calloutSectionTitle}>
                    <Briefcase size={14} />
                    Projects
                  </h4>
                  {selectedNode.projects.length === 0 ? (
                    <div style={styles.calloutEmptyText}>No projects yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedNode.projects.slice(0, 4).map(project => (
                        <div
                          key={project.id}
                          style={styles.calloutProjectItem}
                          onClick={() => onViewProject?.(project.id)}
                        >
                          <span style={{
                            ...styles.calloutProjectDot,
                            backgroundColor: getPriorityColor(project.priority)
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.calloutProjectName}>{project.name}</div>
                            <div style={styles.calloutProjectStatus}>{project.status}</div>
                          </div>
                          <ChevronRight size={14} style={{ color: '#6B6554', flexShrink: 0 }} />
                        </div>
                      ))}
                      {selectedNode.projects.length > 4 && (
                        <div style={{ fontSize: '12px', color: '#6B6554', fontStyle: 'italic', paddingLeft: '18px' }}>
                          +{selectedNode.projects.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: '0 20px 16px', borderTop: '1px solid #E8E3D8', marginTop: '-1px', paddingTop: '16px' }}>
                  <h4 style={styles.calloutSectionTitle}>
                    <Clock size={14} />
                    Recent Activity
                  </h4>
                  {selectedNode.activities.length === 0 ? (
                    <div style={styles.calloutEmptyText}>No recent activity</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedNode.activities.slice(0, 3).map((activity, idx) => (
                        <div key={activity.id || idx} style={{ display: 'flex', gap: '10px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#E8A75D',
                            marginTop: '6px',
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#8B6F47', fontFamily: "'Inter', sans-serif" }}>
                              {activity.projectName}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#3A3631',
                              fontFamily: "'Inter', sans-serif",
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {activity.note}
                            </div>
                            <div style={{ fontSize: '10px', color: '#6B6554', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={10} />
                              {formatDate(activity.date)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedNode.connections.size > 0 && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E8E3D8', marginTop: '-1px', paddingTop: '16px' }}>
                    <h4 style={styles.calloutSectionTitle}>
                      <Users size={14} />
                      Works With
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Array.from(selectedNode.connections).slice(0, 6).map(connId => {
                        const connNode = nodes.find(n => n.id === connId);
                        if (!connNode) return null;

                        return (
                          <div
                            key={connId}
                            style={styles.calloutConnectionChip}
                            onClick={() => {
                              setSelectedNode(connNode);
                              setEditForm({
                                name: connNode.name,
                                team: connNode.team,
                                email: connNode.email || ''
                              });
                              setIsEditing(false);
                            }}
                          >
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: `${getTeamColor(connNode.team)}20`,
                                color: getTeamColor(connNode.team),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: '700',
                                fontFamily: "'Inter', sans-serif"
                              }}
                            >
                              {getAvatarInitials(connNode.name)}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#3A3631' }}>
                              {connNode.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                      {selectedNode.connections.size > 6 && (
                        <div style={{
                          ...styles.calloutConnectionChip,
                          backgroundColor: '#E8E3D8',
                          cursor: 'default'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B6554' }}>
                            +{selectedNode.connections.size - 6}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      <div style={styles.legend}>
        <div style={styles.legendTitle}>Teams</div>
        <div style={styles.legendItems}>
          {Array.from(teamColors.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([team, color]) => (
            <div key={team} style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendDot,
                  backgroundColor: color
                }}
              />
              <span style={styles.legendLabel}>{team}</span>
            </div>
          ))}
        </div>
      </div>

      {nodes.length > 0 && !selectedNode && (
        <div style={styles.instructionsHint}>
          <div style={styles.instructionItem}>
            <span style={styles.instructionIcon}>🖱️</span>
            <span>Drag nodes to rearrange</span>
          </div>
          <div style={styles.instructionItem}>
            <span style={styles.instructionIcon}>👆</span>
            <span>Click for details</span>
          </div>
          <div style={styles.instructionItem}>
            <span style={styles.instructionIcon}>✨</span>
            <span>Hover to see connections</span>
          </div>
        </div>
      )}

      {nodes.length === 0 && (
        <div style={styles.emptyState}>
          <Users size={48} style={{ color: '#E8E3D8', marginBottom: '16px' }} />
          <div style={styles.emptyStateTitle}>No people yet</div>
          <div style={styles.emptyStateText}>
            Add team members to see their connections
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: 'calc(100vh - 200px)',
    minHeight: '500px',
    backgroundColor: '#FAF8F3',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #E8E3D8'
  },

  svg: {
    width: '100%',
    height: '100%',
    display: 'block'
  },

  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid #E8E3D8',
    minWidth: '180px',
    zIndex: 100,
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease'
  },

  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },

  tooltipAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif"
  },

  tooltipName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  tooltipTeam: {
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  tooltipStats: {
    display: 'flex',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E8E3D8'
  },

  tooltipStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  tooltipHint: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px dashed #E8E3D8',
    fontSize: '11px',
    color: '#8B6F47',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textAlign: 'center'
  },

  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(58, 54, 49, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    animation: 'fadeIn 0.3s ease'
  },

  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '32px',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    animation: 'scaleIn 0.3s ease'
  },

  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid #E8E3D8',
    backgroundColor: '#FFFFFF',
    color: '#6B6554',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },

  profileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '24px'
  },

  profileAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    border: '3px solid',
    marginBottom: '16px'
  },

  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },

  profileName: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#3A3631',
    letterSpacing: '-0.5px'
  },

  profileTeamBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    backgroundColor: '#FAF8F3',
    borderRadius: '999px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: '#6B6554'
  },

  teamDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },

  profileEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  editFormInline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '280px'
  },

  editInput: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '2px solid #E8E3D8',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: '#3A3631',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },

  actionButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px'
  },

  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #E8E3D8',
    backgroundColor: '#FFFFFF',
    color: '#8B6F47',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#7A9B76',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  cancelButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #E8E3D8',
    backgroundColor: '#FFFFFF',
    color: '#6B6554',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #D67C5C',
    backgroundColor: 'rgba(214, 124, 92, 0.1)',
    color: '#D67C5C',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px'
  },

  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px 12px',
    backgroundColor: '#FAF8F3',
    borderRadius: '12px'
  },

  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  statLabel: {
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  section: {
    marginBottom: '24px'
  },

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  emptyText: {
    padding: '16px',
    textAlign: 'center',
    color: '#6B6554',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontStyle: 'italic',
    backgroundColor: '#FAF8F3',
    borderRadius: '10px'
  },

  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  projectCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    backgroundColor: '#FAF8F3',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },

  projectCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  projectDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },

  projectName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  projectStatus: {
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize'
  },

  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  activityItem: {
    display: 'flex',
    gap: '12px'
  },

  activityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#E8A75D',
    marginTop: '6px',
    flexShrink: 0
  },

  activityContent: {
    flex: 1
  },

  activityProject: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#8B6F47',
    fontFamily: "'Inter', sans-serif",
    marginBottom: '4px'
  },

  activityNote: {
    fontSize: '13px',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
    marginBottom: '4px'
  },

  activityTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  connectionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },

  connectionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#FAF8F3',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },

  connectionAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif"
  },

  connectionInfo: {
    display: 'flex',
    flexDirection: 'column'
  },

  connectionName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  connectionShared: {
    fontSize: '11px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  legend: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: '12px',
    padding: '14px 18px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(232, 227, 216, 0.6)'
  },

  legendTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px'
  },

  legendItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },

  legendLabel: {
    fontSize: '12px',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    padding: '40px'
  },

  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#3A3631',
    marginBottom: '8px'
  },

  emptyStateText: {
    fontSize: '14px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  instructionsHint: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '14px 18px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #E8E3D8',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  instructionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },

  instructionIcon: {
    fontSize: '14px'
  },

  calloutInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: '#3A3631',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },

  calloutSaveBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#7A9B76',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  calloutCancelBtn: {
    padding: '10px 14px',
    border: '1px solid #E8E3D8',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: '#6B6554',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  calloutEditBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 14px',
    border: '1px solid #E8E3D8',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: '#3A3631',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  calloutDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    border: '1px solid #D67C5C',
    borderRadius: '10px',
    backgroundColor: '#D67C5C15',
    color: '#D67C5C',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  calloutSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0',
    fontSize: '11px',
    fontWeight: '700',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  calloutEmptyText: {
    padding: '12px',
    textAlign: 'center',
    color: '#6B6554',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontStyle: 'italic',
    backgroundColor: '#FAF8F3',
    borderRadius: '8px'
  },

  calloutProjectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#FAF8F3',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },

  calloutProjectDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0
  },

  calloutProjectName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },

  calloutProjectStatus: {
    fontSize: '11px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize'
  },

  calloutConnectionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px 6px 6px',
    backgroundColor: '#FAF8F3',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  }
};

export default PeopleGraph;
