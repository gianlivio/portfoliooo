import * as THREE from "three";
import { loft } from "./comuni";

/**
 * Romero, un cane corso nero, che dorme sulla cuccia accanto alla scrivania, sdraiato sul fianco.
 * Corpo massiccio con il torace profondo e il ventre raccolto, collo spesso, testa larga col muso corto
 * e le labbra che pendono, orecchie piccole a triangolo, coda dritta. Respira piano;
 * ogni tanto sogna: le zampe pedalano, il labbro e le orecchie fremono, la coda batte due volte.
 * Unità: metri; il cane guarda verso +z quando è in piedi, poi si sdraia ruotando sul fianco.
 */

type Zampa = { radice: THREE.Group; ginocchio: THREE.Group; base: number; fase: number };

export class Romero {
  gruppo = new THREE.Group();
  private cane = new THREE.Group();
  private torace: THREE.Group;
  private testa = new THREE.Group();
  private labbro: THREE.Mesh;
  private orecchie: THREE.Group[] = [];
  private coda = new THREE.Group();
  private zampe: Zampa[] = [];
  private sogno = { inizio: -100, prossimo: 6, durata: 4 };

  constructor() {
    const pelo = new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.48, metalness: 0.05 });
    const naso = new THREE.MeshStandardMaterial({ color: "#070708", roughness: 0.3 });
    const stoffa = new THREE.MeshStandardMaterial({ color: "#7D746A", roughness: 1 });
    const imbottito = new THREE.MeshStandardMaterial({ color: "#9A9086", roughness: 1 });

    // la cuccia: un cuscino ovale e il bordo imbottito
    const cuscino = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.09, 32).scale(1.25, 1, 0.85), imbottito);
    cuscino.position.y = 0.045;
    this.gruppo.add(cuscino);
    const bordo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.085, 10, 40).rotateX(Math.PI / 2).scale(1.25, 1, 0.85), stoffa);
    bordo.position.y = 0.09;
    this.gruppo.add(bordo);

    // il corpo, in piedi lungo z: groppa dietro, petto davanti; la spina a y = 0, il ventre sotto
    this.torace = new THREE.Group();
    this.torace.add(new THREE.Mesh(loft([
      { z: -0.42, y: -0.03, l: 0.06, su: 0.06, giu: 0.07 },
      { z: -0.36, y: -0.02, l: 0.13, su: 0.07, giu: 0.13 },
      { z: -0.22, l: 0.145, su: 0.06, giu: 0.13 },
      { z: -0.06, y: 0.0, l: 0.13, su: 0.06, giu: 0.12 }, // fianco raccolto
      { z: 0.1, l: 0.155, su: 0.07, giu: 0.24 }, // costato profondo
      { z: 0.26, y: 0.01, l: 0.16, su: 0.08, giu: 0.26 },
      { z: 0.36, y: 0.0, l: 0.13, su: 0.08, giu: 0.24 },
      { z: 0.42, y: -0.04, l: 0.08, su: 0.06, giu: 0.16 },
    ], { radiali: 20, passi: 4 }), pelo));
    this.cane.add(this.torace);
    // il collo, spesso, verso l'alto e avanti
    this.cane.add(new THREE.Mesh(loft([
      { z: 0.3, y: -0.02, l: 0.12, su: 0.1, giu: 0.14 },
      { z: 0.42, y: 0.04, l: 0.11, su: 0.09, giu: 0.11 },
      { z: 0.52, y: 0.1, l: 0.1, su: 0.08, giu: 0.09 },
    ], { radiali: 16, passi: 3 }), pelo));

    // la testa: cranio largo e piatto, stop marcato, muso corto e quadrato, labbra pendenti
    this.testa.position.set(0, 0.12, 0.55);
    this.testa.add(new THREE.Mesh(loft([
      { z: -0.08, l: 0.085, su: 0.08, giu: 0.07 },
      { z: 0.0, l: 0.105, su: 0.085, giu: 0.08 },
      { z: 0.08, l: 0.1, su: 0.075, giu: 0.08, n: 2.6 },
      { z: 0.11, y: -0.025, l: 0.08, su: 0.05, giu: 0.075, n: 3 }, // lo stop
      { z: 0.19, y: -0.03, l: 0.075, su: 0.045, giu: 0.07, n: 3.2 },
      { z: 0.215, y: -0.03, l: 0.06, su: 0.04, giu: 0.06, n: 2.6 },
    ], { radiali: 18, passi: 3 }), pelo));
    const tartufo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8).scale(1.3, 0.8, 0.7), naso);
    tartufo.position.set(0, -0.005, 0.215);
    this.testa.add(tartufo);
    // il labbro superiore che pende ai lati del muso (si muove nel sogno)
    this.labbro = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8).scale(1.25, 0.7, 1.1), pelo);
    this.labbro.position.set(0, -0.07, 0.16);
    this.testa.add(this.labbro);
    // orecchie piccole, a triangolo, ricadenti
    for (const s of [-1, 1]) {
      const o = new THREE.Group();
      o.position.set(s * 0.085, 0.06, -0.02);
      const f = new THREE.Shape();
      f.moveTo(-0.035, 0);
      f.lineTo(0.035, 0);
      f.lineTo(0, -0.08);
      f.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(f), new THREE.MeshStandardMaterial({ color: "#121214", roughness: 0.6, side: THREE.DoubleSide }));
      m.rotation.set(0, s * 1.2, s * 0.4);
      o.add(m);
      this.testa.add(o);
      this.orecchie.push(o);
      // le palpebre chiuse: un taglio appena più lucido
      const occhio = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6).scale(1.6, 0.4, 1), naso);
      occhio.position.set(s * 0.06, 0.03, 0.095);
      this.testa.add(occhio);
    }
    this.cane.add(this.testa);

    // la coda, dritta e robusta
    this.coda.position.set(0, -0.02, -0.42);
    this.coda.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.34, 8).translate(0, -0.17, 0), pelo));
    this.coda.rotation.x = -2.2;
    this.cane.add(this.coda);

    // le zampe: due segmenti e il piede; anteriori più dritte, posteriori con la coscia larga
    const zampa = (x: number, z: number, anteriore: boolean, fase: number) => {
      const radice = new THREE.Group();
      radice.position.set(x, -0.08, z);
      radice.add(new THREE.Mesh(new THREE.CylinderGeometry(anteriore ? 0.045 : 0.07, anteriore ? 0.04 : 0.045, 0.24, 10).translate(0, -0.12, 0), pelo));
      const ginocchio = new THREE.Group();
      ginocchio.position.y = -0.24;
      ginocchio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 8).translate(0, -0.11, 0), pelo));
      const piede = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8).scale(1, 0.6, 1.5), pelo);
      piede.position.set(0, -0.23, 0.025);
      ginocchio.add(piede);
      radice.add(ginocchio);
      this.cane.add(radice);
      const base = anteriore ? -0.5 : 0.6; // sdraiato: anteriori allungate avanti, posteriori un po' indietro
      this.zampe.push({ radice, ginocchio, base, fase });
    };
    zampa(0.09, 0.3, true, 0);
    zampa(-0.09, 0.3, true, Math.PI);
    zampa(0.1, -0.3, false, Math.PI * 0.5);
    zampa(-0.1, -0.3, false, Math.PI * 1.5);

    // si sdraia sul fianco destro: il dorso verso −x, le zampe verso +x; appoggiato sul cuscino
    this.cane.rotation.z = Math.PI / 2;
    this.cane.position.set(0.05, 0.25, 0);
    this.gruppo.add(this.cane);
  }

  aggiorna(t: number) {
    const s = this.sogno;
    // il respiro lento del sonno
    const respiro = Math.sin(t * 1.35);
    this.torace.scale.set(1 + respiro * 0.025, 1 + respiro * 0.03, 1);
    // il sogno, ogni tanto
    if (t > s.prossimo) {
      s.inizio = t;
      s.durata = 3 + Math.random() * 3;
      s.prossimo = t + s.durata + 12 + Math.random() * 18;
    }
    const e = t - s.inizio;
    const sogna = e >= 0 && e < s.durata ? Math.sin((e / s.durata) * Math.PI) : 0;
    this.zampe.forEach((z, i) => {
      const pedala = sogna * Math.sin(t * 9 + z.fase) * 0.28;
      z.radice.rotation.x = z.base + pedala + Math.sin(t * 0.4 + i) * 0.02;
      z.ginocchio.rotation.x = (i < 2 ? 0.35 : -0.5) + sogna * Math.max(0, Math.sin(t * 9 + z.fase + 1)) * 0.3 * (i < 2 ? 1 : -1);
    });
    // labbro e orecchie fremono, la testa si scuote appena
    this.labbro.position.y = -0.07 + sogna * Math.sin(t * 23) * 0.006;
    this.orecchie.forEach((o, i) => (o.rotation.x = sogna * Math.sin(t * 17 + i) * 0.25));
    this.testa.rotation.set(0.15 + sogna * Math.sin(t * 6) * 0.04, 0, 0);
    // la coda batte due volte verso la fine del sogno
    const batte = e > s.durata * 0.5 && e < s.durata * 0.5 + 0.8 ? Math.sin((e - s.durata * 0.5) * Math.PI * 2.5) : 0;
    this.coda.rotation.set(-2.2, 0, batte * 0.35);
  }
}
