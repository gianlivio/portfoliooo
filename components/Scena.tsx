"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import archivio from "@/public/dati/archivio.json";
import { disegnaCopertina, FINESTRA, LARGHEZZA, ALTEZZA, type DatiCopertina, type Famiglie } from "./copertina";

/**
 * La scena: chi visita sta al centro di un anello di carte, una per lavoro.
 * Sopra ogni carta, in filigrana, il testo che sta dietro quel lavoro.
 * Oltre le carte, la polvere dei contratti ANAC dell'Osservatorio.
 * Si trascina per guardarsi intorno, si clicca (o Invio) per avvicinare una carta.
 */

export type Tema = "scuro" | "chiaro";

export type Carta = {
  id: string;
  dati: Omit<DatiCopertina, "immagine" | "finestraVuota">;
  immagine: string | null;
  frammento: string;
};

type Props = {
  carte: Carta[];
  selezionato: string | null;
  focale: number | null;
  onSeleziona: (id: string | null) => void;
  onInteragisci: () => void;
  onPronta: () => void;
  ridotto: boolean;
  stretto: boolean;
  tema: Tema;
  conIngresso: boolean;
};

/* Ogni tema cambia più dei colori: luce, densità, peso dei segni. */
export const PALETTE = {
  scuro: {
    fondo: "#0B0C10",
    nebbia: 0.042,
    carta: "#F3F1EB",
    filigrana: "#E9E6DD",
    filigranaRiposo: 0.1,
    punti: "#6E706A",
    puntiOpacita: 0.55,
    puntiDim: 0.05,
    orizzonte: "#2E3038",
    segno: "#F3F1EB",
    ombra: 0,
  },
  chiaro: {
    fondo: "#EFEDE6",
    nebbia: 0.034,
    carta: "#FFFFFF",
    filigrana: "#16171A",
    filigranaRiposo: 0.12,
    punti: "#16171A",
    puntiOpacita: 0.3,
    puntiDim: 0.04,
    orizzonte: "#C9C6BC",
    segno: "#1B3FD1",
    ombra: 0.1,
  },
} as const;

const RAGGIO = 6;
const LARGO = 2.4;
const ALTO = 1.65;
const QUOTE = [0.3, -0.22, 0.42, -0.34, 0.12, -0.1];
const SUOLO = -1.55;

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

/** Il frammento è disegnato in bianco: il colore lo dà il materiale, secondo il tema. */
function disegnaFrammento(testo: string, mono: string) {
  const tela = document.createElement("canvas");
  tela.width = 1024;
  tela.height = 440;
  const ctx = tela.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `400 25px ${mono}`;
    ctx.textBaseline = "top";
    testo.split("\n").slice(0, 10).forEach((riga, i) => ctx.fillText(riga, 8, 8 + i * 40));
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ombra morbida, una sola texture per tutte le carte. */
function disegnaOmbra() {
  const tela = document.createElement("canvas");
  tela.width = tela.height = 128;
  const ctx = tela.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(tela);
}

/* ------------------------------------------------------------------ carte */

type Grafica = {
  copertine: THREE.CanvasTexture[];
  frammenti: THREE.CanvasTexture[];
  schermi: (THREE.Texture | null)[];
  ombra: THREE.CanvasTexture;
};

/* La finestra della carta in unità della scena, ricavata da FINESTRA in pixel. */
const FIN_L = (FINESTRA.w / LARGHEZZA) * LARGO;
const FIN_A = (FINESTRA.h / ALTEZZA) * ALTO;
const FIN_X = ((FINESTRA.x + FINESTRA.w / 2) / LARGHEZZA) * LARGO - LARGO / 2;
const FIN_Y = ALTO / 2 - ((FINESTRA.y + FINESTRA.h / 2) / ALTEZZA) * ALTO;

/** Quanta parte della pagina entra nella finestra (0–1, in altezza). */
function quotaVisibile(img: HTMLImageElement) {
  return Math.min(1, (FIN_A / FIN_L) * (img.naturalWidth / img.naturalHeight));
}

function Carte({
  carte, selezionato, focale, onSeleziona, ridotto, onPronta, tema, conIngresso,
}: Omit<Props, "onInteragisci" | "stretto">) {
  const [grafica, setGrafica] = useState<Grafica | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  const gruppi = useRef<(THREE.Group | null)[]>([]);
  const lastre = useRef<(THREE.Mesh | null)[]>([]);
  const materiali = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const filigrane = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const ombre = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const vetri = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const scorrimento = useRef<{ p: number; verso: number }[]>([]);
  const puntatore = useRef(new THREE.Vector2());
  const inizio = useRef<number | null>(null);
  const gl = useThree((s) => s.gl);
  const p = PALETTE[tema];

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
      const copertine = carte.map((c, i) => {
        const tela = document.createElement("canvas");
        const conSchermo = !!immagini[i];
        disegnaCopertina(
          tela,
          { ...c.dati, immagine: null, finestraVuota: conSchermo },
          f, 1000 + i * 97, PALETTE[tema].carta
        );
        const t = new THREE.CanvasTexture(tela);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = anis;
        return t;
      });
      const frammenti = carte.map((c) => {
        const t = disegnaFrammento(c.frammento, f.mono);
        t.anisotropy = anis;
        return t;
      });
      const schermi = immagini.map((img) => {
        if (!img) return null;
        const t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = anis;
        const q = quotaVisibile(img);
        t.repeat.set(1, q);
        t.offset.set(0, 1 - q); // si parte dall'alto della pagina
        t.needsUpdate = true;
        return t;
      });
      setGrafica({ copertine, frammenti, schermi, ombra: disegnaOmbra() });
      onPronta();
    })();
    return () => {
      annullato = true;
    };
    // la grafica dipende da lingua e tema: quando cambiano la scena si rimonta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      grafica?.copertine.forEach((t) => t.dispose());
      grafica?.schermi.forEach((t) => t?.dispose());
      grafica?.frammenti.forEach((t) => t.dispose());
      grafica?.ombra.dispose();
    },
    [grafica]
  );

  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [sopra]);

  useFrame((stato, dt) => {
    if (!grafica) return;
    if (inizio.current === null) inizio.current = stato.clock.elapsedTime;
    const t = stato.clock.elapsedTime - inizio.current;
    const k = 1 - Math.exp(-dt * (ridotto ? 60 : 7));
    const n = carte.length;
    carte.forEach((c, i) => {
      const g = gruppi.current[i];
      const lastra = lastre.current[i];
      const m = materiali.current[i];
      const fil = filigrane.current[i];
      const om = ombre.current[i];
      if (!g || !lastra || !m || !fil) return;

      // ingresso: le carte compaiono una dopo l'altra, salendo dal suolo
      const entrata = ridotto || !conIngresso ? 1 : THREE.MathUtils.smoothstep(t, 0.3 + i * 0.08, 0.3 + i * 0.08 + 0.9);
      const attiva = c.id === selezionato || (!selezionato && (c.id === sopra || focale === i));
      const altra = !!selezionato && c.id !== selezionato;

      // posizione: la carta attiva si stacca dall'anello verso chi guarda
      const a = angoloDi(i, n);
      const r = RAGGIO - (attiva && !selezionato ? 0.35 : 0);
      g.position.x = THREE.MathUtils.lerp(g.position.x, Math.sin(a) * r, k);
      g.position.z = THREE.MathUtils.lerp(g.position.z, -Math.cos(a) * r, k);
      g.position.y = quotaDi(i) - (1 - entrata) * 0.9;

      // inclinazione verso il puntatore, solo sulla carta sotto il mouse
      const inclina = c.id === sopra && !selezionato && !ridotto;
      const rx = inclina ? -puntatore.current.y * 0.12 : 0;
      const ry = inclina ? puntatore.current.x * 0.16 : 0;
      lastra.rotation.x = THREE.MathUtils.lerp(lastra.rotation.x, rx, k);
      lastra.rotation.y = THREE.MathUtils.lerp(lastra.rotation.y, ry, k);

      m.opacity = THREE.MathUtils.lerp(m.opacity, (altra ? 0.02 : 1) * entrata, k);

      // la pagina del sito scorre nella finestra: avanti finché la carta è attiva, poi torna su
      const schermo = grafica.schermi[i];
      const vetro = vetri.current[i];
      if (schermo && vetro) {
        vetro.opacity = m.opacity;
        const corsa = 1 - schermo.repeat.y;
        const sc = (scorrimento.current[i] ??= { p: 0, verso: 1 });
        if (attiva && corsa > 0 && !ridotto) {
          sc.p += dt * 0.045 * sc.verso;
          if (sc.p >= corsa) { sc.p = corsa; sc.verso = -1; }
          if (sc.p <= 0) { sc.p = 0; sc.verso = 1; }
        } else {
          sc.p = THREE.MathUtils.lerp(sc.p, 0, 1 - Math.exp(-dt * 2.5));
          sc.verso = 1;
        }
        schermo.offset.y = corsa - sc.p;
      }
      const filB = c.id === selezionato ? 0.72 : attiva ? 0.42 : altra ? 0 : p.filigranaRiposo;
      fil.opacity = THREE.MathUtils.lerp(fil.opacity, filB * entrata, k * 0.6);
      if (om) om.opacity = THREE.MathUtils.lerp(om.opacity, p.ombra * (altra ? 0.3 : 1) * entrata * (attiva ? 0.7 : 1), k);
    });
  });

  if (!grafica) return null;

  return (
    <>
      {carte.map((c, i) => {
        const a = angoloDi(i, carte.length);
        const pos = direzione(a).multiplyScalar(RAGGIO);
        return (
          <group key={c.id}>
            <group
              ref={(g) => {
                gruppi.current[i] = g;
              }}
              position={[pos.x, quotaDi(i), pos.z]}
              rotation={[0, -a, 0]}
            >
              <mesh
                ref={(l) => {
                  lastre.current[i] = l;
                }}
                renderOrder={3}
                onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  setSopra(c.id);
                }}
                onPointerMove={(e: ThreeEvent<PointerEvent>) => {
                  if (e.uv) puntatore.current.set(e.uv.x * 2 - 1, e.uv.y * 2 - 1);
                }}
                onPointerOut={() => setSopra((s) => (s === c.id ? null : s))}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  if (e.delta > 6) return; // era un trascinamento
                  onSeleziona(c.id);
                }}
              >
                <planeGeometry args={[LARGO, ALTO]} />
                {grafica.schermi[i] && (
                  <mesh position={[FIN_X, FIN_Y, -0.004]} raycast={() => null} renderOrder={2}>
                    <planeGeometry args={[FIN_L + 0.02, FIN_A + 0.02]} />
                    <meshBasicMaterial
                      ref={(v) => {
                        vetri.current[i] = v;
                      }}
                      map={grafica.schermi[i]}
                      transparent
                      opacity={0}
                      toneMapped={false}
                    />
                  </mesh>
                )}
                <meshBasicMaterial
                  ref={(m) => {
                    materiali.current[i] = m;
                  }}
                  map={grafica.copertine[i]}
                  transparent
                  opacity={0}
                  toneMapped={false}
                />
              </mesh>
              {/* filigrana: il testo dietro il lavoro, sopra la carta e un passo indietro */}
              <mesh position={[-0.25, ALTO / 2 + 0.62, -0.9]} raycast={() => null} renderOrder={1}>
                <planeGeometry args={[2.9, 2.9 * (440 / 1024)]} />
                <meshBasicMaterial
                  ref={(m) => {
                    filigrane.current[i] = m;
                  }}
                  map={grafica.frammenti[i]}
                  color={p.filigrana}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
            {p.ombra > 0 && (
              <mesh
                position={[pos.x * 0.98, SUOLO + 0.01, pos.z * 0.98]}
                rotation={[-Math.PI / 2, 0, -a]}
                raycast={() => null}
              >
                <planeGeometry args={[LARGO * 0.95, 0.42]} />
                <meshBasicMaterial
                  ref={(m) => {
                    ombre.current[i] = m;
                  }}
                  map={grafica.ombra}
                  color="#000000"
                  transparent
                  opacity={0}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------- polvere */

function Polvere({ ridotto, stretto, tema }: { ridotto: boolean; stretto: boolean; tema: Tema }) {
  const punti = useRef<THREE.Points>(null);
  const materiale = useRef<THREE.PointsMaterial>(null);
  const p = PALETTE[tema];

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
    scelte.forEach((r, i) => {
      // anno → angolo intorno a chi guarda, importo → distanza
      const a = ((r[0] - 2015 + rnd()) / 11) * Math.PI * 2;
      const d = 9.5 + ((log[i] - min) / (max - min || 1)) * 7 + rnd() * 0.6;
      pos[i * 3] = Math.sin(a) * d;
      pos[i * 3 + 1] = SUOLO + Math.pow(rnd(), 1.6) * 6.5;
      pos[i * 3 + 2] = -Math.cos(a) * d;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [stretto]);

  useEffect(() => () => geometria.dispose(), [geometria]);

  useFrame((_, dt) => {
    if (punti.current && !ridotto) punti.current.rotation.y += dt * 0.006;
    if (materiale.current) {
      materiale.current.opacity = THREE.MathUtils.lerp(
        materiale.current.opacity, p.puntiOpacita, 1 - Math.exp(-dt * 0.8)
      );
    }
  });

  return (
    <points ref={punti} geometry={geometria} raycast={() => null}>
      <pointsMaterial
        ref={materiale}
        color={p.punti}
        size={p.puntiDim}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------- orizzonte */

/** Il rigo sotto le carte e un segno breve che lo percorre, un giro al minuto. */
function Orizzonte({ tema, ridotto }: { tema: Tema; ridotto: boolean }) {
  const p = PALETTE[tema];
  const segno = useRef<THREE.Group>(null);

  const [rigo, arco] = useMemo(() => {
    const cerchio = (da: number, a: number, passi: number) => {
      const pts: number[] = [];
      for (let i = 0; i <= passi; i++) {
        const t = da + ((a - da) * i) / passi;
        pts.push(Math.sin(t) * RAGGIO, SUOLO, -Math.cos(t) * RAGGIO);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return g;
    };
    const l1 = new THREE.Line(
      cerchio(0, Math.PI * 2, 256),
      new THREE.LineBasicMaterial({ color: p.orizzonte, transparent: true, opacity: 0.9 })
    );
    const l2 = new THREE.Line(
      cerchio(0, 0.32, 24),
      new THREE.LineBasicMaterial({ color: p.segno, transparent: true, opacity: 0.85 })
    );
    return [l1, l2];
  }, [p.orizzonte, p.segno]);

  useEffect(
    () => () => {
      [rigo, arco].forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    },
    [rigo, arco]
  );

  useFrame((_, dt) => {
    if (segno.current && !ridotto) segno.current.rotation.y -= dt * ((Math.PI * 2) / 60);
  });

  return (
    <>
      <primitive object={rigo} raycast={() => null} />
      <group ref={segno}>
        <primitive object={arco} raycast={() => null} />
      </group>
    </>
  );
}

/* ----------------------------------------------------------------- camera */

function Regia({
  carte, selezionato, focale, onSeleziona, onInteragisci, ridotto, stretto, conIngresso,
}: Omit<Props, "onPronta" | "tema">) {
  const { camera, gl } = useThree();
  const s = useRef({
    yaw: 0,
    pitch: conIngresso && !ridotto ? -0.22 : 0,
    vy: 0,
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
      st.yaw += st.vy;
      st.pitch = THREE.MathUtils.clamp(st.pitch + dy * k * 0.6, -0.3, 0.3);
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

  useEffect(() => {
    camera.position.set(0, conIngresso && !ridotto ? 0.9 : 0, 0);
  }, [camera, conIngresso, ridotto]);

  const bersaglio = useRef(new THREE.Vector3());
  const sguardo = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const st = s.current;
    const posB = bersaglio.current;
    const guarda = sguardo.current;
    const n = carte.length;
    const i = selezionato ? carte.findIndex((c) => c.id === selezionato) : -1;
    const ease = (v: number) => (ridotto ? 1 : 1 - Math.exp(-dt * v));

    if (i >= 0) {
      const a = angoloDi(i, n);
      st.yaw = THREE.MathUtils.lerp(st.yaw, piuVicino(st.yaw, a), ease(3));
      st.pitch = THREE.MathUtils.lerp(st.pitch, 0, ease(3));
      st.vy = 0;
      const dist = stretto ? 4.3 : 3.5;
      posB.copy(direzione(a)).multiplyScalar(RAGGIO - dist);
      // la vignetta copre il lato destro: la camera scivola a destra e la carta resta a sinistra, di fronte
      const lato = stretto ? 0 : 1.05;
      posB.x += Math.cos(a) * lato;
      posB.z += Math.sin(a) * lato;
      // un po' più in alto della carta, per inquadrare anche il testo che le sta sopra
      posB.y = quotaDi(i) + (stretto ? -0.55 : 0.38);
    } else {
      if (focale !== null && !st.trascina) {
        // da tastiera: la camera si gira verso la carta col fuoco
        st.yaw = THREE.MathUtils.lerp(st.yaw, piuVicino(st.yaw, angoloDi(focale, n)), ease(3.5));
        st.vy = 0;
      } else if (!st.trascina) {
        st.yaw += st.vy;
        st.vy *= Math.pow(0.92, dt * 60);
        const fermo = performance.now() - st.ultimo > 3000;
        if (fermo && !ridotto) st.yaw += dt * 0.018;
      }
      if (!st.trascina) st.pitch = THREE.MathUtils.lerp(st.pitch, 0, ease(1.1));
      posB.set(0, 0, 0);
    }

    camera.position.lerp(posB, ease(i >= 0 ? 2.4 : 1.4));
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
  const { stretto, tema } = props;
  const p = PALETTE[tema];
  return (
    <Canvas
      className="tela"
      aria-hidden="true"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: stretto ? 72 : 55, near: 0.05, far: 60, position: [0, 0, 0] }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(p.fondo);
        scene.fog = new THREE.FogExp2(p.fondo, p.nebbia);
      }}
      onPointerMissed={(e) => {
        if (e.type === "click") props.onSeleziona(null);
      }}
    >
      <Regia {...props} />
      <Carte
        carte={props.carte}
        selezionato={props.selezionato}
        focale={props.focale}
        onSeleziona={props.onSeleziona}
        ridotto={props.ridotto}
        onPronta={props.onPronta}
        tema={tema}
        conIngresso={props.conIngresso}
      />
      <Polvere ridotto={props.ridotto} stretto={stretto} tema={tema} />
      <Orizzonte tema={tema} ridotto={props.ridotto} />
    </Canvas>
  );
}
