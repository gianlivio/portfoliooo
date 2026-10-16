import * as THREE from "three";
import { PELO_ACQUA, tartaruga } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { type Ospite, casuale, liberaTutto, ombra, segno, tela } from "./comuni";

/**
 * Di giorno, sempre, un robot aspirapolvere che fa il giro di tutta la stanza davanti alle carte,
 * passando anche davanti alla scrivania dello sviluppatore: avanza a zig-zag, si allarga e si stringe,
 * ogni tanto si ferma e gira su sé stesso per pulire un punto, ogni tanto urta qualcosa che non c'è,
 * arretra e riparte. La torretta del laser gira, la spazzola laterale frulla,
 * la luce di stato respira. Dietro di sé lascia una striscia di marmo più lucido, che pian piano si confonde.
 * Ogni tanto incrocia la tartaruga di Achille, le si mette dietro e non riesce a superarla.
 */

const DIAMETRO = 0.3;
const VEL = 0.55; // unità al secondo: un giro della stanza in poco più di un minuto
const GIRO = 1.6; // radianti al secondo
const TRACCE = 160;
// il percorso: un anello davanti alle carte, fra 3,6 e 4,55 dal centro (la sedia della scrivania è a 4,88)
const ANGOLO = ANGOLO_ZONA; // parte davanti alla scrivania
const R_MIN = 3.6;
const R_MAX = 4.55;

type Mossa = { tipo: "dritto" | "gira" | "urta" | "arretra"; durata: number; verso?: number };

export class Robot implements Ospite {
  gruppo = new THREE.Group();
  private robot = new THREE.Group();
  private torretta = new THREE.Group();
  private spazzola = new THREE.Group();
  private stato: THREE.Mesh;
  private traccia: THREE.InstancedMesh;
  private nascite = new Float32Array(TRACCE);
  private texture: THREE.Texture[] = [];
  private s = {
    pos: new THREE.Vector3(), rotta: 0, verso: 1, fase: 0,
    mossa: { tipo: "dritto", durata: 3 } as Mossa, inizioMossa: 0, impronta: 0, slot: 0, prossimoGiro: 10, prossimoUrto: 6,
  };
  private inc = { attivo: false, inizio: 0, prossimo: 4, urto: 0 };
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private c = new THREE.Color();

  constructor() {
    const R = DIAMETRO / 2;
    const scocca = new THREE.MeshStandardMaterial({ color: "#2B2D31", roughness: 0.25, metalness: 0.3 });
    const opaco = new THREE.MeshStandardMaterial({ color: "#45484E", roughness: 0.7, metalness: 0.1 });
    const argento = new THREE.MeshStandardMaterial({ color: "#B9BDC2", roughness: 0.3, metalness: 0.8 });
    // il disco: fianco opaco, coperchio lucido con un cerchio inciso, paraurti davanti
    this.robot.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 0.055, 40).translate(0, 0.032, 0), opaco));
    this.robot.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R, 0.012, 40).translate(0, 0.064, 0), scocca));
    this.robot.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.0018, 4, 48).rotateX(Math.PI / 2).translate(0, 0.0705, 0), argento));
    const paraurti = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.015, R * 1.015, 0.03, 40, 1, true, -Math.PI * 0.42, Math.PI * 0.84), new THREE.MeshStandardMaterial({ color: "#1A1B1E", roughness: 0.6, side: THREE.DoubleSide }));
    paraurti.position.y = 0.03;
    this.robot.add(paraurti);
    // la torretta del laser, che gira
    this.torretta.position.set(0, 0.07, -R * 0.25);
    this.torretta.add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.022, 24).translate(0, 0.011, 0), scocca));
    this.torretta.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.004).translate(0, 0.013, 0.037), new THREE.MeshBasicMaterial({ color: "#7A1414" })));
    this.robot.add(this.torretta);
    // la luce di stato e i due tasti davanti alla torretta
    this.stato = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#3FA9FF", toneMapped: false }));
    this.stato.position.set(0, 0.071, R * 0.25);
    this.robot.add(this.stato);
    this.robot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12).translate(0.025, 0.071, R * 0.25), argento));
    this.robot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12).translate(-0.025, 0.071, R * 0.25), argento));
    // la spazzola laterale, a prua destra, che sporge dal bordo
    this.spazzola.position.set(-R * 0.62, 0.006, R * 0.68);
    const setole = new THREE.MeshStandardMaterial({ color: "#6E7276", roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.002, 0.07).translate(0, 0, 0.035), setole);
      b.rotation.y = (i / 3) * Math.PI * 2;
      this.spazzola.add(b);
    }
    this.robot.add(this.spazzola);
    // ombra
    const txOmbra = ombra();
    this.texture.push(txOmbra);
    const om = new THREE.Mesh(
      new THREE.PlaneGeometry(DIAMETRO * 1.5, DIAMETRO * 1.5).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: 0.7, depthWrite: false })
    );
    om.position.y = 0.002;
    this.robot.add(om);
    this.gruppo.add(this.robot);

    // la striscia lucida: dischi chiari in fila, che sbiadiscono col tempo
    const txLucido = tela(64, 64, (x) => {
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.7, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    });
    this.texture.push(txLucido);
    this.traccia = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(DIAMETRO * 0.95, DIAMETRO * 0.95).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txLucido, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      TRACCE
    );
    for (let i = 0; i < TRACCE; i++) {
      this.traccia.setMatrixAt(i, this.m.makeTranslation(0, -100, 0));
      this.traccia.setColorAt(i, this.c.setRGB(0, 0, 0));
      this.nascite[i] = -100;
    }
    this.gruppo.add(this.traccia);

    // parte da un punto a caso della zona, con una direzione a caso
    this.s.pos.set(Math.sin(ANGOLO) * 4.1, 0, -Math.cos(ANGOLO) * 4.1);
    this.s.verso = segno();
    this.s.fase = casuale(0, 10);
    this.s.rotta = Math.atan2(Math.cos(ANGOLO) * this.s.verso, Math.sin(ANGOLO) * this.s.verso);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  /** La striscia lucida sbiadisce piano. */
  private sbiadisci(t: number) {
    for (let i = 0; i < TRACCE; i++) {
      const eta = t - this.nascite[i];
      const a = eta < 0.4 ? eta / 0.4 : Math.max(0, 1 - (eta - 0.4) / 20);
      this.traccia.setColorAt(i, this.c.setRGB(0.014 * a, 0.014 * a, 0.016 * a));
    }
    if (this.traccia.instanceColor) this.traccia.instanceColor.needsUpdate = true;
  }

  aggiorna(t: number, dt: number) {
    const s = this.s;
    this.sbiadisci(t);
    let e = t - s.inizioMossa;
    // le pause del lavoro: ogni tanto gira su sé stesso (pulizia di un punto), ogni tanto urta e arretra
    if (s.mossa.tipo === "dritto") {
      if (t > s.prossimoGiro) {
        s.mossa = { tipo: "gira", durata: casuale(1.8, 3), verso: segno() };
        s.inizioMossa = t;
        s.prossimoGiro = t + casuale(9, 16);
        e = 0;
      } else if (t > s.prossimoUrto) {
        s.mossa = { tipo: "arretra", durata: 0.6 };
        s.inizioMossa = t;
        s.prossimoUrto = t + casuale(7, 13);
        e = 0;
      }
    } else if (e >= s.mossa.durata) {
      s.mossa = s.mossa.tipo === "arretra" ? { tipo: "gira", durata: casuale(0.4, 0.9), verso: segno() } : { tipo: "dritto", durata: 999 };
      s.inizioMossa = t;
      e = 0;
    }
    const mossa = s.mossa;
    let vel = 0;
    this.incontro(t);
    const inc = this.inc;
    if (mossa.tipo === "dritto") {
      let voluta: number;
      let massima = VEL;
      if (inc.attivo) {
        // dietro la tartaruga, come Achille: la distanza si dimezza, ma non la passa mai.
        // Ogni tanto prova a sorpassarla di lato; lei è sempre un po' più avanti, e il robot urta e ritorna dietro.
        const k = Math.min(5, Math.floor((t - inc.inizio) / 1.8));
        const gap = Math.max(0.27, 0.9 / Math.pow(2, k));
        const fx = Math.sin(tartaruga.rotta), fz = Math.cos(tartaruga.rotta);
        const sorpasso = gap <= 0.3 && Math.sin((t - inc.inizio) * 1.1) > 0.55 ? 1 : 0;
        const mx = tartaruga.pos.x - fx * gap + fz * sorpasso * 0.28;
        const mz = tartaruga.pos.z - fz * gap - fx * sorpasso * 0.28;
        voluta = Math.atan2(mx - s.pos.x, mz - s.pos.z);
        const d = Math.hypot(mx - s.pos.x, mz - s.pos.z);
        // vicino, va al passo della tartaruga e non di più
        massima = d > 0.4 ? VEL : 0.2 + d * 0.5;
        if (sorpasso && d < 0.12 && t > inc.urto) {
          inc.urto = t + 3;
          s.mossa = { tipo: "arretra", durata: 0.6 };
          s.inizioMossa = t;
        }
      } else {
        // la meta: un punto più avanti sull'anello, a una distanza dal centro che va e viene (lo zig-zag)
        const ang = Math.atan2(s.pos.x, -s.pos.z) + s.verso * 0.45;
        const r = (R_MIN + R_MAX) / 2 + ((R_MAX - R_MIN) / 2) * Math.sin(t * 0.35 + s.fase);
        voluta = Math.atan2(Math.sin(ang) * r - s.pos.x, -Math.cos(ang) * r - s.pos.z);
      }
      const err = Math.atan2(Math.sin(voluta - s.rotta), Math.cos(voluta - s.rotta));
      s.rotta += THREE.MathUtils.clamp(err, -GIRO * dt, GIRO * dt);
      // come i robot veri: se deve girare molto, prima gira sul posto
      vel = Math.abs(err) < 0.6 ? massima : massima * 0.15;
    }
    if (mossa.tipo === "arretra") vel = -VEL * 0.4;
    if (mossa.tipo === "gira") s.rotta += (mossa.verso ?? 1) * GIRO * 1.4 * dt;
    s.pos.x += Math.sin(s.rotta) * vel * dt;
    s.pos.z += Math.cos(s.rotta) * vel * dt;
    // mai fuori dall'anello (un po' più largo mentre segue la tartaruga)
    const rr = Math.hypot(s.pos.x, s.pos.z);
    const rMin = inc.attivo ? R_MIN - 0.5 : R_MIN - 0.05, rMax = inc.attivo ? R_MAX + 0.3 : R_MAX + 0.05;
    if (rr > rMax || rr < rMin) {
      const k = THREE.MathUtils.clamp(rr, rMin, rMax) / rr;
      s.pos.x *= k;
      s.pos.z *= k;
    }
    // l'urto: alla fine della corsa, un piccolo sobbalzo all'indietro
    const sobbalzo = mossa.tipo === "arretra" && e < 0.12 ? Math.sin((e / 0.12) * Math.PI) * 0.01 : 0;
    this.robot.position.set(s.pos.x, PELO_ACQUA + 0.002 + sobbalzo * 0.3, s.pos.z);
    this.robot.rotation.set(sobbalzo * 2, s.rotta, 0);
    this.torretta.rotation.y = t * 5;
    this.spazzola.rotation.y = -t * 14;
    const respiro = 0.55 + 0.45 * Math.sin(t * 2.2);
    (this.stato.material as THREE.MeshBasicMaterial).color.setRGB(0.25 * respiro, 0.66 * respiro, respiro);

    // la striscia: un disco ogni pochi centimetri; ciascuno sbiadisce in una ventina di secondi
    if (vel !== 0 && t > s.impronta) {
      s.impronta = t + 0.04 / VEL;
      const i = s.slot;
      s.slot = (s.slot + 1) % TRACCE;
      this.nascite[i] = t;
      this.traccia.setMatrixAt(i, this.m.compose(this.v.set(s.pos.x, PELO_ACQUA + 0.0015, s.pos.z), this.q.identity(), new THREE.Vector3(1, 1, 1)));
      this.traccia.instanceMatrix.needsUpdate = true;
    }
  }

  /** Ogni tanto, se la tartaruga passa vicino, il robot le si mette dietro; dopo un po' rinuncia. */
  private incontro(t: number) {
    const inc = this.inc;
    const s = this.s;
    const d = Math.hypot(tartaruga.pos.x - s.pos.x, tartaruga.pos.z - s.pos.z);
    const r = Math.hypot(s.pos.x, s.pos.z);
    if (inc.attivo) {
      if (!tartaruga.attiva || t - inc.inizio > 16 || r > R_MAX + 0.28 || r < R_MIN - 0.48 || d > 2.2) {
        inc.attivo = false;
        inc.prossimo = t + casuale(20, 35);
      }
      return;
    }
    if (tartaruga.attiva && t > inc.prossimo && d < 1.8) {
      if (Math.random() < 0.6) {
        inc.attivo = true;
        inc.inizio = t;
        inc.urto = t + 4;
      } else inc.prossimo = t + casuale(8, 14);
    }
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
