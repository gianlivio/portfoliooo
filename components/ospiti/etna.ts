import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, bruma, casuale, liberaTutto } from "./comuni";

/**
 * L'Etna, piccolo, all'orizzonte, a destra di dove si comincia a guardare.
 * Di notte: una sagoma scura col cratere che arde e colate di lava che scendono sui fianchi.
 * Di giorno: grigio-bruno con la cima più chiara, nuvole intorno a mezza costa e il fumo che sale dal cratere.
 * Non si muove la montagna: solo lava, fumo e nuvole, che con "riduci movimento" restano fermi.
 */

const DIST = 39; // dentro la volta delle stelle (42), che altrimenti gli passerebbero davanti
// nella finestra di cielo libera sopra la zona dello sviluppatore, subito a sinistra della prima carta: lì non lo copre niente
const AZ = ANGOLO_ZONA + 0.22;
const ALTO = 3.4;
const BASE = 6.2;

const VERT = `
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `
uniform float uT;
uniform float uNotte;
varying vec3 vP;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float y = vP.y / ${ALTO.toFixed(1)};
  float a = atan(vP.z, vP.x);
  // giorno: roccia grigio-bruna, la cima più chiara, qualche canalone
  vec3 roccia = mix(vec3(0.42, 0.39, 0.37), vec3(0.62, 0.6, 0.6), smoothstep(0.55, 0.95, y));
  roccia *= 0.85 + 0.25 * n(vec2(a * 9.0, y * 6.0));
  // notte: quasi nera, e le colate: lingue che scendono dal cratere lungo i fianchi, che scorrono
  vec3 notte = vec3(0.05, 0.05, 0.07);
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
  float bocca = smoothstep(0.86, 0.98, y);
  vec3 fuoco = mix(vec3(0.9, 0.2, 0.03), vec3(1.0, 0.62, 0.15), lava);
  // di giorno la lontananza lo schiarisce verso l'azzurro dell'orizzonte
  roccia = mix(roccia, vec3(0.78, 0.84, 0.9), 0.42);
  vec3 c = mix(roccia, notte + fuoco * max(lava, bocca * 0.7), uNotte);
  gl_FragColor = vec4(c, 1.0);
}`;

export class Etna {
  gruppo = new THREE.Group();
  private mat: THREE.ShaderMaterial;
  private bagliore: THREE.Sprite;
  private fumo: { s: THREE.Sprite; fase: number }[] = [];
  private nuvole: { s: THREE.Sprite; a: number; r: number; y: number }[] = [];
  private texture: THREE.Texture[] = [];
  private notte = true;

  constructor(notte: boolean) {
    // il profilo: base larga, pendii che si fanno ripidi, il cratere in cima appena incavato
    const profilo: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      profilo.push(new THREE.Vector2(BASE * Math.pow(1 - k, 1.6) + 0.5 * k, ALTO * (1 - Math.pow(1 - k, 1.25))));
    }
    profilo.push(new THREE.Vector2(0.35, ALTO - 0.15));
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uT: { value: 0 }, uNotte: { value: 1 } }, fog: false });
    const monte = new THREE.Mesh(new THREE.LatheGeometry(profilo, 48), this.mat);
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
