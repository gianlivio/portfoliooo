import * as THREE from "three";

/**
 * Strumenti comuni agli ospiti della scena (galeone, drago, volpe, Icaro):
 * tempi di passaggio, direzione dello sguardo, texture disegnate su canvas,
 * il "loft" con cui si modellano corpi organici a sezioni, il rumore per gli shader.
 */

export interface Ospite {
  gruppo: THREE.Object3D;
  aggiorna(t: number, dt: number, camera: THREE.Camera): void;
  libera(): void;
}

export const casuale = (a: number, b: number) => a + Math.random() * (b - a);
export const segno = () => (Math.random() < 0.5 ? -1 : 1);
export const morbido = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};
export const fra = (x: number, a: number, b: number) => morbido((x - a) / (b - a));

export function prova() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ospiti");
}
/** Con ?ospiti=nome passa solo quell'ospite (per provarli uno alla volta). */
export function solo() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ospiti") || null;
}
/** Attesa prima del prossimo passaggio: normale, oppure breve in modalità prova. */
export const attesa = (a: number, b: number) => (prova() ? casuale(4, 7) : casuale(a, b));
/** Primo passaggio: in modalità prova quasi subito. */
export const primo = (normale: number, inProva: number) => (prova() ? inProva : normale);

/** Versori "avanti" e "di lato" sul piano xz, rispetto a dove guarda la camera. */
export function assi(camera: THREE.Camera) {
  const d = camera.getWorldDirection(new THREE.Vector3());
  const y = Math.atan2(d.x, -d.z);
  return {
    avanti: new THREE.Vector3(Math.sin(y), 0, -Math.cos(y)),
    lato: new THREE.Vector3(Math.cos(y), 0, Math.sin(y)),
  };
}

/** Generatore pseudocasuale con seme: la stessa forma a ogni montaggio. */
export function generatore(seme: number) {
  let s = seme;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/* ------------------------------------------------------------------ texture */

export function tela(l: number, a: number, disegna: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  const x = c.getContext("2d");
  if (x) disegna(x);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Punto luminoso morbido. */
export const alone = (colore = "#FFFFFF") =>
  tela(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, colore);
    g.addColorStop(0.3, colore + "AA");
    g.addColorStop(1, colore + "00");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  });

/** Ombra di contatto sul pavimento. */
export const ombra = () =>
  tela(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.6)");
    g.addColorStop(0.45, "rgba(0,0,0,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });

/** Bruma: tante macchie sovrapposte, bordo irregolare. */
export const bruma = (seme = 3) =>
  tela(128, 128, (x) => {
    const r = generatore(seme);
    for (let i = 0; i < 26; i++) {
      const cx = 64 + (r() - 0.5) * 60;
      const cy = 64 + (r() - 0.5) * 44;
      const rr = 14 + r() * 30;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.12})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    }
  });

/* --------------------------------------------------------------------- loft */

/**
 * Una sezione del corpo, perpendicolare all'asse z (che è "avanti").
 * l: semilarghezza; su/giu: semialtezza sopra e sotto il centro; n: quanto è squadrata (2 = ellisse).
 */
export type Anello = { z: number; y?: number; x?: number; l: number; su: number; giu?: number; n?: number };

type AnelloPieno = { z: number; y: number; x: number; l: number; su: number; giu: number; n: number };

const pieno = (a: Anello): AnelloPieno => ({
  z: a.z, y: a.y ?? 0, x: a.x ?? 0, l: a.l, su: a.su, giu: a.giu ?? a.su, n: a.n ?? 2,
});

function catmull(p0: number, p1: number, p2: number, p3: number, u: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}

/**
 * Superficie chiusa che passa per gli anelli, interpolati in modo morbido.
 * colore(k, angolo, punto): k va da 0 (primo anello) a 1 (ultimo); angolo 0 = destra, π/2 = sopra.
 */
export function loft(
  anelli: Anello[],
  { radiali = 20, passi = 4, colore }: {
    radiali?: number;
    passi?: number;
    colore?: (k: number, angolo: number, p: THREE.Vector3) => THREE.Color;
  } = {}
) {
  const A = anelli.map(pieno);
  const chiavi = ["z", "y", "x", "l", "su", "giu", "n"] as const;
  const R: AnelloPieno[] = [];
  for (let i = 0; i < A.length - 1; i++) {
    const p0 = A[Math.max(0, i - 1)], p1 = A[i], p2 = A[i + 1], p3 = A[Math.min(A.length - 1, i + 2)];
    for (let s = 0; s < passi; s++) {
      const u = s / passi;
      const r = {} as AnelloPieno;
      chiavi.forEach((c) => (r[c] = catmull(p0[c], p1[c], p2[c], p3[c], u)));
      r.l = Math.max(0.0005, r.l);
      r.su = Math.max(0.0005, r.su);
      r.giu = Math.max(0.0005, r.giu);
      R.push(r);
    }
  }
  R.push(A[A.length - 1]);

  const pos: number[] = [];
  const col: number[] = [];
  const p = new THREE.Vector3();
  const bianco = new THREE.Color(1, 1, 1);
  R.forEach((r, j) => {
    const k = j / (R.length - 1);
    for (let a = 0; a < radiali; a++) {
      const ang = (a / radiali) * Math.PI * 2;
      const c = Math.cos(ang), s = Math.sin(ang);
      const e = 2 / r.n;
      p.set(
        r.x + r.l * Math.sign(c) * Math.pow(Math.abs(c), e),
        r.y + (s >= 0 ? r.su : r.giu) * Math.sign(s) * Math.pow(Math.abs(s), e),
        r.z
      );
      pos.push(p.x, p.y, p.z);
      const cc = colore ? colore(k, ang, p) : bianco;
      col.push(cc.r, cc.g, cc.b);
    }
  });
  // tappi: un vertice al centro del primo e dell'ultimo anello
  const testa = R.length * radiali;
  const primo = R[0], ultimo = R[R.length - 1];
  pos.push(primo.x, primo.y, primo.z, ultimo.x, ultimo.y, ultimo.z);
  const c0 = colore ? colore(0, -Math.PI / 2, p.set(primo.x, primo.y, primo.z)) : bianco;
  const c1 = colore ? colore(1, -Math.PI / 2, p.set(ultimo.x, ultimo.y, ultimo.z)) : bianco;
  col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);

  const idx: number[] = [];
  for (let j = 0; j < R.length - 1; j++) {
    for (let a = 0; a < radiali; a++) {
      const b = (a + 1) % radiali;
      const i0 = j * radiali + a, i1 = j * radiali + b, i2 = (j + 1) * radiali + a, i3 = (j + 1) * radiali + b;
      idx.push(i0, i1, i2, i1, i3, i2);
    }
  }
  for (let a = 0; a < radiali; a++) {
    const b = (a + 1) % radiali;
    idx.push(testa, b, a);
    const o = (R.length - 1) * radiali;
    idx.push(testa + 1, o + a, o + b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Libera geometrie, materiali e texture di tutto ciò che sta sotto un oggetto. */
export function liberaTutto(o: THREE.Object3D, extra: { dispose(): void }[] = []) {
  const visti = new Set<{ dispose(): void }>();
  o.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.geometry) visti.add(m.geometry);
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    mats.forEach((mm) => {
      visti.add(mm);
      Object.values(mm).forEach((v) => {
        if (v instanceof THREE.Texture) visti.add(v);
      });
      const u = (mm as THREE.ShaderMaterial).uniforms;
      if (u) Object.values(u).forEach((v) => v.value instanceof THREE.Texture && visti.add(v.value));
    });
  });
  extra.forEach((e) => visti.add(e));
  visti.forEach((v) => v.dispose());
}

/* ---------------------------------------------------------------- rumore GLSL */

/** Rumore a valori in 3D, con una somma di ottave. */
export const RUMORE = /* glsl */ `
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rumore(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
                 mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                 mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float frattale(vec3 x){ return 0.5 * rumore(x) + 0.28 * rumore(x * 2.03 + 7.1) + 0.14 * rumore(x * 4.1 + 3.7) + 0.08 * rumore(x * 8.3 + 1.3); }
`;
