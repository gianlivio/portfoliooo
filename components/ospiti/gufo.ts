import * as THREE from "three";
import { type Ospite, assi, cancella, casuale, finito, liberaTutto, loft, primo, riposo, tocca, lato as latoRegia } from "./comuni";

/**
 * Di notte un gufo reale attraversa la scena dietro le carte, basso e silenzioso: qualche battito lento,
 * poi una lunga planata. Piumaggio bruno screziato, il disco facciale chiaro, i ciuffi sulle orecchie,
 * gli occhi arancio accesi che si vedono anche al buio. A metà strada gira la testa verso chi guarda.
 * Unità del modello: l'apertura alare è circa 1,6; il becco guarda verso +z.
 */

type Ala = { g: THREE.Group; punta: THREE.Group; lato: number };

export class Gufo implements Ospite {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private testa = new THREE.Group();
  private ali: Ala[] = [];
  private stato = {
    prossima: primo(3, 2), inizio: -1, durata: 14,
    p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), p3: new THREE.Vector3(),
  };
  private tmp = { a: new THREE.Vector3(), b: new THREE.Vector3() };
  private camera = new THREE.Vector3();

  constructor() {
    const piume = new THREE.MeshStandardMaterial({ color: "#7A5A3C", roughness: 0.95, emissive: "#4A3420", emissiveIntensity: 0.9, side: THREE.DoubleSide, fog: false });
    const chiaro = new THREE.MeshStandardMaterial({ color: "#C9AE86", roughness: 0.9, emissive: "#7A6446", emissiveIntensity: 0.8, fog: false });
    const scuro = new THREE.MeshStandardMaterial({ color: "#3E2C1E", roughness: 0.95, emissive: "#160E08", emissiveIntensity: 0.5, side: THREE.DoubleSide, fog: false });
    // il corpo: tozzo, a goccia, con la coda corta
    this.corpo.add(new THREE.Mesh(loft([
      { z: -0.42, l: 0.05, su: 0.02, giu: 0.02 },
      { z: -0.3, l: 0.12, su: 0.06, giu: 0.08 },
      { z: -0.05, l: 0.2, su: 0.17, giu: 0.2 },
      { z: 0.15, l: 0.19, su: 0.17, giu: 0.17 },
      { z: 0.26, l: 0.14, su: 0.12, giu: 0.12 },
    ], { radiali: 14, passi: 3 }), piume));
    // il petto chiaro, sotto
    this.corpo.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10).scale(1, 0.8, 1.4).translate(0, -0.08, 0.02), chiaro));
    // la testa: tonda e larga, il disco facciale, gli occhi, il becco, i ciuffi
    this.testa.position.set(0, 0.06, 0.32);
    this.testa.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12).scale(1.1, 1, 0.95), piume));
    for (const s of [-1, 1]) {
      const disco = new THREE.Mesh(new THREE.CircleGeometry(0.085, 18), chiaro);
      disco.position.set(s * 0.075, 0.0, 0.15);
      disco.rotation.y = s * 0.35;
      this.testa.add(disco);
      const occhio = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), new THREE.MeshBasicMaterial({ color: "#FF9A1E", toneMapped: false, fog: false }));
      occhio.position.set(s * 0.07, 0.01, 0.155);
      this.testa.add(occhio);
      const pupilla = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: "#111111", fog: false }));
      pupilla.position.set(s * 0.07, 0.01, 0.19);
      this.testa.add(pupilla);
      const ciuffo = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), scuro);
      ciuffo.position.set(s * 0.1, 0.17, 0.02);
      ciuffo.rotation.set(-0.4, 0, -s * 0.35);
      this.testa.add(ciuffo);
    }
    const becco = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 6).rotateX(Math.PI / 2 + 0.6), scuro);
    becco.position.set(0, -0.03, 0.17);
    this.testa.add(becco);
    this.corpo.add(this.testa);
    // le ali: larghe e arrotondate, con le remiganti a frange; ogni ala ha una parte interna e la punta
    const forma = (lungo: number, largo: number) => {
      const f = new THREE.Shape();
      f.moveTo(0, 0.06);
      f.quadraticCurveTo(lungo * 0.5, largo * 0.35, lungo, 0.02);
      for (let k = 0; k <= 5; k++) f.lineTo(lungo - k * (lungo / 6), -largo * (0.55 + 0.12 * (k % 2)));
      f.lineTo(0, -largo * 0.5);
      f.closePath();
      return new THREE.ShapeGeometry(f).rotateX(Math.PI / 2);
    };
    for (const lato of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(lato * 0.14, 0.06, 0.05);
      const interna = new THREE.Mesh(forma(0.38, 0.36).scale(lato, 1, 1), piume);
      g.add(interna);
      const punta = new THREE.Group();
      punta.position.x = lato * 0.37;
      punta.add(new THREE.Mesh(forma(0.36, 0.3).scale(lato, 1, 1), scuro));
      g.add(punta);
      this.corpo.add(g);
      this.ali.push({ g, punta, lato });
    }
    // le zampe raccolte sotto la coda
    for (const s of [-1, 1]) {
      const z = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 3, 6).rotateX(Math.PI / 2), chiaro);
      z.position.set(s * 0.06, -0.16, -0.12);
      this.corpo.add(z);
    }
    this.gruppo.add(this.corpo);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notteCielo", "gufo", t)) return;
      // basso, dietro le carte: entra da un lato, scende un poco, risale ed esce dall'altro
      const { avanti, lato } = assi(camera);
      const v = latoRegia("notteCielo");
      const d = casuale(8.5, 10.5);
      const h = casuale(2.6, 3.4);
      s.p0.copy(avanti).multiplyScalar(d + 2).addScaledVector(lato, -14 * v).setY(h + 1.2);
      s.p1.copy(avanti).multiplyScalar(d - 1).addScaledVector(lato, -4 * v).setY(h - 0.4);
      s.p2.copy(avanti).multiplyScalar(d - 1).addScaledVector(lato, 4 * v).setY(h - 0.2);
      s.p3.copy(avanti).multiplyScalar(d + 2).addScaledVector(lato, 14 * v).setY(h + 1.5);
      s.durata = casuale(11, 14);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notteCielo", "gufo", t);
      return;
    }
    const bez = (kk: number, out: THREE.Vector3) => {
      const u = 1 - kk;
      return out.set(0, 0, 0)
        .addScaledVector(s.p0, u * u * u).addScaledVector(s.p1, 3 * u * u * kk)
        .addScaledVector(s.p2, 3 * u * kk * kk).addScaledVector(s.p3, kk * kk * kk);
    };
    const { a, b } = this.tmp;
    bez(k, a);
    bez(Math.min(1, k + 0.01), b);
    this.corpo.position.copy(a);
    this.corpo.lookAt(b);
    this.corpo.scale.setScalar(1.3);
    // battiti lenti e profondi per un tratto, poi planata con le ali distese, poi di nuovo
    const ciclo = e % 5.5;
    const batte = ciclo < 2.4;
    const fase = Math.sin(e * 5.2);
    this.ali.forEach((al) => {
      const giu = batte ? fase * 0.75 : 0.05 * Math.sin(e * 1.3);
      al.g.rotation.z = -al.lato * giu;
      al.punta.rotation.z = -al.lato * (batte ? Math.sin(e * 5.2 - 0.6) * 0.45 : 0.04);
    });
    this.corpo.position.y += batte ? -fase * 0.05 : 0;
    // a metà strada volta la testa verso chi guarda, poi torna a guardare avanti
    const sguardo = Math.max(0, Math.sin(((k - 0.3) / 0.4) * Math.PI)) * (k > 0.3 && k < 0.7 ? 1 : 0);
    camera.getWorldPosition(this.camera);
    const versoCamera = this.corpo.worldToLocal(this.camera.clone());
    const yaw = Math.atan2(versoCamera.x, versoCamera.z);
    this.testa.rotation.y = THREE.MathUtils.clamp(yaw, -1.7, 1.7) * sguardo;
  }

  libera() {
    cancella("notteCielo", "gufo");
    liberaTutto(this.gruppo);
  }
}
