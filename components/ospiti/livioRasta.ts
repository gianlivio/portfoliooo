import * as THREE from "three";
import { loft } from "./comuni";

/**
 * Livio coi rasta fino alle gambe, in ologramma, che si allena al Mook Jong: la stessa luce azzurra a righe
 * di Achille, ma un corpo intero con le articolazioni vere. Le braccia e le gambe si muovono per cinematica
 * inversa verso bersagli precisi sul tronco e sui bracci del manichino (le mani arrivano dove colpiscono),
 * su una sequenza di Wing Chun: guardia, tan sau e palmo, bong sau e lap sau, gaan sau col pugno,
 * i pugni a catena, il calcio basso alla gamba; poi la stessa sequenza a specchio. A ogni colpo un lampo
 * sul legno. I rasta sono ciocche vere: catene di punti che pendono, inseguono la testa e scivolano su
 * schiena e gambe senza attraversarle.
 * Compare ogni tanto: si stampa dal basso in alto, fa la sua sequenza un paio di volte, si spegne dall'alto.
 * Coordinate della figura: +z verso il manichino, +x è la sua sinistra, y in alto, i piedi a y = 0.
 * Il manichino sta a (0, 0, DISTANZA), girato come la figura: le sue misure sono quelle di cameraLivio.ts.
 */

export const DISTANZA = 0.66;

const VERT = /* glsl */ `
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

const FRAG = /* glsl */ `
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

/* ------------------------------------------------------------- la sequenza */

type Mano = "palmo" | "pugno";
type Posa = {
  t: number;
  /** mani: bersaglio e forma */
  s: [number, number, number];
  d: [number, number, number];
  ms?: Mano;
  md?: Mano;
  /** gomito alto (bong sau): il polo del gomito va in alto e in fuori invece che in basso */
  bs?: boolean;
  bd?: boolean;
  /** piedi */
  ps?: [number, number, number];
  pd?: [number, number, number];
  /** bacino: altezza, rotazione, spostamento in avanti */
  h?: number;
  yaw?: number;
  av?: number;
  /** arrivo secco: un colpo (il lampo nasce qui, sulla mano o sul piede indicato) */
  colpo?: "s" | "d" | "ps" | "pd";
};

// il manichino, nelle coordinate della figura: tronco a z = DISTANZA (raggio 0.11), bracci alti fino a z ≈ 0.29
const TRONCO = DISTANZA - 0.12;
const GUARDIA_S: [number, number, number] = [0.02, 1.2, 0.3];
const GUARDIA_D: [number, number, number] = [-0.02, 1.16, 0.17];
const PIEDE_S: [number, number, number] = [0.18, 0, 0.02];
const PIEDE_D: [number, number, number] = [-0.18, 0, -0.04];

/** Mezza sequenza, dalla parte sinistra; l'altra metà è la stessa a specchio. */
function sequenza(): Posa[] {
  const P: Posa[] = [];
  const g = (t: number, extra: Partial<Posa> = {}) => P.push({ t, s: GUARDIA_S, d: GUARDIA_D, ...extra });
  g(0);
  g(0.8);
  // tan sau dentro il braccio sinistro del manichino, e il palmo destro al tronco
  P.push({ t: 1.25, s: [0.05, 1.27, 0.33], d: [-0.03, 1.18, 0.24], yaw: -0.08 });
  P.push({ t: 1.5, s: [0.05, 1.27, 0.33], d: [-0.02, 1.13, TRONCO], md: "palmo", yaw: -0.2, av: 0.03, colpo: "d" });
  P.push({ t: 1.85, s: [0.05, 1.26, 0.32], d: [-0.02, 1.14, TRONCO - 0.05], yaw: -0.18, av: 0.03 });
  g(2.3);
  // bong sau col destro sul braccio destro del manichino, lap sau e palmo sinistro
  P.push({ t: 2.75, s: [0.05, 1.15, 0.2], d: [-0.03, 1.33, 0.3], bd: true, yaw: 0.25 });
  P.push({ t: 3.15, s: [0.05, 1.15, 0.2], d: [-0.08, 1.3, 0.3], bd: true, yaw: 0.28 });
  P.push({ t: 3.45, s: [0.03, 1.15, TRONCO], ms: "palmo", d: [-0.12, 1.17, 0.26], yaw: 0.12, av: 0.04, colpo: "s" });
  P.push({ t: 3.8, s: [0.03, 1.16, TRONCO - 0.05], d: [-0.1, 1.17, 0.25], yaw: 0.1, av: 0.03 });
  g(4.2);
  // gaan sau in basso contro il braccio di mezzo, e il pugno destro
  P.push({ t: 4.65, s: [0.12, 0.98, 0.33], d: [-0.02, 1.17, 0.26], ms: "palmo", yaw: -0.1, h: 0.9 });
  P.push({ t: 4.9, s: [0.12, 0.97, 0.33], d: [0.0, 1.17, TRONCO], md: "pugno", yaw: -0.22, av: 0.04, h: 0.9, colpo: "d" });
  P.push({ t: 5.2, s: [0.1, 1.0, 0.3], d: [0.0, 1.17, TRONCO - 0.06], md: "pugno", yaw: -0.18, h: 0.9 });
  g(5.6);
  // i pugni a catena, sulla linea centrale: uno dietro l'altro, il pugno che rientra passa sopra quello che esce
  for (let k = 0; k < 7; k++) {
    const t = 5.95 + k * 0.17;
    const destro = k % 2 === 0;
    const fuori: [number, number, number] = [0, 1.19 - (k % 3) * 0.015, TRONCO];
    const dentro = (x: number): [number, number, number] => [x, 1.24, 0.24];
    P.push({ t, s: destro ? dentro(0.02) : fuori, d: destro ? fuori : dentro(-0.02), ms: "pugno", md: "pugno", av: 0.05, colpo: destro ? "d" : "s" });
  }
  P.push({ t: 7.4, s: GUARDIA_S, d: GUARDIA_D, ms: "pugno", md: "pugno" });
  g(7.8);
  // il calcio basso: il ginocchio sale, il tallone colpisce la gamba del manichino, il piede torna giù
  P.push({ t: 8.3, s: [0.04, 1.22, 0.3], d: [-0.02, 1.18, 0.2], pd: [-0.08, 0.42, 0.18], h: 0.94 });
  P.push({ t: 8.55, s: [0.04, 1.22, 0.3], d: [-0.02, 1.18, 0.2], pd: [-0.03, 0.3, DISTANZA - 0.3], h: 0.94, colpo: "pd" });
  P.push({ t: 8.9, s: [0.04, 1.22, 0.3], d: [-0.02, 1.18, 0.2], pd: [-0.1, 0.25, 0.12], h: 0.93 });
  g(9.3);
  g(9.8);
  return P;
}

const specchia = (v: [number, number, number]): [number, number, number] => [-v[0], v[1], v[2]];
const MEZZA = sequenza();
const DURATA_MEZZA = MEZZA[MEZZA.length - 1].t;
/** La sequenza intera: la metà sinistra, poi la stessa a specchio (mani e piedi scambiati). */
const TUTTA: Posa[] = [
  ...MEZZA,
  ...MEZZA.slice(1).map((p): Posa => ({
    t: p.t + DURATA_MEZZA,
    s: specchia(p.d),
    d: specchia(p.s),
    ms: p.md,
    md: p.ms,
    bs: p.bd,
    bd: p.bs,
    ps: p.pd && specchia(p.pd),
    pd: p.ps && specchia(p.ps),
    h: p.h,
    yaw: p.yaw === undefined ? undefined : -p.yaw,
    av: p.av,
    colpo: p.colpo === "s" ? "d" : p.colpo === "d" ? "s" : p.colpo === "ps" ? "pd" : p.colpo === "pd" ? "ps" : undefined,
  })),
];
const CICLO = DURATA_MEZZA * 2;

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

const N_CIOCCHE = 30;
const N_PUNTI = 10;

export class LivioRasta {
  gruppo = new THREE.Group();
  private mat: THREE.ShaderMaterial;
  private maschera!: THREE.ShaderMaterial;
  private busto: THREE.Mesh;
  private bacino: THREE.Mesh;
  private testa = new THREE.Group();
  private collo: THREE.Mesh;
  private ossa: Record<string, THREE.Mesh> = {};
  private mani: { palmo: THREE.Mesh; pugno: THREE.Mesh }[] = [];
  private piedi: THREE.Mesh[] = [];
  private giunti: THREE.Mesh[] = [];
  private ciocche: THREE.InstancedMesh;
  /** per ogni ciocca: dove nasce sulla testa (coordinate della testa), lunghezza, i punti e quelli di prima */
  private radici: THREE.Vector3[] = [];
  private lunghezze: number[] = [];
  private punti: THREE.Vector3[][] = [];
  private prima: THREE.Vector3[][] = [];
  private lampi: { s: THREE.Sprite; vita: number }[] = [];
  private ultimoColpo = -1;
  private tempo = 0;
  private stato: "spento" | "stampa" | "allena" | "cancella" = "spento";
  private finoA = 7;
  private cicli = 0;
  private iniziato = false;
  // appoggi, per non creare oggetti a ogni fotogramma
  private q = new THREE.Quaternion();
  private t = V();
  private m4 = new THREE.Matrix4();
  private mTesta = new THREE.Matrix4();

  constructor(lampo: THREE.Texture) {
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
      this.gruppo.add(o);
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
    // la testa: il cranio un poco allungato, il mento, il naso appena accennato; i rasta raccolti sul cranio
    const cranio = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14).scale(0.095, 0.118, 0.108), m);
    cranio.position.set(0, 0.11, 0);
    const mento = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.06, 0.07), m);
    mento.position.set(0, 0.035, 0.035);
    const naso = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6).rotateX(Math.PI / 2), m);
    naso.position.set(0, 0.1, 0.112);
    const raccolta = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(0.11, 0.1, 0.12), m);
    raccolta.position.set(0, 0.15, -0.02);
    this.testa.add(cranio, mento, naso, raccolta);
    this.gruppo.add(this.testa);
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

    // i rasta: ciocche che nascono dalla nuca e dai lati del cranio, lunghe fino ai polpacci
    const r = (() => {
      let s = 77;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    for (let k = 0; k < N_CIOCCHE; k++) {
      // sulla calotta, di dietro e ai lati: nessuna davanti alla faccia
      // da un lato all'altro, passando dietro; le ultime quattro dai lati, più avanti: cadono sulle spalle
      const ang = k < N_CIOCCHE - 4 ? Math.PI * (0.35 + 1.3 * (k / (N_CIOCCHE - 5))) + (r() - 0.5) * 0.12 : Math.PI * [0.18, 0.26, 1.74, 1.82][k - (N_CIOCCHE - 4)];
      const alt = 0.12 + r() * 0.1;
      const radice = V(Math.cos(ang) * 0.1, alt, -Math.abs(Math.sin(ang)) * 0.105 - 0.01);
      this.radici.push(radice);
      // le ciocche di dietro più lunghe: fino ai polpacci; quelle di lato fino alla vita o alle cosce
      const dietro = Math.abs(Math.sin(ang));
      this.lunghezze.push(0.75 + dietro * 0.5 + r() * 0.12);
      this.punti.push(Array.from({ length: N_PUNTI }, () => V()));
      this.prima.push(Array.from({ length: N_PUNTI }, () => V()));
    }
    this.ciocche = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), m, N_CIOCCHE * (N_PUNTI - 1));
    this.ciocche.frustumCulled = false;
    this.gruppo.add(this.ciocche);

    // i lampi dei colpi sul legno
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampo, color: "#9FD4FF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.visible = false;
      this.gruppo.add(s);
      this.lampi.push({ s, vita: 0 });
    }
    // la maschera di profondità: un passaggio che scrive solo la profondità, prima della luce, così dell'ologramma
    // si vede la superficie davanti e non il groviglio di braccia, rasta e schiena che sta dietro
    const maschera = new THREE.ShaderMaterial({
      vertexShader: VERT,
      // lo stesso taglio della stampa: sopra il taglio la maschera non c'è, se no coprirebbe quello che sta dietro
      fragmentShader: "uniform float uBase; uniform float uTaglio; varying vec3 vW; void main(){ if (vW.y - uBase > uTaglio) discard; gl_FragColor = vec4(0.0); }",
      uniforms: this.mat.uniforms,
      colorWrite: false,
      depthWrite: true,
      transparent: true,
    });
    this.maschera = maschera;
    for (const o of [...this.gruppo.children]) {
      if (o instanceof THREE.InstancedMesh) {
        const c = new THREE.InstancedMesh(o.geometry, maschera, o.count);
        c.instanceMatrix = o.instanceMatrix;
        c.frustumCulled = false;
        c.renderOrder = 7;
        o.add(c);
        // le istanze hanno già la loro posizione nel gruppo: la copia, figlia, non deve spostarsi di nuovo
        c.matrixAutoUpdate = false;
        c.matrix.identity();
      } else if (o instanceof THREE.Mesh) {
        const c = new THREE.Mesh(o.geometry, maschera);
        c.renderOrder = 7;
        o.add(c);
      } else if (o === this.testa) {
        for (const t of [...o.children]) {
          const c = new THREE.Mesh((t as THREE.Mesh).geometry, maschera);
          c.renderOrder = 7;
          t.add(c);
        }
      }
    }
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      if (o.renderOrder !== 7) o.renderOrder = 8;
    });
    this.gruppo.visible = false;
  }

  /** La posa a un istante della sequenza, interpolata fra le chiavi. */
  private posa(tc: number) {
    let i = 0;
    while (i < TUTTA.length - 2 && TUTTA[i + 1].t <= tc) i++;
    const a = TUTTA[i], b = TUTTA[i + 1];
    const u0 = Math.min(1, Math.max(0, (tc - a.t) / (b.t - a.t)));
    const u = b.colpo ? secco(u0) : morbido(u0);
    const mix = (x: [number, number, number] | undefined, y: [number, number, number] | undefined, base: [number, number, number]) => {
      const p = x ?? base, q = y ?? base;
      return V(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u);
    };
    const n = (x: number | undefined, y: number | undefined, base: number) => (x ?? base) + ((y ?? base) - (x ?? base)) * u;
    return {
      s: mix(a.s, b.s, GUARDIA_S),
      d: mix(a.d, b.d, GUARDIA_D),
      ps: mix(a.ps, b.ps, PIEDE_S),
      pd: mix(a.pd, b.pd, PIEDE_D),
      h: n(a.h, b.h, 0.93),
      yaw: n(a.yaw, b.yaw, 0),
      av: n(a.av, b.av, 0),
      bs: (u < 0.5 ? a.bs : b.bs) ?? false,
      bd: (u < 0.5 ? a.bd : b.bd) ?? false,
      ms: (u < 0.5 ? a.ms : b.ms) ?? "palmo",
      md: (u < 0.5 ? a.md : b.md) ?? "palmo",
      // il colpo che arriva in questo tratto, e se è appena arrivato
      colpo: b.colpo && u0 >= 1 ? null : b.colpo && u0 > 0.92 ? { quale: b.colpo, chiave: i + 1 } : null,
    };
  }

  /** Dove sta, nel mondo, il pavimento sotto i piedi: serve al taglio della stampa. */
  private base() {
    this.gruppo.updateWorldMatrix(true, false);
    return this.t.setFromMatrixPosition(this.gruppo.matrixWorld).y;
  }

  aggiorna(t: number, dt: number, ridotto: boolean) {
    this.mat.uniforms.uT.value = t;
    if (ridotto) {
      this.gruppo.visible = false;
      return;
    }
    // il tempo della sequenza è quello vero; la fisica dei rasta va a passi piccoli (vedi rasta)
    this.tempo += dt;
    // il ciclo di vita: spento, si stampa, si allena due volte la sequenza, si cancella, spento
    if (this.stato === "spento") {
      this.gruppo.visible = false;
      if (this.tempo < this.finoA) return;
      this.stato = "stampa";
      this.tempo = 0;
      this.cicli = 0;
      this.iniziato = false;
    }
    let taglio = 2;
    if (this.stato === "stampa") {
      taglio = (this.tempo / 1.6) * 2;
      if (this.tempo >= 1.6) {
        this.stato = "allena";
        this.tempo = 0;
      }
    } else if (this.stato === "cancella") {
      taglio = 2 - (this.tempo / 1.4) * 2;
      if (this.tempo >= 1.4) {
        this.stato = "spento";
        this.tempo = 0;
        this.finoA = 35 + Math.random() * 30;
        this.gruppo.visible = false;
        return;
      }
    }
    this.gruppo.visible = true;
    this.mat.uniforms.uBase.value = this.base();
    this.mat.uniforms.uTaglio.value = taglio;
    // durante la stampa e la cancellazione resta in guardia; si allena solo quando è intero
    const tc = this.stato === "allena" ? this.tempo % CICLO : 0;
    if (this.stato === "allena" && this.tempo >= CICLO * 2) {
      this.stato = "cancella";
      this.tempo = 0;
    }
    this.metti(tc, dt, t);
  }

  private metti(tc: number, dt: number, t: number) {
    const P = this.posa(tc);
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
    this.testa.quaternion.setFromEuler(new THREE.Euler(0.08, P.yaw * 0.35, 0, "YXZ"));
    // braccia
    const spalle = [nelBusto(SPALLA_X, BUSTO - 0.06, 0), nelBusto(-SPALLA_X, BUSTO - 0.06, 0)];
    const bersagli = [P.s, P.d];
    const forme = [P.ms, P.md];
    const alti = [P.bs, P.bd];
    const gomito = V(), punta = V();
    (["s", "d"] as const).forEach((lato, i) => {
      const sx = i === 0 ? 1 : -1;
      // il gomito sta in basso e verso il centro; nel bong sau sale e va in fuori
      const polo = alti[i] ? V(sx * 0.9, 0.9, -0.2) : V(sx * 0.35, -1, -0.15);
      ik(spalle[i], bersagli[i], ALTO.braccio, ALTO.avambraccio, polo, gomito, punta);
      osso(this.ossa[`braccio${lato}`], spalle[i], gomito, this.q, this.t);
      osso(this.ossa[`avambraccio${lato}`], gomito, punta, this.q, this.t);
      this.giunti[i * 3].position.copy(spalle[i]);
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

  /** I rasta: punti che pendono, legati in catena, che inseguono la testa e non entrano nel corpo. */
  private rasta(dt: number, rotBusto: THREE.Quaternion) {
    const testaM = this.mTesta.compose(this.testa.position, this.testa.quaternion, V(1, 1, 1));
    const g = V(0, -9.8, 0);
    // passi piccoli anche quando i fotogrammi sono pochi: la catena resta stabile
    const passi = Math.min(6, Math.max(2, Math.ceil(dt / (1 / 120)))), h = Math.min(dt, 1 / 20) / passi;
    // il corpo come capsule: busto, cosce, tibie (i punti vengono spinti fuori)
    const capsule: [THREE.Vector3, THREE.Vector3, number][] = [
      [this.bacino.position.clone(), V(0, BUSTO * 0.9, -0.01).applyQuaternion(rotBusto).add(this.bacino.position), 0.155],
      [this.ossa.cosciad.position.clone(), this.ossa.tibiad.position.clone(), 0.1],
      [this.ossa.coscias.position.clone(), this.ossa.tibias.position.clone(), 0.1],
      [this.ossa.tibiad.position.clone(), this.piedi[1].position.clone().add(V(0, 0.08, 0)), 0.085],
      [this.ossa.tibias.position.clone(), this.piedi[0].position.clone().add(V(0, 0.08, 0)), 0.085],
    ];
    const testaC = this.testa.position.clone().add(V(0, 0.11, 0));
    const ab = V(), ap = V(), c = V();
    let idx = 0;
    for (let k = 0; k < N_CIOCCHE; k++) {
      const P = this.punti[k], Q = this.prima[k];
      const seg = this.lunghezze[k] / (N_PUNTI - 1);
      const radice = this.radici[k].clone().applyMatrix4(testaM);
      if (!this.iniziato) {
        // al primo fotogramma pendono già dritte, dietro la schiena
        for (let i = 0; i < N_PUNTI; i++) {
          P[i].copy(radice).add(V(0, -seg * i, -0.03 * Math.min(i, 3)));
          Q[i].copy(P[i]);
        }
      }
      for (let s = 0; s < passi; s++) {
        P[0].copy(radice);
        for (let i = 1; i < N_PUNTI; i++) {
          const v = c.copy(P[i]).sub(Q[i]).multiplyScalar(0.96);
          Q[i].copy(P[i]);
          P[i].add(v).addScaledVector(g, h * h);
        }
        for (let it = 0; it < 3; it++) {
          for (let i = 1; i < N_PUNTI; i++) {
            // la catena: ogni tratto torna alla sua lunghezza (il punto attaccato alla testa non si muove)
            const d = c.copy(P[i]).sub(P[i - 1]);
            const l = d.length() || 1e-6;
            const e = (l - seg) / l;
            if (i === 1) P[i].addScaledVector(d, -e);
            else {
              P[i].addScaledVector(d, -e * 0.5);
              P[i - 1].addScaledVector(d, e * 0.5);
            }
          }
          for (let i = 2; i < N_PUNTI; i++) {
            // fuori dal cranio
            const dt0 = c.copy(P[i]).sub(testaC);
            const lt = dt0.length();
            if (lt < 0.13) P[i].copy(testaC).addScaledVector(dt0, 0.13 / (lt || 1));
            // fuori dal corpo
            for (const [A, B, r] of capsule) {
              ab.copy(B).sub(A);
              const u = Math.min(1, Math.max(0, ap.copy(P[i]).sub(A).dot(ab) / ab.lengthSq()));
              const vicino = c.copy(A).addScaledVector(ab, u);
              const fuori = ap.copy(P[i]).sub(vicino);
              const lf = fuori.length();
              if (lf < r) P[i].copy(vicino).addScaledVector(fuori, r / (lf || 1e-6));
            }
          }
        }
      }
      // i tratti, più sottili verso la punta
      for (let i = 0; i < N_PUNTI - 1; i++) {
        const a = P[i], b = P[i + 1];
        const d = this.t.copy(b).sub(a);
        const l = d.length();
        const spessore = 0.016 * (1 - (i / N_PUNTI) * 0.35);
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
