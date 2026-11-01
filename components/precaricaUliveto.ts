/**
 * Mentre si sta nella stanza, a scena pronta e senza fretta, si scaricano in sottofondo le cose dell'uliveto:
 * la vista d'ingresso (quella del passaggio) e gli asset della scena (cielo, terra, muretti, modelli).
 * Così, quando si varca il cancello, arrivano dalla cache e l'attesa si accorcia.
 * Non lo fa con il risparmio dati attivo o su reti lente.
 */
const ASSET = [
  "/olio/ingresso-giorno.jpg",
  "/olio/ingresso-notte.jpg",
  ...[
    "cielo-tramonto.jpg",
    "cielo-notte.jpg",
    "terra-colore.webp",
    "terra-rilievo.webp",
    "trazzera-colore.webp",
    "trazzera-rilievo.webp",
    "muretto-colore.webp",
    "muretto-rilievo.webp",
    "corteccia-colore.webp",
    "coppi-colore.webp",
    "coppi-rilievo.webp",
    "erba.glb",
    "masso.glb",
    "cassetta.glb",
    "botte.glb",
  ].map((n) => `/olio/scena/${n}`),
];

let fatto = false;

export function precaricaUliveto() {
  if (fatto || typeof window === "undefined") return;
  const rete = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (rete?.saveData || (rete?.effectiveType && /2g|3g/.test(rete.effectiveType))) return;
  fatto = true;
  // uno alla volta, per non rubare banda a quello che la stanza sta ancora facendo
  let i = 0;
  const prossimo = () => {
    if (i >= ASSET.length) return;
    fetch(ASSET[i++]).then((r) => r.blob()).catch(() => undefined).finally(prossimo);
  };
  prossimo();
}
