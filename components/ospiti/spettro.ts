import * as THREE from "three";
import { RUMORE } from "./comuni";

/**
 * Materia dei fantasmi, come la nave di Ulisse e il galeone: luce additiva, più forte sui bordi
 * (fresnel), legno a tavole con qualche buco, e una comparsa a chiazze dal basso in alto.
 * Il rumore della comparsa è calcolato nello spazio dell'oggetto (uInv), così le chiazze
 * restano ferme sul corpo mentre si muove. Sotto il pelo dell'acqua (uAcqua, quota nel mondo) sfuma.
 */

const VERT = /* glsl */ `
uniform mat4 uInv;
varying vec3 vQ;
varying vec3 vV;
varying float vY;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vQ = (uInv * w).xyz;
  vY = w.y;
  vec4 mv = viewMatrix * w;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uForza;
uniform float uBuchi;
uniform float uTavole;
uniform float uSeme;
uniform float uAcqua;
uniform float uLuminoso;
uniform vec3 uColore;
varying vec3 vQ;
varying vec3 vV;
varying float vY;
${RUMORE}
void main(){
  vec3 v = normalize(vV);
  vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  vec3 q = vQ;
  float d = frattale(q * 2.3 + vec3(0.0, uT * 0.18, uSeme)) * 0.85 + clamp(q.y, -0.3, 2.5) * 0.1;
  float soglia = uVis * 1.2;
  if (d > soglia) discard;
  float orlo = smoothstep(soglia - 0.06, soglia, d) * (1.0 - step(0.999, uVis));
  float m = frattale(q * vec3(5.0, 7.0, 5.0) + uSeme);
  if (m < uBuchi) discard;
  float bucato = 1.0 - smoothstep(uBuchi, uBuchi + 0.05, m);
  float fa = abs(fract(q.y * 22.0) - 0.5) * 2.0;
  float giunto = (1.0 - smoothstep(0.0, 0.2, fa)) * uTavole;
  vec3 c = uColore * (0.12 + 0.95 * fres) * (1.0 - 0.5 * giunto) * (0.7 + 0.6 * m);
  c += uColore * bucato * 1.1 + uColore * uLuminoso;
  float a = 0.14 + 0.8 * fres + bucato * 0.6 + uLuminoso * 0.5;
  c += vec3(1.0, 0.97, 0.9) * orlo * 1.8;
  a += orlo;
  a *= smoothstep(uAcqua - 0.02, uAcqua + 0.06, vY) * uForza;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export type ComuniSpettro = {
  uT: { value: number };
  uVis: { value: number };
  uForza: { value: number };
  uInv: { value: THREE.Matrix4 };
  uAcqua: { value: number };
  uColore: { value: THREE.Color };
};

export function comuniSpettro(colore: string, acqua: number): ComuniSpettro {
  return {
    uT: { value: 0 },
    uVis: { value: 0 },
    uForza: { value: 1 },
    uInv: { value: new THREE.Matrix4() },
    uAcqua: { value: acqua },
    uColore: { value: new THREE.Color(colore) },
  };
}

export function spettro(comuni: ComuniSpettro, { buchi = 0.12, tavole = 1, seme = 0, luminoso = 0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...comuni,
      uBuchi: { value: buchi },
      uTavole: { value: tavole },
      uSeme: { value: seme },
      uLuminoso: { value: luminoso },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
