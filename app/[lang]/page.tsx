"use client";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, use } from "react";
import LanguagePicker from '../../components/LanguagePicker';
import InfiniteSlider from '../../components/InfiniteSlider';
import ContactCard from '../../components/ContactCard';
import DownloadCV from '../../components/DownloadCV';
import ExperienceTimeline from '../../components/ExperienceTimeline';

import it from '../../dictionaries/it.json';
import en from '../../dictionaries/en.json';
import es from '../../dictionaries/es.json';

const dictionaries: any = { it, en, es };

export default function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
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
    <main className="relative min-h-[400vh] bg-[#ff3e00] overflow-x-hidden select-none cursor-none font-sans">
      
      <motion.div 
        className="fixed top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-white rounded-full pointer-events-none z-[100] mix-blend-difference"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
      />

{/* BACKGROUND LOGS - FAST SEAMLESS */}
<motion.div 
  style={{ opacity: opacityLog }}
  className="fixed top-0 left-0 w-full h-full pointer-events-none font-mono text-[8px] leading-tight break-all p-4 z-0 overflow-hidden"
>
  <motion.div
    className="flex flex-col gap-1"
    animate={{
      y: [-800, 0]
    }}
    transition={{
      duration: 30,
      repeat: Infinity,
      ease: "linear"
    }}
  >
    {[...Array(3)].flatMap((_, setIdx) => 
      Array.from({ length: 30 }).map((_, i) => (
        <p key={`${setIdx}-${i}`} style={{ color: 'rgba(0, 0, 0, 0.8)' }}>
          ERR_NO_SEMANTIC_NOISE_SKU_51240_CATEGORIES_13102_CWV_OPTIMIZED_STATUS_OK_
        </p>
      ))
    )}
  </motion.div>
</motion.div>

      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 flex justify-between items-start z-[110] mix-blend-difference text-white">
        <div className="text-3xl font-[1000] leading-[0.7] tracking-tighter">
          GIANLIVIO<br/>IEMOLO
        </div>
        <LanguagePicker currentLang={lang} />
      </nav>

      {/* HERO */}
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

      {/* STATS PUNTOLUCE */}
      <section className="relative z-10 mt-80 px-6 md:px-12 text-white">
        <div className="border-t-[10px] border-white pt-10">
          <div className="flex flex-col md:flex-row justify-between items-baseline gap-4 text-white">
            <span className="text-[18vw] font-[1000] italic leading-none">51.240</span>
            <span className="font-mono text-2xl md:text-5xl font-black italic uppercase">{dict.stats.units}</span>
          </div>
          <p className="text-4xl md:text-7xl font-[1000] mt-10 max-w-6xl leading-[0.85] uppercase">
            {dict.stats.desc}
          </p>
        </div>
      </section>

      {/* NEW SECTION: AUTOMATIONS & ENTROPY - 6 ITEMS */}
      <section className="relative z-10 mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high">
            {dict.automations.title}
          </h3>
          <p className="font-mono text-xl md:text-2xl text-white/80 uppercase tracking-widest italic">
            {dict.automations.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 border-white/20 bg-white/10">
          {dict.automations.items.map((item: any, idx: number) => (
            <div key={idx} className="card-elevated p-8 h-full flex flex-col justify-between group">
              <span className="font-mono text-sm mb-10 opacity-50 group-hover:opacity-100 italic">LOG_0{idx + 1}</span>
              <div>
                <h4 className="text-3xl font-[1000] mb-6 leading-none uppercase">{item.title}</h4>
                <p className="text-lg font-bold leading-tight uppercase">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

{/* SECTION: CERTIFICATIONS SLIDER */}
      <section className="relative z-10 mt-32 md:mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[12vw] md:text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high uppercase break-words">
            {dict.certifications.title}
          </h3>
        </div>
        <InfiniteSlider 
          items={dict.certifications.items} 
          speed={0.8} 
          itemWidth={120} 
          itemHeight={120}
        />
      </section>

      {/* SECTION: TECH STACK SLIDER */}
      <section className="relative z-10 mt-32 md:mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[12vw] md:text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high uppercase break-words">
            {dict.techstack.title}
          </h3>
        </div>
        <InfiniteSlider 
          items={dict.techstack.items} 
          speed={1.2} 
          itemWidth={80} 
          itemHeight={80}
        />
      </section>

      {/* SECTION: CONTACT - MAGNETIC CARDS */}
      <section className="relative z-10 mt-32 md:mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[12vw] md:text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high uppercase break-words">
            {dict.contact.title}
          </h3>
          <p className="font-mono text-xl md:text-2xl text-white/80 uppercase tracking-widest italic">
            {dict.contact.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dict.contact.items.map((item: any, idx: number) => (
            <ContactCard
              key={idx}
              label={item.label}
              value={item.value}
              href={item.href}
              type={item.type}
              copyable={item.copyable}
              icon={item.icon} 
            />
          ))}
        </div>
      </section>

      {/* SECTION: DOWNLOAD CV */}
      <section className="relative z-10 mt-32 md:mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[12vw] md:text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high uppercase break-words">
            {dict.cta.title}
          </h3>
          <p className="font-mono text-xl md:text-2xl text-white/80 uppercase tracking-widest italic">
            {dict.cta.subtitle}
          </p>
        </div>

        <div className="flex justify-center">
          <DownloadCV 
            buttonText={dict.cta.button}
            filesize={dict.cta.filesize}
            lang={lang}
          />
        </div>
      </section>

      {/* SECTION: EXPERIENCE TIMELINE */}
      <section className="relative z-10 mt-32 md:mt-80 px-6 md:px-12 text-white">
        <div className="mb-20">
          <h3 className="text-[12vw] md:text-[10vw] font-[1000] leading-[0.8] tracking-tighter mb-4 underline decoration-[10px] text-contrast-high uppercase break-words">
            {dict.timeline.title}
          </h3>
          <p className="font-mono text-xl md:text-2xl text-white/80 uppercase tracking-widest italic">
            {dict.timeline.subtitle}
          </p>
        </div>

        <ExperienceTimeline items={dict.timeline.items} />
      </section>

      {/* FOOTER */}
      <footer className="mt-32 md:mt-80 p-6 md:p-12 flex flex-col md:flex-row justify-between items-end gap-10 text-white pb-20">
        <div className="max-w-md">
          <p className="font-mono text-xs mb-4 opacity-50 tracking-widest uppercase italic">SYSTEM_PHILOSOPHY</p>
          <p className="text-xl font-bold italic underline">
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