import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * PeopleProjectsJuggle - A playful animated component showing people "juggling" projects
 *
 * Projects float in the air like balloons with moon-like gravity, slowly sinking down.
 * People stand at the bottom and move to catch falling projects, bumping them back up.
 * Projects accelerate quickly upward but fall slowly (terminal velocity).
 */
export default function PeopleProjectsJuggle({ projects = [], people = [] }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Color palette matching the app's design
  const colors = useMemo(() => ({
    earth: '#8B6F47',
    sage: '#7A9B76',
    coral: '#D67C5C',
    amber: '#E8A75D',
    cream: '#FAF8F3',
    cloud: '#E8E3D8',
    stone: '#6B6554',
    charcoal: '#3A3631',
  }), []);

  // Get priority color
  const getPriorityColor = useCallback((priority) => {
    const priorityColors = {
      high: colors.coral,
      medium: colors.amber,
      low: colors.sage,
    };
    return priorityColors[priority] || colors.stone;
  }, [colors]);

  const normalizedProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];

    return projects.map((project, index) => ({
      name: project.name || `Project ${index + 1}`,
      priority: project.priority || 'medium',
      progress: typeof project.progress === 'number' ? project.progress : 0,
      stakeholders: project.stakeholders || [],
      ...project,
      id: project.id ?? `project-${index + 1}`,
    }));
  }, [projects]);

  const jugglePeople = useMemo(() => {
    if (Array.isArray(people) && people.length > 0) {
      return people.map((person, index) => ({
        ...person,
        id: person.id ?? `person-${index + 1}`,
        name: person.name || `Person ${index + 1}`,
        team: person.team || 'Contributor',
      }));
    }

    // Derive people from project stakeholders when no explicit people are provided
    const stakeholderMap = new Map();
    normalizedProjects.forEach(project => {
      (project.stakeholders || []).forEach((stakeholder, idx) => {
        const key = (stakeholder.id || stakeholder.name || `${project.id}-${idx}`).toString().toLowerCase();
        if (!stakeholderMap.has(key)) {
          stakeholderMap.set(key, {
            ...stakeholder,
            id: stakeholder.id ?? `stakeholder-${stakeholderMap.size + 1}`,
            name: stakeholder.name || 'Stakeholder',
            team: stakeholder.team || 'Contributor',
          });
        }
      });
    });

    return Array.from(stakeholderMap.values());
  }, [people, normalizedProjects]);

  // Initialize simulation state
  const initializeState = useCallback(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const groundY = height - 70;
    const projectCardHeight = 50;
    const projectCardWidth = 110;

    // Stagger projects vertically across the full height
    const verticalRange = groundY - 100;

    // Initialize project physics
    const projectStates = normalizedProjects.map((project, index) => {
      const spacing = width / (normalizedProjects.length + 1);
      return {
        id: project.id,
        project,
        x: spacing * (index + 1),
        // Spread projects evenly across vertical space with slight randomization
        y: 30 + (verticalRange * (index / normalizedProjects.length)) + (Math.random() - 0.5) * 40,
        vy: 0.05 + Math.random() * 0.1, // Very slow initial fall
        vx: (Math.random() - 0.5) * 0.3, // Tiny horizontal drift
        width: projectCardWidth,
        height: projectCardHeight,
      };
    });

    // Initialize people states
    const personRadius = 22;
    const peopleStates = jugglePeople.map((person, index) => {
      const spacing = width / (jugglePeople.length + 1);
      return {
        id: person.id,
        person,
        x: spacing * (index + 1),
        homeX: spacing * (index + 1),
        y: groundY + 25,
        radius: personRadius,
        targetX: null,
        targetProjectId: null,
        isJumping: false,
        jumpY: 0,
        jumpVelocity: 0,
        speed: 4.5 + Math.random() * 2.5,
      };
    });

    return {
      projects: projectStates,
      people: peopleStates,
      groundY,
      gravity: 0.003, // Very gentle moon-like gravity
      maxFallSpeed: 0.6, // Terminal velocity - slow falling
      bouncePower: -5, // Upward velocity when bumped (fast acceleration up is fine)
      catchDistance: 100, // How close to ground before someone catches
    };
  }, [normalizedProjects, jugglePeople, dimensions]);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;

    const ctx = canvas.getContext('2d');
    const state = stateRef.current;
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background gradient (sky)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#F5F0E8');
    gradient.addColorStop(1, colors.cream);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw ground
    ctx.fillStyle = colors.cloud;
    ctx.fillRect(0, state.groundY + 40, width, height - state.groundY - 40);
    
    // Draw grass line
    ctx.strokeStyle = colors.sage;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, state.groundY + 40);
    ctx.lineTo(width, state.groundY + 40);
    ctx.stroke();

    // Update and draw projects
    state.projects.forEach(proj => {
      // Apply gravity
      proj.vy += state.gravity;
      
      // Cap falling speed (terminal velocity) - but allow fast upward movement
      if (proj.vy > state.maxFallSpeed) {
        proj.vy = state.maxFallSpeed;
      }
      
      // Apply velocities
      proj.y += proj.vy;
      proj.x += proj.vx;

      // Dampen horizontal movement
      proj.vx *= 0.995;

      // Bounce off walls gently
      if (proj.x < proj.width / 2) {
        proj.x = proj.width / 2;
        proj.vx = Math.abs(proj.vx) * 0.5;
      }
      if (proj.x > width - proj.width / 2) {
        proj.x = width - proj.width / 2;
        proj.vx = -Math.abs(proj.vx) * 0.5;
      }

      // Ceiling - stop momentum completely, don't rebound
      if (proj.y < proj.height / 2 + 10) {
        proj.y = proj.height / 2 + 10;
        proj.vy = 0.1; // Just start falling slowly, no rebound
      }

      // If project falls through the bottom, respawn at top
      if (proj.y > state.groundY + 50) {
        proj.y = -proj.height; // Start above the visible area
        proj.vy = 0.1; // Slow fall
        proj.vx = (Math.random() - 0.5) * 0.3;
        // Randomize x position a bit
        proj.x = proj.width / 2 + Math.random() * (width - proj.width);
      }

      // Draw project card (no rotation)
      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Card shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.roundRect(-proj.width / 2 + 3, -proj.height / 2 + 3, proj.width, proj.height, 6);
      ctx.fill();

      // Card background
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(-proj.width / 2, -proj.height / 2, proj.width, proj.height, 6);
      ctx.fill();

      // Card border
      ctx.strokeStyle = colors.cloud;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Priority indicator bar at top
      const priorityColor = getPriorityColor(proj.project.priority);
      ctx.fillStyle = priorityColor;
      ctx.beginPath();
      ctx.roundRect(-proj.width / 2, -proj.height / 2, proj.width, 5, [6, 6, 0, 0]);
      ctx.fill();

      // Project title
      ctx.fillStyle = colors.charcoal;
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const title = proj.project.name.length > 14 
        ? proj.project.name.substring(0, 12) + '…'
        : proj.project.name;
      ctx.fillText(title, 0, -6);

      // Progress bar background
      const barWidth = proj.width - 16;
      const barHeight = 4;
      ctx.fillStyle = colors.cloud;
      ctx.beginPath();
      ctx.roundRect(-barWidth / 2, 5, barWidth, barHeight, 2);
      ctx.fill();

      // Progress bar fill
      const progress = proj.project.progress || 0;
      ctx.fillStyle = priorityColor;
      ctx.beginPath();
      ctx.roundRect(-barWidth / 2, 5, barWidth * (progress / 100), barHeight, 2);
      ctx.fill();

      // Progress text
      ctx.fillStyle = colors.stone;
      ctx.font = "8px 'Inter', sans-serif";
      ctx.fillText(`${progress}%`, 0, 16);

      ctx.restore();
    });

    // Update and draw people - each person independently seeks falling projects
    state.people.forEach(personState => {
      // Find the best project for this person to chase
      let bestProject = null;
      let bestScore = Infinity;
      
      state.projects.forEach(proj => {
        // Only consider projects that are falling (vy > 0) and getting low
        const projBottom = proj.y + proj.height / 2;
        const distToGround = state.groundY - projBottom;
        
        // Look for projects in the lower portion of the screen that are falling
        if (proj.vy > 0 && distToGround < 280) {
          const horizontalDist = Math.abs(personState.x - proj.x);
          // Prefer projects closer to this person's home zone
          const homeDistPenalty = Math.abs(personState.homeX - proj.x) * 0.3;
          // Urgency bonus - closer to ground = more urgent
          const urgency = Math.max(0, 280 - distToGround) * 1.5;
          const score = horizontalDist + homeDistPenalty - urgency;
          
          if (score < bestScore) {
            bestScore = score;
            bestProject = proj;
          }
        }
      });
      
      // If found a project to chase, move toward it
      if (bestProject) {
        personState.targetX = bestProject.x;
        personState.targetProjectId = bestProject.id;
      } else {
        // No urgent projects, return home
        personState.targetProjectId = null;
        personState.targetX = null;
      }
      
      // Movement
      if (personState.targetX !== null) {
        const dx = personState.targetX - personState.x;
        const moveAmount = Math.min(Math.abs(dx), personState.speed);
        personState.x += Math.sign(dx) * moveAmount;
      } else {
        // Return to home position
        const dx = personState.homeX - personState.x;
        if (Math.abs(dx) > 1) {
          personState.x += Math.sign(dx) * Math.min(Math.abs(dx), personState.speed * 0.5);
        }
      }

      // Check if we can bump ANY nearby project (not just assigned one)
      if (!personState.isJumping) {
        state.projects.forEach(proj => {
          const dx = Math.abs(personState.x - proj.x);
          const projBottom = proj.y + proj.height / 2;
          const personTop = personState.y - personState.radius;
          
          // If project is close horizontally and low enough, and falling
          if (dx < 50 && projBottom > personTop - 70 && projBottom < personTop + 15 && proj.vy > 0) {
            // Jump and bump!
            personState.isJumping = true;
            personState.jumpVelocity = -9;
            proj.vy = state.bouncePower - Math.random() * 2;
            proj.vx += (Math.random() - 0.5) * 1.8;
            personState.targetProjectId = null;
            personState.targetX = null;
          }
        });
      }

      // Handle jumping animation
      if (personState.isJumping) {
        personState.jumpVelocity += 0.6; // Gravity for jump
        personState.jumpY -= personState.jumpVelocity;
        
        if (personState.jumpY <= 0) {
          personState.jumpY = 0;
          personState.isJumping = false;
          personState.jumpVelocity = 0;
        }
      }

      // Draw person
      const drawY = personState.y - personState.jumpY;

      // Shadow (smaller when jumping)
      const shadowScale = 1 - (personState.jumpY / 60);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.ellipse(
        personState.x, 
        personState.y + personState.radius + 4, 
        personState.radius * shadowScale * 0.9, 
        5 * shadowScale, 
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Body (circle) with gradient
      const personGradient = ctx.createLinearGradient(
        personState.x - personState.radius,
        drawY - personState.radius,
        personState.x + personState.radius,
        drawY + personState.radius
      );
      personGradient.addColorStop(0, colors.earth);
      personGradient.addColorStop(1, colors.amber);
      
      ctx.fillStyle = personGradient;
      ctx.beginPath();
      ctx.arc(personState.x, drawY, personState.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Initials
      const initials = personState.person.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, personState.x, drawY);
    });

    // Draw decorative elements - floating particles
    const time = Date.now() / 1000;
    for (let i = 0; i < 8; i++) {
      const px = (width * (i + 1)) / 9 + Math.sin(time * 0.7 + i) * 20;
      const py = 25 + Math.sin(time * 0.4 + i * 2) * 12;
      ctx.fillStyle = `rgba(232, 167, 93, ${0.2 + Math.sin(time + i) * 0.08})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, colors, getPriorityColor]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth || 800,
          height: Math.min(500, container.clientWidth * 0.5) || 500,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize and start animation
  useEffect(() => {
    if (normalizedProjects.length === 0 || jugglePeople.length === 0) return;

    stateRef.current = initializeState();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [normalizedProjects, jugglePeople, initializeState, animate]);

  // Handle canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, [dimensions]);

  if (normalizedProjects.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>Add some projects to see them juggle!</p>
      </div>
    );
  }

  if (jugglePeople.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>Add some people to get the juggling started!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#D67C5C' }} />
          High Priority
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#E8A75D' }} />
          Medium
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#7A9B76' }} />
          Low
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: 'var(--cream, #FAF8F3)',
    border: '1px solid var(--cloud, #E8E3D8)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  canvas: {
    display: 'block',
    width: '100%',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid var(--cloud, #E8E3D8)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone, #6B6554)',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--stone, #6B6554)',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: 'var(--cream, #FAF8F3)',
    borderRadius: '16px',
    border: '1px dashed var(--cloud, #E8E3D8)',
  },
};
