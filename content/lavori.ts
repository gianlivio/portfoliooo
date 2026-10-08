/**
 * I lavori che compaiono nella scena, in ordine sull'anello.
 * I testi (tipo, titolo, riga) stanno nei dizionari sotto lavori.<id>.
 *
 * motivo: il disegno della copertina quando manca la schermata del sito.
 * tinta: colore di fondo della copertina, dalle sei tinte del vecchio sfondo.
 * Le schermate vere, se presenti, sono in public/lavori/<id>.jpg e sono elencate
 * in content/schermate.json (lo genera scripts/schermate.sh).
 */

export type Motivo = "negozio" | "editoriale" | "dati" | "app" | "sito" | "testo";

export type Lavoro = {
  id: string;
  anno: string;
  motivo: Motivo;
  tinta: string;
  link: { href: string; etichetta: string } | null;
};

export const lavori: Lavoro[] = [
  {
    id: "shop",
    anno: "2024–2026",
    motivo: "negozio",
    tinta: "#C7D2DA",
    link: { href: "https://shop.puntoluce.net/", etichetta: "shop.puntoluce.net" },
  },
  {
    id: "osservatorio",
    anno: "2026",
    motivo: "dati",
    tinta: "#D8D1C0",
    link: { href: "https://osservatorioaccoglienza.org", etichetta: "osservatorioaccoglienza.org" },
  },
  {
    id: "livellozero",
    anno: "2026 →",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://livellozero.games", etichetta: "livellozero.games" },
  },
  {
    id: "ndnluxury",
    anno: "2026",
    motivo: "sito",
    tinta: "#D2CFBE",
    link: { href: "https://www.ndnluxury.com", etichetta: "ndnluxury.com" },
  },
  {
    id: "esh",
    anno: "2026",
    motivo: "sito",
    tinta: "#CBD6C9",
    link: { href: "https://www.eshousing.com", etichetta: "eshousing.com" },
  },
  {
    id: "blog",
    anno: "2024–2026",
    motivo: "editoriale",
    tinta: "#C7D2DA",
    link: { href: "https://www.puntoluce.net/comefare/", etichetta: "puntoluce.net/comefare" },
  },
  {
    id: "allstudios",
    anno: "2026",
    motivo: "app",
    tinta: "#D8D1C0",
    link: null,
  },
  {
    id: "jointoyou",
    anno: "",
    motivo: "editoriale",
    tinta: "#DBCBD0",
    link: { href: "https://jointoyou.it", etichetta: "jointoyou.it" },
  },
  {
    id: "copystudio",
    anno: "2023–2024",
    motivo: "testo",
    tinta: "#CDCBD6",
    link: { href: "https://www.copystudio.it", etichetta: "copystudio.it" },
  },
  {
    id: "hetaweb",
    anno: "2023",
    motivo: "testo",
    tinta: "#D2CFBE",
    link: { href: "https://hetaweb.it", etichetta: "hetaweb.it" },
  },
];

/** Identificativo della carta che apre il modulo di contatto, ultima sull'anello. */
export const ID_CONTATTO = "contatto";
