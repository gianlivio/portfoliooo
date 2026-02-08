"use client";
import { usePathname, useRouter } from 'next/navigation';

export default function LanguagePicker() {
  const pathname = usePathname();
  const router = useRouter();

  const redirectedPathname = (locale: string) => {
    if (!pathname) return "/";
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  };

  return (
    <div className="flex gap-4 font-mono text-[10px] tracking-widest uppercase">
      {['it', 'en', 'es'].map((l) => (
        <button 
          key={l} 
          onClick={() => router.push(redirectedPathname(l))}
          className="hover:text-black text-slate-400 transition-colors border-b border-transparent hover:border-black"
        >
          {l}
        </button>
      ))}
    </div>
  );
}