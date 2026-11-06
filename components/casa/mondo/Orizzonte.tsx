"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { generatore } from "./base";
import { ALTROVE } from "@/content/casaLuoghi";

/*
 * Quello che si vede lontano, oltre il muretto. Dalla casa: dalla parte del pollaio, a ovest, la città di Vittoria
 * nella piana; dietro il cancello da cui si arriva, Comiso; dietro l'agrumeto e dietro Comiso i Monti Iblei, con
 * Chiaramonte Gulfi sul crinale; e più lontano, oltre gli Iblei, l'Etna col pennacchio. Da Chiaramonte si vede l'Etna.
 * Sagome disegnate su tela, nei colori velati della lontananza; non le tocca la nebbia della scena.
 *
 * Direzioni nella scena (−z è nord-ovest, +x nord-est): l'angolo è atan2(x, z).
 */

const lontano = (z: number) => z < ALTROVE[2] / 2;
const VITTORIA = -2.5, COMISO = -0.14, CHIARAMONTE = 1.03, ETNA = 1.62;
const CENTRO_IBLEI = 0.5;

/** L'altezza del crinale nella direzione a: i Monti Iblei alti fra Comiso e l'Etna, la piana bassa verso Vittoria. */
function crinale(a: number, rumore: number) {
  let d = Math.atan2(Math.sin(a - CENTRO_IBLEI), Math.cos(a - CENTRO_IBLEI));
  d /= 0.95;
  return 7 + rumore * 3 + 52 * Math.exp(-d * d);
}

function Iblei() {
  const geo = useMemo(() => {
    const caso = generatore(1693);
    const n = 240, R = 390;
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const piede = new THREE.Color("#8E8A7E"), cima = new THREE.Color("#A9A6A0");
    let r = 0;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI;
      r = r * 0.82 + (caso() - 0.5) * 0.9;
      const h = crinale(a, r) + Math.sin(a * 11) * 1.5;
      pos.push(Math.sin(a) * R, -4, Math.cos(a) * R, Math.sin(a) * (R + 20), h, Math.cos(a) * (R + 20));
      col.push(piede.r, piede.g, piede.b, cima.r, cima.g, cima.b);
      if (i < n) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Una città vista da lontano: case basse a blocchi, le finestre, le cupole e i campanili delle chiese. */
function texturaCitta(seme: number, chiese: number, densa: number) {
  const caso = generatore(seme);
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 256;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const toni = ["#B8AC98", "#C4B8A4", "#ADA290", "#CABEA8", "#B2A794"];
  // due file di case: dietro più chiare, davanti più scure
  for (const fila of [0, 1]) {
    let px = fila ? 30 : 0;
    while (px < 2048) {
      const l = 30 + caso() * 70, h = (fila ? 30 : 45) + caso() * (fila ? 55 : 70) * densa;
      x.fillStyle = toni[Math.floor(caso() * toni.length)];
      if (fila) x.globalAlpha = 1;
      else x.globalAlpha = 0.85;
      x.fillRect(px, 256 - h, l, h);
      x.globalAlpha = 1;
      x.fillStyle = "rgba(70,62,54,0.45)";
      for (let fy = 256 - h + 10; fy < 246; fy += 16) for (let fx = px + 6; fx < px + l - 8; fx += 14) if (caso() < 0.6) x.fillRect(fx, fy, 4, 6);
      px += l + (caso() < 0.2 ? 20 + caso() * 60 : 2);
    }
  }
  // le chiese: una cupola sul tamburo, un campanile
  for (let i = 0; i < chiese; i++) {
    const cx = 200 + caso() * 1650;
    x.fillStyle = "#C9BEA9";
    x.fillRect(cx - 34, 256 - 150, 68, 150);
    x.fillRect(cx - 22, 256 - 178, 44, 30);
    x.beginPath();
    x.arc(cx, 256 - 178, 24, Math.PI, 0);
    x.fill();
    x.fillRect(cx - 3, 256 - 214, 6, 14);
    const tx = cx + 60 + caso() * 30;
    x.fillRect(tx, 256 - 200, 26, 200);
    x.beginPath();
    x.moveTo(tx - 2, 256 - 200);
    x.lineTo(tx + 13, 256 - 228);
    x.lineTo(tx + 28, 256 - 200);
    x.fill();
    x.fillStyle = "rgba(70,62,54,0.5)";
    x.fillRect(tx + 8, 256 - 188, 10, 14);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Un piano rivolto verso il centro, alla distanza r nella direzione a. */
function Sagoma({ a, r, l, h, y = -2, mappa, centro = [0, 0] }: { a: number; r: number; l: number; h: number; y?: number; mappa: THREE.Texture; centro?: [number, number] }) {
  const p: [number, number, number] = [centro[0] + Math.sin(a) * r, y + h / 2, centro[1] + Math.cos(a) * r];
  return (
    <mesh position={p} rotation-y={a + Math.PI}>
      <planeGeometry args={[l, h]} />
      <meshBasicMaterial map={mappa} transparent alphaTest={0.4} fog={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** L'Etna: il cono largo, la neve in cima, il pennacchio di fumo che va verso est. */
function texturaEtna() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 384;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  // il pennacchio
  const g0 = x.createLinearGradient(512, 40, 900, 0);
  g0.addColorStop(0, "rgba(225,224,222,0.85)");
  g0.addColorStop(1, "rgba(225,224,222,0)");
  x.fillStyle = g0;
  x.beginPath();
  x.moveTo(500, 70);
  x.bezierCurveTo(560, 20, 700, 30, 980, 10);
  x.bezierCurveTo(760, 60, 600, 80, 530, 90);
  x.closePath();
  x.fill();
  // il monte
  const g = x.createLinearGradient(0, 70, 0, 384);
  g.addColorStop(0, "#9EA4B2");
  g.addColorStop(1, "#8A909E");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(0, 384);
  x.bezierCurveTo(180, 330, 330, 210, 470, 92);
  x.lineTo(500, 82);
  x.lineTo(540, 86);
  x.bezierCurveTo(660, 190, 820, 320, 1024, 384);
  x.closePath();
  x.fill();
  // la neve
  x.fillStyle = "#E9ECF0";
  x.beginPath();
  x.moveTo(400, 150);
  x.lineTo(470, 92);
  x.lineTo(500, 82);
  x.lineTo(540, 86);
  x.lineTo(610, 150);
  x.lineTo(585, 140);
  x.lineTo(560, 160);
  x.lineTo(530, 138);
  x.lineTo(500, 165);
  x.lineTo(470, 140);
  x.lineTo(440, 158);
  x.closePath();
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Chiaramonte Gulfi sul crinale: poche case strette attorno alla chiesa, in cima al colle. */
function texturaPaese() {
  const caso = generatore(97);
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  for (let i = 0; i < 26; i++) {
    const l = 14 + caso() * 22, h = 18 + caso() * 30 - Math.abs(i - 13) * 1.4;
    x.fillStyle = ["#B8AE9C", "#C4B9A6", "#ADA492"][i % 3];
    x.fillRect(60 + i * 15, 128 - h, l, h);
  }
  x.fillStyle = "#C9BEA9";
  x.fillRect(240, 128 - 80, 16, 80);
  x.beginPath();
  x.moveTo(238, 48);
  x.lineTo(248, 30);
  x.lineTo(258, 48);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function Orizzonte() {
  const vittoria = useMemo(() => texturaCitta(2026, 3, 1.1), []);
  const comiso = useMemo(() => texturaCitta(1617, 2, 0.85), []);
  const etna = useMemo(() => texturaEtna(), []);
  const paese = useMemo(() => texturaPaese(), []);
  const casa = useRef<THREE.Group>(null), via = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const qui = lontano(camera.position.z);
    if (casa.current) casa.current.visible = !qui;
    if (via.current) via.current.visible = qui;
  });
  const hChiaramonte = crinale(CHIARAMONTE, 0);
  return (
    <group>
      <group ref={casa}>
        <Iblei />
        <Sagoma a={ETNA} r={560} l={300} h={112} y={-6} mappa={etna} />
        <Sagoma a={CHIARAMONTE} r={386} l={80} h={20} y={hChiaramonte - 6} mappa={paese} />
        <Sagoma a={VITTORIA} r={300} l={210} h={30} y={2} mappa={vittoria} />
        <Sagoma a={COMISO} r={330} l={150} h={30} y={8} mappa={comiso} />
      </group>
      <group ref={via}>
        <Sagoma a={ETNA} r={560} l={300} h={112} y={-6} mappa={etna} centro={[ALTROVE[0], ALTROVE[2]]} />
      </group>
    </group>
  );
}
