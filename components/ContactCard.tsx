"use client";
import { useState, useRef } from "react";

interface ContactCardProps {
  label: string;
  value: string;
  href: string;
  copyable?: boolean;
  type: "email" | "phone" | "linkedin" | "github";
  icon?: any;
}

const ICONS = {
  email: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
    </svg>
  ),
};

export default function ContactCard(props: ContactCardProps) {
  const { label, value, href, copyable = false, type } = props;
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number}>>([]);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
    const tiltX = ((y - 50) / 50) * 15;
    const tiltY = ((x - 50) / 50) * -15;
    setTilt({ rotateX: tiltX, rotateY: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x,
        y,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 1000);
    }
    if (copyable) {
      e.preventDefault();
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative contact-card group cursor-pointer perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      <a
        href={href}
        onClick={handleClick}
        className="block relative overflow-hidden bg-[#0a0a0a] border-l border-t border-white/10 p-8 backdrop-blur-md transition-colors duration-500 group-hover:bg-[#111]"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 82%, 88% 100%, 0 100%)",
        }}
        target={type === "linkedin" || type === "github" ? "_blank" : undefined}
        rel={type === "linkedin" || type === "github" ? "noopener noreferrer" : undefined}
      >
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
          style={{
            background: `
              linear-gradient(90deg, rgba(255,62,0,0.1) 1px, transparent 1px),
              linear-gradient(rgba(255,62,0,0.1) 1px, transparent 1px),
              radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 noise-texture pointer-events-none" />
        <div className="relative z-10">
          <div className="absolute -top-4 -right-4 font-mono text-[8px] text-[#ff3e00] opacity-0 group-hover:opacity-100 transition-all duration-300">
            REF_ID: {type.toUpperCase()}_MOD_01
          </div>
          <div 
            className="w-16 h-16 mb-4 text-white group-hover:text-[#ff3e00] transition-all duration-300 relative"
            style={{
              transform: `translateZ(30px) translateX(${(mousePos.x - 50) * 0.1}px) translateY(${(mousePos.y - 50) * 0.1}px)`,
            }}
          >
            <div 
              className="w-12 h-12 mb-6 text-white group-hover:text-black transition-all duration-300"
              style={{ transform: `translateZ(40px)` }}
            >
              <div className="relative">
                {/* Doppia icona per effetto sdoppiamento */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-pulse text-[#ff3e00] translate-x-[2px]">
                  {ICONS[type]}
                </div>
                <div className="relative mix-blend-difference">
                  {ICONS[type]}
                </div>
              </div>
            </div>
            <div className="relative group-hover:opacity-0 transition-opacity duration-150">
              {ICONS[type]}
            </div>
          </div>
          <div 
            className="relative mb-2"
            style={{
              transform: `translateZ(20px) translateX(${(mousePos.x - 50) * 0.05}px)`,
            }}
          >
            <span className="block font-mono text-sm uppercase tracking-widest text-white/60 group-hover:text-white transition-colors duration-300 relative glitch-text">
              {label}
            </span>
          </div>
          <div 
            className="font-bold text-lg text-white transition-colors duration-300 break-all relative"
            style={{
              transform: `translateZ(10px) translateX(${(mousePos.x - 50) * 0.03}px)`,
            }}
          >
            {value}
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-30 pointer-events-none scan-lines" />
        </div>
        {particles.map((particle, i) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-[#ff3e00] rounded-full pointer-events-none"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `particle-explode 1s ease-out forwards`,
              animationDelay: `${i * 0.02}s`,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
        {isCopied && (
          <div className="absolute top-4 right-4 bg-[#ff3e00] text-white px-3 py-1 rounded font-mono text-xs animate-bounce">
            COPIED
          </div>
        )}
      </a>
    </div>
  );
}