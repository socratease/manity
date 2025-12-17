import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTheme } from '../lib/theme';

const getColors = (isSantafied = false) => getTheme(isSantafied ? 'santa' : 'base');

/**
 * RoamingAvatars - Avatars that escape the juggler and hop between their assigned projects
 *
 * This component creates DOM-based avatars that:
 * 1. Start in sync with canvas avatars in PeopleProjectsJuggle
 * 2. "Escape" when user scrolls past the juggler
 * 3. Hop around between their assigned project cards
 */
function RoamingAvatars({
  people = [],
  projects = [],
  jugglerRef,
  projectCardRefs,
  isSantafied = false,
  enabled = true
}) {
  const colors = getColors(isSantafied);
  const [avatarStates, setAvatarStates] = useState([]);
  const [isReleased, setIsReleased] = useState(false);
  const [jugglerRect, setJugglerRect] = useState(null);
  const [animationTick, setAnimationTick] = useState(0);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Tick for idle animation (triggers re-render for bounce effect)
  useEffect(() => {
    if (!isReleased || !enabled) return;

    const tickInterval = setInterval(() => {
      setAnimationTick(t => t + 1);
    }, 50); // Update at ~20fps for smooth idle animation

    return () => clearInterval(tickInterval);
  }, [isReleased, enabled]);

  // Build a map of person -> assigned projects
  const getPersonProjects = useCallback((personName) => {
    return projects.filter(project =>
      project.stakeholders?.some(s =>
        s.name?.toLowerCase() === personName?.toLowerCase()
      )
    );
  }, [projects]);

  // Initialize avatar states when people change
  useEffect(() => {
    if (!people.length) return;

    const newStates = people.map((person, index) => {
      const assignedProjects = getPersonProjects(person.name);
      return {
        id: person.id || person.name,
        person,
        // Current position (will be updated based on juggler position)
        x: 0,
        y: 0,
        // Target position for animation
        targetX: 0,
        targetY: 0,
        // Animation state
        isAnimating: false,
        animationProgress: 0,
        // Hop arc parameters
        startX: 0,
        startY: 0,
        arcHeight: 0,
        // Which projects this person is assigned to
        assignedProjects: assignedProjects.map(p => p.id),
        currentProjectIndex: 0,
        // Timing for staying at each project
        dwellTime: 2000 + Math.random() * 1000, // 2-3 seconds at each project
        lastProjectChangeTime: Date.now() + index * 500, // Stagger initial movement
        // Initial offset within juggler (matches canvas layout)
        initialOffsetX: 0,
        initialOffsetY: 0,
      };
    });

    setAvatarStates(newStates);
  }, [people, getPersonProjects]);

  // Track scroll and update juggler position
  useEffect(() => {
    if (!jugglerRef?.current) return;

    const updatePositions = () => {
      const rect = jugglerRef.current.getBoundingClientRect();
      setJugglerRect(rect);

      // Calculate release threshold - when juggler is mostly scrolled out of view
      const scrollThreshold = rect.bottom - 100;
      const shouldRelease = scrollThreshold < 0;

      if (shouldRelease !== isReleased) {
        setIsReleased(shouldRelease);
      }
    };

    // Initial update
    updatePositions();

    // Listen to scroll
    window.addEventListener('scroll', updatePositions, { passive: true });
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [jugglerRef, isReleased]);

  // Calculate initial positions based on juggler canvas layout
  useEffect(() => {
    if (!jugglerRect || !people.length) return;

    setAvatarStates(prev => prev.map((state, index) => {
      const spacing = jugglerRect.width / (people.length + 1);
      const canvasBottomY = jugglerRect.height - 35;

      return {
        ...state,
        initialOffsetX: spacing * (index + 1),
        initialOffsetY: canvasBottomY,
        x: jugglerRect.left + spacing * (index + 1),
        y: jugglerRect.top + canvasBottomY,
      };
    }));
  }, [jugglerRect, people.length]);

  // Get project card position by ID (returns viewport coordinates for fixed positioning)
  const getProjectCardPosition = useCallback((projectId) => {
    const ref = projectCardRefs?.current?.[projectId];
    if (!ref) return null;

    const rect = ref.getBoundingClientRect();
    // Return position at bottom center of the card (viewport coordinates)
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom - 24, // Just above the bottom edge of the card
    };
  }, [projectCardRefs]);

  // Main animation loop
  useEffect(() => {
    if (!enabled || !isReleased) return;

    const animate = (timestamp) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setAvatarStates(prev => {
        const now = Date.now();

        return prev.map(state => {
          // If no assigned projects, avatar just floats around
          if (state.assignedProjects.length === 0) {
            return state;
          }

          // Get current project card position (updates with scroll)
          const currentProjectId = state.assignedProjects[state.currentProjectIndex];
          const currentCardPos = getProjectCardPosition(currentProjectId);

          // Check if it's time to move to next project
          const timeSinceLastChange = now - state.lastProjectChangeTime;

          if (!state.isAnimating && timeSinceLastChange >= state.dwellTime) {
            // Time to move to next project
            const nextIndex = (state.currentProjectIndex + 1) % state.assignedProjects.length;
            const nextProjectId = state.assignedProjects[nextIndex];
            const targetPos = getProjectCardPosition(nextProjectId);

            if (targetPos) {
              // Start animation to next project
              return {
                ...state,
                isAnimating: true,
                animationProgress: 0,
                startX: state.x,
                startY: state.y,
                targetX: targetPos.x,
                targetY: targetPos.y,
                arcHeight: 80 + Math.random() * 60, // Random hop height
                currentProjectIndex: nextIndex,
              };
            }
          }

          // Continue animation if in progress
          if (state.isAnimating) {
            // Update target position in case page scrolled during animation
            const nextProjectId = state.assignedProjects[state.currentProjectIndex];
            const freshTargetPos = getProjectCardPosition(nextProjectId);
            const targetX = freshTargetPos?.x ?? state.targetX;
            const targetY = freshTargetPos?.y ?? state.targetY;

            const newProgress = Math.min(1, state.animationProgress + deltaTime / 600); // 600ms hop duration

            // Parabolic arc interpolation
            const t = newProgress;
            const easeT = t < 0.5
              ? 2 * t * t  // Ease in
              : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease out

            const linearX = state.startX + (targetX - state.startX) * easeT;
            const linearY = state.startY + (targetY - state.startY) * easeT;

            // Add parabolic arc (highest at middle of animation)
            const arcOffset = -state.arcHeight * 4 * t * (1 - t);

            if (newProgress >= 1) {
              // Animation complete
              return {
                ...state,
                x: targetX,
                y: targetY,
                targetX,
                targetY,
                isAnimating: false,
                animationProgress: 0,
                lastProjectChangeTime: Date.now(),
              };
            }

            return {
              ...state,
              x: linearX,
              y: linearY + arcOffset,
              targetX,
              targetY,
              animationProgress: newProgress,
            };
          }

          // When not animating, follow current project card position
          if (currentCardPos) {
            return {
              ...state,
              x: currentCardPos.x,
              y: currentCardPos.y,
            };
          }

          return state;
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, isReleased, getProjectCardPosition]);

  // When released, snap avatars to their first assigned project
  useEffect(() => {
    if (!isReleased) return;

    setAvatarStates(prev => prev.map(state => {
      if (state.assignedProjects.length === 0) return state;

      const firstProjectId = state.assignedProjects[0];
      const targetPos = getProjectCardPosition(firstProjectId);

      if (targetPos && !state.isAnimating) {
        return {
          ...state,
          isAnimating: true,
          animationProgress: 0,
          startX: state.x,
          startY: state.y,
          targetX: targetPos.x,
          targetY: targetPos.y,
          arcHeight: 120 + Math.random() * 80, // Big initial hop
          currentProjectIndex: 0,
        };
      }

      return state;
    }));
  }, [isReleased, getProjectCardPosition]);

  // Get initials from name
  const getInitials = (name) => {
    return (name || '')
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Don't render if not released or no avatars
  if (!enabled || !isReleased || avatarStates.length === 0) {
    return null;
  }

  // Calculate offset for avatars at the same project to prevent stacking
  const getAvatarOffset = (state, allStates) => {
    if (state.isAnimating) return 0;

    const currentProjectId = state.assignedProjects[state.currentProjectIndex];
    const avatarsAtSameProject = allStates.filter(s =>
      !s.isAnimating &&
      s.assignedProjects.length > 0 &&
      s.assignedProjects[s.currentProjectIndex] === currentProjectId
    );

    const myIndex = avatarsAtSameProject.findIndex(s => s.id === state.id);
    const totalAtProject = avatarsAtSameProject.length;

    if (totalAtProject <= 1) return 0;

    // Spread avatars horizontally, centered
    const spacing = 28;
    const totalWidth = (totalAtProject - 1) * spacing;
    return (myIndex * spacing) - (totalWidth / 2);
  };

  // Render avatars as fixed-position elements via portal
  const avatarElements = avatarStates.map((state, index) => {
    // Only show avatars that have assigned projects
    if (state.assignedProjects.length === 0) return null;

    const initials = getInitials(state.person.name);

    // Calculate idle bounce offset based on time (only when not animating)
    const idleBounce = !state.isAnimating
      ? Math.sin(Date.now() / 300 + index * 1.5) * 3
      : 0;

    // Calculate horizontal offset if multiple avatars at same project
    const stackOffset = getAvatarOffset(state, avatarStates);

    // Scale effect during hop
    const hopScale = state.isAnimating
      ? 1 + Math.sin(state.animationProgress * Math.PI) * 0.2
      : 1;

    return (
      <div
        key={state.id}
        style={{
          position: 'fixed',
          left: state.x - 16 + stackOffset, // Center the 32px avatar + offset for stacking
          top: state.y - 16 + idleBounce,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.earth}, ${colors.amber})`,
          border: '2px solid rgba(255, 255, 255, 0.6)',
          boxShadow: state.isAnimating
            ? '0 8px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          zIndex: 9999,
          pointerEvents: 'none',
          transform: `scale(${hopScale})`,
          willChange: 'transform, left, top',
        }}
      >
        {initials || '?'}
        {isSantafied && (
          <div style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '12px solid #C41E3A',
          }}>
            <div style={{
              position: 'absolute',
              top: 12,
              left: -8,
              width: 16,
              height: 4,
              background: '#FFFFFF',
              borderRadius: 2,
            }} />
            <div style={{
              position: 'absolute',
              top: -4,
              left: -3,
              width: 6,
              height: 6,
              background: '#FFFFFF',
              borderRadius: '50%',
            }} />
          </div>
        )}
      </div>
    );
  });

  return createPortal(
    <div className="roaming-avatars-container">
      {avatarElements}
    </div>,
    document.body
  );
}

export default RoamingAvatars;
