import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, fra, generatore, liberaTutto } from "./comuni";
import { rilievo } from "./meraviglie";
import { FRAG, LINEA_FRAG, LINEA_VERT, VERT } from "./tempio";

/**
 * Stonehenge in ologramma, sul suo colle, a sinistra della zona dello sviluppatore, sopra il bordo della carta
 * bassa che gli sta davanti. Come il tempio ai piedi dell'Etna, ma la storia va all'indietro.
 * Si comincia da oggi: le pietre come sono adesso, metà cadute o sparite, i turisti in giro lungo la corda coi
 * flash. Poi il tempo si riavvolge: i turisti svaniscono, le pietre cadute si rialzano, quelle sparite tornano,
 * gli architravi risalgono sui montanti, e il cerchio è intero. È l'alba del solstizio: la gente del neolitico
 * in cerchio con le braccia alzate, il sole che sorge in fondo al viale, un raggio che passa fra i triliti fino
 * al centro. Poi ancora più indietro: il cantiere al contrario. Gli architravi scendono, le pietre si coricano
 * sulle slitte e le squadre le trascinano via lungo il viale, prima i grandi sarsen, poi le pietre azzurre;
 * resta il fossato, e infine la piana vuota. Poi da capo.
 * Il colore va dall'azzurro di oggi all'oro dell'origine. Con "riduci movimento" resta il cerchio intero, fermo.
 * Coordinate del monumento: −z verso chi guarda, il viale verso il fondo, di sbieco.
 */

const SU = PELO_ACQUA - 0.3;
// dietro la carta bassa a sinistra della zona, davanti alle colline delle pale (di notte, al petrolchimico):
// più in qua, verso Bologna, il portico di San Luca gli passava davanti
const A = ANGOLO_ZONA - 2.25;
const D = 20;
/** Il ripiano del colle: sopra il bordo della carta bassa che gli sta davanti. */
const Y = 2.45;
const SCALA = 1.5;
const CICLO = 60;

/* le misure, in unità del monumento (prima di SCALA): un'unità sono circa dieci metri */
const R_SARSEN = 1.5;
const N_SARSEN = 30;
const ALTO_SARSEN = 0.42;
const R_FOSSO = 2.45;
/** il viale: verso il fondo, girato di lato, perché da qui si veda il sole sorgere dietro il cerchio */
const VIALE = new THREE.Vector3(Math.sin(0.55), 0, Math.cos(0.55));

/** Come sta oggi una pietra: in piedi, caduta (coricata verso fuori), o sparita. */
type Oggi = "intera" | "caduta" | "sparita";
type Pietra = {
  o: THREE.Group;
  mat: THREE.ShaderMaterial[];
  /** in piedi, al suo posto */
  pos: THREE.Vector3;
  rotY: number;
  oggi: Oggi;
  /** caduta: l'asse attorno a cui si corica, e dove finisce */
  asse: THREE.Vector3;
  /** riavvolgimento: quando torna a posto */
  torna: number;
  /** smontaggio a ritroso: quando la portano via */
  via: number;
  architrave: boolean;
  /** quanto è alta (per coricarla sulla slitta) */
  alto: number;
};

type Figura = { g: THREE.Group; busto: THREE.Group; mat: THREE.MeshBasicMaterial; ang: number; fase: number };

const AZZURRO = { giorno: new THREE.Color("#1E6CC4"), notte: new THREE.Color("#5CB8FF") };
const ORO = { giorno: new THREE.Color("#C2620E"), notte: new THREE.Color("#FFC25A") };
const TURISTA = { giorno: new THREE.Color("#0E58A8"), notte: new THREE.Color("#A8DCFF") };
const ANTICO = { giorno: new THREE.Color("#8E4A12"), notte: new THREE.Color("#FFD890") };

const COLLE_R = 3.0; // il ripiano, in unità del gruppo (non scalate)
const COLLE_H = Y - SU + 0.4;
/**
 * Il ripiano sale verso il fondo, come il labirinto: da quaggiù, guardando in su, un ripiano piatto nasconde
 * la base delle pietre dietro il suo ciglio; inclinato verso chi guarda, il cerchio si vede tutto.
 */
const PENDIO = 0.22;
function quotaColle(x: number, z: number) {
  const t = Math.hypot(x, z) / (COLLE_R * SCALA);
  const k = t < 1 ? 0 : THREE.MathUtils.smoothstep(t, 1, 2.0);
  const rugo = 0.08 * Math.sin(x * 1.3 + z * 0.7) + 0.05 * Math.sin(x * 3.1 - z * 2.2);
  return (PENDIO * z - 0.02) * (1 - k) - COLLE_H * k + rugo * Math.min(1, k * 3);
}

export class Stonehenge {
  gruppo = new THREE.Group();
  private monumento = new THREE.Group();
  private pietre: Pietra[] = [];
  private fosso: { o: THREE.Object3D; mat: THREE.ShaderMaterial[] }[] = [];
  private figure: Figura[] = [];
  private squadra: Figura[] = [];
  private corde: THREE.LineSegments;
  private flash: THREE.Sprite[] = [];
  private sole: THREE.Sprite;
  private raggio: THREE.Mesh;
  private texture: THREE.Texture[] = [];
  private uni = {
    uT: { value: 0 },
    uBase: { value: Y },
    uTaglio: { value: 99 },
    uCima: { value: 0.9 * SCALA },
    uColore: { value: new THREE.Color() },
    uLuce: { value: new THREE.Vector3(-0.5, 0.75, -0.45).normalize() },
  };
  private coloreLinee = { value: new THREE.Color() };
  private notte = false;

  constructor() {
    this.gruppo.position.set(Math.sin(A) * D, Y, -Math.cos(A) * D);
    this.gruppo.rotation.y = Math.PI - A;
    this.gruppo.add(this.colle());
    this.monumento.scale.setScalar(SCALA);
    this.monumento.rotation.x = -PENDIO;
    this.gruppo.add(this.monumento);
    const r = generatore(17);

    /** I materiali di un pezzo: la sua trasparenza (uVis) è sua, il resto è in comune. */
    const materiali = () => {
      const uVis = { value: 1 };
      const corpo = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...this.uni, uVis }, transparent: true, depthWrite: false, fog: false });
      const maschera = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...this.uni, uVis }, defines: { MASCHERA: 1 },
        transparent: true, colorWrite: false, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, fog: false,
      });
      const linee = new THREE.ShaderMaterial({ vertexShader: LINEA_VERT, fragmentShader: LINEA_FRAG, uniforms: { uVis, uBase: this.uni.uBase, uTaglio: this.uni.uTaglio, uColore: this.coloreLinee }, transparent: true, depthWrite: false, fog: false });
      return [corpo, maschera, linee];
    };
    const pezzo = (geo: THREE.BufferGeometry) => {
      const o = new THREE.Group();
      const [corpo, maschera, linee] = materiali();
      const m = new THREE.Mesh(geo, corpo);
      m.renderOrder = 8;
      const k = new THREE.Mesh(geo, maschera);
      k.renderOrder = 7;
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), linee);
      l.renderOrder = 9;
      o.add(k, m, l);
      this.monumento.add(o);
      return { o, mat: [corpo, maschera, linee] };
    };
    /** Una pietra sbozzata: un parallelepipedo un po' rastremato in alto, con l'origine alla base. */
    const masso = (w: number, h: number, d: number, rastrema = 0.85) => {
      const g = new THREE.BoxGeometry(w, h, d, 1, 2, 1).translate(0, h / 2, 0);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const k = 1 - (1 - rastrema) * (p.getY(i) / h);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * (0.9 + 0.1 * k));
      }
      g.computeVertexNormals();
      return g;
    };
    const metti = (geo: THREE.BufferGeometry, pos: THREE.Vector3, rotY: number, oggi: Oggi, ordineVia: number, architrave = false, alto = 0.2) => {
      const { o, mat } = pezzo(geo);
      // le pietre cadono verso fuori dal cerchio, un po' di sbieco
      const fuori = new THREE.Vector3(pos.x, 0, pos.z).normalize();
      if (fuori.lengthSq() < 0.01) fuori.set(0, 0, -1);
      fuori.applyAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.6);
      const asse = new THREE.Vector3(fuori.z, 0, -fuori.x);
      this.pietre.push({ o, mat, pos, rotY, oggi, asse, torna: 17 + r() * 8, via: ordineVia, architrave, alto });
    };

    // il fossato e l'argine, il primo lavoro e l'ultimo a sparire
    for (const [r0, r1, h] of [[R_FOSSO - 0.12, R_FOSSO + 0.05, 0.012], [R_FOSSO + 0.12, R_FOSSO + 0.3, 0.05]] as const) {
      const g = new THREE.RingGeometry(r0, r1, 72, 1).rotateX(-Math.PI / 2).translate(0, h, 0);
      this.fosso.push(pezzo(g));
    }

    // i pezzi, nell'ordine in cui si smontano (il contrario della costruzione): architravi, triliti, sarsen, pietre azzurre
    const viaArchitravi: number[] = [], viaTriliti: number[] = [], viaSarsen: number[] = [], viaAzzurre: number[] = [];

    // il cerchio dei sarsen: trenta montanti e l'anello di architravi sopra; oggi ne restano in piedi diciassette
    // e sei architravi, quasi tutti dalla parte del viale
    const lato = (i: number) => {
      const a = (i / N_SARSEN) * Math.PI * 2;
      return { a, p: new THREE.Vector3(Math.sin(a) * R_SARSEN, 0, Math.cos(a) * R_SARSEN) };
    };
    const vialeAng = Math.atan2(VIALE.x, VIALE.z);
    const vicinoAlViale = (a: number) => Math.abs(Math.atan2(Math.sin(a - vialeAng), Math.cos(a - vialeAng)));
    for (let i = 0; i < N_SARSEN; i++) {
      const { a, p } = lato(i);
      const v = vicinoAlViale(a);
      const oggi: Oggi = v < 1.2 ? "intera" : r() < 0.35 ? "caduta" : r() < 0.5 ? "sparita" : "intera";
      viaSarsen.push(this.pietre.length);
      metti(masso(0.17, ALTO_SARSEN, 0.1), p, a, oggi, 0, false, ALTO_SARSEN);
      // l'architrave fra questo montante e il prossimo
      const b = lato(i + 1);
      const m = p.clone().add(b.p).multiplyScalar(0.5);
      m.y = ALTO_SARSEN;
      const corda = p.distanceTo(b.p);
      const oggiA: Oggi = v < 0.55 ? "intera" : v < 1.2 && r() < 0.4 ? "caduta" : "sparita";
      viaArchitravi.push(this.pietre.length);
      metti(masso(corda + 0.02, 0.065, 0.1, 1), m, (a + b.a) / 2, oggiA, 0, true, 0.065);
    }

    // i cinque triliti a ferro di cavallo, aperti verso il viale; il grande in fondo
    for (let k = 0; k < 5; k++) {
      const u = (k - 2) / 2; // −1 … 1
      const a = vialeAng + Math.PI + u * 1.25;
      const rr = 0.86 - Math.abs(u) * 0.08;
      const c = new THREE.Vector3(Math.sin(a) * rr, 0, Math.cos(a) * rr);
      const alto = 0.56 + (1 - Math.abs(u)) * 0.14;
      const tang = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const grande = k === 2;
      for (const s of [-1, 1]) {
        const p = c.clone().addScaledVector(tang, s * 0.13);
        // oggi: del grande trilite resta un montante, l'altro è caduto; uno dei laterali è tutto a terra
        const oggi: Oggi = grande ? (s < 0 ? "intera" : "caduta") : k === 4 ? "caduta" : "intera";
        viaTriliti.push(this.pietre.length);
        metti(masso(0.2, alto, 0.13), p, a, oggi, 0, false, alto);
      }
      const t = c.clone();
      t.y = alto;
      viaArchitravi.push(this.pietre.length);
      metti(masso(0.5, 0.08, 0.13, 1), t, a, grande || k === 4 ? "caduta" : "intera", 0, true, 0.08);
    }

    // le pietre azzurre: un cerchio di quaranta e un ferro di cavallo di diciannove, piccole e fitte; oggi molte mancano
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + 0.04;
      const p = new THREE.Vector3(Math.sin(a) * 1.18, 0, Math.cos(a) * 1.18);
      viaAzzurre.push(this.pietre.length);
      metti(masso(0.07, 0.2, 0.06), p, a, r() < 0.45 ? "sparita" : r() < 0.3 ? "caduta" : "intera", 0, false, 0.2);
    }
    for (let i = 0; i < 19; i++) {
      const u = i / 18 - 0.5;
      const a = vialeAng + Math.PI + u * 2.6;
      const p = new THREE.Vector3(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55);
      viaAzzurre.push(this.pietre.length);
      metti(masso(0.07, 0.24, 0.06), p, a, r() < 0.4 ? "sparita" : "intera", 0, false, 0.24);
    }
    // la pietra dell'altare, coricata al centro, e la Heel Stone in fondo al viale, storta
    viaAzzurre.push(this.pietre.length);
    metti(masso(0.38, 0.05, 0.1, 1), new THREE.Vector3(-0.1, 0, -0.1), vialeAng, "intera", 0, false, 0.05);
    const tallone = VIALE.clone().multiplyScalar(3.3);
    viaSarsen.push(this.pietre.length);
    metti(masso(0.22, 0.48, 0.18, 0.7), tallone, vialeAng, "intera", 0, false, 0.48);

    // gli orari dello smontaggio: prima tutti gli architravi, poi i triliti, i sarsen, le pietre azzurre
    const ordine = [...viaArchitravi, ...viaTriliti, ...viaSarsen, ...viaAzzurre];
    ordine.forEach((idx, n) => (this.pietre[idx].via = 40.2 + (n / ordine.length) * 11.5));

    // le figure: i turisti di oggi e la gente dell'alba; poi la squadra che trascina
    const tondo = alone("#FFFFFF");
    this.texture.push(tondo);
    const figura = (alzaBraccia: boolean): Figura => {
      const g = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.06, 6).translate(0, 0.03, 0), m));
      const busto = new THREE.Group();
      busto.position.y = 0.06;
      busto.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.05, 6).translate(0, 0.025, 0), m));
      busto.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6).translate(0, 0.065, 0), m));
      if (alzaBraccia) for (const s of [-1, 1]) busto.add(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 4).rotateZ(s * 0.35).translate(s * 0.022, 0.07, 0), m));
      g.add(busto);
      g.traverse((o) => (o.renderOrder = 10));
      this.monumento.add(g);
      return { g, busto, mat: m, ang: r() * Math.PI * 2, fase: r() * 10 };
    };
    for (let i = 0; i < 14; i++) this.figure.push(figura(i % 2 === 0));
    for (let i = 0; i < 10; i++) this.squadra.push(figura(false));
    // le corde della squadra
    const gc = new THREE.BufferGeometry();
    gc.setAttribute("position", new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
    this.corde = new THREE.LineSegments(gc, new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.corde.renderOrder = 10;
    this.monumento.add(this.corde);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
      s.scale.setScalar(0.22);
      s.renderOrder = 11;
      this.flash.push(s);
      this.monumento.add(s);
    }
    // il sole del solstizio, in fondo al viale, e il suo raggio fino al centro
    this.sole = new THREE.Sprite(new THREE.SpriteMaterial({ map: tondo, color: "#FFC46A", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    this.sole.scale.setScalar(1.6);
    this.sole.renderOrder = 6;
    this.monumento.add(this.sole);
    const lungo = 5.2;
    this.raggio = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, lungo).rotateX(-Math.PI / 2).translate(0, 0.12, lungo / 2),
      new THREE.MeshBasicMaterial({ color: "#FFD58A", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })
    );
    this.raggio.rotation.y = vialeAng;
    this.raggio.renderOrder = 11;
    this.monumento.add(this.raggio);

    this.gruppo.traverse((o) => {
      o.frustumCulled = false;
      o.raycast = () => undefined;
    });
    this.setNotte(false);
    // fermo, se nessuno lo aggiorna: il cerchio intero all'alba
    this.posa(33, 33);
  }

  /** Il colle: un ripiano largo, d'erba, coi fianchi che scendono fin sotto il pavimento. */
  private colle() {
    const L = COLLE_R * SCALA * 2.1;
    const geo = rilievo(-L, L, -L, L, 56, 56, quotaColle);
    geo.computeVertexNormals();
    const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const erba = new THREE.Color("#8C9A55"), chiara = new THREE.Color("#A8AE6A"), gesso = new THREE.Color("#CFC7B0");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), ny = nor.getY(i);
      c.copy(erba).lerp(chiara, 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.9) * 2));
      // dove è ripido affiora il gesso della piana di Salisbury
      c.lerp(gesso, THREE.MathUtils.smoothstep(1 - ny, 0.25, 0.55) * 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  }

  setNotte(notte: boolean) {
    this.notte = notte;
  }

  aggiorna(t: number) {
    this.posa(t % CICLO, t);
  }

  /** Il monumento all'istante e del ciclo (che va all'indietro nel tempo). */
  private posa(e: number, t: number) {
    const N = this.notte ? "notte" : "giorno";
    this.uni.uT.value = t;
    // si stampa dal basso nei primi secondi; poi il taglio resta aperto
    this.uni.uTaglio.value = e < 5 ? -0.05 + fra(e, 0.2, 4.5) * (0.9 * SCALA + 0.1) : 99;
    // l'azzurro di oggi che torna all'oro dell'origine mentre si riavvolge
    const antico = fra(e, 16, 27);
    this.uni.uColore.value.copy(AZZURRO[N]).lerp(ORO[N], antico);
    this.coloreLinee.value.copy(this.uni.uColore.value).lerp(new THREE.Color("#FFFFFF"), this.notte ? 0.35 : 0.1);

    const q = new THREE.Quaternion(), su = new THREE.Vector3(0, 1, 0);
    let corrente: Pietra | null = null;
    for (const p of this.pietre) {
      // 1. oggi (fino al riavvolgimento): caduta, sparita o in piedi; 2. si rimette a posto; 3. la portano via
      const rimessa = fra(e, p.torna, p.torna + 1.6);
      const giu = p.oggi === "caduta" ? 1 - rimessa : 0;
      let vis = p.oggi === "sparita" ? rimessa : 1;
      const k = Math.min(1, Math.max(0, (e - p.via) / 1.7));
      p.o.position.copy(p.pos);
      q.setFromAxisAngle(su, p.rotY);
      p.o.quaternion.copy(q);
      if (giu > 0) {
        // coricata verso fuori: gli architravi cadono giù dal loro posto, i montanti si piegano sulla base
        if (p.architrave) p.o.position.y = p.pos.y * (1 - giu);
        p.o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(p.asse, giu * (p.architrave ? 0.25 : 1.45)));
      }
      if (k > 0) {
        // smontaggio: prima si corica (gli architravi scendono a terra), poi la slitta la trascina lungo il viale
        const a = Math.min(1, k / 0.35), b = Math.max(0, (k - 0.35) / 0.65);
        if (p.architrave) p.o.position.y = p.pos.y * (1 - a);
        else p.o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(VIALE.z, 0, -VIALE.x), -a * Math.PI * 0.5));
        p.o.position.addScaledVector(VIALE, b * b * 3.6);
        p.o.position.y += a * 0.02;
        vis *= 1 - fra(b, 0.75, 1);
        if (k < 1 && k > 0.2 && !corrente) corrente = p;
      }
      p.o.visible = vis > 0.01 && k < 1;
      for (const m of p.mat) m.uniforms.uVis.value = vis;
    }
    // il fossato: resta fino in fondo, poi si riempie
    const fosso = 1 - fra(e, 53, 56);
    for (const f of this.fosso) {
      f.o.visible = fosso > 0.01;
      for (const m of f.mat) m.uniforms.uVis.value = fosso;
    }

    // la gente: i turisti fino al riavvolgimento, poi quelli dell'alba del solstizio
    const turisti = fra(e, 4, 6) * (1 - fra(e, 15, 17.5));
    const alba = fra(e, 27, 29) * (1 - fra(e, 38.5, 40));
    this.figure.forEach((f, i) => {
      const vis = Math.max(turisti, alba);
      f.g.visible = vis > 0.01;
      f.mat.opacity = vis * 0.95;
      if (turisti >= alba) {
        // lungo la corda, fra il cerchio e il fossato, piano
        const a = f.ang + t * 0.03 * (i % 2 ? 1 : -1);
        f.g.position.set(Math.sin(a) * 2.05, 0, Math.cos(a) * 2.05);
        f.g.rotation.y = a + Math.PI / 2;
        f.busto.scale.y = 1;
        f.mat.color.copy(TURISTA[N]);
      } else {
        // in cerchio attorno alle pietre, rivolti al sole che sorge
        const a = (i / this.figure.length) * Math.PI * 2;
        f.g.position.set(Math.sin(a) * 1.85, 0, Math.cos(a) * 1.85);
        f.g.rotation.y = Math.atan2(VIALE.x, VIALE.z);
        f.busto.scale.y = 1 + 0.08 * Math.sin(t * 2 + i);
        f.mat.color.copy(ANTICO[N]);
      }
    });
    this.flash.forEach((s, i) => {
      const f = this.figure[(i * 3 + Math.floor(e / 1.9)) % this.figure.length];
      const lampo = turisti > 0.6 && (e * 0.85 + i * 0.31) % 1 < 0.05 ? 1 : 0;
      s.position.copy(f.g.position).add(new THREE.Vector3(0, 0.12, 0));
      s.material.opacity = lampo;
      s.visible = lampo > 0;
    });

    // il sole sorge in fondo al viale e il raggio entra nel cerchio
    const sorge = fra(e, 28.5, 36);
    const soleVis = fra(e, 28, 29.5) * (1 - fra(e, 38, 40));
    this.sole.position.copy(VIALE).multiplyScalar(5.6);
    this.sole.position.y = -0.4 + sorge * 1.1;
    this.sole.material.opacity = soleVis * 0.95;
    this.sole.visible = soleVis > 0.01;
    const raggio = fra(e, 31, 33) * (1 - fra(e, 37, 39));
    (this.raggio.material as THREE.MeshBasicMaterial).opacity = raggio * 0.45 * (0.85 + 0.15 * Math.sin(t * 3));
    this.raggio.visible = raggio > 0.01;

    // la squadra della slitta: davanti alla pietra che si sta portando via, in due file, con le corde tese
    const squadra = fra(e, 40, 41) * (1 - fra(e, 51.5, 53));
    const corde = this.corde.geometry.attributes.position as THREE.BufferAttribute;
    const lato = new THREE.Vector3(VIALE.z, 0, -VIALE.x);
    const testa = corrente ? (corrente as Pietra).o.position.clone().setY(0) : VIALE.clone().multiplyScalar(1.2);
    this.squadra.forEach((f, i) => {
      f.g.visible = squadra > 0.01;
      f.mat.opacity = squadra * 0.95;
      f.mat.color.copy(ANTICO[N]);
      const fila = Math.floor(i / 2), s = i % 2 ? 1 : -1;
      // tirano: un passo avanti e indietro, chinati
      const passo = Math.sin(t * 4 + fila) * 0.015;
      f.g.position.copy(testa).addScaledVector(VIALE, 0.45 + fila * 0.16 + passo).addScaledVector(lato, s * 0.09);
      f.g.rotation.y = Math.atan2(VIALE.x, VIALE.z);
      f.busto.rotation.x = 0.45;
    });
    const fondo = testa.clone().addScaledVector(VIALE, 0.45 + 4 * 0.16);
    for (const [k, s] of [[0, -1], [1, 1]] as const) {
      corde.setXYZ(k * 2, testa.x + lato.x * s * 0.05, 0.05, testa.z + lato.z * s * 0.05);
      corde.setXYZ(k * 2 + 1, fondo.x + lato.x * s * 0.09, 0.06, fondo.z + lato.z * s * 0.09);
    }
    corde.needsUpdate = true;
    const mc = this.corde.material as THREE.LineBasicMaterial;
    mc.color.copy(ANTICO[N]);
    mc.opacity = squadra * 0.8;
    this.corde.visible = squadra > 0.01 && !!corrente;
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
