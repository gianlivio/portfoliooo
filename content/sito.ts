/** Indirizzo pubblico del sito: NEXT_PUBLIC_SITE_URL se impostato, altrimenti il dominio. */
export const urlSito = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gianlivioiemolo.com";

/** Il nome del sito, per Open Graph e i dati strutturati. */
export const nomeSito = "Gianlivio Iemolo";

/** Le lingue nel formato di Open Graph (lingua_PAESE). */
export const localeOg = { it: "it_IT", en: "en_US", es: "es_ES" } as const;
export const localeDi = (lang: string) => localeOg[lang as keyof typeof localeOg] ?? localeOg.it;
export const altriLocale = (lang: string) => Object.entries(localeOg).filter(([l]) => l !== lang).map(([, v]) => v);
