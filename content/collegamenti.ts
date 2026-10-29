/**
 * Tutti gli indirizzi del sito stanno qui.
 * Non nei dizionari: tre copie dello stesso URL sono tre occasioni di divergere.
 */

/** Recapiti. Le etichette visibili stanno nei dizionari. */
export const recapiti = {
  email: { valore: "gianlivioiemolo@gmail.com", href: "mailto:gianlivioiemolo@gmail.com" },
  telefono: { valore: "+39 331 946 2396", href: "tel:+393319462396" },
  linkedin: { valore: "gianlivio-iemolo", href: "https://www.linkedin.com/in/gianlivio-iemolo/" },
  github: { valore: "gianlivio", href: "https://github.com/gianlivio/" },
} as const;

/** I PDF in public/cv/. */
export const curriculum = {
  it: "/cv/GianlivioIemolo_CV_IT.pdf",
  en: "/cv/GianlivioIemolo_CV_EN.pdf",
  es: "/cv/GianlivioIemolo_CV_ES.pdf",
} as const;

/** Semeiosis, l'album di Juan Lee (Livio), sulle piattaforme dove LANDR l'ha distribuito; per ultima la pagina LANDR, coi download. */
export const musica = [
  { nome: "Spotify", href: "https://open.spotify.com/album/4dVNDDcyVXrPC5KGf53sIZ" },
  { nome: "Apple Music", href: "https://music.apple.com/album/1567964226" },
  { nome: "YouTube Music", href: "https://music.youtube.com/playlist?list=OLAK5uy_nuLS5Z3ivF7723G5GWE7FjBcjqlgVooQ4" },
  { nome: "Amazon Music", href: "https://music.amazon.com/albums/B0CZ3657ZP" },
  { nome: "Deezer", href: "https://www.deezer.com/album/230726902" },
  { nome: "Tidal", href: "https://tidal.com/album/331640953" },
  { nome: "LANDR", href: "https://artists.landr.com/672985906457" },
] as const;
