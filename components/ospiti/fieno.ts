import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { type Ospite, assi, cancella, casuale, finito, liberaTutto, ombra, primo, riposo, tocca } from "./comuni";

/* La palla di fieno, di giorno: rotola sul marmo spinta da un vento a raffiche, saltella, ogni tanto quasi si ferma. */

const R = 0.36;

/** Centinaia di rametti secchi intrecciati dentro una sfera irregolare. */
function geometria() {
  let seme = 7;
  const rnd = () => {
    seme = (seme * 16807) % 2147483647;
    return seme / 2147483647;
  };
  const pos: number[] = [];
  const col: number[] = [];
  const toni = ["#8A6A3C", "#A8865A", "#6C5232", "#C4A574", "#5A4329"].map((c) => new THREE.Color(c));
  const p = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Vector3();
  for (let r = 0; r < 420; r++) {
    const guscio = rnd() < 0.75;
    p.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(R * (guscio ? 0.7 + rnd() * 0.3 : rnd() * 0.65));
    dir.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const tono = toni[Math.floor(rnd() * toni.length)];
    const passi = 4 + Math.floor(rnd() * 6);
    const passo = 0.035 + rnd() * 0.05;
    for (let k = 0; k < passi; k++) {
      dir.add(q.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.9)).normalize();
      const n = p.clone().addScaledVector(dir, passo);
      if (n.length() > R * (0.92 + rnd() * 0.12)) {
        dir.reflect(n.clone().normalize());
        continue;
      }
      pos.push(p.x, p.y, p.z, n.x, n.y, n.z);
      const l = 0.85 + rnd() * 0.3;
      col.push(tono.r * l, tono.g * l, tono.b * l, tono.r * l, tono.g * l, tono.b * l);
      p.copy(n);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export class Fieno implements Ospite {
  gruppo = new THREE.Group();
  private palla = new THREE.Group();
  private corpo: THREE.LineSegments;
  private macchia: THREE.Mesh;
  private tx = ombra();
  private s = {
    prossima: primo(4, 1), inizio: -1, k: 0, vBase: 1.8, fase: 0, sosta: 0, salto: 0, saltoAlt: 0, saltoLungo: 1,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(), prima: new THREE.Vector3(),
  };
  private q = new THREE.Quaternion();
  private asse = new THREE.Vector3();
  private ora = new THREE.Vector3();
  private avanzo = new THREE.Vector3();

  constructor() {
    this.corpo = new THREE.LineSegments(geometria(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }));
    this.palla.add(this.corpo);
    this.macchia = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 2.4, R * 2.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.tx, transparent: true, depthWrite: false, opacity: 0 })
    );
    this.gruppo.add(this.palla, this.macchia);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  private punto(k: number, out: THREE.Vector3) {
    const s = this.s, u = 1 - k;
    return out.set(u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x, 0, u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.s;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giorno", "fieno", t)) return;
      const { avanti, lato } = assi(camera);
      const verso = Math.random() < 0.5 ? -1 : 1;
      const d1 = casuale(3.4, 5.0), d2 = casuale(3.0, 5.2);
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -6.5 * verso);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 6.5 * verso);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-1.6, 1.6)).addScaledVector(lato, casuale(-2, 2));
      s.vBase = casuale(1.3, 2.4);
      s.k = s.salto = s.sosta = 0;
      s.saltoAlt = casuale(0.05, 0.22);
      s.saltoLungo = casuale(0.7, 1.4);
      s.fase = Math.random() * 10;
      s.inizio = t;
      this.punto(0, s.prima);
      this.gruppo.visible = true;
    }
    // il vento: raffiche irregolari, e ogni tanto quasi si ferma
    let raffica = 0.65 + 0.35 * Math.sin(t * 0.9 + s.fase) + 0.25 * Math.sin(t * 2.3 + s.fase * 2);
    if (s.sosta > 0) {
      s.sosta -= dt;
      raffica *= 0.15;
    } else if (Math.random() < dt * 0.12) s.sosta = casuale(0.4, 1.0);
    const v = s.vBase * Math.max(0.1, raffica);
    this.punto(Math.min(1, s.k + 0.01), this.avanzo);
    const tratto = Math.max(this.avanzo.distanceTo(s.prima), 0.0001) / 0.01;
    s.k = Math.min(1, s.k + (v * dt) / tratto);
    this.punto(s.k, this.ora);
    const mosso = this.ora.distanceTo(s.prima);
    // saltelli di altezza e lunghezza sempre diverse
    s.salto += mosso / s.saltoLungo;
    if (s.salto >= 1) {
      s.salto -= 1;
      s.saltoAlt = Math.random() < 0.25 ? casuale(0.15, 0.32) : casuale(0.02, 0.12);
      s.saltoLungo = casuale(0.6, 1.5);
    }
    const alto = Math.sin(s.salto * Math.PI) * s.saltoAlt;
    this.palla.position.set(this.ora.x, PELO_ACQUA + R * 0.95 + alto, this.ora.z);
    // rotola: asse perpendicolare al moto, angolo pari alla strada fatta diviso il raggio
    if (mosso > 1e-5) {
      this.asse.set(this.ora.z - s.prima.z, 0, -(this.ora.x - s.prima.x)).normalize();
      this.q.setFromAxisAngle(this.asse, mosso / R);
      this.corpo.quaternion.premultiply(this.q);
    }
    s.prima.copy(this.ora);
    this.macchia.position.set(this.ora.x, PELO_ACQUA + 0.003, this.ora.z);
    const sc = 0.95 - alto * 1.2;
    this.macchia.scale.set(sc, 1, sc);
    const luce = Math.min(1, s.k * 8, (1 - s.k) * 8);
    (this.corpo.material as THREE.LineBasicMaterial).opacity = luce;
    (this.macchia.material as THREE.MeshBasicMaterial).opacity = luce * (0.75 - alto * 1.5);
    if (s.k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("giorno", "fieno", t);
    }
  }

  libera() {
    cancella("giorno", "fieno");
    liberaTutto(this.gruppo, [this.tx]);
  }
}
