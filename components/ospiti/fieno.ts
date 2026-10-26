import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { type Ospite, assi, cancella, casuale, finito, liberaTutto, ombra, primo, riposo, tocca } from "./comuni";

/* La palla di fieno, di giorno: rotola sul marmo spinta da un vento a raffiche, saltella, ogni tanto quasi si ferma. */

const R = 0.36;

/**
 * La palla di fieno: rametti curvi e sottili, con un poco di spessore, che si avvolgono attorno a un centro
 * più fitto e più scuro; fuori, qualche punta che sporge. I rami sono tubi (si vedono anche da lontano),
 * i fili più fini linee; dentro, un nocciolo scuro rado che dà volume e ombra.
 */
function geometria() {
  let seme = 7;
  const rnd = () => {
    seme = (seme * 16807) % 2147483647;
    return seme / 2147483647;
  };
  const toni = ["#9A7A46", "#B8955E", "#7C6038", "#CFB07A", "#6A5030"].map((c) => new THREE.Color(c));
  const rami: THREE.BufferGeometry[] = [];
  const pos: number[] = [], col: number[] = [];
  // un ramo: una curva che gira attorno al centro, un poco a spirale, come un rametto secco piegato dal vento
  const curva = (raggio: number, giri: number) => {
    const asse = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const u = new THREE.Vector3(1, 0, 0).cross(asse).normalize();
    if (u.lengthSq() < 0.01) u.set(0, 1, 0).cross(asse).normalize();
    const w = asse.clone().cross(u);
    const a0 = rnd() * Math.PI * 2, deriva = (rnd() - 0.5) * 0.6;
    const n = 14;
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1), a = a0 + t * giri;
      const r = raggio * (0.92 + 0.12 * Math.sin(t * 9 + a0));
      return u.clone().multiplyScalar(Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r).addScaledVector(asse, deriva * r * Math.sin(t * Math.PI) + (rnd() - 0.5) * 0.02);
    });
  };
  for (let k = 0; k < 70; k++) {
    const pts = curva(R * (0.55 + rnd() * 0.45), 1.2 + rnd() * 2.2);
    const tubo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.006 + rnd() * 0.006, 4, false);
    const c = toni[Math.floor(rnd() * toni.length)];
    const tc = new Float32Array(tubo.attributes.position.count * 3);
    for (let i = 0; i < tubo.attributes.position.count; i++) tc.set([c.r, c.g, c.b], i * 3);
    tubo.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    tubo.deleteAttribute("uv");
    rami.push(tubo);
  }
  // i fili fini, più fitti, e le punte che sporgono
  for (let k = 0; k < 220; k++) {
    const pts = curva(R * (0.3 + rnd() * 0.75), 0.8 + rnd() * 2.5);
    const c = toni[Math.floor(rnd() * toni.length)];
    for (let i = 0; i < pts.length - 1; i++) {
      pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
  }
  for (let k = 0; k < 40; k++) {
    const d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const a = d.clone().multiplyScalar(R * 0.85), b = d.clone().multiplyScalar(R * (1.05 + rnd() * 0.18)).add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.04));
    const c = toni[4];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const fili = new THREE.BufferGeometry();
  fili.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  fili.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const tubi = mergeGeometries(rami);
  rami.forEach((g) => g.dispose());
  // il nocciolo: una sfera irregolare scura, dentro
  const nocciolo = new THREE.IcosahedronGeometry(R * 0.62, 1);
  const np = nocciolo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < np.count; i++) {
    const f = 0.85 + rnd() * 0.3;
    np.setXYZ(i, np.getX(i) * f, np.getY(i) * f, np.getZ(i) * f);
  }
  nocciolo.computeVertexNormals();
  return { tubi, fili, nocciolo };
}

export class Fieno implements Ospite {
  gruppo = new THREE.Group();
  private palla = new THREE.Group();
  private corpo: THREE.Group;
  private materiali: THREE.Material[] = [];
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
    const { tubi, fili, nocciolo } = geometria();
    const mTubi = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0 });
    const mFili = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
    const mNocciolo = new THREE.MeshLambertMaterial({ color: "#5A4329", transparent: true, opacity: 0, depthWrite: false });
    this.materiali = [mTubi, mFili, mNocciolo];
    this.corpo = new THREE.Group();
    this.corpo.add(new THREE.Mesh(nocciolo, mNocciolo), new THREE.Mesh(tubi, mTubi), new THREE.LineSegments(fili, mFili));
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
    // il nocciolo resta rado: si intravede fra i rami
    this.materiali.forEach((m, i) => (m.opacity = luce * (i === 2 ? 0.55 : 1)));
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
