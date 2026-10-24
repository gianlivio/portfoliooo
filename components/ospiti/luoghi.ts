import * as THREE from "three";
import { ANGOLO_ZONA, PASSO } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { bruma, generatore, liberaTutto, tela } from "./comuni";
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
 * Madre; sul fianco destro la cupola di maiolica dell'Itria.
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
  const colle = (x: number, z: number) =>
    Math.max(0, 5.2 * Math.exp(-((x * x) / 30 + ((z - 1.2) * (z - 1.2)) / 9)) + 1.3 * Math.exp(-(((x - px) * (x - px)) / 1.6 + ((z - pz) * (z - pz)) / 2)) + 0.1 * Math.sin(x * 2 + z)) - 0.3;
  p.push(colora(rilievo(-12, 12, -3, 6, 72, 24, colle), "#8C8A5A", 0.24, (q) => new THREE.Color(q.y > 1.2 ? "#A89C78" : "#6F7E48")));
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

/** La Garganta del Diablo: la gola a ferro di cavallo, l'acqua che cade, la nebbia, l'arcobaleno, la foresta sul bordo. */
class Iguazu {
  gruppo: THREE.Group;
  private acqua: THREE.Texture;
  private nebbia: THREE.Sprite[] = [];
  private texture: THREE.Texture[] = [];
  constructor() {
    // a terra, ai piedi del Cerro de los Siete Colores
    this.gruppo = sulRing(Z + 1.97, 36, 0);
    this.gruppo.scale.setScalar(1.6);
    const p: Pezzi = [];
    const R = 3.4, H = 3.8, N = 48;
    const arco = (rr: number, y0: number, y1: number) => {
      const g = new THREE.BufferGeometry();
      const pos: number[] = [], uv: number[] = [];
      for (let i = 0; i < N; i++) {
        const t0 = -1.55 + (3.1 * i) / N, t1 = -1.55 + (3.1 * (i + 1)) / N;
        const a = [Math.sin(t0) * rr, Math.cos(t0) * rr], b = [Math.sin(t1) * rr, Math.cos(t1) * rr];
        pos.push(a[0], y0, a[1], b[0], y1, b[1], b[0], y0, b[1], a[0], y0, a[1], a[0], y1, a[1], b[0], y1, b[1]);
        const u0 = i / N, u1 = (i + 1) / N;
        uv.push(u0, 0, u1, 1, u1, 0, u0, 0, u0, 1, u1, 1);
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      return g;
    };
    // la roccia: basalto scuro, muschio in alto
    p.push(colora(arco(R + 0.15, -0.3, H), "#3E3A35", 0.18, (q) => new THREE.Color(q.y > H - 0.6 ? "#4E6A3A" : "#3E3A35")));
    // il bordo della foresta: chiome fitte sul ciglio e dietro
    const r = generatore(5);
    for (let i = 0; i < 260; i++) {
      const t = -1.9 + r() * 3.8, rr = R + 0.3 + r() * 2.6;
      p.push(colora(new THREE.IcosahedronGeometry(0.14 + r() * 0.18, 0).translate(Math.sin(t) * rr, H + 0.1 + r() * 0.4, Math.cos(t) * rr), r() < 0.5 ? "#3F6B34" : "#517C3E", 0.2));
    }
    // il fondo della gola: acqua bianca di schiuma
    p.push(colora(new THREE.CircleGeometry(R, 32).rotateX(-Math.PI / 2).translate(0, -0.25, 0), "#E8F1F2", 0.15));
    this.gruppo.add(unisci(p));
    // l'acqua che cade: righe chiare che scorrono verso il basso
    this.acqua = tela(64, 128, (x) => {
      x.clearRect(0, 0, 64, 128);
      for (let i = 0; i < 40; i++) {
        const cx = Math.random() * 64, w = 1 + Math.random() * 3;
        const v = x.createLinearGradient(0, 0, 0, 128);
        v.addColorStop(0, "rgba(255,255,255,0.95)");
        v.addColorStop(0.5, "rgba(214,232,240,0.75)");
        v.addColorStop(1, "rgba(255,255,255,0.95)");
        x.fillStyle = v;
        x.fillRect(cx, 0, w, 128);
      }
    });
    this.acqua.wrapS = this.acqua.wrapT = THREE.RepeatWrapping;
    this.acqua.repeat.set(10, 1.5);
    this.texture.push(this.acqua);
    const velo = new THREE.Mesh(arco(R, -0.2, H - 0.05), new THREE.MeshBasicMaterial({ map: this.acqua, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.gruppo.add(velo);
    // la nebbia in basso e l'arcobaleno davanti
    const tb = bruma(11);
    this.texture.push(tb);
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tb, color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      const t = -1.3 + k * 0.43;
      s.position.set(Math.sin(t) * (R - 0.6), 0.6, Math.cos(t) * (R - 0.6));
      s.scale.setScalar(2.2);
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
    const arcobaleno = new THREE.Sprite(new THREE.SpriteMaterial({ map: iride, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    arcobaleno.position.set(0, 1.4, -1.6);
    arcobaleno.scale.set(5, 2.5, 1);
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

function sieteColores() {
  const g = sulRing(Z + 1.9, 44, 0);
  const fasce = ["#B4513B", "#D98C6E", "#C9A15A", "#7F8A58", "#8C5E7C", "#9A8F86", "#E2CBA6", "#A85A3E"].map((c) => new THREE.Color(c));
  const h = (x: number, z: number) => {
    const k = Math.max(0, 1 - (x / 9) ** 2) * Math.sin(((z + 1) / 7) * Math.PI);
    return Math.max(0, k * (6.5 + 1.2 * Math.abs(Math.sin(x * 1.7)) + 0.6 * Math.sin(x * 4.1 + z))) - 0.3;
  };
  const m = unisci([
    colora(rilievo(-9.5, 9.5, -1, 6, 90, 30, h), "#B4513B", 0.2, (q) => {
      // gli strati inclinati: il colore dipende dalla quota e un poco dalla posizione, come rocce piegate
      const s = q.y * 0.95 + q.x * 0.12 + Math.sin(q.x * 0.6) * 0.35;
      return fasce[((Math.floor(s) % fasce.length) + fasce.length) % fasce.length].clone();
    }),
  ]);
  g.add(m);
  return g;
}

/* ------------------------------------------------------------------ l'Obelisco */

function obelisco() {
  const g = sulRing(Z + 1.72, 33, 0);
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

/** Rifatto: un fronte alto a guglie con le fenditure blu profonde, la lingua che scende fra le montagne, i blocchi che cadono. */
class PeritoMoreno {
  gruppo: THREE.Group;
  private blocchi: { m: THREE.Mesh; inizio: number; x: number }[] = [];
  private prossimo = 6;
  private r = generatore(57);
  private F = 3.2;
  constructor() {
    // con le altre cose argentine, il fronte che cade nel Lago Argentino, a pelo d'acqua
    this.gruppo = sulRing(Z + 2.3, 40, 0);
    this.gruppo.scale.setScalar(1.4);
    const p: Pezzi = [];
    const F = this.F;
    // le Ande dietro: granito scuro, neve in alto
    p.push(colora(rilievo(-8, 8, 8, 11, 64, 6, (x, z) => (8.5 + 2.6 * Math.abs(Math.sin(x * 0.7 + 0.4)) + 1.4 * Math.abs(Math.sin(x * 2.1))) * Math.sin(((z - 8) / 3) * Math.PI) * (1 - Math.pow(x / 8, 4)) - 0.8), "#4B4A52", 0.36, (q) => new THREE.Color(q.y > 7 + Math.sin(q.x * 2) * 0.6 ? "#F4F7FA" : "#4B4A52")));
    // i fianchi della valle: bosco scuro in basso, roccia, neve
    for (const s of [-1, 1]) {
      p.push(colora(rilievo(s < 0 ? -8 : 5.2, s < 0 ? -5.2 : 8, -3, 8, 16, 22, (x, z) => {
        const d = Math.min(1, Math.max(0, (Math.abs(x) - 5.2) / 2.5));
        return (4.6 + 1.2 * Math.sin(z * 0.7 + x)) * Math.pow(d, 0.7) * Math.min(1, (z + 3) / 2) - 0.4;
      }), "#3E5E3A", 0.26, (q) => new THREE.Color(q.y > 4.9 ? "#EEF2F5" : q.y > 3.2 ? "#6A6971" : "#3E5E3A")));
    }
    // la lingua: sale verso le montagne, irta di seracchi aguzzi
    const sup = (x: number, z: number) => F + Math.max(0, z + 1.5) * 0.36 + 0.4 * Math.pow(Math.abs(Math.sin(x * 4.3 + z * 2.9)), 6) + 0.18 * Math.abs(Math.sin(z * 5.1 - x * 1.3));
    p.push(colora(rilievo(-5.4, 5.4, -1.5, 8, 80, 50, sup), "#EEF5FA", 0.2, (q) => {
      const c = new THREE.Color("#F2F7FB");
      const crepa = Math.pow(Math.abs(Math.sin(q.x * 4.3 + q.z * 2.9)), 6);
      if (crepa < 0.08) c.lerp(new THREE.Color("#5E9ED0"), 0.6);
      for (const mx of [-2.6, 0.3, 2.9]) if (Math.abs(q.x - mx - Math.sin(q.z * 0.5) * 0.3) < 0.14) c.lerp(new THREE.Color("#6B6762"), 0.7);
      return c;
    }));
    // il fronte: colonne di ghiaccio, fenditure blu profondo, guglie in cima
    {
      const N = 140, pos: number[] = [];
      const cima = (x: number) => sup(x, -1.5) + 0.7 * Math.pow(Math.abs(Math.sin(x * 3.7)), 4) + 0.25 * Math.sin(x * 11.3);
      for (let i = 0; i < N; i++) {
        const x0 = -5.4 + (10.8 * i) / N, x1 = -5.4 + (10.8 * (i + 1)) / N;
        const z0 = -1.5 - 0.18 * Math.abs(Math.sin(i * 0.9)), z1 = -1.5 - 0.18 * Math.abs(Math.sin((i + 1) * 0.9));
        pos.push(x0, 0, z0, x1, cima(x1), z1, x1, 0, z1, x0, 0, z0, x0, cima(x0), z0, x1, cima(x1), z1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      p.push(colora(geo, "#A9D3EC", 0.12, (q) => {
        const fessura = Math.abs(Math.sin(q.x * 6.3 + Math.sin(q.x * 1.7) * 2.4)) < 0.22;
        const base = new THREE.Color("#2A6FAE").lerp(new THREE.Color("#DDEFF9"), Math.min(1, q.y / F) * 0.6);
        return fessura ? base.lerp(new THREE.Color("#1F5E99"), 0.6) : base;
      }));
    }
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

/** Un pezzo appeso a un perno: il gruppo ruota attorno al perno, il pezzo pende verso il basso per "lungo". */
function arto(materiale: THREE.Material, raggio: number, lungo: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(raggio, lungo, 3, 8).translate(0, -lungo / 2, 0), materiale));
  return g;
}

/** Testa con i capelli: la pelle davanti, la calotta scura dietro e sopra. */
function testa(capelli: string, r = 0.075) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), stoffa(PELLE)));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.5), stoffa(capelli)));
  return g;
}

/* ------------------------------------------------------------------ il flamenco */

type Musico = { braccio?: THREE.Group; mani?: THREE.Group[]; corpo: THREE.Group; tipo: "chitarra" | "palmas" | "cajon"; fase: number };

/**
 * Ai piedi di Granada, dietro le carte, come il Liotru ai piedi dell'Etna: un tablao rotondo, i musicisti in cerchio
 * (tre chitarristi seduti, uno sul cajón, due che battono le palmas) e al centro una bailaora col vestito rosso
 * a balze che gira su sé stessa con le braccia alte, e un bailaor che batte i piedi.
 * Le figure sono costruite col davanti verso +z e voltate verso il centro.
 */
class Flamenco {
  gruppo = new THREE.Group();
  private musici: Musico[] = [];
  private bailaora = new THREE.Group();
  private gonna = new THREE.Group();
  private braccia: THREE.Group[] = [];
  private bailaor = new THREE.Group();
  private gambe: THREE.Group[] = [];
  private bracciaLui: THREE.Group[] = [];

  constructor() {
    // nel varco fra due carte, sotto l'Albaicín
    const a = Z - PASSO * 1.5, d = 9.9;
    this.gruppo.position.set(Math.sin(a) * d, PAV, -Math.cos(a) * d);
    this.gruppo.rotation.y = Math.PI - a;
    // il tablao
    this.gruppo.add(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.6, 0.05, 40).translate(0, 0.025, 0), stoffa("#8A6440")));
    const legno = stoffa("#5E3F26");
    const nero = stoffa("#1D1C21");
    // il cerchio: angoli misurati dal fondo (+z, lontano da chi guarda); davanti resta aperto
    const posti: [number, Musico["tipo"]][] = [[-2.2, "palmas"], [-1.35, "chitarra"], [-0.55, "chitarra"], [0.25, "cajon"], [1.0, "chitarra"], [1.8, "palmas"], [2.45, "palmas"]];
    posti.forEach(([ang, tipo], i) => {
      const x = Math.sin(ang) * 1.25, z = Math.cos(ang) * 1.25;
      const g = new THREE.Group();
      g.position.set(x, 0.05, z);
      g.rotation.y = Math.atan2(-x, -z);
      const camicia = stoffa(i % 2 ? "#1D1C21" : "#E9E4DA");
      const m: Musico = { corpo: g, tipo, fase: i * 0.7 };
      if (tipo === "palmas") {
        // in piedi, le mani davanti al petto che si battono
        for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.09).translate(sx * 0.055, 0.23, 0), nero));
        g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 3, 8).translate(0, 0.62, 0), camicia));
        const tt = testa("#1A1410");
        tt.position.y = 0.9;
        g.add(tt);
        m.mani = [-1, 1].map((sx) => {
          const b = arto(camicia, 0.025, 0.2);
          b.position.set(sx * 0.12, 0.76, 0.02);
          g.add(b);
          return b;
        });
      } else {
        // seduto: sedia o cajón, cosce in avanti, stinchi giù
        if (tipo === "cajon") g.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.26).translate(0, 0.2, -0.02), legno));
        else {
          g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.28).translate(0, 0.38, -0.02), legno));
          g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.03).translate(0, 0.56, -0.16), legno));
          for (const [lx, lz] of [[-0.13, -0.14], [0.13, -0.14], [-0.13, 0.11], [0.13, 0.11]]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03).translate(lx, 0.19, lz), legno));
        }
        const yS = tipo === "cajon" ? 0.4 : 0.4;
        for (const sx of [-1, 1]) {
          g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.3).translate(sx * 0.06, yS + 0.04, 0.1), nero));
          g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, yS, 0.08).translate(sx * 0.06, yS / 2, 0.24), nero));
        }
        const busto = new THREE.Group();
        busto.position.y = yS + 0.06;
        busto.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 3, 8).translate(0, 0.2, 0), camicia));
        const tt = testa("#1A1410");
        tt.position.y = 0.48;
        busto.add(tt);
        g.add(busto);
        if (tipo === "chitarra") {
          // la chitarra sulla coscia destra, il manico in su verso sinistra
          const ch = new THREE.Group();
          const cassa = stoffa("#C88A44");
          ch.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10).scale(1, 1, 0.3).translate(-0.06, 0, 0), cassa));
          ch.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10).scale(1, 1, 0.3).translate(0.07, 0, 0), cassa));
          ch.add(new THREE.Mesh(new THREE.CircleGeometry(0.025, 12).translate(0.0, 0, 0.032), stoffa("#2A1E14")));
          ch.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02).translate(0.31, 0, 0), legno));
          ch.position.set(-0.02, yS + 0.2, 0.17);
          ch.rotation.z = 0.5;
          g.add(ch);
          // il braccio destro che fa il rasgueado sulla buca, il sinistro sul manico
          const dx = arto(camicia, 0.025, 0.24);
          dx.position.set(-0.12, yS + 0.36, 0.02);
          dx.rotation.set(-0.9, 0, -0.2);
          g.add(dx);
          m.braccio = dx;
          const sx = arto(camicia, 0.025, 0.26);
          sx.position.set(0.12, yS + 0.36, 0.02);
          sx.rotation.set(-1.0, 0, 0.9);
          g.add(sx);
        } else {
          // il cajón: le mani battono sul legno fra le ginocchia
          busto.rotation.x = 0.35;
          m.mani = [-1, 1].map((sx) => {
            const b = arto(camicia, 0.025, 0.26);
            b.position.set(sx * 0.11, yS + 0.33, 0.06);
            g.add(b);
            return b;
          });
        }
      }
      this.gruppo.add(g);
      this.musici.push(m);
    });

    // la bailaora: il vestito rosso a balze, il busto stretto, le braccia alte, il fiore nei capelli
    const rosso = stoffa("#B5142C"), rossoScuro = stoffa("#8C0E22"), balza = stoffa("#F2E6D8");
    this.bailaora.position.set(-0.32, 0.05, 0.05);
    const balze: [number, number, number, number, THREE.Material][] = [[0.085, 0.13, 0.5, 0.2, rosso], [0.12, 0.19, 0.32, 0.2, rossoScuro], [0.18, 0.26, 0.12, 0.22, rosso], [0.255, 0.28, 0.06, 0.07, balza]];
    balze.forEach(([r0, r1, y, h, m]) => this.gonna.add(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 24, 1, true).translate(0, y + h / 2 - 0.03, 0), (m as THREE.MeshStandardMaterial).clone())));
    this.gonna.children.forEach((c) => (((c as THREE.Mesh).material as THREE.MeshStandardMaterial).side = THREE.DoubleSide));
    this.bailaora.add(this.gonna);
    this.bailaora.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 3, 8).translate(0, 0.78, 0), rosso));
    const lei = testa("#120E0C", 0.07);
    lei.position.y = 1.0;
    lei.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8).translate(0, 0.02, -0.08), stoffa("#120E0C")));
    lei.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).translate(0.06, 0.05, -0.02), stoffa("#D8263A")));
    this.bailaora.add(lei);
    for (const sx of [-1, 1]) {
      const b = arto(stoffa(PELLE), 0.022, 0.3);
      b.position.set(sx * 0.09, 0.88, 0);
      this.bailaora.add(b);
      this.braccia.push(b);
    }
    this.gruppo.add(this.bailaora);

    // il bailaor: pantaloni neri a vita alta, camicia bianca, gilet corto; batte i piedi
    this.bailaor.position.set(0.36, 0.05, 0.12);
    for (const sx of [-1, 1]) {
      const gamba = arto(nero, 0.045, 0.42);
      gamba.position.set(sx * 0.06, 0.5, 0);
      this.bailaor.add(gamba);
      this.gambe.push(gamba);
    }
    this.bailaor.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 3, 8).translate(0, 0.72, 0), stoffa("#EEE9E0")));
    this.bailaor.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.17).translate(0, 0.7, 0), nero));
    const lui = testa("#1A1410", 0.072);
    lui.position.y = 1.0;
    this.bailaor.add(lui);
    for (const sx of [-1, 1]) {
      const b = arto(stoffa("#EEE9E0"), 0.025, 0.3);
      b.position.set(sx * 0.12, 0.86, 0);
      this.bailaor.add(b);
      this.bracciaLui.push(b);
    }
    this.gruppo.add(this.bailaor);
  }

  aggiorna(t: number) {
    const compas = t * 2.6;
    this.musici.forEach((m) => {
      if (m.braccio) m.braccio.rotation.x = -0.9 + Math.sin(t * 14 + m.fase) * 0.22;
      if (m.mani) {
        const batti = Math.pow(Math.abs(Math.sin(compas * Math.PI * 0.5 + m.fase)), 3);
        if (m.tipo === "palmas") m.mani.forEach((b, k) => b.rotation.set(-1.3, 0, (k ? 1 : -1) * (0.15 + 0.35 * (1 - batti))));
        else m.mani.forEach((b, k) => b.rotation.set(-0.5 - 0.35 * Math.abs(Math.sin(t * 7 + k * 1.6)), 0, 0));
      }
      m.corpo.position.y = 0.05 + (m.tipo === "palmas" ? Math.abs(Math.sin(compas * Math.PI * 0.5)) * 0.01 : 0);
    });
    // la bailaora: ondeggia, e ogni cinque secondi fa un giro completo, con la gonna che si apre
    const ciclo = t % 5;
    const giro = ciclo < 1.2 ? THREE.MathUtils.smootherstep(ciclo, 0, 1.2) : 1;
    const velocita = ciclo < 1.2 ? Math.sin((ciclo / 1.2) * Math.PI) : 0;
    this.bailaora.rotation.y = Math.floor(t / 5) * Math.PI * 2 + giro * Math.PI * 2 + Math.sin(t * 0.9) * 0.5;
    this.gonna.scale.set(1 + velocita * 0.35, 1 - velocita * 0.08, 1 + velocita * 0.35);
    this.braccia.forEach((b, k) => {
      const s = k ? 1 : -1;
      b.rotation.set(Math.sin(t * 1.7 + k) * 0.3, 0, s * (2.5 + Math.sin(t * 2.2 + k * 2) * 0.35));
    });
    // il bailaor: zapateado, i piedi che battono a turno; il busto dritto, un braccio in alto, l'altro al fianco
    this.gambe.forEach((g, k) => (g.rotation.x = -Math.max(0, Math.sin(t * 13 + k * Math.PI)) * 0.45));
    this.bailaor.position.y = 0.05 + Math.abs(Math.sin(t * 13)) * 0.012;
    this.bailaor.rotation.y = Math.PI * 0.15 + Math.sin(t * 0.6) * 0.6;
    this.bracciaLui[0].rotation.set(0, 0, -2.6 + Math.sin(t * 1.4) * 0.2);
    this.bracciaLui[1].rotation.set(0.2, 0, 0.6);
  }

  libera() {
    liberaTutto(this.gruppo);
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
