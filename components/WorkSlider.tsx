"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Item { title: string; desc: string; }

interface WorkSliderProps {
  statsUnits: string;
  statsDesc: string;
  items: Item[];
}

const MARQUEE = "E-COMMERCE · FULL STACK · 51.240 SKU · 20+ API · PERFORMANCE · GDPR · AUTOMATION ·  ";

const NEON: React.CSSProperties = {
  color: "#fff",
  textShadow: `
    0 0 7px #fff,
    0 0 10px #fff,
    0 0 21px #fff,
    0 0 42px #ff3e00,
    0 0 82px #ff3e00,
    0 0 92px #ff3e00
  `,
};

export default function WorkSlider({ statsUnits, statsDesc, items }: WorkSliderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef  = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="relative z-10 mt-32 md:mt-80 text-white">

      {/* ───────────────────────── NEON MARQUEE ───────────────────────── */}
      <div
        className="overflow-hidden py-5"
        style={{
          borderTop: "3px solid rgba(255,255,255,0.18)",
          borderBottom: "3px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        {/* direction: left→right (al contrario del marquee standard) */}
        <motion.div
          className="flex w-max"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
        >
          {[MARQUEE, MARQUEE].map((t, i) => (
            <span
              key={i}
              className="text-3xl sm:text-4xl md:text-5xl font-[1000] tracking-tighter whitespace-nowrap px-6"
              style={NEON}
            >
              {t}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ───────────────────────── DRAG HINT ───────────────────────── */}
      <div className="px-6 md:px-12 mt-6 mb-4 flex items-center gap-3">
        <motion.span
          className="font-mono text-[9px] uppercase tracking-[0.4em]"
          style={{ color: "rgba(255,255,255,0.25)" }}
          animate={{ opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ← drag to explore →
        </motion.span>
      </div>

      {/* ───────────────────────── SLIDER ───────────────────────── */}
      <div className="overflow-hidden px-6 md:px-12">
        <div ref={wrapperRef}>
                <motion.div
                ref={trackRef}
                className="flex gap-3 pb-2"
                drag="x"
                dragConstraints={wrapperRef}
                dragElastic={0.04}
                dragMomentum={false}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                style={{ cursor: isDragging ? "grabbing" : "grab", userSelect: "none" }}
                >

                {/* ── HERO CARD 51.240 ── */}
                <motion.div
                    className="flex-shrink-0 relative overflow-hidden"
                    style={{ width: 380, height: 320 }}
                    onHoverStart={() => { if (!isDragging) setHovered(-1); }}
                    onHoverEnd={() => setHovered(null)}
                    animate={hovered === -1 ? { scale: 1.015 } : { scale: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                >
                    {/* White background — inversione totale */}
                    <div className="absolute inset-0 bg-white" />

                    {/* Red corner triangle */}
                    <div
                    className="absolute top-0 right-0 w-0 h-0 pointer-events-none"
                    style={{
                        borderLeft: "56px solid transparent",
                        borderTop: "56px solid #ff3e00",
                    }}
                    />

                    {/* Subtle dot grid */}
                    <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                    }}
                    />

                    <div className="relative p-8 flex flex-col justify-between" style={{ height: 320 }}>
                    {/* Header */}
                    <div>
                        <p className="font-mono text-[9px] text-black/30 uppercase tracking-[0.35em]">
                        PRODUCTION · LIVE · 2024→2025
                        </p>
                        <div className="w-full h-px bg-black/10 mt-3 mb-0" />
                    </div>

                    {/* The number */}
                    <div className="my-auto py-8">
                        <div
                        className="font-[1000] text-black leading-[0.82]"
                        style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
                        >
                        51<span style={{ color: "#ff3e00" }}>.</span>240
                        </div>
                        <div className="font-mono text-[10px] text-black/35 uppercase tracking-[0.3em] mt-3">
                        {statsUnits}
                        </div>
                    </div>

                    {/* Footer */}
                    <div>
                        <div className="w-full h-px bg-black/10 mb-4" />
                        <p className="text-black/60 text-xs font-bold leading-snug uppercase tracking-wide">
                        {statsDesc}
                        </p>
                    </div>
                    </div>
                </motion.div>

                {/* ── AUTOMATION CARDS ── */}
                {items.map((item, idx) => {
                    const isHov = hovered === idx;
                    return (
                    <motion.div
                        key={idx}
                        className="flex-shrink-0 relative overflow-hidden"
                        style={{
                            width: 260,
                            height: 320,
                            borderLeft: `2px solid ${isHov ? "#ff3e00" : "rgba(255,255,255,0.35)"}`,
                            backgroundColor: isHov ? "#ffffff" : "rgba(0,0,0,0.55)",
                            transition: "background-color 0.28s ease, border-color 0.28s ease",
                        }}
                        onHoverStart={() => { if (!isDragging) setHovered(idx); }}
                        onHoverEnd={() => setHovered(null)}
                        animate={isHov ? { scale: 1.015 } : { scale: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {/* Scan line on hover */}
                        {isHov && (
                        <motion.div
                            className="absolute left-0 w-full pointer-events-none z-20"
                            style={{ height: 1, background: "#ff3e00", opacity: 0.7 }}
                            initial={{ top: "0%" }}
                            animate={{ top: "100%" }}
                            transition={{ duration: 1.4, ease: "linear", repeat: Infinity, repeatDelay: 0.6 }}
                        />
                        )}

                        <div
                        className="p-6 flex flex-col justify-between"
                        style={{ height: 320 }}
                        >
                        {/* Top meta */}
                        <div className="flex justify-between items-center">
                            <span
                            className="font-mono text-[9px] uppercase tracking-[0.3em]"
                            style={{ color: isHov ? "#ff3e00" : "rgba(255,255,255,0.25)" }}
                            >
                            LOG_{String(idx + 1).padStart(2, "0")}
                            </span>
                            <motion.div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: isHov ? "#ff3e00" : "rgba(255,255,255,0.2)" }}
                            animate={isHov
                                ? { boxShadow: ["0 0 4px #ff3e00", "0 0 12px #ff3e00", "0 0 4px #ff3e00"] }
                                : { boxShadow: "none" }
                            }
                            transition={{ duration: 1.2, repeat: Infinity }}
                            />
                        </div>

                    {/* BG number watermark */}
                        <div
                            className="absolute right-3 bottom-10 font-[1000] leading-none pointer-events-none select-none"
                            style={{
                            fontSize: "80px",
                            color: isHov ? "rgba(255,62,0,0.07)" : "rgba(255,255,255,0.04)",
                            }}
                        >
                            {String(idx + 1).padStart(2, "0")}
                        </div>

                        {/* Content */}
                        <div className="mt-auto">
                            <h4
                            className="text-sm font-[1000] uppercase leading-tight mb-3 tracking-tight"
                            style={{ color: isHov ? "#ff3e00" : "#fff" }}
                            >
                            {item.title}
                            </h4>
                            <p
                            className="text-[10px] leading-relaxed"
                            style={{
                                color: isHov ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.4)",
                                fontWeight: 500,
                                letterSpacing: "0.03em",
                            }}
                            >
                            {item.desc}
                            </p>
                        </div>

                        {/* Bottom status bar */}
                        <div className="mt-6 flex items-center gap-2 pt-4"
                            style={{ borderTop: `1px solid ${isHov ? "rgba(255,62,0,0.15)" : "rgba(255,255,255,0.08)"}` }}
                        >
                            <div
                            className="flex-1 h-px"
                            style={{ background: isHov ? "rgba(255,62,0,0.2)" : "rgba(255,255,255,0.08)" }}
                            />
                            <span
                            className="font-mono text-[8px] uppercase tracking-[0.3em]"
                            style={{ color: isHov ? "rgba(255,62,0,0.4)" : "rgba(255,255,255,0.15)" }}
                            >
                            OK
                            </span>
                        </div>
                        </div>
                    </motion.div>
                    );
                })}

                {/* trailing spacer */}
                <div className="flex-shrink-0 w-16" />
                </motion.div>
            </div>
        </div>
              {/* ── PUNTOLUCE LINKS ── */}
      <div className="px-6 md:px-12 mt-8 flex flex-col sm:flex-row gap-3">
        {[
          { label: "SHOP", sub: "shop.puntoluce.net", href: "https://shop.puntoluce.net/" },
          { label: "BLOG", sub: "puntoluce.net/comefare", href: "https://www.puntoluce.net/comefare/" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-4 px-6 py-4 overflow-hidden"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.3)",
              textDecoration: "none",
            }}
          >
            {/* hover fill */}
            <div
              className="absolute inset-0 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300 ease-out"
              style={{ background: "#fff" }}
            />
            <span
              className="relative font-[1000] text-xs tracking-[0.4em] transition-colors duration-300"
              style={{ color: "inherit" }}
            >
              <span className="group-hover:text-[#ff3e00] text-white transition-colors duration-300">
                {link.label}
              </span>
            </span>
            <span
              className="relative font-mono text-[10px] tracking-widest group-hover:text-black/50 text-white/30 transition-colors duration-300"
            >
              ↗ {link.sub}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}