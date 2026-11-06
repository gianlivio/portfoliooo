"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { modello, scatola, scritta, smorza, textura } from "./base";


/*
 * Il frantoio: un vano di pietra aperto sul davanti (verso +z), nella radura dell'uliveto di Chiaramonte.
 * Dentro la lavatrice, la vasca con le macine, la pressa coi fiscoli, il filtro con l'olio nuovo che scende nel bidone.
 * Fasi (0–3): entro ventiquattro ore (lavaggio), frangitura, pressa, olio nuovo.
 */

const rilievo = new THREE.Vector2(1, 1);
function usePietra(passo = 1) {
  return useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map: textura("muretto-colore.webp", true, [passo, passo]),
        normalMap: textura("muretto-rilievo.webp", false, [passo, passo]),
        normalScale: rilievo,
        color: "#FFF0DA",
      }),
    [passo]
  );
}

const C = new THREE.Vector3(-14, 0, -46);
const L = 10, P = 7, H = 4.4;

function Vano() {
  const pietra = usePietra(1);
  const coppi = useMemo(() => {
    const falda = Math.hypot(P / 2, 1.4) + 0.5;
    return new THREE.MeshLambertMaterial({
      map: textura("coppi-colore.webp", true, [(L + 1) / 1.6, falda / 1.6]),
      normalMap: textura("coppi-rilievo.webp", false, [(L + 1) / 1.6, falda / 1.6]),
      color: "#F4D9C4",
      side: THREE.DoubleSide,
    });
  }, []);
  const muroFondo = useMemo(() => scatola(L, H, 0.6, 2.2), []);
  const muroLato = useMemo(() => scatola(0.6, H, P, 2.2), []);
  const pilastro = useMemo(() => scatola(0.6, H, 0.6, 2.2), []);
  const architrave = useMemo(() => scatola(L, 0.7, 0.62, 2.2), []);
  const angolo = Math.atan2(1.4, P / 2);
  const falda = Math.hypot(P / 2, 1.4) + 0.5;
  const cima = H + 1.4 + 0.06;
  const insegna = useMemo(
    () => scritta("FRANTOIO", { larghezza: 1024, altezza: 160, font: "400 96px Newsreader, Georgia, serif", colore: "#2A2016", fondo: "#E9DCC2" }),
    []
  );
  return (
    <group position={C}>
      <mesh geometry={muroFondo} material={pietra} position={[0, H / 2, -P / 2 + 0.3]} castShadow receiveShadow />
      <mesh geometry={muroLato} material={pietra} position={[-L / 2 + 0.3, H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={muroLato} material={pietra} position={[L / 2 - 0.3, H / 2, 0]} castShadow receiveShadow />
      {/* i pilastri e l'architrave del davanti, aperto */}
      {[-L / 2 + 0.3, -1.7, 1.7, L / 2 - 0.3].map((x) => (
        <mesh key={x} geometry={pilastro} material={pietra} position={[x, H / 2, P / 2 - 0.3]} castShadow />
      ))}
      <mesh geometry={architrave} material={pietra} position={[0, H - 0.35, P / 2 - 0.3]} castShadow />
      {/* timpani */}
      {[-1, 1].map((s) => {
        const sh = new THREE.Shape();
        sh.moveTo(-P / 2, 0);
        sh.lineTo(P / 2, 0);
        sh.lineTo(0, 1.4);
        sh.closePath();
        return (
          <mesh key={s} material={pietra} position={[s * (L / 2 - 0.3), H, 0]} rotation-y={Math.PI / 2} castShadow>
            <shapeGeometry args={[sh]} />
          </mesh>
        );
      })}
      {[1, -1].map((s) => (
        <mesh key={s} material={coppi} position={[0, cima - Math.sin(angolo) * (falda / 2), s * Math.cos(angolo) * (falda / 2)]} rotation-x={Math.atan2(-s * Math.cos(angolo), Math.sin(angolo))} castShadow receiveShadow>
          <planeGeometry args={[L + 0.8, falda]} />
        </mesh>
      ))}
      {/* il pavimento di cotto */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[L - 1.2, P - 0.6]} />
        <meshLambertMaterial color="#B07A55" />
      </mesh>
      <mesh position={[0, H - 0.35, P / 2 + 0.02]}>
        <planeGeometry args={[3.2, 0.5]} />
        <meshLambertMaterial map={insegna} />
      </mesh>
      {/* la luce calda dentro */}
      <pointLight position={[0, H - 0.8, 0]} intensity={14} distance={11} decay={1.6} color="#FFC98A" />
    </group>
  );
}

/** La vasca con le due macine, che girano attorno all'albero centrale durante la molitura. */
function Macina({ fase }: { fase: number }) {
  const giro = useRef<THREE.Group>(null);
  const ruote = useRef<THREE.Mesh[]>([]);
  const pasta = useRef<THREE.Mesh>(null);
  const v = useRef(0);
  const granito = useMemo(() => new THREE.MeshLambertMaterial({ color: "#C9C2B4", flatShading: true }), []);
  useFrame((_, dt) => {
    v.current = smorza(v.current, fase === 1 ? 0.7 : 0, 1.5, dt);
    if (giro.current) giro.current.rotation.y += v.current * dt;
    // le macine rotolano: giro sulla vasca diviso il raggio della ruota
    ruote.current.forEach((r) => {
      if (r) r.rotation.x += (v.current * dt * 0.55) / 0.72;
    });
    if (pasta.current) {
      const s = smorza(pasta.current.scale.x, fase >= 1 ? 1 : 0.001, 2, dt);
      pasta.current.scale.set(s, 1, s);
      pasta.current.visible = s > 0.02;
    }
  });
  return (
    <group position={[C.x - 0.4, 0, C.z - 0.6]}>
      <mesh material={granito} position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.65, 0.7, 28]} />
      </mesh>
      {/* la pasta, oppure le olive intere prima della molitura */}
      <mesh position={[0, 0.715, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.2, 1.45, 28]} />
        <meshStandardMaterial color={fase === 0 ? "#3A2533" : "#4C3A1C"} roughness={0.5} />
      </mesh>
      <mesh ref={pasta} position={[0, 0.74, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.2, 1.4, 28]} />
        <meshStandardMaterial color="#5A4721" roughness={0.3} />
      </mesh>
      <group ref={giro} position={[0, 0.72, 0]}>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 2.6, 10]} />
          <meshLambertMaterial color="#5A3E28" />
        </mesh>
        <mesh position={[0, 0.72, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.06, 0.06, 1.9, 8]} />
          <meshLambertMaterial color="#3A3A3A" />
        </mesh>
        {[-0.55, 0.55].map((x, i) => (
          <mesh
            key={x}
            ref={(m) => {
              if (m) ruote.current[i] = m;
            }}
            material={granito}
            position={[x, 0.72, 0]}
            rotation-z={Math.PI / 2}
            castShadow
          >
            <cylinderGeometry args={[0.72, 0.72, 0.36, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const acciaio = () => new THREE.MeshStandardMaterial({ color: "#C9CDD0", metalness: 0.85, roughness: 0.32 });

/**
 * La pressa: il carrello coi fiscoli impilati, ognuno con la pasta stesa sopra, sotto il piatto di ferro
 * che scende sulle colonne. Nella fase della pressa il piatto preme e l'olio cola nella vasca.
 */
function Pressa({ fase }: { fase: number }) {
  const mat = useMemo(() => acciaio(), []);
  const ferro = useMemo(() => new THREE.MeshLambertMaterial({ color: "#2F3A44" }), []);
  const piatto = useRef<THREE.Group>(null);
  const colata = useRef<THREE.Mesh>(null);
  const pila = useRef<THREE.Group>(null);
  const fiscolo = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 16;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    for (let i = 0; i < 64; i += 4) {
      x.fillStyle = i % 8 ? "#B08A50" : "#8E6A38";
      x.fillRect(i, 0, 4, 16);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const N = 14;
  useFrame(({ clock }, dt) => {
    const preme = fase === 2;
    if (piatto.current) piatto.current.position.y = smorza(piatto.current.position.y, preme ? 0 : 0.7, 0.8, dt);
    if (pila.current) pila.current.scale.y = smorza(pila.current.scale.y, preme ? 0.86 : 1, 0.8, dt);
    if (colata.current) {
      const s = smorza(colata.current.scale.y, preme ? 1 : 0.001, 2, dt);
      colata.current.scale.set(1 + Math.sin(clock.elapsedTime * 10) * 0.1, s, 1);
      colata.current.visible = s > 0.02;
    }
  });
  return (
    <group position={[C.x + 3.2, 0, C.z - 0.9]}>
      {/* la vasca di raccolta e il carrello */}
      <mesh material={mat} position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.85, 0.36, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.84, 24]} />
        <meshStandardMaterial color={fase >= 2 ? "#7E7A1C" : "#5A5A58"} roughness={0.15} />
      </mesh>
      <group ref={pila} position={[0, 0.36, 0]}>
        {Array.from({ length: N }, (_, i) => (
          <group key={i} position={[0, 0.06 + i * 0.1, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.55, 0.55, 0.05, 24]} />
              <meshLambertMaterial map={fiscolo} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.03, 20]} />
              <meshLambertMaterial color="#5A4721" />
            </mesh>
          </group>
        ))}
        {/* l'asta centrale che tiene la pila */}
        <mesh material={mat} position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        </mesh>
      </group>
      {/* le colonne e la traversa in alto */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} material={ferro} position={[x, 1.45, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2.9, 10]} />
        </mesh>
      ))}
      <mesh material={ferro} position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[2.2, 0.3, 0.42]} />
      </mesh>
      <group ref={piatto} position={[0, 0.7, 0]}>
        <mesh material={ferro} position={[0, 1.96, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.12, 24]} />
        </mesh>
        <mesh material={mat} position={[0, 2.35, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.7, 10]} />
        </mesh>
      </group>
      {/* l'olio che cola dalla pila nella vasca */}
      <mesh ref={colata} position={[0.58, 0.95, 0]}>
        <cylinderGeometry args={[0.02, 0.015, 1.2, 6]} />
        <meshStandardMaterial color="#9C9A1E" emissive="#3E3A05" roughness={0.1} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/** Il filtro d'acciaio e l'olio nuovo, verde e torbido, che scende nel bidone; le bottiglie sulla mensola. */
function Filtro({ fase }: { fase: number }) {
  const mat = useMemo(() => acciaio(), []);
  const filo = useRef<THREE.Mesh>(null);
  const livello = useRef<THREE.Mesh>(null);
  const olio = useMemo(() => new THREE.MeshStandardMaterial({ color: "#A4A21C", emissive: "#3E3A05", roughness: 0.1, transparent: true, opacity: 0.94 }), []);
  useFrame(({ clock }, dt) => {
    if (filo.current) {
      const s = smorza(filo.current.scale.y, fase === 3 ? 1 : 0.001, 3, dt);
      filo.current.scale.set(1 + Math.sin(clock.elapsedTime * 12) * 0.08, s, 1);
      filo.current.visible = s > 0.02;
    }
    if (livello.current) livello.current.scale.y = smorza(livello.current.scale.y, fase === 3 ? 1 : 0.05, 0.6, dt);
  });
  return (
    <group>
      <group position={[C.x - 3.0, 0, C.z + 0.3]}>
        {/* il serbatoio col filtro, su tre gambe */}
        <mesh material={mat} position={[0, 1.55, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.8, 20]} />
        </mesh>
        <mesh material={mat} position={[0, 1.08, 0]}>
          <coneGeometry args={[0.42, 0.3, 20]} />
        </mesh>
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} material={mat} position={[Math.cos(a) * 0.36, 0.6, Math.sin(a) * 0.36]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
          </mesh>
        ))}
        <mesh ref={filo} material={olio} position={[0, 0.66, 0]}>
          <cylinderGeometry args={[0.02, 0.014, 0.6, 6]} />
        </mesh>
        {/* il bidone */}
        <mesh material={mat} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.4, 18, 1, true]} />
        </mesh>
        <mesh ref={livello} position={[0, 0.0, 0]} scale={[1, 0.05, 1]}>
          <cylinderGeometry args={[0.24, 0.24, 0.72, 18]} />
          <meshStandardMaterial color="#8E8C16" roughness={0.15} />
        </mesh>
      </group>
      {/* la mensola con le bottiglie, contro il muro di sinistra */}
      <group position={[C.x - 4.15, 0, C.z + 0.5]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[2.2, 0.06, 0.4]} />
          <meshLambertMaterial color="#7A5A3E" />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[-0.9 + i * 0.3, 1.13, 0]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.055, 0.06, 0.32, 12]} />
              <meshStandardMaterial color="#3D4A14" roughness={0.1} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.018, 0.04, 0.12, 10]} />
              <meshStandardMaterial color="#3D4A14" roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Le cassette di olive all'ingresso e la lavatrice, nella fase del lavaggio. */
function Lavaggio({ fase }: { fase: number }) {
  const [cassetta, setCassetta] = useState<{ geometria: THREE.BufferGeometry; materiale: THREE.Material } | null>(null);
  useEffect(() => {
    let vivo = true;
    modello("cassetta.glb", 0.3).then((m) => vivo && setCassetta(m));
    return () => {
      vivo = false;
    };
  }, []);
  const mat = useMemo(() => acciaio(), []);
  const acqua = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (acqua.current) acqua.current.position.y = 0.98 + Math.sin(clock.elapsedTime * 5) * 0.01;
  });
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const s = smorza(g.current.scale.x, fase === 0 ? 1 : 0.6, 3, dt);
    g.current.scale.setScalar(s);
  });
  return (
    <group>
      <group ref={g} position={[C.x - 3.6, 0, C.z + 2.3]}>
        {cassetta &&
          [0, 1, 2, 3, 4, 5].map((k) => (
            <group key={k} position={[(k % 3) * 0.55, Math.floor(k / 3) * 0.3, 0]} rotation-y={0.08 * k}>
              <mesh geometry={cassetta.geometria} material={cassetta.materiale} castShadow />
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.46, 0.03, 0.32]} />
                <meshStandardMaterial color="#3A2633" roughness={0.4} />
              </mesh>
            </group>
          ))}
      </group>
      <group position={[C.x - 3.4, 0, C.z - 2.2]}>
        <mesh material={mat} position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.6, 1.0, 0.9]} />
        </mesh>
        <mesh ref={acqua} position={[0, 0.98, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.5, 0.8]} />
          <meshStandardMaterial color={fase === 0 ? "#7FA7AE" : "#5E7F84"} roughness={0.05} metalness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export default function Frantoio({ fase }: { fase: number }) {
  return (
    <group>
      <Vano />
      <Macina fase={fase} />
      <Pressa fase={fase} />
      <Filtro fase={fase} />
      <Lavaggio fase={fase} />
    </group>
  );
}
