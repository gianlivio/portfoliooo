import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, bruma, generatore, liberaTutto } from "./comuni";

/**
 * L'orizzonte a destra dello sviluppatore, dall'Etna fino alla città.
 * Di giorno le isole Eolie sul mare, velate dalla distanza: Alicudi, Filicudi, Salina coi suoi due monti,
 * Lipari con la costa di pomice, Vulcano col cratere, Panarea, Stromboli col suo pennacchio.
 * Di notte un luna park sul lungomare: la ruota panoramica, le montagne russe, la torre a caduta, il calcinculo.
 */

const SU = PELO_ACQUA - 0.3;
const A0 = ANGOLO_ZONA + 0.62;
const A1 = ANGOLO_ZONA + 2.52;
const suAnello = (a: number, d: number, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);
const rivolgi = (o: THREE.Object3D, a: number) => (o.rotation.y = Math.PI - a);
const CIELO = new THREE.Color("#BFD6EA");

type Forma = "cono" | "doppio" | "largo" | "cratere" | "basso";
type Isola = { u: number; d: number; h: number; rx: number; rz: number; forma: Forma; velo: number; pomice?: boolean };

const ISOLE: Isola[] = [
  { u: 0.04, d: 43, h: 6.2, rx: 3.8, rz: 3.2, forma: "cono", velo: 0.62 }, // Alicudi
  { u: 0.17, d: 42, h: 5.6, rx: 4.8, rz: 3.6, forma: "largo", velo: 0.55 }, // Filicudi
  { u: 0.36, d: 40, h: 9.6, rx: 7.8, rz: 4.6, forma: "doppio", velo: 0.42 }, // Salina
  { u: 0.56, d: 38.5, h: 6.6, rx: 7.8, rz: 5, forma: "largo", velo: 0.3, pomice: true }, // Lipari
  { u: 0.71, d: 37, h: 6.0, rx: 5, rz: 4, forma: "cratere", velo: 0.26 }, // Vulcano
  { u: 0.84, d: 41.5, h: 3.8, rx: 3, rz: 2.2, forma: "basso", velo: 0.5 }, // Panarea
  { u: 0.95, d: 43, h: 8.2, rx: 4.4, rz: 4.2, forma: "cono", velo: 0.55 }, // Stromboli
];

function profilo(f: Forma, x: number, z: number, rho: number) {
  const cono = (r: number) => Math.pow(Math.max(0, 1 - r), 1.25);
  switch (f) {
    case "cono":
      return cono(rho);
    case "doppio": {
      // i due monti di Salina e la sella fra loro
      const a = cono(Math.hypot(x + 0.42, z) / 0.62), b = cono(Math.hypot(x - 0.4, z) / 0.6) * 0.92;
      return Math.max(a, b, 0.32 * cono(rho));
    }
    case "largo":
      return Math.pow(Math.max(0, 1 - rho * rho), 1.6) * (0.75 + 0.25 * Math.cos(x * 5.5));
    case "cratere":
      return cono(rho) - 0.38 * Math.pow(Math.max(0, 1 - rho / 0.3), 2);
    default:
      return Math.pow(Math.max(0, 1 - rho * rho), 2);
  }
}

/** Un'isola: una griglia polare alzata secondo la forma, colori della macchia e della roccia, velata dalla distanza. */
function isola(i: Isola, r: () => number) {
  const ANELLI = 16, SPICCHI = 56;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const macchia = ["#5F7046", "#6E7A4E", "#7C8456", "#66704A"].map((c) => new THREE.Color(c));
  const roccia = ["#857563", "#7A6B5B", "#93826E"].map((c) => new THREE.Color(c));
  const pomice = new THREE.Color("#E2DDD2");
  const rumore = Array.from({ length: SPICCHI }, () => r());
  for (let a = 0; a <= ANELLI; a++) {
    const rho = a / ANELLI;
    for (let s = 0; s < SPICCHI; s++) {
      const th = (s / SPICCHI) * Math.PI * 2;
      const frasta = 1 + (rumore[s] - 0.5) * 0.18 * rho;
      const x = Math.cos(th) * rho * frasta, z = Math.sin(th) * rho * frasta;
      const k = profilo(i.forma, x, z, rho);
      const y = k * i.h * (1 + (r() - 0.5) * 0.06) - (a === ANELLI ? 0.8 : 0);
      pos.push(x * i.rx, y, z * i.rz);
      let c = (k > 0.55 ? roccia : macchia)[Math.floor(r() * 3)].clone();
      if (i.pomice && th > 3.6 && th < 4.6 && k < 0.5) c = pomice.clone();
      if (i.forma === "cratere" && rho < 0.32) c.lerp(new THREE.Color("#B8A890"), 0.6);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let a = 0; a < ANELLI; a++) for (let s = 0; s < SPICCHI; s++) {
    const p = a * SPICCHI + s, q = a * SPICCHI + ((s + 1) % SPICCHI);
    idx.push(p, q, p + SPICCHI, q, q + SPICCHI, p + SPICCHI);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // la luce del sole cotta nei colori (morbida, da destra e dall'alto), poi la foschia della distanza:
  // più velata in basso, dove l'aria è più spessa
  const n = g.attributes.normal as THREE.BufferAttribute;
  const cc = g.attributes.color as THREE.BufferAttribute;
  const sole = new THREE.Vector3(-0.55, 0.75, -0.35).normalize();
  const v = new THREE.Vector3();
  for (let k = 0; k < cc.count; k++) {
    v.fromBufferAttribute(n, k);
    const luce = 0.72 + 0.4 * Math.max(0, v.dot(sole));
    const quota = Math.max(0, (g.attributes.position as THREE.BufferAttribute).getY(k)) / i.h;
    const c = new THREE.Color(cc.getX(k) * luce, cc.getY(k) * luce, cc.getZ(k) * luce).lerp(CIELO, Math.min(0.92, i.velo + (1 - quota) * 0.12));
    cc.setXYZ(k, c.r, c.g, c.b);
  }
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const a = A0 + (A1 - A0) * i.u;
  m.position.copy(suAnello(a, i.d, SU));
  rivolgi(m, a);
  return m;
}

export class Riva {
  gruppo = new THREE.Group();
  private notte = new THREE.Group();
  private giorno = new THREE.Group();
  private texture: THREE.Texture[] = [];
  private pennacchio: { s: THREE.Sprite; fase: number }[] = [];
  private cimaStromboli = new THREE.Vector3();
  // il luna park
  private ruota = new THREE.Group();
  private cabine: THREE.Object3D[] = [];
  private luciRuota!: THREE.BufferAttribute;
  private nRuota = 0;
  private binario!: THREE.CatmullRomCurve3;
  private vagoni: THREE.Sprite[] = [];
  private luciTorre!: THREE.BufferAttribute;
  private nTorre = 0;
  private torre = { base: new THREE.Vector3(), h: 0, anello: new THREE.Group() };
  private calcinculo = new THREE.Group();
  private catene: THREE.Object3D[] = [];
  private c = new THREE.Color();

  constructor(eNotte: boolean) {
    const r = generatore(23);
    this.isole(r);
    this.lunaPark(r);
    this.gruppo.add(this.notte, this.giorno);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(eNotte);
  }

  /* --------------------------------------------------------------- le isole */

  private isole(r: () => number) {
    // il mare fino all'orizzonte, un poco più scuro del cielo
    const fi0 = Math.PI / 2 - A1, ampio = A1 - A0;
    const mare = new THREE.Mesh(
      new THREE.RingGeometry(33, 46, 48, 1, fi0, ampio).rotateX(-Math.PI / 2).translate(0, SU + 0.02, 0),
      new THREE.MeshBasicMaterial({ color: "#8FB6D2", fog: false })
    );
    this.giorno.add(mare);
    ISOLE.forEach((i) => this.giorno.add(isola(i, r)));
    // Stromboli fuma sempre un poco
    const s = ISOLE[ISOLE.length - 1];
    const a = A0 + (A1 - A0) * s.u;
    this.cimaStromboli.copy(suAnello(a, s.d, SU + s.h));
    const tx = bruma(9);
    this.texture.push(tx);
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: "#E9ECEF", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      this.pennacchio.push({ s: sp, fase: k / 6 });
      this.giorno.add(sp);
    }
  }

  /* ------------------------------------------------------------ il luna park */

  private lunaPark(r: () => number) {
    const ferro = new THREE.MeshBasicMaterial({ color: "#20232B", fog: false });
    const txL = alone("#FFFFFF");
    this.texture.push(txL);
    const puntini = (n: number, size: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ map: txL, vertexColors: true, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      return p;
    };

    /* la ruota panoramica: due cerchioni, i raggi, le cabine che restano diritte, le luci che rincorrono */
    {
      // il luna park è un solo gruppo, raccolto: la ruota in mezzo, il resto attorno a profondità diverse
      const a = ANGOLO_ZONA + 1.72;
      const base = new THREE.Group();
      base.position.copy(suAnello(a, 38, SU));
      rivolgi(base, a);
      base.rotation.y += 0.22;
      const R = 4.3, C = 5.4;
      const telaio: THREE.BufferGeometry[] = [];
      // le gambe a A, davanti e dietro
      for (const z of [-0.5, 0.5]) for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.14, C / Math.cos(0.32), 0.14).translate(0, C / Math.cos(0.32) / 2, 0);
        g.rotateZ(s * 0.32).translate(s * Math.tan(0.32) * C, 0, z);
        telaio.push(g);
      }
      telaio.push(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 10).rotateX(Math.PI / 2).translate(0, C, 0));
      base.add(new THREE.Mesh(mergeGeometries(telaio.map((g) => g.toNonIndexed())), ferro));
      telaio.forEach((g) => g.dispose());
      // la parte che gira
      const giro: THREE.BufferGeometry[] = [];
      for (const z of [-0.32, 0.32]) {
        giro.push(new THREE.TorusGeometry(R, 0.05, 5, 72).translate(0, 0, z));
        giro.push(new THREE.TorusGeometry(R * 0.45, 0.035, 4, 40).translate(0, 0, z));
      }
      const RAGGI = 16;
      for (let k = 0; k < RAGGI; k++) {
        const an = (k / RAGGI) * Math.PI * 2;
        for (const z of [-0.32, 0.32]) giro.push(new THREE.BoxGeometry(0.035, R, 0.035).translate(0, R / 2, z).rotateZ(an));
      }
      this.ruota.add(new THREE.Mesh(mergeGeometries(giro.map((g) => g.toNonIndexed())), ferro));
      giro.forEach((g) => g.dispose());
      this.ruota.position.set(0, C, 0);
      base.add(this.ruota);
      // le cabine: appese al cerchione, colori da giostra
      const tinte = ["#C0392B", "#2E86C1", "#F1C40F", "#27AE60", "#8E44AD", "#E67E22"];
      for (let k = 0; k < RAGGI; k++) {
        const an = (k / RAGGI) * Math.PI * 2;
        const perno = new THREE.Group();
        perno.position.set(Math.sin(an) * R, Math.cos(an) * R, 0);
        const cab = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.36, 0.3).translate(0, -0.3, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(tinte[k % tinte.length]).multiplyScalar(0.4), fog: false })
        );
        const finestra = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.1).translate(0, -0.25, -0.155), new THREE.MeshBasicMaterial({ color: "#FFE6B0", fog: false, toneMapped: false }));
        perno.add(cab, finestra);
        this.cabine.push(perno);
        this.ruota.add(perno);
      }
      // le luci: lungo i due cerchioni e lungo i raggi
      const pos: number[] = [];
      for (const z of [-0.36, 0.36]) for (let k = 0; k < 72; k++) {
        const an = (k / 72) * Math.PI * 2;
        pos.push(Math.sin(an) * R, Math.cos(an) * R, z);
      }
      for (let k = 0; k < RAGGI; k++) {
        const an = (k / RAGGI) * Math.PI * 2;
        for (let j = 1; j <= 6; j++) pos.push(Math.sin(an) * (R * j) / 7, Math.cos(an) * (R * j) / 7, -0.36);
      }
      const p = puntini(pos.length / 3, 0.32);
      (p.geometry.attributes.position as THREE.BufferAttribute).set(pos);
      this.luciRuota = p.geometry.attributes.color as THREE.BufferAttribute;
      this.nRuota = pos.length / 3;
      this.ruota.add(p);
      this.notte.add(base);
    }

    /* le montagne russe: il binario sui piloni, le lucine, il trenino che corre */
    {
      // davanti a sinistra della ruota, più vicine, girate di sbieco
      const a = ANGOLO_ZONA + 1.53, d = 34.5;
      const g = new THREE.Group();
      g.position.copy(suAnello(a, d, SU));
      rivolgi(g, a);
      g.rotation.y += 0.55;
      g.scale.setScalar(0.62);
      const punti: THREE.Vector3[] = [];
      const N = 14;
      const alti = [2.2, 7.5, 3.0, 5.6, 2.4, 4.4, 3.4, 6.2, 2.6, 4.8, 2.2, 3.6, 2.0, 2.4];
      for (let k = 0; k < N; k++) {
        const an = (k / N) * Math.PI * 2;
        punti.push(new THREE.Vector3(Math.cos(an) * 5.5, alti[k], Math.sin(an) * 2.2 + Math.sin(an * 2) * 0.6));
      }
      this.binario = new THREE.CatmullRomCurve3(punti, true, "catmullrom", 0.4);
      const pezzi: THREE.BufferGeometry[] = [new THREE.TubeGeometry(this.binario, 220, 0.06, 5, true)];
      const lungo = this.binario.getSpacedPoints(60);
      lungo.forEach((q, k) => {
        if (k % 3) return;
        pezzi.push(new THREE.BoxGeometry(0.07, q.y, 0.07).translate(q.x, q.y / 2, q.z));
      });
      g.add(new THREE.Mesh(mergeGeometries(pezzi.map((x) => x.toNonIndexed())), ferro));
      pezzi.forEach((x) => x.dispose());
      const lp = puntini(lungo.length, 0.22);
      const pa = lp.geometry.attributes.position as THREE.BufferAttribute;
      const ca = lp.geometry.attributes.color as THREE.BufferAttribute;
      lungo.forEach((q, k) => {
        pa.setXYZ(k, q.x, q.y + 0.1, q.z);
        this.c.setHSL((k / lungo.length) * 3 % 1, 0.9, 0.62);
        ca.setXYZ(k, this.c.r, this.c.g, this.c.b);
      });
      g.add(lp);
      const txV = alone("#FFF3D0");
      this.texture.push(txV);
      for (let k = 0; k < 5; k++) {
        const v = new THREE.Sprite(new THREE.SpriteMaterial({ map: txV, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        v.scale.setScalar(0.55);
        this.vagoni.push(v);
        g.add(v);
      }
      this.notte.add(g);
    }

    /* la torre a caduta: luci che salgono lungo il palo, l'anello che sale piano e cade */
    {
      // dietro a destra della ruota, più lontana
      const a = ANGOLO_ZONA + 1.9;
      const p = suAnello(a, 41, SU);
      const H = 10.5;
      this.torre.base.copy(p);
      this.torre.h = H;
      const palo = new THREE.Mesh(new THREE.BoxGeometry(0.32, H, 0.32).translate(p.x, SU + H / 2, p.z), ferro);
      this.notte.add(palo);
      const N = 40;
      const lp = puntini(N, 0.28);
      const pa = lp.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < N; k++) pa.setXYZ(k, p.x + (k % 2 ? 0.2 : -0.2), SU + (k / N) * H, p.z);
      this.luciTorre = lp.geometry.attributes.color as THREE.BufferAttribute;
      this.nTorre = N;
      this.notte.add(lp);
      const anello = this.torre.anello;
      anello.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 16), ferro));
      const la = puntini(16, 0.3);
      const lpa = la.geometry.attributes.position as THREE.BufferAttribute;
      const lca = la.geometry.attributes.color as THREE.BufferAttribute;
      for (let k = 0; k < 16; k++) {
        const an = (k / 16) * Math.PI * 2;
        lpa.setXYZ(k, Math.cos(an) * 0.8, 0, Math.sin(an) * 0.8);
        lca.setXYZ(k, 1, 0.85, 0.5);
      }
      anello.add(la);
      anello.position.copy(p);
      this.notte.add(anello);
      // la luce rossa in cima
      const txR = alone("#FF3A2A");
      this.texture.push(txR);
      const cima = new THREE.Sprite(new THREE.SpriteMaterial({ map: txR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      cima.position.set(p.x, SU + H + 0.3, p.z);
      cima.scale.setScalar(0.9);
      this.notte.add(cima);
    }

    /* il calcinculo: il palo, il cappello illuminato, i seggiolini che volano in fuori */
    {
      // davanti a destra, il più vicino
      const a = ANGOLO_ZONA + 1.96;
      const g = this.calcinculo;
      g.position.copy(suAnello(a, 34, SU));
      const H = 5.2;
      const fisso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, H, 10).translate(0, H / 2, 0), ferro);
      this.notte.add(fisso.translateX(g.position.x).translateY(g.position.y).translateZ(g.position.z));
      const testa = new THREE.Group();
      testa.position.y = H;
      testa.add(new THREE.Mesh(new THREE.ConeGeometry(2, 0.7, 24, 1, true).translate(0, 0.35, 0), ferro));
      const lp = puntini(48, 0.3);
      const pa = lp.geometry.attributes.position as THREE.BufferAttribute;
      const ca = lp.geometry.attributes.color as THREE.BufferAttribute;
      for (let k = 0; k < 48; k++) {
        const an = (k / 48) * Math.PI * 2;
        const su = k % 2;
        pa.setXYZ(k, Math.cos(an) * (su ? 1.1 : 2.02), su ? 0.62 : 0.02, Math.sin(an) * (su ? 1.1 : 2.02));
        this.c.setHSL(k % 4 < 2 ? 0.12 : 0.92, 0.9, 0.65);
        ca.setXYZ(k, this.c.r, this.c.g, this.c.b);
      }
      testa.add(lp);
      for (let k = 0; k < 12; k++) {
        const an = (k / 12) * Math.PI * 2;
        const perno = new THREE.Group();
        perno.position.set(Math.cos(an) * 1.85, 0, Math.sin(an) * 1.85);
        perno.rotation.y = -an;
        const catena = new THREE.Group();
        catena.add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.8, 0.025).translate(0, -0.9, 0), ferro));
        catena.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.2).translate(0, -1.85, 0), ferro));
        perno.add(catena);
        this.catene.push(catena);
        testa.add(perno);
      }
      g.add(testa);
      this.notte.add(g);
    }

    // il bagliore colorato sopra il luna park
    const tinte: [string, number][] = [["#FF4FA0", ANGOLO_ZONA + 1.58], ["#7A5CFF", ANGOLO_ZONA + 1.74], ["#FFB04F", ANGOLO_ZONA + 1.9]];
    tinte.forEach(([col, a]) => {
      const tx = alone(col);
      this.texture.push(tx);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.copy(suAnello(a, 40, 2.5));
      s.scale.set(9, 7, 1);
      this.notte.add(s);
    });
    void r;
  }

  setNotte(notte: boolean) {
    this.notte.visible = notte;
    this.giorno.visible = !notte;
  }

  aggiorna(t: number) {
    if (!this.notte.visible) {
      // il pennacchio di Stromboli: sale, si piega col vento, svanisce
      this.pennacchio.forEach(({ s, fase }) => {
        const k = (t * 0.03 + fase) % 1;
        s.position.copy(this.cimaStromboli).add(new THREE.Vector3(k * 3, 0.3 + k * 3.2, 0));
        s.scale.setScalar(1 + k * 4);
        s.material.opacity = Math.sin(k * Math.PI) * 0.55;
      });
      return;
    }
    // la ruota gira piano, le cabine restano diritte
    this.ruota.rotation.z = t * 0.09;
    this.cabine.forEach((c) => (c.rotation.z = -this.ruota.rotation.z));
    // le luci della ruota: tre giochi che si alternano ogni dieci secondi
    const gioco = Math.floor(t / 10) % 3;
    for (let k = 0; k < this.nRuota; k++) {
      if (gioco === 0) this.c.setHSL((k / 72 + t * 0.12) % 1, 0.85, 0.6);
      else if (gioco === 1) this.c.setHSL(0.13, 0.6, (k + Math.floor(t * 4)) % 6 === 0 ? 0.9 : 0.35);
      else this.c.setHSL((k + Math.floor(t * 2)) % 2 ? 0.95 : 0.55, 0.9, 0.62);
      this.luciRuota.setXYZ(k, this.c.r, this.c.g, this.c.b);
    }
    this.luciRuota.needsUpdate = true;
    // il trenino: più lento in salita, più veloce in discesa
    const giro = (t * 0.045) % 1;
    this.vagoni.forEach((v, i) => {
      const u = (giro + 1 - i * 0.008) % 1;
      const q = this.binario.getPointAt(u);
      v.position.set(q.x, q.y + 0.15, q.z);
    });
    // la torre: l'anello sale in dodici secondi, resta su, cade in uno
    const T = 18, e = t % T;
    const k = e < 12 ? e / 12 : e < 15 ? 1 : e < 15.8 ? 1 - Math.pow((e - 15) / 0.8, 2) : 0;
    this.torre.anello.position.y = SU + 0.6 + k * (this.torre.h - 1.4);
    for (let i = 0; i < this.nTorre; i++) {
      const su = e < 12 ? (i / this.nTorre < k ? 1 : 0.25) : e < 15.8 ? ((i + Math.floor(t * 8)) % 4 === 0 ? 1 : 0.3) : 0.25;
      this.c.setHSL(0.58 + i * 0.01, 0.8, 0.3 + su * 0.4);
      this.luciTorre.setXYZ(i, this.c.r, this.c.g, this.c.b);
    }
    this.luciTorre.needsUpdate = true;
    // il calcinculo: gira, e i seggiolini si aprono in fuori
    const testa = this.calcinculo.children[0];
    const vel = 0.9 + 0.4 * Math.sin(t * 0.12);
    testa.rotation.y = t * vel;
    this.catene.forEach((c) => (c.rotation.z = 0.55 * vel));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
