"use client";
import { useEffect, useRef, useState } from "react";

interface SliderItem {
  name: string;
  icon: string;
  year?: string;
}

interface InfiniteSliderProps {
  items: SliderItem[];
  speed?: number;
  itemWidth?: number;
  itemHeight?: number;
}

export default function InfiniteSlider({ 
  items, 
  speed = 1, 
  itemWidth = 80, 
  itemHeight = 80 
}: InfiniteSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    let currentScroll = 0;
    const totalWidth = items.length * (itemWidth + 32);

    const animate = () => {
      if (!isPaused && container) {
        currentScroll += speed;
        if (currentScroll >= totalWidth) {
          currentScroll = 0;
        }
        container.scrollLeft = currentScroll;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, items.length, speed, itemWidth]);

  const tripleItems = [...items, ...items, ...items];

  return (
    <div 
      ref={containerRef}
      className="overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ 
        cursor: 'grab',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      <div className="flex gap-8 w-max">
        {tripleItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-3 group relative"
            style={{ width: itemWidth, height: itemHeight + 60 }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* PARTICLE TRAIL */}
            {!isPaused && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/40 rounded-full"
                    style={{
                      animation: `particle-trail ${0.8 + i * 0.2}s ease-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* ICON CONTAINER WITH 3D FLIP */}
            <div 
              className="relative overflow-visible rounded-xl bg-white border-2 border-white/20 p-4 shadow-md transition-all duration-500 group-hover:border-white slider-icon-container"
              style={{ 
                width: itemWidth, 
                height: itemHeight,
                transformStyle: 'preserve-3d',
                transform: hoveredIndex === idx ? 'rotateY(360deg) scale(1.15)' : 'rotateY(0deg) scale(1)',
              }}
            >
              {/* RAINBOW GLOW */}
              <div 
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rainbow-glow"
                style={{
                  background: 'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #ff0080)',
                  backgroundSize: '300% 300%',
                  filter: 'blur(20px)',
                  transform: 'scale(1.5)',
                  zIndex: -1,
                }}
              />

              {/* ICON */}
              <img 
                src={item.icon} 
                alt={item.name}
                className="w-full h-full object-contain transition-all duration-500 relative z-10"
                style={{
                  filter: hoveredIndex === idx 
                    ? 'brightness(1.3) contrast(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.8))' 
                    : 'brightness(0.9) contrast(1.1)',
                }}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/${itemWidth}x${itemHeight}/ff3e00/ffffff?text=${item.name.charAt(0)}`;
                }}
              />

              {/* SHINE EFFECT */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none shine-effect"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  transform: 'translateX(-100%)',
                }}
              />
            </div>
            
            {/* TEXT WITH GLOW */}
            <div className="text-center relative z-10">
              <span 
                className="font-mono text-xs text-white/90 group-hover:text-white uppercase leading-tight transition-all duration-300 block relative"
                style={{ 
                  textShadow: hoveredIndex === idx 
                    ? '0 0 10px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.8)' 
                    : '0 2px 4px rgba(0,0,0,0.8)' 
                }}
              >
                {item.name}
                {/* TEXT PARTICLES ON HOVER */}
                {hoveredIndex === idx && (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <span
                        key={i}
                        className="absolute top-0 left-1/2 w-1 h-1 bg-white/60 rounded-full"
                        style={{
                          animation: `text-particle ${0.6}s ease-out forwards`,
                          animationDelay: `${i * 0.1}s`,
                          transform: `rotate(${i * 90}deg)`,
                        }}
                      />
                    ))}
                  </>
                )}
              </span>
              {item.year && (
                <span 
                  className="font-mono text-[10px] text-white/70 group-hover:text-white transition-all duration-300 block mt-1" 
                  style={{ 
                    textShadow: hoveredIndex === idx 
                      ? '0 0 8px rgba(255,255,255,0.6)' 
                      : '0 1px 2px rgba(0,0,0,0.8)' 
                  }}
                >
                  {item.year}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}