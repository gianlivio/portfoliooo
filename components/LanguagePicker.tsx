"use client";
import { usePathname, useRouter } from 'next/navigation';

export default function LanguagePicker({ currentLang }: { currentLang: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLang: string) => {
    if (!pathname) return;

    // Dividiamo il percorso attuale: es. ["", "it", "about"]
    const segments = pathname.split('/');
    
    // Cambiamo solo il segmento della lingua (che è sempre in posizione 1)
    segments[1] = newLang;
    
    const newPathname = segments.join('/');

    // Se stiamo già sulla lingua selezionata, non fare nulla
    if (pathname === newPathname) return;

    // Eseguiamo il push del nuovo URL
    router.push(newPathname);
    
    // Opzionale: Forza un refresh leggero se Turbopack fa i capricci
    // router.refresh(); 
  };

  return (
    <div className="flex gap-2 font-mono text-[10px] md:text-xs mix-blend-difference">
      {['it', 'en', 'es'].map((l) => (
        <button 
          key={l} 
          onClick={() => handleLanguageChange(l)}
          className={`px-3 py-1 border transition-all duration-300 ${
            currentLang === l 
              ? 'bg-white text-black border-white' 
              : 'bg-transparent text-white border-white/40 hover:border-white'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}