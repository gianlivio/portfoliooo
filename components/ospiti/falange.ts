import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { Deriva, type Ospite, assi, attesa, casuale, fra, liberaTutto, morbido, ombra, passa, primo, tocca } from "./comuni";

/**
 * Di giorno, sul marmo, dopo la tartaruga: una piccola falange oplitica, come sui vasi attici.
 * Otto file per cinque righe. Elmo corinzio con i paraguance e il paranaso, cresta di crine
 * nera e bianca su un sostegno; linothorax di lino con gli spallacci e la frangia di pteryges;
 * schinieri di bronzo; aspis con il bordo piatto e gli episemi dipinti (lambda, stella, rosetta);
 * dory con la punta a foglia e il sauroter. Forme tagliate a faccette, niente di tondeggiante.
 * Entra marciando al passo, si ferma, ruota di fronte, serra gli scudi, abbassa le lance
 * (le prime righe in orizzontale, le ultime inclinate), avanza, rialza, si volta e se ne va.
 */

const FILE = 8;
const RIGHE = 5;
const N = FILE * RIGHE;
const SCALA = 0.17;
const PASSO_X = 0.95;
const PASSO_Z = 1.1;

const BRONZO = new THREE.Color("#9C6E34");
const BRONZO_CHIARO = new THREE.Color("#C99A55");
const LINO = new THREE.Color("#E4DAC2");
const LINO_OMBRA = new THREE.Color("#CFC3A6");
const BORDO = new THREE.Color("#7A2A1C");
const NERO = new THREE.Color("#17120E");
const BIANCO = new THREE.Color("#EEE9DE");
const PELLE = new THREE.Color("#A86F48");
const LEGNO = new THREE.Color("#5E4128");

/** Colore per vertice, uniforme o calcolato dalla posizione; e normali per faccia. */
function tingi(g: THREE.BufferGeometry, c: THREE.Color | ((p: THREE.Vector3) => THREE.Color)) {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.attributes.position;
  const col: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const k = typeof c === "function" ? c(p) : c;
    col.push(k.r, k.g, k.b);
  }
  ng.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  ng.computeVertexNormals();
  return ng;
}

function unisci(gs: THREE.BufferGeometry[]) {
  const somma = (nome: string, n: number) => {
    const tot = gs.reduce((a, g) => a + g.attributes[nome].count * n, 0);
    const arr = new Float32Array(tot);
    let o = 0;
    gs.forEach((g) => {
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

/** Elmo corinzio: calotta, paranuca, paraguance che scendono fin sotto il mento, paranaso, fessura a T. */
function elmo() {
  const calotta = tingi(
    new THREE.SphereGeometry(0.15, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.25, 1.18).translate(0, 1.72, 0),
    BRONZO_CHIARO
  );
  const paranuca = tingi(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 10, 1, true, Math.PI * 0.55, Math.PI * 0.9).translate(0, 1.62, -0.01), BRONZO);
  const guancia = (s: number) =>
    tingi(new THREE.BoxGeometry(0.035, 0.24, 0.17).translate(s * 0.115, 1.6, 0.085).rotateY(s * -0.12), BRONZO_CHIARO);
  const naso = tingi(new THREE.BoxGeometry(0.03, 0.12, 0.03).translate(0, 1.66, 0.175), BRONZO_CHIARO);
  // il buio dentro le aperture per gli occhi e la bocca
  const buio = tingi(new THREE.BoxGeometry(0.2, 0.05, 0.02).translate(0, 1.7, 0.16), NERO);
  const buio2 = tingi(new THREE.BoxGeometry(0.07, 0.13, 0.02).translate(0, 1.6, 0.16), NERO);
  // cresta: sostegno e ventaglio di crine, nera con l'orlo bianco
  const sostegno = tingi(new THREE.BoxGeometry(0.025, 0.09, 0.03).translate(0, 1.93, 0), BRONZO);
  const forma = new THREE.Shape();
  forma.moveTo(-0.24, 0);
  forma.quadraticCurveTo(-0.2, 0.2, 0.02, 0.22);
  forma.quadraticCurveTo(0.22, 0.2, 0.24, 0.0);
  forma.lineTo(0.18, -0.04);
  forma.lineTo(-0.2, -0.04);
  forma.closePath();
  const cresta = tingi(
    new THREE.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false, curveSegments: 5 }).translate(0, 0, -0.025).rotateY(Math.PI / 2).translate(0, 1.98, -0.02),
    (p) => (p.y > 2.16 ? BIANCO : NERO.clone().multiplyScalar(1 + Math.abs(Math.sin(p.z * 60)) * 0.6))
  );
  return [calotta, paranuca, guancia(1), guancia(-1), naso, buio, buio2, sostegno, cresta];
}

/** Il corpo fermo (unità umane: 1 = un metro; guarda verso +z, piedi a terra). */
function corpo() {
  // linothorax: busto a faccette, più largo alle spalle, con la fascia dipinta in basso
  const busto = tingi(
    new THREE.CylinderGeometry(0.27, 0.22, 0.56, 8, 2).scale(1, 1, 0.72).rotateY(Math.PI / 8).translate(0, 1.28, 0),
    (p) => (p.y < 1.08 ? BORDO : p.z > 0.1 ? LINO : LINO_OMBRA)
  );
  const spallaccio = (s: number) => tingi(new THREE.BoxGeometry(0.2, 0.04, 0.24).rotateZ(s * -0.25).translate(s * 0.17, 1.55, 0), LINO);
  // pteryges: due giri di strisce di cuoio e lino che pendono dalla vita
  const pteryges: THREE.BufferGeometry[] = [];
  for (let giro = 0; giro < 2; giro++) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + giro * 0.26;
      const g = new THREE.BoxGeometry(0.1, 0.17, 0.015)
        .translate(0, -0.085, 0)
        .rotateX(-0.12)
        .rotateY(a)
        .translate(Math.sin(a) * (0.22 + giro * 0.01), 1.0 - giro * 0.11, Math.cos(a) * (0.17 + giro * 0.01));
      pteryges.push(tingi(g, (p) => (p.y < 0.87 - giro * 0.11 ? BORDO : giro ? LINO_OMBRA : LINO)));
    }
  }
  const tunica = tingi(new THREE.CylinderGeometry(0.21, 0.25, 0.25, 8, 1, true).translate(0, 0.86, 0), BORDO);
  const collo = tingi(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 6).translate(0, 1.6, 0), PELLE);
  // braccio destro che regge la lancia
  const braccio = tingi(new THREE.CylinderGeometry(0.055, 0.045, 0.32, 6).rotateZ(0.5).translate(0.3, 1.42, 0.02), PELLE);
  const avambraccio = tingi(new THREE.CylinderGeometry(0.045, 0.04, 0.3, 6).rotateX(-0.9).translate(0.36, 1.25, 0.12), PELLE);
  return unisci([busto, spallaccio(1), spallaccio(-1), ...pteryges, tunica, collo, braccio, avambraccio, ...elmo()]);
}

type Episema = "lambda" | "stella" | "rosetta";

/** Aspis: conca profonda con il bordo piatto; l'episema dipinto al centro. */
function scudo(tipo: Episema) {
  const profilo = [
    new THREE.Vector2(0.0, 0.16), new THREE.Vector2(0.12, 0.155), new THREE.Vector2(0.24, 0.13),
    new THREE.Vector2(0.33, 0.08), new THREE.Vector2(0.37, 0.03), new THREE.Vector2(0.38, 0.0),
    new THREE.Vector2(0.46, -0.005), new THREE.Vector2(0.47, -0.03),
  ];
  // dal bordo al centro: così le facce della conca guardano fuori
  const g = new THREE.LatheGeometry(profilo.reverse(), 64).rotateX(Math.PI / 2);
  // ora la conca guarda verso +z, il centro in (0,0); colore dalla posizione nel piano xy
  const colorato = tingi(g, (p) => {
    const r = Math.hypot(p.x, p.y);
    if (r > 0.375) return r > 0.455 ? BRONZO : BRONZO_CHIARO;
    if (p.z < 0.0) return BRONZO;
    const a = Math.atan2(p.y, p.x);
    let segno = false;
    if (tipo === "lambda") {
      const asta = (s: number) => Math.abs(p.x - s * (0.2 - (p.y + 0.24) * 0.42)) < 0.045 && p.y > -0.24 && p.y < 0.25;
      segno = asta(1) || asta(-1);
    } else if (tipo === "stella") {
      const raggio = Math.abs(Math.sin(a * 4)) < 0.22 && r < 0.3;
      segno = raggio || r < 0.06;
    } else {
      const petalo = r > 0.08 && r < 0.26 && Math.cos(a * 6) > 0.35;
      segno = petalo || (r > 0.29 && r < 0.315) || r < 0.05;
    }
    if (segno) return tipo === "lambda" ? BORDO : NERO;
    return BRONZO.clone().multiplyScalar(0.92 + (0.37 - r) * 0.5);
  });
  // in mano: davanti al fianco sinistro, un po' inclinato
  return colorato.rotateY(-0.12).translate(-0.12, 1.22, 0.36);
}

/** Gamba: perno all'anca; coscia nuda, schiniere di bronzo, sandalo. */
function gamba() {
  const coscia = new THREE.CylinderGeometry(0.075, 0.06, 0.46, 6).translate(0, -0.23, 0);
  const stinco = new THREE.CylinderGeometry(0.065, 0.05, 0.44, 6).translate(0, -0.68, 0);
  const piede = new THREE.BoxGeometry(0.09, 0.05, 0.22).translate(0, -0.9, 0.05);
  return unisci([tingi(coscia, PELLE), tingi(stinco, (p) => (p.y > -0.48 ? PELLE : BRONZO_CHIARO)), tingi(piede, LEGNO)]);
}

/** Dory: impugnatura nell'origine, punta a foglia verso +y, sauroter in fondo. */
function lancia() {
  const asta = tingi(new THREE.CylinderGeometry(0.017, 0.02, 2.4, 5).translate(0, 0.32, 0), LEGNO);
  const punta = tingi(new THREE.ConeGeometry(0.05, 0.3, 4).scale(1, 1, 0.3).translate(0, 1.67, 0), BRONZO_CHIARO);
  const sauroter = tingi(new THREE.ConeGeometry(0.025, 0.2, 4).rotateX(Math.PI).translate(0, -0.98, 0), BRONZO);
  return unisci([asta, punta, sauroter]);
}

/* ------------------------------------------------------------------ falange */

type Fase = "marcia" | "ferma" | "fronte" | "serra" | "abbassa" | "avanza" | "rialza" | "volta" | "via";

export class Falange implements Ospite {
  gruppo = new THREE.Group();
  private blocco = new THREE.Group();
  private corpi: THREE.InstancedMesh;
  private gambe: THREE.InstancedMesh;
  private lance: THREE.InstancedMesh;
  private scudi: { mesh: THREE.InstancedMesh; chi: number[] }[] = [];
  private indiceScudo = new Map<number, [number, number]>();
  private ombra: THREE.Mesh;
  private materiale: THREE.MeshStandardMaterial;
  private deriva = new Deriva();
  private sfasi = Array.from({ length: N }, () => casuale(-0.04, 0.04));
  private stato = {
    prossima: primo(5, 2), inizio: -1, fase: "marcia" as Fase, tFase: 0,
    pos: new THREE.Vector3(), yaw: 0, yawDa: 0, yawA: 0,
    centro: new THREE.Vector3(), fondo: new THREE.Vector3(),
    avanti: new THREE.Vector3(), passo: 0, serra: 0, lance: 0, vis: 1,
  };
  private tmp = {
    m: new THREE.Matrix4(), b: new THREE.Matrix4(), r: new THREE.Matrix4(), q: new THREE.Quaternion(),
    v: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), anca: new THREE.Matrix4(), eulero: new THREE.Euler(), mano: new THREE.Vector3(),
  };

  constructor() {
    this.materiale = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2, flatShading: true, transparent: true });
    this.corpi = new THREE.InstancedMesh(corpo(), this.materiale, N);
    this.gambe = new THREE.InstancedMesh(gamba(), this.materiale, N * 2);
    this.lance = new THREE.InstancedMesh(lancia(), this.materiale, N);
    [this.corpi, this.gambe, this.lance].forEach((m) => this.blocco.add(m));
    // episemi diversi da uomo a uomo, come in una falange vera
    const tipi: Episema[] = ["lambda", "stella", "rosetta"];
    const chi: number[][] = [[], [], []];
    for (let i = 0; i < N; i++) chi[(i * 7 + Math.floor(i / FILE)) % 3].push(i);
    tipi.forEach((t, k) => {
      const mesh = new THREE.InstancedMesh(scudo(t), this.materiale, chi[k].length);
      this.blocco.add(mesh);
      this.scudi.push({ mesh, chi: chi[k] });
      chi[k].forEach((i, j) => this.indiceScudo.set(i, [k, j]));
    });
    this.blocco.children.forEach((m) => (m.frustumCulled = false));
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
      s.pos.copy(avanti).multiplyScalar(d).addScaledVector(lato, -3.4 * v);
      s.centro.copy(avanti).multiplyScalar(d).addScaledVector(lato, casuale(0.0, 0.6) * v);
      s.fondo.copy(avanti).multiplyScalar(8).addScaledVector(lato, casuale(1.0, 2.0) * v);
      s.yaw = Math.atan2(lato.x * v, lato.z * v);
      s.passo = 0;
      s.serra = 0;
      s.lance = 0;
      s.vis = 1;
      s.inizio = t;
      this.vai("marcia", t);
      this.gruppo.visible = true;
    }
    const e = t - s.tFase;
    let marcia = 0;
    const VEL = 0.32;
    const verso = (a: THREE.Vector3) => this.tmp.v.copy(a).sub(s.pos).setY(0);

    switch (s.fase) {
      case "marcia": {
        marcia = 1;
        const d = verso(s.centro);
        const l = d.length();
        if (l < 0.02) this.vai("ferma", t);
        else s.pos.addScaledVector(d.normalize(), Math.min(VEL * dt, l));
        break;
      }
      case "ferma":
        marcia = 1 - fra(e, 0, 0.5);
        if (e > 0.7) {
          s.yawDa = s.yaw;
          s.yawA = Math.atan2(-s.avanti.x, -s.avanti.z);
          this.vai("fronte", t);
        }
        break;
      case "fronte": {
        marcia = 0.6;
        s.yaw = s.yawDa + angolo(s.yawA - s.yawDa) * morbido(e / 2.4);
        if (e > 2.4) this.vai("serra", t);
        break;
      }
      case "serra":
        s.serra = morbido(e / 0.9);
        if (e > 1.0) this.vai("abbassa", t);
        break;
      case "abbassa":
        s.lance = morbido(e / 0.7);
        if (e > 0.9) this.vai("avanza", t);
        break;
      case "avanza":
        marcia = e < 1.8 ? 1 : 0;
        if (e < 1.8) s.pos.addScaledVector(this.tmp.v.copy(s.avanti).multiplyScalar(-1), 0.16 * dt);
        if (e > 2.3) this.vai("rialza", t);
        break;
      case "rialza":
        s.lance = 1 - morbido(e / 0.7);
        s.serra = 1 - morbido((e - 0.3) / 0.9);
        if (e > 1.3) {
          s.yawDa = s.yaw;
          const d = verso(s.fondo);
          s.yawA = Math.atan2(d.x, d.z);
          this.vai("volta", t);
        }
        break;
      case "volta": {
        marcia = 0.6;
        s.yaw = s.yawDa + angolo(s.yawA - s.yawDa) * morbido(e / 2.0);
        if (e > 2.0) this.vai("via", t);
        break;
      }
      case "via": {
        marcia = 1;
        const d = verso(s.fondo);
        s.pos.addScaledVector(d.normalize(), VEL * dt);
        s.vis = 1 - fra(Math.hypot(s.pos.x, s.pos.z), 5.6, 7.2);
        if (s.vis <= 0) {
          s.inizio = -1;
          s.prossima = t + attesa(75, 95);
          this.gruppo.visible = false;
          passa("pavimento", t, attesa(4, 8));
          return;
        }
        break;
      }
    }

    s.passo += dt * 1.9 * Math.max(marcia, 0.0001);
    this.blocco.position.set(s.pos.x, PELO_ACQUA, s.pos.z);
    this.blocco.rotation.y = s.yaw;
    this.ombra.position.set(s.pos.x, PELO_ACQUA + 0.003, s.pos.z);
    this.ombra.rotation.z = s.yaw;
    this.materiale.opacity = s.vis;
    (this.ombra.material as THREE.MeshBasicMaterial).opacity = 0.5 * s.vis;

    const { m, b, r, q, s: uno, anca, eulero, mano } = this.tmp;
    const px = PASSO_X * (1 - 0.25 * s.serra);
    for (let i = 0; i < N; i++) {
      const f = i % FILE;
      const riga = Math.floor(i / FILE);
      const ph = (s.passo + this.sfasi[i] * marcia) * Math.PI * 2;
      const oscilla = Math.sin(ph) * 0.4 * marcia;
      const su = Math.abs(Math.sin(ph)) * 0.03 * marcia;
      b.makeTranslation((f - (FILE - 1) / 2) * px, su, -(riga - (RIGHE - 1) / 2) * PASSO_Z);
      this.corpi.setMatrixAt(i, b);
      const [k, j] = this.indiceScudo.get(i) ?? [0, 0];
      // a scudi serrati l'aspis avanza un poco e copre il compagno a sinistra
      m.copy(b).multiply(anca.makeTranslation(-0.04 * s.serra, 0.02 * s.serra, 0.06 * s.serra));
      this.scudi[k].mesh.setMatrixAt(j, m);
      for (const lato of [-1, 1]) {
        r.makeRotationX(oscilla * lato);
        m.copy(b).multiply(anca.makeTranslation(lato * 0.11, 0.92, 0)).multiply(r);
        this.gambe.setMatrixAt(i * 2 + (lato > 0 ? 1 : 0), m);
      }
      // le prime tre righe abbassano le lance in orizzontale, le altre le inclinano sopra le teste
      const giu = riga < 3 ? 1.52 : 0.55 + (RIGHE - 1 - riga) * 0.2;
      const ang = 0.06 + s.lance * (giu - 0.06) + Math.sin(ph) * 0.02 * marcia;
      const alto = 0.4 * s.lance * (riga < 3 ? 1 : 0.4);
      q.setFromEuler(eulero.set(ang, 0, 0));
      m.compose(mano.set(0.38, 1.1 + alto, 0.2), q, uno);
      this.lance.setMatrixAt(i, m.premultiply(b));
    }
    [this.corpi, this.gambe, this.lance, ...this.scudi.map((x) => x.mesh)].forEach((x) => (x.instanceMatrix.needsUpdate = true));
  }

  libera() {
    liberaTutto(this.gruppo);
  }
}

/** Differenza d'angolo ridotta a (−π, π]. */
function angolo(d: number) {
  return ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
