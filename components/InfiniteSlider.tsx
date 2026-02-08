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
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className="flex gap-8 w-max">
        {tripleItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-3 group"
            style={{ width: itemWidth, height: itemHeight + 60 }}
          >
            {/* CONTAINER ICONA CON BG BIANCO SOLIDO */}
            <div 
              className="relative overflow-hidden rounded-xl bg-white border-2 border-white/20 p-4 shadow-md transition-all duration-300 group-hover:border-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] group-hover:scale-110"
              style={{ width: itemWidth, height: itemHeight }}
            >
              <img 
                src={item.icon} 
                alt={item.name}
                className="w-full h-full object-contain icon-grayscale group-hover:filter-none"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/${itemWidth}x${itemHeight}/000000/ffffff?text=${item.name.charAt(0)}`;
                }}
              />
            </div>
            
            {/* TESTO CON TEXT-SHADOW PER CONTRASTO */}
            <div className="text-center">
              <span className="font-mono text-xs text-white/70 group-hover:text-white uppercase leading-tight transition-all duration-300 block text-shadow-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {item.name}
              </span>
              {item.year && (
                <span className="font-mono text-[10px] text-white/50 group-hover:text-white/90 transition-all duration-300 block mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
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