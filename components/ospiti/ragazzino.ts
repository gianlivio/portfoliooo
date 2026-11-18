import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { generatore, ik, liberaTutto, loft, luceDipinta, morbido, osso } from "./comuni";
import { FRAG, VERT } from "./livioRasta";

/**
 * Livio da ragazzino, nello stanzino dello sviluppatore: a terra fra la cassettiera e il giradischi, seduto a
 * gambe incrociate, di spalle a chi guarda, i rasta legati in alto come un ananas. Fatto di luce a colori
 * d'arcobaleno come il musicista; i sassi invece sono veri. Concentrato, con calma, prende i sassi dal mucchio
 * alla sua destra e li mette uno sopra l'altro davanti a sé: una torre in equilibrio, che oscilla appena quando
 * ci posa un sasso. Finita la torre la guarda un poco, poi la smonta, un sasso alla volta, e ricomincia.
 * Coordinate della figura: +z avanti (lontano da chi guarda), +x la sua sinistra, y da terra.
 * Con "riduci movimento" resta fermo: la torre finita.
 */

const CICLO = 50;

/** Le parti della figura: nell'ologramma il colore non conta, servono solo a leggere il codice. */
const COL = { pelle: "", rasta: "", elastico: "", maglia: "", pantaloni: "" };
/** I colori del musicista (livioRasta.ts, modo "studio"): l'arcobaleno ci si mescola sopra. */
const LUCE = { giorno: "#FF7A62", notte: "#C79BFF" };

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SU = V(0, 1, 0);

/* ------------------------------------------------------------------ i sassi */

/** Le misure dei sassi della torre, dal basso: semilarghezza e semialtezza, piatti come i ciottoli di fiume. */
const SASSI = [
  [0.17, 0.065],
  [0.145, 0.06],
  [0.122, 0.056],
  [0.102, 0.05],
  [0.085, 0.045],
  [0.068, 0.04],
];
const TINTE_SASSI = ["#8E8A82", "#A39E94", "#6F6C68", "#B3AA9A", "#7E7A72", "#9A948A"];

/** Un ciottolo: una sfera schiacciata e un poco irregolare. */
function ciottolo(l: number, h: number, seme: number) {
  const g = new THREE.SphereGeometry(1, 16, 10);
  const r = generatore(seme);
  const a = [r() * 6, r() * 6, r() * 6];
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.08 * Math.sin(x * 3 + a[0]) * Math.cos(z * 2.6 + a[1]) + 0.05 * Math.sin(y * 4 + a[2]);
    p.setXYZ(i, x * l * k, y * h * k, z * l * 0.86 * k);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ il ragazzino */

const BRACCIO = 0.21;
const AVAMBRACCIO = 0.2;
/** Le spalle, nelle coordinate della figura (+z avanti, +x la sua sinistra, y dal sedere). */
const SPALLE = [V(0.13, 0.45, 0.03), V(-0.13, 0.45, 0.03)];

type Tinta = (c: string) => THREE.Material;
/** Un pezzo della figura: la mesh di luce con la sua maschera di profondità. */
type Pezzo = (g: THREE.BufferGeometry) => THREE.Mesh;

class Ragazzino {
  gruppo = new THREE.Group();
  private busto = new THREE.Group();
  private testa = new THREE.Group();
  private ossa: Record<string, THREE.Object3D> = {};
  private mani: THREE.Object3D[] = [];
  private gomito = V();
  private punta = V();

  constructor(pezzo: Pezzo) {
    const mesh = (g: THREE.BufferGeometry, _parte: string, padre: THREE.Object3D) => {
      const m = pezzo(g);
      padre.add(m);
      return m;
    };
    // le gambe incrociate: le cosce aperte verso le ginocchia, gli stinchi che si incrociano davanti, i piedi nudi
    const G = this.gruppo;
    const gamba = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, c: string) => {
      const m = mesh(new THREE.CylinderGeometry(r1, r0, 1, 12).translate(0, 0.5, 0), c, G);
      osso(m, a, b);
      mesh(new THREE.SphereGeometry(r1, 12, 8).translate(b.x, b.y, b.z), c, G);
    };
    for (const s of [-1, 1]) {
      const anca = V(s * 0.075, 0.07, 0.0);
      const ginocchio = V(s * 0.27, 0.1, 0.2);
      const caviglia = V(-s * 0.08, 0.06, 0.3 + (s > 0 ? 0.03 : -0.03));
      gamba(anca, ginocchio, 0.075, 0.062, COL.pantaloni);
      gamba(ginocchio, caviglia, 0.058, 0.045, COL.pantaloni);
      const piede = mesh(new THREE.CapsuleGeometry(0.032, 0.11, 3, 8).rotateZ(Math.PI / 2).scale(1, 0.75, 1), COL.pelle, G);
      piede.position.set(-s * 0.16, 0.045, 0.3 + (s > 0 ? 0.04 : -0.04));
      piede.rotation.y = s * 0.35;
    }
    mesh(new THREE.SphereGeometry(1, 16, 10).scale(0.13, 0.08, 0.11).translate(0, 0.07, 0), COL.pantaloni, G);
    // il busto, un poco chinato in avanti: la maglietta a maniche corte
    mesh(loft([
      { z: 0.05, l: 0.12, su: 0.085, giu: 0.09 },
      { z: 0.2, l: 0.115, su: 0.08, giu: 0.085 },
      { z: 0.34, l: 0.13, su: 0.075, giu: 0.08 },
      { z: 0.44, l: 0.135, su: 0.07, giu: 0.07 },
      { z: 0.49, l: 0.07, su: 0.045, giu: 0.045 },
    ], { radiali: 20, passi: 4 }).rotateX(-Math.PI / 2), COL.maglia, this.busto);
    for (const s of SPALLE) mesh(new THREE.SphereGeometry(0.052, 12, 8).translate(s.x * 0.92, s.y - 0.015, s.z - 0.03), COL.maglia, this.busto);
    mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.08, 10).translate(0, 0.52, 0), COL.pelle, this.busto);
    this.busto.rotation.x = 0.16;
    G.add(this.busto);
    // la testa, chinata sui sassi; i rasta raccolti in alto, legati con l'elastico, che si aprono come un ananas
    const h = this.testa;
    h.position.set(0, 0.55, 0.0);
    mesh(new THREE.SphereGeometry(1, 20, 16).scale(0.082, 0.096, 0.088).translate(0, 0.09, 0), COL.pelle, h);
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(1, 8, 6).scale(0.013, 0.025, 0.018).translate(s * 0.082, 0.085, -0.005), COL.pelle, h);
      mesh(new THREE.SphereGeometry(0.008, 8, 6).translate(s * 0.03, 0.1, 0.08), "#1E1612", h);
      mesh(new THREE.BoxGeometry(0.03, 0.007, 0.01).rotateZ(s * -0.15).translate(s * 0.031, 0.122, 0.082), COL.rasta, h);
    }
    mesh(new THREE.SphereGeometry(1, 8, 8).scale(0.014, 0.02, 0.018).translate(0, 0.08, 0.088), COL.pelle, h);
    // i capelli tirati su: una calotta, poi il ciuffo legato in cima
    mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.46).rotateX(-0.4).scale(0.088, 0.104, 0.094).translate(0, 0.095, -0.006), COL.rasta, h);
    mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.04, 12).translate(0, 0.205, -0.01), COL.elastico, h);
    const r = generatore(77);
    for (let i = 0; i < 13; i++) {
      const ang = (i / 13) * Math.PI * 2 + r() * 0.3;
      const apri = 0.25 + r() * 0.65;
      const l = 0.13 + r() * 0.1;
      const d = new THREE.CapsuleGeometry(0.014, l, 3, 6).translate(0, l / 2, 0).rotateZ(apri);
      d.rotateY(ang).translate(0, 0.215, -0.01);
      mesh(d, COL.rasta, h);
    }
    this.busto.add(h);
    // le braccia: maniche corte, poi la pelle; le mani
    for (const s of ["s", "d"]) {
      this.ossa[`braccio${s}`] = mesh(new THREE.CylinderGeometry(0.036, 0.042, 1, 10).translate(0, 0.5, 0), COL.pelle, G);
      this.ossa[`manica${s}`] = mesh(new THREE.CylinderGeometry(0.05, 0.052, 1, 10).translate(0, 0.5, 0), COL.maglia, G);
      this.ossa[`avambraccio${s}`] = mesh(new THREE.CylinderGeometry(0.028, 0.034, 1, 10).translate(0, 0.5, 0), COL.pelle, G);
      const mano = new THREE.Group();
      mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.03, 0.045, 0.018).translate(0, 0.04, 0), COL.pelle, mano);
      G.add(mano);
      this.mani.push(mano);
    }
    G.traverse((o) => {
      o.raycast = () => undefined;
    });
  }

  /** Le spalle dopo l'inclinazione del busto, nelle coordinate della figura. */
  spalla(i: number) {
    return SPALLE[i].clone().applyAxisAngle(V(1, 0, 0), this.busto.rotation.x);
  }

  /** La posa: le mani verso i bersagli (coordinate della figura); la testa gira e si china. */
  posa(mani: THREE.Vector3[], testaGiro: number, testaGiu: number, chino: number) {
    this.busto.rotation.x = chino;
    [0, 1].forEach((i) => {
      const s = i === 0 ? "s" : "d";
      const spalla = this.spalla(i);
      const lato = i === 0 ? 1 : -1;
      ik(spalla, mani[i], BRACCIO, AVAMBRACCIO, V(lato * 0.7, -0.6, -0.3).normalize(), this.gomito, this.punta);
      osso(this.ossa[`braccio${s}`], spalla, this.gomito);
      const meta = spalla.clone().lerp(this.gomito, 0.5);
      osso(this.ossa[`manica${s}`], spalla, meta);
      osso(this.ossa[`avambraccio${s}`], this.gomito, this.punta);
      const dir = this.punta.clone().sub(this.gomito).normalize();
      this.mani[i].position.copy(this.punta);
      this.mani[i].quaternion.setFromUnitVectors(SU, dir);
    });
    this.testa.rotation.set(testaGiu, testaGiro, 0);
  }
}

/* ------------------------------------------------------------------ la scena */

/** La torre alla sua destra, un poco avanti (a destra anche per chi guarda: si vede accanto a lui); il mucchio dietro la torre, più vicino a chi guarda. */
const TORRE = V(-0.4, 0, 0.2);
const MUCCHIO = [V(-0.5, 0, -0.16), V(-0.64, 0, -0.04), V(-0.38, 0, -0.2), V(-0.62, 0, -0.22), V(-0.5, 0, -0.32), V(-0.72, 0, -0.14)];
const POSA = 5;
const INIZIO = 2;
const FINE_TORRE = INIZIO + SASSI.length * POSA;
const SMONTA = 40;
const TOGLI = 1.5;

export class RagazzinoSassi {
  gruppo = new THREE.Group();
  private luce = luceDipinta();
  private materiali = new Map<string, THREE.MeshMatcapMaterial>();
  private bimbo: Ragazzino;
  private sassi: THREE.Mesh[] = [];
  /** dove sta ogni sasso nella torre (il centro), già impilati */
  private inTorre: THREE.Vector3[] = [];
  private inclinati: number[] = [];
  /** l'ologramma e la sua maschera di profondità: si vede solo la superficie davanti */
  private mat: THREE.ShaderMaterial;
  private maschera: THREE.ShaderMaterial;

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
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uT: { value: 0 }, uVis: { value: 0.95 }, uBase: { value: PELO_ACQUA }, uTaglio: { value: 2 },
        uColore: { value: new THREE.Color(LUCE.giorno) }, uArco: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
    });
    this.maschera = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }",
      colorWrite: false,
      depthWrite: true,
      transparent: true,
    });
    const pezzo: Pezzo = (g) => {
      const m = new THREE.Mesh(g, this.mat);
      m.renderOrder = 8;
      const k = new THREE.Mesh(g, this.maschera);
      k.renderOrder = 7;
      m.add(k);
      return m;
    };
    this.bimbo = new Ragazzino(pezzo);
    this.gruppo.add(this.bimbo.gruppo);
    // i sassi: la torre, dal più grande al più piccolo, un poco storta come sono le torri vere
    let y = 0;
    const r = generatore(5);
    SASSI.forEach(([l, h], i) => {
      const s = new THREE.Mesh(ciottolo(l, h, 11 + i * 7), this.tinta(TINTE_SASSI[i]));
      this.sassi.push(s);
      this.gruppo.add(s);
      y += h;
      this.inTorre.push(V(TORRE.x + (r() - 0.5) * 0.03, y - 0.008, TORRE.z + (r() - 0.5) * 0.03));
      this.inclinati.push((r() - 0.5) * 0.18);
      y += h - 0.016;
    });
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
    });
    this.setNotte(false);
    // fermo, se nessuno lo aggiorna: la torre finita, lui che la guarda
    this.posa(FINE_TORRE + 2);
  }

  setNotte(notte: boolean) {
    (this.mat.uniforms.uColore.value as THREE.Color).set(notte ? LUCE.notte : LUCE.giorno);
    // i sassi: di notte la luce dipinta del giorno si abbassa
    this.materiali.forEach((m) => m.color.copy(m.userData.base as THREE.Color).multiplyScalar(notte ? 0.42 : 1));
  }

  aggiorna(t: number) {
    this.mat.uniforms.uT.value = t;
    this.posa(t % CICLO);
  }

  /** Nelle coordinate della figura: il ragazzino sta nell'origine del gruppo. */
  private inBimbo(p: THREE.Vector3) {
    return p.clone();
  }

  private posa(e: number) {
    // quanti sassi sono nella torre, quale è in mano, dove
    const n = SASSI.length;
    let inMano = -1;
    let dove = V();
    const sinistraFerma = V(0.1, 0.16, 0.24);
    let destra = V(-0.1, 0.16, 0.24);
    let sinistra = sinistraFerma.clone();
    let testaGiro = -0.2, testaGiu = 0.35, chino = 0.18;
    const nellaTorre = (i: number) => {
      if (e < SMONTA) return e >= INIZIO + i * POSA + 3.2;
      // smonta dall'alto: il sasso i esce al tempo SMONTA + (n - 1 - i) * TOGLI
      return e < SMONTA + (n - 1 - i) * TOGLI + 0.5;
    };
    const tavola = (i: number) => this.inTorre[i];
    const mucchio = (i: number) => V(MUCCHIO[i].x, SASSI[i][1], MUCCHIO[i].z);
    // in costruzione
    if (e >= INIZIO && e < FINE_TORRE) {
      const i = Math.floor((e - INIZIO) / POSA);
      const k = e - INIZIO - i * POSA;
      const da = mucchio(i), a = tavola(i);
      if (k < 1.2) {
        // allunga la destra verso il mucchio
        destra = this.inBimbo(da).lerp(destra, 1 - morbido(k / 1.2));
        testaGiro = -0.6 * morbido(k / 1.2);
      } else if (k < 3.0) {
        // lo porta sopra la torre, alto, con calma
        inMano = i;
        const f = morbido((k - 1.2) / 1.8);
        dove = da.clone().lerp(a, f);
        dove.y += Math.sin(f * Math.PI) * 0.18;
        destra = this.inBimbo(dove).add(V(0, 0.03, 0));
        testaGiro = THREE.MathUtils.lerp(-0.6, -0.2, f);
      } else if (k < 4.0) {
        // lo posa, piano: la sinistra tiene la torre
        inMano = k < 3.2 ? i : -1;
        dove = a.clone();
        dove.y += 0.02 * (1 - morbido((k - 3.0) / 0.2));
        destra = this.inBimbo(dove).add(V(0, 0.03, 0));
        sinistra = this.inBimbo(tavola(Math.max(0, i - 1))).add(V(0.06, 0, 0)).lerp(sinistraFerma, morbido((k - 3.6) / 0.4));
        testaGiro = -0.2;
        testaGiu = 0.45;
      } else {
        destra = this.inBimbo(a).add(V(0, 0.03, 0)).lerp(destra, morbido((k - 4.0) / 0.8));
      }
    } else if (e >= FINE_TORRE && e < SMONTA) {
      // la guarda: si raddrizza un poco, le mani sulle ginocchia, respira
      chino = 0.08 + 0.02 * Math.sin(e * 1.1);
      testaGiu = 0.15;
      testaGiro = -0.15 + 0.05 * Math.sin(e * 0.4);
      destra = V(-0.25, 0.12, 0.2);
      sinistra = V(0.25, 0.12, 0.2);
    } else if (e >= SMONTA && e < SMONTA + n * TOGLI) {
      // la smonta: dall'alto, un sasso alla volta, di nuovo sul mucchio
      const j = Math.floor((e - SMONTA) / TOGLI);
      const i = n - 1 - j;
      const k = (e - SMONTA - j * TOGLI) / TOGLI;
      const da = tavola(i), a = mucchio(i);
      if (k > 0.33) {
        inMano = i;
        const f = morbido((k - 0.33) / 0.67);
        dove = da.clone().lerp(a, f);
        dove.y += Math.sin(f * Math.PI) * 0.12;
        destra = this.inBimbo(dove).add(V(0, 0.03, 0));
      } else {
        destra = this.inBimbo(da).add(V(0, 0.03, 0)).lerp(destra, 1 - morbido(k / 0.33));
      }
      testaGiro = -0.15;
    }
    // i sassi: nella torre, in mano, o sul mucchio; quello appena posato oscilla e si ferma
    this.sassi.forEach((s, i) => {
      if (i === inMano) {
        s.position.copy(dove);
        s.rotation.set(0, e * 0.2, 0);
        return;
      }
      if (nellaTorre(i)) {
        s.position.copy(tavola(i));
        const posato = INIZIO + i * POSA + 3.2;
        const dopo = e < SMONTA ? e - posato : 99;
        const oscilla = dopo >= 0 && dopo < 2.5 ? Math.sin(dopo * 11) * 0.06 * Math.exp(-dopo * 2.2) : 0;
        s.rotation.set(this.inclinati[i] + oscilla, i * 1.3, oscilla * 0.6);
      } else {
        s.position.copy(mucchio(i));
        s.rotation.set(0, i * 2.1, 0);
      }
    });
    this.bimbo.posa([sinistra, destra], testaGiro, testaGiu, chino);
  }

  libera() {
    this.materiali.forEach((m) => m.dispose());
    liberaTutto(this.gruppo, [this.luce, this.mat, this.maschera]);
  }
}
