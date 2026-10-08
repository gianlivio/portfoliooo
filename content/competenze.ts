/**
 * La costellazione delle competenze: ogni voce è una stella nel cielo della stanza.
 * Quando una carta è attiva, dalla carta salgono fili verso le competenze di quel lavoro.
 * Fonti: CV, cronoregistro Punto Luce, descrizioni dei lavori. Da rivedere con Livio.
 * I nomi sono gli stessi in tutte le lingue (sono nomi di strumenti e di mestieri),
 * tranne pochi, tradotti in "nome" per lingua.
 */

export type Competenza = { id: string; nome: string | { it: string; en: string; es: string } };

export const competenze: Competenza[] = [
  // linguaggi e front-end
  { id: "js", nome: "JavaScript" },
  { id: "ts", nome: "TypeScript" },
  { id: "php", nome: "PHP" },
  { id: "python", nome: "Python" },
  { id: "sql", nome: "SQL" },
  { id: "html", nome: "HTML5" },
  { id: "css", nome: "CSS3" },
  { id: "sass", nome: "SASS" },
  { id: "tailwind", nome: "Tailwind" },
  { id: "bootstrap", nome: "Bootstrap" },
  { id: "react", nome: "React" },
  { id: "next", nome: "Next.js" },
  { id: "vue", nome: "Vue.js" },
  { id: "jquery", nome: "jQuery" },
  { id: "mobile", nome: { it: "Mobile-first", en: "Mobile-first", es: "Mobile-first" } },
  { id: "animazioni", nome: { it: "Animazioni 3D", en: "3D animation", es: "Animación 3D" } },
  // back-end e dati
  { id: "node", nome: "Node.js" },
  { id: "laravel", nome: "Laravel" },
  { id: "mysql", nome: "MySQL" },
  { id: "supabase", nome: "Supabase" },
  { id: "prisma", nome: "Prisma" },
  { id: "pdfplumber", nome: "pdfplumber" },
  { id: "dati", nome: { it: "Dati pubblici", en: "Public data", es: "Datos públicos" } },
  { id: "pulizia", nome: { it: "Pulizia dei dati", en: "Data cleaning", es: "Limpieza de datos" } },
  { id: "cms", nome: { it: "CMS su misura", en: "Custom CMS", es: "CMS a medida" } },
  { id: "app", nome: { it: "Applicazioni interne", en: "Internal tools", es: "Aplicaciones internas" } },
  // integrazioni
  { id: "rest", nome: "REST API" },
  { id: "webhook", nome: "Webhook" },
  { id: "oauth", nome: "OAuth 2.0" },
  { id: "cron", nome: "Cron job" },
  { id: "feed", nome: { it: "Feed prodotti", en: "Product feeds", es: "Feeds de productos" } },
  { id: "brevo", nome: "Brevo" },
  { id: "feedaty", nome: "Feedaty" },
  { id: "doofinder", nome: "Doofinder" },
  { id: "openai", nome: "OpenAI API" },
  { id: "claude", nome: "Claude API" },
  { id: "prompt", nome: "Prompt engineering" },
  // piattaforme e strumenti
  { id: "open2b", nome: "Open2B / Scriggo" },
  { id: "wordpress", nome: "WordPress" },
  { id: "shopify", nome: "Shopify" },
  { id: "vercel", nome: "Vercel" },
  { id: "actions", nome: "GitHub Actions" },
  { id: "git", nome: "Git" },
  { id: "cloudflare", nome: "Cloudflare" },
  { id: "figma", nome: "Figma" },
  // tracciamento e conformità
  { id: "gtm", nome: "Google Tag Manager" },
  { id: "ga4", nome: "GA4" },
  { id: "meta", nome: "Meta Pixel" },
  { id: "ads", nome: "Google Ads" },
  { id: "uet", nome: "Microsoft UET" },
  { id: "clarity", nome: "Clarity" },
  { id: "consent", nome: "Consent Mode v2" },
  { id: "cookiebot", nome: "Cookiebot" },
  { id: "gdpr", nome: { it: "GDPR", en: "GDPR", es: "RGPD" } },
  { id: "a11y", nome: { it: "Accessibilità", en: "Accessibility", es: "Accesibilidad" } },
  { id: "lighthouse", nome: { it: "Prestazioni · Lighthouse", en: "Performance · Lighthouse", es: "Rendimiento · Lighthouse" } },
  // visibilità e contenuti
  { id: "seo", nome: "SEO" },
  { id: "geo", nome: "GEO" },
  { id: "schema", nome: "Schema.org" },
  { id: "gsc", nome: "Search Console" },
  { id: "copy", nome: "Copywriting" },
  { id: "brand", nome: { it: "Identità di marca", en: "Brand identity", es: "Identidad de marca" } },
  { id: "editoriale", nome: { it: "Gestione editoriale", en: "Editorial management", es: "Gestión editorial" } },
  { id: "ia", nome: { it: "Architettura dei contenuti", en: "Content architecture", es: "Arquitectura de contenidos" } },
  { id: "qa", nome: { it: "Test e QA", en: "Testing · QA", es: "Pruebas · QA" } },
  { id: "manutenzione", nome: { it: "Manutenzione", en: "Maintenance", es: "Mantenimiento" } },
];

/** Per ogni lavoro (id di content/lavori.ts), le competenze usate. */
export const competenzeDi: Record<string, string[]> = {
  shop: [
    "open2b", "php", "js", "html", "css", "mobile", "rest", "webhook", "cron", "oauth", "feed",
    "app", "brevo", "feedaty", "doofinder", "openai", "gtm", "ga4", "meta", "ads", "uet", "clarity",
    "consent", "cookiebot", "gdpr", "a11y", "lighthouse", "seo", "schema", "cloudflare", "manutenzione",
  ],
  osservatorio: ["python", "pdfplumber", "dati", "pulizia", "next", "react", "ts", "actions", "vercel", "git", "seo", "schema", "a11y"],
  livellozero: ["next", "react", "ts", "cms", "vercel", "git", "seo", "manutenzione", "css"],
  ndnluxury: ["html", "css", "js", "animazioni", "manutenzione"],
  esh: ["html", "css", "js", "manutenzione"],
  blog: ["wordpress", "php", "js", "css", "seo", "copy"],
  allstudios: ["ia", "copy", "qa", "html", "css"],
  jointoyou: ["wordpress", "copy", "seo", "pulizia"],
  copystudio: ["copy", "brand", "ia"],
  futuraauthor: ["next", "react", "ts", "supabase", "claude", "openai", "prompt", "seo", "geo", "gsc", "editoriale", "copy"],
  beautybroker: ["qa", "rest", "git", "js"],
  hetaweb: ["seo", "copy", "editoriale", "gsc"],
};

export function nomeCompetenza(c: Competenza, lingua: string) {
  return typeof c.nome === "string" ? c.nome : c.nome[(lingua as "it" | "en" | "es")] ?? c.nome.it;
}
