"use client";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, use } from "react";
import LanguagePicker from '../../components/LanguagePicker';

// Import dizionari
import it from '../../dictionaries/it.json';
import en from '../../dictionaries/en.json';
import es from '../../dictionaries/es.json';

const dictionaries: any = { it, en, es };

export default function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
  
  // Seleziona il dizionario in base al parametro dell'URL
  // Aggiungiamo un log per debuggare in tempo reale nella console del browser
  const dict = dictionaries[lang] || dictionaries.it;

  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const springX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  const { scrollYProgress } = useScroll();
  const skew = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const opacityLog = useTransform(scrollYProgress, [0, 0.2], [0.15, 0]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouseX.set(clientX);
      mouseY.set(clientY);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, [mouseX, mouseY]);

  return (
    <main className="relative min-h-[250vh] bg-[#ff3e00] overflow-x-hidden select-none cursor-none font-sans">
      
      {/* CURSORE INVERTENTE */}
      <motion.div 
        className="fixed top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-white rounded-full pointer-events-none z-[100] mix-blend-difference"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
      />

      {/* BACKGROUND LOGS */}
      <motion.div 
        style={{ opacity: opacityLog }}
        className="fixed top-0 left-0 w-full h-full pointer-events-none font-mono text-[10px] leading-none break-all p-4 z-0 text-white"
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <p key={i}>ERR_NO_SEMANTIC_NOISE_SKU_51240_CATEGORIES_13102_CWV_OPTIMIZED_STATUS_OK_</p>
        ))}
      </motion.div>

      {/* NAV CON LANGUAGE PICKER */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 flex justify-between items-start z-[110] mix-blend-difference text-white">
        <div className="text-3xl font-[1000] leading-[0.7] tracking-tighter">
          GIANLIVIO<br/>IEMOLO
        </div>
        <LanguagePicker currentLang={lang} />
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-48 md:pt-64 px-6 md:px-12 pointer-events-none text-white">
        <motion.h1 
          style={{ skewX: skew }}
          className="text-[20vw] font-[1000] leading-[0.75] tracking-[-0.08em] mb-20"
        >
          {dict.hero.title.split(' ')[0]}<br/>
          {dict.hero.title.split(' ')[1] || ""}
        </motion.h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <h2 className="text-5xl md:text-[7vw] font-[1000] tracking-tighter leading-[0.8] uppercase">
             {dict.hero.sub}
          </h2>
          <div className="self-end italic text-2xl md:text-4xl font-bold leading-tight tracking-tight max-w-xl">
            "{dict.hero.desc}"
          </div>
        </div>
      </section>

      {/* SECTION PUNTOLUCE */}
      <section className="relative z-10 mt-80 px-6 md:px-12 text-white pb-40">
        <div className="border-t-[10px] border-white pt-10">
          <div className="flex flex-col md:flex-row justify-between items-baseline gap-4">
            <span className="text-[18vw] font-[1000] italic leading-none">51.240</span>
            <span className="font-mono text-2xl md:text-5xl font-black italic uppercase">{dict.stats.units}</span>
          </div>
          <p className="text-4xl md:text-7xl font-[1000] mt-10 max-w-6xl leading-[0.85] uppercase">
            {dict.stats.desc}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-40 p-6 md:p-12 flex flex-col md:flex-row justify-between items-end gap-10 text-white pb-20">
        <div className="max-w-md">
          <p className="font-mono text-xs mb-4 opacity-50 tracking-widest">SYSTEM_PHILOSOPHY</p>
          <p className="text-xl font-bold italic">
            "{dict.footer.philosophy}"
          </p>
        </div>
        <div className="text-[15vw] font-[1000] leading-[0.7] opacity-20">
          2026
        </div>
      </footer>
    </main>
  );
}