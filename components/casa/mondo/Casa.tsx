"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { albero, generatore, modello, posa, scatola, smorza, textura } from "./base";
import { AGRUMI, ALBERI_INTORNO, CORPI, CORTILE, GRANDI_ALBERI, PERIMETRO, PISCINA, POLLAIO, POZZO, type Corpo } from "@/content/casaLuoghi";
import { occupato } from "./Terreno";

/** Quanto dista un punto dal muretto a secco del perimetro. */
function dalMuretto(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < PERIMETRO.length - 1; i++) {
    const [ax, az] = PERIMETRO[i], [bx, bz] = PERIMETRO[i + 1];
    const dx = bx - ax, dz = bz - az;
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - (ax + k * dx), z - (az + k * dz)));
  }
  return d;
}

/*
 * La casa in campagna: i corpi bianchi a tetto piano, coi pannelli solari sul tetto del corpo alto; il cortile
 * interno col giardino e il pozzo; la piscina sul prato; l'agrumeto a file, con le sue fasi; il pollaio col recinto;
 * i grandi alberi attorno all'aia e gli ulivi dei vicini, presi dalla vista satellitare.
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

/* ------------------------------------------------------------------ la casa */

/** Finestra con le persiane aperte e il davanzale. ruota: verso cui guarda la facciata. */
function Finestra({ x, y, z, l = 1.0, a = 1.3, ruota = 0 }: { x: number; y: number; z: number; l?: number; a?: number; ruota?: number }) {
  return (
    <group position={[x, y, z]} rotation-y={ruota}>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[l, a, 0.1]} />
        <meshLambertMaterial color="#1F2422" />
      </mesh>
      <mesh position={[0, -a / 2 - 0.05, 0.08]} castShadow>
        <boxGeometry args={[l + 0.2, 0.08, 0.2]} />
        <meshLambertMaterial color="#E4DCCB" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (l / 2 + l / 4 + 0.02), 0, 0.1]} castShadow>
          <boxGeometry args={[l / 2, a, 0.04]} />
          <meshLambertMaterial color="#4E6B66" />
        </mesh>
      ))}
    </group>
  );
}

function Porta({ x, z, ruota = 0, l = 1.1, a = 2.25 }: { x: number; z: number; ruota?: number; l?: number; a?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={ruota}>
      <mesh position={[0, a / 2, 0.02]}>
        <boxGeometry args={[l, a, 0.1]} />
        <meshLambertMaterial color="#4E6B66" />
      </mesh>
      <mesh position={[0, a + 0.08, 0.06]}>
        <boxGeometry args={[l + 0.3, 0.14, 0.16]} />
        <meshLambertMaterial color="#E4DCCB" />
      </mesh>
    </group>
  );
}

/** Un corpo della casa: muri a calce, zoccolo, tetto piano col parapetto. */
function Volume({ c, muro }: { c: Corpo; muro: THREE.Material }) {
  const parapetto = 0.45;
  return (
    <group position={[c.x, 0, c.z]}>
      <mesh material={muro} position={[0, c.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[c.l, c.h, c.p]} />
      </mesh>
      {/* lo zoccolo grigio, dove la calce si sporca di terra */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[c.l + 0.04, 0.4, c.p + 0.04]} />
        <meshLambertMaterial color="#B9B1A2" />
      </mesh>
      {/* il parapetto del tetto piano */}
      {[
        [0, c.p / 2 - 0.1, c.l, 0.2],
        [0, -c.p / 2 + 0.1, c.l, 0.2],
        [c.l / 2 - 0.1, 0, 0.2, c.p],
        [-c.l / 2 + 0.1, 0, 0.2, c.p],
      ].map(([x, z, l, p], i) => (
        <mesh key={i} material={muro} position={[x, c.h + parapetto / 2, z]} castShadow>
          <boxGeometry args={[l, parapetto, p]} />
        </mesh>
      ))}
      <mesh position={[0, c.h + 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[c.l - 0.4, c.p - 0.4]} />
        <meshLambertMaterial color="#C9C2B6" />
      </mesh>
    </group>
  );
}

/** I pannelli solari sul tetto del corpo alto: due file, inclinati verso il sole. */
function Pannelli() {
  const c = CORPI.alto;
  const tela = useMemo(() => {
    const k = document.createElement("canvas");
    k.width = 64;
    k.height = 108;
    const x = k.getContext("2d") as CanvasRenderingContext2D;
    x.fillStyle = "#1B2A44";
    x.fillRect(0, 0, 64, 108);
    x.strokeStyle = "#8C9AB2";
    x.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      x.beginPath();
      x.moveTo(0, i * 18);
      x.lineTo(64, i * 18);
      x.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      x.beginPath();
      x.moveTo(i * 16, 0);
      x.lineTo(i * 16, 108);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(k);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const posti = useMemo(() => {
    const out: [number, number][] = [];
    for (let fila = 0; fila < 2; fila++) for (let i = 0; i < 6; i++) out.push([-3.1 + i * 1.24, -2.2 + fila * 2.6]);
    return out;
  }, []);
  return (
    <group position={[c.x, c.h + 0.1, c.z]} rotation-y={-0.35}>
      {posti.map(([x, z], i) => (
        <group key={i} position={[x, 0.45, z]} rotation-x={-0.42}>
          <mesh castShadow>
            <boxGeometry args={[1.08, 0.05, 1.8]} />
            <meshStandardMaterial color="#C9CDD2" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1.02, 1.74]} />
            <meshStandardMaterial map={tela} metalness={0.3} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Il pozzo nel cortile: la vera di pietra, l'arco di ferro con la carrucola, il secchio. */
function Pozzo() {
  const pietra = usePietra(0.8);
  const ferro = useMemo(() => new THREE.MeshLambertMaterial({ color: "#2E2C2A" }), []);
  const secchio = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (secchio.current) secchio.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.05;
  });
  return (
    <group position={POZZO}>
      <mesh material={pietra} position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.92, 0.9, 20, 1, true]} />
      </mesh>
      <mesh material={pietra} position={[0, 0.92, 0]} rotation-x={-Math.PI / 2} castShadow>
        <ringGeometry args={[0.62, 0.9, 20]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.62, 20]} />
        <meshBasicMaterial color="#0C0F10" />
      </mesh>
      {/* l'arco di ferro */}
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} material={ferro} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.06, 1.3, 0.06]} />
        </mesh>
      ))}
      <mesh material={ferro} position={[0, 2.15, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.82, 0.03, 6, 20, Math.PI]} />
      </mesh>
      <mesh material={ferro} position={[0, 2.62, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 14]} />
      </mesh>
      <group ref={secchio} position={[0, 2.5, 0]}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 1.0, 4]} />
          <meshLambertMaterial color="#A89A7A" />
        </mesh>
        <mesh position={[0, -1.1, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.26, 12]} />
          <meshStandardMaterial color="#8A8E90" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Cortile({ muro }: { muro: THREE.Material }) {
  const c = CORTILE;
  const x0 = c.x - c.l / 2, x1 = c.x + c.l / 2, z1 = c.z + c.p / 2;
  return (
    <group>
      {/* il giardino */}
      <mesh rotation-x={-Math.PI / 2} position={[c.x, 0.04, c.z]} receiveShadow>
        <planeGeometry args={[c.l, c.p]} />
        <meshLambertMaterial color="#6E8A48" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[POZZO[0], 0.05, POZZO[2]]} receiveShadow>
        <circleGeometry args={[1.7, 24]} />
        <meshLambertMaterial color="#CFC4B0" />
      </mesh>
      {/* il muro basso verso l'aia, col varco; quello alto a est */}
      <mesh material={muro} position={[(x0 + POZZO[0] - 1.6) / 2, 0.3, z1]} castShadow>
        <boxGeometry args={[POZZO[0] - 1.6 - x0, 0.6, 0.3]} />
      </mesh>
      <mesh material={muro} position={[(POZZO[0] + 1.6 + x1) / 2, 0.3, z1]} castShadow>
        <boxGeometry args={[x1 - POZZO[0] - 1.6, 0.6, 0.3]} />
      </mesh>
      <mesh material={muro} position={[x1, 1.1, c.z]} castShadow>
        <boxGeometry args={[0.3, 2.2, c.p]} />
      </mesh>
      <Pozzo />
    </group>
  );
}

function Casa() {
  const muro = useMemo(() => new THREE.MeshLambertMaterial({ color: "#F2EDE3" }), []);
  const { alto, ala, basso, torretta } = CORPI;
  return (
    <group>
      {Object.values(CORPI).map((c, i) => (
        <Volume key={i} c={c} muro={muro} />
      ))}
      <Pannelli />
      <Cortile muro={muro} />
      {/* finestre e porte verso l'aia (+z) e verso est (+x) */}
      <Porta x={basso.x + 1.2} z={basso.z + basso.p / 2} />
      <Finestra x={basso.x - 1.8} y={1.6} z={basso.z + basso.p / 2} />
      <Porta x={torretta.x} z={torretta.z + torretta.p / 2} l={1.2} />
      <Finestra x={alto.x + 2.2} y={1.6} z={alto.z + alto.p / 2} />
      <Finestra x={alto.x + 2.2} y={4.6} z={alto.z + alto.p / 2} />
      <Finestra x={alto.x - 2} y={4.6} z={alto.z + alto.p / 2} />
      <Finestra x={alto.x + alto.l / 2} y={1.6} z={alto.z + 2.5} ruota={Math.PI / 2} />
      <Finestra x={alto.x + alto.l / 2} y={4.6} z={alto.z + 2.5} ruota={Math.PI / 2} />
      <Finestra x={alto.x + alto.l / 2} y={4.6} z={alto.z - 2.5} ruota={Math.PI / 2} />
      <Porta x={alto.x + alto.l / 2} z={alto.z - 2.5} ruota={Math.PI / 2} />
      <Finestra x={ala.x - ala.l / 2} y={1.6} z={ala.z} ruota={-Math.PI / 2} />
      <Finestra x={basso.x - basso.l / 2} y={1.6} z={basso.z - 1.5} ruota={-Math.PI / 2} />
      <Finestra x={ala.x + 1} y={1.6} z={ala.z - ala.p / 2} ruota={Math.PI} />
      <Finestra x={alto.x} y={4.6} z={alto.z - alto.p / 2} ruota={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ la piscina */

function Piscina() {
  const p = PISCINA;
  const bordo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-p.bordoL / 2, -p.bordoP / 2);
    s.lineTo(p.bordoL / 2, -p.bordoP / 2);
    s.lineTo(p.bordoL / 2, p.bordoP / 2);
    s.lineTo(-p.bordoL / 2, p.bordoP / 2);
    s.closePath();
    const buco = new THREE.Path();
    buco.absellipse(0, 0, p.l / 2, p.p / 2, 0, Math.PI * 2, true, 0);
    s.holes.push(buco);
    return new THREE.ShapeGeometry(s, 48);
  }, [p]);
  const acqua = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (acqua.current) acqua.current.color.setHSL(0.53, 0.55, 0.5 + Math.sin(clock.elapsedTime * 0.8) * 0.025);
  });
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh geometry={bordo} rotation-x={-Math.PI / 2} position={[0, 0.11, 0]} receiveShadow>
        <meshLambertMaterial color="#E9E3D6" />
      </mesh>
      {/* la vasca: le pareti chiare e l'acqua appena sotto il bordo */}
      <mesh position={[0, -0.2, 0]} scale={[p.l / 2, 1, p.p / 2]}>
        <cylinderGeometry args={[1, 1, 0.58, 48, 1, true]} />
        <meshLambertMaterial color="#8FD0DE" side={THREE.BackSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.075, 0]} scale={[p.l / 2, p.p / 2, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial ref={acqua} color="#3FA7C4" roughness={0.08} metalness={0.1} transparent opacity={0.92} />
      </mesh>
      {/* la scaletta */}
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.45, -p.p / 2 + 0.05]}>
          <torusGeometry args={[0.22, 0.025, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#D8DCDE" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ l'agrumeto */

/**
 * Gli agrumi a file: chiome tonde e fitte, fino quasi a terra. Fasi (0–2): la zagara, i frutti verdi,
 * i frutti maturi (arance, e qualche limone).
 */
function Agrumeto({ fase }: { fase: number }) {
  const chioma = useMemo(() => {
    const caso = generatore(31);
    const g = new THREE.IcosahedronGeometry(1.25, 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).multiplyScalar(0.9 + caso() * 0.18);
      pos.setXYZ(i, v.x, v.y * 0.92 + 1.55, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const tronco = useMemo(() => new THREE.CylinderGeometry(0.09, 0.13, 0.9, 7).translate(0, 0.45, 0), []);
  const alberi = useMemo(() => {
    const caso = generatore(17);
    return AGRUMI.map(([x, z]) => {
      const s = 0.85 + caso() * 0.25;
      return { x, z, s, m: posa(x, 0, z, caso() * 6.28, s) };
    });
  }, []);
  const frutti = useMemo(() => {
    const caso = generatore(23);
    const out: { p: THREE.Vector3; limone: boolean }[] = [];
    alberi.forEach((a, i) => {
      const limone = i % 4 === 3;
      for (let k = 0; k < 30; k++) {
        const d = new THREE.Vector3(caso() - 0.5, caso() * 0.9 - 0.3, caso() - 0.5).normalize();
        const p = d.multiplyScalar(1.2).add(new THREE.Vector3(0, 1.55, 0)).applyMatrix4(a.m);
        out.push({ p, limone });
      }
    });
    return out;
  }, [alberi]);
  const legno = useRef<THREE.InstancedMesh>(null), foglie = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    alberi.forEach((a, i) => {
      legno.current?.setMatrixAt(i, a.m);
      foglie.current?.setMatrixAt(i, a.m);
    });
    if (legno.current) legno.current.instanceMatrix.needsUpdate = true;
    if (foglie.current) foglie.current.instanceMatrix.needsUpdate = true;
  }, [alberi]);
  const fr = useRef<THREE.InstancedMesh>(null), fi = useRef<THREE.InstancedMesh>(null);
  const stato = useRef({ fiori: -1, frutti: -1, maturi: -1 });
  const colori = useMemo(() => ({ verde: new THREE.Color("#6E8F2E"), arancia: new THREE.Color("#F08A1C"), limone: new THREE.Color("#F2D23A"), c: new THREE.Color() }), []);
  useFrame((_, dt) => {
    const s = stato.current;
    const o = { fiori: fase === 0 ? 1 : 0, frutti: fase === 0 ? 0 : fase === 1 ? 0.62 : 1, maturi: fase === 2 ? 1 : 0 };
    const prima = { ...s };
    s.fiori = s.fiori < 0 ? o.fiori : smorza(s.fiori, o.fiori, 2.5, dt);
    s.frutti = s.frutti < 0 ? o.frutti : smorza(s.frutti, o.frutti, 2.5, dt);
    s.maturi = s.maturi < 0 ? o.maturi : smorza(s.maturi, o.maturi, 2, dt);
    if (prima.fiori >= 0 && Math.abs(prima.fiori - s.fiori) + Math.abs(prima.frutti - s.frutti) + Math.abs(prima.maturi - s.maturi) < 1e-5) return;
    const m = new THREE.Matrix4();
    frutti.forEach((f, i) => {
      const k = s.frutti;
      m.makeScale(k, k * (f.limone ? 1.25 : 1), k).setPosition(f.p);
      fr.current?.setMatrixAt(i, m);
      colori.c.copy(colori.verde).lerp(f.limone ? colori.limone : colori.arancia, s.maturi);
      fr.current?.setColorAt(i, colori.c);
      m.makeScale(s.fiori, s.fiori, s.fiori).setPosition(f.p.x, f.p.y + 0.04, f.p.z);
      fi.current?.setMatrixAt(i, m);
    });
    if (fr.current) {
      fr.current.instanceMatrix.needsUpdate = true;
      if (fr.current.instanceColor) fr.current.instanceColor.needsUpdate = true;
    }
    if (fi.current) fi.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={legno} args={[tronco, undefined, alberi.length]} castShadow frustumCulled={false}>
        <meshLambertMaterial color="#5E4A38" />
      </instancedMesh>
      <instancedMesh ref={foglie} args={[chioma, undefined, alberi.length]} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial color="#35562C" flatShading />
      </instancedMesh>
      <instancedMesh ref={fr} args={[undefined, undefined, frutti.length]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial roughness={0.55} color="#FFFFFF" />
      </instancedMesh>
      <instancedMesh ref={fi} args={[undefined, undefined, frutti.length]} frustumCulled={false}>
        <icosahedronGeometry args={[0.075, 0]} />
        <meshLambertMaterial color="#FBF7EA" emissive="#3A3628" />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ il pollaio */

function texturaRete() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.strokeStyle = "rgba(200,205,200,0.85)";
  x.lineWidth = 1.5;
  for (let i = -64; i <= 128; i += 12) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 64, 64);
    x.moveTo(i + 64, 0);
    x.lineTo(i, 64);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** La casetta delle galline, il recinto di rete coi pali di legno, la mangiatoia e l'abbeveratoio. */
function Pollaio() {
  const p = POLLAIO;
  const rete = useMemo(() => texturaRete(), []);
  const lati = useMemo(() => {
    const x0 = p.x - p.l / 2, x1 = p.x + p.l / 2, z0 = p.z - p.p / 2, z1 = p.z + p.p / 2;
    // il varco sul lato ovest, da dove arriva il sentiero
    return [
      [x0, z0, x1, z0],
      [x0, z1, x1, z1],
      [x1, z0, x1, z1],
      [x0, z0, x0, p.z - 0.7],
      [x0, p.z + 0.7, x0, z1],
    ] as [number, number, number, number][];
  }, [p]);
  const legno = useMemo(() => new THREE.MeshLambertMaterial({ color: "#7A5A3C" }), []);
  return (
    <group>
      {lati.map(([a, b, c, d], i) => {
        const l = Math.hypot(c - a, d - b);
        const t = rete.clone();
        t.repeat.set(l / 0.6, 1.4 / 0.6);
        t.needsUpdate = true;
        return (
          <group key={i}>
            <mesh position={[(a + c) / 2, 0.7, (b + d) / 2]} rotation-y={-Math.atan2(d - b, c - a)}>
              <planeGeometry args={[l, 1.4]} />
              <meshBasicMaterial map={t} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {Array.from({ length: Math.max(2, Math.round(l / 1.8) + 1) }, (_, k) => {
              const u = k / Math.max(1, Math.round(l / 1.8));
              return (
                <mesh key={k} material={legno} position={[a + (c - a) * u, 0.75, b + (d - b) * u]} castShadow>
                  <boxGeometry args={[0.08, 1.5, 0.08]} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {/* la casetta, nell'angolo in fondo */}
      <group position={[p.x + p.l / 2 - 1.7, 0, p.z - p.p / 2 + 1.4]}>
        <mesh material={legno} position={[0, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.7, 2]} />
        </mesh>
        <mesh position={[0, 1.9, 0.1]} rotation-x={0.18} castShadow>
          <boxGeometry args={[3, 0.06, 2.6]} />
          <meshStandardMaterial color="#9AA0A2" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0.5, 0.4, 1.01]}>
          <planeGeometry args={[0.5, 0.55]} />
          <meshBasicMaterial color="#1A1410" />
        </mesh>
        <mesh material={legno} position={[0.5, 0.15, 1.45]} rotation-x={0.55}>
          <boxGeometry args={[0.45, 0.04, 1.0]} />
        </mesh>
      </group>
      {/* la mangiatoia e l'abbeveratoio */}
      <mesh position={[p.x + 1.4, 0.18, p.z + 1.6]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.36, 14]} />
        <meshStandardMaterial color="#B23A2A" roughness={0.6} />
      </mesh>
      <mesh position={[p.x - 0.6, 0.08, p.z + 2.2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
        <meshStandardMaterial color="#8C9396" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ gli alberi attorno */

/** I grandi alberi attorno all'aia e al prato, e gli ulivi dei vicini tutto intorno. */
function Alberi() {
  const grande = useMemo(() => albero(901, 1.25, 0.7), []);
  const ulivo = useMemo(() => albero(4242, 1, 0.62), []);
  const corteccia = useMemo(() => textura("corteccia-colore.webp", true, [2, 2]), []);
  const grandi = useMemo(() => GRANDI_ALBERI.map(([x, z, s], i) => posa(x, 0, z, generatore(11 + i * 13)() * 6.28, [s * 2.3, s * 1.9, s * 2.3])), []);
  const intorno = useMemo(() => {
    const caso = generatore(707);
    return ALBERI_INTORNO.filter(([x, z]) => dalMuretto(x, z) > 1.8 && !occupato(x, z)).map(([x, z, r]) => {
      const s = THREE.MathUtils.clamp(0.8 + r * 0.62, 1.1, 2.3);
      return posa(x, 0, z, caso() * 6.28, [s * 1.05, s, s * 1.05]);
    });
  }, []);
  const riempi = (lista: THREE.Matrix4[]) => (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    lista.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[grande.legnoGeo, undefined, grandi.length]} ref={riempi(grandi)} castShadow frustumCulled={false}>
        <meshLambertMaterial map={corteccia} color="#8C7B6A" />
      </instancedMesh>
      <instancedMesh args={[grande.frondeGeo, undefined, grandi.length]} ref={riempi(grandi)} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial color="#3E5A2A" flatShading />
      </instancedMesh>
      <instancedMesh args={[ulivo.legnoGeo, undefined, intorno.length]} ref={riempi(intorno)} castShadow frustumCulled={false}>
        <meshLambertMaterial map={corteccia} color="#9A8E80" />
      </instancedMesh>
      <instancedMesh args={[ulivo.frondeGeo, undefined, intorno.length]} ref={riempi(intorno)} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial color="#6E8256" flatShading />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ le cose dell'aia */

function Cose() {
  const [cassetta, setCassetta] = useState<{ geometria: THREE.BufferGeometry; materiale: THREE.Material } | null>(null);
  useEffect(() => {
    let vivo = true;
    modello("cassetta.glb", 0.3).then((m) => vivo && setCassetta(m));
    return () => {
      vivo = false;
    };
  }, []);
  const pile = useMemo(() => {
    const m: THREE.Matrix4[] = [];
    for (let k = 0; k < 4; k++) m.push(posa(-4.6, k * 0.3, -9.6, 0.05 * k, 1));
    for (let k = 0; k < 3; k++) m.push(posa(-3.9, k * 0.3, -9.9, 0.3 + 0.04 * k, 1));
    return m;
  }, []);
  return cassetta ? (
    <instancedMesh
      args={[cassetta.geometria, cassetta.materiale, pile.length]}
      ref={(m) => {
        if (!m) return;
        pile.forEach((mt, i) => m.setMatrixAt(i, mt));
        m.instanceMatrix.needsUpdate = true;
      }}
      castShadow
      frustumCulled={false}
    />
  ) : null;
}

/** Il muretto di pietra fra l'aia e la strada, accanto all'agrumeto. */
function Muretto() {
  const pietra = usePietra(1);
  const g = useMemo(() => scatola(10, 0.7, 0.5, 1.6), []);
  return <mesh geometry={g} material={pietra} position={[7.5, 0.35, 6.4]} castShadow receiveShadow />;
}

export default function CasaInCampagna({ faseAgrumeto }: { faseAgrumeto: number }) {
  return (
    <group>
      <Casa />
      <Piscina />
      <Agrumeto fase={faseAgrumeto} />
      <Pollaio />
      <Alberi />
      <Cose />
      <Muretto />
    </group>
  );
}
