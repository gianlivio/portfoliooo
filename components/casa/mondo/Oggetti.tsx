"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { smorza } from "./base";
import { ALTROVE, CORPI, PISCINA, PORTICO } from "@/content/casaLuoghi";

/*
 * Gli oggetti di Poly Haven (polyhaven.com, CC0), compressi con gltf-transform (meshopt, texture webp a 512 px)
 * e serviti da public/olio/scena/oggetti: il tavolo, la panca, la brocca, i vasi di terracotta, la pentola smaltata,
 * il secchio, la cassa di legno, i vassoi da semina, la scala, l'annaffiatoio, il tavolino con le sedie,
 * i cespugli, le ceste di vimini. Misure vere, in metri.
 */

const caricatore = new GLTFLoader();
caricatore.setMeshoptDecoder(MeshoptDecoder);
const modelli = new Map<string, Promise<THREE.Group>>();

function carica(nome: string) {
  let p = modelli.get(nome);
  if (!p) {
    p = caricatore.loadAsync(`/olio/scena/oggetti/${nome}.glb`).then((g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      return g.scene;
    });
    modelli.set(nome, p);
  }
  return p;
}

type Posto = { nome: string; p: [number, number, number]; r?: number; s?: number };

function Oggetto({ nome, p, r = 0, s = 1 }: Posto) {
  const [scena, setScena] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let vivo = true;
    carica(nome).then((g) => vivo && setScena(g.clone(true)));
    return () => {
      vivo = false;
    };
  }, [nome]);
  if (!scena) return null;
  return <primitive object={scena} position={p} rotation-y={r} scale={s} />;
}

/** Un gruppo di oggetti che compare (crescendo) solo in certe fasi di una zona. */
function InFase({ visibile, children }: { visibile: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const s = smorza(g.current.scale.x, visibile ? 1 : 0.001, 4, dt);
    g.current.scale.setScalar(s);
    g.current.visible = s > 0.01;
  });
  return (
    <group ref={g} scale={visibile ? 1 : 0.001}>
      {children}
    </group>
  );
}

const T = CORPI.torretta, B = CORPI.basso, AL = CORPI.alto;

/** Le cose fisse: il tavolo con le sedie sotto il grande albero dell'aia, i vasi di terracotta alle porte, la panca. */
const FISSI: Posto[] = [
  { nome: "outdoor_table_chair_set_01", p: [10.2, 0, -1.6], r: 0.3 },
  { nome: "planter_pot_clay", p: [T.x - 1.1, 0, T.z + T.p / 2 + 0.45] },
  { nome: "planter_pot_clay", p: [T.x + 1.1, 0, T.z + T.p / 2 + 0.45], r: 1.2 },
  { nome: "planter_pot_clay", p: [B.x + 2.1, 0, B.z + B.p / 2 + 0.45], r: 0.4 },
  { nome: "painted_wooden_bench", p: [AL.x + AL.l / 2 + 0.5, 0, AL.z + 1], r: -Math.PI / 2 },
  { nome: "jug_01", p: [10.2, 0.74, -1.6], r: 0.3 },
  // sotto il gazebo della piscina
  { nome: "outdoor_table_chair_set_01", p: [PISCINA.x + 0.4, 0, PISCINA.z - PISCINA.bordoP / 2 - 3.4], r: 0.8 },
  // sotto il porticato del cavedio: il tavolo, la panca
  { nome: "outdoor_table_chair_set_01", p: [(PORTICO.x0 + PORTICO.x1) / 2, 0.04, -31.6], r: Math.PI / 2 },
  { nome: "painted_wooden_bench", p: [PORTICO.x1 - 0.4, 0.04, -34.6], r: -Math.PI / 2 },
  { nome: "wooden_crate_01", p: [13.4, 0, -40.2], r: 0.3 },
];

/** A Chiaramonte: la scala e le ceste vicino al cassone, la cassa di legno (coordinate dell'area lontana). */
const A_CHIARAMONTE: Posto[] = [
  { nome: "wooden_ladder", p: [-0.4, 0, -37], r: 0.9, s: 1.6 },
  { nome: "wicker_basket_01", p: [2.6, 0, -36.4], r: 0.3 },
  { nome: "wicker_basket_01", p: [-2.2, 0, -40.6], r: 2.1 },
  { nome: "wooden_crate_01", p: [8.6, 0, -34.6], r: 0.4 },
  { nome: "wooden_bucket_01", p: [-11.2, 0, -41.2], r: 0.2 },
];

export default function Oggetti({ faseUliveto }: { faseUliveto: number }) {
  return (
    <group>
      {FISSI.map((o, i) => (
        <Oggetto key={i} {...o} />
      ))}
      {/* dietro casa, nella raccolta: le ceste sotto gli alberi */}
      <InFase visibile={faseUliveto === 3}>
        <Oggetto nome="wicker_basket_01" p={[-13.4, 0, -51.2]} r={0.3} />
        <Oggetto nome="wooden_ladder" p={[-17.8, 0, -51.6]} r={0.6} s={1.5} />
      </InFase>
      <group position={ALTROVE}>
        {A_CHIARAMONTE.map((o, i) => (
          <Oggetto key={i} {...o} />
        ))}
      </group>
    </group>
  );
}
