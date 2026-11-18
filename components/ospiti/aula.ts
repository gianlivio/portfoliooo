import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA, PASSO } from "../zona";
import { alone, fra, generatore, liberaTutto, loft, morbido, tela } from "./comuni";

/**
 * Umberto Eco alla lavagna, ai piedi di Bologna: nel varco fra Sanires e l'Osservatorio, davanti alla città
 * delle torri. In piedi, grande quanto una persona, col vestito scuro, la camicia, la cravatta, la barba e gli
 * occhiali neri. Accanto, la lavagna sul cavalletto, girata verso di lui e verso chi guarda; alle sue spalle
 * l'aula universitaria, la tribuna di legno coi banchi.
 * Di giorno fa lezione: va alla lavagna e disegna il triangolo di Peirce (segno, oggetto, interpretante, la base
 * tratteggiata perché fra il segno e l'oggetto non c'è un legame diretto), aggiunge la semiosi illimitata, si gira,
 * indica i vertici, gesticola; poi cancella e ricomincia. Gli studenti ascoltano, scrivono, uno alza la mano.
 * Di notte l'aula è occupata: Eco e gli studenti non ci sono, c'è la festa. Ragazzi che ballano in piano e sui
 * gradoni, lo striscione sui banchi, le lucine, le luci colorate, le casse; sulla lavagna "Occupata".
 * Coordinate del gruppo: −z verso chi guarda, y in alto, l'origine dove sta Eco.
 * Con "riduci movimento" non viene aggiornato e resta fermo: Eco a lezione, la lavagna scritta.
 */

const PAV = PELO_ACQUA;
/** Dove sta: in passi (components/zona.ts) e la distanza dal centro. Il varco va da circa 9,82 a 10,4. */
export const AULA_A = ANGOLO_ZONA + (10.11 - 12) * PASSO;
export const AULA_D = 7.3;
const CICLO = 38;

/* ------------------------------------------------------------------ i colori */

const COL = {
  giacca: "#3E424C",
  bavero: "#4A4F5A",
  pantaloni: "#363940",
  camicia: "#DCE4EE",
  cravatta: "#7C2C2E",
  pelle: "#E3B596",
  barba: "#24211F",
  capelli: "#A8A39C",
  occhiali: "#0E0E0F",
  scarpe: "#1D1B1A",
  legno: "#9C6A40",
  legnoScuro: "#6E4527",
  piano: "#86572F",
  lavagna: "#2C4A3E",
};

/**
 * La luce dipinta: una sfera chiara in alto a sinistra, che scurisce verso il bordo. Con il materiale matcap
 * le figure hanno volume anche se la scena ha solo la luce del cielo; il colore dell'oggetto la moltiplica.
 */
function luceDipinta() {
  return tela(256, 256, (x) => {
    x.fillStyle = "#4A4A4E";
    x.fillRect(0, 0, 256, 256);
    const g = x.createRadialGradient(100, 86, 4, 128, 128, 130);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(0.35, "#F0EEEA");
    g.addColorStop(0.72, "#B4B1AC");
    g.addColorStop(1, "#5E5D60");
    x.fillStyle = g;
    x.beginPath();
    x.arc(128, 128, 127, 0, Math.PI * 2);
    x.fill();
  });
}

/* ------------------------------------------------------------------ la lavagna */

type Tratto =
  | { tipo: "testo"; testo: string; u: number; v: number; corpo: number; dura: number }
  | { tipo: "linea"; da: [number, number]; a: [number, number]; dura: number; tratteggio?: boolean }
  | { tipo: "freccia"; punti: [number, number][]; dura: number };

/** La lavagna sul cavalletto: misure in metri, il bordo di sotto da terra. */
const LAVAGNA = { l: 1.25, h: 0.88, y: 0.92 };
/** Il cavalletto: dove sta e quanto è girato verso Eco (verso sinistra per chi guarda). */
const CAVALLETTO = { x: 0.4, z: 0.38, giro: 0.5 };

/** I vertici del triangolo, in coordinate della lavagna (u da sinistra, v dal basso, viste da chi guarda). */
const S: [number, number] = [0.42, 0.78];
const O: [number, number] = [0.15, 0.36];
const I: [number, number] = [0.66, 0.36];
const TRATTI: Tratto[] = [
  { tipo: "testo", testo: "segno", u: 0.42, v: 0.9, corpo: 96, dura: 1.4 },
  { tipo: "linea", da: S, a: O, dura: 0.9 },
  { tipo: "testo", testo: "oggetto", u: 0.16, v: 0.21, corpo: 96, dura: 1.5 },
  { tipo: "linea", da: O, a: I, dura: 1.1, tratteggio: true },
  { tipo: "testo", testo: "interpretante", u: 0.68, v: 0.21, corpo: 96, dura: 2.1 },
  { tipo: "linea", da: I, a: S, dura: 0.9 },
  { tipo: "freccia", punti: [[0.75, 0.43], [0.83, 0.55], [0.85, 0.66]], dura: 0.8 },
  { tipo: "testo", testo: "semiosi illimitata", u: 0.8, v: 0.76, corpo: 54, dura: 1.8 },
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
    out[1] = tr.v + 0.03 * Math.sin(k * 40) * (tr.corpo / 96);
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

  private fondo() {
    const x = this.x;
    x.fillStyle = COL.lavagna;
    x.fillRect(0, 0, TL, TA);
    // l'alone del gesso vecchio, mai cancellato del tutto
    x.fillStyle = "rgba(240,238,228,0.05)";
    for (let i = 0; i < 9; i++) x.fillRect(((i * 397) % TL) - 60, ((i * 211) % TA) - 20, 260, 70);
  }

  /** Di notte: l'aula è occupata. */
  disegnaNotte() {
    if (this.ultimo === "notte") return;
    this.ultimo = "notte";
    const x = this.x;
    x.clearRect(0, 0, TL, TA);
    this.fondo();
    x.fillStyle = "rgba(246,244,236,0.95)";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `700 150px ${this.serif}`;
    x.save();
    x.translate(TL / 2, TA * 0.45);
    x.rotate(-0.06);
    x.fillText("OCCUPATA", 0, 0);
    x.restore();
    x.lineWidth = 8;
    x.strokeStyle = "rgba(246,244,236,0.9)";
    x.beginPath();
    x.moveTo(TL * 0.2, TA * 0.62);
    x.lineTo(TL * 0.8, TA * 0.58);
    x.stroke();
    this.texture.needsUpdate = true;
  }

  /** Disegna la lavagna: fin dove è arrivato il gesso (tratto i, avanzamento k), e la parte cancellata (0..1 da sinistra). */
  disegna(i: number, k: number, cancellato: number) {
    const chiave = `${i}:${Math.round(k * 40)}:${Math.round(cancellato * 40)}`;
    if (chiave === this.ultimo) return;
    this.ultimo = chiave;
    const x = this.x;
    x.clearRect(0, 0, TL, TA);
    this.fondo();
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
        x.lineWidth = 9;
        x.setLineDash(tr.tratteggio ? [26, 20] : []);
        const [ax, ay] = P(tr.da);
        const [bx, by] = P(tr.a);
        x.beginPath();
        x.moveTo(ax, ay);
        x.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
        x.stroke();
        x.setLineDash([]);
      } else {
        x.lineWidth = 7;
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
            x.lineTo(px - Math.cos(ang + s * 0.5) * 26, py - Math.sin(ang + s * 0.5) * 26);
          }
          x.stroke();
        }
      }
    }
    x.restore();
    this.texture.needsUpdate = true;
  }

  libera() {
    this.texture.dispose();
  }
}

/* ------------------------------------------------------------------ le ossa */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SU = V(0, 1, 0);

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

/** Un poligono piatto e convesso dai vertici, visibile dalle due parti. */
function faccia(...p: THREE.Vector3[]) {
  const pos: number[] = [];
  for (let i = 1; i < p.length - 1; i++) {
    pos.push(...p[0].toArray(), ...p[i].toArray(), ...p[i + 1].toArray());
    pos.push(...p[0].toArray(), ...p[i + 1].toArray(), ...p[i].toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ Eco */

const BRACCIO = 0.3;
const AVAMBRACCIO = 0.27;
const COSCIA = 0.45;
const TIBIA = 0.44;
const ANCA = 0.95;
/** Le spalle, nelle coordinate della figura: +z avanti, +x la sua sinistra. */
const SPALLE = [V(0.215, 1.47, -0.01), V(-0.215, 1.47, -0.01)];

type Tinta = (colore: string) => THREE.Material;

/**
 * Umberto Eco: alto e robusto, la pancia sotto la giacca abbottonata; la camicia chiara e la cravatta nella
 * scollatura, i revers; la testa tonda e stempiata coi capelli grigi ai lati, la barba nera fitta, i baffi,
 * gli occhiali neri dalla montatura spessa, le sopracciglia folte. Figura +z avanti, piedi a y = 0.
 */
class Eco {
  gruppo = new THREE.Group();
  private testa = new THREE.Group();
  private busto = new THREE.Group();
  private ossa: Record<string, THREE.Object3D> = {};
  private mani: THREE.Object3D[] = [];
  private piedi: THREE.Object3D[] = [];
  private gomiti: THREE.Object3D[] = [];
  private ginocchia: THREE.Object3D[] = [];
  private gomito = V();
  private punta = V();

  constructor(t: Tinta) {
    const mesh = (g: THREE.BufferGeometry, c: string, padre: THREE.Object3D) => {
      const m = new THREE.Mesh(g, t(c));
      padre.add(m);
      return m;
    };
    // il busto con la giacca: largo di spalle, la pancia avanti (giu è il davanti dopo la rotazione)
    mesh(loft([
      { z: 0.78, l: 0.205, su: 0.13, giu: 0.16 },
      { z: 0.9, l: 0.215, su: 0.135, giu: 0.2 },
      { z: 1.04, l: 0.225, su: 0.135, giu: 0.235 },
      { z: 1.2, l: 0.228, su: 0.13, giu: 0.205 },
      { z: 1.36, l: 0.235, su: 0.125, giu: 0.15 },
      { z: 1.46, l: 0.2, su: 0.1, giu: 0.1 },
      { z: 1.53, l: 0.09, su: 0.065, giu: 0.065 },
    ], { radiali: 26, passi: 5 }).rotateX(-Math.PI / 2), COL.giacca, this.busto);
    // la scollatura: la camicia, la cravatta, i revers, il colletto; i bottoni sulla pancia
    mesh(faccia(V(-0.075, 1.505, 0.1), V(0, 1.2, 0.222), V(0.075, 1.505, 0.1)), COL.camicia, this.busto);
    mesh(faccia(V(-0.017, 1.49, 0.108), V(-0.03, 1.25, 0.218), V(0, 1.215, 0.226), V(0.03, 1.25, 0.218), V(0.017, 1.49, 0.108)), COL.cravatta, this.busto);
    mesh(new THREE.SphereGeometry(0.022, 8, 6).scale(1, 0.8, 0.7).translate(0, 1.48, 0.112), COL.cravatta, this.busto);
    for (const s of [-1, 1]) {
      mesh(faccia(V(s * 0.075, 1.51, 0.104), V(s * 0.145, 1.43, 0.13), V(s * 0.012, 1.2, 0.226)), COL.bavero, this.busto);
      mesh(faccia(V(s * 0.072, 1.52, 0.08), V(s * 0.02, 1.5, 0.11), V(s * 0.085, 1.47, 0.104)), COL.camicia, this.busto);
    }
    for (const y of [1.13, 0.99]) mesh(new THREE.SphereGeometry(0.012, 8, 6).translate(0, y, 0.233), "#1E1F22", this.busto);
    // le spalle tonde della giacca, il collo
    for (const s of SPALLE) mesh(new THREE.SphereGeometry(0.066, 14, 10).translate(s.x * 0.86, s.y - 0.035, s.z), COL.giacca, this.busto);
    mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.11, 14).translate(0, 1.555, -0.005), COL.pelle, this.busto);
    this.gruppo.add(this.busto);

    // la testa
    const h = this.testa;
    h.position.set(0, 1.575, 0.005);
    h.scale.setScalar(1.14);
    mesh(new THREE.SphereGeometry(1, 28, 20).scale(0.099, 0.122, 0.111).translate(0, 0.12, 0), COL.pelle, h);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.016, 0.034, 0.024).translate(s * 0.099, 0.115, -0.005), COL.pelle, h);
    // il naso, forte; gli occhi piccoli dietro le lenti; le sopracciglia folte e scure
    mesh(new THREE.SphereGeometry(1, 12, 10).scale(0.021, 0.034, 0.027).translate(0, 0.108, 0.112), COL.pelle, h);
    mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.012, 0.03, 0.012).translate(0, 0.135, 0.108), COL.pelle, h);
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.0085, 8, 6).translate(s * 0.039, 0.138, 0.104), "#1A1614", h);
      mesh(new THREE.BoxGeometry(0.046, 0.012, 0.016).rotateZ(s * -0.12).translate(s * 0.041, 0.168, 0.1), COL.barba, h);
    }
    // la barba: guance, mascella e mento, sotto gli zigomi; i baffi sotto il naso
    mesh(new THREE.SphereGeometry(1, 26, 14, 0, Math.PI, Math.PI * 0.58, Math.PI * 0.42).scale(0.106, 0.118, 0.119).translate(0, 0.112, 0.004), COL.barba, h);
    mesh(new THREE.SphereGeometry(1, 14, 10).scale(0.052, 0.042, 0.04).translate(0, 0.034, 0.076), COL.barba, h);
    // le basette, che salgono fino alle orecchie
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.018, 0.05, 0.04).translate(s * 0.093, 0.095, 0.035), COL.barba, h);
    mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 16, Math.PI).scale(1.25, 0.75, 1).translate(0, 0.066, 0.115), COL.barba, h);
    // i capelli grigi: una corona dietro, dalle tempie alla nuca; la fronte e la cima scoperte
    mesh(new THREE.SphereGeometry(1, 22, 12, Math.PI * 0.82, Math.PI * 1.36, Math.PI * 0.24, Math.PI * 0.38).scale(0.105, 0.127, 0.117).translate(0, 0.12, -0.004), COL.capelli, h);
    // gli occhiali: montatura nera spessa, due lenti un poco squadrate, il ponte, le aste fino alle orecchie
    for (const s of [-1, 1]) {
      mesh(new THREE.TorusGeometry(0.026, 0.0058, 8, 24).scale(1.3, 0.8, 1).translate(s * 0.042, 0.139, 0.116), COL.occhiali, h);
      mesh(new THREE.BoxGeometry(0.007, 0.008, 0.115).translate(s * 0.097, 0.142, 0.062), COL.occhiali, h);
    }
    mesh(new THREE.BoxGeometry(0.022, 0.006, 0.007).translate(0, 0.143, 0.121), COL.occhiali, h);
    this.busto.add(h);

    // braccia (maniche della giacca) e gambe (pantaloni): un osso per tratto
    const tratto = (nome: string, r0: number, r1: number, c: string) => {
      this.ossa[nome] = mesh(new THREE.CylinderGeometry(r1, r0, 1, 14, 1).translate(0, 0.5, 0), c, this.gruppo);
    };
    for (const s of ["s", "d"]) {
      tratto(`braccio${s}`, 0.064, 0.054, COL.giacca);
      tratto(`avambraccio${s}`, 0.054, 0.047, COL.giacca);
      tratto(`coscia${s}`, 0.092, 0.078, COL.pantaloni);
      tratto(`tibia${s}`, 0.074, 0.066, COL.pantaloni);
      this.gomiti.push(mesh(new THREE.SphereGeometry(0.055, 12, 8), COL.giacca, this.gruppo));
      this.ginocchia.push(mesh(new THREE.SphereGeometry(0.08, 12, 8), COL.pantaloni, this.gruppo));
      // la mano: il polsino della camicia, il palmo, il pollice
      const mano = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 12).translate(0, 0.0, 0), COL.camicia, mano);
      mesh(new THREE.SphereGeometry(1, 12, 10).scale(0.038, 0.06, 0.022).translate(0, 0.07, 0), COL.pelle, mano);
      mesh(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6).rotateZ(0.5).translate(s === "s" ? 0.03 : -0.03, 0.05, 0.012), COL.pelle, mano);
      this.gruppo.add(mano);
      this.mani.push(mano);
      // la scarpa, tonda in punta
      const piede = mesh(new THREE.CapsuleGeometry(0.052, 0.17, 4, 10).rotateX(Math.PI / 2).scale(1, 0.62, 1).translate(0, 0.033, 0.06), COL.scarpe, this.gruppo);
      this.piedi.push(piede);
    }
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
    });
  }

  /**
   * La posa. Le mani: bersagli nelle coordinate della figura (null: a riposo lungo i fianchi).
   * passo: la fase della camminata (radianti), ampiezza 0..1; testa: rotazione e inclinazione.
   */
  posa(mani: (THREE.Vector3 | null)[], passo: number, ampiezza: number, testaGiro: number, testaSu: number) {
    const anche = [V(0.105, ANCA, 0), V(-0.105, ANCA, 0)];
    const sali = Math.abs(Math.sin(passo)) * 0.02 * ampiezza;
    this.busto.position.y = sali;
    // il busto ondeggia appena col passo
    this.busto.rotation.z = Math.sin(passo) * 0.025 * ampiezza;
    [0, 1].forEach((i) => {
      const f = passo + i * Math.PI;
      const avanti = Math.sin(f) * 0.3 * ampiezza;
      const piega = Math.max(0, Math.cos(f)) * 0.45 * ampiezza;
      const anca = anche[i].clone();
      anca.y += sali;
      const ginocchio = anca.clone().add(V(0, -Math.cos(avanti) * COSCIA, Math.sin(avanti) * COSCIA));
      const tib = avanti - piega;
      const caviglia = ginocchio.clone().add(V(0, -Math.cos(tib) * TIBIA, Math.sin(tib) * TIBIA));
      const s = i === 0 ? "s" : "d";
      osso(this.ossa[`coscia${s}`], anca, ginocchio);
      osso(this.ossa[`tibia${s}`], ginocchio, caviglia);
      this.piedi[i].position.copy(caviglia).add(V(0, -0.06, 0));
      this.piedi[i].position.y = Math.max(0, this.piedi[i].position.y);
      this.piedi[i].rotation.y = i === 0 ? 0.12 : -0.12;
      this.ginocchia[i].position.copy(ginocchio);
    });
    // le braccia: cinematica inversa verso le mani, il gomito verso il basso e un po' in fuori
    [0, 1].forEach((i) => {
      const s = i === 0 ? "s" : "d";
      const spalla = SPALLE[i].clone();
      spalla.y += sali;
      const lato = i === 0 ? 1 : -1;
      const bersaglio = mani[i] ?? spalla.clone().add(V(lato * 0.07, -0.55, 0.05));
      ik(spalla, bersaglio, BRACCIO, AVAMBRACCIO, V(lato * 0.5, -1, -0.3).normalize(), this.gomito, this.punta);
      osso(this.ossa[`braccio${s}`], spalla, this.gomito);
      osso(this.ossa[`avambraccio${s}`], this.gomito, this.punta);
      const dir = this.punta.clone().sub(this.gomito).normalize();
      this.mani[i].position.copy(this.punta);
      this.mani[i].quaternion.setFromUnitVectors(SU, dir);
      this.gomiti[i].position.copy(this.gomito);
    });
    this.testa.rotation.set(-testaSu, testaGiro, 0);
  }
}

/* ------------------------------------------------------------------ gli studenti */

const MAGLIE = ["#6F8FB0", "#B85C4A", "#D9C9A3", "#4F6B4A", "#2F3540", "#C8A04A", "#8C5A7A", "#E3E0D8", "#5B7F95"];
const CHIOME = ["#2A201A", "#4A3424", "#8A6A3A", "#1A1716", "#6A4A2E", "#B08A50"];

/** Uno studente seduto al banco: il busto, la testa, le braccia sul piano; annuisce, scrive, alza la mano. */
class Studente {
  gruppo = new THREE.Group();
  private testa = new THREE.Group();
  private braccioS: THREE.Object3D;
  private avambraccioS: THREE.Object3D;
  private braccioD: THREE.Object3D;
  private avambraccioD: THREE.Object3D;
  private fase: number;
  private mano: number;
  private scrive: boolean;

  constructor(t: Tinta, caso: () => number, fase: number, alzaMano: number) {
    this.fase = fase;
    this.mano = alzaMano;
    this.scrive = caso() < 0.5;
    const maglia = MAGLIE[Math.floor(caso() * MAGLIE.length)];
    const chioma = CHIOME[Math.floor(caso() * CHIOME.length)];
    const mesh = (g: THREE.BufferGeometry, c: string, padre: THREE.Object3D = this.gruppo) => {
      const m = new THREE.Mesh(g, t(c));
      padre.add(m);
      return m;
    };
    mesh(new THREE.CapsuleGeometry(0.155, 0.28, 4, 12).scale(1, 1, 0.72).translate(0, 0.74, 0), maglia);
    mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10).translate(0, 1.0, 0), COL.pelle);
    this.testa.position.set(0, 1.04, 0);
    mesh(new THREE.SphereGeometry(1, 16, 12).scale(0.088, 0.106, 0.096).translate(0, 0.09, 0), COL.pelle, this.testa);
    const lunghi = caso() < 0.45;
    mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * (lunghi ? 0.72 : 0.5)).scale(0.094, 0.112, 0.102).translate(0, 0.095, -0.006), chioma, this.testa);
    if (lunghi) mesh(new THREE.CapsuleGeometry(0.06, 0.12, 3, 8).scale(1.4, 1, 0.7).translate(0, 0.0, -0.06), chioma, this.testa);
    this.gruppo.add(this.testa);
    const pezzo = (r: number, c: string) => mesh(new THREE.CylinderGeometry(r * 0.9, r, 1, 8).translate(0, 0.5, 0), c);
    this.braccioS = pezzo(0.045, maglia);
    this.avambraccioS = pezzo(0.04, maglia);
    this.braccioD = pezzo(0.045, maglia);
    this.avambraccioD = pezzo(0.04, maglia);
  }

  aggiorna(t: number, lezione: boolean) {
    const f = this.fase;
    this.testa.rotation.x = 0.1 + 0.07 * Math.sin(t * 1.3 + f) * Math.max(0, Math.sin(t * 0.4 + f));
    this.testa.rotation.y = 0.18 * Math.sin(t * 0.3 + f * 2);
    // le braccia sul banco; chi scrive muove la mano destra; la mano alzata, quando il professore guarda l'aula
    const su = lezione && this.mano >= 0 ? fra(t, this.mano, this.mano + 0.6) * (1 - fra(t, this.mano + 3.2, this.mano + 3.8)) : 0;
    const scrivi = this.scrive ? 0.03 * Math.sin(t * 7 + f) : 0;
    const spS = V(0.16, 0.93, 0.0), spD = V(-0.16, 0.93, 0.0);
    osso(this.braccioS, spS, V(0.17, 0.76, 0.28));
    osso(this.avambraccioS, V(0.17, 0.76, 0.28), V(0.06, 0.79, 0.56));
    const gomD = V(-0.17, 0.76, 0.28).lerp(V(-0.2, 1.18, 0.05), su);
    const manoD = V(-0.08 + scrivi, 0.79, 0.56).lerp(V(-0.2, 1.45, 0.08), su);
    osso(this.braccioD, spD, gomD);
    osso(this.avambraccioD, gomD, manoD);
  }
}

/* ------------------------------------------------------------------ l'aula */

/** Il centro della tribuna, davanti a Eco: le file ci girano attorno. */
const CENTRO = V(0, 0, -0.4);
const FILE = [2.8, 3.62, 4.44, 5.26, 6.08];
const GRADINO = 0.3;
/** Fin dove arriva la tribuna ai lati, in radianti da +z: oltre la coprono i pannelli. */
const LARGA = 0.5;

/** Un settore di corona circolare alto h, da r0 a r1, fra gli angoli a0 e a1 (da +z, attorno a CENTRO). */
function settore(r0: number, r1: number, a0: number, a1: number, y0: number, h: number) {
  const s = new THREE.Shape();
  const n = 16;
  // nel piano xy della forma: x è la x del gruppo, y diventa −z dopo la rotazione
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
    .rotateX(-Math.PI / 2)
    .translate(CENTRO.x, y0, CENTRO.z);
}

/** Le tavole del parquet, ripetute. */
function parquet() {
  const t = tela(256, 256, (x) => {
    for (let i = 0; i < 8; i++) {
      const l = 52 + ((i * 37) % 11);
      x.fillStyle = `rgb(${130 + l},${88 + l * 0.6},${54 + l * 0.3})`;
      x.fillRect(0, i * 32, 256, 32);
      x.fillStyle = "rgba(40,24,12,0.35)";
      x.fillRect(0, i * 32, 256, 2);
      x.fillRect(((i * 97) % 256), i * 32, 2, 32);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** Lo striscione dell'occupazione: un lenzuolo con le lettere a spruzzo. */
function striscione() {
  return tela(1024, 256, (x) => {
    x.fillStyle = "#EEE8DA";
    x.fillRect(0, 0, 1024, 256);
    x.fillStyle = "#B0231C";
    x.font = "900 150px Impact, 'Arial Black', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("AULA OCCUPATA", 512, 136);
    x.fillStyle = "rgba(176,35,28,0.5)";
    for (let i = 0; i < 26; i++) x.fillRect(80 + ((i * 331) % 860), 40 + ((i * 97) % 190), 4, 6 + (i % 4) * 5);
  });
}

type Ballerino = { x: number; y: number; z: number; giro: number; fase: number; su: boolean; alto: number };

export class AulaEco {
  gruppo = new THREE.Group();
  private giorno = new THREE.Group();
  private notte = new THREE.Group();
  private luce = luceDipinta();
  private materiali = new Map<string, THREE.MeshMatcapMaterial>();
  private eco: Eco;
  private studenti: Studente[] = [];
  private lavagna = new Lavagna();
  private cavalletto = new THREE.Matrix4();
  private texture: THREE.Texture[] = [];
  private pavimento: THREE.MeshStandardMaterial;
  // la festa
  private gente: Ballerino[] = [];
  private corpi: THREE.InstancedMesh;
  private teste: THREE.InstancedMesh;
  private braccia: THREE.InstancedMesh;
  private bagliori: THREE.Sprite[] = [];
  private lucine: THREE.PointsMaterial;
  private eNotte = false;
  // dove sta Eco e dove guarda, inseguiti con un poco di ritardo
  private x = -0.42;
  private z = 0;
  private giro = Math.PI;
  private passo = 0;
  private ultimoT = -1;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private e = new THREE.Euler();

  /** Il materiale di un colore: uno solo per colore, con la luce dipinta. */
  private tinta: Tinta = (c) => {
    let m = this.materiali.get(c);
    if (!m) {
      m = new THREE.MeshMatcapMaterial({ matcap: this.luce, color: c });
      m.userData.base = new THREE.Color(c);
      this.materiali.set(c, m);
    }
    return m;
  };

  constructor() {
    const a = AULA_A;
    this.gruppo.position.set(Math.sin(a) * AULA_D, PAV, -Math.cos(a) * AULA_D);
    this.gruppo.rotation.y = Math.PI - a;
    this.gruppo.add(this.giorno, this.notte);
    this.texture.push(this.luce);

    // il pavimento di legno dell'aula, appena rialzato sul marmo
    const tp = parquet();
    this.texture.push(tp);
    this.pavimento = new THREE.MeshStandardMaterial({ map: tp, roughness: 0.75 });
    const fondo = CENTRO.z + FILE[FILE.length - 1] + 0.7;
    const pav = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.03, fondo + 1.3).translate(0, 0.015, (fondo - 1.3) / 2), this.pavimento);
    this.gruppo.add(pav);

    // la tribuna: ogni fila un gradone più alta; sul gradone la panca, davanti il banco col pannello di legno
    const pezzi = new Map<string, THREE.BufferGeometry[]>();
    const metti = (c: string, g: THREE.BufferGeometry) => {
      const geo = g.index ? g.toNonIndexed() : g;
      geo.deleteAttribute("uv");
      if (!pezzi.has(c)) pezzi.set(c, []);
      pezzi.get(c)!.push(geo);
    };
    FILE.forEach((r, i) => {
      const h = GRADINO * (i + 1);
      metti(COL.legno, settore(r - 0.41, r + 0.41, -LARGA, LARGA, 0, h));
      metti(COL.legnoScuro, settore(r - 0.39, r - 0.35, -LARGA, LARGA, h, 0.74));
      metti(COL.piano, settore(r - 0.56, r - 0.33, -LARGA, LARGA, h + 0.72, 0.035));
      metti(COL.legnoScuro, settore(r + 0.06, r + 0.34, -LARGA, LARGA, h, 0.44));
      metti(COL.legno, settore(r + 0.3, r + 0.36, -LARGA, LARGA, h + 0.44, 0.4));
    });
    // il cavalletto: due gambe davanti, una dietro, la mensola del gesso, la cornice della lavagna
    const L = LAVAGNA;
    const cav: THREE.BufferGeometry[] = [];
    const asta = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
      const g = new THREE.CylinderGeometry(r, r, 1, 8).translate(0, 0.5, 0);
      const o = new THREE.Object3D();
      osso(o, a, b);
      o.updateMatrix();
      cav.push(g.applyMatrix4(o.matrix));
    };
    for (const s of [-1, 1]) asta(V(s * 0.55, 0, -0.12), V(s * 0.45, L.y + L.h + 0.18, 0.04), 0.022);
    asta(V(0, 0, 0.62), V(0, L.y + L.h + 0.12, 0.06), 0.02);
    cav.push(new THREE.BoxGeometry(L.l + 0.12, 0.04, 0.09).translate(0, L.y - 0.04, -0.02));
    cav.push(new THREE.BoxGeometry(L.l + 0.1, 0.045, 0.04).translate(0, L.y + L.h + 0.02, 0.01));
    for (const s of [-1, 1]) cav.push(new THREE.BoxGeometry(0.045, L.h + 0.08, 0.04).translate(s * (L.l / 2 + 0.02), L.y + L.h / 2, 0.01));
    this.cavalletto.compose(V(CAVALLETTO.x, 0, CAVALLETTO.z), new THREE.Quaternion().setFromAxisAngle(SU, CAVALLETTO.giro), V(1, 1, 1));
    cav.forEach((g) => metti(COL.legno, g.applyMatrix4(this.cavalletto)));
    pezzi.forEach((lista, c) => {
      const geo = mergeGeometries(lista);
      lista.forEach((g) => g.dispose());
      geo.computeVertexNormals();
      this.gruppo.add(new THREE.Mesh(geo, this.tinta(c)));
    });
    // la lavagna, sul cavalletto: guarda verso chi guarda e verso Eco
    const lav = new THREE.Mesh(new THREE.PlaneGeometry(L.l, L.h).rotateY(Math.PI), new THREE.MeshBasicMaterial({ map: this.lavagna.texture, toneMapped: false }));
    lav.position.set(0, L.y + L.h / 2, -0.012);
    lav.applyMatrix4(this.cavalletto);
    this.gruppo.add(lav);

    // Eco
    this.eco = new Eco(this.tinta);
    this.giorno.add(this.eco.gruppo);

    // gli studenti, seduti sulle file, girati verso la lavagna; non tutti i posti sono presi
    const caso = generatore(1088);
    let j = 0;
    FILE.forEach((r, fila) => {
      const n = Math.round((LARGA * 2 * r) / 0.62);
      for (let k = 0; k < n; k++) {
        if (caso() > 0.62) continue;
        const ang = -LARGA + 0.06 + ((LARGA * 2 - 0.12) * (k + 0.5)) / n + (caso() - 0.5) * 0.04;
        const mano = j === 4 ? 21.5 : j === 11 ? 27.5 : -1;
        const st = new Studente(this.tinta, caso, j * 1.7, mano);
        const rr = r + 0.18;
        st.gruppo.position.set(CENTRO.x + Math.sin(ang) * rr, GRADINO * (fila + 1), CENTRO.z + Math.cos(ang) * rr);
        // +z dello studente verso la lavagna, fra Eco e il cavalletto
        st.gruppo.rotation.y = Math.atan2(0 - st.gruppo.position.x, 0.2 - st.gruppo.position.z);
        this.studenti.push(st);
        this.giorno.add(st.gruppo);
        j++;
      }
    });

    // la notte: la festa dell'occupazione
    const N = this.notte;
    const ts = striscione();
    this.texture.push(ts);
    const r0 = FILE[0] - 0.42;
    const str = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.56, 8, 1), new THREE.MeshBasicMaterial({ map: ts, color: "#9C9890", side: THREE.DoubleSide }));
    // un poco curvo, appeso al pannello del primo banco
    const sp = str.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, (sp.getX(i) * sp.getX(i)) / (2 * r0) - 0.02 + 0.015 * Math.sin(sp.getX(i) * 9));
    str.position.set(CENTRO.x, GRADINO + 0.42, CENTRO.z + r0);
    str.rotation.y = Math.PI;
    N.add(str);
    // le casse, ai lati del pavimento
    for (const s of [-1, 1]) {
      const cassa = new THREE.Group();
      cassa.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.38).translate(0, 0.375, 0), new THREE.MeshBasicMaterial({ color: "#121214" })));
      for (const [y, r] of [[0.52, 0.11], [0.22, 0.14]]) {
        const cono = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshBasicMaterial({ color: "#2A2A30" }));
        cono.position.set(0, y, -0.192);
        cono.rotation.y = Math.PI;
        cassa.add(cono);
      }
      cassa.position.set(s * 1.55, 0.03, 1.4);
      cassa.rotation.y = s * 0.35;
      N.add(cassa);
    }
    // i ragazzi che ballano: in piano fra la lavagna e la tribuna, e in piedi sui gradoni
    const cr = generatore(4242);
    for (let i = 0; i < 16; i++) {
      this.gente.push({ x: (cr() - 0.5) * 2.8, y: 0.03, z: 0.75 + cr() * 1.2, giro: Math.PI + (cr() - 0.5) * 1.6, fase: cr() * 6, su: cr() < 0.5, alto: 0.88 + cr() * 0.16 });
    }
    FILE.forEach((r, fila) => {
      for (let k = 0; k < 4; k++) {
        const ang = (cr() - 0.5) * LARGA * 1.8;
        const rr = r + 0.2;
        this.gente.push({ x: CENTRO.x + Math.sin(ang) * rr, y: GRADINO * (fila + 1), z: CENTRO.z + Math.cos(ang) * rr, giro: Math.PI + ang + (cr() - 0.5) * 0.8, fase: cr() * 6, su: cr() < 0.45, alto: 0.88 + cr() * 0.16 });
      }
    });
    const n = this.gente.length;
    const bianco = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
    this.corpi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.72, 2, 8).translate(0, 0.6, 0), bianco, n);
    this.teste = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), bianco, n);
    this.braccia = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.52, 2, 6).translate(0, 0.28, 0), bianco, n * 2);
    // vestiti in penombra, tinti dalle luci colorate
    const toni = ["#5A3A6A", "#2E4A6A", "#6A2E3E", "#3A5A4A", "#4A4458", "#6A5A3A", "#30303A"];
    this.gente.forEach((_, i) => {
      const c = new THREE.Color(toni[i % toni.length]);
      this.corpi.setColorAt(i, c);
      this.teste.setColorAt(i, c.clone().multiplyScalar(0.8));
      this.braccia.setColorAt(i * 2, c);
      this.braccia.setColorAt(i * 2 + 1, c);
    });
    N.add(this.corpi, this.teste, this.braccia);
    // le luci colorate che girano sopra la festa
    const ta = alone("#FFFFFF");
    this.texture.push(ta);
    ["#FF3AD9", "#3AE0FF", "#FFB23A", "#7A5CFF"].forEach((col) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ta, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.scale.set(3.2, 2.4, 1);
      N.add(s);
      this.bagliori.push(s);
    });
    // le lucine appese lungo i banchi
    const punti: number[] = [];
    FILE.forEach((r, fila) => {
      for (let a = -LARGA; a <= LARGA; a += 0.035) {
        const rr = r - 0.4;
        const pende = 0.05 * Math.abs(Math.sin(a * 22));
        punti.push(CENTRO.x + Math.sin(a) * rr, GRADINO * (fila + 1) + 0.7 - pende, CENTRO.z + Math.cos(a) * rr - 0.02);
      }
    });
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.Float32BufferAttribute(punti, 3));
    this.lucine = new THREE.PointsMaterial({ color: "#FFD27A", size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    N.add(new THREE.Points(gp, this.lucine));

    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
    this.setNotte(false);
    // fermo, se nessuno lo aggiorna: a lezione, con la lavagna scritta
    this.posa(20, 20, true);
  }

  setNotte(notte: boolean) {
    this.eNotte = notte;
    this.giorno.visible = !notte;
    this.notte.visible = notte;
    // di notte il legno è in penombra: la luce dipinta del giorno si spegne
    this.materiali.forEach((m) => m.color.copy(m.userData.base as THREE.Color).multiplyScalar(notte ? 0.3 : 1));
    this.pavimento.color.set(notte ? "#4A3A44" : "#FFFFFF");
    if (notte) {
      this.lavagna.disegnaNotte();
      this.festa(0);
    } else this.posa(20, 20, true);
  }

  aggiorna(t: number) {
    if (this.eNotte) this.festa(t);
    else this.posa(t % CICLO, t, false);
  }

  /** La festa: tutti saltano a tempo, chi ha le braccia su le agita; le luci girano, le lucine tremano. */
  private festa(t: number) {
    const battito = (t * 124) / 60;
    this.gente.forEach((p, i) => {
      const salto = Math.max(0, Math.sin((battito + p.fase * 0.1) * Math.PI * 2)) * 0.1;
      const y = p.y + salto;
      const giro = p.giro + 0.25 * Math.sin(t * 0.7 + p.fase);
      this.q.setFromAxisAngle(SU, giro);
      this.m.compose(this.v.set(p.x, y, p.z), this.q, this.s.setScalar(p.alto));
      this.corpi.setMatrixAt(i, this.m);
      this.m.compose(this.v.set(p.x, y + 1.2 * p.alto, p.z), this.q, this.s.setScalar(p.alto));
      this.teste.setMatrixAt(i, this.m);
      [-1, 1].forEach((lato, k) => {
        const alzo = p.su ? Math.PI - 0.35 + 0.3 * Math.sin(battito * Math.PI * 2 + p.fase + k) : 0.3 + 0.2 * Math.sin(battito * Math.PI + p.fase);
        this.e.set(0, giro, lato * alzo, "YXZ");
        this.q.setFromEuler(this.e);
        const spalla = this.v.set(lato * 0.2, 1.0 * p.alto, 0).applyAxisAngle(SU, giro).add(new THREE.Vector3(p.x, y, p.z));
        this.m.compose(spalla, this.q, this.s.setScalar(p.alto));
        this.braccia.setMatrixAt(i * 2 + k, this.m);
      });
    });
    for (const im of [this.corpi, this.teste, this.braccia]) im.instanceMatrix.needsUpdate = true;
    this.bagliori.forEach((b, k) => {
      const f = t * (0.35 + k * 0.07) + k * 1.6;
      b.position.set(Math.sin(f) * 1.6, 2.2 + 0.4 * Math.sin(f * 1.3), 1.6 + Math.cos(f * 0.8) * 1.4);
      b.material.opacity = 0.32 + 0.22 * Math.max(0, Math.sin(battito * Math.PI * 2 + k));
    });
    this.lucine.opacity = 0.7 + 0.3 * Math.sin(t * 3.1);
  }

  /** Dove sta la punta del gesso sulla lavagna, nelle coordinate del gruppo. */
  private sullaLavagna(u: number, v: number, out = V()) {
    return out.set(LAVAGNA.l / 2 - u * LAVAGNA.l, LAVAGNA.y + v * LAVAGNA.h, -0.03).applyMatrix4(this.cavalletto);
  }

  /** Da coordinate del gruppo a quelle della figura (che sta in x, z, girata di giro). */
  private inFigura(p: THREE.Vector3) {
    const dx = p.x - this.x, dz = p.z - this.z;
    const c = Math.cos(this.giro), s = Math.sin(this.giro);
    return V(dx * c - dz * s, p.y, dx * s + dz * c);
  }

  /** La lezione all'istante e del ciclo. */
  private posa(e: number, t: number, subito: boolean) {
    const dt = subito || this.ultimoT < 0 ? 1 : Math.min(0.1, Math.max(0, t - this.ultimoT));
    this.ultimoT = t;

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

    // la lavagna guarda verso n; Eco, per scriverci, le sta davanti e un poco alla sua sinistra
    const n = V(-Math.sin(CAVALLETTO.giro), 0, -Math.cos(CAVALLETTO.giro));
    const verso = Math.atan2(-n.x, -n.z);
    const destraLavagna = V(n.z, 0, -n.x); // la destra di chi guarda la lavagna
    const allaLavagna = (gesso: THREE.Vector3) => {
      const p = gesso.clone().addScaledVector(n, 0.5).addScaledVector(destraLavagna, -0.3);
      return [p.x, p.z] as const;
    };

    let tx = -0.42, tz = 0, tGiro = Math.PI, testaGiro = 0, testaSu = 0;
    let destra: THREE.Vector3 | null = null;
    let sinistra: THREE.Vector3 | null = null;
    let destraInFigura = false;
    const gesso = V();
    const punto: [number, number] = [0, 0];
    if (e >= INIZIO_SCRIVE - 2.6 && e < FINE_SCRIVE + 0.6) {
      // alla lavagna: la mano destra col gesso; fra un tratto e l'altro va al punto da cui riparte
      const j = TRATTI.findIndex((_, m) => e < INIZI[m] + TRATTI[m].dura);
      if (j < 0) {
        puntaTratto(TRATTI[TRATTI.length - 1], 1, this.lavagna.larghezze[TRATTI.length - 1], punto);
      } else if (e < INIZI[j]) {
        const da: [number, number] = [S[0], S[1]];
        if (j > 0) puntaTratto(TRATTI[j - 1], 1, this.lavagna.larghezze[j - 1], da);
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
      [tx, tz] = allaLavagna(gesso);
      tGiro = verso - 0.3;
      destra = e >= INIZIO_SCRIVE - 0.4 ? gesso : null;
      testaGiro = -0.2;
      testaSu = v > 0.6 ? 0.2 : -0.2;
    } else if (e >= FINE_SCRIVE + 0.6 && e < CANCELLA[0]) {
      // la lezione: girato verso chi guarda, accanto alla lavagna; indica i vertici, poi gesticola
      const q = e - (FINE_SCRIVE + 0.6);
      destraInFigura = true;
      tx = -0.42 + 0.18 * Math.sin(q * 0.25);
      tz = 0.02;
      tGiro = Math.PI + 0.2 * Math.sin(q * 0.4);
      const indica = [S, O, I];
      const m = Math.floor(q / 2.6);
      const dentro = q - m * 2.6;
      if (m < 3 && dentro < 2.0) {
        // il braccio teso verso un vertice; il busto si gira a metà verso la lavagna, la testa la segue un momento
        const p = this.sullaLavagna(indica[m][0], indica[m][1]);
        const dir = Math.atan2(p.x - this.x, p.z - this.z);
        const mezzo = Math.atan2(Math.sin(dir - Math.PI), Math.cos(dir - Math.PI));
        const quanto = fra(dentro, 0, 0.4) * (1 - fra(dentro, 1.6, 2.0));
        tGiro = Math.PI + mezzo * 0.55 * quanto;
        destra = this.inFigura(p);
        const spalla = SPALLE[1];
        destra.sub(spalla).normalize().multiplyScalar(0.6).add(spalla);
        testaGiro = THREE.MathUtils.clamp(Math.atan2(destra.x - spalla.x, destra.z), -1.2, 1.2) * 0.7 * fra(dentro, 0.1, 0.5) * (1 - fra(dentro, 1.2, 1.8));
        sinistra = V(0.15, 1.02, 0.24);
      } else {
        // le mani che parlano: davanti al petto, su e giù, le dita a borsa
        const w = q * 2.2;
        destra = V(-0.2 + 0.06 * Math.sin(w * 0.7), 1.2 + 0.1 * Math.abs(Math.sin(w)), 0.34 + 0.05 * Math.sin(w * 0.5));
        sinistra = V(0.22 + 0.05 * Math.sin(w * 0.6 + 1), 1.12 + 0.08 * Math.abs(Math.sin(w * 0.8 + 2)), 0.32);
        testaGiro = 0.35 * Math.sin(q * 0.5);
      }
      testaSu = 0.05 * Math.sin(q * 1.7);
    } else if (e >= CANCELLA[0] && e < CANCELLA[1]) {
      // cancella: il cancellino da sinistra a destra (di chi guarda), su e giù
      const f = fra(e, CANCELLA[0] + 0.3, CANCELLA[1] - 0.2);
      this.sullaLavagna(f, 0.5 + 0.32 * Math.sin(e * 9), gesso);
      [tx, tz] = allaLavagna(gesso);
      tGiro = verso - 0.3;
      destra = e > CANCELLA[0] + 0.2 ? gesso : null;
      testaSu = 0.1;
    } else {
      // fra una lezione e l'altra: torna al suo posto, le mani giunte davanti alla pancia, guarda l'aula
      destra = V(-0.04, 1.0, 0.25);
      sinistra = V(0.04, 1.0, 0.25);
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
    this.eco.gruppo.position.set(this.x, 0.03, this.z);
    this.eco.gruppo.rotation.y = this.giro;
    const inF = (p: THREE.Vector3 | null, giaFigura: boolean) => (p === null ? null : giaFigura ? p : this.inFigura(p));
    this.eco.posa([inF(sinistra, true), inF(destra, destraInFigura)], this.passo, subito ? 0 : ampiezza, testaGiro, testaSu);

    // gli studenti: alzano la mano quando il professore è girato verso l'aula
    const lezione = e >= FINE_SCRIVE + 0.6 && e < CANCELLA[0];
    this.studenti.forEach((s) => s.aggiorna(e, lezione));
  }

  libera() {
    this.lavagna.libera();
    this.materiali.forEach((m) => m.dispose());
    liberaTutto(this.gruppo, this.texture);
  }
}
