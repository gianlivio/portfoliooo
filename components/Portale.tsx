"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Il portale: prende il posto della carta "Scrivimi".
 * Un portale gotico, sul modello di quelli di Chartres: arco a sesto acuto con le ghiere
 * degli archivolti, una luce che vortica dentro, un bordo che brilla,
 * raggi lenti dietro e scintille risucchiate verso il centro. Cliccandolo si apre il modulo.
 */

/** Dove sta il portale sullo schermo (coordinate normalizzate −1…1): il modulo ci fa partire l'energia. */
export const schermoPortale = { x: 0, y: -1.2, visibile: false };

const LARGO = 1.9;
const ALTO = 3.0;
const R_ARCO = LARGO / 2;
const BASE = -ALTO / 2;
/** arco gotico a sesto acuto (equilatero): ogni metà è un arco di raggio pari alla luce */
const IMPOSTA = ALTO / 2 - Math.sqrt(3) * R_ARCO; // dove comincia l'arco
const CENTRO_Y = BASE + (ALTO / 2 - BASE) * 0.56; // il cuore del vortice
/** gli archivolti: le ghiere concentriche dei portali gotici, una dentro l'altra */
const ARCHIVOLTI = [0.1, 0.2, 0.3, 0.4];

/** La sagoma ogivale, allargata di `e` per gli archivolti. */
function forma(e = 0) {
  const r = R_ARCO + e;
  const s = new THREE.Shape();
  s.moveTo(-r, BASE);
  s.lineTo(r, BASE);
  s.lineTo(r, IMPOSTA);
  // metà destra: centro sull'imposta sinistra, raggio 2r, da 0° a 60°
  s.absarc(-r, IMPOSTA, 2 * r, 0, Math.PI / 3, false);
  // metà sinistra: centro sull'imposta destra, da 120° a 180°
  s.absarc(r, IMPOSTA, 2 * r, (2 * Math.PI) / 3, Math.PI, false);
  s.lineTo(-r, BASE);
  return s;
}

/** Il contorno come linea, senza il tratto di base. */
function contorno(e: number, colore: string) {
  const pts = forma(e).getPoints(48).filter((p) => p.y > BASE + 0.001 || Math.abs(p.x) > R_ARCO + e - 0.001);
  const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0.01 - e * 0.15)));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: 0, toneMapped: false }));
  l.raycast = () => undefined;
  return l;
}

const VORTICE_VERT = `
varying vec2 vP;
void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const VORTICE_FRAG = `
uniform float uTempo;
uniform float uForza;
uniform float uOpacita;
uniform vec3 uFondo;
uniform vec3 uLuce;
uniform vec3 uCuore;
varying vec2 vP;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rumore(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++){ v += a * rumore(p); p = p * 2.02 + 11.0; a *= 0.5; }
  return v;
}
void main(){
  vec2 c = vec2(0.0, ${CENTRO_Y.toFixed(3)});
  vec2 q = (vP - c) / vec2(${R_ARCO.toFixed(3)}, ${(ALTO * 0.5).toFixed(3)});
  float d = length(q);
  float a = atan(q.y, q.x);
  float t = uTempo * (0.35 + uForza * 0.5);
  // il vortice: bande che girano e si avvitano verso il centro
  float giro = a + d * 3.2 - t * 1.4;
  float bande = fbm(vec2(cos(giro), sin(giro)) * 1.6 + vec2(d * 3.0 - t * 0.8, t * 0.2));
  float nebbia = fbm(q * 2.5 + vec2(t * 0.15, -t * 0.1));
  vec3 col = mix(uFondo, uLuce, smoothstep(0.35, 0.85, bande) * (1.0 - d * 0.55));
  col += uLuce * nebbia * 0.18;
  // il cuore luminoso
  float cuore = exp(-d * d * 7.0) * (0.75 + uForza * 0.5);
  col = mix(col, uCuore, clamp(cuore, 0.0, 1.0));
  // bordo: si accende vicino alla sagoma
  float bordo = smoothstep(0.82, 1.0, max(abs(q.x), d));
  col += uLuce * bordo * 0.35;
  gl_FragColor = vec4(col, uOpacita);
}`;

function etichetta(righe: string[], mono: string, serif: string) {
  const tela = document.createElement("canvas");
  tela.width = 1024;
  tela.height = 200;
  const c = tela.getContext("2d");
  if (c) {
    c.fillStyle = "#FFFFFF";
    c.textAlign = "center";
    c.font = `300 84px ${serif}`;
    c.fillText(righe[0], 512, 92);
    c.font = `400 30px ${mono}`;
    c.fillText(righe[1].toUpperCase(), 512, 160);
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function scintilla() {
  const tela = document.createElement("canvas");
  tela.width = tela.height = 64;
  const c = tela.getContext("2d");
  if (c) {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(tela);
}

export default function Portale({
  posizione, rotazione, notte, titolo, sotto, mono, serif, opacita, ridotto, onApri,
}: {
  posizione: [number, number, number];
  rotazione: number;
  notte: boolean;
  titolo: string;
  sotto: string;
  mono: string;
  serif: string;
  /** 0–1: segue l'ingresso della scena e l'affondo col modulo aperto */
  opacita: { current: number };
  ridotto: boolean;
  onApri: () => void;
}) {
  const [sopra, setSopra] = useState(false);
  const forza = useRef(0);
  const scritta = useMemo(() => etichetta([titolo, sotto], mono, serif), [titolo, sotto, mono, serif]);
  const punto = useMemo(() => scintilla(), []);
  const geometria = useMemo(() => new THREE.ShapeGeometry(forma(), 48), []);

  const colori = notte
    ? { fondo: "#060A24", luce: "#4F7BFF", cuore: "#EAF0FF", bordo: "#8FB0FF", scritta: "#F3F1EB" }
    : { fondo: "#120708", luce: "#FF5A4E", cuore: "#FFE1D6", bordo: "#FF6F61", scritta: "#16171A" };

  const vortice = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VORTICE_VERT,
        fragmentShader: VORTICE_FRAG,
        uniforms: {
          uTempo: { value: 0 },
          uForza: { value: 0 },
          uOpacita: { value: 0 },
          uFondo: { value: new THREE.Color(colori.fondo) },
          uLuce: { value: new THREE.Color(colori.luce) },
          uCuore: { value: new THREE.Color(colori.cuore) },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    // i colori cambiano solo col tema, e allora la scena si rimonta
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // il bordo: la sagoma dell'arco, un filo di luce
  const bordo = useMemo(() => {
    const pts = forma().getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0.01));
    const g = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: colori.bordo, transparent: true, opacity: 0, toneMapped: false })
    );
    l.raycast = () => undefined;
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const archivolti = useMemo(
    () => ARCHIVOLTI.map((e) => contorno(e, colori.bordo)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(
    () => () =>
      archivolti.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }),
    [archivolti]
  );

  // le scintille: punti che spiraleggiano verso il centro del portale
  const N = 70;
  const scintille = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const m = new THREE.PointsMaterial({
      map: punto, size: 0.06, transparent: true, opacity: 0, depthWrite: false,
      color: colori.bordo, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const p = new THREE.Points(g, m);
    p.raycast = () => undefined;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punto]);
  const semi = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), v: 0.25 + ((i * 37) % 10) / 20, f: (i * 0.137) % 1 })), []);

  // i raggi: lame di luce che ruotano lente dietro l'arco
  const raggi = useRef<THREE.Group>(null);
  const raggioMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: punto, color: colori.luce, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [punto]
  );
  const scrittaMat = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(
    () => () => {
      scritta.dispose();
      punto.dispose();
      geometria.dispose();
      vortice.dispose();
      bordo.geometry.dispose();
      (bordo.material as THREE.Material).dispose();
      scintille.geometry.dispose();
      (scintille.material as THREE.Material).dispose();
      raggioMat.dispose();
    },
    [scritta, punto, geometria, vortice, bordo, scintille, raggioMat]
  );

  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [sopra]);

  const vorticeRif = useRef<THREE.Mesh>(null);
  const radice = useRef<THREE.Group>(null);
  const centro = useMemo(() => new THREE.Vector3(), []);
  const bordoRif = useRef<THREE.Line>(null);
  const scintilleRif = useRef<THREE.Points>(null);

  useFrame((stato, dt) => {
    const t = ridotto ? 0 : stato.clock.elapsedTime;
    if (radice.current) {
      // centro del vortice proiettato sullo schermo
      radice.current.localToWorld(centro.set(0, CENTRO_Y, 0));
      const davanti = centro.clone().sub(stato.camera.position).dot(stato.camera.getWorldDirection(new THREE.Vector3())) > 0;
      centro.project(stato.camera);
      schermoPortale.x = centro.x;
      schermoPortale.y = centro.y;
      schermoPortale.visibile = davanti && Math.abs(centro.x) < 1.3 && Math.abs(centro.y) < 1.3;
    }
    forza.current = THREE.MathUtils.lerp(forza.current, sopra ? 1 : 0, 1 - Math.exp(-dt * 4));
    const o = opacita.current;
    const vm = vorticeRif.current?.material as THREE.ShaderMaterial | undefined;
    if (vm) {
      vm.uniforms.uTempo.value = t;
      vm.uniforms.uForza.value = forza.current;
      vm.uniforms.uOpacita.value = o;
    }
    const bm = bordoRif.current?.material as THREE.LineBasicMaterial | undefined;
    if (bm) bm.opacity = o * (0.65 + 0.35 * Math.sin(t * 2.2)) * (0.8 + forza.current * 0.4);
    // la luce corre verso l'esterno, una ghiera dopo l'altra
    archivolti.forEach((l, k) => {
      (l.material as THREE.LineBasicMaterial).opacity =
        o * (0.62 - k * 0.11) * (0.55 + 0.45 * Math.sin(t * 2.2 - k * 0.9)) * (0.85 + forza.current * 0.4);
    });
    if (raggi.current) {
      raggi.current.rotation.z = t * 0.06;
      raggioMat.opacity = o * (notte ? 0.22 : 0.16) * (1 + forza.current * 0.8);
    }
    if (scrittaMat.current) scrittaMat.current.opacity = o;
    const sp = scintilleRif.current;
    if (sp) {
      const arr = sp.geometry.attributes.position.array as Float32Array;
      semi.forEach((s, i) => {
        // ogni scintilla parte dal bordo e spiraleggia verso il cuore, poi ricomincia
        const ciclo = ((t * s.v * (1 + forza.current) + s.f) % 1 + 1) % 1;
        const r = (1 - ciclo) * 1.15;
        const ang = s.a + ciclo * 5.5;
        arr[i * 3] = Math.cos(ang) * r * R_ARCO;
        arr[i * 3 + 1] = CENTRO_Y + Math.sin(ang) * r * ALTO * 0.5;
        arr[i * 3 + 2] = 0.05 + ciclo * 0.05;
      });
      sp.geometry.attributes.position.needsUpdate = true;
      (sp.material as THREE.PointsMaterial).opacity = o * 0.9;
    }
  });

  return (
    <group ref={radice} position={posizione} rotation={[0, rotazione, 0]}>
      <group ref={raggi} position={[0, CENTRO_Y, -0.05]}>
        {Array.from({ length: 7 }, (_, k) => (
          <mesh key={k} rotation={[0, 0, (k / 7) * Math.PI]} material={raggioMat} raycast={() => null}>
            <planeGeometry args={[0.35, 6.2]} />
          </mesh>
        ))}
      </group>
      <mesh
        ref={vorticeRif}
        geometry={geometria}
        material={vortice}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setSopra(true);
        }}
        onPointerOut={() => setSopra(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          onApri();
        }}
      />
      <primitive ref={bordoRif} object={bordo} />
      {archivolti.map((l, k) => (
        <primitive key={k} object={l} />
      ))}
      <primitive ref={scintilleRif} object={scintille} />
      <mesh position={[0, ALTO / 2 + 0.34, 0.02]} raycast={() => null}>
        <planeGeometry args={[2.6, 2.6 * (200 / 1024)]} />
        <meshBasicMaterial ref={scrittaMat} map={scritta} color={colori.scritta} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
