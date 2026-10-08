"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { competenze, competenzeDi } from "@/content/competenze";

/**
 * I monogrammi dello stack: dischi sottili con la sigla in monospaziato,
 * che girano su se stessi mentre percorrono un'orbita alta, dietro le carte.
 * Sigle originali, non loghi: lo stile resta quello del sito.
 * Quando una carta è attiva, i monogrammi delle competenze di quel lavoro si accendono.
 */

const SIGLE: [string, string][] = [
  ["JS", "js"], ["TS", "ts"], ["PHP", "php"], ["Py", "python"], ["SQL", "sql"], ["HTML", "html"],
  ["CSS", "css"], ["Next", "next"], ["React", "react"], ["Vue", "vue"], ["Node", "node"], ["WP", "wordpress"],
  ["O2B", "open2b"], ["GA4", "ga4"], ["GTM", "gtm"], ["SEO", "seo"],
];

const RAGGIO = 9.6;
const GIRO = 200; // secondi per un giro completo dell'orbita

function disco(sigla: string, mono: string) {
  const t = document.createElement("canvas");
  t.width = t.height = 256;
  const c = t.getContext("2d");
  if (c) {
    c.strokeStyle = c.fillStyle = "#FFFFFF";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(128, 128, 104, 0, Math.PI * 2);
    c.stroke();
    let corpo = 84;
    c.font = `500 ${corpo}px ${mono}`;
    while (c.measureText(sigla).width > 170 && corpo > 40) {
      corpo -= 4;
      c.font = `500 ${corpo}px ${mono}`;
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(sigla, 128, 134);
  }
  const tx = new THREE.CanvasTexture(t);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}

export default function Orbita({
  colore, opacita, mono, attiva, ridotto, stretto,
}: {
  colore: string;
  opacita: number;
  mono: string;
  attiva: MutableRefObject<string | null>;
  ridotto: boolean;
  stretto: boolean;
}) {
  const voci = useMemo(() => SIGLE.filter(([, id]) => competenze.some((c) => c.id === id)), []);
  const texture = useMemo(() => voci.map(([s]) => disco(s, mono)), [voci, mono]);
  const gruppi = useRef<(THREE.Group | null)[]>([]);
  const materiali = useRef<(THREE.MeshBasicMaterial | null)[][]>([]);

  useEffect(() => () => texture.forEach((t) => t.dispose()), [texture]);

  useFrame((stato, dt) => {
    const t = ridotto ? 0 : stato.clock.elapsedTime;
    const id = attiva.current;
    const usate = id === "contatto" ? null : id ? new Set(competenzeDi[id] ?? []) : undefined;
    const k = 1 - Math.exp(-dt * 4);
    const n = voci.length;
    voci.forEach(([, comp], i) => {
      const g = gruppi.current[i];
      if (!g) return;
      const a = (i / n) * Math.PI * 2 + (t / GIRO) * Math.PI * 2;
      g.position.set(
        Math.sin(a) * RAGGIO,
        1.75 + Math.sin(a * 3 + i) * 0.35,
        -Math.cos(a) * RAGGIO
      );
      // gira su se stesso, ognuno col suo passo
      g.rotation.y = -a + t * (0.45 + (i % 4) * 0.08);
      // acceso: competenza del lavoro attivo (o tutte, sulla carta "Scrivimi")
      const acceso = usate === null || (usate && usate.has(comp));
      const bersaglio = opacita * (usate === undefined ? 1 : acceso ? 1.7 : 0.35);
      materiali.current[i]?.forEach((m) => {
        if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, Math.min(bersaglio, 1), k);
      });
    });
  });

  const lato = stretto ? 0.5 : 0.44;
  return (
    <group>
      {voci.map(([s], i) => (
        <group
          key={s}
          ref={(g) => {
            gruppi.current[i] = g;
          }}
        >
          {/* due facce schiena contro schiena: la sigla si legge da entrambi i lati */}
          {[0, Math.PI].map((r, f) => (
            <mesh key={f} rotation={[0, r, 0]} raycast={() => null}>
              <planeGeometry args={[lato, lato]} />
              <meshBasicMaterial
                ref={(m) => {
                  (materiali.current[i] ??= [])[f] = m;
                }}
                map={texture[i]}
                color={colore}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
