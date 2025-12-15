import { useEffect, useRef } from 'react';

const SnowEffect = () => {
  const canvasRef = useRef(null);
  const snowflakesRef = useRef([]);
  const accumulationRef = useRef([]);
  const animationFrameRef = useRef(null);

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

    // Snowflake class
    class Snowflake {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.radius = Math.random() * 3 + 1.5; // Larger snowflakes
        this.speed = Math.random() * 1 + 0.5;
        this.drift = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.6 + 0.4;
        this.isTinted = Math.random() > 0.6; // 40% chance of blue tint
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
            opacity: this.opacity * 0.8,
            isTinted: this.isTinted
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

      draw(ctx) {
        // Add shadow/glow for better visibility
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.isTinted ? 'rgba(173, 216, 230, 0.8)' : 'rgba(255, 255, 255, 0.8)';

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Use light blue tint for some snowflakes
        if (this.isTinted) {
          ctx.fillStyle = `rgba(230, 245, 255, ${this.opacity})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        }
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
      }
    }

    // Create initial snowflakes
    const snowflakeCount = 100;
    snowflakesRef.current = Array.from({ length: snowflakeCount }, () => new Snowflake());

    // Spread initial positions
    snowflakesRef.current.forEach((snowflake, i) => {
      snowflake.y = Math.random() * canvas.height;
    });

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw accumulated snow
      accumulationRef.current.forEach(snow => {
        // Add shadow/glow
        ctx.shadowBlur = 6;
        ctx.shadowColor = snow.isTinted ? 'rgba(173, 216, 230, 0.6)' : 'rgba(255, 255, 255, 0.6)';

        ctx.beginPath();
        ctx.arc(snow.x, snow.y, snow.radius, 0, Math.PI * 2);

        if (snow.isTinted) {
          ctx.fillStyle = `rgba(230, 245, 255, ${snow.opacity})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${snow.opacity})`;
        }
        ctx.fill();

        ctx.shadowBlur = 0;
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
