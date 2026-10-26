import * as THREE from "three";
import { ANGOLO_ZONA, PASSO } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { alone, bruma, generatore, liberaTutto, tela } from "./comuni";
import { colora, rilievo, sulRing, unisci } from "./meraviglie";

/*
 * I luoghi di Livio, da valutare uno per uno: ognuno si accende o si spegne in ATTIVI.
 * Sicilia: Punta Secca col faro, il porticciolo e la casa di Montalbano; il colle barocco (Ibla a gradoni,
 * San Giorgio di Modica in cima, la pagoda della pace di Comiso sul promontorio, l'Annunziata e la Chiesa Madre
 * in basso); il Liotru ai piedi dell'Etna. Argentina: le cascate dell'Iguazú, il Cerro de los Siete Colores,
 * l'Obelisco, il Perito Moreno rifatto. Dietro le carte: un tablao di flamenco ai piedi di Granada.
 * Gli angoli sono contati dalla zona dello sviluppatore; le carte stanno ogni PASSO (0,449 rad) e i luoghi
 * cadono nei varchi fra loro o dietro le carte più basse: Punta Secca nel varco a 2,92, il colle barocco in
 * quello a 3,37. Oltre i 47-48 m dal centro le cose si perdono: le cupole stanno più in qua.
 */
export const ATTIVI = {
  puntaSecca: true,
  barocco: true,
  liotru: true,
  iguazu: true,
  sieteColores: true,
  obelisco: true,
  peritoMoreno: true,
  flamenco: true,
};

const Z = ANGOLO_ZONA;
const PAV = PELO_ACQUA;
type Pezzi = THREE.BufferGeometry[];
const blocco = (p: Pezzi, x: number, y: number, z: number, l: number, h: number, pr: number, c: THREE.ColorRepresentation, velo = 0.2) =>
  p.push(colora(new THREE.BoxGeometry(l, h, pr).translate(x, y + h / 2, z), c, velo));
const cupola = (p: Pezzi, x: number, y: number, z: number, r: number, c: THREE.ColorRepresentation, alta = 1.15, velo = 0.2) =>
  p.push(colora(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, alta, 1).translate(x, y, z), c, velo));
const tamburo = (p: Pezzi, x: number, y: number, z: number, r: number, h: number, c: THREE.ColorRepresentation, velo = 0.2) =>
  p.push(colora(new THREE.CylinderGeometry(r, r, h, 20).translate(x, y + h / 2, z), c, velo));

/**
 * Il rialzo su cui sta un luogo: piatto al centro, scende morbido fino sotto il mare.
 * Serve a portare i luoghi sopra il bordo delle carte senza farli galleggiare.
 */
const zoccolo = (p: Pezzi, a: number, b: number, H: number, colore: THREE.ColorRepresentation, cz = 0) =>
  p.push(
    colora(
      rilievo(-a * 1.6, a * 1.6, cz - b * 1.6, cz + b * 1.6, 40, 24, (x, z) => {
        const t = Math.hypot(x / a, (z - cz) / b);
        const k = t < 0.8 ? 1 : t > 1.6 ? 0 : 1 - THREE.MathUtils.smoothstep(t, 0.8, 1.6);
        return -H + H * k + 0.06 * Math.sin(x * 2.3 + z * 1.7) - 0.02;
      }),
      colore,
      0.26,
    ),
  );

/* ------------------------------------------------------------------ attrezzi per i paesi */

/**
 * Una casa vista da chi guarda: il corpo (che affonda di mezzo metro, per stare in piedi anche sui pendii),
 * le finestre scure sulla facciata verso il centro (−z), il tetto di coppi a padiglione o la terrazza col parapetto.
 */
function casa(p: Pezzi, r: () => number, x: number, suolo: number, z: number, l: number, h: number, pr: number, colore: THREE.ColorRepresentation, coppi: boolean, velo = 0.22) {
  blocco(p, x, suolo - 0.5, z, l, h + 0.5, pr, colore, velo);
  const colonne = Math.max(1, Math.floor(l / 0.3));
  for (let y = suolo + h - 0.26; y > suolo + 0.08; y -= 0.38) {
    for (let c = 0; c < colonne; c++) {
      if (r() < 0.2) continue;
      blocco(p, x - l / 2 + ((c + 0.5) * l) / colonne, y - 0.08, z - pr / 2 - 0.012, 0.09, 0.15, 0.02, "#45392F", velo);
    }
  }
  if (coppi) {
    const tinta = r() < 0.5 ? "#B2603C" : "#A8583A";
    p.push(colora(new THREE.ConeGeometry(l * 0.72, 0.2, 4).rotateY(Math.PI / 4).scale(1, 1, pr / l).translate(x, suolo + h + 0.1, z), tinta, velo));
  } else blocco(p, x, suolo + h, z, l + 0.04, 0.05, pr + 0.04, "#F6F1E6", velo);
}

/** Un albero tondo: carrubo, ulivo. */
const albero = (p: Pezzi, x: number, y: number, z: number, s: number, velo = 0.22) =>
  p.push(colora(new THREE.IcosahedronGeometry(s, 0).scale(1.1, 0.8, 1).translate(x, y + s * 0.7, z), "#5D7443", velo));

/** Una palma: il fusto sottile e sei foglie che ricadono. */
function palma(p: Pezzi, x: number, y: number, z: number, h: number) {
  p.push(colora(new THREE.CylinderGeometry(0.035, 0.05, h, 5).translate(x, y + h / 2, z), "#7D6549", 0.2));
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2 + 0.3;
    p.push(colora(new THREE.BoxGeometry(0.6, 0.02, 0.13).translate(0.28, 0, 0).rotateZ(-0.45).rotateY(t).translate(x, y + h, z), "#4F7A3A", 0.2));
  }
}

/** Un gozzo, lo scafo a mezzo cilindro col bordo bianco; a galla o tirato in secca. */
function gozzo(p: Pezzi, x: number, y: number, z: number, giro: number, colore: string) {
  const scafo = new THREE.CylinderGeometry(0.22, 0.12, 1.1, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).rotateY(giro).translate(x, y, z);
  p.push(colora(scafo, colore, 0.18));
  p.push(colora(new THREE.BoxGeometry(1.1, 0.035, 0.42).rotateY(giro).translate(x, y + 0.01, z), "#F2EFE8", 0.18));
}

/* ------------------------------------------------------------------ Punta Secca */

/**
 * Punta Secca, da sola sul mare, fra il Perito Moreno e il colle barocco: al centro il faro bianco sugli scogli,
 * sotto il porticciolo col molo, il fanale rosso e i gozzi colorati; a destra la spiaggia con la casa di
 * Montalbano e la terrazza sul mare, dietro il borgo basso di case bianche a terrazza, qualche palma.
 * Sta bassa, quasi al pelo del pavimento, nel varco fra due carte: il faro sale sopra le carte, il mare e il
 * porticciolo si vedono fra le carte. Il mare sale appena verso il fondo, perché da quaggiù se ne veda la superficie.
 */
function puntaSecca() {
  const g = sulRing(Z + 2.92, 33, 0.55);
  g.scale.setScalar(1.2);
  const p: Pezzi = [];
  const r = generatore(5);
  zoccolo(p, 7, 3, 1.2, "#B9A77E", 1.5);
  // il mare davanti, più chiaro sulla secca vicino alla riva
  const mare = (z: number) => -0.4 + (z + 5.4) * 0.11;
  p.push(colora(rilievo(-9, 9, -5.4, -0.4, 18, 10, (x, z) => mare(z)), "#4A88B4", 0.16, (q) => new THREE.Color(q.z > -1.0 ? "#8BC6CF" : q.z > -2.4 ? "#5FA3C6" : "#3F7FB0")));
  const sabbia = (x: number, z: number) => 0.25 + 0.08 * Math.sin(x * 1.3 + z) + Math.max(0, z - 1.5) * 0.25;
  p.push(colora(rilievo(-7, 7, -0.5, 4, 32, 8, sabbia), "#E2CFA2", 0.2));
  // il faro al centro, sugli scogli: la casa del guardiano, la torre che si stringe, il ballatoio, la lanterna
  const fx = 0.3, fz = 0.6;
  for (let k = 0; k < 11; k++) {
    const t = (k / 10) * Math.PI;
    p.push(colora(new THREE.DodecahedronGeometry(0.3 + r() * 0.22, 0).translate(fx + Math.cos(t) * 1.4, 0.05, fz - 0.35 - Math.sin(t) * 0.45), "#8E8574", 0.2));
  }
  blocco(p, fx, 0.2, fz + 0.4, 1.9, 0.95, 1.3, "#F3F0E8");
  blocco(p, fx, 1.15, fz + 0.4, 2.0, 0.06, 1.4, "#FBFAF6");
  blocco(p, fx - 0.5, 0.25, fz - 0.27, 0.3, 0.55, 0.02, "#45392F");
  p.push(colora(new THREE.CylinderGeometry(0.34, 0.46, 6.2, 16).translate(fx, 0.2 + 3.1, fz), "#F7F5EF", 0.2));
  for (const y of [2.1, 4.0]) blocco(p, fx, y, fz - 0.4, 0.12, 0.22, 0.02, "#45392F");
  tamburo(p, fx, 6.4, fz, 0.58, 0.08, "#4E535A");
  for (let k = 0; k < 12; k++) blocco(p, fx + Math.cos((k / 12) * Math.PI * 2) * 0.55, 6.48, fz + Math.sin((k / 12) * Math.PI * 2) * 0.55, 0.02, 0.18, 0.02, "#4E535A");
  tamburo(p, fx, 6.48, fz, 0.3, 0.55, "#B9D6E4");
  cupola(p, fx, 7.03, fz, 0.34, "#3D4248", 1);
  // il porticciolo sotto il faro: il molo basso che esce dagli scogli e piega, il fanale rosso in punta;
  // la bocca del porto resta aperta a sinistra, così i gozzi a galla si vedono
  blocco(p, -0.9, -0.6, -1.7, 0.45, 0.7, 2.6, "#CBC1A8");
  blocco(p, -0.35, -0.6, -2.95, 1.6, 0.6, 0.45, "#CBC1A8");
  tamburo(p, 0.4, 0, -2.95, 0.1, 0.5, "#C0392B");
  for (const [x, z, giro, c] of [[0.2, -1.4, 0.25, "#2F6EA8"], [1.1, -2.1, -0.3, "#C4462F"], [-0.2, -2.2, 0.1, "#2E8C6A"], [1.5, -1.2, 0.5, "#E0B53A"], [1.2, -3.6, -0.15, "#2F6EA8"]] as [number, number, number, string][]) {
    gozzo(p, x, mare(z) - 0.04, z, giro, c);
  }
  // e due in secca sulla spiaggia
  gozzo(p, -5.0, 0.32, -0.2, 0.15, "#E0B53A");
  gozzo(p, -5.8, 0.32, 0.05, -0.1, "#2F6EA8");
  // la casa di Montalbano, a destra sulla spiaggia: due piani chiari, la terrazza sul mare con la ringhiera, le persiane
  const mx = -3.4;
  blocco(p, mx, 0.2, 0.4, 2.6, 1.1, 1.6, "#F0E4CC");
  blocco(p, mx - 0.4, 1.3, 0.6, 1.6, 0.9, 1.2, "#F0E4CC");
  blocco(p, mx + 1.1, 1.3, -0.1, 1.2, 0.06, 0.9, "#D9D0BF");
  for (let k = 0; k < 7; k++) blocco(p, mx + 0.55 + k * 0.18, 1.36, -0.53, 0.03, 0.28, 0.03, "#7A7A78");
  blocco(p, mx + 1.1, 1.62, -0.53, 1.2, 0.03, 0.03, "#7A7A78");
  for (const x of [-0.9, -0.2, 0.5]) blocco(p, mx + x, 0.45, -0.41, 0.3, 0.5, 0.02, "#5E7F9E");
  for (const x of [-0.8, -0.1]) blocco(p, mx + x, 1.55, -0.01, 0.28, 0.45, 0.02, "#5E7F9E");
  // il borgo dietro: case basse bianche e color sabbia, quasi tutte a terrazza
  const tinte = ["#F4F0E6", "#EFE5D2", "#E9DCC2", "#F2E8D6", "#E6D3B6"];
  for (let i = 0; i < 44; i++) {
    const x = -5.6 + r() * 9.6, z = 1.5 + r() * 2.3;
    if (Math.abs(x - fx) < 1.3 && z < 2.3) continue;
    if (x > mx - 1.5 && x < mx + 1.8 && z < 2.1) continue;
    casa(p, r, x, sabbia(x, z), z, 0.45 + r() * 0.45, 0.4 + r() * 0.45, 0.5, tinte[i % tinte.length], r() < 0.2, 0.2);
  }
  // le palme
  for (const [x, z, h] of [[2.2, 0.9, 1.6], [-1.6, 1.2, 1.9], [3.4, 1.5, 1.5], [-5.4, 1.4, 1.7]]) palma(p, x, sabbia(x, z), z, h);
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ il colle barocco */

/** Costruisce un pezzo nelle sue misure e lo mette al suo posto nel luogo, scalato attorno alla base. */
function insieme(p: Pezzi, x: number, y: number, z: number, s: number, fai: (q: Pezzi) => void) {
  const q: Pezzi = [];
  fai(q);
  for (const g of q) p.push(g.scale(s, s, s).translate(x, y, z));
}

/**
 * San Giorgio di Modica: la facciata-torre a cinque ordini, color miele, convessa al centro, con l'orologio e la
 * croce; dietro, la chiesa col tetto di coppi. Base a y = 0, la facciata davanti a z = 0.
 */
function sanGiorgio(p: Pezzi) {
  const zf = 0.25;
  const ordini: [number, number][] = [[3.0, 1.3], [2.5, 1.1], [1.8, 1.0], [1.2, 0.9], [0.8, 0.8]];
  let y = 0;
  ordini.forEach(([l, h], i) => {
    blocco(p, 0, y, zf, l, h, 0.5, i % 2 ? "#EBCF9E" : "#E4C38F");
    // il centro che sporge, nei tre ordini bassi
    const fronte = i < 3 ? zf - 0.45 : zf - 0.26;
    if (i < 3) blocco(p, 0, y, zf - 0.32, l * 0.42, h, 0.26, "#EFD6A8");
    for (const s of [-1, 1]) tamburo(p, s * (l / 2 - 0.08), y, zf - 0.27, 0.05, h, "#F6EBD0");
    if (i < 3) for (const s of [-1, 1]) tamburo(p, s * (l * 0.21 + 0.04), y, fronte - 0.03, 0.05, h, "#F6EBD0");
    if (i === 2) {
      // l'orologio
      p.push(colora(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 20).rotateX(Math.PI / 2).translate(0, y + h * 0.5, fronte - 0.02), "#F7F3EA", 0.2));
      blocco(p, 0, y + h * 0.5 - 0.01, fronte - 0.04, 0.02, 0.12, 0.01, "#2E2A26");
      blocco(p, 0.03, y + h * 0.5 - 0.01, fronte - 0.04, 0.09, 0.02, 0.01, "#2E2A26");
    } else {
      // il portale o la finestra ad arco, scuri; nei due ordini alti le celle delle campane
      const lw = i === 0 ? 0.5 : 0.36, lh = h * (i === 0 ? 0.62 : 0.55);
      const y1 = y + (i === 0 ? 0 : h * 0.2);
      blocco(p, 0, y1, fronte - 0.01, lw, lh, 0.02, i >= 3 ? "#3A332C" : "#5B4A3A");
      p.push(colora(new THREE.CylinderGeometry(lw / 2, lw / 2, 0.02, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, y1 + lh, fronte - 0.01), i >= 3 ? "#3A332C" : "#5B4A3A", 0.2));
    }
    // le finestre delle ali, nei due ordini bassi
    if (i < 2) for (const s of [-1, 1]) blocco(p, s * (l / 2 - 0.22), y + h * 0.35, zf - 0.26, 0.16, 0.3, 0.02, "#5B4A3A");
    // la cornice che sporge e le statue agli angoli
    blocco(p, 0, y + h - 0.04, zf - 0.08, l + 0.24, 0.09, 0.7, "#F6EEDA");
    if (i < 3) for (const s of [-1, 1]) tamburo(p, s * (l / 2 - 0.05), y + h + 0.05, zf - 0.22, 0.05, 0.28, "#EDE3CB");
    y += h;
  });
  cupola(p, 0, y, zf, 0.28, "#C9B48C", 1.5);
  blocco(p, 0, y + 0.4, zf, 0.03, 0.3, 0.03, "#4A4440");
  blocco(p, 0, y + 0.58, zf, 0.16, 0.03, 0.03, "#4A4440");
  blocco(p, 0, -0.6, zf + 1.6, 2.4, 2.4, 2.8, "#DCC9A2");
  p.push(colora(new THREE.CylinderGeometry(0.01, 1.3, 0.5, 4, 1).rotateY(Math.PI / 4).scale(1.3, 1, 1.5).translate(0, 2.05, zf + 1.6), "#AE5E3C", 0.22));
}

/** La pagoda della pace del reverendo Morishita: due terrazze bianche, lo stupa, la guglia dorata, la nicchia del Buddha. Base a y = 0. */
function pagoda(p: Pezzi) {
  blocco(p, 0, -0.4, 0, 3.4, 0.9, 3.4, "#F3F1EC");
  blocco(p, 0, 0.5, 0, 2.6, 0.45, 2.6, "#F3F1EC");
  cupola(p, 0, 0.95, 0, 1.15, "#FAF9F6", 0.85);
  blocco(p, 0, 1.92, 0, 0.5, 0.25, 0.5, "#F3F1EC");
  for (let k = 0; k < 7; k++) tamburo(p, 0, 2.17 + k * 0.14, 0, 0.2 - k * 0.022, 0.08, "#D4A73C");
  p.push(colora(new THREE.ConeGeometry(0.06, 0.5, 8).translate(0, 3.35, 0), "#D4A73C", 0.18));
  blocco(p, 0, 1.05, -1.12, 0.5, 0.6, 0.06, "#C9A04A");
}

/** La basilica dell'Annunziata di Comiso: la facciata a due ordini col timpano, il tamburo ottagonale, la cupola azzurra a spicchi; il campanile. Base a y = 0, facciata a z = 0. */
function annunziata(p: Pezzi) {
  blocco(p, 0, -0.6, 2.15, 1.7, 2.6, 4.2, "#E6D8B8");
  blocco(p, 0, -0.6, 3.25, 3.4, 2.3, 1.1, "#E6D8B8");
  blocco(p, 0, -0.6, 0, 2.2, 2.2, 0.25, "#EFE5CC");
  blocco(p, 0, 1.6, 0, 2.4, 0.1, 0.32, "#F5EEDB");
  blocco(p, 0, 1.7, 0, 1.4, 0.95, 0.22, "#EFE5CC");
  p.push(colora(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(2, 0.75, 1).translate(0, 2.83, 0), "#F5EEDB", 0.2));
  for (const ox of [-1.0, -0.62, 0.62, 1.0]) blocco(p, ox, -0.6, -0.15, 0.12, 2.2, 0.06, "#F8F2E2");
  for (const ox of [-0.62, 0.62]) blocco(p, ox, 1.7, -0.13, 0.1, 0.95, 0.05, "#F8F2E2");
  blocco(p, 0, 0, -0.14, 0.5, 0.95, 0.03, "#5B4A3A");
  const cz = 3.25;
  p.push(colora(new THREE.CylinderGeometry(0.66, 0.66, 1.6, 8).translate(0, 2.5, cz), "#EFE5CC", 0.2));
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    blocco(p, Math.cos(t) * 0.66, 1.7, cz + Math.sin(t) * 0.66, 0.09, 1.6, 0.09, "#F8F2E2");
  }
  p.push(
    colora(new THREE.SphereGeometry(0.7, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.35, 1).translate(0, 3.3, cz), "#3C78B8", 0.18, (q) => {
      const t = Math.atan2(q.z - cz, q.x);
      return new THREE.Color(Math.abs(Math.sin(t * 4)) < 0.12 ? "#D9E3EA" : "#3C78B8");
    }),
  );
  tamburo(p, 0, 4.23, cz, 0.15, 0.35, "#F5EEDB");
  cupola(p, 0, 4.58, cz, 0.16, "#3C78B8", 1.3);
  blocco(p, 0, 4.76, cz, 0.02, 0.22, 0.02, "#4A4440");
  // il campanile in pietra, cuspide di pietra
  blocco(p, 1.7, -0.6, 0.45, 0.7, 3.4, 0.7, "#E1D2B0");
  blocco(p, 1.7, 2.8, 0.45, 0.8, 0.08, 0.8, "#EDE2C6");
  p.push(colora(new THREE.ConeGeometry(0.42, 0.7, 4).rotateY(Math.PI / 4).translate(1.7, 3.23, 0.45), "#CDBB93", 0.2));
}

/** La Chiesa Madre di Comiso, Santa Maria delle Stelle: la facciata a due ordini con tre portali, la cupola grigia sul tamburo, il campanile. Base a y = 0, facciata a z = 0. */
function chiesaMadre(p: Pezzi) {
  blocco(p, 0, -0.6, 2.0, 2.6, 2.4, 4.0, "#DCCBA6");
  blocco(p, 0, -0.6, 0, 2.8, 2.3, 0.3, "#E6D7B5");
  blocco(p, 0, 1.7, 0, 1.6, 1.0, 0.26, "#E6D7B5");
  blocco(p, 0, 1.62, -0.02, 3.0, 0.1, 0.36, "#F2E9D4");
  p.push(colora(new THREE.CylinderGeometry(0.5, 0.5, 0.24, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1.8, 0.7, 1).translate(0, 2.88, 0), "#F2E9D4", 0.2));
  for (const ox of [-1.25, -0.5, 0.5, 1.25]) blocco(p, ox, -0.6, -0.17, 0.12, 2.25, 0.05, "#F5EEDC");
  for (const ox of [-0.8, 0, 0.8]) blocco(p, ox, 0, -0.16, ox ? 0.34 : 0.48, ox ? 0.7 : 0.95, 0.03, "#5B4A3A");
  blocco(p, 0, 1.95, -0.14, 0.3, 0.45, 0.02, "#5B4A3A");
  const cz = 2.6;
  p.push(colora(new THREE.CylinderGeometry(0.62, 0.62, 0.9, 12).translate(0, 2.25, cz), "#E6D7B5", 0.2));
  cupola(p, 0, 2.7, cz, 0.66, "#8E9A9C", 1.25);
  tamburo(p, 0, 3.5, cz, 0.12, 0.3, "#F2E9D4");
  cupola(p, 0, 3.8, cz, 0.13, "#8E9A9C", 1.3);
  blocco(p, -1.75, -0.6, 0.6, 0.7, 3.6, 0.7, "#DCCBA6");
  blocco(p, -1.75, 2.4, 0.25, 0.26, 0.4, 0.02, "#3A332C");
  cupola(p, -1.75, 3.0, 0.6, 0.3, "#C9B48C", 1.3);
}

/**
 * Il colle barocco, uno solo: lo sperone di Ibla con le case color miele a gradoni, i tetti di coppi, i carrubi
 * in basso. In cima San Giorgio di Modica; a sinistra, su un piccolo promontorio, la pagoda della pace del
 * reverendo Morishita; in basso, davanti, la parte di Comiso: l'Annunziata con la cupola azzurra e la Chiesa
 * Madre; sul fianco destro la cupola di maiolica dell'Itria. Attorno, fin sotto il pavimento, i campi arati.
 * Nel varco fra le carte (3,37): le chiese in basso si vedono fra le carte, San Giorgio sopra.
 */
function colleBarocco() {
  const g = sulRing(Z + 3.4, 42, 3.4);
  g.scale.setScalar(1.38);
  const p: Pezzi = [];
  const r = generatore(19);
  const sx = 0.6, sz = 0.6;
  const px = 4.4, pz = 0.4;
  // lo sperone, col promontorio della pagoda sul fianco sinistro (+x è la sinistra di chi guarda)
  const sperone = (x: number, z: number) =>
    Math.max(0, 5.2 * Math.exp(-((x * x) / 30 + ((z - 1.2) * (z - 1.2)) / 9)) + 1.3 * Math.exp(-(((x - px) * (x - px)) / 1.6 + ((z - pz) * (z - pz)) / 2)) + 0.1 * Math.sin(x * 2 + z)) - 0.3;
  // tutt'attorno la campagna scende fin sotto il pavimento, a terrazzamenti: il colle non resta sospeso nel
  // vuoto. Da quaggiù si vedono le alzate, cioè i muretti a secco, più che i campi in piano: per questo i gradini.
  const discesa = (x: number, z: number) => 3.6 * THREE.MathUtils.smoothstep(Math.hypot(x / 10, (z - 1) / 5), 0.7, 1.45);
  const P = 0.55;
  const colle = (x: number, z: number) => {
    const y = sperone(x, z) - discesa(x, z) + 0.06 * Math.sin(x * 0.9) * Math.sin(z * 1.3);
    const d = discesa(x, z);
    if (d < 0.02) return y;
    const f = y / P, k = Math.floor(f);
    const gradino = (k + THREE.MathUtils.smoothstep(f - k, 0.78, 1)) * P;
    return y + (gradino - y) * THREE.MathUtils.smoothstep(d, 0.02, 0.3);
  };
  // i campi siciliani: appezzamenti un po' storti, arati a solchi in due versi, stoppie, grano verde, terra
  // rossa nuda; fra un campo e l'altro i muretti a secco e le trazzere chiare
  const campo = (x: number, z: number) => {
    const u = x * 0.95 + z * 0.3, v = z * 0.95 - x * 0.3;
    const i = Math.floor(u / 2.4), j = Math.floor(v / 1.7);
    const fu = u / 2.4 - i, fv = v / 1.7 - j;
    if (fu < 0.05 || fv < 0.07) return "#CFC6B0";
    const h = Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5) % 1;
    if (h < 0.45) return Math.sin((h < 0.22 ? u : v) * 8) > 0 ? "#7A4E33" : "#9A6644";
    if (h < 0.65) return "#C9B26A";
    if (h < 0.82) return "#7E8F4A";
    return "#A97F55";
  };
  p.push(
    colora(rilievo(-13, 13, -7, 6, 200, 100, colle), "#8C8A5A", 0.16, (q, n) => {
      const d = discesa(q.x, q.z);
      if (d < 0.05) return new THREE.Color(q.y > 1.2 ? "#A89C78" : q.y > 0.6 ? "#6F7E48" : campo(q.x, q.z));
      // l'alzata del gradino è il muretto a secco: pietra chiara, a corsi
      if (n.y < 0.8) return new THREE.Color(Math.sin(q.y * 38) > 0.5 ? "#9C8C6C" : "#BCAB86");
      return new THREE.Color(campo(q.x, q.z));
    }),
  );
  // nei campi: carrubi e ulivi sparsi lungo i muretti, qualche masseria
  {
    const rc = generatore(71);
    for (let i = 0; i < 70; i++) {
      const x = (rc() * 2 - 1) * 12, z = -6.5 + rc() * 12;
      const d = discesa(x, z);
      if (d < 0.15 || d > 3.2) continue;
      albero(p, x, colle(x, z) - 0.05, z, 0.22 + rc() * 0.14, 0.24);
    }
    // e gli ulivi in fila sul ciglio dei terrazzi, appena dietro il muretto: da quaggiù sono loro a dire "campagna"
    for (let x = -11.5; x <= 11.5; x += 0.55) {
      for (let z = -6.6; z <= 5.5; z += 0.13) {
        const d = discesa(x, z);
        if (d < 0.25 || d > 3.3) continue;
        const y0 = colle(x, z), y1 = colle(x, z - 0.13);
        // il ciglio: qui il terreno cade di un gradino verso chi guarda
        if (y0 - y1 > P * 0.6 && rc() < 0.75) albero(p, x + (rc() - 0.5) * 0.2, y0 - 0.04, z + 0.12, 0.17 + rc() * 0.07, 0.22);
      }
    }
    for (const [x, z] of [[-6.5, -3.6], [5.8, -4.2], [-9.5, 0.5], [9.2, -1.0]]) {
      const y = colle(x, z);
      casa(p, rc, x, y, z, 0.9, 0.5, 0.6, "#E2D2B0", true, 0.24);
      casa(p, rc, x + 0.75, y - 0.05, z + 0.2, 0.5, 0.35, 0.5, "#D8C6A0", true, 0.24);
    }
  }
  // dove stanno le chiese e la pagoda
  const ax = 1.5, cmx = -1.4, fz = -1.5;
  // le impronte dei monumenti, alle loro scale: lì niente case
  const libero = (x: number, z: number) =>
    !(Math.abs(x - sx) < 1.25 && z > sz - 0.15 && z < sz + 2.6) &&
    !(Math.abs(x - px) < 1.15 && Math.abs(z - pz) < 1.15) &&
    !(x > ax - 0.6 && x < ax + 1.1 && z > fz - 0.15 && z < fz + 1.8) &&
    !(x > cmx - 1.0 && x < cmx + 0.7 && z > fz - 0.15 && z < fz + 1.9);
  // le case a gradoni: la base presa a terrazze di 0,4, così le file si leggono
  const tinte = ["#DFC496", "#D3B585", "#E6D2A8", "#CDAE80"];
  for (let i = 0; i < 300; i++) {
    const x = (r() * 2 - 1) * 6.6, z = -1.8 + r() * 4.2;
    const y = colle(x, z);
    if (!libero(x, z)) continue;
    if (y < 0.5) {
      if (r() < 0.35) albero(p, x, y, z, 0.25 + r() * 0.15, 0.24);
      continue;
    }
    const l = 0.35 + r() * 0.3, h = 0.35 + r() * 0.35;
    casa(p, r, x, Math.floor(y / 0.4) * 0.4, z, l, h, l * 0.9, tinte[i % tinte.length], r() < 0.75, 0.24);
  }
  // in cima San Giorgio; sul promontorio la pagoda; in basso l'Annunziata e la Chiesa Madre
  insieme(p, sx, colle(sx, sz) - 0.15, sz, 0.75, sanGiorgio);
  insieme(p, px, colle(px, pz) - 0.05, pz, 0.6, pagoda);
  insieme(p, ax, colle(ax, fz) - 0.1, fz, 0.42, annunziata);
  insieme(p, cmx, colle(cmx, fz) - 0.1, fz, 0.42, chiesaMadre);
  // l'Itria: la cupola di maiolica blu a strisce bianche sul suo tamburo, il campanile con la cuspide
  const ix = -3.6, iz = 0.6, iy = colle(ix, iz) + 0.2;
  blocco(p, ix, iy - 0.6, iz, 1.3, 1.2, 1.3, "#E3CFA4");
  tamburo(p, ix, iy + 0.6, iz, 0.42, 0.5, "#EBDAB3");
  p.push(
    colora(new THREE.SphereGeometry(0.44, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 1).translate(ix, iy + 1.1, iz), "#2F6FA8", 0.2, (q) => {
      const t = Math.atan2(q.z - iz, q.x - ix);
      return new THREE.Color(Math.abs(Math.sin(t * 6)) < 0.14 ? "#EDEFF2" : "#2F6FA8");
    }),
  );
  blocco(p, ix + 1.0, iy - 0.6, iz - 0.2, 0.5, 2.2, 0.5, "#E3CFA4");
  p.push(colora(new THREE.ConeGeometry(0.32, 0.6, 4).rotateY(Math.PI / 4).translate(ix + 1.0, iy + 1.9, iz - 0.2), "#3F7DB0", 0.2));
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ il Liotru */

/** L'elefante di pietra lavica con l'obelisco sul dorso, sul basamento di marmo bianco con la fontana. Dietro le carte, ai piedi dell'Etna. */
class Liotru {
  gruppo = new THREE.Group();
  private tx: THREE.Texture;
  constructor() {
    // dietro le carte, nel varco fra la seconda e la terza, ai piedi dell'Etna
    const a = Z + PASSO * 3.5, d = 10.5;
    this.gruppo.position.set(Math.sin(a) * d, PAV, -Math.cos(a) * d);
    this.gruppo.rotation.y = Math.PI - a + 0.6;
    const lava = new THREE.MeshStandardMaterial({ color: "#2B2927", roughness: 0.9 });
    const marmo = new THREE.MeshStandardMaterial({ color: "#EDEBE6", roughness: 0.5 });
    const avorio = new THREE.MeshStandardMaterial({ color: "#F1EBDD", roughness: 0.4 });
    this.tx = tela(64, 256, (x) => {
      x.fillStyle = "#8E8A86";
      x.fillRect(0, 0, 64, 256);
      x.fillStyle = "#5E5A56";
      for (let i = 0; i < 26; i++) x.fillRect(14 + (i % 3) * 14, 12 + i * 9, 8, 4);
    });
    const granito = new THREE.MeshStandardMaterial({ map: this.tx, roughness: 0.6 });
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => this.gruppo.add(new THREE.Mesh(g, m));
    // la fontana e il basamento
    add(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 28).translate(0, 0.06, 0), marmo);
    add(new THREE.CylinderGeometry(0.68, 0.68, 0.02, 28).translate(0, 0.12, 0), new THREE.MeshStandardMaterial({ color: "#7FB0C8", roughness: 0.15, metalness: 0.1 }));
    add(new THREE.BoxGeometry(0.42, 0.34, 0.26).translate(0, 0.29, 0), marmo);
    // l'elefante
    add(new THREE.SphereGeometry(0.17, 16, 12).scale(1.25, 0.9, 0.8).translate(0, 0.62, 0), lava);
    for (const [x, z] of [[-0.12, -0.07], [-0.12, 0.07], [0.12, -0.07], [0.12, 0.07]]) add(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 10).translate(x, 0.52, z), lava);
    add(new THREE.SphereGeometry(0.1, 14, 10).translate(-0.22, 0.7, 0), lava);
    for (const z of [-0.09, 0.09]) add(new THREE.SphereGeometry(0.07, 10, 8).scale(0.3, 1, 1).translate(-0.2, 0.72, z), lava);
    const proboscide = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.68, 0), new THREE.Vector3(-0.36, 0.58, 0), new THREE.Vector3(-0.34, 0.5, 0), new THREE.Vector3(-0.3, 0.47, 0)]), 12, 0.025, 8);
    add(proboscide, lava);
    for (const z of [-0.04, 0.04]) add(new THREE.ConeGeometry(0.012, 0.09, 6).rotateZ(Math.PI / 2 + 0.5).translate(-0.31, 0.63, z), avorio);
    // la gualdrappa e l'obelisco col globo e la croce
    add(new THREE.BoxGeometry(0.22, 0.03, 0.2).translate(0.02, 0.79, 0), marmo);
    add(new THREE.CylinderGeometry(0.03, 0.055, 0.95, 4).rotateY(Math.PI / 4).translate(0.02, 1.28, 0), granito);
    add(new THREE.SphereGeometry(0.04, 12, 8).translate(0.02, 1.78, 0), marmo);
    add(new THREE.BoxGeometry(0.012, 0.09, 0.012).translate(0.02, 1.85, 0), lava);
    add(new THREE.BoxGeometry(0.05, 0.012, 0.012).translate(0.02, 1.86, 0), lava);
    this.gruppo.scale.setScalar(1.7);
  }
  libera() {
    liberaTutto(this.gruppo, [this.tx]);
  }
}

/* ------------------------------------------------------------------ Iguazú */

/**
 * La Garganta del Diablo, bassa fra la giungla: la gola a ferro di cavallo in due salti, il ciglio di basalto
 * scuro, l'acqua che cade in cortine separate (continua solo al centro, nella Garganta), la terrazza di mezzo
 * col suo bosco, la schiuma e la nebbia sul fondo, l'arcobaleno. Più bassa del Perito Moreno, che le sta accanto.
 */
class Iguazu {
  gruppo: THREE.Group;
  private acqua: THREE.Texture;
  private nebbia: THREE.Sprite[] = [];
  private texture: THREE.Texture[] = [];
  constructor() {
    // a terra, ai piedi del Cerro de los Siete Colores
    this.gruppo = sulRing(Z + 1.97, 35, 0);
    this.gruppo.scale.setScalar(1.4);
    const p: Pezzi = [];
    const R = 3.3, H = 2.9, M = 1.45, N = 56;
    // un tratto della gola: da angolo a0 ad a1, raggio rr, da quota y0 a y1 (u lungo l'arco, v in altezza)
    const arco = (rr: number, y0: number, y1: number, a0 = -1.6, a1 = 1.6, n = N) => {
      const g = new THREE.BufferGeometry();
      const pos: number[] = [], uv: number[] = [];
      for (let i = 0; i < n; i++) {
        const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
        const a = [Math.sin(t0) * rr, Math.cos(t0) * rr], b = [Math.sin(t1) * rr, Math.cos(t1) * rr];
        pos.push(a[0], y0, a[1], b[0], y1, b[1], b[0], y0, b[1], a[0], y0, a[1], a[0], y1, a[1], b[0], y1, b[1]);
        const u0 = (t0 + 1.6) / 3.2, u1 = (t1 + 1.6) / 3.2;
        uv.push(u0, 0, u1, 1, u1, 0, u0, 0, u0, 1, u1, 1);
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      return g;
    };
    // la roccia: il salto alto sul raggio pieno, quello basso più in qua; basalto scuro, muschio sui cigli
    const roccia = (q: THREE.Vector3) => new THREE.Color(q.y > H - 0.25 || (q.y > M - 0.2 && q.y < M + 0.05) ? "#4E6A3A" : "#3A3631");
    p.push(colora(arco(R + 0.12, M - 0.1, H), "#3A3631", 0.18, roccia));
    p.push(colora(arco(R - 0.75, -0.3, M), "#3A3631", 0.18, roccia));
    // la giungla: fitta sul ciglio e dietro, giù per i fianchi verso chi guarda, qualche albero più alto che emerge
    const r = generatore(5);
    const verdi = ["#2E5A2C", "#3F6B34", "#4E7C3C", "#36633A"];
    for (let i = 0; i < 340; i++) {
      const t = -2.3 + r() * 4.6, rr = R + 0.25 + r() * 2.8;
      const fianco = Math.abs(t) > 1.6;
      const y = fianco ? H * (0.35 + 0.65 * Math.min(1, (rr - R) / 1.5)) : H;
      const s = 0.16 + r() * 0.2 + (r() < 0.07 ? 0.22 : 0);
      p.push(colora(new THREE.IcosahedronGeometry(s, 0).scale(1, 0.85, 1).translate(Math.sin(t) * rr, y + s * 0.6, Math.cos(t) * rr), verdi[i % verdi.length], 0.2));
    }
    // il bosco sulla terrazza fra i due salti, dove l'acqua non cade
    for (let i = 0; i < 40; i++) {
      const t = -1.5 + r() * 3.0, rr = R - 0.6 + r() * 0.5;
      if (Math.abs(t) < 0.5) continue;
      p.push(colora(new THREE.IcosahedronGeometry(0.12 + r() * 0.1, 0).translate(Math.sin(t) * rr, M + 0.1, Math.cos(t) * rr), verdi[i % verdi.length], 0.2));
    }
    // il fondo della gola: schiuma bianca, il fiume che esce verso chi guarda color terra
    p.push(colora(new THREE.CircleGeometry(R, 32).rotateX(-Math.PI / 2).translate(0, -0.25, 0), "#E8F1F2", 0.15));
    p.push(colora(new THREE.PlaneGeometry(4.2, 3).rotateX(-Math.PI / 2).translate(0, -0.27, -2.2), "#9C8664", 0.15));
    this.gruppo.add(unisci(p));
    // l'acqua che cade: righe chiare che scorrono, appena color terra come il Paraná
    this.acqua = tela(64, 128, (x) => {
      x.clearRect(0, 0, 64, 128);
      for (let i = 0; i < 44; i++) {
        const cx = Math.random() * 64, w = 1 + Math.random() * 3;
        const v = x.createLinearGradient(0, 0, 0, 128);
        v.addColorStop(0, "rgba(255,255,255,0.97)");
        v.addColorStop(0.5, "rgba(226,218,200,0.8)");
        v.addColorStop(1, "rgba(255,255,255,0.97)");
        x.fillStyle = v;
        x.fillRect(cx, 0, w, 128);
      }
    });
    this.acqua.wrapS = this.acqua.wrapT = THREE.RepeatWrapping;
    this.acqua.repeat.set(3, 1.2);
    this.texture.push(this.acqua);
    const mat = new THREE.MeshBasicMaterial({ map: this.acqua, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false });
    // le cortine: la Garganta al centro continua, ai lati salti separati, ognuno in tutti e due i livelli
    const cortine: [number, number][] = [[-1.5, -1.25], [-1.12, -0.86], [-0.72, 0.72], [0.86, 1.05], [1.2, 1.5]];
    for (const [a0, a1] of cortine) {
      const n = Math.max(4, Math.round(((a1 - a0) / 3.2) * N));
      this.gruppo.add(new THREE.Mesh(arco(R, M, H - 0.03, a0, a1, n), mat));
      this.gruppo.add(new THREE.Mesh(arco(R - 0.82, -0.2, M - 0.02, a0, a1, n), mat));
    }
    // la nebbia in basso e l'arcobaleno davanti
    const tb = bruma(11);
    this.texture.push(tb);
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tb, color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      const t = -1.3 + k * 0.43;
      s.position.set(Math.sin(t) * (R - 1.1), 0.5, Math.cos(t) * (R - 1.1));
      s.scale.setScalar(2.0);
      this.nebbia.push(s);
      this.gruppo.add(s);
    }
    const iride = tela(256, 128, (x) => {
      const colori = ["#E05A5A", "#E8A24A", "#E8D84A", "#6CC46C", "#5A8FE0", "#8A6AD0"];
      x.lineWidth = 5;
      colori.forEach((c, i) => {
        x.strokeStyle = c;
        x.globalAlpha = 0.55;
        x.beginPath();
        x.arc(128, 128, 112 - i * 5, Math.PI, 0);
        x.stroke();
      });
    });
    this.texture.push(iride);
    const arcobaleno = new THREE.Sprite(new THREE.SpriteMaterial({ map: iride, transparent: true, opacity: 0.45, depthWrite: false, fog: false }));
    arcobaleno.position.set(0, 1.2, -1.6);
    arcobaleno.scale.set(4.2, 2.1, 1);
    this.gruppo.add(arcobaleno);
  }
  aggiorna(t: number) {
    this.acqua.offset.y = (t * 0.9) % 1;
    this.nebbia.forEach((s, i) => (s.material.opacity = 0.4 + 0.2 * Math.sin(t * 0.7 + i)));
  }
  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}

/* ------------------------------------------------------------ Cerro de los Siete Colores */

/**
 * Il Cerro de los Siete Colores di Purmamarca: le rocce piegate a strati rossi, ocra, verdi, viola.
 * A destra dell'Etna, più vicino e più alto di prima: a 44 m la sua parte dietro passava i 47 e si perdeva,
 * e da basso le carte lo coprivano tutto.
 */
function sieteColores() {
  const g = sulRing(Z + 1.6, 35, 0);
  g.scale.set(1.05, 1.35, 0.9);
  const fasce = ["#B4473A", "#D98466", "#C99A4E", "#6F8A50", "#8A527A", "#A8604A", "#D8AE70", "#9C4A36"].map((c) => new THREE.Color(c));
  const h = (x: number, z: number) => {
    const k = Math.max(0, 1 - (x / 9) ** 2) * Math.sin(((z + 1) / 7) * Math.PI);
    return Math.max(0, k * (6.5 + 0.8 * Math.abs(Math.sin(x * 0.9)) + 0.35 * Math.sin(x * 4.1 + z))) - 0.3;
  };
  const m = unisci([
    colora(rilievo(-9.5, 9.5, -1, 6, 90, 30, h), "#B4473A", 0.1, (q) => {
      // gli strati inclinati: il colore dipende dalla quota e un poco dalla posizione, come rocce piegate
      const s = q.y * 0.95 + q.x * 0.12 + Math.sin(q.x * 0.6) * 0.35;
      return fasce[((Math.floor(s) % fasce.length) + fasce.length) % fasce.length].clone();
    }),
  ]);
  g.add(m);
  return g;
}

/* ------------------------------------------------------------------ l'Obelisco */

/** L'Obelisco di Buenos Aires, bianco, fra le cascate e il ghiacciaio. */
function obelisco() {
  // ai piedi, fra le cascate dell'Iguazú e il Perito Moreno
  const g = sulRing(Z + 2.22, 29, 0);
  g.scale.setScalar(1.2);
  const p: Pezzi = [];
  blocco(p, 0, -0.3, 0, 3.2, 0.12, 3.2, "#BDB7AC");
  p.push(colora(new THREE.CylinderGeometry(0.28, 0.5, 7.6, 4, 1).rotateY(Math.PI / 4).translate(0, 3.7, 0), "#F2EFE8", 0.18));
  p.push(colora(new THREE.ConeGeometry(0.3, 0.55, 4).rotateY(Math.PI / 4).translate(0, 7.77, 0), "#F2EFE8", 0.18));
  blocco(p, 0, 7.05, -0.3, 0.12, 0.2, 0.02, "#2E2C2A");
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ il Perito Moreno */

/**
 * Il fronte alto del ghiacciaio sul Lago Argentino, a guglie, con le fenditure blu profonde; la lingua che sale
 * irta di seracchi fra i fianchi boscosi della valle verso le Ande innevate; i blocchi che si staccano e cadono.
 * Nel varco fra le carte (2,47), più vicino degli altri luoghi: le Ande devono stare entro i 47 m, oltre si perdono.
 * Il fronte è alto quasi il doppio delle cascate dell'Iguazú, che gli stanno accanto.
 */
class PeritoMoreno {
  gruppo: THREE.Group;
  private blocchi: { m: THREE.Mesh; inizio: number; x: number }[] = [];
  private prossimo = 6;
  private r = generatore(57);
  private F = 4.4;
  constructor() {
    this.gruppo = sulRing(Z + 2.47, 32, 0);
    this.gruppo.scale.setScalar(1.25);
    const p: Pezzi = [];
    const F = this.F;
    // le Ande dietro: granito scuro a punte, neve dalla metà in su, a lingue lungo i canaloni
    p.push(
      colora(
        rilievo(-8.5, 8.5, 4.5, 8.5, 80, 10, (x, z) => {
          const k = Math.sin(((z - 4.5) / 4) * Math.PI) * (1 - Math.pow(x / 8.5, 4));
          return k * (10.5 + 2.6 * Math.abs(Math.sin(x * 0.8 + 0.4)) + 1.8 * Math.pow(Math.abs(Math.sin(x * 2.3)), 3) + 0.5 * Math.sin(x * 5.1)) - 0.5;
        }),
        "#3F3E46",
        0.2,
        (q) => new THREE.Color(q.y > 9.8 + Math.sin(q.x * 2.6) * 0.9 ? "#F4F7FA" : q.y > 5.2 ? "#3F3E46" : "#34502F"),
      ),
    );
    // i fianchi della valle: bosco scuro di lenga in basso, roccia, neve in cima
    for (const s of [-1, 1]) {
      p.push(
        colora(
          rilievo(s < 0 ? -8 : 4.8, s < 0 ? -4.8 : 8, -3, 6, 16, 22, (x, z) => {
            const d = Math.min(1, Math.max(0, (Math.abs(x) - 4.8) / 2.5));
            return (6.2 + 1.2 * Math.sin(z * 0.7 + x)) * Math.pow(d, 0.7) * Math.min(1, (z + 3) / 2) - 0.4;
          }),
          "#3E5E3A",
          0.24,
          (q) => new THREE.Color(q.y > 6.0 ? "#EEF2F5" : q.y > 3.6 ? "#6A6971" : "#3E5E3A"),
        ),
      );
    }
    // la lingua: sale verso le montagne, irta di seracchi aguzzi, con le morene scure
    const sup = (x: number, z: number) => F + Math.max(0, z + 1.5) * 0.22 + 0.3 * Math.pow(Math.abs(Math.sin(x * 4.3 + z * 2.9)), 6) + 0.12 * Math.abs(Math.sin(z * 5.1 - x * 1.3));
    p.push(
      colora(rilievo(-5, 5, -1.5, 5, 74, 40, sup), "#EEF5FA", 0.18, (q) => {
        const c = new THREE.Color("#F2F7FB");
        const crepa = Math.pow(Math.abs(Math.sin(q.x * 4.3 + q.z * 2.9)), 6);
        if (crepa < 0.08) c.lerp(new THREE.Color("#5E9ED0"), 0.6);
        for (const mx of [-2.4, 0.3, 2.7]) if (Math.abs(q.x - mx - Math.sin(q.z * 0.5) * 0.3) < 0.14) c.lerp(new THREE.Color("#6B6762"), 0.7);
        return c;
      }),
    );
    // il fronte: colonne di ghiaccio, fenditure blu profondo, guglie in cima
    {
      const N = 130, pos: number[] = [];
      const cima = (x: number) => sup(x, -1.5) + 0.9 * Math.pow(Math.abs(Math.sin(x * 3.7)), 4) + 0.3 * Math.sin(x * 11.3);
      for (let i = 0; i < N; i++) {
        const x0 = -5 + (10 * i) / N, x1 = -5 + (10 * (i + 1)) / N;
        const z0 = -1.5 - 0.2 * Math.abs(Math.sin(i * 0.9)), z1 = -1.5 - 0.2 * Math.abs(Math.sin((i + 1) * 0.9));
        pos.push(x0, 0, z0, x1, cima(x1), z1, x1, 0, z1, x0, 0, z0, x0, cima(x0), z0, x1, cima(x1), z1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      p.push(
        colora(geo, "#A9D3EC", 0.1, (q) => {
          const fessura = Math.abs(Math.sin(q.x * 6.3 + Math.sin(q.x * 1.7) * 2.4)) < 0.22;
          const base = new THREE.Color("#2A6FAE").lerp(new THREE.Color("#E4F2FA"), Math.min(1, q.y / F) * 0.7);
          return fessura ? base.lerp(new THREE.Color("#1F5E99"), 0.6) : base;
        }),
      );
    }
    // il lago, color latte e turchese
    p.push(colora(new THREE.PlaneGeometry(16, 6).rotateX(-Math.PI / 2).translate(0, 0.03, -4.4), "#86B8C6", 0.15));
    this.gruppo.add(unisci(p));
    for (let k = 0; k < 2; k++) {
      const geo = new THREE.BoxGeometry(0.9, 1.5, 0.7, 3, 4, 2);
      const q = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < q.count; i++) q.setXYZ(i, q.getX(i) * (0.85 + this.r() * 0.3), q.getY(i) * (0.9 + this.r() * 0.2), q.getZ(i) * (0.8 + this.r() * 0.4));
      geo.translate(0, 0.75, 0.35);
      const m = new THREE.Mesh(colora(geo, "#A9D2EC", 0.12, (_q, n) => new THREE.Color(n.y > 0.5 ? "#F3F8FC" : "#5E9ED0")), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, fog: false }));
      m.visible = false;
      this.gruppo.add(m);
      this.blocchi.push({ m, inizio: -1, x: 0 });
    }
  }
  aggiorna(t: number) {
    if (t > this.prossimo) {
      const b = this.blocchi.find((x) => x.inizio < 0);
      if (b) {
        b.inizio = t;
        b.x = (this.r() * 2 - 1) * 4;
      }
      this.prossimo = t + 8 + this.r() * 7;
    }
    const F = this.F;
    this.blocchi.forEach((b) => {
      if (b.inizio < 0) return;
      const e = t - b.inizio, m = b.m;
      m.visible = true;
      let y = F - 1.5, z = -1.9, rx = 0, op = 1;
      if (e < 0.8) rx = -0.05 * Math.sin(e * 40) * (e / 0.8);
      else if (e < 2.1) {
        const k = (e - 0.8) / 1.3;
        rx = -k * k * 1.5;
        y = F - 1.5 - k * k * (F - 0.5);
        z = -1.9 - k * 0.8;
      } else {
        const k = e - 2.1;
        rx = -1.4;
        y = -0.5 + Math.sin(k * 1.6) * 0.05;
        z = -2.7 - k * 0.1;
        op = Math.max(0, 1 - k / 16);
      }
      m.position.set(b.x, y, z);
      m.rotation.x = rx;
      (m.material as THREE.MeshBasicMaterial).opacity = op;
      if (op <= 0) {
        b.inizio = -1;
        m.visible = false;
      }
    });
  }
}

/* ------------------------------------------------------------------ figure piccole */

/** Materiale opaco per le figure vicine, illuminate dalla scena. */
const stoffa = (colore: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: colore, roughness: 0.85, ...extra });
const PELLE = "#C9936C";


/* ------------------------------------------------------------------ il flamenco */

/** Un corpo tornito: il profilo è una lista di [raggio, quota]; schiacciato davanti-dietro di "piatto". */
function tornio(profilo: [number, number][], m: THREE.Material, piatto = 0.8, lati = 20) {
  const g = new THREE.LatheGeometry(profilo.map(([r, y]) => new THREE.Vector2(r, y)), lati).scale(1, 1, piatto);
  return new THREE.Mesh(g, m);
}

/** Un braccio a due pezzi (omero, avambraccio) con la mano: si muove dalla spalla e dal gomito. */
type Braccio = { spalla: THREE.Group; gomito: THREE.Group };
function braccio(manica: THREE.Material, pelle: THREE.Material, l1 = 0.28, l2 = 0.26, r = 0.032): Braccio {
  const spalla = new THREE.Group();
  spalla.add(new THREE.Mesh(new THREE.CapsuleGeometry(r, l1, 3, 8).translate(0, -l1 / 2, 0), manica));
  const gomito = new THREE.Group();
  gomito.position.y = -l1;
  gomito.add(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.85, l2, 3, 8).translate(0, -l2 / 2, 0), pelle === manica ? manica : manica));
  const mano = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 10, 8).scale(0.8, 1.25, 0.55).translate(0, -l2 - r, 0), pelle);
  gomito.add(mano);
  spalla.add(gomito);
  return { spalla, gomito };
}

/** Una gamba a due pezzi con la scarpa: dall'anca e dal ginocchio. */
type Gamba = { anca: THREE.Group; ginocchio: THREE.Group };
function gamba(stoffa_: THREE.Material, scarpa: THREE.Material, l1 = 0.44, l2 = 0.42, r = 0.055): Gamba {
  const anca = new THREE.Group();
  anca.add(new THREE.Mesh(new THREE.CapsuleGeometry(r, l1, 3, 8).translate(0, -l1 / 2, 0), stoffa_));
  const ginocchio = new THREE.Group();
  ginocchio.position.y = -l1;
  ginocchio.add(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.85, l2, 3, 8).translate(0, -l2 / 2, 0), stoffa_));
  ginocchio.add(new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, 0.06, r * 3.4).translate(0, -l2 - 0.03, r * 0.9), scarpa));
  anca.add(ginocchio);
  return { anca, ginocchio };
}

/** Testa con collo, capelli, naso e orecchie; davanti verso +z. */
function capo(capelli: THREE.Material, pelle: THREE.Material, crocchia = false) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 10).translate(0, -0.08, 0), pelle));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12).scale(0.9, 1.1, 1), pelle));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.93, 1.1, 1.02).rotateX(-0.45).translate(0, 0.008, -0.006), capelli));
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6).rotateX(Math.PI / 2).translate(0, -0.005, 0.078), pelle));
  if (crocchia) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10).translate(0, 0.02, -0.085), capelli));
  return g;
}

type Musico = { braccioDx?: Braccio; braccioSx?: Braccio; corpo: THREE.Group; tipo: "chitarra" | "palmas" | "cajon"; fase: number };

/**
 * Una zambra del Sacromonte, ai piedi dell'Alhambra: il tablao di tavole su un terrazzo imbiancato, dietro la
 * facciata della grotta con l'arco, i rami e i piatti appesi, una fila di lampadine. In cerchio i musicisti
 * (tre chitarristi seduti, uno sul cajón, tre che battono le palmas), al centro la bailaora col vestito rosso
 * a pois e le balze bianche, il mantón sulle spalle, il fiore nei capelli, che fa il braceo e gira con la coda
 * del vestito che si apre; accanto il bailaor in pantaloni a vita alta e gilet, che batte i piedi.
 * Figure costruite col davanti verso +z; il gruppo è voltato verso chi guarda.
 */
class Flamenco {
  gruppo = new THREE.Group();
  private musici: Musico[] = [];
  private bailaora = new THREE.Group();
  private fianchi = new THREE.Group();
  private balze: THREE.Mesh[] = [];
  private bracciaLei: Braccio[] = [];
  private bailaor = new THREE.Group();
  private gambeLui: Gamba[] = [];
  private bracciaLui: Braccio[] = [];
  private texture: THREE.Texture[] = [];

  constructor() {
    // ai piedi dell'Alhambra, fra la zona dello sviluppatore e il cancello, sopra il muretto della camera:
    // un terrazzo alto quanto basta perché il tablao si veda da quaggiù
    const a = Z + 0.11, d = 24;
    this.gruppo.position.set(Math.sin(a) * d, PAV + 2.4, -Math.cos(a) * d);
    // −z locale verso chi guarda: la grotta (+z) sta dietro
    this.gruppo.rotation.y = Math.PI - a;
    this.gruppo.scale.setScalar(1.6);
    const pelle = stoffa(PELLE), nero = stoffa("#18171C"), bianco = stoffa("#EFEAE0"), legno = stoffa("#6A4628");
    const calce = stoffa("#EDE6D8"), rame = stoffa("#B8693A", { roughness: 0.4, metalness: 0.2 });
    // il terrazzo: il muro di sostegno imbiancato fino a terra, il piano di tavole
    // il pendio sotto il terrazzo, coi fichi d'India: scende fin sotto il pavimento
    {
      const h = 2.4 / 1.6 + 0.2;
      this.gruppo.add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.2, h, 24, 1).scale(1, 1, 0.75).translate(0, -h / 2, 0.4), stoffa("#7C7A4E")));
      this.gruppo.add(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 2.7).translate(0, -0.175, 0.2), calce));
      const fico = stoffa("#5E7A3E");
      for (const [x, y, z] of [[-2.4, -0.6, -0.6], [2.5, -0.9, -0.4], [-1.6, -1.4, -1.6], [1.9, -1.6, -1.5]]) {
        for (let k = 0; k < 4; k++) this.gruppo.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 1.3, 0.35).rotateZ((k - 1.5) * 0.5).translate(x + (k - 1.5) * 0.12, y + 0.18 + (k % 2) * 0.12, z), fico));
      }
    }
    const tavole = tela(256, 64, (x) => {
      for (let i = 0; i < 8; i++) {
        x.fillStyle = i % 2 ? "#8A5E36" : "#7A5230";
        x.fillRect(0, i * 8, 256, 8);
        x.fillStyle = "#5A3A20";
        x.fillRect(0, i * 8 + 7, 256, 1);
      }
    });
    this.texture.push(tavole);
    const piano = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 2.4), [legno, legno, stoffa("#FFFFFF", { map: tavole }), legno, legno, legno]);
    piano.position.set(0, 0.04, 0.1);
    this.gruppo.add(piano);
    // la facciata della grotta, dietro: il muro bianco con l'arco scuro, i rami e i piatti appesi
    this.gruppo.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.2).translate(0, 0.5, 1.65), calce));
    const arco = new THREE.Shape();
    arco.moveTo(-0.35, 0);
    arco.lineTo(-0.35, 0.5);
    arco.absarc(0, 0.5, 0.35, Math.PI, 0, true);
    arco.lineTo(0.35, 0);
    arco.closePath();
    this.gruppo.add(new THREE.Mesh(new THREE.ShapeGeometry(arco).rotateY(Math.PI).translate(0, 0.08, 1.54), stoffa("#2A1C14")));
    for (let k = 0; k < 6; k++) {
      const x = -1.85 + k * 0.32 + (k > 2 ? 1.9 : 0);
      const piatto = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16).rotateY(Math.PI).translate(x, 0.55 + (k % 2) * 0.2, 1.54), k % 3 ? rame : stoffa("#2E5E9A"));
      this.gruppo.add(piatto);
    }
    // la fila di lampadine accese, appesa sopra il tablao
    const lampadine: number[] = [];
    for (let k = 0; k <= 20; k++) {
      const u = k / 20, x = -1.9 + u * 3.8;
      lampadine.push(x, 2.05 - Math.sin(u * Math.PI) * 0.35, 0.9 - Math.sin(u * Math.PI) * 0.2);
    }
    const txL = alone("#FFD08A");
    this.texture.push(txL);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lampadine, 3));
    this.gruppo.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: txL, color: "#FFD08A", size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    // i musicisti in semicerchio, verso il centro e verso chi guarda: angoli dal fondo (+z)
    // tutti sul fondo, in arco: il davanti resta libero per il ballo
    const posti: [number, Musico["tipo"]][] = [[-1.55, "palmas"], [-1.05, "chitarra"], [-0.52, "chitarra"], [0, "cajon"], [0.52, "chitarra"], [1.05, "palmas"], [1.55, "palmas"]];
    posti.forEach(([ang, tipo], i) => {
      const x = Math.sin(ang) * 1.4, z = 0.3 + Math.cos(ang) * 0.85;
      const g = new THREE.Group();
      g.position.set(x, 0.08, z);
      g.rotation.y = Math.atan2(-x, 0.2 - z);
      const camicia = i % 2 ? nero : bianco;
      const m: Musico = { corpo: g, tipo, fase: i * 0.7 };
      const seduto = tipo !== "palmas";
      const yA = seduto ? 0.42 : 0.88;
      // le gambe: in piedi dritte, sedute con le cosce in avanti
      for (const sx of [-1, 1]) {
        const gg = gamba(nero, nero, 0.4, 0.4, 0.065);
        gg.anca.position.set(sx * 0.07, yA, 0);
        if (seduto) {
          gg.anca.rotation.x = -Math.PI / 2;
          gg.ginocchio.rotation.x = Math.PI / 2;
        }
        g.add(gg.anca);
      }
      if (tipo === "cajon") g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28).translate(0, 0.21, -0.05), legno));
      else if (seduto) {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.3).translate(0, 0.4, -0.04), legno));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.03).translate(0, 0.62, -0.18), legno));
        for (const [lx, lz] of [[-0.14, -0.16], [0.14, -0.16], [-0.14, 0.09], [0.14, 0.09]]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03).translate(lx, 0.2, lz), legno));
      }
      // il busto, la testa
      const busto = new THREE.Group();
      busto.position.y = yA;
      busto.add(tornio([[0.0, 0], [0.15, 0.02], [0.16, 0.15], [0.17, 0.32], [0.19, 0.42], [0.11, 0.5], [0, 0.5]], camicia));
      const t = capo(stoffa("#1A1410"), pelle);
      t.position.y = 0.62;
      busto.add(t);
      g.add(busto);
      const bd = braccio(camicia, pelle, 0.25, 0.24, 0.03), bs = braccio(camicia, pelle, 0.25, 0.24, 0.03);
      bd.spalla.position.set(-0.17, 0.44, 0);
      bs.spalla.position.set(0.17, 0.44, 0);
      busto.add(bd.spalla, bs.spalla);
      m.braccioDx = bd;
      m.braccioSx = bs;
      if (tipo === "chitarra") {
        // la chitarra di traverso sulla coscia destra, il manico in su a sinistra
        const ch = new THREE.Group();
        const cassa = stoffa("#C88A44"), fasce = stoffa("#7A4A26");
        const s = new THREE.Shape();
        s.absarc(-0.07, 0, 0.11, Math.PI * 0.35, Math.PI * 1.65, false);
        s.absarc(0.08, 0, 0.085, Math.PI * 1.25, Math.PI * 0.75, false);
        ch.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), [cassa, fasce]));
        ch.add(new THREE.Mesh(new THREE.CircleGeometry(0.03, 14).translate(0.0, 0, 0.037), stoffa("#2A1E14")));
        ch.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.03).translate(0.32, 0, 0), stoffa("#3A2418")));
        ch.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.025).translate(0.54, 0, 0), stoffa("#3A2418")));
        ch.position.set(-0.03, yA + 0.2, 0.2);
        ch.rotation.set(0.15, 0, 0.55);
        g.add(ch);
        bd.spalla.rotation.set(-0.7, 0, -0.35);
        bd.gomito.rotation.set(-0.9, 0, 0);
        bs.spalla.rotation.set(-1.0, 0, 0.55);
        bs.gomito.rotation.set(-0.6, 0, 0.6);
      } else if (tipo === "cajon") {
        busto.rotation.x = 0.3;
      }
      this.gruppo.add(g);
      this.musici.push(m);
    });

    // la bailaora
    const rosso = stoffa("#B5142C"), balzaB = stoffa("#F3EADB", { side: THREE.DoubleSide });
    const pois = tela(128, 128, (x) => {
      x.fillStyle = "#B5142C";
      x.fillRect(0, 0, 128, 128);
      x.fillStyle = "#F3EADB";
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
        x.beginPath();
        x.arc(c * 22 + (r % 2) * 11 + 6, r * 22 + 8, 4, 0, Math.PI * 2);
        x.fill();
      }
    });
    pois.wrapS = pois.wrapT = THREE.RepeatWrapping;
    pois.repeat.set(4, 3);
    this.texture.push(pois);
    const vestito = stoffa("#FFFFFF", { map: pois, side: THREE.DoubleSide });
    this.bailaora.position.set(-0.35, 0.08, -0.45);
    this.bailaora.add(this.fianchi);
    // il vestito a sirena: stretto ai fianchi e alle ginocchia, poi si apre in tre balze
    this.fianchi.add(tornio([[0.12, 1.0], [0.16, 0.85], [0.15, 0.6], [0.14, 0.45], [0.2, 0.32], [0.28, 0.18]].reverse() as [number, number][], vestito, 0.85, 28));
    [[0.3, 0.2, 0.16, balzaB], [0.36, 0.1, 0.12, vestito], [0.44, 0.0, 0.11, balzaB]].forEach(([r, y, h, m]) => {
      const g = new THREE.CylinderGeometry((r as number) - 0.07, r as number, h as number, 32, 1, true).translate(0, (y as number) + (h as number) / 2, 0);
      // l'orlo a onde
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < (y as number) + 0.01) p.setY(i, p.getY(i) + 0.02 * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 12));
      const mesh = new THREE.Mesh(g, m as THREE.Material);
      this.fianchi.add(mesh);
      this.balze.push(mesh);
    });
    // il corpetto, la testa con la crocchia, il fiore e gli orecchini
    this.bailaora.add(tornio([[0.12, 1.0], [0.13, 1.1], [0.14, 1.22], [0.15, 1.32], [0.08, 1.38], [0, 1.38]], rosso, 0.75));
    // la scollatura e le maniche corte a volant bianche
    for (const sx of [-1, 1]) this.bailaora.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 10, 1, true).translate(sx * 0.16, 1.28, 0), balzaB));
    const lei = capo(stoffa("#120E0C"), pelle, true);
    lei.position.y = 1.5;
    lei.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).translate(0.065, 0.05, -0.03), stoffa("#D8263A")));
    for (const sx of [-1, 1]) lei.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5).translate(sx * 0.07, -0.03, 0), stoffa("#D8B24C", { metalness: 0.3, roughness: 0.3 })));
    this.bailaora.add(lei);
    for (const sx of [-1, 1]) {
      const b = braccio(rosso, pelle, 0.27, 0.25, 0.027);
      b.spalla.position.set(sx * 0.15, 1.32, 0);
      this.bailaora.add(b.spalla);
      this.bracciaLei.push(b);
    }
    this.gruppo.add(this.bailaora);

    // il bailaor: pantaloni neri a vita alta, camicia bianca, gilet corto nero aperto
    this.bailaor.position.set(0.5, 0.08, -0.3);
    for (const sx of [-1, 1]) {
      const gg = gamba(nero, nero, 0.46, 0.44, 0.055);
      gg.anca.position.set(sx * 0.075, 0.96, 0);
      this.bailaor.add(gg.anca);
      this.gambeLui.push(gg);
    }
    this.bailaor.add(tornio([[0.0, 0.92], [0.15, 0.94], [0.15, 1.08]], nero, 0.8));
    this.bailaor.add(tornio([[0.14, 1.08], [0.16, 1.25], [0.19, 1.42], [0.1, 1.5], [0, 1.5]], bianco, 0.75));
    for (const sx of [-1, 1]) this.bailaor.add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.3, 0.26).translate(sx * 0.11, 1.27, 0), nero));
    const lui = capo(stoffa("#1A1410"), pelle);
    lui.position.y = 1.62;
    this.bailaor.add(lui);
    for (const sx of [-1, 1]) {
      const b = braccio(bianco, pelle, 0.29, 0.27, 0.032);
      b.spalla.position.set(sx * 0.19, 1.44, 0);
      this.bailaor.add(b.spalla);
      this.bracciaLui.push(b);
    }
    this.gruppo.add(this.bailaor);
  }

  aggiorna(t: number) {
    const compas = t * 2.6;
    this.musici.forEach((m) => {
      if (m.tipo === "chitarra" && m.braccioDx) m.braccioDx.gomito.rotation.x = -0.9 + Math.sin(t * 14 + m.fase) * 0.25;
      else if (m.tipo === "palmas" && m.braccioDx && m.braccioSx) {
        const batti = Math.pow(Math.abs(Math.sin(compas * Math.PI * 0.5 + m.fase)), 3);
        [m.braccioDx, m.braccioSx].forEach((b, k) => {
          b.spalla.rotation.set(-0.5, 0, (k ? 1 : -1) * 0.25);
          b.gomito.rotation.set(-1.4, 0, (k ? -1 : 1) * (0.5 + 0.4 * (1 - batti)));
        });
      } else if (m.tipo === "cajon" && m.braccioDx && m.braccioSx) {
        [m.braccioDx, m.braccioSx].forEach((b, k) => {
          b.spalla.rotation.set(-0.3, 0, (k ? 1 : -1) * 0.15);
          b.gomito.rotation.set(-0.4 - 0.4 * Math.abs(Math.sin(t * 7 + k * 1.6)), 0, 0);
        });
      }
      m.corpo.position.y = 0.08 + (m.tipo === "palmas" ? Math.abs(Math.sin(compas * Math.PI * 0.5)) * 0.01 : 0);
    });
    // la bailaora: ondeggia coi fianchi, il braceo con le braccia alte; ogni cinque secondi un giro, e le balze si aprono
    const ciclo = t % 5;
    const giro = ciclo < 1.2 ? THREE.MathUtils.smootherstep(ciclo, 0, 1.2) : 1;
    const velocita = ciclo < 1.2 ? Math.sin((ciclo / 1.2) * Math.PI) : 0;
    this.bailaora.rotation.y = Math.floor(t / 5) * Math.PI * 2 + giro * Math.PI * 2 + Math.sin(t * 0.9) * 0.5;
    this.fianchi.rotation.z = Math.sin(t * 1.8) * 0.05;
    this.balze.forEach((b, k) => b.scale.set(1 + velocita * (0.3 + k * 0.15), 1 - velocita * 0.1, 1 + velocita * (0.3 + k * 0.15)));
    this.bracciaLei.forEach((b, k) => {
      const s = k ? 1 : -1;
      b.spalla.rotation.set(Math.sin(t * 1.7 + k) * 0.25, 0, s * (2.4 + Math.sin(t * 2.2 + k * 2) * 0.3));
      b.gomito.rotation.set(0, 0, s * (0.6 + 0.4 * Math.sin(t * 2.2 + k * 2 + 1)));
    });
    // il bailaor: zapateado, i piedi che battono a turno; un braccio in alto, l'altro sul fianco
    this.gambeLui.forEach((g, k) => {
      const su = Math.max(0, Math.sin(t * 13 + k * Math.PI));
      g.anca.rotation.x = -su * 0.35;
      g.ginocchio.rotation.x = su * 0.6;
    });
    this.bailaor.position.y = 0.08 + Math.abs(Math.sin(t * 13)) * 0.01;
    this.bailaor.rotation.y = Math.PI + Math.sin(t * 0.6) * 0.6 - 0.3;
    this.bracciaLui[0].spalla.rotation.set(0, 0, -2.6 + Math.sin(t * 1.4) * 0.2);
    this.bracciaLui[0].gomito.rotation.set(0, 0, -0.5);
    this.bracciaLui[1].spalla.rotation.set(0.2, 0, 0.5);
    this.bracciaLui[1].gomito.rotation.set(-1.6, 0, 0);
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}

/* ------------------------------------------------------------------ l'insieme */

export class Luoghi {
  gruppo = new THREE.Group();
  private giorno = new THREE.Group();
  private sempre = new THREE.Group();
  /** Le figure piccole vicine, solo di giorno: illuminate dalla scena, senza colori cotti. */
  private vicini = new THREE.Group();
  private vivi: { aggiorna?: (t: number, camera: THREE.Camera) => void; libera?: () => void }[] = [];
  private texture: THREE.Texture[] = [];

  constructor(notte: boolean) {
    const A = ATTIVI;
    if (A.puntaSecca) this.giorno.add(puntaSecca());
    if (A.barocco) this.giorno.add(colleBarocco());
    if (A.sieteColores) this.giorno.add(sieteColores());
    if (A.obelisco) this.giorno.add(obelisco());
    if (A.iguazu) {
      const i = new Iguazu();
      this.giorno.add(i.gruppo);
      this.vivi.push({ aggiorna: (t) => i.aggiorna(t), libera: () => i.libera() });
    }
    if (A.peritoMoreno) {
      const m = new PeritoMoreno();
      this.giorno.add(m.gruppo);
      this.vivi.push({ aggiorna: (t) => m.aggiorna(t) });
    }
    if (A.liotru) {
      const l = new Liotru();
      this.sempre.add(l.gruppo);
      this.vivi.push({ libera: () => l.libera() });
    }
    if (A.flamenco) {
      const f = new Flamenco();
      this.vicini.add(f.gruppo);
      this.vivi.push({ aggiorna: (t) => f.aggiorna(t), libera: () => f.libera() });
    }
    this.gruppo.add(this.giorno, this.sempre, this.vicini);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
    });
    this.giorno.traverse((o) => {
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(notte);
  }

  setNotte(notte: boolean) {
    this.giorno.visible = !notte;
    this.vicini.visible = !notte;
  }

  aggiorna(t: number, camera: THREE.Camera) {
    this.vivi.forEach((v) => v.aggiorna?.(t, camera));
  }

  libera() {
    this.vivi.forEach((v) => v.libera?.());
    liberaTutto(this.gruppo, this.texture);
  }
}
