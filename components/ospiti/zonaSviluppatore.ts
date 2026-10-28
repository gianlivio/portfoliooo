import * as THREE from "three";
import { mondo } from "../condivisi";
import { POSIZIONI, collocaZona } from "../zona";
import { alone, liberaTutto, tela } from "./comuni";
import { Scrivania } from "./scrivania";
import { granaLegno } from "./polyhaven";
import { CameraDiLivio } from "./cameraLivio";

/**
 * La zona dello sviluppatore, il centro del mondo: la scrivania e, intorno, tutto piccolo e in scala con lui:
 * la drum machine sul piano (l'interruttore dell'audio), un pannello di legno con la mensola dei due libri
 * e lo schiacciasogni, e un tavolino con le macchine del suono e il rack modulare; alle spalle le cose della
 * camera di Livio (ospiti/cameraLivio.ts): la parete con le chitarre e le maschere, il giradischi, il piano,
 * il Mook Jong, la libreria. Il cassetto aperto è in components/Portale.tsx.
 * Le misure sono in metri, nelle coordinate della scrivania (vedi components/zona.ts).
 * Con "riduci movimento" la zona resta, ferma: niente si muove, ma libri e drum machine si possono cliccare.
 */

/** I due libri della mensola: dorso, spirale in copertina, pagina Amazon. */
const TITOLO = "Sottilissimi strati di un enorme croissant";

/** I tre libri: stesso titolo; il secondo e il terzo hanno in più la versione. Rosso, verde, azzurro. */
export const LIBRI = [
  {
    titolo: TITOLO,
    versione: "",
    colore: "#C6462F",
    url: "https://www.amazon.it/Sottilissimi-Strati-Enorme-Croissant-Gianlivio-ebook/dp/B0DVZH2S3Q",
  },
  {
    titolo: TITOLO,
    versione: "v.2",
    colore: "#3E9B5A",
    url: "https://www.amazon.it/Sottilissimi-Strati-Enorme-Croissant-v-2-ebook/dp/B0DX2MM9FV",
  },
  {
    titolo: TITOLO,
    versione: "v.3",
    colore: "#3A9AD9",
    url: "https://www.amazon.it/dp/B0DXQB4KK9",
  },
];
const nomeLibro = (l: (typeof LIBRI)[number]) => (l.versione ? `${l.titolo} ${l.versione}` : l.titolo);

/** Cosa succede cliccando un oggetto della zona: lo legge Scena dagli userData. */
export type Azione = { tipo: "drum" } | { tipo: "libro"; indice: number };


/* -------------------------------------------- lo studietto con le macchine */

/** Una tela che diventa la faccia di sopra di una macchina; si ridisegna quando cambiano le luci. */
function faccia(l: number, a: number, texture: THREE.Texture[]) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texture.push(t);
  return { x, t, l, a };
}

type Faccia = ReturnType<typeof faccia>;
const ACCESI = ["#FF4D3A", "#FFB23A", "#F5E04A", "#5BE36B", "#3AC8FF", "#9C6BFF"];

/**
 * Lo studietto: un tavolo a due piani con le macchine che Livio usava davvero quando suonava. Sul piano basso
 * le due macchine a cerchi (il sequencer coi passi in tondo) e l'Electribe rosa; sul piano alto il Kaoss Pad col
 * riquadro rosso, il Volca, il pedale grigio e l'Electribe con la pelle psichedelica, in piedi contro il fondo;
 * ai lati del piano alto le due casse, sotto il tavolo il subwoofer. Disegnate senza marchi.
 * Le spie a passi girano piano a suono spento, per invitare al clic; a loop acceso vanno a tempo.
 * Un clic sul tavolo (o sulla scritta sopra) accende o spegne il loop.
 */
class Studio {
  gruppo = new THREE.Group();
  private facce: Faccia[] = [];
  private passo = -1;
  private scritta: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private testi = ["", ""];
  private acceso = -1;
  private raggio: THREE.Sprite;
  private cartello!: THREE.Mesh;
  private sopra = false;
  private gonfio = 1;
  /** la pelle psichedelica: disegnata una volta, poi ricopiata sotto i tasti a ogni passo */
  private psiche: HTMLCanvasElement;

  constructor(texture: THREE.Texture[]) {
    const p = POSIZIONI.studio;
    this.gruppo.position.copy(p);
    const nero = new THREE.MeshStandardMaterial({ color: "#1A1B1F", roughness: 0.6 });
    const legno = new THREE.MeshStandardMaterial({ color: "#3A2E26", map: granaLegno([1.2, 0.6]), roughness: 0.7 });
    const cono = new THREE.MeshStandardMaterial({ color: "#3A3C42", roughness: 0.5 });
    const add = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      this.gruppo.add(o);
      return o;
    };
    // il tavolo: il piano basso sulle due fiancate, il piano alto sul fondo
    const T = { l: 1.3, p: 0.62, h: 0.72 };
    const A = { h: 1.0, p: 0.24, z: T.p / 2 - 0.12 };
    add(new THREE.BoxGeometry(T.l, 0.035, T.p), legno, 0, T.h, 0);
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.035, T.h, T.p), legno, s * (T.l / 2 - 0.0175), T.h / 2, 0);
      add(new THREE.BoxGeometry(0.03, A.h - T.h, A.p), legno, s * (T.l / 2 - 0.015), (T.h + A.h) / 2, A.z);
    }
    add(new THREE.BoxGeometry(T.l, 0.03, A.p), legno, 0, A.h, A.z);
    // il subwoofer sotto il tavolo, la cassa grande a terra
    add(new THREE.BoxGeometry(0.34, 0.34, 0.34), nero, -0.3, 0.17, 0.08);
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 24).rotateX(Math.PI / 2), cono, -0.3, 0.17, 0.08 - 0.175);
    // le due casse sul piano alto, ai lati: il woofer e il tweeter verso chi guarda
    for (const s of [-1, 1]) {
      const x = s * (T.l / 2 - 0.11);
      add(new THREE.BoxGeometry(0.17, 0.27, 0.2), nero, x, A.h + 0.015 + 0.135, A.z);
      add(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 20).rotateX(Math.PI / 2), cono, x, A.h + 0.11, A.z - 0.103);
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 12).rotateX(Math.PI / 2), cono, x, A.h + 0.23, A.z - 0.103);
    }
    // le macchine: corpo e faccia di sopra disegnata (o davanti, per quella in piedi)
    const macchina = (l: number, a: number, pr: number, x: number, y: number, z: number, colore: string, f: Faccia, inPiedi = false) => {
      const corpo = new THREE.MeshStandardMaterial({ color: colore, roughness: 0.45 });
      const viso = new THREE.MeshBasicMaterial({ map: f.t, toneMapped: false });
      // facce del box: +x, −x, +y, −y, +z, −z; il disegno sopra, o davanti (−z) se sta in piedi
      const mats = inPiedi ? [corpo, corpo, corpo, corpo, corpo, viso] : [corpo, corpo, viso, corpo, corpo, corpo];
      const m = add(new THREE.BoxGeometry(l, a, pr), mats, x, y, z);
      if (inPiedi) m.rotation.x = 0.22;
      // inclinate verso chi guarda: da quaggiù se ne vedono i cerchi e i tasti
      else m.rotation.x = -0.3;
      this.facce.push(f);
      return m;
    };
    const su = T.h + 0.0175, alto = A.h + 0.015;
    macchina(0.36, 0.06, 0.3, -0.42, su + 0.03, -0.07, "#2A2B30", faccia(360, 300, texture)); // la prima macchina a cerchi
    macchina(0.36, 0.06, 0.3, 0.42, su + 0.03, -0.07, "#2A2B30", faccia(360, 300, texture)); // la seconda
    macchina(0.3, 0.05, 0.24, 0, su + 0.025, -0.08, "#D9437F", faccia(300, 240, texture)); // l'Electribe rosa
    macchina(0.3, 0.24, 0.035, 0.28, alto + 0.12, A.z + 0.03, "#1E1F23", faccia(300, 240, texture), true); // l'Electribe psichedelica, in piedi
    macchina(0.2, 0.06, 0.23, -0.33, alto + 0.03, A.z, "#141518", faccia(200, 230, texture)); // il Kaoss Pad
    macchina(0.19, 0.035, 0.11, -0.08, alto + 0.0175, A.z - 0.03, "#18191C", faccia(190, 110, texture)); // il Volca
    // il pedale grigio, col suo pedale nero
    add(new THREE.BoxGeometry(0.075, 0.055, 0.13), new THREE.MeshStandardMaterial({ color: "#8E9298", roughness: 0.5 }), 0.07, alto + 0.0275, A.z - 0.03);
    add(new THREE.BoxGeometry(0.068, 0.012, 0.07), nero, 0.07, alto + 0.06, A.z - 0.055);
    // la pelle psichedelica, una volta sola
    this.psiche = document.createElement("canvas");
    this.psiche.width = 300;
    this.psiche.height = 240;
    {
      const x = this.psiche.getContext("2d") as CanvasRenderingContext2D;
      x.fillStyle = "#C23A7E";
      x.fillRect(0, 0, 300, 240);
      const tinte = ["#F25CA2", "#5FD16B", "#E8E04A", "#3AC8FF", "#8A3AD9", "#FF8A3A", "#1E9A6A"];
      let s = 7;
      const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 90; i++) {
        x.fillStyle = tinte[i % tinte.length];
        x.globalAlpha = 0.55;
        x.beginPath();
        x.ellipse(r() * 300, r() * 240, 8 + r() * 30, 4 + r() * 16, r() * 3, 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;
    }
    // dove si clicca: tutto lo studietto, casse comprese
    const presa = new THREE.Mesh(
      new THREE.BoxGeometry(T.l + 0.1, 1.35, T.p + 0.1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    presa.position.y = 0.68;
    presa.userData.azione = { tipo: "drum" } satisfies Azione;
    this.gruppo.add(presa);
    // un raggio di luce sopra lo studietto, e la scritta "Accendi musica" (o "Spegni musica")
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    texture.push(tx);
    this.scritta = { x: c.getContext("2d") as CanvasRenderingContext2D, t: tx };
    const cartello = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4 * (160 / 768)),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false })
    );
    cartello.position.set(0, 2.15, 0.35);
    cartello.renderOrder = 10; // dopo le carte: è più vicina di loro, non deve finirci sotto
    cartello.rotation.y = Math.PI;
    // la scritta è un bottone vero: cliccarla accende e spegne la musica come lo studietto
    cartello.userData.azione = { tipo: "drum" } satisfies Azione;
    this.cartello = cartello;
    this.gruppo.add(cartello);
    const lama = tela(64, 256, (x) => {
      const v = x.createLinearGradient(0, 256, 0, 0);
      v.addColorStop(0, "rgba(255,255,255,1)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = v;
      x.fillRect(0, 0, 64, 256);
      x.globalCompositeOperation = "destination-in";
      const o = x.createLinearGradient(0, 0, 64, 0);
      o.addColorStop(0, "rgba(0,0,0,0)");
      o.addColorStop(0.5, "rgba(0,0,0,1)");
      o.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = o;
      x.fillRect(0, 0, 64, 256);
    });
    texture.push(lama);
    this.raggio = new THREE.Sprite(new THREE.SpriteMaterial({ map: lama, color: "#E05BFF", transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.raggio.position.set(0, 1.55, 0);
    this.raggio.scale.set(0.6, 1.3, 1);
    this.gruppo.add(this.raggio);
    this.disegna(0, false);
  }

  /** Il puntatore è sopra lo studietto o sopra la scritta. */
  evidenzia(si: boolean) {
    this.sopra = si;
  }

  /** I testi della scritta, nella lingua della pagina: [accendi, spegni]. */
  setTesti(accendi: string, spegni: string) {
    this.testi = [accendi, spegni];
    this.acceso = -1;
  }

  private scrivi(acceso: boolean) {
    const { x, t } = this.scritta;
    x.clearRect(0, 0, 768, 160);
    // lo stesso bottone della domanda sul cassetto: fascia scura, bordo sottile, testo in serif; colori sobri
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim() || "Georgia, serif";
    x.fillStyle = "rgba(14,12,22,0.88)";
    x.beginPath();
    x.roundRect(6, 10, 756, 140, 34);
    x.fill();
    x.strokeStyle = "#A99FC2";
    x.lineWidth = 4;
    x.stroke();
    // il segno: play o stop, sottile, nello stesso lilla spento
    x.strokeStyle = "#A99FC2";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(86, 80, 36, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = "#D9D3E8";
    if (acceso) x.fillRect(73, 67, 26, 26);
    else {
      x.beginPath();
      x.moveTo(76, 62);
      x.lineTo(104, 80);
      x.lineTo(76, 98);
      x.closePath();
      x.fill();
    }
    x.fillStyle = "#FFFFFF";
    x.font = `300 58px ${serif}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    const testo = acceso ? this.testi[1] : this.testi[0];
    x.fillText(testo.charAt(0).toUpperCase() + testo.slice(1).toLowerCase(), 440, 82, 580);
    t.needsUpdate = true;
  }

  /** Ridisegna le facce: passo = sedicesimo che suona (o che gira piano a suono spento). */
  private disegna(passo: number, acceso: boolean) {
    const [revA, revB, rosa, psiche, kaoss, volca] = this.facce;
    const manopola = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number, chiara = false) => {
      x.fillStyle = chiara ? "#C9CCD2" : "#0E0F11";
      x.beginPath();
      x.arc(cx, cy, r, 0, 7);
      x.fill();
      x.fillStyle = chiara ? "#2A2C31" : "#E9E6DE";
      x.fillRect(cx - 1, cy - r, 2, r * 0.7);
    };
    // le macchine a cerchi: anelli bianchi, sedici tasti in tondo che si accendono a turno, manopole agli angoli
    const cerchi = (f: Faccia, centro: string, sfasa: number) => {
      const { x, t, l, a } = f;
      const cx = l / 2, cy = a / 2 + 6;
      x.fillStyle = "#2A2B30";
      x.fillRect(0, 0, l, a);
      x.strokeStyle = "#D9D6CE";
      x.lineWidth = 2;
      for (const r of [52, 82, 112, 132]) {
        x.beginPath();
        x.arc(cx, cy, r, 0, Math.PI * 2);
        x.stroke();
      }
      for (let i = 0; i < 16; i++) {
        const an = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const lit = (i + sfasa) % 16 === passo % 16;
        x.save();
        x.translate(cx + Math.cos(an) * 97, cy + Math.sin(an) * 97);
        x.rotate(an);
        x.fillStyle = lit ? ACCESI[(passo >> 2) % ACCESI.length] : "#141518";
        x.fillRect(-9, -7, 18, 14);
        x.restore();
      }
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2;
        x.fillStyle = "#141518";
        x.beginPath();
        x.arc(cx + Math.cos(an) * 67, cy + Math.sin(an) * 67, 7, 0, 7);
        x.fill();
      }
      x.fillStyle = centro;
      x.beginPath();
      x.arc(cx, cy, 44, 0, Math.PI * 2);
      x.fill();
      for (const [kx, ky] of [[26, 28], [60, 22], [l - 26, 28], [l - 60, 22], [26, a - 30], [l - 26, a - 30]]) manopola(x, kx, ky, 11);
      t.needsUpdate = true;
    };
    cerchi(revA, "#1A1B1F", 0);
    cerchi(revB, acceso ? "#3A6FB0" : "#2B4C78", 8);
    // l'Electribe: il pannello, tre file di manopole, il display, sedici tasti a passi in basso e il cursore
    const electribe = (f: Faccia, fondo: string | HTMLCanvasElement) => {
      const { x, t, l, a } = f;
      if (typeof fondo === "string") {
        x.fillStyle = fondo;
        x.fillRect(0, 0, l, a);
      } else x.drawImage(fondo, 0, 0, l, a);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) manopola(x, 30 + k * 36, 30 + r * 34, 10, true);
      x.fillStyle = "#1B2420";
      x.fillRect(l - 70, 130, 56, 22);
      x.fillStyle = acceso ? "#9CF2B0" : "#5E8A6E";
      x.font = "600 13px ui-monospace, monospace";
      x.fillText("130", l - 60, 146);
      for (let i = 0; i < 16; i++) {
        const lit = i === passo % 16;
        x.fillStyle = lit ? "#FFE15A" : "#8E8A80";
        x.fillRect(10 + i * ((l - 20) / 16), a - 44, (l - 20) / 16 - 4, 22);
        x.fillStyle = lit ? "#FF4D3A" : "#3A2A2A";
        x.fillRect(10 + i * ((l - 20) / 16) + 5, a - 54, 6, 6);
      }
      x.fillStyle = "#1A1A1C";
      x.fillRect(20, a - 82, 90, 8);
      t.needsUpdate = true;
    };
    electribe(rosa, "#E24F8B");
    electribe(psiche, this.psiche);
    // il Kaoss Pad: nero, il riquadro rosso che si accende a tempo, qualche tasto
    {
      const { x, t, l, a } = kaoss;
      x.fillStyle = "#141518";
      x.fillRect(0, 0, l, a);
      const forte = acceso ? (passo % 4 === 0 ? 1 : 0.55) : 0.45 + 0.1 * Math.sin(passo);
      x.fillStyle = `rgb(${Math.round(120 + 110 * forte)},${Math.round(20 + 30 * forte)},${Math.round(30 + 30 * forte)})`;
      x.fillRect(40, 50, l - 80, a - 100);
      x.strokeStyle = "#6A6C72";
      x.lineWidth = 3;
      x.strokeRect(40, 50, l - 80, a - 100);
      for (let k = 0; k < 4; k++) manopola(x, 30 + k * 46, 24, 9);
      for (let k = 0; k < 6; k++) {
        x.fillStyle = "#3A3C42";
        x.fillRect(20 + k * 28, a - 34, 20, 12);
      }
      t.needsUpdate = true;
    }
    // il Volca: tre file di manopole e la fila di tasti a sfioramento con le spie
    {
      const { x, t, l, a } = volca;
      x.fillStyle = "#18191C";
      x.fillRect(0, 0, l, a);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) manopola(x, 16 + k * 26, 18 + r * 26, 8, true);
      for (let i = 0; i < 16; i++) {
        x.fillStyle = i === (passo + 3) % 16 ? "#FF4D3A" : "#4A4C52";
        x.fillRect(6 + i * 11.2, a - 30, 9, 18);
      }
      t.needsUpdate = true;
    }
  }

  aggiorna(t: number, ridotto: boolean) {
    const b = mondo.battito;
    if ((b.attivo ? 1 : 0) !== this.acceso) {
      this.acceso = b.attivo ? 1 : 0;
      this.scrivi(b.attivo);
    }
    this.raggio.material.opacity = ridotto ? 0.4 : b.attivo ? 0.3 + 0.4 * Math.exp(-b.fase * 5) : 0.32 + 0.1 * Math.sin(t * 2);
    // il bottone: sotto il puntatore si gonfia; a musica spenta respira appena, per invitare al clic
    const meta = this.sopra ? 1.1 : b.attivo || ridotto ? 1 : 1 + 0.035 * Math.sin(t * 3.2);
    this.gonfio += (meta - this.gonfio) * 0.2;
    this.cartello.scale.setScalar(this.gonfio);
    // a loop acceso: il sedicesimo vero; spento: un passo ogni mezzo secondo, piano
    const passo = b.attivo ? b.n * 4 + Math.floor(b.fase * 4) : ridotto ? 0 : Math.floor(t * 2);
    if (passo !== this.passo) {
      this.passo = passo;
      this.disegna(passo, b.attivo);
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

/** La copertina grande, in piedi, quella che gira accanto alla mensola. */
function copertinaGrande(l: (typeof LIBRI)[number]) {
  return tela(512, 744, (x) => {
    x.fillStyle = "#F3EEE3";
    x.fillRect(0, 0, 512, 744);
    // la spirale, grande, nel colore del libro
    x.strokeStyle = l.colore;
    x.lineWidth = 10;
    x.lineCap = "round";
    x.beginPath();
    for (let a = 0; a < Math.PI * 10; a += 0.04) {
      const r = 5 + a * 6.2;
      const px = 256 + Math.cos(a) * r, py = 430 + Math.sin(a) * r;
      if (a === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    // il titolo in alto, su tre righe
    x.fillStyle = "#1E1F23";
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.font = "400 44px Georgia, serif";
    ["Sottilissimi strati", "di un enorme", "croissant"].forEach((riga, i) => x.fillText(riga, 256, 82 + i * 52, 460));
    if (l.versione) {
      x.fillStyle = l.colore;
      x.font = "700 30px ui-monospace, monospace";
      x.fillText(l.versione, 256, 82 + 3 * 52 - 4);
    }
    x.fillStyle = "#4A4B50";
    x.font = "400 26px ui-monospace, monospace";
    x.fillText("GIANLIVIO IEMOLO", 256, 712);
    // il filo del bordo, perché la copertina chiara si stacchi dal cielo del giorno
    x.strokeStyle = "rgba(30,31,35,0.35)";
    x.lineWidth = 6;
    x.strokeRect(3, 3, 506, 738);
  });
}

/** Il retro: il colore pieno del libro, il nome. */
function retroGrande(l: (typeof LIBRI)[number]) {
  return tela(512, 744, (x) => {
    x.fillStyle = l.colore;
    x.fillRect(0, 0, 512, 744);
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.textAlign = "center";
    x.font = "400 34px Georgia, serif";
    x.fillText("Gianlivio Iemolo", 256, 380);
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
  cartelli: THREE.Sprite[] = [];
  /** La copertina che gira accanto alla mensola, al passaggio sopra un libro. */
  private vetrina = new THREE.Group();
  private facce: THREE.MeshBasicMaterial[][] = [];
  private mostrato: number | null = null;
  private vis = 0;

  constructor(texture: THREE.Texture[]) {
    // i tre libri stanno in cima alla libreria bianca (ospiti/cameraLivio.ts), uno sull'altro
    const p = POSIZIONI.pannello;
    const Y = 2.04;
    // i libri, uno sopra l'altro, col dorso verso chi guarda: il primo sotto
    const pagine = new THREE.MeshStandardMaterial({ color: "#EDE6D6", roughness: 0.9 });
    const storti = [0.05, -0.09, 0.03], spostati = [0, 0.012, -0.008];
    LIBRI.forEach((l, i) => {
      const txD = dorso(nomeLibro(l), l.colore);
      const txC = copertina(l.colore);
      texture.push(txD, txC);
      const fronte = new THREE.MeshStandardMaterial({ map: txC, roughness: 0.8 });
      const retro = new THREE.MeshStandardMaterial({ color: "#F1ECE2", roughness: 0.8 });
      const schiena = new THREE.MeshStandardMaterial({ map: txD, roughness: 0.8 });
      const libro = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.15), [pagine, pagine, fronte, retro, pagine, schiena]);
      libro.position.set(p.x - 0.1 + spostati[i], Y + 0.0125 + 0.015 + i * 0.031, p.z - 0.05);
      libro.rotation.y = storti[i];
      libro.userData.azione = { tipo: "libro", indice: i } satisfies Azione;
      this.gruppo.add(libro);
      const c = cartello(nomeLibro(l));
      c.position.set(libro.position.x, Y + 0.24, libro.position.z - 0.05);
      texture.push(c.material.map as THREE.Texture);
      this.gruppo.add(c);
      this.cartelli.push(c);
      // la copertina grande e il retro, per la vetrina
      const fr = copertinaGrande(l), rt = retroGrande(l);
      texture.push(fr, rt);
      const mat = (o: THREE.MeshBasicMaterialParameters) =>
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, fog: false, ...o });
      const carta = mat({ color: "#EDE6D6" });
      // facce del libro: +x il dorso nel suo colore, −x le pagine, sopra e sotto le pagine, dietro il retro, davanti la copertina
      this.facce.push([mat({ color: l.colore }), carta, carta, carta, mat({ map: rt }), mat({ map: fr })]);
    });
    // la vetrina: il libro intero, in piedi sopra il pannello, che gira su se stesso
    const L = 0.9, H = L * (744 / 512);
    const libro = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.08), this.facce[0]);
    libro.renderOrder = 31;
    this.vetrina.add(libro);
    this.vetrina.position.set(p.x, 2.85, p.z - 0.3);
    this.vetrina.visible = false;
    this.gruppo.add(this.vetrina);
  }

  mostra(indice: number | null) {
    this.cartelli.forEach((c, i) => (c.visible = i === indice));
    if (indice === null) return;
    if (indice !== this.mostrato) {
      (this.vetrina.children[0] as THREE.Mesh).material = this.facce[indice];
      this.vetrina.rotation.y = 0;
    }
    this.mostrato = indice;
    this.acceso = true;
  }
  private acceso = false;

  spegni() {
    this.cartelli.forEach((c) => (c.visible = false));
    this.acceso = false;
  }

  /** Compare crescendo, gira su se stessa (un giro ogni quattro secondi), sparisce sfumando. */
  aggiorna(dt: number, ridotto: boolean) {
    const meta = this.acceso ? 1 : 0;
    this.vis += (meta - this.vis) * Math.min(1, dt * (ridotto ? 30 : 7));
    if (this.vis < 0.01 && !this.acceso) {
      this.vetrina.visible = false;
      return;
    }
    this.vetrina.visible = true;
    if (!ridotto) this.vetrina.rotation.y += dt * ((Math.PI * 2) / 4);
    this.vetrina.scale.setScalar(0.6 + 0.4 * this.vis);
    if (this.mostrato !== null) this.facce[this.mostrato].forEach((m) => (m.opacity = this.vis));
  }

  setNotte(notte: boolean) {
    void notte;
  }
}

/* ------------------------------------------------------------ schiacciasogni */

class Schiacciasogni {
  gruppo = new THREE.Group();
  private appeso = new THREE.Group();
  private luccichio: THREE.Sprite;
  private piume: THREE.Group[] = [];

  constructor(texture: THREE.Texture[]) {
    // appeso a un chiodo sulla parete della camera, a sinistra delle chitarre
    this.gruppo.position.set(3.32, 1.95, 1.5);
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

/* ---------------------------------------------------------------------- zona */

export class Zona {
  gruppo = new THREE.Group();
  private scrivania: Scrivania;
  private studio: Studio;
  private pannello: Pannello;
  private schiacciasogni: Schiacciasogni;
  private camera: CameraDiLivio;
  private texture: THREE.Texture[] = [];
  private notte: boolean;

  constructor(notte: boolean) {
    this.notte = notte;
    collocaZona(this.gruppo);
    this.scrivania = new Scrivania(notte);
    this.gruppo.add(this.scrivania.gruppo);
    this.studio = new Studio(this.texture);
    this.gruppo.add(this.studio.gruppo);
    this.pannello = new Pannello(this.texture);
    this.gruppo.add(this.pannello.gruppo);
    this.schiacciasogni = new Schiacciasogni(this.texture);
    this.gruppo.add(this.schiacciasogni.gruppo);
    this.camera = new CameraDiLivio();
    this.gruppo.add(this.camera.gruppo);
    this.camera.setNotte(notte);
    this.pannello.setNotte(notte);
    // solo libri e drum machine rispondono al puntatore
    this.gruppo.traverse((o) => {
      if (!o.userData.azione) o.raycast = () => undefined;
    });
  }

  /** La scritta sopra il tavolino delle macchine. */
  setTesti(accendi: string, spegni: string) {
    this.studio.setTesti(accendi, spegni);
  }

  setNotte(notte: boolean) {
    this.notte = notte;
    this.scrivania.setNotte(notte);
    this.pannello.setNotte(notte);
    this.camera.setNotte(notte);
  }

  /** Il titolo di un libro sopra il libro, al passaggio del puntatore. */
  /** Il puntatore sopra la musica: il bottone si gonfia. */
  evidenziaMusica(si: boolean) {
    this.studio.evidenzia(si);
  }

  mostraTitolo(indice: number | null) {
    if (indice === null) this.pannello.spegni();
    else this.pannello.mostra(indice);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera, ridotto: boolean) {
    this.studio.aggiorna(t, ridotto);
    this.pannello.aggiorna(dt, ridotto);
    this.camera.aggiorna(dt, ridotto, t, camera);
    if (ridotto) return;
    this.scrivania.aggiorna(t, dt);
    this.schiacciasogni.aggiorna(t, this.notte);
    void camera;
  }

  libera() {
    this.scrivania.libera();
    this.camera.libera();
    liberaTutto(this.gruppo, this.texture);
  }
}
