import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { type Ospite, alone, attesa, finito, fra, liberaTutto, primo, tocca } from "./comuni";

/**
 * Polifemo, il ciclope dell'Odissea, ai piedi dell'Etna. Ogni tanto esce dalla foschia del fianco destro del
 * vulcano e cammina verso sinistra, gigante, dietro il colle del tempio: pelle di pecora sui fianchi, la barba,
 * i capelli, il bastone di pino, e un occhio solo in mezzo alla fronte. Arrivato in vista del mare si ferma,
 * si china, raccoglie un masso, lo alza sopra la testa e lo scaglia lontano, tre volte: dove i massi cadono,
 * con uno spruzzo, spuntano dal mare tre scogli neri di lava, i Faraglioni dei Ciclopi di Aci Trezza.
 * Poi si gira e torna indietro, e svanisce nella foschia. Gli scogli restano ancora un poco, poi affondano.
 * Di giorno la luce della stanza lo illumina; di notte è una sagoma scura, e l'occhio arde come la lava.
 * Unità del modello: è alto 1, i piedi a y = 0, guarda verso +z (poi lo si gira verso dove va).
 */

const SU = PELO_ACQUA - 0.3;
const ALTO = 13; // quanto è alto, nel mondo: in vista quasi quanto l'Etna dietro di lui
const D = 33; // fra il colle del tempio (22) e l'Etna (41)
const A_DA = ANGOLO_ZONA + 1.55; // esce dalla foschia del fianco destro dell'Etna
const A_FERMO = ANGOLO_ZONA + 0.84; // dove si ferma a lanciare
/** dove cadono i massi: il mare a sinistra del vulcano, dietro la carta bassa */
const BERSAGLI = [
  { a: ANGOLO_ZONA + 0.56, d: 28, h: 6.8 },
  { a: ANGOLO_ZONA + 0.47, d: 30, h: 5.9 },
  { a: ANGOLO_ZONA + 0.38, d: 27, h: 6.4 },
];
const sulRing = (a: number, d: number, y = SU) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);

/* i tempi di un passaggio, in secondi */
const ENTRA = 1.6; // esce dalla foschia
const CAMMINA = 15; // fino al punto del lancio
const LANCIO = 3.6; // un lancio: si china, alza, scaglia
const VOLO = 1.7; // il masso in aria
const GIRA = 1.2;
const TORNA = 11;
const TOTALE = ENTRA + CAMMINA + 3 * LANCIO + GIRA + TORNA;
const RESTANO = 14; // gli scogli, dopo che se n'è andato

type Arto = { anca: THREE.Group; ginocchio: THREE.Group };
type Braccio = { spalla: THREE.Group; gomito: THREE.Group; mano: THREE.Object3D };

export class Polifemo implements Ospite {
  gruppo = new THREE.Group();
  private gigante = new THREE.Group();
  private bacino = new THREE.Group();
  private busto = new THREE.Group();
  private gambe: Arto[] = [];
  private braccia: Braccio[] = [];
  private bastone: THREE.Group;
  private masso: THREE.Mesh;
  private massiVolo: { m: THREE.Mesh; da: THREE.Vector3; a: THREE.Vector3; t0: number }[] = [];
  private scogli: THREE.Mesh[] = [];
  private spruzzi: THREE.Sprite[] = [];
  /** i materiali del gigante: sfumano insieme quando esce dalla foschia e quando ci rientra */
  private materiali: THREE.MeshLambertMaterial[] = [];
  private texture: THREE.Texture[] = [];
  private stato = { prossima: primo(25, 2), inizio: -1, fine: -1 };
  private notte: boolean;

  constructor(notte: boolean) {
    this.notte = notte;
    const mat = (giorno: string, sera: string, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) => {
      const m = new THREE.MeshLambertMaterial({ color: notte ? sera : giorno, transparent: true, fog: false, ...extra });
      this.materiali.push(m);
      return m;
    };
    const pelle = mat("#B88A64", "#3A2C28");
    const lana = mat("#D8CDB4", "#4A4440");
    const pelo = mat("#3B2E26", "#16110F");
    const legno = mat("#6A4E33", "#241A14");
    const bianco = mat("#F2EEE4", "#5A5248");
    const iride = notte
      ? mat("#FFB347", "#FFB347", { emissive: new THREE.Color("#FF8A2A"), emissiveIntensity: 1.2 })
      : mat("#2E5A3A", "#2E5A3A");
    const pietra = mat("#5A5650", "#2A2828");

    const add = (padre: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.Mesh(g, m);
      padre.add(mesh);
      return mesh;
    };
    const g = this.gigante;
    g.scale.setScalar(ALTO);
    this.gruppo.add(g);

    // il bacino a 0,47: da lì scendono le gambe e sale il busto
    this.bacino.position.y = 0.47;
    g.add(this.bacino);
    for (const s of [-1, 1]) {
      const anca = new THREE.Group();
      anca.position.set(s * 0.055, 0, 0);
      this.bacino.add(anca);
      add(anca, new THREE.CylinderGeometry(0.038, 0.032, 0.23, 10).translate(0, -0.115, 0), pelle);
      const ginocchio = new THREE.Group();
      ginocchio.position.y = -0.23;
      anca.add(ginocchio);
      add(ginocchio, new THREE.CylinderGeometry(0.031, 0.026, 0.22, 10).translate(0, -0.11, 0), pelle);
      // il piede, largo e piatto, con una fascia di cuoio
      add(ginocchio, new THREE.BoxGeometry(0.05, 0.025, 0.09).translate(0, -0.228, 0.022), legno);
      this.gambe.push({ anca, ginocchio });
    }
    // la pelle di pecora attorno ai fianchi: un gonnellino di lana a ciocche
    {
      const gonna = new THREE.CylinderGeometry(0.12, 0.15, 0.16, 16, 2, true).translate(0, -0.03, 0);
      const p = gonna.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.09) p.setY(i, p.getY(i) - 0.02 * Math.abs(Math.sin(i * 1.7)));
      gonna.computeVertexNormals();
      add(this.bacino, gonna, lana);
    }
    // il busto: largo di spalle, la pancia, una pelle di pecora a tracolla
    this.busto.position.y = 0.03;
    this.bacino.add(this.busto);
    add(this.busto, new THREE.CylinderGeometry(0.12, 0.1, 0.3, 14).translate(0, 0.15, 0).scale(1, 1, 0.75), pelle);
    add(this.busto, new THREE.SphereGeometry(0.105, 14, 10).scale(1, 0.8, 0.75).translate(0, 0.07, 0.01), pelle);
    add(this.busto, new THREE.BoxGeometry(0.06, 0.32, 0.17).rotateZ(0.6).translate(-0.02, 0.17, 0), lana);
    // la testa: grossa, la barba, i capelli, la fronte sporgente e l'occhio solo
    const testa = new THREE.Group();
    testa.position.y = 0.36;
    this.busto.add(testa);
    add(testa, new THREE.CylinderGeometry(0.035, 0.045, 0.05, 10).translate(0, -0.01, 0), pelle);
    add(testa, new THREE.SphereGeometry(0.075, 16, 12).scale(1, 1.08, 0.95).translate(0, 0.07, 0), pelle);
    add(testa, new THREE.SphereGeometry(0.078, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.02, 1.05, 1).translate(0, 0.085, -0.008), pelo);
    add(testa, new THREE.SphereGeometry(0.06, 12, 10).scale(1.05, 1.1, 0.6).translate(0, 0.0, 0.04), pelo);
    add(testa, new THREE.BoxGeometry(0.1, 0.018, 0.03).translate(0, 0.105, 0.06), pelle);
    add(testa, new THREE.CircleGeometry(0.038, 20).translate(0, 0.082, 0.073), bianco);
    add(testa, new THREE.CircleGeometry(0.019, 16).translate(0, 0.082, 0.0745), iride);
    add(testa, new THREE.ConeGeometry(0.012, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0.055, 0.08), pelle);
    // le braccia: spalla, gomito, mano; nella sinistra il bastone di pino
    for (const s of [-1, 1]) {
      const spalla = new THREE.Group();
      spalla.position.set(s * 0.135, 0.28, 0);
      this.busto.add(spalla);
      add(spalla, new THREE.SphereGeometry(0.04, 10, 8), pelle);
      add(spalla, new THREE.CylinderGeometry(0.032, 0.027, 0.17, 10).translate(0, -0.085, 0), pelle);
      const gomito = new THREE.Group();
      gomito.position.y = -0.17;
      spalla.add(gomito);
      add(gomito, new THREE.CylinderGeometry(0.026, 0.022, 0.16, 10).translate(0, -0.08, 0), pelle);
      const mano = add(gomito, new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.2, 0.8).translate(0, -0.18, 0), pelle);
      this.braccia.push({ spalla, gomito, mano });
    }
    this.bastone = new THREE.Group();
    this.bastone.position.set(0, -0.18, 0);
    this.braccia[0].gomito.add(this.bastone);
    add(this.bastone, new THREE.CylinderGeometry(0.012, 0.018, 0.82, 7).translate(0, -0.12, 0.02), legno);
    // il masso che raccoglie, nella destra
    this.masso = add(this.braccia[1].gomito, new THREE.DodecahedronGeometry(0.06, 0).translate(0, -0.23, 0), pietra);
    this.masso.visible = false;

    // i massi in volo, gli scogli che spuntano, gli spruzzi
    const tondo = alone("#FFFFFF");
    this.texture.push(tondo);
    const pietraVolo = new THREE.MeshLambertMaterial({ color: notte ? "#2A2828" : "#5A5650", fog: false });
    for (const b of BERSAGLI) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 * ALTO, 0), pietraVolo);
      m.visible = false;
      this.gruppo.add(m);
      this.massiVolo.push({ m, da: new THREE.Vector3(), a: sulRing(b.a, b.d, PELO_ACQUA), t0: -1 });
      // lo scoglio: un torrione di basalto, tozzo e scabro, più largo alla base, la cima rotta e storta
      const sg = new THREE.CylinderGeometry(0.55, 1.5, b.h, 8, 6).translate(0, b.h / 2, 0);
      const p = sg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / b.h;
        const k = 1 + 0.32 * Math.sin(i * 2.7 + b.h * 3) * Math.sin(y * 9 + i);
        p.setX(i, p.getX(i) * k + y * y * 0.5 * Math.sin(b.h));
        p.setZ(i, p.getZ(i) * (2 - k) * 0.9);
        if (y > 0.98) p.setY(i, p.getY(i) - 0.5 * Math.abs(Math.sin(i * 1.3)));
      }
      sg.computeVertexNormals();
      const sc = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: notte ? "#151414" : "#3C3836", flatShading: true, fog: false }));
      sc.position.copy(sulRing(b.a, b.d, SU));
      sc.visible = false;
      this.scogli.push(sc);
      this.gruppo.add(sc);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, color: notte ? "#9FB6D6" : "#FFFFFF", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      sp.position.copy(sulRing(b.a, b.d, PELO_ACQUA + 1));
      sp.visible = false;
      this.spruzzi.push(sp);
      this.gruppo.add(sp);
    }
    this.gruppo.traverse((o) => {
      o.frustumCulled = false;
      o.raycast = () => undefined;
    });
    this.gruppo.visible = false;
  }

  /** Dove sta e dove guarda all'istante e del passaggio. */
  private dove(e: number) {
    const a0 = A_DA, a1 = A_FERMO;
    let a: number, verso: number, passo = 0;
    const t1 = ENTRA + CAMMINA, t2 = t1 + 3 * LANCIO, t3 = t2 + GIRA;
    if (e < t1) {
      const k = Math.max(0, e) / t1;
      a = a0 + (a1 - a0) * (k * (2 - k) * 0.25 + k * 0.75);
      verso = -1;
      passo = e;
    } else if (e < t2) {
      a = a1;
      verso = -1;
    } else if (e < t3) {
      a = a1;
      verso = -1 + 2 * fra(e, t2, t3);
    } else {
      const k = Math.min(1, (e - t3) / TORNA);
      a = a1 + (a0 + 0.1 - a1) * k;
      verso = 1;
      passo = e - t3;
    }
    return { a, verso, passo };
  }

  aggiorna(t: number) {
    const s = this.stato;
    if (s.inizio < 0) {
      // gli scogli restano ancora un poco dopo che se n'è andato, poi affondano
      if (s.fine > 0) this.scogliDopo(t - s.fine);
      if (t < s.prossima || !tocca("polifemo", "polifemo", t)) return;
      s.inizio = t;
      s.fine = -1;
      this.massiVolo.forEach((v) => (v.t0 = -1));
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    if (e > TOTALE) {
      s.inizio = -1;
      s.fine = t;
      s.prossima = t + attesa(55, 95);
      this.gigante.visible = false;
      finito("polifemo", "polifemo", t);
      return;
    }
    this.gigante.visible = true;
    // esce dalla foschia e ci rientra
    const vis = fra(e, 0, ENTRA) * (1 - fra(e, TOTALE - 2.2, TOTALE));
    for (const m of this.materiali) m.opacity = vis;

    const { a, verso, passo } = this.dove(e);
    const pos = sulRing(a, D);
    this.gigante.position.copy(pos);
    // guarda lungo il cammino (verso −1: verso sinistra, a angoli più piccoli), un poco girato verso chi guarda
    const tangente = Math.PI - a + (verso < 0 ? -Math.PI / 2 : Math.PI / 2);
    this.gigante.rotation.y = tangente + (verso < 0 ? 0.35 : -0.35);

    // il passo: pesante, lento; il bacino scende e sale, le braccia contro le gambe
    const camminando = passo > 0 ? 1 : 0;
    const f = passo * Math.PI * 2 * 0.62;
    const ampio = 0.42 * camminando;
    this.bacino.position.y = 0.47 - 0.012 * camminando * Math.abs(Math.cos(f));
    this.bacino.rotation.set(0, 0.06 * Math.sin(f) * camminando, 0);
    this.busto.rotation.set(0.08, 0, 0);
    this.gambe.forEach((l, i) => {
      const k = Math.sin(f + i * Math.PI);
      l.anca.rotation.x = -k * ampio;
      l.ginocchio.rotation.x = Math.max(0, Math.sin(f + i * Math.PI + 0.8)) * 0.6 * camminando;
    });
    const [sx, dx] = this.braccia;
    sx.spalla.rotation.set(0.25 + Math.sin(f) * 0.25 * camminando, 0, 0.12);
    sx.gomito.rotation.set(0.5, 0, 0);
    dx.spalla.rotation.set(-Math.sin(f) * 0.3 * camminando, 0, -0.12);
    dx.gomito.rotation.set(0.2, 0, 0);
    this.masso.visible = false;

    // i tre lanci
    const t1 = ENTRA + CAMMINA;
    for (let k = 0; k < 3; k++) {
      const l = e - (t1 + k * LANCIO);
      if (l < 0 || l > LANCIO) continue;
      const china = fra(l, 0, 0.9) * (1 - fra(l, 0.9, 1.6));
      const alza = fra(l, 0.9, 1.6);
      const scaglia = fra(l, 1.6, 2.0);
      // si china a raccogliere, si raddrizza col masso sopra la testa, lo scaglia in avanti
      this.busto.rotation.x = 0.08 + china * 0.75 - alza * 0.25 + scaglia * 0.55;
      this.gambe.forEach((g) => (g.ginocchio.rotation.x = china * 0.7));
      this.bacino.position.y = 0.47 - china * 0.06;
      dx.spalla.rotation.set(-0.1 - china * 0.9 - alza * 2.0 + scaglia * 2.6, 0, -0.12);
      dx.gomito.rotation.set(0.1 + alza * 0.3 - scaglia * 0.3, 0, 0);
      sx.spalla.rotation.set(0.2 + alza * 0.6, 0, 0.25);
      this.masso.visible = l > 0.7 && l < 1.95;
      // il masso parte dalla mano
      const v = this.massiVolo[k];
      if (l >= 1.95 && v.t0 < 0) {
        this.masso.getWorldPosition(v.da);
        this.gruppo.worldToLocal(v.da);
        v.t0 = t;
      }
    }
    this.voli(t);
  }

  /** I massi in volo, gli spruzzi, gli scogli che spuntano dal mare. */
  private voli(t: number) {
    this.massiVolo.forEach((v, k) => {
      const sc = this.scogli[k], sp = this.spruzzi[k];
      if (v.t0 < 0) {
        v.m.visible = false;
        sc.visible = false;
        sp.visible = false;
        return;
      }
      const u = (t - v.t0) / VOLO;
      v.m.visible = u < 1;
      if (u < 1) {
        v.m.position.lerpVectors(v.da, v.a, u);
        v.m.position.y += Math.sin(u * Math.PI) * 10;
        v.m.rotation.set(u * 9, u * 6, 0);
      }
      // lo spruzzo, e lo scoglio che sale dall'acqua
      const dopo = t - v.t0 - VOLO;
      const spruzzo = dopo > 0 && dopo < 1.4 ? Math.sin((dopo / 1.4) * Math.PI) : 0;
      sp.visible = spruzzo > 0.01;
      sp.material.opacity = spruzzo * 0.9;
      sp.scale.set(2.5 + dopo * 2, 3.5 + dopo * 3, 1);
      const su = fra(dopo, 0, 0.9);
      sc.visible = su > 0.001;
      sc.scale.set(1, Math.max(0.001, su), 1);
      sc.position.y = SU - (1 - su) * 0.5;
    });
  }

  private scogliDopo(dopo: number) {
    const giu = fra(dopo, RESTANO, RESTANO + 2.5);
    this.scogli.forEach((sc) => {
      if (!sc.visible) return;
      sc.scale.y = Math.max(0.001, 1 - giu);
      if (giu >= 1) sc.visible = false;
    });
    this.massiVolo.forEach((v) => (v.m.visible = false));
    this.spruzzi.forEach((s) => (s.visible = false));
    if (giu >= 1) this.gruppo.visible = false;
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
