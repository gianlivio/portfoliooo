import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { type Ospite, alone, assi, cancella, casuale, finito, liberaTutto, loft, morbido, ombra, primo, riposo, segno, tocca } from "./comuni";

/**
 * Di giorno, ogni tanto, un drone (a volte due) che entra ronzando fra le carte: si ferma davanti
 * a una, fa su e giù per inquadrarla, ruota appena, scatta (un lampo bianco), poi riparte in diagonale
 * e sale via. Quadricottero grigio da riprese: bracci ripiegabili, eliche come dischi sfocati,
 * la camera stabilizzata sotto il muso, le luci rosse davanti e verde che lampeggia dietro.
 * Sul marmo la sua ombra, più piccola e più netta quando scende.
 */

const SCALA = 0.62; // il drone è largo circa 0,35 m: in scena un po' meno di una spanna di carta

type Drone = {
  g: THREE.Group;
  corpo: THREE.Group;
  rotori: THREE.Group[];
  verde: THREE.Sprite;
  lampo: THREE.Sprite;
  ombra: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotta: number;
  ritardo: number;
  scatto: number;
  offset: THREE.Vector3;
};

function costruisci(tx: THREE.Texture, txOmbra: THREE.Texture): Drone {
  const grigio = new THREE.MeshStandardMaterial({ color: "#5D6168", roughness: 0.45, metalness: 0.25 });
  const scuro = new THREE.MeshStandardMaterial({ color: "#26282C", roughness: 0.5, metalness: 0.3 });
  const vetro = new THREE.MeshStandardMaterial({ color: "#0D0F14", roughness: 0.1, metalness: 0.8 });
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);
  // corpo: affusolato, più alto davanti
  corpo.add(new THREE.Mesh(loft([
    { z: -0.12, l: 0.035, su: 0.022, giu: 0.02 },
    { z: -0.06, l: 0.05, su: 0.03, giu: 0.025, n: 3 },
    { z: 0.05, l: 0.048, su: 0.034, giu: 0.028, n: 3 },
    { z: 0.11, l: 0.032, su: 0.025, giu: 0.022 },
    { z: 0.13, l: 0.012, su: 0.012, giu: 0.012 },
  ], { radiali: 16, passi: 3 }), grigio));
  // batteria sul dorso
  corpo.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.1).translate(0, 0.035, -0.02), scuro));
  // camera sul gimbal
  const gimbal = new THREE.Group();
  gimbal.position.set(0, -0.035, 0.1);
  gimbal.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), scuro));
  gimbal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 12).rotateX(Math.PI / 2).translate(0, 0, 0.017), vetro));
  corpo.add(gimbal);
  // quattro bracci e rotori
  const rotori: THREE.Group[] = [];
  const disco = new THREE.MeshBasicMaterial({ color: "#2A2C30", transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const fine = new THREE.Vector3(x * 0.13, 0.005, z * 0.11);
    const braccio = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 1, 6), grigio);
    braccio.scale.y = Math.hypot(fine.x, fine.z);
    braccio.position.copy(fine).multiplyScalar(0.5);
    braccio.lookAt(fine);
    braccio.rotateX(Math.PI / 2);
    corpo.add(braccio);
    corpo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.022, 10).translate(fine.x, fine.y + 0.008, fine.z), scuro));
    const rotore = new THREE.Group();
    rotore.position.set(fine.x, fine.y + 0.025, fine.z);
    rotore.add(new THREE.Mesh(new THREE.CircleGeometry(0.085, 24).rotateX(-Math.PI / 2), disco));
    rotore.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.002, 0.012), scuro));
    corpo.add(rotore);
    rotori.push(rotore);
    // gambe di atterraggio sotto i bracci anteriori
    if (z > 0) corpo.add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.035, 0.006).translate(fine.x * 0.8, -0.02, fine.z * 0.8), scuro));
  }
  // luci: rosse fisse davanti, verde che lampeggia dietro
  const luce = (x: number, y: number, z: number, c: string, sc: number) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    s.position.set(x, y, z);
    s.scale.setScalar(sc);
    corpo.add(s);
    return s;
  };
  luce(0.13, -0.012, 0.11, "#FF3B30", 0.04);
  luce(-0.13, -0.012, 0.11, "#FF3B30", 0.04);
  const verde = luce(0, 0.01, -0.13, "#38FF72", 0.05);
  const lampo = luce(0, -0.035, 0.13, "#FFFFFF", 0.4);
  lampo.material.opacity = 0;
  g.scale.setScalar(SCALA);
  const om = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.26).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: 0, depthWrite: false })
  );
  return {
    g, corpo, rotori, verde, lampo, ombra: om,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), rotta: 0, ritardo: 0, scatto: -1, offset: new THREE.Vector3(),
  };
}

export class Droni implements Ospite {
  gruppo = new THREE.Group();
  private droni: Drone[] = [];
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(15, 2), inizio: -1, durata: 22, quanti: 1,
    da: new THREE.Vector3(), sosta: new THREE.Vector3(), via: new THREE.Vector3(), verso: new THREE.Vector3(),
  };
  private meta = new THREE.Vector3();
  private dir = new THREE.Vector3();

  constructor() {
    const tx = alone("#FFFFFF");
    const txOmbra = ombra();
    this.texture.push(tx, txOmbra);
    for (let i = 0; i < 2; i++) {
      const d = costruisci(tx, txOmbra);
      this.droni.push(d);
      this.gruppo.add(d.g, d.ombra);
    }
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  /** Dove vuole essere il drone all'istante e del passaggio: entra, sosta davanti a una carta, va via in alto. */
  private bersaglio(e: number, out: THREE.Vector3) {
    const s = this.stato;
    const ENTRA = 5, SOSTA = 9;
    if (e < ENTRA) return out.lerpVectors(s.da, s.sosta, morbido(e / ENTRA));
    if (e < ENTRA + SOSTA) {
      // su e giù e di lato, per inquadrare
      const u = e - ENTRA;
      return out.copy(s.sosta).add(new THREE.Vector3(0, Math.sin(u * 0.7) * 0.18, 0)).addScaledVector(s.verso, Math.sin(u * 0.45) * 0.3);
    }
    const u = (e - ENTRA - SOSTA) / (s.durata - ENTRA - SOSTA);
    return out.lerpVectors(s.sosta, s.via, u * u);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giornoAria", "drone", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      s.verso.copy(lato).multiplyScalar(v);
      s.da.copy(avanti).multiplyScalar(casuale(3.2, 4)).addScaledVector(lato, -4.2 * v).setY(PELO_ACQUA + casuale(0.9, 1.4));
      s.sosta.copy(avanti).multiplyScalar(casuale(2.4, 3.1)).addScaledVector(lato, casuale(-0.6, 0.6)).setY(PELO_ACQUA + casuale(0.7, 1.1));
      s.via.copy(avanti).multiplyScalar(casuale(4, 5)).addScaledVector(lato, 4.6 * v).setY(PELO_ACQUA + casuale(2.6, 3.4));
      s.durata = casuale(20, 24);
      s.quanti = Math.random() < 0.35 ? 2 : 1;
      this.droni.forEach((d, i) => {
        d.ritardo = i * casuale(0.8, 1.4);
        d.offset.set(0, i * 0.22, 0).addScaledVector(s.verso, -i * 0.5).addScaledVector(avanti, i * 0.35);
        this.bersaglio(0, d.pos).add(d.offset);
        d.vel.set(0, 0, 0);
        d.rotta = Math.atan2(s.verso.x, s.verso.z);
        d.scatto = -1;
        d.g.visible = d.ombra.visible = i < s.quanti;
      });
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    if (e >= s.durata + 2) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("giornoAria", "drone", t);
      return;
    }
    const cam = camera.position;
    this.droni.forEach((d, i) => {
      if (i >= s.quanti) return;
      const ed = Math.max(0, e - d.ritardo);
      this.bersaglio(ed, this.meta).add(d.offset);
      // il drone insegue il bersaglio come una molla smorzata: arriva, frena, oscilla appena
      this.dir.subVectors(this.meta, d.pos);
      d.vel.addScaledVector(this.dir, dt * 6).multiplyScalar(Math.exp(-dt * 3.2));
      d.pos.addScaledVector(d.vel, dt);
      // il ronzio: un tremolio minimo
      d.g.position.copy(d.pos).add(new THREE.Vector3(Math.sin(t * 23 + i) * 0.004, Math.sin(t * 17 + i * 2) * 0.006, 0));
      // muso nella direzione di marcia; in sosta si gira verso chi guarda, come per riprenderlo
      const inSosta = ed > 5 && ed < 14;
      const voluta = inSosta ? Math.atan2(cam.x - d.pos.x, cam.z - d.pos.z) : Math.atan2(d.vel.x, d.vel.z);
      let dr = voluta - d.rotta;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      if (d.vel.lengthSq() > 0.002 || inSosta) d.rotta += dr * Math.min(1, dt * 2);
      d.g.rotation.set(0, d.rotta, 0);
      // si inclina nel verso in cui accelera
      const avantiLoc = d.vel.x * Math.sin(d.rotta) + d.vel.z * Math.cos(d.rotta);
      const latoLoc = d.vel.x * Math.cos(d.rotta) - d.vel.z * Math.sin(d.rotta);
      d.corpo.rotation.set(THREE.MathUtils.clamp(avantiLoc * 0.35, -0.35, 0.35), 0, THREE.MathUtils.clamp(-latoLoc * 0.35, -0.35, 0.35));
      d.rotori.forEach((r, k) => (r.children[1].rotation.y = t * (k % 2 ? 41 : -41)));
      d.verde.material.opacity = (t * 1.2 + i * 0.4) % 1 < 0.12 ? 1 : 0.08;
      // lo scatto, a metà della sosta
      if (d.scatto < 0 && ed > 10.5) d.scatto = t;
      const f = d.scatto > 0 ? t - d.scatto : 99;
      d.lampo.material.opacity = f < 0.12 ? 1 - f / 0.12 : 0;
      // l'ombra
      const h = d.pos.y - PELO_ACQUA;
      d.ombra.position.set(d.pos.x, PELO_ACQUA + 0.003, d.pos.z);
      d.ombra.scale.setScalar(SCALA * (1 + h * 0.5));
      (d.ombra.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - h * 0.12);
    });
  }

  libera() {
    cancella("giornoAria", "drone");
    liberaTutto(this.gruppo, this.texture);
  }
}
