import * as THREE from "three";
import { pterodattilo } from "../condivisi";
import { type Ospite, assi, cancella, casuale, finito, fra, liberaTutto, loft, primo, riposo, tocca, lato as latoRegia } from "./comuni";

/**
 * Di giorno, uno pterodattilo (uno pteranodonte) che attraversa il cielo dietro le carte, controluce:
 * ali lunghissime di membrana tesa fra il braccio e il quarto dito, che arrivano fino alla caviglia;
 * corpo piccolo, testa col becco lungo senza denti e la cresta ossea all'indietro, zampe che pendono.
 * Plana quasi sempre, con le ali appena flesse; ogni tanto due o tre battiti lenti, e una virata larga.
 * Unità del modello: l'apertura alare è circa 2,4; il muso guarda verso +z.
 */

const SEG = 10; // suddivisioni della membrana lungo l'ala
const STR = 4; // suddivisioni dal bordo d'attacco al bordo d'uscita

type Ala = { geo: THREE.BufferGeometry; lato: number; dito: THREE.Mesh; braccio: THREE.Mesh };

export class Pterodattilo implements Ospite {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private testa = new THREE.Group();
  private ali: Ala[] = [];
  private zampe: THREE.Group[] = [];
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(0, 2), inizio: -1, durata: 18, battito: -10, prossimoBattito: 3,
    p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), p3: new THREE.Vector3(),
  };
  private tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() };

  constructor() {
    const pelle = new THREE.MeshStandardMaterial({ color: "#4A3B33", roughness: 0.8, fog: false });
    const membrana = new THREE.MeshStandardMaterial({ color: "#5C4638", roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.93, fog: false });

    // il corpo: torace corto e robusto, collo lungo e sottile
    this.corpo.add(new THREE.Mesh(loft([
      { z: -0.3, l: 0.012, su: 0.012 },
      { z: -0.2, l: 0.045, su: 0.04, giu: 0.045 },
      { z: 0.0, l: 0.075, su: 0.06, giu: 0.075 },
      { z: 0.14, l: 0.06, su: 0.05, giu: 0.055 },
      { z: 0.24, y: 0.02, l: 0.03, su: 0.03 },
      { z: 0.38, y: 0.05, l: 0.024, su: 0.024 },
    ], { radiali: 12, passi: 3 }), pelle));
    // la testa: cranio, becco lungo e appuntito, cresta all'indietro
    this.testa.position.set(0, 0.06, 0.4);
    this.testa.add(new THREE.Mesh(loft([
      { z: -0.05, l: 0.03, su: 0.035, giu: 0.03 },
      { z: 0.03, l: 0.032, su: 0.035, giu: 0.03 },
      { z: 0.2, y: -0.01, l: 0.016, su: 0.016, giu: 0.018 },
      { z: 0.42, y: -0.025, l: 0.004, su: 0.004, giu: 0.005 },
    ], { radiali: 10, passi: 3 }), pelle));
    const cresta = new THREE.Shape();
    cresta.moveTo(0.0, 0.02);
    cresta.lineTo(-0.36, 0.1);
    cresta.lineTo(-0.34, 0.075);
    cresta.lineTo(-0.02, -0.01);
    cresta.closePath();
    this.testa.add(new THREE.Mesh(new THREE.ShapeGeometry(cresta).rotateY(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#5A3E30", roughness: 0.7, side: THREE.DoubleSide, fog: false })));
    this.corpo.add(this.testa);
    // le zampe posteriori, che pendono all'indietro
    for (const s of [-1, 1]) {
      const z = new THREE.Group();
      z.position.set(s * 0.04, -0.03, -0.16);
      z.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.2, 5).translate(0, -0.1, 0), pelle));
      z.rotation.x = -1.25;
      this.corpo.add(z);
      this.zampe.push(z);
    }
    // le ali: la membrana si ricostruisce a ogni fotogramma dalle ossa (braccio e dito)
    for (const lato of [-1, 1]) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * (STR + 1) * 3), 3));
      const idx: number[] = [];
      for (let i = 0; i < SEG; i++) for (let j = 0; j < STR; j++) {
        const a = i * (STR + 1) + j, b = a + 1, c = a + STR + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      geo.setIndex(idx);
      this.corpo.add(new THREE.Mesh(geo, membrana));
      const braccio = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 1, 6).translate(0, 0.5, 0), pelle);
      const dito = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.004, 1, 5).translate(0, 0.5, 0), pelle);
      this.corpo.add(braccio, dito);
      this.ali.push({ geo, lato, braccio, dito });
    }
    this.corpo.scale.setScalar(1.0);
    this.gruppo.add(this.corpo);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  /** Un osso (cilindro alto 1 lungo y) steso fra due punti. */
  private osso(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
    m.position.copy(a);
    const d = this.tmp.d.subVectors(b, a);
    m.scale.set(1, d.length(), 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }

  /** Piega le ali: alza è l'angolo del battito (positivo = in su), flessione il ripiego del dito. */
  private ala(alza: number, flessione: number) {
    const { a, b, c } = this.tmp;
    this.ali.forEach((al) => {
      const L = al.lato;
      const spalla = new THREE.Vector3(L * 0.05, 0.03, 0.08);
      // il polso: il braccio esce di lato, alzato o abbassato
      const polso = a.set(L * Math.cos(alza) * 0.42, 0.03 + Math.sin(alza) * 0.42, 0.12).add(new THREE.Vector3(L * 0.05, 0, 0));
      // la punta: il dito continua oltre il polso, all'indietro e con la sua flessione
      const ang = alza * 1.25 - flessione;
      const punta = b.set(L * Math.cos(ang) * 0.72, Math.sin(ang) * 0.72, -0.16).add(polso);
      // la caviglia, dove la membrana si attacca dietro
      const caviglia = c.set(L * 0.06, -0.03, -0.3);
      this.osso(al.braccio, spalla, polso);
      this.osso(al.dito, polso, punta);
      const pos = al.geo.attributes.position as THREE.BufferAttribute;
      const bordo = new THREE.Vector3(), uscita = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG;
        // bordo d'attacco: spalla → polso → punta (il polso a un terzo della lunghezza)
        if (u < 0.36) bordo.lerpVectors(spalla, polso, u / 0.36);
        else bordo.lerpVectors(polso, punta, (u - 0.36) / 0.64);
        // bordo d'uscita: dalla caviglia alla punta, incavato verso l'interno (la membrana non è tesa)
        uscita.lerpVectors(caviglia, punta, Math.pow(u, 0.85));
        uscita.z += Math.sin(u * Math.PI) * 0.12;
        for (let j = 0; j <= STR; j++) {
          const v = j / STR;
          p.lerpVectors(bordo, uscita, v);
          // la membrana fa la pancia verso il basso, sotto il vento
          p.y -= Math.sin(v * Math.PI) * 0.035 * (1 - Math.abs(u - 0.45));
          pos.setXYZ(i * (STR + 1) + j, p.x, p.y, p.z);
        }
      }
      pos.needsUpdate = true;
      al.geo.computeVertexNormals();
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giornoCielo", "pterodattilo", t)) return;
      // una curva larga nel cielo dietro le carte: entra da un lato, vira, esce un po' più in alto
      const { avanti, lato } = assi(camera);
      const v = latoRegia("giornoCielo");
      const d = casuale(9, 12);
      const h = d * Math.tan(casuale(0.2, 0.26));
      s.p0.copy(avanti).multiplyScalar(d + 3).addScaledVector(lato, -18 * v).setY(h + 1.5);
      s.p1.copy(avanti).multiplyScalar(d - 2).addScaledVector(lato, -5 * v).setY(h - 0.5);
      s.p2.copy(avanti).multiplyScalar(d - 3).addScaledVector(lato, 6 * v).setY(h);
      s.p3.copy(avanti).multiplyScalar(d + 4).addScaledVector(lato, 18 * v).setY(h + 2.5);
      s.durata = casuale(10, 12);
      s.prossimoBattito = t + casuale(1, 3);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      pterodattilo.attivo = false;
      finito("giornoCielo", "pterodattilo", t);
      return;
    }
    // sulla curva di Bézier, guardando avanti
    const bez = (kk: number, out: THREE.Vector3) => {
      const u = 1 - kk;
      return out.set(0, 0, 0)
        .addScaledVector(s.p0, u * u * u).addScaledVector(s.p1, 3 * u * u * kk)
        .addScaledVector(s.p2, 3 * u * kk * kk).addScaledVector(s.p3, kk * kk * kk);
    };
    const { a, b, c } = this.tmp;
    bez(k, a);
    bez(Math.min(1, k + 0.01), b);
    bez(Math.max(0, k - 0.01), c);
    this.corpo.position.copy(a);
    this.corpo.lookAt(b);
    // il jet, se passa, gli può volare accanto: deve sapere dov'è e dove va
    pterodattilo.attivo = true;
    pterodattilo.pos.copy(a);
    pterodattilo.dir.subVectors(b, a).normalize();
    pterodattilo.fine = s.inizio + s.durata;
    // si inclina nella virata: quanto curva la rotta
    const d1 = b.clone().sub(a).setY(0).normalize(), d0 = a.clone().sub(c).setY(0).normalize();
    const curva = d0.x * d1.z - d0.z * d1.x;
    this.corpo.rotateZ(THREE.MathUtils.clamp(-curva * 30, -0.5, 0.5));

    // il battito: due o tre colpi lenti ogni tanto; in mezzo plana con le ali appena flesse
    if (t > s.prossimoBattito) {
      s.battito = t;
      s.prossimoBattito = t + casuale(4, 7);
    }
    const eb = t - s.battito;
    const colpi = 2.4;
    const batte = eb < colpi ? Math.sin((eb / colpi) * Math.PI) : 0;
    const fase = Math.sin(eb * Math.PI * 2 * 1.1);
    const alza = 0.08 + batte * fase * 0.55 + Math.sin(t * 0.8) * 0.03;
    const flessione = 0.12 + batte * (fase > 0 ? 0.35 : 0.05);
    this.ala(alza, flessione);
    this.corpo.position.y -= batte * fase * 0.04;
    // la testa si guarda intorno
    this.testa.rotation.set(Math.sin(t * 0.7) * 0.1, Math.sin(t * 0.45) * 0.25, 0);
    this.zampe.forEach((z, i) => (z.rotation.x = -1.25 + Math.sin(t * 1.3 + i) * 0.05));
    const vis = Math.min(fra(e, 0, 1), 1 - fra(e, s.durata - 1, s.durata));
    this.gruppo.visible = vis > 0.01;
  }

  libera() {
    pterodattilo.attivo = false;
    cancella("giornoCielo", "pterodattilo");
    liberaTutto(this.gruppo, this.texture);
  }
}
