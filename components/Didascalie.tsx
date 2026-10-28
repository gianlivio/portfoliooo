"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { didascalie, type IdLuogo } from "@/content/didascalie";
import { PELO_ACQUA } from "./condivisi";
import { ANGOLO_ZONA, PASSO } from "./zona";

/**
 * Le didascalie dei luoghi: al passaggio del puntatore vicino a un luogo (o toccandolo sul telefono)
 * compare una riga che dice cos'è. Ogni luogo ha un punto d'ancora nel mondo; a ogni fotogramma si proietta
 * sullo schermo e si sceglie il più vicino al puntatore, entro un raggio. Niente raycast: i luoghi sono lontani
 * e fatti di geometrie unite. Sopra una carta o un oggetto cliccabile (il cursore a manina) la riga non compare.
 * I punti stanno dove sono i luoghi (vedi ospiti/luoghi.ts, lontano.ts, riva.ts, rave.ts, etna.ts).
 */

const SU = PELO_ACQUA - 0.3;
type Ancora = { id: IdLuogo; a: number; d: number; y: number; quando: "giorno" | "notte" | "sempre" };
const ANCORE: Ancora[] = [
  { id: "etna", a: 1.2, d: 41, y: SU + 6, quando: "sempre" },
  { id: "sieteColores", a: 1.6, d: 35, y: SU + 5.5, quando: "giorno" },
  { id: "iguazu", a: 2.02, d: 35, y: SU + 4.6, quando: "giorno" },
  { id: "peritoMoreno", a: 2.47, d: 32, y: SU + 5.5, quando: "giorno" },
  { id: "puntaSecca", a: 2.92, d: 33, y: SU + 5, quando: "giorno" },
  { id: "barocco", a: 3.4, d: 42, y: SU + 9, quando: "giorno" },
  { id: "labirinto", a: 3.81, d: 33, y: SU + 6.6, quando: "giorno" },
  { id: "liotru", a: PASSO * 3.5, d: 10.5, y: PELO_ACQUA + 1.4, quando: "sempre" },
  { id: "alhambra", a: -0.02, d: 40.5, y: SU + 5, quando: "sempre" },
  { id: "flamenco", a: 0.11, d: 24, y: PELO_ACQUA + 3.4, quando: "giorno" },
  { id: "bologna", a: -1.16, d: 41.5, y: SU + 7, quando: "sempre" },
  { id: "rave", a: 2.47, d: 31, y: SU + 7.5, quando: "notte" },
  { id: "lunaPark", a: 1.72, d: 38, y: SU + 9, quando: "notte" },
  { id: "petrolchimico", a: -2.1, d: 40, y: SU + 5, quando: "notte" },
];
const RAGGIO = 90; // pixel

export default function Didascalie({ lingua, notte }: { lingua: string; notte: boolean }) {
  const { gl, camera, size } = useThree();
  const testi = didascalie[lingua] ?? didascalie.it;
  const punti = useMemo(
    () => ANCORE.map((k) => ({ ...k, p: new THREE.Vector3(Math.sin(ANGOLO_ZONA + k.a) * k.d, k.y, -Math.cos(ANGOLO_ZONA + k.a) * k.d) })),
    [],
  );
  const etichetta = useRef<HTMLDivElement | null>(null);
  const puntatore = useRef<{ x: number; y: number; fino: number } | null>(null);
  const v = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const tela = gl.domElement;
    const box = tela.parentElement;
    if (!box) return;
    const e = document.createElement("div");
    e.className = "didascalia";
    e.setAttribute("aria-hidden", "true");
    box.appendChild(e);
    etichetta.current = e;
    let giu: { x: number; y: number } | null = null;
    const muovi = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse") {
        const r = tela.getBoundingClientRect();
        puntatore.current = { x: ev.clientX - r.left, y: ev.clientY - r.top, fino: Infinity };
      }
    };
    const esci = () => {
      if (puntatore.current?.fino === Infinity) puntatore.current = null;
    };
    const premi = (ev: PointerEvent) => {
      giu = { x: ev.clientX, y: ev.clientY };
    };
    // sul telefono: un tocco (senza trascinare) mostra la riga per qualche secondo
    const lascia = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse" || !giu) return;
      if (Math.hypot(ev.clientX - giu.x, ev.clientY - giu.y) < 8) {
        const r = tela.getBoundingClientRect();
        puntatore.current = { x: ev.clientX - r.left, y: ev.clientY - r.top, fino: performance.now() + 3500 };
      }
      giu = null;
    };
    tela.addEventListener("pointermove", muovi);
    tela.addEventListener("pointerleave", esci);
    tela.addEventListener("pointerdown", premi);
    tela.addEventListener("pointerup", lascia);
    return () => {
      tela.removeEventListener("pointermove", muovi);
      tela.removeEventListener("pointerleave", esci);
      tela.removeEventListener("pointerdown", premi);
      tela.removeEventListener("pointerup", lascia);
      e.remove();
      etichetta.current = null;
    };
  }, [gl]);

  useFrame(() => {
    const e = etichetta.current;
    if (!e) return;
    const pt = puntatore.current;
    if (pt && pt.fino < performance.now()) puntatore.current = null;
    let scelta: { id: IdLuogo; x: number; y: number } | null = null;
    if (pt && document.body.style.cursor !== "pointer") {
      let meglio = RAGGIO;
      for (const k of punti) {
        if (k.quando === "giorno" && notte) continue;
        if (k.quando === "notte" && !notte) continue;
        v.copy(k.p).project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height;
        const dist = Math.hypot(x - pt.x, y - pt.y);
        if (dist < meglio) {
          meglio = dist;
          scelta = { id: k.id, x, y };
        }
      }
    }
    if (!scelta) {
      if (e.dataset.su) {
        delete e.dataset.su;
      }
      return;
    }
    const testo = testi[scelta.id];
    if (e.textContent !== testo) e.textContent = testo;
    // dentro lo schermo: la riga non esce dai bordi
    const mezza = e.offsetWidth / 2 + 10;
    const x = Math.min(Math.max(scelta.x, mezza), size.width - mezza);
    const y = Math.max(scelta.y, e.offsetHeight * 1.3 + 70);
    e.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -130%)`;
    e.dataset.su = "1";
  });

  return null;
}
