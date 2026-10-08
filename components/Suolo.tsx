"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/**
 * Il pavimento della stanza.
 * Di notte: una superficie d'acqua che riflette carte e cielo, con increspature leggere.
 * Di giorno: un campo di grano che si piega al vento, a onde lente.
 */

const SUOLO = -1.55;
/** l'acqua sta più in alto del campo: appena sotto la carta più bassa, così i riflessi le stanno vicini */
const PELO_ACQUA = -1.22;

/** Numeri pseudo-casuali con seme: il campo esce sempre uguale. */
function generatore(seme: number) {
  let s = seme;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

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

const ACQUA_FRAG = `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float uTempo;
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
  vec2 uv = vUv.xy / vUv.w + d;
  vec3 riflesso = texture2D(tDiffuse, uv).rgb;
  float r = length(p);
  float vicino = smoothstep(30.0, 4.0, r);
  // la riflessione si fa più forte verso l'orizzonte (Fresnel di comodo) e si spegne in lontananza
  float fresnel = 0.42 + 0.3 * smoothstep(3.0, 16.0, r);
  vec3 c = mix(color, riflesso, fresnel * vicino);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function Acqua({ fondo, stretto, ridotto }: { fondo: string; stretto: boolean; ridotto: boolean }) {
  const { size, viewport } = useThree();
  const acqua = useMemo(() => {
    const scala = stretto ? 0.5 : 0.6;
    const r = new Reflector(new THREE.CircleGeometry(60, 64), {
      textureWidth: Math.round(size.width * viewport.dpr * scala),
      textureHeight: Math.round(size.height * viewport.dpr * scala),
      clipBias: 0.003,
      color: new THREE.Color(fondo),
      shader: {
        name: "Acqua",
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          uTempo: { value: 0 },
        },
        vertexShader: ACQUA_VERT,
        fragmentShader: ACQUA_FRAG,
      },
    });
    r.rotation.x = -Math.PI / 2;
    r.position.y = PELO_ACQUA;
    r.raycast = () => undefined;
    return r;
    // dimensioni della texture fissate al montaggio: la scena si rimonta se cambia il layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondo, stretto]);

  useEffect(() => () => acqua.dispose(), [acqua]);

  // il riflesso si calcola prima del disegno della scena, non a metà:
  // il Reflector di three lo farebbe dentro il disegno e coprirebbe le carte
  const rif = useRef<Reflector>(null);
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
    (r.material as THREE.ShaderMaterial).uniforms.uTempo.value = ridotto ? 0 : stato.clock.elapsedTime;
    const g = stato.gl;
    riflessione.current?.(g, stato.scene, stato.camera, null as never, r.material as never, null as never);
  });

  return <primitive ref={rif} object={acqua} />;
}

/* --------------------------------------------------------------------- grano */

const GRANO_VERT = `
attribute float aTinta;
uniform float uTempo;
varying float vH;
varying float vTinta;
varying float vOnda;
varying float vDist;
void main(){
  vec3 p = position;
  float h = uv.y;
  // la spiga si assottiglia verso la punta e si ingrossa appena in cima
  p.x *= (1.0 - h * 0.55) + smoothstep(0.78, 0.9, h) * 0.6 * (1.0 - smoothstep(0.9, 1.0, h));
  vec4 mondo = modelMatrix * instanceMatrix * vec4(p, 1.0);
  // vento: un'onda lunga che attraversa il campo, più un tremito corto
  float onda = sin(dot(mondo.xz, vec2(0.33, 0.21)) - uTempo * 1.05);
  float tremito = sin(uTempo * 2.7 + mondo.x * 3.1 + mondo.z * 2.3) * 0.25;
  float piega = (onda * 0.75 + 0.45 + tremito) * h * h * 0.16;
  mondo.x += piega * 0.82;
  mondo.z += piega * 0.57;
  mondo.y -= abs(piega) * 0.25 * h;
  vH = h;
  vTinta = aTinta;
  vOnda = onda;
  vec4 mv = viewMatrix * mondo;
  vDist = length(mondo.xz);
  gl_Position = projectionMatrix * mv;
}`;

const GRANO_FRAG = `
uniform vec3 uRadice;
uniform vec3 uPunta;
uniform vec3 uOrizzonte;
varying float vH;
varying float vTinta;
varying float vOnda;
varying float vDist;
void main(){
  vec3 c = mix(uRadice, uPunta, smoothstep(0.0, 1.0, vH));
  c *= 0.9 + vTinta * 0.2;
  // dove passa l'onda il grano si piega e prende luce: il riflesso del campo al vento
  c += vec3(0.07, 0.06, 0.03) * smoothstep(0.3, 1.0, vOnda) * vH;
  // in lontananza sfuma nel cielo
  c = mix(c, uOrizzonte, smoothstep(9.0, 30.0, vDist));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function Grano({ orizzonte, stretto, ridotto }: { orizzonte: string; stretto: boolean; ridotto: boolean }) {
  const campo = useMemo(() => {
    const n = stretto ? 9000 : 26000;
    const g = new THREE.PlaneGeometry(0.03, 1, 1, 5);
    g.translate(0, 0.5, 0);
    const tinta = new Float32Array(n);
    const m = new THREE.ShaderMaterial({
      vertexShader: GRANO_VERT,
      fragmentShader: GRANO_FRAG,
      uniforms: {
        uTempo: { value: 0 },
        uRadice: { value: new THREE.Color("#8C7740") },
        uPunta: { value: new THREE.Color("#E4CD8C") },
        uOrizzonte: { value: new THREE.Color(orizzonte) },
      },
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(g, m, n);
    const rnd = generatore(3);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      // più fitto vicino, più rado lontano; nessuno spigolo sotto i piedi
      let r = 1.2 + Math.pow(rnd(), 0.62) * 30;
      // un sentiero falciato sotto l'anello delle carte, perché il grano non le copra
      if (r > 5.0 && r < 7.0) r = rnd() < 0.5 ? 5.0 - rnd() * 0.6 : 7.0 + rnd() * 0.8;
      const a = rnd() * Math.PI * 2;
      o.position.set(Math.sin(a) * r, SUOLO - 0.02, -Math.cos(a) * r);
      o.rotation.set((rnd() - 0.5) * 0.25, rnd() * Math.PI, (rnd() - 0.5) * 0.25);
      const h = 0.42 + rnd() * 0.36;
      o.scale.set(1 + rnd() * 0.6, h, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      tinta[i] = rnd();
    }
    g.setAttribute("aTinta", new THREE.InstancedBufferAttribute(tinta, 1));
    mesh.raycast = () => undefined;
    mesh.frustumCulled = false;
    return mesh;
  }, [orizzonte, stretto]);

  // il terreno sotto il grano, perché fra le spighe non si veda il vuoto
  const terra = useMemo(() => {
    const t = new THREE.Mesh(
      new THREE.CircleGeometry(60, 48),
      new THREE.MeshBasicMaterial({ color: "#B59E62", toneMapped: false })
    );
    t.rotation.x = -Math.PI / 2;
    t.position.y = SUOLO - 0.03;
    t.raycast = () => undefined;
    return t;
  }, []);

  useEffect(
    () => () => {
      campo.geometry.dispose();
      (campo.material as THREE.Material).dispose();
      terra.geometry.dispose();
      (terra.material as THREE.Material).dispose();
    },
    [campo, terra]
  );

  const rif = useRef<THREE.InstancedMesh>(null);
  useFrame((stato) => {
    const m = rif.current?.material as THREE.ShaderMaterial | undefined;
    if (m) m.uniforms.uTempo.value = ridotto ? 0 : stato.clock.elapsedTime;
  });

  return (
    <>
      <primitive object={terra} />
      <primitive ref={rif} object={campo} />
    </>
  );
}

/* --------------------------------------------------------------- cielo di giorno */

/** Una cupola con un gradiente freddo: azzurro polvere in alto, quasi bianco all'orizzonte. */
export function CieloDiGiorno({ orizzonte }: { orizzonte: string }) {
  const cupola = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uAlto; uniform vec3 uBasso; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(uBasso, uAlto, pow(h, 0.55)), 1.0);
        #include <colorspace_fragment>
        }`,
      uniforms: { uAlto: { value: new THREE.Color("#C9D6E0") }, uBasso: { value: new THREE.Color(orizzonte) } },
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
    <Acqua fondo={fondo} stretto={stretto} ridotto={ridotto} />
  ) : (
    <Grano orizzonte={fondo} stretto={stretto} ridotto={ridotto} />
  );
}
