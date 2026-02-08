"use client";
import { usePathname, useRouter } from 'next/navigation';

export default function LanguagePicker({ currentLang }: { currentLang: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLang: string) => {
    const segments = pathname.split('/');
    segments[1] = newLang; // Cambia la lingua nell'URL (es. da /it a /en)
    router.push(segments.join('/'));
  };

  return (
    <div className="flex gap-2 font-mono text-[10px] md:text-xs">
      {['it', 'en', 'es'].map((l) => (
        <button 
          key={l} 
          onClick={() => handleLanguageChange(l)}
          className={`px-2 py-1 border ${currentLang === l ? 'bg-white text-black' : 'border-white text-white'} hover:bg-white hover:text-black transition-all`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}