import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA, PASSO } from "../zona";
import { fra, generatore, liberaTutto, loft, morbido } from "./comuni";
import { FRAG as FRAG_FIGURA, VERT as VERT_FIGURA } from "./livioRasta";
import { FRAG, LINEA_FRAG, LINEA_VERT, VERT } from "./tempio";

/**
 * L'aula universitaria, fatta di luce come il tempio, in piccolo: la grande tribuna di legno a semicerchio (come
 * l'aula di via Zamboni 38), con le scale fra gli spicchi, e in basso la pedana, la cattedra, la lavagna al muro.
 * Umberto Eco (la barba e gli occhiali neri) fa lezione:
 * va alla lavagna e disegna il triangolo di Peirce (segno, oggetto, interpretante, la base tratteggiata perché
 * fra il segno e l'oggetto non c'è un legame diretto), poi aggiunge la semiosi illimitata; si gira verso gli
 * studenti, indica i vertici, gesticola; alla fine cancella e ricomincia.
 * Grande quanto il podere dell'ulivo (una persona alta una trentina di centimetri), a terra nel varco fra ESH e il
 * cancello dell'uliveto. Si guarda come da chi entra dalla porta in cima alla tribuna: da quaggiù l'occhio sta
 * troppo basso, e le file alte, le più vicine, coprirebbero il fondo; così l'ologramma è inclinato verso chi guarda,
 * il bordo vicino a terra e il muro della lavagna sollevato. Coordinate dell'aula: −z verso chi guarda, y in alto.
 * Con "riduci movimento" non viene aggiornata e resta ferma a lezione, con la lavagna scritta.
 */

const PAV = PELO_ACQUA;
/** Dove sta: in passi dalla zona (components/zona.ts), e la distanza dal centro. */
export const AULA_A = ANGOLO_ZONA + (4.33 + 14 - 12) * PASSO;
export const AULA_D = 7.6;
/** Eco, alto 1,78 nelle misure dell'aula, nel mondo è alto circa 35 centimetri. */
const SCALA = 0.2;
/** Quanto è inclinata verso chi guarda: con l'occhio a quella distanza, si vede dall'alto come dalla porta. */
const INCLINA = 0.5;
const CICLO = 38;

/* le misure, in metri prima di SCALA */
const PEDANA = { l: 3.4, z0: -0.8, z1: 1.2, h: 0.3 };
const LAVAGNA = { l: 3.2, h: 1.35, y: PEDANA.h + 0.85, z: 1.0 };
/** Il muro di fondo, dietro la lavagna: chiude il semicerchio. */
const MURO = { z: 1.28, h: 2.7 };
/** La cattedra: davanti alla lavagna, a destra di chi guarda, appena girata verso la tribuna. */
const CATTEDRA = { x: -0.95, z: -0.35, giro: -0.2 };
const CENTRO = new THREE.Vector3(0, 0, 0.25); // il centro della tribuna: dove sta chi parla
const GRADINO = 0.3;
const FILE = Array.from({ length: 7 }, (_, i) => 2.3 + i * 0.48);
const ESTERNO = FILE[FILE.length - 1] + 0.24;
/** Gli spicchi della tribuna, in radianti da −z: fra uno e l'altro le scale, quella di mezzo davanti alla porta. */
const SPICCHI: [number, number][] = [[-Math.PI / 2, -0.97], [-0.86, -0.07], [0.07, 0.86], [0.97, Math.PI / 2]];

const LEGNO = { giorno: new THREE.Color("#A0500F"), notte: new THREE.Color("#FFC25A") };
const ECO = { giorno: new THREE.Color("#1A4FB0"), notte: new THREE.Color("#6CC4FF") };
const STUDENTI = { giorno: new THREE.Color("#3D7FC8"), notte: new THREE.Color("#9AD6FF") };

/* ------------------------------------------------------------------ la lavagna */

type Tratto =
  | { tipo: "testo"; testo: string; u: number; v: number; corpo: number; dura: number }
  | { tipo: "linea"; da: [number, number]; a: [number, number]; dura: number; tratteggio?: boolean }
  | { tipo: "freccia"; punti: [number, number][]; dura: number };

/** I vertici del triangolo, in coordinate della lavagna (u da sinistra, v dal basso, viste da chi guarda). */
const S: [number, number] = [0.42, 0.79];
const O: [number, number] = [0.16, 0.39];
const I: [number, number] = [0.68, 0.39];
const TRATTI: Tratto[] = [
  { tipo: "testo", testo: "segno", u: 0.42, v: 0.9, corpo: 80, dura: 1.4 },
  { tipo: "linea", da: S, a: O, dura: 0.9 },
  { tipo: "testo", testo: "oggetto", u: 0.16, v: 0.26, corpo: 80, dura: 1.5 },
  { tipo: "linea", da: O, a: I, dura: 1.1, tratteggio: true },
  { tipo: "testo", testo: "interpretante", u: 0.68, v: 0.26, corpo: 80, dura: 2.1 },
  { tipo: "linea", da: I, a: S, dura: 0.9 },
  { tipo: "freccia", punti: [[0.76, 0.45], [0.84, 0.56], [0.86, 0.67]], dura: 0.8 },
  { tipo: "testo", testo: "semiosi illimitata", u: 0.83, v: 0.76, corpo: 46, dura: 1.8 },
];
const VAI = 0.4; // il tempo per spostare la mano da un tratto al successivo
const INIZIO_SCRIVE = 3.2;
/** Quando comincia ogni tratto, nel ciclo. */
const INIZI: number[] = [];
{
  let t = INIZIO_SCRIVE;
  TRATTI.forEach((tr) => {
    INIZI.push(t);
    t += tr.dura + VAI;
  });
}
const FINE_SCRIVE = INIZI[INIZI.length - 1] + TRATTI[TRATTI.length - 1].dura;
const CANCELLA = [32.5, 35.5];

const TL = 1024;
const TA = Math.round((TL * LAVAGNA.h) / LAVAGNA.l);

/** Il punto del tratto a un dato avanzamento (0..1), in coordinate della lavagna: dove sta il gesso. */
function puntaTratto(tr: Tratto, k: number, larghezzaTesto: number, out: [number, number]) {
  if (tr.tipo === "testo") {
    // la mano corre lungo la parola, su e giù come chi scrive
    const w = larghezzaTesto / TL;
    out[0] = tr.u - w / 2 + w * k;
    out[1] = tr.v + 0.03 * Math.sin(k * 40) * (tr.corpo / 80);
  } else if (tr.tipo === "linea") {
    out[0] = THREE.MathUtils.lerp(tr.da[0], tr.a[0], k);
    out[1] = THREE.MathUtils.lerp(tr.da[1], tr.a[1], k);
  } else {
    const n = tr.punti.length - 1;
    const f = Math.min(n - 1e-6, k * n);
    const i = Math.floor(f);
    out[0] = THREE.MathUtils.lerp(tr.punti[i][0], tr.punti[i + 1][0], f - i);
    out[1] = THREE.MathUtils.lerp(tr.punti[i][1], tr.punti[i + 1][1], f - i);
  }
  return out;
}

class Lavagna {
  tela = document.createElement("canvas");
  texture: THREE.CanvasTexture;
  private x: CanvasRenderingContext2D;
  private serif: string;
  private ultimo = "";
  larghezze: number[] = [];

  constructor() {
    this.tela.width = TL;
    this.tela.height = TA;
    this.x = this.tela.getContext("2d") as CanvasRenderingContext2D;
    const s = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim();
    this.serif = s || "Georgia, serif";
    this.larghezze = TRATTI.map((tr) => {
      if (tr.tipo !== "testo") return 0;
      this.x.font = this.font(tr.corpo);
      return this.x.measureText(tr.testo).width;
    });
    this.texture = new THREE.CanvasTexture(this.tela);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  private font(corpo: number) {
    return `italic 400 ${corpo}px ${this.serif}`;
  }

  /** Disegna la lavagna: fin dove è arrivato il gesso (tratto i, avanzamento k), e la parte cancellata (0..1 da sinistra). */
  disegna(i: number, k: number, cancellato: number) {
    const chiave = `${i}:${Math.round(k * 40)}:${Math.round(cancellato * 40)}`;
    if (chiave === this.ultimo) return;
    this.ultimo = chiave;
    const x = this.x;
    x.clearRect(0, 0, TL, TA);
    // il fondo: lavagna verde, un poco trasparente
    x.fillStyle = "rgba(24,64,54,0.78)";
    x.fillRect(0, 0, TL, TA);
    x.save();
    if (cancellato > 0) {
      x.beginPath();
      x.rect(cancellato * TL, 0, TL, TA);
      x.clip();
    }
    x.strokeStyle = "rgba(246,244,236,0.95)";
    x.fillStyle = "rgba(246,244,236,0.95)";
    x.lineCap = "round";
    x.lineJoin = "round";
    const P = (p: [number, number]) => [p[0] * TL, (1 - p[1]) * TA] as const;
    for (let j = 0; j <= Math.min(i, TRATTI.length - 1); j++) {
      const tr = TRATTI[j];
      const f = j < i ? 1 : k;
      if (f <= 0) continue;
      if (tr.tipo === "testo") {
        x.save();
        x.font = this.font(tr.corpo);
        x.textAlign = "center";
        x.textBaseline = "middle";
        const w = this.larghezze[j];
        const [cx, cy] = P([tr.u, tr.v]);
        x.beginPath();
        x.rect(cx - w / 2 - 6, 0, (w + 12) * f, TA);
        x.clip();
        x.fillText(tr.testo, cx, cy);
        x.restore();
      } else if (tr.tipo === "linea") {
        x.lineWidth = 7;
        x.setLineDash(tr.tratteggio ? [22, 18] : []);
        const [ax, ay] = P(tr.da);
        const [bx, by] = P(tr.a);
        x.beginPath();
        x.moveTo(ax, ay);
        x.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
        x.stroke();
        x.setLineDash([]);
      } else {
        x.lineWidth = 5;
        const pts = tr.punti.map(P);
        const n = pts.length - 1;
        const g = f * n;
        x.beginPath();
        x.moveTo(pts[0][0], pts[0][1]);
        for (let m = 1; m <= n; m++) {
          const u = Math.min(1, Math.max(0, g - (m - 1)));
          if (u <= 0) break;
          x.lineTo(pts[m - 1][0] + (pts[m][0] - pts[m - 1][0]) * u, pts[m - 1][1] + (pts[m][1] - pts[m - 1][1]) * u);
        }
        x.stroke();
        if (f >= 1) {
          // la punta della freccia
          const [px, py] = pts[n];
          const [qx, qy] = pts[n - 1];
          const ang = Math.atan2(py - qy, px - qx);
          x.beginPath();
          for (const s of [-1, 1]) {
            x.moveTo(px, py);
            x.lineTo(px - Math.cos(ang + s * 0.5) * 22, py - Math.sin(ang + s * 0.5) * 22);
          }
          x.stroke();
        }
      }
    }
    x.restore();
    // l'alone del gesso cancellato
    if (cancellato > 0 && cancellato < 1) {
      x.fillStyle = "rgba(246,244,236,0.08)";
      x.fillRect(0, 0, cancellato * TL, TA);
    }
    this.texture.needsUpdate = true;
  }

  libera() {
    this.texture.dispose();
  }
}

/* ------------------------------------------------------------------ Eco */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SU = V(0, 1, 0);
const BRACCIO = 0.3;
const AVAMBRACCIO = 0.28;
const COSCIA = 0.44;
const TIBIA = 0.44;
const ANCA = 0.93;
/** Le spalle, nelle coordinate della figura: +z avanti, +x la sua sinistra. */
const SPALLE = [V(0.23, 1.46, 0), V(-0.23, 1.46, 0)];

function ik(radice: THREE.Vector3, bersaglio: THREE.Vector3, a: number, b: number, polo: THREE.Vector3, gomito: THREE.Vector3, punta: THREE.Vector3) {
  const dir = bersaglio.clone().sub(radice);
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
function osso(o: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const t = b.clone().sub(a);
  const l = t.length();
  o.position.copy(a);
  o.quaternion.setFromUnitVectors(SU, t.multiplyScalar(1 / (l || 1)));
  o.scale.set(1, l, 1);
}

/** Una mesh dell'ologramma con la sua maschera di profondità, figlia: così si vede solo la superficie davanti. */
function conMaschera(geo: THREE.BufferGeometry, mat: THREE.Material, maschera: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 8;
  const k = new THREE.Mesh(geo, maschera);
  k.renderOrder = 7;
  m.add(k);
  return m;
}

const mascheraFigura = (uniformi: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT_FIGURA,
    fragmentShader: "uniform float uBase; uniform float uTaglio; varying vec3 vW; void main(){ if (vW.y - uBase > uTaglio) discard; gl_FragColor = vec4(0.0); }",
    uniforms: uniformi,
    colorWrite: false,
    depthWrite: true,
    transparent: true,
  });

const materialeFigura = () =>
  new THREE.ShaderMaterial({
    vertexShader: VERT_FIGURA,
    fragmentShader: FRAG_FIGURA,
    uniforms: { uT: { value: 0 }, uVis: { value: 1 }, uBase: { value: -99 }, uTaglio: { value: 999 }, uColore: { value: new THREE.Color() }, uArco: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });

/** Umberto Eco: alto e robusto, la pancia, la barba corta, gli occhiali, la fronte alta. */
class Eco {
  gruppo = new THREE.Group();
  mat = materialeFigura();
  private maschera = mascheraFigura(this.mat.uniforms);
  private testa = new THREE.Group();
  private busto = new THREE.Group();
  private ossa: Record<string, THREE.Object3D> = {};
  private mani: THREE.Object3D[] = [];
  private piedi: THREE.Object3D[] = [];
  private giunti: THREE.Object3D[] = [];
  private gomito = V();
  private punta = V();
  /** il nero della barba e degli occhiali */
  private nero = new THREE.MeshBasicMaterial({ color: "#121214", fog: false });

  constructor() {
    const m = this.mat, k = this.maschera;
    const add = (g: THREE.BufferGeometry, padre: THREE.Object3D = this.gruppo) => {
      const o = conMaschera(g, m, k);
      padre.add(o);
      return o;
    };
    // il busto con la giacca: largo, la pancia avanti (giu è il davanti dopo la rotazione)
    add(loft([
      { z: 0.8, l: 0.21, su: 0.13, giu: 0.15 },
      { z: 0.92, l: 0.22, su: 0.135, giu: 0.2 },
      { z: 1.06, l: 0.23, su: 0.135, giu: 0.235 },
      { z: 1.22, l: 0.235, su: 0.13, giu: 0.2 },
      { z: 1.38, l: 0.24, su: 0.12, giu: 0.14 },
      { z: 1.48, l: 0.17, su: 0.09, giu: 0.09 },
      { z: 1.54, l: 0.07, su: 0.06, giu: 0.06 },
    ], { radiali: 18, passi: 3 }).rotateX(-Math.PI / 2), this.busto);
    // il bavero della giacca: due lembi sul petto
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.07, 0.26, 0.02).rotateZ(s * 0.32).translate(s * 0.075, 1.33, 0.16), this.busto);
    }
    // il collo, corto
    add(new THREE.CylinderGeometry(0.065, 0.07, 0.12, 12).translate(0, 1.58, 0), this.busto);
    this.gruppo.add(this.busto);
    // la testa: tonda, la fronte alta, un poco più grande del vero perché si riconosca anche in piccolo;
    // la barba (guance, mento, baffi) e gli occhiali neri, pieni, non di luce; i capelli solo ai lati e dietro
    this.testa.position.set(0, 1.62, 0);
    this.testa.scale.setScalar(1.3);
    add(new THREE.SphereGeometry(1, 18, 14).scale(0.105, 0.125, 0.115).translate(0, 0.12, 0), this.testa);
    add(new THREE.ConeGeometry(0.02, 0.045, 6).rotateX(Math.PI / 2).translate(0, 0.11, 0.125), this.testa);
    const nero = (g: THREE.BufferGeometry) => {
      const o = new THREE.Mesh(g, this.nero);
      this.testa.add(o);
    };
    nero(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI, Math.PI * 0.42, Math.PI * 0.58).scale(0.114, 0.105, 0.13).translate(0, 0.078, 0.01));
    nero(new THREE.BoxGeometry(0.1, 0.026, 0.034).translate(0, 0.075, 0.118));
    for (const s of [-1, 1]) {
      nero(new THREE.TorusGeometry(0.04, 0.013, 6, 18).translate(s * 0.048, 0.138, 0.126));
      nero(new THREE.BoxGeometry(0.012, 0.012, 0.13).translate(s * 0.102, 0.142, 0.065));
    }
    nero(new THREE.BoxGeometry(0.03, 0.012, 0.012).translate(0, 0.142, 0.132));
    // i capelli: una corona dietro, dalle orecchie alla nuca, la fronte scoperta
    const capelli = new THREE.SphereGeometry(1, 16, 10, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.22, Math.PI * 0.38).scale(0.115, 0.13, 0.122).translate(0, 0.12, -0.005);
    add(capelli, this.testa);
    this.busto.add(this.testa);
    // braccia e gambe: un osso per tratto; i pantaloni larghi
    const tratto = (nome: string, r0: number, r1: number) => {
      const o = add(new THREE.CylinderGeometry(r1, r0, 1, 10, 1).translate(0, 0.5, 0));
      this.ossa[nome] = o;
    };
    for (const s of ["s", "d"]) {
      tratto(`braccio${s}`, 0.065, 0.05);
      tratto(`avambraccio${s}`, 0.05, 0.038);
      tratto(`coscia${s}`, 0.1, 0.085);
      tratto(`tibia${s}`, 0.08, 0.07);
      this.mani.push(add(new THREE.SphereGeometry(1, 10, 8).scale(0.045, 0.06, 0.03)));
      this.piedi.push(add(new THREE.BoxGeometry(0.1, 0.07, 0.27).translate(0, 0.035, 0.06)));
    }
    for (let i = 0; i < 4; i++) this.giunti.push(add(new THREE.SphereGeometry(1, 10, 8)));
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
    });
  }

  /**
   * La posa. Le mani: bersagli nelle coordinate della figura (null: a riposo lungo i fianchi).
   * passo: la fase della camminata (radianti), ampiezza 0..1; testa: rotazione e inclinazione.
   */
  posa(mani: (THREE.Vector3 | null)[], passo: number, ampiezza: number, testaGiro: number, testaSu: number) {
    // le gambe: la camminata, con le anche che oscillano
    const anche = [V(0.11, ANCA, 0), V(-0.11, ANCA, 0)];
    const sali = Math.abs(Math.sin(passo)) * 0.02 * ampiezza;
    this.busto.position.y = sali;
    [0, 1].forEach((i) => {
      const f = passo + i * Math.PI;
      const avanti = Math.sin(f) * 0.32 * ampiezza;
      const piega = Math.max(0, Math.cos(f)) * 0.5 * ampiezza;
      const anca = anche[i].clone();
      anca.y += sali;
      const ginocchio = anca.clone().add(V(0, -Math.cos(avanti) * COSCIA, Math.sin(avanti) * COSCIA));
      const tib = avanti - piega;
      const caviglia = ginocchio.clone().add(V(0, -Math.cos(tib) * TIBIA, Math.sin(tib) * TIBIA));
      const s = i === 0 ? "s" : "d";
      osso(this.ossa[`coscia${s}`], anca, ginocchio);
      osso(this.ossa[`tibia${s}`], ginocchio, caviglia);
      this.piedi[i].position.copy(caviglia).add(V(0, -0.035, 0));
      this.piedi[i].position.y = Math.max(0, this.piedi[i].position.y);
      this.giunti[2 + i].position.copy(ginocchio);
      this.giunti[2 + i].scale.setScalar(0.085);
    });
    // le braccia: cinematica inversa verso le mani, il gomito verso il basso e un po' in fuori
    [0, 1].forEach((i) => {
      const s = i === 0 ? "s" : "d";
      const spalla = SPALLE[i].clone();
      spalla.y += sali;
      const lato = i === 0 ? 1 : -1;
      const bersaglio = mani[i] ?? spalla.clone().add(V(lato * 0.06, -0.56, 0.06));
      ik(spalla, bersaglio, BRACCIO, AVAMBRACCIO, V(lato * 0.5, -1, -0.25).normalize(), this.gomito, this.punta);
      osso(this.ossa[`braccio${s}`], spalla, this.gomito);
      osso(this.ossa[`avambraccio${s}`], this.gomito, this.punta);
      const dir = this.punta.clone().sub(this.gomito).normalize();
      this.mani[i].position.copy(this.punta).addScaledVector(dir, 0.05);
      this.mani[i].quaternion.setFromUnitVectors(SU, dir);
      this.giunti[i].position.copy(this.gomito);
      this.giunti[i].scale.setScalar(0.05);
    });
    this.testa.rotation.set(-testaSu, testaGiro, 0);
  }

  /** Il cappello a tesa larga, appoggiato sulla cattedra: della stessa luce del professore. */
  cappello() {
    const g = new THREE.Group();
    const tesa = new THREE.CylinderGeometry(0.2, 0.2, 0.014, 24).translate(0, 0.007, 0);
    const cupola = new THREE.CylinderGeometry(0.105, 0.125, 0.13, 20).scale(1, 1, 0.85).translate(0, 0.075, 0);
    const nastro = new THREE.CylinderGeometry(0.128, 0.128, 0.03, 20).scale(1, 1, 0.85).translate(0, 0.03, 0);
    [tesa, cupola, nastro].forEach((x) => g.add(conMaschera(x, this.mat, this.maschera)));
    // la piega in cima alla cupola
    g.add(conMaschera(new THREE.BoxGeometry(0.02, 0.02, 0.16).translate(0, 0.14, 0), this.mat, this.maschera));
    g.traverse((o) => (o.raycast = () => undefined));
    return g;
  }

  libera() {
    this.maschera.dispose();
    this.nero.dispose();
  }
}

/* ------------------------------------------------------------------ gli studenti */

/** Uno studente seduto: il busto, la testa, le cosce sulla panca; annuisce, scrive, ogni tanto alza la mano. */
class Studente {
  gruppo = new THREE.Group();
  testa: THREE.Object3D;
  braccio: THREE.Object3D;
  private fase: number;
  private mano: number;
  constructor(mat: THREE.Material, maschera: THREE.Material, fase: number, alzaMano: number) {
    this.fase = fase;
    this.mano = alzaMano;
    const add = (g: THREE.BufferGeometry, padre: THREE.Object3D = this.gruppo) => {
      const o = conMaschera(g, mat, maschera);
      padre.add(o);
      return o;
    };
    add(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10).scale(1, 1, 0.7).translate(0, 0.72, 0));
    add(new THREE.BoxGeometry(0.3, 0.13, 0.42).translate(0, 0.46, 0.17));
    add(new THREE.BoxGeometry(0.28, 0.42, 0.12).translate(0, 0.21, 0.36));
    this.testa = new THREE.Group();
    this.testa.position.set(0, 1.0, 0);
    add(new THREE.SphereGeometry(0.1, 12, 10).scale(1, 1.15, 1.05).translate(0, 0.08, 0), this.testa);
    this.gruppo.add(this.testa);
    this.braccio = new THREE.Group();
    this.braccio.position.set(0.18, 0.9, 0.02);
    add(new THREE.CylinderGeometry(0.045, 0.04, 0.52, 8).translate(0, -0.26, 0), this.braccio);
    this.gruppo.add(this.braccio);
  }
  aggiorna(t: number, guardaLavagna: number) {
    this.testa.rotation.x = 0.12 + 0.08 * Math.sin(t * 1.3 + this.fase) * Math.max(0, Math.sin(t * 0.4 + this.fase));
    this.testa.rotation.y = 0.15 * Math.sin(t * 0.3 + this.fase * 2) * (1 - guardaLavagna);
    // la mano alzata: una domanda, quando il professore si gira verso l'aula
    const su = this.mano >= 0 ? fra(t, this.mano, this.mano + 0.6) * (1 - fra(t, this.mano + 3.2, this.mano + 3.8)) : 0;
    this.braccio.rotation.x = -0.35 - su * 2.5;
    this.braccio.rotation.z = su * 0.25;
  }
}

/* ------------------------------------------------------------------ l'aula */

/** Uno spicchio di gradinata: un settore di corona circolare alto h, da r0 a r1, fra gli angoli a0 e a1 (da −z). */
function spicchio(r0: number, r1: number, a0: number, a1: number, y0: number, h: number) {
  const s = new THREE.Shape();
  const n = 14;
  // nel piano xy della forma: x è la x dell'aula, y diventa la z dopo la rotazione (verso chi guarda, negativa)
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = [Math.sin(a) * r1, -Math.cos(a) * r1];
    if (i === 0) s.moveTo(p[0], p[1]);
    else s.lineTo(p[0], p[1]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    s.lineTo(Math.sin(a) * r0, -Math.cos(a) * r0);
  }
  return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 })
    .rotateX(Math.PI / 2)
    .translate(0, y0 + h, 0);
}

export class AulaEco {
  gruppo = new THREE.Group();
  private aula = new THREE.Group();
  private eco = new Eco();
  private studenti: Studente[] = [];
  private lavagna = new Lavagna();
  private matStudenti = materialeFigura();
  private mascheraStudenti = mascheraFigura(this.matStudenti.uniforms);
  private uni = {
    uT: { value: 0 },
    uVis: { value: 1 },
    uBase: { value: -99 },
    uTaglio: { value: 999 },
    uCima: { value: 999 },
    uColore: { value: new THREE.Color() },
    uLuce: { value: new THREE.Vector3(-0.5, 0.75, -0.45).normalize() },
  };
  private uniLinee = { uVis: this.uni.uVis, uBase: this.uni.uBase, uTaglio: this.uni.uTaglio, uColore: { value: new THREE.Color() } };
  // dove sta Eco e dove guarda, inseguiti con un poco di ritardo
  private x = 0.6;
  private z = -0.35;
  private giro = Math.PI;
  private passo = 0;
  private ultimoT = -1;
  private materiali: THREE.Material[] = [];

  constructor() {
    const a = AULA_A;
    this.gruppo.position.set(Math.sin(a) * AULA_D, PAV, -Math.cos(a) * AULA_D);
    this.gruppo.rotation.y = Math.PI - a;
    this.gruppo.scale.setScalar(SCALA);
    // inclinata attorno al centro, verso chi guarda; sollevata quanto basta perché il bordo vicino tocchi terra
    const inclinata = new THREE.Group();
    inclinata.rotation.x = -INCLINA;
    inclinata.position.y = (ESTERNO - CENTRO.z) * Math.sin(INCLINA) + 0.04;
    inclinata.add(this.aula);
    this.gruppo.add(inclinata);

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
    this.materiali.push(mat, maschera, linee);

    // il legno: il pavimento, il muro di fondo, la pedana, la tribuna coi banchi, la cattedra, la cornice della lavagna
    const legno: THREE.BufferGeometry[] = [];
    const scatola = (l: number, h: number, p: number, x: number, y: number, z: number) => legno.push(new THREE.BoxGeometry(l, h, p).translate(x, y + h / 2, z));
    legno.push(spicchio(0, ESTERNO, -Math.PI / 2, Math.PI / 2, -0.06, 0.06).translate(CENTRO.x, 0, CENTRO.z));
    scatola(ESTERNO * 2, 0.06, MURO.z - CENTRO.z, 0, -0.06, (MURO.z + CENTRO.z) / 2);
    scatola(ESTERNO * 2, MURO.h, 0.08, 0, 0, MURO.z);
    scatola(PEDANA.l, PEDANA.h, PEDANA.z1 - PEDANA.z0, 0, 0, (PEDANA.z0 + PEDANA.z1) / 2);
    // la tribuna: ogni fila un gradino più alta, il banco davanti a chi siede; le scale fra gli spicchi
    FILE.forEach((r, i) => {
      for (const [a0, a1] of SPICCHI) {
        const g = spicchio(r - 0.24, r + 0.24, a0, a1, 0, GRADINO * (i + 1));
        g.translate(CENTRO.x, 0, CENTRO.z);
        legno.push(g);
        const banco = spicchio(r - 0.23, r - 0.18, a0, a1, GRADINO * (i + 1), 0.36);
        banco.translate(CENTRO.x, 0, CENTRO.z);
        legno.push(banco);
        const piano = spicchio(r - 0.34, r - 0.16, a0, a1, GRADINO * (i + 1) + 0.36, 0.03);
        piano.translate(CENTRO.x, 0, CENTRO.z);
        legno.push(piano);
      }
    });
    // la cattedra: il piano, il pannello davanti, i fianchi; sul piano il cappello del professore
    const cattedra: THREE.BufferGeometry[] = [];
    const pezzo = (l: number, h: number, p: number, x: number, y: number, z: number) => cattedra.push(new THREE.BoxGeometry(l, h, p).translate(x, y + h / 2, z));
    pezzo(1.0, 0.04, 0.5, 0, 0.72, 0);
    pezzo(1.0, 0.6, 0.04, 0, 0.1, -0.23);
    for (const s of [-1, 1]) pezzo(0.04, 0.72, 0.48, s * 0.48, 0, 0);
    const posto = new THREE.Matrix4().makeRotationY(CATTEDRA.giro).setPosition(CATTEDRA.x, PEDANA.h, CATTEDRA.z);
    cattedra.forEach((g) => legno.push(g.applyMatrix4(posto)));
    const cappello = this.eco.cappello();
    cappello.position.set(-0.25, 0.76, 0.02).applyMatrix4(posto);
    cappello.rotation.y = CATTEDRA.giro + 0.4;
    this.aula.add(cappello);
    // la lavagna: la cornice e i due montanti fino alla pedana
    const L = LAVAGNA;
    scatola(L.l + 0.12, 0.06, 0.07, 0, L.y - 0.06, L.z);
    scatola(L.l + 0.12, 0.06, 0.07, 0, L.y + L.h, L.z);
    for (const s of [-1, 1]) scatola(0.07, L.h + 0.12 + (L.y - PEDANA.h) - 0.06, 0.07, s * (L.l / 2 + 0.05), PEDANA.h, L.z);
    // la mensola del gesso
    scatola(L.l * 0.6, 0.025, 0.1, 0, L.y - 0.08, L.z - 0.05);
    const geo = mergeGeometries(legno.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
      g.deleteAttribute("uv");
      return g;
    }));
    legno.forEach((g) => g.dispose());
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 8;
    const k = new THREE.Mesh(geo, maschera);
    k.renderOrder = 7;
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), linee);
    l.renderOrder = 9;
    this.aula.add(k, m, l);

    // la lavagna: guarda verso chi guarda (−z)
    const matLavagna = new THREE.MeshBasicMaterial({ map: this.lavagna.texture, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(L.l, L.h).rotateY(Math.PI), matLavagna);
    piano.position.set(0, L.y + L.h / 2, L.z);
    piano.renderOrder = 8;
    const mascheraPiano = new THREE.Mesh(piano.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true }));
    mascheraPiano.renderOrder = 7;
    piano.add(mascheraPiano);
    this.aula.add(piano);
    this.materiali.push(matLavagna, mascheraPiano.material as THREE.Material);

    // gli studenti, seduti sulle file, girati verso la cattedra; non tutti i posti sono presi
    const caso = generatore(38);
    const posti: [number, number][] = [];
    FILE.forEach((_, fila) =>
      SPICCHI.forEach(([a0, a1]) => {
        const n = (a1 - a0) * FILE[fila] > 2.5 ? 2 : 1;
        for (let q = 0; q < n; q++) if (caso() < 0.72) posti.push([fila, a0 + 0.08 + ((a1 - a0 - 0.16) * (q + caso())) / n]);
      })
    );
    const mani = new Map([[3, 22], [Math.floor(posti.length * 0.6), 28.5]]);
    posti.forEach(([fila, a], j) => {
      const st = new Studente(this.matStudenti, this.mascheraStudenti, j * 1.7, mani.get(j) ?? -1);
      const r = FILE[fila] + 0.02;
      st.gruppo.position.set(CENTRO.x + Math.sin(a) * r, GRADINO * (fila + 1) - 0.02, CENTRO.z - Math.cos(a) * r);
      // +z dello studente verso il centro
      st.gruppo.rotation.y = Math.atan2(CENTRO.x - st.gruppo.position.x, CENTRO.z - st.gruppo.position.z);
      st.gruppo.scale.setScalar(0.8);
      this.studenti.push(st);
      this.aula.add(st.gruppo);
    });

    this.eco.gruppo.position.y = PEDANA.h;
    this.aula.add(this.eco.gruppo);

    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
    this.setNotte(false);
    // ferma, se nessuno la aggiorna: a lezione, con la lavagna scritta
    this.posa(20, 20, true);
  }

  setNotte(notte: boolean) {
    const N = notte ? "notte" : "giorno";
    this.uni.uColore.value.copy(LEGNO[N]);
    this.uniLinee.uColore.value.copy(LEGNO[N]).lerp(new THREE.Color("#FFFFFF"), notte ? 0.35 : 0.1);
    this.eco.mat.uniforms.uColore.value.copy(ECO[N]);
    this.matStudenti.uniforms.uColore.value.copy(STUDENTI[N]);
    this.matStudenti.uniforms.uVis.value = notte ? 0.8 : 0.9;
    // di giorno l'azzurro sul cielo chiaro sbiadisce: il professore più pieno
    this.eco.mat.uniforms.uVis.value = notte ? 1.1 : 1.6;
  }

  aggiorna(t: number) {
    this.posa(t % CICLO, t, false);
  }

  /** Dove sta la punta del gesso sulla lavagna, in coordinate dell'aula. */
  private sullaLavagna(u: number, v: number, out = V()) {
    return out.set(LAVAGNA.l / 2 - u * LAVAGNA.l, LAVAGNA.y + v * LAVAGNA.h, LAVAGNA.z - 0.03);
  }

  /** Da coordinate dell'aula a quelle della figura (che sta in x, z, girata di giro, sulla pedana). */
  private inFigura(p: THREE.Vector3) {
    const dx = p.x - this.x, dz = p.z - this.z;
    const c = Math.cos(this.giro), s = Math.sin(this.giro);
    // la figura guarda verso (sin giro, cos giro): la sua +z
    return V(dx * c - dz * s, p.y - PEDANA.h, dx * s + dz * c);
  }

  /** La lezione all'istante e del ciclo. */
  private posa(e: number, t: number, subito: boolean) {
    const dt = subito || this.ultimoT < 0 ? 1 : Math.min(0.1, Math.max(0, t - this.ultimoT));
    this.ultimoT = t;
    this.uni.uT.value = t;
    this.eco.mat.uniforms.uT.value = t;
    this.matStudenti.uniforms.uT.value = t;

    // la lavagna: quanto è scritta e quanto cancellata
    let i = -1, k = 0;
    for (let j = 0; j < TRATTI.length; j++) {
      if (e >= INIZI[j]) {
        i = j;
        k = Math.min(1, (e - INIZI[j]) / TRATTI[j].dura);
      }
    }
    const cancellato = fra(e, CANCELLA[0] + 0.3, CANCELLA[1] - 0.2);
    if (e > CANCELLA[1]) i = -1;
    this.lavagna.disegna(i, k, e > CANCELLA[1] ? 0 : cancellato);

    // dove vuole stare Eco e cosa fanno le mani
    let tx = 0.6, tz = -0.25, tGiro = Math.PI, testaGiro = 0, testaSu = 0;
    let destra: THREE.Vector3 | null = null;
    let sinistra: THREE.Vector3 | null = null;
    let destraInFigura = false;
    const gesso = V();
    const punto: [number, number] = [0, 0];
    if (e >= INIZIO_SCRIVE - 2.6 && e < FINE_SCRIVE + 0.6) {
      // alla lavagna: la mano destra col gesso; fra un tratto e l'altro va al punto da cui riparte
      const j = TRATTI.findIndex((_, n) => e < INIZI[n] + TRATTI[n].dura);
      if (j < 0) {
        puntaTratto(TRATTI[TRATTI.length - 1], 1, this.lavagna.larghezze[TRATTI.length - 1], punto);
      } else if (e < INIZI[j]) {
        const da: [number, number] = [0, 0];
        if (j > 0) puntaTratto(TRATTI[j - 1], 1, this.lavagna.larghezze[j - 1], da);
        else {
          da[0] = S[0];
          da[1] = S[1];
        }
        const a: [number, number] = [0, 0];
        puntaTratto(TRATTI[j], 0, this.lavagna.larghezze[j], a);
        const f = morbido((e - (INIZI[j] - VAI)) / VAI);
        punto[0] = THREE.MathUtils.lerp(da[0], a[0], f);
        punto[1] = THREE.MathUtils.lerp(da[1], a[1], f);
      } else {
        puntaTratto(TRATTI[j], Math.min(1, (e - INIZI[j]) / TRATTI[j].dura), this.lavagna.larghezze[j], punto);
      }
      const [u, v] = punto;
      this.sullaLavagna(u, v, gesso);
      // si mette a sinistra del gesso (vista sua: la mano destra è dalla parte di −x dell'aula... vista da chi guarda,
      // a sinistra) per non coprire tutto quello che scrive
      tx = gesso.x + 0.42;
      tz = LAVAGNA.z - 0.5;
      tGiro = -0.35;
      const vicino = e >= INIZIO_SCRIVE - 0.4;
      destra = vicino ? gesso : null;
      sinistra = null;
      testaGiro = -0.2;
      testaSu = v > 0.6 ? 0.25 : -0.15;
    } else if (e >= FINE_SCRIVE + 0.6 && e < CANCELLA[0]) {
      // la lezione: girato verso l'aula, a fianco della lavagna; indica i vertici, poi gesticola
      const q = e - (FINE_SCRIVE + 0.6);
      destraInFigura = true;
      tx = 0.15 + 0.35 * Math.sin(q * 0.25);
      tz = -0.1;
      tGiro = Math.PI + 0.25 * Math.sin(q * 0.4);
      const indica = [S, O, I];
      const n = Math.floor(q / 2.6);
      const dentro = q - n * 2.6;
      if (n < 3 && dentro < 2.0) {
        // il braccio teso verso un vertice, la testa che lo segue un momento
        const p = this.sullaLavagna(indica[n][0], indica[n][1]);
        // il busto si gira a metà verso la lavagna, così il braccio teso si vede di profilo
        const verso = Math.atan2(p.x - this.x, p.z - this.z);
        const mezzo = Math.atan2(Math.sin(verso - Math.PI), Math.cos(verso - Math.PI));
        const quanto = fra(dentro, 0, 0.4) * (1 - fra(dentro, 1.6, 2.0));
        tGiro = Math.PI + mezzo * 0.5 * quanto;
        destra = this.inFigura(p);
        const spalla = SPALLE[1];
        destra.sub(spalla).normalize().multiplyScalar(0.62).add(spalla);
        // la testa segue il braccio un momento, poi torna agli studenti
        testaGiro = THREE.MathUtils.clamp(Math.atan2(destra.x - spalla.x, destra.z), -1.2, 1.2) * 0.8 * fra(dentro, 0.1, 0.5) * (1 - fra(dentro, 1.2, 1.8));
        sinistra = V(0.16, 1.05, 0.25);
      } else {
        // le mani che parlano: davanti al petto, su e giù, le dita a borsa
        const w = q * 2.2;
        destra = V(-0.2 + 0.06 * Math.sin(w * 0.7), 1.18 + 0.1 * Math.abs(Math.sin(w)), 0.32 + 0.05 * Math.sin(w * 0.5));
        sinistra = V(0.22 + 0.05 * Math.sin(w * 0.6 + 1), 1.1 + 0.08 * Math.abs(Math.sin(w * 0.8 + 2)), 0.3);
        testaGiro = 0.35 * Math.sin(q * 0.5);
      }
      testaSu = 0.05 * Math.sin(q * 1.7);
    } else if (e >= CANCELLA[0] && e < CANCELLA[1]) {
      // cancella: il cancellino da sinistra a destra (di chi guarda), su e giù
      const f = fra(e, CANCELLA[0] + 0.3, CANCELLA[1] - 0.2);
      const u = f;
      const v = 0.5 + 0.32 * Math.sin(e * 9);
      this.sullaLavagna(u, v, gesso);
      tx = gesso.x + 0.42;
      tz = LAVAGNA.z - 0.5;
      tGiro = -0.3;
      destra = e > CANCELLA[0] + 0.2 ? gesso : null;
      testaSu = 0.1;
    } else {
      // alla cattedra: dietro il piano, le mani appoggiate, parla all'aula
      const c = Math.cos(CATTEDRA.giro), s = Math.sin(CATTEDRA.giro);
      tx = CATTEDRA.x + 0.45 * s;
      tz = CATTEDRA.z + 0.45 * c;
      tGiro = Math.PI + CATTEDRA.giro;
      destra = V(-0.22, 0.79, 0.4);
      sinistra = V(0.22, 0.79, 0.4);
      destraInFigura = true;
      testaGiro = 0.3 * Math.sin(e * 0.7);
    }
    // insegue il posto con un poco di ritardo, e cammina quando si sposta
    const r = 1 - Math.exp(-dt * 3.2);
    const px = this.x, pz = this.z;
    this.x += (tx - this.x) * r;
    this.z += (tz - this.z) * r;
    let dg = tGiro - this.giro;
    dg = Math.atan2(Math.sin(dg), Math.cos(dg));
    this.giro += dg * (1 - Math.exp(-dt * 4));
    const mosso = Math.hypot(this.x - px, this.z - pz);
    this.passo += mosso * 9;
    const ampiezza = Math.min(1, (mosso / Math.max(dt, 1e-3)) * 1.6);
    this.eco.gruppo.position.set(this.x, PEDANA.h, this.z);
    this.eco.gruppo.rotation.y = this.giro;
    // i bersagli dati nell'aula passano in coordinate della figura; quelli delle mani che parlano lo sono già
    const inF = (p: THREE.Vector3 | null, giaFigura: boolean) => (p === null ? null : giaFigura ? p : this.inFigura(p));
    this.eco.posa([inF(sinistra, true), inF(destra, destraInFigura)], this.passo, subito ? 0 : ampiezza, testaGiro, testaSu);

    const guarda = e > INIZIO_SCRIVE && e < FINE_SCRIVE ? 1 : 0;
    this.studenti.forEach((s) => s.aggiorna(e, guarda));
  }

  libera() {
    this.eco.libera();
    this.lavagna.libera();
    this.mascheraStudenti.dispose();
    this.materiali.forEach((m) => m.dispose());
    liberaTutto(this.gruppo);
  }
}
