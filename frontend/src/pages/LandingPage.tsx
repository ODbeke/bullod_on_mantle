import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import pixelBotLeft from "../assets/pixel_bot_left.png";
import pixelBotRight from "../assets/pixel_bot_right.png";

const PixelCoin = ({ style }: { style?: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    style={style}
  >
    <svg width="28" height="28" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
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
  <svg width="112" height="40" viewBox="0 0 14 5" style={{ imageRendering: "pixelated", ...style }}>
    <rect x="0" y="0" width="14" height="2" fill="#00b4d8" opacity="0.5" />
    <rect x="0" y="2" width="14" height="1" fill="#0077b6" opacity="0.5" />
    <rect x="0" y="3" width="14" height="2" fill="#1a1a2e" opacity="0.7" />
  </svg>
);

const TickerItem = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "14px", padding: "0 28px", fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: "#00b4d8" }}>
    <span style={{ color: "#00f5d4" }}>◆</span> AUTOMATED TRADING
    <span style={{ color: "#f4a261" }}>●</span> AI POWERED
    <span style={{ color: "#00f5d4" }}>◆</span> 24/7 ACTIVE
    <span style={{ color: "#f4a261" }}>●</span> HEDGE BOT
    <span style={{ color: "#00f5d4" }}>◆</span> MANTLE CHAIN
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
        if (typedText === "") { setIsDeleting(false); timer = setTimeout(handleType, 900); return; }
        timer = setTimeout(handleType, 60);
      }
    };
    timer = setTimeout(handleType, isDeleting ? 60 : 120);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting]);

  // Pixel particle canvas
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
    const onMove = (e: MouseEvent) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; mouseRef.current.active = true; };
    window.addEventListener("mousemove", onMove);
    const COLS = ["#00b4d8cc", "#00f5d4aa", "#7209b7aa", "#4361ee88", "#06d6a0aa"];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.1, vy: (Math.random() - 0.5) * 1.1,
      size: (Math.floor(Math.random() * 3) + 1) * 2,
      color: COLS[Math.floor(Math.random() * COLS.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.018,
    }));
    let time = 0;
    const render = () => {
      time += 0.003;
      ctx.clearRect(0, 0, w, h);
      const m = mouseRef.current;
      if (m.active) { m.tx += (m.x - m.tx) * 0.07; m.ty += (m.y - m.ty) * 0.07; }
      else { m.tx += (w / 2 + Math.cos(time * 1.5) * w * 0.2 - m.tx) * 0.04; m.ty += (h / 2 + Math.sin(time * 2.5) * h * 0.15 - m.ty) * 0.04; }
      for (const p of particles) {
        const dx = m.tx - p.x, dy = m.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const maxD = Math.max(w, h) * 0.5;
        const force = Math.max(0, (maxD - dist) / maxD);
        p.angle += p.spin;
        p.vx += (dx / dist) * force * 0.05 + (-dy / dist) * force * 0.14 + Math.cos(p.angle) * 0.012;
        p.vy += (dy / dist) * force * 0.05 + (dx / dist) * force * 0.14 + Math.sin(p.angle) * 0.012;
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w; p.y = Math.random() * h;
          p.vx = (Math.random() - 0.5) * 1.1; p.vy = (Math.random() - 0.5) * 1.1;
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); window.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#040810", color: "#e0f7fa", overflow: "hidden", position: "relative", fontFamily: "'Press Start 2P', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pixelBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes tickerScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes botFloat { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        @keyframes botFloatR { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Pixel particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
      }} />

      {/* Floating coins & platforms */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        <PixelCoin style={{ position: "absolute", top: "18%", left: "12%" }} />
        <PixelCoin style={{ position: "absolute", top: "24%", right: "11%" }} />
        <PixelCoin style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)" }} />
        <PixelPlatform style={{ position: "absolute", top: "30%", left: "6%", opacity: 0.45 }} />
        <PixelPlatform style={{ position: "absolute", top: "22%", right: "5%", opacity: 0.45 }} />
      </div>

      {/* ═══════════ NAVBAR — full width, unchanged ═══════════ */}
      <nav style={{
        position: "relative", zIndex: 50,
        padding: "20px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "transparent",
      }}>
        <img src={logo} alt="OD Bot" style={{
          height: "90px", width: "auto",
          marginLeft: "-16px", marginTop: "-20px", marginBottom: "-20px",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 10px #00b4d8)",
        }} />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
          <Link to="/dashboard" style={{
            display: "inline-block", padding: "14px 28px",
            background: "#00b4d8", color: "#040810",
            fontFamily: "'Press Start 2P', monospace", fontSize: "10px",
            textDecoration: "none", cursor: "pointer",
            boxShadow: "4px 0 0 0 #0077b6, 0 4px 0 0 #0077b6, 4px 4px 0 0 #005082, -4px 0 0 0 #48cae4, 0 -4px 0 0 #48cae4",
          }}>▶ LAUNCH APP</Link>
        </motion.div>
      </nav>

      {/* ═══════════ HERO — full width centered text ═══════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "32px 32px 0", textAlign: "center" }}>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "8px 18px",
            border: "2px solid #00b4d8",
            boxShadow: "4px 4px 0 #005082, inset 0 0 16px rgba(0,180,216,0.1)",
            fontSize: "8px", color: "#00f5d4", marginBottom: "32px",
          }}
        >
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#00f5d4", boxShadow: "0 0 6px #00f5d4", animation: "pixelBlink 1s steps(1) infinite" }} />
          SYSTEM ONLINE V2.0
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontSize: "clamp(22px, 4.5vw, 54px)",
            lineHeight: 1.55,
            color: "#00b4d8",
            textShadow: "4px 4px 0 #005082, 0 0 32px rgba(0,180,216,0.45)",
            marginBottom: "20px",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          AUTOMATED SMART<br />TRADING
        </motion.h1>

        {/* Typed line */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: "clamp(14px, 2.5vw, 28px)",
            color: "#f4a261",
            textShadow: "3px 3px 0 #7a3008",
            marginBottom: "24px",
            minHeight: "48px",
          }}
        >
          <span>{typedText}</span>
          <span style={{ animation: "pixelBlink 0.7s steps(1) infinite", color: "#00f5d4" }}>█</span>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ fontSize: "8px", color: "#90e0ef", lineHeight: 2.4, marginBottom: "36px" }}
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
          whileTap={{ scale: 0.96 }}
          style={{ marginBottom: "60px" }}
        >
          <Link to="/dashboard" style={{
            display: "inline-block", padding: "18px 48px",
            background: "#f4a261", color: "#1a0a00",
            fontFamily: "'Press Start 2P', monospace", fontSize: "14px",
            textDecoration: "none", textTransform: "uppercase",
            boxShadow: "6px 0 0 0 #7a3008, 0 6px 0 0 #7a3008, 6px 6px 0 0 #4a1c00, -6px 0 0 0 #f9c784, 0 -6px 0 0 #f9c784, 0 0 40px rgba(244,162,97,0.35)",
          }}>▶ START</Link>
        </motion.div>

        {/* BOT SCENE */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "24px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}>
          {/* Left bot */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              flex: "0 0 auto",
              width: "clamp(132px, 17vw, 228px)",
              animation: "botFloat 4s ease-in-out infinite",
            }}
          >
            <img
              src={pixelBotLeft}
              alt="Cyan trading bot"
              style={{
                width: "100%",
                display: "block",
                imageRendering: "pixelated",
                mixBlendMode: "lighten",
              }}
            />
          </motion.div>

          {/* Middle spacer */}
          <div style={{ flex: "1 1 auto", minWidth: "60px" }} />

          {/* Right bot — flipped to face left toward center */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            style={{
              flex: "0 0 auto",
              width: "clamp(132px, 17vw, 228px)",
              animation: "botFloatR 4.6s ease-in-out infinite 0.9s",
            }}
          >
            <img
              src={pixelBotRight}
              alt="Purple trading bot"
              style={{
                width: "100%",
                display: "block",
                imageRendering: "pixelated",
                mixBlendMode: "lighten",
                transform: "scaleX(-1)",
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Pixel ground */}
      <div style={{ position: "relative", zIndex: 5, height: "8px", background: "#00b4d8", boxShadow: "0 -4px 0 #0096c7, 0 4px 0 #005082" }} />
      <div style={{ position: "relative", zIndex: 5, height: "16px", background: "#003f5c" }} />

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "72px 32px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
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
                background: "rgba(0,20,40,0.75)",
                border: "2px solid #00b4d8",
                padding: "28px 20px",
                boxShadow: "4px 4px 0 #005082",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "14px" }}>{f.icon}</div>
              <div style={{ fontSize: "10px", color: "#00b4d8", marginBottom: "12px", textShadow: "2px 2px 0 #005082" }}>{f.title}</div>
              <div style={{ fontSize: "7px", color: "#90e0ef", lineHeight: 2.2 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <div style={{ height: "4px", background: "#00b4d8", opacity: 0.25 }} />
      <section style={{ position: "relative", zIndex: 10, padding: "64px 32px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap" }}>
          {[
            { val: "<10MS", label: "FAST EXEC", col: "#00b4d8" },
            { val: "100%", label: "SECURE API", col: "#7209b7" },
            { val: "24/7", label: "AUTONOMOUS", col: "#06d6a0" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px, 4vw, 38px)", color: s.col, textShadow: `3px 3px 0 rgba(0,0,0,0.6), 0 0 24px ${s.col}`, marginBottom: "12px" }}>{s.val}</div>
              <div style={{ fontSize: "8px", color: "#90e0ef", letterSpacing: "3px" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ TICKER ═══════════ */}
      <div style={{ position: "relative", zIndex: 10, borderTop: "4px solid #00b4d8", borderBottom: "4px solid #00b4d8", background: "#040810", padding: "12px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-block", animation: "tickerScroll 20s linear infinite" }}>
          {Array.from({ length: 4 }, (_, i) => <TickerItem key={i} />)}
        </div>
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ position: "relative", zIndex: 10, padding: "28px 32px", textAlign: "center", background: "transparent" }}>
        <p style={{ fontSize: "7px", color: "#2a3550" }}>© {new Date().getFullYear()} OD BOT. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
