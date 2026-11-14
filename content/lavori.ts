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

/**
 * L'oggetto su cui il lavoro sta nella scena (components/lavori3d/supporti.ts): ognuno richiama il lavoro.
 */
export type Supporto =
  | "quadro" | "lavagna" | "sedia" | "guanto" | "arnia" | "televisore" | "gommone"
  | "resina" | "valigia" | "specchio" | "cantiere" | "proiettore" | "cornice" | "portatile" | "appunti";

/**
 * Dove sta il lavoro nella scena.
 * piano: 1 vicino e grande, 2 a metà, 3 lontano e piccolo (dove sta il Liotru).
 * passo: la direzione, in passi da 0 a 14 (components/zona.ts): la zona dello sviluppatore è a 12,
 * il cancello dell'uliveto a 5, il Liotru a 1,5. Due lavori sullo stesso piano stanno almeno a 0,7 passi.
 */
export type Posto = { piano: 1 | 2 | 3; passo: number; supporto: Supporto };

export type Lavoro = {
  id: string;
  sezione: Sezione;
  posto: Posto;
  anno: string;
  motivo: Motivo;
  tinta: string;
  link: { href: string; etichetta: string } | null;
};

export const lavori: Lavoro[] = [
  {
    id: "shop",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 13.0, supporto: "quadro" },
    anno: "2024–2026",
    motivo: "negozio",
    tinta: "#C7D2DA",
    link: { href: "https://shop.puntoluce.net/", etichetta: "shop.puntoluce.net" },
  },
  {
    id: "bellelli",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 13.7, supporto: "sedia" },
    anno: "2026 →",
    motivo: "negozio",
    tinta: "#CDCBD6",
    link: { href: "https://www.bellelliufficio.it", etichetta: "bellelliufficio.it" },
  },
  {
    id: "sanires",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 14.4, supporto: "guanto" },
    anno: "2026",
    motivo: "negozio",
    tinta: "#CBD6C9",
    link: { href: "https://www.sanires.com", etichetta: "sanires.com" },
  },
  {
    id: "ghigomiranda",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 9.9, supporto: "arnia" },
    anno: "2026 →",
    motivo: "negozio",
    tinta: "#D8D1C0",
    link: { href: "https://www.ghigomiranda.it", etichetta: "ghigomiranda.it" },
  },
  {
    id: "osservatorio",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 10.9, supporto: "gommone" },
    anno: "2026",
    motivo: "dati",
    tinta: "#D8D1C0",
    link: { href: "https://osservatorioaccoglienza.org", etichetta: "osservatorioaccoglienza.org" },
  },
  {
    id: "livellozero",
    sezione: "sviluppo",
    posto: { piano: 1, passo: 9.2, supporto: "televisore" },
    anno: "2026 →",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://livellozero.games", etichetta: "livellozero.games" },
  },
  {
    id: "futuraauthor",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 3.5, supporto: "cantiere" },
    anno: "2026 →",
    motivo: "cantiere",
    tinta: "#0E0E0E",
    link: null,
  },
  {
    id: "ndnluxury",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 7.8, supporto: "resina" },
    anno: "2026",
    motivo: "sito",
    tinta: "#D2CFBE",
    link: { href: "https://www.ndnluxury.com", etichetta: "ndnluxury.com" },
  },
  {
    id: "esh",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 7.1, supporto: "valigia" },
    anno: "2026",
    motivo: "sito",
    tinta: "#CBD6C9",
    link: { href: "https://www.eshousing.com", etichetta: "eshousing.com" },
  },
  {
    id: "beautybroker",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 6.4, supporto: "specchio" },
    anno: "2026",
    motivo: "app",
    tinta: "#DBCBD0",
    link: { href: "https://www.beautybrokerworld.com", etichetta: "beautybrokerworld.com" },
  },
  {
    id: "allstudios",
    sezione: "sviluppo",
    posto: { piano: 2, passo: 4.25, supporto: "proiettore" },
    anno: "2026",
    motivo: "cantiere",
    tinta: "#0E0E0E",
    link: null,
  },
  {
    id: "jointoyou",
    sezione: "editoria",
    posto: { piano: 3, passo: 1.0, supporto: "cornice" },
    anno: "",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://jointoyou.it", etichetta: "jointoyou.it" },
  },
  {
    id: "blog",
    sezione: "editoria",
    posto: { piano: 1, passo: 8.5, supporto: "lavagna" },
    anno: "2024–2026",
    motivo: "editoriale",
    tinta: "#C7D2DA",
    link: { href: "https://www.puntoluce.net/comefare/", etichetta: "puntoluce.net/comefare" },
  },
  {
    id: "copystudio",
    sezione: "editoria",
    posto: { piano: 3, passo: 2.0, supporto: "portatile" },
    anno: "2023–2024",
    motivo: "testo",
    tinta: "#CDCBD6",
    link: { href: "https://www.copystudio.it", etichetta: "copystudio.it" },
  },
  {
    id: "hetaweb",
    sezione: "editoria",
    posto: { piano: 3, passo: 2.6, supporto: "appunti" },
    anno: "2023",
    motivo: "testo",
    tinta: "#D2CFBE",
    link: { href: "https://hetaweb.it", etichetta: "hetaweb.it" },
  },
];

/** Identificativo della carta che apre il modulo di contatto, ultima sull'anello. */
export const ID_CONTATTO = "contatto";
/** L'ingresso dell'uliveto: il cancello, alle spalle di chi entra. */
export const ID_ULIVETO = "uliveto";
