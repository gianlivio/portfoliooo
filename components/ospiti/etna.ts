import * as THREE from "three";
import { PELO_ACQUA, SOLE } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, bruma, casuale, liberaTutto } from "./comuni";

/**
 * L'Etna, piccolo, all'orizzonte, a destra di dove si comincia a guardare.
 * Non un cono: il profilo largo del vulcano a scudo, i canaloni, la Valle del Bove scavata nel fianco,
 * i coni avventizi a mezza costa, la cima coi crateri a orlo frastagliato.
 * Di giorno: in basso il verde-bruno di boschi e vigne, poi il nero delle colate vecchie, in cima la neve
 * che scende a lingue nei canaloni; lo illumina il sole che gira per la stanza. Nuvole a mezza costa, il pennacchio.
 * Di notte: una sagoma scura col cratere che arde e le colate di lava; la neve resta, fioca, sotto la luna.
 * Non si muove la montagna: solo lava, fumo e nuvole, che con "riduci movimento" restano fermi.
 */

const DIST = 41; // dentro la volta delle stelle (42), che altrimenti gli passerebbero davanti
// nella finestra di cielo libera sopra la zona dello sviluppatore, subito a sinistra della prima carta: lì non lo copre niente
// gigante, a destra dello sviluppatore, dove prima stavano le isole: come stare ai suoi piedi
const AZ = ANGOLO_ZONA + 1.2;
const GRANDE = 4.2;
const ALTO = 3.4;
const BASE = 6.2;

const VERT = `
varying vec3 vP;
varying vec3 vN;
varying float vSolco;
attribute float solco;
void main(){ vP = position; vN = normal; vSolco = solco; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `
uniform float uT;
uniform float uNotte;
uniform vec3 uSole;
varying vec3 vP;
varying vec3 vN;
varying float vSolco;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ return 0.55 * n(p) + 0.3 * n(p * 2.1 + 3.7) + 0.15 * n(p * 4.3 + 9.1); }
void main(){
  float y = vP.y / ${ALTO.toFixed(1)};
  float a = atan(vP.z, vP.x);
  vec2 q = vec2(a * 6.0, y * 5.0);
  // le fasce: boschi e vigne in basso, le colate vecchie nere, la roccia più chiara verso la cima
  vec3 bosco = mix(vec3(0.26, 0.34, 0.18), vec3(0.44, 0.40, 0.26), fbm(q * 3.0));
  vec3 colate = mix(vec3(0.17, 0.16, 0.16), vec3(0.30, 0.28, 0.27), fbm(q * 2.0 + 5.0));
  // le colate più recenti, lingue scure che tagliano il verde
  float lingueNere = smoothstep(0.62, 0.7, fbm(vec2(a * 11.0, y * 2.0)));
  vec3 roccia = mix(bosco, colate, clamp(smoothstep(0.18, 0.42, y + (fbm(q) - 0.5) * 0.18) + lingueNere * 0.8, 0.0, 1.0));
  roccia = mix(roccia, vec3(0.42, 0.38, 0.36), smoothstep(0.7, 0.88, y) * 0.6);
  // la neve: sopra una quota che ondeggia, e più in basso nei canaloni, dove resta di più
  float limite = 0.76 + (fbm(vec2(a * 8.0, 1.0)) - 0.5) * 0.1 - vSolco * 0.13;
  float neve = smoothstep(limite, limite + 0.04, y + (n(q * 6.0) - 0.5) * 0.05);
  neve *= 1.0 - smoothstep(0.965, 0.99, y) * 0.7; // l'orlo del cratere, caldo, resta scuro
  roccia = mix(roccia, vec3(0.93, 0.94, 0.97), neve);
  // la luce del sole che gira per la stanza, e i canaloni in ombra
  float luce = 0.55 + 0.6 * max(dot(normalize(vN), normalize(uSole)), 0.0);
  roccia *= luce * (1.0 - vSolco * 0.18);
  // notte: quasi nera, la neve fioca sotto la luna, le colate che scendono dal cratere e scorrono
  vec3 notte = mix(vec3(0.05, 0.05, 0.07), vec3(0.17, 0.19, 0.25), neve * (0.6 + 0.4 * max(normalize(vN).y, 0.0)));
  float lava = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float centro = 0.9 + fk * 0.55 + sin(y * 5.0 + fk) * 0.08;
    float largo = 0.035 + (1.0 - y) * 0.05;
    float lingua = 1.0 - smoothstep(largo * 0.4, largo, abs(a - centro));
    float lunga = smoothstep(0.15 + fk * 0.12, 0.35 + fk * 0.12, y);
    float flusso = 0.6 + 0.4 * n(vec2(a * 30.0, y * 14.0 + uT * (0.6 + fk * 0.2)));
    lava = max(lava, lingua * lunga * flusso);
  }
  float bocca = smoothstep(0.9, 0.99, y);
  vec3 fuoco = mix(vec3(0.9, 0.2, 0.03), vec3(1.0, 0.62, 0.15), lava);
  // di giorno la lontananza lo schiarisce verso l'azzurro dell'orizzonte (la neve meno)
  roccia = mix(roccia, vec3(0.78, 0.84, 0.9), 0.24 - neve * 0.1);
  vec3 c = mix(roccia, notte + fuoco * max(lava, bocca * 0.7), uNotte);
  gl_FragColor = vec4(c, 1.0);
}`;

/** Rumore deterministico per la forma, uguale a ogni caricamento. */
function onda(x: number, y: number) {
  return Math.sin(x * 1.7 + Math.sin(y * 2.3) * 1.3) * 0.5 + Math.sin(x * 4.1 - y * 1.9) * 0.3 + Math.sin(x * 9.3 + y * 3.7) * 0.2;
}

/**
 * La montagna: un tornio fitto, poi i vertici spostati. I canaloni sono solchi che scendono dalla cima,
 * la Valle del Bove una conca larga sul fianco verso chi guarda, i coni avventizi gobbe a mezza costa,
 * la cima un pianoro irregolare coi crateri. L'attributo `solco` dice allo shader dove sono i canaloni.
 */
function montagna(versoChiGuarda: number) {
  const profilo: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    // vulcano a scudo: base larghissima, fianchi che si fanno ripidi, la cima tronca
    profilo.push(new THREE.Vector2(BASE * Math.pow(1 - k, 1.55) + 0.62 * k, ALTO * (1 - Math.pow(1 - k, 1.3))));
  }
  profilo.push(new THREE.Vector2(0.45, ALTO - 0.12));
  const g = new THREE.LatheGeometry(profilo, 128);
  const p = g.attributes.position as THREE.BufferAttribute;
  const solco = new Float32Array(p.count);
  const coni = [
    { a: versoChiGuarda - 0.75, k: 0.28, r: 0.55, h: 0.22 },
    { a: versoChiGuarda - 0.45, k: 0.36, r: 0.4, h: 0.16 },
    { a: versoChiGuarda + 0.95, k: 0.24, r: 0.5, h: 0.2 },
    { a: versoChiGuarda + 1.4, k: 0.33, r: 0.35, h: 0.14 },
  ];
  const bove = versoChiGuarda + 0.35;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k = y / ALTO;
    // i canaloni: solchi che scendono dalla cima, più marcati a metà e in alto
    const c = Math.pow(Math.abs(Math.sin(a * 7 + onda(a * 2, k * 3) * 0.6)), 6);
    const s = (1 - c) * Math.min(1, k * 2.2) * (1 - Math.pow(k, 6));
    solco[i] = s;
    let dr = -s * 0.09 * (0.4 + k) + onda(a * 3, k * 4) * 0.06 * (1 - k);
    // la Valle del Bove: una conca larga sul fianco, fra mezza costa e la cima
    const da = Math.atan2(Math.sin(a - bove), Math.cos(a - bove));
    dr -= Math.exp(-(da * da) / 0.09) * Math.exp(-Math.pow((k - 0.55) / 0.2, 2)) * 0.55;
    // i coni avventizi
    let dy = 0;
    for (const cn of coni) {
      const dA = Math.atan2(Math.sin(a - cn.a), Math.cos(a - cn.a)) * r;
      const dK = (k - cn.k) * ALTO * 1.6;
      const d = Math.hypot(dA, dK) / cn.r;
      if (d < 1) {
        const gobba = Math.pow(1 - d, 1.6);
        dr += gobba * cn.h * 1.4;
        dy += gobba * cn.h * 0.5;
      }
    }
    // la cima: l'orlo dei crateri frastagliato, il pianoro che si abbassa a tratti
    if (k > 0.93) dy += (Math.sin(a * 3 + 0.6) * 0.5 + Math.sin(a * 5 + 2.1) * 0.25 - 0.2) * 0.06 * (k - 0.93) * 14;
    const nr = Math.max(0.05, r + dr);
    p.setXYZ(i, (x / r) * nr, y + dy, (z / r) * nr);
  }
  g.setAttribute("solco", new THREE.BufferAttribute(solco, 1));
  g.computeVertexNormals();
  return g;
}

export class Etna {
  gruppo = new THREE.Group();
  private mat: THREE.ShaderMaterial;
  private bagliore: THREE.Sprite;
  private fumo: { s: THREE.Sprite; fase: number }[] = [];
  private nuvole: { s: THREE.Sprite; a: number; r: number; y: number }[] = [];
  private texture: THREE.Texture[] = [];
  private notte = true;

  constructor(notte: boolean) {
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uT: { value: 0 }, uNotte: { value: 1 }, uSole: { value: SOLE } }, fog: false });
    // il fianco rivolto a chi guarda, dal centro della stanza: lì la Valle del Bove e i coni
    const verso = Math.atan2(Math.cos(AZ), -Math.sin(AZ));
    const monte = new THREE.Mesh(montagna(verso), this.mat);
    this.gruppo.add(monte);
    // il bagliore del cratere, di notte
    const tx = alone("#FF6A2A");
    this.texture.push(tx);
    this.bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.bagliore.position.y = ALTO + 0.2;
    this.bagliore.scale.setScalar(2.4);
    this.gruppo.add(this.bagliore);
    // il fumo che sale dal cratere e piega col vento; le nuvole a mezza costa
    const txB = bruma(23);
    this.texture.push(txB);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txB, color: "#EEEAE4", transparent: true, depthWrite: false, fog: false }));
      this.fumo.push({ s, fase: i / 9 });
      this.gruppo.add(s);
    }
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txB, color: "#FFFFFF", transparent: true, depthWrite: false, fog: false }));
      s.scale.set(casuale(3.5, 5.5), casuale(1, 1.6), 1);
      this.nuvole.push({ s, a: (i / 7) * Math.PI * 2, r: casuale(3.6, 5), y: casuale(1, 1.9) });
      this.gruppo.add(s);
    }
    this.gruppo.position.set(Math.sin(AZ) * DIST, PELO_ACQUA - 0.3, -Math.cos(AZ) * DIST);
    this.gruppo.scale.setScalar(GRANDE);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.renderOrder = -0.8;
    });
    this.setNotte(notte);
    this.aggiorna(0);
  }

  setNotte(notte: boolean) {
    this.notte = notte;
    this.mat.uniforms.uNotte.value = notte ? 1 : 0;
    this.bagliore.visible = notte;
    this.nuvole.forEach((n) => (n.s.visible = !notte));
    this.fumo.forEach((f) => f.s.material.color.set(notte ? "#3A2A28" : "#EEEAE4"));
  }

  aggiorna(t: number) {
    this.mat.uniforms.uT.value = t;
    if (this.notte) this.bagliore.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.7) * Math.sin(t * 0.7);
    this.fumo.forEach((f) => {
      const k = (t * 0.035 + f.fase) % 1;
      f.s.position.set(k * 2.6, ALTO + 0.2 + k * 3.4, -k * 0.6);
      f.s.scale.set(0.9 + k * 3, 0.8 + k * 2, 1);
      f.s.material.opacity = Math.sin(k * Math.PI) * (this.notte ? 0.35 : 0.7);
    });
    this.nuvole.forEach((n) => {
      const a = n.a + t * 0.01;
      n.s.position.set(Math.cos(a) * n.r, n.y, Math.sin(a) * n.r);
      n.s.material.opacity = 0.85;
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
