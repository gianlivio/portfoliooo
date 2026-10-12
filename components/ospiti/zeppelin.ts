import * as THREE from "three";
import { PELO_ACQUA, SOLE } from "../condivisi";
import { type Ospite, assi, cancella, casuale, finito, fra, liberaTutto, loft, ombra, primo, riposo, segno, tocca } from "./comuni";

/**
 * Di giorno, un dirigibile rigido degli anni Trenta che attraversa il cielo, lento e silenzioso.
 * L'involucro d'argento a sezione poligonale (le travi longitudinali si leggono nelle sfaccettature),
 * gli impennaggi a croce coi timoni, la navicella di comando sotto la prua con la fila dei finestrini,
 * le gondole dei motori con le eliche che girano. Quando passa, la sua ombra scivola sul marmo.
 */

const LUNGO = 8; // in unità di scena; si vede lontano, oltre le carte

function involucro() {
  // profilo di un dirigibile vero: prua piena, corpo lungo quasi cilindrico, coda che si assottiglia
  // la prua guarda verso +z, la coda è a −z
  const prof: [number, number][] = [
    [-4.0, 0.04], [-3.8, 0.2], [-3.4, 0.36], [-2.8, 0.5], [-2.0, 0.62], [-1.0, 0.68],
    [1.2, 0.68], [2.4, 0.66], [3.1, 0.58], [3.6, 0.42], [3.85, 0.25], [4.0, 0.03],
  ];
  return loft(prof.map(([z, r]) => ({ z, l: r, su: r, giu: r })), { radiali: 22, passi: 3 });
}

function pinna(lungo: number, alto: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(lungo, 0);
  s.lineTo(lungo * 0.92, alto);
  s.lineTo(lungo * 0.38, alto * 0.95);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export class Zeppelin implements Ospite {
  gruppo = new THREE.Group();
  private aeronave = new THREE.Group();
  private eliche: THREE.Group[] = [];
  private ombra: THREE.Mesh;
  private texture: THREE.Texture[] = [];
  private stato = { prossima: primo(0, 2), inizio: -1, durata: 60, da: new THREE.Vector3(), a: new THREE.Vector3(), lato: new THREE.Vector3() };

  constructor() {
    const argento = new THREE.MeshStandardMaterial({ color: "#D6DADF", roughness: 0.4, metalness: 0.25, flatShading: true });
    const scuro = new THREE.MeshStandardMaterial({ color: "#4C5157", roughness: 0.6, metalness: 0.3 });
    const telaio = new THREE.MeshStandardMaterial({ color: "#B7BCC1", roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
    this.aeronave.add(new THREE.Mesh(involucro(), argento));

    // impennaggi a croce: superfici fisse e, dietro, i timoni un po' più scuri
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.rotation.z = (i * Math.PI) / 2;
      const fissa = new THREE.Mesh(pinna(1.1, 0.75), telaio);
      fissa.rotation.y = Math.PI / 2;
      fissa.position.set(0, 0.3, -2.6);
      g.add(fissa);
      const timone = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.5).translate(0, 0.25, 0), new THREE.MeshStandardMaterial({ color: "#A2A8AE", roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
      timone.rotation.y = Math.PI / 2;
      timone.position.set(0, 0.32, -3.82);
      g.add(timone);
      this.aeronave.add(g);
    }

    // navicella di comando sotto la prua, con la fila di finestrini
    const navicella = loft([
      { z: 2.4, l: 0.02, su: 0.03, giu: 0.03 },
      { z: 2.3, l: 0.1, su: 0.08, giu: 0.09 },
      { z: 1.7, l: 0.11, su: 0.08, giu: 0.09, n: 3 },
      { z: 1.4, l: 0.05, su: 0.05, giu: 0.04 },
    ], { radiali: 14, passi: 3, colore: (_k, _a, p) => new THREE.Color(p.y > 0.0 && p.y < 0.05 ? "#2B3138" : "#B3B8BE") });
    const nav = new THREE.Mesh(navicella, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
    nav.position.y = -0.73;
    this.aeronave.add(nav);

    // gondole dei motori: due coppie ai fianchi e una sotto la coda, con le eliche
    const gondola = loft([
      { z: 0.22, l: 0.02, su: 0.02 },
      { z: 0.15, l: 0.07, su: 0.07 },
      { z: -0.12, l: 0.06, su: 0.06 },
      { z: -0.22, l: 0.02, su: 0.02 },
    ], { radiali: 12, passi: 2 });
    const disco = new THREE.MeshBasicMaterial({ color: "#3A3E44", transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    const posti: [number, number, number][] = [[0.78, -0.5, 0.6], [-0.78, -0.5, 0.6], [0.72, -0.48, -1.0], [-0.72, -0.48, -1.0], [0, -0.82, -2.0]];
    posti.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(gondola, scuro);
      m.position.set(x, y, z);
      this.aeronave.add(m);
      // il puntone che la regge
      const p = new THREE.Vector3(x * 0.75, y * 0.62 + (x === 0 ? 0.2 : 0), z);
      const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), scuro);
      asta.position.copy(p).add(new THREE.Vector3(x, y, z)).multiplyScalar(0.5);
      asta.scale.y = p.distanceTo(new THREE.Vector3(x, y, z));
      asta.lookAt(p);
      asta.rotateX(Math.PI / 2);
      this.aeronave.add(asta);
      // elica spingente, dietro la gondola: il disco sfocato e due pale che girano
      const elica = new THREE.Group();
      elica.position.set(x, y, z - 0.25);
      elica.add(new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), disco));
      const pale = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.006), scuro);
      elica.add(pale);
      this.aeronave.add(elica);
      this.eliche.push(elica);
    });

    this.aeronave.scale.setScalar(LUNGO / 8);
    this.gruppo.add(this.aeronave);

    // l'ombra sul marmo: lunga e morbida, passa come quella di una nuvola
    const txOmbra = ombra();
    this.texture.push(txOmbra);
    this.ombra = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: 0, depthWrite: false })
    );
    this.ombra.renderOrder = 1;
    this.gruppo.add(this.ombra);

    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giornoCielo", "zeppelin", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d = casuale(24, 30);
      const y = d * Math.tan(casuale(0.24, 0.3));
      s.da.copy(avanti).multiplyScalar(d + casuale(-3, 3)).addScaledVector(lato, -34 * v).setY(y);
      s.a.copy(avanti).multiplyScalar(d + casuale(-3, 3)).addScaledVector(lato, 34 * v).setY(y + casuale(-0.8, 0.8));
      s.lato.copy(lato).multiplyScalar(v);
      s.durata = casuale(30, 34);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("giornoCielo", "zeppelin", t);
      return;
    }
    this.aeronave.position.lerpVectors(s.da, s.a, k);
    this.aeronave.lookAt(s.a);
    // beccheggio e rollio lentissimi, come una cosa più leggera dell'aria
    this.aeronave.rotateX(Math.sin(t * 0.21) * 0.025);
    this.aeronave.rotateZ(Math.sin(t * 0.17) * 0.015);
    this.eliche.forEach((el, i) => (el.children[1].rotation.z = t * 22 + i));

    // l'ombra: attraversa il pavimento davanti a chi guarda nello stesso verso, a metà del passaggio
    const p = this.aeronave.position;
    const sole = THREE.MathUtils.smoothstep(SOLE.y, 0.05, 0.4);
    this.ombra.position.set(p.x * 0.16, PELO_ACQUA + 0.004, p.z * 0.16);
    this.ombra.rotation.y = Math.atan2(s.lato.x, s.lato.z) + Math.PI / 2;
    this.ombra.scale.set(1.9, 1, 6.5);
    (this.ombra.material as THREE.MeshBasicMaterial).opacity = 0.22 * sole * Math.min(fra(k, 0.15, 0.35), 1 - fra(k, 0.65, 0.85));
  }

  libera() {
    cancella("giornoCielo", "zeppelin");
    liberaTutto(this.gruppo, this.texture);
  }
}
