"use client";

import * as THREE from "three";
import { forwardRef, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { generatore, pillola } from "./base";
import { ALTROVE } from "@/content/casaLuoghi";
import { TESTI } from "@/content/casa";
import type { Lingua } from "@/dictionaries";

/*
 * Il mezzo per andare agli uliveti di Chiaramonte: il trattore col rimorchio a panche. Guarda verso −z, come la camera a riposo;
 * dove sta e come si muove lo decide la regia della scena. Si clicca per partire: dalla fattoria verso
 * gli uliveti, dagli uliveti verso la fattoria. Sopra, un'etichetta che dice dove porta.
 */

const lontano = (z: number) => z < ALTROVE[2] / 2;

const Furgone = forwardRef<
  THREE.Group,
  { position?: [number, number, number]; rotation?: [number, number, number]; lingua: Lingua; onClic: (lontano: boolean) => void }
>(function Furgone({ position, rotation, lingua, onClic }, ref) {
  const andata = useMemo(() => pillola(TESTI.trattoreVa[lingua], TESTI.sali[lingua]), [lingua]);
  const ritorno = useMemo(() => pillola(TESTI.trattoreTorna[lingua], TESTI.sali[lingua]), [lingua]);
  const a = useRef<THREE.Sprite>(null), r = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const qui = lontano(camera.position.z);
    if (a.current) a.current.visible = !qui;
    if (r.current) r.current.visible = qui;
    const y = 3.5 + Math.sin(clock.elapsedTime * 1.6) * 0.1;
    a.current?.position.setY(y);
    r.current?.position.setY(y);
  });
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    onClic(lontano(camera.position.z));
  };
  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onClick={clic}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {/* il trattore ha il muso verso +x: girato di un quarto, guarda verso −z */}
      <group rotation-y={Math.PI / 2}>
        <Trattore panche />
      </group>
      <sprite ref={a} position={[0, 3.5, 1.2]} scale={[0.62 * andata.rapporto, 0.62, 1]} renderOrder={20}>
        <spriteMaterial map={andata.texture} transparent depthTest={false} depthWrite={false} />
      </sprite>
      <sprite ref={r} position={[0, 3.5, 1.2]} scale={[0.62 * ritorno.rapporto, 0.62, 1]} renderOrder={20}>
        <spriteMaterial map={ritorno.texture} transparent depthTest={false} depthWrite={false} />
      </sprite>
      {/* un volume invisibile, più facile da cliccare */}
      <mesh position={[0, 1.3, 1.2]} visible={false}>
        <boxGeometry args={[2.4, 2.6, 5.2]} />
      </mesh>
    </group>
  );
});

export default Furgone;

/** Il cartello di legno accanto al trattore, nello spiazzale: anche questo si clicca per partire. */
export function Cartello({ p, verso, lingua, onClic }: { p: [number, number, number]; verso: number; lingua: Lingua; onClic: () => void }) {
  const tela = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 560;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    x.fillStyle = "#E9DCC2";
    x.fillRect(0, 0, 1024, 560);
    x.strokeStyle = "#7A5A3A";
    x.lineWidth = 18;
    x.strokeRect(14, 14, 996, 532);
    x.fillStyle = "#2A2016";
    x.textAlign = "center";
    x.font = "400 84px Newsreader, Georgia, serif";
    x.fillText(TESTI.cartello1[lingua], 512, 170);
    x.fillText(TESTI.cartello2[lingua], 512, 290);
    x.fillStyle = "#183F35";
    x.font = "500 46px 'IBM Plex Mono', monospace";
    x.fillText(TESTI.sali[lingua].toUpperCase() + "  →", 512, 430);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [lingua]);
  return (
    <group
      position={p}
      rotation-y={verso}
      onClick={(e) => {
        if (e.delta > 8) return;
        e.stopPropagation();
        onClic();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.95, -0.02]} castShadow>
          <boxGeometry args={[0.1, 1.9, 0.1]} />
          <meshLambertMaterial color="#6A4A31" />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0.04]} castShadow>
        <boxGeometry args={[1.9, 1.06, 0.06]} />
        <meshLambertMaterial color="#7A5A3A" />
      </mesh>
      <mesh position={[0, 1.55, 0.075]}>
        <planeGeometry args={[1.78, 0.97]} />
        <meshLambertMaterial map={tela} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ il trattore */

function Ruota({ r, l, x, z }: { r: number; l: number; x: number; z: number }) {
  return (
    <group position={[x, r, z]} rotation-x={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, l, 18]} />
        <meshLambertMaterial color="#1B1B1B" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r * 0.55, r * 0.55, l + 0.02, 12]} />
        <meshLambertMaterial color="#C9A23A" />
      </mesh>
    </group>
  );
}

/** Il trattore: il muso verso +x. Col rimorchio delle pannocchie (carico) o con le panche per i visitatori. */
export function Trattore({ carico = false, seminatrice = false, panche = false }: { carico?: boolean; seminatrice?: boolean; panche?: boolean }) {
  const rosso = "#B3322A";
  const pannocchie = useMemo(() => {
    const caso = generatore(19);
    return Array.from({ length: 70 }, () => ({
      p: [-3.2 + caso() * 2.2, 1.15 + caso() * 0.35, -0.6 + caso() * 1.2] as [number, number, number],
      r: [caso() * 3, caso() * 3, caso() * 3] as [number, number, number],
    }));
  }, []);
  return (
    <group>
      {/* corpo: il muso va verso +x */}
      <mesh position={[0.9, 0.95, 0]} castShadow>
        <boxGeometry args={[1.7, 0.7, 0.8]} />
        <meshLambertMaterial color={rosso} />
      </mesh>
      <mesh position={[-0.2, 1.05, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 1.1]} />
        <meshLambertMaterial color={rosso} />
      </mesh>
      <mesh position={[-0.25, 1.55, 0]} castShadow>
        <boxGeometry args={[0.6, 0.12, 0.6]} />
        <meshLambertMaterial color="#2A2A2A" />
      </mesh>
      {/* il roll-bar */}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[-0.55, 1.9, z]}>
          <boxGeometry args={[0.06, 1.3, 0.06]} />
          <meshLambertMaterial color="#2A2A2A" />
        </mesh>
      ))}
      <mesh position={[-0.55, 2.55, 0]}>
        <boxGeometry args={[0.06, 0.06, 1.16]} />
        <meshLambertMaterial color="#2A2A2A" />
      </mesh>
      {/* il tubo di scarico */}
      <mesh position={[1.35, 1.6, 0.25]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
        <meshLambertMaterial color="#2A2A2A" />
      </mesh>
      <Ruota r={0.72} l={0.42} x={-0.35} z={0.72} />
      <Ruota r={0.72} l={0.42} x={-0.35} z={-0.72} />
      <Ruota r={0.4} l={0.25} x={1.45} z={0.55} />
      <Ruota r={0.4} l={0.25} x={1.45} z={-0.55} />
      {seminatrice && (
        <group position={[-1.5, 0, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.5, 0.25, 3.0]} />
            <meshLambertMaterial color="#2F6A9A" />
          </mesh>
          {[-1.1, -0.37, 0.37, 1.1].map((z) => (
            <group key={z}>
              <mesh position={[0, 0.85, z]} castShadow>
                <cylinderGeometry args={[0.2, 0.14, 0.4, 10]} />
                <meshLambertMaterial color="#2F6A9A" />
              </mesh>
              <mesh position={[0, 0.2, z]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 12]} />
                <meshLambertMaterial color="#333" />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {(carico || panche) && (
        <group>
          {/* il rimorchio */}
          <mesh position={[-2.1, 0.95, 0]} castShadow>
            <boxGeometry args={[2.6, 0.12, 1.6]} />
            <meshLambertMaterial color="#6E7A42" />
          </mesh>
          {[-0.8, 0.8].map((z) => (
            <mesh key={z} position={[-2.1, 1.25, z]}>
              <boxGeometry args={[2.6, 0.5, 0.06]} />
              <meshLambertMaterial color="#6E7A42" />
            </mesh>
          ))}
          <mesh position={[-3.4, 1.25, 0]}>
            <boxGeometry args={[0.06, 0.5, 1.6]} />
            <meshLambertMaterial color="#6E7A42" />
          </mesh>
          <Ruota r={0.42} l={0.25} x={-2.1} z={0.85} />
          <Ruota r={0.42} l={0.25} x={-2.1} z={-0.85} />
          {panche &&
            [-0.5, 0.5].map((z) => (
              <group key={`p${z}`}>
                <mesh position={[-2.1, 1.25, z]} castShadow>
                  <boxGeometry args={[2.3, 0.07, 0.36]} />
                  <meshLambertMaterial color="#9A6E46" />
                </mesh>
                <mesh position={[-2.1, 1.55, z * 1.5]} castShadow>
                  <boxGeometry args={[2.3, 0.4, 0.05]} />
                  <meshLambertMaterial color="#8A6040" />
                </mesh>
              </group>
            ))}
          {carico && pannocchie.map((p, i) => (
            <mesh key={i} position={p.p} rotation={p.r} castShadow>
              <cylinderGeometry args={[0.045, 0.035, 0.24, 7]} />
              <meshLambertMaterial color={i % 5 === 0 ? "#E0B640" : "#EFC64A"} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}


/**
 * Il cassone: il pickup bianco con le cassette verdi piene di olive, come nel video del carico.
 * Il muso verso +x.
 */
export function Cassone({ p, r }: { p: [number, number, number]; r: number }) {
  const bianco = "#E8E6E0";
  const olive = useMemo(() => {
    const caso = generatore(41);
    return Array.from({ length: 6 }, (_, i) => ({ x: -1.95 + (i % 3) * 0.56, z: i < 3 ? -0.36 : 0.36, h: caso() * 0.06 }));
  }, []);
  return (
    <group position={p} rotation-y={r}>
      <mesh position={[0.95, 0.85, 0]} castShadow>
        <boxGeometry args={[1.5, 0.6, 1.62]} />
        <meshLambertMaterial color={bianco} />
      </mesh>
      <mesh position={[0.55, 1.42, 0]} castShadow>
        <boxGeometry args={[1.1, 0.62, 1.55]} />
        <meshLambertMaterial color={bianco} />
      </mesh>
      {/* i vetri */}
      <mesh position={[1.11, 1.42, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.4, 0.48]} />
        <meshStandardMaterial color="#2C3A44" roughness={0.1} metalness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.55, 1.45, s * 0.78]} rotation-y={s > 0 ? 0 : Math.PI}>
          <planeGeometry args={[0.9, 0.42]} />
          <meshStandardMaterial color="#2C3A44" roughness={0.1} metalness={0.4} />
        </mesh>
      ))}
      {/* il cassone dietro, aperto */}
      <mesh position={[-1.4, 0.62, 0]} castShadow>
        <boxGeometry args={[2.3, 0.12, 1.62]} />
        <meshLambertMaterial color={bianco} />
      </mesh>
      {[-0.78, 0.78].map((z) => (
        <mesh key={z} position={[-1.4, 0.88, z]}>
          <boxGeometry args={[2.3, 0.42, 0.06]} />
          <meshLambertMaterial color={bianco} />
        </mesh>
      ))}
      {/* le cassette verdi piene */}
      {olive.map((o, i) => (
        <group key={i} position={[o.x, 0.88, o.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.36, 0.66]} />
            <meshLambertMaterial color="#2F7A3A" />
          </mesh>
          <mesh position={[0, 0.19 + o.h, 0]}>
            <boxGeometry args={[0.48, 0.06, 0.62]} />
            <meshStandardMaterial color="#7C8C36" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Ruota r={0.36} l={0.22} x={1.1} z={0.78} />
      <Ruota r={0.36} l={0.22} x={1.1} z={-0.78} />
      <Ruota r={0.36} l={0.22} x={-1.7} z={0.78} />
      <Ruota r={0.36} l={0.22} x={-1.7} z={-0.78} />
    </group>
  );
}
