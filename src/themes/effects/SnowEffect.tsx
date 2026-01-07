import { useEffect, useRef } from 'react';

interface SnowflakeData {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const accumulationRef = useRef<SnowflakeData[]>([]);
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

    // Snowflake class
    class Snowflake {
      x: number;
      y: number;
      radius: number;
      speed: number;
      drift: number;
      opacity: number;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.speed = 0;
        this.drift = 0;
        this.opacity = 0;
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.radius = Math.random() * 2 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.drift = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.6 + 0.4;
      }

      update() {
        this.y += this.speed;
        this.x += this.drift;

        // Check if snowflake reached bottom (accumulation zone)
        if (this.y >= canvas.height - 30) {
          // Add to accumulation
          accumulationRef.current.push({
            x: this.x,
            y: canvas.height - Math.random() * 5,
            radius: this.radius,
            opacity: this.opacity * 0.8
          });

          // Limit accumulation
          if (accumulationRef.current.length > 150) {
            accumulationRef.current.shift();
          }

          this.reset();
        }

        // Reset if out of bounds
        if (this.x < 0 || this.x > canvas.width) {
          this.reset();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Create initial snowflakes
    const snowflakeCount = 100;
    snowflakesRef.current = Array.from({ length: snowflakeCount }, () => new Snowflake());

    // Spread initial positions
    snowflakesRef.current.forEach((snowflake) => {
      snowflake.y = Math.random() * canvas.height;
    });

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw accumulated snow
      accumulationRef.current.forEach(snow => {
        ctx.beginPath();
        ctx.arc(snow.x, snow.y, snow.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${snow.opacity})`;
        ctx.fill();
      });

      // Update and draw falling snowflakes
      snowflakesRef.current.forEach(snowflake => {
        snowflake.update();
        snowflake.draw(ctx);
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

export default SnowEffect;
