import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANGOLO_ULIVETO } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { alone, generatore, liberaTutto } from "./comuni";
import { accesaDaSotto, costruisciUlivo } from "./ulivo";

/*
 * L'ingresso dell'uliveto, al posto di una carta sull'anello, subito dopo la zona dello sviluppatore.
 * Un cancello di campagna che poggia sullo specchio d'acqua: due pilastri di pietra chiara con le pigne
 * di ceramica in cima, il cancello di ferro battuto a due ante aperte verso dentro, l'arco di ferro con
 * la scritta, due tratti di muretto a secco, le lanterne. Dalla soglia parte la trazzera, fra due ulivi,
 * verso il podere che cresce sullo sfondo. Al passaggio del puntatore le ante si aprono di più e le lanterne
 * si accendono; il clic porta nell'uliveto.
 * Misure in unità del mondo; −z verso il centro (chi guarda), +z verso il fondo.
 */

/** Quanto è largo: quanto una carta. */
const LARGO = 2.4;
const ALTO_PILASTRO = 2.05;
const LUCE = 1.5; // la luce del cancello, fra i pilastri

const pietra = (colore: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: colore, roughness: 0.95 });

export class Ingresso {
  gruppo = new THREE.Group();
  /** dove si clicca: tutto il varco del cancello */
  presa: THREE.Mesh;
  private ante: THREE.Group[] = [];
  private apertura = 0.95;
  private sopra = false;
  private lanterne: THREE.MeshStandardMaterial[] = [];
  private aloni: THREE.Sprite[] = [];
  private scritta: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private testo = "";
  private notte = false;
  private texture: THREE.Texture[] = [];
  private ulivi: { giorno: THREE.Group; notte: THREE.Group }[] = [];
  private pietre: THREE.MeshStandardMaterial[] = [];

  constructor(raggio: number, notte: boolean) {
    const caso = generatore(808);
    const a = ANGOLO_ULIVETO;
    this.gruppo.position.set(Math.sin(a) * raggio, PELO_ACQUA, -Math.cos(a) * raggio);
    this.gruppo.rotation.y = Math.PI - a;

    const chiara = pietra("#E2D6BC");
    const scura = pietra("#CDBF9F");
    this.pietre.push(chiara, scura);
    const ferro = new THREE.MeshStandardMaterial({ color: "#1E1D1B", roughness: 0.55, metalness: 0.6 });

    // la soglia: una lastra di pietra
    this.gruppo.add(new THREE.Mesh(new THREE.BoxGeometry(LUCE + 0.1, 0.06, 0.55).translate(0, 0.03, 0), scura));

    // i pilastri: blocchi squadrati, il capitello sporgente, la pigna di ceramica
    const X = LUCE / 2 + 0.2;
    [-1, 1].forEach((s) => {
      const blocchi: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 7; k++) {
        const h = ALTO_PILASTRO / 7;
        blocchi.push(new THREE.BoxGeometry(0.4 - (k % 2) * 0.012, h - 0.012, 0.4 - (k % 2) * 0.012).translate(s * X, h * k + h / 2, 0));
      }
      this.gruppo.add(new THREE.Mesh(mergeGeometries(blocchi), chiara));
      blocchi.forEach((b) => b.dispose());
      this.gruppo.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5).translate(s * X, ALTO_PILASTRO + 0.05, 0), scura));
      // la pigna: verde e gialla, sul suo piedistallo
      const pigna = new THREE.Group();
      pigna.position.set(s * X, ALTO_PILASTRO + 0.1, 0);
      pigna.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.08, 16).translate(0, 0.04, 0), new THREE.MeshStandardMaterial({ color: "#E9DCC0", roughness: 0.4 })));
      pigna.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12).scale(1, 1.45, 1).translate(0, 0.22, 0), new THREE.MeshStandardMaterial({ color: "#3F7A4E", roughness: 0.35, metalness: 0.1 })));
      pigna.add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10).translate(0, 0.4, 0), new THREE.MeshStandardMaterial({ color: "#D9A928", roughness: 0.35 })));
      this.gruppo.add(pigna);
      // la lanterna sul fronte del pilastro
      const vetro = new THREE.MeshStandardMaterial({ color: "#2A2620", emissive: "#FFC27A", emissiveIntensity: 0, roughness: 0.3 });
      this.lanterne.push(vetro);
      const l = new THREE.Group();
      l.position.set(s * X, 1.55, -0.24);
      l.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), vetro));
      l.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 4).rotateY(Math.PI / 4).translate(0, 0.125, 0), ferro));
      l.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.08).translate(0, 0.05, 0.08), ferro));
      this.gruppo.add(l);
      const al = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.alone(), color: "#FFC98A", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      al.position.set(s * X, 1.55, -0.3);
      al.scale.setScalar(0.9);
      this.aloni.push(al);
      this.gruppo.add(al);
      // il muretto a secco che continua il pilastro, fino al bordo della carta
      const pietre: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 18; i++) {
        const x = s * (X + 0.24 + (i % 6) * 0.05 + caso() * 0.02);
        pietre.push(new THREE.DodecahedronGeometry(0.08 + caso() * 0.03, 0).scale(1.4, 0.75, 1.1).translate(x, 0.06 + Math.floor(i / 6) * 0.12, (caso() - 0.5) * 0.2));
      }
      this.gruppo.add(new THREE.Mesh(mergeGeometries(pietre), new THREE.MeshStandardMaterial({ color: "#D6CAB0", roughness: 1, flatShading: true })));
      pietre.forEach((p) => p.dispose());
    });

    // le ante del cancello: ferro battuto, sbarre verticali con le punte, due traverse, un ricciolo
    [-1, 1].forEach((s) => {
      const anta = new THREE.Group();
      anta.position.set(s * (LUCE / 2 - 0.02), 0, 0);
      const L = LUCE / 2 - 0.03;
      const pezzi: THREE.BufferGeometry[] = [];
      const H = 1.45;
      for (let k = 0; k <= 8; k++) {
        const x = -s * (0.03 + (k * (L - 0.06)) / 8);
        const h = H + Math.sin((k / 8) * Math.PI) * 0.12 * (s > 0 ? 1 : 1);
        pezzi.push(new THREE.BoxGeometry(0.022, h, 0.022).translate(x, 0.08 + h / 2, 0));
        pezzi.push(new THREE.ConeGeometry(0.024, 0.07, 4).translate(x, 0.08 + h + 0.035, 0));
      }
      for (const y of [0.12, 0.62, 1.3]) pezzi.push(new THREE.BoxGeometry(L, 0.03, 0.03).translate(-s * L / 2, y, 0));
      // i riccioli fra le due traverse alte
      for (let k = 0; k < 3; k++) {
        const r = new THREE.TorusGeometry(0.1, 0.009, 6, 20, Math.PI * 1.5).rotateZ(k * 1.2).translate(-s * (0.18 + k * 0.22), 0.96, 0);
        pezzi.push(r);
      }
      anta.add(new THREE.Mesh(mergeGeometries(pezzi), ferro));
      pezzi.forEach((p) => p.dispose());
      this.ante.push(anta);
      this.gruppo.add(anta);
    });

    // l'arco di ferro sopra il varco, con la targa della scritta
    const arco = new THREE.TorusGeometry(X, 0.018, 6, 40, Math.PI).scale(1, 0.32, 1).translate(0, ALTO_PILASTRO + 0.08, 0);
    this.gruppo.add(new THREE.Mesh(arco, ferro));
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 160;
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(tx);
    this.scritta = { x: cv.getContext("2d") as CanvasRenderingContext2D, t: tx };
    const targa = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5 * (160 / 1024)), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    targa.position.set(0, ALTO_PILASTRO + 0.22, -0.02);
    targa.rotation.y = Math.PI;
    this.gruppo.add(targa);

    // la trazzera: parte dalla soglia e va verso il fondo, fra pietre di bordo
    const strada = new THREE.Mesh(new THREE.PlaneGeometry(LUCE - 0.1, 3.4).rotateX(-Math.PI / 2).translate(0, 0.006, 1.75), new THREE.MeshStandardMaterial({ color: "#D2BE94", roughness: 1 }));
    this.gruppo.add(strada);
    const bordo: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 26; i++) {
      const s = i % 2 ? 1 : -1;
      bordo.push(new THREE.DodecahedronGeometry(0.06 + caso() * 0.02, 0).scale(1.3, 0.6, 1).translate(s * (LUCE / 2 - 0.02), 0.03, 0.35 + Math.floor(i / 2) * 0.26));
    }
    this.gruppo.add(new THREE.Mesh(mergeGeometries(bordo), new THREE.MeshStandardMaterial({ color: "#D6CAB0", roughness: 1, flatShading: true })));
    bordo.forEach((b) => b.dispose());

    // due ulivi dietro i pilastri, ai lati della trazzera
    const forma = [costruisciUlivo(611), costruisciUlivo(2027)];
    [-1, 1].forEach((s, i) => {
      const f = forma[i];
      const g = new THREE.Group();
      // tutti e due dentro e indietro: a destra c'è il podere, nel varco, che non va coperto
      g.position.set(s * (s < 0 ? 1.55 : 0.85), 0, s < 0 ? 2.3 : 2.7);
      g.rotation.y = caso() * Math.PI * 2;
      g.scale.setScalar(0.6);
      const giorno = new THREE.Group();
      giorno.add(
        new THREE.Mesh(f.legnoGeo, new THREE.MeshStandardMaterial({ color: "#6A5E50", roughness: 1, flatShading: true })),
        new THREE.Mesh(f.frondeGeo, new THREE.MeshStandardMaterial({ color: "#7F8C62", roughness: 0.9, flatShading: true }))
      );
      const sera = new THREE.Group();
      sera.add(accesaDaSotto(f.legnoGeo, "#8A7A66", 2.3, 0.85), accesaDaSotto(f.frondeGeo, "#8C9A6C", 2.3, 0.75));
      g.add(giorno, sera);
      this.ulivi.push({ giorno, notte: sera });
      this.gruppo.add(g);
    });

    // dove si clicca
    this.presa = new THREE.Mesh(
      new THREE.BoxGeometry(LARGO, ALTO_PILASTRO + 0.6, 0.8).translate(0, (ALTO_PILASTRO + 0.6) / 2, 0),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    this.presa.userData.olio = true;
    this.gruppo.add(this.presa);
    this.gruppo.traverse((o) => {
      if (o !== this.presa) o.raycast = () => undefined;
    });
    this.setNotte(notte);
  }

  private alone() {
    const t = alone("#FFFFFF");
    this.texture.push(t);
    return t;
  }

  /** La scritta dell'arco: lettere chiare su una targa di ferro scuro bordata d'oro. */
  setTesto(testo: string) {
    if (testo === this.testo) return;
    this.testo = testo;
    const { x, t } = this.scritta;
    x.clearRect(0, 0, 1024, 160);
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim() || "Georgia, serif";
    x.font = `400 92px ${serif}`;
    const l = Math.min(980, x.measureText(testo).width + 120);
    x.fillStyle = "rgba(24,22,19,0.92)";
    x.beginPath();
    x.roundRect(512 - l / 2, 18, l, 124, 16);
    x.fill();
    x.strokeStyle = "#B9A84E";
    x.lineWidth = 5;
    x.stroke();
    x.fillStyle = "#F1E6C8";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(testo, 512, 84, l - 60);
    t.needsUpdate = true;
  }

  evidenzia(si: boolean) {
    this.sopra = si;
  }

  setNotte(notte: boolean) {
    this.notte = notte;
    // di notte la pietra prende un poco di luna, per non sparire nel buio
    this.pietre.forEach((m) => m.emissive.copy(m.color).multiplyScalar(notte ? 0.16 : 0));
    this.ulivi.forEach((u) => {
      u.giorno.visible = !notte;
      u.notte.visible = notte;
    });
  }

  aggiorna(t: number, dt: number) {
    // le ante: socchiuse e invitanti; sotto il puntatore si aprono quasi del tutto
    const meta = this.sopra ? 1.45 : 0.95 + 0.04 * Math.sin(t * 0.8);
    this.apertura += (meta - this.apertura) * Math.min(1, dt * 4);
    this.ante.forEach((a, i) => (a.rotation.y = (i ? 1 : -1) * this.apertura));
    // le lanterne: accese di notte, e di giorno quando ci si passa sopra
    const luce = this.notte ? 1 : this.sopra ? 0.7 : 0;
    this.lanterne.forEach((m) => (m.emissiveIntensity += (luce * 2.2 - m.emissiveIntensity) * Math.min(1, dt * 5)));
    this.aloni.forEach((s) => (s.material.opacity += (luce * (0.55 + 0.05 * Math.sin(t * 9)) - s.material.opacity) * Math.min(1, dt * 5)));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
