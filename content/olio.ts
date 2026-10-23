/**
 * Video e foto dell'uliveto. Non seguono le tappe del testo: stanno nel luogo del loro contenuto.
 *   alberi:   gli ulivi, la terra, la campagna — appesi fra gli alberi nella prima parte del cammino;
 *   raccolta: reti, pertiche, cassette, persone — accanto alle reti e alle cassette, a metà cammino;
 *   frantoio: la frangitura, la spremitura, l'olio che esce — attorno alla macina, in fondo.
 * Nello stesso luogo i quadri si distribuiscono da soli, alternando i lati. src è il percorso del file servito
 * (in public/ o da un servizio esterno); poster l'immagine che si vede prima che il video parta.
 * Finché un posto è vuoto (src null) si vede la cornice con "Video in arrivo".
 */
export type Luogo = "alberi" | "raccolta" | "frantoio";
export type Media = { tipo: "video" | "foto"; src: string; poster?: string } | null;
export type VoceMedia = { luogo: Luogo; media: Media; didascalia?: { it: string; en: string; es: string } };

export const mediaOlio: VoceMedia[] = [
  { luogo: "alberi", media: null },
  { luogo: "alberi", media: null },
  { luogo: "raccolta", media: null },
  { luogo: "raccolta", media: null },
  { luogo: "raccolta", media: null },
  { luogo: "frantoio", media: null },
  { luogo: "frantoio", media: null },
  { luogo: "frantoio", media: null },
];
