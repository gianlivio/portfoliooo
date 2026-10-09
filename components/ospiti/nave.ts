import * as THREE from "three";
import { PELO_ACQUA, gocce } from "../condivisi";
import {
  type Ospite, RUMORE, alone, assi, attesa, bruma, casuale, fra, liberaTutto, loft, primo, segno,
} from "./comuni";

/**
 * Di notte, ogni tanto, la nave di Ulisse attraversa l'acqua fra chi guarda e le carte:
 * una nave greca fantasma, lunga e bassa, con lo sperone a pelo d'acqua, l'occhio dipinto a prua,
 * la poppa che si arriccia all'insù, gli scudi appesi lungo il bordo, undici remi per lato
 * che vogano insieme e toccano l'acqua lasciando cerchi. Una sola vela quadra, rattoppata,
 * con la greca; e Ulisse legato all'albero, la testa alzata, ad ascoltare.
 * Si compone dal buio a chiazze, a tratti vacilla, e si disfa.
 */

const SLOT = [4, 5, 6, 7];
const COLORE = new THREE.Color("#9FEBD9");
const LUCE = new THREE.Color("#7DFFC4");
const REMI = 11;
const VOGATA = 2.3;

/* ------------------------------------------------------------------ shader */

const VERT = /* glsl */ `
uniform mat4 uInv;
uniform float uT;
uniform float uGonfio;
varying vec3 vNave;
varying vec3 vNN;
varying vec3 vV;
varying vec2 vUv;
void main(){
  vec3 p = position;
  vUv = uv;
  #ifdef VELA
    float g = sin(uv.x * 3.14159) * sin(uv.y * 2.8 + 0.2);
    p.z += g * uGonfio * (0.88 + 0.12 * sin(uT * 1.3 + uv.y * 3.0));
    float f = 1.0 - uv.y;
    p.z += sin(uT * 5.3 + uv.x * 9.0 + uv.y * 4.0) * 0.016 * f;
    p.x += sin(uT * 3.7 + uv.y * 7.0) * 0.007 * f;
  #endif
  vec4 w = modelMatrix * vec4(p, 1.0);
  vNave = (uInv * w).xyz;
  vNN = normalize(mat3(uInv) * mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * w;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uForza;
uniform float uBuchi;
uniform float uScafo;
uniform float uSeme;
uniform vec3 uColore;
uniform vec3 uLuce;
varying vec3 vNave;
varying vec3 vNN;
varying vec3 vV;
varying vec2 vUv;
${RUMORE}
/** La greca: un meandro a spirale quadra, ripetuto lungo la banda. */
float greca(vec2 q){
  vec2 c = vec2(fract(q.x), q.y);
  float t = 0.14;
  float s = step(c.y, t);
  s = max(s, step(c.x, t));
  s = max(s, step(1.0 - t, c.y) * step(c.x, 0.78));
  s = max(s, step(0.78 - t, c.x) * step(c.x, 0.78) * step(0.32, c.y));
  s = max(s, step(0.32, c.y) * step(c.y, 0.32 + t) * step(0.36, c.x) * step(c.x, 0.78));
  s = max(s, step(0.36, c.x) * step(c.x, 0.36 + t) * step(0.32, c.y) * step(c.y, 0.66));
  return s;
}
void main(){
  vec3 v = normalize(vV);
  #ifdef VELA
    vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
  #else
    // normali per faccia: lo scafo è fatto di tavole, non di una superficie morbida
    vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
  #endif
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  vec3 q = vNave;

  float d = frattale(q * 2.3 + vec3(0.0, uT * 0.18, uSeme)) * 0.85 + clamp(q.y, -0.3, 2.5) * 0.1;
  float soglia = uVis * 1.2;
  if (d > soglia) discard;
  float orlo = smoothstep(soglia - 0.06, soglia, d) * (1.0 - step(0.999, uVis));

  vec3 c;
  float a;
  #ifdef VELA
    float s = frattale(vec3(vUv * vec2(4.0, 6.0), uSeme));
    float basso = 1.0 - smoothstep(0.0, 0.3, vUv.y);
    float lati = 1.0 - smoothstep(0.0, 0.08, min(vUv.x, 1.0 - vUv.x));
    float fili = rumore(vec3(vUv.x * 34.0, vUv.y * 2.5, uSeme)) * basso * 0.3;
    float lim = 0.24 + basso * 0.22 + lati * 0.14 + fili;
    if (s < lim) discard;
    float bordo = 1.0 - smoothstep(lim, lim + 0.045, s);
    float trama = 0.85 + 0.15 * sin(vUv.x * 260.0) * sin(vUv.y * 220.0);
    // toppe cucite: rettangoli più chiari con l'orlo di punti
    vec2 tp = abs(vUv - vec2(0.3, 0.62)) - vec2(0.08, 0.06);
    vec2 tp2 = abs(vUv - vec2(0.7, 0.42)) - vec2(0.06, 0.09);
    float toppa = max(step(max(tp.x, tp.y), 0.0), step(max(tp2.x, tp2.y), 0.0));
    float cucitura = (1.0 - smoothstep(0.0, 0.006, abs(max(tp.x, tp.y)))) + (1.0 - smoothstep(0.0, 0.006, abs(max(tp2.x, tp2.y))));
    cucitura *= step(0.5, fract(vUv.x * 60.0 + vUv.y * 60.0));
    // la greca, in basso e in alto
    float banda = 0.0;
    if (vUv.y > 0.1 && vUv.y < 0.19) banda = greca(vec2(vUv.x * 11.0, (vUv.y - 0.1) / 0.09));
    if (vUv.y > 0.84 && vUv.y < 0.9) banda = greca(vec2(vUv.x * 16.0 + 0.5, (vUv.y - 0.84) / 0.06));
    float macchie = 0.7 + 0.6 * frattale(vec3(vUv * 9.0, uSeme + 4.0));
    c = uColore * (0.15 + 0.4 * fres) * trama * macchie * (1.0 + toppa * 0.5);
    c += uColore * bordo * 0.9 + uLuce * banda * 0.55 + uColore * cucitura * 0.5;
    a = 0.2 + 0.36 * fres + bordo * 0.55 + banda * 0.4 + toppa * 0.08 + cucitura * 0.3;
  #else
    float m = frattale(q * vec3(5.0, 7.0, 5.0) + uSeme);
    if (m < uBuchi) discard;
    float bucato = 1.0 - smoothstep(uBuchi, uBuchi + 0.05, m);
    float fa = abs(fract(q.y * 22.0) - 0.5) * 2.0;
    float giunto = 1.0 - smoothstep(0.0, 0.2, fa);
    c = uColore * (0.1 + 0.95 * fres) * (1.0 - 0.5 * giunto) * (0.7 + 0.6 * m);
    c += uColore * bucato * 1.1;
    a = 0.12 + 0.8 * fres + bucato * 0.6;
    if (uScafo > 0.5 && gl_FrontFacing) {
      float fuori = smoothstep(0.3, 0.6, abs(vNN.x));
      // l'occhio a prua: mandorla, iride, pupilla
      vec2 e = vec2((q.z - 1.16) / 0.12, (q.y - 0.27) / 0.055);
      float mandorla = step(abs(e.y), (1.0 - e.x * e.x)) * step(abs(e.x), 1.0);
      float contorno = mandorla * (1.0 - step(abs(e.y), (1.0 - e.x * e.x) * 0.72));
      float iride = 1.0 - smoothstep(0.85, 1.0, length(vec2((q.z - 1.17) / 0.04, (q.y - 0.27) / 0.04)));
      float pupilla = 1.0 - smoothstep(0.7, 1.0, length(vec2((q.z - 1.17) / 0.017, (q.y - 0.27) / 0.017)));
      float occhio = fuori * (contorno * 0.9 + mandorla * iride * (1.0 - pupilla) * 1.3 + mandorla * 0.15);
      // scalmiere: un forellino acceso per ogni remo
      float zz = (q.z + 0.95) / 0.19;
      float foro = (1.0 - smoothstep(0.012, 0.022, length(vec2((fract(zz + 0.5) - 0.5) * 0.19, q.y - 0.245))))
                   * step(-0.1, zz) * step(zz, 10.5) * fuori;
      float palpito = 0.75 + 0.25 * sin(uT * 7.0 + q.z * 5.0) * sin(uT * 2.3);
      c += uLuce * (occhio * 1.6 + foro * 0.8 * palpito);
      a += occhio + foro * 0.6;
    }
  #endif
  c += vec3(0.8, 1.0, 0.95) * orlo * 1.8;
  a += orlo;
  a *= smoothstep(-0.1, 0.12, q.y) * uForza;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

type Comuni = {
  uT: { value: number };
  uVis: { value: number };
  uForza: { value: number };
  uInv: { value: THREE.Matrix4 };
  uColore: { value: THREE.Color };
  uLuce: { value: THREE.Color };
};

function spettro(comuni: Comuni, { vela = false, buchi = 0.2, scafo = 0, gonfio = 0, seme = 0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: vela ? { VELA: "" } : {},
    uniforms: {
      ...comuni,
      uBuchi: { value: buchi },
      uScafo: { value: scafo },
      uGonfio: { value: gonfio },
      uSeme: { value: seme },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/* ------------------------------------------------------------------ forme */

/** Scafo: [z, orlo, chiglia, semilarghezza]. Lungo e basso, poppa e prua che salgono. */
const SCAFO: [number, number, number, number][] = [
  [-1.46, 0.6, 0.22, 0.05],
  [-1.3, 0.48, 0.02, 0.17],
  [-1.0, 0.38, -0.12, 0.3],
  [-0.4, 0.33, -0.18, 0.36],
  [0.4, 0.33, -0.18, 0.35],
  [1.0, 0.37, -0.12, 0.27],
  [1.3, 0.44, -0.02, 0.14],
  [1.43, 0.48, 0.05, 0.04],
];

function interpola(z: number, i: 1 | 3) {
  for (let k = 0; k < SCAFO.length - 1; k++) {
    const a = SCAFO[k], b = SCAFO[k + 1];
    if (z >= a[0] && z <= b[0]) return a[i] + ((z - a[0]) / (b[0] - a[0])) * (b[i] - a[i]);
  }
  return i === 1 ? 0.33 : 0.3;
}
const orlo = (z: number) => interpola(z, 1);
const fianco = (z: number) => interpola(z, 3) * 0.97;

function vela(l: number, alto: number, basso: number, nx = 16, ny = 12) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      pos.push((u - 0.5) * 2 * l * (0.97 + v * 0.03), basso + (alto - basso) * v, 0);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      idx.push(k, k + 1, k + nx + 1, k + 1, k + nx + 2, k + nx + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

function asta(da: THREE.Vector3, a: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, lati = 6) {
  const g = new THREE.CylinderGeometry(r1, r0, da.distanceTo(a), lati, 3, true);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(da).add(a).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(da).normalize());
  return m;
}

function tubo(punti: THREE.Vector3[], r: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti), 24, r, 6, false), mat);
}

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ALBERO = { z: 0.08, base: 0.3, cima: 2.05, pennone: 1.86, largo: 0.98, piede: 0.78 };

type Remo = { g: THREE.Group; lato: number; z: number };

/* ------------------------------------------------------------------ nave */

export class Nave implements Ospite {
  gruppo = new THREE.Group();
  private nave = new THREE.Group();
  private comuni: Comuni;
  private sartiame: THREE.LineSegments;
  private funi: THREE.LineSegments;
  private lanterne: THREE.Sprite[] = [];
  private nuvole: { s: THREE.Sprite; base: THREE.Vector3; fase: number; vel: number }[] = [];
  private remi: Remo[] = [];
  private fiamma: THREE.Mesh;
  private ulisse: THREE.Group;
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(12, 3), inizio: -1, durata: 28,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    vacilla: 0, prossimoVacillo: 0, slot: 0, fase: 0, colpo: -1, prua: 0,
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), w: new THREE.Vector3() };

  constructor() {
    this.comuni = {
      uT: { value: 0 },
      uVis: { value: 0 },
      uForza: { value: 1 },
      uInv: { value: new THREE.Matrix4() },
      uColore: { value: COLORE.clone() },
      uLuce: { value: LUCE.clone() },
    };
    const c = this.comuni;
    const legno = spettro(c, { buchi: 0.12 });
    const scafoMat = spettro(c, { buchi: 0.2, scafo: 1, seme: 2 });
    const bronzo = spettro(c, { buchi: 0.05, seme: 7 });
    const linee: number[] = [];
    const segmento = (a: THREE.Vector3, b: THREE.Vector3, pancia = 0, n = 8, arr = linee) => {
      let prima = a;
      for (let k = 1; k <= n; k++) {
        const u = k / n;
        const p = a.clone().lerp(b, u);
        p.y -= Math.sin(u * Math.PI) * pancia;
        arr.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
        prima = p;
      }
    };

    // scafo a tavole, spigoloso
    this.nave.add(new THREE.Mesh(
      loft(SCAFO.map(([z, cima, chiglia, l]) => ({ z, y: (cima + chiglia) / 2, l, su: (cima - chiglia) / 2, n: 3.2 })), { radiali: 18, passi: 4 }),
      scafoMat
    ));
    // cinte: due listoni lungo i fianchi, e il capodibanda
    for (const lato of [-1, 1]) {
      for (const [dy, f] of [[0.205, 1.0], [0.29, 1.0], [0, 0.97]] as [number, number][]) {
        let prima: THREE.Vector3 | null = null;
        for (let z = -1.38; z <= 1.38; z += 0.07) {
          const y = dy === 0 ? orlo(z) + 0.01 : Math.min(dy, orlo(z) - 0.02);
          const p = V3(lato * fianco(z) * f * (dy === 0 ? 1 : 1.02), y, z);
          if (prima) linee.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
          prima = p;
        }
      }
    }

    // sperone di bronzo a pelo d'acqua, a tre lame
    {
      const g = new THREE.ConeGeometry(0.07, 0.36, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4);
      const m = new THREE.Mesh(g, bronzo);
      m.position.set(0, 0.05, 1.58);
      m.scale.set(1, 0.6, 1);
      this.nave.add(m);
      for (const dy of [-0.03, 0.03, 0.09]) {
        const lama = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.1), bronzo);
        lama.position.set(0, 0.05 + dy, 1.5);
        this.nave.add(lama);
      }
    }
    // dritto di prua che sale e si piega indietro
    this.nave.add(tubo([V3(0, 0.08, 1.43), V3(0, 0.46, 1.47), V3(0, 0.66, 1.52), V3(0, 0.78, 1.47), V3(0, 0.8, 1.4)], 0.018, legno));
    // aplustre: la poppa che si arriccia in un ventaglio di volute
    for (const [dx, h] of [[0, 1], [-0.05, 0.86], [0.05, 0.86]] as [number, number][]) {
      this.nave.add(tubo([
        V3(0, 0.3, -1.4), V3(dx * 0.5, 0.62, -1.5), V3(dx, 0.86 * h + 0.1, -1.6),
        V3(dx * 1.4, 1.1 * h + 0.05, -1.5), V3(dx * 1.6, 1.16 * h + 0.03, -1.36), V3(dx * 1.6, 1.08 * h + 0.03, -1.27),
      ], 0.015 * h, legno));
    }
    // timoni: due remi grandi a poppa
    for (const lato of [-1, 1]) {
      const da = V3(lato * 0.2, 0.52, -1.12), a = V3(lato * 0.34, -0.12, -1.68);
      this.nave.add(asta(da, a, 0.018, 0.014, legno));
      const pala = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.26, 0.09), legno);
      pala.position.copy(a).lerp(da, 0.12);
      pala.quaternion.setFromUnitVectors(V3(0, 1, 0), a.clone().sub(da).normalize());
      this.nave.add(pala);
    }

    // scudi rotondi lungo il bordo, con l'umbone
    for (const lato of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const z = -0.85 + i * 0.21;
        const s = new THREE.Mesh(new THREE.CircleGeometry(0.085, 18), spettro(c, { buchi: 0.15, seme: i + (lato > 0 ? 20 : 30) }));
        s.position.set(lato * (fianco(z) + 0.018), orlo(z) - 0.005, z);
        s.rotation.y = lato * Math.PI / 2;
        this.nave.add(s);
        const umbone = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), bronzo);
        umbone.position.set(lato * (fianco(z) + 0.028), orlo(z) - 0.005, z);
        this.nave.add(umbone);
        // orlo dello scudo
        let prima: THREE.Vector3 | null = null;
        for (let k = 0; k <= 16; k++) {
          const ang = (k / 16) * Math.PI * 2;
          const p = V3(lato * (fianco(z) + 0.02), orlo(z) - 0.005 + Math.sin(ang) * 0.085, z + Math.cos(ang) * 0.085);
          if (prima) linee.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
          prima = p;
        }
      }
    }

    // remi: undici per lato, perno nello scalmo
    for (const lato of [-1, 1]) {
      for (let i = 0; i < REMI; i++) {
        const z = -0.95 + i * 0.19;
        const g = new THREE.Group();
        g.position.set(lato * fianco(z), 0.245, z);
        g.rotation.order = "YZX";
        const fusto = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 1.15, 5, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0), legno);
        const pala = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.006).translate(1.12, 0, 0), legno);
        const interno = new THREE.Group();
        interno.add(fusto, pala);
        interno.scale.x = lato;
        g.add(interno);
        this.nave.add(g);
        this.remi.push({ g, lato, z });
      }
    }

    // albero, pennone, vela quadra con la greca, imbrogli sul davanti
    const al = ALBERO;
    this.nave.add(asta(V3(0, al.base, al.z), V3(0, al.cima, al.z), 0.028, 0.014, legno));
    this.nave.add(asta(V3(-al.largo, al.pennone, al.z + 0.035), V3(al.largo, al.pennone, al.z + 0.035), 0.012, 0.012, legno));
    const gonfio = 0.16;
    {
      const m = new THREE.Mesh(vela(al.largo * 0.96, al.pennone - 0.02, al.piede), spettro(c, { vela: true, gonfio, seme: 3 }));
      m.position.z = al.z + 0.05;
      this.nave.add(m);
    }
    for (const u of [0.12, 0.3, 0.5, 0.7, 0.88]) {
      let prima: THREE.Vector3 | null = null;
      for (let k = 0; k <= 10; k++) {
        const v = 1 - k / 10;
        const x = (u - 0.5) * 2 * al.largo * 0.96;
        const y = al.piede + (al.pennone - 0.02 - al.piede) * v;
        const z = al.z + 0.05 + Math.sin(u * Math.PI) * Math.sin(v * 2.8 + 0.2) * gonfio * 0.9 + 0.012;
        const p = V3(x, y, z);
        if (prima) linee.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
        prima = p;
      }
    }
    // stralli, sartie, bracci del pennone
    segmento(V3(0, al.cima - 0.05, al.z), V3(0, 0.72, 1.48), 0.04);
    segmento(V3(0, al.cima - 0.05, al.z), V3(0, 0.62, -1.36), 0.04);
    for (const lato of [-1, 1]) {
      segmento(V3(0, al.cima - 0.2, al.z), V3(lato * fianco(al.z - 0.15), orlo(al.z - 0.15), al.z - 0.15), 0.02);
      segmento(V3(0, al.cima - 0.2, al.z), V3(lato * fianco(al.z - 0.35), orlo(al.z - 0.35), al.z - 0.35), 0.02);
      segmento(V3(lato * al.largo, al.pennone, al.z + 0.035), V3(lato * fianco(-1.1), orlo(-1.1), -1.1), 0.08);
      segmento(V3(lato * al.largo * 0.92, al.piede, al.z + 0.06), V3(lato * fianco(-0.7), orlo(-0.7), -0.7), 0.05);
    }

    // Ulisse legato all'albero: avvolto nel mantello, la testa alzata verso il canto
    this.ulisse = new THREE.Group();
    {
      const g = loft([
        { z: 0, l: 0.075, su: 0.06 },
        { z: 0.12, l: 0.062, su: 0.048 },
        { z: 0.24, l: 0.058, su: 0.044 },
        { z: 0.31, l: 0.068, su: 0.048 },
        { z: 0.36, l: 0.036, su: 0.034 },
        { z: 0.42, l: 0.04, su: 0.04, y: 0.008 },
        { z: 0.47, l: 0.03, su: 0.032, y: 0.012 },
        { z: 0.49, l: 0.004, su: 0.004, y: 0.012 },
      ], { radiali: 12, passi: 3 });
      g.rotateX(-Math.PI / 2);
      const corpo = new THREE.Mesh(g, spettro(c, { buchi: 0.04, seme: 5 }));
      this.ulisse.add(corpo);
      this.ulisse.position.set(0, al.base + 0.04, al.z + 0.085);
      this.nave.add(this.ulisse);
    }
    const funi: number[] = [];
    for (const h of [0.14, 0.24, 0.31]) {
      const y = al.base + 0.04 + h;
      let prima: THREE.Vector3 | null = null;
      for (let k = 0; k <= 20; k++) {
        const ang = (k / 20) * Math.PI * 2 + h * 9;
        const p = V3(Math.cos(ang) * 0.085, y + Math.sin(ang * 2) * 0.006, al.z + 0.04 + Math.sin(ang) * 0.075);
        if (prima) funi.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
        prima = p;
      }
    }
    this.funi = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(funi, 3)),
      new THREE.LineBasicMaterial({ color: LUCE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.nave.add(this.funi);

    this.sartiame = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linee, 3)),
      new THREE.LineBasicMaterial({ color: COLORE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.nave.add(this.sartiame);

    // lucerne: a poppa e sul dritto di prua; un braciere che arde a mezzanave
    const txAlone = alone("#B8FFE6");
    this.texture.push(txAlone);
    ([[0, 0.92, -1.32, 0.38], [0, 0.88, 1.42, 0.28], [0.12, 0.5, -0.6, 0.22]] as [number, number, number, number][]).forEach(([x, y, z, s]) => {
      const l = new THREE.Sprite(new THREE.SpriteMaterial({
        map: txAlone, color: LUCE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      l.position.set(x, y, z);
      l.scale.setScalar(s);
      l.userData.s = s;
      this.lanterne.push(l);
      this.nave.add(l);
    });
    {
      const g = new THREE.ConeGeometry(0.035, 0.12, 7, 4, true);
      this.fiamma = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: LUCE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      this.fiamma.position.set(0.12, 0.47, -0.6);
      this.nave.add(this.fiamma);
      this.nave.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.05, 8, 1, true), bronzo).translateX(0.12).translateY(0.4).translateZ(-0.6));
    }

    // bruma attorno allo scafo, sull'acqua
    const txBruma = bruma(5);
    this.texture.push(txBruma);
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txBruma, color: "#B9D8DA", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      const coda = i >= 14;
      const base = new THREE.Vector3(casuale(-0.8, 0.8), casuale(0.0, 0.22), coda ? casuale(-3.2, -1.3) : casuale(-1.4, 1.5));
      s.scale.setScalar(casuale(0.9, 1.8));
      s.material.rotation = casuale(0, 6.28);
      this.nuvole.push({ s, base, fase: casuale(0, 10), vel: casuale(-0.15, 0.15) });
      this.gruppo.add(s);
    }

    this.nave.scale.setScalar(0.8);
    this.gruppo.add(this.nave);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = 10; // dopo le carte, che scrivono la profondità
    });
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    const c = this.comuni;
    if (s.inizio < 0) {
      if (t < s.prossima) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d1 = casuale(4.2, 5.1), d2 = casuale(4.2, 5.1);
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -5.8 * v);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 5.8 * v);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-0.9, 0.9));
      s.durata = casuale(26, 31);
      s.inizio = t;
      s.prossimoVacillo = t + casuale(5, 9);
      s.fase = casuale(0, 10);
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    // la vogata spinge a strappi: la nave avanza di più durante la passata in acqua
    const vog = (e / VOGATA) % 1;
    const k = Math.min(1, (e - Math.sin((e / VOGATA) * Math.PI * 2) * 0.12) / s.durata);
    if (e >= s.durata) {
      s.inizio = -1;
      s.prossima = t + attesa(90, 110);
      this.gruppo.visible = false;
      return;
    }

    const { p, q, w } = this.tmp;
    const bez = (kk: number, out: THREE.Vector3) => {
      const u = 1 - kk;
      return out.set(
        u * u * s.da.x + 2 * u * kk * s.curva.x + kk * kk * s.a.x, 0,
        u * u * s.da.z + 2 * u * kk * s.curva.z + kk * kk * s.a.z
      );
    };
    bez(Math.max(0, k), p);
    bez(Math.min(1, Math.max(0, k) + 0.01), q);
    this.gruppo.position.set(p.x, PELO_ACQUA, p.z);
    this.gruppo.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z), 0);
    const f = s.fase;
    this.nave.position.y = Math.sin(t * 0.9 + f) * 0.025;
    this.nave.rotation.set(Math.sin(t * 0.55 + f) * 0.025 - Math.sin(vog * Math.PI * 2) * 0.01, 0, Math.sin(t * 0.7 + f * 2) * 0.045);

    const vis = Math.min(fra(e, 0, 4.5), 1 - fra(e, s.durata - 4.5, s.durata));
    let forza = 0.92 + 0.08 * Math.sin(t * 2.1) * Math.sin(t * 3.3);
    if (t > s.prossimoVacillo) {
      s.vacilla = t;
      s.prossimoVacillo = t + casuale(5, 9);
    }
    const ev = t - s.vacilla;
    if (ev < 0.5) forza *= 0.35 + 0.65 * Math.abs(Math.cos(ev * 19));
    c.uT.value = t;
    c.uVis.value = vis;
    c.uForza.value = forza;
    this.gruppo.updateMatrixWorld(true);
    c.uInv.value.copy(this.nave.matrixWorld).invert();

    // remi: passata in acqua (indietro, pala immersa), ripresa (avanti, pala sollevata e girata di piatto)
    const inAcqua = vog < 0.45;
    let r: number, giu: number, piatto: number;
    if (inAcqua) {
      const u = vog / 0.45;
      r = -0.42 + u * 0.84;
      giu = 0.36 + Math.sin(u * Math.PI) * 0.05;
      piatto = 0;
    } else {
      const u = (vog - 0.45) / 0.55;
      r = 0.42 - (u * u * (3 - 2 * u)) * 0.84;
      giu = 0.36 - Math.sin(u * Math.PI) * 0.26 - (u < 0.15 ? (1 - u / 0.15) * 0.0 : 0);
      piatto = Math.sin(Math.min(1, u * 1.4) * Math.PI) * 1.2;
    }
    this.remi.forEach((rm) => {
      rm.g.rotation.set(piatto * rm.lato, rm.lato * r, -rm.lato * giu);
    });
    // all'attacco della passata le pale toccano l'acqua: due cerchi, uno per lato
    if (vog < 0.05 && s.colpo !== Math.floor(e / VOGATA) && vis > 0.3) {
      s.colpo = Math.floor(e / VOGATA);
      for (const lato of [-1, 1]) {
        const rm = this.remi[(lato > 0 ? REMI : 0) + Math.floor(Math.random() * REMI)];
        w.set(1.12, 0, 0);
        rm.g.children[0].localToWorld(w);
        gocce[SLOT[s.slot]].set(w.x, w.z, t, 0.55 * vis);
        s.slot = (s.slot + 1) % SLOT.length;
      }
    }

    (this.sartiame.material as THREE.LineBasicMaterial).opacity = 0.42 * vis * forza;
    (this.funi.material as THREE.LineBasicMaterial).opacity = 0.7 * vis * forza;
    this.lanterne.forEach((l, i) => {
      const tremo = 0.8 + 0.2 * Math.sin(t * (11 + i * 3) + i) * Math.sin(t * (4 + i));
      l.material.opacity = vis * forza * tremo;
      l.scale.setScalar(l.userData.s * (0.9 + 0.15 * tremo));
    });
    (this.fiamma.material as THREE.MeshBasicMaterial).opacity = vis * forza * (0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 7));
    this.fiamma.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(t * 13)), 1);
    // Ulisse si tende verso il canto, poi si accascia
    this.ulisse.rotation.set(Math.sin(t * 0.6) * 0.05, Math.sin(t * 0.37) * 0.25, Math.sin(t * 1.1) * 0.04);
    this.nuvole.forEach((n, i) => {
      n.s.position.set(
        n.base.x + Math.sin(t * 0.3 + n.fase) * 0.15,
        n.base.y + Math.sin(t * 0.4 + n.fase) * 0.05,
        n.base.z + Math.sin(t * 0.2 + n.fase) * 0.2
      );
      n.s.material.rotation += n.vel * dt;
      n.s.material.opacity = 0.16 * (i >= 14 ? 0.6 : 1) * Math.min(1, vis * 1.6) * (0.7 + 0.3 * Math.sin(t * 0.5 + n.fase));
    });
  }

  libera() {
    SLOT.forEach((k) => gocce[k].set(0, 0, -100, 0));
    liberaTutto(this.gruppo, this.texture);
  }
}
