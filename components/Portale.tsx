"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mondo } from "./condivisi";
import { POSIZIONI, collocaZona } from "./zona";

/**
 * Il cassetto aperto, il sogno nel cassetto: prende il posto della carta "Scrivimi", nella zona dello sviluppatore.
 * Una cassettiera accanto alla sua sedia, col primo cassetto tirato fuori verso chi guarda; dall'interno
 * escono la luce che vortica, il bordo che brilla e si propaga in cornici, le lame di luce che girano lente
 * e le scintille che salgono a spirale. Cliccandolo si apre il modulo. Corallo di giorno, blu di notte.
 * Misure in metri, nelle coordinate della zona (components/zona.ts).
 */

/** Dove sta il cuore della luce sullo schermo (coordinate normalizzate −1…1): il modulo ci fa partire l'energia. */
export const schermoPortale = { x: 0, y: -1.2, visibile: false };

const C = POSIZIONI.cassetto;
const CORPO = { l: 0.44, a: 0.64, p: 0.5 };
const FRONTE = C.z - CORPO.p / 2; // la faccia davanti della cassettiera (verso chi guarda: −z)
const TIRATO = 0.26; // quanto è tirato fuori il primo cassetto
const BOCCA = { l: 0.34, p: TIRATO - 0.03, y: 0.585 }; // l'apertura del cassetto che si vede
const BOCCA_Z = FRONTE - TIRATO / 2 - 0.005;
const CUORE = new THREE.Vector3(C.x, BOCCA.y + 0.08, BOCCA_Z);
const RIGHE = [0.02, 0.045, 0.07, 0.095]; // le cornici di luce intorno alla bocca

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
  vec2 q = vP / vec2(${(BOCCA.l / 2).toFixed(3)}, ${(BOCCA.p / 2).toFixed(3)});
  float d = length(q);
  float a = atan(q.y, q.x);
  float t = uTempo * (0.35 + uForza * 0.5);
  // il vortice: bande che girano e si avvitano verso il centro del cassetto
  float giro = a + d * 3.2 - t * 1.4;
  float bande = fbm(vec2(cos(giro), sin(giro)) * 1.6 + vec2(d * 3.0 - t * 0.8, t * 0.2));
  float nebbia = fbm(q * 2.5 + vec2(t * 0.15, -t * 0.1));
  vec3 col = mix(uFondo, uLuce, smoothstep(0.35, 0.85, bande) * (1.0 - d * 0.45));
  col += uLuce * nebbia * 0.18;
  float cuore = exp(-d * d * 3.0) * (0.75 + uForza * 0.5);
  col = mix(col, uCuore, clamp(cuore, 0.0, 1.0));
  float bordo = smoothstep(0.8, 1.0, max(abs(q.x), abs(q.y)));
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

function morbida(colonna = false) {
  const tela = document.createElement("canvas");
  tela.width = 64;
  tela.height = colonna ? 256 : 64;
  const c = tela.getContext("2d");
  if (c) {
    if (colonna) {
      // una lama di luce: piena in basso, che sfuma salendo e sui lati
      const v = c.createLinearGradient(0, 256, 0, 0);
      v.addColorStop(0, "rgba(255,255,255,1)");
      v.addColorStop(0.35, "rgba(255,255,255,0.45)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = v;
      c.fillRect(0, 0, 64, 256);
      c.globalCompositeOperation = "destination-in";
      const o = c.createLinearGradient(0, 0, 64, 0);
      o.addColorStop(0, "rgba(0,0,0,0)");
      o.addColorStop(0.5, "rgba(0,0,0,1)");
      o.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = o;
      c.fillRect(0, 0, 64, 256);
    } else {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.3, "rgba(255,255,255,0.5)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }
  }
  return new THREE.CanvasTexture(tela);
}

/** Un rettangolo di luce intorno alla bocca del cassetto, allargato di e. */
function cornice(e: number, colore: string) {
  const l = BOCCA.l / 2 + e, p = BOCCA.p / 2 + e, y = BOCCA.y + 0.004 + e * 0.05;
  const pts = [[-l, -p], [l, -p], [l, p], [-l, p], [-l, -p]].map(([x, z]) => new THREE.Vector3(C.x + x, y, BOCCA_Z + z));
  const linea = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
  );
  linea.raycast = () => undefined;
  return linea;
}

const COLORI = {
  notte: { fondo: "#060A24", luce: "#4F7BFF", cuore: "#EAF0FF", bordo: "#8FB0FF", scritta: "#F3F1EB", legno: "#3A3430" },
  giorno: { fondo: "#120708", luce: "#FF5A4E", cuore: "#FFE1D6", bordo: "#FF6F61", scritta: "#16171A", legno: "#B8A58C" },
};

export default function Portale({
  notte, titolo, sotto, mono, serif, opacita, ridotto, onApri, onSfiora,
}: {
  notte: boolean;
  titolo: string;
  sotto: string;
  mono: string;
  serif: string;
  /** 0–1: segue l'ingresso della scena e il modulo aperto */
  opacita: { current: number };
  ridotto: boolean;
  onApri: () => void;
  onSfiora?: () => void;
}) {
  const [sopra, setSopra] = useState(false);
  const forza = useRef(0);
  const scritta = useMemo(() => etichetta([titolo, sotto], mono, serif), [titolo, sotto, mono, serif]);
  const punto = useMemo(() => morbida(), []);
  const lama = useMemo(() => morbida(true), []);
  const col = notte ? COLORI.notte : COLORI.giorno;

  const vortice = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VORTICE_VERT,
        fragmentShader: VORTICE_FRAG,
        uniforms: {
          uTempo: { value: 0 },
          uForza: { value: 0 },
          uOpacita: { value: 0 },
          uFondo: { value: new THREE.Color() },
          uLuce: { value: new THREE.Color() },
          uCuore: { value: new THREE.Color() },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  const cornici = useMemo(() => RIGHE.map((e) => cornice(e, "#FFFFFF")), []);
  const bordo = useMemo(() => cornice(0, "#FFFFFF"), []);

  // le scintille: salgono a spirale dall'interno del cassetto, poi ricominciano
  const N = 46;
  const scintille = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const m = new THREE.PointsMaterial({
      map: punto, size: 0.035, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const p = new THREE.Points(g, m);
    p.raycast = () => undefined;
    p.frustumCulled = false;
    return p;
  }, [punto]);
  const semi = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), v: 0.25 + ((i * 37) % 10) / 20, f: (i * 0.137) % 1 })), []);

  const lame = useRef<THREE.Group>(null);
  const lamaMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: lama, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    [lama]
  );
  const colonnaMat = useMemo(
    () => new THREE.SpriteMaterial({ map: lama, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [lama]
  );
  const legno = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), []);
  const interno = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1A1512", roughness: 0.9 }), []);
  const scrittaMat = useRef<THREE.MeshBasicMaterial>(null);

  // i colori seguono il tema senza ricostruire niente
  useEffect(() => {
    vortice.uniforms.uFondo.value.set(col.fondo);
    vortice.uniforms.uLuce.value.set(col.luce);
    vortice.uniforms.uCuore.value.set(col.cuore);
    [bordo, ...cornici].forEach((l) => (l.material as THREE.LineBasicMaterial).color.set(col.bordo));
    (scintille.material as THREE.PointsMaterial).color.set(col.bordo);
    lamaMat.color.set(col.luce);
    colonnaMat.color.set(col.luce);
    legno.color.set(col.legno);
  }, [col, vortice, bordo, cornici, scintille, lamaMat, colonnaMat, legno]);

  useEffect(
    () => () => {
      [scritta, punto, lama, vortice, lamaMat, colonnaMat, legno, interno].forEach((x) => x.dispose());
      [bordo, ...cornici].forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      scintille.geometry.dispose();
      (scintille.material as THREE.Material).dispose();
    },
    [scritta, punto, lama, vortice, lamaMat, colonnaMat, legno, interno, bordo, cornici, scintille]
  );

  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [sopra]);

  const radice = useRef<THREE.Group>(null);
  const centro = useMemo(() => new THREE.Vector3(), []);
  const avanti = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    if (radice.current) collocaZona(radice.current);
  }, []);

  // gli oggetti che il ciclo di disegno modifica a ogni fotogramma
  const vivi = useRef({ vortice, bordo, cornici, scintille, lamaMat, colonnaMat });

  useFrame((stato, dt) => {
    const { vortice, bordo, cornici, scintille, lamaMat, colonnaMat } = vivi.current;
    const t = ridotto ? 0 : stato.clock.elapsedTime;
    if (radice.current) {
      // il cuore della luce proiettato sullo schermo
      radice.current.localToWorld(centro.copy(CUORE));
      const davanti = centro.clone().sub(stato.camera.position).dot(stato.camera.getWorldDirection(avanti)) > 0;
      centro.project(stato.camera);
      schermoPortale.x = centro.x;
      schermoPortale.y = centro.y;
      schermoPortale.visibile = davanti && Math.abs(centro.x) < 1.3 && Math.abs(centro.y) < 1.3;
    }
    // con "riduci movimento" il passaggio del puntatore non cambia niente
    forza.current = ridotto ? 0 : THREE.MathUtils.lerp(forza.current, sopra ? 1 : 0, 1 - Math.exp(-dt * 4));
    const f = forza.current;
    const o = opacita.current;
    // a loop acceso tutto pulsa a tempo: un colpo a ogni quarto
    const b = mondo.battito;
    const colpo = b.attivo && !ridotto ? Math.exp(-b.fase * 5) : -1;
    vortice.uniforms.uTempo.value = t;
    vortice.uniforms.uForza.value = f + (colpo > 0 ? colpo * 0.6 : 0);
    vortice.uniforms.uOpacita.value = o;
    (bordo.material as THREE.LineBasicMaterial).opacity =
      o * (colpo >= 0 ? 0.5 + 0.5 * colpo : 0.65 + 0.35 * Math.sin(t * 2.2)) * (0.8 + f * 0.4);
    // la luce corre verso l'esterno, una cornice dopo l'altra
    cornici.forEach((l, k) => {
      const onda = colpo >= 0 ? Math.exp(-((b.fase * 4 - k * 0.6) ** 2) * 2) : 0.55 + 0.45 * Math.sin(t * 2.2 - k * 0.9);
      (l.material as THREE.LineBasicMaterial).opacity = o * (0.62 - k * 0.11) * onda * (0.85 + f * 0.4);
    });
    if (lame.current) lame.current.rotation.y = t * 0.06;
    lamaMat.opacity = o * (notte ? 0.22 : 0.16) * (1 + f * 0.8) * (colpo >= 0 ? 0.8 + 0.5 * colpo : 1);
    colonnaMat.opacity = o * (notte ? 0.42 : 0.3) * (1 + f * 0.5);
    if (scrittaMat.current) scrittaMat.current.opacity = o;
    const arr = scintille.geometry.attributes.position.array as Float32Array;
    semi.forEach((s, i) => {
      const ciclo = ((t * s.v * (1 + f) + s.f) % 1 + 1) % 1;
      const r = 0.03 + ciclo * 0.2;
      const ang = s.a + ciclo * 5.5;
      arr[i * 3] = C.x + Math.cos(ang) * r;
      arr[i * 3 + 1] = BOCCA.y + ciclo * 1.0;
      arr[i * 3 + 2] = BOCCA_Z + Math.sin(ang) * r;
    });
    scintille.geometry.attributes.position.needsUpdate = true;
    (scintille.material as THREE.PointsMaterial).opacity = o * 0.9;
  });

  const yCorpo = CORPO.a / 2;
  const cassetti = [0.09, 0.27];
  return (
    <group ref={radice}>
      {/* la cassettiera */}
      <mesh position={[C.x, yCorpo, C.z]} material={legno} raycast={() => null}>
        <boxGeometry args={[CORPO.l, CORPO.a, CORPO.p]} />
      </mesh>
      {/* i due cassetti chiusi: solo i pomelli e una fuga scura */}
      {cassetti.map((y) => (
        <group key={y}>
          <mesh position={[C.x, y + 0.08, FRONTE - 0.002]} raycast={() => null}>
            <boxGeometry args={[CORPO.l - 0.04, 0.004, 0.004]} />
            <meshBasicMaterial color="#120E0B" />
          </mesh>
          <mesh position={[C.x, y, FRONTE - 0.012]} material={interno} raycast={() => null}>
            <boxGeometry args={[0.06, 0.014, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* il primo cassetto, tirato fuori: fondo, fianchi, frontale col pomello */}
      <group position={[C.x, BOCCA.y - 0.06, FRONTE - TIRATO / 2]}>
        <mesh position={[0, -0.055, 0]} material={interno} raycast={() => null}>
          <boxGeometry args={[BOCCA.l + 0.04, 0.01, TIRATO + 0.02]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (BOCCA.l / 2 + 0.01), 0, 0]} material={legno} raycast={() => null}>
            <boxGeometry args={[0.02, 0.12, TIRATO + 0.02]} />
          </mesh>
        ))}
        <mesh position={[0, 0, -TIRATO / 2 - 0.005]} material={legno} raycast={() => null}>
          <boxGeometry args={[CORPO.l - 0.02, 0.15, 0.02]} />
        </mesh>
        <mesh position={[0, 0, -TIRATO / 2 - 0.022]} material={interno} raycast={() => null}>
          <boxGeometry args={[0.06, 0.014, 0.02]} />
        </mesh>
      </group>
      {/* la luce, dentro il cassetto */}
      <mesh position={[C.x, BOCCA.y, BOCCA_Z]} rotation={[-Math.PI / 2, 0, 0]} material={vortice} raycast={() => null}>
        <planeGeometry args={[BOCCA.l, BOCCA.p]} />
      </mesh>
      <primitive object={bordo} />
      {cornici.map((l, k) => (
        <primitive key={k} object={l} />
      ))}
      {/* le lame di luce che escono dal cassetto e girano lente */}
      <group ref={lame} position={[C.x, BOCCA.y, BOCCA_Z]}>
        {Array.from({ length: 7 }, (_, k) => (
          <mesh key={k} rotation={[0, (k / 7) * Math.PI, 0]} position={[0, 0.55, 0]} material={lamaMat} raycast={() => null}>
            <planeGeometry args={[0.07, 1.1]} />
          </mesh>
        ))}
      </group>
      <sprite position={[C.x, BOCCA.y + 0.45, BOCCA_Z]} scale={[0.5, 0.95, 1]} material={colonnaMat} raycast={() => null} />
      <primitive object={scintille} />
      {/* la scritta, sopra la luce, rivolta verso chi guarda */}
      <mesh position={[C.x, 2.35, BOCCA_Z]} rotation={[0, Math.PI, 0]} raycast={() => null}>
        <planeGeometry args={[2.7, 2.7 * (200 / 1024)]} />
        <meshBasicMaterial ref={scrittaMat} map={scritta} color={col.scritta} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* dove si clicca: la cassettiera e la colonna di luce, un po' più larghe del disegno */}
      <mesh
        position={[C.x, 0.85, C.z - 0.15]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setSopra(true);
          onSfiora?.();
        }}
        onPointerOut={() => setSopra(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          onApri();
        }}
      >
        <boxGeometry args={[0.75, 1.7, 0.85]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
