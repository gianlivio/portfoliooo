/**
 * I lavori che compaiono nella scena, in ordine sull'anello.
 * I testi (tipo, titolo, riga) stanno nei dizionari sotto lavori.<id>.
 *
 * motivo: il disegno della copertina quando manca la schermata del sito.
 * tinta: colore di fondo della copertina, dalle sei tinte del vecchio sfondo.
 * Le schermate vere, se presenti, sono in public/lavori/<id>.jpg e sono elencate
 * in content/schermate.json (lo genera scripts/schermate.sh).
 */

export type Motivo = "negozio" | "editoriale" | "dati" | "app" | "sito" | "testo" | "cantiere";

/** I lavori di sviluppo vengono prima; quelli di editoria, SEO e copywriting dopo, in una sezione a parte. */
export type Sezione = "sviluppo" | "editoria";

/** Gli oggetti che accompagnano alcuni lavori nella scena (components/lavori3d/supporti.ts). */
export type Supporto = "sedia" | "arnia" | "gommone";

/**
 * Dove sta il lavoro nella scena.
 * piano: 1 vicino e grande, 2 a metà, 3 lontano e piccolo (dove sta il Liotru).
 * passo: la direzione, in passi da 0 a 14 (components/zona.ts): la zona dello sviluppatore è a 12 (occupa da 11,4 a 12,6),
 * il cancello dell'uliveto a 5 (da 4,65 a 5,35), e a destra il podere dell'ulivo, da lasciare scoperto, il Liotru a 1,5 (lì davanti, un po' più vicino degli altri lavori
 * di editoria, il blog di Punto Luce).
 * Un pannello occupa 0,3 passi per parte se vicino, 0,2 a metà, 0,15 se lontano: due lavori non devono sovrapporsi,
 * e accanto alla zona va lasciato libero chi suona i sintetizzatori; fra Sanires e l'Osservatorio (da 9,8 a 10,55)
 * c'è Umberto Eco alla lavagna, ai piedi di Bologna (components/ospiti/aula.ts).
 * supporto: l'oggetto che accompagna il lavoro (components/lavori3d/supporti.ts), solo per alcuni.
 */
export type Posto = { piano: 1 | 2 | 3; passo: number; supporto?: Supporto };

export type Lavoro = {
  id: string;
  sezione: Sezione;
  posto: Posto;
  anno: string;
  motivo: Motivo;
  tinta: string;
  link: { href: string; etichetta: string } | null;
  /**
   * Il cliente non ha ancora dato il permesso di pubblicare il nome: online va la versione senza nome
   * (dizionari, lavori.<id>.anonimo), senza link e senza schermata. Col permesso si toglie e basta.
   */
  riservato?: boolean;
};

/** I testi di un lavoro nei dizionari; anonimo sostituisce i campi che dicono chi è il cliente. */
export type TestiLavoro = {
  tipo: string;
  titolo: string;
  riga: string;
  ruolo: string;
  compiti: string[];
  strumenti: string;
  anonimo?: Partial<Omit<TestiLavoro, "anonimo">>;
};

/** I testi da mostrare: per un lavoro riservato, la versione senza nome. */
export function testiDi(tutti: unknown, l: Lavoro): TestiLavoro {
  const t = (tutti as Record<string, TestiLavoro>)[l.id];
  return l.riservato && t.anonimo ? { ...t, ...t.anonimo } : t;
}

const elenco: Lavoro[] = [
  {
    id: "shop",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 13.35 },
    anno: "2024–2026",
    motivo: "negozio",
    tinta: "#C7D2DA",
    link: { href: "https://shop.puntoluce.net/", etichetta: "shop.puntoluce.net" },
  },
  {
    id: "bellelli",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 14.15, supporto: "sedia" },
    anno: "2026 →",
    motivo: "negozio",
    tinta: "#CDCBD6",
    link: { href: "https://www.bellelliufficio.it", etichetta: "bellelliufficio.it" },
  },
  {
    id: "8fly",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 4.33 },
    anno: "2026 →",
    motivo: "negozio",
    tinta: "#C7D2DA",
    link: { href: "https://www.8fly.it", etichetta: "8fly.it" },
  },
  {
    id: "sanires",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 9.5 },
    anno: "2026",
    motivo: "negozio",
    tinta: "#CBD6C9",
    link: { href: "https://www.sanires.com", etichetta: "sanires.com" },
  },
  {
    id: "ghigomiranda",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 8.65, supporto: "arnia" },
    anno: "2026 →",
    motivo: "negozio",
    tinta: "#D8D1C0",
    link: { href: "https://www.ghigomiranda.it", etichetta: "ghigomiranda.it" },
  },
  {
    id: "osservatorio",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 10.85, supporto: "gommone" },
    anno: "2026",
    motivo: "dati",
    tinta: "#D8D1C0",
    link: { href: "https://osservatorioaccoglienza.org", etichetta: "osservatorioaccoglienza.org" },
  },
  {
    id: "livellozero",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 8.0 },
    anno: "2026 →",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://livellozero.games", etichetta: "livellozero.games" },
  },
  {
    id: "futuraauthor",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 2.5 },
    anno: "2026 →",
    motivo: "cantiere",
    tinta: "#0E0E0E",
    link: null,
  },
  {
    id: "ndnluxury",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 7.35 },
    anno: "2026",
    motivo: "sito",
    tinta: "#D2CFBE",
    link: { href: "https://www.ndnluxury.com", etichetta: "ndnluxury.com" },
  },
  {
    id: "esh",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 3.8 },
    anno: "2026",
    motivo: "sito",
    tinta: "#CBD6C9",
    link: { href: "https://www.eshousing.com", etichetta: "eshousing.com" },
  },
  {
    id: "beautybroker",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 6.45 },
    anno: "2026",
    motivo: "app",
    tinta: "#DBCBD0",
    link: { href: "https://www.beautybrokerworld.com", etichetta: "beautybrokerworld.com" },
  },
  {
    id: "allstudios",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 3.15 },
    anno: "2026",
    motivo: "app",
    tinta: "#0E0E0E",
    link: { href: "https://www.allstudia.com", etichetta: "allstudia.com" },
  },
  {
    // lontano, fra Beauty Broker e NDN Luxury, e ultimo dei lavori di sviluppo: da trovare, non da mettere in vetrina
    id: "violenza",
    sezione: "sviluppo",
    posto: { piano: 3, passo: 6.9 },
    anno: "2026",
    motivo: "dati",
    tinta: "#D8D1C0",
    link: { href: "https://violenzacontrogliuomini.org", etichetta: "violenzacontrogliuomini.org" },
  },
  {
    id: "jointoyou",
    sezione: "editoria",
    posto: { piano: 3, passo: 14.6 },
    anno: "",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://jointoyou.it", etichetta: "jointoyou.it" },
  },
  {
    id: "blog",
    sezione: "editoria",
    posto: { piano: 2, passo: 1.5 },
    anno: "2024–2026",
    motivo: "editoriale",
    tinta: "#C7D2DA",
    link: { href: "https://www.puntoluce.net/comefare/", etichetta: "puntoluce.net/comefare" },
  },
  {
    id: "copystudio",
    sezione: "editoria",
    posto: { piano: 3, passo: 15.0 },
    anno: "2023–2024",
    motivo: "testo",
    tinta: "#CDCBD6",
    link: { href: "https://www.copystudio.it", etichetta: "copystudio.it" },
  },
  {
    id: "hetaweb",
    sezione: "editoria",
    posto: { piano: 3, passo: 1.95 },
    anno: "2023",
    motivo: "testo",
    tinta: "#D2CFBE",
    link: { href: "https://hetaweb.it", etichetta: "hetaweb.it" },
  },
];

/** I lavori come vanno online: a quelli riservati si toglie il link (il nome del sito è il nome del cliente). */
export const lavori: Lavoro[] = elenco.map((l) => (l.riservato ? { ...l, link: null } : l));

/** Identificativo della carta che apre il modulo di contatto, ultima sull'anello. */
export const ID_CONTATTO = "contatto";
/** L'ingresso dell'uliveto: il cancello, alle spalle di chi entra. */
export const ID_ULIVETO = "uliveto";
