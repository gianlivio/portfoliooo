"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINES = [
  { text: "$ boot portfolio.exe",       delay: 0 },
  { text: "> loading modules...",        delay: 400 },
  { text: "> semiotics.init()",          delay: 750 },
  { text: "> api_integrations: 20+",     delay: 1050 },
  { text: "> sku_catalog: 51.240",       delay: 1300 },
  { text: "> lighthouse_score: 80/100",  delay: 1550 },
  { text: "> status: ALL_SYSTEMS_OK",    delay: 1800 },
  { text: "$ launching in...",           delay: 2200 },
];

function TypeLine({ text, startDelay }: { text: string; startDelay: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, [started, text]);

  return (
    <div className="font-mono text-sm md:text-base leading-relaxed" style={{ color: "#00ff88" }}>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="inline-block w-2 h-4 bg-[#00ff88] ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

export default function TerminalIntro({ onDone }: { onDone: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [visible, setVisible]     = useState(true);
  const [glitch,  setGlitch]      = useState(false);
  const doneRef = useRef(false);

  /* start countdown after lines appear */
  useEffect(() => {
    const t = setTimeout(() => {
      setCountdown(3);
    }, 2600);
    return () => clearTimeout(t);
  }, []);

  /* countdown tick */
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onDone(); } }, 600);
      }, 300);
      return;
    }
    setGlitch(true);
    setTimeout(() => setGlitch(false), 160);
    const t = setTimeout(() => setCountdown(n => (n ?? 1) - 1), 900);
    return () => clearTimeout(t);
  }, [countdown, onDone]);

  /* skip on click */
  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setVisible(false);
    setTimeout(onDone, 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] flex flex-col justify-center items-start px-8 md:px-20"
          style={{ background: "#030303" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* CRT scan lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, rgba(0,255,136,0.015) 0px, rgba(0,255,136,0.015) 1px, transparent 1px, transparent 3px)",
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {/* Terminal lines */}
          <div className="relative z-10 w-full max-w-2xl space-y-1 mb-10">
            {LINES.map((line, i) => (
              <TypeLine key={i} text={line.text} startDelay={line.delay} />
            ))}
          </div>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <motion.div
              className="relative z-10"
              key={countdown}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div
                className="font-[1000] leading-none select-none"
                style={{
                  fontSize: "clamp(80px, 18vw, 180px)",
                  color: "#00ff88",
                  textShadow: glitch
                    ? "-4px 0 #ff3e00, 4px 0 #00ccff, 0 0 30px #00ff88"
                    : "0 0 40px rgba(0,255,136,0.6)",
                  letterSpacing: "-0.06em",
                  filter: glitch ? "blur(1px)" : "none",
                  transition: "filter 0.1s, text-shadow 0.1s",
                }}
              >
                {countdown}
              </div>
            </motion.div>
          )}

          {/* Skip */}
          <button
            onClick={skip}
            className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-[0.35em] z-10"
            style={{ color: "rgba(0,255,136,0.3)" }}
          >
            skip →
          </button>

          {/* Blinking cursor bottom left */}
          <div className="absolute bottom-8 left-8 font-mono text-[10px] z-10" style={{ color: "rgba(0,255,136,0.25)" }}>
            <span className="animate-pulse">▮</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}