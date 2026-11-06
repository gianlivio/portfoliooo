"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { pillola } from "./base";
import { CANE, Fotogrammi, FotogrammiCane, FotogrammiGallina, GALLINA, H, L, RIGHE, Y0, type Posa, type PosaCane } from "./pixel";
import { PERSONAGGI, TESTI, zona, type Azione, type Personaggio, type ZonaId } from "@/content/casa";
import { POLLAIO } from "@/content/casaLuoghi";
import { generatore } from "./base";
import { musica } from "../musica";
import type { Lingua } from "@/dictionaries";

/*
 * Le persone e gli animali. Livio accompagna la visita: sta nella zona in cui si trova il visitatore,
 * e quando ci arriva saluta; Romero, il cane, gli corre dietro e gli si siede accanto. Mia madre sta a
 * Chiaramonte, al cassone. Le galline razzolano nel recinto. Un clic su una persona apre il dialogo;
 * su Romero abbaia, su una gallina fa coccodè.
 */

function Figura({
  p,
  pos,
  azione,
  parla,
  saluta,
  lingua,
  onParla,
}: {
  p: Personaggio;
  pos: [number, number, number];
  azione: Azione;
  parla: boolean;
  saluta?: boolean;
  lingua: Lingua;
  onParla: (id: string) => void;
}) {
  const alto = p.aspetto.altezza ?? 1.75;
  // un pixel in metri: la figura, dai capelli alla suola, è alta 52 righe
  const px = alto / (RIGHE - 1);
  const fotogrammi = useMemo(() => new Fotogrammi(p.aspetto), [p]);
  const iniziale = useMemo(() => fotogrammi.prendi({ posa: "fermo", f: 0, chiusi: false, bocca: false }), [fotogrammi]);
  const materiale = useRef<THREE.MeshBasicMaterial>(null);
  const g = useRef<THREE.Group>(null);
  const etichetta = useRef<THREE.Sprite>(null);
  const nome = useMemo(() => pillola(p.nome[lingua], p.sotto[lingua]), [p, lingua]);
  const { camera } = useThree();
  const caso = useMemo(() => generatore(p.id.length * 7919 + 13), [p.id]);
  const stato = useRef({ inizio: -1, battito: 2.5, bocca: false, prossimaBocca: 0, sfasa: p.id.length * 0.7 });
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime, s = stato.current;
    if (s.inizio < 0) s.inizio = t;
    const dx = camera.position.x - g.current.position.x, dz = camera.position.z - g.current.position.z;
    const d = Math.hypot(dx, dz);
    // sempre rivolta verso chi guarda, come nei giochi a 16 bit
    g.current.rotation.y = Math.atan2(dx, dz);
    const posa: Posa = parla ? "parla" : saluta && t - s.inizio < 2.8 ? "saluta" : azione === "fermo" ? "fermo" : azione;
    const ritmo = posa === "saluta" ? 0.22 : posa === "parla" ? 0.42 : posa === "abbacchia" ? 0.3 : posa === "fermo" ? 0.8 : 0.55;
    const f = (Math.floor((t + s.sfasa) / ritmo) % 2) as 0 | 1;
    if (t > s.battito) s.battito = t + 2.5 + caso() * 3.5;
    const chiusi = s.battito - t < 0.13;
    if (parla && t > s.prossimaBocca) {
      s.bocca = !s.bocca;
      s.prossimaBocca = t + 0.08 + caso() * 0.14;
    }
    const mappa = fotogrammi.prendi({ posa, f, chiusi, bocca: parla && s.bocca });
    const m = materiale.current;
    if (m && m.map !== mappa) {
      m.map = mappa;
      m.needsUpdate = true;
    }
    if (etichetta.current) {
      const o = THREE.MathUtils.clamp(1.7 - d / 14, 0, 1);
      (etichetta.current.material as THREE.SpriteMaterial).opacity = o;
      etichetta.current.visible = o > 0.02;
    }
  });
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    onParla(p.id);
  };
  // la tela è 32 × 80: la suola sta alla riga Y0 + 52, una riga sopra il bordo basso
  const largo = L * px, altoTela = H * px;
  const centro = altoTela / 2 - (H - (Y0 + RIGHE)) * px;
  return (
    <group
      ref={g}
      position={pos}
      onClick={clic}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, centro, 0]} renderOrder={3}>
        <planeGeometry args={[largo, altoTela]} />
        <meshBasicMaterial ref={materiale} map={iniziale} alphaTest={0.5} side={THREE.DoubleSide} color="#FFF6EA" />
      </mesh>
      {/* l'ombra morbida a terra */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* un volume invisibile, più facile da cliccare della figura */}
      <mesh position={[0, alto / 2, 0]} visible={false}>
        <boxGeometry args={[0.8, alto + 0.1, 0.8]} />
      </mesh>
      <sprite ref={etichetta} position={[0, alto + 0.45, 0]} scale={[0.3 * nome.rapporto, 0.3, 1]} renderOrder={10}>
        <spriteMaterial map={nome.texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

/* ------------------------------------------------------------------ Romero */

/** Romero: corre dietro a Livio quando cambia posto, poi si siede accanto a lui e scodinzola. */
function Romero({ verso, lingua }: { verso: [number, number, number]; lingua: Lingua }) {
  const fotogrammi = useMemo(() => new FotogrammiCane(), []);
  const iniziale = useMemo(() => fotogrammi.prendi("seduto", 0), [fotogrammi]);
  const materiale = useRef<THREE.MeshBasicMaterial>(null);
  const g = useRef<THREE.Group>(null), figura = useRef<THREE.Mesh>(null), etichetta = useRef<THREE.Sprite>(null);
  const nome = useMemo(() => pillola("Romero", TESTI.romero[lingua]), [lingua]);
  const { camera } = useThree();
  const st = useRef({ abbaia: -10, primo: true });
  // un pixel è 4 cm: Romero è lungo un metro e mezzo di tela, alto mezzo metro alla spalla
  const px = 0.028;
  useFrame(({ clock }, dtGrezzo) => {
    const gr = g.current;
    if (!gr) return;
    const dt = Math.min(dtGrezzo, 0.1), t = clock.elapsedTime, s = st.current;
    const meta = new THREE.Vector3(verso[0], 0, verso[2]);
    if (s.primo || gr.position.distanceTo(meta) > 40) {
      gr.position.copy(meta);
      s.primo = false;
    }
    const d = meta.clone().sub(gr.position);
    const lontano = d.length();
    let posa: PosaCane = "seduto";
    if (lontano > 0.15) {
      const passo = Math.min(lontano, 7 * dt);
      gr.position.addScaledVector(d.normalize(), passo);
      posa = "cammina";
    }
    if (s.abbaia === Infinity) s.abbaia = t;
    if (t - s.abbaia < 1.2) posa = "abbaia";
    // di profilo verso dove va: la tela si specchia se va a sinistra di chi guarda
    const verCamera = new THREE.Vector3(camera.position.x - gr.position.x, 0, camera.position.z - gr.position.z);
    gr.rotation.y = Math.atan2(verCamera.x, verCamera.z);
    const destra = new THREE.Vector3(verCamera.z, 0, -verCamera.x).normalize();
    const versoX = lontano > 0.15 ? Math.sign(d.dot(destra)) || 1 : 1;
    if (figura.current) figura.current.scale.x = versoX;
    const f = (Math.floor(t / (posa === "cammina" ? 0.12 : posa === "abbaia" ? 0.15 : 0.35)) % 2) as 0 | 1;
    const mappa = fotogrammi.prendi(posa, f);
    const m = materiale.current;
    if (m && m.map !== mappa) {
      m.map = mappa;
      m.needsUpdate = true;
    }
    if (etichetta.current) {
      const o = THREE.MathUtils.clamp(1.4 - Math.hypot(verCamera.x, verCamera.z) / 10, 0, 1);
      (etichetta.current.material as THREE.SpriteMaterial).opacity = o;
      etichetta.current.visible = o > 0.02;
    }
  });
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    st.current.abbaia = Infinity;
    musica.verso("cane");
  };
  return (
    <group ref={g} onClick={clic} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh ref={figura} position={[0, (CANE.h * px) / 2 - px, 0]} renderOrder={3}>
        <planeGeometry args={[CANE.l * px, CANE.h * px]} />
        <meshBasicMaterial ref={materiale} map={iniziale} alphaTest={0.5} side={THREE.DoubleSide} color="#FFF6EA" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.32, 18]} />
        <meshBasicMaterial color="#000" transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.4, 0]} visible={false}>
        <boxGeometry args={[1.0, 0.8, 0.7]} />
      </mesh>
      <sprite ref={etichetta} position={[0, 1.05, 0]} scale={[0.24 * nome.rapporto, 0.24, 1]} renderOrder={10}>
        <spriteMaterial map={nome.texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

/* ------------------------------------------------------------------ le galline */

const COLORI_GALLINE = ["#8A4E2A", "#F1ECE2", "#2A2622", "#A8642E", "#C9B48A", "#8A4E2A", "#5A3A26"];

/** Le galline: girano a piccoli passi nel recinto, si fermano, beccano. */
function Galline() {
  const g = useRef<THREE.Group[]>([]), f = useRef<THREE.Mesh[]>([]);
  const fotogrammi = useMemo(() => COLORI_GALLINE.map((c) => new FotogrammiGallina(c)), []);
  const iniziali = useMemo(() => fotogrammi.map((fo) => fo.prendi(false, 0)), [fotogrammi]);
  const materiali = useRef<THREE.MeshBasicMaterial[]>([]);
  const stato = useMemo(() => {
    const caso = generatore(55);
    return COLORI_GALLINE.map(() => ({
      p: new THREE.Vector3(POLLAIO.x + (caso() - 0.5) * (POLLAIO.l - 2), 0, POLLAIO.z + (caso() - 0.5) * (POLLAIO.p - 2)),
      meta: new THREE.Vector3(),
      ferma: caso() * 3,
      becca: false,
      caso,
      coccode: -10,
    }));
  }, []);
  const { camera } = useThree();
  useFrame(({ clock }, dtGrezzo) => {
    const dt = Math.min(dtGrezzo, 0.1), t = clock.elapsedTime;
    stato.forEach((s, i) => {
      const gr = g.current[i];
      if (!gr) return;
      if (s.ferma > 0) {
        s.ferma -= dt;
        if (s.ferma <= 0) {
          // un nuovo posto nel recinto, non lontano
          s.meta.set(
            THREE.MathUtils.clamp(s.p.x + (s.caso() - 0.5) * 3, POLLAIO.x - POLLAIO.l / 2 + 0.6, POLLAIO.x + POLLAIO.l / 2 - 0.6),
            0,
            THREE.MathUtils.clamp(s.p.z + (s.caso() - 0.5) * 3, POLLAIO.z - POLLAIO.p / 2 + 0.6, POLLAIO.z + POLLAIO.p / 2 - 0.6)
          );
        }
      }
      const d = s.meta.clone().sub(s.p);
      const muove = s.ferma <= 0 && d.length() > 0.05;
      if (muove) s.p.addScaledVector(d.normalize(), Math.min(d.length(), 0.9 * dt));
      else if (s.ferma <= 0) {
        s.ferma = 1 + s.caso() * 4;
        s.becca = s.caso() < 0.6;
      }
      gr.position.copy(s.p);
      const vc = new THREE.Vector3(camera.position.x - s.p.x, 0, camera.position.z - s.p.z);
      gr.rotation.y = Math.atan2(vc.x, vc.z);
      const destra = new THREE.Vector3(vc.z, 0, -vc.x).normalize();
      if (muove && f.current[i]) f.current[i].scale.x = Math.sign(d.dot(destra)) || 1;
      const fr = (Math.floor((t + i * 0.37) / (muove ? 0.14 : 0.32)) % 2) as 0 | 1;
      const mappa = fotogrammi[i].prendi(!muove && s.becca, fr);
      const m = materiali.current[i];
      if (m && m.map !== mappa) {
        m.map = mappa;
        m.needsUpdate = true;
      }
      // un saltello quando si clicca
      if (s.coccode === Infinity) s.coccode = t;
      gr.position.y = t - s.coccode < 0.4 ? Math.sin(((t - s.coccode) / 0.4) * Math.PI) * 0.25 : 0;
    });
  });
  const px = 0.034;
  return (
    <group>
      {stato.map((s, i) => (
        <group
          key={i}
          ref={(e) => {
            if (e) g.current[i] = e;
          }}
          onClick={(e) => {
            if (e.delta > 8) return;
            e.stopPropagation();
            s.coccode = Infinity;
            musica.verso("gallina");
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <mesh
            ref={(m) => {
              if (m) f.current[i] = m;
            }}
            position={[0, (GALLINA.h * px) / 2 - px, 0]}
            renderOrder={3}
          >
            <planeGeometry args={[GALLINA.l * px, GALLINA.h * px]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) materiali.current[i] = m;
              }}
              map={iniziali[i]}
              alphaTest={0.5}
              side={THREE.DoubleSide}
              color="#FFF6EA"
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ tutti */

export default function Persone({
  zonaLivio,
  parlante,
  lingua,
  onParla,
}: {
  zonaLivio: ZonaId;
  parlante: string | null;
  lingua: Lingua;
  onParla: (id: string) => void;
}) {
  const livio = PERSONAGGI[0];
  const z = zona(zonaLivio);
  // Romero si siede accanto a Livio, alla sua sinistra per chi guarda dalla zona, un passo indietro
  const dx = z.livio[0] - z.camera[0], dz = z.livio[2] - z.camera[2], l = Math.hypot(dx, dz) || 1;
  const cane: [number, number, number] = [z.livio[0] + (dz / l) * 0.95 + (dx / l) * 0.3, 0, z.livio[2] - (dx / l) * 0.95 + (dz / l) * 0.3];
  return (
    <group>
      <Figura key={zonaLivio} p={livio} pos={z.livio} azione="fermo" parla={parlante === "livio"} saluta lingua={lingua} onParla={onParla} />
      {PERSONAGGI.slice(1).map((p) => (
        <Figura key={p.id} p={p} pos={p.pos as [number, number, number]} azione={p.azione ?? "fermo"} parla={parlante === p.id} lingua={lingua} onParla={onParla} />
      ))}
      <Romero verso={cane} lingua={lingua} />
      <Galline />
    </group>
  );
}
