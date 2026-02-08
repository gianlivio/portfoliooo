"use client";
import { useState, useRef } from "react";

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

export default function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [electricArcs, setElectricArcs] = useState<Array<{id: number; from: number; to: number}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    
    if (index < items.length - 1) {
      const newArcs = Array.from({ length: 3 }, (_, i) => ({
        id: Date.now() + i,
        from: index,
        to: index + 1,
      }));
      setElectricArcs(newArcs);
      setTimeout(() => setElectricArcs([]), 1200);
    }
  };

  const handleTouch = (index: number) => {
    const newArcs = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      from: index,
      to: Math.min(index + 1, items.length - 1),
    }));
    setElectricArcs(prev => [...prev, ...newArcs]);
    setTimeout(() => setElectricArcs([]), 800);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute inset-0 pcb-grid opacity-20 pointer-events-none" />
      
      <div className="relative flex flex-col md:flex-row gap-8 md:gap-0 items-center md:items-stretch">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const isActive = activeNode === index;
          
          return (
            <div
              key={index}
              className="relative flex-1 flex flex-col items-center"
              style={{ zIndex: isExpanded ? 10 : 1 }}
            >
              <div
                className="microchip-card relative cursor-pointer group w-full max-w-[320px] md:max-w-none"
                onClick={() => handleNodeClick(index)}
                onMouseEnter={() => setActiveNode(index)}
                onMouseLeave={() => setActiveNode(null)}
                onTouchStart={() => handleTouch(index)}
              >
                <div className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-around">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={`pin-l-${i}`}
                        className="w-3 h-1 bg-gradient-to-r from-[#444] to-[#888] pin-connector"
                        style={{
                          boxShadow: isActive ? '0 0 8px #00ff88' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div className="absolute -right-2 top-0 bottom-0 flex flex-col justify-around">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={`pin-r-${i}`}
                        className="w-3 h-1 bg-gradient-to-l from-[#444] to-[#888] pin-connector"
                        style={{
                          boxShadow: isActive ? '0 0 8px #00ff88' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div 
                    className="relative bg-[#0a0e1a] border-2 p-6 overflow-hidden transition-all duration-500"
                    style={{
                      borderColor: isExpanded ? '#00ff88' : isActive ? '#00ccff' : '#334',
                      boxShadow: isExpanded 
                        ? '0 0 30px rgba(0,255,136,0.6), inset 0 0 20px rgba(0,255,136,0.1)' 
                        : isActive 
                        ? '0 0 20px rgba(0,204,255,0.4)' 
                        : '0 2px 8px rgba(0,0,0,0.5)',
                      transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-[#00ff88]/30 to-transparent circuit-trace" />
                    <div className="absolute bottom-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-[#00ff88]/30 to-transparent circuit-trace" />

                    <div 
                      className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none neon-pulse"
                      style={{
                        opacity: isActive ? 0.3 : 0,
                        background: 'radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)',
                      }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          className="font-mono text-xs px-2 py-1 rounded transition-all duration-300"
                          style={{
                            background: isActive ? 'rgba(0,255,136,0.2)' : 'rgba(51,68,85,0.3)',
                            color: isActive ? '#00ff88' : '#6b7280',
                            boxShadow: isActive ? '0 0 10px rgba(0,255,136,0.3)' : 'none',
                          }}
                        >
                          {item.year}
                        </div>
                        <div className="flex gap-1">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                              style={{
                                background: isActive ? '#00ff88' : '#334',
                                boxShadow: isActive ? '0 0 6px #00ff88' : 'none',
                                animation: isActive ? `blink ${0.8 + i * 0.2}s infinite` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <h3 
                        className="text-xl font-black uppercase mb-2 leading-tight transition-all duration-300"
                        style={{
                          color: isActive ? '#00ff88' : '#fff',
                          textShadow: isActive ? '0 0 20px rgba(0,255,136,0.5)' : 'none',
                        }}
                      >
                        {item.role}
                      </h3>

                      <p className="text-base font-bold text-[#a0aec0] mb-1">
                        {item.company}
                      </p>
                      <p className="text-xs text-[#718096] font-mono mb-3">
                        {item.location}
                      </p>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <div 
                          className="w-2 h-2 rounded-full transition-all duration-300"
                          style={{
                            background: isExpanded ? '#00ff88' : '#334',
                            boxShadow: isExpanded ? '0 0 10px #00ff88' : 'none',
                          }}
                        />
                        <span style={{ color: isExpanded ? '#00ff88' : '#718096' }}>
                          {isExpanded ? 'ACTIVE' : 'STANDBY'}
                        </span>
                      </div>

                      <div 
                        className="overflow-hidden transition-all duration-500"
                        style={{
                          maxHeight: isExpanded ? '400px' : '0px',
                          opacity: isExpanded ? 1 : 0,
                        }}
                      >
                        <div className="mt-4 pt-4 border-t border-[#334]">
                          <div className="space-y-2">
                            {item.highlights.map((highlight, i) => (
  <div 
    key={i}
    className="flex items-start gap-2 text-sm"
    style={{
      // Cambiamo il modo in cui gestiamo l'entrata
      animation: isExpanded ? `circuit-fade-in 0.4s ease-out forwards` : 'none',
      animationDelay: `${i * 0.1}s`,
      opacity: isExpanded ? 0 : 0, // Inizia da 0 solo se espanso
      willChange: 'transform, opacity'
    }}
  >
    <div 
      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
      style={{
        background: '#00ff88',
        boxShadow: '0 0 6px #00ff88',
      }}
    />
    <span 
      className="font-medium text-white"
      style={{
        textShadow: '0 0 10px rgba(0,255,136,0.3)',
      }}
    >
      {highlight}
    </span>
  </div>
))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#ff3e00] solder-point" 
                         style={{ boxShadow: '0 0 8px #ff3e00' }} />
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff3e00] solder-point" 
                         style={{ boxShadow: '0 0 8px #ff3e00' }} />
                    <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-[#ff3e00] solder-point" 
                         style={{ boxShadow: '0 0 8px #ff3e00' }} />
                    <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#ff3e00] solder-point" 
                         style={{ boxShadow: '0 0 8px #ff3e00' }} />
                  </div>
                </div>
              </div>

              {index < items.length - 1 && (
                <div className="hidden md:block absolute top-1/2 left-[calc(50%+160px)] w-[calc(100%-320px)] h-0.5 -translate-y-1/2 z-0">
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="#334"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="circuit-connection"
                    />
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="#00ff88"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="circuit-connection-active"
                      style={{
                        opacity: activeNode === index ? 1 : 0,
                        filter: 'drop-shadow(0 0 4px #00ff88)',
                      }}
                    />
                  </svg>
                  
                  {electricArcs.filter(arc => arc.from === index).map((arc, i) => (
                    <div
                      key={arc.id}
                      className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 pointer-events-none"
                    >
                      <div
                        className="electric-arc"
                        style={{
                          animation: `electric-flow 0.8s ease-out forwards`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {index < items.length - 1 && (
                <div className="md:hidden w-0.5 h-16 mx-auto bg-[#334] relative my-4">
                  <div 
                    className="absolute inset-0 bg-[#00ff88] transition-opacity duration-300"
                    style={{
                      opacity: activeNode === index ? 1 : 0,
                      boxShadow: '0 0 8px #00ff88',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center font-mono text-xs text-[#718096] md:hidden">
        TAP TO ACTIVATE CIRCUIT NODE
      </div>
    </div>
  );
}