"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useAnimationControls, animate } from "framer-motion";

interface Item { title: string; desc: string; }
interface WorkSliderProps {
  statsUnits: string;
  statsDesc: string;
  items: Item[];
}

const MARQUEE = "E-COMMERCE · FULL STACK · 51.240 SKU · 20+ API · PERFORMANCE · GDPR · AUTOMATION ·  ";

const NEON_STYLE: React.CSSProperties = {
  color: "#fff",
  textShadow: `
    0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff,
    0 0 42px #ff3e00, 0 0 82px #ff3e00, 0 0 92px #ff3e00
  `,
};

const CARD_H = 320;
const CARD_W = 252;
const GAP    = 10;
const HERO_W = 300;

/* ─────────────────────────────────────────
   FLOATING GHOST NUMBER
───────────────────────────────────────── */
function FloatingNumber({ units, desc }: { units: string; desc: string }) {
  const [phase, setPhase] = useState<"visible" | "glitch" | "gone">("visible");
  const [chromo, setChromo] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const cycle = () => {
      /* visible for 5s, then glitch */
      timeout = setTimeout(() => {
        setChromo(true);
        setPhase("glitch");

        /* glitch for 600ms, then gone */
        timeout = setTimeout(() => {
          setPhase("gone");
          setChromo(false);

          /* gone for 1.8s, then reappear */
          timeout = setTimeout(() => {
            setPhase("visible");
            /* restart cycle */
            cycle();
          }, 1800);
        }, 600);
      }, 5000);
    };

    cycle();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="flex-shrink-0 flex flex-col justify-center select-none pointer-events-none"
      style={{ width: HERO_W, height: CARD_H, position: "relative", overflow: "visible" }}
    >
      {/* Slow vertical float */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative" }}
      >
        {/* Chromatic aberration layers — visible during glitch */}
        {chromo && (
          <>
            <div
              className="absolute inset-0 font-[1000] leading-[0.82] select-none"
              style={{
                fontSize: "clamp(48px, 7vw, 88px)",
                color: "rgba(255,0,80,0.7)",
                transform: "translate(-4px, 2px)",
                mixBlendMode: "screen",
                filter: "blur(1px)",
              }}
            >
              51<span style={{ color: "rgba(255,0,80,0.7)" }}>.</span>240
            </div>
            <div
              className="absolute inset-0 font-[1000] leading-[0.82] select-none"
              style={{
                fontSize: "clamp(48px, 7vw, 88px)",
                color: "rgba(0,255,220,0.7)",
                transform: "translate(4px, -2px)",
                mixBlendMode: "screen",
                filter: "blur(1px)",
              }}
            >
              51<span style={{ color: "rgba(0,255,220,0.7)" }}>.</span>240
            </div>
          </>
        )}

        {/* Main number */}
        <motion.div
          animate={
            phase === "visible" ? { opacity: 1, filter: "blur(0px)", scaleX: 1 } :
            phase === "glitch"  ? {
              opacity: [1, 0.4, 1, 0, 1, 0.6, 0],
              filter: ["blur(0px)", "blur(3px)", "blur(0px)", "blur(8px)", "blur(0px)", "blur(4px)", "blur(12px)"],
              scaleX: [1, 1.04, 0.97, 1.06, 0.98, 1.02, 0.4],
            } :
            { opacity: 0, filter: "blur(16px)", scaleX: 0.3 }
          }
          transition={
            phase === "glitch"
              ? { duration: 0.6, ease: "linear" }
              : { duration: 0.4, ease: "easeOut" }
          }
          style={{ originX: 0.5 }}
        >
          <div
            className="font-[1000] text-white leading-[0.82]"
            style={{ fontSize: "clamp(48px, 7vw, 88px)" }}
          >
            51<span style={{ color: "#ff3e00", textShadow: "0 0 20px #ff3e00, 0 0 40px #ff3e00" }}>.</span>240
          </div>
        </motion.div>

        {/* Units label */}
        <motion.div
          animate={{ opacity: phase === "gone" ? 0 : 0.35 }}
          transition={{ duration: 0.3 }}
          className="font-mono uppercase mt-3"
          style={{ fontSize: 8, letterSpacing: "0.35em", color: "#fff" }}
        >
          {units}
        </motion.div>

        {/* Desc — fades in after reappear */}
        <motion.div
          animate={{ opacity: phase === "visible" ? 0.22 : 0 }}
          transition={{ duration: 0.8, delay: phase === "visible" ? 0.6 : 0 }}
          className="font-bold uppercase mt-4 leading-snug"
          style={{ fontSize: 9, letterSpacing: "0.08em", color: "#fff", maxWidth: 220 }}
        >
          {desc}
        </motion.div>

        {/* Reappear flash — white line sweep */}
        {phase === "visible" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.6, scaleY: 0, originY: 0.5 }}
            animate={{ opacity: 0, scaleY: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            }}
          />
        )}
      </motion.div>

      {/* Scan line — always, subtle */}
      <motion.div
        className="absolute left-0 pointer-events-none"
        style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.08)" }}
        animate={{ top: [0, CARD_H] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function WorkSlider({ statsUnits, statsDesc, items }: WorkSliderProps) {
  const controls  = useAnimationControls();
  const trackRef  = useRef<HTMLDivElement>(null);
  const dragStart = useRef(0);
  const dragX     = useRef(0);

  const [hovered, setHovered] = useState<number | null>(null);
  const [mx, setMx]           = useState<Record<number, { x: number; y: number }>>({});

  const totalW = items.length * (CARD_W + GAP);

  useEffect(() => {
    controls.start({
      x: [0, -totalW],
      transition: {
        duration: totalW / 55,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    });
  }, [controls, totalW]);

  const getCurrentX = () => {
    if (!trackRef.current) return 0;
    return new DOMMatrix(getComputedStyle(trackRef.current).transform).m41;
  };

  const onMD = (e: React.MouseEvent) => {
    controls.stop();
    dragStart.current = e.clientX;
    dragX.current = getCurrentX();
  };
  const onMM = (e: React.MouseEvent) => {
    if (e.buttons !== 1 || !trackRef.current) return;
    controls.set({ x: dragX.current + (e.clientX - dragStart.current) });
  };
  const onMU = () => {
    const cur  = getCurrentX();
    const norm = ((cur % -totalW) - totalW) % -totalW;
    controls.start({
      x: [norm, norm - totalW],
      transition: { duration: totalW / 55, ease: "linear", repeat: Infinity, repeatType: "loop" },
    });
  };
  const onTS = (e: React.TouchEvent) => {
    controls.stop();
    dragStart.current = e.touches[0].clientX;
    dragX.current = getCurrentX();
  };
  const onTM = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    controls.set({ x: dragX.current + (e.touches[0].clientX - dragStart.current) });
  };

  const trackMouse = (e: React.MouseEvent, uid: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMx(p => ({
      ...p,
      [uid]: {
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top)  / r.height) * 100,
      },
    }));
  };

  return (
    <section className="relative z-10 mt-16 md:mt-40 text-white">

      {/* ── NEON MARQUEE ── */}
      <div
        className="overflow-hidden py-5"
        style={{
          borderTop: "3px solid rgba(255,255,255,0.18)",
          borderBottom: "3px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <motion.div
          className="flex w-max"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
        >
          {[MARQUEE, MARQUEE].map((t, i) => (
            <span key={i}
              className="text-3xl sm:text-4xl md:text-5xl font-[1000] tracking-tighter whitespace-nowrap px-6"
              style={NEON_STYLE}
            >{t}</span>
          ))}
        </motion.div>
      </div>

      {/* ── DRAG HINT ── */}
      <div className="px-6 md:px-12 mt-5 mb-3">
        <motion.span
          className="font-mono text-[9px] uppercase tracking-[0.4em] block"
          style={{ color: "rgba(255,255,255,0.22)" }}
          animate={{ opacity: [0.22, 0.6, 0.22] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ← drag to explore →
        </motion.span>
      </div>

      {/* ── LAYOUT ── */}
      <div className="flex" style={{ alignItems: "center", paddingLeft: "1.5rem" }}>

        {/* ── FLOATING NUMBER ── */}
        <FloatingNumber units={statsUnits} desc={statsDesc} />

        {/* ── CLIP WINDOW ── */}
        <div
          style={{ overflow: "hidden", flex: 1, cursor: "grab", paddingBottom: "1.2rem" }}
          onMouseDown={onMD}
          onMouseMove={onMM}
          onMouseUp={onMU}
          onMouseLeave={onMU}
          onTouchStart={onTS}
          onTouchMove={onTM}
          onTouchEnd={onMU}
        >
          <motion.div
            ref={trackRef}
            animate={controls}
            style={{
              display: "flex",
              gap: GAP,
              width: "max-content",
              paddingLeft: GAP,
              paddingRight: "1.5rem",
              userSelect: "none",
              willChange: "transform",
            }}
          >
            {[...items, ...items].map((item, globalIdx) => {
              const localIdx = globalIdx % items.length;
              const isHov    = hovered === globalIdx;
              const mp       = mx[globalIdx] ?? { x: 50, y: 50 };

              return (
                <div
                  key={globalIdx}
                  className="flex-shrink-0 relative overflow-hidden"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    background: isHov ? "#000" : "rgba(0,0,0,0.08)",
                    border: isHov
                      ? "1.5px solid #ff3e00"
                      : "1.5px solid rgba(255,255,255,0.35)",
                    boxShadow: isHov
                      ? "0 0 12px rgba(255,62,0,0.6), 0 0 28px rgba(255,62,0,0.25), inset 0 0 8px rgba(255,62,0,0.08)"
                      : "none",
                    transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onMouseEnter={() => setHovered(globalIdx)}
                  onMouseLeave={() => setHovered(null)}
                  onMouseMove={(e) => trackMouse(e, globalIdx)}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(circle at ${mp.x}% ${mp.y}%, rgba(255,62,0,0.12) 0%, transparent 55%)`,
                    opacity: isHov ? 1 : 0,
                    transition: "opacity 0.2s ease",
                  }} />

                  {isHov && (
                    <motion.div
                      className="absolute left-0 w-full pointer-events-none z-20"
                      style={{ height: 1, background: "rgba(255,62,0,0.7)" }}
                      initial={{ top: 0 }}
                      animate={{ top: CARD_H }}
                      transition={{ duration: 1.1, ease: "linear", repeat: Infinity, repeatDelay: 0.9 }}
                    />
                  )}

                  <div className="absolute right-2 bottom-5 font-[1000] leading-none pointer-events-none select-none" style={{
                    fontSize: 88,
                    color: isHov ? "rgba(255,62,0,0.07)" : "rgba(255,255,255,0.06)",
                    transition: "color 0.3s ease",
                  }}>
                    {String(localIdx + 1).padStart(2, "0")}
                  </div>

                  <div className="relative z-10 p-5 flex flex-col" style={{ height: CARD_H }}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono uppercase" style={{
                        fontSize: 8, letterSpacing: "0.35em",
                        color: isHov ? "#ff3e00" : "rgba(255,255,255,0.3)",
                        transition: "color 0.25s",
                      }}>
                        LOG_{String(localIdx + 1).padStart(2, "0")}
                      </span>
                      <motion.div
                        className="rounded-full"
                        style={{ width: 6, height: 6, background: isHov ? "#ff3e00" : "rgba(255,255,255,0.25)" }}
                        animate={isHov
                          ? { boxShadow: ["0 0 3px #ff3e00", "0 0 12px #ff3e00", "0 0 3px #ff3e00"] }
                          : { boxShadow: "none" }
                        }
                        transition={{ duration: 1.1, repeat: Infinity }}
                      />
                    </div>

                    <div className="mt-auto">
                      <h4 className="font-[1000] uppercase leading-tight mb-3" style={{
                        fontSize: 13, letterSpacing: "-0.01em",
                        color: isHov ? "#ff3e00" : "#fff",
                        transition: "color 0.22s ease",
                      }}>
                        {item.title}
                      </h4>
                      <p style={{
                        fontSize: 10, lineHeight: 1.65, fontWeight: 500, letterSpacing: "0.02em",
                        color: isHov ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.38)",
                        transition: "color 0.22s ease",
                      }}>
                        {item.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-5 pt-3" style={{
                      borderTop: `1px solid ${isHov ? "rgba(255,62,0,0.2)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                      <div className="flex-1" style={{
                        height: 1,
                        background: isHov ? "rgba(255,62,0,0.2)" : "rgba(255,255,255,0.08)",
                      }} />
                      <span style={{
                        fontFamily: "monospace", fontSize: 7,
                        letterSpacing: "0.3em", textTransform: "uppercase",
                        color: isHov ? "rgba(255,62,0,0.5)" : "rgba(255,255,255,0.15)",
                      }}>
                        OK
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── PUNTOLUCE LINKS ── */}
      <div className="px-6 md:px-12 mt-6 flex flex-col sm:flex-row gap-3">
        {[
          { label: "SHOP", sub: "shop.puntoluce.net", href: "https://shop.puntoluce.net/" },
          { label: "BLOG", sub: "puntoluce.net/comefare", href: "https://www.puntoluce.net/comefare/" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-5 px-6 py-4 overflow-hidden"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.28)",
              textDecoration: "none",
              maxWidth: 340,
            }}
          >
            <div className="absolute inset-0 bg-white translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
            <span className="relative font-[1000] uppercase tracking-[0.4em] text-white group-hover:text-[#ff3e00] transition-colors duration-300" style={{ fontSize: 11 }}>
              {link.label}
            </span>
            <span className="relative font-mono tracking-widest text-white/30 group-hover:text-black/40 transition-colors duration-300" style={{ fontSize: 10 }}>
              ↗ {link.sub}
            </span>
          </a>
        ))}
      </div>

    </section>
  );
}