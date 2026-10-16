import * as THREE from "three";
import { type Ospite, casuale, generatore, liberaTutto, loft, ombra } from "./comuni";
import { type Figura, figura } from "./figure";

/**
 * Sempre, di giorno e di notte: sotto una delle carte, uno sviluppatore alla scrivania, visto di spalle.
 * Felpa, cuffie, sedia da ufficio; tre monitor: a sinistra l'editor col codice che si scrive da sé,
 * riga dopo riga; al centro il browser col sito che cambia colori e pagine; a destra il terminale
 * che scorre, a volte una riga rossa e poi il verde. Lui batte sui tasti, si ferma, guarda il terminale,
 * prende il mouse, beve dalla tazza. Di notte i monitor sono l'unica luce e gli illuminano le spalle.
 */

/** Gli schermi si ridisegnano al più tre volte al secondo (il browser due): a quella distanza basta. */
const RIDISEGNO = 0.33;

/* ------------------------------------------------------------------ schermi */

type Schermo = { c: HTMLCanvasElement; x: CanvasRenderingContext2D; t: THREE.CanvasTexture };

function schermo(l: number, a: number): Schermo {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { c, x, t };
}

// colori dei token: parole chiave, stringhe, funzioni, variabili, tipi, commenti
const TOKEN = ["#C792EA", "#F2A65A", "#E8D47A", "#82AAFF", "#7FDBCA", "#6B7385", "#D8DEE9"];

type Riga = { rientro: number; pezzi: { l: number; c: string }[] };

function rigaDiCodice(r: () => number, rientro: number): Riga {
  const pezzi: { l: number; c: string }[] = [];
  if (r() < 0.12) return { rientro, pezzi: [{ l: 20 + r() * 60, c: TOKEN[5] }] }; // commento
  let n = 1 + Math.floor(r() * 5);
  if (r() < 0.6) pezzi.push({ l: 10 + r() * 10, c: TOKEN[0] });
  while (n-- > 0) pezzi.push({ l: 6 + r() * 22, c: TOKEN[1 + Math.floor(r() * 4)] });
  if (r() < 0.3) pezzi.push({ l: 14 + r() * 30, c: TOKEN[1] });
  return { rientro, pezzi };
}

/** Le pagine che il browser mostra a turno: colori come quelli dei lavori nelle carte. */
const PAGINE = [
  { fondo: "#F4F1EA", testa: "#1F2A44", eroe: "#2E6E9E", accento: "#F2A65A" },
  { fondo: "#111318", testa: "#1B1E26", eroe: "#7A3FF2", accento: "#C9F24B" },
  { fondo: "#FFFFFF", testa: "#E9ECEC", eroe: "#D94F70", accento: "#1F3B66" },
  { fondo: "#EEF3EE", testa: "#21402F", eroe: "#2F6B45", accento: "#D9A42B" },
  { fondo: "#F7F2F0", testa: "#3A2A26", eroe: "#B9875F", accento: "#8E2C4F" },
];

/**
 * La scrivania e lo sviluppatore, in coordinate della zona: la mette al suo posto la Zona (ospiti/zona.ts),
 * che la tiene viva anche quando cambia il tema (setNotte) invece di ricrearla.
 */
export class Scrivania implements Ospite {
  gruppo = new THREE.Group();
  private posto = this.gruppo;
  private legno: THREE.MeshStandardMaterial;
  private ombraMat!: THREE.MeshBasicMaterial;
  private sporchi = { editor: false, terminale: false };
  private uomo: Figura;
  private sedia = new THREE.Group();
  private tazza = new THREE.Group();
  private mouse: THREE.Mesh;
  private luce: THREE.PointLight;
  private lampada: THREE.PointLight;
  private editor: Schermo;
  private browser: Schermo;
  private terminale: Schermo;
  private matSchermi: THREE.MeshBasicMaterial[] = [];
  private texture: THREE.Texture[] = [];
  private r = generatore(11);
  private codice: Riga[] = [];
  private scritto = 0; // pezzi già scritti dell'ultima riga
  private log: { l: number; c: string; rientro: number }[] = [];
  private pagina = 0;
  private scorri = 0;
  private stato = {
    tasto: 0, riga: 0, log: 0, pagina: 6, // prossimi istanti
    azione: "scrive" as "scrive" | "legge" | "mouse" | "beve",
    fineAzione: 8, iniAzione: 0, rientro: 1, errore: -1, ricaricato: -10, ridisegno: 0, ridisegnoTesto: 0,
  };

  constructor(private notte: boolean) {
    const legno = new THREE.MeshStandardMaterial({ color: notte ? "#3A3430" : "#B8A58C", roughness: 0.7 });
    this.legno = legno;
    const nero = new THREE.MeshStandardMaterial({ color: "#1B1C1F", roughness: 0.5, metalness: 0.3 });
    const grigio = new THREE.MeshStandardMaterial({ color: "#3C3F45", roughness: 0.8 });
    const pelle = new THREE.MeshStandardMaterial({ color: "#C89A7A", roughness: 0.7 });
    const felpa = new THREE.MeshStandardMaterial({ color: "#2C3138", roughness: 0.95 });
    const capelli = new THREE.MeshStandardMaterial({ color: "#2A1F1A", roughness: 0.9 });

    // la scrivania: piano, quattro gambe, il bordo un po' più scuro
    const P = { l: 1.7, p: 0.72, h: 0.72 };
    const piano = new THREE.Mesh(new THREE.BoxGeometry(P.l, 0.03, P.p), legno);
    piano.position.set(0, P.h, 0.62);
    this.posto.add(piano);
    for (const x of [-P.l / 2 + 0.05, P.l / 2 - 0.05]) for (const z of [0.3, 0.94]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.04, P.h, 0.04).translate(0, P.h / 2, 0), nero);
      g.position.set(x, 0, z);
      this.posto.add(g);
    }
    // tastiera e mouse
    const tastiera = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.14), grigio);
    tastiera.position.set(-0.02, P.h + 0.025, 0.44);
    this.posto.add(tastiera);
    const tasti = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#5A5E66", roughness: 0.9 }));
    tasti.position.set(-0.02, P.h + 0.036, 0.44);
    this.posto.add(tasti);
    this.mouse = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6).scale(0.75, 0.45, 1.2), grigio);
    this.mouse.position.set(0.34, P.h + 0.025, 0.46);
    this.posto.add(this.mouse);
    // la tazza
    const ceramica = new THREE.MeshStandardMaterial({ color: "#D9D4C8", roughness: 0.4 });
    this.tazza.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), ceramica));
    this.tazza.add(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 10).translate(0.045, 0, 0), ceramica));
    this.tazza.position.set(0.55, P.h + 0.065, 0.42);
    this.posto.add(this.tazza);
    // una pianta in un vaso
    this.posto.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12).translate(-0.72, P.h + 0.075, 0.82), new THREE.MeshStandardMaterial({ color: "#B4643C", roughness: 0.8 })));
    const foglia = new THREE.MeshStandardMaterial({ color: "#3E6B3A", roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).scale(0.35, 1.4, 0.1), foglia);
      f.position.set(-0.72, P.h + 0.2, 0.82);
      f.rotation.set(Math.sin(i * 2.3) * 0.5, i * 0.9, Math.cos(i * 1.7) * 0.5);
      f.translateY(0.05);
      this.posto.add(f);
    }
    // la lampada da tavolo: braccio snodato, accesa solo di notte
    const braccio = new THREE.Group();
    braccio.position.set(-0.68, P.h + 0.015, 0.5);
    braccio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.015, 14), nero));
    braccio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6).rotateZ(-0.35).translate(0.06, 0.17, 0), nero));
    braccio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6).rotateZ(-1.2).translate(0.23, 0.36, 0), nero));
    braccio.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 14, 1, true).translate(0, -0.04, 0).rotateZ(0.3).translate(0.35, 0.32, 0), nero));
    braccio.rotation.y = -0.6;
    this.posto.add(braccio);
    // le luci (lampada e schermi) solo di notte: di giorno basta il sole, e ogni luce in più costa
    // a tutti i materiali della scena
    this.lampada = new THREE.PointLight("#FFC98A", 0.9, 1.4, 2);
    this.lampada.position.set(-0.45, P.h + 0.22, 0.65);
    if (notte) this.posto.add(this.lampada);

    // i tre monitor: quello al centro diritto, i laterali girati verso di lui
    this.editor = schermo(320, 192);
    this.browser = schermo(320, 192);
    this.terminale = schermo(320, 192);
    const schermi = [this.editor, this.browser, this.terminale];
    schermi.forEach((sc) => this.texture.push(sc.t));
    const M = { l: 0.58, a: 0.35 };
    [-1, 0, 1].forEach((k, i) => {
      const mon = new THREE.Group();
      mon.position.set(k * 0.6, P.h + 0.015, 0.8 - Math.abs(k) * 0.08);
      mon.rotation.y = Math.PI + k * 0.42; // lo schermo (+z locale) guarda verso di lui
      // piede, asta, cornice, schermo
      mon.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.13).translate(0, 0.006, -0.02), nero));
      mon.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.02).translate(0, 0.1, -0.04), nero));
      mon.add(new THREE.Mesh(new THREE.BoxGeometry(M.l + 0.02, M.a + 0.02, 0.025).translate(0, 0.32, -0.0135), nero));
      const mat = new THREE.MeshBasicMaterial({ map: schermi[i].t, toneMapped: false });
      this.matSchermi.push(mat);
      const vetro = new THREE.Mesh(new THREE.PlaneGeometry(M.l, M.a), mat);
      vetro.position.set(0, 0.32, 0.0005);
      mon.add(vetro);
      this.posto.add(mon);
    });
    // la luce degli schermi sulle sue spalle e sul piano
    this.luce = new THREE.PointLight("#9FC0FF", 1.6, 1.8, 2);
    this.luce.position.set(0, P.h + 0.3, 0.6);
    if (notte) this.posto.add(this.luce);

    // la sedia: base a cinque razze con le rotelle, pistone, seduta, schienale a rete
    const base = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const razza = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.3).translate(0, 0.06, 0.15), nero);
      razza.rotation.y = a;
      base.add(razza);
      const ruota = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), nero);
      ruota.position.set(Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29);
      base.add(ruota);
    }
    this.sedia.add(base);
    this.sedia.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.32, 8).translate(0, 0.22, 0), nero));
    this.sedia.add(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.46).translate(0, 0.41, 0.02), grigio));
    this.sedia.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.03).translate(0, 0.56, -0.24), nero));
    const schienale = new THREE.Mesh(
      loft([
        { z: 0.58, l: 0.2, su: 0.03 },
        { z: 0.7, l: 0.23, su: 0.035, y: 0.01 },
        { z: 0.84, l: 0.22, su: 0.03, y: 0.0 },
      ], { radiali: 12, passi: 3 }).rotateX(-Math.PI / 2).translate(0, 0, -0.27),
      new THREE.MeshStandardMaterial({ color: "#26282C", roughness: 0.9 })
    );
    this.sedia.add(schienale);
    for (const s of [-1, 1]) {
      this.sedia.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.035).translate(s * 0.25, 0.53, 0.0), nero));
      this.sedia.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.24).translate(s * 0.25, 0.62, 0.02), nero));
    }
    this.posto.add(this.sedia);

    // lui: felpa, capelli corti, cuffie
    this.uomo = figura({ pelle, abito: felpa, capo: capelli }, { seduta: true, felpa: true });
    this.uomo.gruppo.position.set(0, 0.01, 0.02);
    this.posto.add(this.uomo.gruppo);
    // le cuffie: l'arco sopra la testa da un orecchio all'altro, i due padiglioni
    const cuffie = new THREE.Group();
    cuffie.add(new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 16, Math.PI), nero));
    for (const s of [-1, 1]) cuffie.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12).rotateZ(Math.PI / 2).translate(s * 0.11, -0.01, 0), nero));
    cuffie.position.set(0, 0.16, 0.0);
    this.uomo.testa.add(cuffie);

    // ombra morbida sotto tutto
    const txOmbra = ombra();
    this.texture.push(txOmbra);
    const om = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.5).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: notte ? 0.5 : 0.75, depthWrite: false })
    );
    om.position.set(0, 0.003, 0.45);
    this.ombraMat = om.material as THREE.MeshBasicMaterial;
    this.posto.add(om);
    this.gruppo.traverse((o) => (o.raycast = () => undefined));

    for (let i = 0; i < 9; i++) this.nuovaRiga();
    this.scritto = 99;
    for (let i = 0; i < 10; i++) this.nuovoLog(false);
    this.disegnaEditor();
    this.disegnaBrowser(0);
    this.disegnaTerminale();
  }

  /** Giorno o notte: cambia il legno e accende o spegne le luci, senza ricostruire niente. */
  setNotte(notte: boolean) {
    if (notte === this.notte) return;
    this.notte = notte;
    this.legno.color.set(notte ? "#3A3430" : "#B8A58C");
    this.ombraMat.opacity = notte ? 0.5 : 0.75;
    if (notte) this.posto.add(this.lampada, this.luce);
    else this.posto.remove(this.lampada, this.luce);
  }

  /* ---------------------------------------------------------------- contenuti */

  private nuovaRiga() {
    const s = this.stato;
    // il rientro sale e scende come in un file vero: si apre un blocco, si chiude
    const u = this.r();
    if (u < 0.25) s.rientro = Math.min(4, s.rientro + 1);
    else if (u < 0.45) s.rientro = Math.max(0, s.rientro - 1);
    if (this.r() < 0.12) this.codice.push({ rientro: 0, pezzi: [] });
    else this.codice.push(rigaDiCodice(this.r, s.rientro));
    if (this.codice.length > 60) this.codice.splice(0, this.codice.length - 60);
    this.scritto = 0;
  }

  private nuovoLog(errore: boolean) {
    const r = this.r;
    const c = errore ? "#FF6B6B" : r() < 0.15 ? "#7EE787" : r() < 0.3 ? "#E8D47A" : "#C9D1D9";
    this.log.push({ l: 40 + r() * 200, c, rientro: r() < 0.3 ? 10 : 0 });
    if (this.log.length > 30) this.log.shift();
  }

  private disegnaEditor() {
    const { x, c } = this.editor;
    x.fillStyle = "#1E1F26";
    x.fillRect(0, 0, c.width, c.height);
    // barra delle schede e colonna dei file
    x.fillStyle = "#16171C";
    x.fillRect(0, 0, c.width, 14);
    x.fillRect(0, 0, 52, c.height);
    x.fillStyle = "#2A2C36";
    x.fillRect(58, 2, 54, 12);
    for (let i = 0; i < 9; i++) {
      x.fillStyle = i === 3 ? "#82AAFF" : "#4A4E5C";
      x.fillRect(8 + (i % 3 === 0 ? 0 : 6), 22 + i * 10, 26 + ((i * 7) % 14), 4);
    }
    const H = 11;
    const righe = Math.floor((c.height - 20) / H);
    const da = Math.max(0, this.codice.length - righe);
    for (let i = da; i < this.codice.length; i++) {
      const y = 20 + (i - da) * H;
      const riga = this.codice[i];
      x.fillStyle = "#3D4150";
      x.fillRect(58, y + 3, 8, 4);
      let px = 74 + riga.rientro * 12;
      const ultima = i === this.codice.length - 1;
      riga.pezzi.forEach((p, k) => {
        if (ultima && k >= this.scritto) return;
        x.fillStyle = p.c;
        x.fillRect(px, y + 2, p.l, 5);
        px += p.l + 5;
      });
      if (ultima) {
        // il cursore
        x.fillStyle = "#FFFFFF";
        x.fillRect(px, y, 2, 9);
      }
    }
    this.editor.t.needsUpdate = true;
  }

  private disegnaBrowser(caricamento: number) {
    const { x, c } = this.browser;
    const p = PAGINE[this.pagina % PAGINE.length];
    const W = c.width, H = c.height;
    x.fillStyle = "#DADDE2";
    x.fillRect(0, 0, W, 18);
    ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => {
      x.fillStyle = col;
      x.beginPath();
      x.arc(9 + i * 10, 9, 3, 0, Math.PI * 2);
      x.fill();
    });
    x.fillStyle = "#FFFFFF";
    x.fillRect(48, 4, W - 60, 10);
    // la pagina scorre piano verso il basso
    x.save();
    x.beginPath();
    x.rect(0, 18, W, H - 18);
    x.clip();
    x.translate(0, 18 - this.scorri);
    x.fillStyle = p.fondo;
    x.fillRect(0, 0, W, 520);
    x.fillStyle = p.testa;
    x.fillRect(0, 0, W, 18);
    x.fillStyle = p.accento;
    x.fillRect(10, 6, 30, 6);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = p.fondo;
      x.globalAlpha = 0.6;
      x.fillRect(W - 140 + i * 32, 7, 22, 4);
      x.globalAlpha = 1;
    }
    x.fillStyle = p.eroe;
    x.fillRect(0, 18, W, 92);
    x.fillStyle = "#FFFFFF";
    x.fillRect(20, 44, 150, 12);
    x.fillRect(20, 62, 110, 12);
    x.fillStyle = p.accento;
    x.fillRect(20, 84, 54, 14);
    for (let i = 0; i < 6; i++) {
      const cx = 14 + (i % 3) * 100, cy = 124 + Math.floor(i / 3) * 96;
      x.fillStyle = p.testa;
      x.globalAlpha = 0.12;
      x.fillRect(cx, cy, 90, 84);
      x.globalAlpha = 1;
      x.fillStyle = i % 2 ? p.eroe : p.accento;
      x.fillRect(cx, cy, 90, 46);
      x.fillStyle = p.testa;
      x.fillRect(cx + 6, cy + 54, 60, 5);
      x.fillRect(cx + 6, cy + 64, 40, 4);
    }
    x.restore();
    if (caricamento > 0) {
      // ricarica: la pagina sbianca un attimo e la barra blu corre
      x.fillStyle = `rgba(255,255,255,${caricamento * 0.85})`;
      x.fillRect(0, 18, W, H - 18);
      x.fillStyle = "#3A7BFF";
      x.fillRect(0, 18, W * (1 - caricamento), 2);
    }
    this.browser.t.needsUpdate = true;
  }

  private disegnaTerminale() {
    const { x, c } = this.terminale;
    x.fillStyle = "#0D1117";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#1C2128";
    x.fillRect(0, 0, c.width, 12);
    const H = 9;
    const righe = Math.floor((c.height - 16) / H);
    const da = Math.max(0, this.log.length - righe);
    for (let i = da; i < this.log.length; i++) {
      const l = this.log[i];
      const y = 16 + (i - da) * H;
      x.fillStyle = "#58A6FF";
      x.fillRect(6, y + 1, 6, 4);
      x.fillStyle = l.c;
      x.fillRect(16 + l.rientro, y + 1, l.l, 4);
    }
    this.terminale.t.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- vita */

  aggiorna(t: number, dt: number) {
    const s = this.stato;
    const U = this.uomo;
    // cambia azione: per lo più scrive; ogni tanto legge il terminale, usa il mouse, beve
    if (t > s.fineAzione) {
      const u = Math.random();
      s.azione = u < 0.6 ? "scrive" : u < 0.78 ? "legge" : u < 0.93 ? "mouse" : "beve";
      s.iniAzione = t;
      s.fineAzione = t + (s.azione === "scrive" ? casuale(6, 12) : s.azione === "beve" ? 4 : casuale(3, 5));
    }
    const e = t - s.iniAzione;
    const scrive = s.azione === "scrive";

    // braccia: avambracci in avanti sulla tastiera; le dita battono (piccoli scatti alternati)
    const batte = scrive ? 1 : 0;
    for (const i of [0, 1]) {
      let spalla = -0.55, gomito = -1.05, apri = (i === 0 ? -1 : 1) * 0.12;
      if (batte) {
        const f = t * 11 + i * 1.7;
        gomito += Math.max(0, Math.sin(f)) * Math.max(0, Math.sin(f * 0.37)) * 0.09;
        spalla += Math.sin(t * 2.1 + i) * 0.02;
      }
      // la destra va al mouse (si allunga di lato), o porta la tazza alla bocca
      if (i === 0 && s.azione === "mouse") {
        apri = 0.28;
        spalla = -0.6 + Math.sin(e * 1.3) * 0.04;
      }
      if (i === 0 && s.azione === "beve") {
        const b = Math.sin(Math.min(1, e / 4) * Math.PI);
        spalla = THREE.MathUtils.lerp(-0.55, -0.45, b);
        gomito = THREE.MathUtils.lerp(-1.05, -2.3, b);
        apri = THREE.MathUtils.lerp(-0.12, -0.3, b);
      }
      U.spalle[i].rotation.set(spalla, 0, apri);
      U.gomiti[i].rotation.set(gomito, 0, 0);
    }
    // la tazza segue la mano quando beve, poi torna giù
    if (s.azione === "beve") {
      const b = Math.sin(Math.min(1, e / 4) * Math.PI);
      this.tazza.position.set(THREE.MathUtils.lerp(0.55, 0.1, b), THREE.MathUtils.lerp(0.785, 1.25, b), THREE.MathUtils.lerp(0.42, 0.22, b));
      this.tazza.rotation.x = -b * 0.9;
    } else {
      this.tazza.position.set(0.55, 0.785, 0.42);
      this.tazza.rotation.x = 0;
    }
    this.mouse.position.x = 0.34 + (s.azione === "mouse" ? Math.sin(e * 1.3) * 0.03 : 0);

    // testa e busto: chino a scrivere, girato verso il terminale quando legge, indietro quando beve
    const giro = s.azione === "legge" ? 0.45 : s.azione === "mouse" ? 0.12 * Math.sin(e * 0.7) : Math.sin(t * 0.3) * 0.06;
    U.testa.rotation.y += (giro - U.testa.rotation.y) * Math.min(1, dt * 4);
    U.testa.rotation.x = scrive ? 0.12 : s.azione === "beve" ? -0.15 : 0.02;
    U.busto.rotation.x = (scrive ? 0.12 : 0.02) + Math.sin(t * 1.4) * 0.008; // il respiro
    this.sedia.rotation.y = Math.sin(t * 0.17) * 0.04 + (s.azione === "legge" ? 0.06 : 0);
    U.busto.rotation.y = this.sedia.rotation.y;

    // gli schermi: il codice cresce mentre scrive
    if (scrive && t > s.tasto) {
      s.tasto = t + casuale(0.08, 0.22);
      const riga = this.codice[this.codice.length - 1];
      if (this.scritto < riga.pezzi.length) this.scritto++;
      else this.nuovaRiga();
      this.sporchi.editor = true;
    }
    // il terminale: righe ogni tanto; a volte una raffica (una build), a volte un errore e poi il verde
    if (t > s.log) {
      const raffica = this.r() < 0.15;
      if (s.errore > 0 && t > s.errore) {
        this.nuovoLog(false);
        this.log[this.log.length - 1].c = "#7EE787";
        s.errore = -1;
      } else if (this.r() < 0.06) {
        this.nuovoLog(true);
        s.errore = t + casuale(4, 8);
      } else this.nuovoLog(false);
      s.log = t + (raffica ? 0.06 : casuale(0.6, 2.4));
      this.sporchi.terminale = true;
    }
    // editor e terminale si ridisegnano insieme, al più tre volte al secondo
    if (t > s.ridisegnoTesto && (this.sporchi.editor || this.sporchi.terminale)) {
      s.ridisegnoTesto = t + RIDISEGNO;
      if (this.sporchi.editor) this.disegnaEditor();
      if (this.sporchi.terminale) this.disegnaTerminale();
      this.sporchi.editor = this.sporchi.terminale = false;
    }
    // il browser: scorre piano, ogni tanto ricarica e cambia pagina e colori
    if (t > s.pagina) {
      this.pagina = (this.pagina + 1 + Math.floor(this.r() * 3)) % PAGINE.length;
      this.scorri = 0;
      s.ricaricato = t;
      s.pagina = t + casuale(6, 11);
    }
    const ricarica = Math.max(0, 1 - (t - s.ricaricato) / 0.6);
    this.scorri = Math.min(340, this.scorri + dt * (s.azione === "mouse" ? 40 : 6));
    // il browser scorre piano: due volte al secondo basta
    if (t > s.ridisegno) {
      s.ridisegno = t + 0.5;
      this.disegnaBrowser(ricarica);
    }

    // di notte la luce degli schermi tremola appena col contenuto
    if (this.notte) this.luce.intensity = 1.6 + Math.sin(t * 3.1) * 0.08 + (ricarica > 0 ? 0.6 * ricarica : 0);
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
    this.matSchermi.forEach((m) => m.dispose());
  }
}
