import * as THREE from "three";
import { mondo } from "../condivisi";
import { POSIZIONI, collocaZona } from "../zona";
import { alone, liberaTutto, tela } from "./comuni";
import { Scrivania } from "./scrivania";

/**
 * La zona dello sviluppatore, il centro del mondo: la scrivania e, intorno, tutto piccolo e in scala con lui:
 * la drum machine sul piano (l'interruttore dell'audio), un pannello di legno con la mensola dei due libri
 * e lo schiacciasogni, e un tavolino con le macchine del suono e il rack modulare. Il cassetto aperto è in components/Portale.tsx.
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

const PARETE_GIORNO = "#E4DED3";
const PARETE_NOTTE = "#2A2A2F";

/* -------------------------------------------- il tavolino delle macchine */

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
 * Un tavolino a parte, accanto alla scrivania, con le macchine del suono: un sintetizzatore d'argento
 * a una voce con le sue manopole, una drum machine coi sedici tasti a passi colorati, un campionatore nero
 * col display "MALA CARNE · 130 BPM", e dietro un rack modulare coi cavi che pendono in verticale.
 * Macchine generiche, senza marchi. Le luci girano piano anche a suono spento, per invitare al clic;
 * a loop acceso vanno a tempo. Un clic sul tavolino accende o spegne il loop.
 */
class Studio {
  gruppo = new THREE.Group();
  private facce: Faccia[] = [];
  private led: THREE.InstancedMesh;
  private ledN = 0;
  private passo = -1;
  private c = new THREE.Color();
  private scritta: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private testi = ["", ""];
  private acceso = -1;
  private raggio: THREE.Sprite;

  constructor(texture: THREE.Texture[]) {
    const p = POSIZIONI.studio;
    this.gruppo.position.copy(p);
    const nero = new THREE.MeshStandardMaterial({ color: "#1A1B1F", roughness: 0.6 });
    const legno = new THREE.MeshStandardMaterial({ color: "#6B5844", roughness: 0.75 });
    // il tavolino
    const T = { l: 0.78, p: 0.46, h: 0.62 };
    const piano = new THREE.Mesh(new THREE.BoxGeometry(T.l, 0.03, T.p), legno);
    piano.position.y = T.h;
    this.gruppo.add(piano);
    for (const x of [-T.l / 2 + 0.04, T.l / 2 - 0.04]) for (const z of [-T.p / 2 + 0.04, T.p / 2 - 0.04]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.035, T.h, 0.035).translate(0, T.h / 2, 0), nero);
      g.position.set(x, 0, z);
      this.gruppo.add(g);
    }
    // le macchine: corpo e faccia di sopra disegnata
    const macchina = (l: number, a: number, pr: number, x: number, z: number, colore: string, f: Faccia) => {
      const corpo = new THREE.MeshStandardMaterial({ color: colore, roughness: 0.4, metalness: colore === "#C9CCD1" ? 0.6 : 0.2 });
      const sopra = new THREE.MeshBasicMaterial({ map: f.t, toneMapped: false });
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, a, pr), [corpo, corpo, sopra, corpo, corpo, corpo]);
      m.position.set(x, T.h + 0.015 + a / 2, z);
      m.rotation.x = -0.05;
      this.gruppo.add(m);
      this.facce.push(f);
    };
    macchina(0.24, 0.04, 0.13, -0.24, -0.1, "#C9CCD1", faccia(240, 130, texture)); // la scatola d'argento a una voce
    macchina(0.26, 0.04, 0.14, 0.04, -0.1, "#2E3036", faccia(260, 140, texture)); // la drum machine a passi
    macchina(0.2, 0.05, 0.16, 0.27, -0.09, "#141518", faccia(200, 160, texture)); // il campionatore nero
    // il rack modulare, in piedi sul fondo del tavolino
    const rack = faccia(256, 192, texture);
    const R = { l: 0.5, a: 0.36 };
    const cassa = new THREE.Mesh(new THREE.BoxGeometry(R.l + 0.03, R.a + 0.03, 0.09), nero);
    cassa.position.set(0, T.h + 0.015 + R.a / 2 + 0.015, T.p / 2 - 0.08);
    this.gruppo.add(cassa);
    const fronte = new THREE.Mesh(new THREE.PlaneGeometry(R.l, R.a), new THREE.MeshBasicMaterial({ map: rack.t, toneMapped: false }));
    fronte.position.set(0, cassa.position.y, cassa.position.z - 0.046);
    fronte.rotation.y = Math.PI;
    this.gruppo.add(fronte);
    this.facce.push(rack);
    // i cavi: dalle prese in alto pendono in verticale e si piegano verso le prese in basso
    const cavi: { col: string; pts: THREE.Vector3[] }[] = [];
    const zc = cassa.position.z - 0.052;
    for (let i = 0; i < 9; i++) {
      const x = -R.l / 2 + 0.04 + i * 0.052;
      const y0 = cassa.position.y + R.a / 2 - 0.05 - (i % 3) * 0.04;
      const x1 = x + (i % 2 ? 0.06 : -0.05);
      const y1 = cassa.position.y - R.a / 2 + 0.05 + (i % 4) * 0.03;
      const giu = Math.min(y0, y1) - 0.06 - (i % 3) * 0.03;
      cavi.push({
        col: ACCESI[i % ACCESI.length],
        pts: [new THREE.Vector3(x, y0, zc), new THREE.Vector3(x, giu, zc - 0.03), new THREE.Vector3(x1, giu - 0.01, zc - 0.03), new THREE.Vector3(x1, y1, zc)],
      });
    }
    cavi.forEach(({ col, pts }) => {
      const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0045, 5), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
      this.gruppo.add(tubo);
    });
    // le spie del rack e delle macchine: istanze di un solo puntino luminoso
    const posti: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) posti.push(new THREE.Vector3(-R.l / 2 + 0.03 + (i % 7) * 0.072, cassa.position.y + (i < 7 ? 0.14 : -0.02), zc - 0.002));
    this.led = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), posti.length);
    const m = new THREE.Matrix4();
    posti.forEach((q, i) => this.led.setMatrixAt(i, m.makeTranslation(q.x, q.y, q.z)));
    this.ledN = posti.length;
    this.gruppo.add(this.led);
    // dove si clicca: tutto il tavolino, rack compreso
    const presa = new THREE.Mesh(
      new THREE.BoxGeometry(T.l + 0.1, 1.1, T.p + 0.1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    presa.position.y = 0.55;
    presa.userData.azione = { tipo: "drum" } satisfies Azione;
    this.gruppo.add(presa);
    // un raggio di luce sopra il tavolino, e la scritta "Accendi musica" (o "Spegni musica")
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    texture.push(tx);
    this.scritta = { x: c.getContext("2d") as CanvasRenderingContext2D, t: tx };
    const cartello = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.75 * (160 / 768)),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false })
    );
    // spostata un po' verso la mensola: dall'altra parte c'è la prima carta, che la coprirebbe
    cartello.position.set(0.45, 1.72, -0.05);
    cartello.rotation.y = Math.PI;
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
    this.raggio.position.set(0, 1.25, 0);
    this.raggio.scale.set(0.5, 1.2, 1);
    this.gruppo.add(this.raggio);
    this.disegna(0, false);
  }

  /** I testi della scritta, nella lingua della pagina: [accendi, spegni]. */
  setTesti(accendi: string, spegni: string) {
    this.testi = [accendi, spegni];
    this.acceso = -1;
  }

  private scrivi(acceso: boolean) {
    const { x, t } = this.scritta;
    x.clearRect(0, 0, 768, 160);
    // una fascia scura sotto il testo: si legge sul cielo chiaro del giorno come su quello della notte
    x.fillStyle = "rgba(14,10,24,0.82)";
    x.beginPath();
    x.roundRect(6, 12, 756, 136, 68);
    x.fill();
    x.strokeStyle = "#E05BFF";
    x.lineWidth = 5;
    x.stroke();
    x.fillStyle = "#FFFFFF";
    x.font = "700 78px ui-monospace, monospace";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText((acceso ? this.testi[1] : this.testi[0]).toUpperCase(), 384, 84, 700);
    t.needsUpdate = true;
  }

  /** Ridisegna le facce: passo = sedicesimo che suona (o che gira piano a suono spento). */
  private disegna(passo: number, acceso: boolean) {
    const [sint, drum, camp, rack] = this.facce;
    // la scatola d'argento: due file di manopole, la tastierina a bottoni
    {
      const { x, t } = sint;
      x.fillStyle = "#D9DCE0"; x.fillRect(0, 0, 240, 130);
      for (let i = 0; i < 12; i++) {
        x.fillStyle = "#2A2C31"; x.beginPath(); x.arc(20 + (i % 6) * 40, 24 + Math.floor(i / 6) * 34, 10, 0, 7); x.fill();
      }
      for (let i = 0; i < 13; i++) {
        x.fillStyle = i === passo % 13 ? ACCESI[(passo >> 2) % ACCESI.length] : "#9A9EA6";
        x.fillRect(10 + i * 17.5, 98, 13, 20);
      }
      t.needsUpdate = true;
    }
    // la drum machine: sedici tasti a passi, si accende quello che suona
    {
      const { x, t } = drum;
      x.fillStyle = "#2E3036"; x.fillRect(0, 0, 260, 140);
      for (let i = 0; i < 4; i++) { x.fillStyle = "#C9CCD2"; x.beginPath(); x.arc(28 + i * 34, 30, 9, 0, 7); x.fill(); }
      for (let i = 0; i < 16; i++) {
        const su = i === passo % 16;
        x.fillStyle = su ? ACCESI[Math.floor(i / 4) % ACCESI.length] : i % 4 === 0 ? "#6A5048" : "#4A4C54";
        x.fillRect(8 + i * 15.6, 96, 12, 28);
        if (su) { x.fillStyle = "rgba(255,255,255,0.5)"; x.fillRect(8 + i * 15.6, 96, 12, 5); }
      }
      t.needsUpdate = true;
    }
    // il campionatore: il display, otto tasti
    {
      const { x, t } = camp;
      x.fillStyle = "#141518"; x.fillRect(0, 0, 200, 160);
      x.fillStyle = acceso ? "#0E1A12" : "#101413"; x.fillRect(12, 10, 176, 50);
      x.fillStyle = acceso ? "#8CF5A8" : "#5E9A6E";
      x.font = "600 15px ui-monospace, monospace"; x.textBaseline = "middle";
      x.fillText("MALA CARNE", 22, 26); x.fillText("130 BPM", 22, 46);
      for (let i = 0; i < 8; i++) {
        x.fillStyle = (passo >> 1) % 8 === i ? ACCESI[i % ACCESI.length] : "#33353C";
        x.fillRect(14 + (i % 4) * 44, 76 + Math.floor(i / 4) * 40, 34, 30);
      }
      t.needsUpdate = true;
    }
    // il rack: moduli, manopole, prese
    {
      const { x, t } = rack;
      x.fillStyle = "#1C1D21"; x.fillRect(0, 0, 256, 192);
      const larg = [36, 28, 44, 24, 36, 40, 48];
      let ox = 0;
      larg.forEach((w, k) => {
        x.fillStyle = k % 2 ? "#B9BCC2" : "#2B2D33"; x.fillRect(ox + 1, 4, w - 2, 184);
        for (let j = 0; j < 3; j++) { x.fillStyle = k % 2 ? "#26282C" : "#D0D3D8"; x.beginPath(); x.arc(ox + w / 2, 30 + j * 30, 7, 0, 7); x.fill(); }
        for (let j = 0; j < 3; j++) { x.fillStyle = "#0B0B0D"; x.beginPath(); x.arc(ox + w / 2, 128 + j * 20, 4, 0, 7); x.fill(); }
        ox += w;
      });
      t.needsUpdate = true;
    }
    // le spie del rack
    for (let i = 0; i < this.ledN; i++) {
      const su = (i + passo) % 5 === 0 || (acceso && i % 4 === passo % 4);
      this.led.setColorAt(i, this.c.set(su ? ACCESI[(i + (passo >> 2)) % ACCESI.length] : "#2A2B30"));
    }
    if (this.led.instanceColor) this.led.instanceColor.needsUpdate = true;
  }

  aggiorna(t: number, ridotto: boolean) {
    const b = mondo.battito;
    if ((b.attivo ? 1 : 0) !== this.acceso) {
      this.acceso = b.attivo ? 1 : 0;
      this.scrivi(b.attivo);
    }
    this.raggio.material.opacity = ridotto ? 0.4 : b.attivo ? 0.3 + 0.4 * Math.exp(-b.fase * 5) : 0.32 + 0.1 * Math.sin(t * 2);
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
  private legno: THREE.MeshStandardMaterial;
  cartelli: THREE.Sprite[] = [];
  /** La copertina che gira accanto alla mensola, al passaggio sopra un libro. */
  private vetrina = new THREE.Group();
  private facce: THREE.MeshBasicMaterial[][] = [];
  private mostrato: number | null = null;
  private vis = 0;

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
      libro.position.set(p.x - 0.1 + spostati[i], Y + 0.0125 + 0.015 + i * 0.031, p.z - 0.15);
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
    this.vetrina.position.set(p.x, 2.5, p.z - 0.3);
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

/* ---------------------------------------------------------------------- zona */

export class Zona {
  gruppo = new THREE.Group();
  private scrivania: Scrivania;
  private studio: Studio;
  private pannello: Pannello;
  private schiacciasogni: Schiacciasogni;
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
  }

  /** Il titolo di un libro sopra il libro, al passaggio del puntatore. */
  mostraTitolo(indice: number | null) {
    if (indice === null) this.pannello.spegni();
    else this.pannello.mostra(indice);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera, ridotto: boolean) {
    this.studio.aggiorna(t, ridotto);
    this.pannello.aggiorna(dt, ridotto);
    if (ridotto) return;
    this.scrivania.aggiorna(t, dt);
    this.schiacciasogni.aggiorna(t, this.notte);
    void camera;
  }

  libera() {
    this.scrivania.libera();
    liberaTutto(this.gruppo, this.texture);
  }
}
