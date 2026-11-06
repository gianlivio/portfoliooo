"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AGRUMETO, CAVEDIO, CORTILE, PISCINA, POLLAIO, altrove, type P3 } from "@/content/casaLuoghi";
import { TESTI, zona } from "@/content/casa";
import type { Lingua } from "@/dictionaries";

/*
 * Le indicazioni per chi cammina, come nei videogiochi: briciole dorate a terra lungo i sentieri (un'onda di luce
 * le percorre verso la meta), cartelli segnavia agli incroci, anelli dorati sugli ingressi dei luoghi.
 * Le briciole e gli anelli si vedono solo camminando; i cartelli sempre.
 */

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const VA = (x: number, z: number) => new THREE.Vector3(...altrove([x, 0, z]));

/** I sentieri guidati, dal punto di partenza alla meta. */
const SENTIERI: THREE.Vector3[][] = [
  // dalla strada all'aia
  [V(-7.1, 44), V(-7.3, 22), V(-4.6, 13), V(-2.2, 6), V(0, 1)],
  // dalla strada dentro l'agrumeto, fra le file
  [V(-6.8, 24), V(-3.6, 22.4), V(AGRUMETO.x0 + 2.6, 21.6), V(AGRUMETO.x1 - 1, 21.6)],
  // dalla strada alla piscina, attraverso il varco nella siepe
  [V(-7.4, 21.4), V(-10.2, 21.2), V(-14.6, 18.6), V(PISCINA.x + 3.4, PISCINA.z + 2)],
  // dall'aia al pozzo, nel cortile
  [V(1.5, -1.5), V(7, -7), V(CORTILE.x - 0.4, CORTILE.z + CORTILE.p / 2 + 1), V(CORTILE.x - 0.4, CORTILE.z + 1.4)],
  // dall'aia al cavedio, dentro dal varco
  [V(0, 0), V(-5.6, -6), V(-8.6, -16), V(CAVEDIO.varco, CAVEDIO.z1 + 1.4), V(CAVEDIO.varco, CAVEDIO.z1 - 2.4)],
  // dal varco del cavedio, girando attorno, alle galline dietro casa
  [V(CAVEDIO.varco, CAVEDIO.z1 + 1.4), V(-17.6, CAVEDIO.z1 + 1.2), V(-18, CAVEDIO.z0 - 1.8), V(-6, CAVEDIO.z0 - 3.6), V(POLLAIO.x - POLLAIO.l / 2 - 0.6, POLLAIO.z)],
  // e all'uliveto
  [V(-18, CAVEDIO.z0 - 1.8), V(-19.6, -46), V(-17, -53)],
  // dall'aia al trattore
  [V(0.8, 0.6), V(-2.4, 1.2), V(-3.6, 0.6)],
  // a Chiaramonte: dal trattore alla raccolta, poi al frantoio
  [VA(13.5, -20), VA(14, -24), VA(10, -30), VA(4, -35.5)],
  [VA(4, -35.5), VA(-4, -39), VA(-11, -40), VA(-14, -41.5)],
];

/** Gli ingressi: dove si entra nei luoghi. */
const INGRESSI: P3[] = [
  [0, 0, 1],
  [AGRUMETO.x0 + 2.6, 0, 21.6],
  [-14.6, 0, 18.6],
  [CORTILE.x - 0.4, 0, CORTILE.z + CORTILE.p / 2 + 0.8],
  [CAVEDIO.varco, 0, CAVEDIO.z1 + 0.6],
  [POLLAIO.x - POLLAIO.l / 2 - 0.6, 0, POLLAIO.z],
  [-17, 0, -53],
  [-3.6, 0, 0.6],
  altrove([-14, 0, -42]),
  altrove([4, 0, -35.5]),
];

function Briciole({ visibile }: { visibile: boolean }) {
  const punti = useMemo(() => {
    const out: { p: THREE.Vector3; d: number }[] = [];
    for (const s of SENTIERI) {
      const curva = new THREE.CatmullRomCurve3(s, false, "catmullrom", 0.2);
      const L = curva.getLength();
      const n = Math.max(2, Math.floor(L / 1.6));
      for (let i = 0; i <= n; i++) out.push({ p: curva.getPointAt(i / n).setY(0.07), d: (i / n) * L });
    }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const vis = useRef(0);
  useFrame(({ clock }, dt) => {
    const m = ref.current;
    if (!m) return;
    vis.current += ((visibile ? 1 : 0) - vis.current) * (1 - Math.exp(-4 * dt));
    m.visible = vis.current > 0.02;
    if (!m.visible) return;
    const t = clock.elapsedTime;
    const mt = new THREE.Matrix4();
    punti.forEach((b, i) => {
      // un'onda che corre verso la meta
      const onda = 0.75 + 0.45 * Math.max(0, Math.sin(b.d * 0.55 - t * 4.5)) ** 3;
      const s = onda * vis.current;
      mt.makeScale(s, 1, s).setPosition(b.p);
      m.setMatrixAt(i, mt);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, punti.length]} frustumCulled={false} renderOrder={1}>
      <cylinderGeometry args={[0.16, 0.16, 0.02, 14]} />
      <meshBasicMaterial color="#F2D46A" transparent opacity={0.92} depthWrite={false} />
    </instancedMesh>
  );
}

function Anello({ p, visibile }: { p: P3; visibile: boolean }) {
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    [a.current, b.current].forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.5 + i * 0.5) % 1;
      m.scale.setScalar(0.7 + k * 1.1);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
      m.visible = visibile;
    });
  });
  return (
    <group position={[p[0], 0.06, p[2]]}>
      <mesh ref={a} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.0, 1.18, 48]} />
        <meshBasicMaterial color="#F2D46A" transparent depthWrite={false} />
      </mesh>
      <mesh ref={b} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.0, 1.18, 48]} />
        <meshBasicMaterial color="#F2D46A" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Un cartello segnavia: un palo con le assi a freccia, ciascuna col nome di un luogo. */
function Segnavia({ p, verso, assi }: { p: P3; verso: number; assi: { testo: string; dir: "sx" | "dx" | "su" }[] }) {
  const tele = useMemo(
    () =>
      assi.map(({ testo, dir }) => {
        const c = document.createElement("canvas");
        c.width = 768;
        c.height = 128;
        const x = c.getContext("2d") as CanvasRenderingContext2D;
        x.fillStyle = "#E9DCC2";
        x.beginPath();
        // l'asse a forma di freccia: la punta dalla parte della direzione
        if (dir === "sx") {
          x.moveTo(0, 64);
          x.lineTo(60, 4);
          x.lineTo(764, 4);
          x.lineTo(764, 124);
          x.lineTo(60, 124);
        } else {
          x.moveTo(768, 64);
          x.lineTo(708, 4);
          x.lineTo(4, 4);
          x.lineTo(4, 124);
          x.lineTo(708, 124);
        }
        x.closePath();
        x.fill();
        x.strokeStyle = "#7A5A3A";
        x.lineWidth = 8;
        x.stroke();
        x.fillStyle = "#2A2016";
        let corpo = 62;
        x.font = `400 ${corpo}px Newsreader, Georgia, serif`;
        while (x.measureText((dir === "su" ? "↑ " : "") + testo).width > 620 && corpo > 30) x.font = `400 ${(corpo -= 2)}px Newsreader, Georgia, serif`;
        x.textAlign = "center";
        x.textBaseline = "middle";
        const freccia = dir === "su" ? "↑ " : "";
        x.fillText(freccia + testo, dir === "sx" ? 412 : 356, 68);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      }),
    [assi]
  );
  return (
    <group position={p} rotation-y={verso}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.11, 2.4, 0.11]} />
        <meshLambertMaterial color="#6A4A31" />
      </mesh>
      {assi.map((a, i) => (
        <mesh key={i} position={[a.dir === "sx" ? -0.55 : a.dir === "dx" ? 0.55 : 0, 2.15 - i * 0.36, 0.07]}>
          <planeGeometry args={[1.6, 0.27]} />
          <meshLambertMaterial map={tele[i]} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function Percorsi({ visibile, lingua }: { visibile: boolean; lingua: Lingua }) {
  return (
    <group>
      <Briciole visibile={visibile} />
      {INGRESSI.map((p, i) => (
        <Anello key={i} p={p} visibile={visibile} />
      ))}
      {/* all'ingresso, per chi arriva dalla strada */}
      <Segnavia
        p={[-4.2, 0, 25.6]}
        verso={0}
        assi={[
          { testo: zona("piscina").nome[lingua], dir: "sx" },
          { testo: zona("agrumeto").nome[lingua], dir: "dx" },
          { testo: zona("casa").nome[lingua], dir: "su" },
        ]}
      />
      {/* all'aia */}
      <Segnavia
        p={[-1.6, 0, 3.2]}
        verso={0.4}
        assi={[
          { testo: TESTI.trattoreVa[lingua], dir: "sx" },
          { testo: zona("cavedio").nome[lingua] + " · " + zona("pollaio").nome[lingua] + " · " + zona("uliveto").nome[lingua], dir: "sx" },
          { testo: zona("casa").nome[lingua], dir: "dx" },
        ]}
      />
      {/* a Chiaramonte, per chi scende dal trattore */}
      <Segnavia
        p={altrove([11.6, 0, -22.5])}
        verso={0}
        assi={[
          { testo: zona("chiaramonte").nome[lingua], dir: "sx" },
          { testo: zona("frantoio").nome[lingua], dir: "sx" },
          { testo: TESTI.trattoreTorna[lingua], dir: "dx" },
        ]}
      />
    </group>
  );
}
