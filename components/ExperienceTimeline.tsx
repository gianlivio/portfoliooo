"use client";
import { useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface TimelineItem {
  year: string;
  role: string;
  company: string;
  location: string;
  highlights: string[];
}
interface ExperienceTimelineProps { items: TimelineItem[]; }

const COL_W = 300;
const GAP   = 8;

export default function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const controls  = useAnimationControls();
  const trackRef  = useRef<HTMLDivElement>(null);
  const dragStart = useRef(0);
  const dragX     = useRef(0);
  const isDragging = useRef(false);

  const [active,   setActive]   = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [mx, setMx] = useState<Record<number, { x: number; y: number }>>({});

  const getCurrentX = () => {
    if (!trackRef.current) return 0;
    return new DOMMatrix(getComputedStyle(trackRef.current).transform).m41;
  };

  const onMD = (e: React.MouseEvent) => {
    isDragging.current = false;
    dragStart.current  = e.clientX;
    dragX.current      = getCurrentX();
  };
  const onMM = (e: React.MouseEvent) => {
    if (e.buttons !== 1 || !trackRef.current) return;
    const delta = Math.abs(e.clientX - dragStart.current);
    if (delta > 4) isDragging.current = true;
    const newX = Math.min(0, dragX.current + (e.clientX - dragStart.current) * 1.2);
    controls.set({ x: newX });
  };
  const onTS = (e: React.TouchEvent) => {
    isDragging.current = false;
    dragStart.current  = e.touches[0].clientX;
    dragX.current      = getCurrentX();
  };
  const onTM = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    const newX = Math.min(0, dragX.current + (e.touches[0].clientX - dragStart.current) * 1.2);
    controls.set({ x: newX });
  };

  const trackMouse = (e: React.MouseEvent, idx: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMx(p => ({
      ...p,
      [idx]: {
        x: ((e.clientX - r.left) / r.width)  * 100,
        y: ((e.clientY - r.top)  / r.height) * 100,
      },
    }));
  };

  const handleClick = (idx: number) => {
    if (isDragging.current) return;
    setExpanded(prev => prev === idx ? null : idx);
  };

  return (
    <div className="relative">

      {/* ── DRAG HINT ── */}
      <div className="mb-5">
        <motion.span
          className="font-mono text-[9px] uppercase tracking-[0.4em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
          animate={{ opacity: [0.28, 0.7, 0.28] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ← drag to navigate →
        </motion.span>
      </div>

      {/* ── CLIP WINDOW ── */}
      <div
        style={{ overflow: "hidden", cursor: "grab" }}
        onMouseDown={onMD}
        onMouseMove={onMM}
        onMouseUp={() => {}}
        onMouseLeave={() => {}}
        onTouchStart={onTS}
        onTouchMove={onTM}
        onTouchEnd={() => {}}
      >
        <motion.div
          ref={trackRef}
          animate={controls}
          style={{
            display: "flex",
            gap: GAP,
            width: "max-content",
            userSelect: "none",
            willChange: "transform",
            paddingBottom: "1rem",
          }}
        >
          {items.map((item, idx) => {
            const isActive   = active === idx;
            const isExpanded = expanded === idx;
            const mp         = mx[idx] ?? { x: 50, y: 50 };

            return (
              <motion.div
                key={idx}
                className="relative flex-shrink-0 overflow-hidden"
                style={{
                  width: COL_W,
                  background: isActive ? "#ffffff" : "rgba(0,0,0,0.18)",
                  border: isActive
                    ? "1.5px solid #ffffff"
                    : "1.5px solid rgba(255,255,255,0.18)",
                  boxShadow: isActive
                    ? "0 0 0 1px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.4)"
                    : "none",
                  transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                }}
                animate={{ y: isActive ? -4 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                onMouseEnter={() => setActive(idx)}
                onMouseLeave={() => setActive(null)}
                onMouseMove={(e) => trackMouse(e, idx)}
                onClick={() => handleClick(idx)}
              >
                {/* ── Cursor light — only when NOT active (white bg) ── */}
                {!isActive && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at ${mp.x}% ${mp.y}%, rgba(255,255,255,0.08) 0%, transparent 55%)`,
                      transition: "opacity 0.2s ease",
                    }}
                  />
                )}

                {/* ── Scan line on active ── */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 w-full pointer-events-none z-20"
                    style={{ height: 1, background: "rgba(255,62,0,0.5)" }}
                    initial={{ top: 0 }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 1.4, ease: "linear", repeat: Infinity, repeatDelay: 1 }}
                  />
                )}

                {/* ── Red corner accent ── */}
                {isActive && (
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: 0, height: 0,
                      borderLeft: "32px solid transparent",
                      borderTop: "32px solid #ff3e00",
                    }}
                  />
                )}

                <div className="p-7 flex flex-col">

                  {/* ── YEAR ── */}
                  <div
                    className="font-[1000] leading-none mb-5 select-none"
                    style={{
                      fontSize: "clamp(38px, 5vw, 58px)",
                      letterSpacing: "-0.04em",
                      color: isActive ? "#ff3e00" : "rgba(255,255,255,0.85)",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {item.year}
                  </div>

                  {/* ── ROLE ── */}
                  <p
                    className="font-[1000] uppercase leading-tight mb-2"
                    style={{
                      fontSize: 13,
                      letterSpacing: "-0.01em",
                      color: isActive ? "#000000" : "#ffffff",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {item.role}
                  </p>

                  {/* ── COMPANY ── */}
                  <p
                    className="font-mono uppercase mb-1"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      color: isActive ? "#ff3e00" : "rgba(255,255,255,0.7)",
                      transition: "color 0.25s ease",
                      fontWeight: 700,
                    }}
                  >
                    {item.company}
                  </p>

                  {/* ── LOCATION ── */}
                  <p
                    className="font-mono mb-5"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      color: isActive ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.4)",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {item.location}
                  </p>

                  {/* ── DIVIDER ── */}
                  <div
                    style={{
                      height: 1,
                      background: isActive ? "rgba(255,62,0,0.2)" : "rgba(255,255,255,0.1)",
                      marginBottom: 14,
                      transition: "background 0.25s ease",
                    }}
                  />

                  {/* ── CTA hint ── */}
                  {!isExpanded && (
                    <motion.p
                      className="font-mono uppercase"
                      style={{
                        fontSize: 8,
                        letterSpacing: "0.3em",
                        color: isActive ? "rgba(255,62,0,0.6)" : "rgba(255,255,255,0.22)",
                        transition: "color 0.25s ease",
                      }}
                      animate={isActive ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      + expand
                    </motion.p>
                  )}

                  {/* ── HIGHLIGHTS ── */}
                  <motion.div
                    style={{ overflow: "hidden" }}
                    animate={{
                      height: isExpanded ? "auto" : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.38, ease: "easeOut" }}
                  >
                    <div className="pt-1">
                      {item.highlights.map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start gap-3 mb-3"
                          initial={{ opacity: 0, x: -6 }}
                          animate={isExpanded ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                          transition={{ duration: 0.28, delay: i * 0.055, ease: "easeOut" }}
                        >
                          <div
                            className="flex-shrink-0 rounded-full mt-[6px]"
                            style={{
                              width: 4, height: 4,
                              background: isActive ? "#ff3e00" : "#ffffff",
                              boxShadow: isActive ? "0 0 5px #ff3e00" : "none",
                            }}
                          />
                          <p
                            style={{
                              fontSize: 11,
                              lineHeight: 1.65,
                              fontWeight: 500,
                              color: isActive ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.8)",
                              transition: "color 0.25s ease",
                            }}
                          >
                            {h}
                          </p>
                        </motion.div>
                      ))}

                      <p
                        className="font-mono uppercase mt-3"
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.3em",
                          color: isActive ? "rgba(255,62,0,0.5)" : "rgba(255,255,255,0.25)",
                          cursor: "pointer",
                        }}
                        onClick={(e) => { e.stopPropagation(); setExpanded(null); }}
                      >
                        − collapse
                      </p>
                    </div>
                  </motion.div>

                </div>

                {/* ── Index watermark ── */}
                <div
                  className="absolute bottom-4 right-5 font-[1000] leading-none select-none pointer-events-none"
                  style={{
                    fontSize: 56,
                    color: isActive ? "rgba(255,62,0,0.07)" : "rgba(255,255,255,0.04)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
              </motion.div>
            );
          })}

          {/* trailing spacer */}
          <div className="flex-shrink-0 w-12" />
        </motion.div>
      </div>

      <p className="md:hidden mt-4 font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
        tap to expand
      </p>
    </div>
  );
}