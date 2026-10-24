"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { ANGOLO_ZONA } from "./zona";

/**
 * Il pavimento della stanza: un solo specchio e un solo shader, che cambia col tema senza essere ricreato.
 * Di notte: una superficie d'acqua che riflette carte e cielo, con increspature leggere; sotto, fioco,
 * il labirinto.
 * Di giorno: un pavimento di marmo chiaro e lucido, con venature morbide, che riflette le carte e ne prende le ombre;
 * nel marmo un intarsio a labirinto, come quello della biblioteca del Nome della rosa, che si legge per intero
 * solo dall'alto, durante la discesa iniziale della camera, e da terra diventa venatura; accanto, un piccolo
 * fossile di pterosauro.
 */

import { PELO_ACQUA, gocce, MAX_GOCCE, SOLE } from "./condivisi";

/** Quante carte al più gettano ombra sul marmo. */
const MAX_CARTE = 16;

/** Il labirinto: davanti a dove si comincia a guardare (la zona dello sviluppatore), a terra. */
const LAB_DIST = 3.7;
const LAB_R = 1.45;
const LAB_C = new THREE.Vector2(Math.sin(ANGOLO_ZONA) * LAB_DIST, -Math.cos(ANGOLO_ZONA) * LAB_DIST);
/** Il fossile, appena fuori dal labirinto, sulla destra di chi guarda. */
const FOS_C = new THREE.Vector2(
  LAB_C.x + Math.cos(ANGOLO_ZONA) * (LAB_R + 0.55) + Math.sin(ANGOLO_ZONA) * 0.2,
  LAB_C.y + Math.sin(ANGOLO_ZONA) * (LAB_R + 0.55) - Math.cos(ANGOLO_ZONA) * 0.2
);

const VERT = `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vMondo;
void main(){
  vUv = textureMatrix * vec4(position, 1.0);
  vMondo = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D uFossile;
uniform sampler2D uVene;
uniform float uVenePronte;
uniform float uTempo;
uniform float uNotte;
uniform float uRiflesso;
uniform float uLabirinto;
uniform vec4 uGocce[${MAX_GOCCE}];
uniform mat4 uCarte[${MAX_CARTE}];
uniform float uOpac[${MAX_CARTE}];
uniform int uNumCarte;
uniform vec3 uSole;
uniform vec2 uMisura;
uniform vec2 uLabC;
uniform vec2 uFosC;
uniform float uAng;
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

/* Il labirinto: anelli ottagonali (la pianta dell'Edificio è ottagonale), ognuno diviso in celle;
   fra un anello e l'altro un muro con qualche varco, fra una cella e l'altra un muro che a volte manca.
   Restituisce quanto il punto cade su un muro (0–1), con i bordi morbidi. */
float labirinto(vec2 p){
  vec2 m = p - uLabC;
  float c = cos(uAng), s = sin(uAng);
  m = vec2(c * m.x + s * m.y, -s * m.x + c * m.y);
  float ott = max(max(abs(m.x), abs(m.y)), (abs(m.x) + abs(m.y)) * 0.70711);
  float r = ott / ${LAB_R.toFixed(3)};
  if (r > 1.04) return 0.0;
  const float ANELLI = 7.0;
  float passo = ${(LAB_R / 7).toFixed(4)};
  float ri = r * ANELLI;
  float anello = floor(ri);
  float fr = fract(ri);
  float a = atan(m.y, m.x) / 6.28318 + 0.5;
  float celle = 8.0 + anello * 8.0;
  float ac = a * celle;
  float cella = floor(ac);
  float fa = fract(ac);
  float spessore = 0.022;
  float aa = 0.006;
  // muro sul bordo interno dell'anello, con i varchi (il muro più esterno ha una sola porta)
  float dR = fr * passo;
  float varco = anello >= ANELLI - 0.5 ? step(0.02, abs(a - 0.25)) : step(0.32, h(vec2(anello, cella) + 3.1));
  float muro = (1.0 - smoothstep(spessore - aa, spessore + aa, dR)) * varco * step(0.5, anello);
  // il muro esterno
  float esterno = 1.0 - smoothstep(spessore - aa, spessore + aa, abs(r - 1.0) * ${LAB_R.toFixed(3)});
  muro = max(muro, esterno * step(0.02, abs(a - 0.25)));
  // muri radiali fra le celle
  float arco = 6.28318 * max(r, 0.02) * ${LAB_R.toFixed(3)} / celle;
  float dA = min(fa, 1.0 - fa) * arco;
  float radiale = (1.0 - smoothstep(spessore - aa, spessore + aa, dA)) * step(0.55, h(vec2(cella, anello) + 7.7)) * step(0.5, anello) * step(r, 1.0);
  return max(muro, radiale);
}

vec3 marmo(vec2 p, float r){
  // venature: linee sottili deformate dal rumore, come nel marmo di Carrara
  float d = fbm(p * 0.35);
  float vena = abs(sin((p.x * 0.55 + p.y * 0.22 + d * 5.5) * 1.6));
  vena = 1.0 - smoothstep(0.0, 0.07, vena);
  float vena2 = 1.0 - smoothstep(0.0, 0.035, abs(sin((p.x * -0.3 + p.y * 0.8 + fbm(p * 0.7 + 3.0) * 4.0) * 2.4)));
  vec3 pietra = color * (0.96 + fbm(p * 1.4) * 0.06);
  pietra = mix(pietra, vec3(0.62, 0.63, 0.66), vena * 0.45 + vena2 * 0.22);
  // quando arriva, la foto di un marmo vero (Poly Haven, marble_rock_02, in grigio): le sue venature al posto
  // di quelle calcolate. Venature grandi, come nelle lastre vere: piccole, guardate di sbieco, la scheda
  // grafica le media fino a farle sparire. Due scale, la seconda girata, perché la ripetizione non si veda dall'alto
  if (uVenePronte > 0.0) {
    float v1 = texture2D(uVene, p / 9.0).r;
    vec2 q = vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8);
    float v2 = texture2D(uVene, q / 21.0 + 0.37).r;
    float v = clamp(v1 * mix(1.0, v2, 0.4) / 0.78, 0.0, 1.15);
    vec3 vera = color * (0.97 + fbm(p * 1.4) * 0.04) * mix(1.0, v, 0.7);
    pietra = mix(pietra, vera, uVenePronte);
  }
  // lastre: fughe sottilissime ogni due metri e mezzo
  vec2 l = abs(fract(p / 2.5) - 0.5);
  float fuga = smoothstep(0.497, 0.5, max(l.x, l.y));
  pietra = mix(pietra, pietra * 0.88, fuga);
  // l'intarsio del labirinto: pietra verde scura; da terra si confonde con le venature
  float lab = labirinto(p);
  pietra = mix(pietra, mix(vec3(0.66, 0.67, 0.69), vec3(0.2, 0.27, 0.25), uLabirinto), lab * mix(0.16, 0.92, uLabirinto));
  // il fossile, intarsiato nella pietra
  vec2 f = p - uFosC;
  float c = cos(uAng), s = sin(uAng);
  f = vec2(c * f.x + s * f.y, -s * f.x + c * f.y) / vec2(0.62, 0.42) + 0.5;
  if (f.x > 0.0 && f.x < 1.0 && f.y > 0.0 && f.y < 1.0) {
    vec4 o = texture2D(uFossile, f);
    pietra = mix(pietra, vec3(0.47, 0.41, 0.34), o.a * 0.75);
  }
  return pietra;
}

void main(){
  vec2 p = vMondo.xz;
  float t = uTempo;
  float r = length(p);
  vec3 c;
  if (uNotte > 0.5) {
    // ---------------------------------------------------------------- acqua
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
      float rr = length(q);
      vec2 n = q / max(rr, 0.0001);
      for (int j = 0; j < 3; j++) {
        float fj = float(j);
        float fronte = eta * (0.95 - fj * 0.22);
        float x = rr - fronte;
        float largo = 0.09 + eta * 0.05;
        float inv = exp(-(x * x) / (largo * largo)) * exp(-eta * 0.62) / (1.0 + rr * 2.2);
        float onda = sin(x * (34.0 + fj * 10.0) / (1.0 + eta * 0.35)) * inv * (1.0 - fj * 0.28);
        d += n * onda * 0.022 * g.w;
        cresta += onda * g.w;
      }
    }
    vec3 fondo = color;
    // sotto l'acqua, fioco: il labirinto
    fondo = mix(fondo, fondo + vec3(0.012, 0.018, 0.022), labirinto(p + d * 4.0) * (0.35 + 0.65 * uLabirinto));
    vec2 uv = vUv.xy / vUv.w + d;
    vec3 riflesso = uRiflesso > 0.5 ? texture2D(tDiffuse, uv).rgb : fondo;
    float vicino = smoothstep(30.0, 4.0, r);
    float fresnel = 0.42 + 0.3 * smoothstep(3.0, 16.0, r);
    c = mix(fondo, riflesso, fresnel * vicino);
    c += vec3(0.07, 0.08, 0.1) * max(cresta, 0.0) - vec3(0.02) * max(-cresta, 0.0);
  } else {
    // ----------------------------------------------------------------- marmo
    vec3 pietra = marmo(p, r);
    vec3 riflesso = uRiflesso > 0.5 ? texture2D(tDiffuse, vUv.xy / vUv.w).rgb : pietra;
    float vicino = smoothstep(32.0, 5.0, r);
    float lucido = (0.16 + 0.22 * smoothstep(3.0, 18.0, r)) * vicino;
    c = mix(pietra, riflesso, lucido);
    // le ombre lunghe delle carte, col sole basso
    float ombra = 0.0;
    for (int k = 0; k < ${MAX_CARTE}; k++) {
      if (k >= uNumCarte) break;
      vec3 o = (uCarte[k] * vec4(vMondo, 1.0)).xyz;
      vec3 dd = mat3(uCarte[k]) * uSole;
      if (abs(dd.z) < 0.0001) continue;
      float tt = -o.z / dd.z;
      if (tt <= 0.0) continue;
      vec2 e = abs(o.xy + dd.xy * tt) - uMisura * 0.5;
      float dentro = 1.0 - smoothstep(-0.015, 0.015, max(e.x, e.y));
      ombra = max(ombra, dentro * uOpac[k] * (1.0 - smoothstep(4.0, 16.0, tt)));
    }
    c = mix(c, c * vec3(0.58, 0.58, 0.62), ombra * 0.55 * smoothstep(0.02, 0.12, uSole.y));
    c = mix(c, color, smoothstep(14.0, 34.0, r));
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** Lo scheletro di uno pterosauro, disegnato una volta: ali spiegate, cranio lungo con la cresta. */
function fossile() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 346;
  const x = c.getContext("2d");
  if (x) {
    x.strokeStyle = "#000";
    x.fillStyle = "#000";
    x.lineCap = "round";
    x.lineJoin = "round";
    const linea = (pts: number[][], w: number) => {
      x.lineWidth = w;
      x.beginPath();
      pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      x.stroke();
    };
    // la colonna e le costole
    linea([[256, 120], [256, 150], [254, 190], [252, 230], [250, 262]], 7);
    for (let i = 0; i < 6; i++) {
      const y = 150 + i * 13;
      linea([[256, y], [230 - i * 2, y + 12]], 3);
      linea([[256, y], [282 + i * 2, y + 12]], 3);
    }
    // il cranio: lungo, col becco e la cresta all'indietro
    linea([[256, 120], [262, 96], [290, 70], [338, 52]], 6);
    linea([[262, 96], [240, 70], [214, 56]], 5);
    x.beginPath();
    x.ellipse(266, 90, 14, 9, -0.6, 0, Math.PI * 2);
    x.fill();
    // le ali: omero, avambraccio, metacarpo, il lunghissimo quarto dito
    for (const s of [-1, 1]) {
      const X = (v: number) => 256 + s * v;
      linea([[256, 140], [X(40), 128], [X(92), 150], [X(118), 132]], 6);
      linea([[X(118), 132], [X(176), 104], [X(232), 82]], 4);
      linea([[X(118), 132], [X(132), 148]], 3);
      linea([[X(118), 132], [X(138), 140]], 3);
      // le zampe
      linea([[250, 258], [X(28), 288], [X(42), 318]], 4);
      linea([[X(42), 318], [X(52), 326]], 2);
    }
    // la coda corta
    linea([[250, 262], [248, 288]], 3);
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

function Specchio({
  notte, fondo, stretto, ridotto, conIngresso,
}: {
  notte: boolean; fondo: string; stretto: boolean; ridotto: boolean; conIngresso: boolean;
}) {
  const { size, viewport } = useThree();
  const txFossile = useMemo(() => fossile(), []);
  const acqua = useMemo(() => {
    // risoluzione del riflesso: 45% su desktop, 60% su schermi stretti
    // (il telefono ha uno schermo denso e la tela è già limitata a 1.25: sotto 0.6 il riflesso si sfoca troppo)
    const scala = stretto ? 0.6 : 0.45;
    const r = new Reflector(new THREE.CircleGeometry(60, 64), {
      textureWidth: Math.round(size.width * viewport.dpr * scala),
      textureHeight: Math.round(size.height * viewport.dpr * scala),
      clipBias: 0.003,
      color: new THREE.Color(fondo),
      shader: {
        name: "Specchio",
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          uFossile: { value: txFossile },
          uVene: { value: null },
          uVenePronte: { value: 0 },
          uTempo: { value: 0 },
          uNotte: { value: 1 },
          uRiflesso: { value: 1 },
          uLabirinto: { value: 0 },
          uGocce: { value: gocce.map((g) => g.clone()) },
          uCarte: { value: Array.from({ length: MAX_CARTE }, () => new THREE.Matrix4()) },
          uOpac: { value: new Array(MAX_CARTE).fill(0) },
          uNumCarte: { value: 0 },
          uSole: { value: SOLE },
          uMisura: { value: new THREE.Vector2(2.4, 1.65) },
          uLabC: { value: LAB_C },
          uFosC: { value: FOS_C },
          uAng: { value: ANGOLO_ZONA },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      },
    });
    r.rotation.x = -Math.PI / 2;
    r.position.y = PELO_ACQUA;
    r.raycast = () => undefined;
    return r;
    // dimensioni della texture fissate al montaggio: la scena si rimonta se cambia il formato
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stretto, txFossile]);

  useEffect(() => () => {
    acqua.dispose();
    txFossile.dispose();
  }, [acqua, txFossile]);

  // le venature del marmo vero: si scaricano dopo, il marmo calcolato resta finché non arrivano, poi sfuma
  useEffect(() => {
    const u = (acqua.material as THREE.ShaderMaterial).uniforms;
    let vivo = true;
    let id = 0;
    const t = new THREE.TextureLoader().load("/stanza/marmo-venature.webp", () => {
      if (!vivo) return;
      const t0 = performance.now();
      const sfuma = () => {
        u.uVenePronte.value = Math.min(1, (performance.now() - t0) / 1200);
        if (u.uVenePronte.value < 1 && vivo) id = requestAnimationFrame(sfuma);
      };
      sfuma();
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    u.uVene.value = t;
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
      u.uVene.value = null;
      u.uVenePronte.value = 0;
      t.dispose();
    };
  }, [acqua]);

  // il tema cambia colore e modo dello stesso shader, senza ricrearlo.
  // Sugli schermi stretti, di giorno, il marmo non riflette: la differenza si vede appena e si risparmia una passata.
  const riflette = notte || !stretto;
  useEffect(() => {
    const u = (acqua.material as THREE.ShaderMaterial).uniforms;
    u.color.value.set(notte ? fondo : "#EEEDEA");
    u.uNotte.value = notte ? 1 : 0;
    u.uRiflesso.value = riflette ? 1 : 0;
  }, [acqua, notte, fondo, riflette]);

  // il riflesso si calcola prima del disegno della scena, non a metà:
  // il Reflector di three lo farebbe dentro il disegno e coprirebbe le carte
  const rif = useRef<Reflector>(null);
  const carte = useRef<THREE.Mesh[]>([]);
  const riflessione = useRef<Reflector["onBeforeRender"] | null>(null);
  const inizio = useRef<number | null>(null);
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
    if (inizio.current === null) inizio.current = stato.clock.elapsedTime;
    // il labirinto si legge per intero solo mentre la camera scende, all'inizio
    u.uLabirinto.value = conIngresso && !ridotto ? 1 - THREE.MathUtils.smoothstep(stato.clock.elapsedTime - inizio.current, 1.2, 3.4) : 0;
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
    if (!riflette) return;
    const g = stato.gl;
    riflessione.current?.(g, stato.scene, stato.camera, null as never, r.material as never, null as never);
  });

  return <primitive ref={rif} object={acqua} />;
}

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
          // l'azzurro del cielo vero: chiaro all'orizzonte, pieno allo zenit
          vec3 c = mix(mix(uBasso, vec3(0.74, 0.85, 0.94), smoothstep(0.0, 0.08, h)), uAlto, smoothstep(0.05, 0.75, h));
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
        uAlto: { value: new THREE.Color("#4F8FD0") },
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
  notte, fondo, stretto, ridotto, conIngresso,
}: {
  notte: boolean;
  fondo: string;
  stretto: boolean;
  ridotto: boolean;
  conIngresso: boolean;
}) {
  return <Specchio notte={notte} fondo={fondo} stretto={stretto} ridotto={ridotto} conIngresso={conIngresso} />;
}
