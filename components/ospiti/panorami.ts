import * as THREE from "three";
import { generatore, tela } from "./comuni";

/**
 * I panorami del finestrone davanti alla scrivania: lo sviluppatore lavora da posti diversi,
 * nelle diverse stagioni. Dipinti a strati sulla tela, dal cielo al primo piano, con la foschia
 * che schiarisce le creste lontane. Ognuno ha la sua versione notturna (luna, stelle, finestre accese).
 * Appennino tosco-emiliano d'autunno, montagna d'inverno sotto la neve, Bologna in primavera,
 * campagna siciliana d'estate, il mare, Bali, l'alta montagna d'estate.
 */

export const W = 768;
export const H = 360;

type C = CanvasRenderingContext2D;
type R = () => number;

/* ------------------------------------------------------------------ attrezzi */

function cielo(x: C, alto: string, basso: string, fino = H) {
  const g = x.createLinearGradient(0, 0, 0, fino);
  g.addColorStop(0, alto);
  g.addColorStop(1, basso);
  x.fillStyle = g;
  x.fillRect(0, 0, W, fino);
}

/** Una cresta: profilo frastagliato dato da somme di onde con fasi a caso; riempita fino in fondo. */
function cresta(x: C, r: R, base: number, ampiezza: number, colore: string, { aguzza = 0, lunghezza = 1, sfuma = "" } = {}) {
  const f = [r() * 6, r() * 6, r() * 6, r() * 6];
  const y = (px: number) => {
    const u = (px / W) * lunghezza;
    let v = Math.sin(u * 3.1 + f[0]) * 0.5 + Math.sin(u * 7.3 + f[1]) * 0.25 + Math.sin(u * 17 + f[2]) * 0.12 + Math.sin(u * 41 + f[3]) * 0.05;
    if (aguzza) v = v * (1 - aguzza) + aguzza * (1 - Math.abs(Math.sin(u * 4.2 + f[1]))) * 1.2;
    return base - v * ampiezza;
  };
  x.beginPath();
  x.moveTo(0, H);
  for (let px = 0; px <= W; px += 3) x.lineTo(px, y(px));
  x.lineTo(W, H);
  x.closePath();
  if (sfuma) {
    const g = x.createLinearGradient(0, base - ampiezza, 0, base + ampiezza * 1.5);
    g.addColorStop(0, colore);
    g.addColorStop(1, sfuma);
    x.fillStyle = g;
  } else x.fillStyle = colore;
  x.fill();
  return y;
}

/** Catena di picchi: ogni cima è un triangolo storto, la neve copre le punte fino a una quota. */
function picchi(x: C, r: R, base: number, n: number, alti: [number, number], roccia: string, ombra: string, neve: string, quotaNeve: number) {
  const cime = Array.from({ length: n }, () => ({ cx: r() * (W + 200) - 100, h: alti[0] + r() * (alti[1] - alti[0]), sx: 0.8 + r() * 0.9, dx: 0.8 + r() * 0.9 }));
  cime.sort((a, b) => a.h - b.h);
  for (const c of cime) {
    const top = base - c.h;
    const sx = c.h * c.sx, dx = c.h * c.dx;
    const profilo = (y0: number) => {
      x.beginPath();
      x.moveTo(c.cx - sx, base + 2);
      // fianco sinistro a gradini
      for (let k = 1; k <= 4; k++) x.lineTo(c.cx - sx * (1 - k / 4) + (r() - 0.5) * 8, Math.max(y0, base - (c.h * k) / 4 + (r() - 0.5) * 6));
      x.lineTo(c.cx, Math.max(y0, top));
      for (let k = 3; k >= 0; k--) x.lineTo(c.cx + dx * (1 - k / 4) + (r() - 0.5) * 8, Math.max(y0, base - (c.h * k) / 4 + (r() - 0.5) * 6));
      x.closePath();
    };
    x.fillStyle = roccia;
    profilo(-999);
    x.fill();
    // il versante in ombra
    x.fillStyle = ombra;
    x.beginPath();
    x.moveTo(c.cx, top);
    x.lineTo(c.cx + dx, base + 2);
    x.lineTo(c.cx + dx * 0.25, base + 2);
    x.closePath();
    x.fill();
    // la neve sopra la quota
    x.save();
    x.beginPath();
    x.rect(0, 0, W, Math.max(top + 4, base - c.h * quotaNeve));
    x.clip();
    x.fillStyle = neve;
    x.beginPath();
    x.moveTo(c.cx - sx, base);
    x.lineTo(c.cx, top);
    x.lineTo(c.cx + dx, base);
    x.closePath();
    x.fill();
    x.restore();
  }
}

function disco(x: C, cx: number, cy: number, raggio: number, colore: string, alone: string) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, raggio * 6);
  g.addColorStop(0, alone);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(cx - raggio * 6, cy - raggio * 6, raggio * 12, raggio * 12);
  x.fillStyle = colore;
  x.beginPath();
  x.arc(cx, cy, raggio, 0, Math.PI * 2);
  x.fill();
}

function stelle(x: C, r: R, n: number, fino = H * 0.6) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    const s = r() < 0.08 ? 1.6 : 1;
    x.fillRect(r() * W, r() * fino, s, s);
  }
}

function nuvola(x: C, r: R, cx: number, cy: number, l: number, colore: string) {
  x.fillStyle = colore;
  for (let i = 0; i < 9; i++) {
    const px = cx + (r() - 0.5) * l, py = cy + (r() - 0.5) * l * 0.12;
    x.beginPath();
    x.ellipse(px, py, l * (0.12 + r() * 0.15), l * (0.05 + r() * 0.05), 0, 0, Math.PI * 2);
    x.fill();
  }
}

/** Banda di foschia orizzontale. */
function foschia(x: C, y: number, h: number, colore: string) {
  const g = x.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, colore);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, y - h, W, h * 2);
}

/** Chioma tonda (ulivo, carrubo, castagno): grappolo di cerchi, più scuro in basso. */
function chioma(x: C, r: R, cx: number, cy: number, s: number, chiaro: string, scuro: string, tronco = "#3A2C20") {
  x.fillStyle = tronco;
  x.fillRect(cx - s * 0.08, cy, s * 0.16, s * 0.7);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = i < 4 ? scuro : chiaro;
    x.beginPath();
    x.arc(cx + (r() - 0.5) * s * 1.1, cy - r() * s * 0.6 + (i < 4 ? s * 0.15 : -s * 0.05), s * (0.35 + r() * 0.25), 0, Math.PI * 2);
    x.fill();
  }
}

function pino(x: C, cx: number, base: number, h: number, colore: string, neve = "") {
  x.fillStyle = colore;
  for (let k = 0; k < 3; k++) {
    const y0 = base - h * (0.2 + k * 0.27), l = h * (0.34 - k * 0.08);
    x.beginPath();
    x.moveTo(cx - l, y0 + h * 0.22);
    x.lineTo(cx, y0 - h * 0.25);
    x.lineTo(cx + l, y0 + h * 0.22);
    x.closePath();
    x.fill();
    if (neve) {
      x.fillStyle = neve;
      x.beginPath();
      x.moveTo(cx - l * 0.55, y0 + h * 0.02);
      x.lineTo(cx, y0 - h * 0.25);
      x.lineTo(cx + l * 0.55, y0 + h * 0.02);
      x.closePath();
      x.fill();
      x.fillStyle = colore;
    }
  }
  x.fillRect(cx - h * 0.03, base - h * 0.08, h * 0.06, h * 0.08);
}

function palma(x: C, r: R, cx: number, base: number, h: number, colore: string) {
  x.strokeStyle = colore;
  x.lineWidth = Math.max(2, h * 0.04);
  const curva = (r() - 0.5) * h * 0.4;
  const tx = cx + curva, ty = base - h;
  x.beginPath();
  x.moveTo(cx, base);
  x.quadraticCurveTo(cx + curva * 0.2, base - h * 0.6, tx, ty);
  x.stroke();
  x.fillStyle = colore;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3;
    const l = h * (0.35 + r() * 0.15);
    x.beginPath();
    x.moveTo(tx, ty);
    x.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty - Math.abs(Math.sin(a)) * l * 0.25 - l * 0.1, tx + Math.cos(a) * l, ty + l * 0.35);
    x.quadraticCurveTo(tx + Math.cos(a) * l * 0.5, ty - l * 0.02, tx, ty);
    x.fill();
  }
}

function finestra(x: C, r: R, px: number, py: number, s: number, notte: boolean) {
  x.fillStyle = notte ? (r() < 0.6 ? "#FFD38A" : "#2A2620") : "#3A3530";
  x.fillRect(px, py, s, s * 1.3);
}

/* ------------------------------------------------------------------ i posti */

function appennino(x: C, notte: boolean) {
  const r = generatore(3);
  cielo(x, notte ? "#0B1226" : "#8FB2D6", notte ? "#2A3150" : "#E9D9C4");
  if (notte) {
    stelle(x, r, 160);
    disco(x, 600, 70, 14, "#F2EEDF", "rgba(220,225,255,0.25)");
  } else nuvola(x, r, 520, 70, 220, "rgba(255,255,255,0.7)");
  cresta(x, r, 170, 30, notte ? "#232A40" : "#9AA9BE");
  foschia(x, 190, 22, notte ? "rgba(60,70,100,0.4)" : "rgba(240,235,225,0.7)");
  cresta(x, r, 210, 34, notte ? "#1B2030" : "#7E8B76");
  foschia(x, 232, 18, notte ? "rgba(60,70,100,0.35)" : "rgba(235,228,215,0.6)");
  // il borgo sul colle: case di pietra, il campanile
  const y = cresta(x, r, 260, 40, notte ? "#15181F" : "#8A6A3A", { sfuma: notte ? "#0E1015" : "#6B4E2A" });
  const bx = 230, by = y(bx) + 6;
  x.fillStyle = notte ? "#1E1E22" : "#B9A58A";
  for (let i = 0; i < 7; i++) x.fillRect(bx - 50 + i * 15, by - 10 - (i % 3) * 5, 14, 16 + (i % 3) * 5);
  x.fillRect(bx + 4, by - 42, 9, 40);
  x.fillStyle = notte ? "#1E1E22" : "#9A2F22";
  x.beginPath();
  x.moveTo(bx + 2, by - 42);
  x.lineTo(bx + 8.5, by - 52);
  x.lineTo(bx + 15, by - 42);
  x.fill();
  for (let i = 0; i < 9; i++) finestra(x, r, bx - 46 + i * 11, by - 4 - (i % 3) * 4, 3, notte);
  // il bosco di castagni d'autunno, in primo piano
  for (let i = 0; i < 60; i++) {
    const px = r() * W, py = 300 + r() * 70;
    const c = ["#B5541E", "#C9822A", "#8E3A1A", "#D9A441", "#6F4A22"][Math.floor(r() * 5)];
    chioma(x, r, px, py, 14 + r() * 10, notte ? "#1A1714" : c, notte ? "#121010" : "#5A3418");
  }
}

function neve(x: C, notte: boolean) {
  const r = generatore(5);
  cielo(x, notte ? "#0A1020" : "#AFC2D6", notte ? "#273450" : "#E8EEF4");
  if (notte) {
    stelle(x, r, 120);
    disco(x, 150, 60, 12, "#F6F4EA", "rgba(220,230,255,0.3)");
  }
  picchi(x, r, 210, 9, [70, 150], notte ? "#8A96B2" : "#DDE5EE", notte ? "#5A6682" : "#B4C2D2", notte ? "#C4CEE2" : "#FFFFFF", 0.0);
  for (let i = 0; i < 40; i++) pino(x, r() * W, 245 + r() * 20, 30 + r() * 20, notte ? "#121A22" : "#2F4A3C", notte ? "#9AA8C0" : "#F5F8FA");
  cresta(x, r, 300, 14, notte ? "#C8D2E6" : "#FBFCFD", { sfuma: notte ? "#8A96B2" : "#E2E9F0" });
  // la baita con la finestra accesa e il fumo dal camino
  const bx = 520, by = 300;
  x.fillStyle = notte ? "#2A2018" : "#5A3E2A";
  x.fillRect(bx, by - 30, 70, 32);
  x.fillStyle = notte ? "#DCE4F2" : "#FFFFFF";
  x.beginPath();
  x.moveTo(bx - 8, by - 28);
  x.lineTo(bx + 35, by - 58);
  x.lineTo(bx + 78, by - 28);
  x.fill();
  x.fillStyle = notte ? "#FFC870" : "#2A2420";
  x.fillRect(bx + 12, by - 20, 12, 12);
  x.fillRect(bx + 46, by - 20, 12, 12);
  for (let i = 0; i < 4; i++) {
    x.fillStyle = `rgba(230,230,235,${0.3 - i * 0.06})`;
    x.beginPath();
    x.arc(bx + 58 + i * 8, by - 62 - i * 12, 6 + i * 3, 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < 18; i++) pino(x, r() * W, 340 + r() * 30, 50 + r() * 30, notte ? "#0E151C" : "#243C30", notte ? "#8A98B0" : "#EEF3F6");
  // fiocchi
  for (let i = 0; i < 260; i++) {
    x.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
    x.beginPath();
    x.arc(r() * W, r() * H, 0.8 + r() * 1.6, 0, Math.PI * 2);
    x.fill();
  }
}

function bologna(x: C, notte: boolean) {
  const r = generatore(7);
  cielo(x, notte ? "#101530" : "#9FC3E2", notte ? "#3C2E44" : "#F3D9B8");
  if (notte) stelle(x, r, 60, H * 0.35);
  else nuvola(x, r, 200, 60, 200, "rgba(255,255,255,0.75)");
  // i colli con San Luca, lontani
  cresta(x, r, 200, 22, notte ? "#2A2638" : "#9DB08C");
  // tetti e case: rossi e arancio, a file sempre più vicine
  const tinte = notte ? ["#2A1E1E", "#24191A", "#2E2222"] : ["#B5552F", "#C96B3B", "#A9472A", "#D98A55", "#C2603A"];
  for (let fila = 0; fila < 4; fila++) {
    const base = 230 + fila * 28;
    for (let px = -20; px < W; ) {
      const l = 30 + r() * 40, h = 20 + r() * 25 + fila * 6;
      x.fillStyle = notte ? "#201818" : ["#E2B48A", "#D9A070", "#EAC39A", "#CF8F62"][Math.floor(r() * 4)];
      x.fillRect(px, base - h, l, h + 60);
      x.fillStyle = tinte[Math.floor(r() * tinte.length)];
      x.beginPath();
      x.moveTo(px - 3, base - h);
      x.lineTo(px + l / 2, base - h - 10);
      x.lineTo(px + l + 3, base - h);
      x.fill();
      for (let k = 0; k < Math.floor(l / 12); k++) finestra(x, r, px + 5 + k * 12, base - h + 8, 5, notte);
      px += l + 2;
    }
    // le due torri e la cupola di San Pietro, nella seconda fila
    if (fila === 0) {
      x.fillStyle = notte ? "#2C2222" : "#B7724A";
      x.fillRect(380, 40, 22, 200); // Asinelli
      x.fillRect(377, 40, 28, 8);
      x.save();
      x.translate(420, 240);
      x.rotate(0.06);
      x.fillRect(0, -120, 22, 120); // Garisenda, pendente
      x.restore();
      x.fillStyle = notte ? "#2A2424" : "#C98B5E";
      x.beginPath();
      x.arc(560, 205, 26, Math.PI, 0);
      x.fill();
      x.fillRect(534, 205, 52, 30);
      if (notte) {
        x.fillStyle = "#FF5040";
        x.fillRect(389, 36, 3, 3);
      }
    }
  }
  // il portico in primo piano: archi e colonne
  x.fillStyle = notte ? "#1A1414" : "#D69A6A";
  x.fillRect(0, 300, W, 60);
  x.fillStyle = notte ? "#0D0A0A" : "#6A3C24";
  for (let k = 0; k < 10; k++) {
    const ax = 10 + k * 78;
    x.beginPath();
    x.moveTo(ax, H);
    x.lineTo(ax, 330);
    x.arc(ax + 30, 330, 30, Math.PI, 0);
    x.lineTo(ax + 60, H);
    x.fill();
  }
  if (notte) {
    for (let k = 0; k < 10; k++) disco(x, 40 + k * 78, 318, 2, "#FFE2A0", "rgba(255,200,120,0.18)");
  }
}

function sicilia(x: C, notte: boolean) {
  const r = generatore(11);
  cielo(x, notte ? "#0C1428" : "#3F86D2", notte ? "#2E2E46" : "#CFE3F2");
  if (notte) {
    stelle(x, r, 200);
    disco(x, 640, 60, 13, "#FFF6DE", "rgba(255,240,210,0.25)");
  }
  // l'altopiano ibleo, lontano, e l'Etna appena visibile
  x.fillStyle = notte ? "#262A40" : "#B6C2CC";
  x.beginPath();
  x.moveTo(60, 185);
  x.lineTo(170, 120);
  x.lineTo(190, 118);
  x.lineTo(300, 185);
  x.fill();
  cresta(x, r, 200, 18, notte ? "#20222E" : "#A7A58A");
  // i campi d'estate, gialli di stoppie, divisi dai muretti a secco
  const y = cresta(x, r, 235, 16, notte ? "#1E1C1A" : "#D9B964", { sfuma: notte ? "#16140F" : "#C9A24E" });
  x.strokeStyle = notte ? "#2E2A26" : "#E8DCC0";
  x.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const px = r() * W;
    x.beginPath();
    x.moveTo(px, y(px) + 4);
    x.quadraticCurveTo(px + (r() - 0.5) * 200, 300, px + (r() - 0.5) * 300, H);
    x.stroke();
  }
  for (let k = 0; k < 4; k++) {
    const py = 250 + k * 30;
    x.beginPath();
    x.moveTo(0, py);
    x.quadraticCurveTo(W / 2, py + (r() - 0.5) * 30, W, py + (r() - 0.5) * 20);
    x.stroke();
  }
  // la masseria bianca
  x.fillStyle = notte ? "#3A3630" : "#EFE6D2";
  x.fillRect(470, 222, 70, 26);
  x.fillRect(520, 210, 26, 38);
  x.fillStyle = notte ? "#2A221C" : "#B0603A";
  x.fillRect(468, 219, 74, 4);
  finestra(x, r, 485, 230, 6, notte);
  finestra(x, r, 527, 220, 6, notte);
  // carrubi e ulivi, fichi d'india
  for (let i = 0; i < 26; i++) chioma(x, r, r() * W, 240 + r() * 110, 12 + r() * 16, notte ? "#16191A" : "#5E7A3A", notte ? "#0E1010" : "#34502A");
  for (let i = 0; i < 5; i++) {
    const px = r() * W, py = 320 + r() * 30;
    x.fillStyle = notte ? "#141A14" : "#6E8F4A";
    for (let k = 0; k < 7; k++) {
      x.beginPath();
      x.ellipse(px + (r() - 0.5) * 40, py - r() * 40, 9, 13, (r() - 0.5) * 1.4, 0, Math.PI * 2);
      x.fill();
    }
  }
}

function mare(x: C, notte: boolean) {
  const r = generatore(13);
  cielo(x, notte ? "#081024" : "#5C9BD6", notte ? "#1C2A4A" : "#F7E0BE", 200);
  if (notte) {
    stelle(x, r, 180, 180);
    disco(x, 380, 70, 14, "#FFF8E8", "rgba(255,245,220,0.3)");
  } else disco(x, 380, 150, 16, "#FFF4D6", "rgba(255,230,180,0.45)");
  // il mare, con la scia di luce del sole o della luna
  const g = x.createLinearGradient(0, 200, 0, H);
  g.addColorStop(0, notte ? "#13223E" : "#2E78B4");
  g.addColorStop(1, notte ? "#060B16" : "#13466E");
  x.fillStyle = g;
  x.fillRect(0, 200, W, H - 200);
  for (let i = 0; i < 220; i++) {
    const py = 202 + Math.pow(r(), 1.6) * 158;
    const larg = 20 + (py - 200) * 0.5;
    x.fillStyle = notte ? `rgba(255,248,220,${0.25 + r() * 0.5})` : `rgba(255,240,200,${0.3 + r() * 0.6})`;
    x.fillRect(380 + (r() - 0.5) * larg * 2, py, 3 + r() * 10, 1.2);
  }
  // una vela lontana e la scogliera a destra
  x.fillStyle = notte ? "#C8CCD8" : "#FFFFFF";
  x.beginPath();
  x.moveTo(150, 196);
  x.lineTo(160, 170);
  x.lineTo(166, 196);
  x.fill();
  x.fillStyle = notte ? "#0C0E14" : "#7A6248";
  x.beginPath();
  x.moveTo(W, 140);
  x.lineTo(680, 160);
  x.lineTo(640, 210);
  x.lineTo(610, 260);
  x.lineTo(600, H);
  x.lineTo(W, H);
  x.fill();
  x.fillStyle = notte ? "#10151A" : "#4E6A36";
  x.beginPath();
  x.moveTo(W, 132);
  x.quadraticCurveTo(700, 140, 676, 162);
  x.lineTo(W, 160);
  x.fill();
}

function bali(x: C, notte: boolean) {
  const r = generatore(17);
  cielo(x, notte ? "#0A1424" : "#9CC9D8", notte ? "#2A3A44" : "#F2E8C8");
  if (notte) {
    stelle(x, r, 120, 160);
    disco(x, 200, 60, 12, "#FFF8E0", "rgba(255,250,220,0.25)");
  }
  // il vulcano nella foschia
  x.fillStyle = notte ? "#1E2A34" : "#8FA6A8";
  x.beginPath();
  x.moveTo(300, 200);
  x.lineTo(470, 70);
  x.lineTo(500, 70);
  x.lineTo(700, 200);
  x.fill();
  foschia(x, 180, 30, notte ? "rgba(40,60,70,0.5)" : "rgba(240,240,225,0.8)");
  // le risaie a terrazze: fasce curve di verde, ognuna con il bordo più chiaro
  for (let k = 0; k < 9; k++) {
    const y0 = 200 + k * 20;
    const v = notte ? 20 + k * 2 : 120 + k * 8;
    x.fillStyle = notte ? `rgb(${12 + k},${v},${18 + k})` : `rgb(${80 + k * 6},${v + 30},${40 + k * 3})`;
    x.beginPath();
    x.moveTo(0, y0 + 30);
    for (let px = 0; px <= W; px += 8) x.lineTo(px, y0 + Math.sin(px / 90 + k * 0.7) * 12);
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.fill();
    x.strokeStyle = notte ? "rgba(120,160,140,0.2)" : "rgba(220,240,170,0.7)";
    x.lineWidth = 1.5;
    x.beginPath();
    for (let px = 0; px <= W; px += 8) x.lineTo(px, y0 + Math.sin(px / 90 + k * 0.7) * 12);
    x.stroke();
  }
  // palme da cocco
  for (let i = 0; i < 9; i++) palma(x, r, r() * W, 280 + r() * 80, 80 + r() * 70, notte ? "#0A120E" : "#24402A");
}

function montagna(x: C, notte: boolean) {
  const r = generatore(19);
  cielo(x, notte ? "#081020" : "#4E8ED0", notte ? "#26304A" : "#D8E8F4");
  if (notte) {
    stelle(x, r, 220);
    disco(x, 560, 50, 11, "#F4F2E6", "rgba(220,230,255,0.25)");
  } else nuvola(x, r, 250, 50, 160, "rgba(255,255,255,0.8)");
  // le cime di roccia chiara, con le lingue di neve
  picchi(x, r, 220, 11, [60, 170], notte ? "#4A5068" : "#B9AC9A", notte ? "#2E3448" : "#857868", notte ? "#B8C2D8" : "#FFFFFF", 0.72);
  foschia(x, 210, 20, notte ? "rgba(40,50,70,0.4)" : "rgba(220,235,245,0.6)");
  // i pascoli verdi e i boschi di abeti
  cresta(x, r, 250, 26, notte ? "#141E1A" : "#6FA048", { sfuma: notte ? "#0E1612" : "#4E8A34" });
  for (let i = 0; i < 50; i++) pino(x, r() * W, 260 + r() * 100, 26 + r() * 40, notte ? "#0A120E" : "#1E3A26");
}

const POSTI = [appennino, neve, bologna, sicilia, mare, bali, montagna];
export const NOMI = ["appennino", "neve", "bologna", "sicilia", "mare", "bali", "montagna"];

export function panorami(notte: boolean): THREE.CanvasTexture[] {
  return POSTI.map((dipingi) => {
    const t = tela(W, H, (x) => dipingi(x, notte));
    t.anisotropy = 4;
    return t;
  });
}
