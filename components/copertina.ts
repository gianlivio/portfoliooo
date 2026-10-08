import type { Motivo } from "@/content/lavori";

/**
 * Disegna la faccia di una carta su un canvas 2D, poi usato come texture.
 * Proporzioni 1024×704, le stesse del piano 2,4×1,65 nella scena.
 * Metà alta: schermata del sito se c'è, altrimenti un motivo disegnato.
 * Metà bassa: numero, tipo, titolo, indirizzo.
 */

export const LARGHEZZA = 1024;
export const ALTEZZA = 704;

/** La finestra della carta: dove sta la schermata del sito (in pixel della tela). */
const MARGINE = 22;
const ALTA = Math.round(ALTEZZA * 0.64);
export const FINESTRA = { x: MARGINE, y: MARGINE, w: LARGHEZZA - 2 * MARGINE, h: ALTA - MARGINE };

const CARTA = "#FBFAF7";
const INCHIOSTRO = "#16171A";
const GRIGIO = "#77786F";
const BLU = "#1B3FD1";

export type Famiglie = { serif: string; sans: string; mono: string };

export type DatiCopertina = {
  numero: string;
  tipo: string;
  titolo: string;
  dominio: string;
  anno: string;
  tinta: string;
  motivo: Motivo;
  immagine: HTMLImageElement | null;
  contatto: boolean;
  /** la finestra resta trasparente: dietro c'è il piano con la schermata che scorre */
  finestraVuota: boolean;
};

/** Generatore pseudo-casuale con seme: la stessa carta esce sempre uguale. */
function casuale(seme: number) {
  let s = seme | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rettangoloArrotondato(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Taglia il testo con i puntini se non entra nella larghezza data. */
function adatta(ctx: CanvasRenderingContext2D, testo: string, max: number) {
  if (ctx.measureText(testo).width <= max) return testo;
  let t = testo;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function motivo(
  ctx: CanvasRenderingContext2D,
  tipo: Motivo, x: number, y: number, w: number, h: number, seme: number
) {
  const r = casuale(seme);
  ctx.save();
  ctx.translate(x, y);

  // barra del browser, comune a tutti i motivi
  ctx.fillStyle = "rgba(22,23,26,0.08)";
  ctx.fillRect(0, 0, w, 34);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "rgba(22,23,26,0.22)";
    ctx.beginPath();
    ctx.arc(22 + i * 18, 17, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const top = 58;

  if (tipo === "negozio") {
    const col = 6, righe = 3, g = 14;
    const cw = (w - 48 - g * (col - 1)) / col;
    const ch = (h - top - 24 - g * (righe - 1)) / righe;
    for (let i = 0; i < col * righe; i++) {
      const cx = 24 + (i % col) * (cw + g);
      const cy = top + Math.floor(i / col) * (ch + g);
      ctx.fillStyle = "rgba(251,250,247,0.85)";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = r() < 0.18 ? BLU : "rgba(22,23,26,0.16)";
      ctx.fillRect(cx + 10, cy + ch * 0.62, cw - 20, 8);
      ctx.fillStyle = "rgba(22,23,26,0.1)";
      ctx.fillRect(cx + 10, cy + 10, cw - 20, ch * 0.5);
    }
  } else if (tipo === "dati") {
    for (let i = 0; i < 520; i++) {
      const px = 24 + r() * (w - 48);
      const base = 1 - (px - 24) / (w - 48);
      const py = top + 8 + Math.pow(r(), 0.7 + base) * (h - top - 32);
      ctx.fillStyle = r() < 0.56 ? BLU : "rgba(22,23,26,0.35)";
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo === "editoriale") {
    ctx.fillStyle = "rgba(22,23,26,0.14)";
    ctx.fillRect(24, top, w * 0.42, h - top - 24);
    ctx.fillStyle = INCHIOSTRO;
    ctx.fillRect(w * 0.42 + 48, top + 6, w * 0.38, 14);
    ctx.fillRect(w * 0.42 + 48, top + 30, w * 0.28, 14);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = "rgba(22,23,26,0.18)";
      ctx.fillRect(w * 0.42 + 48, top + 66 + i * 20, (w * 0.5 - 72) * (0.6 + r() * 0.4), 7);
    }
  } else if (tipo === "app") {
    ctx.fillStyle = "rgba(22,23,26,0.12)";
    ctx.fillRect(24, top, 120, h - top - 24);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 1 ? BLU : "rgba(22,23,26,0.2)";
      ctx.fillRect(40, top + 18 + i * 26, 86, 8);
    }
    const g = 14, cw = (w - 168 - 24 - g) / 2;
    for (let i = 0; i < 4; i++) {
      const cx = 168 + (i % 2) * (cw + g);
      const cy = top + Math.floor(i / 2) * ((h - top - 24 - g) / 2 + g);
      ctx.fillStyle = "rgba(251,250,247,0.8)";
      ctx.fillRect(cx, cy, cw, (h - top - 24 - g) / 2);
      ctx.fillStyle = i === 2 ? BLU : "rgba(22,23,26,0.14)";
      ctx.fillRect(cx + 14, cy + 14, cw * (0.3 + r() * 0.4), 9);
    }
  } else if (tipo === "sito") {
    ctx.fillStyle = "rgba(22,23,26,0.82)";
    ctx.fillRect(24, top, w - 48, (h - top) * 0.55);
    ctx.fillStyle = CARTA;
    ctx.fillRect(56, top + 34, w * 0.36, 16);
    ctx.fillRect(56, top + 60, w * 0.22, 16);
    ctx.fillStyle = BLU;
    ctx.fillRect(56, top + 100, 110, 26);
    const yb = top + (h - top) * 0.55 + 16;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(22,23,26,0.14)";
      ctx.fillRect(24 + i * ((w - 48) / 3 + 0), yb, (w - 48) / 3 - 12, h - yb - 24);
    }
  } else {
    // testo: colonne di righe, come una pagina di copy
    for (let c = 0; c < 2; c++) {
      const cx = 24 + c * ((w - 48) / 2 + 12);
      ctx.fillStyle = INCHIOSTRO;
      ctx.fillRect(cx, top, (w - 72) / 2 * 0.7, 12);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = "rgba(22,23,26,0.2)";
        ctx.fillRect(cx, top + 28 + i * 17, ((w - 72) / 2) * (0.75 + r() * 0.25), 6);
      }
    }
  }
  ctx.restore();
}

export function disegnaCopertina(
  tela: HTMLCanvasElement,
  dati: DatiCopertina,
  famiglie: Famiglie,
  seme: number,
  fondoCarta: string = CARTA
) {
  tela.width = LARGHEZZA;
  tela.height = ALTEZZA;
  const ctx = tela.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, LARGHEZZA, ALTEZZA);

  const fondo = dati.contatto ? BLU : fondoCarta;
  const testo = dati.contatto ? CARTA : INCHIOSTRO;
  const tenue = dati.contatto ? "rgba(251,250,247,0.72)" : GRIGIO;

  rettangoloArrotondato(ctx, 0, 0, LARGHEZZA, ALTEZZA, 26);
  ctx.fillStyle = fondo;
  ctx.fill();
  ctx.save();
  ctx.clip();

  const m = MARGINE;
  const altaH = ALTA;

  if (dati.contatto) {
    // carta del contatto: niente finestra, una freccia grande
    ctx.strokeStyle = "rgba(251,250,247,0.9)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(m + 20, altaH * 0.55);
    ctx.lineTo(LARGHEZZA - m - 40, altaH * 0.55);
    ctx.moveTo(LARGHEZZA - m - 110, altaH * 0.55 - 70);
    ctx.lineTo(LARGHEZZA - m - 40, altaH * 0.55);
    ctx.lineTo(LARGHEZZA - m - 110, altaH * 0.55 + 70);
    ctx.stroke();
  } else {
    rettangoloArrotondato(ctx, m, m, LARGHEZZA - 2 * m, altaH - m, 14);
    if (dati.finestraVuota) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
      ctx.restore();
      // filo sottile intorno alla finestra
      ctx.strokeStyle = "rgba(22,23,26,0.12)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
    ctx.fillStyle = dati.tinta;
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (dati.immagine && dati.immagine.naturalWidth > 0) {
      const iw = dati.immagine.naturalWidth, ih = dati.immagine.naturalHeight;
      const w = LARGHEZZA - 2 * m, h = altaH - m;
      const s = Math.max(w / iw, h / ih);
      ctx.drawImage(dati.immagine, m, m, iw * s, ih * s);
    } else {
      motivo(ctx, dati.motivo, m, m, LARGHEZZA - 2 * m, altaH - m, seme);
    }
    ctx.restore();
    }
  }

  // apparato in basso
  const y0 = altaH + 42;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = tenue;
  ctx.font = `500 21px ${famiglie.mono}`;
  ctx.fillText(dati.numero, m + 4, y0 + 4);
  const tipo = dati.tipo.toUpperCase();
  ctx.font = `400 21px ${famiglie.mono}`;
  ctx.fillText(adatta(ctx, tipo, LARGHEZZA - 2 * m - 200), m + 64, y0 + 4);
  if (dati.anno) {
    ctx.textAlign = "right";
    ctx.fillText(dati.anno, LARGHEZZA - m - 4, y0 + 4);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = testo;
  let corpo = 64;
  ctx.font = `300 ${corpo}px ${famiglie.serif}`;
  while (ctx.measureText(dati.titolo).width > LARGHEZZA - 2 * m - 8 && corpo > 44) {
    corpo -= 2;
    ctx.font = `300 ${corpo}px ${famiglie.serif}`;
  }
  ctx.fillText(adatta(ctx, dati.titolo, LARGHEZZA - 2 * m - 8), m, y0 + 86);

  ctx.font = `400 22px ${famiglie.mono}`;
  ctx.fillStyle = dati.contatto ? CARTA : GRIGIO;
  ctx.fillText(dati.dominio, m + 4, ALTEZZA - m - 6);

  ctx.restore();
}
