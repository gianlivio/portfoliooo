import * as THREE from "three";
import { mondo } from "../condivisi";
import { POSIZIONI, collocaZona } from "../zona";
import { alone, casuale, liberaTutto, loft, ombra, tela } from "./comuni";
import { Scrivania } from "./scrivania";

/**
 * La zona dello sviluppatore, il centro del mondo: la scrivania e, intorno, tutto piccolo e in scala con lui:
 * la drum machine sul piano (l'interruttore dell'audio), un pannello di legno con la mensola dei due libri
 * e lo schiacciasogni, e Romero che dorme sulla sua cuccia. Il cassetto aperto è in components/Portale.tsx.
 * Le misure sono in metri, nelle coordinate della scrivania (vedi components/zona.ts).
 * Con "riduci movimento" la zona resta, ferma: niente si muove, ma libri e drum machine si possono cliccare.
 */

/** I due libri della mensola: dorso, spirale in copertina, pagina Amazon. */
export const LIBRI = [
  {
    dorso: "Sottilissimi strati di un enorme croissant — V1",
    spirale: "#3E9B5A",
    url: "https://www.amazon.it/Sottilissimi-Strati-Enorme-Croissant-Gianlivio-ebook/dp/B0DVZH2S3Q",
  },
  {
    dorso: "Sottilissimi strati di un enorme croissant — V2",
    spirale: "#3A9AD9",
    url: "https://www.amazon.it/Sottilissimi-Strati-Enorme-Croissant-v-2-ebook/dp/B0DX2MM9FV",
  },
];

/** Cosa succede cliccando un oggetto della zona: lo legge Scena dagli userData. */
export type Azione = { tipo: "drum" } | { tipo: "libro"; indice: number };

const PARETE_GIORNO = "#E4DED3";
const PARETE_NOTTE = "#2A2A2F";

/* ------------------------------------------------------------- drum machine */

class Drum {
  gruppo = new THREE.Group();
  private x: CanvasRenderingContext2D;
  private t: THREE.CanvasTexture;
  private acceso = -1;
  private quarto = -1;

  constructor(private texture: THREE.Texture[]) {
    const L = 0.26, A = 0.045, P = 0.17;
    const c = document.createElement("canvas");
    c.width = 260;
    c.height = 170;
    this.x = c.getContext("2d") as CanvasRenderingContext2D;
    this.t = new THREE.CanvasTexture(c);
    this.t.colorSpace = THREE.SRGBColorSpace;
    this.t.anisotropy = 4;
    texture.push(this.t);
    const scocca = new THREE.MeshStandardMaterial({ color: "#2A2B30", roughness: 0.55, metalness: 0.2 });
    const sopra = new THREE.MeshBasicMaterial({ map: this.t, toneMapped: false });
    // il corpo appena inclinato verso chi suona, come le macchine vere
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(L, A, P), [scocca, scocca, sopra, scocca, scocca, scocca]);
    corpo.position.y = A / 2;
    corpo.rotation.x = -0.06;
    this.gruppo.add(corpo);
    // un'area di clic un po' più grande della scatola: sullo schermo è piccola
    const presa = new THREE.Mesh(
      new THREE.BoxGeometry(L * 1.6, 0.14, P * 1.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    presa.position.y = 0.06;
    presa.userData.azione = { tipo: "drum" } satisfies Azione;
    this.gruppo.add(presa);
    this.disegna(false, -1);
  }

  /** Il pannello: display "MALA CARNE · 130 BPM", sedici pad, quattro manopole. */
  private disegna(acceso: boolean, quarto: number) {
    const x = this.x;
    x.fillStyle = "#24252A";
    x.fillRect(0, 0, 260, 170);
    // display
    x.fillStyle = acceso ? "#0E1A12" : "#101413";
    x.fillRect(12, 12, 150, 34);
    x.fillStyle = acceso ? "#8CF5A8" : "#4E7A5B";
    x.font = "600 13px ui-monospace, monospace";
    x.textBaseline = "middle";
    x.fillText("MALA CARNE · 130 BPM", 18, 29);
    // manopole
    for (let k = 0; k < 4; k++) {
      x.fillStyle = "#3A3C42";
      x.beginPath();
      x.arc(180 + (k % 2) * 34, 20 + Math.floor(k / 2) * 22, 9, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = "#C9CCD2";
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(180 + (k % 2) * 34, 20 + Math.floor(k / 2) * 22);
      x.lineTo(180 + (k % 2) * 34 + 6 * Math.cos(k * 1.3), 20 + Math.floor(k / 2) * 22 - 6 * Math.sin(k * 1.3 + 1));
      x.stroke();
    }
    // pad: a loop acceso si accende la colonna del quarto che suona
    const colori = ["#E8774D", "#E8C14D", "#5DB8E8", "#9C7BE8"];
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) {
        const su = acceso && k === quarto;
        x.fillStyle = su ? colori[r] : "#3B3D44";
        x.fillRect(14 + k * 61, 58 + r * 27, 52, 21);
        if (su) {
          x.fillStyle = "rgba(255,255,255,0.35)";
          x.fillRect(14 + k * 61, 58 + r * 27, 52, 4);
        }
      }
    }
    this.t.needsUpdate = true;
  }

  aggiorna() {
    const b = mondo.battito;
    const acceso = b.attivo ? 1 : 0;
    const quarto = b.attivo ? b.n % 4 : -1;
    if (acceso !== this.acceso || quarto !== this.quarto) {
      this.acceso = acceso;
      this.quarto = quarto;
      this.disegna(!!acceso, quarto);
    }
  }
}

/* -------------------------------------------------- pannello, mensola, libri */

function dorso(testo: string, colore: string) {
  return tela(1008, 144, (x) => {
    x.fillStyle = "#F1ECE2";
    x.fillRect(0, 0, 1008, 144);
    x.fillStyle = colore;
    x.fillRect(0, 0, 18, 144);
    x.fillRect(990, 0, 18, 144);
    x.fillStyle = "#1E1F23";
    x.font = "400 50px Georgia, serif";
    x.textBaseline = "middle";
    x.textAlign = "center";
    x.fillText(testo, 504, 76, 940);
  });
}

function copertina(colore: string) {
  return tela(512, 366, (x) => {
    x.fillStyle = "#F1ECE2";
    x.fillRect(0, 0, 512, 366);
    // la spirale: archimedea, larga, che parte dal centro
    x.strokeStyle = colore;
    x.lineWidth = 9;
    x.lineCap = "round";
    x.beginPath();
    for (let a = 0; a < Math.PI * 9; a += 0.05) {
      const r = 6 + a * 5.4;
      const px = 256 + Math.cos(a) * r, py = 183 + Math.sin(a) * r * 0.92;
      if (a === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
  });
}

/** Il titolo del libro, che compare sopra il libro quando ci si passa sopra. */
function cartello(testo: string) {
  const t = tela(1024, 96, (x) => {
    x.fillStyle = "rgba(14,15,18,0.82)";
    x.beginPath();
    x.roundRect(0, 6, 1024, 84, 42);
    x.fill();
    x.fillStyle = "#F3F1EB";
    x.font = "400 40px Georgia, serif";
    x.textBaseline = "middle";
    x.textAlign = "center";
    x.fillText(testo, 512, 50, 980);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  s.scale.set(1.15, 1.15 * (96 / 1024), 1);
  s.renderOrder = 30;
  s.visible = false;
  return s;
}

class Pannello {
  gruppo = new THREE.Group();
  private legno: THREE.MeshStandardMaterial;
  cartelli: THREE.Sprite[] = [];

  constructor(texture: THREE.Texture[]) {
    const p = POSIZIONI.pannello;
    this.legno = new THREE.MeshStandardMaterial({ color: PARETE_GIORNO, roughness: 0.9 });
    const tavola = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.62, 0.035), this.legno);
    tavola.position.set(p.x, 0.81, p.z);
    this.gruppo.add(tavola);
    // due piedi, perché stia in piedi da solo
    const nero = new THREE.MeshStandardMaterial({ color: "#1B1C1F", roughness: 0.6 });
    for (const dx of [-0.26, 0.26]) {
      const piede = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.3), nero);
      piede.position.set(p.x + dx, 0.015, p.z);
      this.gruppo.add(piede);
    }
    // la mensola, coi due reggimensola
    const Y = 0.98;
    const ripiano = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.2), nero);
    ripiano.position.set(p.x, Y, p.z - 0.12);
    this.gruppo.add(ripiano);
    for (const dx of [-0.24, 0.24]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.15).translate(0, -0.045, 0), nero);
      r.position.set(p.x + dx, Y - 0.012, p.z - 0.095);
      this.gruppo.add(r);
    }
    // i libri, distesi, col dorso verso chi guarda
    const pagine = new THREE.MeshStandardMaterial({ color: "#EDE6D6", roughness: 0.9 });
    LIBRI.forEach((l, i) => {
      const txD = dorso(l.dorso, l.spirale);
      const txC = copertina(l.spirale);
      texture.push(txD, txC);
      const fronte = new THREE.MeshStandardMaterial({ map: txC, roughness: 0.8 });
      const retro = new THREE.MeshStandardMaterial({ color: "#F1ECE2", roughness: 0.8 });
      const schiena = new THREE.MeshStandardMaterial({ map: txD, roughness: 0.8 });
      const libro = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.15), [pagine, pagine, fronte, retro, pagine, schiena]);
      libro.position.set(p.x - 0.14 + i * 0.27, Y + 0.0125 + 0.015, p.z - 0.15);
      libro.rotation.y = i ? -0.07 : 0.05;
      libro.userData.azione = { tipo: "libro", indice: i } satisfies Azione;
      this.gruppo.add(libro);
      const c = cartello(l.dorso);
      c.position.set(libro.position.x, Y + 0.17, libro.position.z - 0.05);
      texture.push(c.material.map as THREE.Texture);
      this.gruppo.add(c);
      this.cartelli.push(c);
    });
  }

  setNotte(notte: boolean) {
    this.legno.color.set(notte ? PARETE_NOTTE : PARETE_GIORNO);
  }
}

/* ------------------------------------------------------------ schiacciasogni */

class Schiacciasogni {
  gruppo = new THREE.Group();
  private appeso = new THREE.Group();
  private luccichio: THREE.Sprite;
  private piume: THREE.Group[] = [];

  constructor(texture: THREE.Texture[]) {
    const p = POSIZIONI.pannello;
    // appeso a un chiodo sul pannello, dalla parte dello sviluppatore
    this.gruppo.position.set(p.x + 0.17, 1.58, p.z - 0.03);
    this.gruppo.add(this.appeso);
    const cuoio = new THREE.MeshStandardMaterial({ color: "#7A4E2C", roughness: 0.8 });
    const R = 0.1;
    const cerchio = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 6, 36), cuoio);
    cerchio.position.y = -0.06 - R;
    this.appeso.add(cerchio);
    // il filo da cui pende e la ragnatela: una spirale che si stringe agganciata a otto punti
    const linee: number[] = [0, 0, 0, 0, -0.06, 0];
    const C = new THREE.Vector3(0, -0.06 - R, 0);
    let prima: THREE.Vector3 | null = null;
    for (let k = 0; k <= 40; k++) {
      const a = (k / 8) * Math.PI * 2;
      const r = R * (1 - k / 48);
      const q = new THREE.Vector3(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r, 0);
      if (prima) linee.push(prima.x, prima.y, prima.z, q.x, q.y, q.z);
      prima = q;
    }
    const piume: [number, number][] = [[-0.065, 0.11], [0, 0.14], [0.065, 0.11]];
    piume.forEach(([dx, l]) => {
      const da = new THREE.Vector3(C.x + dx, C.y - Math.sqrt(R * R - dx * dx), 0);
      linee.push(da.x, da.y, 0, da.x, da.y - l * 0.5, 0);
    });
    const ragnatela = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linee, 3)),
      new THREE.LineBasicMaterial({ color: "#D9CDB8", transparent: true, opacity: 0.85 })
    );
    this.appeso.add(ragnatela);
    const perlina = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: "#2F7FA8", roughness: 0.2, metalness: 0.3 }));
    perlina.position.copy(C);
    this.appeso.add(perlina);
    // tre piume, appese ai fili sotto il cerchio
    const txPiuma = tela(64, 256, (x) => {
      x.fillStyle = "#E9E2D3";
      x.beginPath();
      x.moveTo(32, 4);
      x.quadraticCurveTo(60, 90, 34, 250);
      x.lineTo(30, 250);
      x.quadraticCurveTo(4, 90, 32, 4);
      x.fill();
      x.strokeStyle = "#8A7A64";
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(32, 6);
      x.lineTo(32, 252);
      x.stroke();
      x.fillStyle = "#6B4A33";
      x.fillRect(22, 180, 20, 16);
    });
    texture.push(txPiuma);
    const matPiuma = new THREE.MeshStandardMaterial({ map: txPiuma, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 });
    piume.forEach(([dx, l]) => {
      const g = new THREE.Group();
      g.position.set(C.x + dx, C.y - Math.sqrt(R * R - dx * dx) - l * 0.5, 0.003);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.12).translate(0, -0.06, 0), matPiuma);
      g.add(m);
      this.appeso.add(g);
      this.piume.push(g);
    });
    // il riflesso delle stelle sulla perlina: di notte, ogni tanto
    const tx = alone("#DDE8FF");
    texture.push(tx);
    this.luccichio = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.luccichio.scale.setScalar(0.09);
    this.luccichio.position.copy(C).add(new THREE.Vector3(0.004, 0.004, 0.012));
    this.appeso.add(this.luccichio);
  }

  aggiorna(t: number, notte: boolean) {
    if (!notte) {
      this.appeso.rotation.z = 0;
      this.luccichio.material.opacity = 0;
      this.piume.forEach((p) => (p.rotation.z = 0));
      return;
    }
    // di notte oscilla appena, come per un filo d'aria
    this.appeso.rotation.z = Math.sin(t * 0.55) * 0.05 + Math.sin(t * 1.3) * 0.015;
    this.piume.forEach((p, i) => (p.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.12));
    const scintilla = Math.pow(Math.max(0, Math.sin(t * 0.83) * Math.sin(t * 0.31 + 1)), 6);
    this.luccichio.material.opacity = 0.15 + scintilla * 0.85;
    this.luccichio.scale.setScalar(0.06 + scintilla * 0.07);
  }
}

/* -------------------------------------------------------------------- Romero */

/** Piega lungo un arco una geometria fatta lungo z: il corpo si arrotola su sé stesso. */
function piega(g: THREE.BufferGeometry, raggio: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = z / raggio;
    const r = raggio - x;
    pos.setXYZ(i, raggio - r * Math.cos(a), pos.getY(i), r * Math.sin(a));
  }
  g.computeVertexNormals();
  return g;
}

/** Un punto e la direzione dell'arco a una certa distanza lungo la schiena. */
function sullArco(z: number, raggio: number, x = 0) {
  const a = z / raggio;
  const r = raggio - x;
  return { p: new THREE.Vector3(raggio - r * Math.cos(a), 0, r * Math.sin(a)), rotta: a };
}

/**
 * Romero, un cane corso grigio, raggomitolato sulla cuccia: corpo massiccio piegato a C,
 * la testa larga col muso corto appoggiata sulle zampe davanti, le orecchie piccole e ripiegate,
 * la coda lungo il fianco. Respira; ogni tanto muove un orecchio o la punta della coda.
 * Quando si apre il modulo alza la testa, guarda, e la riabbassa.
 */
class Romero {
  gruppo = new THREE.Group();
  private corpo: THREE.Mesh;
  private testa = new THREE.Group();
  private orecchie: THREE.Mesh[] = [];
  private coda = new THREE.Group();
  private s = { orecchio: 4, orecchioT: -10, quale: 0, coda: 7, codaT: -10, alzata: -10, modulo: false };

  constructor(texture: THREE.Texture[]) {
    const c = POSIZIONI.cuccia;
    this.gruppo.position.set(c.x, 0, c.z);
    // la cuccia: un cuscino tondo col bordo rialzato
    const stoffa = new THREE.MeshStandardMaterial({ color: "#7D5E48", roughness: 0.95 });
    const fondo = new THREE.MeshStandardMaterial({ color: "#9A7A60", roughness: 1 });
    const cuscino = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.08, 32), fondo);
    cuscino.position.y = 0.04;
    this.gruppo.add(cuscino);
    const bordo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 10, 40).rotateX(Math.PI / 2), stoffa);
    bordo.position.y = 0.08;
    bordo.scale.set(1, 1, 0.85);
    this.gruppo.add(bordo);
    const txOmbra = ombra();
    texture.push(txOmbra);
    const om = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: 0.6, depthWrite: false }));
    om.position.y = 0.002;
    this.gruppo.add(om);

    // il mantello: grigio piombo, appena più scuro sul dorso e sulla maschera
    const pelo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
    const grigio = new THREE.Color("#6E7077"), scuro = new THREE.Color("#55575E"), ventre = new THREE.Color("#85878D");
    const tinta = (_k: number, ang: number) => {
      const su = Math.sin(ang);
      return su > 0.4 ? scuro : su < -0.3 ? ventre : grigio;
    };

    const cane = new THREE.Group();
    cane.position.set(-0.24, 0.075, 0.1);
    cane.rotation.y = 0.55;
    cane.scale.setScalar(1.18);
    this.gruppo.add(cane);
    const RC = 0.3;
    // il corpo, lungo z dalla groppa (−) al petto (+), poi piegato a C
    const g = loft([
      { z: -0.36, l: 0.03, su: 0.03, y: 0.1 },
      { z: -0.32, l: 0.12, su: 0.11, giu: 0.06, y: 0.1 },
      { z: -0.2, l: 0.16, su: 0.15, giu: 0.07, y: 0.1, n: 2.3 },
      { z: -0.02, l: 0.14, su: 0.13, giu: 0.06, y: 0.09, n: 2.3 },
      { z: 0.14, l: 0.155, su: 0.15, giu: 0.07, y: 0.1, n: 2.3 },
      { z: 0.26, l: 0.13, su: 0.13, giu: 0.06, y: 0.11 },
      { z: 0.34, l: 0.09, su: 0.09, giu: 0.05, y: 0.12 },
    ], { radiali: 18, passi: 4, colore: tinta });
    this.corpo = new THREE.Mesh(piega(g, RC), pelo);
    cane.add(this.corpo);

    // la coscia di dietro, che sporge sopra il fianco esterno
    const coscia = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10).scale(1.15, 0.9, 1.3), pelo);
    const cA = sullArco(-0.22, RC, -0.09);
    coscia.position.copy(cA.p).setY(0.15);
    coscia.rotation.y = cA.rotta;
    this.colora(coscia.geometry, grigio);
    cane.add(coscia);

    // le zampe davanti, distese sul cuscino sotto il muso
    const zampa = (z: number, x: number, lungo: number) => {
      const z0 = sullArco(z, RC, x);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, lungo, 4, 8).rotateX(Math.PI / 2).translate(0, 0, lungo / 2), pelo);
      this.colora(m.geometry, grigio);
      m.position.copy(z0.p).setY(0.035);
      m.rotation.y = z0.rotta + 0.25;
      cane.add(m);
    };
    zampa(0.3, 0.06, 0.24);
    zampa(0.26, -0.05, 0.22);
    // la zampa di dietro ripiegata verso la testa
    zampa(-0.12, -0.15, 0.16);

    // la testa: cranio largo e piatto, stop marcato, muso corto e squadrato, guance piene
    const tA = sullArco(0.5, RC, 0.02);
    this.testa.position.copy(tA.p).setY(0.11);
    this.testa.rotation.y = tA.rotta + 0.3;
    cane.add(this.testa);
    const gt = loft([
      { z: -0.1, l: 0.02, su: 0.02 },
      { z: -0.07, l: 0.095, su: 0.08, giu: 0.07 },
      { z: 0.0, l: 0.11, su: 0.085, giu: 0.08, n: 2.4 },
      { z: 0.06, l: 0.1, su: 0.07, giu: 0.08, n: 2.6 },
      { z: 0.1, l: 0.085, su: 0.045, giu: 0.075, y: -0.015, n: 3 },
      { z: 0.155, l: 0.075, su: 0.04, giu: 0.06, y: -0.02, n: 3.2 },
      { z: 0.18, l: 0.05, su: 0.03, giu: 0.04, y: -0.02, n: 3 },
    ], {
      radiali: 18, passi: 3,
      colore: (k) => (k > 0.62 ? new THREE.Color("#2F3034") : k > 0.48 ? scuro : grigio),
    });
    this.testa.add(new THREE.Mesh(gt, pelo));
    // il tartufo nero
    const naso = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8).scale(1.2, 0.8, 0.7), new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.35 }));
    naso.position.set(0, -0.005, 0.18);
    this.testa.add(naso);
    // le palpebre chiuse: due trattini scuri
    for (const s of [-1, 1]) {
      const occhio = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.006), new THREE.MeshBasicMaterial({ color: "#18181B" }));
      occhio.position.set(s * 0.05, 0.035, 0.085);
      occhio.rotation.set(-0.5, s * 0.35, 0);
      this.testa.add(occhio);
    }
    // le orecchie: triangoli piccoli, ripiegati in avanti sulle tempie
    // le orecchie: lembi triangolari che ricadono sulle tempie, non dritte
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.085, 3).scale(1, 1, 0.3), pelo);
      this.colora(o.geometry, scuro);
      o.geometry.translate(0, -0.045, 0);
      o.position.set(s * 0.1, 0.055, -0.035);
      o.rotation.set(0.15, 0, s * 0.35);
      this.testa.add(o);
      this.orecchie.push(o);
    }

    // la coda, lungo il fianco verso le zampe
    const cC = sullArco(-0.34, RC, 0.02);
    this.coda.position.copy(cC.p).setY(0.1);
    this.coda.rotation.y = cC.rotta - 1.9;
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, -0.05, 0.12), new THREE.Vector3(0.0, -0.07, 0.26), new THREE.Vector3(-0.08, -0.07, 0.36),
    ]);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 12, 0.022, 6), pelo);
    this.colora(tubo.geometry, grigio);
    this.coda.add(tubo);
    cane.add(this.coda);

    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  private colora(g: THREE.BufferGeometry, c: THREE.Color) {
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }

  aggiorna(t: number) {
    const s = this.s;
    // il respiro, lento, del sonno profondo
    const r = Math.sin(t * 1.4);
    this.corpo.scale.set(1 + r * 0.012, 1 + r * 0.025, 1);
    // un orecchio che scatta
    if (t > s.orecchio) {
      s.orecchioT = t;
      s.quale = Math.random() < 0.5 ? 0 : 1;
      s.orecchio = t + casuale(5, 11);
    }
    this.orecchie.forEach((o, i) => {
      const e = t - s.orecchioT;
      const scatto = i === s.quale && e < 0.45 ? Math.sin((e / 0.45) * Math.PI * 2) * Math.exp(-e * 4) : 0;
      o.rotation.x = 0.15 + scatto * 0.7;
    });
    // la punta della coda che batte due volte
    if (t > s.coda) {
      s.codaT = t;
      s.coda = t + casuale(8, 16);
    }
    const ec = t - s.codaT;
    this.coda.rotation.z = ec < 1 ? Math.sin(ec * Math.PI * 4) * 0.18 * (1 - ec) : 0;
    // il modulo si apre: alza la testa, guarda, la riabbassa
    if (mondo.modulo && !s.modulo) s.alzata = t;
    s.modulo = mondo.modulo;
    const ea = t - s.alzata;
    const su = ea < 0 ? 0 : ea < 0.6 ? morbido(ea / 0.6) : ea < 2.6 ? 1 : ea < 3.8 ? 1 - morbido((ea - 2.6) / 1.2) : 0;
    this.testa.rotation.x = -su * 0.55;
    this.testa.position.y = 0.11 + su * 0.09;
  }
}

const morbido = (k: number) => k * k * (3 - 2 * k);

/* ---------------------------------------------------------------------- zona */

export class Zona {
  gruppo = new THREE.Group();
  private scrivania: Scrivania;
  private drum: Drum;
  private pannello: Pannello;
  private schiacciasogni: Schiacciasogni;
  private romero: Romero;
  private texture: THREE.Texture[] = [];
  private notte: boolean;

  constructor(notte: boolean) {
    this.notte = notte;
    collocaZona(this.gruppo);
    this.scrivania = new Scrivania(notte);
    this.gruppo.add(this.scrivania.gruppo);
    this.drum = new Drum(this.texture);
    this.drum.gruppo.position.copy(POSIZIONI.drum);
    this.gruppo.add(this.drum.gruppo);
    this.pannello = new Pannello(this.texture);
    this.gruppo.add(this.pannello.gruppo);
    this.schiacciasogni = new Schiacciasogni(this.texture);
    this.gruppo.add(this.schiacciasogni.gruppo);
    this.romero = new Romero(this.texture);
    this.gruppo.add(this.romero.gruppo);
    this.pannello.setNotte(notte);
    // solo libri e drum machine rispondono al puntatore
    this.gruppo.traverse((o) => {
      if (!o.userData.azione) o.raycast = () => undefined;
    });
  }

  setNotte(notte: boolean) {
    this.notte = notte;
    this.scrivania.setNotte(notte);
    this.pannello.setNotte(notte);
  }

  /** Il titolo di un libro sopra il libro, al passaggio del puntatore. */
  mostraTitolo(indice: number | null) {
    this.pannello.cartelli.forEach((c, i) => (c.visible = i === indice));
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera, ridotto: boolean) {
    this.drum.aggiorna();
    if (ridotto) return;
    this.scrivania.aggiorna(t, dt);
    this.schiacciasogni.aggiorna(t, this.notte);
    this.romero.aggiorna(t);
    void camera;
  }

  libera() {
    this.scrivania.libera();
    liberaTutto(this.gruppo, this.texture);
  }
}
