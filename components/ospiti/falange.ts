import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { Deriva, type Ospite, assi, attesa, casuale, fra, liberaTutto, morbido, ombra, passa, primo, tocca } from "./comuni";

/**
 * Di giorno, sul marmo, dopo la tartaruga: una piccola falange oplitica.
 * Otto file per quattro righe, elmi corinzi con la cresta, scudi di bronzo con la lambda,
 * mantelli rossi, lance. Entra di lato marciando al passo, si ferma, ruota di fronte,
 * serra gli scudi, abbassa le lance (le prime righe in orizzontale, l'ultima inclinata),
 * avanza di qualche passo, rialza le lance, si volta e marcia via verso il fondo.
 */

const FILE = 8;
const RIGHE = 4;
const N = FILE * RIGHE;
const SCALA = 0.17;
const PASSO_X = 0.9;
const PASSO_Z = 1.15;

const BRONZO = new THREE.Color("#A97B3C");
const BRONZO_CHIARO = new THREE.Color("#D2A660");
const ROSSO = new THREE.Color("#8C2A20");
const ROSSO_SCURO = new THREE.Color("#5E1A15");
const PELLE = new THREE.Color("#B27A52");
const LEGNO = new THREE.Color("#6B4A2B");

/** Dà a una geometria un colore per vertice, uniforme o calcolato dalla posizione. */
function tingi(g: THREE.BufferGeometry, c: THREE.Color | ((p: THREE.Vector3) => THREE.Color)) {
  const pos = g.attributes.position;
  const col: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const k = typeof c === "function" ? c(p) : c;
    col.push(k.r, k.g, k.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function unisci(gs: THREE.BufferGeometry[]) {
  // unione semplice di geometrie non indicizzate con posizione, normale, colore
  const parti = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  const somma = (nome: string, n: number) => {
    const tot = parti.reduce((a, g) => a + g.attributes[nome].count * n, 0);
    const arr = new Float32Array(tot);
    let o = 0;
    parti.forEach((g) => {
      arr.set(g.attributes[nome].array as Float32Array, o);
      o += g.attributes[nome].count * n;
    });
    return new THREE.Float32BufferAttribute(arr, n);
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", somma("position", 3));
  g.setAttribute("normal", somma("normal", 3));
  g.setAttribute("color", somma("color", 3));
  return g;
}

/* ------------------------------------------------------------------ oplita */

/** Il corpo fermo dell'oplita (unità umane: 1 = un metro; guarda verso +z, piedi a terra). */
function corpo() {
  const chitone = tingi(new THREE.CylinderGeometry(0.2, 0.3, 0.32, 12, 1, true).translate(0, 0.86, 0), ROSSO);
  const corazza = tingi(new THREE.CylinderGeometry(0.25, 0.21, 0.56, 12).translate(0, 1.27, 0), (p) =>
    (p.y > 1.42 ? BRONZO_CHIARO : BRONZO).clone().multiplyScalar(0.9 + (p.z > 0 ? 0.15 : 0))
  );
  // mantello rosso dietro le spalle
  const mantello = tingi(
    new THREE.CylinderGeometry(0.27, 0.34, 1.0, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, 1.05, -0.02),
    (p) => (p.y < 0.65 ? ROSSO_SCURO : ROSSO)
  );
  // elmo corinzio: calotta, paranaso, guanciali, fessura a T
  const elmo = tingi(new THREE.SphereGeometry(0.15, 14, 10).scale(1, 1.18, 1.12).translate(0, 1.76, 0.01), (p) => {
    const fessura = p.z > 0.08 && ((Math.abs(p.x) < 0.025 && p.y < 1.8) || (Math.abs(p.y - 1.79) < 0.02 && Math.abs(p.x) < 0.09));
    return fessura ? new THREE.Color("#1E1610") : BRONZO_CHIARO;
  });
  const collo = tingi(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8).translate(0, 1.6, 0), PELLE);
  // cresta di crine, da davanti a dietro
  const cresta = tingi(new THREE.BoxGeometry(0.05, 0.2, 0.44, 1, 1, 6).translate(0, 2.0, -0.04), (p) =>
    (p.y > 2.05 ? ROSSO : ROSSO_SCURO).clone().multiplyScalar(0.9 + Math.abs(Math.sin(p.z * 40)) * 0.2)
  );
  // braccio destro, che regge la lancia
  const braccio = tingi(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 6).rotateZ(0.25).translate(0.3, 1.25, 0.05), PELLE);
  // scudo (aspis): calotta di bronzo, bordo chiaro, lambda rossa dipinta
  const scudo = tingi(
    new THREE.SphereGeometry(0.75, 40, 14, 0, Math.PI * 2, 0, 0.62).rotateX(Math.PI / 2).translate(0, 0, -0.62).translate(-0.1, 1.22, 0.36),
    (p) => {
      const x = p.x + 0.1, y = p.y - 1.22;
      const r = Math.hypot(x, y);
      if (r > 0.4) return BRONZO_CHIARO;
      // Λ: due aste che si incontrano in alto
      const asta = (sx: number) => Math.abs(x - sx * (0.22 - (y + 0.26) * 0.42)) < 0.05 && y > -0.26 && y < 0.28;
      if (asta(1) || asta(-1)) return ROSSO;
      return BRONZO.clone().multiplyScalar(0.95 + (0.4 - r) * 0.3);
    }
  );
  return unisci([chitone, corazza, mantello, elmo, collo, cresta, braccio, scudo]);
}

/** Gamba con lo schiniere: perno all'anca, scende lungo −y. */
function gamba() {
  return tingi(new THREE.CylinderGeometry(0.075, 0.06, 0.9, 8).translate(0, -0.45, 0), (p) =>
    p.y < -0.35 ? (p.y < -0.86 ? new THREE.Color("#3B2A1C") : BRONZO) : PELLE
  );
}

/** Lancia (dory): impugnatura nell'origine, punta verso +y, puntale in fondo. */
function lancia() {
  const asta = tingi(new THREE.CylinderGeometry(0.018, 0.02, 2.5, 5).translate(0, 0.35, 0), LEGNO);
  const punta = tingi(new THREE.ConeGeometry(0.04, 0.26, 5).translate(0, 1.73, 0), BRONZO_CHIARO);
  const puntale = tingi(new THREE.ConeGeometry(0.025, 0.14, 5).rotateX(Math.PI).translate(0, -0.97, 0), BRONZO);
  return unisci([asta, punta, puntale]);
}

/* ------------------------------------------------------------------ falange */

type Fase = "marcia" | "ferma" | "fronte" | "serra" | "abbassa" | "avanza" | "rialza" | "volta" | "via";

export class Falange implements Ospite {
  gruppo = new THREE.Group();
  private blocco = new THREE.Group();
  private corpi: THREE.InstancedMesh;
  private gambe: THREE.InstancedMesh;
  private lance: THREE.InstancedMesh;
  private ombra: THREE.Mesh;
  private materiale: THREE.MeshStandardMaterial;
  private deriva = new Deriva();
  private sfasi = Array.from({ length: N }, () => casuale(-0.04, 0.04));
  private stato = {
    prossima: primo(10, 2), inizio: -1, fase: "marcia" as Fase, tFase: 0,
    pos: new THREE.Vector3(), yaw: 0, yawDa: 0, yawA: 0,
    da: new THREE.Vector3(), centro: new THREE.Vector3(), fondo: new THREE.Vector3(),
    avanti: new THREE.Vector3(), passo: 0, serra: 0, lance: 0, vis: 1,
  };
  private tmp = {
    m: new THREE.Matrix4(), b: new THREE.Matrix4(), r: new THREE.Matrix4(), q: new THREE.Quaternion(),
    v: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1),
    anca: new THREE.Matrix4(), eulero: new THREE.Euler(), mano: new THREE.Vector3(),
  };

  constructor() {
    this.materiale = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25, transparent: true });
    this.corpi = new THREE.InstancedMesh(corpo(), this.materiale, N);
    this.gambe = new THREE.InstancedMesh(gamba(), this.materiale, N * 2);
    this.lance = new THREE.InstancedMesh(lancia(), this.materiale, N);
    [this.corpi, this.gambe, this.lance].forEach((m) => {
      m.frustumCulled = false;
      this.blocco.add(m);
    });
    this.blocco.scale.setScalar(SCALA);
    this.gruppo.add(this.blocco);
    const tx = ombra();
    this.ombra = new THREE.Mesh(
      new THREE.PlaneGeometry(FILE * PASSO_X * SCALA * 1.25, RIGHE * PASSO_Z * SCALA * 1.4),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0.5 })
    );
    this.ombra.rotation.x = -Math.PI / 2;
    this.gruppo.add(this.ombra);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  private vai(fase: Fase, t: number) {
    this.stato.fase = fase;
    this.stato.tFase = t;
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    this.deriva.misura(camera, dt);
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("pavimento", "falange", t)) return;
      const { avanti, lato } = assi(camera);
      const v = this.deriva.verso();
      const d = casuale(3.3, 3.8);
      s.avanti.copy(avanti);
      s.da.copy(avanti).multiplyScalar(d).addScaledVector(lato, -3.6 * v);
      s.centro.copy(avanti).multiplyScalar(d).addScaledVector(lato, casuale(-0.3, 0.3));
      s.fondo.copy(avanti).multiplyScalar(8).addScaledVector(lato, casuale(0.5, 1.5) * v);
      s.pos.copy(s.da);
      s.yaw = Math.atan2(lato.x * v, lato.z * v);
      s.passo = 0;
      s.serra = 0;
      s.lance = 0;
      s.inizio = t;
      this.vai("marcia", t);
      this.gruppo.visible = true;
    }
    const e = t - s.tFase;
    let marcia = 0;
    const VEL = 0.3;
    const verso = (a: THREE.Vector3) => this.tmp.v.copy(a).sub(s.pos).setY(0);

    switch (s.fase) {
      case "marcia": {
        // entra di lato, in colonna, al passo
        marcia = 1;
        const d = verso(s.centro);
        if (d.length() < 0.02) this.vai("ferma", t);
        else s.pos.addScaledVector(d.normalize(), Math.min(VEL * dt, d.length()));
        break;
      }
      case "ferma":
        marcia = 1 - fra(e, 0, 0.5);
        if (e > 0.8) {
          s.yawDa = s.yaw;
          // di fronte a chi guarda
          s.yawA = Math.atan2(-s.avanti.x, -s.avanti.z);
          this.vai("fronte", t);
        }
        break;
      case "fronte": {
        // conversione: il blocco ruota segnando il passo
        marcia = 0.6;
        const k = morbido(e / 2.6);
        s.yaw = s.yawDa + angolo(s.yawA - s.yawDa) * k;
        if (e > 2.6) this.vai("serra", t);
        break;
      }
      case "serra":
        s.serra = morbido(e / 1.0);
        if (e > 1.2) this.vai("abbassa", t);
        break;
      case "abbassa":
        s.lance = morbido(e / 0.8);
        if (e > 1.1) this.vai("avanza", t);
        break;
      case "avanza":
        // tre passi verso chi guarda, lance in resta
        marcia = e < 1.8 ? 1 : 0;
        if (e < 1.8) s.pos.addScaledVector(this.tmp.v.copy(s.avanti).multiplyScalar(-1), 0.16 * dt);
        if (e > 2.4) this.vai("rialza", t);
        break;
      case "rialza":
        s.lance = 1 - morbido(e / 0.8);
        s.serra = 1 - morbido((e - 0.4) / 1.0);
        if (e > 1.5) {
          s.yawDa = s.yaw;
          const d = verso(s.fondo);
          s.yawA = Math.atan2(d.x, d.z);
          this.vai("volta", t);
        }
        break;
      case "volta": {
        // dietro front, poi via verso il fondo
        marcia = 0.6;
        const k = morbido(e / 2.2);
        s.yaw = s.yawDa + angolo(s.yawA - s.yawDa) * k;
        if (e > 2.2) this.vai("via", t);
        break;
      }
      case "via": {
        marcia = 1;
        const d = verso(s.fondo);
        s.pos.addScaledVector(d.normalize(), VEL * dt);
        s.vis = 1 - fra(s.pos.clone().setY(0).length(), 5.6, 7.2);
        if (s.vis <= 0) {
          s.inizio = -1;
          s.vis = 1;
          s.prossima = t + attesa(55, 95);
          this.gruppo.visible = false;
          passa("pavimento", t, attesa(15, 35));
          return;
        }
        break;
      }
    }

    // il passo: tutti insieme, al suono dell'aulo
    s.passo += dt * 1.9 * Math.max(marcia, 0.0001);
    this.blocco.position.set(s.pos.x, PELO_ACQUA, s.pos.z);
    this.blocco.rotation.y = s.yaw;
    this.ombra.position.set(s.pos.x, PELO_ACQUA + 0.003, s.pos.z);
    this.ombra.rotation.z = s.yaw;
    this.materiale.opacity = s.vis;
    (this.ombra.material as THREE.MeshBasicMaterial).opacity = 0.5 * s.vis;

    const { m, b, r, q, s: uno, anca, eulero, mano } = this.tmp;
    const px = PASSO_X * (1 - 0.22 * s.serra);
    for (let i = 0; i < N; i++) {
      const f = i % FILE;
      const riga = Math.floor(i / FILE);
      const ph = (s.passo + this.sfasi[i] * marcia) * Math.PI * 2;
      const oscilla = Math.sin(ph) * 0.42 * marcia;
      const su = Math.abs(Math.sin(ph)) * 0.035 * marcia;
      b.makeTranslation((f - (FILE - 1) / 2) * px, su, -(riga - (RIGHE - 1) / 2) * PASSO_Z);
      this.corpi.setMatrixAt(i, b);
      // gambe: perno all'anca, in controfase
      for (const lato of [-1, 1]) {
        r.makeRotationX(oscilla * lato);
        m.copy(b).multiply(anca.makeTranslation(lato * 0.12, 0.92, 0)).multiply(r);
        this.gambe.setMatrixAt(i * 2 + (lato > 0 ? 1 : 0), m);
      }
      // lancia: in marcia dritta, poi le prime tre righe in orizzontale, l'ultima inclinata
      const giu = riga < 3 ? 1.5 : 0.75;
      const ang = 0.08 + s.lance * (giu - 0.08) + Math.sin(ph) * 0.02 * marcia;
      const alto = 0.35 * s.lance * (riga < 3 ? 1 : 0.5);
      q.setFromEuler(eulero.set(ang, 0, 0));
      m.compose(mano.set(0.36, 1.05 + alto, 0.1), q, uno);
      this.lance.setMatrixAt(i, m.premultiply(b));
    }
    this.corpi.instanceMatrix.needsUpdate = true;
    this.gambe.instanceMatrix.needsUpdate = true;
    this.lance.instanceMatrix.needsUpdate = true;
  }

  libera() {
    liberaTutto(this.gruppo);
  }
}

/** Differenza d'angolo ridotta a (−π, π]. */
function angolo(d: number) {
  return ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
