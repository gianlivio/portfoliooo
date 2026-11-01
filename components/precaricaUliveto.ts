/**
 * Mentre si sta nella stanza, a scena pronta e senza fretta, si scaricano in sottofondo le cose dell'uliveto:
 * la vista d'ingresso, quella del passaggio.
 * Così, quando si varca il cancello, arrivano dalla cache e l'attesa si accorcia.
 * Non lo fa con il risparmio dati attivo o su reti lente.
 */
const ASSET = [
  // l'uliveto ora è di carta (SVG nel codice della pagina): resta da scaricare solo la vista del passaggio
  "/olio/ingresso-giorno.jpg",
  "/olio/ingresso-notte.jpg",
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
