"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { albero, generatore, modello, posa, smorza, textura } from "./base";
import { occupato, vicinoAUnaTrazzera } from "./Terreno";
import { ALTROVE, ULIVI_CASA } from "@/content/casaLuoghi";
import { QUADRI } from "@/content/casa";

/** Le foto piantate fra gli ulivi: lì non ci sono alberi (coordinate del mondo). */
const vicinoAUnaFoto = (x: number, z: number, r: number) => QUADRI.some((q) => Math.hypot(q.p[0] - x, q.p[2] - z) < r);

/*
 * Gli uliveti: quello dietro casa (gli alberi veri, dalla vista satellitare) e quelli di Chiaramonte Gulfi,
 * a sesto largo, un po' irregolari, fra i muretti a secco (coordinate dell'area lontana).
 * Fasi (0–3): fioritura, frutto verde, invaiatura, raccolta (reti stese, cassette, olive che cadono).
 */

export type Albero = { x: number; z: number; ry: number; s: number; m: THREE.Matrix4 };
type Luogo = { alberi: Albero[]; raccolta: THREE.Vector3; vista: THREE.Vector3 };

/** A Chiaramonte: si raccoglie qui, e si guarda da lì (coordinate dell'area lontana). */
export const RACCOLTA_LONTANA = new THREE.Vector3(1, 0, -39);
const VISTA_LONTANA = new THREE.Vector3(9.5, 0, -27);
/** Dietro casa: la raccolta davanti a chi arriva dal pollaio. */
export const RACCOLTA_CASA = new THREE.Vector3(-16, 0, -54);
const VISTA_CASA = new THREE.Vector3(-11, 0, -40.5);

/**
 * I tre alberi della raccolta (quelli con le reti) e un punto sotto ciascuno, nella chioma, dalla parte
 * di chi guarda: lì stanno i raccoglitori con l'asta. lato sposta di lato, in metri.
 */
export function useRaccolta(dove: "casa" | "lontano" = "lontano") {
  const casa = useUliviCasa(), lontano = useUlivi();
  const alberi = dove === "casa" ? casa : lontano;
  const RACCOLTA = dove === "casa" ? RACCOLTA_CASA : RACCOLTA_LONTANA;
  return useMemo(() => {
    const vicini = [...alberi].sort((a, b) => Math.hypot(a.x - RACCOLTA.x, a.z - RACCOLTA.z) - Math.hypot(b.x - RACCOLTA.x, b.z - RACCOLTA.z)).slice(0, 3);
    const vista = dove === "casa" ? VISTA_CASA : VISTA_LONTANA;
    const sotto = (i: number, lato = 0, dentro = 0.85): [number, number, number] => {
      const a = vicini[i % vicini.length];
      const d = vista.clone().sub(new THREE.Vector3(a.x, 0, a.z)).normalize();
      const l = new THREE.Vector3(-d.z, 0, d.x);
      return [a.x + d.x * dentro + l.x * lato, 0, a.z + d.z * dentro + l.z * lato];
    };
    return { vicini, sotto };
  }, [alberi, RACCOLTA, dove]);
}

/** Gli ulivi dietro casa: le chiome riconosciute nella vista satellitare, con la loro grandezza. */
export function useUliviCasa() {
  return useMemo(() => {
    const caso = generatore(1987);
    return ULIVI_CASA.filter(([x, z]) => !vicinoAUnaFoto(x, z, 2) && !occupato(x, z)).map(([x, z, r]): Albero => {
      const s = THREE.MathUtils.clamp(0.75 + r * 0.6, 1.05, 2.1) * (0.92 + caso() * 0.16), ry = caso() * 6.28;
      return { x, z, ry, s, m: posa(x, 0, z, ry, [s * 1.05, s, s * 1.05]) };
    });
  }, []);
}

export function useUlivi() {
  return useMemo(() => {
    const caso = generatore(2026);
    const alberi: Albero[] = [];
    for (let z = -32; z > -78; z -= 7)
      for (let x = -52; x < 54; x += 7.2) {
        const px = x + (caso() - 0.5) * 2.4, pz = z + (caso() - 0.5) * 2.4;
        if (vicinoAUnaTrazzera(px, pz + ALTROVE[2], 1.6) || occupato(px, pz + ALTROVE[2])) continue;
        if (px > -26 && px < -2 && pz > -54 && pz < -27) continue; // lo spiazzo del frantoio, col suo davanti
        if (Math.abs(pz + 58) < 1.5 || Math.abs(pz + 70) < 1.5) continue; // i muretti dei terrazzi
        if (Math.hypot(px - 6.6, pz + 33.2) < 4.2) continue; // il cassone
        if (vicinoAUnaFoto(px, pz + ALTROVE[2], 2.6)) continue;
        // ulivi vecchi, più grandi di quelli di casa
        const s = 1.75 + caso() * 0.6, ry = caso() * 6.28;
        alberi.push({ x: px, z: pz, ry, s, m: posa(px, 0, pz, ry, [s * 1.05, s, s * 1.05]) });
      }
    return alberi;
  }, []);
}

/** Una rete per le olive, verde e un po' trasparente. */
function texturaRete() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.fillStyle = "rgba(40,92,52,0.45)";
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "rgba(70,150,82,0.95)";
  x.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 128);
    x.moveTo(0, i);
    x.lineTo(128, i);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function Uliveto({ fase, dove }: { fase: number; dove: "casa" | "lontano" }) {
  const casa = useUliviCasa(), lontano = useUlivi();
  const alberi = dove === "casa" ? casa : lontano;
  const luogo: Luogo = { alberi, raccolta: dove === "casa" ? RACCOLTA_CASA : RACCOLTA_LONTANA, vista: dove === "casa" ? VISTA_CASA : VISTA_LONTANA };
  const forma = useMemo(() => albero(4242, 1, 0.62), []);
  const corteccia = useMemo(() => textura("corteccia-colore.webp", true, [2, 2]), []);

  // le olive: punti sulla chioma di ogni albero, in coordinate del mondo
  const olive = useMemo(() => {
    const caso = generatore(99);
    const out: { p: THREE.Vector3; varia: number }[] = [];
    alberi.forEach((a) => {
      for (let k = 0; k < 46; k++) {
        const c = forma.centri[k % forma.centri.length];
        const d = new THREE.Vector3(caso() - 0.5, (caso() - 0.5) * 0.6 - 0.15, caso() - 0.5).normalize().multiplyScalar(0.38 + caso() * 0.12);
        out.push({ p: c.clone().add(d).applyMatrix4(a.m), varia: caso() });
      }
    });
    return out;
  }, [alberi, forma]);

  const legno = useRef<THREE.InstancedMesh>(null);
  const fronde = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    alberi.forEach((a, i) => {
      legno.current?.setMatrixAt(i, a.m);
      fronde.current?.setMatrixAt(i, a.m);
    });
    if (legno.current) legno.current.instanceMatrix.needsUpdate = true;
    if (fronde.current) fronde.current.instanceMatrix.needsUpdate = true;
  }, [alberi]);

  const frutti = useRef<THREE.InstancedMesh>(null);
  const fiori = useRef<THREE.InstancedMesh>(null);
  const stato = useRef({ fiori: -1, frutti: -1, colore: -1 });
  const colori = useMemo(() => ({ verde: new THREE.Color("#7C8C36"), viola: new THREE.Color("#5A2A49"), nero: new THREE.Color("#2B1A26"), c: new THREE.Color() }), []);
  useFrame((_, dt) => {
    const s = stato.current;
    const o = { fiori: fase === 0 ? 1 : 0, frutti: fase >= 1 ? 1 : 0, colore: fase === 1 ? 0 : fase === 2 ? 0.55 : fase === 3 ? 1 : 0 };
    const prima = { ...s };
    s.fiori = s.fiori < 0 ? o.fiori : smorza(s.fiori, o.fiori, 2.5, dt);
    s.frutti = s.frutti < 0 ? o.frutti : smorza(s.frutti, o.frutti, 2.5, dt);
    s.colore = s.colore < 0 ? o.colore : smorza(s.colore, o.colore, 2, dt);
    if (prima.fiori >= 0 && Math.abs(prima.fiori - s.fiori) + Math.abs(prima.frutti - s.frutti) + Math.abs(prima.colore - s.colore) < 1e-5) return;
    const m = new THREE.Matrix4();
    olive.forEach((ol, i) => {
      m.makeScale(s.frutti, s.frutti * 1.25, s.frutti).setPosition(ol.p);
      frutti.current?.setMatrixAt(i, m);
      // l'invaiatura non è uguale per tutte: ognuna ha la sua soglia
      const k = THREE.MathUtils.clamp((s.colore * 1.6 - ol.varia * 0.8), 0, 1);
      if (k < 0.7) colori.c.copy(colori.verde).lerp(colori.viola, k / 0.7);
      else colori.c.copy(colori.viola).lerp(colori.nero, (k - 0.7) / 0.3);
      frutti.current?.setColorAt(i, colori.c);
      m.makeScale(s.fiori, s.fiori, s.fiori).setPosition(ol.p.x, ol.p.y + 0.05, ol.p.z);
      fiori.current?.setMatrixAt(i, m);
    });
    if (frutti.current) {
      frutti.current.instanceMatrix.needsUpdate = true;
      if (frutti.current.instanceColor) frutti.current.instanceColor.needsUpdate = true;
    }
    if (fiori.current) fiori.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={legno} args={[forma.legnoGeo, undefined, alberi.length]} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial map={corteccia} color="#9A8E80" />
      </instancedMesh>
      <instancedMesh ref={fronde} args={[forma.frondeGeo, undefined, alberi.length]} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial color="#76885A" flatShading />
      </instancedMesh>
      <instancedMesh ref={frutti} args={[undefined, undefined, olive.length]} frustumCulled={false}>
        <sphereGeometry args={[0.065, 6, 4]} />
        <meshStandardMaterial roughness={0.35} color="#FFFFFF" />
      </instancedMesh>
      <instancedMesh ref={fiori} args={[undefined, undefined, olive.length]} frustumCulled={false}>
        <icosahedronGeometry args={[0.09, 0]} />
        <meshLambertMaterial color="#F3EEDC" />
      </instancedMesh>
      <Raccolta fase={fase} luogo={luogo} />
    </group>
  );
}

/** Le reti stese sotto gli alberi della raccolta, le cassette piene, le olive che cadono. */
function Raccolta({ fase, luogo }: { fase: number; luogo: Luogo }) {
  const { alberi, raccolta: RACCOLTA } = luogo;
  const vicini = useMemo(
    () => [...alberi].sort((a, b) => Math.hypot(a.x - RACCOLTA.x, a.z - RACCOLTA.z) - Math.hypot(b.x - RACCOLTA.x, b.z - RACCOLTA.z)).slice(0, 3),
    [alberi, RACCOLTA]
  );
  const rete = useMemo(() => texturaRete(), []);
  const [cassetta, setCassetta] = useState<{ geometria: THREE.BufferGeometry; materiale: THREE.Material } | null>(null);
  useEffect(() => {
    let vivo = true;
    modello("cassetta.glb", 0.3).then((m) => vivo && setCassetta(m));
    return () => {
      vivo = false;
    };
  }, []);
  const g = useRef<THREE.Group>(null);
  const cadono = useRef<THREE.InstancedMesh>(null);
  const gocce = useMemo(() => {
    const caso = generatore(7);
    return Array.from({ length: 70 }, () => {
      const a = vicini[Math.floor(caso() * vicini.length)];
      const r = caso() * 2.4 * (a.s / 1.8), ang = caso() * 6.28;
      return { x: a.x + Math.cos(ang) * r, z: a.z + Math.sin(ang) * r, y0: 1.8 + caso() * 1.6, f: caso(), v: 0.8 + caso() * 0.6 };
    });
  }, [vicini]);
  const t = useRef(0);
  useFrame((_, dt) => {
    const su = fase === 3;
    if (g.current) {
      const s = smorza(g.current.scale.y, su ? 1 : 0.001, 3, dt);
      g.current.scale.set(1, s, 1);
      g.current.visible = s > 0.01;
    }
    const m = cadono.current;
    if (!m) return;
    m.visible = su;
    if (!su) return;
    t.current += dt;
    const mt = new THREE.Matrix4();
    gocce.forEach((o, i) => {
      // metà del tempo cadono, metà stanno sulla rete
      const k = (t.current * o.v + o.f) % 1.6;
      const y = k < 1 ? o.y0 - (o.y0 - 0.08) * k * k : 0.08;
      mt.makeTranslation(o.x, y, o.z);
      m.setMatrixAt(i, mt);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <group ref={g} scale={[1, 0.001, 1]}>
        {vicini.map((a, i) => (
          <mesh key={i} position={[a.x, 0.06, a.z]} rotation-x={-Math.PI / 2} rotation-z={a.ry} receiveShadow>
            <planeGeometry args={[7, 7]} />
            <meshLambertMaterial map={rete} transparent depthWrite={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} />
          </mesh>
        ))}
        {cassetta &&
          [0, 1, 2, 3].map((k) => (
            <group key={k} position={[RACCOLTA.x + 2.6 + (k % 2) * 0.6, (k > 1 ? 0.3 : 0), RACCOLTA.z + 3.2]} rotation-y={0.2}>
              <mesh geometry={cassetta.geometria} material={cassetta.materiale} castShadow />
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.46, 0.03, 0.32]} />
                <meshStandardMaterial color="#3A2633" roughness={0.4} />
              </mesh>
            </group>
          ))}
      </group>
      <instancedMesh ref={cadono} args={[undefined, undefined, gocce.length]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshStandardMaterial color="#3E2536" roughness={0.35} />
      </instancedMesh>
    </group>
  );
}
