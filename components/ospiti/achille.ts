import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import {
  Deriva, type Ospite, assi, attesa, passa, tocca, casuale, fra, generatore, liberaTutto, loft, morbido, ombra, primo,
} from "./comuni";

/**
 * Di giorno, sul marmo: Achille e la tartaruga.
 * La tartaruga attraversa a passetti, testa che va e viene. Dietro di lei compaiono
 * sempre, in fila, le impronte di un corridore che non si vede; quando lei è in vista ogni passo dimezza la distanza che resta,
 * e accanto alle prime è inciso quanto manca (½, ¼, ⅛…). Le impronte si fanno sempre
 * più fitte e non la raggiungono mai. La tartaruga si ferma, si volta a guardare, e riparte.
 */

const SCALA = 1.6;

/* ------------------------------------------------------------------ guscio */

const OCRA = new THREE.Color("#C9A24F");
const OCRA_CHIARA = new THREE.Color("#DDBF73");
const BRUNO = new THREE.Color("#2E2216");
const SOLCO = new THREE.Color("#3D2D1C");
const PIASTRONE = new THREE.Color("#D9C58E");
const PELLE = new THREE.Color("#8C8264");
const PELLE_SCURA = new THREE.Color("#5E5642");

const YC = 0.075;
const rnd = generatore(23);
const macchie = Array.from({ length: 40 }, () => rnd());

/**
 * Le placche del carapace a partire dalla posizione: vertebrali in cima, costali sui fianchi,
 * marginali sul bordo, piastrone sotto. Restituisce colore e rilievo (le placche sporgono,
 * i solchi rientrano, gli anelli di crescita increspano).
 */
function scudo(p: THREE.Vector3) {
  const a = Math.atan2((p.y - YC) / 0.12, Math.abs(p.x) / 0.15); // 0 sul fianco, π/2 in cima
  const s = a / (Math.PI / 2);
  const z = (p.z + 0.2) / 0.4; // 0 dietro, 1 davanti
  if (s < 0) {
    // piastrone: chiaro, diviso in coppie di placche
    const fz = (z * 6) % 1;
    const d = Math.min(fz, 1 - fz, Math.abs(p.x) / 0.02);
    return { c: PIASTRONE.clone().lerp(SOLCO, d < 0.1 ? 0.5 : 0), r: 0 };
  }
  let fila: number, fz: number, fs: number, n: number;
  if (s < 0.24) {
    n = 12;
    fila = 0;
    fz = z * n;
    fs = s / 0.24;
  } else if (s < 0.78) {
    n = 4;
    fila = 1;
    const zz = (z - 0.1) / 0.8;
    fz = Math.min(Math.max(zz, 0), 0.999) * n;
    fs = (s - 0.24) / 0.54;
  } else {
    n = 5;
    fila = 2;
    fz = z * n;
    fs = (s - 0.78) / 0.22;
  }
  const i = Math.floor(fz);
  const u = fz - i;
  const d = Math.min(u, 1 - u, fs * (fila === 2 ? 2 : 1), (1 - fs) * (fila === 2 ? 0.5 : 1));
  const seme = macchie[(i * 3 + fila * 11 + (p.x < 0 ? 7 : 0)) % macchie.length];
  let c = OCRA.clone().lerp(OCRA_CHIARA, seme * 0.6);
  // la macchia scura sta verso la parte anteriore e interna di ogni placca
  const macchia = (u < 0.45 + seme * 0.2 ? 1 : 0) * (fs < 0.65 ? 1 : 0) * (fila === 0 ? (u < 0.35 ? 1 : 0) : 1);
  c.lerp(BRUNO, macchia * (0.65 + seme * 0.25));
  // anelli di crescita
  const anelli = 0.5 + 0.5 * Math.sin(d * 70);
  c.multiplyScalar(0.9 + anelli * 0.1);
  if (d < 0.07) c = SOLCO.clone();
  const rilievo = d < 0.07 ? -0.004 : morbido(d / 0.35) * 0.007 + anelli * 0.0008;
  return { c, r: rilievo };
}

function carapace() {
  const g = loft([
    { z: -0.205, y: YC, l: 0.05, su: 0.02, giu: 0.02 },
    { z: -0.175, y: YC, l: 0.125, su: 0.072, giu: 0.025 },
    { z: -0.1, y: YC, l: 0.152, su: 0.116, giu: 0.028 },
    { z: 0.0, y: YC, l: 0.157, su: 0.132, giu: 0.028 },
    { z: 0.1, y: YC, l: 0.146, su: 0.116, giu: 0.028 },
    { z: 0.165, y: YC, l: 0.116, su: 0.08, giu: 0.025 },
    { z: 0.2, y: YC, l: 0.06, su: 0.028, giu: 0.018 },
  ], { radiali: 64, passi: 8, colore: (_k, _a, p) => scudo(p).c });
  // rilievo delle placche, lungo la direzione che esce dal centro del guscio
  const pos = g.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const { r } = scudo(p);
    n.set(p.x / 0.15, (p.y - YC) / 0.12, p.z / 0.2).normalize();
    p.addScaledVector(n, r);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ impronte */

function texturaImpronta() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const x = c.getContext("2d");
  if (x) {
    x.fillStyle = "#fff";
    x.shadowColor = "#fff";
    x.shadowBlur = 10;
    // tallone, arco (stretto all'interno), pianta, cinque dita
    x.beginPath();
    x.ellipse(66, 205, 26, 34, 0, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.moveTo(44, 200);
    x.bezierCurveTo(40, 160, 48, 120, 46, 96);
    x.lineTo(86, 92);
    x.bezierCurveTo(92, 130, 86, 165, 88, 205);
    x.closePath();
    x.fill();
    x.beginPath();
    x.ellipse(70, 92, 34, 26, -0.15, 0, Math.PI * 2);
    x.fill();
    const dita: [number, number, number][] = [[46, 48, 13], [66, 40, 9.5], [82, 44, 8.5], [96, 52, 7.5], [107, 64, 6.5]];
    dita.forEach(([cx, cy, r]) => {
      x.beginPath();
      x.ellipse(cx, cy, r, r * 1.2, 0, 0, Math.PI * 2);
      x.fill();
    });
  }
  return new THREE.CanvasTexture(c);
}

function texturaScritta(testo: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d");
  if (x) {
    x.fillStyle = "#fff";
    x.font = "italic 84px Georgia, 'Times New Roman', serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(testo, 128, 66);
  }
  return new THREE.CanvasTexture(c);
}

const FRAZIONI = ["1", "½", "¼", "⅛", "1⁄16", "1⁄32"];
const ORME = 20;
/** Da qui in poi (metri di percorso) ogni passo di Achille dimezza la distanza. */
const S_DIMEZZA = 2.3;
const GAP0 = 1.6;

type Impronta = { m: THREE.Mesh; scritta: THREE.Mesh | null; t: number; n: number };

/* ------------------------------------------------------------------ tartaruga */

export class Achille implements Ospite {
  gruppo = new THREE.Group();
  private tarta = new THREE.Group();
  private corpo = new THREE.Group();
  private collo = new THREE.Group();
  private testa = new THREE.Group();
  private palpebre: THREE.Mesh[] = [];
  private zampe: { g: THREE.Group; dietro: boolean; lato: number }[] = [];
  private ombra: THREE.Mesh;
  private impronte: Impronta[] = [];
  private scritte: THREE.Mesh[] = [];
  private texture: THREE.Texture[] = [];
  private materiali: THREE.Material[] = [];
  private deriva = new Deriva();
  private stato = {
    prossima: primo(5, 2), inizio: -1, s: 0, L: 1,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(), curva2: new THREE.Vector3(),
    fase: 0, imbardata: 0, tPasso: 0, passo: 0, prossimoPasso: 0, sFermata: -1, fermata: -1, palpebraT: 0,
    sPassi: [] as number[], verso: 0, oltre: new THREE.Vector3(), k0: -1, ceduto: false,
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), t: new THREE.Vector3() };

  constructor() {
    const pelle = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color("#C9C2A8") });
    const guscio = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.5 });
    const lucido = new THREE.MeshPhysicalMaterial({ color: "#0E0B08", roughness: 0.15, clearcoat: 1 });
    // trasparenti solo per poter sfumare in fondo al percorso
    this.materiali = [pelle, guscio, lucido];
    this.materiali.forEach((m) => (m.transparent = true));

    const squame = (k: number, ang: number) => {
      const c = PELLE.clone().lerp(PELLE_SCURA, morbido(Math.sin(ang)) * 0.7);
      return c.multiplyScalar(0.85 + 0.3 * Math.abs(Math.sin(ang * 9 + k * 31)));
    };

    this.tarta.add(this.corpo);
    this.corpo.add(new THREE.Mesh(carapace(), guscio));

    // collo e testa: escono dall'apertura anteriore, il becco corneo, gli occhi lucidi
    this.collo.position.set(0, YC + 0.005, 0.15);
    this.corpo.add(this.collo);
    this.collo.add(new THREE.Mesh(loft([
      { z: -0.06, l: 0.03, su: 0.028 },
      { z: 0.0, l: 0.027, su: 0.026 },
      { z: 0.05, l: 0.024, su: 0.023 },
    ], { radiali: 14, passi: 3, colore: squame }), pelle));
    this.testa.position.set(0, 0.006, 0.05);
    this.collo.add(this.testa);
    this.testa.add(new THREE.Mesh(loft([
      { z: -0.01, l: 0.026, su: 0.025 },
      { z: 0.025, l: 0.031, su: 0.029, giu: 0.024 },
      { z: 0.06, l: 0.025, su: 0.021, giu: 0.02, y: -0.003 },
      { z: 0.08, l: 0.014, su: 0.012, giu: 0.014, y: -0.008 },
      { z: 0.088, l: 0.005, su: 0.005, giu: 0.006, y: -0.012 },
    ], {
      radiali: 16, passi: 3,
      colore: (k, ang) => (k > 0.75 && Math.sin(ang) < 0.2 ? new THREE.Color("#3A3326") : squame(k, ang)),
    }), pelle));
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), lucido);
      o.position.set(s * 0.024, 0.009, 0.042);
      this.testa.add(o);
      const pal = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), pelle);
      pal.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(pal.geometry.attributes.position.count).fill(0).flatMap(() => [PELLE_SCURA.r, PELLE_SCURA.g, PELLE_SCURA.b]), 3));
      pal.position.copy(o.position);
      pal.scale.set(1, 0.1, 1);
      this.testa.add(pal);
      this.palpebre.push(pal);
    }

    // zampe: colonne tozze coperte di scaglie, unghie scure
    const attacchi: [number, number, boolean][] = [[0.1, 0.11, false], [-0.1, 0.11, false], [0.095, -0.12, true], [-0.095, -0.12, true]];
    attacchi.forEach(([x, z, dietro]) => {
      const g = new THREE.Group();
      g.position.set(x, 0.07, z);
      const r = dietro ? 0.034 : 0.028;
      const geo = loft([
        { z: 0, l: r, su: r },
        { z: 0.04, l: r * 0.9, su: r * 0.95 },
        { z: 0.068, l: r * 0.95, su: r * 0.8 },
        { z: 0.074, l: r * 0.7, su: r * 0.5 },
      ], {
        radiali: 12, passi: 2,
        colore: (k, ang) => (k > 0.85 ? new THREE.Color("#2A241A") : squame(k * 2, ang)),
      }).rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, pelle);
      m.rotation.z = Math.sign(x) * 0.25;
      g.add(m);
      this.corpo.add(g);
      this.zampe.push({ g, dietro, lato: Math.sign(x) });
    });
    // codina
    const coda = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 8).rotateX(-Math.PI / 2 - 0.4), pelle);
    coda.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(coda.geometry.attributes.position.count).fill(0).flatMap(() => [PELLE.r, PELLE.g, PELLE.b]), 3));
    coda.position.set(0, 0.06, -0.2);
    this.corpo.add(coda);

    this.tarta.scale.setScalar(SCALA);
    this.gruppo.add(this.tarta);

    const txOmbra = ombra();
    this.texture.push(txOmbra);
    this.ombra = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5 * SCALA, 0.62 * SCALA),
      new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, depthWrite: false, opacity: 0.6 })
    );
    this.ombra.rotation.x = -Math.PI / 2;
    this.gruppo.add(this.ombra);

    // le impronte di Achille, e le frazioni incise accanto
    const txPiede = texturaImpronta();
    this.texture.push(txPiede);
    const gPiede = new THREE.PlaneGeometry(0.24, 0.48).rotateX(-Math.PI / 2).rotateY(Math.PI);
    for (let n = 0; n < ORME; n++) {
      const m = new THREE.Mesh(gPiede, new THREE.MeshBasicMaterial({
        map: txPiede, color: "#3F362C", transparent: true, opacity: 0, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2,
      }));
      m.visible = false;
      this.gruppo.add(m);
      this.impronte.push({ m, scritta: null, t: -1, n: -1 });
    }
    // le frazioni incise: una per ciascuno dei primi passi
    FRAZIONI.forEach((f) => {
      const tx = texturaScritta(f);
      this.texture.push(tx);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
        map: tx, color: "#3E352C", transparent: true, opacity: 0, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2,
      }));
      sc.visible = false;
      sc.userData.t = 0;
      this.gruppo.add(sc);
      this.scritte.push(sc);
    });

    this.gruppo.visible = false;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  /** Punto del percorso alla distanza s (anche prima dell'inizio, lungo la tangente). */
  private punto(s: number, out: THREE.Vector3) {
    const st = this.stato;
    const k = s / st.L;
    if (k < 0) {
      this.punto(0, out);
      this.tmp.t.copy(st.curva).sub(st.da).setY(0).normalize();
      return out.addScaledVector(this.tmp.t, s);
    }
    // Bézier cubica: entra di lato, attraversa, poi gira e si allontana verso il fondo
    const kk = Math.min(1, k);
    const u = 1 - kk;
    const a = u * u * u, b = 3 * u * u * kk, c = 3 * u * kk * kk, d = kk * kk * kk;
    return out.set(
      a * st.da.x + b * st.curva.x + c * st.curva2.x + d * st.a.x, 0,
      a * st.da.z + b * st.curva.z + c * st.curva2.z + d * st.a.z
    );
  }

  private parti(camera: THREE.Camera) {
    const s = this.stato;
    const { avanti, lato } = assi(camera);
    // nel verso in cui la vista sta girando, così non la perde
    const v = this.deriva.verso();
    const d1 = casuale(2.8, 3.2);
    // curve morbide: le orme devono restare in fila esattamente dietro di lei
    s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -2.9 * v);
    s.curva.copy(avanti).multiplyScalar(d1 - 0.1).addScaledVector(lato, 0.6 * v);
    s.curva2.copy(avanti).multiplyScalar(d1 + 0.4).addScaledVector(lato, casuale(1.6, 2.1) * v);
    s.a.copy(avanti).multiplyScalar(casuale(7.2, 7.8)).addScaledVector(lato, casuale(1.4, 2.2) * v);
    // lunghezza approssimata della curva (punto() con L = 1 prende k direttamente)
    s.L = 1;
    let L = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.punto(0, a);
    for (let i = 1; i <= 80; i++) {
      this.punto(i / 80, b);
      L += a.distanceTo(b);
      a.copy(b);
    }
    s.L = L;
    // le scritte si leggono dritte da dove si guarda
    s.verso = Math.atan2(-avanti.x, -avanti.z);
    s.oltre.copy(avanti);
    s.s = 0;
    s.fase = 0;
    s.tPasso = 0;
    s.passo = 0;
    s.sPassi = [];
    s.fermata = -1;
    s.sFermata = -1;
    s.prossimoPasso = 0;
    s.k0 = -1;
    s.ceduto = false;
    this.impronte.forEach((im) => {
      im.t = -1;
      im.m.visible = false;
    });
    this.scritte.forEach((sc) => (sc.visible = false));
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    this.deriva.misura(camera, dt);
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("pavimento", "tartaruga", t)) return;
      this.parti(camera);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const { p, q } = this.tmp;

    // passo dopo passo, Achille: ogni impronta dimezza la distanza che lo separa dalla coda
    // della tartaruga, finché le resta attaccato ai talloni; ma non la raggiunge mai.
    // Le orme restano tutte, in fila dietro di lei, finché non esce.
    const DT = 1.6;
    const ferma = s.fermata > 0 && t > s.fermata && t < s.fermata + 3.6;
    if (e > 0.5 && t >= s.prossimoPasso && !ferma && s.s < s.L) {
      const n = s.passo;
      // finché la tartaruga non è in vista Achille le sta dietro a distanza fissa; poi dimezza
      if (s.k0 < 0 && s.s >= S_DIMEZZA) s.k0 = n;
      const k = s.k0 < 0 ? -1 : n - s.k0;
      const gap = k < 0 ? GAP0 : Math.max(GAP0 / Math.pow(2, k), 0.06);
      const sImp = s.s - 0.2 * SCALA - gap - 0.24;
      const im = this.impronte[n % this.impronte.length];
      im.t = t;
      im.n = n;
      this.punto(sImp, p);
      this.punto(sImp + 0.05, q);
      const dir = Math.atan2(q.x - p.x, q.z - p.z);
      const lato = n % 2 ? 1 : -1;
      const off = new THREE.Vector3(Math.cos(dir), 0, -Math.sin(dir)).multiplyScalar(lato * 0.13);
      im.m.position.set(p.x + off.x, PELO_ACQUA + 0.003, p.z + off.z);
      im.m.rotation.y = dir;
      im.m.scale.x = lato;
      im.m.visible = true;
      if (im.scritta) im.scritta.visible = false;
      const sc = k >= 0 ? this.scritte[k] : undefined;
      if (sc) {
        // tutte dalla stessa parte, oltre la pista: si leggono in fila
        sc.position.set(p.x + s.oltre.x * 0.42, PELO_ACQUA + 0.003, p.z + s.oltre.z * 0.42);
        sc.rotation.y = s.verso;
        sc.visible = true;
        sc.userData.t = t;
      }
      s.passo++;
      s.prossimoPasso = t + DT;
      if (k === 6) s.fermata = t + 0.8;
    }
    if (ferma) s.prossimoPasso = Math.max(s.prossimoPasso, s.fermata + 3.6 + 0.4);
    // in fondo, lontana e piccola, sfuma insieme alle sue orme
    const svanire = 1 - fra(s.s, s.L - 1.4, s.L);
    this.impronte.forEach((im) => {
      if (im.t < 0) return;
      const ei = t - im.t;
      (im.m.material as THREE.MeshBasicMaterial).opacity = 0.6 * fra(ei, 0, 0.12) * svanire;
    });
    this.scritte.forEach((sc) => {
      if (!sc.visible) return;
      (sc.material as THREE.MeshBasicMaterial).opacity = 0.7 * fra(t - (sc.userData.t as number), 0.25, 0.9) * svanire;
    });

    // la tartaruga: avanza a passetti; finita la rincorsa si ferma, si volta, riparte
    let cammina = 1;
    let voltata = 0;
    if (s.fermata > 0) {
      const ef = t - s.fermata;
      // quando riparte verso il fondo cede il marmo alla falange, che entra dall'altra parte
      if (ef >= 3.6 && !s.ceduto) {
        s.ceduto = true;
        passa("pavimento", t, attesa(1, 3));
      }
      if (ef >= 0 && ef < 3.6) {
        cammina = 1 - fra(ef, 0, 0.4) * (1 - fra(ef, 3.0, 3.6));
        voltata = fra(ef, 0.5, 1.1) * (1 - fra(ef, 2.6, 3.2));
      }
    }
    const v = 0.22 * cammina;
    s.s = Math.min(s.L, s.s + v * dt);
    this.punto(s.s, p);
    this.punto(s.s + 0.05, q);
    const imb = Math.atan2(q.x - p.x, q.z - p.z);
    s.imbardata += ((imb - s.imbardata + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 3);
    this.gruppo.position.set(0, 0, 0);
    this.tarta.position.set(p.x, PELO_ACQUA, p.z);
    this.tarta.rotation.y = s.imbardata;
    this.ombra.position.set(p.x, PELO_ACQUA + 0.002, p.z);
    this.ombra.rotation.z = s.imbardata;
    this.materiali.forEach((m) => (m.opacity = svanire));
    (this.ombra.material as THREE.MeshBasicMaterial).opacity = 0.6 * svanire;

    // andatura a coppie diagonali; il corpo dondola e il collo va avanti e indietro a ogni passo
    s.fase = (s.fase + dt * 1.25 * cammina) % 1;
    const sfasi = [0, 0.5, 0.5, 0];
    this.zampe.forEach((z, i) => {
      const ph = (s.fase + sfasi[i]) % 1;
      let a: number, su = 0;
      if (ph < 0.6) {
        a = -0.45 + (ph / 0.6) * 0.9;
      } else {
        const r = (ph - 0.6) / 0.4;
        a = 0.45 - morbido(r) * 0.9;
        su = Math.sin(r * Math.PI) * 0.014;
      }
      z.g.rotation.x = a * cammina;
      z.g.position.y = 0.07 + su * cammina;
    });
    const dondolo = Math.sin(s.fase * Math.PI * 2);
    this.corpo.rotation.z = dondolo * 0.035 * cammina;
    this.corpo.position.y = Math.abs(dondolo) * 0.004 * cammina;
    this.collo.position.z = 0.15 + (0.012 + Math.sin(s.fase * Math.PI * 4) * 0.008) * cammina;
    // girarsi: il collo si piega di lato, la testa guarda indietro verso le impronte
    const lato = Math.sin(s.imbardata * 7) > 0 ? 1 : -1;
    this.collo.rotation.y = voltata * 0.95 * lato + Math.sin(t * 0.7) * 0.12 * cammina;
    this.testa.rotation.y = voltata * 0.75 * lato;
    this.testa.rotation.x = -0.1 - voltata * 0.12 + Math.sin(t * 1.3) * 0.05;
    if (t > s.palpebraT) s.palpebraT = t + casuale(2.5, 5);
    const chiude = Math.max(0, 1 - Math.abs(t - (s.palpebraT - 0.1)) / 0.1);
    this.palpebre.forEach((pp) => pp.scale.set(1, 0.1 + chiude * 0.9, 1));

    if (s.s >= s.L) {
      s.inizio = -1;
      s.prossima = t + attesa(75, 95);
      this.gruppo.visible = false;
      if (!s.ceduto) passa("pavimento", t, attesa(3, 6));
    }
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
