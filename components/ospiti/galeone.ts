import * as THREE from "three";
import { PELO_ACQUA, gocce } from "../condivisi";
import {
  type Ospite, RUMORE, alone, assi, attesa, bruma, casuale, fra, liberaTutto, loft, primo, segno,
} from "./comuni";

/**
 * Di notte, ogni tanto, un galeone fantasma attraversa l'acqua fra chi guarda e le carte.
 * Si compone dal buio a chiazze, dal basso in alto; il fasciame è marcio e bucato,
 * le vele sono stracci che il vento gonfia; lanterne verdi, finestre di poppa accese,
 * un timoniere incappucciato. Lascia una scia di cerchi sull'acqua, a tratti vacilla, e si disfa.
 */

const SLOT_SCIA = [4, 5, 6, 7];
const COLORE = new THREE.Color("#9FEBD9");
const LUCE = new THREE.Color("#7DFFC4");

/* ------------------------------------------------------------------ shader */

const VERT = /* glsl */ `
uniform mat4 uInv;
uniform float uT;
uniform float uGonfio;
varying vec3 vNave;
varying vec3 vNN;
varying vec3 vNV;
varying vec3 vV;
varying vec2 vUv;
void main(){
  vec3 p = position;
  vUv = uv;
  #ifdef VELA
    // la vela si gonfia in avanti e sbatte, di più in basso e sui bordi
    float g = sin(uv.x * 3.14159) * sin(uv.y * 2.8 + 0.2);
    p.z += g * uGonfio * (0.88 + 0.12 * sin(uT * 1.3 + uv.y * 3.0));
    float f = 1.0 - uv.y;
    p.z += sin(uT * 5.3 + uv.x * 9.0 + uv.y * 4.0) * 0.016 * f;
    p.x += sin(uT * 3.7 + uv.y * 7.0) * 0.007 * f;
  #endif
  vec4 w = modelMatrix * vec4(p, 1.0);
  vNave = (uInv * w).xyz;
  vNN = normalize(mat3(uInv) * mat3(modelMatrix) * normal);
  vNV = normalize(normalMatrix * normal);
  vec4 mv = viewMatrix * w;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uForza;
uniform float uBuchi;
uniform float uPortelli;
uniform float uSeme;
uniform vec3 uColore;
uniform vec3 uLuce;
varying vec3 vNave;
varying vec3 vNN;
varying vec3 vNV;
varying vec3 vV;
varying vec2 vUv;
${RUMORE}
void main(){
  vec3 n = normalize(vNV);
  vec3 v = normalize(vV);
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  vec3 q = vNave;

  // compare e svanisce a chiazze, prima in basso
  float d = frattale(q * 2.3 + vec3(0.0, uT * 0.18, uSeme)) * 0.85 + clamp(q.y, -0.3, 2.5) * 0.1;
  float soglia = uVis * 1.2;
  if (d > soglia) discard;
  float orlo = smoothstep(soglia - 0.06, soglia, d) * (1.0 - step(0.999, uVis));

  vec3 c;
  float a;
  #ifdef VELA
    // stracci: strappi ai bordi, sfilacciature in basso, qualche buco
    float s = frattale(vec3(vUv * vec2(4.0, 6.0), uSeme));
    float basso = 1.0 - smoothstep(0.0, 0.4, vUv.y);
    float lati = 1.0 - smoothstep(0.0, 0.1, min(vUv.x, 1.0 - vUv.x));
    float fili = rumore(vec3(vUv.x * 34.0, vUv.y * 2.5, uSeme)) * basso * 0.35;
    float lim = 0.26 + basso * 0.26 + lati * 0.16 + fili;
    if (s < lim) discard;
    float bordo = 1.0 - smoothstep(lim, lim + 0.045, s);
    float trama = 0.85 + 0.15 * sin(vUv.x * 260.0) * sin(vUv.y * 220.0);
    float macchie = 0.7 + 0.6 * frattale(vec3(vUv * 9.0, uSeme + 4.0));
    c = uColore * (0.16 + 0.42 * fres) * trama * macchie + uColore * bordo * 0.9;
    a = 0.2 + 0.38 * fres + bordo * 0.55;
  #else
    // legno marcio: buchi dal bordo che brilla
    float m = frattale(q * vec3(5.0, 7.0, 5.0) + uSeme);
    if (m < uBuchi) discard;
    float bucato = 1.0 - smoothstep(uBuchi, uBuchi + 0.05, m);
    // fasciame
    float fa = abs(fract(q.y * 15.0) - 0.5) * 2.0;
    float giunto = 1.0 - smoothstep(0.0, 0.18, fa);
    // portelli dei cannoni, con una luce verde dentro
    float lato = smoothstep(0.6, 0.85, abs(vNN.x)) * (gl_FrontFacing ? 1.0 : 0.0);
    float fila = 1.0 - smoothstep(0.018, 0.03, abs(q.y - 0.2));
    float colonna = (1.0 - smoothstep(0.045, 0.07, abs(fract(q.z * 3.1 + 0.5) - 0.5))) * (1.0 - step(0.78, abs(q.z + 0.05)));
    float portello = lato * fila * colonna * uPortelli * 0.45;
    float palpito = 0.75 + 0.25 * sin(uT * 7.0 + q.z * 5.0) * sin(uT * 2.3);
    c = uColore * (0.1 + 0.95 * fres) * (1.0 - 0.5 * giunto) * (0.7 + 0.6 * m);
    c += uColore * bucato * 1.1;
    c += uLuce * portello * 1.6 * palpito;
    a = 0.12 + 0.8 * fres + bucato * 0.6 + portello * palpito;
  #endif
  c += vec3(0.8, 1.0, 0.95) * orlo * 1.8;
  a += orlo;
  // si scioglie nella bruma all'altezza dell'acqua
  a *= smoothstep(-0.1, 0.14, q.y) * uForza;
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

function spettro(comuni: Comuni, { vela = false, buchi = 0.2, portelli = 0, gonfio = 0, seme = 0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: vela ? { VELA: "" } : {},
    uniforms: {
      ...comuni,
      uBuchi: { value: buchi },
      uPortelli: { value: portelli },
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

/** Scafo: [z, cima, chiglia, semilarghezza]. Poppa alta, prua che si stringe e sale. */
const SCAFO: [number, number, number, number][] = [
  [-1.22, 0.9, 0.12, 0.25],
  [-1.1, 0.92, -0.12, 0.4],
  [-0.88, 0.7, -0.23, 0.47],
  [-0.45, 0.47, -0.27, 0.51],
  [0.2, 0.44, -0.27, 0.5],
  [0.72, 0.52, -0.22, 0.42],
  [1.06, 0.63, -0.1, 0.25],
  [1.3, 0.7, 0.14, 0.03],
];

/** Altezza del ponte (bordo superiore dello scafo) a una certa z. */
function ponte(z: number) {
  for (let i = 0; i < SCAFO.length - 1; i++) {
    const [z0, c0] = SCAFO[i];
    const [z1, c1] = SCAFO[i + 1];
    if (z >= z0 && z <= z1) return c0 + ((z - z0) / (z1 - z0)) * (c1 - c0);
  }
  return 0.45;
}
/** Semilarghezza alla quota del ponte. */
function bordo(z: number) {
  for (let i = 0; i < SCAFO.length - 1; i++) {
    const [z0, , , l0] = SCAFO[i];
    const [z1, , , l1] = SCAFO[i + 1];
    if (z >= z0 && z <= z1) return (l0 + ((z - z0) / (z1 - z0)) * (l1 - l0)) * 0.9;
  }
  return 0.3;
}

/** Una vela: quadrilatero (anche degenere) suddiviso, nel piano xy della mesh. */
function vela(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, d: THREE.Vector2, nx = 12, ny = 10) {
  // a = alto sinistra, b = alto destra, c = basso destra, d = basso sinistra
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const alto = new THREE.Vector2().lerpVectors(a, b, u);
      const basso = new THREE.Vector2().lerpVectors(d, c, u);
      const p = basso.lerp(alto, v);
      pos.push(p.x, p.y, 0);
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
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 3).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

const V = (x: number, y: number) => new THREE.Vector2(x, y);

/** Albero (cilindro rastremato) fra due punti. */
function asta(da: THREE.Vector3, a: THREE.Vector3, r0: number, r1: number, mat: THREE.Material) {
  const l = da.distanceTo(a);
  const g = new THREE.CylinderGeometry(r1, r0, l, 6, 4, true);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(da).add(a).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(da).normalize());
  return m;
}

type Albero = { z: number; base: number; cima: number; pennoni: [number, number][] };
const ALBERI: Albero[] = [
  { z: 0.68, base: 0.5, cima: 2.05, pennoni: [[0.95, 0.54], [1.45, 0.42], [1.86, 0.28]] },
  { z: 0.0, base: 0.44, cima: 2.45, pennoni: [[0.98, 0.62], [1.58, 0.48], [2.08, 0.32]] },
];
const MEZZANA = { z: -0.8, base: 0.68, cima: 1.95 };

/* ------------------------------------------------------------------ galeone */

export class Galeone implements Ospite {
  gruppo = new THREE.Group();
  private nave = new THREE.Group();
  private comuni: Comuni;
  private sartiame: THREE.LineSegments;
  private lanterne: THREE.Sprite[] = [];
  private nuvole: { s: THREE.Sprite; base: THREE.Vector3; fase: number; vel: number }[] = [];
  private bandiera: THREE.Mesh;
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(10, 3), inizio: -1, durata: 26,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    vacilla: 0, prossimoVacillo: 0, scia: 0, slot: 0, fase: 0,
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), prua: new THREE.Vector3() };

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
    const legno = spettro(c, { buchi: 0.14 });
    const scafoMat = spettro(c, { buchi: 0.24, portelli: 1, seme: 2 });

    // scafo
    const scafo = new THREE.Mesh(
      loft(
        SCAFO.map(([z, cima, chiglia, l]) => ({ z, y: (cima + chiglia) / 2, l, su: (cima - chiglia) / 2, n: 2.8 })),
        { radiali: 28, passi: 5 }
      ),
      scafoMat
    );
    this.nave.add(scafo);

    // parapetto: corrimano lungo il bordo e montanti
    const linee: number[] = [];
    for (const lato of [-1, 1]) {
      let prima: THREE.Vector3 | null = null;
      for (let z = -1.15; z <= 1.2; z += 0.06) {
        const p = new THREE.Vector3(lato * bordo(z), ponte(z) + 0.09, z);
        if (prima) linee.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
        if (Math.round(z / 0.06) % 2 === 0) linee.push(p.x, p.y, p.z, p.x, p.y - 0.09, p.z);
        prima = p;
      }
    }

    // alberi, coffe, pennoni, vele quadre
    ALBERI.forEach((al, i) => {
      this.nave.add(asta(new THREE.Vector3(0, al.base, al.z), new THREE.Vector3(0, al.cima, al.z), 0.03, 0.014, legno));
      const coffa = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.06, 10, 1, true), legno);
      coffa.position.set(0, al.pennoni[0][0] + 0.32, al.z);
      this.nave.add(coffa);
      al.pennoni.forEach(([y, l]) => {
        this.nave.add(asta(new THREE.Vector3(-l, y, al.z + 0.03), new THREE.Vector3(l, y, al.z + 0.03), 0.012, 0.012, legno));
      });
      // vele: ognuna pende da un pennone fin sopra quello sotto
      al.pennoni.forEach(([y, l], k) => {
        const sotto = k === 0 ? [al.base + 0.38, l * 1.05] : al.pennoni[k - 1];
        const g = vela(V(-l * 0.96, y - 0.02), V(l * 0.96, y - 0.02), V(sotto[1] * 0.98, sotto[0] + 0.04), V(-sotto[1] * 0.98, sotto[0] + 0.04));
        const m = new THREE.Mesh(g, spettro(c, { vela: true, gonfio: 0.12 + (2 - k) * 0.03, seme: i * 3 + k + 1 }));
        m.position.z = al.z + 0.05;
        this.nave.add(m);
      });
      // sartie e griselle, da tutti e due i lati
      const attacco = al.pennoni[1][0] - 0.05;
      for (const lato of [-1, 1]) {
        const punti = [-0.14, 0, 0.14].map((dz) => new THREE.Vector3(lato * bordo(al.z + dz), ponte(al.z + dz) + 0.02, al.z + dz));
        const cima = new THREE.Vector3(lato * 0.02, attacco, al.z);
        punti.forEach((p) => linee.push(p.x, p.y, p.z, cima.x, cima.y, cima.z));
        for (let h = 0.12; h < 0.9; h += 0.1) {
          const a = punti[0].clone().lerp(cima, h);
          const b = punti[2].clone().lerp(cima, h);
          linee.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    });

    // mezzana con vela latina
    this.nave.add(asta(new THREE.Vector3(0, MEZZANA.base, MEZZANA.z), new THREE.Vector3(0, MEZZANA.cima, MEZZANA.z), 0.025, 0.012, legno));
    const lA = new THREE.Vector3(0, 0.92, -0.42);
    const lB = new THREE.Vector3(0, 2.0, -1.28);
    this.nave.add(asta(lA, lB, 0.011, 0.008, legno));
    {
      // nel piano yz: la x della vela diventa -z della nave
      const g = vela(V(0.42, 0.92), V(1.28, 2.0), V(1.28, 2.0), V(1.12, 0.98), 10, 10);
      const m = new THREE.Mesh(g, spettro(c, { vela: true, gonfio: 0.1, seme: 9 }));
      m.rotation.y = Math.PI / 2;
      m.position.x = 0.04;
      this.nave.add(m);
    }

    // bompresso, fiocco e stralli
    const bA = new THREE.Vector3(0, 0.66, 1.18);
    const bB = new THREE.Vector3(0, 1.0, 1.98);
    this.nave.add(asta(bA, bB, 0.022, 0.01, legno));
    {
      const g = vela(V(-0.7, 1.72), V(-0.7, 1.72), V(-1.9, 0.98), V(-1.2, 0.8), 10, 10);
      const m = new THREE.Mesh(g, spettro(c, { vela: true, gonfio: 0.08, seme: 11 }));
      m.rotation.y = Math.PI / 2;
      m.position.x = -0.03;
      this.nave.add(m);
    }
    const stralli: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(0, 2.0, 0.68), bB],
      [new THREE.Vector3(0, 2.4, 0.0), new THREE.Vector3(0, 1.9, 0.68)],
      [new THREE.Vector3(0, 1.9, -0.8), new THREE.Vector3(0, 2.2, 0.0)],
      [new THREE.Vector3(0, 1.4, 0.0), new THREE.Vector3(0, 0.95, 0.68)],
      [new THREE.Vector3(0, 1.9, -0.8), new THREE.Vector3(0, 0.92, -1.2)],
    ];
    stralli.forEach(([a, b]) => {
      // una corda non è mai tesa del tutto: un po' di pancia
      let prima = a;
      for (let k = 1; k <= 8; k++) {
        const u = k / 8;
        const p = a.clone().lerp(b, u);
        p.y -= Math.sin(u * Math.PI) * 0.03;
        linee.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
        prima = p;
      }
    });
    const gl = new THREE.BufferGeometry();
    gl.setAttribute("position", new THREE.Float32BufferAttribute(linee, 3));
    this.sartiame = new THREE.LineSegments(
      gl,
      new THREE.LineBasicMaterial({ color: COLORE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.nave.add(this.sartiame);

    // finestre di poppa, accese
    const finestre = new THREE.MeshBasicMaterial({
      color: LUCE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let r = 0; r < 2; r++) {
      for (let k = -1; k <= 1; k++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.09), finestre);
        f.position.set(k * 0.11, 0.5 + r * 0.17, -1.215);
        this.nave.add(f);
      }
    }

    // il timoniere: una figura incappucciata, ferma a poppa
    {
      const g = loft(
        [
          { z: 0, l: 0.075, su: 0.06 },
          { z: 0.1, l: 0.06, su: 0.05 },
          { z: 0.2, l: 0.05, su: 0.042 },
          { z: 0.27, l: 0.058, su: 0.045 },
          { z: 0.33, l: 0.04, su: 0.04, y: -0.006 },
          { z: 0.36, l: 0.035, su: 0.035, y: -0.01 },
          { z: 0.4, l: 0.004, su: 0.004, y: 0.01 },
        ],
        { radiali: 14, passi: 3 }
      );
      g.rotateX(-Math.PI / 2);
      const t = new THREE.Mesh(g, spettro(c, { buchi: 0.05, seme: 5 }));
      t.position.set(0, ponte(-1.0) - 0.02, -0.98);
      this.nave.add(t);
    }

    // lanterne: poppa, prua, coffa di maestra
    const txAlone = alone("#B8FFE6");
    this.texture.push(txAlone);
    [
      [0, 1.08, -1.24, 0.42],
      [0.3, 0.78, 1.0, 0.3],
      [0, 1.36, 0.0, 0.26],
    ].forEach(([x, y, z, s]) => {
      const l = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: txAlone, color: LUCE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      l.position.set(x, y, z);
      l.scale.setScalar(s);
      l.userData.s = s;
      this.lanterne.push(l);
      this.nave.add(l);
    });

    // bandiera stracciata in cima alla maestra
    {
      const g = new THREE.PlaneGeometry(0.62, 0.07, 16, 1);
      g.translate(-0.31, 0, 0);
      this.bandiera = new THREE.Mesh(g, spettro(c, { vela: true, gonfio: 0, seme: 13 }));
      this.bandiera.position.set(0, 2.42, 0);
      this.bandiera.rotation.y = Math.PI / 2;
      this.nave.add(this.bandiera);
    }

    // bruma: attorno allo scafo, sull'acqua (fuori dal gruppo nave, così non rolla con lei)
    const txBruma = bruma(5);
    this.texture.push(txBruma);
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: txBruma, color: "#B9D8DA", transparent: true, opacity: 0, depthWrite: false, fog: false })
      );
      const coda = i >= 14;
      const base = new THREE.Vector3(
        casuale(-0.7, 0.7),
        casuale(0.0, 0.25),
        coda ? casuale(-3.2, -1.2) : casuale(-1.4, 1.5)
      );
      s.scale.setScalar(casuale(0.9, 1.8));
      s.material.rotation = casuale(0, 6.28);
      this.nuvole.push({ s, base, fase: casuale(0, 10), vel: casuale(-0.15, 0.15) });
      this.gruppo.add(s);
    }

    this.nave.scale.setScalar(0.78);
    this.gruppo.add(this.nave);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.renderOrder = 10; // dopo le carte, che scrivono la profondità
    });
    this.nave.traverse((o) => (o.frustumCulled = false));
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    const c = this.comuni;
    if (s.inizio < 0) {
      if (t < s.prossima) return;
      // nuova traversata: da un lato all'altro, a distanza e con rotta diversa ogni volta
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d1 = casuale(4.2, 5.1);
      const d2 = casuale(4.2, 5.1);
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -5.6 * v);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 5.6 * v);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-0.9, 0.9));
      s.durata = casuale(24, 30);
      s.inizio = t;
      s.prossimoVacillo = t + casuale(5, 9);
      s.fase = casuale(0, 10);
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + attesa(70, 120);
      this.gruppo.visible = false;
      return;
    }

    // posizione sulla curva e rotta
    const { p, q, prua } = this.tmp;
    const u = 1 - k;
    p.set(
      u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x, 0,
      u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z
    );
    const k2 = Math.min(1, k + 0.01);
    const u2 = 1 - k2;
    q.set(
      u2 * u2 * s.da.x + 2 * u2 * k2 * s.curva.x + k2 * k2 * s.a.x, 0,
      u2 * u2 * s.da.z + 2 * u2 * k2 * s.curva.z + k2 * k2 * s.a.z
    );
    const rotta = Math.atan2(q.x - p.x, q.z - p.z);
    this.gruppo.position.set(p.x, PELO_ACQUA, p.z);
    this.gruppo.rotation.set(0, rotta, 0);
    // beccheggio e rollio su un'onda lunga
    const f = s.fase;
    this.nave.position.y = Math.sin(t * 0.9 + f) * 0.03;
    this.nave.rotation.set(Math.sin(t * 0.55 + f) * 0.03, 0, Math.sin(t * 0.7 + f * 2) * 0.055);

    // si compone e si disfa
    const vis = Math.min(fra(e, 0, 4.5), 1 - fra(e, s.durata - 4.5, s.durata));
    // ogni tanto vacilla, come un'immagine che stenta a restare
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

    (this.sartiame.material as THREE.LineBasicMaterial).opacity = 0.42 * vis * forza;
    this.nave.children.forEach((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (m && m.type === "MeshBasicMaterial") m.opacity = vis * forza * (0.75 + 0.25 * Math.sin(t * 9 + 1.3));
    });
    this.lanterne.forEach((l, i) => {
      const tremo = 0.8 + 0.2 * Math.sin(t * (11 + i * 3) + i) * Math.sin(t * (4 + i));
      l.material.opacity = vis * forza * tremo;
      l.scale.setScalar(l.userData.s * (0.9 + 0.15 * tremo));
    });
    // la bandiera sventola all'indietro
    {
      const pos = this.bandiera.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = i % 17;
        const lungo = (16 - x) / 16;
        pos.setZ(i, Math.sin(t * 6 - lungo * 7) * 0.05 * lungo);
        pos.setY(i, (i < 17 ? 0.035 : -0.035) * (1 - lungo * 0.6) - lungo * 0.06 + Math.sin(t * 4 - lungo * 5) * 0.02 * lungo);
      }
      pos.needsUpdate = true;
    }
    // la bruma accompagna lo scafo e si attarda dietro
    this.nuvole.forEach((n, i) => {
      n.s.position.set(
        n.base.x + Math.sin(t * 0.3 + n.fase) * 0.15,
        n.base.y + Math.sin(t * 0.4 + n.fase) * 0.05,
        n.base.z + Math.sin(t * 0.2 + n.fase) * 0.2
      );
      n.s.material.rotation += n.vel * dt;
      const dietro = i >= 14 ? 0.6 : 1;
      n.s.material.opacity = 0.16 * dietro * Math.min(1, vis * 1.6) * (0.7 + 0.3 * Math.sin(t * 0.5 + n.fase));
    });

    // scia: cerchi sull'acqua che partono dalla prua
    if (vis > 0.3 && t > s.scia) {
      s.scia = t + 0.55;
      prua.set(0, 0, 1.0).applyMatrix4(this.gruppo.matrixWorld);
      gocce[SLOT_SCIA[s.slot]].set(prua.x, prua.z, t, 0.5 * vis);
      s.slot = (s.slot + 1) % SLOT_SCIA.length;
    }
  }

  libera() {
    SLOT_SCIA.forEach((k) => gocce[k].set(0, 0, -100, 0));
    liberaTutto(this.gruppo, this.texture);
  }
}
