"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface TimelineItem {
  year: string;
  role: string;
  company: string;
  location: string;
  highlights: string[];
}

interface ExperienceTimelineProps {
  items: TimelineItem[];
}

const COL_W = 320;
const COL_H = 520;
const GAP   = 0; // columns touch — separated only by 1px line

export default function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const controls  = useAnimationControls();
  const trackRef  = useRef<HTMLDivElement>(null);
  const dragStart = useRef(0);
  const dragX     = useRef(0);
  const [active, setActive]   = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  /* no auto-scroll for timeline — intentional, user drives it */

  const getCurrentX = () => {
    if (!trackRef.current) return 0;
    return new DOMMatrix(getComputedStyle(trackRef.current).transform).m41;
  };

  const onMD = (e: React.MouseEvent) => {
    dragStart.current = e.clientX;
    dragX.current = getCurrentX();
  };
  const onMM = (e: React.MouseEvent) => {
    if (e.buttons !== 1 || !trackRef.current) return;
    e.preventDefault();
    const newX = Math.min(0, dragX.current + (e.clientX - dragStart.current) * 1.2);
    controls.set({ x: newX });
  };
  const onTS = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientX;
    dragX.current = getCurrentX();
  };
  const onTM = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    const newX = Math.min(0, dragX.current + (e.touches[0].clientX - dragStart.current) * 1.2);
    controls.set({ x: newX });
  };

  const toggle = (idx: number) => {
    setExpanded(prev => prev === idx ? null : idx);
  };

  return (
    <div className="relative">

      {/* ── DRAG HINT ── */}
      <div className="mb-4">
        <motion.span
          className="font-mono text-[9px] uppercase tracking-[0.4em]"
          style={{ color: "rgba(255,255,255,0.22)" }}
          animate={{ opacity: [0.22, 0.6, 0.22] }}
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
            width: "max-content",
            userSelect: "none",
            willChange: "transform",
            /* top border — the "wire" */
            borderTop: "1px solid rgba(0,255,136,0.25)",
          }}
        >
          {items.map((item, idx) => {
            const isActive   = active === idx;
            const isExpanded = expanded === idx;

            return (
              <div
                key={idx}
                className="relative flex-shrink-0"
                style={{
                  width: COL_W,
                  minHeight: COL_H,
                  borderRight: "1px solid rgba(255,255,255,0.07)",
                  background: isActive
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(0,0,0,0.35)",
                  transition: "background 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setActive(idx)}
                onMouseLeave={() => setActive(null)}
                onClick={() => toggle(idx)}
              >
                {/* Top node on the wire */}
                <motion.div
                  className="absolute -top-[5px] left-10"
                  style={{
                    width: 9, height: 9,
                    borderRadius: "50%",
                    background: isActive ? "#00ff88" : "rgba(0,255,136,0.3)",
                    border: "1px solid rgba(0,255,136,0.6)",
                  }}
                  animate={isActive
                    ? { boxShadow: ["0 0 4px #00ff88", "0 0 16px #00ff88", "0 0 4px #00ff88"] }
                    : { boxShadow: "0 0 0px transparent" }
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                />

                {/* Vertical trace from node downward */}
                <motion.div
                  className="absolute left-[2.6rem]"
                  style={{
                    width: 1,
                    top: 4,
                    background: isActive
                      ? "linear-gradient(to bottom, #00ff88, rgba(0,255,136,0))"
                      : "linear-gradient(to bottom, rgba(0,255,136,0.2), transparent)",
                    transition: "background 0.3s ease",
                  }}
                  animate={{ height: isActive ? 80 : 40 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />

                <div className="p-8 pt-12 flex flex-col" style={{ minHeight: COL_H }}>

                  {/* ── YEAR — giant anchor ── */}
                  <motion.div
                    className="font-[1000] leading-none mb-6 select-none"
                    style={{
                      fontSize: "clamp(52px, 6vw, 72px)",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.12)",
                      letterSpacing: "-0.04em",
                      transition: "color 0.3s ease",
                    }}
                    animate={isActive ? { x: 0 } : { x: 0 }}
                  >
                    {item.year}
                    {/* neon underline */}
                    <motion.div
                      style={{
                        height: 2,
                        background: "#00ff88",
                        marginTop: 6,
                        originX: 0,
                        boxShadow: "0 0 8px #00ff88",
                      }}
                      animate={{ scaleX: isActive ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    />
                  </motion.div>

                  {/* ── ROLE ── */}
                  <div className="mb-1">
                    <p
                      className="font-[1000] uppercase leading-tight"
                      style={{
                        fontSize: 15,
                        letterSpacing: "-0.01em",
                        color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                        transition: "color 0.25s ease",
                      }}
                    >
                      {item.role}
                    </p>
                  </div>

                  {/* ── COMPANY ── */}
                  <p
                    className="font-mono uppercase"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: isActive ? "#00ff88" : "rgba(255,255,255,0.25)",
                      transition: "color 0.25s ease",
                      marginBottom: 4,
                    }}
                  >
                    {item.company}
                  </p>

                  {/* ── LOCATION ── */}
                  <p
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: "rgba(255,255,255,0.18)",
                      marginBottom: 20,
                    }}
                  >
                    {item.location}
                  </p>

                  {/* ── CTA hint ── */}
                  {!isExpanded && (
                    <motion.p
                      className="font-mono uppercase"
                      style={{
                        fontSize: 8,
                        letterSpacing: "0.3em",
                        color: isActive ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.1)",
                        transition: "color 0.25s ease",
                      }}
                      animate={isActive ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      + expand
                    </motion.p>
                  )}

                  {/* ── HIGHLIGHTS — expand on click ── */}
                  <motion.div
                    style={{ overflow: "hidden" }}
                    animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div
                      className="pt-5 mt-2"
                      style={{ borderTop: "1px solid rgba(0,255,136,0.15)" }}
                    >
                      {item.highlights.map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start gap-3 mb-3"
                          initial={{ opacity: 0, x: -8 }}
                          animate={isExpanded ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                          transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                        >
                          {/* neon dot */}
                          <div
                            className="flex-shrink-0 rounded-full mt-1.5"
                            style={{
                              width: 4, height: 4,
                              background: "#00ff88",
                              boxShadow: "0 0 6px #00ff88",
                            }}
                          />
                          <p
                            style={{
                              fontSize: 11,
                              lineHeight: 1.6,
                              color: "rgba(255,255,255,0.65)",
                              fontWeight: 500,
                            }}
                          >
                            {h}
                          </p>
                        </motion.div>
                      ))}

                      {/* collapse */}
                      <p
                        className="font-mono uppercase mt-4"
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.3em",
                          color: "rgba(0,255,136,0.4)",
                          cursor: "pointer",
                        }}
                        onClick={(e) => { e.stopPropagation(); setExpanded(null); }}
                      >
                        − collapse
                      </p>
                    </div>
                  </motion.div>

                </div>

                {/* Bottom index */}
                <div
                  className="absolute bottom-6 right-6 font-[1000] leading-none select-none pointer-events-none"
                  style={{
                    fontSize: 64,
                    color: isActive ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.025)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
              </div>
            );
          })}

          {/* End cap */}
          <div
            className="flex-shrink-0 flex items-start pt-3 pl-8"
            style={{ width: 80 }}
          >
            <div style={{ width: 1, height: 9, background: "rgba(0,255,136,0.4)" }} />
          </div>
        </motion.div>
      </div>

      {/* Mobile tap hint */}
      <p className="md:hidden mt-4 font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
        tap to expand
      </p>
    </div>
  );
}