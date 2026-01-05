import { useEffect, useRef, useCallback } from 'react';

interface ConfettiEffectProps {
  emojis: string[];
}

interface AccumulatedConfetti {
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  size: number;
  opacity: number;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ emojis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const accumulatedConfettiRef = useRef<AccumulatedConfetti[]>([]);

  // Confetti piece class
  class ConfettiPiece {
    x: number;
    y: number;
    emoji: string;
    velocityX: number;
    velocityY: number;
    rotation: number;
    rotationSpeed: number;
    gravity: number;
    size: number;
    opacity: number;
    settled: boolean;

    constructor(x: number, y: number, emoji: string) {
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

    update(canvas: HTMLCanvasElement) {
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

    draw(ctx: CanvasRenderingContext2D) {
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
  const createConfetti = useCallback((x: number, y: number, isClick = false) => {
    // For clicks: random 1-3 pieces, for keystrokes: exactly 1 piece
    const count = isClick ? Math.floor(Math.random() * 3) + 1 : 1;
    for (let i = 0; i < count; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      confettiRef.current.push(new ConfettiPiece(x, y, emoji));
    }
  }, [emojis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track active input element for emoji spawning
    let lastInputPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Update input position on focus
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        const rect = target.getBoundingClientRect();
        lastInputPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    };

    // Handle click events
    const handleClick = (e: MouseEvent) => {
      createConfetti(e.clientX, e.clientY, true);
    };

    // Handle keyboard events
    const handleKeyPress = () => {
      // Get actual caret/cursor position if available
      const activeElement = document.activeElement as HTMLElement;
      let x = lastInputPosition.x;
      let y = lastInputPosition.y;

      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        const rect = activeElement.getBoundingClientRect();
        x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 40;
        y = rect.top + rect.height / 2;
      }

      createConfetti(x, y, false);
    };

    document.addEventListener('focusin', handleFocus);
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
      confettiRef.current.forEach((piece) => {
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
      document.removeEventListener('focusin', handleFocus);
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

export default ConfettiEffect;
