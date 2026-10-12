import * as THREE from "three";
import { type Ospite, alone, cancella, casuale, finito, fra, liberaTutto, primo, riposo, segno, tocca } from "./comuni";

/**
 * Di notte, due cose che passano in orbita, come si vedono davvero a occhio nudo.
 * La Stazione spaziale: un punto bianco, fermo nella luce (non lampeggia, a differenza degli aerei),
 * che attraversa il cielo senza rumore e poi, entrando nell'ombra della Terra, si fa arancio e si spegne
 * a metà del cielo.
 * Il treno di Starlink: una fila di punti uguali, in colonna e alla stessa distanza, che scorre
 * diritta; i satelliti si accendono uno dopo l'altro quando prendono il sole e si spengono in fila.
 */

const R = 46; // lontano, ma dentro il piano di taglio della camera (60)

/** Yaw della camera: 0 = −z. */
function yaw(camera: THREE.Camera) {
  const d = camera.getWorldDirection(new THREE.Vector3());
  return Math.atan2(d.x, -d.z);
}

/** Un arco di cielo: azimut e altezza (radianti) che variano con k da 0 a 1. */
type Arco = { az0: number; az1: number; h0: number; h1: number; gobba: number };

function arcoDavanti(camera: THREE.Camera, ampiezza: number): Arco {
  const c = yaw(camera) + casuale(-0.25, 0.25);
  const v = segno();
  return {
    az0: c - v * ampiezza,
    az1: c + v * ampiezza,
    h0: casuale(0.1, 0.15),
    h1: casuale(0.12, 0.18),
    gobba: casuale(0.06, 0.1),
  };
}

function suArco(a: Arco, k: number, out: THREE.Vector3) {
  const az = THREE.MathUtils.lerp(a.az0, a.az1, k);
  const h = THREE.MathUtils.lerp(a.h0, a.h1, k) + Math.sin(k * Math.PI) * a.gobba;
  return out.set(Math.sin(az) * Math.cos(h) * R, Math.sin(h) * R, -Math.cos(az) * Math.cos(h) * R);
}

function punti(n: number, tx: THREE.Texture, size: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({
    map: tx, size, sizeAttenuation: false, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  p.frustumCulled = false;
  p.raycast = () => undefined;
  return p;
}

/* ------------------------------------------------------------------ stazione spaziale */

export class Iss implements Ospite {
  gruppo = new THREE.Group();
  private punto: THREE.Points;
  private alone: THREE.Points;
  private texture: THREE.Texture[] = [];
  private stato = { prossima: primo(4, 2), inizio: -1, durata: 24, ombra: 0.78, arco: null as Arco | null };
  private p = new THREE.Vector3();
  private c = new THREE.Color();

  constructor() {
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    this.punto = punti(1, tx, 10);
    this.alone = punti(1, tx, 26);
    this.gruppo.add(this.alone, this.punto);
    this.gruppo.visible = false;
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notteCielo", "iss", t)) return;
      s.arco = arcoDavanti(camera, 1.15);
      s.durata = casuale(22, 26);
      // a volte entra nell'ombra prima della fine, a volte esce dal campo ancora accesa
      s.ombra = Math.random() < 0.65 ? casuale(0.62, 0.8) : 2;
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1 || !s.arco) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notteCielo", "iss", t);
      return;
    }
    suArco(s.arco, k, this.p);
    // sorge bassa e fioca, si fa piena; nell'ombra della Terra vira all'arancio e si spegne in due secondi
    const sorge = fra(k, 0, 0.12);
    const tramonto = s.ombra < 1 ? fra(k, s.ombra, s.ombra + 2 / s.durata) : fra(k, 0.9, 1);
    const luce = sorge * (1 - tramonto);
    const arancio = s.ombra < 1 ? fra(k, s.ombra - 0.03, s.ombra + 1 / s.durata) : 0;
    this.c.setRGB(1, 0.97 - arancio * 0.4, 0.9 - arancio * 0.65).multiplyScalar(luce);
    for (const pt of [this.punto, this.alone]) {
      const g = pt.geometry;
      (g.attributes.position as THREE.BufferAttribute).setXYZ(0, this.p.x, this.p.y, this.p.z);
      g.attributes.position.needsUpdate = true;
      const f = pt === this.alone ? 0.22 : 1;
      (g.attributes.color as THREE.BufferAttribute).setXYZ(0, this.c.r * f, this.c.g * f, this.c.b * f);
      g.attributes.color.needsUpdate = true;
    }
  }

  libera() {
    cancella("notteCielo", "iss");
    liberaTutto(this.gruppo, this.texture);
  }
}

/* ------------------------------------------------------------------ treno di Starlink */

const VAGONI = 26;

export class Starlink implements Ospite {
  gruppo = new THREE.Group();
  private treno: THREE.Points;
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(4, 2), inizio: -1, durata: 30, passo: 0.022, arco: null as Arco | null,
    lampi: new Float32Array(VAGONI), varia: new Float32Array(VAGONI),
  };
  private p = new THREE.Vector3();

  constructor() {
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    this.treno = punti(VAGONI, tx, 5);
    this.gruppo.add(this.treno);
    this.gruppo.visible = false;
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notteCielo", "starlink", t)) return;
      s.arco = arcoDavanti(camera, 0.95);
      s.arco.gobba *= 0.5;
      s.durata = casuale(26, 32);
      s.passo = casuale(0.018, 0.026);
      for (let i = 0; i < VAGONI; i++) {
        s.varia[i] = casuale(0.7, 1);
        s.lampi[i] = Math.random() < 0.15 ? casuale(0.2, 0.8) : -1;
      }
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    // il primo vagone corre da 0 a 1 più la lunghezza del treno, perché anche l'ultimo arrivi in fondo
    const K = (e / s.durata) * (1 + VAGONI * s.passo);
    if (K >= 1 + VAGONI * s.passo || !s.arco) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notteCielo", "starlink", t);
      return;
    }
    const pos = this.treno.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.treno.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < VAGONI; i++) {
      const k = K - i * s.passo;
      if (k < 0 || k > 1) {
        col.setXYZ(i, 0, 0, 0);
        continue;
      }
      suArco(s.arco, k, this.p);
      pos.setXYZ(i, this.p.x, this.p.y, this.p.z);
      // si accendono entrando nel sole, si spengono uno dopo l'altro verso la fine; qualcuno brilla un attimo
      let b = fra(k, 0.02, 0.1) * (1 - fra(k, 0.78, 0.9)) * s.varia[i] * 0.85;
      if (s.lampi[i] > 0) b += Math.max(0, 1 - Math.abs(k - s.lampi[i]) * 25) * 0.6;
      col.setXYZ(i, b, b, b * 0.96);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  libera() {
    cancella("notteCielo", "starlink");
    liberaTutto(this.gruppo, this.texture);
  }
}
