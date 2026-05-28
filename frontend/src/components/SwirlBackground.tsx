import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  px: number; // Previous X for trailing lines
  py: number; // Previous Y for trailing lines
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  speed: number;
  spin: number;
}

export function SwirlBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Initialize particles
    const particleCount = 220;
    const particles: Particle[] = [];

    const colors = [
      "rgba(6, 182, 212, 0.45)",  // Soft Cyan
      "rgba(59, 130, 246, 0.4)",  // Soft Blue
      "rgba(139, 92, 246, 0.35)", // Soft Violet
      "rgba(34, 211, 238, 0.3)",  // Glowing Light Cyan
      "rgba(147, 51, 234, 0.3)",  // Glowing Light Purple
    ];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2.2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.05 + 0.02,
        spin: (Math.random() - 0.5) * 0.015,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.003;

      // Fully clear the canvas each frame to prevent trails
      ctx.clearRect(0, 0, width, height);

      // Define target attractor
      const mouse = mouseRef.current;
      
      // Interpolate target location to make movements silky smooth
      if (mouse.active) {
        mouse.tx += (mouse.x - mouse.tx) * 0.08;
        mouse.ty += (mouse.y - mouse.ty) * 0.08;
      } else {
        // Drift elegantly in an orbital infinity path when mouse is inactive
        const driftX = width / 2 + Math.cos(time * 2) * (width * 0.22);
        const driftY = height / 2 + Math.sin(time * 3.5) * (height * 0.15);
        mouse.tx += (driftX - mouse.tx) * 0.05;
        mouse.ty += (driftY - mouse.ty) * 0.05;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Store previous coordinates for trailing lines
        p.px = p.x;
        p.py = p.y;

        // Calculate delta to target attractor
        const dx = mouse.tx - p.x;
        const dy = mouse.ty - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Circular spiral force physics
        p.angle += p.spin;
        
        // Attraction force that increases when closer to the attractor
        const maxDist = Math.max(width, height) * 0.45;
        const force = Math.max(0, (maxDist - distance) / maxDist);
        
        // Radial pull
        p.vx += (dx / (distance + 0.1)) * force * 0.06;
        p.vy += (dy / (distance + 0.1)) * force * 0.06;

        // Orbit swirl force (perpendicular orbital vector)
        p.vx += (-dy / (distance + 0.1)) * force * 0.18;
        p.vx += Math.cos(p.angle) * 0.02; // Soft wave turbulence

        p.vy += (dx / (distance + 0.1)) * force * 0.18;
        p.vy += Math.sin(p.angle) * 0.02; // Soft wave turbulence

        // Natural drag/damping to keep speeds controlled
        p.vx *= 0.965;
        p.vy *= 0.965;

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries elegantly with soft resetting
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.px = p.x;
          p.py = p.y;
          p.vx = (Math.random() - 0.5) * 1.5;
          p.vy = (Math.random() - 0.5) * 1.5;
        }

        // Draw particle as an elegant glowing circular dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }}
    />
  );
}
