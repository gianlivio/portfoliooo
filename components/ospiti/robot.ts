import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { type Ospite, casuale, liberaTutto, ombra, segno, tela } from "./comuni";

/**
 * Di giorno, sempre, un robot aspirapolvere che pulisce il marmo davanti alla scrivania dello sviluppatore,
 * senza allontanarsene, con la logica cieca
 * dei robot veri: va dritto, si ferma, gira sul posto, riparte; ogni tanto urta qualcosa che non c'è,
 * arretra un poco e cambia strada. La torretta del laser gira, la spazzola laterale frulla,
 * la luce di stato respira. Dietro di sé lascia una striscia di marmo più lucido, che pian piano si confonde.
 */

const DIAMETRO = 0.3;
const VEL = 0.3; // unità al secondo
const GIRO = 1.6; // radianti al secondo
const TRACCE = 160;
// la zona di lavoro: davanti alla scrivania, che sta sotto la terza carta (angolo della carta 2 su 13, raggio 5,05)
const ANGOLO = (2 / 13) * Math.PI * 2;
const RAGGIO = 4.2;
const LARGO = 1.1; // di lato, per parte
const DENTRO = 0.42; // verso la scrivania, senza toccare la sedia
const FUORI = 0.75; // verso chi guarda

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
    pos: new THREE.Vector3(), rotta: 0,
    mossa: { tipo: "dritto", durata: 3 } as Mossa, inizioMossa: 0, impronta: 0, slot: 0,
  };
  private centro = new THREE.Vector3(Math.sin(ANGOLO) * RAGGIO, 0, -Math.cos(ANGOLO) * RAGGIO);
  private radiale = new THREE.Vector3(Math.sin(ANGOLO), 0, -Math.cos(ANGOLO)); // verso la scrivania
  private lato = new THREE.Vector3(Math.cos(ANGOLO), 0, Math.sin(ANGOLO));
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
    this.s.pos.copy(this.centro).addScaledVector(this.lato, casuale(-0.6, 0.6)).addScaledVector(this.radiale, casuale(-0.4, 0.2));
    this.s.rotta = casuale(0, Math.PI * 2);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  private scegli(t: number) {
    const s = this.s;
    s.inizioMossa = t;
    const prima = s.mossa.tipo;
    // dopo una corsa gira: a caso, oppure verso il centro della zona se ne è al bordo
    this.v.subVectors(this.centro, s.pos);
    const lontano = !this.dentro(0.75);
    if (prima === "urta") {
      s.mossa = { tipo: "arretra", durata: 0.6 };
    } else if (prima === "dritto" || prima === "arretra") {
      let verso = segno() * casuale(0.6, 2.2);
      if (lontano) {
        const voluta = Math.atan2(this.v.x, this.v.z) + casuale(-0.5, 0.5);
        verso = Math.atan2(Math.sin(voluta - s.rotta), Math.cos(voluta - s.rotta));
      }
      s.mossa = { tipo: "gira", durata: Math.abs(verso) / GIRO, verso: Math.sign(verso) || 1 };
    } else {
      s.mossa = Math.random() < 0.3 ? { tipo: "urta", durata: casuale(0.8, 2.2) } : { tipo: "dritto", durata: casuale(1.5, 4) };
    }
  }

  /** È dentro la zona di lavoro (ristretta di un fattore)? */
  private dentro(f = 1) {
    this.v.subVectors(this.s.pos, this.centro);
    const r = this.v.dot(this.radiale), l = this.v.dot(this.lato);
    return Math.abs(l) < LARGO * f && r < DENTRO * f && r > -FUORI * f;
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
    // al bordo della zona (la sedia, la scrivania, il margine) va a sbattere: arretra e cambia strada
    if (s.mossa.tipo === "dritto" && !this.dentro() && Math.sin(s.rotta) * this.v.x + Math.cos(s.rotta) * this.v.z > 0) {
      s.mossa = { tipo: "urta", durata: 0 };
      e = 0;
    }
    if (e >= s.mossa.durata) this.scegli(t);
    const mossa = s.mossa;
    // il moto
    let vel = 0;
    if (mossa.tipo === "dritto" || mossa.tipo === "urta") vel = VEL;
    if (mossa.tipo === "arretra") vel = -VEL * 0.5;
    if (mossa.tipo === "gira") s.rotta += (mossa.verso ?? 1) * GIRO * dt;
    s.pos.x += Math.sin(s.rotta) * vel * dt;
    s.pos.z += Math.cos(s.rotta) * vel * dt;
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

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
