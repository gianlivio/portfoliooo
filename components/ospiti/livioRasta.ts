import * as THREE from "three";
import { loft } from "./comuni";

/**
 * Livio coi rasta fino alle gambe, in ologramma, che si allena al Mook Jong: la stessa luce azzurra a righe
 * di Achille, ma un corpo intero con le articolazioni vere. Braccia e gambe si muovono per cinematica inversa
 * verso bersagli precisi sul tronco e sui bracci del manichino: le mani arrivano dove colpiscono.
 * Si allena come Ip Man, svelto: a ogni comparsa compone una sequenza diversa con le tecniche del Wing Chun
 * (pak da, tan da, bong sau e lap sau col palmo, gaan sau a forbice, il doppio palmo, le raffiche di pugni
 * a catena, il calcio frontale, il calcio basso alla gamba) e qualche colpo da picchiatore di Tekken (la
 * ginocchiata e la gomitata, il calcio circolare alto); fra una e l'altra gira attorno al manichino a passi
 * brevi, e torna davanti quando deve lavorare sui bracci. A ogni colpo un lampo sul legno.
 * I rasta coprono tutta la testa, dall'attaccatura sulla fronte alla nuca: ciocche vere, catene di punti che
 * partono dal cranio pettinate all'indietro, pendono fino alle gambe, inseguono la testa e i colpi e
 * scivolano su cranio, spalle, schiena e gambe senza attraversarli.
 * C'è sempre: si stampa dal basso in alto all'arrivo, poi si allena; ogni tanto si stacca dal manichino e fa
 * tai chi o colpi nell'aria, poi torna al legno.
 * Di notte è azzurro, di giorno ambra (l'azzurro sul marmo chiaro sparisce).
 * La stessa figura fa anche il musicista (modo "studio"): leggerissima, di spalle allo studietto, compare quando
 * si accende la musica e suona le macchine a tempo (i pad, le manopole, il Kaoss Pad, il Volca, i fader e le
 * manopole del mixer, con un passo di lato), annuendo sul
 * battito; di notte lilla, di giorno corallo.
 * Coordinate della figura: +z verso il manichino, +x è la sua sinistra, y in alto, i piedi a y = 0.
 * Il manichino sta a (0, 0, DISTANZA), girato come la figura: le sue misure sono quelle di cameraLivio.ts.
 */

export const DISTANZA = 0.72;
/**
 * Le misure del Mook Jong (in cameraLivio.ts): raggio del tronco, dove comincia e finisce, la quota dei due
 * bracci alti, del braccio di mezzo, della gamba. Il tronco è sospeso: non tocca terra.
 */
export const MOOK_FORMA = { r: 0.13, y0: 0.14, y1: 1.64, alti: 1.3, mezzo: 1.08, gamba: 0.78 };

export const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main(){
  mat4 m = modelMatrix;
  vec3 n = normal;
  #ifdef USE_INSTANCING
  m = m * instanceMatrix;
  n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = m * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(normalMatrix * n);
  vec4 mv = viewMatrix * w;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

export const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uBase;
uniform float uTaglio;
uniform vec3 uColore;
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main(){
  // si stampa e si cancella per fette orizzontali: sopra il taglio non c'è niente, sul taglio una riga accesa
  float h = vW.y - uBase;
  if (h > uTaglio) discard;
  float bordo = smoothstep(0.05, 0.0, uTaglio - h) * step(uTaglio, 1.95);
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.7);
  float righe = 0.6 + 0.4 * step(0.45, fract(vW.y * 52.0 - uT * 1.4));
  float banda = smoothstep(0.08, 0.0, abs(fract(vW.y * 0.4 - uT * 0.25) - 0.5) - 0.42);
  float tremo = 0.88 + 0.12 * sin(uT * 31.0) * sin(uT * 7.0);
  float a = (0.42 + 0.58 * fres + banda * 0.2) * righe * tremo * uVis + bordo * 0.9;
  vec3 c = uColore * (0.55 + 0.9 * fres) + vec3(0.75, 0.95, 1.0) * (banda * 0.4 + bordo);
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------------ misure */

const ALTO = { braccio: 0.29, avambraccio: 0.26, coscia: 0.44, tibia: 0.43, caviglia: 0.07 };
const SPALLA_X = 0.19;
const BUSTO = 0.5; // dal bacino alla base del collo
const ANCA_X = 0.1;

/* --------------------------------------------------------------- le tecniche */

type P3 = [number, number, number];
type Mano = "palmo" | "pugno";
/** Una chiave della sequenza. I bersagli sono nelle coordinate della figura (il manichino a z = DISTANZA). */
type Posa = {
  t: number;
  s: P3;
  d: P3;
  ms?: Mano;
  md?: Mano;
  /** gomito alto (bong sau) o gomito avanti (la gomitata) */
  bs?: boolean;
  bd?: boolean;
  gs?: boolean;
  gd?: boolean;
  ps?: P3;
  pd?: P3;
  /** bacino: altezza, rotazione, spinta in avanti (negativa: si inclina indietro, come nel calcio alto) */
  h?: number;
  yaw?: number;
  av?: number;
  /** dove sta attorno al manichino: angolo (radianti) */
  giro?: number;
  /** arrivo secco: un colpo (il lampo nasce sul bersaglio della mano o del piede indicato) */
  colpo?: "s" | "d" | "ps" | "pd";
};
type Chiave = Omit<Posa, "t" | "s" | "d"> & { dt: number; s?: P3; d?: P3 };
type Tecnica = { nome: string; chiavi: Chiave[]; bracci?: boolean; peso: number };

const T = DISTANZA - MOOK_FORMA.r - 0.01; // la faccia del tronco
const GS: P3 = [0.02, 1.2, 0.3];
const GD: P3 = [-0.02, 1.16, 0.17];
const PS: P3 = [0.18, 0, 0.02];
const PD: P3 = [-0.18, 0, -0.04];
const guardia = (dt: number, extra: Partial<Chiave> = {}): Chiave => ({ dt, s: GS, d: GD, ms: "palmo", md: "palmo", ps: PS, pd: PD, yaw: 0, av: 0, h: 0.93, ...extra });

/**
 * Le tecniche, dalla parte sinistra (la destra è lo specchio). dt: quanto dura il tratto che porta a questa
 * chiave. Quelle coi bracci (bracci: true) si fanno solo stando davanti al manichino.
 */
const TECNICHE: Tecnica[] = [
  {
    nome: "pak da", bracci: true, peso: 3, chiavi: [
      { dt: 0.11, s: [-0.06, 1.28, 0.32], d: [-0.02, 1.2, 0.24], yaw: -0.12 },
      { dt: 0.09, s: [-0.08, 1.24, 0.29], d: [0, 1.2, T], md: "pugno", yaw: -0.28, av: 0.04, colpo: "d" },
      guardia(0.13),
    ],
  },
  {
    nome: "tan da", bracci: true, peso: 3, chiavi: [
      { dt: 0.11, s: [0.07, 1.27, 0.33], d: [-0.02, 1.08, 0.24], yaw: -0.08 },
      { dt: 0.08, s: [0.07, 1.27, 0.33], d: [-0.02, 1.0, T], md: "palmo", yaw: -0.22, av: 0.04, colpo: "d" },
      guardia(0.12),
    ],
  },
  {
    nome: "bong lap e palmo", bracci: true, peso: 3, chiavi: [
      { dt: 0.12, s: [0.05, 1.14, 0.2], d: [-0.04, 1.33, 0.3], bd: true, yaw: 0.22 },
      { dt: 0.1, s: [0.02, 1.27, T], ms: "palmo", d: [-0.11, 1.18, 0.27], yaw: 0.12, av: 0.05, colpo: "s" },
      guardia(0.13),
    ],
  },
  {
    nome: "gaan sau a forbice", bracci: true, peso: 2, chiavi: [
      { dt: 0.11, s: [0.11, 0.98, 0.33], d: [-0.09, 1.32, 0.31], bd: true, yaw: -0.1, h: 0.9, colpo: "s" },
      { dt: 0.12, s: [0.09, 1.32, 0.31], bs: true, d: [-0.11, 0.98, 0.33], yaw: 0.1, h: 0.9, colpo: "d" },
      { dt: 0.09, s: [0.02, 1.2, T], ms: "pugno", d: [-0.1, 1.0, 0.3], yaw: -0.2, av: 0.05, h: 0.9, colpo: "s" },
      guardia(0.12),
    ],
  },
  {
    nome: "doppio palmo", peso: 2, chiavi: [
      { dt: 0.1, s: [0.04, 1.25, 0.24], d: [-0.04, 1.02, 0.24], yaw: 0.05 },
      { dt: 0.08, s: [0.02, 1.25, T], d: [-0.02, 1.02, T], av: 0.07, colpo: "s" },
      guardia(0.14),
    ],
  },
  {
    nome: "raffica", peso: 3, chiavi: [
      // i pugni a catena: uno dietro l'altro sulla linea centrale, il pugno che rientra passa sopra quello che esce
      ...Array.from({ length: 9 }, (_, k): Chiave => {
        const fuori: P3 = [0, 1.2 - (k % 3) * 0.03, T];
        const dentro = (x: number): P3 => [x, 1.25, 0.22];
        return k % 2 === 0
          ? { dt: k === 0 ? 0.1 : 0.085, s: dentro(0.02), d: fuori, ms: "pugno", md: "pugno", av: 0.06, yaw: -0.06, colpo: "d" }
          : { dt: 0.085, s: fuori, d: dentro(-0.02), ms: "pugno", md: "pugno", av: 0.06, yaw: 0.06, colpo: "s" };
      }),
      guardia(0.15, { ms: "pugno", md: "pugno" }),
    ],
  },
  {
    nome: "calcio frontale", peso: 2, chiavi: [
      { dt: 0.12, pd: [-0.07, 0.5, 0.14], h: 0.95, d: [-0.02, 1.2, 0.24] },
      { dt: 0.09, pd: [-0.02, 0.62, T - 0.06], h: 0.96, av: -0.05, d: [-0.02, 1.2, 0.24], colpo: "pd" },
      { dt: 0.11, pd: [-0.08, 0.36, 0.1], h: 0.94 },
      guardia(0.1),
    ],
  },
  {
    nome: "calcio basso alla gamba", bracci: true, peso: 2, chiavi: [
      { dt: 0.11, pd: [-0.07, 0.45, 0.2], h: 0.94, s: [0.04, 1.24, 0.3] },
      { dt: 0.08, pd: [-0.02, 0.32, DISTANZA - 0.39], h: 0.93, s: [0.04, 1.24, 0.3], colpo: "pd" },
      guardia(0.13),
    ],
  },
  {
    nome: "ginocchiata e gomitata", peso: 2, chiavi: [
      { dt: 0.12, ps: [0.1, 0.42, 0.24], h: 0.96, av: 0.04, s: [0.06, 1.3, 0.2], d: [-0.04, 1.25, 0.26], ms: "pugno", md: "pugno" },
      { dt: 0.1, ps: PS, h: 0.92, s: [0.04, 1.32, 0.14], gs: true, ms: "pugno", yaw: -0.35, av: 0.06, colpo: "s" },
      { dt: 0.09, s: [0.0, 1.22, T], ms: "pugno", yaw: -0.25, av: 0.05, colpo: "s" },
      guardia(0.14),
    ],
  },
  {
    nome: "calcio circolare alto", peso: 1, chiavi: [
      { dt: 0.14, pd: [-0.25, 0.55, 0.08], yaw: 0.5, h: 0.95, av: -0.06, s: [0.05, 1.28, 0.22], d: [-0.12, 1.2, 0.1] },
      { dt: 0.11, pd: [-0.05, 1.3, T - 0.04], yaw: 0.85, h: 0.97, av: -0.12, s: [0.08, 1.25, 0.15], d: [-0.2, 1.05, -0.05], colpo: "pd" },
      { dt: 0.15, pd: [-0.22, 0.45, 0.08], yaw: 0.35, h: 0.95 },
      guardia(0.14),
    ],
  },
];

const specchia = (v: P3): P3 => [-v[0], v[1], v[2]];
function aSpecchio(c: Chiave): Chiave {
  const lato: Record<string, Chiave["colpo"]> = { s: "d", d: "s", ps: "pd", pd: "ps" };
  return {
    ...c,
    s: c.d && specchia(c.d),
    d: c.s && specchia(c.s),
    ms: c.md,
    md: c.ms,
    bs: c.bd,
    bd: c.bs,
    gs: c.gd,
    gd: c.gs,
    ps: c.pd && specchia(c.pd),
    pd: c.ps && specchia(c.ps),
    yaw: c.yaw === undefined ? undefined : -c.yaw,
    colpo: c.colpo && lato[c.colpo],
  };
}

/**
 * Una sequenza nuova a ogni comparsa: tecniche scelte a caso (senza ripetere la stessa due volte di fila),
 * a destra o a specchio, con qualche passo attorno al manichino; davanti quando servono i bracci.
 * Ogni chiave eredita dalla precedente quello che non dice.
 */
function componi(durata: number): Posa[] {
  const P: Posa[] = [];
  let t = 0;
  let giro = 0;
  let prima: Posa = { t: 0, s: GS, d: GD, ms: "palmo", md: "palmo", ps: PS, pd: PD, h: 0.93, yaw: 0, av: 0, giro: 0 };
  const metti = (c: Chiave) => {
    t += c.dt;
    const { dt: _dt, ...resto } = c;
    void _dt;
    // il colpo e le forme particolari valgono per la sola chiave che le dice
    const p: Posa = { ...prima, bs: false, bd: false, gs: false, gd: false, colpo: undefined, ...resto, t, giro } as Posa;
    P.push(p);
    prima = p;
  };
  metti(guardia(0.01));
  metti(guardia(0.5));
  let ultima = "";
  while (t < durata) {
    // un passo, ogni tanto: di lato attorno al manichino, con un saltello del bacino
    if (Math.random() < 0.3) {
      const nuovo = giro === 0 ? (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 0.12) : Math.random() < 0.5 ? 0 : -giro;
      giro = (giro + nuovo) / 2;
      metti(guardia(0.09, { h: 0.97, ps: [0.17, 0.05, 0.02] }));
      giro = nuovo;
      metti(guardia(0.09));
    }
    const possibili = TECNICHE.filter((k) => k.nome !== ultima && (!k.bracci || giro === 0));
    // le tecniche coi bracci a volte richiamano il passo che riporta davanti
    if (giro !== 0 && Math.random() < 0.45) {
      giro = giro / 2;
      metti(guardia(0.08, { h: 0.97 }));
      giro = 0;
      metti(guardia(0.08));
      continue;
    }
    let tot = possibili.reduce((a, k) => a + k.peso, 0) * Math.random();
    const scelta = possibili.find((k) => (tot -= k.peso) < 0) ?? possibili[0];
    ultima = scelta.nome;
    const specchio = Math.random() < 0.5;
    for (const c of scelta.chiavi) metti(specchio ? aSpecchio(c) : c);
    // un respiro fra una tecnica e l'altra, corto
    if (Math.random() < 0.5) metti(guardia(0.08 + Math.random() * 0.18));
  }
  // si chiude davanti, in guardia
  giro = 0;
  metti(guardia(0.2, { h: 0.95 }));
  metti(guardia(0.6));
  return P;
}

/** Una posa completa, data da fuori (vedi guida). */
export type PosaLibera = {
  s: THREE.Vector3; d: THREE.Vector3; ps: THREE.Vector3; pd: THREE.Vector3;
  h: number; yaw: number; av: number; giro: number; lato: number; nod: number;
  bs: boolean; bd: boolean; gs: boolean; gd: boolean; ms: Mano; md: Mano;
  colpo: { quale: "s" | "d" | "ps" | "pd"; chiave: number } | null;
};

/** Fra due pose: i punti e i numeri a metà strada, le forme dalla più vicina. */
function mescola(a: PosaLibera, b: PosaLibera, u: number): PosaLibera {
  const v = (p: THREE.Vector3, q: THREE.Vector3) => p.clone().lerp(q, u);
  const n = (p: number, q: number) => p + (q - p) * u;
  const scegli = u < 0.5 ? a : b;
  return {
    s: v(a.s, b.s), d: v(a.d, b.d), ps: v(a.ps, b.ps), pd: v(a.pd, b.pd),
    h: n(a.h, b.h), yaw: n(a.yaw, b.yaw), av: n(a.av, b.av), giro: n(a.giro, b.giro), lato: n(a.lato, b.lato), nod: n(a.nod, b.nod),
    bs: scegli.bs, bd: scegli.bd, gs: scegli.gs, gd: scegli.gd, ms: scegli.ms, md: scegli.md, colpo: null,
  };
}

const morbido = (x: number) => x * x * (3 - 2 * x);
/** Per i colpi: parte svelto e si ferma secco. */
const secco = (x: number) => 1 - Math.pow(1 - x, 3);

/* ------------------------------------------------------------------ figura */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SU = V(0, 1, 0);

const DIR = new THREE.Vector3();
/** Due ossa che arrivano a un bersaglio: restituisce il giunto di mezzo e la punta (avvicinata se fuori portata). */
function ik(radice: THREE.Vector3, bersaglio: THREE.Vector3, a: number, b: number, polo: THREE.Vector3, gomito: THREE.Vector3, punta: THREE.Vector3) {
  const dir = DIR.copy(bersaglio).sub(radice);
  let d = dir.length();
  d = Math.min(Math.max(d, Math.abs(a - b) + 0.01), (a + b) * 0.995);
  dir.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const perp = polo.clone().sub(dir.clone().multiplyScalar(polo.dot(dir))).normalize();
  gomito.copy(radice).addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA);
  punta.copy(radice).addScaledVector(dir, d);
}

/** Un osso: cilindro dalla base (y = 0) alla punta (y = 1), messo fra due punti. */
function osso(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, q: THREE.Quaternion, t: THREE.Vector3) {
  t.copy(b).sub(a);
  const l = t.length();
  m.position.copy(a);
  m.quaternion.copy(q.setFromUnitVectors(SU, t.multiplyScalar(1 / (l || 1))));
  m.scale.set(1, l, 1);
}

const N_CIOCCHE = 40;
const N_PUNTI = 10;
/** il cuoio capelluto, nelle coordinate della testa: dove nascono le ciocche */
const CUOIO = { c: V(0, 0.125, -0.005), r: V(0.1, 0.112, 0.112) };

export class LivioRasta {
  gruppo = new THREE.Group();
  /** il corpo intero: ruota attorno al manichino quando fa un passo di lato */
  private corpo = new THREE.Group();
  private mat: THREE.ShaderMaterial;
  private maschera: THREE.ShaderMaterial;
  private busto: THREE.Mesh;
  private bacino: THREE.Mesh;
  private testa = new THREE.Group();
  private collo: THREE.Mesh;
  private ossa: Record<string, THREE.Mesh> = {};
  private mani: { palmo: THREE.Mesh; pugno: THREE.Mesh }[] = [];
  private piedi: THREE.Mesh[] = [];
  private giunti: THREE.Mesh[] = [];
  private spalle = [V(), V()];
  private ciocche: THREE.InstancedMesh;
  /** per ogni ciocca: dove nasce e verso dove parte (coordinate della testa), lunghezza, i punti e quelli di prima */
  private radici: { p: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  private lunghezze: number[] = [];
  private punti: THREE.Vector3[][] = [];
  private prima: THREE.Vector3[][] = [];
  private lampi: { s: THREE.Sprite; vita: number }[] = [];
  private sequenza: Posa[] = [];
  private ultimoColpo = -1;
  private tempo = 0;
  private stato: "spento" | "stampa" | "allena" | "libero" = "spento";
  private finoA = 1.5;
  private forma: "taichi" | "ombra" = "taichi";
  private durataLibera = 0;
  private iniziato = false;
  // appoggi, per non creare oggetti a ogni fotogramma
  private q = new THREE.Quaternion();
  private t = V();
  private m4 = new THREE.Matrix4();
  private mTesta = new THREE.Matrix4();
  private modo: "mook" | "studio" | "surf";
  private colori: { giorno: string; notte: string };
  /** nel modo studio: quanto si vede (sale e scende piano quando la musica si accende e si spegne) */
  private vis = 0;
  private mInv = new THREE.Matrix4();

  constructor(lampo: THREE.Texture, modo: "mook" | "studio" | "surf" = "mook") {
    this.modo = modo;
    this.colori = modo === "studio" ? { giorno: "#FF7A62", notte: "#C79BFF" } : { giorno: "#D9761C", notte: "#3C96FF" };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uT: { value: 0 }, uVis: { value: 1 }, uBase: { value: 0 }, uTaglio: { value: 0 }, uColore: { value: new THREE.Color("#3C96FF") },
      },
      transparent: true,
      depthWrite: false,
    });
    const m = this.mat;
    const add = (g: THREE.BufferGeometry) => {
      const o = new THREE.Mesh(g, m);
      this.corpo.add(o);
      return o;
    };
    // il busto: dal bacino alla base del collo, il petto più largo, le spalle tonde; una maglia larga
    this.busto = add(loft([
      { z: -0.02, l: 0.15, su: 0.1 },
      { z: 0.12, l: 0.145, su: 0.095 },
      { z: 0.3, l: 0.17, su: 0.105 },
      { z: 0.43, l: 0.2, su: 0.105 },
      { z: 0.5, l: 0.13, su: 0.08 },
      { z: 0.545, l: 0.05, su: 0.045 },
    ], { radiali: 16, passi: 3 }).rotateX(-Math.PI / 2));
    // il bacino coi fianchi, sotto il busto: i pantaloni larghi da allenamento cominciano qui
    this.bacino = add(new THREE.SphereGeometry(1, 14, 10).scale(0.165, 0.12, 0.115));
    this.collo = add(new THREE.CylinderGeometry(0.045, 0.05, 1, 10).translate(0, 0.5, 0));
    // la testa: il cranio un poco allungato, il mento, il naso appena accennato; sul cranio la massa dei rasta
    const cranio = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14).scale(0.095, 0.118, 0.108), m);
    cranio.position.set(0, 0.11, 0);
    const mento = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.06, 0.07), m);
    mento.position.set(0, 0.035, 0.035);
    const naso = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6).rotateX(Math.PI / 2), m);
    naso.position.set(0, 0.1, 0.112);
    // la massa dei capelli sul cranio: tutta la calotta, fino all'attaccatura sulla fronte
    const massa = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(0.112, 0.125, 0.122), m);
    massa.position.copy(CUOIO.c);
    massa.rotation.x = -0.35;
    this.testa.add(cranio, mento, naso, massa);
    this.corpo.add(this.testa);
    // braccia e gambe: un osso per tratto, larghi in cima; i pantaloni larghi fin sopra la caviglia
    const tratto = (nome: string, r0: number, r1: number) => (this.ossa[nome] = add(new THREE.CylinderGeometry(r1, r0, 1, 10, 1).translate(0, 0.5, 0)));
    for (const s of ["s", "d"]) {
      tratto(`braccio${s}`, 0.05, 0.042);
      tratto(`avambraccio${s}`, 0.04, 0.03);
      tratto(`coscia${s}`, 0.085, 0.075);
      tratto(`tibia${s}`, 0.072, 0.06);
      this.mani.push({
        palmo: add(new THREE.BoxGeometry(0.075, 0.1, 0.028).translate(0, 0.05, 0)),
        pugno: add(new THREE.SphereGeometry(1, 10, 8).scale(0.045, 0.05, 0.05).translate(0, 0.035, 0)),
      });
      this.piedi.push(add(new THREE.BoxGeometry(0.08, 0.055, 0.23).translate(0, 0.0275, 0.06)));
    }
    // sfere sui giunti: spalle, gomiti, ginocchia, perché i tratti non si stacchino
    for (let k = 0; k < 6; k++) this.giunti.push(add(new THREE.SphereGeometry(1, 10, 8)));
    if (modo === "surf") {
      // la tavola sotto i piedi, lungo l'asse x del corpo: affusolata davanti, la pinna sotto
      const tavola = loft([
        { z: -0.95, l: 0.03, su: 0.012 },
        { z: -0.75, l: 0.17, su: 0.022 },
        { z: -0.2, l: 0.26, su: 0.03 },
        { z: 0.45, l: 0.24, su: 0.028 },
        { z: 0.85, l: 0.13, su: 0.02 },
        { z: 0.92, l: 0.05, su: 0.012 },
      ], { radiali: 14, passi: 3 }).rotateY(Math.PI / 2).translate(0, -0.01, 0);
      this.corpo.add(new THREE.Mesh(tavola, m));
      const pinna = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.012).translate(-0.62, -0.06, 0), m);
      this.corpo.add(pinna);
    }
    this.gruppo.add(this.corpo);

    // i rasta: ciocche su tutto il cuoio capelluto, dall'attaccatura sulla fronte alla nuca, pettinate all'indietro
    const r = (() => {
      let s = 77;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    const oro = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0, i = 0; k < N_CIOCCHE && i < 400; i++) {
      // punti sparsi uniformi sulla calotta (spirale di Fibonacci), tenuti solo sopra l'attaccatura
      const y = 1 - (i + 0.5) / 125; // da 1 (in cima) in giù
      const raggio = Math.sqrt(Math.max(0, 1 - y * y));
      const az = i * oro; // 0 = davanti
      const n = V(Math.sin(az) * raggio, y, Math.cos(az) * raggio);
      const polare = Math.acos(y);
      // l'attaccatura: alta sulla fronte, sopra le orecchie ai lati, bassa sulla nuca
      const dietro = (1 - Math.cos(az)) / 2;
      if (polare > 0.86 + 1.05 * dietro) continue;
      const p = V(n.x * CUOIO.r.x, n.y * CUOIO.r.y, n.z * CUOIO.r.z).add(CUOIO.c);
      // il primo tratto esce dal cranio, un poco in su (il volume in cima, come Marley), poi cade: quelle davanti
      // si aprono a destra e a sinistra della faccia e scendono sulle tempie, davanti alle orecchie, sul petto
      const lato = n.x !== 0 ? Math.sign(n.x) : k % 2 ? 1 : -1;
      const a = n.clone().add(V(lato * Math.max(0, n.z) * 0.9, 0.25, 0)).normalize();
      const b = a.clone().multiplyScalar(0.35).add(V(0, -1, 0)).normalize();
      this.radici.push({ p, a, b });
      // davanti fino al petto e alla vita, ai lati più giù, dietro fino alle gambe
      this.lunghezze.push(0.8 + dietro * 0.6 + r() * 0.12);
      this.punti.push(Array.from({ length: N_PUNTI }, () => V()));
      this.prima.push(Array.from({ length: N_PUNTI }, () => V()));
      k++;
    }
    // ogni tratto un poco gonfio a metà: la corda irregolare dei dreadlock, non il capello liscio
    const nodo = new THREE.CylinderGeometry(1, 1, 1, 6, 4).translate(0, 0.5, 0);
    const pn = nodo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pn.count; i++) {
      const y = pn.getY(i), k = 1 + 0.28 * Math.sin(Math.PI * y) - 0.12 * Math.sin(Math.PI * 2 * y + 1);
      pn.setXYZ(i, pn.getX(i) * k, y, pn.getZ(i) * k);
    }
    nodo.computeVertexNormals();
    this.ciocche = new THREE.InstancedMesh(nodo, m, this.radici.length * (N_PUNTI - 1));
    this.ciocche.frustumCulled = false;
    this.gruppo.add(this.ciocche);

    // i lampi dei colpi sul legno
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampo, color: "#9FD4FF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.visible = false;
      this.corpo.add(s);
      this.lampi.push({ s, vita: 0 });
    }
    // la maschera di profondità: un passaggio che scrive solo la profondità, prima della luce, così dell'ologramma
    // si vede la superficie davanti e non il groviglio di braccia, rasta e schiena che sta dietro
    this.maschera = new THREE.ShaderMaterial({
      vertexShader: VERT,
      // lo stesso taglio della stampa: sopra il taglio la maschera non c'è, se no coprirebbe quello che sta dietro
      fragmentShader: "uniform float uBase; uniform float uTaglio; varying vec3 vW; void main(){ if (vW.y - uBase > uTaglio) discard; gl_FragColor = vec4(0.0); }",
      uniforms: this.mat.uniforms,
      colorWrite: false,
      depthWrite: true,
      transparent: true,
    });
    const copia = (o: THREE.Object3D) => {
      if (o instanceof THREE.InstancedMesh) {
        const c = new THREE.InstancedMesh(o.geometry, this.maschera, o.count);
        c.instanceMatrix = o.instanceMatrix;
        c.frustumCulled = false;
        c.renderOrder = 7;
        // le istanze hanno già la loro posizione nel gruppo: la copia, figlia, non deve spostarsi di nuovo
        c.matrixAutoUpdate = false;
        c.matrix.identity();
        o.add(c);
      } else if (o instanceof THREE.Mesh) {
        const c = new THREE.Mesh(o.geometry, this.maschera);
        c.renderOrder = 7;
        o.add(c);
      }
    };
    [...this.corpo.children, ...this.testa.children, this.ciocche].forEach(copia);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      if (o.renderOrder !== 7) o.renderOrder = 8;
    });
    this.gruppo.visible = false;
  }

  /** La posa a un istante della sequenza, interpolata fra le chiavi. */
  private posa(tc: number) {
    const S = this.sequenza;
    let i = 0;
    while (i < S.length - 2 && S[i + 1].t <= tc) i++;
    const a = S[i], b = S[i + 1];
    const u0 = Math.min(1, Math.max(0, (tc - a.t) / (b.t - a.t || 1)));
    const u = b.colpo ? secco(u0) : morbido(u0);
    const mix = (x: P3 | undefined, y: P3 | undefined, base: P3) => {
      const p = x ?? base, q = y ?? base;
      return V(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u);
    };
    const n = (x: number | undefined, y: number | undefined, base: number) => (x ?? base) + ((y ?? base) - (x ?? base)) * u;
    // nel passo il piede che si sposta si alza a metà strada
    return {
      s: mix(a.s, b.s, GS),
      d: mix(a.d, b.d, GD),
      ps: mix(a.ps, b.ps, PS),
      pd: mix(a.pd, b.pd, PD),
      h: n(a.h, b.h, 0.93),
      yaw: n(a.yaw, b.yaw, 0),
      av: n(a.av, b.av, 0),
      giro: n(a.giro, b.giro, 0),
      bs: (u < 0.5 ? a.bs : b.bs) ?? false,
      bd: (u < 0.5 ? a.bd : b.bd) ?? false,
      gs: (u < 0.5 ? a.gs : b.gs) ?? false,
      gd: (u < 0.5 ? a.gd : b.gd) ?? false,
      ms: (u < 0.5 ? a.ms : b.ms) ?? "palmo",
      md: (u < 0.5 ? a.md : b.md) ?? "palmo",
      // il colpo che arriva in questo tratto, quando è appena arrivato
      colpo: b.colpo && u0 > 0.9 ? { quale: b.colpo, chiave: i + 1 } : null,
    };
  }

  /** Dove sta, nel mondo, il pavimento sotto i piedi: serve al taglio della stampa. */
  private base() {
    this.gruppo.updateWorldMatrix(true, false);
    return this.t.setFromMatrixPosition(this.gruppo.matrixWorld).y;
  }

  /** Il colore dell'ologramma: uno di notte, un altro di giorno. */
  setNotte(notte: boolean) {
    (this.mat.uniforms.uColore.value as THREE.Color).set(notte ? this.colori.notte : this.colori.giorno);
  }

  aggiorna(t: number, dt: number, ridotto: boolean, battito?: { attivo: boolean; fase: number; n: number }) {
    this.mat.uniforms.uT.value = t;
    if (ridotto) {
      this.gruppo.visible = false;
      return;
    }
    if (this.modo === "studio") {
      this.suona(t, dt, battito ?? { attivo: false, fase: 0, n: 0 });
      return;
    }
    // il tempo della sequenza è quello vero; la fisica dei rasta va a passi piccoli (vedi rasta)
    this.tempo += dt;
    // c'è sempre: si stampa una volta all'arrivo, poi si allena al manichino; ogni tanto se ne stacca, fa qualche
    // passo indietro e si muove da solo (tai chi lento, oppure colpi nell'aria), poi torna al legno
    if (this.stato === "spento") {
      this.gruppo.visible = false;
      if (this.tempo < this.finoA) return;
      this.stato = "stampa";
      this.tempo = 0;
      this.iniziato = false;
      this.sequenza = componi(24 + Math.random() * 10);
      this.ultimoColpo = -1;
    }
    let taglio = 2;
    if (this.stato === "stampa") {
      taglio = (this.tempo / 1.6) * 2;
      if (this.tempo >= 1.6) {
        this.stato = "allena";
        this.tempo = 0;
      }
    }
    this.gruppo.visible = true;
    this.mat.uniforms.uBase.value = this.base();
    this.mat.uniforms.uTaglio.value = taglio;
    if (this.stato === "libero") {
      this.daSolo(dt, t);
      return;
    }
    const fine = this.sequenza[this.sequenza.length - 1].t;
    const tc = this.stato === "allena" ? Math.min(this.tempo, fine) : 0;
    if (this.stato === "allena" && this.tempo >= fine) {
      // finita la sequenza: si stacca dal manichino, col tai chi o coi colpi nell'aria
      this.stato = "libero";
      this.tempo = 0;
      this.forma = Math.random() < 0.55 ? "taichi" : "ombra";
      this.durataLibera = this.forma === "taichi" ? 16 + Math.random() * 6 : 12 + Math.random() * 4;
      if (this.forma === "ombra") this.sequenza = componi(this.durataLibera - 2.4);
    }
    this.metti(tc, dt, t);
  }

  /**
   * Da solo, staccato dal manichino: un passo indietro (via), poi il tai chi (le mani delle nuvole, lente, col
   * peso che passa da una gamba all'altra) o i colpi nell'aria (la stessa sequenza, senza legno davanti);
   * in fondo torna al manichino e riprende.
   */
  private daSolo(dt: number, t: number) {
    const T0 = 1.2;
    const resta = this.durataLibera - this.tempo;
    // quanto si è allontanato: sale nel primo tratto, scende nell'ultimo
    const k = morbido(Math.min(1, this.tempo / T0, Math.max(0, resta) / T0));
    const VIA = 0.55;
    let P: PosaLibera;
    if (this.forma === "taichi") {
      const tt = Math.max(0, this.tempo - T0 * 0.5);
      const f = (tt / 5.2) * Math.PI * 2;
      const tai: PosaLibera = {
        s: V(0.08 + 0.2 * Math.sin(f), 1.1 + 0.16 * Math.cos(f), 0.3),
        d: V(-0.08 + 0.2 * Math.sin(f + Math.PI), 1.1 + 0.16 * Math.cos(f + Math.PI), 0.3),
        ps: V(0.26, 0, 0.06), pd: V(-0.26, 0, -0.06),
        h: 0.85 + 0.02 * Math.cos(f * 2), yaw: 0.42 * Math.sin(f), av: 0.02, giro: 0, lato: 0.07 * Math.sin(f), nod: 0.05,
        bs: false, bd: false, gs: false, gd: false, ms: "palmo", md: "palmo", colpo: null,
      };
      const guardia = { ...this.posa(0), nod: 0, lato: 0 };
      P = mescola(guardia, tai, k);
    } else {
      const tc = Math.min(Math.max(0, this.tempo - T0), this.sequenza[this.sequenza.length - 1].t);
      P = { ...this.posa(tc), nod: 0, lato: 0, colpo: null };
    }
    if (resta <= 0) {
      this.stato = "allena";
      this.tempo = 0;
      this.sequenza = componi(24 + Math.random() * 10);
      this.ultimoColpo = -1;
    }
    this.corpoDa({ ...P, via: VIA * k }, dt, t);
  }

  /** Il musicista: si accende e si spegne con la musica, piano; suona finché il loop gira. */
  private suona(t: number, dt: number, b: { attivo: boolean; fase: number; n: number }) {
    const prima = this.vis;
    this.vis += ((b.attivo ? 1 : 0) - this.vis) * Math.min(1, dt * 1.8);
    if (this.vis < 0.01) {
      this.gruppo.visible = false;
      return;
    }
    if (prima < 0.01) this.iniziato = false;
    this.gruppo.visible = true;
    this.mat.uniforms.uBase.value = this.base();
    this.mat.uniforms.uTaglio.value = 2;
    // leggerissimo: si vedono le macchine attraverso
    this.mat.uniforms.uVis.value = this.vis * 0.42;
    this.corpoDa(this.posaStudio(b), dt, t);
  }

  /**
   * La posa del musicista, dal battito: ogni due battute un gesto diverso (pad a due mani, una manopola e i pad,
   * il Kaoss Pad, il filtro e il Volca, le due macchine in alto); fra un gesto e l'altro le mani scivolano.
   * Le coordinate: lui sta davanti al tavolo, di spalle a chi guarda; le macchine basse a z ≈ 0.43, quelle sul
   * piano alto a z ≈ 0.65 (vedi lo studietto in zonaSviluppatore.ts).
   */
  private posaStudio(b: { fase: number; n: number }) {
    const q = b.n + b.fase;
    const colpo = Math.pow(1 - b.fase, 4);
    const ottavo = Math.pow(1 - ((q * 2) % 1), 4);
    // il mixer sta alla sua sinistra: per i fader e le manopole fa un passo di lato (lato: lo spostamento del corpo)
    const gesti = (k: number, x: number): [P3, P3, number] => {
      const giro = (r: number, c: P3, f: number): P3 => [c[0] + Math.cos(f) * r, c[1] + Math.sin(f) * r * 0.5, c[2] + Math.sin(f) * r];
      const tocca = (c: P3, quanto: number): P3 => [c[0], c[1] + 0.035 * (1 - quanto), c[2]];
      const pari = Math.floor(x * 2) % 2 === 0;
      switch (k % 6) {
        case 0: // i pad dell'Electribe rosa, a due mani, alternate sugli ottavi
          return [tocca([0.07, 0.8, 0.42], pari ? ottavo : 0), tocca([-0.07, 0.8, 0.42], pari ? 0 : ottavo), 0];
        case 1: // la manopola della macchina a cerchi di sinistra, e i pad col destro sul battere
          return [giro(0.025, [0.42, 0.82, 0.43], x * 0.8), tocca([-0.04, 0.8, 0.42], colpo), 0];
        case 2: // il Kaoss Pad col destro, il dito che scorre; il sinistro sulla manopola
          return [giro(0.02, [0.4, 0.82, 0.43], x * 0.5), [-0.33 + Math.sin(x * 1.3) * 0.05, 1.08, 0.6 + Math.cos(x * 0.9) * 0.04], 0];
        case 3: // al mixer: due fader che salgono e scendono piano, a mani alterne
          return [[0.98, 0.8, 0.33 + Math.sin(x * 0.4) * 0.05], [0.8, 0.8, 0.33 + Math.sin(x * 0.4 + 2) * 0.05], 0.6];
        case 4: // il filtro della macchina di destra, e il Volca col sinistro
          return [tocca([-0.06, 1.05, 0.6], ottavo), giro(0.03, [-0.42, 0.82, 0.43], -x * 0.7), 0];
        default: // al mixer le manopole dell'equalizzazione col sinistro, il destro che tiene il tempo sull'Electribe
          return [giro(0.015, [0.95, 0.84, 0.56], x * 0.6), tocca([0.3, 0.8, 0.42], colpo), 0.4];
      }
    };
    const k = Math.floor(q / 8);
    const [s1, d1, l1] = gesti(k, q);
    let s = s1, d = d1, lato = l1;
    const dentro = q - k * 8;
    if (dentro < 0.75 && k > 0) {
      const [s0, d0, l0] = gesti(k - 1, q);
      const u = morbido(dentro / 0.75);
      const mix = (a: P3, c: P3): P3 => [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u];
      s = mix(s0, s1);
      d = mix(d0, d1);
      lato = l0 + (l1 - l0) * u;
    }
    // i bersagli sono sul tavolo: nel corpo spostato di lato si leggono spostati al contrario
    return {
      lato,
      s: V(s[0] - lato, s[1], s[2]), d: V(d[0] - lato, d[1], d[2]), ps: V(...PS), pd: V(...PD),
      h: 0.93 - 0.018 * colpo, yaw: Math.sin((q * Math.PI) / 4) * 0.08, av: 0.11, giro: 0,
      bs: false, bd: false, gs: false, gd: false, ms: "palmo" as Mano, md: "palmo" as Mano,
      colpo: null, nod: 0.18 + 0.12 * colpo,
    };
  }

  private metti(tc: number, dt: number, t: number) {
    this.corpoDa({ ...this.posa(tc), nod: 0, lato: 0 }, dt, t);
  }

  /**
   * Per chi guida la figura da fuori (il surf): la posa, dove sta il corpo e come è girato, quanto si vede,
   * il taglio della stampa.
   */
  guida(P: PosaLibera, dove: THREE.Vector3, verso: THREE.Quaternion, dt: number, t: number, vis: number, taglio: number) {
    this.gruppo.visible = vis > 0.01;
    if (!this.gruppo.visible) {
      this.iniziato = false;
      return;
    }
    this.mat.uniforms.uT.value = t;
    this.mat.uniforms.uVis.value = vis;
    this.mat.uniforms.uBase.value = this.base();
    this.mat.uniforms.uTaglio.value = taglio;
    this.corpoDa({ ...P, dove, verso }, dt, t);
  }

  private corpoDa(P: PosaLibera & { dove?: THREE.Vector3; verso?: THREE.Quaternion; via?: number }, dt: number, t: number) {
    // il corpo gira attorno al manichino: ruota attorno all'asse del tronco, e guarda sempre il tronco
    const c = DISTANZA;
    if (P.dove && P.verso) {
      this.corpo.position.copy(P.dove);
      this.corpo.quaternion.copy(P.verso);
    } else {
      this.corpo.position.set(Math.sin(P.giro) * -c + P.lato, 0, c - Math.cos(P.giro) * c - (P.via ?? 0));
      this.corpo.rotation.set(0, P.giro, 0);
    }
    // il bacino: basso nella posizione, un respiro leggero, la rotazione verso il colpo
    const respiro = Math.sin(t * 1.7) * 0.006;
    const bacino = V(0, P.h + respiro, 0.02 + P.av);
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06 + P.av * 0.8, P.yaw, 0, "YXZ"));
    this.bacino.position.copy(bacino);
    this.bacino.quaternion.copy(rot);
    this.busto.position.copy(bacino).add(V(0, 0.02, 0));
    this.busto.quaternion.copy(rot);
    const nelBusto = (x: number, y: number, z: number) => V(x, y, z).applyQuaternion(rot).add(bacino);
    const collo = nelBusto(0, BUSTO + 0.02, 0);
    // la testa guarda il manichino, ferma mentre il corpo gira
    const testaPos = nelBusto(0, BUSTO + 0.1, 0.01);
    osso(this.collo, collo, testaPos, this.q, this.t);
    this.testa.position.copy(testaPos);
    this.testa.quaternion.setFromEuler(new THREE.Euler(0.08 - P.av * 0.5 + P.nod, P.yaw * 0.35, 0, "YXZ"));
    // braccia
    this.spalle[0].copy(nelBusto(SPALLA_X, BUSTO - 0.06, 0));
    this.spalle[1].copy(nelBusto(-SPALLA_X, BUSTO - 0.06, 0));
    const bersagli = [P.s, P.d];
    const forme = [P.ms, P.md];
    const alti = [P.bs, P.bd];
    const avanti = [P.gs, P.gd];
    const gomito = V(), punta = V();
    (["s", "d"] as const).forEach((lato, i) => {
      const sx = i === 0 ? 1 : -1;
      // il gomito sta in basso e verso il centro; nel bong sau sale e va in fuori; nella gomitata va avanti
      const polo = alti[i] ? V(sx * 0.9, 0.9, -0.2) : avanti[i] ? V(sx * 0.15, 0.2, 1) : V(sx * 0.35, -1, -0.15);
      ik(this.spalle[i], bersagli[i], ALTO.braccio, ALTO.avambraccio, polo, gomito, punta);
      osso(this.ossa[`braccio${lato}`], this.spalle[i], gomito, this.q, this.t);
      osso(this.ossa[`avambraccio${lato}`], gomito, punta, this.q, this.t);
      this.giunti[i * 3].position.copy(this.spalle[i]);
      this.giunti[i * 3].scale.setScalar(0.05);
      this.giunti[i * 3 + 1].position.copy(gomito);
      this.giunti[i * 3 + 1].scale.setScalar(0.04);
      // la mano prosegue l'avambraccio: palmo aperto o pugno
      const mano = this.mani[i];
      const dir = this.t.copy(punta).sub(gomito).normalize();
      mano.palmo.visible = forme[i] === "palmo";
      mano.pugno.visible = forme[i] === "pugno";
      const qm = this.q.setFromUnitVectors(SU, dir);
      for (const o of [mano.palmo, mano.pugno]) {
        o.position.copy(punta);
        o.quaternion.copy(qm);
      }
    });
    // gambe: le anche sotto il bacino, le ginocchia in avanti e appena verso dentro
    const anche = [nelBusto(ANCA_X, -0.04, 0), nelBusto(-ANCA_X, -0.04, 0)];
    const piedi = [P.ps, P.pd];
    (["s", "d"] as const).forEach((lato, i) => {
      const sx = i === 0 ? 1 : -1;
      const caviglia = piedi[i].clone().add(V(0, ALTO.caviglia, 0));
      const ginocchio = V(), tallone = V();
      ik(anche[i], caviglia, ALTO.coscia, ALTO.tibia, V(-sx * 0.25, 0, 1), ginocchio, tallone);
      osso(this.ossa[`coscia${lato}`], anche[i], ginocchio, this.q, this.t);
      osso(this.ossa[`tibia${lato}`], ginocchio, tallone, this.q, this.t);
      this.giunti[i * 3 + 2].position.copy(ginocchio);
      this.giunti[i * 3 + 2].scale.setScalar(0.065);
      const piede = this.piedi[i];
      piede.position.set(tallone.x, Math.max(0, tallone.y - ALTO.caviglia), tallone.z);
      // la punta un poco in dentro, come nella posizione del Wing Chun; sollevato, il piede si flette
      piede.rotation.set(tallone.y > 0.12 ? -0.5 : 0, -sx * 0.18, 0);
    });
    // i colpi: un lampo sul legno quando arrivano
    if (P.colpo && P.colpo.chiave !== this.ultimoColpo) {
      this.ultimoColpo = P.colpo.chiave;
      const dove = P.colpo.quale === "s" ? P.s : P.colpo.quale === "d" ? P.d : P.colpo.quale === "ps" ? P.ps : P.pd;
      const l = this.lampi.find((x) => x.vita <= 0) ?? this.lampi[0];
      l.vita = 1;
      l.s.position.copy(dove).add(V(0, 0, 0.03));
      l.s.visible = true;
    }
    for (const l of this.lampi) {
      if (l.vita <= 0) continue;
      l.vita -= dt * 4;
      l.s.material.opacity = Math.max(0, l.vita) * 0.9;
      l.s.scale.setScalar(0.08 + (1 - l.vita) * 0.14);
      if (l.vita <= 0) l.s.visible = false;
    }
    this.rasta(dt, rot);
  }

  /**
   * I rasta, nelle coordinate del gruppo (non del corpo: quando lui gira attorno al manichino le ciocche restano
   * indietro e lo seguono). Il primo tratto è fisso sul cranio e pettinato all'indietro; il resto pende, legato in
   * catena, e non entra nel cranio, nelle spalle, nella schiena, nelle gambe.
   */
  private rasta(dt: number, rotBusto: THREE.Quaternion) {
    this.corpo.updateMatrix();
    const mc = this.corpo.matrix;
    const nelGruppo = (v: THREE.Vector3) => v.applyMatrix4(mc);
    const testaM = this.mTesta.compose(this.testa.position, this.testa.quaternion, V(1, 1, 1)).premultiply(mc);
    const g = V(0, -9.8, 0);
    // passi piccoli anche quando i fotogrammi sono pochi: la catena resta stabile
    const passi = Math.min(6, Math.max(2, Math.ceil(dt / (1 / 120)))), h = Math.min(dt, 1 / 20) / passi;
    const bac = this.bacino.position;
    const capsule: [THREE.Vector3, THREE.Vector3, number][] = [
      [nelGruppo(bac.clone()), nelGruppo(V(0, BUSTO * 0.9, -0.01).applyQuaternion(rotBusto).add(bac)), 0.155],
      [nelGruppo(this.spalle[0].clone()), nelGruppo(this.spalle[1].clone()), 0.07],
      [nelGruppo(this.ossa.cosciad.position.clone()), nelGruppo(this.ossa.tibiad.position.clone()), 0.1],
      [nelGruppo(this.ossa.coscias.position.clone()), nelGruppo(this.ossa.tibias.position.clone()), 0.1],
      [nelGruppo(this.ossa.tibiad.position.clone()), nelGruppo(this.piedi[1].position.clone().add(V(0, 0.08, 0))), 0.085],
      [nelGruppo(this.ossa.tibias.position.clone()), nelGruppo(this.piedi[0].position.clone().add(V(0, 0.08, 0))), 0.085],
    ];
    // la testa nelle sue coordinate: il cranio come ellissoide, e la faccia (occhi, naso, bocca) da lasciare libera
    const inv = this.mInv.copy(testaM).invert();
    const lp = V();
    const RT = V(0.118, 0.138, 0.13);
    const ab = V(), ap = V(), c = V(), r0 = V(), r1 = V(), r2 = V();
    let idx = 0;
    for (let k = 0; k < this.radici.length; k++) {
      const P = this.punti[k], Q = this.prima[k];
      const L = this.lunghezze[k];
      const seg = L / (N_PUNTI - 1);
      const R = this.radici[k];
      // i primi tre punti, fissi sulla testa: la radice, poi il primo tratto all'indietro, poi la curva in giù
      r0.copy(R.p).applyMatrix4(testaM);
      r1.copy(R.p).addScaledVector(R.a, seg * 0.6).applyMatrix4(testaM);
      r2.copy(R.p).addScaledVector(R.a, seg * 0.6).addScaledVector(R.b, seg).applyMatrix4(testaM);
      if (!this.iniziato) {
        // al primo fotogramma pendono già, dietro la schiena
        for (let i = 0; i < N_PUNTI; i++) {
          if (i < 3) P[i].copy([r0, r1, r2][i]);
          else P[i].copy(r2).add(V(0, -seg * (i - 2), -0.02 * Math.min(i, 4)));
          Q[i].copy(P[i]);
        }
      }
      for (let s = 0; s < passi; s++) {
        P[0].copy(r0);
        P[1].copy(r1);
        P[2].copy(r2);
        for (let i = 3; i < N_PUNTI; i++) {
          const v = c.copy(P[i]).sub(Q[i]).multiplyScalar(0.95);
          // niente frustate: i rasta sono pesanti, la velocità ha un tetto
          const vl = v.length();
          if (vl > 0.025) v.multiplyScalar(0.025 / vl);
          Q[i].copy(P[i]);
          P[i].add(v).addScaledVector(g, h * h);
        }
        for (let it = 0; it < 3; it++) {
          for (let i = 3; i < N_PUNTI; i++) {
            // la catena: ogni tratto torna alla sua lunghezza (i punti attaccati alla testa non si muovono)
            const d = c.copy(P[i]).sub(P[i - 1]);
            const l = d.length() || 1e-6;
            const e = (l - seg) / l;
            if (i === 3) P[i].addScaledVector(d, -e);
            else {
              P[i].addScaledVector(d, -e * 0.5);
              P[i - 1].addScaledVector(d, e * 0.5);
            }
          }
          for (let i = 3; i < N_PUNTI; i++) {
            // fuori dal cranio e dalla faccia: i rasta incorniciano il volto, non lo coprono
            lp.copy(P[i]).applyMatrix4(inv);
            const ex = (lp.x - CUOIO.c.x) / RT.x, ey = (lp.y - CUOIO.c.y) / RT.y, ez = (lp.z - CUOIO.c.z) / RT.z;
            const le = Math.hypot(ex, ey, ez);
            let tocca = false;
            if (le < 1) {
              lp.set(CUOIO.c.x + (ex / (le || 1)) * RT.x, CUOIO.c.y + (ey / (le || 1)) * RT.y, CUOIO.c.z + (ez / (le || 1)) * RT.z);
              tocca = true;
            }
            if (lp.z > -0.01 && Math.abs(lp.x) < 0.058 && lp.y > -0.05 && lp.y < 0.17) {
              lp.x = (lp.x !== 0 ? Math.sign(lp.x) : k % 2 ? 1 : -1) * 0.058;
              tocca = true;
            }
            if (tocca) P[i].copy(lp).applyMatrix4(testaM);
            // fuori dal corpo
            for (const [A, B, rr] of capsule) {
              ab.copy(B).sub(A);
              const u = Math.min(1, Math.max(0, ap.copy(P[i]).sub(A).dot(ab) / (ab.lengthSq() || 1e-6)));
              const vicino = c.copy(A).addScaledVector(ab, u);
              const fuori = ap.copy(P[i]).sub(vicino);
              const lf = fuori.length();
              if (lf < rr) P[i].copy(vicino).addScaledVector(fuori, rr / (lf || 1e-6));
            }
          }
        }
      }
      // i tratti, più sottili verso la punta
      for (let i = 0; i < N_PUNTI - 1; i++) {
        const a = P[i], b = P[i + 1];
        const d = this.t.copy(b).sub(a);
        const l = d.length();
        const spessore = 0.018 * (1 - (i / N_PUNTI) * 0.3);
        this.q.setFromUnitVectors(SU, d.multiplyScalar(1 / (l || 1)));
        this.m4.compose(a, this.q, V(spessore, l, spessore));
        this.ciocche.setMatrixAt(idx++, this.m4);
      }
    }
    this.iniziato = true;
    this.ciocche.instanceMatrix.needsUpdate = true;
  }

  libera() {
    this.gruppo.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
      if ((o as THREE.Sprite).isSprite) (o as THREE.Sprite).material.dispose();
    });
    this.mat.dispose();
    this.maschera.dispose();
  }
}
