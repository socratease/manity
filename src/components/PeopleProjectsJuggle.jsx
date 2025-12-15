import React, { useRef, useEffect, useState } from 'react';
import { getTheme } from '../lib/theme';

const getColors = (isSantafied = false) => getTheme(isSantafied ? 'santa' : 'base');

function PeopleProjectsJuggle({ projects = [], people = [], isSantafied = false }) {
  const colors = getColors(isSantafied);
  const getPriorityColor = (priority) => {
    const priorityColors = {
      high: colors.coral,
      medium: colors.amber,
      low: colors.sage,
    };
    return priorityColors[priority] || colors.stone;
  };
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef(null);
  const dimensionsRef = useRef({ width: 800, height: 450 });
  const [canvasKey, setCanvasKey] = useState(0);
  const [hoveredProject, setHoveredProject] = useState(null);

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const newWidth = container.clientWidth || 800;
        const newHeight = Math.min(450, newWidth * 0.5) || 450;
        dimensionsRef.current = { width: newWidth, height: newHeight };
        setCanvasKey(k => k + 1);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || projects.length === 0 || people.length === 0) return;

    const { width, height } = dimensionsRef.current;
    const bottomY = height - 35;
    const projectCardHeight = 42;
    const projectCardWidth = 95;
    const personRadius = 16;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const projectStates = projects.map((project, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const xSpacing = width / 6;
      const ySpacing = (height - 140) / 4;

      return {
        id: project.id,
        project,
        x: xSpacing * (col + 1) + (Math.random() - 0.5) * 40,
        y: 45 + row * ySpacing + (Math.random() - 0.5) * 25,
        vy: 0.12 + Math.random() * 0.18,
        vx: (Math.random() - 0.5) * 0.5,
        width: projectCardWidth,
        height: projectCardHeight,
      };
    });

    const peopleStates = people.map((person, index) => {
      const spacing = width / (people.length + 1);
      return {
        id: person.id || person.name,
        person,
        x: spacing * (index + 1),
        homeX: spacing * (index + 1),
        y: bottomY,
        radius: personRadius,
        targetX: null,
        vx: 0,
        speed: 3.5 + Math.random() * 2,
        cooldown: 0,
        isJumping: false,
        jumpY: 0,
        jumpVelocity: 0,
      };
    });

    stateRef.current = {
      projects: projectStates,
      people: peopleStates,
      bottomY,
      gravity: 0.005,
      maxFallSpeed: 0.8,
      bouncePower: -7,
    };

    const animate = () => {
      const state = stateRef.current;
      if (!state) return;

      const { width, height } = dimensionsRef.current;

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#F5F0E8');
      gradient.addColorStop(1, colors.cream);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      state.projects.forEach(proj => {
        proj.vy += state.gravity;

        if (proj.vy > state.maxFallSpeed) {
          proj.vy = state.maxFallSpeed;
        }

        proj.y += proj.vy;
        proj.x += proj.vx;
        proj.vx *= 0.995;

        if (proj.x < proj.width / 2 + 10) {
          proj.x = proj.width / 2 + 10;
          proj.vx = Math.abs(proj.vx) * 0.5;
        }
        if (proj.x > width - proj.width / 2 - 10) {
          proj.x = width - proj.width / 2 - 10;
          proj.vx = -Math.abs(proj.vx) * 0.5;
        }

        if (proj.y < proj.height / 2 + 10) {
          proj.y = proj.height / 2 + 10;
          proj.vy = 0.1;
        }

        if (proj.y > height + proj.height) {
          proj.y = -proj.height;
          proj.vy = 0.15;
          proj.vx = (Math.random() - 0.5) * 0.5;
          proj.x = proj.width / 2 + Math.random() * (width - proj.width);
        }

        ctx.save();
        ctx.translate(proj.x, proj.y);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(-proj.width / 2, -proj.height / 2, proj.width, proj.height, 6);
        ctx.fill();

        ctx.strokeStyle = colors.cloud;
        ctx.lineWidth = 1;
        ctx.stroke();

        const priorityColor = getPriorityColor(proj.project.priority);
        ctx.fillStyle = priorityColor;
        ctx.beginPath();
        ctx.roundRect(-proj.width / 2, -proj.height / 2, proj.width, 4, [6, 6, 0, 0]);
        ctx.fill();

        ctx.fillStyle = colors.charcoal;
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const title = proj.project.name.length > 11
          ? proj.project.name.substring(0, 9) + '…'
          : proj.project.name;
        ctx.fillText(title, 0, -5);

        const barWidth = proj.width - 14;
        const barHeight = 3;
        ctx.fillStyle = colors.cloud;
        ctx.beginPath();
        ctx.roundRect(-barWidth / 2, 6, barWidth, barHeight, 2);
        ctx.fill();

        const progress = proj.project.progress || 0;
        ctx.fillStyle = priorityColor;
        ctx.beginPath();
        ctx.roundRect(-barWidth / 2, 6, barWidth * (progress / 100), barHeight, 2);
        ctx.fill();

        ctx.fillStyle = colors.stone;
        ctx.font = '7px Inter, sans-serif';
        ctx.fillText(`${progress}%`, 0, 14);

        ctx.restore();
      });

      state.people.forEach(personState => {
        if (personState.cooldown > 0) {
          personState.cooldown--;
        }

        let bestProject = null;
        let bestScore = Infinity;

        if (personState.cooldown === 0) {
          state.projects.forEach(proj => {
            const projBottom = proj.y + proj.height / 2;
            const distToBottom = state.bottomY - projBottom;

            if (proj.vy > 0 && distToBottom < 180 && distToBottom > -20) {
              const horizontalDist = Math.abs(personState.x - proj.x);
              const homeDistPenalty = Math.abs(personState.homeX - proj.x) * 0.2;
              const urgency = Math.max(0, 180 - distToBottom) * 2;
              const score = horizontalDist + homeDistPenalty - urgency;

              if (score < bestScore) {
                bestScore = score;
                bestProject = proj;
              }
            }
          });
        }

        if (bestProject) {
          personState.targetX = bestProject.x;
        } else {
          personState.targetX = personState.homeX;
        }

        const dx = personState.targetX - personState.x;
        const targetVx = Math.sign(dx) * Math.min(Math.abs(dx) * 0.12, personState.speed);
        personState.vx += (targetVx - personState.vx) * 0.18;
        personState.x += personState.vx;

        if (personState.cooldown === 0 && !personState.isJumping) {
          state.projects.forEach(proj => {
            const pdx = Math.abs(personState.x - proj.x);
            const projBottom = proj.y + proj.height / 2;
            const personTop = personState.y - personState.radius;

            if (pdx < 42 && projBottom > personTop - 45 && projBottom < personTop + 10 && proj.vy > 0) {
              proj.vy = state.bouncePower - Math.random() * 1.5;
              proj.vx += (Math.random() - 0.5) * 2.5;
              personState.cooldown = 18;
              personState.isJumping = true;
              personState.jumpVelocity = -8;
            }
          });
        }

        if (personState.isJumping) {
          personState.jumpVelocity += 0.5;
          personState.jumpY -= personState.jumpVelocity;

          if (personState.jumpY <= 0) {
            personState.jumpY = 0;
            personState.isJumping = false;
            personState.jumpVelocity = 0;
          }
        }

        const drawY = personState.y - personState.jumpY;

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

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const initials = (personState.person.name || '')
          .split(' ')
          .map(n => n[0])
          .filter(Boolean)
          .join('')
          .toUpperCase()
          .substring(0, 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials || '?', personState.x, drawY);

        // Draw santa hat if santafied
        if (isSantafied) {
          const hatX = personState.x;
          const hatY = drawY - personState.radius;
          const hatWidth = personState.radius * 1.5;
          const hatHeight = personState.radius * 1.2;

          // Draw the main red part of the hat (triangle)
          ctx.fillStyle = '#C41E3A';
          ctx.beginPath();
          ctx.moveTo(hatX - hatWidth / 2, hatY);
          ctx.lineTo(hatX + hatWidth / 2, hatY);
          ctx.lineTo(hatX + hatWidth * 0.1, hatY - hatHeight);
          ctx.closePath();
          ctx.fill();

          // Draw white trim at the base
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(hatX, hatY, hatWidth / 2, hatWidth * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw white pom-pom at the top
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(hatX + hatWidth * 0.1, hatY - hatHeight, hatWidth * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const time = Date.now() / 1000;
      for (let i = 0; i < 6; i++) {
        const px = (width * (i + 1)) / 7 + Math.sin(time * 0.7 + i) * 15;
        const py = 18 + Math.sin(time * 0.4 + i * 2) * 10;
        ctx.fillStyle = `rgba(232, 167, 93, ${0.15 + Math.sin(time + i) * 0.05})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [projects, people, canvasKey]);

  // Handle canvas click to navigate to project
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on a project card
    const clickedProject = stateRef.current.projects.find(proj => {
      const dx = Math.abs(proj.x - x);
      const dy = Math.abs(proj.y - y);
      return dx < proj.width / 2 && dy < proj.height / 2;
    });

    if (clickedProject) {
      window.location.hash = `#/project/${clickedProject.id}`;
    }
  };

  // Handle canvas hover to show pointer cursor
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over a project card
    const hoveredProj = stateRef.current.projects.find(proj => {
      const dx = Math.abs(proj.x - x);
      const dy = Math.abs(proj.y - y);
      return dx < proj.width / 2 && dy < proj.height / 2;
    });

    if (hoveredProj) {
      canvas.style.cursor = 'pointer';
      setHoveredProject(hoveredProj.id);
    } else {
      canvas.style.cursor = 'default';
      setHoveredProject(null);
    }
  };

  return (
    <div style={{
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#FAF8F3',
      border: '1px solid #E8E3D8',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%' }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        padding: '12px 16px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E8E3D8',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: '#6B6554' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D67C5C' }} />
          High Priority
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: '#6B6554' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#E8A75D' }} />
          Medium
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: '#6B6554' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#7A9B76' }} />
          Low
        </span>
      </div>
    </div>
  );
}

export default PeopleProjectsJuggle;
