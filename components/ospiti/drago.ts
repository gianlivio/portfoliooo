import * as THREE from "three";
import {
  type Anello, type Ospite, RUMORE, alone, assi, attesa, passa, tocca, casuale, fra, liberaTutto, loft, morbido, primo, segno,
} from "./comuni";

/**
 * Di notte, di rado, un drago attraversa il cielo sopra le carte.
 * Esce dal buio lontano, batte le ali (membrana tesa fra le dita, che si piega nella risalita),
 * plana, si inclina in virata; passando volta la testa verso chi guarda.
 * A metà strada si impenna, la gola e il ventre si accendono dentro le crepe delle squame,
 * apre le fauci e sputa fuoco a ventaglio; poi riprende quota e si perde.
 */

const SCALA = 0.85;

/* ------------------------------------------------------------------ shader */

const VERT = /* glsl */ `
attribute vec3 color;
varying vec3 vN;
varying vec3 vW;
varying vec3 vLoc;
varying vec3 vCol;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vLoc = position;
  vCol = color;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform vec3 uLuna;
uniform vec3 uOcchio;
uniform float uBrace;
uniform vec3 uFuoco;
uniform float uFuocoI;
uniform float uVis;
uniform float uT;
uniform float uMembrana;
varying vec3 vN;
varying vec3 vW;
varying vec3 vLoc;
varying vec3 vCol;
${RUMORE}
void main(){
  vec3 n = uMembrana > 0.5 ? normalize(vN) : normalize(cross(dFdx(vW), dFdy(vW)));
  vec3 v = normalize(uOcchio - vW);
  if (dot(n, v) < 0.0) n = -n;
  float lamb = max(dot(n, uLuna), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 c;
  vec3 versoFuoco = uFuoco - vW;
  float df = length(versoFuoco);
  float luceFuoco = uFuocoI / (1.0 + df * df * 0.35);
  if (uMembrana > 0.5) {
    // membrana: pelle scura e sottile; controluce la luna e il fuoco la attraversano
    float vena = vCol.g;
    vec3 base = vec3(0.028, 0.012, 0.014) * (1.0 - 0.45 * vena);
    float trasl = max(dot(-n, uLuna), 0.0) * 0.5 + 0.5 * luceFuoco;
    c = base + base * lamb * 2.2 + vec3(0.32, 0.4, 0.7) * rim * 0.22;
    c += vec3(0.55, 0.12, 0.05) * trasl * (1.0 - vena * 0.7);
    c += vec3(1.0, 0.5, 0.18) * luceFuoco * max(dot(n, normalize(versoFuoco)), 0.0);
  } else {
    // squame: piccole scaglie, più chiare sul dorso; brace nelle crepe del ventre e della gola
    float sq = rumore(vLoc * 70.0);
    float cella = abs(fract(vLoc.z * 34.0 + sin(vLoc.x * 40.0) * 0.3) - 0.5);
    vec3 base = vec3(0.012, 0.014, 0.02) * (0.7 + 0.55 * sq) * (0.85 + 0.3 * cella);
    c = base + base * lamb * 3.2 * vec3(0.65, 0.75, 1.0) + vec3(0.3, 0.4, 0.78) * rim * 0.32;
    float crepe = 1.0 - smoothstep(0.0, 0.055, abs(frattale(vLoc * 16.0) - 0.5));
    float pulsa = 0.55 + 0.45 * sin(uT * 2.1 + vLoc.z * 7.0);
    c += vec3(1.0, 0.32, 0.05) * crepe * vCol.r * (0.22 * pulsa + 1.6 * uBrace);
    c += vec3(0.5, 0.12, 0.02) * vCol.r * uBrace * 0.35;
    c += vec3(1.0, 0.52, 0.18) * luceFuoco * max(dot(n, normalize(versoFuoco)), 0.0) * 1.4;
  }
  gl_FragColor = vec4(c, uVis);
  #include <colorspace_fragment>
}`;

const FUOCO_VERT = /* glsl */ `
attribute float aVita;
attribute float aTaglia;
uniform float uAltezza;
varying float vVita;
void main(){
  vVita = aVita;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aVita < 0.0 ? 0.0 : aTaglia * (0.6 + aVita * 2.6) * projectionMatrix[1][1] * uAltezza * 0.5 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FUOCO_FRAG = /* glsl */ `
varying float vVita;
void main(){
  if (vVita < 0.0) discard;
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  if (r > 0.5) discard;
  float m = smoothstep(0.5, 0.0, r);
  vec3 c = mix(vec3(1.0, 0.96, 0.8), vec3(1.0, 0.58, 0.14), smoothstep(0.0, 0.22, vVita));
  c = mix(c, vec3(0.75, 0.16, 0.04), smoothstep(0.32, 0.75, vVita));
  float a = m * m * (1.0 - smoothstep(0.5, 1.0, vVita));
  gl_FragColor = vec4(c * a * 1.25, a);
}`;

/* ------------------------------------------------------------------ forme */

/** Sezioni a losanga: dorso e ventre a spigolo, fianchi tesi. */
const sp = (anelli: Anello[], n = 1.5) => anelli.map((a) => ({ ...a, n: a.n ?? n }));

const ventre = (soglia = -0.25) => (_k: number, ang: number) => {
  const s = Math.sin(ang);
  return new THREE.Color(morbido((soglia - s) / 0.5), 0, 0);
};

/** Ala destra: ossa e membrana. Indici dei vertici nella geometria dinamica. */
const S = 0, E = 1, W = 2, F1 = 3, F2 = 4, F3 = 5, F4 = 6, S12 = 7, S23 = 8, S34 = 9, S4B = 10, B = 11, C1 = 12, C2 = 13, C3 = 14, CI = 15;
const TRIANGOLI = [
  W, F1, C1, F1, S12, C1, S12, F2, C1, F2, W, C1,
  W, F2, C2, F2, S23, C2, S23, F3, C2, F3, W, C2,
  W, F3, C3, F3, S34, C3, S34, F4, C3, F4, W, C3,
  W, F4, CI, F4, S4B, CI, S4B, B, CI, B, S, CI, S, E, CI, E, W, CI,
];
const DITA = [
  { ang: 0.21, l: 1.55 },
  { ang: -0.38, l: 1.5 },
  { ang: -0.9, l: 1.3 },
  { ang: -1.38, l: 1.02 },
];

type Ala = {
  gruppo: THREE.Group;
  membrana: THREE.Mesh;
  ossa: THREE.LineSegments;
  artiglio: THREE.Mesh;
  lato: number;
  p: THREE.Vector3[];
};

function creaAla(lato: number, mat: THREE.ShaderMaterial, osso: THREE.Material, unghia: THREE.Material): Ala {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
  const vena = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0.6, 0, 0, 0, 0];
  g.setAttribute("color", new THREE.Float32BufferAttribute(vena.flatMap((v) => [0, v, 0]), 3));
  g.setIndex(TRIANGOLI);
  const membrana = new THREE.Mesh(g, mat);
  const gl = new THREE.BufferGeometry();
  gl.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6 * 2 * 3), 3));
  const ossa = new THREE.LineSegments(gl, osso);
  const artiglio = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 5), unghia);
  const gruppo = new THREE.Group();
  gruppo.add(membrana, ossa, artiglio);
  return { gruppo, membrana, ossa, artiglio, lato, p: Array.from({ length: 16 }, () => new THREE.Vector3()) };
}

const ruotaXZ = (v: THREE.Vector3, a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return v.set(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
};

/** Calcola la posa dell'ala: battito (rad), piega (0 distesa, 1 chiusa), pancia della membrana. */
function posaAla(a: Ala, battito: number, ritardo: number, piega: number, pancia: number) {
  const p = a.p;
  p[S].set(0, 0, 0);
  const omero = ruotaXZ(new THREE.Vector3(0.62, 0, 0.08), -piega * 0.45);
  p[E].copy(omero);
  const avambraccio = ruotaXZ(new THREE.Vector3(0.72, 0, 0.12), -piega * 1.9);
  p[W].copy(p[E]).add(avambraccio);
  DITA.forEach((d, i) => {
    const ang = d.ang - piega * (1.5 + i * 0.25);
    const l = d.l * (1 - piega * 0.2);
    p[F1 + i].set(Math.cos(ang) * l, 0, Math.sin(ang) * l).add(p[W]);
  });
  p[B].set(0.02, 0, -1.0);
  // il battito alza tutta l'ala attorno alla spalla; la mano segue in ritardo
  const qSpalla = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), battito);
  const qMano = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ritardo * 0.55);
  const polso = p[W].clone();
  for (let i = F1; i <= F4; i++) p[i].sub(polso).applyQuaternion(qMano).add(polso);
  for (const i of [E, W, F1, F2, F3, F4]) p[i].applyQuaternion(qSpalla);
  p[B].applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), battito * 0.15));
  // bordo d'uscita a festoni, e la membrana che fa pancia fra le dita
  const festone = (i: number, j: number, k: number) =>
    p[i].copy(p[j]).add(p[k]).multiplyScalar(0.5).lerp(p[W], 0.22);
  festone(S12, F1, F2);
  festone(S23, F2, F3);
  festone(S34, F3, F4);
  p[S4B].copy(p[F4]).add(p[B]).multiplyScalar(0.5).lerp(p[E], 0.18);
  const centro = (i: number, ...ks: number[]) => {
    p[i].set(0, 0, 0);
    ks.forEach((k) => p[i].add(p[k]));
    p[i].multiplyScalar(1 / ks.length);
    p[i].y += pancia;
  };
  centro(C1, W, F1, F2);
  centro(C2, W, F2, F3);
  centro(C3, W, F3, F4);
  centro(CI, W, F4, B, S, E);
  const pos = a.membrana.geometry.attributes.position as THREE.BufferAttribute;
  p.forEach((v, i) => pos.setXYZ(i, v.x * a.lato, v.y, v.z));
  pos.needsUpdate = true;
  a.membrana.geometry.computeVertexNormals();
  a.membrana.geometry.computeBoundingSphere();
  const lp = a.ossa.geometry.attributes.position as THREE.BufferAttribute;
  [[S, E], [E, W], [W, F1], [W, F2], [W, F3], [W, F4]].forEach(([i, j], k) => {
    lp.setXYZ(k * 2, p[i].x * a.lato, p[i].y, p[i].z);
    lp.setXYZ(k * 2 + 1, p[j].x * a.lato, p[j].y, p[j].z);
  });
  lp.needsUpdate = true;
  a.artiglio.position.set(p[W].x * a.lato, p[W].y + 0.02, p[W].z + 0.05);
  a.artiglio.rotation.set(Math.PI / 2, 0, 0);
}

/* ------------------------------------------------------------------ drago */

const PARTICELLE = 700;

export class Drago implements Ospite {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private collo: THREE.Group[] = [];
  private coda: THREE.Group[] = [];
  private testa = new THREE.Group();
  private mascella = new THREE.Group();
  private ali: Ala[] = [];
  private occhi: THREE.Sprite[] = [];
  private materiali: THREE.ShaderMaterial[] = [];
  private uniformi = {
    uLuna: { value: new THREE.Vector3(-0.3, 0.85, 0.4).normalize() },
    uOcchio: { value: new THREE.Vector3() },
    uBrace: { value: 0 },
    uFuoco: { value: new THREE.Vector3(0, -100, 0) },
    uFuocoI: { value: 0 },
    uVis: { value: 0 },
    uT: { value: 0 },
  };
  private fuoco: THREE.Points;
  private fp = {
    pos: new Float32Array(PARTICELLE * 3),
    vel: new Float32Array(PARTICELLE * 3),
    eta: new Float32Array(PARTICELLE),
    vita: new Float32Array(PARTICELLE),
    brace: new Uint8Array(PARTICELLE),
    prossima: 0,
    debito: 0,
  };
  private texture: THREE.Texture[] = [];
  private curva: THREE.CatmullRomCurve3 | null = null;
  private stato = {
    prossima: primo(28, 9), inizio: -1, s: 0, L: 1, uFuoco: 0.45,
    ruggito: -1, fatto: false, battitoFase: 0, planata: 0, prossimaPlanata: 0,
    imbardata: 0, rollio: 0, bersaglio: new THREE.Vector3(), verso: 1,
  };
  private tmp = {
    p: new THREE.Vector3(), tg: new THREE.Vector3(), l: new THREE.Vector3(), bocca: new THREE.Vector3(),
    dir: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(),
  };

  constructor() {
    const mat = (membrana = false) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { ...this.uniformi, uMembrana: { value: membrana ? 1 : 0 } },
        transparent: true,
        side: membrana ? THREE.DoubleSide : THREE.FrontSide,
      });
      this.materiali.push(m);
      return m;
    };
    const squame = mat();
    const pelle = mat(true);
    const osso = new THREE.LineBasicMaterial({ color: "#2A2C36", transparent: true, opacity: 0 });
    const corno = new THREE.MeshBasicMaterial({ color: "#1A1B21", transparent: true, opacity: 0 });

    // tronco
    this.corpo.add(new THREE.Mesh(loft(sp([
      { z: -0.9, l: 0.09, su: 0.09, y: 0.02 },
      { z: -0.62, l: 0.19, su: 0.17, giu: 0.19 },
      { z: -0.2, l: 0.27, su: 0.22, giu: 0.29 },
      { z: 0.22, l: 0.28, su: 0.23, giu: 0.3 },
      { z: 0.56, l: 0.21, su: 0.19, giu: 0.23, y: 0.03 },
      { z: 0.82, l: 0.12, su: 0.11, giu: 0.12, y: 0.07 },
    ]), { radiali: 10, passi: 3, colore: ventre() }), squame));

    // creste sul dorso
    const cresta = (z: number, y: number, h: number, padre: THREE.Object3D) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.4, h * 1.35, 3), corno);
      c.scale.set(0.3, 1, 1);
      c.position.set(0, y + h * 0.4, z);
      c.rotation.x = -0.6;
      padre.add(c);
    };
    for (let z = -0.75; z <= 0.7; z += 0.15) cresta(z, 0.2 - Math.abs(z) * 0.08, 0.1 + (0.7 - Math.abs(z)) * 0.06, this.corpo);

    // collo: cinque vertebre che si passano il movimento
    let padre: THREE.Object3D = this.corpo;
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Group();
      v.position.set(0, i === 0 ? 0.08 : 0, i === 0 ? 0.74 : 0.2);
      const r0 = 0.125 - i * 0.012, r1 = r0 - 0.012;
      v.add(new THREE.Mesh(loft(sp([
        { z: -0.02, l: r0, su: r0 * 0.95, giu: r0 * 1.05 },
        { z: 0.25, l: r1, su: r1 * 0.95, giu: r1 * 1.05 },
      ]), { radiali: 8, passi: 1, colore: ventre(-0.1) }), squame));
      cresta(0.1, r0 * 0.9, 0.08, v);
      padre.add(v);
      this.collo.push(v);
      padre = v;
    }

    // testa: cranio, mascella che si apre, corna, occhi
    this.testa.position.set(0, 0, 0.2);
    padre.add(this.testa);
    this.testa.add(new THREE.Mesh(loft(sp([
      { z: -0.05, l: 0.085, su: 0.08, giu: 0.06 },
      { z: 0.08, l: 0.11, su: 0.1, giu: 0.05 },
      { z: 0.2, l: 0.085, su: 0.066, giu: 0.03, y: -0.005 },
      { z: 0.34, l: 0.06, su: 0.045, giu: 0.022, y: -0.02 },
      { z: 0.45, l: 0.038, su: 0.03, giu: 0.016, y: -0.028 },
      { z: 0.49, l: 0.016, su: 0.014, giu: 0.008, y: -0.03 },
    ]), { radiali: 8, passi: 2, colore: ventre(-0.6) }), squame));
    this.mascella.position.set(0, -0.045, 0.03);
    this.testa.add(this.mascella);
    this.mascella.add(new THREE.Mesh(loft(sp([
      { z: -0.02, l: 0.07, su: 0.025, giu: 0.035 },
      { z: 0.2, l: 0.058, su: 0.018, giu: 0.03 },
      { z: 0.42, l: 0.03, su: 0.012, giu: 0.018 },
      { z: 0.45, l: 0.012, su: 0.006, giu: 0.008 },
    ]), { radiali: 8, passi: 2, colore: () => new THREE.Color(1, 0, 0) }), squame));
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.34, 6), corno);
      c.position.set(s * 0.06, 0.1, -0.08);
      c.rotation.set(-1.05, 0, s * 0.3);
      this.testa.add(c);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.18, 5), corno);
      c2.position.set(s * 0.1, 0.03, -0.05);
      c2.rotation.set(-1.4, 0, s * 0.8);
      this.testa.add(c2);
    }
    const dente = new THREE.MeshBasicMaterial({ color: "#B9B4A4", transparent: true, opacity: 0 });
    this.corpo.userData.dente = dente;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = 0.16 + i * 0.048;
        const l = 0.075 - i * 0.008;
        const su = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03 - i * 0.002, 4), dente);
        su.position.set(s * l * 0.85, -0.03 - i * 0.003, z);
        su.rotation.x = Math.PI;
        this.testa.add(su);
        const giu = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.026 - i * 0.002, 4), dente);
        giu.position.set(s * l * 0.75, 0.018, z - 0.03);
        this.mascella.add(giu);
      }
      // arcata sopra l'occhio, spine sulla guancia e sulla mascella
      const arcata = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.12, 3), corno);
      arcata.position.set(s * 0.07, 0.075, 0.1);
      arcata.rotation.set(-1.35, s * 0.25, 0);
      this.testa.add(arcata);
      for (let i = 0; i < 3; i++) {
        const sg = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09 - i * 0.02, 3), corno);
        sg.position.set(s * (0.075 - i * 0.004), -0.02 - i * 0.012, -0.02 + i * 0.05);
        sg.rotation.set(-1.7, 0, s * 1.1);
        this.mascella.add(sg);
      }
    }
    const txOcchio = alone("#FFB347");
    this.texture.push(txOcchio);
    for (const s of [-1, 1]) {
      const o = new THREE.Sprite(new THREE.SpriteMaterial({
        map: txOcchio, color: "#FFC061", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      o.position.set(s * 0.083, 0.05, 0.15);
      o.scale.setScalar(0.075);
      this.testa.add(o);
      this.occhi.push(o);
    }

    // coda: nove segmenti sempre più sottili, che ondeggiano; in fondo una punta a spatola
    padre = this.corpo;
    for (let i = 0; i < 9; i++) {
      const v = new THREE.Group();
      v.position.set(0, i === 0 ? 0.02 : 0, i === 0 ? -0.85 : -0.31);
      const r0 = 0.1 * Math.pow(0.8, i), r1 = r0 * 0.8;
      v.add(new THREE.Mesh(loft(sp([
        { z: 0.02, l: r0, su: r0 },
        { z: -0.33, l: r1, su: r1 },
      ]), { radiali: 6, passi: 1, colore: ventre(-0.2) }), squame));
      if (i < 7) cresta(-0.15, r0 * 0.9, 0.09 * Math.pow(0.82, i), v);
      padre.add(v);
      this.coda.push(v);
      padre = v;
    }
    {
      const f = new THREE.Shape();
      f.moveTo(0, 0);
      f.lineTo(0.1, -0.12);
      f.lineTo(0, -0.34);
      f.lineTo(-0.1, -0.12);
      f.closePath();
      const g = new THREE.ShapeGeometry(f);
      g.rotateX(Math.PI / 2);
      const sp = new THREE.Mesh(g, pelle);
      sp.position.z = -0.3;
      padre.add(sp);
    }

    // zampe raccolte sotto il corpo
    const zampa = (x: number, y: number, z: number, l: number, r: number, inclina: number) => {
      const g = loft(sp([
        { z: 0, l: r, su: r },
        { z: l * 0.5, l: r * 0.75, su: r * 0.8 },
        { z: l, l: r * 0.45, su: r * 0.45 },
      ]), { radiali: 6, passi: 1, colore: ventre() });
      const m = new THREE.Mesh(g, squame);
      m.position.set(x, y, z);
      m.rotation.set(inclina, x > 0 ? 0.15 : -0.15, 0);
      this.corpo.add(m);
    };
    for (const s of [-1, 1]) {
      zampa(s * 0.17, -0.14, -0.5, 0.55, 0.08, 2.5);
      zampa(s * 0.15, -0.16, 0.42, 0.34, 0.05, 2.2);
    }

    // ali
    for (const s of [1, -1]) {
      const a = creaAla(s, pelle, osso, corno);
      a.gruppo.position.set(s * 0.2, 0.16, 0.34);
      this.corpo.add(a.gruppo);
      this.ali.push(a);
    }

    this.corpo.scale.setScalar(SCALA);
    this.gruppo.add(this.corpo);

    // fuoco: particelle nel mondo, non legate al corpo
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.fp.pos, 3));
    const vita = new Float32Array(PARTICELLE).fill(-1);
    g.setAttribute("aVita", new THREE.BufferAttribute(vita, 1));
    g.setAttribute("aTaglia", new THREE.BufferAttribute(new Float32Array(PARTICELLE), 1));
    this.fuoco = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: FUOCO_VERT,
      fragmentShader: FUOCO_FRAG,
      uniforms: { uAltezza: { value: 900 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.fuoco.frustumCulled = false;
    this.gruppo.add(this.fuoco);

    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = 10; // dopo le carte, che scrivono la profondità
    });
    this.corpo.userData.osso = osso;
    this.corpo.userData.corno = corno;
  }

  private nuovoPercorso(camera: THREE.Camera) {
    const { avanti, lato } = assi(camera);
    const v = segno();
    this.stato.verso = v;
    const P = (d: number, l: number, y: number) =>
      avanti.clone().multiplyScalar(d).addScaledVector(lato, l * v).setY(y);
    const j = () => casuale(-1, 1);
    this.curva = new THREE.CatmullRomCurve3([
      P(26 + j() * 2, -18 + j() * 2, 8 + j()),
      P(17 + j(), -8.5 + j(), 4.8 + j() * 0.4),
      P(13.5 + j(), -2 + j() * 1.5, 3.7 + j() * 0.3),
      P(13 + j(), 3.5 + j(), 3.9 + j() * 0.4),
      P(16.5 + j(), 9.5 + j(), 4.7 + j() * 0.4),
      P(27 + j() * 2, 18 + j() * 2, 7.5 + j()),
    ], false, "centripetal");
    this.stato.L = this.curva.getLength();
    this.stato.uFuoco = casuale(0.38, 0.5);
  }

  private emetti(dt: number, quanti: number) {
    const f = this.fp;
    const { bocca, dir } = this.tmp;
    f.debito += quanti * dt;
    while (f.debito >= 1) {
      f.debito -= 1;
      const i = f.prossima;
      f.prossima = (f.prossima + 1) % PARTICELLE;
      const brace = Math.random() < 0.08;
      const dsp = brace ? 0.35 : 0.12;
      const v = brace ? casuale(2.5, 4) : casuale(6, 8.5);
      const d = dir.clone().add(new THREE.Vector3(casuale(-dsp, dsp), casuale(-dsp, dsp), casuale(-dsp, dsp))).normalize();
      f.pos.set([bocca.x, bocca.y, bocca.z], i * 3);
      f.vel.set([d.x * v, d.y * v, d.z * v], i * 3);
      f.eta[i] = 0;
      f.vita[i] = brace ? casuale(1.6, 2.6) : casuale(0.7, 1.05);
      f.brace[i] = brace ? 1 : 0;
      (this.fuoco.geometry.attributes.aVita as THREE.BufferAttribute).setX(i, 0);
      (this.fuoco.geometry.attributes.aTaglia as THREE.BufferAttribute).setX(i, brace ? casuale(0.05, 0.09) : casuale(0.22, 0.38));
    }
  }

  private muoviFuoco(t: number, dt: number) {
    const f = this.fp;
    const vitaAttr = this.fuoco.geometry.attributes.aVita as THREE.BufferAttribute;
    let vive = 0;
    const centro = this.uniformi.uFuoco.value;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < PARTICELLE; i++) {
      if (vitaAttr.getX(i) < 0) continue;
      f.eta[i] += dt;
      const k = f.eta[i] / f.vita[i];
      if (k >= 1) {
        vitaAttr.setX(i, -1);
        continue;
      }
      const o = i * 3;
      if (f.brace[i]) {
        // le braci rallentano, cadono e tremolano
        f.vel[o] *= 1 - 0.8 * dt;
        f.vel[o + 2] *= 1 - 0.8 * dt;
        f.vel[o + 1] -= 2.2 * dt;
        vitaAttr.setX(i, Math.min(0.45, k * 0.5) + (Math.sin(t * 40 + i) > 0.6 ? 0.4 : 0));
      } else {
        // la fiamma frena nell'aria, sale perché calda, e si torce
        const att = 1 - 2.2 * dt;
        f.vel[o] *= att;
        f.vel[o + 1] = f.vel[o + 1] * att + 1.6 * dt;
        f.vel[o + 2] *= att;
        f.vel[o] += Math.sin(t * 9 + i * 0.7) * 2.2 * dt;
        f.vel[o + 2] += Math.cos(t * 8 + i * 1.3) * 2.2 * dt;
        vitaAttr.setX(i, k);
        cx += f.pos[o]; cy += f.pos[o + 1]; cz += f.pos[o + 2];
        vive++;
      }
      f.pos[o] += f.vel[o] * dt;
      f.pos[o + 1] += f.vel[o + 1] * dt;
      f.pos[o + 2] += f.vel[o + 2] * dt;
    }
    vitaAttr.needsUpdate = true;
    this.fuoco.geometry.attributes.position.needsUpdate = true;
    (this.fuoco.geometry.attributes.aTaglia as THREE.BufferAttribute).needsUpdate = true;
    if (vive > 0) centro.set(cx / vive, cy / vive, cz / vive);
    return vive;
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    const u = this.uniformi;
    u.uT.value = t;
    const vive = this.gruppo.visible ? this.muoviFuoco(t, dt) : 0;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("cieloNotte", "drago", t)) return;
      this.nuovoPercorso(camera);
      s.inizio = t;
      s.s = 0;
      s.ruggito = -1;
      s.fatto = false;
      s.planata = 0;
      s.prossimaPlanata = t + casuale(2.5, 4);
      this.gruppo.visible = true;
      const h = typeof window !== "undefined" ? window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.75) : 900;
      (this.fuoco.material as THREE.ShaderMaterial).uniforms.uAltezza.value = h;
    }
    const curva = this.curva;
    if (!curva) return;
    const { p, tg, l, bocca, dir } = this.tmp;

    // il ruggito: si impenna, si accende dentro, apre le fauci e sputa fuoco
    const kPos = s.s / s.L;
    if (!s.fatto && s.ruggito < 0 && kPos >= s.uFuoco) s.ruggito = t;
    const r = s.ruggito >= 0 ? t - s.ruggito : -1;
    const T_R = 4.4;
    let impenna = 0, fauci = 0, getto = false, lento = 1;
    if (r >= 0) {
      if (r > T_R) {
        s.ruggito = -1;
        s.fatto = true;
      } else {
        impenna = fra(r, 0, 0.9) * (1 - fra(r, 3.4, T_R));
        fauci = fra(r, 0.5, 1.1) * (1 - fra(r, 3.3, 3.8));
        getto = r > 1.05 && r < 3.35;
        lento = 1 - 0.8 * impenna;
        u.uBrace.value = fra(r, 0, 1.0) * (1 - fra(r, 3.2, 4.2));
      }
    } else {
      u.uBrace.value *= 1 - Math.min(1, dt * 2);
    }

    // avanza: più veloce nel battito, rallenta in planata
    const v = 3.6 * lento;
    s.s = Math.min(s.L, s.s + v * dt);
    const k = s.s / s.L;
    curva.getPointAt(k, p);
    curva.getTangentAt(k, tg);
    this.corpo.position.copy(p);
    const imb = Math.atan2(tg.x, tg.z);
    let dImb = imb - s.imbardata;
    if (dImb > Math.PI) dImb -= Math.PI * 2;
    if (dImb < -Math.PI) dImb += Math.PI * 2;
    s.imbardata = imb;
    const rollioVoluto = THREE.MathUtils.clamp((-dImb / Math.max(dt, 0.001)) * 0.9, -0.7, 0.7);
    s.rollio += (rollioVoluto - s.rollio) * Math.min(1, dt * 2);
    l.copy(p).add(tg);
    this.corpo.lookAt(l);
    this.corpo.rotateZ(s.rollio);
    this.corpo.rotateX(-0.55 * impenna);

    // ali: battiti potenti, planate, battito rapido quando si sostiene in aria
    if (!getto && t > s.prossimaPlanata && s.planata <= 0) {
      s.planata = casuale(1.2, 2.2);
      s.prossimaPlanata = t + s.planata + casuale(3, 5);
    }
    const plana = s.planata > 0 && impenna < 0.1;
    if (s.planata > 0) s.planata -= dt;
    const freq = impenna > 0.2 ? 1.45 : 0.9;
    s.battitoFase += dt * freq * Math.PI * 2 * (plana ? 0.15 : 1);
    const fase = s.battitoFase;
    // discesa veloce, risalita più lenta: la fase si deforma
    const fd = Math.sin(fase - 0.35 * Math.sin(fase));
    const ampiezza = plana ? 0.06 : 0.62 + impenna * 0.15;
    const battito = 0.1 + fd * ampiezza;
    const ritardo = Math.sin(fase - 0.9) * ampiezza;
    const risale = Math.max(0, Math.cos(fase)) * (plana ? 0 : 1);
    const piega = 0.08 + risale * 0.3;
    const pancia = 0.06 + Math.max(0, -Math.cos(fase)) * 0.1 * (plana ? 0.3 : 1);
    this.ali.forEach((a) => posaAla(a, battito, ritardo, piega, pancia));
    this.corpo.position.y += -fd * 0.08 * (plana ? 0 : 1);

    // collo e testa: di norma guarda avanti, ondeggiando; vicino a chi guarda volta la testa;
    // nel ruggito mira e spazza col fuoco
    this.corpo.updateMatrixWorld(true);
    let mira: THREE.Vector3 | null = null;
    const dCam = p.distanceTo(camera.position);
    if (r >= 0) {
      const spazza = Math.sin((r - 1.0) * 1.6) * 3.5;
      mira = s.bersaglio
        .copy(p)
        .addScaledVector(tg.clone().setY(0).normalize(), 6)
        .add(new THREE.Vector3(0, -1.2, 0))
        .addScaledVector(new THREE.Vector3(-tg.z, 0, tg.x).normalize(), spazza);
    } else if (k > 0.3 && k < 0.75) {
      mira = s.bersaglio.copy(camera.position);
    }
    let yaw = 0, pitch = 0;
    if (mira) {
      const loc = this.corpo.worldToLocal(mira.clone()).sub(new THREE.Vector3(0, 0.08, 0.74));
      yaw = THREE.MathUtils.clamp(Math.atan2(loc.x, loc.z), -1.1, 1.1);
      pitch = THREE.MathUtils.clamp(-Math.atan2(loc.y, Math.hypot(loc.x, loc.z)), -0.9, 0.9);
    }
    const nodi = [...this.collo, this.testa];
    nodi.forEach((n, i) => {
      const onda = Math.sin(t * 1.3 - i * 0.6) * 0.05;
      const yv = yaw / nodi.length + onda;
      const xv = pitch / nodi.length + (i < 2 ? -0.12 : 0.06) * (1 - impenna) - (i < 3 ? impenna * 0.18 : 0);
      n.rotation.y += (yv - n.rotation.y) * Math.min(1, dt * 3);
      n.rotation.x += (xv - n.rotation.x) * Math.min(1, dt * 3);
    });
    this.mascella.rotation.x = 0.05 + fauci * 0.62 + Math.sin(t * 30) * 0.02 * fauci;
    this.coda.forEach((c, i) => {
      const a = 0.05 + i * 0.022;
      c.rotation.y = Math.sin(t * 1.5 - i * 0.65) * a - s.rollio * 0.04 * i;
      c.rotation.x = Math.sin(t * 1.1 - i * 0.5) * a * 0.5 + 0.03 + impenna * 0.06;
    });

    // fuoco dalla bocca, nella direzione del muso
    this.testa.updateMatrixWorld(true);
    bocca.set(0, -0.04, 0.5).applyMatrix4(this.testa.matrixWorld);
    dir.set(0, -0.12, 1).transformDirection(this.testa.matrixWorld);
    if (getto) this.emetti(dt, 300);
    u.uFuocoI.value += ((getto ? 2.6 : vive > 0 ? 0.6 : 0) - u.uFuocoI.value) * Math.min(1, dt * 6);
    if (!getto && vive === 0) u.uFuoco.value.copy(bocca);

    // visibilità: emerge dal buio lontano e ci torna
    u.uOcchio.value.copy(camera.position);
    const vis = (1 - fra(dCam, 21, 28)) * fra(t - s.inizio, 0, 1.5);
    u.uVis.value = vis;
    (this.corpo.userData.osso as THREE.LineBasicMaterial).opacity = vis * 0.9;
    (this.corpo.userData.corno as THREE.MeshBasicMaterial).opacity = vis;
    (this.corpo.userData.dente as THREE.MeshBasicMaterial).opacity = vis * (0.4 + fauci * 0.6);
    this.occhi.forEach((o) => {
      o.material.opacity = vis * (0.7 + 0.3 * Math.sin(t * 3) + u.uBrace.value * 0.5);
    });
    this.materiali.forEach((m) => {
      m.depthWrite = vis > 0.95;
    });

    if (k >= 1 && vive === 0) {
      s.inizio = -1;
      s.prossima = t + attesa(100, 160);
      passa("cieloNotte", t, attesa(30, 60));
      this.gruppo.visible = false;
    }
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
