"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { albero, generatore, pillola, posa, scatola, textura } from "./base";
import {
  CACTUS,
  CANCELLO,
  CAPANNO,
  CAVEDIO,
  CORPI,
  FICHI_INDIA,
  FORNO,
  FRUTTETO,
  PERIMETRO,
  PISCINA,
  PORTICO,
  ULIVO_CAVEDIO,
  type P3,
  type Specie,
} from "@/content/casaLuoghi";
import type { Lingua } from "@/dictionaries";

/*
 * Le cose della campagna siciliana attorno alla casa: il muretto a secco che chiude la proprietà, il cancello
 * coi pilastri e le teste di moro; il cavedio coi muri bianchi, l'ulivo al centro, il forno a legna e il
 * porticato antico di legno; il capanno nel retro; la piscina attrezzata (lettini, ombrellone, doccia, gazebo,
 * lampade, il fenicottero gonfiabile); gli alberi da frutto sparsi, i cactus San Pedro, i fichi d'india,
 * il papiro e le erbe aromatiche.
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
function useCalce() {
  return useMemo(() => new THREE.MeshLambertMaterial({ color: "#F2EDE3" }), []);
}

/** Un'etichetta che compare avvicinandosi: il nome di un albero, delle erbe. */
function Nome({ p, testo, sotto, alto = 3 }: { p: P3; testo: string; sotto?: string; alto?: number }) {
  const pill = useMemo(() => pillola(testo, sotto), [testo, sotto]);
  const s = useRef<THREE.Sprite>(null);
  const m = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ camera }) => {
    if (!s.current || !m.current) return;
    const d = camera.position.distanceTo(s.current.position);
    const o = THREE.MathUtils.clamp(1.6 - d / 7, 0, 1);
    m.current.opacity = o;
    s.current.visible = o > 0.02;
  });
  return (
    <sprite ref={s} position={[p[0], alto, p[2]]} scale={[0.24 * pill.rapporto, 0.24, 1]} renderOrder={10}>
      <spriteMaterial ref={m} map={pill.texture} transparent depthWrite={false} opacity={0} />
    </sprite>
  );
}

/* ------------------------------------------------------------------ il muretto a secco e il cancello */

/** Il muretto a secco attorno a tutta la proprietà: pietra a vista, una copertina di pietre più grosse. */
function Muretto() {
  const pietra = usePietra(1);
  const geo = useMemo(() => {
    const parti: THREE.BufferGeometry[] = [];
    for (let i = 0; i < PERIMETRO.length - 1; i++) {
      const [x1, z1] = PERIMETRO[i], [x2, z2] = PERIMETRO[i + 1];
      const l = Math.hypot(x2 - x1, z2 - z1);
      const g = scatola(l + 0.6, 1.05, 0.62, 1.4);
      g.rotateY(-Math.atan2(z2 - z1, x2 - x1));
      g.translate((x1 + x2) / 2, 0.52, (z1 + z2) / 2);
      parti.push(g.toNonIndexed());
    }
    return mergeGeometries(parti) as THREE.BufferGeometry;
  }, []);
  return <mesh geometry={geo} material={pietra} castShadow receiveShadow />;
}

/**
 * Una testa di moro di ceramica di Caltagirone: il vaso, la testa, gli occhi, le labbra, la corona d'oro
 * con le pietre colorate e le foglie che spuntano dall'alto. regina = la testa chiara della dama.
 */
function TestaDiMoro({ p, ruota = 0, regina = false }: { p: P3; ruota?: number; regina?: boolean }) {
  const pelle = regina ? "#E9C9A6" : "#5A3626";
  const pietre = ["#C8302A", "#2F7A3A", "#2F5AA8", "#C8302A", "#2F7A3A", "#2F5AA8", "#E8B23A", "#2F5AA8"];
  return (
    <group position={p} rotation-y={ruota} scale={1.15}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.12, 16]} />
        <meshStandardMaterial color="#2F5AA8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0]} scale={[0.9, 1.15, 0.95]} castShadow>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshStandardMaterial color={pelle} roughness={0.25} />
      </mesh>
      {/* occhi, sopracciglia e labbra */}
      {[-0.065, 0.065].map((x) => (
        <group key={x} position={[x, 0.34, 0.175]}>
          <mesh>
            <sphereGeometry args={[0.03, 10, 8]} />
            <meshStandardMaterial color="#F4F0E6" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.045, 0.01]}>
            <boxGeometry args={[0.06, 0.012, 0.01]} />
            <meshStandardMaterial color="#1A1210" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.23, 0.18]}>
        <boxGeometry args={[0.07, 0.022, 0.03]} />
        <meshStandardMaterial color="#B0202A" roughness={0.3} />
      </mesh>
      {/* la corona */}
      <mesh position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.15, 0.13, 0.1, 16, 1, true]} />
        <meshStandardMaterial color="#D9A43A" metalness={0.4} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {pietre.map((c, i) => {
        const a = (i / pietre.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.145, 0.49, Math.cos(a) * 0.145]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshStandardMaterial color={c} roughness={0.2} />
          </mesh>
        );
      })}
      {/* le foglie della pianta, nella testa-vaso */}
      {[0, 1.3, 2.6, 3.9, 5.2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.06, 0.66, Math.cos(a) * 0.06]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
          <coneGeometry args={[0.05, 0.36, 5]} />
          <meshLambertMaterial color="#3E6A2E" />
        </mesh>
      ))}
    </group>
  );
}

/** Il cancello sulla strada: due pilastri di pietra con la cimasa, le teste di moro sopra, le ante di ferro aperte. */
function Cancello() {
  const pietra = usePietra(0.8);
  const ferro = useMemo(() => new THREE.MeshLambertMaterial({ color: "#2A2826" }), []);
  const c = CANCELLO;
  const xs = [c.x - c.largo / 2, c.x + c.largo / 2];
  return (
    <group>
      {xs.map((x, i) => (
        <group key={x} position={[x, 0, c.z]}>
          <mesh material={pietra} position={[0, 1.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 2.3, 0.8]} />
          </mesh>
          <mesh position={[0, 2.36, 0]} castShadow>
            <boxGeometry args={[0.98, 0.14, 0.98]} />
            <meshLambertMaterial color="#E9DCC2" />
          </mesh>
          <TestaDiMoro p={[0, 2.43, 0]} regina={i === 1} />
          {/* l'anta, aperta verso dentro */}
          <group position={[i ? -0.42 : 0.42, 0, 0]} rotation-y={i ? -1.25 : 1.25}>
            {Array.from({ length: 8 }, (_, k) => (
              <mesh key={k} material={ferro} position={[(i ? -1 : 1) * (0.15 + k * 0.29), 0.95, 0]}>
                <boxGeometry args={[0.03, 1.7, 0.03]} />
              </mesh>
            ))}
            {[0.2, 1.75].map((y) => (
              <mesh key={y} material={ferro} position={[(i ? -1 : 1) * 1.17, y, 0]}>
                <boxGeometry args={[2.3, 0.05, 0.04]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ il cavedio */

/** Il forno a legna: la base intonacata, la cupola, la bocca nera verso il centro del cavedio, il comignolo, la legna. */
function Forno() {
  const calce = useCalce();
  return (
    <group position={FORNO} rotation-y={-Math.PI / 4}>
      <mesh material={calce} position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1, 2]} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <sphereGeometry args={[0.92, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#E8DCC6" />
      </mesh>
      <mesh position={[0, 1.32, 0.86]}>
        <circleGeometry args={[0.32, 16, 0, Math.PI]} />
        <meshBasicMaterial color="#120C08" />
      </mesh>
      <mesh position={[0, 1.16, 0.88]}>
        <planeGeometry args={[0.64, 0.32]} />
        <meshBasicMaterial color="#120C08" />
      </mesh>
      <mesh position={[0, 1.02, 1.05]} castShadow>
        <boxGeometry args={[0.9, 0.06, 0.3]} />
        <meshLambertMaterial color="#C9B89A" />
      </mesh>
      <mesh position={[-0.35, 2.0, -0.35]} castShadow>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshLambertMaterial color="#C9B89A" />
      </mesh>
      {/* la legna accatastata accanto */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[1.35, 0.1 + Math.floor(i / 3) * 0.17, -0.5 + (i % 3) * 0.17 + (Math.floor(i / 3) % 2) * 0.08]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.9, 7]} />
          <meshLambertMaterial color={i % 2 ? "#7A5A3A" : "#8C6A44"} />
        </mesh>
      ))}
    </group>
  );
}

/** Il porticato antico di legno lungo la facciata dell'ala: pali, trave, travicelli, il tetto di coppi. */
function Portico() {
  const legno = useMemo(() => new THREE.MeshLambertMaterial({ color: "#5C4330" }), []);
  const coppi = useMemo(() => {
    const p = PORTICO;
    return new THREE.MeshLambertMaterial({
      map: textura("coppi-colore.webp", true, [(p.z1 - p.z0) / 1.6, (p.x1 - p.x0 + 0.6) / 1.6]),
      normalMap: textura("coppi-rilievo.webp", false, [(p.z1 - p.z0) / 1.6, (p.x1 - p.x0 + 0.6) / 1.6]),
      color: "#F4D9C4",
      side: THREE.DoubleSide,
    });
  }, []);
  const p = PORTICO;
  const pali = useMemo(() => {
    const n = 5;
    return Array.from({ length: n }, (_, i) => p.z0 + 0.3 + ((p.z1 - p.z0 - 0.6) * i) / (n - 1));
  }, [p]);
  const l = p.x1 - p.x0, pend = Math.atan2(0.5, l);
  return (
    <group>
      {pali.map((z) => (
        <mesh key={z} material={legno} position={[p.x0, 1.4, z]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 2.8, 8]} />
        </mesh>
      ))}
      <mesh material={legno} position={[p.x0, 2.85, (p.z0 + p.z1) / 2]} castShadow>
        <boxGeometry args={[0.24, 0.26, p.z1 - p.z0]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} material={legno} position={[(p.x0 + p.x1) / 2, 3.1, p.z0 + 0.2 + ((p.z1 - p.z0 - 0.4) * i) / 10]} rotation-z={-pend}>
          <boxGeometry args={[l + 0.6, 0.1, 0.1]} />
        </mesh>
      ))}
      <mesh material={coppi} position={[(p.x0 + p.x1) / 2 - 0.1, 3.2, (p.z0 + p.z1) / 2]} rotation={[-Math.PI / 2, -pend, 0, "YXZ"]} castShadow receiveShadow>
        <planeGeometry args={[l + 0.8, p.z1 - p.z0 + 0.4]} />
      </mesh>
      {/* il pavimento di cotto sotto il porticato */}
      <mesh rotation-x={-Math.PI / 2} position={[(p.x0 + p.x1) / 2, 0.04, (p.z0 + p.z1) / 2]} receiveShadow>
        <planeGeometry args={[l + 0.4, p.z1 - p.z0]} />
        <meshLambertMaterial color="#B5764E" />
      </mesh>
    </group>
  );
}

/** I muri bianchi del cavedio, il varco verso l'aia, l'ulivo al centro, i pumi di ceramica sui muri. */
function Cavedio() {
  const calce = useCalce();
  const c = CAVEDIO, H = 2.6;
  const muri = useMemo(
    () =>
      [
        [c.x0, c.z0, c.x1, c.z0],
        [c.x0, c.z0, c.x0, c.z1],
        [c.x0, c.z1, c.varco - 1.2, c.z1],
        [c.varco + 1.2, c.z1, -2.6, c.z1],
        // tra l'ala e il corpo basso
        [c.x1, CORPI.ala.z + CORPI.ala.p / 2, c.x1, c.z1],
      ] as [number, number, number, number][],
    [c]
  );
  const ulivo = useMemo(() => albero(777, 1.15, 0.66), []);
  const corteccia = useMemo(() => textura("corteccia-colore.webp", true, [2, 2]), []);
  const m = useMemo(() => posa(ULIVO_CAVEDIO[0], 0, ULIVO_CAVEDIO[1], 0.6, [1.85, 1.75, 1.85]), []);
  return (
    <group>
      {muri.map(([x1, z1, x2, z2], i) => {
        const l = Math.hypot(x2 - x1, z2 - z1);
        return (
          <group key={i}>
            <mesh material={calce} position={[(x1 + x2) / 2, H / 2, (z1 + z2) / 2]} rotation-y={-Math.atan2(z2 - z1, x2 - x1)} castShadow receiveShadow>
              <boxGeometry args={[l + 0.3, H, 0.3]} />
            </mesh>
            <mesh position={[(x1 + x2) / 2, H + 0.05, (z1 + z2) / 2]} rotation-y={-Math.atan2(z2 - z1, x2 - x1)}>
              <boxGeometry args={[l + 0.4, 0.1, 0.4]} />
              <meshLambertMaterial color="#D8CDB8" />
            </mesh>
          </group>
        );
      })}
      {/* i pumi di ceramica ai lati del varco */}
      {[c.varco - 1.2, c.varco + 1.2].map((x) => (
        <group key={x} position={[x, H + 0.1, c.z1]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 0.16, 12]} />
            <meshStandardMaterial color="#2F5AA8" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.34, 0]} scale={[1, 1.5, 1]}>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color="#2F7A3A" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.07, 0.14, 10]} />
            <meshStandardMaterial color="#D9A43A" roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* la terra battuta del cavedio */}
      <mesh rotation-x={-Math.PI / 2} position={[(c.x0 + c.x1) / 2, 0.035, (c.z0 + c.z1) / 2]} receiveShadow>
        <planeGeometry args={[c.x1 - c.x0, c.z1 - c.z0]} />
        <meshLambertMaterial color="#C8A47E" polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* l'ulivo al centro, con l'aiuola di pietra */}
      <mesh geometry={ulivo.legnoGeo} matrixAutoUpdate={false} matrix={m} castShadow>
        <meshLambertMaterial map={corteccia} color="#9A8E80" />
      </mesh>
      <mesh geometry={ulivo.frondeGeo} matrixAutoUpdate={false} matrix={m} castShadow receiveShadow>
        <meshLambertMaterial color="#76885A" flatShading />
      </mesh>
      <mesh position={[ULIVO_CAVEDIO[0], 0.12, ULIVO_CAVEDIO[1]]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1.1, 0.16, 6, 24]} />
        <meshLambertMaterial color="#D8CDB8" />
      </mesh>
      <Portico />
      <Forno />
    </group>
  );
}

/** Il capanno nel retro: legno scuro, il tetto di lamiera in pendenza, la porta. */
function Capanno() {
  const c = CAPANNO;
  return (
    <group position={[c.x, 0, c.z]}>
      <mesh position={[0, c.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[c.l, c.h, c.p]} />
        <meshLambertMaterial color="#6E5440" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-c.l / 2 + 0.3 + i * ((c.l - 0.6) / 8), c.h / 2, c.p / 2 + 0.01]}>
          <boxGeometry args={[0.03, c.h, 0.02]} />
          <meshLambertMaterial color="#4E3A2C" />
        </mesh>
      ))}
      <mesh position={[0, c.h + 0.25, 0.1]} rotation-x={0.12} castShadow>
        <boxGeometry args={[c.l + 0.5, 0.06, c.p + 0.7]} />
        <meshStandardMaterial color="#8C9396" metalness={0.5} roughness={0.55} />
      </mesh>
      <mesh position={[0.8, 1, c.p / 2 + 0.03]}>
        <planeGeometry args={[1.1, 2]} />
        <meshLambertMaterial color="#3E2E22" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ la piscina attrezzata */

function Lettino({ p, r = 0, telo }: { p: P3; r?: number; telo: string }) {
  return (
    <group position={p} rotation-y={r}>
      <mesh position={[0, 0.3, 0.15]} castShadow>
        <boxGeometry args={[0.66, 0.08, 1.45]} />
        <meshLambertMaterial color="#F2F0EA" />
      </mesh>
      <mesh position={[0, 0.55, -0.72]} rotation-x={-0.95} castShadow>
        <boxGeometry args={[0.66, 0.08, 0.7]} />
        <meshLambertMaterial color="#F2F0EA" />
      </mesh>
      {[-0.28, 0.28].map((x) =>
        [-0.6, 0.75].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.13, z]}>
            <boxGeometry args={[0.05, 0.26, 0.05]} />
            <meshLambertMaterial color="#D8D6D0" />
          </mesh>
        ))
      )}
      {/* il telo da mare */}
      <mesh position={[0, 0.355, 0.25]} castShadow>
        <boxGeometry args={[0.58, 0.02, 1.0]} />
        <meshLambertMaterial color={telo} />
      </mesh>
    </group>
  );
}

function Ombrellone({ p }: { p: P3 }) {
  const tela = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? "#F3F1EB" : "#2F6AA8";
      x.beginPath();
      x.moveTo(64, 64);
      x.arc(64, 64, 64, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={p}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 2.3, 6]} />
        <meshLambertMaterial color="#D8D6D0" />
      </mesh>
      <mesh position={[0, 2.25, 0]} castShadow>
        <coneGeometry args={[1.35, 0.42, 16, 1, true]} />
        <meshLambertMaterial map={tela} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Doccia({ p }: { p: P3 }) {
  const acciaio = useMemo(() => new THREE.MeshStandardMaterial({ color: "#C9CDD0", metalness: 0.85, roughness: 0.3 }), []);
  return (
    <group position={p}>
      {/* la pedana di legno */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.42 + i * 0.17, 0.14, 0]} receiveShadow>
          <boxGeometry args={[0.14, 0.04, 1]} />
          <meshLambertMaterial color="#9A6E46" />
        </mesh>
      ))}
      <mesh material={acciaio} position={[0, 1.2, -0.4]}>
        <cylinderGeometry args={[0.035, 0.035, 2.3, 8]} />
      </mesh>
      <mesh material={acciaio} position={[0, 2.33, -0.15]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
      </mesh>
      <mesh material={acciaio} position={[0, 2.28, 0.1]}>
        <cylinderGeometry args={[0.13, 0.05, 0.06, 16]} />
      </mesh>
      <mesh material={acciaio} position={[0, 1.05, -0.33]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 8]} />
      </mesh>
    </group>
  );
}

/** Il gazebo sul prato: quattro pali bianchi, il tetto di tela a padiglione, la balza. */
function Gazebo({ p }: { p: P3 }) {
  const L = 3.6;
  return (
    <group position={p}>
      {[-1, 1].flatMap((a) =>
        [-1, 1].map((b) => (
          <mesh key={`${a}${b}`} position={[(a * L) / 2, 1.2, (b * L) / 2]} castShadow>
            <boxGeometry args={[0.1, 2.4, 0.1]} />
            <meshLambertMaterial color="#F2F0EA" />
          </mesh>
        ))
      )}
      <mesh position={[0, 2.85, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[(L / 2) * Math.SQRT2 + 0.25, 1.0, 4, 1, true]} />
        <meshLambertMaterial color="#F6F3EC" side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 2) * (L / 2 + 0.2), 2.28, Math.cos((i * Math.PI) / 2) * (L / 2 + 0.2)]} rotation-y={(i * Math.PI) / 2}>
          <planeGeometry args={[L + 0.4, 0.22]} />
          <meshLambertMaterial color="#E9E4D8" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Le lampade basse attorno alla piscina: un paletto e la luce calda in cima. */
function Lampade() {
  const p = PISCINA;
  const posti = useMemo(() => {
    const out: [number, number][] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) out.push([p.x + sx * (p.bordoL / 2 - 0.25), p.z + sz * (p.bordoP / 2 - 0.25)]);
    return out;
  }, [p]);
  return (
    <group>
      {posti.map(([x, z], i) => (
        <group key={i} position={[x, 0.1, z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.6, 10]} />
            <meshStandardMaterial color="#3A3C3E" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.12, 12]} />
            <meshStandardMaterial color="#FFE2A8" emissive="#FFC874" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Il fenicottero gonfiabile rosa: il ciambellone, il collo a esse, la testa col becco nero. Galleggia e gira piano. */
function Fenicottero() {
  const p = PISCINA;
  const g = useRef<THREE.Group>(null);
  const collo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, 0.42),
      new THREE.Vector3(0, 0.45, 0.48),
      new THREE.Vector3(0, 0.75, 0.3),
      new THREE.Vector3(0, 0.95, 0.42),
      new THREE.Vector3(0, 1.0, 0.62),
    ]);
    return new THREE.TubeGeometry(curva, 24, 0.075, 10, false);
  }, []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.position.set(p.x + Math.sin(t * 0.11) * 0.9, 0.12 + Math.sin(t * 1.3) * 0.025, p.z + Math.sin(t * 0.07) * 2.6);
    g.current.rotation.set(Math.sin(t * 1.1) * 0.04, t * 0.12, Math.cos(t * 0.9) * 0.04);
  });
  const rosa = "#F27AAE";
  return (
    <group ref={g}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.42, 0.17, 12, 28]} />
        <meshStandardMaterial color={rosa} roughness={0.35} />
      </mesh>
      <mesh geometry={collo} castShadow>
        <meshStandardMaterial color={rosa} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.02, 0.66]}>
        <sphereGeometry args={[0.11, 14, 10]} />
        <meshStandardMaterial color={rosa} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.98, 0.8]} rotation-x={Math.PI / 2 + 0.5}>
        <coneGeometry args={[0.045, 0.18, 8]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
      </mesh>
      {/* la coda */}
      <mesh position={[0, 0.2, -0.5]} rotation-x={-0.6}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshStandardMaterial color={rosa} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Il papiro: ciuffi di steli sottili con l'ombrello di fili in cima, vicino all'acqua. */
function Papiro() {
  const posti = useMemo<[number, number][]>(() => [
    [PISCINA.x + 5.4, PISCINA.z - 6.4],
    [PISCINA.x - 5.6, PISCINA.z + 6.8],
    [-12.6, 29.4],
  ], []);
  const { steli, teste } = useMemo(() => {
    const caso = generatore(61);
    const steli: THREE.Matrix4[] = [], teste: THREE.Matrix4[] = [];
    posti.forEach(([x, z]) => {
      for (let i = 0; i < 18; i++) {
        const a = caso() * 6.28, r = caso() * 0.45, h = 1.5 + caso() * 0.9;
        const inc = (caso() - 0.5) * 0.25;
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(px, h / 2, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(inc, 0, inc)), new THREE.Vector3(1, h, 1));
        steli.push(m);
        teste.push(new THREE.Matrix4().compose(new THREE.Vector3(px + inc * h * 0.5, h, pz - inc * h * 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      }
    });
    return { steli, teste };
  }, [posti]);
  const riempi = (l: THREE.Matrix4[]) => (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    l.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[undefined, undefined, steli.length]} ref={riempi(steli)} frustumCulled={false}>
        <cylinderGeometry args={[0.012, 0.018, 1, 4]} />
        <meshLambertMaterial color="#6E9A3E" />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, teste.length]} ref={riempi(teste)} castShadow frustumCulled={false}>
        <coneGeometry args={[0.26, 0.2, 10, 1, true]} />
        <meshLambertMaterial color="#8AB04E" side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function PiscinaAttrezzata() {
  const p = PISCINA;
  const xl = p.x - p.l / 2 - 1.05;
  return (
    <group>
      <Lettino p={[xl, 0.1, p.z - 4.6]} telo="#2F6AA8" />
      <Lettino p={[xl, 0.1, p.z - 2]} telo="#E8B23A" />
      <Lettino p={[xl, 0.1, p.z + 2.8]} telo="#C8302A" />
      <Ombrellone p={[xl - 0.2, 0.1, p.z + 0.4]} />
      <Doccia p={[p.x + p.bordoL / 2 - 0.8, 0.1, p.z + p.bordoP / 2 - 2.8]} />
      <Gazebo p={[p.x + 0.4, 0, p.z - p.bordoP / 2 - 3.4]} />
      <Lampade />
      <Fenicottero />
      <Papiro />
    </group>
  );
}

/* ------------------------------------------------------------------ gli alberi da frutto */

type Frutto = { chioma: string; frutto: string; altro?: string; r: number; lungo?: number; n: number; folto: number; alto: number };
const FRUTTI: Record<Specie, Frutto> = {
  melo: { chioma: "#4E7A3A", frutto: "#C8302A", altro: "#9AB83A", r: 0.07, n: 26, folto: 1.05, alto: 1.15 },
  pero: { chioma: "#4A6E36", frutto: "#C8C050", r: 0.065, lungo: 1.35, n: 22, folto: 0.95, alto: 1.25 },
  papaya: { chioma: "#5E8A3A", frutto: "#E8A040", altro: "#8AA83A", r: 0.09, lungo: 1.5, n: 8, folto: 1, alto: 1 },
  melograno: { chioma: "#4E7A30", frutto: "#B0202A", r: 0.08, n: 18, folto: 0.9, alto: 1.0 },
  prugno: { chioma: "#4F6E3A", frutto: "#5A2A6A", r: 0.045, n: 34, folto: 0.95, alto: 1.1 },
  pesco: { chioma: "#5E8A3E", frutto: "#F0A050", altro: "#F2C8A8", r: 0.06, n: 24, folto: 0.9, alto: 1.0 },
  azzeruolo: { chioma: "#5A7A44", frutto: "#D8402A", altro: "#E8B23A", r: 0.04, n: 40, folto: 0.9, alto: 0.95 },
  giuggiolo: { chioma: "#6A8A3A", frutto: "#8A3A1E", r: 0.035, lungo: 1.3, n: 40, folto: 0.85, alto: 1.05 },
  fico: { chioma: "#7AA050", frutto: "#4A2A4A", altro: "#7A8A3A", r: 0.06, lungo: 1.2, n: 22, folto: 1.2, alto: 1.0 },
  nespolo: { chioma: "#2F5A2A", frutto: "#F0A030", r: 0.045, n: 36, folto: 1.1, alto: 1.05 },
  ciliegio: { chioma: "#5A8A44", frutto: "#B01020", r: 0.03, n: 56, folto: 0.95, alto: 1.2 },
};
const NOMI_FRUTTI: Record<Specie, Record<Lingua, string>> = {
  melo: { it: "Melo", en: "Apple tree", es: "Manzano" },
  pero: { it: "Pero", en: "Pear tree", es: "Peral" },
  papaya: { it: "Papaya", en: "Papaya", es: "Papayo" },
  melograno: { it: "Melograno", en: "Pomegranate", es: "Granado" },
  prugno: { it: "Prugno", en: "Plum tree", es: "Ciruelo" },
  pesco: { it: "Pesco", en: "Peach tree", es: "Melocotonero" },
  azzeruolo: { it: "Azzeruolo", en: "Azarole", es: "Acerolo" },
  giuggiolo: { it: "Giuggiolo", en: "Jujube", es: "Azufaifo" },
  fico: { it: "Fico", en: "Fig tree", es: "Higuera" },
  nespolo: { it: "Nespolo", en: "Loquat", es: "Níspero" },
  ciliegio: { it: "Ciliegio", en: "Cherry tree", es: "Cerezo" },
};

/** Gli alberi da frutto di una specie: legno, chioma e frutti, a istanze. */
function AlberiDaFrutto({ specie, posti }: { specie: Specie; posti: [number, number][] }) {
  const f = FRUTTI[specie];
  const forma = useMemo(() => albero(300 + specie.length * 17, f.folto, 0.72), [specie, f.folto]);
  const corteccia = useMemo(() => textura("corteccia-colore.webp", true, [2, 2]), []);
  const matrici = useMemo(() => {
    const caso = generatore(91 + specie.length);
    return posti.map(([x, z]) => {
      const s = 1.15 + caso() * 0.25;
      return posa(x, 0, z, caso() * 6.28, [s, s * f.alto, s]);
    });
  }, [posti, specie, f.alto]);
  const frutti = useMemo(() => {
    const caso = generatore(13 + specie.length * 3);
    const out: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const base = new THREE.Color(f.frutto), altro = new THREE.Color(f.altro ?? f.frutto);
    matrici.forEach((mt, k) => {
      for (let i = 0; i < f.n; i++) {
        const c = forma.centri[i % forma.centri.length];
        const d = new THREE.Vector3(caso() - 0.5, (caso() - 0.5) * 0.5 - 0.2, caso() - 0.5).normalize().multiplyScalar(0.36 + caso() * 0.1);
        const p = c.clone().add(d).applyMatrix4(mt);
        // ogni albero coi suoi colori: per il pesco tre tipi di pesche, per il melo rosse e verdi
        const col = (k + i) % 3 === 0 ? altro : base;
        out.push({ m: new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(1, f.lungo ?? 1, 1)), c: col });
      }
    });
    return out;
  }, [matrici, forma, f, specie]);
  const riempi = (l: THREE.Matrix4[]) => (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    l.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[forma.legnoGeo, undefined, matrici.length]} ref={riempi(matrici)} castShadow frustumCulled={false}>
        <meshLambertMaterial map={corteccia} color="#8C7B6A" />
      </instancedMesh>
      <instancedMesh args={[forma.frondeGeo, undefined, matrici.length]} ref={riempi(matrici)} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial color={f.chioma} flatShading />
      </instancedMesh>
      <instancedMesh
        args={[undefined, undefined, frutti.length]}
        ref={(m) => {
          if (!m) return;
          frutti.forEach((fr, i) => {
            m.setMatrixAt(i, fr.m);
            m.setColorAt(i, fr.c);
          });
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
        frustumCulled={false}
      >
        <sphereGeometry args={[f.r, 8, 6]} />
        <meshStandardMaterial roughness={0.5} color="#FFFFFF" />
      </instancedMesh>
    </group>
  );
}

/** La papaya: il fusto dritto e sottile, il ciuffo di foglie grandi in cima, i frutti attaccati sotto. */
function Papaya({ x, z }: { x: number; z: number }) {
  const foglia = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.45, 0.35, 0.9, 0.05);
    s.quadraticCurveTo(1.05, 0, 0.9, -0.05);
    s.quadraticCurveTo(0.45, -0.35, 0, 0);
    return new THREE.ShapeGeometry(s, 6);
  }, []);
  const H = 3.4;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, H, 8]} />
        <meshLambertMaterial color="#8C8A7A" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <group key={i} position={[0, H, 0]} rotation-y={a}>
            <mesh geometry={foglia} rotation={[-Math.PI / 2 + 0.35 + (i % 3) * 0.12, 0, 0]} scale={1.15} castShadow>
              <meshLambertMaterial color="#5E8A3A" side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.13, H - 0.25 - (i % 2) * 0.18, Math.sin(a) * 0.13]} scale={[1, 1.5, 1]} castShadow>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={i % 3 ? "#8AA83A" : "#E8A040"} roughness={0.45} />
          </mesh>
        );
      })}
    </group>
  );
}

function Frutteto({ lingua }: { lingua: Lingua }) {
  const perSpecie = useMemo(() => {
    const m = new Map<Specie, [number, number][]>();
    FRUTTETO.forEach(([x, z, s]) => m.set(s, [...(m.get(s) ?? []), [x, z]]));
    return [...m.entries()];
  }, []);
  return (
    <group>
      {perSpecie.map(([s, posti]) =>
        s === "papaya" ? posti.map(([x, z]) => <Papaya key={`${x}${z}`} x={x} z={z} />) : <AlberiDaFrutto key={s} specie={s} posti={posti} />
      )}
      {FRUTTETO.map(([x, z, s]) => (
        <Nome key={`${x}${z}`} p={[x, 0, z]} testo={NOMI_FRUTTI[s][lingua]} alto={s === "papaya" ? 4.3 : 3.5} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ cactus, fichi d'india, erbe */

/** I cactus San Pedro: colonne costolute alte fino a sei metri, a gruppi, qualcuna col fiore bianco in cima. */
function SanPedro() {
  const { colonne, fiori } = useMemo(() => {
    const caso = generatore(4321);
    const colonne: THREE.Matrix4[] = [], fiori: THREE.Matrix4[] = [];
    CACTUS.forEach(([x, z]) => {
      const n = 4 + Math.floor(caso() * 5);
      for (let i = 0; i < n; i++) {
        const a = caso() * 6.28, r = caso() * 0.7, h = 2.6 + caso() * 3.6, s = 0.85 + caso() * 0.4;
        const inc = (caso() - 0.5) * 0.18;
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        colonne.push(new THREE.Matrix4().compose(new THREE.Vector3(px, h / 2, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(inc, caso() * 6.28, -inc)), new THREE.Vector3(s, h, s)));
        if (caso() < 0.35) fiori.push(new THREE.Matrix4().compose(new THREE.Vector3(px + inc * h * 0.5, h + 0.05, pz - inc * h * 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      }
    });
    return { colonne, fiori };
  }, []);
  const riempi = (l: THREE.Matrix4[]) => (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    l.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[undefined, undefined, colonne.length]} ref={riempi(colonne)} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.16, 1, 7, 1]} />
        <meshLambertMaterial color="#5F8F74" flatShading />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, Math.max(1, fiori.length)]} ref={riempi(fiori)} frustumCulled={false}>
        <sphereGeometry args={[0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#F6F2E8" />
      </instancedMesh>
    </group>
  );
}

/** I fichi d'india: le pale ovali una sull'altra, coi frutti rossi e gialli sui bordi. */
function FichiIndia() {
  const { pale, frutti } = useMemo(() => {
    const caso = generatore(1212);
    const pale: THREE.Matrix4[] = [], frutti: THREE.Matrix4[] = [];
    FICHI_INDIA.forEach(([x, z]) => {
      // un piccolo albero di pale: ogni pala nasce dal bordo di una pala già messa
      const messe: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
      for (let i = 0; i < 26; i++) {
        let p: THREE.Vector3;
        if (!messe.length || i < 3) p = new THREE.Vector3(x + (caso() - 0.5) * 1.2, 0.35, z + (caso() - 0.5) * 1.2);
        else {
          const madre = messe[Math.floor(caso() * messe.length)];
          p = madre.p.clone().add(new THREE.Vector3((caso() - 0.5) * 0.6, 0.45 + caso() * 0.15, (caso() - 0.5) * 0.6));
        }
        if (p.y > 2.6) continue;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((caso() - 0.5) * 0.6, caso() * 6.28, (caso() - 0.5) * 0.6));
        messe.push({ p, q });
        pale.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
        if (caso() < 0.5)
          for (let k = 0; k < 3; k++) {
            const sopra = new THREE.Vector3((k - 1) * 0.12, 0.4, 0).applyQuaternion(q).add(p);
            frutti.push(new THREE.Matrix4().compose(sopra, new THREE.Quaternion(), new THREE.Vector3(1, 1.3, 1)));
          }
      }
    });
    return { pale, frutti };
  }, []);
  const riempi = (l: THREE.Matrix4[], colori = false) => (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    l.forEach((mt, i) => {
      m.setMatrixAt(i, mt);
      if (colori) m.setColorAt(i, new THREE.Color(i % 3 ? "#D8402A" : "#E8B23A"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[undefined, undefined, pale.length]} ref={riempi(pale)} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshLambertMaterial color="#6F8E4A" />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, frutti.length]} ref={riempi(frutti, true)} frustumCulled={false}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial roughness={0.5} color="#FFFFFF" />
      </instancedMesh>
    </group>
  );
}

/** Le erbe aromatiche: rosmarino, salvia, timo, origano, nei vasi di terracotta e nelle aiuole. */
const ERBE: { nome: Record<Lingua, string>; foglia: string; fiore: string; alto: number }[] = [
  { nome: { it: "Rosmarino", en: "Rosemary", es: "Romero" }, foglia: "#3E5E3A", fiore: "#8EA6D8", alto: 0.75 },
  { nome: { it: "Salvia", en: "Sage", es: "Salvia" }, foglia: "#8A9E7E", fiore: "#9A7AC8", alto: 0.5 },
  { nome: { it: "Timo", en: "Thyme", es: "Tomillo" }, foglia: "#5E7A4E", fiore: "#D8B8D8", alto: 0.3 },
  { nome: { it: "Origano", en: "Oregano", es: "Orégano" }, foglia: "#6A8A4A", fiore: "#F2EEE6", alto: 0.4 },
];
const POSTI_ERBE: [number, number, number][] = [
  // dentro il cavedio, lungo il muro a sud
  [-14.6, -25, 0], [-13.4, -25, 1], [-12.2, -25, 2], [-11, -25, 3],
  // davanti al corpo basso
  [-3.6, -16, 0], [-3.6, -17.2, 1], [-3.6, -18.4, 2], [-3.6, -19.6, 3],
];
function Erbe({ lingua }: { lingua: Lingua }) {
  const vaso = useMemo(() => new THREE.MeshLambertMaterial({ color: "#B0623A" }), []);
  return (
    <group>
      {POSTI_ERBE.map(([x, z, k], i) => {
        const e = ERBE[k];
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh material={vaso} position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.22, 0.44, 12]} />
            </mesh>
            <mesh position={[0, 0.44 + e.alto / 2, 0]} scale={[1, e.alto / 0.6, 1]} castShadow>
              <icosahedronGeometry args={[0.34, 1]} />
              <meshLambertMaterial color={e.foglia} flatShading />
            </mesh>
            {Array.from({ length: 7 }, (_, j) => {
              const a = j * 0.9 + i;
              return (
                <mesh key={j} position={[Math.cos(a) * 0.22, 0.44 + e.alto * (0.7 + (j % 3) * 0.15), Math.sin(a) * 0.22]}>
                  <sphereGeometry args={[0.035, 6, 4]} />
                  <meshLambertMaterial color={e.fiore} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {[0, 4].map((i) => (
        <Nome key={i} p={[POSTI_ERBE[i + 1][0], 0, POSTI_ERBE[i + 1][1]]} testo={lingua === "it" ? "Erbe aromatiche" : lingua === "en" ? "Aromatic herbs" : "Hierbas aromáticas"} sotto={ERBE.map((e) => e.nome[lingua]).join(" · ")} alto={1.7} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ tutto */

/** Le teste di moro sopra la casa: sul parapetto del corpo d'ingresso, ai due angoli verso l'aia. */
function TesteSullaCasa() {
  const t = CORPI.torretta;
  return (
    <group>
      <TestaDiMoro p={[t.x - t.l / 2 + 0.2, t.h + 0.45, t.z + t.p / 2 - 0.2]} />
      <TestaDiMoro p={[t.x + t.l / 2 - 0.2, t.h + 0.45, t.z + t.p / 2 - 0.2]} regina />
    </group>
  );
}

export default function Dettagli({ lingua }: { lingua: Lingua }) {
  return (
    <group>
      <Muretto />
      <Cancello />
      <TesteSullaCasa />
      <Cavedio />
      <Capanno />
      <PiscinaAttrezzata />
      <Frutteto lingua={lingua} />
      <SanPedro />
      <FichiIndia />
      <Erbe lingua={lingua} />
    </group>
  );
}
