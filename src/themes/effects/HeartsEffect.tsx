import { useEffect, useRef } from 'react';

interface HeartData {
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
}

const HeartsEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<Heart[]>([]);
  const accumulationRef = useRef<HeartData[]>([]);
  const animationFrameRef = useRef<number | null>(null);

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

    // Heart class
    class Heart {
      x: number;
      y: number;
      size: number;
      speed: number;
      drift: number;
      opacity: number;
      rotation: number;
      rotationSpeed: number;
      emoji: string;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.size = 0;
        this.speed = 0;
        this.drift = 0;
        this.opacity = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.emoji = '';
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 20;
        this.size = Math.random() * 12 + 12; // Size between 12-24px
        this.speed = Math.random() * 1.5 + 0.5; // Speed between 0.5-2
        this.drift = Math.random() * 1 - 0.5; // Horizontal drift
        this.opacity = Math.random() * 0.4 + 0.6; // Opacity between 0.6-1
        this.rotation = Math.random() * 40 - 20; // Slight rotation
        this.rotationSpeed = Math.random() * 2 - 1; // Rotation speed

        // Mix of heart emojis
        const heartEmojis = ['❤️', '💕', '💖', '💗', '💓', '💞'];
        this.emoji = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
      }

      update() {
        this.y -= this.speed; // Float upward
        this.x += this.drift;
        this.rotation += this.rotationSpeed;

        // Check if heart reached top (accumulation zone)
        if (this.y <= 30) {
          // Add to accumulation (hearts at top)
          accumulationRef.current.push({
            x: this.x,
            y: Math.random() * 5 + 10,
            size: this.size,
            opacity: this.opacity * 0.8,
            rotation: this.rotation
          });

          // Limit accumulation
          if (accumulationRef.current.length > 100) {
            accumulationRef.current.shift();
          }

          this.reset();
        }

        // Reset if out of bounds
        if (this.x < -50 || this.x > canvas.width + 50) {
          this.reset();
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

    // Create initial hearts
    const heartCount = 50;
    heartsRef.current = Array.from({ length: heartCount }, () => new Heart());

    // Spread initial positions
    heartsRef.current.forEach((heart) => {
      heart.y = Math.random() * canvas.height;
    });

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw accumulated hearts at top
      accumulationRef.current.forEach(heart => {
        ctx.save();
        ctx.translate(heart.x, heart.y);
        ctx.rotate((heart.rotation * Math.PI) / 180);
        ctx.globalAlpha = heart.opacity;
        ctx.font = `${heart.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', 0, 0);
        ctx.restore();
      });

      // Update and draw floating hearts
      heartsRef.current.forEach(heart => {
        heart.update();
        heart.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
        zIndex: 150
      }}
    />
  );
};

export default HeartsEffect;
