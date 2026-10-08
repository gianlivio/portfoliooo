"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import archivio from "@/public/dati/archivio.json";
import { disegnaCopertina, type DatiCopertina, type Famiglie } from "./copertina";

/**
 * La scena: chi visita sta al centro di un anello di carte, una per lavoro.
 * Intorno, oltre le carte, la nuvola dei contratti ANAC dell'Osservatorio.
 * Si trascina per guardarsi intorno, si clicca una carta per avvicinarla.
 */

export type Carta = { id: string; dati: Omit<DatiCopertina, "immagine">; immagine: string | null };

type Props = {
  carte: Carta[];
  selezionato: string | null;
  onSeleziona: (id: string | null) => void;
  onInteragisci: () => void;
  onPronta: () => void;
  ridotto: boolean;
  stretto: boolean;
};

const RAGGIO = 6;
const LARGO = 2.4;
const ALTO = 1.65;
const FONDO = "#0B0C10";
const QUOTE = [0.3, -0.28, 0.45, -0.38, 0.12, -0.12];

const angoloDi = (i: number, n: number) => (i / n) * Math.PI * 2;
const quotaDi = (i: number) => QUOTE[i % QUOTE.length];
const direzione = (yaw: number) => new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));

/** Riporta b nel giro più vicino ad a, per non fare il giro lungo. */
function piuVicino(a: number, b: number) {
  const giro = Math.PI * 2;
  return b + Math.round((a - b) / giro) * giro;
}

function leggiFamiglie(): Famiglie {
  const s = getComputedStyle(document.documentElement);
  const v = (nome: string, riserva: string) => s.getPropertyValue(nome).trim() || riserva;
  return {
    serif: v("--font-serif", "Georgia, serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

function caricaImmagine(src: string) {
  return new Promise<HTMLImageElement | null>((risolvi) => {
    const img = new Image();
    img.onload = () => risolvi(img);
    img.onerror = () => risolvi(null);
    img.src = src;
  });
}

/* ------------------------------------------------------------------ carte */

function Carte({
  carte, selezionato, onSeleziona, ridotto, onPronta,
}: Pick<Props, "carte" | "selezionato" | "onSeleziona" | "ridotto" | "onPronta">) {
  const [texture, setTexture] = useState<THREE.CanvasTexture[] | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  const gruppi = useRef<(THREE.Group | null)[]>([]);
  const materiali = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const inizio = useRef<number | null>(null);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let annullato = false;
    (async () => {
      const f = leggiFamiglie();
      await Promise.all([
        document.fonts.load(`300 64px ${f.serif}`),
        document.fonts.load(`400 20px ${f.mono}`),
        document.fonts.load(`500 20px ${f.mono}`),
      ]).catch(() => undefined);
      const immagini = await Promise.all(
        carte.map((c) => (c.immagine ? caricaImmagine(c.immagine) : Promise.resolve(null)))
      );
      if (annullato) return;
      const anis = gl.capabilities.getMaxAnisotropy();
      const fatte = carte.map((c, i) => {
        const tela = document.createElement("canvas");
        disegnaCopertina(tela, { ...c.dati, immagine: immagini[i] }, f, 1000 + i * 97);
        const t = new THREE.CanvasTexture(tela);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = anis;
        return t;
      });
      setTexture(fatte);
      onPronta();
    })();
    return () => {
      annullato = true;
    };
    // le carte cambiano solo con la lingua, e allora la scena si rimonta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => texture?.forEach((t) => t.dispose()), [texture]);

  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [sopra]);

  useFrame((stato, dt) => {
    if (!texture) return;
    if (inizio.current === null) inizio.current = stato.clock.elapsedTime;
    const t = stato.clock.elapsedTime - inizio.current;
    const k = 1 - Math.exp(-dt * 8);
    carte.forEach((c, i) => {
      const g = gruppi.current[i];
      const m = materiali.current[i];
      if (!g || !m) return;
      // montaggio: le carte salgono e compaiono una dopo l'altra in 1,6 s
      const entrata = ridotto ? 1 : THREE.MathUtils.smoothstep(t, i * 0.09, i * 0.09 + 0.7);
      const fluttua = ridotto ? 0 : Math.sin(stato.clock.elapsedTime * 0.6 + i * 1.7) * 0.05;
      g.position.y = quotaDi(i) + fluttua - (1 - entrata) * 0.8;
      const scala = c.id === sopra && !selezionato ? 1.07 : 1;
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, scala, k));
      const opaca = selezionato && selezionato !== c.id ? 0.18 : 1;
      m.opacity = THREE.MathUtils.lerp(m.opacity, opaca * entrata, k);
    });
  });

  if (!texture) return null;

  return (
    <>
      {carte.map((c, i) => {
        const a = angoloDi(i, carte.length);
        const p = direzione(a).multiplyScalar(RAGGIO);
        return (
          <group
            key={c.id}
            ref={(g) => {
              gruppi.current[i] = g;
            }}
            position={[p.x, quotaDi(i), p.z]}
            rotation={[0, -a, 0]}
          >
            <mesh
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                setSopra(c.id);
              }}
              onPointerOut={() => setSopra((s) => (s === c.id ? null : s))}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (e.delta > 6) return; // era un trascinamento
                onSeleziona(c.id);
              }}
            >
              <planeGeometry args={[LARGO, ALTO]} />
              <meshBasicMaterial
                ref={(m) => {
                  materiali.current[i] = m;
                }}
                map={texture[i]}
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------- nuvola */

function Nuvola({ ridotto, stretto }: { ridotto: boolean; stretto: boolean }) {
  const punti = useRef<THREE.Points>(null);
  const materiale = useRef<THREE.PointsMaterial>(null);

  const geometria = useMemo(() => {
    const righe = (archivio as { punti: [number, number, number][] }).punti;
    const passo = stretto ? 2 : 1;
    const scelte = righe.filter((_, i) => i % passo === 0);
    const log = scelte.map((r) => Math.log10(Math.max(r[1], 1)));
    const min = Math.min(...log);
    const max = Math.max(...log);
    let s = 7;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const pos = new Float32Array(scelte.length * 3);
    const col = new Float32Array(scelte.length * 3);
    const blu = new THREE.Color("#4C6BFF");
    const grigio = new THREE.Color("#8C8E88");
    scelte.forEach((r, i) => {
      // anno → angolo intorno a chi guarda, importo → distanza
      const a = ((r[0] - 2015 + rnd()) / 11) * Math.PI * 2;
      const d = 9 + ((log[i] - min) / (max - min || 1)) * 7 + rnd() * 0.6;
      pos[i * 3] = Math.sin(a) * d;
      pos[i * 3 + 1] = (rnd() - 0.5) * 7 + (rnd() - 0.5) * 2;
      pos[i * 3 + 2] = -Math.cos(a) * d;
      const c = r[2] ? blu : grigio;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [stretto]);

  useEffect(() => () => geometria.dispose(), [geometria]);

  useFrame((stato, dt) => {
    if (punti.current && !ridotto) punti.current.rotation.y += dt * 0.012;
    if (materiale.current) {
      materiale.current.opacity = THREE.MathUtils.lerp(
        materiale.current.opacity, 0.85, 1 - Math.exp(-dt * 1.2)
      );
    }
  });

  return (
    <points ref={punti} geometry={geometria} raycast={() => null}>
      <pointsMaterial
        ref={materiale}
        size={0.07}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Un orizzonte: un cerchio sottile sotto le carte, per dare un suolo allo spazio. */
function Orizzonte() {
  const linea = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(Math.sin(a) * RAGGIO, -1.55, -Math.cos(a) * RAGGIO);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.LineBasicMaterial({ color: "#1B3FD1", transparent: true, opacity: 0.55 });
    return new THREE.Line(g, m);
  }, []);
  useEffect(
    () => () => {
      linea.geometry.dispose();
      (linea.material as THREE.Material).dispose();
    },
    [linea]
  );
  return <primitive object={linea} raycast={() => null} />;
}

/* ----------------------------------------------------------------- camera */

function Regia({
  carte, selezionato, onSeleziona, onInteragisci, ridotto, stretto,
}: Omit<Props, "onPronta">) {
  const { camera, gl } = useThree();
  const s = useRef({
    yaw: 0, pitch: 0, vy: 0, vp: 0,
    trascina: false, lx: 0, ly: 0, ultimo: -1e9,
  });
  const selRif = useRef(selezionato);
  useEffect(() => {
    selRif.current = selezionato;
  }, [selezionato]);

  useEffect(() => {
    const el = gl.domElement;
    const giu = (e: PointerEvent) => {
      s.current.trascina = true;
      s.current.lx = e.clientX;
      s.current.ly = e.clientY;
    };
    const muovi = (e: PointerEvent) => {
      const st = s.current;
      if (!st.trascina) return;
      const dx = e.clientX - st.lx;
      const dy = e.clientY - st.ly;
      st.lx = e.clientX;
      st.ly = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      if (selRif.current && Math.abs(dx) > 4) onSeleziona(null);
      const k = e.pointerType === "touch" ? 0.006 : 0.0042;
      st.vy = -dx * k;
      st.vp = dy * k * 0.6;
      st.yaw += st.vy;
      st.pitch = THREE.MathUtils.clamp(st.pitch + st.vp, -0.32, 0.32);
      st.ultimo = performance.now();
      onInteragisci();
    };
    const su = () => {
      s.current.trascina = false;
    };
    const rotella = (e: WheelEvent) => {
      e.preventDefault();
      if (selRif.current) return;
      s.current.vy += (e.deltaY + e.deltaX) * 0.0005;
      s.current.ultimo = performance.now();
      onInteragisci();
    };
    el.addEventListener("pointerdown", giu);
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", su);
    window.addEventListener("pointercancel", su);
    el.addEventListener("wheel", rotella, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", giu);
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", su);
      window.removeEventListener("pointercancel", su);
      el.removeEventListener("wheel", rotella);
    };
  }, [gl, onSeleziona, onInteragisci]);

  // la camera parte già girata verso la prima carta
  useEffect(() => {
    camera.position.set(0, 0, 0);
  }, [camera]);

  const bersaglio = useRef(new THREE.Vector3());
  const sguardo = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const st = s.current;
    const posBersaglio = bersaglio.current;
    const guarda = sguardo.current;
    const n = carte.length;
    const i = selezionato ? carte.findIndex((c) => c.id === selezionato) : -1;
    const ease = (v: number) => (ridotto ? 1 : 1 - Math.exp(-dt * v));

    if (i >= 0) {
      const a = angoloDi(i, n);
      const yawB = piuVicino(st.yaw, a);
      st.yaw = THREE.MathUtils.lerp(st.yaw, yawB, ease(3.2));
      const pitchB = stretto ? -0.2 : 0;
      st.pitch = THREE.MathUtils.lerp(st.pitch, pitchB, ease(3.2));
      st.vy = 0;
      const dist = stretto ? 4.3 : 3.1;
      posBersaglio.copy(direzione(a)).multiplyScalar(RAGGIO - dist);
      // la vignetta copre il lato destro: la camera scivola a destra e la carta resta a sinistra, di fronte
      const lato = stretto ? 0 : 0.95;
      posBersaglio.x += Math.cos(a) * lato;
      posBersaglio.z += Math.sin(a) * lato;
      posBersaglio.y = quotaDi(i) * 0.8;
    } else {
      if (!st.trascina) {
        st.yaw += st.vy;
        st.vy *= Math.pow(0.92, dt * 60);
        st.vp *= 0.9;
        const fermo = performance.now() - st.ultimo > 2500;
        if (fermo) st.pitch = THREE.MathUtils.lerp(st.pitch, 0, ease(0.8));
        if (fermo && !ridotto) st.yaw += dt * 0.035;
      }
      posBersaglio.set(0, 0, 0);
    }

    camera.position.lerp(posBersaglio, ease(2.4));
    guarda
      .set(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        -Math.cos(st.yaw) * Math.cos(st.pitch)
      )
      .add(camera.position);
    camera.lookAt(guarda);
  });

  return null;
}

/* ------------------------------------------------------------------ scena */

export default function Scena(props: Props) {
  const { stretto } = props;
  return (
    <Canvas
      className="tela"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: stretto ? 72 : 55, near: 0.05, far: 60, position: [0, 0, 0] }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(FONDO);
        scene.fog = new THREE.FogExp2(FONDO, 0.045);
      }}
      onPointerMissed={(e) => {
        if (e.type === "click") props.onSeleziona(null);
      }}
    >
      <Regia {...props} />
      <Carte
        carte={props.carte}
        selezionato={props.selezionato}
        onSeleziona={props.onSeleziona}
        ridotto={props.ridotto}
        onPronta={props.onPronta}
      />
      <Nuvola ridotto={props.ridotto} stretto={stretto} />
      <Orizzonte />
    </Canvas>
  );
}
