import { useEffect, useRef, useState, useCallback } from 'react';

const ChristmasConfetti = () => {
  const canvasRef = useRef(null);
  const confettiRef = useRef([]);
  const animationFrameRef = useRef(null);
  const accumulatedConfettiRef = useRef([]);

  // Christmas emoji confetti options
  const confettiEmojis = ['🎄', '🎅', '🎁', '⛄', '🦌', '🔔', '⭐', '🍬', '🕯️', '❄️'];

  // Confetti piece class
  class ConfettiPiece {
    constructor(x, y, emoji) {
      this.x = x;
      this.y = y;
      this.emoji = emoji;
      this.velocityX = (Math.random() - 0.5) * 6;
      this.velocityY = -Math.random() * 8 - 4;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
      this.gravity = 0.4;
      this.size = 16;
      this.opacity = 1;
      this.settled = false;
    }

    update(canvas) {
      if (this.settled) return;

      this.velocityY += this.gravity;
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.rotationSpeed;

      // Check if hit bottom (settle)
      if (this.y >= canvas.height - 20) {
        this.y = canvas.height - 20 - Math.random() * 10;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotationSpeed = 0;
        this.settled = true;

        // Add to accumulated confetti
        accumulatedConfettiRef.current.push({
          x: this.x,
          y: this.y,
          emoji: this.emoji,
          rotation: this.rotation,
          size: this.size,
          opacity: 0.8
        });

        // Limit accumulation
        if (accumulatedConfettiRef.current.length > 200) {
          accumulatedConfettiRef.current.shift();
        }
      }

      // Remove if out of bounds
      if (this.x < -50 || this.x > canvas.width + 50) {
        this.settled = true;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = this.opacity;
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
    }
  }

  // Create confetti at specific location
  const createConfetti = useCallback((x, y) => {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 pieces
    for (let i = 0; i < count; i++) {
      const emoji = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
      confettiRef.current.push(new ConfettiPiece(x, y, emoji));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Handle click events
    const handleClick = (e) => {
      createConfetti(e.clientX, e.clientY);
    };

    // Handle keyboard events
    const handleKeyPress = (e) => {
      // Get the position of the active element (where typing is happening)
      const activeElement = document.activeElement;
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      // If there's an active input/textarea element, get its position
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      )) {
        const rect = activeElement.getBoundingClientRect();
        // Position confetti near the input element
        x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 100;
        y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 100;
      } else {
        // Fallback to random position near center if no input is focused
        x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
        y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
      }

      createConfetti(x, y);
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyPress);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw accumulated confetti
      accumulatedConfettiRef.current.forEach(piece => {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate((piece.rotation * Math.PI) / 180);
        ctx.globalAlpha = piece.opacity;
        ctx.font = `${piece.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(piece.emoji, 0, 0);
        ctx.restore();
      });

      // Update and draw active confetti
      confettiRef.current.forEach((piece, index) => {
        piece.update(canvas);
        piece.draw(ctx);
      });

      // Remove settled confetti
      confettiRef.current = confettiRef.current.filter(piece => !piece.settled);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyPress);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [createConfetti]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100
      }}
    />
  );
};

export default ChristmasConfetti;
