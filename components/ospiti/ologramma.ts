import * as THREE from "three";
import { loft } from "./comuni";

/**
 * Achille come ologramma: una figura di luce azzurra, a righe di scansione, che tremola.
 * Elmo crestato e corta tunica; corre al rallentatore, con le braccia piegate come un velocista.
 * La posa si regola da fuori con `corri(fase, ampiezza)`; `vis` ne regola la presenza.
 */

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(normalMatrix * normal);
  vec4 mv = viewMatrix * w;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uGuasto;
uniform vec3 uColore;
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main(){
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);
  // righe di scansione che salgono, e una banda più chiara che passa ogni tanto
  float righe = 0.62 + 0.38 * step(0.45, fract(vW.y * 46.0 - uT * 1.5));
  float banda = smoothstep(0.08, 0.0, abs(fract(vW.y * 0.35 - uT * 0.22) - 0.5) - 0.42);
  // tremolio, più forte quando la figura si inceppa
  float tremo = 0.86 + 0.14 * sin(uT * 37.0) * sin(uT * 11.0) - uGuasto * 0.4 * step(0.5, fract(uT * 9.0 + vW.y * 3.0));
  float a = (0.16 + 0.7 * fres + banda * 0.25) * righe * tremo * uVis;
  vec3 c = uColore * (0.55 + 0.9 * fres) + vec3(0.7, 0.95, 1.0) * banda * 0.4;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

const verticale = (g: THREE.BufferGeometry) => g.rotateX(-Math.PI / 2);

export class Ologramma {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private anche: THREE.Group[] = [];
  private ginocchia: THREE.Group[] = [];
  private spalle: THREE.Group[] = [];
  private gomiti: THREE.Group[] = [];
  private mat: THREE.ShaderMaterial;

  constructor(altezza = 1.5) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uT: { value: 0 }, uVis: { value: 0 }, uGuasto: { value: 0 }, uColore: { value: new THREE.Color("#4DA8FF") } },
      transparent: true,
      depthWrite: false,
    });
    const m = this.mat;
    // busto: dalla vita alle spalle, più largo in alto
    this.corpo.add(new THREE.Mesh(verticale(loft([
      { z: 0.92, l: 0.15, su: 0.1 },
      { z: 1.05, l: 0.14, su: 0.095 },
      { z: 1.25, l: 0.17, su: 0.11 },
      { z: 1.42, l: 0.21, su: 0.11 },
      { z: 1.5, l: 0.12, su: 0.08 },
      { z: 1.56, l: 0.055, su: 0.05 },
    ], { radiali: 14, passi: 3 })), m));
    // tunica corta
    this.corpo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.3, 12, 1, true).translate(0, 0.86, 0), m));
    // testa ed elmo con la cresta alta
    this.corpo.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10).scale(1, 1.15, 1.1).translate(0, 1.7, 0.01), m));
    const cresta = new THREE.Shape();
    cresta.moveTo(-0.2, 0);
    cresta.quadraticCurveTo(-0.16, 0.2, 0.04, 0.22);
    cresta.quadraticCurveTo(0.2, 0.2, 0.2, 0.0);
    cresta.closePath();
    this.corpo.add(new THREE.Mesh(
      new THREE.ExtrudeGeometry(cresta, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02).rotateY(Math.PI / 2).translate(0, 1.8, -0.02),
      m
    ));
    // gambe: coscia, ginocchio, stinco, piede
    for (const s of [-1, 1]) {
      const anca = new THREE.Group();
      anca.position.set(s * 0.1, 0.93, 0);
      anca.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.45, 8).translate(0, -0.225, 0), m));
      const ginocchio = new THREE.Group();
      ginocchio.position.y = -0.45;
      ginocchio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.045, 0.44, 8).translate(0, -0.22, 0), m));
      ginocchio.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.22).translate(0, -0.45, 0.06), m));
      anca.add(ginocchio);
      this.corpo.add(anca);
      this.anche.push(anca);
      this.ginocchia.push(ginocchio);
      // braccia: piegate al gomito, come chi corre
      const spalla = new THREE.Group();
      spalla.position.set(s * 0.22, 1.43, 0);
      spalla.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 8).translate(0, -0.15, 0), m));
      const gomito = new THREE.Group();
      gomito.position.y = -0.3;
      gomito.add(new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.035, 0.28, 8).translate(0, -0.14, 0), m));
      spalla.add(gomito);
      this.corpo.add(spalla);
      this.spalle.push(spalla);
      this.gomiti.push(gomito);
    }
    this.corpo.scale.setScalar(altezza / 1.9);
    this.gruppo.add(this.corpo);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.renderOrder = 8;
    });
  }

  /**
   * Posa della corsa. fase: 0..1 per un ciclo completo (due passi); ampiezza: 0..1.
   * Il busto è inclinato in avanti, le gambe e le braccia si alternano.
   */
  corri(fase: number, ampiezza: number, t: number, vis: number, guasto: number) {
    const a = Math.PI * 2 * fase;
    this.corpo.rotation.x = 0.22 * ampiezza;
    this.corpo.position.y = Math.abs(Math.sin(a)) * 0.05 * ampiezza;
    [0, 1].forEach((i) => {
      const f = a + i * Math.PI;
      // positivo porta il piede indietro
      this.anche[i].rotation.x = -Math.sin(f) * 0.75 * ampiezza;
      this.ginocchia[i].rotation.x = (0.25 + Math.max(0, Math.cos(f)) * 1.3) * ampiezza;
      this.spalle[i].rotation.x = Math.sin(f) * 0.7 * ampiezza;
      this.gomiti[i].rotation.x = -1.35 * Math.max(ampiezza, 0.4);
    });
    this.mat.uniforms.uT.value = t;
    this.mat.uniforms.uVis.value = vis;
    this.mat.uniforms.uGuasto.value = guasto;
  }

  libera() {
    this.gruppo.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.mat.dispose();
  }
}
