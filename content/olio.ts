/**
 * I video della pagina dell'olio. Ogni posto ha il suo video; finché è null si vede la cornice vuota
 * con "Video in arrivo". Il percorso è quello del file servito (in public/ o da un servizio esterno).
 * sfondo: il video muto in loop dietro il titolo. metodo: uno per passo, nello stesso ordine dei testi.
 * galleria: i video più lunghi, con l'audio, che si avviano a mano.
 */
export type Video = { src: string; poster?: string } | null;

export const videoOlio: { sfondo: Video; metodo: Video[]; galleria: Video[] } = {
  sfondo: null,
  metodo: [null, null, null, null],
  galleria: [null, null, null],
};
