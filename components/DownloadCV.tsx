"use client";
import { useState } from "react";

interface DownloadCVProps {
  buttonText: string;
  filesize: string;
  lang: string;
}

export default function DownloadCV({ buttonText, filesize, lang }: DownloadCVProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number}>>([]);
  const [isHovered, setIsHovered] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);

    const duration = 1500;
    const steps = 100;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setProgress(i);
    }

    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: 50,
      y: 50,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);

    const link = document.createElement('a');
    link.href = `/cv/GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
    link.download = `GianlivioIemolo_CV_${lang.toUpperCase()}.pdf`;
    link.click();

    setTimeout(() => {
      setIsDownloading(false);
      setProgress(0);
    }, 500);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleDownload}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isDownloading}
        className="relative overflow-hidden bg-black/80 border-4 border-white/40 px-12 py-6 rounded transition-all duration-300 hover:border-white hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {particles.map((particle, i) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-[#ff3e00] rounded-full pointer-events-none"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `download-particle ${0.8}s ease-out forwards`,
              animationDelay: `${i * 0.03}s`,
              transform: `rotate(${i * 18}deg)`,
            }}
          />
        ))}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 noise-texture pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            {isDownloading ? '⏳' : '📥'}
          </div>
          
          <div className="text-left">
            <div className="relative">
              <span className="block font-mono text-2xl font-black uppercase text-white group-hover:text-[#ff3e00] transition-colors duration-300">
                {buttonText}
              </span>
              
              {isHovered && !isDownloading && (
                <>
                  <span 
                    className="absolute top-0 left-0 font-mono text-2xl font-black uppercase text-red-500 opacity-70"
                    style={{
                      animation: 'glitch-1 0.3s infinite',
                      clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
                    }}
                  >
                    {buttonText}
                  </span>
                  <span 
                    className="absolute top-0 left-0 font-mono text-2xl font-black uppercase text-cyan-500 opacity-70"
                    style={{
                      animation: 'glitch-2 0.3s infinite',
                      clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
                    }}
                  >
                    {buttonText}
                  </span>
                </>
              )}
            </div>
            
            <span className="block font-mono text-xs text-white/60 group-hover:text-[#ff3e00]/80 mt-1 transition-colors duration-300">
              {filesize}
            </span>
          </div>
        </div>

        {isDownloading && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
            <div 
              className="h-full bg-gradient-to-r from-[#ff3e00] via-white to-[#ff3e00] transition-all duration-100"
              style={{ 
                width: `${progress}%`,
                boxShadow: '0 0 10px rgba(255, 62, 0, 0.8)',
              }}
            />
          </div>
        )}

        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none scan-lines-download"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
          }}
        />
      </button>

      {isDownloading && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 font-mono text-sm text-white bg-[#ff3e00] px-4 py-1 rounded whitespace-nowrap animate-pulse">
          DOWNLOADING... {progress}%
        </div>
      )}
    </div>
  );
}