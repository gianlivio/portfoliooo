import LanguagePicker from '../../components/LanguagePicker';

// Funzione per caricare il dizionario corretto
const getDictionary = async (lang: string) => {
  const dictionaries: any = {
    it: () => import('../../dictionaries/it.json').then((module) => module.default),
    en: () => import('../../dictionaries/en.json').then((module) => module.default),
    es: () => import('../../dictionaries/es.json').then((module) => module.default),
  };
  
  // Gestione errore se la lingua non esiste
  return dictionaries[lang] ? dictionaries[lang]() : dictionaries['it']();
};

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  // AWAIT dei params (fondamentale in Next.js 15+)
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="bg-white min-h-screen text-slate-900 selection:bg-black selection:text-white">
      {/* Navigazione */}
      <nav className="p-8 flex justify-between items-center fixed w-full top-0 bg-white/80 backdrop-blur-md z-50">
        <span className="font-bold tracking-tighter text-xl text-black">GIANLIVIO.</span>
        <LanguagePicker />
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-48 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Box 1: HERO - Semiotica */}
          <div className="md:col-span-3 bg-slate-50 p-12 rounded-[2rem] flex flex-col justify-center border border-slate-100">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9] text-black">
              {dict.hero.title}
            </h1>
            <p className="max-w-xl text-xl text-slate-600 leading-relaxed">
              {dict.hero.desc}
            </p>
          </div>

          {/* Box 2: Performance (Lighthouse) */}
          <div className="bg-black text-white p-8 rounded-[2rem] flex flex-col justify-between items-center text-center group hover:bg-[#00ff41] hover:text-black transition-colors duration-500">
             <div className="text-7xl font-bold italic">100</div>
             <p className="text-[10px] font-mono uppercase tracking-[0.2em]">{dict.stats.lighthouse}</p>
          </div>

          {/* Box 3: Analytics (Dato dal tuo CV) */}
          <div className="bg-slate-900 text-white p-8 rounded-[2rem] flex flex-col justify-between border border-slate-800">
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase mb-2 text-slate-500">Analytics Specialist</p>
              <h4 className="text-lg font-medium leading-tight">{dict.stats.tracking}</h4>
            </div>
          </div>

          {/* Box 4: Role (EDIF) */}
          <div className="md:col-span-2 bg-slate-100 p-8 rounded-[2rem] flex flex-col justify-between border border-slate-200">
             <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Bologna, IT</span>
             <h3 className="text-2xl font-bold text-black mt-4">Frontend Dev @ EDIF SpA</h3>
          </div>

        </div>
      </section>
    </main>
  );
}