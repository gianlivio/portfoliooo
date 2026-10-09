"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/**
 * Il pavimento della stanza.
 * Di notte: una superficie d'acqua che riflette carte e cielo, con increspature leggere.
 * Di giorno: un pavimento di marmo chiaro e lucido, con venature morbide, che riflette le carte.
 */

import { PELO_ACQUA, gocce, MAX_GOCCE, SOLE } from "./condivisi";

/** Quante carte al più gettano ombra sul marmo. */
const MAX_CARTE = 16;



/* -------------------------------------------------------------------- acqua */

const ACQUA_VERT = `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vMondo;
void main(){
  vUv = textureMatrix * vec4(position, 1.0);
  vMondo = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ACQUA_FRAG = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float uTempo;
uniform vec4 uGocce[${MAX_GOCCE}];
varying vec4 vUv;
varying vec3 vMondo;
void main(){
  vec2 p = vMondo.xz;
  float t = uTempo;
  // increspature: poche onde lente sovrapposte, più fitte lontano
  vec2 d = vec2(
    sin(p.x * 1.9 + t * 0.7) + sin((p.x + p.y) * 3.3 - t * 1.1) * 0.5,
    sin(p.y * 2.3 - t * 0.9) + sin((p.x - p.y) * 2.7 + t * 1.3) * 0.5
  ) * 0.0045;
  // le gocce: treni di onde circolari che si allargano, si allungano e si smorzano
  float cresta = 0.0;
  for (int k = 0; k < ${MAX_GOCCE}; k++) {
    vec4 g = uGocce[k];
    float eta = t - g.z;
    if (g.w <= 0.0 || eta < 0.0 || eta > 7.0) continue;
    vec2 q = p - g.xy;
    float r = length(q);
    vec2 n = q / max(r, 0.0001);
    // tre anelli: il primo corre più veloce, quelli dietro hanno lunghezza d'onda più corta
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      float fronte = eta * (0.95 - fj * 0.22);
      float x = r - fronte;
      float largo = 0.09 + eta * 0.05;
      float inv = exp(-(x * x) / (largo * largo)) * exp(-eta * 0.62) / (1.0 + r * 2.2);
      float onda = sin(x * (34.0 + fj * 10.0) / (1.0 + eta * 0.35)) * inv * (1.0 - fj * 0.28);
      d += n * onda * 0.022 * g.w;
      cresta += onda * g.w;
    }
  }
  vec2 uv = vUv.xy / vUv.w + d;
  vec3 riflesso = texture2D(tDiffuse, uv).rgb;
  float r = length(p);
  float vicino = smoothstep(30.0, 4.0, r);
  // la riflessione si fa più forte verso l'orizzonte (Fresnel di comodo) e si spegne in lontananza
  float fresnel = 0.42 + 0.3 * smoothstep(3.0, 16.0, r);
  vec3 c = mix(color, riflesso, fresnel * vicino);
  // il bordo delle onde prende la luce del cielo da un lato e la perde dall'altro
  c += vec3(0.07, 0.08, 0.1) * max(cresta, 0.0) - vec3(0.02) * max(-cresta, 0.0);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function Specchio({
  fondo, stretto, ridotto, frammento, quota, colore,
}: {
  fondo: string; stretto: boolean; ridotto: boolean; frammento: string; quota: number; colore: string;
}) {
  const { size, viewport } = useThree();
  const acqua = useMemo(() => {
    const scala = stretto ? 0.5 : 0.6;
    const r = new Reflector(new THREE.CircleGeometry(60, 64), {
      textureWidth: Math.round(size.width * viewport.dpr * scala),
      textureHeight: Math.round(size.height * viewport.dpr * scala),
      clipBias: 0.003,
      color: new THREE.Color(colore),
      shader: {
        name: "Specchio",
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          uTempo: { value: 0 },
          uGocce: { value: gocce.map((g) => g.clone()) },
          uCarte: { value: Array.from({ length: MAX_CARTE }, () => new THREE.Matrix4()) },
          uOpac: { value: new Array(MAX_CARTE).fill(0) },
          uNumCarte: { value: 0 },
          uSole: { value: SOLE },
          uMisura: { value: new THREE.Vector2(2.4, 1.65) },
        },
        vertexShader: ACQUA_VERT,
        fragmentShader: frammento,
      },
    });
    r.rotation.x = -Math.PI / 2;
    r.position.y = quota;
    r.raycast = () => undefined;
    return r;
    // dimensioni della texture fissate al montaggio: la scena si rimonta se cambia il layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondo, stretto, frammento, quota, colore]);

  useEffect(() => () => acqua.dispose(), [acqua]);

  // il riflesso si calcola prima del disegno della scena, non a metà:
  // il Reflector di three lo farebbe dentro il disegno e coprirebbe le carte
  const rif = useRef<Reflector>(null);
  const carte = useRef<THREE.Mesh[]>([]);
  const riflessione = useRef<Reflector["onBeforeRender"] | null>(null);
  useEffect(() => {
    const r = rif.current;
    if (!r) return;
    riflessione.current = r.onBeforeRender.bind(r);
    r.onBeforeRender = () => {};
  }, [acqua]);

  useFrame((stato) => {
    const r = rif.current;
    if (!r) return;
    const u = (r.material as THREE.ShaderMaterial).uniforms;
    u.uTempo.value = ridotto ? 0 : stato.clock.elapsedTime;
    if (u.uGocce) (u.uGocce.value as THREE.Vector4[]).forEach((v, k) => v.copy(gocce[k]));
    // le carte che gettano ombra: si cercano una volta, poi se ne leggono posizione e opacità
    if (!carte.current.length) {
      stato.scene.traverse((o) => {
        if (o.userData.carta) carte.current.push(o as THREE.Mesh);
      });
    }
    const n = Math.min(carte.current.length, MAX_CARTE);
    u.uNumCarte.value = n;
    for (let k = 0; k < n; k++) {
      const c = carte.current[k];
      (u.uCarte.value as THREE.Matrix4[])[k].copy(c.matrixWorld).invert();
      (u.uOpac.value as number[])[k] = c.visible ? ((c.material as THREE.MeshBasicMaterial).opacity ?? 1) : 0;
    }
    const g = stato.gl;
    riflessione.current?.(g, stato.scene, stato.camera, null as never, r.material as never, null as never);
  });

  return <primitive ref={rif} object={acqua} />;
}

/* --------------------------------------------------------------------- marmo */

const MARMO_FRAG = `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform mat4 uCarte[${MAX_CARTE}];
uniform float uOpac[${MAX_CARTE}];
uniform int uNumCarte;
uniform vec3 uSole;
uniform vec2 uMisura;
varying vec4 vUv;
varying vec3 vMondo;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rumore(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++){ v += a * rumore(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
void main(){
  vec2 p = vMondo.xz;
  // venature: linee sottili deformate dal rumore, come nel marmo di Carrara
  float d = fbm(p * 0.35);
  float vena = abs(sin((p.x * 0.55 + p.y * 0.22 + d * 5.5) * 1.6));
  vena = 1.0 - smoothstep(0.0, 0.07, vena);
  float vena2 = 1.0 - smoothstep(0.0, 0.035, abs(sin((p.x * -0.3 + p.y * 0.8 + fbm(p * 0.7 + 3.0) * 4.0) * 2.4)));
  vec3 pietra = color * (0.96 + fbm(p * 1.4) * 0.06);
  pietra = mix(pietra, vec3(0.62, 0.63, 0.66), vena * 0.45 + vena2 * 0.22);
  // lastre: fughe sottilissime ogni due metri e mezzo
  vec2 l = abs(fract(p / 2.5) - 0.5);
  float fuga = smoothstep(0.497, 0.5, max(l.x, l.y));
  pietra = mix(pietra, pietra * 0.88, fuga);
  vec3 riflesso = texture2D(tDiffuse, vUv.xy / vUv.w).rgb;
  float r = length(p);
  float vicino = smoothstep(32.0, 5.0, r);
  // pietra lucida: riflette poco da vicino, di più verso l'orizzonte
  float lucido = (0.16 + 0.22 * smoothstep(3.0, 18.0, r)) * vicino;
  vec3 c = mix(pietra, riflesso, lucido);
  // le ombre lunghe delle carte, col sole basso: per ogni carta, il raggio verso il sole la attraversa?
  float ombra = 0.0;
  for (int k = 0; k < ${MAX_CARTE}; k++) {
    if (k >= uNumCarte) break;
    vec3 o = (uCarte[k] * vec4(vMondo, 1.0)).xyz;
    vec3 d = mat3(uCarte[k]) * uSole;
    if (abs(d.z) < 0.0001) continue;
    float t = -o.z / d.z;
    if (t <= 0.0) continue;
    vec2 e = abs(o.xy + d.xy * t) - uMisura * 0.5;
    float dentro = 1.0 - smoothstep(-0.015, 0.015, max(e.x, e.y));
    ombra = max(ombra, dentro * uOpac[k] * (1.0 - smoothstep(4.0, 16.0, t)));
  }
  // più il sole è basso, più le ombre sono lunghe; a mezzogiorno si accorciano e si schiariscono
  c = mix(c, c * vec3(0.58, 0.58, 0.62), ombra * 0.55 * smoothstep(0.02, 0.12, uSole.y));
  c = mix(c, color, smoothstep(14.0, 34.0, r));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/* --------------------------------------------------------------- cielo di giorno */

/** Una cupola con un gradiente freddo: azzurro polvere in alto, quasi bianco all'orizzonte. */
export function CieloDiGiorno({ orizzonte }: { orizzonte: string }) {
  const cupola = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // il cielo chiaro di sempre, più un sole che va dall'alba al tramonto:
      // basso, scalda l'orizzonte attorno a sé di rosa e arancio; alto, è solo un disco bianco con l'alone
      fragmentShader: `uniform vec3 uAlto; uniform vec3 uBasso; uniform vec3 uSole; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(uBasso, uAlto, pow(h, 0.55));
          float s = max(dot(d, uSole), 0.0);
          float basso = 1.0 - smoothstep(0.04, 0.45, uSole.y);
          vec3 caldo = mix(vec3(1.0, 0.95, 0.86), vec3(1.0, 0.62, 0.42), basso);
          // l'orizzonte si tinge dalla parte del sole, all'alba e al tramonto
          float lato = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSole.x, 0.0, uSole.z))), 0.0), 3.0);
          c = mix(c, c * vec3(1.06, 0.9, 0.82), basso * lato * (1.0 - smoothstep(0.0, 0.35, h)));
          c += caldo * (pow(s, 1200.0) * 1.4 + pow(s, 70.0) * 0.32 + pow(s, 8.0) * 0.12 * (0.4 + basso));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      uniforms: {
        uAlto: { value: new THREE.Color("#C9D6E0") },
        uBasso: { value: new THREE.Color(orizzonte) },
        uSole: { value: SOLE },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m);
    s.raycast = () => undefined;
    s.renderOrder = -1;
    return s;
  }, [orizzonte]);
  useEffect(
    () => () => {
      cupola.geometry.dispose();
      (cupola.material as THREE.Material).dispose();
    },
    [cupola]
  );
  return <primitive object={cupola} />;
}

export default function Suolo({
  notte, fondo, stretto, ridotto,
}: {
  notte: boolean;
  fondo: string;
  stretto: boolean;
  ridotto: boolean;
}) {
  return notte ? (
    <Specchio fondo={fondo} colore={fondo} stretto={stretto} ridotto={ridotto} frammento={ACQUA_FRAG} quota={PELO_ACQUA} />
  ) : (
    <Specchio fondo={fondo} colore="#EEEDEA" stretto={stretto} ridotto={ridotto} frammento={MARMO_FRAG} quota={PELO_ACQUA} />
  );
}
