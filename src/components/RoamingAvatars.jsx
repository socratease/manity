import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getTheme } from '../lib/theme';

const getColors = (isSantafied = false) => getTheme(isSantafied ? 'santa' : 'base');

// Animation modes
const MODE = {
  JUGGLING: 'juggling',
  MARCH: 'march',
};

// Direction of travel
const DIRECTION = {
  DOWN: 'down',
  UP: 'up',
};

// Movement speed in pixels per second
const MARCH_SPEED = 180;
// Pause duration at project cards in milliseconds
const STOP_DURATION = 800;
// Acceleration for direction changes (ease factor)
const DIRECTION_EASE = 0.08;
// How far from road to project card center
const ROAD_TO_CARD_OFFSET = 60;

/**
 * RoamingAvatars - Avatars that march down from the juggler along roads between components
 *
 * JUGGLING mode: Avatars stay at the juggler (invisible, canvas handles rendering)
 * MARCH mode: Avatars walk down vertical "roads" in the margins between page components
 */
function RoamingAvatars({
  people = [],
  projects = [],
  jugglerRef,
  projectCardRefs,
  isSantafied = false,
  enabled = true,
  onModeChange = null, // Callback when mode changes (for coordinating with juggler)
}) {
  const colors = getColors(isSantafied);

  // Core state
  const [mode, setMode] = useState(MODE.JUGGLING);
  const [direction, setDirection] = useState(DIRECTION.DOWN);
  const [avatarStates, setAvatarStates] = useState([]);
  const [roadGeometry, setRoadGeometry] = useState(null);

  // Refs for animation
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const sentinelRef = useRef(null);
  const jugglerBottomYRef = useRef(0);
  const prefersReducedMotion = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handler = (e) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Notify parent of mode changes
  useEffect(() => {
    if (onModeChange) {
      onModeChange(mode);
    }
  }, [mode, onModeChange]);

  // Build map of person -> assigned projects (sorted by vertical position)
  const getPersonProjects = useCallback((personName) => {
    return projects.filter(project =>
      project.stakeholders?.some(s =>
        s.name?.toLowerCase() === personName?.toLowerCase()
      )
    );
  }, [projects]);

  // Get project card positions sorted by Y coordinate
  const getProjectCardPositions = useCallback(() => {
    const positions = [];
    if (!projectCardRefs?.current) return positions;

    Object.entries(projectCardRefs.current).forEach(([projectId, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY;
      positions.push({
        projectId,
        // Document coordinates (not viewport)
        x: rect.left + rect.width / 2,
        y: rect.top + scrollY + rect.height / 2,
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      });
    });

    // Sort by Y position (top to bottom)
    return positions.sort((a, b) => a.y - b.y);
  }, [projectCardRefs]);

  // Measure road geometry based on page layout
  const measureRoadGeometry = useCallback(() => {
    if (!jugglerRef?.current) return null;

    const jugglerRect = jugglerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const jugglerBottom = jugglerRect.bottom + scrollY;
    jugglerBottomYRef.current = jugglerBottom;

    // The "road" is a vertical lane - we use the left margin of the main content
    // We calculate based on project card positions
    const cardPositions = getProjectCardPositions();
    if (cardPositions.length === 0) return null;

    // Find the leftmost x position (with some offset for the road)
    const contentLeft = Math.min(...cardPositions.map(p => p.left));
    const roadX = contentLeft - 40; // Road runs 40px left of cards

    // Build stops for each project card
    const stops = cardPositions.map(pos => ({
      projectId: pos.projectId,
      roadY: pos.y, // Y position on the road
      cardX: pos.x, // Card center X
      cardY: pos.y, // Card center Y
    }));

    return {
      roadX,
      jugglerY: jugglerBottom - 50, // Start position just above juggler bottom
      jugglerCenterX: jugglerRect.left + jugglerRect.width / 2,
      stops,
      bottomY: Math.max(...cardPositions.map(p => p.bottom)) + 100,
    };
  }, [jugglerRef, getProjectCardPositions]);

  // Initialize avatar states when people change
  useEffect(() => {
    if (!people.length) return;

    const newStates = people.map((person, index) => {
      const assignedProjects = getPersonProjects(person.name);
      return {
        id: person.id || person.name,
        person,
        index,
        // Current position (document coordinates)
        x: 0,
        y: 0,
        // Current velocity for smooth direction changes
        velocityY: 0,
        // Target velocity based on direction
        targetVelocityY: 0,
        // Which projects this person is assigned to
        assignedProjectIds: assignedProjects.map(p => p.id),
        // Current stop index (which project we're heading to or at)
        currentStopIndex: 0,
        // State within the march
        marchState: 'walking', // 'walking', 'visiting', 'returning'
        // Time spent at current stop
        stopTimer: 0,
        // Progress of visit animation (0 = on road, 1 = at card)
        visitProgress: 0,
        // Visit direction (1 = going to card, -1 = returning to road)
        visitDirection: 0,
      };
    });

    setAvatarStates(newStates);
  }, [people, getPersonProjects]);

  // Set up IntersectionObserver for breakpoint detection
  useEffect(() => {
    if (!jugglerRef?.current || !enabled) return;

    // Create sentinel element positioned just below the juggler
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position: absolute; height: 1px; width: 100%; pointer-events: none;';
    sentinelRef.current = sentinel;

    // Position sentinel relative to juggler
    const updateSentinelPosition = () => {
      if (!jugglerRef.current) return;
      const jugglerRect = jugglerRef.current.getBoundingClientRect();
      const parent = jugglerRef.current.parentElement;
      if (parent) {
        sentinel.style.top = `${jugglerRect.height + 50}px`;
        if (!sentinel.parentElement) {
          parent.style.position = 'relative';
          parent.appendChild(sentinel);
        }
      }
    };

    updateSentinelPosition();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (prefersReducedMotion.current) return;

          // entry.isIntersecting tells us if sentinel is visible
          // When scrolling down and sentinel leaves viewport (top), we enter MARCH mode
          // When scrolling up and sentinel re-enters viewport, we switch to UP direction

          if (!entry.isIntersecting) {
            // Sentinel is above viewport - we've scrolled past it
            if (entry.boundingClientRect.bottom < 0) {
              setMode(MODE.MARCH);
              setDirection(DIRECTION.DOWN);
            }
          } else {
            // Sentinel is visible again - if we were marching, reverse direction
            if (mode === MODE.MARCH) {
              setDirection(DIRECTION.UP);
            }
          }
        });
      },
      {
        threshold: 0,
        rootMargin: '0px',
      }
    );

    observer.observe(sentinel);
    window.addEventListener('resize', updateSentinelPosition);

    return () => {
      observer.disconnect();
      if (sentinel.parentElement) {
        sentinel.parentElement.removeChild(sentinel);
      }
      window.removeEventListener('resize', updateSentinelPosition);
    };
  }, [jugglerRef, enabled, mode]);

  // Update road geometry on scroll/resize
  useEffect(() => {
    if (!enabled) return;

    const updateGeometry = () => {
      const geometry = measureRoadGeometry();
      if (geometry) {
        setRoadGeometry(geometry);
      }
    };

    updateGeometry();

    window.addEventListener('resize', updateGeometry);
    window.addEventListener('scroll', updateGeometry, { passive: true });

    return () => {
      window.removeEventListener('resize', updateGeometry);
      window.removeEventListener('scroll', updateGeometry);
    };
  }, [enabled, measureRoadGeometry]);

  // Initialize avatar positions when entering MARCH mode
  useEffect(() => {
    if (mode !== MODE.MARCH || !roadGeometry) return;

    setAvatarStates(prev => prev.map((state, index) => {
      // If just starting march, position at juggler
      if (state.y === 0) {
        const spacing = 40;
        const totalWidth = (prev.length - 1) * spacing;
        const offsetX = (index * spacing) - (totalWidth / 2);

        return {
          ...state,
          x: roadGeometry.jugglerCenterX + offsetX,
          y: roadGeometry.jugglerY,
          velocityY: 0,
          targetVelocityY: MARCH_SPEED,
          currentStopIndex: 0,
          marchState: 'walking',
        };
      }
      return state;
    }));
  }, [mode, roadGeometry]);

  // Main animation loop
  useEffect(() => {
    if (!enabled || mode !== MODE.MARCH || !roadGeometry) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // Cap at 100ms
      lastTimeRef.current = timestamp;

      setAvatarStates(prev => {
        let allAtJuggler = true;

        const newStates = prev.map(state => {
          // Get assigned stops for this avatar
          const myStops = roadGeometry.stops.filter(stop =>
            state.assignedProjectIds.includes(stop.projectId)
          );

          if (myStops.length === 0) {
            // No assigned projects - stay at current position
            return state;
          }

          // Determine target velocity based on direction
          const targetVel = direction === DIRECTION.DOWN ? MARCH_SPEED : -MARCH_SPEED;

          // Smooth velocity changes (ease into new direction)
          const velocityDiff = targetVel - state.velocityY;
          const newVelocityY = state.velocityY + velocityDiff * DIRECTION_EASE;

          let newY = state.y;
          let newX = state.x;
          let newMarchState = state.marchState;
          let newStopTimer = state.stopTimer;
          let newCurrentStopIndex = state.currentStopIndex;
          let newVisitProgress = state.visitProgress;
          let newVisitDirection = state.visitDirection;

          // Handle different march states
          if (state.marchState === 'walking') {
            // Move along the road
            newY = state.y + newVelocityY * deltaTime;

            // Check for stops (project cards)
            const currentStop = myStops[state.currentStopIndex];

            if (currentStop) {
              const distToStop = Math.abs(newY - currentStop.roadY);

              // If close to a stop and moving towards it
              if (distToStop < 20) {
                const movingTowardsStop =
                  (direction === DIRECTION.DOWN && state.y < currentStop.roadY) ||
                  (direction === DIRECTION.UP && state.y > currentStop.roadY);

                if (movingTowardsStop || distToStop < 5) {
                  // Arrived at stop - start visiting
                  newY = currentStop.roadY;
                  newMarchState = 'visiting';
                  newVisitProgress = 0;
                  newVisitDirection = 1;
                  newStopTimer = 0;
                }
              }
            }

            // Check if reached juggler (when going up)
            if (direction === DIRECTION.UP && newY <= roadGeometry.jugglerY) {
              newY = roadGeometry.jugglerY;
              // Will be handled below to switch to JUGGLING
            } else {
              allAtJuggler = false;
            }

            // Update stop index based on direction
            if (direction === DIRECTION.DOWN && currentStop && newY > currentStop.roadY + 50) {
              // Passed this stop, move to next
              if (state.currentStopIndex < myStops.length - 1) {
                newCurrentStopIndex = state.currentStopIndex + 1;
              }
            } else if (direction === DIRECTION.UP && currentStop && newY < currentStop.roadY - 50) {
              // Passed this stop going up, move to previous
              if (state.currentStopIndex > 0) {
                newCurrentStopIndex = state.currentStopIndex - 1;
              }
            }

          } else if (state.marchState === 'visiting') {
            // Animate to/from project card
            const currentStop = myStops[state.currentStopIndex];

            if (currentStop) {
              // Update visit progress
              newVisitProgress = state.visitProgress + state.visitDirection * deltaTime * 3;

              if (newVisitProgress >= 1) {
                // Reached the card - pause
                newVisitProgress = 1;
                newStopTimer = state.stopTimer + deltaTime * 1000;

                if (newStopTimer >= STOP_DURATION) {
                  // Done visiting, return to road
                  newVisitDirection = -1;
                }
              } else if (newVisitProgress <= 0) {
                // Back on the road - continue walking
                newVisitProgress = 0;
                newMarchState = 'walking';

                // Move to next/prev stop index
                if (direction === DIRECTION.DOWN) {
                  if (state.currentStopIndex < myStops.length - 1) {
                    newCurrentStopIndex = state.currentStopIndex + 1;
                  }
                } else {
                  if (state.currentStopIndex > 0) {
                    newCurrentStopIndex = state.currentStopIndex - 1;
                  }
                }
              }

              // Calculate position during visit (eased)
              const easeProgress = newVisitProgress < 0.5
                ? 2 * newVisitProgress * newVisitProgress
                : 1 - Math.pow(-2 * newVisitProgress + 2, 2) / 2;

              newX = roadGeometry.roadX + (currentStop.cardX - roadGeometry.roadX - ROAD_TO_CARD_OFFSET) * easeProgress;
              newY = currentStop.roadY;
            }

            allAtJuggler = false;

          }

          return {
            ...state,
            x: newX,
            y: newY,
            velocityY: newVelocityY,
            marchState: newMarchState,
            stopTimer: newStopTimer,
            currentStopIndex: newCurrentStopIndex,
            visitProgress: newVisitProgress,
            visitDirection: newVisitDirection,
          };
        });

        // If all avatars have returned to juggler and direction is UP, switch to JUGGLING
        if (allAtJuggler && direction === DIRECTION.UP) {
          setTimeout(() => setMode(MODE.JUGGLING), 0);
        }

        return newStates;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimeRef.current = 0;
    };
  }, [enabled, mode, direction, roadGeometry]);

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

  // Don't render if in juggling mode, disabled, or reduced motion
  if (!enabled || mode === MODE.JUGGLING || prefersReducedMotion.current || avatarStates.length === 0) {
    return null;
  }

  // Convert document coords to viewport coords for fixed positioning
  const scrollY = window.scrollY;

  // Render avatars
  const avatarElements = avatarStates.map((state) => {
    if (state.assignedProjectIds.length === 0) return null;

    const initials = getInitials(state.person.name);
    const viewportY = state.y - scrollY;

    // Walking animation - subtle bob
    const walkingBob = state.marchState === 'walking'
      ? Math.sin(Date.now() / 150 + state.index * 2) * 2
      : 0;

    // Scale during movement
    const scale = state.marchState === 'visiting' && state.visitProgress > 0
      ? 1 + Math.sin(state.visitProgress * Math.PI) * 0.15
      : 1;

    return (
      <div
        key={state.id}
        style={{
          position: 'fixed',
          zIndex: 9999,
          pointerEvents: 'none',
          transform: `translate3d(${state.x - 16}px, ${viewportY - 16 + walkingBob}px, 0) scale(${scale})`,
          width: 32,
          height: 32,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.earth}, ${colors.amber})`,
            border: '2px solid rgba(255, 255, 255, 0.6)',
            boxShadow: state.marchState === 'visiting'
              ? '0 8px 20px rgba(0, 0, 0, 0.3)'
              : '0 4px 12px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', sans-serif",
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {initials || '?'}
        </div>
        {/* Santa hat */}
        {isSantafied && (
          <div style={{
            position: 'absolute',
            top: -6,
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
        {/* Walking legs animation */}
        {state.marchState === 'walking' && (
          <div style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 4,
          }}>
            <div style={{
              width: 4,
              height: 6,
              backgroundColor: colors.earth,
              borderRadius: 2,
              transform: `rotate(${Math.sin(Date.now() / 100 + state.index) * 20}deg)`,
              transformOrigin: 'top center',
            }} />
            <div style={{
              width: 4,
              height: 6,
              backgroundColor: colors.earth,
              borderRadius: 2,
              transform: `rotate(${Math.sin(Date.now() / 100 + state.index + Math.PI) * 20}deg)`,
              transformOrigin: 'top center',
            }} />
          </div>
        )}
      </div>
    );
  });

  return createPortal(
    <div className="roaming-avatars-container" style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none' }}>
      {avatarElements}
    </div>,
    document.body
  );
}

export default RoamingAvatars;
