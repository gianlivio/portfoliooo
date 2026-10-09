import * as THREE from "three";
import { type Ospite, assi, attesa, casuale, liberaTutto, loft, morbido, primo, segno } from "./comuni";

/**
 * Di giorno, di rado e all'improvviso, un tucano passa vicinissimo davanti a chi guarda
 * e attraversa lo schermo in un attimo: volo a sbalzi, qualche colpo d'ala rapido e una
 * breve planata che lo fa calare, poi di nuovo. Becco arancio con la punta nera,
 * gola bianca e gialla, anello blu attorno all'occhio, sottocoda rosso.
 */

const NERO = new THREE.Color("#101010");
const GOLA = new THREE.Color("#F4E7B5");
const GOLA_GIALLA = new THREE.Color("#F2C94C");
const ROSSO = new THREE.Color("#C0262C");
const ARANCIO = new THREE.Color("#F07A1A");
const ARANCIO_CHIARO = new THREE.Color("#F8A93A");

export class Tucano implements Ospite {
  gruppo = new THREE.Group();
  private uccello = new THREE.Group();
  private ali: THREE.Group[] = [];
  private coda = new THREE.Group();
  private stato = {
    prossima: primo(45, 3), inizio: -1, durata: 1.7,
    da: new THREE.Vector3(), a: new THREE.Vector3(), prima: new THREE.Vector3(),
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3() };

  constructor() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const lucido = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 });

    // corpo: nero, pettorina chiara che sfuma in giallo, sottocoda rosso
    this.uccello.add(new THREE.Mesh(loft([
      { z: -0.2, y: 0.01, l: 0.035, su: 0.03 },
      { z: -0.12, l: 0.07, su: 0.07, giu: 0.075 },
      { z: 0.0, l: 0.085, su: 0.08, giu: 0.09 },
      { z: 0.09, y: 0.01, l: 0.075, su: 0.075, giu: 0.08 },
      { z: 0.15, y: 0.03, l: 0.06, su: 0.06, giu: 0.06 },
      { z: 0.19, y: 0.035, l: 0.045, su: 0.05, giu: 0.045 },
    ], {
      radiali: 18, passi: 3,
      colore: (k, ang) => {
        const s = Math.sin(ang);
        if (s < 0.1 && k > 0.62) return GOLA.clone().lerp(GOLA_GIALLA, (1 - k) * 2.2);
        if (s < -0.3 && k < 0.18) return ROSSO;
        return NERO.clone().multiplyScalar(0.9 + Math.random() * 0.4);
      },
    }), mat));

    // becco: enorme, leggermente arcuato, arancio con la cresta rossa e la punta nera
    const becco = loft([
      { z: 0.17, y: 0.035, l: 0.03, su: 0.045, giu: 0.035 },
      { z: 0.23, y: 0.03, l: 0.027, su: 0.04, giu: 0.03 },
      { z: 0.3, y: 0.018, l: 0.021, su: 0.03, giu: 0.022 },
      { z: 0.36, y: 0.0, l: 0.014, su: 0.019, giu: 0.014 },
      { z: 0.4, y: -0.016, l: 0.007, su: 0.009, giu: 0.007 },
      { z: 0.41, y: -0.022, l: 0.002, su: 0.002, giu: 0.002 },
    ], {
      radiali: 16, passi: 4,
      colore: (k, ang) => {
        if (k > 0.82) return NERO;
        if (k < 0.04) return NERO;
        const s = Math.sin(ang);
        if (s > 0.85 && k < 0.6) return new THREE.Color("#D8452A");
        return ARANCIO.clone().lerp(ARANCIO_CHIARO, Math.abs(Math.cos(ang)) * 0.5 + k * 0.3);
      },
    });
    this.uccello.add(new THREE.Mesh(becco, lucido));

    // occhio: anello blu, pelle arancio attorno, iride scura
    for (const s of [-1, 1]) {
      const pelle = new THREE.Mesh(
        new THREE.CircleGeometry(0.02, 16).setAttribute("color", new THREE.Float32BufferAttribute(new Array(18 * 3).fill(0).map((_, i) => [0.95, 0.55, 0.2][i % 3]), 3)),
        mat
      );
      pelle.position.set(s * 0.051, 0.05, 0.155);
      pelle.rotation.y = s * Math.PI / 2;
      const anello = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0035, 6, 16), new THREE.MeshStandardMaterial({ color: "#3A86E0", roughness: 0.3 }));
      anello.position.set(s * 0.053, 0.052, 0.158);
      anello.rotation.y = s * Math.PI / 2;
      const iride = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshStandardMaterial({ color: "#0B0B0B", roughness: 0.1 }));
      iride.position.set(s * 0.052, 0.052, 0.158);
      this.uccello.add(pelle, anello, iride);
    }

    // ali corte e arrotondate, con le remiganti a dita
    const ala = new THREE.Shape();
    ala.moveTo(0, 0.05);
    ala.bezierCurveTo(0.12, 0.08, 0.24, 0.05, 0.3, 0.0);
    ala.lineTo(0.31, -0.03);
    ala.lineTo(0.27, -0.06);
    ala.lineTo(0.28, -0.09);
    ala.lineTo(0.23, -0.1);
    ala.lineTo(0.22, -0.13);
    ala.bezierCurveTo(0.14, -0.15, 0.06, -0.12, 0, -0.08);
    ala.closePath();
    const gAla = new THREE.ShapeGeometry(ala).rotateX(Math.PI / 2);
    gAla.setAttribute("color", new THREE.Float32BufferAttribute(new Array(gAla.attributes.position.count * 3).fill(0.06), 3));
    const matAla = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.06, 0.05, 0.03);
      g.scale.x = s;
      g.add(new THREE.Mesh(gAla, matAla));
      this.uccello.add(g);
      this.ali.push(g);
    }
    // coda lunga e squadrata
    const gCoda = new THREE.PlaneGeometry(0.08, 0.2).rotateX(-Math.PI / 2).translate(0, 0, -0.1);
    gCoda.setAttribute("color", new THREE.Float32BufferAttribute(new Array(gCoda.attributes.position.count * 3).fill(0.05), 3));
    this.coda.add(new THREE.Mesh(gCoda, matAla));
    this.coda.position.set(0, 0.02, -0.19);
    this.uccello.add(this.coda);

    this.gruppo.add(this.uccello);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = 20;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d = casuale(1.5, 1.9);
      const y = camera.position.y + casuale(0.05, 0.35);
      s.da.copy(camera.position).addScaledVector(avanti, d).addScaledVector(lato, -2.4 * v).setY(y);
      s.a.copy(camera.position).addScaledVector(avanti, d + casuale(-0.4, 0.4)).addScaledVector(lato, 2.4 * v).setY(y + casuale(-0.15, 0.15));
      s.durata = casuale(1.5, 1.9);
      s.inizio = t;
      s.prima.copy(s.da);
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + attesa(70, 130);
      this.gruppo.visible = false;
      return;
    }
    // volo a sbalzi: quattro colpi d'ala rapidi, poi una planata che lo fa calare un poco
    const ciclo = (e % 0.55) / 0.55;
    const batte = ciclo < 0.6;
    const { p, q } = this.tmp;
    p.lerpVectors(s.da, s.a, k);
    p.y += Math.sin(k * Math.PI * 3) * 0.05 - (batte ? 0 : morbido((ciclo - 0.6) / 0.4) * 0.04);
    this.uccello.position.copy(p);
    q.copy(p).add(p.clone().sub(s.prima).normalize());
    if (p.distanceToSquared(s.prima) > 1e-8) this.uccello.lookAt(q);
    s.prima.copy(p);
    const battito = batte ? Math.sin((ciclo / 0.6) * Math.PI * 8) * 0.95 : 0.1;
    this.ali.forEach((a, i) => (a.rotation.z = (i === 0 ? 1 : -1) * battito));
    this.ali.forEach((a) => (a.rotation.y = batte ? 0 : 0.15));
    this.coda.rotation.x = 0.12 + Math.sin(e * 9) * 0.05;
  }

  libera() {
    liberaTutto(this.gruppo);
  }
}
