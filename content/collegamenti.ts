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
