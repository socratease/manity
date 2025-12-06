import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Force-directed timeline with physics-based label positioning
export default function ForceDirectedTimeline({ tasks = [], startDate, endDate }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 250 });
  const [nodes, setNodes] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [timelineZoom, setTimelineZoom] = useState(3);

  // Fallback sample data if no tasks provided - memoized to prevent re-renders
  const sampleTasks = useMemo(() => tasks.length > 0 ? tasks : [
    { id: 1, title: 'Project Kickoff & Stakeholder Alignment', dueDate: '2025-01-15', status: 'completed', taskTitle: 'Planning' },
    { id: 2, title: 'Requirements Documentation Review', dueDate: '2025-01-22', status: 'completed', taskTitle: 'Planning' },
    { id: 3, title: 'UX Design Review with Product Team', dueDate: '2025-02-05', status: 'completed', taskTitle: 'Design' },
    { id: 4, title: 'High-Fidelity Wireframes & Prototypes', dueDate: '2025-02-10', status: 'in-progress', taskTitle: 'Design' },
    { id: 5, title: 'API Architecture & Endpoint Design', dueDate: '2025-02-12', status: 'todo', taskTitle: 'Backend' },
    { id: 6, title: 'Database Schema & Migration Scripts', dueDate: '2025-02-14', status: 'todo', taskTitle: 'Backend' },
    { id: 7, title: 'Frontend Build Pipeline Configuration', dueDate: '2025-02-15', status: 'todo', taskTitle: 'Frontend' },
    { id: 8, title: 'Authentication & Authorization Module', dueDate: '2025-02-20', status: 'todo', taskTitle: 'Backend' },
    { id: 9, title: 'Dashboard UI Component Library', dueDate: '2025-02-25', status: 'todo', taskTitle: 'Frontend' },
    { id: 10, title: 'User Acceptance Testing Phase 1', dueDate: '2025-03-05', status: 'todo', taskTitle: 'QA' },
    { id: 11, title: 'Critical Bug Fixes & Performance', dueDate: '2025-03-10', status: 'todo', taskTitle: 'QA' },
    { id: 12, title: 'Production Environment Setup', dueDate: '2025-03-15', status: 'todo', taskTitle: 'Release' },
    { id: 13, title: 'Go Live & Monitoring Setup', dueDate: '2025-03-20', status: 'todo', taskTitle: 'Release' },
  ], [tasks]);

  // Calculate timeline range based on zoom
  const getTimelineRange = useCallback(() => {
    const now = startDate ? new Date(startDate) : new Date('2025-01-01');
    const rangeStart = new Date(now);
    const rangeEnd = new Date(now);
    rangeEnd.setMonth(rangeEnd.getMonth() + timelineZoom);
    return { startDate: rangeStart, endDate: rangeEnd };
  }, [timelineZoom, startDate]);

  const timelineConfig = {
    padding: { left: 80, right: 80, top: 30, bottom: 30 },
    lineY: 125,
  };

  const physics = {
    springStrength: 0.015,
    repulsion: 15000,
    damping: 0.68,
    verticalSpring: 0.02,
    verticalRepulsion: 10000,
    settleTreshold: 0.25,
    boundaryForce: 0.8,
    dotTug: 0.008, // Force pulling box toward its connected dot
  };

  const getTimelineX = useCallback((date) => {
    const { startDate: rangeStart, endDate: rangeEnd } = getTimelineRange();
    const { padding } = timelineConfig;
    const timelineWidth = dimensions.width - padding.left - padding.right;
    const totalMs = rangeEnd - rangeStart;
    const dateMs = new Date(date) - rangeStart;
    return padding.left + (dateMs / totalMs) * timelineWidth;
  }, [dimensions.width, timelineZoom, startDate]);

  // Initialize nodes
  useEffect(() => {
    const { startDate: rangeStart, endDate: rangeEnd } = getTimelineRange();
    const visibleTasks = sampleTasks.filter(task => {
      const date = new Date(task.dueDate);
      return date >= rangeStart && date <= rangeEnd;
    });

    const initialNodes = visibleTasks.map((task, index) => {
      const targetX = getTimelineX(task.dueDate);
      const isAbove = index % 2 === 0;
      const baseOffset = 45;
      const targetY = isAbove
        ? timelineConfig.lineY - baseOffset - Math.random() * 20
        : timelineConfig.lineY + baseOffset + Math.random() * 20;

      const estimatedWidth = Math.min(220, Math.max(160, task.title.length * 6 + 50));

      return {
        ...task,
        x: targetX + (Math.random() - 0.5) * 100,
        y: targetY + (Math.random() - 0.5) * 80,
        targetX,
        targetY,
        isAbove,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        width: estimatedWidth,
        height: 28,
      };
    });
    setNodes(initialNodes);
  }, [getTimelineX, timelineZoom]);

  // Physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map((node, i) => {
          // Skip physics for dragged node
          if (draggedNode === node.id) {
            return { ...node, vx: 0, vy: 0 };
          }

          let fx = 0;
          let fy = 0;

          // Spring force toward target position (horizontal and vertical offsets)
          const dx = node.targetX - node.x;
          fx += dx * physics.springStrength;

          const dy = node.targetY - node.y;
          fy += dy * physics.verticalSpring;

          // Tug force toward the connected dot on timeline
          const dotX = node.targetX;
          const dotY = timelineConfig.lineY;
          const dotDx = dotX - node.x;
          const dotDy = dotY - node.y;
          fx += dotDx * physics.dotTug;
          fy += dotDy * physics.dotTug;

          prevNodes.forEach((other, j) => {
            if (i === j) return;

            const distX = node.x - other.x;
            const distY = node.y - other.y;
            const dist = Math.sqrt(distX * distX + distY * distY);

            const minDist = (node.width + other.width) / 2 + 30;

            if (dist < minDist * 1.5 && dist > 0) {
              const hForce = physics.repulsion / (dist * dist);
              fx += (distX / dist) * hForce;

              const vForce = physics.verticalRepulsion / (dist * dist);
              fy += (distY / dist) * vForce;
            }
          });

          const { padding } = timelineConfig;
          const minX = padding.left;
          const maxX = dimensions.width - padding.right;
          const minY = 35;
          const maxY = dimensions.height - 35;

          if (node.x - node.width / 2 < minX) {
            fx += (minX - (node.x - node.width / 2)) * physics.boundaryForce;
          }
          if (node.x + node.width / 2 > maxX) {
            fx += (maxX - (node.x + node.width / 2)) * physics.boundaryForce;
          }
          if (node.y - node.height / 2 < minY) {
            fy += (minY - (node.y - node.height / 2)) * physics.boundaryForce;
          }
          if (node.y + node.height / 2 > maxY) {
            fy += (maxY - (node.y + node.height / 2)) * physics.boundaryForce;
          }

          const newVx = (node.vx + fx) * physics.damping;
          const newVy = (node.vy + fy) * physics.damping;

          return {
            ...node,
            x: node.x + newVx,
            y: node.y + newVy,
            vx: newVx,
            vy: newVy,
          };
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
  }, [nodes.length, dimensions.width, draggedNode]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: Math.min(containerRef.current.offsetWidth, 1400),
          height: 250,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag handlers
  const handleMouseDown = (e, nodeId) => {
    e.preventDefault();
    const svg = e.currentTarget.closest('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDragOffset({ x: svgP.x - node.x, y: svgP.y - node.y });
      setDraggedNode(nodeId);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (draggedNode === null) return;

    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    setNodes(prev => prev.map(node =>
      node.id === draggedNode
        ? { ...node, x: svgP.x - dragOffset.x, y: svgP.y - dragOffset.y }
        : node
    ));
  }, [draggedNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (draggedNode !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, handleMouseMove, handleMouseUp]);

  const getMonthLabels = () => {
    const { startDate: rangeStart, endDate: rangeEnd } = getTimelineRange();
    const labels = [];
    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      const x = getTimelineX(current);
      if (x >= timelineConfig.padding.left && x <= dimensions.width - timelineConfig.padding.right) {
        labels.push({
          x,
          label: current.toLocaleDateString('en-US', { month: 'short', year: timelineZoom > 6 ? '2-digit' : undefined }),
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
    return labels;
  };

  const getZoomLabel = () => {
    if (timelineZoom === 1) return '1 Month';
    if (timelineZoom === 12) return '1 Year';
    return `${timelineZoom} Months`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#7A9B76';
      case 'in-progress': return '#E8A75D';
      default: return '#8B6F47';
    }
  };

  const monthLabels = getMonthLabels();
  const { startDate: rangeStart, endDate: rangeEnd } = getTimelineRange();

  return (
    <div style={styles.wrapper}>
      <div ref={containerRef} style={styles.container}>
        <svg width={dimensions.width} height={dimensions.height} style={styles.svg}>
          <defs>
            <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B6F47" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#8B6F47" stopOpacity="1" />
              <stop offset="100%" stopColor="#8B6F47" stopOpacity="0.2" />
            </linearGradient>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="labelShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3A3631" floodOpacity="0.15"/>
            </filter>

            <filter id="lineShadow" x="-10%" y="-100%" width="120%" height="300%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B6F47" floodOpacity="0.3"/>
            </filter>

            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#8B6F47" opacity="0.08"/>
            </pattern>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill="#FDFCFA" />
          <rect width="100%" height="100%" fill="url(#dots)" />

          {/* PROMINENT TIMELINE LINE */}
          <g filter="url(#lineShadow)">
            <line
              x1={timelineConfig.padding.left - 20}
              y1={timelineConfig.lineY}
              x2={dimensions.width - timelineConfig.padding.right + 20}
              y2={timelineConfig.lineY}
              stroke="#E8E3D8"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <line
              x1={timelineConfig.padding.left - 20}
              y1={timelineConfig.lineY}
              x2={dimensions.width - timelineConfig.padding.right + 20}
              y2={timelineConfig.lineY}
              stroke="url(#timelineGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line
              x1={timelineConfig.padding.left}
              y1={timelineConfig.lineY}
              x2={dimensions.width - timelineConfig.padding.right}
              y2={timelineConfig.lineY}
              stroke="#8B6F47"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>

          {/* Month tick marks and labels */}
          {monthLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={label.x}
                y1={timelineConfig.lineY - 15}
                x2={label.x}
                y2={timelineConfig.lineY + 15}
                stroke="#8B6F47"
                strokeWidth="2"
                opacity="0.5"
              />
              <text
                x={label.x}
                y={timelineConfig.lineY + 38}
                textAnchor="middle"
                style={styles.monthLabel}
              >
                {label.label}
              </text>
            </g>
          ))}

          {/* Start/End date labels */}
          <text
            x={timelineConfig.padding.left - 10}
            y={timelineConfig.lineY + 55}
            textAnchor="start"
            style={styles.dateLabel}
          >
            {rangeStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </text>
          <text
            x={dimensions.width - timelineConfig.padding.right + 10}
            y={timelineConfig.lineY + 55}
            textAnchor="end"
            style={styles.dateLabel}
          >
            {rangeEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </text>

          {/* Connections and dots */}
          {nodes.map((node) => {
            const dotX = node.targetX;
            const dotY = timelineConfig.lineY;
            const isNodeHovered = hoveredNode === node.id;
            const controlY = node.isAbove
              ? Math.min(node.y + 14, dotY - 25)
              : Math.max(node.y - 14, dotY + 25);

            return (
              <g key={`conn-${node.id}`}>
                <path
                  d={`M ${node.x} ${node.y + (node.isAbove ? 14 : -14)}
                      Q ${node.x} ${controlY} ${dotX} ${dotY}`}
                  fill="none"
                  stroke={getStatusColor(node.status)}
                  strokeWidth={isNodeHovered ? 3 : 2}
                  opacity={isNodeHovered ? 1 : 0.6}
                  style={{
                    transition: 'stroke-width 0.15s, opacity 0.15s',
                    pointerEvents: 'none'
                  }}
                  strokeLinecap="round"
                />
                <circle
                  cx={dotX}
                  cy={dotY}
                  r={isNodeHovered ? 12 : 8}
                  fill={getStatusColor(node.status)}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  filter={isNodeHovered ? "url(#glow)" : "none"}
                  style={{
                    transition: 'r 0.15s',
                    pointerEvents: 'none'
                  }}
                />
              </g>
            );
          })}

          {/* Labels - sorted so hovered/dragged render on top */}
          {[...nodes]
            .sort((a, b) => {
              if (a.id === draggedNode) return 1;
              if (b.id === draggedNode) return -1;
              if (a.id === hoveredNode) return 1;
              if (b.id === hoveredNode) return -1;
              return 0;
            })
            .map((node) => {
              const isNodeHovered = hoveredNode === node.id;
              const isHovered = isNodeHovered;
              const isDragged = draggedNode === node.id;
              const scale = isHovered || isDragged ? 1.03 : 1;
              const maxTitleChars = Math.floor((node.width - 50) / 7);
              const displayTitle = node.title.length > maxTitleChars
                ? node.title.slice(0, maxTitleChars) + '…'
                : node.title;

              // Calculate tooltip position to prevent overflow
              // Dynamically calculate width based on text length (approximately 7px per character + padding)
              const titleWidth = node.title.length * 7 + 40;
              const dateWidth = 150; // Fixed width for date text
              const tooltipWidth = Math.max(titleWidth, dateWidth, 200);
              const tooltipHeight = 36;
              let tooltipX = -tooltipWidth / 2;

              // For boxes above timeline, show tooltip above; for boxes below, show tooltip below
              let tooltipY = node.isAbove ? -50 : 42;

              // Check if tooltip would overflow boundaries
              const nodeScreenX = node.x;
              const nodeScreenY = node.y;
              const tooltipLeft = nodeScreenX + tooltipX;
              const tooltipRight = nodeScreenX + tooltipX + tooltipWidth;
              const tooltipTop = nodeScreenY + tooltipY;
              const tooltipBottom = nodeScreenY + tooltipY + tooltipHeight;

              // Adjust horizontal position if overflow
              if (tooltipLeft < timelineConfig.padding.left) {
                tooltipX = timelineConfig.padding.left - nodeScreenX;
              } else if (tooltipRight > dimensions.width - timelineConfig.padding.right) {
                tooltipX = (dimensions.width - timelineConfig.padding.right) - nodeScreenX - tooltipWidth;
              }

              // Adjust vertical position if overflow
              if (node.isAbove && tooltipTop < 10) {
                // For boxes above timeline that would overflow at top, position tooltip just below top edge
                tooltipY = 10 - nodeScreenY;
              } else if (!node.isAbove && tooltipBottom > dimensions.height - 10) {
                // For boxes below timeline that would overflow at bottom, show above instead
                tooltipY = -50;
              }

              return (
                <g
                  key={`label-${node.id}`}
                  transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                  onMouseEnter={() => !draggedNode && setHoveredNode(node.id)}
                  onMouseLeave={() => !draggedNode && setHoveredNode(null)}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  style={{
                    cursor: isDragged ? 'grabbing' : 'grab',
                    transformOrigin: 'center',
                    userSelect: 'none',
                  }}
                >
                  <rect
                    x={-node.width / 2}
                    y={-14}
                    width={node.width}
                    height={28}
                    rx="12"
                    fill={isHovered || isDragged ? '#FFFFFF' : '#FAF8F3'}
                    stroke={getStatusColor(node.status)}
                    strokeWidth={isHovered || isDragged ? 2.5 : 1.5}
                    filter="url(#labelShadow)"
                    style={{ transition: isDragged ? 'none' : 'all 0.15s' }}
                  />

                  <circle
                    cx={-node.width / 2 + 18}
                    cy={0}
                    r="7"
                    fill={getStatusColor(node.status)}
                  />

                  <text
                    x={-node.width / 2 + 34}
                    y={4}
                    style={{...styles.taskTitle, pointerEvents: 'none'}}
                  >
                    {displayTitle}
                  </text>

                  {isHovered && !isDragged && (
                    <g>
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                        rx="8"
                        fill="#3A3631"
                        opacity="0.95"
                      />
                      <text
                        x={tooltipX + tooltipWidth / 2}
                        y={tooltipY + 14}
                        textAnchor="middle"
                        style={{...styles.tooltipTitle, pointerEvents: 'none'}}
                      >
                        {node.title}
                      </text>
                      <text
                        x={tooltipX + tooltipWidth / 2}
                        y={tooltipY + 28}
                        textAnchor="middle"
                        style={{...styles.tooltipDate, pointerEvents: 'none'}}
                      >
                        Due: {new Date(node.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Zoom slider inside timeline */}
          <foreignObject
            x={dimensions.width - 250}
            y={10}
            width="230"
            height="40"
          >
            <div style={styles.zoomControl}>
              <label style={styles.controlLabel}>🔍</label>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={timelineZoom}
                onChange={(e) => setTimelineZoom(parseInt(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.controlValue}>{getZoomLabel()}</span>
            </div>
          </foreignObject>
        </svg>
      </div>

      <div style={styles.footer}>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, backgroundColor: '#7A9B76'}}></span>
            Completed
          </div>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, backgroundColor: '#E8A75D'}}></span>
            In Progress
          </div>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, backgroundColor: '#8B6F47'}}></span>
            To Do
          </div>
        </div>
        <div style={styles.hint}>
          💡 Drag labels to reposition • Hover to see full titles • Use zoom to adjust timeline range
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "'Crimson Pro', Georgia, serif",
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '28px',
    border: '1px solid #E8E3D8',
    boxShadow: '0 20px 60px rgba(139, 111, 71, 0.1)',
    marginBottom: '32px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    backgroundColor: '#F5F0E8',
    borderRadius: '999px',
    border: '1px solid #E8E3D8',
  },
  controlLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
  },
  slider: {
    width: '120px',
    accentColor: '#8B6F47',
    cursor: 'pointer',
  },
  controlValue: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    minWidth: '70px',
  },
  container: {
    width: '100%',
    backgroundColor: '#FDFCFA',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid #E8E3D8',
  },
  svg: {
    display: 'block',
  },
  monthLabel: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fill: '#6B6554',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dateLabel: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fill: '#6B6554',
  },
  taskTitle: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fill: '#3A3631',
  },
  taskCategory: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    fill: '#6B6554',
  },
  tooltipTitle: {
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    fill: '#FFFFFF',
  },
  tooltipDate: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fill: '#E8A75D',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  legend: {
    display: 'flex',
    gap: '32px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: '#6B6554',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  hint: {
    fontSize: '13px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
  },
};
