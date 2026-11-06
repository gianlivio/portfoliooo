"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { pillola } from "./base";
import { QUADRI, TESTI, ZONE_LONTANE, zona, type Quadro } from "@/content/casa";
import { ALTROVE } from "@/content/casaLuoghi";
import type { Lingua } from "@/dictionaries";

/*
 * Le foto e i video sparsi nella campagna, ciascuno vicino a quello che racconta: su una bacheca di legno
 * piantata a terra, oppure appese con le mollette a un filo teso fra due pali, come i panni stesi.
 * Un clic apre la foto, o il video, a schermo intero. Per i video nella scena si vede il fotogramma col triangolo.
 */

const lontano = (z: number) => z < ALTROVE[2] / 2;
/** Ogni quadro guarda verso la camera della sua zona, così si vede arrivando. */
const verso = (q: Quadro) => {
  const c = zona(q.zona).camera;
  return Math.atan2(c[0] - q.p[0], c[2] - q.p[2]);
};

/**
 * La foto come texture: ridisegnata su una tela quadrata di 512 px (potenza di due), così le misure
 * qualsiasi delle foto non danno problemi alle schede video; il piano la riporta alle proporzioni vere.
 */
function useImmagine(src: string) {
  const [t, setT] = useState<{ texture: THREE.Texture; rapporto: number } | null>(null);
  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!vivo) return;
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      (c.getContext("2d") as CanvasRenderingContext2D).drawImage(img, 0, 0, 512, 512);
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.anisotropy = 4;
      setT({ texture: tx, rapporto: img.naturalWidth / img.naturalHeight });
    };
    img.src = src;
    return () => {
      vivo = false;
    };
  }, [src]);
  return t;
}

/** La foto (o il fotogramma) con la cornice; per i video un triangolo bianco nel mezzo. */
function Foto({ q, alto, onApri }: { q: Quadro; alto: number; onApri: (id: string) => void }) {
  const t = useImmagine(q.anteprima);
  const r = t ? t.rapporto : 1.33;
  const h = r > 1 ? alto : alto * 1.15, l = Math.min(h * r, alto * 1.7);
  const play = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.07, -0.09);
    s.lineTo(0.11, 0);
    s.lineTo(-0.07, 0.09);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    onApri(q.id);
  };
  return (
    <group onClick={clic} onPointerOver={(e) => (e.stopPropagation(), (document.body.style.cursor = "pointer"))} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh position={[0, 0, -0.02]} castShadow>
        <boxGeometry args={[l + 0.12, h + 0.12, 0.04]} />
        <meshLambertMaterial color="#EDE4D0" />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[l, h]} />
        {t ? <meshBasicMaterial map={t.texture} toneMapped={false} /> : <meshBasicMaterial color="#2A2A26" />}
      </mesh>
      {q.tipo === "video" && (
        <group position={[0, 0, 0.02]}>
          <mesh>
            <circleGeometry args={[0.17, 24]} />
            <meshBasicMaterial color="#000" transparent opacity={0.45} />
          </mesh>
          <mesh geometry={play} position={[0.01, 0, 0.005]}>
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** La bacheca: due pali e la foto, inclinata appena all'indietro; sotto, la didascalia. */
function Bacheca({ q, lingua, onApri }: { q: Quadro; lingua: Lingua; onApri: (id: string) => void }) {
  const etichetta = useMemo(() => pillola(q.didascalia[lingua], q.tipo === "video" ? `▶ ${TESTI.guarda[lingua]}` : TESTI.guarda[lingua]), [q, lingua]);
  const sprite = useRef<THREE.Sprite>(null);
  const g = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!sprite.current || !g.current) return;
    const d = camera.position.distanceTo(g.current.position);
    const o = THREE.MathUtils.clamp(1.6 - d / 12, 0, 1);
    (sprite.current.material as THREE.SpriteMaterial).opacity = o;
    sprite.current.visible = o > 0.02;
  });
  return (
    <group ref={g} position={q.p} rotation-y={verso(q)}>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.85, -0.06]} castShadow>
          <boxGeometry args={[0.07, 1.7, 0.07]} />
          <meshLambertMaterial color="#6A4A31" />
        </mesh>
      ))}
      <group position={[0, 1.5, 0]} rotation-x={-0.08}>
        <Foto q={q} alto={0.92} onApri={onApri} />
      </group>
      <sprite ref={sprite} position={[0, 0.72, 0.1]} scale={[0.2 * etichetta.rapporto, 0.2, 1]} renderOrder={10}>
        <spriteMaterial map={etichetta.texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

/** Il filo teso fra due pali, con le foto appese alle mollette. */
function Filo({ quadri, onApri }: { quadri: Quadro[]; onApri: (id: string) => void }) {
  const q0 = quadri[0];
  const L = Math.max(4, quadri.length * 1.25 + 0.8);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // il vento muove appena le foto
    g.current?.children.forEach((c, i) => {
      c.rotation.x = Math.sin(clock.elapsedTime * 1.4 + i) * 0.06;
    });
  });
  return (
    <group position={q0.p} rotation-y={verso(q0)}>
      {[-L / 2, L / 2].map((x) => (
        <mesh key={x} position={[x, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 2.3, 8]} />
          <meshLambertMaterial color="#6A4A31" />
        </mesh>
      ))}
      <mesh position={[0, 2.18, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, L, 4]} />
        <meshLambertMaterial color="#D8D2C4" />
      </mesh>
      <group ref={g}>
        {quadri.map((q, i) => (
          <group key={q.id} position={[-L / 2 + 0.9 + i * 1.25, 2.16, 0]}>
            <mesh position={[0, 0.02, 0.02]}>
              <boxGeometry args={[0.04, 0.1, 0.03]} />
              <meshLambertMaterial color="#C9A23A" />
            </mesh>
            <group position={[0, -0.42, 0]}>
              <Foto q={q} alto={0.72} onApri={onApri} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function Quadri({ lingua, onApri }: { lingua: Lingua; onApri: (id: string) => void }) {
  const gruppi = useMemo(() => {
    const bacheche = QUADRI.filter((q) => (q.forma ?? "bacheca") === "bacheca");
    const fili = new Map<string, Quadro[]>();
    QUADRI.filter((q) => q.forma === "filo").forEach((q) => {
      const k = q.p.join(",");
      fili.set(k, [...(fili.get(k) ?? []), q]);
    });
    return { bacheche, fili: [...fili.values()] };
  }, []);
  // si disegnano solo i quadri dell'area in cui si è
  const casa = useRef<THREE.Group>(null), via = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const qui = lontano(camera.position.z);
    if (casa.current) casa.current.visible = !qui;
    if (via.current) via.current.visible = qui;
  });
  const dove = (q: Quadro) => ZONE_LONTANE.includes(q.zona);
  return (
    <group>
      <group ref={casa}>
        {gruppi.bacheche.filter((q) => !dove(q)).map((q) => (
          <Bacheca key={q.id} q={q} lingua={lingua} onApri={onApri} />
        ))}
        {gruppi.fili.filter((f) => !dove(f[0])).map((f) => (
          <Filo key={f[0].id} quadri={f} onApri={onApri} />
        ))}
      </group>
      <group ref={via}>
        {gruppi.bacheche.filter(dove).map((q) => (
          <Bacheca key={q.id} q={q} lingua={lingua} onApri={onApri} />
        ))}
        {gruppi.fili.filter((f) => dove(f[0])).map((f) => (
          <Filo key={f[0].id} quadri={f} onApri={onApri} />
        ))}
      </group>
    </group>
  );
}
