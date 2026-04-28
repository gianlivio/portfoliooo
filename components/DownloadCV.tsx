"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DownloadCVProps {
  buttonText: string;
  filesize: string;
  lang: string;
}

/* ── Magnetic button hook ── */
function useMagnetic(strength = 0.35) {
  const ref  = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    setPos({ x: dx * strength, y: dy * strength });
  }, [strength]);

  const onLeave = useCallback(() => setPos({ x: 0, y: 0 }), []);

  return { ref, pos, onMove, onLeave };
}

/* ── Terminal download overlay ── */
function DownloadTerminal({ onDone, lang }: { onDone: () => void; lang: string }) {
  const [lines, setLines]   = useState<string[]>([]);
  const [phase, setPhase]   = useState<"typing" | "done">("typing");

  const SEQUENCE = [
    "$ initiating secure transfer...",
    `> target: GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`,
    "> encrypting payload...",
    "> checksum: verified ✓",
    "> CONNECTION ESTABLISHED",
    "> DOWNLOAD STARTED ↓",
  ];

  useEffect(() => {
    let i = 0;
    const addLine = () => {
      if (i >= SEQUENCE.length) {
        setPhase("done");
        // trigger actual download
        const link = document.createElement("a");
        link.href     = `/cv/GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
        link.download = `GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
        link.click();
        setTimeout(onDone, 900);
        return;
      }
      setLines(prev => [...prev, SEQUENCE[i]]);
      i++;
      setTimeout(addLine, i === 1 ? 200 : 340);
    };
    addLine();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={phase === "done" ? onDone : undefined}
    >
      <div
        className="w-full max-w-lg mx-6 rounded p-8"
        style={{ border: "1px solid rgba(0,255,136,0.3)", background: "#040404" }}
      >
        {/* header bar */}
        <div className="flex gap-2 mb-6">
          {["#ff5f57","#febc2e","#28c840"].map(c => (
            <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
        </div>

        <div className="space-y-2 min-h-[160px]">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-sm"
              style={{
                color: line?.includes("↓") || line?.includes("✓")
                  ? "#00ff88"
                  : "rgba(0,255,136,0.7)",
              }}
            >
              {line}
              {i === lines.length - 1 && phase === "typing" && (
                <span className="inline-block w-2 h-4 bg-[#00ff88] ml-1 animate-pulse" />
              )}
            </motion.div>
          ))}
        </div>

        {phase === "done" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] mt-6"
            style={{ color: "rgba(0,255,136,0.35)" }}
          >
            click to close
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}


/* ── Particle ── */
interface Particle { id: number; angle: number; dist: number; }

export default function DownloadCV({ buttonText, filesize, lang }: DownloadCVProps) {
 
  const [particles,    setParticles]    = useState<Particle[]>([]);
  const { ref, pos, onMove, onLeave }   = useMagnetic(0.4);
  const [flash, setFlash] = useState(false);



  const handleDownload = () => {
    // flash
    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    // particles fullscreen
    const ps: Particle[] = Array.from({ length: 32 }, (_, i) => ({
      id: Date.now() + i,
      angle: (i / 32) * 360,
      dist: 120 + Math.random() * 160,
    }));
    setParticles(ps);
    setTimeout(() => setParticles([]), 1200);

    // download
    setTimeout(() => {
      const link = document.createElement("a");
      link.href     = `/cv/GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
      link.download = `GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 150);
  };

  return (
    <div className="w-full max-w-sm mx-auto">


      {/* ── MAGNETIC BUTTON ── */}
      <div className="flex justify-center">
        <motion.div
          style={{ x: pos.x, y: pos.y }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="relative"
        >
          <motion.button
            ref={ref}
            onClick={handleDownload}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="relative overflow-hidden px-10 py-5 font-[1000] uppercase tracking-widest text-sm group"
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "none",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {/* fill wipe on hover */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "#ff3e00", originX: 0, zIndex: 0 }}
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />

            <span className="relative z-20 group-hover:text-white transition-colors duration-200">
              ↓ {buttonText}
            </span>

            
          </motion.button>
        </motion.div>
        {/* ── FLASH ── */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[500]"
            style={{ background: "#ffffff" }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── PARTICLES FULLSCREEN ── */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="fixed rounded-full pointer-events-none z-[499]"
          style={{
            width: 10, height: 10,
            background: "#ff3e00",
            top: "50vh", left: "50vw",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.dist * 3,
            y: Math.sin((p.angle * Math.PI) / 180) * p.dist * 3,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}
      </div>

      <p className="text-center font-mono text-[10px] mt-3 text-white/25 uppercase tracking-widest">
        {filesize} · PDF
      </p>


    </div>
  );
}