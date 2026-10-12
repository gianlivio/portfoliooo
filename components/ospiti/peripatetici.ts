import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { Deriva, type Ospite, assi, cancella, casuale, finito, fra, liberaTutto, loft, ombra, primo, riposo, tocca } from "./comuni";
import { type Figura, figura } from "./figure";

/**
 * Di giorno, un maestro che insegna camminando, e quattro discepoli dietro di lui: piccole figure
 * di marmo bianco, con la veste lunga e il mantello gettato sulla spalla, che attraversano il pavimento.
 * Il maestro, con la barba, gesticola mentre parla; a metà strada si ferma, si volta verso i suoi
 * e alza il braccio verso il cielo; poi riprende il passo. Un discepolo tiene un rotolo,
 * uno si porta la mano al mento.
 */

const SCALA = 0.3; // una persona di 1,75 m è alta poco meno di mezza unità
const PASSO = 0.3; // unità al secondo

type Allievo = { f: Figura; veste: THREE.Mesh; ombra: THREE.Mesh; dietro: number; lato: number; fase: number; gesto: "rotolo" | "mento" | "niente" };

function veste(mat: THREE.Material, maestro: boolean) {
  // dalla cintura alle caviglie, svasata, con le pieghe verticali (anelli a stella appena accennata)
  const g = loft([
    { z: 0.08, l: 0.19, su: 0.14, giu: 0.14 },
    { z: 0.3, l: 0.2, su: 0.15, giu: 0.15 },
    { z: 0.6, l: 0.19, su: 0.13, giu: 0.13 },
    { z: 0.95, l: 0.17, su: 0.12, giu: 0.12 },
  ], { radiali: 24, passi: 3 }).rotateX(-Math.PI / 2);
  // le pieghe: il raggio oscilla con l'angolo
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 9) * 0.05 * (1 - p.getY(i) / 1.0);
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  // il mantello: una fascia che scende in diagonale dalla spalla sinistra
  const manto = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.05, 6, 20, Math.PI * 1.15).scale(1, 1.6, 0.75).rotateZ(-0.6),
    mat
  );
  manto.position.set(0.0, 1.1, 0.0);
  m.add(manto);
  if (maestro) m.scale.set(1.05, 1, 1.05);
  return m;
}

export class Peripatetici implements Ospite {
  gruppo = new THREE.Group();
  private tutti: Allievo[] = [];
  private texture: THREE.Texture[] = [];
  private deriva = new Deriva();
  private stato = { prossima: primo(8, 2), inizio: -1, verso: 1, dist: 3.3, durata: 30, x: 0, sosta: 0 };
  private tmp = { p: new THREE.Vector3() };

  constructor() {
    const marmo = new THREE.MeshStandardMaterial({ color: "#F2EEE6", roughness: 0.5, metalness: 0.0, emissive: "#3C3A35" });
    const txOmbra = ombra();
    this.texture.push(txOmbra);
    const posti: [number, number, Allievo["gesto"]][] = [[0, 0, "niente"], [0.42, 0.14, "mento"], [0.55, -0.16, "niente"], [0.95, 0.06, "rotolo"], [1.15, -0.12, "niente"]];
    posti.forEach(([dietro, lato, gesto], i) => {
      const f = figura({ pelle: marmo, abito: marmo, capo: marmo }, { coppola: false });
      const v = veste(marmo, i === 0);
      f.gruppo.add(v);
      // capelli e, al maestro, la barba
      f.testa.add(new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).rotateX(-0.4).translate(0, 0.15, 0), marmo));
      if (i === 0) {
        const barba = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 10).rotateX(Math.PI).translate(0, 0.0, 0.07), marmo);
        f.testa.add(barba);
      }
      if (gesto === "rotolo") {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10).rotateZ(Math.PI / 2), marmo);
        r.position.set(0, -0.3, 0.04);
        f.gomiti[1].add(r);
      }
      f.gruppo.scale.setScalar(SCALA * (i === 0 ? 1.05 : 0.95 + (i % 2) * 0.04));
      const om = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.28).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: txOmbra, transparent: true, opacity: 0.55, depthWrite: false })
      );
      this.gruppo.add(f.gruppo, om);
      this.tutti.push({ f, veste: v, ombra: om, dietro, lato, fase: i * 0.37, gesto });
    });
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    this.deriva.misura(camera, dt);
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giorno", "peripatetici", t)) return;
      // entrano dal lato verso cui la vista sta girando
      s.verso = -this.deriva.verso();
      s.dist = casuale(3.0, 3.6);
      s.x = -3.4;
      s.sosta = 0;
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    // la sosta a metà: il maestro si volta e alza il braccio
    const SOSTA0 = 3.4 / PASSO, SOSTA = 6;
    const fermi = e > SOSTA0 && e < SOSTA0 + SOSTA;
    const lento = fermi ? 0 : 1 - fra(e, SOSTA0 - 1, SOSTA0) + fra(e, SOSTA0 + SOSTA, SOSTA0 + SOSTA + 1);
    s.x += PASSO * Math.min(1, lento) * dt;
    const { avanti, lato } = assi(camera);
    const dir = lato.clone().multiplyScalar(s.verso);
    const rotta = Math.atan2(dir.x, dir.z);
    const insegna = fermi ? fra(e, SOSTA0, SOSTA0 + 1) * (1 - fra(e, SOSTA0 + SOSTA - 1, SOSTA0 + SOSTA)) : 0;
    let tutti = true;
    this.tutti.forEach((a, i) => {
      const x = s.x - a.dietro;
      const { p } = this.tmp;
      p.copy(avanti).multiplyScalar(s.dist + a.lato).addScaledVector(dir, x);
      a.f.gruppo.position.set(p.x, PELO_ACQUA, p.z);
      a.ombra.position.set(p.x, PELO_ACQUA + 0.002, p.z);
      // il maestro si volta verso i discepoli durante la sosta
      a.f.gruppo.rotation.y = rotta + (i === 0 ? insegna * Math.PI * 0.85 : 0);
      // il passo: gambe, braccia che oscillano, il busto che sale e scende
      const fase = (s.x * 2.4 + a.fase) * Math.PI * 2;
      const amp = Math.min(1, lento);
      [0, 1].forEach((k) => {
        const f = fase + k * Math.PI;
        a.f.anche[k].rotation.x = -Math.sin(f) * 0.38 * amp;
        a.f.ginocchia[k].rotation.x = Math.max(0, Math.cos(f)) * 0.5 * amp;
        a.f.spalle[k].rotation.set(Math.sin(f) * 0.25 * amp, 0, (k ? -1 : 1) * 0.08);
        a.f.gomiti[k].rotation.x = -0.25;
      });
      a.f.busto.position.y = 0.95 + Math.abs(Math.sin(fase)) * 0.015 * amp;
      a.veste.rotation.z = Math.sin(fase) * 0.025 * amp;
      // i gesti
      if (i === 0) {
        // parla: la destra si muove; nella sosta la alza verso il cielo
        const parla = Math.sin(t * 2.2) * 0.25;
        a.f.spalle[0].rotation.set(-0.9 - parla * 0.4 - insegna * 1.9, 0, 0.15 + insegna * 0.1);
        a.f.gomiti[0].rotation.x = -0.9 * (1 - insegna) - 0.1;
        a.f.testa.rotation.x = -insegna * 0.35;
      } else if (a.gesto === "mento") {
        a.f.spalle[0].rotation.set(-0.5, 0, -0.2);
        a.f.gomiti[0].rotation.x = -2.3;
        a.f.testa.rotation.x = 0.12;
      } else if (a.gesto === "rotolo") {
        a.f.spalle[1].rotation.set(-0.6, 0, 0.1);
        a.f.gomiti[1].rotation.x = -1.1;
      } else {
        // ascoltano, la testa verso il maestro e, nella sosta, in su
        a.f.testa.rotation.set(-insegna * 0.3, (i % 2 ? 0.2 : -0.2) * (fermi ? 1 : 0.3), 0);
      }
      if (x < 3.6) tutti = false;
    });
    if (tutti) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("giorno", "peripatetici", t);
    }
  }

  libera() {
    cancella("giorno", "peripatetici");
    liberaTutto(this.gruppo, this.texture);
  }
}
