import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { type Ospite, alone, casuale, fra, liberaTutto } from "./comuni";

/* Ologrammi di giorno: linee di luce che tremolano appena, come le proiezioni del cinema. */

// di giorno, sul marmo chiaro, una luce additiva sparirebbe: linee piene, bronzo e petrolio
const ORO = new THREE.Color("#B8661A");
const AZZURRO = new THREE.Color("#167A9A");

/** Spigoli di una geometria, già spostati: un pezzo di ologramma. */
function spigoli(g: THREE.BufferGeometry, colore: THREE.Color) {
  const l = new THREE.LineSegments(
    new THREE.EdgesGeometry(g, 20),
    new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: 0, depthWrite: false, fog: false })
  );
  g.dispose();
  return l;
}

/** Il tremolio dell'ologramma: quasi fermo, con un singhiozzo ogni tanto. */
function tremolio(t: number) {
  const g = Math.sin(t * 0.7) > 0.97 ? 0.4 : 1;
  return (0.86 + 0.14 * Math.sin(t * 31) * Math.sin(t * 7)) * g;
}

/* ------------------------------------------------------------------ il tempio */

type Pezzo = { o: THREE.Object3D; mat: THREE.LineBasicMaterial; ordine: number; cade: number; asse: THREE.Vector3 };
type Figura = { g: THREE.Group; corpo: THREE.MeshBasicMaterial; x: number; z: number; fase: number };

const CICLO = 54;

/**
 * Sul pavimento, dalla parte opposta allo sviluppatore: la storia di un tempio greco in un minuto.
 * Si monta pezzo per pezzo (gradini, colonne, trabeazione, frontone). Arrivano i pellegrini in processione,
 * pregano, l'incenso sale. Il tempio va in rovina: crolla il frontone, cadono colonne. Intanto i pellegrini
 * diventano turisti, sparsi davanti alle rovine, e scattano fotografie. Poi tutto si dissolve e ricomincia.
 */
export class Tempio implements Ospite {
  gruppo = new THREE.Group();
  private pezzi: Pezzo[] = [];
  private figure: Figura[] = [];
  private flash: THREE.Sprite[] = [];
  private incenso: THREE.Points;
  private texture: THREE.Texture[] = [];

  constructor() {
    const a = ANGOLO_ZONA + Math.PI;
    this.gruppo.position.set(Math.sin(a) * 3.9, PELO_ACQUA, -Math.cos(a) * 3.9);
    this.gruppo.scale.setScalar(0.6);
    this.gruppo.rotation.y = Math.PI - a; // la facciata (−z locale) verso chi guarda
    const S = 1;
    const tempio = new THREE.Group();
    tempio.scale.setScalar(S);
    this.gruppo.add(tempio);
    let ordine = 0;
    const metti = (g: THREE.BufferGeometry, x: number, y: number, z: number, cade = 0) => {
      const l = spigoli(g, ORO);
      l.position.set(x, y, z);
      tempio.add(l);
      this.pezzi.push({ o: l, mat: l.material as THREE.LineBasicMaterial, ordine: ordine++, cade, asse: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize() });
    };
    // il crepidoma: tre gradini
    [[2.6, 1.6], [2.4, 1.4], [2.2, 1.2]].forEach(([l, p], i) => metti(new THREE.BoxGeometry(l, 0.1, p), 0, 0.05 + i * 0.1, 0));
    // il peristilio: sei colonne davanti e dietro, due per lato
    const colonne: [number, number][] = [];
    for (let i = 0; i < 6; i++) colonne.push([-1.0 + i * 0.4, -0.5], [-1.0 + i * 0.4, 0.5]);
    colonne.push([-1.0, -0.17], [-1.0, 0.17], [1.0, -0.17], [1.0, 0.17]);
    colonne.forEach(([x, z], i) => {
      const crolla = [1, 4, 7, 10, 12, 15].includes(i) ? 1 : 0;
      metti(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 10), x, 0.75, z, crolla);
    });
    // trabeazione, cella, frontoni
    metti(new THREE.BoxGeometry(2.2, 0.16, 1.18), 0, 1.28, 0, 1);
    metti(new THREE.BoxGeometry(1.3, 0.85, 0.55), 0, 0.72, 0);
    const frontone = new THREE.Shape();
    frontone.moveTo(-1.12, 0);
    frontone.lineTo(1.12, 0);
    frontone.lineTo(0, 0.32);
    frontone.closePath();
    metti(new THREE.ExtrudeGeometry(frontone, { depth: 1.18, bevelEnabled: false }).translate(0, 0, -0.59), 0, 1.36, 0, 1);

    // le figure: pellegrini, poi turisti
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const corpo = new THREE.MeshBasicMaterial({ color: ORO, transparent: true, opacity: 0, depthWrite: false, fog: false });
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 3, 6).translate(0, 0.125, 0), corpo));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6).translate(0, 0.29, 0), corpo));
      this.gruppo.add(g);
      this.figure.push({ g, corpo, x: casuale(-1.1, 1.1), z: casuale(-1.5, -0.95), fase: i / 9 });
    }
    // i flash delle fotografie
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.scale.setScalar(0.22);
      this.flash.push(s);
      this.gruppo.add(s);
    }
    // l'incenso: punti che salgono davanti alla cella
    const n = 40;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.incenso = new THREE.Points(g, new THREE.PointsMaterial({ color: "#8A7A6A", size: 0.04, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.incenso.frustumCulled = false;
    this.gruppo.add(this.incenso);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number) {
    const e = t % CICLO;
    const tr = tremolio(t);
    const tot = this.pezzi.length;
    // 0–8 si monta; 18–30 va in rovina; 44–50 si dissolve
    const dissolve = 1 - fra(e, 44, 50);
    const rovina = fra(e, 18, 30);
    this.pezzi.forEach((p) => {
      const nasce = fra(e, (p.ordine / tot) * 7, (p.ordine / tot) * 7 + 1);
      const caduta = p.cade ? fra(rovina, p.ordine / tot * 0.6, p.ordine / tot * 0.6 + 0.4) : 0;
      p.o.visible = nasce > 0.001;
      p.o.scale.y = Math.max(0.001, nasce);
      p.o.rotation.set(p.asse.z * caduta * 1.4, 0, -p.asse.x * caduta * 1.4);
      p.mat.opacity = nasce * dissolve * (1 - caduta * 0.92) * tr * 0.85;
      p.mat.color.copy(ORO).lerp(AZZURRO, rovina);
    });
    // pellegrini (8–26) che arrivano in processione e pregano; poi turisti (24–44) sparsi a fotografare
    const pellegrini = fra(e, 8, 10) * (1 - fra(e, 24, 27));
    const turisti = fra(e, 24, 27) * dissolve;
    this.figure.forEach((f, i) => {
      const vis = Math.max(pellegrini, turisti);
      f.corpo.opacity = vis * tr * 0.9;
      f.g.visible = vis > 0.01;
      if (pellegrini > turisti) {
        // in fila verso la scalinata, poi in ginocchio
        const k = fra(e, 9 + i * 0.4, 15 + i * 0.4);
        const z = -2.1 + k * 1.2 + (i % 3) * 0.12;
        const x = (i - 4) * 0.13;
        f.g.position.set(x, 0, z);
        f.g.scale.set(1, e > 16 + i * 0.3 ? 0.62 : 1 + Math.sin(e * 6 + i) * 0.03, 1);
        f.corpo.color.copy(ORO);
      } else {
        // turisti: sparsi, si muovono un poco, girano intorno
        f.g.position.set(f.x + Math.sin(e * 0.3 + i) * 0.15, 0, f.z + Math.cos(e * 0.25 + i) * 0.1);
        f.g.scale.set(1, 1, 1);
        f.corpo.color.copy(AZZURRO);
      }
    });
    // i flash: brevi, sparsi, solo coi turisti
    this.flash.forEach((s, i) => {
      const f = this.figure[(i * 2 + Math.floor(e / 1.7)) % this.figure.length];
      const lampo = turisti > 0.5 && ((e * 1.3 + i * 0.37) % 1) < 0.06 ? 1 : 0;
      s.position.copy(f.g.position).add(new THREE.Vector3(0, 0.2, 0.05));
      s.material.opacity = lampo * 0.9;
    });
    // l'incenso, mentre pregano
    const arr = this.incenso.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      const k = ((t * 0.15 + i / 40) % 1);
      arr[i * 3] = Math.sin(i * 7.1 + t * 0.6) * 0.05 * (1 + k * 3);
      arr[i * 3 + 1] = 0.3 + k * 1.1;
      arr[i * 3 + 2] = -0.55;
    }
    this.incenso.geometry.attributes.position.needsUpdate = true;
    (this.incenso.material as THREE.PointsMaterial).opacity = fra(e, 15, 17) * (1 - fra(e, 22, 25)) * 0.7;
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
