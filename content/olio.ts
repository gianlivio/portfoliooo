/**
 * Video e foto dell'uliveto. Ogni posto è un quadro fra gli alberi lungo la trazzera; finché è null
 * il quadro mostra "Video in arrivo". src è il percorso del file servito (in public/ o da un servizio esterno);
 * poster è l'immagine che si vede prima che il video parta.
 * storia: i tre quadri della prima parte del cammino. metodo: uno per passo, nello stesso ordine dei testi.
 * galleria: i quadri prima del frantoio.
 */
export type Media = { tipo: "video" | "foto"; src: string; poster?: string } | null;

export const mediaOlio: { storia: Media[]; metodo: Media[]; galleria: Media[] } = {
  storia: [null, null, null],
  metodo: [null, null, null, null],
  galleria: [null, null, null],
};
