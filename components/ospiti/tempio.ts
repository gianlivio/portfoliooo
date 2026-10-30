import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, fra, generatore, liberaTutto } from "./comuni";
import { rilievo } from "./meraviglie";

/**
 * Il tempio olografico ai piedi dell'Etna, su un colle come quello di Segesta, sopra il bordo della carta
 * bassa che gli sta davanti: un dorico di sei colonne per dieci, visto di tre quarti.
 * In un minuto passano i secoli. Il tempio si stampa a fette dal basso; salgono i fedeli in processione,
 * pregano davanti alla cella, l'incenso sale. Poi le epoche: crolla il tetto, cadono il frontone, pezzi di
 * trabeazione, alcune colonne, si alza la polvere; i fedeli si diradano e al loro posto arrivano i turisti,
 * sparsi fra le rovine, con la guida e i flash delle fotografie. Infine tutto si cancella dall'alto e ricomincia.
 * Il colore va dall'oro del sacro all'azzurro di oggi; di notte più acceso. Il colle è vero, di terra ed erba secca.
 * Con "riduci movimento" non viene aggiornato e resta il tempio intero, fermo.
 */

const SU = PELO_ACQUA - 0.3;
/** Dietro la seconda carta a destra della zona (la più bassa), sotto il fianco sinistro dell'Etna. */
export const TEMPIO_A = ANGOLO_ZONA + 1.29;
export const TEMPIO_D = 22;
/** Il ripiano del colle: sopra il bordo della carta bassa davanti, visto dal centro. */
export const TEMPIO_Y = 2.55;
const SCALA = 1.15;
const CICLO = 64;

/* Le misure del tempio, in unità locali (prima di SCALA). La facciata guarda verso −z. */
const NF = 6; // colonne in facciata
const NL = 10; // colonne sul fianco
const PASSO_C = 0.42;
const LX = ((NF - 1) * PASSO_C) / 2; // metà della facciata, agli assi delle colonne
const LZ = ((NL - 1) * PASSO_C) / 2;
const GRADINO = 0.09;
const STILOBATE = GRADINO * 3;
const FUSTO = 1.02;
const CAPITELLO = 0.1;
const ARCHITRAVE = 0.13;
const FREGIO = 0.13;
const CORNICE = 0.05;
const IMPOSTA = STILOBATE + FUSTO + CAPITELLO; // dove poggia la trabeazione
const GRONDA = IMPOSTA + ARCHITRAVE + FREGIO + CORNICE;
const FRONTONE = 0.36;
const CIMA = GRONDA + FRONTONE;

const VERT = /* glsl */ `
varying vec3 vNw;
varying vec3 vV;
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vNw = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uBase;
uniform float uTaglio;
uniform float uCima;
uniform vec3 uColore;
uniform vec3 uLuce;
varying vec3 vNw;
varying vec3 vV;
varying vec3 vW;
void main(){
  float h = vW.y - uBase;
  if (h > uTaglio) discard;
  #ifdef MASCHERA
  gl_FragColor = vec4(0.0);
  #else
  vec3 n = normalize(vNw);
  float bordo = smoothstep(0.07, 0.0, uTaglio - h) * step(uTaglio, uCima);
  float fres = pow(1.0 - abs(dot(n, normalize(vV))), 1.6);
  // una luce finta che viene dall'alto di lato: le facce si distinguono, le scanalature si leggono
  float luce = 0.42 + 0.78 * max(dot(n, uLuce), 0.0) + 0.1 * n.y;
  float righe = 0.9 + 0.1 * step(0.5, fract(vW.y * 9.0 - uT * 0.8));
  float banda = smoothstep(0.1, 0.0, abs(fract(h * 0.35 - uT * 0.18) - 0.5) - 0.4);
  float tremo = 0.94 + 0.06 * sin(uT * 29.0) * sin(uT * 6.3);
  float a = (0.86 + 0.14 * fres + banda * 0.08) * righe * tremo * uVis + bordo * 0.9;
  vec3 c = uColore * luce * (0.8 + 0.6 * fres) + vec3(0.85, 0.95, 1.0) * (banda * 0.3 + bordo);
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #endif
  #include <colorspace_fragment>
}`;

const LINEA_VERT = /* glsl */ `
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const LINEA_FRAG = /* glsl */ `
uniform float uVis;
uniform float uBase;
uniform float uTaglio;
uniform vec3 uColore;
varying vec3 vW;
void main(){
  if (vW.y - uBase > uTaglio) discard;
  gl_FragColor = vec4(uColore, 0.45 * uVis);
  #include <colorspace_fragment>
}`;

/** Come cade un pezzo: le colonne si piegano sulla base verso fuori, il resto scende e si inclina. */
type Modo = "ritto" | "colonna" | "giu";
type Pezzo = {
  o: THREE.Group;
  modo: Modo;
  /** l'istante del crollo, nel ciclo; Infinity se resta in piedi */
  cade: number;
  dura: number;
  /** posizione e rotazione da intero */
  p0: THREE.Vector3;
  /** dove finisce: per le colonne l'asse attorno a cui si piega, per gli altri lo spostamento */
  asse: THREE.Vector3;
  giu: number;
  gira: THREE.Euler;
  polvere: boolean;
};

type Figura = {
  g: THREE.Group;
  /** in ginocchio: la parte di sopra che si abbassa */
  busto: THREE.Object3D;
  mat: THREE.MeshBasicMaterial;
  /** posto fra le rovine, da turista */
  tx: number;
  tz: number;
  fase: number;
  guida: boolean;
};

const ORO = { giorno: new THREE.Color("#C2620E"), notte: new THREE.Color("#FFC25A") };
const AZZURRO = { giorno: new THREE.Color("#1E6CC4"), notte: new THREE.Color("#5CB8FF") };
const PELLEGRINO = { giorno: new THREE.Color("#8E4A12"), notte: new THREE.Color("#FFD890") };
const TURISTA = { giorno: new THREE.Color("#0E58A8"), notte: new THREE.Color("#A8DCFF") };

const ritmo = (x: number) => x * x; // la caduta accelera

/* Il colle: un ripiano ellittico appena più largo del tempio, poi i fianchi che scendono fin sotto il pavimento.
   Il ripiano stretto fa sì che da quaggiù se ne veda anche la scalinata. */
const COLLE_A = 2.0, COLLE_B = 2.95;
const COLLE_H = TEMPIO_Y - SU + 0.4;
function quotaColle(x: number, z: number) {
  const t = Math.hypot(x / COLLE_A, z / COLLE_B);
  const k = t < 1 ? 0 : THREE.MathUtils.smoothstep(t, 1, 2.7);
  const rugo = 0.1 * Math.sin(x * 1.7 + z * 0.9) + 0.07 * Math.sin(x * 3.9 - z * 2.3) + 0.04 * Math.sin(z * 6.1 + x);
  return -COLLE_H * k + rugo * Math.min(1, k * 3) - 0.02;
}

export class TempioEtna {
  gruppo: THREE.Group;
  private tempio = new THREE.Group();
  private pezzi: Pezzo[] = [];
  private figure: Figura[] = [];
  private flash: THREE.Sprite[] = [];
  private polveri: { s: THREE.Sprite; pezzo: Pezzo }[] = [];
  private fiamma: THREE.Sprite;
  private incenso: THREE.Points;
  private texture: THREE.Texture[] = [];
  private uni = {
    uT: { value: 0 },
    uVis: { value: 1 },
    uBase: { value: TEMPIO_Y },
    uTaglio: { value: 99 },
    uCima: { value: CIMA * SCALA },
    uColore: { value: new THREE.Color() },
    uLuce: { value: new THREE.Vector3(-0.5, 0.75, -0.45).normalize() },
  };
  private uniLinee = { uVis: this.uni.uVis, uBase: this.uni.uBase, uTaglio: this.uni.uTaglio, uColore: { value: new THREE.Color() } };
  private notte = false;
  private colore = new THREE.Color();

  constructor() {
    const a = TEMPIO_A;
    this.gruppo = new THREE.Group();
    this.gruppo.position.set(Math.sin(a) * TEMPIO_D, TEMPIO_Y, -Math.cos(a) * TEMPIO_D);
    // la facciata verso chi guarda, girata quanto basta per vedere anche il fianco lungo
    this.gruppo.rotation.y = Math.PI - a + 0.62;
    this.gruppo.add(this.colle());
    this.tempio.scale.setScalar(SCALA);
    this.gruppo.add(this.tempio);

    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uni, transparent: true, depthWrite: false, fog: false });
    const maschera = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uni,
      defines: { MASCHERA: 1 },
      transparent: true,
      colorWrite: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      fog: false,
    });
    const linee = new THREE.ShaderMaterial({ vertexShader: LINEA_VERT, fragmentShader: LINEA_FRAG, uniforms: this.uniLinee, transparent: true, depthWrite: false, fog: false });

    const r = generatore(11);
    /** Un pezzo del tempio: la geometria ha l'origine dove il pezzo si appoggia (la base, per le colonne). */
    const pezzo = (geo: THREE.BufferGeometry, x: number, y: number, z: number, modo: Modo, cade = Infinity, extra: Partial<Pezzo> = {}) => {
      const o = new THREE.Group();
      o.position.set(x, y, z);
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = 8;
      const k = new THREE.Mesh(geo, maschera);
      k.renderOrder = 7;
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), linee);
      l.renderOrder = 9;
      o.add(k, m, l);
      this.tempio.add(o);
      const p: Pezzo = {
        o,
        modo,
        cade,
        dura: modo === "colonna" ? 1.5 : 1.1,
        p0: o.position.clone(),
        asse: new THREE.Vector3(),
        giu: 0,
        gira: new THREE.Euler(),
        polvere: false,
        ...extra,
      };
      this.pezzi.push(p);
      return p;
    };

    // il crepidoma: tre gradini
    for (let i = 0; i < 3; i++) {
      const lx = LX * 2 + 0.62 - i * 0.12, lz = LZ * 2 + 0.62 - i * 0.12;
      pezzo(new THREE.BoxGeometry(lx, GRADINO, lz).translate(0, GRADINO / 2, 0), 0, i * GRADINO, 0, "ritto");
    }
    // la cella: i muri lunghi, quello di fondo, il pronao con le due ante e la porta
    const CX = LX - 0.36, CZ = LZ - 0.5;
    const MURO = FUSTO + CAPITELLO;
    const muro = (l: number, p: number) => new THREE.BoxGeometry(l, MURO, p).translate(0, MURO / 2, 0);
    pezzo(muro(0.1, CZ * 2), -CX, STILOBATE, 0, "giu", 27.2, { giu: MURO * 0.55, gira: new THREE.Euler(0, 0, 0.5) });
    pezzo(muro(0.1, CZ * 2), CX, STILOBATE, 0, "ritto");
    pezzo(muro(CX * 2 + 0.1, 0.1), 0, STILOBATE, CZ, "ritto");
    for (const s of [-1, 1]) pezzo(muro(CX - 0.17, 0.1).translate(((CX - 0.17) / 2 + 0.17) * s, 0, 0), 0, STILOBATE, -CZ, "ritto");
    pezzo(new THREE.BoxGeometry(0.34, MURO - 0.62, 0.1).translate(0, 0.62 + (MURO - 0.62) / 2, 0), 0, STILOBATE, -CZ, "giu", 26.4, { giu: 0.8, gira: new THREE.Euler(0.9, 0, 0.2) });

    // il peristilio: colonne doriche scanalate (venti facce), il collarino, l'echino, l'abaco
    const colonna = () => {
      const fusto = new THREE.CylinderGeometry(0.068, 0.088, FUSTO, 20, 1).translate(0, FUSTO / 2, 0);
      const echino = new THREE.CylinderGeometry(0.11, 0.072, CAPITELLO * 0.55, 20, 1).translate(0, FUSTO + CAPITELLO * 0.275, 0);
      const abaco = new THREE.BoxGeometry(0.24, CAPITELLO * 0.45, 0.24).translate(0, FUSTO + CAPITELLO * 0.775, 0);
      const parti = [fusto, echino, abaco].map((g) => (g.index ? g.toNonIndexed() : g));
      const n = parti.reduce((s, g) => s + g.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let o = 0;
      parti.forEach((g) => {
        pos.set(g.attributes.position.array as Float32Array, o * 3);
        nor.set(g.attributes.normal.array as Float32Array, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      return geo;
    };
    const posti: [number, number][] = [];
    for (let i = 0; i < NF; i++) posti.push([-LX + i * PASSO_C, -LZ], [-LX + i * PASSO_C, LZ]);
    for (let j = 1; j < NL - 1; j++) posti.push([-LX, -LZ + j * PASSO_C], [LX, -LZ + j * PASSO_C]);
    // quelle che cadono: sul fianco che si vede e in facciata, a gruppi, come nelle rovine vere
    const cadono = new Map<string, number>([
      [`${-LX + 1 * PASSO_C},${-LZ}`, 29.4],
      [`${-LX + 2 * PASSO_C},${-LZ}`, 30.1],
      [`${-LX},${-LZ + 3 * PASSO_C}`, 31.0],
      [`${-LX},${-LZ + 4 * PASSO_C}`, 31.5],
      [`${-LX},${-LZ + 6 * PASSO_C}`, 32.4],
      [`${LX},${-LZ + 5 * PASSO_C}`, 30.6],
      [`${-LX + 4 * PASSO_C},${LZ}`, 31.9],
      [`${-LX + 3 * PASSO_C},${LZ}`, 32.8],
    ]);
    posti.forEach(([x, z]) => {
      const quando = cadono.get(`${x},${z}`) ?? Infinity;
      // si piega verso fuori, un poco di sbieco
      const fuori = new THREE.Vector3(Math.abs(x) > LX - 0.01 ? Math.sign(x) : 0, 0, Math.abs(z) > LZ - 0.01 ? Math.sign(z) : 0);
      fuori.x += (r() - 0.5) * 0.6;
      fuori.normalize();
      const asse = new THREE.Vector3(fuori.z, 0, -fuori.x); // ruotando attorno a questo, la cima va verso fuori
      pezzo(colonna(), x, STILOBATE, z, "colonna", quando, { asse, dura: 1.4 + r() * 0.5 });
    });

    // la trabeazione: architrave, fregio coi triglifi, cornice; a tratti fra un asse e l'altro, perché cada a pezzi
    const trabeazione = (l: number, lungoX: boolean) => {
      const g: THREE.BufferGeometry[] = [];
      const box = (lx: number, ly: number, lz: number, x: number, y: number, z: number) => g.push(new THREE.BoxGeometry(lungoX ? lx : lz, ly, lungoX ? lz : lx).translate(lungoX ? x : z, y, lungoX ? z : x).toNonIndexed());
      box(l, ARCHITRAVE, 0.2, 0, ARCHITRAVE / 2, 0);
      box(l, FREGIO, 0.17, 0, ARCHITRAVE + FREGIO / 2, 0);
      // i triglifi sporgono appena, sopra ogni colonna e a metà
      const n = Math.max(1, Math.round(l / (PASSO_C / 2)));
      for (let i = 0; i <= n; i++) box(0.06, FREGIO * 0.9, 0.035, -l / 2 + (i * l) / n, ARCHITRAVE + FREGIO / 2, -0.1);
      box(l + 0.04, CORNICE, 0.26, 0, ARCHITRAVE + FREGIO + CORNICE / 2, 0);
      const n0 = g.reduce((s, x) => s + x.attributes.position.count, 0);
      const pos = new Float32Array(n0 * 3), nor = new Float32Array(n0 * 3);
      let o = 0;
      g.forEach((x) => {
        pos.set(x.attributes.position.array as Float32Array, o * 3);
        nor.set(x.attributes.normal.array as Float32Array, o * 3);
        o += x.attributes.position.count;
        x.dispose();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      return geo;
    };
    // facciata e retro: tre tratti ciascuno; fianchi: quattro tratti
    const cadeTratto = new Map<string, number>([
      ["f0", 29.0],
      ["f1", 29.7],
      ["s1", 30.8],
      ["s2", 31.2],
      ["d2", 30.3],
      ["r1", 32.5],
    ]);
    for (const [lato, z] of [["f", -LZ], ["r", LZ]] as const) {
      for (let i = 0; i < 3; i++) {
        const l = (LX * 2 + 0.24) / 3;
        const x = -LX - 0.12 + l * (i + 0.5);
        // il retro guarda dall'altra parte: i triglifi verso fuori
        const geo = trabeazione(l, true);
        if (lato === "r") geo.rotateY(Math.PI);
        const quando = cadeTratto.get(`${lato}${i}`) ?? Infinity;
        pezzo(geo, x, IMPOSTA, z, "giu", quando, { giu: IMPOSTA - STILOBATE - 0.05 + r() * 0.02, gira: new THREE.Euler((r() - 0.5) * 0.5, (r() - 0.5) * 0.8, (r() - 0.5) * 0.4) });
      }
    }
    for (const [lato, x] of [["s", -LX], ["d", LX]] as const) {
      for (let i = 0; i < 4; i++) {
        const l = (LZ * 2 - 0.2) / 4;
        const z = -LZ + 0.1 + l * (i + 0.5);
        const geo = trabeazione(l, false);
        if (lato === "d") geo.rotateY(Math.PI);
        const quando = cadeTratto.get(`${lato}${i}`) ?? Infinity;
        // fuori dal tempio, oltre le colonne cadute
        pezzo(geo, x, IMPOSTA, z, "giu", quando, { giu: IMPOSTA - 0.02, gira: new THREE.Euler((r() - 0.5) * 0.4, (r() - 0.5) * 0.6, Math.sign(x) * (0.3 + r() * 0.3)), asse: new THREE.Vector3(Math.sign(x) * 0.35, 0, 0) });
      }
    }

    // i frontoni, col timpano arretrato e la cornice obliqua
    const frontone = () => {
      const s = new THREE.Shape();
      s.moveTo(-LX - 0.14, 0);
      s.lineTo(LX + 0.14, 0);
      s.lineTo(0, FRONTONE);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11);
    };
    pezzo(frontone(), 0, GRONDA, -LZ, "giu", 28.2, { giu: GRONDA - 0.12, gira: new THREE.Euler(-1.25, 0.15, 0.1), asse: new THREE.Vector3(0, 0, -0.45) });
    pezzo(frontone(), 0, GRONDA, LZ, "ritto");
    // il tetto a due falde: cade per primo, dentro la cella
    const falda = Math.hypot(LX + 0.14, FRONTONE);
    const incl = Math.atan2(FRONTONE, LX + 0.14);
    for (const s of [-1, 1]) {
      const geo = new THREE.BoxGeometry(falda + 0.06, 0.035, LZ * 2 + 0.3).translate((s * (falda + 0.06)) / 2, 0, 0).rotateZ(-s * incl);
      pezzo(geo, 0, GRONDA + FRONTONE + 0.02, 0, "giu", s < 0 ? 26.0 : 26.6, { giu: GRONDA + FRONTONE - STILOBATE - 0.2, gira: new THREE.Euler(0.15 * s, 0, s * incl * 0.9) });
    }

    // le figure: fedeli, poi turisti. Corpo a campana (le vesti), testa; la guida ha l'ombrello alzato
    const tondo = alone("#FFFFFF");
    this.texture.push(tondo);
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false });
      const gambe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.09, 6).translate(0, 0.045, 0), m);
      const busto = new THREE.Group();
      busto.position.y = 0.09;
      busto.add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.075, 6).translate(0, 0.0375, 0), m));
      busto.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6).translate(0, 0.098, 0), m));
      const guida = i === 13;
      if (guida) {
        busto.add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 4).translate(0.03, 0.13, 0), m));
        busto.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.025, 8).translate(0.03, 0.215, 0), m));
      }
      g.add(gambe, busto);
      g.traverse((o) => (o.renderOrder = 10));
      this.tempio.add(g);
      const ang = r() * Math.PI * 2;
      this.figure.push({
        g,
        busto,
        mat: m,
        // fra le rovine davanti e sul fianco che si vede, sul ripiano
        tx: guida ? -0.5 : Math.cos(ang) * (LX + 0.55 + r() * 0.35),
        tz: guida ? -LZ - 0.75 : Math.min(-LZ - 0.4, Math.sin(ang) * (LZ + 0.6)) * (0.5 + r() * 0.5),
        fase: r() * 10,
        guida,
      });
    }
    // i flash delle fotografie
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, color: "#FFFFFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
      s.scale.setScalar(0.32);
      s.renderOrder = 11;
      this.flash.push(s);
      this.tempio.add(s);
    }
    // la polvere dei crolli
    this.pezzi.forEach((p) => {
      if (!isFinite(p.cade)) return;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, color: "#D9CBB0", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      s.renderOrder = 11;
      this.polveri.push({ s, pezzo: p });
      this.tempio.add(s);
    });
    // il fuoco sull'altare davanti alla cella, e l'incenso che sale
    this.fiamma = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, color: "#FFB040", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    this.fiamma.position.set(0, STILOBATE + 0.12, -LZ - 0.55);
    this.fiamma.scale.setScalar(0.35);
    this.fiamma.renderOrder = 11;
    this.tempio.add(this.fiamma);
    const ni = 60;
    const gi = new THREE.BufferGeometry();
    gi.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(ni * 3), 3));
    this.incenso = new THREE.Points(gi, new THREE.PointsMaterial({ color: "#E8DCC8", size: 0.05, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.incenso.renderOrder = 11;
    this.tempio.add(this.incenso);
    // l'altare: un blocco basso davanti alla scalinata
    const altare = pezzo(new THREE.BoxGeometry(0.3, 0.14, 0.18).translate(0, 0.07, 0), 0, 0, -LZ - 0.55, "ritto");
    altare.o.position.y = 0;

    this.gruppo.traverse((o) => {
      o.frustumCulled = false;
    });
    this.setNotte(false);
    // fermo, se nessuno lo aggiorna: il tempio intero coi fedeli
    this.posa(16, 16);
  }

  /** Il colle: ripiano piatto, fianchi che scendono fino sotto il pavimento, roccia dove è ripido, qualche cipresso. */
  private colle() {
    const A = COLLE_A, B = COLLE_B;
    const r = generatore(4);
    const geo = rilievo(-A * 2.8, A * 2.8, -B * 2.8, B * 2.8, 64, 64, quotaColle);
    geo.computeVertexNormals();
    const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const erba = new THREE.Color("#B39A5C"), secca = new THREE.Color("#C9B27A"), verde = new THREE.Color("#7E8452"), roccia = new THREE.Color("#7D746A");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), ny = nor.getY(i);
      const macchia = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 1.3) * 2);
      c.copy(erba).lerp(secca, macchia * 0.6).lerp(verde, Math.max(0, Math.sin(x * 0.6 - z * 0.8)) * 0.35);
      c.lerp(roccia, THREE.MathUtils.smoothstep(1 - ny, 0.25, 0.5) * 0.85);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
    // cipressi e qualche ulivo sui fianchi, non davanti al tempio
    const alberi: THREE.BufferGeometry[] = [];
    const scuro = new THREE.Color("#2F3F25"), oliva = new THREE.Color("#5F6B45");
    const tinta = (geo: THREE.BufferGeometry, cc: THREE.Color) => {
      const g2 = geo.index ? geo.toNonIndexed() : geo;
      g2.deleteAttribute("uv");
      const n = g2.attributes.position.count;
      const cs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cs.set([cc.r, cc.g, cc.b], i * 3);
      g2.setAttribute("color", new THREE.BufferAttribute(cs, 3));
      alberi.push(g2);
    };
    for (let i = 0; i < 16; i++) {
      const ang = r() * Math.PI * 2;
      const t = 1.15 + r() * 1.2;
      const x = Math.cos(ang) * A * t, z = Math.sin(ang) * B * t;
      if (z < -B * 0.6 && Math.abs(x) < A * 1.2) continue; // davanti, verso chi guarda: libero
      const y = quotaColle(x, z) - 0.05;
      if (i % 3 === 0) tinta(new THREE.SphereGeometry(0.32 + r() * 0.15, 8, 6).scale(1.2, 0.8, 1.1).translate(x, y + 0.3, z), oliva);
      else tinta(new THREE.ConeGeometry(0.16, 1.1 + r() * 0.5, 7).translate(x, y + 0.55, z), scuro);
    }
    const n = alberi.reduce((s, x) => s + x.attributes.position.count, 0);
    const p = new Float32Array(n * 3), cl = new Float32Array(n * 3);
    let o = 0;
    alberi.forEach((x) => {
      p.set(x.attributes.position.array as Float32Array, o * 3);
      cl.set(x.attributes.color.array as Float32Array, o * 3);
      o += x.attributes.position.count;
      x.dispose();
    });
    const ga = new THREE.BufferGeometry();
    ga.setAttribute("position", new THREE.BufferAttribute(p, 3));
    ga.setAttribute("color", new THREE.BufferAttribute(cl, 3));
    ga.computeVertexNormals();
    g.add(new THREE.Mesh(ga, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true })));
    return g;
  }

  setNotte(notte: boolean) {
    this.notte = notte;
  }

  aggiorna(t: number) {
    this.posa(t % CICLO, t);
  }

  /** Il tempio all'istante e del ciclo. */
  private posa(e: number, t: number) {
    const N = this.notte ? "notte" : "giorno";
    const S = SCALA;
    this.uni.uT.value = t;
    // 0–7 si stampa dal basso; 57–62 si cancella dall'alto; 62–64 niente
    const stampa = fra(e, 0.3, 7);
    const cancella = fra(e, 57, 62);
    this.uni.uTaglio.value = e < 30 ? -0.05 + stampa * (CIMA * S + 0.1) : (1 - cancella) * (CIMA * S + 0.1) - 0.05;
    this.uni.uVis.value = 1;
    // l'oro del sacro che passa all'azzurro di oggi, mentre crolla
    const epoche = fra(e, 25, 36);
    this.colore.copy(ORO[N]).lerp(AZZURRO[N], epoche);
    this.uni.uColore.value.copy(this.colore);
    this.uniLinee.uColore.value.copy(this.colore).lerp(new THREE.Color("#FFFFFF"), this.notte ? 0.35 : 0.1);

    // i crolli
    this.pezzi.forEach((p) => {
      const k = isFinite(p.cade) ? ritmo(Math.min(1, Math.max(0, (e - p.cade) / p.dura))) : 0;
      if (p.modo === "colonna") {
        p.o.position.copy(p.p0);
        p.o.quaternion.setFromAxisAngle(p.asse, k * 1.5);
        p.o.position.y = p.p0.y - k * 0.06;
      } else if (p.modo === "giu") {
        p.o.position.set(p.p0.x + p.asse.x * k, p.p0.y - p.giu * k, p.p0.z + p.asse.z * k);
        p.o.rotation.set(p.gira.x * k, p.gira.y * k, p.gira.z * k);
      }
    });
    // la polvere: si alza quando un pezzo tocca terra, si allarga e svanisce
    this.polveri.forEach(({ s, pezzo: p }) => {
      const d = e - (p.cade + p.dura);
      const v = d > 0 && d < 2.4 ? Math.sin((d / 2.4) * Math.PI) * (1 - d / 2.4) : 0;
      (s.material as THREE.SpriteMaterial).opacity = v * (this.notte ? 0.35 : 0.55);
      s.visible = v > 0.01;
      if (!s.visible) return;
      const box = new THREE.Box3().setFromObject(p.o);
      const c = box.getCenter(new THREE.Vector3());
      this.tempio.worldToLocal(c);
      s.position.set(c.x, STILOBATE + 0.1 + d * 0.12, c.z);
      s.scale.setScalar(0.4 + d * 0.35);
    });

    // fedeli (7–30), poi turisti (31–58)
    const fedeli = fra(e, 7, 8.5) * (1 - fra(e, 28, 31));
    const turisti = fra(e, 31, 33.5) * (1 - fra(e, 56.5, 59));
    const preghiera = fra(e, 14, 15) * (1 - fra(e, 25, 26.5));
    this.figure.forEach((f, i) => {
      const fedele = fedeli >= turisti;
      const vis = Math.max(fedeli, turisti);
      f.g.visible = vis > 0.01 && !(f.guida && fedele);
      f.mat.opacity = vis * 0.95;
      f.mat.color.copy(fedele ? PELLEGRINO[N] : TURISTA[N]);
      if (fedele) {
        // in processione dal ciglio del colle verso l'altare, due per fila; poi in ginocchio, a semicerchio
        const fila = Math.floor(i / 2), lato = (i % 2) - 0.5;
        const k = fra(e, 7.5 + fila * 0.45, 13.5 + fila * 0.45);
        const z0 = -LZ - 2.2 - fila * 0.2, z1 = -LZ - 0.95 - Math.floor(fila / 3) * 0.2;
        const x1 = lato * 0.32 + ((fila % 3) - 1) * 0.22;
        const passo = k > 0 && k < 1 ? Math.sin(t * 9 + i) * 0.006 : 0;
        const fx = lato * 0.12 + (x1 - lato * 0.12) * k, fz = z0 + (z1 - z0) * k;
        f.g.position.set(fx, this.suolo(fx, fz) + passo, fz);
        f.g.rotation.y = 0;
        f.busto.rotation.x = preghiera * (0.5 + 0.12 * Math.sin(t * 1.3 + i));
        f.g.scale.set(1, 1 - preghiera * 0.35, 1);
      } else {
        // turisti: girano fra le rovine; ogni tanto si fermano e scattano
        const giro = t * 0.08 + f.fase;
        const fx = f.tx + Math.sin(giro) * 0.25, fz = f.tz + Math.cos(giro * 0.8) * 0.16;
        f.g.position.set(fx, this.suolo(fx, fz), fz);
        f.g.rotation.y = Math.sin(giro * 0.7) * 1.2;
        f.busto.rotation.x = 0;
        f.g.scale.set(1, 1, 1);
      }
    });
    this.flash.forEach((s, i) => {
      const f = this.figure[(i * 3 + Math.floor(e / 2.1)) % 13];
      const lampo = turisti > 0.6 && (e * 0.9 + i * 0.29) % 1 < 0.05 ? 1 : 0;
      s.position.copy(f.g.position).add(new THREE.Vector3(0, 0.17, -0.03));
      s.material.opacity = lampo;
      s.visible = lampo > 0;
    });
    // il fuoco e l'incenso, mentre pregano
    const fuoco = fra(e, 12, 13.5) * (1 - fra(e, 26, 28));
    this.fiamma.material.opacity = fuoco * (0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 5.3));
    this.fiamma.visible = fuoco > 0.01;
    const arr = this.incenso.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      const k = (t * 0.12 + i / 60) % 1;
      arr[i * 3] = Math.sin(i * 7.1 + t * 0.5) * 0.04 * (1 + k * 4) + k * 0.25;
      arr[i * 3 + 1] = STILOBATE + 0.1 + k * 1.6;
      arr[i * 3 + 2] = -LZ - 0.55 + Math.cos(i * 3.3) * 0.03;
    }
    this.incenso.geometry.attributes.position.needsUpdate = true;
    (this.incenso.material as THREE.PointsMaterial).opacity = fuoco * 0.55;
    this.incenso.visible = fuoco > 0.01;
  }

  /** La quota del terreno sotto un punto del tempio (coordinate del tempio): il ripiano, o il fianco del colle. */
  private suolo(x: number, z: number) {
    return Math.min(0, quotaColle(x * SCALA, z * SCALA) / SCALA);
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
