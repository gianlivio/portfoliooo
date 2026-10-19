import * as THREE from "three";
import { ANGOLO_ZONA } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { bruma, generatore, liberaTutto, tela } from "./comuni";
import { colora, rilievo, sulRing, unisci } from "./meraviglie";

/*
 * I luoghi di Livio, da valutare uno per uno: ognuno si accende o si spegne in ATTIVI.
 * Sicilia: Punta Secca col faro e la casa di Montalbano, Comiso (la cupola azzurra dell'Annunziata, la pagoda
 * della pace), Ragusa Ibla col Duomo di San Giorgio, San Giorgio di Modica sulla scalinata,
 * il Liotru ai piedi dell'Etna. Argentina: le cascate dell'Iguazú, il Cerro de los Siete Colores, l'Obelisco,
 * il Perito Moreno rifatto. E a terra una maschera sola che cambia: uno, nessuno e centomila.
 * Gli angoli sono contati dalla zona dello sviluppatore; i posti scelti cadono negli spazi fra le carte
 * o dietro le carte più basse.
 */
export const ATTIVI = {
  puntaSecca: true,
  comiso: true,
  ibla: true,
  modica: true,
  liotru: true,
  iguazu: true,
  sieteColores: true,
  obelisco: true,
  peritoMoreno: true,
  maschere: true,
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

/* ------------------------------------------------------------------ Punta Secca */

/** Il faro bianco sulla punta, la casa di Montalbano sulla spiaggia con la terrazza sul mare, due barche. */
function puntaSecca() {
  const g = sulRing(Z + 2.66, 37, 2.4);
  g.scale.setScalar(1.2);
  const p: Pezzi = [];
  zoccolo(p, 7, 3, 2.6, "#B9A77E", 1.5);
  p.push(colora(new THREE.PlaneGeometry(14, 4).rotateX(-Math.PI / 2).translate(0, 0.05, -2.4), "#6FA7C8", 0.18));
  p.push(colora(rilievo(-7, 7, -0.5, 4, 32, 8, (x, z) => 0.25 + 0.08 * Math.sin(x * 1.3 + z) + Math.max(0, z - 1.5) * 0.25), "#E2CFA2", 0.2));
  // il faro: torre bianca, ballatoio, lanterna scura, la casa del guardiano alla base
  blocco(p, 4.5, 0.2, 0.6, 1.6, 0.9, 1.2, "#F1EEE6");
  tamburo(p, 4.5, 0.2, 0.6, 0.42, 6.2, "#F7F5EF");
  tamburo(p, 4.5, 6.4, 0.6, 0.62, 0.08, "#5A5F66");
  tamburo(p, 4.5, 6.48, 0.6, 0.32, 0.55, "#B9D6E4");
  cupola(p, 4.5, 7.03, 0.6, 0.36, "#3D4248", 1);
  // la casa: due piani bianchi, la terrazza sul mare con la ringhiera, le persiane
  blocco(p, -1.2, 0.2, 0.4, 2.6, 1.1, 1.6, "#EFE9DD");
  blocco(p, -1.6, 1.3, 0.6, 1.6, 0.9, 1.2, "#EFE9DD");
  blocco(p, -0.1, 1.3, -0.1, 1.2, 0.06, 0.9, "#D9D0BF");
  for (let k = 0; k < 7; k++) blocco(p, -0.65 + k * 0.18, 1.36, -0.53, 0.03, 0.28, 0.03, "#7A7A78");
  blocco(p, -0.1, 1.62, -0.53, 1.2, 0.03, 0.03, "#7A7A78");
  for (const x of [-2.1, -1.4, -0.7]) blocco(p, x, 0.45, -0.41, 0.3, 0.5, 0.02, "#5E7F9E");
  for (const x of [-2.0, -1.3]) blocco(p, x, 1.55, -0.01, 0.28, 0.45, 0.02, "#5E7F9E");
  // le barche dei pescatori in secca
  for (const [x, c] of [[1.8, "#2F6EA8"], [2.6, "#C4462F"]] as [number, string][]) {
    p.push(colora(new THREE.CylinderGeometry(0.22, 0.12, 1.1, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(x, 0.32, -0.6), c, 0.18));
  }
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ Comiso */

/** La basilica dell'Annunziata con la cupola azzurra, la pagoda della pace, le case basse. */
function comiso() {
  const g = sulRing(Z + Math.PI, 36, 3.2);
  g.scale.setScalar(1.3);
  const p: Pezzi = [];
  const r = generatore(7);
  zoccolo(p, 7, 3, 3.6, "#A79D72", 1);
  // il paese: case basse color pietra
  for (let i = 0; i < 70; i++) {
    const x = -6.5 + r() * 13, z = -1 + r() * 4;
    if (Math.abs(x - 0.5) < 2.2 && z < 1.5) continue;
    blocco(p, x, -0.3, z, 0.5 + r() * 0.5, 0.5 + r() * 0.6, 0.45 + r() * 0.3, r() < 0.5 ? "#D9C6A0" : "#CDB892");
  }
  // l'Annunziata: navata, transetto, il tamburo alto e la cupola azzurra con la lanterna; il campanile
  const ax = 0.5;
  const n0 = p.length;
  blocco(p, ax, -0.3, 0.8, 1.7, 2.3, 4.2, "#E6D8B8");
  blocco(p, ax, -0.3, 1.9, 3.4, 2.0, 1.1, "#E6D8B8");
  // la facciata a due ordini con le paraste e il timpano
  blocco(p, ax, -0.3, -1.35, 2.2, 1.9, 0.25, "#EFE5CC");
  blocco(p, ax, 1.6, -1.35, 2.4, 0.1, 0.32, "#F5EEDB");
  blocco(p, ax, 1.7, -1.35, 1.4, 0.95, 0.22, "#EFE5CC");
  p.push(colora(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(2, 0.75, 1).translate(ax, 2.83, -1.35), "#F5EEDB", 0.2));
  for (const ox of [-1.0, -0.62, 0.62, 1.0]) blocco(p, ax + ox, -0.3, -1.5, 0.12, 1.9, 0.06, "#F8F2E2");
  for (const ox of [-0.62, 0.62]) blocco(p, ax + ox, 1.7, -1.48, 0.1, 0.95, 0.05, "#F8F2E2");
  blocco(p, ax, -0.3, -1.49, 0.5, 0.95, 0.03, "#5B4A3A");
  // il tamburo ottagonale con le paraste, la cupola azzurra a spicchi, la lanterna
  const cz = 1.9;
  p.push(colora(new THREE.CylinderGeometry(0.66, 0.66, 1.6, 8).translate(ax, 3.27, cz), "#EFE5CC", 0.2));
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    blocco(p, ax + Math.cos(t) * 0.66, 2.47, cz + Math.sin(t) * 0.66, 0.09, 1.6, 0.09, "#F8F2E2");
  }
  p.push(
    colora(new THREE.SphereGeometry(0.7, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.35, 1).translate(ax, 4.07, cz), "#3C78B8", 0.18, (q) => {
      const t = Math.atan2(q.z - cz, q.x - ax);
      return new THREE.Color(Math.abs(Math.sin(t * 4)) < 0.12 ? "#D9E3EA" : "#3C78B8");
    }),
  );
  tamburo(p, ax, 5.0, cz, 0.15, 0.35, "#F5EEDB");
  cupola(p, ax, 5.35, cz, 0.16, "#3C78B8", 1.3);
  blocco(p, ax, 5.53, cz, 0.02, 0.22, 0.02, "#4A4440");
  // la basilica domina il paese: la ingrandisco attorno alla sua base
  for (let i = n0; i < p.length; i++) p[i].translate(-ax, 0.3, 0).scale(1.15, 1.15, 1.15).translate(ax, -0.3, 0);
  // il campanile in pietra, cuspide di pietra
  blocco(p, 2.1, -0.3, -0.9, 0.7, 3.2, 0.7, "#E1D2B0");
  blocco(p, 2.1, 2.9, -0.9, 0.8, 0.08, 0.8, "#EDE2C6");
  p.push(colora(new THREE.ConeGeometry(0.42, 0.7, 4).rotateY(Math.PI / 4).translate(2.1, 3.33, -0.9), "#CDBB93", 0.2));
  // la pagoda della pace: due terrazze bianche, lo stupa, la guglia dorata, la nicchia del Buddha
  const px = -5.2;
  blocco(p, px, -0.3, 0.8, 3.4, 0.5, 3.4, "#F3F1EC");
  blocco(p, px, 0.2, 0.8, 2.6, 0.45, 2.6, "#F3F1EC");
  cupola(p, px, 0.65, 0.8, 1.15, "#FAF9F6", 0.85);
  blocco(p, px, 1.62, 0.8, 0.5, 0.25, 0.5, "#F3F1EC");
  for (let k = 0; k < 7; k++) tamburo(p, px, 1.87 + k * 0.14, 0.8, 0.2 - k * 0.022, 0.08, "#D4A73C");
  p.push(colora(new THREE.ConeGeometry(0.06, 0.5, 8).translate(px, 3.05, 0.8), "#D4A73C", 0.18));
  blocco(p, px, 0.75, -0.32, 0.5, 0.6, 0.06, "#C9A04A");
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ Ragusa Ibla */

/** Ibla sul suo sperone: le case color miele a gradoni, e in cima il Duomo di San Giorgio con la cupola. */
function ibla() {
  const g = sulRing(Z + 2.98, 47, 3.6);
  g.scale.setScalar(1.5);
  const p: Pezzi = [];
  const r = generatore(19);
  const colle = (x: number, z: number) => Math.max(0, 5.2 * Math.exp(-((x * x) / 34 + ((z - 1.2) * (z - 1.2)) / 9)) + 0.1 * Math.sin(x * 2 + z)) - 0.3;
  p.push(colora(rilievo(-12, 12, -3, 6, 72, 24, colle), "#8C8A5A", 0.24, (q) => new THREE.Color(q.y > 1.2 ? "#A89C78" : "#7D8452")));
  for (let i = 0; i < 260; i++) {
    const x = (r() * 2 - 1) * 7, z = -1.8 + r() * 4.5;
    const y = colle(x, z);
    if (y < 0.6) continue;
    const l = 0.35 + r() * 0.35, h = 0.35 + r() * 0.4;
    blocco(p, x, y - 0.5, z, l, h + 0.5, l * 0.9, r() < 0.6 ? "#DCC193" : "#CFB283", 0.22);
    if (r() < 0.6) p.push(colora(new THREE.ConeGeometry(l * 0.75, 0.16, 4).rotateY(Math.PI / 4).translate(x, y + h + 0.08, z), "#B2643E", 0.22));
  }
  // il Duomo: la facciata a tre ordini con la cella campanaria in cima, e dietro la cupola azzurro-grigia
  const dx = 0.6, dy = colle(0.6, 0.6) - 0.1, dz = 0.6;
  blocco(p, dx, dy, dz + 0.9, 1.6, 1.4, 2.6, "#E8D5AE");
  blocco(p, dx, dy, dz - 0.4, 2.0, 1.5, 0.3, "#EEDDB8");
  blocco(p, dx, dy + 1.5, dz - 0.4, 1.4, 0.9, 0.28, "#EEDDB8");
  blocco(p, dx, dy + 2.4, dz - 0.4, 0.8, 0.8, 0.26, "#EEDDB8");
  cupola(p, dx, dy + 3.2, dz - 0.4, 0.3, "#9DB2BC", 1.4);
  for (const ox of [-0.8, -0.45, 0.45, 0.8]) tamburo(p, dx + ox, dy, dz - 0.58, 0.06, 1.45, "#F2E6CA");
  tamburo(p, dx, dy + 1.4, dz + 1.4, 0.75, 0.9, "#EEDDB8");
  cupola(p, dx, dy + 2.3, dz + 1.4, 0.78, "#8FA9B6", 1.3);
  tamburo(p, dx, dy + 3.3, dz + 1.4, 0.14, 0.4, "#EEDDB8");
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ Modica */

/** San Giorgio di Modica: la facciata-torre a cinque ordini in cima alla grande scalinata, le case attorno. */
function modica() {
  const g = sulRing(Z + 2.8, 42, 3);
  g.scale.setScalar(1.35);
  const p: Pezzi = [];
  const r = generatore(23);
  zoccolo(p, 5.5, 3, 3.4, "#A39C6E", 1.5);
  // il fianco della valle, le case di Modica Alta a gradoni
  p.push(colora(rilievo(-5.5, 5.5, -2, 5, 34, 18, (x, z) => Math.max(0, (z + 2) * 0.7 + 0.4 * Math.sin(x * 0.8)) - 0.3), "#A39C6E", 0.24));
  for (let i = 0; i < 110; i++) {
    const x = (r() * 2 - 1) * 5.2, z = -1.5 + r() * 6;
    if (Math.abs(x) < 2 && z < 2.6) continue;
    const y = Math.max(0, (z + 2) * 0.7 + 0.4 * Math.sin(x * 0.8)) - 0.3;
    blocco(p, x, y - 0.4, z, 0.4 + r() * 0.4, 0.4 + r() * 0.5 + 0.4, 0.4, r() < 0.5 ? "#DCC59B" : "#CDB88E", 0.22);
  }
  // la scalinata: rampe larghe che salgono verso la chiesa
  for (let k = 0; k < 14; k++) blocco(p, 0, -0.3 + k * 0.18, -1.8 + k * 0.22, 2.6 - k * 0.06, 0.18, 0.24, "#D8C7A2");
  // la facciata: cinque ordini che si stringono salendo, colonne, la cella campanaria e la cupoletta
  const y0 = 2.2, zf = 1.4;
  const ordini: [number, number][] = [[3.0, 1.3], [2.5, 1.1], [1.8, 1.0], [1.2, 0.9], [0.8, 0.8]];
  let y = y0;
  ordini.forEach(([l, h], i) => {
    blocco(p, 0, y, zf, l, h, 0.5, i % 2 ? "#EBDDBB" : "#E3D2AB");
    for (const s of [-1, 1]) tamburo(p, s * (l / 2 - 0.08), y, zf - 0.27, 0.05, h, "#F3E8CE");
    if (l > 2) for (const s of [-1, 1]) tamburo(p, s * (l / 2 - 0.36), y, zf - 0.27, 0.05, h, "#F3E8CE");
    // il portale o la finestra ad arco, scuri; nei due ordini alti le celle delle campane
    const lw = i === 0 ? 0.5 : 0.36, lh = h * (i === 0 ? 0.62 : 0.55);
    blocco(p, 0, y + (i === 0 ? 0 : h * 0.2), zf - 0.26, lw, lh, 0.02, i >= 3 ? "#3A332C" : "#5B4A3A");
    p.push(colora(new THREE.CylinderGeometry(lw / 2, lw / 2, 0.02, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, y + (i === 0 ? 0 : h * 0.2) + lh, zf - 0.26), i >= 3 ? "#3A332C" : "#5B4A3A", 0.2));
    // la cornice che sporge e le statue agli angoli
    blocco(p, 0, y + h - 0.04, zf - 0.05, l + 0.24, 0.09, 0.62, "#F6EEDA");
    if (i < 3) for (const s of [-1, 1]) tamburo(p, s * (l / 2 - 0.05), y + h + 0.05, zf - 0.22, 0.05, 0.28, "#EDE3CB");
    y += h;
  });
  cupola(p, 0, y, zf, 0.28, "#C9B48C", 1.5);
  blocco(p, 0, y + 0.4, zf, 0.03, 0.3, 0.03, "#4A4440");
  blocco(p, 0, y + 0.58, zf, 0.16, 0.03, 0.03, "#4A4440");
  // la chiesa dietro la facciata
  blocco(p, 0, y0, zf + 1.6, 2.4, 1.8, 2.8, "#DCC9A2");
  g.add(unisci(p));
  return g;
}

/* ------------------------------------------------------------------ il Liotru */

/** L'elefante di pietra lavica con l'obelisco sul dorso, sul basamento di marmo bianco con la fontana. Dietro le carte, ai piedi dell'Etna. */
class Liotru {
  gruppo = new THREE.Group();
  private tx: THREE.Texture;
  constructor() {
    // dietro le carte, nel varco fra la prima e la seconda, ai piedi dell'Etna
    const a = Z + 1.21, d = 10;
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

/* --------------------------------------------- le maschere: uno, nessuno e centomila */

/**
 * Una maschera sola, a terra. All'inizio è un moai dell'isola di Pasqua che emerge dal pavimento; ogni volta che
 * lo sguardo la lascia e poi torna è un'altra: il Mamuthone sardo, il Krampus delle Alpi, la bauta veneziana,
 * la maschera tragica greca, e di nuovo il moai.
 */
class Maschere {
  gruppo = new THREE.Group();
  private volti: THREE.Group[] = [];
  private corrente = 0;
  private visto = true;
  private dir = new THREE.Vector3();
  private verso = new THREE.Vector3();
  private texture: THREE.Texture[] = [];
  constructor() {
    const a = Z - 1.6, d = 3.5;
    this.gruppo.position.set(Math.sin(a) * d, PAV, -Math.cos(a) * d);
    this.gruppo.rotation.y = Math.PI - a;
    // il moai: il profilo di lato (fronte piatta, arcata sporgente, labbra a broncio, mento in fuori) estruso per
    // tutta la larghezza del volto; il naso lungo e stretto a parte; le orecchie allungate sui fianchi
    const moai = new THREE.Group();
    const tufo = new THREE.MeshStandardMaterial({ color: "#7D7367", roughness: 1, flatShading: true });
    const estrudi = (punti: [number, number][], largo: number) => {
      const forma = new THREE.Shape(punti.map(([f, y]) => new THREE.Vector2(f, y)));
      return new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false }).translate(0, 0, -largo / 2).rotateY(Math.PI / 2);
    };
    moai.add(new THREE.Mesh(estrudi([[-0.3, -0.2], [-0.3, 1.25], [0.2, 1.3], [0.25, 1.06], [0.34, 0.98], [0.33, 0.93], [0.23, 0.88], [0.22, 0.5], [0.3, 0.42], [0.35, 0.34], [0.27, 0.3], [0.32, 0.22], [0.3, 0.12], [0.39, 0.06], [0.36, -0.2]], 0.6), tufo));
    moai.add(new THREE.Mesh(estrudi([[0.2, 0.93], [0.43, 0.5], [0.4, 0.45], [0.2, 0.46]], 0.16), tufo));
    moai.add(new THREE.Mesh(estrudi([[0.2, 0.55], [0.39, 0.49], [0.37, 0.44], [0.2, 0.46]], 0.27), tufo));
    for (const sgn of [-1, 1]) moai.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.16).translate(sgn * 0.32, 0.68, 0.0), tufo));
    moai.scale.setScalar(0.6);
    moai.rotation.y = 0.55;
    moai.position.y = -0.05;
    // le altre: gusci di volto appoggiati a terra, inclinati verso chi guarda
    const faccia = (disegna: (x: CanvasRenderingContext2D) => void) => {
      const t = tela(128, 160, disegna);
      this.texture.push(t);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14, Math.PI, Math.PI, 0.15, Math.PI * 0.75).scale(1, 1.25, 0.8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide })));
      g.scale.setScalar(2.4);
      g.position.set(0, 0.4, 0);
      g.rotation.x = 0.25;
      return g;
    };
    // il Mamuthone: legno nero, rughe profonde, la pelle di pecora attorno
    const mamuthone = faccia((x) => {
      x.fillStyle = "#1C1612";
      x.fillRect(0, 0, 128, 160);
      x.strokeStyle = "#6A5442";
      x.lineWidth = 4;
      for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(64, 22 + i * 8, 44, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke(); }
      x.fillStyle = "#5A4636";
      x.beginPath(); x.moveTo(58, 72); x.lineTo(70, 72); x.lineTo(74, 104); x.lineTo(54, 104); x.fill();
      x.strokeStyle = "#7A6250";
      x.beginPath(); x.moveTo(30, 60); x.lineTo(56, 64); x.moveTo(98, 60); x.lineTo(72, 64); x.stroke();
      x.fillStyle = "#000";
      x.beginPath(); x.ellipse(44, 70, 10, 7, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(84, 70, 10, 7, 0, 0, 7); x.fill();
      x.fillRect(52, 118, 24, 8);
    });
    const pelle = new THREE.MeshStandardMaterial({ color: "#3A2F28", roughness: 1 });
    for (let k = 0; k < 14; k++) {
      const an = (k / 14) * Math.PI * 2;
      mamuthone.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0).translate(Math.cos(an) * 0.16, 0.05 + Math.sin(an) * 0.17, 0.05), pelle));
    }
    // il Krampus: legno rosso scuro, ghigno, corna lunghe
    const krampus = faccia((x) => {
      x.fillStyle = "#5A1E16";
      x.fillRect(0, 0, 128, 160);
      x.fillStyle = "#200806";
      x.beginPath(); x.moveTo(30, 62); x.lineTo(58, 74); x.lineTo(32, 80); x.fill();
      x.beginPath(); x.moveTo(98, 62); x.lineTo(70, 74); x.lineTo(96, 80); x.fill();
      x.fillStyle = "#E8E0CC";
      for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(36 + i * 10, 112); x.lineTo(41 + i * 10, 128); x.lineTo(46 + i * 10, 112); x.fill(); }
    });
    const corno = new THREE.MeshStandardMaterial({ color: "#D9CFB8", roughness: 0.5 });
    for (const s of [-1, 1]) {
      const c = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.08, 0.12, 0), new THREE.Vector3(s * 0.2, 0.26, 0.02), new THREE.Vector3(s * 0.22, 0.42, 0.08)]), 10, 0.025, 8);
      krampus.add(new THREE.Mesh(c, corno));
    }
    // la bauta: bianca e oro, il tricorno nero
    const bauta = faccia((x) => {
      x.fillStyle = "#F4F1EA";
      x.fillRect(0, 0, 128, 160);
      x.strokeStyle = "#C9A04A";
      x.lineWidth = 3;
      x.beginPath(); x.moveTo(20, 50); x.quadraticCurveTo(64, 30, 108, 50); x.stroke();
      x.fillStyle = "#111";
      x.beginPath(); x.ellipse(44, 70, 10, 6, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(84, 70, 10, 6, 0, 0, 7); x.fill();
    });
    bauta.add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.12, 3).rotateX(Math.PI).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: "#151515" })));
    // la maschera tragica: bianca, la bocca all'ingiù, le sopracciglia sollevate
    const tragica = faccia((x) => {
      x.fillStyle = "#EDE9E1";
      x.fillRect(0, 0, 128, 160);
      x.strokeStyle = "#2A2622";
      x.lineWidth = 4;
      x.beginPath(); x.moveTo(26, 56); x.quadraticCurveTo(44, 40, 58, 58); x.stroke();
      x.beginPath(); x.moveTo(102, 56); x.quadraticCurveTo(84, 40, 70, 58); x.stroke();
      x.fillStyle = "#111";
      x.beginPath(); x.ellipse(44, 72, 9, 7, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(84, 72, 9, 7, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(40, 128); x.quadraticCurveTo(64, 98, 88, 128); x.quadraticCurveTo(64, 116, 40, 128); x.fill();
    });
    this.volti = [moai, mamuthone, krampus, bauta, tragica];
    this.volti.forEach((v, i) => {
      v.visible = i === 0;
      this.gruppo.add(v);
    });
  }
  /** Quando lo sguardo la lascia e poi torna, la maschera è cambiata. */
  aggiorna(_t: number, camera: THREE.Camera) {
    const dir = camera.getWorldDirection(this.dir);
    const verso = this.verso.copy(this.gruppo.position).sub(camera.position).normalize();
    const visto = dir.dot(verso) > 0.55;
    if (visto && !this.visto) {
      this.volti[this.corrente].visible = false;
      this.corrente = (this.corrente + 1) % this.volti.length;
      this.volti[this.corrente].visible = true;
    }
    this.visto = visto;
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
  private vivi: { aggiorna?: (t: number, camera: THREE.Camera) => void; libera?: () => void }[] = [];
  private texture: THREE.Texture[] = [];

  constructor(notte: boolean) {
    const A = ATTIVI;
    if (A.puntaSecca) this.giorno.add(puntaSecca());
    if (A.comiso) this.giorno.add(comiso());
    if (A.ibla) this.giorno.add(ibla());
    if (A.modica) this.giorno.add(modica());
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
    if (A.maschere) {
      const m = new Maschere();
      this.sempre.add(m.gruppo);
      this.vivi.push({ aggiorna: (t, c) => m.aggiorna(t, c), libera: () => m.libera() });
    }
    this.gruppo.add(this.giorno, this.sempre);
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
  }

  aggiorna(t: number, camera: THREE.Camera) {
    this.vivi.forEach((v) => v.aggiorna?.(t, camera));
  }

  libera() {
    this.vivi.forEach((v) => v.libera?.());
    liberaTutto(this.gruppo, this.texture);
  }
}
