import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANGOLO_ULIVETO } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { alone, generatore, liberaTutto } from "./comuni";
import { accesaDaSotto, costruisciUlivo } from "./ulivo";
import { pezziDi } from "./polyhaven";

/*
 * L'ingresso dell'uliveto, al posto di una carta sull'anello, subito dopo la zona dello sviluppatore.
 * Un cancello di campagna che poggia sullo specchio d'acqua: due pilastri di pietra chiara con le pigne
 * di ceramica in cima, il cancello di ferro battuto a due ante aperte verso dentro, l'arco di ferro con
 * la scritta, due tratti di muretto a secco, le lanterne. Dalla soglia parte la trazzera, fra due ulivi,
 * verso il podere che cresce sullo sfondo. Al passaggio del puntatore le ante si aprono di più e le lanterne
 * si accendono; il clic porta nell'uliveto.
 * Dal catalogo di Poly Haven (CC0), ridotti per il web in public/stanza e public/olio/scena:
 *   cancello.glb          ← large_iron_gate, le due ante di ferro battuto (si caricano dopo: fino ad allora restano le nostre)
 *   lanterna.glb          ← Lantern_01, la lanterna d'ottone sul fronte dei pilastri
 *   pilastro-*.webp       ← sandstone_blocks_08, la pietra squadrata dei pilastri
 *   capitello-colore.webp ← sandstone_cracks, capitelli e soglia
 *   muretto-*, trazzera-* ← stone_wall e dirt_floor, gli stessi dell'uliveto
 * Misure in unità del mondo; −z verso il centro (chi guarda), +z verso il fondo.
 */

/** Quanto è largo: quanto una carta. */
const LARGO = 2.4;
const ALTO_PILASTRO = 2.05;
const LUCE = 1.5; // la luce del cancello, fra i pilastri

/** Una texture che si ripete, caricata da public. */
function foto(url: string, colore = true) {
  const t = new THREE.TextureLoader().load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (colore) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Una scatola con le coordinate di texture in metri: la foto si ripete ogni `passo` metri su ogni faccia,
 * invece di stirarsi da un angolo all'altro.
 */
function scatola(l: number, a: number, p: number, passo: number) {
  const g = new THREE.BoxGeometry(l, a, p);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // le facce, quattro vertici ciascuna: +x, −x, +y, −y, +z, −z
  const misure: [number, number][] = [[p, a], [p, a], [l, p], [l, p], [l, a], [l, a]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, (uv.getX(i) * misure[f][0]) / passo, (uv.getY(i) * misure[f][1]) / passo);
  }
  return g;
}

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
  private portalanterne: { g: THREE.Group; vetro: THREE.MeshStandardMaterial }[] = [];
  private vivo = true;

  constructor(raggio: number, notte: boolean) {
    const caso = generatore(808);
    const a = ANGOLO_ULIVETO;
    this.gruppo.position.set(Math.sin(a) * raggio, PELO_ACQUA, -Math.cos(a) * raggio);
    this.gruppo.rotation.y = Math.PI - a;

    // la pietra dei pilastri, squadrata, e quella liscia di capitelli e soglia; il colore serve di notte
    const chiara = new THREE.MeshStandardMaterial({ map: foto("/stanza/pilastro-colore.webp"), normalMap: foto("/stanza/pilastro-rilievo.webp", false), roughness: 0.95 });
    chiara.userData.notte = new THREE.Color("#E2D6BC");
    const scura = new THREE.MeshStandardMaterial({ map: foto("/stanza/capitello-colore.webp"), color: "#F2E8D8", roughness: 0.95 });
    scura.userData.notte = new THREE.Color("#CDBF9F");
    this.pietre.push(chiara, scura);
    const ferro = new THREE.MeshStandardMaterial({ color: "#1E1D1B", roughness: 0.55, metalness: 0.6 });
    // il muretto a secco, la stessa pietra dell'uliveto
    const muro = new THREE.MeshStandardMaterial({ map: foto("/olio/scena/muretto-colore.webp"), normalMap: foto("/olio/scena/muretto-rilievo.webp", false), color: "#FFF6E6", roughness: 1 });
    muro.userData.notte = new THREE.Color("#D6CAB0");
    this.pietre.push(muro);

    // la soglia: una lastra di pietra
    this.gruppo.add(new THREE.Mesh(scatola(LUCE + 0.1, 0.06, 0.55, 0.8).translate(0, 0.03, 0), scura));

    // i pilastri: blocchi squadrati, il capitello sporgente, la pigna di ceramica
    const X = LUCE / 2 + 0.2;
    [-1, 1].forEach((s) => {
      // un blocco solo: i conci li disegna la foto, un metro e venti per ripetizione
      this.gruppo.add(new THREE.Mesh(scatola(0.4, ALTO_PILASTRO, 0.4, 1.2).translate(s * X, ALTO_PILASTRO / 2, 0), chiara));
      this.gruppo.add(new THREE.Mesh(scatola(0.5, 0.1, 0.5, 0.6).translate(s * X, ALTO_PILASTRO + 0.05, 0), scura));
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
      this.portalanterne.push({ g: l, vetro });
      const al = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.alone(), color: "#FFC98A", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      al.position.set(s * X, 1.55, -0.3);
      al.scale.setScalar(0.9);
      this.aloni.push(al);
      this.gruppo.add(al);
      // il muretto a secco che continua il pilastro, fino al bordo della carta
      this.gruppo.add(new THREE.Mesh(scatola(0.36, 0.34, 0.3, 0.8).translate(s * (X + 0.38), 0.17, 0), muro));
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
    const terra = foto("/olio/scena/trazzera-colore.webp");
    terra.repeat.set(0.7, 1.7);
    const strada = new THREE.Mesh(new THREE.PlaneGeometry(LUCE - 0.1, 3.4).rotateX(-Math.PI / 2).translate(0, 0.006, 1.75), new THREE.MeshStandardMaterial({ map: terra, color: "#F4E6CC", roughness: 1 }));
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
    this.caricaModelli();
  }

  /**
   * Le ante di ferro battuto e le lanterne d'ottone di Poly Haven, al posto delle nostre appena arrivano.
   * Ferro e ottone poco metallici: la stanza non ha un ambiente da riflettere, e il metallo pieno uscirebbe nero.
   */
  private caricaModelli() {
    const opaco = (m: THREE.Material) => {
      const c = (m as THREE.MeshStandardMaterial).clone();
      c.metalnessMap = null;
      c.metalness = 0.15;
      c.transparent = false;
      return c;
    };
    const senzaRaggi = (o: THREE.Object3D) => (o.raycast = () => undefined);
    pezziDi("/stanza/cancello.glb")
      .then((p) => {
        if (!this.vivo) return;
        // le ante del modello sono alte 2,92 e larghe 1,43, coi cardini sui bordi esterni: a metà sono le nostre
        this.ante.forEach((anta, i) => {
          const s = i ? 1 : -1;
          const pezzo = p.find((x) => x.nome.endsWith(s < 0 ? "left_door" : "right_door"));
          if (!pezzo) return;
          const g = pezzo.geometria.clone().translate(-s * 1.43, 0, 0).scale(0.5, 0.5, 0.5);
          anta.children.forEach((c) => {
            (c as THREE.Mesh).geometry?.dispose();
          });
          anta.clear();
          const m = new THREE.Mesh(g, opaco(pezzo.materiale));
          senzaRaggi(m);
          anta.add(m);
        });
      })
      .catch(() => undefined);
    pezziDi("/stanza/lanterna.glb")
      .then((p) => {
        if (!this.vivo) return;
        const corpo = p.find((x) => !x.nome.includes("glass"));
        const vetro = p.find((x) => x.nome.includes("glass"));
        if (!corpo || !vetro) return;
        this.portalanterne.forEach(({ g, vetro: luce }) => {
          g.children.forEach((c) => (c as THREE.Mesh).geometry?.dispose());
          g.clear();
          // in piedi su una mensola di ferro, poco sotto dov'era la nostra
          const scala = 1.15;
          const ottone = new THREE.Mesh(corpo.geometria.clone().scale(scala, scala, scala).translate(0, -0.1, -0.02), opaco(corpo.materiale));
          const lume = new THREE.Mesh(vetro.geometria.clone().scale(scala, scala, scala).translate(0, -0.1, -0.02), luce);
          const mensola = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16).translate(0, -0.11, 0.0), new THREE.MeshStandardMaterial({ color: "#1E1D1B", roughness: 0.6, metalness: 0.3 }));
          [ottone, lume, mensola].forEach(senzaRaggi);
          g.add(ottone, lume, mensola);
        });
      })
      .catch(() => undefined);
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
    this.pietre.forEach((m) => m.emissive.copy((m.userData.notte as THREE.Color | undefined) ?? m.color).multiplyScalar(notte ? 0.16 : 0));
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
    this.vivo = false;
    liberaTutto(this.gruppo, this.texture);
  }
}
