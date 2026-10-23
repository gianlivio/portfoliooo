import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANGOLO_ZONA } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { alone, fra, generatore, liberaTutto, tela } from "./comuni";

/*
 * L'ulivo dietro le carte, nel varco fra la prima carta e la seconda dopo la zona dello sviluppatore.
 * Tutto piccolo: l'albero sta nel varco, le persone passano e lavorano sotto il bordo della prima carta, che è alto.
 * In due minuti la storia di un podere. L'ulivo nasce legato al suo palo e cresce; gli passano accanto
 * un bambino in triciclo e un carro coi buoi. Prima raccolta. Poi un contadino pianta una fila di ulivi
 * lungo la trazzera, altri crescono sullo sfondo, si tira su una casetta; il bambino ripassa ragazzo, in bici.
 * Seconda raccolta, con due squadre; il carro torna e porta via le cassette. La casetta fuma, l'uliveto
 * si allarga ancora. Terza raccolta: le cassette le porta via un'Ape. Poi tutto si dissolve e ricomincia.
 * Di notte niente persone: il podere cresciuto, gli ulivi accesi da faretti a terra, la finestra della casetta.
 * Sopra, nel cielo fra le carte, l'ingresso dell'uliveto: una piccola carta che porta alla pagina dell'olio.
 * In queste coordinate +x è a sinistra per chi guarda, −z verso chi guarda.
 */

const ANGOLO = ANGOLO_ZONA + (Math.PI * 2 / 13) * 1.5;
const DISTANZA = 8.6;
/** Una persona è alta circa un'unità: nel mondo trenta centimetri, quanto basta per stare sotto la carta. */
const SCALA = 0.3;
const CICLO = 120;
/** La trazzera su cui passano il triciclo e il carro. */
const STRADA_Z = -1.35;

const stoffa = (colore: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: colore, roughness: 0.85, ...extra });
const PELLE = "#C9936C";
const CALDA = new THREE.Color("#FFC98A");

function arto(materiale: THREE.Material, raggio: number, lungo: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(raggio, lungo, 3, 8).translate(0, -lungo / 2, 0), materiale));
  return g;
}

function testa(capelli: string, cappello?: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), stoffa(PELLE)));
  if (cappello) {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.08, 0.05, 14).translate(0, 0.055, 0), stoffa(cappello)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.06).translate(0, 0.035, 0.08), stoffa(cappello)));
  } else g.add(new THREE.Mesh(new THREE.SphereGeometry(0.076, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.5), stoffa(capelli)));
  return g;
}

function ramo(da: THREE.Vector3, a: THREE.Vector3, r0: number, r1: number, caso: () => number) {
  const dir = a.clone().sub(da);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), 9, 5);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (caso() - 0.5) * 0.35;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate(da.x, da.y, da.z);
  return g;
}

function ciuffo(c: THREE.Vector3, r: number, caso: () => number) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.8 + caso() * 0.4);
    pos.setXYZ(i, v.x, v.y * 0.62, v.z);
  }
  g.translate(c.x, c.y, c.z);
  return g;
}

/**
 * Un ulivo vecchio: tronco corto e attorto che si apre in tre branche, chioma a ciuffi.
 * Alto circa 2,3 unità; restituisce le geometrie del legno e delle fronde, e i centri dei ciuffi.
 */
export function costruisciUlivo(seme = 4242) {
  const caso = generatore(seme);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const legno: THREE.BufferGeometry[] = [];
  const nodi = [V(0, 0, 0), V(0.08, 0.35, 0.03), V(-0.05, 0.62, 0.06)];
  legno.push(ramo(nodi[0], nodi[1], 0.24, 0.19, caso), ramo(nodi[1], nodi[2], 0.19, 0.16, caso));
  legno.push(new THREE.SphereGeometry(0.28, 12, 8).scale(1.1, 0.4, 1).translate(0, 0.02, 0));
  // le branche e le punte variano un poco col seme: ogni albero è diverso
  const j = () => (caso() - 0.5) * 0.25;
  const branche: [THREE.Vector3, THREE.Vector3][] = [
    [nodi[2], V(-0.6 + j(), 1.1 + j(), 0.12 + j())],
    [nodi[2], V(0.58 + j(), 1.15 + j(), -0.08 + j())],
    [nodi[2], V(0.08 + j(), 1.28 + j(), 0.4 + j())],
    [nodi[1], V(0.42 + j(), 0.85 + j(), 0.3 + j())],
  ];
  branche.forEach(([a, b]) => legno.push(ramo(a, b, 0.12, 0.07, caso)));
  const centri: THREE.Vector3[] = [];
  const punte = [V(-1.0, 1.48, 0.05), V(-0.5, 1.72, -0.22), V(-0.32, 1.58, 0.48), V(0.92, 1.52, -0.18), V(0.52, 1.82, 0.2), V(0.18, 1.92, -0.12), V(0.15, 1.68, 0.72), V(0.82, 1.24, 0.52), V(-0.72, 1.28, -0.42)];
  punte.forEach((p, i) => {
    p.x += j();
    p.y += j() * 0.6;
    p.z += j();
    legno.push(ramo(branche[[0, 0, 0, 1, 1, 2, 2, 3, 0][i]][1], p, 0.065, 0.032, caso));
    centri.push(p);
  });
  const legnoGeo = mergeGeometries(legno);
  legno.forEach((g) => g.dispose());
  const chioma: THREE.BufferGeometry[] = [];
  centri.forEach((c) => chioma.push(ciuffo(c, 0.42 + caso() * 0.12, caso), ciuffo(c.clone().add(new THREE.Vector3((caso() - 0.5) * 0.5, 0.12, (caso() - 0.5) * 0.4)), 0.3, caso)));
  const frondeGeo = mergeGeometries(chioma);
  chioma.forEach((g) => g.dispose());
  return { legnoGeo, frondeGeo, centri };
}

/**
 * La versione notturna di una geometria: colori cotti come da faretti a terra.
 * Più luce in basso e sulle facce rivolte in giù, il colore suo scaldato; in alto si perde nel buio.
 */
export function accesaDaSotto(g: THREE.BufferGeometry, colore: THREE.ColorRepresentation, alto: number, forza = 1) {
  const geo = g.index ? g.toNonIndexed() : g.clone();
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
  const base = new THREE.Color(colore), c = new THREE.Color();
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = THREE.MathUtils.clamp(pos.getY(i) / alto, 0, 1);
    const k = 0.75 * Math.pow(1 - h, 1.4) + 0.55 * Math.max(0, -nor.getY(i)) + 0.12;
    c.copy(base).multiplyScalar((0.1 + 1.25 * k) * forza).lerp(CALDA, 0.28 * k * forza);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

/* ------------------------------------------------------------------ la storia del podere */

/** Un ulivo del podere: dove sta, quanto diventa grande, quando nasce. */
type Pianta = { x: number; z: number; s: number; nasce: number; cresce: number; r: number; g: THREE.Group; giorno: THREE.Group; notte: THREE.Group; tutore?: THREE.Mesh };
/** Una raccolta: quando, e su quali ulivi (indici delle piante). */
type Raccolta = { a: number; b: number; alberi: number[]; squadre: number };
const RACCOLTE: Raccolta[] = [
  { a: 22, b: 36, alberi: [0], squadre: 1 },
  { a: 60, b: 76, alberi: [0, 1, 2, 3, 4], squadre: 2 },
  { a: 90, b: 106, alberi: [0, 1, 2, 3, 4], squadre: 2 },
];
/** Le olive: su quale pianta, dove sulla chioma (coordinate della pianta), dove a terra (coordinate del podere). */
type Oliva = { pianta: number; su: THREE.Vector3; giu: THREE.Vector3; ritardo: number; matura: number };
type Persona = { g: THREE.Group; braccia: THREE.Group[]; gambe: THREE.Group[]; attrezzo?: THREE.Object3D };
/** Chi passa sulla trazzera, da sinistra verso il varco: quando, da dove a dove. */
type Passante = { g: THREE.Group; da: number; a: number; x0: number; x1: number; ruote: THREE.Object3D[]; giri: number; gambe: THREE.Group[] };

/** La fila nuova lungo la trazzera e gli ulivi dello sfondo, oltre il primo. */
const FILA: [number, number, number, number][] = [
  // x, z, grandezza, quando nasce
  [2.7, -0.15, 0.52, 38], [4.0, -0.1, 0.5, 41], [5.3, -0.2, 0.52, 44], [6.6, -0.1, 0.48, 47],
];
const SFONDO: [number, number, number, number][] = [
  [-0.35, 2.6, 0.8, 42], [0.45, 5.2, 0.9, 46], [-0.2, 8.4, 1.0, 50], [2.6, 3.4, 0.42, 52], [4.6, 4.0, 0.4, 55],
  [0.5, 11.5, 1.1, 80], [-0.5, 14.5, 1.2, 83], [3.6, 6.8, 0.42, 82], [6.0, 5.6, 0.4, 85], [7.6, 3.8, 0.38, 86],
];
const CASETTA = new THREE.Vector3(8.4, 0, 0.7);

export class Ulivo {
  gruppo = new THREE.Group();
  /** L'ingresso dell'uliveto: la sola cosa che risponde al puntatore. */
  cartello: THREE.Mesh;
  private ingresso: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private immagini: { giorno?: HTMLImageElement; notte?: HTMLImageElement } = {};
  private testo = "";
  private sopra = false;
  private gonfio = 1;
  private filo: THREE.Line;
  private piante: Pianta[] = [];
  private olive: THREE.InstancedMesh;
  private dati: Oliva[] = [];
  private reti: { m: THREE.Mesh; pianta: number }[] = [];
  private cassette: { c: THREE.Group; squadra: number; k: number }[] = [];
  private persone = new THREE.Group();
  /** due squadre: ognuna con due che battono e uno che raccoglie */
  private squadre: { battono: Persona[]; raccoglie: Persona; posti: [number, number][]; casse: [number, number] }[] = [];
  private contadino: Persona;
  private passanti: Passante[] = [];
  private carico: THREE.Group;
  private casetta = new THREE.Group();
  private muri: THREE.Object3D;
  private tetto: THREE.Object3D;
  private finestra: THREE.MeshBasicMaterial;
  private fumo: THREE.Sprite[] = [];
  private coni: THREE.Object3D[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  private texture: THREE.Texture[] = [];
  private eNotte = false;

  constructor(notte: boolean) {
    const caso = generatore(4242);
    this.gruppo.position.set(Math.sin(ANGOLO) * DISTANZA, PELO_ACQUA, -Math.cos(ANGOLO) * DISTANZA);
    this.gruppo.rotation.y = Math.PI - ANGOLO;
    this.gruppo.scale.setScalar(SCALA);

    // la terra rossa del podere, la trazzera chiara, il muretto a secco davanti
    const terra = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2).scale(6.2, 1, 3.4).translate(3.6, 0.012, 1.4), stoffa("#8E5638", { roughness: 1 }));
    const strada = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.6).rotateX(-Math.PI / 2).translate(2.8, 0.008, STRADA_Z), stoffa("#C8B48C", { roughness: 1 }));
    this.gruppo.add(terra, strada);
    const pietre: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 74; i++) {
      const x = -4 + i * 0.19 + caso() * 0.05;
      pietre.push(new THREE.DodecahedronGeometry(0.08 + caso() * 0.03, 0).scale(1.3, 0.8, 1).translate(x, 0.07 + (i % 3) * 0.05, STRADA_Z - 0.42));
    }
    const muretto = new THREE.Mesh(mergeGeometries(pietre), stoffa("#D2C7B0", { flatShading: true }));
    pietre.forEach((p) => p.dispose());
    this.gruppo.add(muretto);

    // gli ulivi: tre forme, giorno e notte; il primo col palo da giovane
    const forme = [4242, 977, 3131].map((seme) => {
      const { legnoGeo, frondeGeo, centri } = costruisciUlivo(seme);
      return {
        legnoGeo, frondeGeo, centri,
        argento: frondeGeo.clone().scale(1.015, 0.96, 1.015),
        legnoNotte: accesaDaSotto(legnoGeo, "#8A7A66", 2.3).geometry,
        frondeNotte: accesaDaSotto(frondeGeo, "#8C9A6C", 2.3).geometry,
      };
    });
    const legnoMat = stoffa("#6A5E50", { roughness: 1, flatShading: true });
    const frondeMat = stoffa("#7F8C62", { flatShading: true, roughness: 0.9 });
    const argentoMat = stoffa("#B7BEA3", { flatShading: true, transparent: true, opacity: 0.6 });
    const notteMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const pianta = (x: number, z: number, s: number, nasce: number, cresce: number, f: number) => {
      const forma = forme[f % 3];
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const r = caso() * Math.PI * 2;
      g.rotation.y = r;
      const giorno = new THREE.Group();
      giorno.add(new THREE.Mesh(forma.legnoGeo, legnoMat), new THREE.Mesh(forma.frondeGeo, frondeMat), new THREE.Mesh(forma.argento, argentoMat));
      const notte = new THREE.Group();
      notte.add(new THREE.Mesh(forma.legnoNotte, notteMat), new THREE.Mesh(forma.frondeNotte, notteMat));
      g.add(giorno, notte);
      const tutore = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.2, 6).translate(0.12, 0.6, -0.05), stoffa("#B59A6E"));
      g.add(tutore);
      this.gruppo.add(g);
      this.piante.push({ x, z, s, nasce, cresce, r, g, giorno, notte, tutore });
      return forma;
    };
    const prima = pianta(0, 0, 1, 0, 18, 0);
    FILA.forEach(([x, z, s, t], i) => pianta(x, z, s, t, 16, i + 1));
    SFONDO.forEach(([x, z, s, t], i) => pianta(x, z, s, t, 14, i + 2));

    // le olive: novanta sul primo ulivo, venti su ciascuno della fila
    const metti = (indice: number, quante: number, centri: THREE.Vector3[], terraX: [number, number], terraZ: [number, number]) => {
      for (let i = 0; i < quante; i++) {
        const c = centri[i % centri.length];
        const a = caso() * Math.PI * 2;
        const su = c.clone().add(new THREE.Vector3(Math.cos(a) * (0.25 + caso() * 0.25), -0.12 - caso() * 0.12, Math.sin(a) * (0.2 + caso() * 0.25)));
        this.dati.push({ pianta: indice, su, giu: new THREE.Vector3(terraX[0] + caso() * (terraX[1] - terraX[0]), 0.05, terraZ[0] + caso() * (terraZ[1] - terraZ[0])), ritardo: caso(), matura: caso() });
      }
    };
    metti(0, 90, prima.centri, [0.1, 1.8], [-0.9, 0.3]);
    FILA.forEach(([x, z], i) => metti(i + 1, 22, forme[(i + 1) % 3].centri, [x - 0.5, x + 0.5], [z - 0.5, z + 0.3]));
    this.olive = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.25, 1), new THREE.MeshStandardMaterial({ roughness: 0.4 }), this.dati.length);
    this.olive.frustumCulled = false;
    this.gruppo.add(this.olive);

    // i faretti: sotto il primo ulivo e sotto la fila
    const cono = tela(64, 256, (x) => {
      const g = x.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, "rgba(255,214,150,0.3)");
      g.addColorStop(0.6, "rgba(255,214,150,0.06)");
      g.addColorStop(1, "rgba(255,214,150,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 256);
    });
    this.texture.push(cono);
    const faretto = (x: number, z: number, inclina: number, k: number) => {
      const lampada = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 12).translate(x, 0.03, z), stoffa("#2A2A2C", { metalness: 0.5 }));
      const vetro = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12).rotateX(-Math.PI / 2).translate(x, 0.062, z), new THREE.MeshBasicMaterial({ color: "#FFE2B0" }));
      const fascio = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75 * k, 0.06, 2.4 * k, 20, 1, true).translate(0, 1.2 * k, 0),
        new THREE.MeshBasicMaterial({ map: cono, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
      );
      fascio.position.set(x, 0.06, z);
      fascio.rotation.z = inclina;
      this.coni.push(fascio, vetro);
      this.gruppo.add(lampada, vetro, fascio);
    };
    faretto(0.75, -0.55, -0.35, 1);
    faretto(-0.6, -0.5, 0.3, 1);
    faretto(0.2, 0.6, 0.05, 1);
    FILA.forEach(([x, z]) => faretto(x + 0.35, z - 0.45, -0.25, 0.55));

    // le reti: due sotto il primo ulivo, una sotto ciascuno della fila
    [[0.35, 0, -0.25, 1.0, 1.9], [1.3, 0, -0.25, 1.0, 1.9], ...FILA.map(([x, z], i) => [x, i + 1, z - 0.15, 1.1, 1.2])].forEach(([x, p, z, l, pr]) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(l, pr).rotateX(-Math.PI / 2).translate(0, 0.02, 0), stoffa("#3E7A4C", { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      r.position.set(x, 0, z);
      r.visible = false;
      this.reti.push({ m: r, pianta: p });
      this.gruppo.add(r);
    });

    // la casetta di campagna: muri bianchi, tetto di coppi, porta verde, comignolo
    {
      const c = this.casetta;
      c.position.copy(CASETTA);
      c.rotation.y = -0.25;
      const muri = new THREE.Group();
      muri.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.1).translate(0, 0.4, 0), stoffa("#EFE9DC")));
      muri.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.48, 0.02).translate(-0.3, 0.24, -0.56), stoffa("#3F6B52")));
      this.finestra = new THREE.MeshBasicMaterial({ color: "#3A4A56" });
      muri.add(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.2).translate(0.35, 0.5, -0.561), this.finestra));
      muri.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16).translate(0.5, 1.05, 0.2), stoffa("#E3DCCB")));
      c.add(muri);
      this.muri = muri;
      const tetto = new THREE.Group();
      const falda = new THREE.BoxGeometry(1.75, 0.05, 0.68);
      [-1, 1].forEach((sz) => {
        const f = new THREE.Mesh(falda, stoffa("#B4553A"));
        f.position.set(0, 0.97, sz * 0.29);
        f.rotation.x = sz * 0.5;
        tetto.add(f);
      });
      c.add(tetto);
      this.tetto = tetto;
      const tx = alone("#CFCBC4");
      this.texture.push(tx);
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false }));
        sp.position.set(0.5, 1.3, 0.2);
        this.fumo.push(sp);
        c.add(sp);
      }
      this.gruppo.add(c);
    }

    // le persone
    const persona = (camicia: string, pantaloni: string, cappello?: string, alta = 1, padre = this.persone): Persona => {
      const g = new THREE.Group();
      const p = stoffa(pantaloni);
      const gambe = [-1, 1].map((sx) => {
        const gm = arto(p, 0.04, 0.38);
        gm.position.set(sx * 0.055, 0.44, 0);
        g.add(gm);
        return gm;
      });
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 3, 8).translate(0, 0.6, 0), stoffa(camicia)));
      const t = testa("#2A1F18", cappello);
      t.position.y = 0.88;
      g.add(t);
      const braccia = [-1, 1].map((sx) => {
        const b = arto(stoffa(camicia), 0.026, 0.26);
        b.position.set(sx * 0.12, 0.74, 0);
        g.add(b);
        return b;
      });
      g.scale.setScalar(alta);
      g.visible = false;
      padre.add(g);
      return { g, braccia, gambe };
    };
    const pertica = (p: Persona) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 2.0, 6).translate(0, 1.0, 0), stoffa("#A78B62"));
      m.position.set(0, 0.68, 0.18);
      p.g.add(m);
      p.attrezzo = m;
      return p;
    };
    const cassetta = () => {
      const c = new THREE.Group();
      const chiaro = stoffa("#B88A55");
      for (const [l, a, pr, x, y, z] of [[0.36, 0.02, 0.26, 0, 0, 0], [0.36, 0.12, 0.02, 0, 0.06, 0.12], [0.36, 0.12, 0.02, 0, 0.06, -0.12], [0.02, 0.12, 0.26, 0.17, 0.06, 0], [0.02, 0.12, 0.26, -0.17, 0.06, 0]] as const)
        c.add(new THREE.Mesh(new THREE.BoxGeometry(l, a, pr).translate(x, y, z), chiaro));
      const carico = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.22).translate(0, 0.05, 0), stoffa("#2B2230", { roughness: 0.5 }));
      carico.name = "carico";
      c.add(carico);
      return c;
    };
    this.squadre.push({
      battono: [pertica(persona("#C9B48A", "#3D4049", "#3B3A38")), pertica(persona("#7E93A6", "#3D4049"))],
      raccoglie: persona("#E7E1D3", "#4A4238", "#7A5A3A"),
      posti: [[0.75, -0.75], [1.45, -0.35]],
      casse: [1.5, -1.05],
    });
    this.squadre.push({
      battono: [pertica(persona("#9A6B4A", "#34363C", "#2E2C2A")), pertica(persona("#D9CDB0", "#45413A"))],
      raccoglie: persona("#B0563A", "#2F3138"),
      posti: [[3.3, -0.75], [4.7, -0.7]],
      casse: [5.9, -0.95],
    });
    this.squadre.forEach((sq, k) =>
      [0, 1].forEach((j) => {
        const c = cassetta();
        c.visible = false;
        this.persone.add(c);
        this.cassette.push({ c, squadra: k, k: j });
      })
    );
    // il contadino che pianta la fila, con la zappa
    this.contadino = persona("#8A8F72", "#3D3A34", "#5A4A38");
    const zappa = new THREE.Group();
    zappa.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5).translate(0, -0.4, 0), stoffa("#A78B62")));
    zappa.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.14).translate(0, -0.8, 0.06), stoffa("#7D8288", { metalness: 0.5 })));
    this.contadino.braccia[1].add(zappa);
    this.contadino.attrezzo = zappa;

    // chi passa sulla trazzera
    const nero = stoffa("#1E1E22");
    const ruota = (r: number, colore: THREE.Material = nero, raggi = 1) => {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.018, r * 0.09), 6, 18), colore));
      for (let k = 0; k < raggi; k++) w.add(new THREE.Mesh(new THREE.BoxGeometry(r * 1.9, 0.012, 0.012).rotateZ((k * Math.PI) / raggi), stoffa("#BFC3C8")));
      return w;
    };
    const passante = (g: THREE.Group, da: number, a: number, x0: number, x1: number, ruote: THREE.Object3D[], giri: number, gambe: THREE.Group[] = []) => {
      g.visible = false;
      this.persone.add(g);
      this.passanti.push({ g, da, a, x0, x1, ruote, giri, gambe });
    };
    // il bambino sul triciclo rosso
    {
      const t = new THREE.Group();
      const rosso = stoffa("#C2332B", { roughness: 0.5 });
      const davanti = ruota(0.16);
      davanti.position.set(-0.3, 0.16, 0);
      const dietro = [-1, 1].map((sz) => {
        const w = ruota(0.09);
        w.position.set(0.18, 0.09, sz * 0.13);
        return w;
      });
      t.add(davanti, ...dietro);
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03).translate(-0.05, 0.2, 0), rosso));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.3).translate(0.18, 0.09, 0), rosso));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03).translate(-0.3, 0.3, 0), rosso));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.22).translate(-0.28, 0.42, 0), nero));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.12).translate(0.05, 0.27, 0), nero));
      const bimbo = new THREE.Group();
      bimbo.position.set(0.05, 0.28, 0);
      bimbo.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.14, 3, 8).translate(0, 0.14, 0), stoffa("#E3B23C")));
      const tb = testa("#5A3A22");
      tb.scale.setScalar(0.85);
      tb.position.set(0, 0.34, 0);
      bimbo.add(tb);
      const gambe: THREE.Group[] = [];
      for (const sz of [-1, 1]) {
        const b = arto(stoffa("#E3B23C"), 0.02, 0.17);
        b.position.set(-0.03, 0.22, sz * 0.07);
        b.rotation.z = -1.2;
        bimbo.add(b);
        const gamba = arto(stoffa("#2F4A7A"), 0.026, 0.2);
        gamba.position.set(-0.02, 0.02, sz * 0.045);
        bimbo.add(gamba);
        gambe.push(gamba);
      }
      t.add(bimbo);
      passante(t, 4, 13, 7, -3, [davanti, ...dietro], 30, gambe);
    }
    // il carro coi buoi: passa vuoto mentre l'ulivo cresce, torna carico dopo la seconda raccolta
    this.carico = new THREE.Group();
    {
      const carro = new THREE.Group();
      const bue = stoffa("#E6DED0"), corna = stoffa("#D9C9A3"), muso = stoffa("#3A332E");
      const zampe: THREE.Group[] = [];
      [-0.2, 0.2].forEach((z) => {
        const b = new THREE.Group();
        b.position.set(-1.0, 0, z);
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.22).translate(0, 0.42, 0), bue));
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.16).translate(-0.38, 0.5, 0), bue));
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.12).translate(-0.49, 0.46, 0), muso));
        for (const sz of [-1, 1]) b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.16, 5).rotateX(sz * 1.0).translate(-0.36, 0.64, sz * 0.1), corna));
        for (const [lx, lz] of [[-0.24, -0.07], [-0.24, 0.07], [0.24, -0.07], [0.24, 0.07]]) {
          const z2 = arto(bue, 0.035, 0.26);
          z2.position.set(lx, 0.3, lz);
          b.add(z2);
          zampe.push(z2);
        }
        carro.add(b);
      });
      const legnoScuro = stoffa("#6B4A2E");
      carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.62).translate(-1.3, 0.62, 0), legnoScuro));
      carro.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.04).translate(-0.55, 0.5, 0), legnoScuro));
      const giallo = stoffa("#E2B53A"), rossoCarro = stoffa("#B8322A");
      carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.5).translate(0.25, 0.5, 0), giallo));
      for (const sz of [-1, 1]) carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.03).translate(0.25, 0.62, sz * 0.25), rossoCarro));
      carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.5).translate(0.64, 0.62, 0), rossoCarro));
      const ruote = [-1, 1].map((sz) => {
        const w = ruota(0.28, giallo, 6);
        w.position.set(0.25, 0.3, sz * 0.3);
        carro.add(w);
        return w;
      });
      // il carico: le cassette piene, accatastate
      for (let k = 0; k < 4; k++) {
        const c = cassetta();
        c.position.set(0.05 + (k % 2) * 0.38, 0.53 + Math.floor(k / 2) * 0.13, 0);
        this.carico.add(c);
      }
      carro.add(this.carico);
      const c = new THREE.Group();
      c.position.set(-0.1, 0.52, 0);
      c.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 8).translate(0, 0.2, 0), stoffa("#4D4A44")));
      const tc = testa("#2A1F18", "#2E2C2A");
      tc.position.y = 0.44;
      c.add(tc);
      c.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 5).rotateZ(1.0).translate(-0.3, 0.42, 0.08), stoffa("#8A6A44")));
      carro.add(c);
      passante(carro, 11, 22, 7.5, -3.5, ruote, 22, zampe);
      // la seconda volta: stesso carro, carico
      this.passanti.push({ g: carro, da: 73, a: 85, x0: 7.5, x1: -3.5, ruote, giri: 22, gambe: zampe });
    }
    // il ragazzo in bicicletta: il bambino del triciclo, cresciuto
    {
      const b = new THREE.Group();
      const telaio = stoffa("#2E6FA0", { roughness: 0.5 });
      const r1 = ruota(0.2, nero, 3), r2 = ruota(0.2, nero, 3);
      r1.position.set(-0.32, 0.2, 0);
      r2.position.set(0.32, 0.2, 0);
      b.add(r1, r2);
      b.add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.03).translate(0, 0.42, 0), telaio));
      b.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.03).rotateZ(0.35).translate(0.12, 0.3, 0), telaio));
      b.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.03).translate(-0.3, 0.45, 0), telaio));
      b.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26).translate(-0.3, 0.6, 0), nero));
      const ragazzo = persona("#E3B23C", "#2F4A7A", undefined, 0.85, b);
      ragazzo.g.visible = true;
      ragazzo.g.position.set(0.1, 0.2, 0);
      ragazzo.braccia.forEach((br) => br.rotation.set(0, 0, -1.25));
      passante(b, 54, 60, 7.5, -3.5, [r1, r2], 26, ragazzo.gambe);
    }
    // l'Ape azzurra, con le cassette nel cassone
    {
      const a = new THREE.Group();
      const azzurro = stoffa("#5B8DB8", { roughness: 0.45 });
      a.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.5).translate(-0.45, 0.45, 0), azzurro));
      a.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.4).translate(-0.665, 0.56, 0), new THREE.MeshBasicMaterial({ color: "#26303A" })));
      a.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.56).translate(0.2, 0.3, 0), azzurro));
      for (const sz of [-1, 1]) a.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.02).translate(0.2, 0.39, sz * 0.27), azzurro));
      for (let k = 0; k < 4; k++) {
        const c = cassetta();
        c.position.set(0.0 + (k % 2) * 0.38, 0.34 + Math.floor(k / 2) * 0.13, 0);
        a.add(c);
      }
      const davanti = ruota(0.12);
      davanti.position.set(-0.55, 0.12, 0);
      const dietro = [-1, 1].map((sz) => {
        const w = ruota(0.12);
        w.position.set(0.3, 0.12, sz * 0.28);
        return w;
      });
      a.add(davanti, ...dietro);
      passante(a, 104, 112, 7.5, -3.5, [davanti, ...dietro], 40);
    }
    this.gruppo.add(this.persone);

    // l'ingresso dell'uliveto: una piccola carta in alto, fra le carte, con la vista della trazzera
    const cv = document.createElement("canvas");
    cv.width = 768;
    cv.height = 560;
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(tx);
    this.ingresso = { x: cv.getContext("2d") as CanvasRenderingContext2D, t: tx };
    const L = 1.55 / SCALA;
    this.cartello = new THREE.Mesh(new THREE.PlaneGeometry(L, L * (560 / 768)), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    const Y = (Math.tan(0.2) * DISTANZA + 1.22) / SCALA + (L * (560 / 768)) / 2;
    this.cartello.position.set(0, Y, -0.4);
    this.cartello.rotation.y = Math.PI;
    this.cartello.renderOrder = 10;
    this.cartello.userData.olio = true;
    this.gruppo.add(this.cartello);
    for (const tema of ["giorno", "notte"] as const) {
      const im = new Image();
      im.onload = () => {
        this.immagini[tema] = im;
        this.disegnaIngresso();
      };
      im.src = `/olio/ingresso-${tema}.jpg`;
    }
    this.filo = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, Y - (L * (560 / 768)) / 2, -0.4), new THREE.Vector3(0, 2.6, -0.4)]),
      new THREE.LineBasicMaterial({ color: "#C9B45A", transparent: true, opacity: 0.45, depthWrite: false, fog: false })
    );
    this.gruppo.add(this.filo);

    this.gruppo.traverse((o) => {
      o.frustumCulled = false;
      if (o !== this.cartello) o.raycast = () => undefined;
    });
    this.setNotte(notte);
  }

  /** La carta dell'ingresso: la vista della trazzera, il bordo d'oro, la scritta sotto. */
  private disegnaIngresso() {
    const { x, t } = this.ingresso;
    const W = 768, H = 560, F = 92;
    x.clearRect(0, 0, W, H);
    x.save();
    x.beginPath();
    x.roundRect(4, 4, W - 8, H - 8, 22);
    x.clip();
    const im = this.eNotte ? this.immagini.notte : this.immagini.giorno;
    if (im) {
      // la vista riempie la carta, tagliata al centro
      const k = Math.max(W / im.width, (H - F) / im.height);
      const w = im.width * k, h = im.height * k;
      x.drawImage(im, (W - w) / 2, (H - F - h) / 2, w, h);
    } else {
      const g = x.createLinearGradient(0, 0, 0, H - F);
      g.addColorStop(0, this.eNotte ? "#141A2A" : "#7C9CC4");
      g.addColorStop(1, this.eNotte ? "#2A2620" : "#F0C487");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H - F);
    }
    x.fillStyle = "rgba(16,16,10,0.9)";
    x.fillRect(0, H - F, W, F);
    x.restore();
    x.strokeStyle = "#B9A84E";
    x.lineWidth = 6;
    x.beginPath();
    x.roundRect(4, 4, W - 8, H - 8, 22);
    x.stroke();
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim() || "Georgia, serif";
    x.fillStyle = "#FFFFFF";
    x.font = `300 52px ${serif}`;
    x.textAlign = "left";
    x.textBaseline = "middle";
    x.fillText(this.testo, 36, H - F / 2 + 2, W - 140);
    x.strokeStyle = "#B9A84E";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(W - 92, H - F / 2);
    x.lineTo(W - 44, H - F / 2);
    x.moveTo(W - 62, H - F / 2 - 16);
    x.lineTo(W - 44, H - F / 2);
    x.lineTo(W - 62, H - F / 2 + 16);
    x.stroke();
    t.needsUpdate = true;
  }

  setTesto(testo: string) {
    if (testo === this.testo) return;
    this.testo = testo;
    this.disegnaIngresso();
  }

  evidenzia(si: boolean) {
    this.sopra = si;
  }

  setNotte(notte: boolean) {
    this.eNotte = notte;
    this.piante.forEach((p) => {
      p.giorno.visible = !notte;
      p.notte.visible = notte;
    });
    this.coni.forEach((c) => (c.visible = notte));
    this.persone.visible = !notte;
    this.finestra.color.set(notte ? "#FFC97A" : "#3A4A56");
    this.disegnaIngresso();
  }

  aggiorna(t: number, ridotto: boolean) {
    const meta = this.sopra ? 1.08 : ridotto ? 1 : 1 + 0.02 * Math.sin(t * 2.4 + 1);
    this.gonfio += (meta - this.gonfio) * 0.2;
    this.cartello.scale.setScalar(this.gonfio);
    (this.filo.material as THREE.LineBasicMaterial).opacity = (this.eNotte ? 0.6 : 0.45) * (0.85 + 0.15 * Math.sin(t * 1.7));

    // di notte e con "riduci movimento": il podere cresciuto, fermo, con le olive mature
    const notte = this.eNotte;
    const e = ridotto || notte ? 88 : t % CICLO;
    const fine = 1 - fra(e, 113, 118);

    // gli ulivi: ognuno nasce e cresce; il primo cresce ancora un poco a ogni raccolta
    const scale = this.piante.map((p, i) => {
      let k = fra(e, p.nasce, p.nasce + 1) * (0.12 + 0.88 * fra(e, p.nasce + 1, p.nasce + p.cresce));
      if (i === 0) k += 0.1 * fra(e, 37, 43) + 0.1 * fra(e, 78, 84);
      return k * p.s * fine;
    });
    this.piante.forEach((p, i) => {
      const k = scale[i];
      p.g.visible = k > 0.002;
      p.g.scale.setScalar(Math.max(0.0001, k));
      if (p.tutore) p.tutore.visible = k < p.s * 0.6;
    });

    // la casetta: i muri salgono (42–50), poi il tetto (50–52); dalla terza raccolta fuma
    const muri = fra(e, 42, 50) * fine, tetto = fra(e, 50, 52) * fine;
    this.casetta.visible = muri > 0.002;
    this.muri.scale.set(1, Math.max(0.001, muri), 1);
    this.tetto.visible = tetto > 0.01;
    this.tetto.scale.setScalar(Math.max(0.001, tetto));
    this.fumo.forEach((f, i) => {
      const k = ((t * 0.18 + i / this.fumo.length) % 1);
      f.position.set(0.5 + k * 0.25, 1.3 + k * 1.1, 0.2);
      f.scale.setScalar(0.18 + k * 0.4);
      f.material.opacity = (notte ? 0 : fra(e, 78, 82) * fine) * (1 - k) * 0.55;
    });

    // in quale raccolta siamo
    const r = RACCOLTE.find((x) => e >= x.a - 8 && e < x.b + 2);
    // le olive
    this.dati.forEach((o, i) => {
      const p = this.piante[o.pianta];
      let vis = 0;
      const sul = this.v.copy(o.su).applyAxisAngle(this.w.set(0, 1, 0), p.r).multiplyScalar(scale[o.pianta]).add(this.s.set(p.x, 0, p.z));
      let pos = sul;
      if (r && r.alberi.includes(o.pianta)) {
        vis = fra(e, r.a - 8, r.a - 5);
        const cade = r.a + 3 + o.ritardo * (r.b - r.a - 7);
        if (e > cade) {
          const k = Math.min(1, (e - cade) / 0.5);
          pos = sul.lerp(o.giu, k * k);
          if (k >= 1) vis *= 1 - fra(e, r.b - 3, r.b - 1.5);
        }
      }
      this.s.setScalar(Math.max(0.0001, vis * Math.min(1, scale[o.pianta] * 1.4)));
      this.m.compose(pos, this.q, this.s);
      this.olive.setMatrixAt(i, this.m);
      const nero = r ? fra(e, r.a - 5 + o.matura * 2, r.a + 1) : 0;
      this.col.set("#7C8A3C").lerp(new THREE.Color(o.matura > 0.6 ? "#3A2238" : "#21181E"), nero);
      this.olive.setColorAt(i, this.col);
    });
    this.olive.instanceMatrix.needsUpdate = true;
    if (this.olive.instanceColor) this.olive.instanceColor.needsUpdate = true;
    if (notte) return;

    // chi passa sulla trazzera
    const usati = new Set<THREE.Group>();
    this.passanti.forEach((ps) => {
      const k = (e - ps.da) / (ps.a - ps.da);
      const dentro = k > 0 && k < 1;
      if (usati.has(ps.g) && !dentro) return;
      ps.g.visible = dentro;
      if (!dentro) return;
      usati.add(ps.g);
      ps.g.position.set(THREE.MathUtils.lerp(ps.x0, ps.x1, k), Math.abs(Math.sin(k * 60)) * 0.008, STRADA_Z);
      ps.ruote.forEach((w) => (w.rotation.z = k * ps.giri));
      ps.gambe.forEach((g, j) => (g.rotation.z = Math.sin(k * ps.giri * 2.4 + j * Math.PI) * 0.4));
    });
    // il carro passa vuoto la prima volta, carico la seconda
    this.carico.visible = e > 60;

    // il contadino pianta la fila (36–50): si ferma a ogni posto e zappa
    const c = this.contadino;
    c.g.visible = e > 35 && e < 51;
    if (c.g.visible) {
      const tappe = FILA.map(([x, z, , q]) => ({ x, z, q }));
      let x = 8, z = -0.6, zappa = false;
      if (e < tappe[0].q - 1) {
        const k = fra(e, 35, tappe[0].q - 1);
        x = THREE.MathUtils.lerp(9.5, tappe[0].x + 0.4, k);
        z = THREE.MathUtils.lerp(STRADA_Z, tappe[0].z - 0.5, k);
      } else {
        const i = tappe.findIndex((tp, j) => e < (tappe[j + 1]?.q ?? 51) - 1);
        const tp = tappe[Math.max(0, i)];
        const dopo = tappe[i + 1];
        const fermo = e < tp.q + 1;
        if (fermo || !dopo) {
          x = tp.x + 0.4;
          z = tp.z - 0.5;
          zappa = fermo;
        } else {
          const k = fra(e, tp.q + 1, dopo.q - 1);
          x = THREE.MathUtils.lerp(tp.x + 0.4, dopo.x + 0.4, k);
          z = tp.z - 0.5;
        }
        if (!dopo && !fermo) {
          const k = fra(e, tp.q + 1, 50.5);
          x = THREE.MathUtils.lerp(tp.x + 0.4, 9.5, k);
          z = THREE.MathUtils.lerp(tp.z - 0.5, STRADA_Z, k);
        }
      }
      const prima = c.g.position.clone();
      c.g.position.set(x, 0, z);
      const dx = x - prima.x;
      c.g.rotation.y = zappa ? Math.PI * 0.5 + 0.6 : dx > 0.0005 ? Math.PI / 2 : dx < -0.0005 ? -Math.PI / 2 : c.g.rotation.y;
      c.gambe.forEach((g, j) => (g.rotation.x = zappa ? 0 : Math.sin(t * 9 + j * Math.PI) * 0.5));
      c.braccia[1].rotation.x = zappa ? -1.6 + Math.abs(Math.sin(t * 4)) * 1.4 : 0;
      c.braccia[0].rotation.x = zappa ? -1.0 : 0;
    }

    // le raccolte: reti, chi batte, chi raccoglie, le cassette
    const ENTRATA = 9.5;
    this.reti.forEach((rt) => {
      const k = r && r.alberi.includes(rt.pianta) ? fra(e, r.a + 0.5, r.a + 2.5) * (1 - fra(e, r.b - 3, r.b - 1.5)) : 0;
      rt.m.visible = k > 0.01;
      rt.m.scale.set(1, 1, Math.max(0.001, k));
    });
    this.squadre.forEach((sq, n) => {
      const attiva = !!r && n < r.squadre;
      const lavoro = attiva && r ? fra(e, r.a - 0.5, r.a + 2) * (1 - fra(e, r.b - 1.5, r.b + 1)) : 0;
      sq.battono.forEach((p, k) => {
        const [x, z] = sq.posti[k];
        p.g.visible = lavoro > 0.01;
        const cammina = lavoro > 0.02 && lavoro < 0.98;
        p.g.position.set(THREE.MathUtils.lerp(ENTRATA + k * 0.6, x, lavoro), 0, THREE.MathUtils.lerp(STRADA_Z, z, lavoro));
        // davanti verso +z: per guardare l'ulivo più vicino
        const albero = n === 0 ? this.piante[0] : this.piante[1 + Math.min(3, Math.round((x - 2.7) / 1.3))];
        p.g.rotation.y = cammina ? -Math.PI / 2 : Math.atan2(albero.x - x, albero.z - z);
        p.gambe.forEach((g, j) => (g.rotation.x = cammina ? Math.sin(t * 9 + j * Math.PI) * 0.5 : 0));
        const batte = r && !cammina && lavoro > 0.5 && e > r.a + 3 && e < r.b - 3 ? Math.pow(Math.abs(Math.sin(t * 3.4 + k * 1.3 + n)), 4) : 0;
        if (p.attrezzo) {
          p.attrezzo.visible = !cammina;
          p.attrezzo.rotation.x = 0.5 + batte * 0.35;
        }
        p.braccia.forEach((br) => (br.rotation.x = cammina ? 0 : -1.4 - batte * 0.3));
      });
      const rc = sq.raccoglie;
      const via = attiva && r ? fra(e, r.b - 3, r.b + 1) : 0;
      const arriva = attiva && r ? fra(e, r.a + 1, r.a + 4) : 0;
      rc.g.visible = arriva > 0.01 && via < 0.99;
      const accucciato = arriva > 0.98 && via < 0.01;
      const [cx, cz] = sq.casse;
      const xr = via > 0 ? THREE.MathUtils.lerp(cx - 0.4, ENTRATA, via) : THREE.MathUtils.lerp(ENTRATA, cx - 0.4, arriva);
      const zr = via > 0 ? THREE.MathUtils.lerp(cz + 0.05, STRADA_Z, via) : THREE.MathUtils.lerp(STRADA_Z, cz + 0.05, arriva);
      rc.g.position.set(xr, 0, zr);
      rc.g.rotation.y = via > 0 ? Math.PI / 2 : accucciato ? 0.8 : -Math.PI / 2;
      rc.g.scale.y = accucciato ? 0.66 : 1;
      rc.gambe.forEach((g, j) => (g.rotation.x = accucciato ? 0 : Math.sin(t * 9 + j * Math.PI) * 0.5));
      rc.braccia.forEach((br, k) => br.rotation.set(accucciato ? -1.2 + Math.sin(t * 4 + k) * 0.4 : via > 0 ? -1.3 : 0, 0, 0));
      const piene = attiva && r ? fra(e, r.a + 5, r.b - 4) : 0;
      this.cassette.filter((x) => x.squadra === n).forEach(({ c, k }) => {
        const vis = attiva && r ? fra(e, r.a + 3.5, r.a + 4.5) * (1 - fra(e, r.b + 0.6, r.b + 1)) : 0;
        c.visible = vis > 0.01;
        c.scale.setScalar(Math.max(0.001, vis));
        (c.getObjectByName("carico") as THREE.Mesh).scale.y = Math.max(0.001, fra(piene, k * 0.5, k * 0.5 + 0.5));
        if (via > 0) {
          c.position.copy(rc.g.position).add(this.v.set(0, 0.62 + k * 0.13, 0.15));
          c.rotation.y = rc.g.rotation.y;
        } else {
          c.position.set(cx + k * 0.36, 0, cz);
          c.rotation.y = 0.2;
        }
      });
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
