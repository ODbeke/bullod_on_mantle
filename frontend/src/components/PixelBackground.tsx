import { useEffect, useRef } from "react";

export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pixel particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    
    const onResize = () => { 
      w = canvas.width = window.innerWidth; 
      h = canvas.height = window.innerHeight; 
    };
    window.addEventListener("resize", onResize);
    
    const COLS = ["#00b4d8cc", "#00f5d4aa", "#7209b7aa", "#4361ee88", "#06d6a0aa"];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * w, 
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, // Slow drift
      vy: (Math.random() - 0.5) * 0.3, 
      size: (Math.floor(Math.random() * 3) + 1) * 2,
      color: COLS[Math.floor(Math.random() * COLS.length)],
    }));
    
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; 
        p.y += p.vy;
        
        // Wrap around smoothly
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    
    return () => { 
      cancelAnimationFrame(animId); 
      window.removeEventListener("resize", onResize); 
    };
  }, []);

  return (
    <>
      <style>{`
        body { background-color: #040810; }
      `}</style>
      {/* Pixel particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: -3 }} />

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
      }} />
    </>
  );
}
