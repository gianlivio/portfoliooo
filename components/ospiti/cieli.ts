import * as THREE from "three";
import { type Ospite, alone, assi, attesa, casuale, fra, liberaTutto, loft, passa, primo, segno, tela, tocca } from "./comuni";

/**
 * Due intrusi del nostro tempo nel cielo dei miti.
 * Di notte un aereo di linea, alto e lontano: la sagoma quasi invisibile, le luci di navigazione
 * (rossa a sinistra, verde a destra), i lampi bianchi doppi alle estremità delle ali,
 * il faro rosso che pulsa sul dorso e sotto la pancia, la fila dei finestrini accesi.
 * Di giorno un jet altissimo, un punto d'argento che lascia due scie di condensazione:
 * nascono sottili poco dietro i motori, si allargano, si sfrangiano e svaniscono.
 */

/* ------------------------------------------------------------------ sagoma */

/** Aereo di linea in unità di scena (1 ≈ 10 m): fusoliera lungo +z, ali, coda, motori. */
function aereoDiLinea(mat: THREE.Material) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(loft([
    { z: -2.0, y: 0.12, l: 0.04, su: 0.05, giu: 0.03 },
    { z: -1.5, y: 0.04, l: 0.15, su: 0.16, giu: 0.13 },
    { z: -0.6, l: 0.2, su: 0.2 },
    { z: 1.2, l: 0.2, su: 0.2 },
    { z: 1.75, y: -0.02, l: 0.15, su: 0.15, giu: 0.14 },
    { z: 2.0, y: -0.04, l: 0.05, su: 0.06, giu: 0.05 },
  ], { radiali: 12, passi: 3 }), mat));
  const ala = (verso: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.55);
    s.lineTo(verso * 1.9, -0.45);
    s.lineTo(verso * 1.95, -0.62);
    s.lineTo(verso * 1.75, -0.6);
    s.lineTo(0, -0.35);
    s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2), mat);
    m.position.y = -0.08;
    m.rotation.z = verso * 0.08;
    return m;
  };
  g.add(ala(1), ala(-1));
  const coda = (verso: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, -1.25);
    s.lineTo(verso * 0.7, -1.8);
    s.lineTo(verso * 0.72, -1.95);
    s.lineTo(0, -1.85);
    s.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2).translate(0, 0.05, 0), mat);
  };
  g.add(coda(1), coda(-1));
  const deriva = new THREE.Shape();
  deriva.moveTo(-1.25, 0.15);
  deriva.lineTo(-1.95, 0.85);
  deriva.lineTo(-2.08, 0.85);
  deriva.lineTo(-1.98, 0.1);
  deriva.closePath();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(deriva).rotateY(-Math.PI / 2), mat));
  for (const x of [-0.7, 0.7]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 10).rotateX(Math.PI / 2), mat);
    m.position.set(x, -0.2, 0.35);
    g.add(m);
  }
  return g;
}

/* ------------------------------------------------------------------ aereo */

export class Aereo implements Ospite {
  gruppo = new THREE.Group();
  private aereo: THREE.Group;
  private luci: { s: THREE.Sprite; tipo: "rossa" | "verde" | "lampo" | "faro" | "coda"; fase: number; base: number }[] = [];
  private finestrini: THREE.Points;
  private texture: THREE.Texture[] = [];
  private stato = { prossima: primo(6, 2), inizio: -1, durata: 26, da: new THREE.Vector3(), a: new THREE.Vector3() };

  constructor() {
    const mat = new THREE.MeshBasicMaterial({ color: "#11141B", fog: false, side: THREE.DoubleSide, transparent: true });
    this.aereo = aereoDiLinea(mat);
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    const luce = (x: number, y: number, z: number, colore: string, tipo: "rossa" | "verde" | "lampo" | "faro" | "coda", base: number, fase = 0) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tx, color: colore, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0,
      }));
      s.position.set(x, y, z);
      s.scale.setScalar(base);
      this.aereo.add(s);
      this.luci.push({ s, tipo, fase, base });
    };
    // dal punto di vista del pilota la sinistra è +x (l'aereo guarda verso +z)
    luce(1.93, -0.06, -0.55, "#FF3B30", "rossa", 0.55);
    luce(-1.93, -0.06, -0.55, "#30FF7A", "verde", 0.55);
    luce(1.95, -0.06, -0.6, "#FFFFFF", "lampo", 1.6);
    luce(-1.95, -0.06, -0.6, "#FFFFFF", "lampo", 1.6, 0.0);
    luce(0, 0.24, 0.2, "#FF2A1A", "faro", 0.8, 0);
    luce(0, -0.24, 0.6, "#FF2A1A", "faro", 0.8, 0.5);
    luce(0, 0.12, -2.05, "#FFFFFF", "coda", 0.35);
    // finestrini: una fila per lato
    const pos: number[] = [];
    for (const x of [0.2, -0.2]) for (let z = -1.3; z <= 1.45; z += 0.09) pos.push(x, 0.05, z);
    this.finestrini = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color: "#FFD9A0", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })
    );
    this.aereo.add(this.finestrini);
    this.gruppo.add(this.aereo);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("cieloNotte", "aereo", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d = casuale(36, 44);
      const y = d * Math.tan(casuale(0.25, 0.33));
      s.da.copy(avanti).multiplyScalar(d + casuale(-6, 6)).addScaledVector(lato, -46 * v).setY(y + casuale(-1, 1));
      s.a.copy(avanti).multiplyScalar(d + casuale(-6, 6)).addScaledVector(lato, 46 * v).setY(y + casuale(-1, 1));
      s.durata = casuale(24, 30);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + attesa(85, 100);
      this.gruppo.visible = false;
      passa("cieloNotte", t, attesa(8, 15));
      return;
    }
    this.aereo.position.lerpVectors(s.da, s.a, k);
    this.aereo.lookAt(s.a);
    this.aereo.rotateZ(0.04);
    const vis = Math.min(fra(e, 0, 2), 1 - fra(e, s.durata - 2, s.durata));
    (this.finestrini.material as THREE.PointsMaterial).opacity = 0.55 * vis;
    this.luci.forEach((l) => {
      let a = 1;
      if (l.tipo === "lampo") {
        // doppio lampo ogni 1,3 secondi
        const c = (e + l.fase) % 1.3;
        a = c < 0.05 || (c > 0.15 && c < 0.2) ? 1 : 0;
      } else if (l.tipo === "faro") {
        const c = (e + l.fase) % 1.0;
        a = c < 0.12 ? 1 : 0.06;
      } else if (l.tipo === "coda") a = 0.6;
      else a = 0.85;
      l.s.material.opacity = a * vis;
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}

/* ------------------------------------------------------------------ jet e scie */

const CAMPIONI = 360;
const VITA = 30;

type Scia = { punti: THREE.Vector3[]; tempi: number[]; mesh: THREE.Mesh; lato: number };

export class Jet implements Ospite {
  gruppo = new THREE.Group();
  private aereo: THREE.Group;
  private riflesso: THREE.Sprite;
  private scie: Scia[] = [];
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(40, 4), inizio: -1, durata: 40, da: new THREE.Vector3(), a: new THREE.Vector3(),
    campione: 0, vento: new THREE.Vector3(),
  };
  private tmp = { lato: new THREE.Vector3(), dir: new THREE.Vector3(), cam: new THREE.Vector3(), p: new THREE.Vector3() };

  constructor() {
    const mat = new THREE.MeshBasicMaterial({ color: "#B9C0CA", fog: false, side: THREE.DoubleSide });
    this.aereo = aereoDiLinea(mat);
    this.aereo.scale.setScalar(0.45);
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    this.riflesso = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tx, color: "#FFFFFF", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0,
    }));
    this.riflesso.scale.setScalar(1.6);
    this.aereo.add(this.riflesso);
    this.gruppo.add(this.aereo);
    // la scia: bordi sfumati, un po' di trama
    const txScia = tela(16, 64, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.35, "rgba(255,255,255,0.9)");
      g.addColorStop(0.5, "rgba(255,255,255,1)");
      g.addColorStop(0.65, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 16, 64);
    });
    this.texture.push(txScia);
    for (const lato of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CAMPIONI * 2 * 3), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(CAMPIONI * 2 * 4), 4));
      const uv = new Float32Array(CAMPIONI * 2 * 2);
      for (let i = 0; i < CAMPIONI; i++) uv.set([i / 8, 0, i / 8, 1], i * 4);
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      const idx: number[] = [];
      for (let i = 0; i < CAMPIONI - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      g.setIndex(idx);
      g.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: txScia, vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      }));
      mesh.frustumCulled = false;
      this.gruppo.add(mesh);
      this.scie.push({ punti: [], tempi: [], mesh, lato });
    }
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("cieloGiorno", "jet", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      // entro il piano lontano della camera (60): la scia non deve essere tagliata
      const d = casuale(33, 38);
      const y = d * Math.tan(casuale(0.26, 0.31));
      s.da.copy(avanti).multiplyScalar(d + casuale(-5, 5)).addScaledVector(lato, -38 * v).setY(y);
      s.a.copy(avanti).multiplyScalar(d + casuale(-5, 5)).addScaledVector(lato, 38 * v).setY(y + casuale(-1.5, 1.5));
      s.vento.set(casuale(-0.08, 0.08), 0.02, casuale(-0.08, 0.08));
      s.durata = casuale(30, 36);
      s.inizio = t;
      s.campione = 0;
      this.scie.forEach((sc) => {
        sc.punti = [];
        sc.tempi = [];
      });
      this.gruppo.visible = true;
      this.aereo.visible = true;
    }
    const e = t - s.inizio;
    const k = Math.min(1, e / s.durata);
    this.aereo.position.lerpVectors(s.da, s.a, k);
    this.aereo.lookAt(s.a);
    this.aereo.visible = k < 1;
    // un lampo di sole sulla fusoliera, di tanto in tanto
    this.riflesso.material.opacity = Math.max(0, Math.sin(e * 0.7)) ** 8 * 0.8;

    // nuovi campioni dietro i motori
    const { lato, dir, cam, p } = this.tmp;
    dir.subVectors(s.a, s.da).normalize();
    lato.set(-dir.z, 0, dir.x);
    if (k < 1 && e > s.campione) {
      s.campione = e + 0.1;
      this.scie.forEach((sc) => {
        sc.punti.push(this.aereo.position.clone().addScaledVector(lato, sc.lato * 0.3).addScaledVector(dir, -0.6));
        sc.tempi.push(t);
        if (sc.punti.length > CAMPIONI) {
          sc.punti.shift();
          sc.tempi.shift();
        }
      });
    }
    // la scia: si allarga, si sfrangia, va col vento, svanisce
    cam.copy(camera.position);
    let vive = false;
    this.scie.forEach((sc) => {
      const pos = sc.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const col = sc.mesh.geometry.attributes.color as THREE.BufferAttribute;
      const n = sc.punti.length;
      for (let i = 0; i < n; i++) {
        const eta = t - sc.tempi[i];
        p.copy(sc.punti[i]).addScaledVector(s.vento, eta);
        p.y -= eta * eta * 0.002;
        p.addScaledVector(lato, Math.sin(i * 0.37 + eta * 0.4) * eta * 0.01);
        const largo = 0.09 + eta * 0.05;
        const vista = cam.clone().sub(p).normalize();
        const fianco = dir.clone().cross(vista).normalize().multiplyScalar(largo);
        pos.setXYZ(i * 2, p.x - fianco.x, p.y - fianco.y, p.z - fianco.z);
        pos.setXYZ(i * 2 + 1, p.x + fianco.x, p.y + fianco.y, p.z + fianco.z);
        // la scia si forma un attimo dopo il motore, poi dura e si dissolve
        const a = fra(eta, 0.2, 1.2) * Math.pow(Math.max(0, 1 - eta / VITA), 1.3) * 0.95;
        if (a > 0.01) vive = true;
        col.setXYZW(i * 2, 1, 1, 1, a);
        col.setXYZW(i * 2 + 1, 1, 1, 1, a);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      sc.mesh.geometry.setDrawRange(0, Math.max(0, (n - 1) * 6));
    });

    if (k >= 1 && !vive) {
      s.inizio = -1;
      s.prossima = t + attesa(90, 150);
      this.gruppo.visible = false;
      passa("cieloGiorno", t, attesa(30, 60));
    }
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
