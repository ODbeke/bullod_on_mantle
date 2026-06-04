import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import pixelBots from "../assets/pixel_bots.png";

// Pixel art SVG elements
const PixelCloud = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="96" height="48" viewBox="0 0 12 6" style={{ imageRendering: "pixelated", ...style }}>
    <rect x="3" y="2" width="6" height="1" fill="#8ecae6" />
    <rect x="2" y="1" width="8" height="1" fill="#aed9e0" />
    <rect x="1" y="2" width="10" height="2" fill="#caf0f8" />
    <rect x="2" y="4" width="8" height="1" fill="#caf0f8" />
  </svg>
);

const PixelStar = ({ x, y, size = 4 }: { x: number; y: number; size?: number }) => (
  <div style={{
    position: "absolute",
    left: x,
    top: y,
    width: size,
    height: size,
    background: "#fff",
    imageRendering: "pixelated",
    boxShadow: `0 0 ${size * 2}px ${size}px rgba(34,211,238,0.6)`,
    animation: `pixelBlink ${1.5 + Math.random() * 2}s steps(1) infinite`,
  }} />
);

const PixelCoin = ({ style }: { style?: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    style={style}
  >
    <svg width="32" height="32" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="0" width="4" height="1" fill="#ffd60a" />
      <rect x="1" y="1" width="6" height="1" fill="#ffd60a" />
      <rect x="0" y="2" width="8" height="4" fill="#f4a261" />
      <rect x="1" y="6" width="6" height="1" fill="#ffd60a" />
      <rect x="2" y="7" width="4" height="1" fill="#ffd60a" />
      <rect x="2" y="3" width="4" height="2" fill="#ffd60a" />
    </svg>
  </motion.div>
);

const PixelPlatform = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="128" height="48" viewBox="0 0 16 6" style={{ imageRendering: "pixelated", ...style }}>
    <rect x="0" y="0" width="16" height="2" fill="#00b4d8" />
    <rect x="0" y="2" width="16" height="1" fill="#0077b6" />
    <rect x="0" y="3" width="16" height="3" fill="#5c4033" />
    <rect x="1" y="3" width="14" height="1" fill="#7a5c44" />
  </svg>
);

// Pixel ground row
const PixelGround = () => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", overflow: "hidden" }}>
    {/* Dark grid ground */}
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "80px",
      background: "linear-gradient(180deg, #0d0d0d 0%, #070b0f 100%)",
      borderTop: "4px solid #00b4d8",
      imageRendering: "pixelated",
      backgroundImage: `
        linear-gradient(rgba(0,180,216,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,180,216,0.08) 1px, transparent 1px)
      `,
      backgroundSize: "16px 16px",
    }} />
  </div>
);

// Scrolling ticker
const TickerItem = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "0 24px", fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: "#00b4d8" }}>
    <span style={{ color: "#00f5d4" }}>◆</span>
    AUTOMATED TRADING
    <span style={{ color: "#f4a261" }}>●</span>
    AI POWERED
    <span style={{ color: "#00f5d4" }}>◆</span>
    24/7 ACTIVE
    <span style={{ color: "#f4a261" }}>●</span>
    HEDGE BOT
  </span>
);

export function LandingPage() {
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const fullText = "POWERED BY AI.";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, tx: -1000, ty: -1000, active: false });

  // Typing effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleType = () => {
      if (!isDeleting) {
        setTypedText(fullText.slice(0, typedText.length + 1));
        if (typedText === fullText) { timer = setTimeout(() => setIsDeleting(true), 3000); return; }
        timer = setTimeout(handleType, 120);
      } else {
        setTypedText(fullText.slice(0, typedText.length - 1));
        if (typedText === "") { setIsDeleting(false); timer = setTimeout(handleType, 1000); return; }
        timer = setTimeout(handleType, 60);
      }
    };
    timer = setTimeout(handleType, isDeleting ? 60 : 120);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting]);

  // Pixel particle swirl background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    });

    // Pixel particles
    const COLS = ["#00b4d8", "#00f5d4", "#7209b7", "#4361ee", "#06d6a0"];
    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: Math.floor(Math.random() * 3 + 2) * 2, // pixel-sized: 2,4,6
      color: COLS[Math.floor(Math.random() * COLS.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
    }));

    let time = 0;
    const render = () => {
      time += 0.003;
      ctx.clearRect(0, 0, w, h);
      const m = mouseRef.current;
      if (m.active) {
        m.tx += (m.x - m.tx) * 0.07;
        m.ty += (m.y - m.ty) * 0.07;
      } else {
        m.tx += (w / 2 + Math.cos(time * 1.5) * w * 0.2 - m.tx) * 0.04;
        m.ty += (h / 2 + Math.sin(time * 2.5) * h * 0.15 - m.ty) * 0.04;
      }
      for (const p of particles) {
        const dx = m.tx - p.x, dy = m.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const maxD = Math.max(w, h) * 0.5;
        const force = Math.max(0, (maxD - dist) / maxD);
        p.angle += p.spin;
        p.vx += (dx / dist) * force * 0.05 + (-dy / dist) * force * 0.14 + Math.cos(p.angle) * 0.015;
        p.vy += (dy / dist) * force * 0.05 + (dx / dist) * force * 0.14 + Math.sin(p.angle) * 0.015;
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w; p.y = Math.random() * h;
          p.vx = (Math.random() - 0.5) * 1.2; p.vy = (Math.random() - 0.5) * 1.2;
        }
        // Draw as pixel square
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.globalAlpha = 1;
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#040810",
      color: "#e0f7fa",
      overflow: "hidden",
      position: "relative",
      fontFamily: "'Press Start 2P', monospace",
      imageRendering: "pixelated",
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pixelBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes tickerScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes scanline {
          0% { top: -100%; }
          100% { top: 100%; }
        }
        @keyframes cursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        * { box-sizing: border-box; }
      `}</style>

      {/* Pixel particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, display: "block" }} />

      {/* Dark grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }} />

      {/* Scanline effect */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
      }} />

      {/* Floating decorations */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        <PixelCoin style={{ position: "absolute", top: "22%", left: "8%" }} />
        <PixelCoin style={{ position: "absolute", top: "30%", right: "10%" }} />
        <PixelCoin style={{ position: "absolute", top: "15%", left: "42%" }} />
        <PixelPlatform style={{ position: "absolute", top: "28%", left: "4%", opacity: 0.5 }} />
        <PixelPlatform style={{ position: "absolute", top: "35%", right: "5%", opacity: 0.5 }} />

        {/* Pixel stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <PixelStar key={i} x={Math.floor((i * 317 + 50) % window.innerWidth)} y={Math.floor((i * 193 + 30) % 400)} size={i % 3 === 0 ? 4 : 2} />
        ))}
      </div>

      {/* NAVBAR */}
      <nav style={{
        position: "relative", zIndex: 50,
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "transparent",
      }}>
        <img src={logo} alt="OD Bot" style={{
          height: "90px",
          width: "auto",
          marginLeft: "-16px",
          marginTop: "-20px",
          marginBottom: "-20px",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 8px #00b4d8)",
        }} />

        {/* Pixel "Launch App" button */}
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link to="/dashboard" style={{
            display: "inline-block",
            padding: "14px 28px",
            background: "#00b4d8",
            color: "#040810",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "11px",
            textDecoration: "none",
            border: "none",
            outline: "none",
            cursor: "pointer",
            position: "relative",
            imageRendering: "pixelated",
            // Pixel button border (chunky 3D style)
            boxShadow: `
              4px 0 0 0 #0077b6,
              0 4px 0 0 #0077b6,
              4px 4px 0 0 #005082,
              -4px 0 0 0 #48cae4,
              0 -4px 0 0 #48cae4
            `,
          }}>
            ▶ LAUNCH APP
          </Link>
        </motion.div>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        position: "relative", zIndex: 10,
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "40px 32px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        {/* Online badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "8px 20px",
            background: "transparent",
            border: "2px solid #00b4d8",
            boxShadow: "4px 4px 0 #005082, inset 0 0 16px rgba(0,180,216,0.1)",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "9px",
            color: "#00f5d4",
            marginBottom: "40px",
            imageRendering: "pixelated",
          }}
        >
          <span style={{
            display: "inline-block", width: "8px", height: "8px",
            background: "#00f5d4",
            boxShadow: "0 0 6px #00f5d4",
            animation: "pixelBlink 1s steps(1) infinite",
          }} />
          ● SYSTEM ONLINE V2.0
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(22px, 4.5vw, 52px)",
            lineHeight: 1.5,
            color: "#00b4d8",
            textShadow: "4px 4px 0 #005082, 0 0 32px rgba(0,180,216,0.5)",
            marginBottom: "24px",
            maxWidth: "900px",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          AUTOMATED SMART<br />
          TRADING
        </motion.h1>

        {/* Typing subheadline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(14px, 2.5vw, 28px)",
            lineHeight: 1.6,
            color: "#f4a261",
            textShadow: "3px 3px 0 #7a3008",
            marginBottom: "32px",
            minHeight: "52px",
          }}
        >
          <span>{typedText}</span>
          <span style={{ animation: "cursorBlink 0.7s steps(1) infinite", color: "#00f5d4" }}>█</span>
        </motion.div>

        {/* Sub-description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "9px",
            color: "#90e0ef",
            lineHeight: 2.2,
            maxWidth: "560px",
            marginBottom: "48px",
          }}
        >
          ANALYZE MARKETS. EXECUTE TRADES FASTER.<br />
          MAXIMIZE OPPORTUNITIES 24/7.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          style={{ marginBottom: "64px" }}
        >
          <Link to="/dashboard" style={{
            display: "inline-block",
            padding: "20px 48px",
            background: "#f4a261",
            color: "#1a0a00",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "14px",
            textDecoration: "none",
            textTransform: "uppercase",
            position: "relative",
            imageRendering: "pixelated",
            boxShadow: `
              6px 0 0 0 #7a3008,
              0 6px 0 0 #7a3008,
              6px 6px 0 0 #4a1c00,
              -6px 0 0 0 #f9c784,
              0 -6px 0 0 #f9c784,
              0 0 40px rgba(244,162,97,0.4)
            `,
          }}>
            ▶ START
          </Link>
        </motion.div>

        {/* Pixel Bot Scene */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            width: "100%",
            maxWidth: "780px",
            position: "relative",
          }}
        >
          <img
            src={pixelBots}
            alt="Trading bots at desks"
            style={{
              width: "100%",
              imageRendering: "pixelated",
              borderBottom: "4px solid #00b4d8",
              filter: "drop-shadow(0 0 24px rgba(0,180,216,0.35)) drop-shadow(0 0 60px rgba(114,9,183,0.2))",
            }}
          />
          {/* Ground shadow under bots */}
          <div style={{
            position: "absolute",
            bottom: "4px", left: "10%", right: "10%",
            height: "20px",
            background: "radial-gradient(ellipse, rgba(0,180,216,0.25) 0%, transparent 70%)",
            filter: "blur(8px)",
          }} />
        </motion.div>
      </section>

      {/* Pixel ground */}
      <div style={{
        position: "relative", zIndex: 5,
        height: "32px",
        background: "#00b4d8",
        borderTop: "4px solid #0096c7",
        borderBottom: "4px solid #005082",
        backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 32px, transparent 32px, transparent 64px)`,
      }} />
      <div style={{
        position: "relative", zIndex: 5,
        height: "20px",
        background: "#0077b6",
      }} />

      {/* Features Section */}
      <section style={{
        position: "relative", zIndex: 10,
        padding: "80px 32px",
        background: "transparent",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "24px",
        }}>
          {[
            { icon: "🤖", title: "AUTO TRADE", desc: "SET & FORGET ALGO BOTS ACTIVE ACROSS ALL CONDITIONS" },
            { icon: "📊", title: "AI ANALYSIS", desc: "REAL-TIME MARKET DATA & SENTIMENT AGGREGATION" },
            { icon: "🛡️", title: "RISK MGMT", desc: "DYNAMIC STOP-LOSS & TRAILING TAKE-PROFIT LOGIC" },
            { icon: "⚡", title: "LIVE SIGNALS", desc: "LOW-LATENCY EXECUTION ON EXCHANGE APIS" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              style={{
                background: "rgba(0,20,40,0.8)",
                border: "2px solid #00b4d8",
                padding: "28px 20px",
                boxShadow: "4px 4px 0 #005082, inset 0 0 20px rgba(0,180,216,0.05)",
                cursor: "pointer",
                imageRendering: "pixelated",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.icon}</div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "11px",
                color: "#00b4d8",
                marginBottom: "12px",
                textShadow: "2px 2px 0 #005082",
              }}>{f.title}</div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "7px",
                color: "#90e0ef",
                lineHeight: 2.2,
              }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <div style={{
        position: "relative", zIndex: 5,
        height: "4px",
        background: "#00b4d8",
        opacity: 0.3,
      }} />
      <section style={{
        position: "relative", zIndex: 10,
        padding: "64px 32px",
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "center",
          gap: "48px",
          flexWrap: "wrap",
        }}>
          {[
            { val: "<10MS", label: "FAST EXEC", col: "#00b4d8" },
            { val: "100%", label: "SECURE API", col: "#7209b7" },
            { val: "24/7", label: "AUTONOMOUS", col: "#06d6a0" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{ textAlign: "center" }}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "clamp(24px, 4vw, 40px)",
                color: s.col,
                textShadow: `3px 3px 0 rgba(0,0,0,0.6), 0 0 24px ${s.col}`,
                marginBottom: "12px",
              }}>{s.val}</div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: "#90e0ef",
                letterSpacing: "3px",
              }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scrolling ticker */}
      <div style={{
        position: "relative", zIndex: 10,
        borderTop: "4px solid #00b4d8",
        borderBottom: "4px solid #00b4d8",
        background: "#040810",
        padding: "12px 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}>
        <div style={{
          display: "inline-block",
          animation: "tickerScroll 18s linear infinite",
        }}>
          {Array.from({ length: 4 }, (_, i) => <TickerItem key={i} />)}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 10,
        padding: "32px",
        textAlign: "center",
        background: "transparent",
      }}>
        <p style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#4a4e69",
        }}>© {new Date().getFullYear()} OD BOT. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
