import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, LineChart, Shield, Zap } from "lucide-react";
import logo from "../assets/logo.png";
import { SwirlBackground } from "../components/SwirlBackground";

export function LandingPage() {
  // 1. Mouse following glow effect state
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 2. Typing effect state for "powered by AI."
  const fullText = "powered by AI.";
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleType = () => {
      if (!isDeleting) {
        // Typing phase
        setTypedText(fullText.slice(0, typedText.length + 1));
        if (typedText === fullText) {
          // Finished typing, hold for 3 seconds before deleting
          timer = setTimeout(() => setIsDeleting(true), 3000);
          return;
        }
        timer = setTimeout(handleType, 100);
      } else {
        // Deleting phase
        setTypedText(fullText.slice(0, typedText.length - 1));
        if (typedText === "") {
          setIsDeleting(false);
          // Wait 1 second before starting to type again
          timer = setTimeout(handleType, 1000);
          return;
        }
        timer = setTimeout(handleType, 50);
      }
    };

    // Initial cycle trigger
    timer = setTimeout(handleType, isDeleting ? 50 : 100);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
      {/* Interactive WebGL-style swirl fluid particle background */}
      <SwirlBackground />

      {/* Soft light glow effect that follows the user's mouse */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px at ${mousePos.x}px ${mousePos.y}px, rgba(6, 182, 212, 0.035), transparent 80%)`
        }}
      />

      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[150px] pointer-events-none translate-y-1/2 -translate-x-1/3" />

      {/* Navbar */}
      <nav className="relative z-50 px-6 py-6 bg-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="OD Bot" className="h-[180px] md:h-[220px] w-auto -my-[65px] -ml-[25px] hover:scale-[1.02] transition-transform duration-200 cursor-pointer" />
          </div>
          
          {/* Increased size Launch App button with multicolor gradient and continuous breathing/pulsing glow */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 10px 1px rgba(6, 182, 212, 0.2)",
                "0 0 25px 5px rgba(59, 130, 246, 0.5)",
                "0 0 10px 1px rgba(6, 182, 212, 0.2)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="rounded-full"
          >
            <Link 
              to="/dashboard" 
              className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-600/35 via-blue-600/35 to-indigo-600/35 hover:from-cyan-600/50 hover:via-blue-600/50 hover:to-indigo-600/50 border border-cyan-500/40 text-base font-bold transition-all hover:scale-105 text-white flex items-center justify-center shadow-lg"
            >
              Launch App
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wide mb-8 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            SYSTEM ONLINE V2.0
          </div>
        </motion.div>

        {/* Increased headline text size to read as a true hero headline */}
        <motion.h1 
          className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tighter mb-8 max-w-5xl leading-[1.05] text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Automated smart trading <br className="hidden md:block"/> 
          <span className="inline-flex items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              {typedText}
            </span>
            <span className="animate-pulse text-cyan-400 font-light ml-1">|</span>
          </span>
        </motion.h1>

        <motion.p 
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Analyze markets, execute trades faster, reduce emotional decisions, and maximize opportunities 24/7. Join the next generation of algorithmic asset management.
        </motion.p>

        {/* Increased button size with custom hover gradient overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative group mt-4"
        >
          <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 group-hover:from-emerald-400 group-hover:to-rose-400 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
          <Link 
            to="/dashboard" 
            className="relative flex items-center gap-3 bg-black text-white px-12 py-5 rounded-full text-xl font-bold hover:scale-105 transition-all shadow-xl shadow-blue-900/50 border border-white/10 overflow-hidden"
          >
            {/* Soft, premium neon green + coral gradient overlay on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
            <span className="relative z-10 flex items-center gap-3 group-hover:text-black transition-colors duration-300">
              Explore Bot <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Bot className="w-7 h-7 text-cyan-400" />,
                title: "Automated Trading",
                desc: "Set and forget with precision algorithms operating across all market conditions.",
                bg: "from-cyan-500/10 to-transparent",
                border: "group-hover:border-cyan-500/50"
              },
              {
                icon: <LineChart className="w-7 h-7 text-blue-400" />,
                title: "AI Market Analysis",
                desc: "Real-time sentiment and technical data aggregation for optimal entry points.",
                bg: "from-blue-500/10 to-transparent",
                border: "group-hover:border-blue-500/50"
              },
              {
                icon: <Shield className="w-7 h-7 text-purple-400" />,
                title: "Risk Management",
                desc: "Dynamic stop-loss and trailing take-profit protocols to preserve capital.",
                bg: "from-purple-500/10 to-transparent",
                border: "group-hover:border-purple-500/50"
              },
              {
                icon: <Zap className="w-7 h-7 text-emerald-400" />,
                title: "Real-Time Signals",
                desc: "Millisecond-latency execution logic directly interfacing with exchange APIs.",
                bg: "from-emerald-500/10 to-transparent",
                border: "group-hover:border-emerald-500/50"
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                className={`bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:bg-gradient-to-br ${feature.bg} transition-all duration-300 cursor-pointer group ${feature.border}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-3 drop-shadow-lg">&lt;10ms</span>
              <span className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Fast Execution</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-3 drop-shadow-lg">100%</span>
              <span className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Secure API Integration</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-3 drop-shadow-lg">24/7</span>
              <span className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Autonomous Operation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center">
          <p className="text-gray-500 text-sm font-medium">© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
