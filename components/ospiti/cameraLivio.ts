import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { generatore, tela } from "./comuni";
import { granaLegno } from "./polyhaven";

/*
 * Le cose della camera di Livio, rifatte dalle sue foto e messe attorno alla scrivania dello sviluppatore:
 * un tratto di parete chiara alle sue spalle con le cinque chitarre appese nell'ordine della foto (la classica
 * rosa, il sitar, la classica di legno, l'elettrica bianca col battipenna crema e il ponte mobile, la nera a
 * punte), le tre maschere africane in colonna, lo schiacciasogni; sotto le chitarre il pianoforte digitale sul
 * supporto a X; davanti, in vista, il mobile scuro col giradischi che gira; più in là il Mook Jong, l'uomo di
 * legno del kung fu; dietro lo studietto la libreria bianca a celle irregolari (in cima i tre libri, in
 * zonaSviluppatore.ts) e accanto la Les Paul dorata sul portachitarra, con l'amplificatore.
 * Coordinate della zona (components/zona.ts): x di lato (+x a sinistra per chi guarda), y in alto, z verso
 * fuori (+z lontano da chi guarda). Le facce "davanti" guardano −z, verso chi guarda.
 * I pezzi fermi si fondono per materiale: poche chiamate di disegno.
 */

type Pezzo = { g: THREE.BufferGeometry; m: string };

/** Fonde le geometrie che hanno lo stesso materiale. */
function fondi(pezzi: Pezzo[], materiali: Record<string, THREE.Material>, gruppo: THREE.Group) {
  const perMateriale = new Map<string, THREE.BufferGeometry[]>();
  for (const { g, m } of pezzi) {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
    n.clearGroups();
    const l = perMateriale.get(m) ?? [];
    l.push(n);
    perMateriale.set(m, l);
  }
  for (const [m, gs] of perMateriale) {
    const unita = mergeGeometries(gs);
    gs.forEach((g) => g.dispose());
    gruppo.add(new THREE.Mesh(unita, materiali[m]));
  }
}

/** Un contorno chiuso e morbido (Catmull-Rom) da pochi punti di controllo. */
function morbido(punti: [number, number][], n = 60) {
  const c = new THREE.CatmullRomCurve3(punti.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, "catmullrom", 0.5);
  return new THREE.Shape(c.getSpacedPoints(n).slice(0, -1).map((p) => new THREE.Vector2(p.x, p.y)));
}

/** Un corpo piatto estruso dal contorno, con la faccia buona verso −z; spessore p. */
function corpo(s: THREE.Shape, p: number, smusso = 0.006) {
  return new THREE.ExtrudeGeometry(s, { depth: p, bevelEnabled: smusso > 0, bevelThickness: smusso, bevelSize: smusso, bevelSegments: 2, curveSegments: 12 })
    .translate(0, 0, -p / 2)
    .rotateY(Math.PI);
}

const box = (l: number, a: number, p: number, x: number, y: number, z: number) => new THREE.BoxGeometry(l, a, p).translate(x, y, z);
const cil = (r1: number, r2: number, h: number, seg = 12) => new THREE.CylinderGeometry(r1, r2, h, seg);

/* ------------------------------------------------------------------ gli strumenti */

/** La chitarra classica: corpo a otto, buca, ponticello, manico, paletta a feritoie con le meccaniche. Base del corpo a y = 0. */
function classica(top: string, fasce: string): Pezzo[] {
  const p: Pezzo[] = [];
  const L = 0.48;
  // mezza sagoma: dal fondo al centro, il bordo inferiore, la vita, la spalla
  const destra: [number, number][] = [[0, 0], [0.13, 0.015], [0.18, 0.1], [0.165, 0.2], [0.115, 0.27], [0.125, 0.33], [0.14, 0.4], [0.11, 0.46], [0.04, L]];
  const sinistra = destra.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number]);
  const s = morbido([...destra, [-0.04, L], ...sinistra]);
  p.push({ g: corpo(s, 0.09, 0.004), m: fasce });
  // il piano armonico, appena davanti
  p.push({ g: new THREE.ShapeGeometry(s, 16).rotateY(Math.PI).translate(0, 0, -0.0505), m: top });
  // la buca con la rosetta, il ponticello
  p.push({ g: new THREE.CircleGeometry(0.045, 24).rotateY(Math.PI).translate(0, 0.33, -0.052), m: "buio" });
  p.push({ g: new THREE.RingGeometry(0.045, 0.058, 24).rotateY(Math.PI).translate(0, 0.33, -0.0515), m: "fasce" });
  p.push({ g: box(0.15, 0.025, 0.012, 0, 0.11, -0.056), m: "palissandro" });
  // il manico, la tastiera, la paletta con le feritoie e le meccaniche
  p.push({ g: box(0.052, 0.4, 0.03, 0, L + 0.19, -0.03), m: "fasce" });
  p.push({ g: box(0.056, 0.4, 0.008, 0, L + 0.19, -0.049), m: "palissandro" });
  p.push({ g: box(0.075, 0.18, 0.022, 0, L + 0.48, -0.03), m: "fasce" });
  for (const dx of [-0.02, 0.02]) p.push({ g: box(0.012, 0.13, 0.024, dx, L + 0.48, -0.032), m: "buio" });
  for (const s2 of [-1, 1]) for (let k = 0; k < 3; k++) p.push({ g: cil(0.008, 0.008, 0.03, 6).rotateZ(Math.PI / 2).translate(s2 * 0.052, L + 0.43 + k * 0.045, -0.03), m: "metallo" });
  // le corde, sei fili chiari dal ponticello alla paletta
  for (let k = 0; k < 6; k++) p.push({ g: box(0.0018, L + 0.48 - 0.12, 0.0018, -0.02 + k * 0.008, (0.12 + L + 0.48) / 2 + 0.02, -0.058), m: "metallo" });
  return p;
}

/** L'elettrica bianca a doppia spalla mancante, battipenna crema, tre pick-up, ponte mobile, paletta a punta. */
function elettricaBianca(): Pezzo[] {
  const p: Pezzo[] = [];
  const s = morbido([[0, 0], [0.12, 0.015], [0.165, 0.11], [0.15, 0.22], [0.12, 0.28], [0.135, 0.36], [0.1, 0.43], [0.06, 0.37], [0.04, 0.3], [-0.04, 0.3], [-0.06, 0.4], [-0.1, 0.47], [-0.14, 0.38], [-0.13, 0.29], [-0.155, 0.21], [-0.165, 0.1], [-0.11, 0.012]]);
  p.push({ g: corpo(s, 0.045), m: "bianco" });
  // il battipenna crema, coi pick-up neri e il ponte d'acciaio
  const bp = morbido([[0.02, 0.06], [0.09, 0.1], [0.1, 0.2], [0.07, 0.3], [0.035, 0.36], [-0.03, 0.34], [-0.06, 0.26], [-0.05, 0.12]]);
  p.push({ g: new THREE.ShapeGeometry(bp, 12).rotateY(Math.PI).translate(0, 0, -0.03), m: "crema" });
  for (const y of [0.15, 0.22, 0.29]) p.push({ g: box(0.075, 0.022, 0.01, 0, y, -0.034), m: "buio" });
  p.push({ g: box(0.08, 0.035, 0.012, 0, 0.1, -0.035), m: "metallo" });
  for (let k = 0; k < 3; k++) p.push({ g: cil(0.01, 0.01, 0.012, 10).rotateX(Math.PI / 2).translate(-0.085 - k * 0.02, 0.07 + k * 0.035, -0.03), m: "buio" });
  // manico d'acero e tastiera scura, i segnatasti, la paletta a punta nera
  p.push({ g: box(0.046, 0.45, 0.022, 0, 0.52, -0.024), m: "acero" });
  p.push({ g: box(0.05, 0.45, 0.006, 0, 0.52, -0.038), m: "palissandro" });
  for (let k = 0; k < 6; k++) p.push({ g: box(0.008, 0.008, 0.002, 0, 0.36 + k * 0.06, -0.042), m: "crema" });
  const testa = new THREE.Shape([new THREE.Vector2(-0.025, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.045, 0.07), new THREE.Vector2(0.02, 0.17), new THREE.Vector2(-0.01, 0.2), new THREE.Vector2(-0.03, 0.12)]);
  p.push({ g: corpo(testa, 0.016, 0.002).translate(0, 0.745, -0.024), m: "buio" });
  for (let k = 0; k < 6; k++) p.push({ g: cil(0.006, 0.006, 0.02, 6).rotateZ(Math.PI / 2).translate(-0.04 + k * 0.005, 0.77 + k * 0.023, -0.024), m: "metallo" });
  for (let k = 0; k < 6; k++) p.push({ g: box(0.0016, 0.72, 0.0016, -0.012 + k * 0.005, 0.44, -0.044), m: "metallo" });
  return p;
}

/** La nera a punte, opaca: due punte in basso, due ali in alto, la paletta a punte; i pick-up e i pomelli. */
function aPunte(): Pezzo[] {
  const p: Pezzo[] = [];
  const meta: [number, number][] = [[0, 0.07], [0.1, -0.03], [0.12, 0.07], [0.21, 0.12], [0.14, 0.2], [0.15, 0.3], [0.21, 0.42], [0.1, 0.37], [0.04, 0.36]];
  const pts = [...meta, ...meta.slice(1).reverse().map(([x, y]) => [-x, y] as [number, number])];
  const sagoma = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  p.push({ g: corpo(sagoma, 0.042, 0.003), m: "neroOpaco" });
  // il filetto chiaro tutt'attorno: una sagoma appena più grande, dietro; di notte la stacca dalla parete
  p.push({ g: corpo(sagoma, 0.03, 0).scale(1.06, 1.04, 1).translate(0, -0.006, 0.008), m: "filetto" });
  for (const y of [0.17, 0.27]) p.push({ g: box(0.08, 0.03, 0.01, 0, y, -0.026), m: "buio" });
  p.push({ g: box(0.085, 0.02, 0.01, 0, 0.12, -0.026), m: "metallo" });
  for (let k = 0; k < 4; k++) p.push({ g: cil(0.012, 0.012, 0.012, 10).rotateX(Math.PI / 2).translate(-0.08 - (k % 2) * 0.03, 0.12 + Math.floor(k / 2) * 0.05, -0.026), m: "metallo" });
  p.push({ g: box(0.046, 0.46, 0.022, 0, 0.58, -0.022), m: "neroOpaco" });
  p.push({ g: box(0.05, 0.46, 0.006, 0, 0.58, -0.036), m: "palissandro" });
  for (let k = 0; k < 6; k++) p.push({ g: box(0.02, 0.006, 0.002, 0, 0.42 + k * 0.06, -0.04), m: "crema" });
  const testa = new THREE.Shape([new THREE.Vector2(-0.03, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.075, 0.07), new THREE.Vector2(0.04, 0.09), new THREE.Vector2(0.03, 0.18), new THREE.Vector2(-0.02, 0.21), new THREE.Vector2(-0.07, 0.15), new THREE.Vector2(-0.04, 0.1)]);
  p.push({ g: corpo(testa, 0.016, 0.002).translate(0, 0.81, -0.022), m: "neroOpaco" });
  for (let k = 0; k < 6; k++) p.push({ g: box(0.0016, 0.72, 0.0016, -0.012 + k * 0.005, 0.47, -0.042), m: "metallo" });
  return p;
}

/** Il sitar: la grande zucca scura con gli intarsi chiari, il manico lungo e largo coi tasti curvi, i piroli. */
function sitar(): Pezzo[] {
  const p: Pezzo[] = [];
  p.push({ g: new THREE.SphereGeometry(0.17, 24, 16).scale(1, 1.05, 0.7).translate(0, 0.17, 0.02), m: "zucca" });
  // la tavola, appena chiara, con i fiori intarsiati
  p.push({ g: new THREE.CircleGeometry(0.15, 28).scale(1, 1.05, 1).rotateY(Math.PI).translate(0, 0.17, -0.1), m: "zuccaChiara" });
  for (const [x, y] of [[-0.07, 0.2], [0.07, 0.2], [0, 0.1], [0, 0.27]]) p.push({ g: new THREE.CircleGeometry(0.022, 10).rotateY(Math.PI).translate(x, y, -0.102), m: "intarsio" });
  p.push({ g: box(0.09, 0.02, 0.012, 0, 0.13, -0.104), m: "intarsio" });
  // il manico: lungo, largo, piatto, con le fasce d'osso; i tasti d'ottone curvi
  p.push({ g: box(0.075, 0.82, 0.04, 0, 0.72, -0.02), m: "zucca" });
  for (let k = 0; k < 6; k++) p.push({ g: box(0.078, 0.012, 0.042, 0, 0.42 + k * 0.13, -0.02), m: "intarsio" });
  for (let k = 0; k < 14; k++) p.push({ g: new THREE.TorusGeometry(0.04, 0.003, 4, 10, Math.PI).rotateZ(Math.PI).scale(1, 0.4, 1).translate(0, 0.38 + k * 0.045, -0.045), m: "ottone" });
  // la testa e i piroli grandi ai lati, i piroli piccoli lungo il fianco del manico
  p.push({ g: box(0.06, 0.16, 0.05, 0, 1.2, -0.02), m: "zucca" });
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) p.push({ g: cil(0.01, 0.016, 0.1, 8).rotateZ((s * Math.PI) / 2).translate(s * 0.07, 1.15 + k * 0.07, -0.02), m: "zucca" });
  for (let k = 0; k < 11; k++) p.push({ g: cil(0.006, 0.009, 0.05, 6).rotateZ(-Math.PI / 2).translate(0.06, 0.6 + k * 0.045, -0.02), m: "zucca" });
  for (let k = 0; k < 7; k++) p.push({ g: box(0.0015, 1.0, 0.0015, -0.018 + k * 0.006, 0.7, -0.05), m: "metallo" });
  return p;
}

/* ------------------------------------------------------------------ le maschere */

/** Le tre maschere della foto, disegnate su tela: righe bianche incise sul nero, il volto maculato, il volto a righe col bordo scuro. */
function tintaMaschera(k: number) {
  return tela(128, 192, (x) => {
    x.clearRect(0, 0, 128, 192);
    x.save();
    x.beginPath();
    x.ellipse(64, 96, 60, 92, 0, 0, Math.PI * 2);
    x.clip();
    if (k === 0) {
      x.fillStyle = "#17110D";
      x.fillRect(0, 0, 128, 192);
      x.strokeStyle = "#E9E2D2";
      x.lineWidth = 3;
      for (let i = 0; i < 16; i++) {
        x.beginPath();
        x.arc(64, -40 + i * 12, 90, Math.PI * 0.15, Math.PI * 0.85);
        x.stroke();
      }
      x.fillStyle = "#2A1C12";
      x.fillRect(56, 18, 16, 70);
      x.fillStyle = "#5B3A22";
      x.fillRect(50, 96, 28, 30);
    } else if (k === 1) {
      x.fillStyle = "#8E836F";
      x.fillRect(0, 0, 128, 192);
      const r = generatore(9);
      for (let i = 0; i < 900; i++) {
        x.fillStyle = r() < 0.5 ? "#4A4136" : "#C2B8A2";
        x.fillRect(r() * 128, r() * 192, 1.6, 1.6);
      }
      x.fillStyle = "#14100C";
      for (const s of [-1, 1]) {
        x.beginPath();
        x.ellipse(64 + s * 24, 78, 22, 30, s * 0.2, 0, Math.PI * 2);
        x.fill();
      }
      x.fillRect(58, 70, 12, 50);
      for (const s of [-1, 1]) {
        x.beginPath();
        x.arc(64 + s * 12, 150, 7, 0, Math.PI * 2);
        x.fill();
      }
    } else {
      x.fillStyle = "#1C130E";
      x.fillRect(0, 0, 128, 192);
      x.save();
      x.beginPath();
      x.ellipse(64, 100, 46, 80, 0, 0, Math.PI * 2);
      x.clip();
      x.fillStyle = "#D9CFBC";
      x.fillRect(0, 0, 128, 192);
      x.strokeStyle = "#3A2A1E";
      x.lineWidth = 2;
      for (let i = -20; i < 40; i++) {
        x.beginPath();
        x.moveTo(i * 6, 0);
        x.lineTo(i * 6 - 120, 192);
        x.stroke();
      }
      x.restore();
      x.fillStyle = "#1C130E";
      x.fillRect(58, 84, 12, 52);
      for (const s of [-1, 1]) x.fillRect(64 + s * 22 - 14, 88, 28, 6);
      x.fillStyle = "#6B2E1E";
      for (const s of [-1, 1]) x.fillRect(64 + s * 56 - 5, 80, 10, 24);
    }
    x.restore();
  });
}

/** Una maschera: un ovale bombato verso chi guarda, con la tela disegnata e il contorno ritagliato. */
function maschera(k: number, texture: THREE.Texture[]) {
  const t = tintaMaschera(k);
  texture.push(t);
  const g = new THREE.PlaneGeometry(0.26, 0.39, 14, 20);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / 0.13, y = pos.getY(i) / 0.195;
    // bombata verso +z: dopo il giro di mezzo angolo guarda chi guarda
    pos.setZ(i, 0.07 * Math.sqrt(Math.max(0, 1 - x * x - y * y)) + (k === 0 && Math.abs(x) < 0.15 && y > -0.2 ? 0.015 : 0));
  }
  g.rotateY(Math.PI);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, alphaTest: 0.5, side: THREE.DoubleSide }));
}

/* ------------------------------------------------------------------ la camera */

export class CameraDiLivio {
  gruppo = new THREE.Group();
  private parete: THREE.MeshStandardMaterial;
  private noce!: THREE.MeshStandardMaterial;
  private velo!: THREE.MeshBasicMaterial;
  private piatto = new THREE.Group();
  private texture: THREE.Texture[] = [];

  constructor() {
    const legno = (colore: string, ripeti: [number, number] = [1, 1], ruvido = 0.7) => new THREE.MeshStandardMaterial({ color: colore, map: granaLegno(ripeti), roughness: ruvido });
    // la parete a calce: la grana dell'intonaco d'argilla di Poly Haven (clay_plaster), ridotta a luminosità,
    // col suo rilievo; il colore lo dà il materiale
    const carica = (url: string, colore: boolean, ripeti: [number, number]) => {
      const t = new THREE.TextureLoader().load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(ripeti[0], ripeti[1]);
      t.anisotropy = 4;
      if (colore) t.colorSpace = THREE.SRGBColorSpace;
      this.texture.push(t);
      return t;
    };
    this.parete = new THREE.MeshStandardMaterial({
      color: "#F1EADF",
      map: carica("/stanza/intonaco.webp", true, [3, 1.6]),
      normalMap: carica("/stanza/intonaco-rilievo.webp", false, [3, 1.6]),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.95,
    });
    const m: Record<string, THREE.Material> = {
      parete: this.parete,
      battiscopa: new THREE.MeshStandardMaterial({ color: "#D9CDB8", roughness: 0.8 }),
      nero: new THREE.MeshStandardMaterial({ color: "#1B1C1F", roughness: 0.55 }),
      buio: new THREE.MeshStandardMaterial({ color: "#0E0E10", roughness: 0.5 }),
      metallo: new THREE.MeshStandardMaterial({ color: "#C9CDD3", roughness: 0.35, metalness: 0.3 }),
      ottone: new THREE.MeshStandardMaterial({ color: "#C9A24A", roughness: 0.4, metalness: 0.3 }),
      rosa: new THREE.MeshStandardMaterial({ color: "#EFA2B8", roughness: 0.3 }),
      rosaFasce: new THREE.MeshStandardMaterial({ color: "#E58FA8", roughness: 0.3 }),
      abete: legno("#E2B577", [0.5, 0.5], 0.5),
      fasce: legno("#8A4A26", [0.5, 1], 0.5),
      palissandro: new THREE.MeshStandardMaterial({ color: "#3A2418", roughness: 0.6 }),
      acero: legno("#E8C98E", [0.3, 1], 0.5),
      bianco: new THREE.MeshStandardMaterial({ color: "#F4F2EC", roughness: 0.25 }),
      crema: new THREE.MeshStandardMaterial({ color: "#E8DCBC", roughness: 0.4 }),
      neroOpaco: new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.85 }),
      filetto: new THREE.MeshStandardMaterial({ color: "#B9BCC2", roughness: 0.4, emissive: "#2A2C30" }),
      oro: new THREE.MeshStandardMaterial({ color: "#D8B24C", roughness: 0.3, metalness: 0.25 }),
      mogano: legno("#6B3A22", [0.4, 1], 0.5),
      zucca: new THREE.MeshStandardMaterial({ color: "#4E2618", roughness: 0.45 }),
      zuccaChiara: new THREE.MeshStandardMaterial({ color: "#6B3A22", roughness: 0.45 }),
      intarsio: new THREE.MeshStandardMaterial({ color: "#EDE6D3", roughness: 0.5 }),
      mobile: legno("#2E231D", [1, 0.5], 0.55),
      wingChun: legno("#8A5530", [0.4, 2], 0.6),
      tasti: new THREE.MeshStandardMaterial({ color: "#F5F3ED", roughness: 0.4 }),
      vinile: new THREE.MeshStandardMaterial({ color: "#121214", roughness: 0.3 }),
      libreria: new THREE.MeshStandardMaterial({ color: "#F2F0EB", roughness: 0.8 }),
    };
    const p: Pezzo[] = [];
    const metti = (pezzi: Pezzo[], x: number, y: number, z: number, rz = 0, ry = 0, s = 1) => {
      for (const q of pezzi) p.push({ g: q.g.scale(s, s, s).rotateZ(rz).rotateY(ry).translate(x, y, z), m: q.m });
    };

    // la parete alle spalle della scrivania, col battiscopa
    const PZ = 1.55, PX0 = -1.0, PX1 = 3.6, PH = 2.3;
    p.push({ g: box(PX1 - PX0, PH, 0.08, (PX0 + PX1) / 2, PH / 2, PZ + 0.04), m: "parete" });
    p.push({ g: box(PX1 - PX0, 0.07, 0.015, (PX0 + PX1) / 2, 0.035, PZ - 0.004), m: "battiscopa" });
    const muro = PZ - 0.01;

    // la parete delle chitarre: doghe verticali di noce su feltro nero, come negli studi di registrazione;
    // in cima una striscia di led calda che le lava di luce dall'alto. La grana è il noce americano di
    // Poly Haven (american_walnut_veneer), ridotta a luminosità e girata in verticale.
    {
      const X0 = -0.05, X1 = 3.05, H = PH - 0.12, P = 0.075, L = 0.046;
      const feltro = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 0.06, H).rotateY(Math.PI).translate((X0 + X1) / 2, H / 2 + 0.04, muro - 0.002), new THREE.MeshStandardMaterial({ color: "#171615", roughness: 1 }));
      this.gruppo.add(feltro);
      const doghe: THREE.BufferGeometry[] = [];
      const rr = generatore(17);
      for (let x = X0 + L / 2; x < X1; x += P) {
        const d = new THREE.BoxGeometry(L, H, 0.024).translate(x, H / 2 + 0.04, muro - 0.016);
        // ogni doga un tratto diverso della venatura
        const uv = d.attributes.uv as THREE.BufferAttribute, o = rr();
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.12 + o, uv.getY(i) * 1.6 + o * 3);
        doghe.push(d);
      }
      const grana = carica("/stanza/noce-grana.webp", true, [1, 1]);
      this.noce = new THREE.MeshStandardMaterial({ color: "#B07A4E", map: grana, roughness: 0.55 });
      this.gruppo.add(new THREE.Mesh(mergeGeometries(doghe), this.noce));
      doghe.forEach((g) => g.dispose());
      // la cornice nera in cima e in fondo, e il profilo dei led
      p.push({ g: box(X1 - X0 + 0.08, 0.04, 0.05, (X0 + X1) / 2, H + 0.06, muro - 0.025), m: "nero" });
      p.push({ g: box(X1 - X0 + 0.08, 0.04, 0.05, (X0 + X1) / 2, 0.06, muro - 0.025), m: "nero" });
      const striscia = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.012, 0.012).translate((X0 + X1) / 2, H + 0.035, muro - 0.045), new THREE.MeshBasicMaterial({ color: "#FFD9A0", toneMapped: false }));
      this.gruppo.add(striscia);
      // la luce che scende sulle doghe: un velo caldo, più forte in alto
      const lava = tela(4, 128, (x) => {
        const v = x.createLinearGradient(0, 0, 0, 128);
        v.addColorStop(0, "rgba(255,255,255,1)");
        v.addColorStop(0.35, "rgba(255,255,255,0.35)");
        v.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = v;
        x.fillRect(0, 0, 4, 128);
      });
      this.texture.push(lava);
      this.velo = new THREE.MeshBasicMaterial({ map: lava, color: "#FFB766", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.gruppo.add(new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, H * 0.9).rotateY(Math.PI).translate((X0 + X1) / 2, H - (H * 0.9) / 2 + 0.03, muro - 0.03), this.velo));
    }

    // il tappeto sotto la scrivania: un kilim rosso, nero e crema, come quello di casa
    {
      const kilim = tela(256, 160, (x) => {
        x.fillStyle = "#6E1C1A";
        x.fillRect(0, 0, 256, 160);
        x.fillStyle = "#1C1414";
        x.fillRect(10, 10, 236, 140);
        x.fillStyle = "#8E2A22";
        x.fillRect(22, 22, 212, 116);
        // rombi a gradini, motivi a uncino nella fascia
        const rombo = (cx: number, cy: number, r: number, c: string) => {
          x.fillStyle = c;
          for (let k = 0; k < r; k += 4) {
            x.fillRect(cx - (r - k), cy - k, (r - k) * 2, 4);
            x.fillRect(cx - (r - k), cy + k - 4, (r - k) * 2, 4);
          }
        };
        rombo(128, 80, 44, "#1C1414");
        rombo(128, 80, 30, "#E8DCC4");
        rombo(128, 80, 16, "#B8322A");
        for (const cx of [58, 198]) {
          rombo(cx, 80, 22, "#E8DCC4");
          rombo(cx, 80, 12, "#1C1414");
        }
        for (let i = 0; i < 24; i++) {
          x.fillStyle = i % 2 ? "#E8DCC4" : "#B8322A";
          x.fillRect(14 + i * 9.8, 13, 5, 5);
          x.fillRect(14 + i * 9.8, 142, 5, 5);
        }
        // le frange
        x.fillStyle = "#E8DCC4";
        for (let i = 0; i < 64; i++) {
          x.fillRect(i * 4, 0, 1, 6);
          x.fillRect(i * 4, 154, 1, 6);
        }
      });
      this.texture.push(kilim);
      const tappeto = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.7).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0.15, 0.004, 0.7), new THREE.MeshStandardMaterial({ map: kilim, roughness: 1 }));
      this.gruppo.add(tappeto);
    }

    // le chitarre appese, nell'ordine della foto da sinistra a destra (+x è la sinistra di chi guarda)
    const gancio = (x: number, y: number) => {
      p.push({ g: cil(0.03, 0.03, 0.02, 14).rotateX(Math.PI / 2).translate(x, y, muro - 0.01), m: "nero" });
      p.push({ g: box(0.06, 0.012, 0.06, x, y - 0.01, muro - 0.04), m: "nero" });
    };
    const strumenti: [Pezzo[], number, number, number][] = [
      [classica("rosa", "rosaFasce"), 2.7, 1.02, 0.02],
      [sitar(), 2.08, 0.95, -0.03],
      [classica("abete", "fasce"), 1.45, 1.0, 0.05],
      [elettricaBianca(), 0.85, 1.12, -0.04],
      [aPunte(), 0.22, 1.05, 0.03],
    ];
    strumenti.forEach(([pezzi, x, y, rz]) => {
      // ogni strumento sta poco davanti alla parete, appeso per la paletta
      metti(pezzi, x, y, muro - 0.06, rz);
      const alto = Math.max(...pezzi.map((q) => (q.g.computeBoundingBox(), q.g.boundingBox!.max.y)));
      gancio(x + Math.sin(-rz) * (alto - y) * 0.9, alto - 0.04);
    });
    // la tracolla nera che pende dall'elettrica bianca
    p.push({ g: box(0.035, 0.24, 0.006, 0.85, 1.0, muro - 0.07), m: "nero" });

    // le tre maschere in colonna, a destra delle chitarre
    [2.08, 1.68, 1.28].forEach((y, k) => {
      const ms = maschera(k, this.texture);
      ms.scale.setScalar(1.1);
      ms.position.set(-0.72, y, muro - 0.002);
      this.gruppo.add(ms);
    });

    // il mobile scuro sotto le chitarre, a sinistra della scrivania, e sopra il giradischi
    {
      const X = 2.9, Z = 0.8;
      p.push({ g: box(1.15, 0.5, 0.42, X, 0.27, Z), m: "mobile" });
      p.push({ g: box(1.1, 0.012, 0.005, X, 0.2, Z - 0.212), m: "buio" });
      p.push({ g: box(0.16, 0.02, 0.01, X, 0.11, Z - 0.215), m: "metallo" });
      for (const dx of [-0.5, 0.5]) p.push({ g: box(0.05, 0.04, 0.4, X + dx, 0.02, Z), m: "nero" });
      // il giradischi: la base, il piatto col disco che gira, il braccio
      const GY = 0.52 + 0.04;
      // la base di legno chiaro, perché si stacchi dal mobile scuro
      p.push({ g: box(0.46, 0.075, 0.36, X + 0.15, GY, Z), m: "acero" });
      p.push({ g: cil(0.155, 0.155, 0.02, 40).translate(X + 0.1, GY + 0.045, Z), m: "metallo" });
      p.push({ g: cil(0.012, 0.012, 0.03, 10).translate(X + 0.32, GY + 0.05, Z + 0.1), m: "metallo" });
      p.push({ g: box(0.012, 0.012, 0.24, 0, 0, 0).rotateY(-0.35).translate(X + 0.28, GY + 0.07, Z - 0.0), m: "metallo" });
      p.push({ g: box(0.025, 0.012, 0.04, 0, 0, 0).rotateY(-0.35).translate(X + 0.24, GY + 0.065, Z - 0.11), m: "nero" });
      this.piatto.position.set(X + 0.1, GY + 0.045, Z);
      const disco = new THREE.Mesh(cil(0.15, 0.15, 0.012, 40), m.vinile);
      this.piatto.add(disco);
      const solchi = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.145, 40, 3).rotateX(-Math.PI / 2).translate(0, 0.0065, 0), new THREE.MeshStandardMaterial({ color: "#2A2A2E", roughness: 0.2 }));
      this.piatto.add(solchi);
      const etichetta = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24).rotateX(-Math.PI / 2).translate(0, 0.007, 0), new THREE.MeshStandardMaterial({ color: "#C6462F", roughness: 0.6 }));
      etichetta.add(new THREE.Mesh(new THREE.CircleGeometry(0.012, 10).rotateX(-Math.PI / 2).translate(0.03, 0.0072, 0), new THREE.MeshStandardMaterial({ color: "#F2E6C8" })));
      this.piatto.add(etichetta);
      this.gruppo.add(this.piatto);
    }

    // il pianoforte digitale sul supporto a X, un po' davanti, col pedale a terra
    {
      const g: Pezzo[] = [];
      const Y = 0.76, L = 1.3;
      g.push({ g: box(L, 0.085, 0.27, 0, Y, 0), m: "nero" });
      g.push({ g: box(L - 0.08, 0.025, 0.14, 0, Y + 0.05, -0.05), m: "tasti" });
      const neri = [1, 3, 6, 8, 10];
      const bianchi = 52, passo = (L - 0.08) / bianchi;
      for (let k = 0; k < bianchi; k++) g.push({ g: box(0.0025, 0.026, 0.141, -(L - 0.08) / 2 + k * passo, Y + 0.051, -0.05), m: "buio" });
      for (let k = 0; k < 88; k++) {
        const ott = Math.floor((k + 9) / 12), n = (k + 9) % 12;
        if (!neri.includes(n)) continue;
        const pos = ott * 7 + [0, 0.6, 0, 1.6, 0, 0, 3.6, 0, 4.6, 0, 5.6, 0][n] - 5;
        g.push({ g: box(passo * 0.6, 0.02, 0.085, -(L - 0.08) / 2 + pos * passo, Y + 0.072, -0.02), m: "buio" });
      }
      // il supporto a X: due X ai lati, i bracci e i piedi
      // le X stanno nel piano di fronte, gambe aperte lungo la tastiera; una davanti e una dietro
      for (const sz of [-0.09, 0.09]) for (const s of [-1, 1]) g.push({ g: box(0.035, 1.02, 0.035, 0, 0, 0).rotateZ(s * 0.72).translate(0, Y / 2 - 0.02, sz), m: "nero" });
      g.push({ g: cil(0.02, 0.02, 0.22, 8).rotateX(Math.PI / 2).translate(0, Y / 2 - 0.02, 0), m: "nero" });
      for (const sx of [-0.34, 0.34]) {
        g.push({ g: box(0.04, 0.035, 0.36, sx, Y - 0.06, 0), m: "nero" });
        g.push({ g: box(0.04, 0.035, 0.42, sx, 0.02, 0), m: "nero" });
      }
      g.push({ g: box(0.09, 0.03, 0.14, 0.25, 0.015, -0.32), m: "buio" });
      metti(g, 1.78, 0, 1.24, 0, 0);
    }

    // il Mook Jong: il tronco di legno coi tre bracci e la gamba, sul suo piede, più a sinistra
    {
      const g: Pezzo[] = [];
      g.push({ g: cil(0.11, 0.11, 1.5, 16).translate(0, 0.85, 0), m: "wingChun" });
      for (const s of [-1, 1]) g.push({ g: cil(0.026, 0.03, 0.36, 8).rotateX(Math.PI / 2).rotateY(s * 0.32).translate(s * 0.055, 1.28, -0.2), m: "wingChun" });
      g.push({ g: cil(0.028, 0.032, 0.34, 8).rotateX(Math.PI / 2).translate(0, 1.03, -0.2), m: "wingChun" });
      g.push({ g: cil(0.035, 0.04, 0.38, 8).rotateX(Math.PI / 2 + 0.5).translate(0, 0.45, -0.16), m: "wingChun" });
      g.push({ g: cil(0.03, 0.035, 0.3, 8).translate(0, 0.21, -0.32), m: "wingChun" });
      for (const s of [-1, 1]) g.push({ g: box(0.06, 0.06, 0.5, s * 0.16, 0.03, 0.02), m: "wingChun" });
      g.push({ g: box(0.38, 0.06, 0.06, 0, 0.03, 0.2), m: "wingChun" });
      g.push({ g: new THREE.TorusGeometry(0.05, 0.01, 6, 14, Math.PI).rotateZ(Math.PI).translate(0, 1.7, 0), m: "nero" });
      g.push({ g: cil(0.01, 0.01, 0.1, 6).translate(0, 1.62, 0), m: "nero" });
      metti(g, 4.0, 0, 0.85, 0, -0.35);
    }

    // la libreria bianca a celle irregolari, dietro il tavolino delle macchine, piena di libri
    {
      const g: Pezzo[] = [];
      const X = -2.35, Z = 1.45, W = 1.0, H = 2.05, D = 0.3;
      const r = generatore(31);
      g.push({ g: box(W, H, 0.02, X, H / 2, Z + D / 2), m: "libreria" });
      for (const s of [-1, 1]) g.push({ g: box(0.035, H, D, X + s * (W / 2 - 0.0175), H / 2, Z), m: "libreria" });
      g.push({ g: box(W, 0.035, D, X, H - 0.0175, Z), m: "libreria" });
      g.push({ g: box(W, 0.06, D, X, 0.03, Z), m: "libreria" });
      // i ripiani storti e i divisori obliqui: celle a cinque e sei lati, come nella foto
      const ripiani = [0.06, 0.45, 0.82, 1.2, 1.6, H - 0.035];
      const coloriLibri = ["#2E4E6E", "#B9473A", "#E3C565", "#3E7B5A", "#E8E2D4", "#7A4E8A", "#D9824B", "#1F2A33", "#9FB7C4", "#C9B79A", "#5E7F3C", "#E6A9B8"];
      for (let i = 0; i < ripiani.length - 1; i++) {
        const y0 = ripiani[i], y1 = ripiani[i + 1];
        const inc = (i % 2 ? 1 : -1) * 0.1;
        if (i > 0) g.push({ g: box(W - 0.05, 0.03, D - 0.01, 0, 0, 0).rotateZ(inc).translate(X, y0, Z), m: "libreria" });
        // due divisori obliqui per piano, sfalsati
        const dx = [-0.18 + (i % 2) * 0.12, 0.2 - (i % 2) * 0.1];
        dx.forEach((d, k) => g.push({ g: box(0.03, y1 - y0 + 0.06, D - 0.01, 0, 0, 0).rotateZ((k ? -1 : 1) * (0.28 + r() * 0.15)).translate(X + d, (y0 + y1) / 2, Z), m: "libreria" }));
        // i libri: in piedi, di altezze diverse; in qualche cella una pila coricata
        const celle = [[-W / 2 + 0.04, dx[0] - 0.04], [dx[0] + 0.04, dx[1] - 0.04], [dx[1] + 0.04, W / 2 - 0.04]];
        celle.forEach(([a, b]) => {
          const base = y0 + 0.02 + inc * 0.0;
          if (r() < 0.25) {
            for (let k = 0; k < 4; k++) g.push({ g: box((b - a) * 0.8, 0.028, 0.2, X + (a + b) / 2, base + 0.03 + k * 0.03, Z - 0.02), m: `libro${Math.floor(r() * coloriLibri.length)}` });
            return;
          }
          for (let xx = a; xx < b - 0.02; ) {
            const sp = 0.018 + r() * 0.025, h = Math.min(y1 - y0 - 0.08, 0.17 + r() * 0.12);
            g.push({ g: box(sp, h, 0.19, X + xx + sp / 2, base + 0.02 + h / 2, Z - 0.03), m: `libro${Math.floor(r() * coloriLibri.length)}` });
            xx += sp + 0.002;
          }
        });
      }
      coloriLibri.forEach((c, i) => (m[`libro${i}`] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })));
      p.push(...g);
    }

    // la Les Paul dorata sul portachitarra a terra, appoggiata un poco all'indietro, e l'amplificatore davanti
    {
      const lp: Pezzo[] = [];
      const s = morbido([[0, 0], [0.14, 0.02], [0.18, 0.12], [0.165, 0.22], [0.12, 0.27], [0.13, 0.33], [0.11, 0.41], [0.06, 0.44], [0.035, 0.42], [-0.035, 0.4], [-0.05, 0.43], [-0.08, 0.41], [-0.09, 0.33], [-0.12, 0.27], [-0.165, 0.2], [-0.18, 0.11], [-0.13, 0.02]]);
      lp.push({ g: corpo(s, 0.05, 0.004), m: "crema" });
      lp.push({ g: new THREE.ShapeGeometry(s, 16).scale(0.97, 0.98, 1).rotateY(Math.PI).translate(0, 0.004, -0.031), m: "oro" });
      for (const y of [0.17, 0.27]) {
        lp.push({ g: box(0.075, 0.035, 0.012, 0, y, -0.036), m: "metallo" });
        lp.push({ g: box(0.06, 0.022, 0.004, 0, y, -0.043), m: "buio" });
      }
      lp.push({ g: box(0.09, 0.015, 0.012, 0, 0.11, -0.036), m: "metallo" });
      lp.push({ g: box(0.07, 0.012, 0.01, 0, 0.07, -0.035), m: "metallo" });
      for (let k = 0; k < 4; k++) lp.push({ g: cil(0.013, 0.013, 0.014, 10).rotateX(Math.PI / 2).translate(0.07 + (k % 2) * 0.035, 0.05 + Math.floor(k / 2) * 0.045, -0.034), m: "ottone" });
      lp.push({ g: box(0.048, 0.42, 0.024, 0, 0.62, -0.02), m: "mogano" });
      lp.push({ g: box(0.052, 0.42, 0.006, 0, 0.62, -0.034), m: "palissandro" });
      for (let k = 0; k < 7; k++) lp.push({ g: box(0.03, 0.01, 0.002, 0, 0.46 + k * 0.055, -0.038), m: "crema" });
      const testa = new THREE.Shape([new THREE.Vector2(-0.032, 0), new THREE.Vector2(0.032, 0), new THREE.Vector2(0.045, 0.17), new THREE.Vector2(0.02, 0.185), new THREE.Vector2(0, 0.175), new THREE.Vector2(-0.02, 0.185), new THREE.Vector2(-0.045, 0.17)]);
      lp.push({ g: corpo(testa, 0.016, 0.002).translate(0, 0.83, -0.02), m: "buio" });
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) lp.push({ g: cil(0.007, 0.007, 0.025, 6).rotateZ(Math.PI / 2).translate(sx * 0.055, 0.87 + k * 0.045, -0.02), m: "metallo" });
      for (let k = 0; k < 6; k++) lp.push({ g: box(0.0016, 0.74, 0.0016, -0.012 + k * 0.005, 0.47, -0.04), m: "metallo" });
      // il portachitarra: le due gambe ad A, il collo che regge il manico, la culla in basso
      const st: Pezzo[] = [];
      for (const sx of [-1, 1]) st.push({ g: box(0.02, 0.62, 0.02, 0, 0, 0).rotateZ(sx * 0.18).translate(sx * 0.07, 0.3, 0.06), m: "nero" });
      st.push({ g: box(0.02, 0.75, 0.02, 0, 0, 0).rotateX(-0.25).translate(0, 0.37, 0.15), m: "nero" });
      st.push({ g: box(0.24, 0.025, 0.06, 0, 0.14, -0.02), m: "nero" });
      st.push({ g: box(0.06, 0.03, 0.03, 0, 0.72, 0.1), m: "nero" });
      const X = -2.72, Z = 1.02;
      for (const q of lp) p.push({ g: q.g.rotateX(0.2).translate(X, 0.15, Z), m: q.m });
      for (const q of st) p.push({ g: q.g.translate(X, 0, Z), m: q.m });
      // l'amplificatore nero, davanti, con la griglia e le manopole cromate
      p.push({ g: box(0.4, 0.32, 0.22, X - 0.2, 0.16, Z - 0.38), m: "neroOpaco" });
      p.push({ g: box(0.34, 0.2, 0.006, X - 0.2, 0.13, Z - 0.493), m: "buio" });
      for (let k = 0; k < 5; k++) p.push({ g: cil(0.01, 0.01, 0.015, 8).rotateX(Math.PI / 2).translate(X - 0.33 + k * 0.06, 0.28, Z - 0.495), m: "metallo" });
    }

    fondi(p, m, this.gruppo);
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  setNotte(notte: boolean) {
    // di notte la calce resta un poco chiara, il noce si scurisce e i led lo lavano di più: le chitarre si stagliano
    this.parete.color.set(notte ? "#57514A" : "#F1EADF");
    this.noce.color.set(notte ? "#6E4A30" : "#B07A4E");
    this.velo.opacity = notte ? 0.55 : 0.18;
  }

  aggiorna(dt: number, ridotto: boolean) {
    // il disco gira a 33 giri
    if (!ridotto) this.piatto.rotation.y -= dt * 3.46;
  }

  libera() {
    this.texture.forEach((t) => t.dispose());
    this.gruppo.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mt) => mt.dispose());
    });
  }
}
