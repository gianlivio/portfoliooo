"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Cielo from "./Cielo";
import Portale from "./Portale";
import Suolo, { CieloDiGiorno } from "./Suolo";
import { disegnaCopertina, FINESTRA, FLUO, LARGHEZZA, ALTEZZA, type DatiCopertina, type Famiglie } from "./copertina";

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
  lingua: string;
  /** con il modulo aperto le carte affondano nel suolo, una dopo l'altra */
  moduloAperto: boolean;
};

/* Ogni tema cambia più dei colori: luce, densità, peso dei segni. */
export const PALETTE = {
  scuro: {
    fondo: "#0B0C10",
    nebbia: 0.042,
    carta: "#F3F1EB",
    filigrana: "#E9E6DD",
    filigranaRiposo: 0.1,
    costellazione: "#E9E6DD",
  },
  chiaro: {
    fondo: "#E9ECEC",
    nebbia: 0.022,
    carta: "#FFFFFF",
    filigrana: "#16171A",
    filigranaRiposo: 0.12,
    costellazione: "#16171A",
  },
} as const;

const RAGGIO = 6;
/** a riposo lo sguardo scende appena: si vede il suolo, e lo specchio d'acqua non degenera in orizzontale */
const SGUARDO = -0.06;
const LARGO = 2.4;
const ALTO = 1.65;
const QUOTE = [0.3, -0.22, 0.42, -0.34, 0.12, -0.1];

/* Il faro: il segno sull'orizzonte fa un giro al minuto; quando passa sotto una carta,
   un fascio di luce la attraversa in diagonale. */
const GIRO_FARO = 60;
const ARCO_FARO = 0.32;
const faroAl = (t: number) => ARCO_FARO / 2 + (t * Math.PI * 2) / GIRO_FARO;
const DURATA_FASCIO = 0.34; // in radianti di giro del faro: circa 3,2 secondi

const RIFLESSO_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const RIFLESSO_FRAG = `
uniform float uFascia;
uniform float uForza;
uniform float uAlone;
uniform float uOpacita;
uniform vec2 uPuntatore;
uniform vec3 uColore;
varying vec2 vUv;
float rettangolo(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main(){
  // sagoma della carta con gli angoli arrotondati, in coordinate con le proporzioni vere
  vec2 p = (vUv - 0.5) * vec2(1.4545, 1.0);
  float dentro = 1.0 - smoothstep(-0.004, 0.004, rettangolo(p, vec2(0.7272, 0.5), 0.037));
  // fascio diagonale: un alone largo e un filo più netto al centro
  float d = vUv.x - vUv.y * 0.55;
  float x = d - uFascia;
  float fascio = exp(-pow(x / 0.12, 2.0)) * 0.6 + exp(-pow(x / 0.022, 2.0)) * 0.28;
  // riflesso che segue il puntatore
  vec2 dp = (vUv - uPuntatore) * vec2(1.4545, 1.0);
  float alone = exp(-dot(dp, dp) / 0.05) * uAlone;
  float luce = (fascio * uForza + alone * 0.16) * dentro * uOpacita;
  gl_FragColor = vec4(uColore * luce, 1.0);
}`;

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

/* ------------------------------------------------------------------ carte */

type Grafica = {
  copertine: THREE.CanvasTexture[];
  frammenti: THREE.CanvasTexture[];
  schermi: (THREE.Texture | null)[];
  /** nastro da cantiere che scorre, per i lavori in costruzione */
  nastri: (THREE.CanvasTexture | null)[];
  lampada: THREE.CanvasTexture;
};

/** Il nastro bianco e rosso dei cantieri, qui giallo fluo e nero: la scritta si ripete e scorre. */
function disegnaNastro(testo: string, mono: string) {
  const tela = document.createElement("canvas");
  tela.width = 1024;
  tela.height = 64;
  const c = tela.getContext("2d");
  if (c) {
    c.fillStyle = FLUO.giallo;
    c.fillRect(0, 0, 1024, 64);
    c.fillStyle = FLUO.nero;
    c.font = `500 30px ${mono}`;
    c.textBaseline = "middle";
    const pezzo = `▲ ${testo.toUpperCase()}   `;
    const w = c.measureText(pezzo).width;
    for (let x = 0; x < 1024; x += w) c.fillText(pezzo, x, 34);
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** La lampada che lampeggia sull'angolo del cartello. */
function disegnaLampada() {
  const tela = document.createElement("canvas");
  tela.width = tela.height = 128;
  const c = tela.getContext("2d");
  if (c) {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(0.18, FLUO.arancio);
    g.addColorStop(1, "rgba(255,107,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Riflesso = THREE.ShaderMaterial & {
  uniforms: Record<"uFascia" | "uForza" | "uAlone" | "uOpacita", { value: number }> & {
    uPuntatore: { value: THREE.Vector2 };
    uColore: { value: THREE.Color };
  };
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
  carte, selezionato, focale, onSeleziona, ridotto, onPronta, tema, conIngresso, moduloAperto, attiva,
}: Omit<Props, "onInteragisci" | "stretto" | "lingua"> & { attiva: React.MutableRefObject<string | null> }) {
  const [grafica, setGrafica] = useState<Grafica | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  const gruppi = useRef<(THREE.Group | null)[]>([]);
  const lastre = useRef<(THREE.Mesh | null)[]>([]);
  const materiali = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const filigrane = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const vetri = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const lampade = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const nastriMat = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const riflessi = useMemo(
    () =>
      carte.map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: RIFLESSO_VERT,
            fragmentShader: RIFLESSO_FRAG,
            uniforms: {
              uFascia: { value: -1 },
              uForza: { value: 0 },
              uAlone: { value: 0 },
              uOpacita: { value: 0 },
              uPuntatore: { value: new THREE.Vector2(0.5, 0.5) },
              uColore: { value: new THREE.Color(tema === "scuro" ? "#FFFFFF" : "#FFF8EC") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }) as Riflesso
      ),
    [carte, tema]
  );
  useEffect(() => () => riflessi.forEach((r) => r.dispose()), [riflessi]);
  const scorrimento = useRef<{ p: number; verso: number }[]>([]);
  const puntatore = useRef(new THREE.Vector2());
  const moduloRif = useRef(false);
  const opacitaPortale = useRef({ current: 0 });
  const famiglie = useMemo(() => leggiFamiglie(), []);
  const cambio = useRef(-1e9);
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
      const nastri = carte.map((c) =>
        c.dati.motivo === "cantiere" ? disegnaNastro(c.dati.avviso ?? "", f.mono) : null
      );
      setGrafica({ copertine, frammenti, schermi, nastri, lampada: disegnaLampada() });
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
      grafica?.nastri.forEach((t) => t?.dispose());
      grafica?.lampada.dispose();
      grafica?.frammenti.forEach((t) => t.dispose());
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

    // la carta attiva, per il cielo: aperta, sotto il mouse o col fuoco da tastiera
    attiva.current = moduloAperto
      ? null
      : selezionato ?? sopra ?? (focale !== null ? carte[focale]?.id ?? null : null);

    // il modulo aperto fa affondare le carte una dopo l'altra; alla chiusura riemergono
    if (moduloRif.current !== moduloAperto) {
      moduloRif.current = moduloAperto;
      cambio.current = stato.clock.elapsedTime;
    }
    const dalCambio = stato.clock.elapsedTime - cambio.current;

    carte.forEach((c, i) => {
      // il portale ha la sua grafica: qui gli si passa solo quanto deve essere visibile
      if (c.dati.contatto) {
        const entrataP = ridotto || !conIngresso ? 1 : THREE.MathUtils.smoothstep(t, 0.6 + i * 0.08, 1.8 + i * 0.08);
        const affondoP = moduloAperto
          ? THREE.MathUtils.smoothstep(dalCambio, 0, 1.2)
          : 1 - THREE.MathUtils.smoothstep(dalCambio, 0.3, 1.5);
        const bersaglio = entrataP * (1 - (ridotto ? (moduloAperto ? 1 : 0) : affondoP)) * (selezionato ? 0 : 1);
        opacitaPortale.current.current = THREE.MathUtils.lerp(opacitaPortale.current.current, bersaglio, k);
        return;
      }
      const g = gruppi.current[i];
      const lastra = lastre.current[i];
      const m = materiali.current[i];
      const fil = filigrane.current[i];
      if (!g || !lastra || !m || !fil) return;

      // ingresso: le carte compaiono una dopo l'altra, salendo dal suolo
      const entrata = ridotto || !conIngresso ? 1 : THREE.MathUtils.smoothstep(t, 0.3 + i * 0.08, 0.3 + i * 0.08 + 0.9);
      const accesa = c.id === selezionato || (!selezionato && (c.id === sopra || focale === i));
      const altra = !!selezionato && c.id !== selezionato;

      // posizione: la carta accesa si stacca dall'anello verso chi guarda
      const a = angoloDi(i, n);
      const r = RAGGIO - (accesa && !selezionato ? 0.35 : 0);
      g.position.x = THREE.MathUtils.lerp(g.position.x, Math.sin(a) * r, k);
      g.position.z = THREE.MathUtils.lerp(g.position.z, -Math.cos(a) * r, k);
      const affondo = ridotto
        ? (moduloAperto ? 1 : 0)
        : moduloAperto
          ? THREE.MathUtils.smoothstep(dalCambio, i * 0.09, i * 0.09 + 1.6)
          : 1 - THREE.MathUtils.smoothstep(dalCambio, 0.15 + i * 0.06, 0.15 + i * 0.06 + 1.3);
      g.position.y = quotaDi(i) - (1 - entrata) * 0.9 - affondo * affondo * 2.6;
      g.rotation.z = affondo * (i % 2 ? 0.06 : -0.06);

      // inclinazione verso il puntatore, solo sulla carta sotto il mouse
      const inclina = c.id === sopra && !selezionato && !ridotto;
      const rx = inclina ? -puntatore.current.y * 0.12 : 0;
      const ry = inclina ? puntatore.current.x * 0.16 : 0;
      lastra.rotation.x = THREE.MathUtils.lerp(lastra.rotation.x, rx, k);
      lastra.rotation.y = THREE.MathUtils.lerp(lastra.rotation.y, ry, k);

      m.opacity = THREE.MathUtils.lerp(m.opacity, (altra ? 0 : 1) * entrata * (1 - affondo * 0.85), k);
      lastra.visible = m.opacity > 0.015; // spenta del tutto, con schermo e riflesso

      // la pagina del sito scorre nella finestra: avanti finché la carta è accesa, poi torna su
      const schermo = grafica.schermi[i];
      const vetro = vetri.current[i];
      if (schermo && vetro) {
        vetro.opacity = m.opacity;
        const corsa = 1 - schermo.repeat.y;
        const sc = (scorrimento.current[i] ??= { p: 0, verso: 1 });
        if (accesa && corsa > 0 && !ridotto) {
          sc.p += dt * 0.045 * sc.verso;
          if (sc.p >= corsa) { sc.p = corsa; sc.verso = -1; }
          if (sc.p <= 0) { sc.p = 0; sc.verso = 1; }
        } else {
          sc.p = THREE.MathUtils.lerp(sc.p, 0, 1 - Math.exp(-dt * 2.5));
          sc.verso = 1;
        }
        schermo.offset.y = corsa - sc.p;
      }

      // cantiere: il nastro scorre, la lampada lampeggia, il cartello dondola appena
      const nastro = grafica.nastri[i];
      if (nastro) {
        const tt = stato.clock.elapsedTime;
        if (!ridotto) {
          nastro.offset.x = (tt * 0.12) % 1;
          lastra.rotation.z = Math.sin(tt * 1.4 + i) * 0.03;
        }
        const lm = lampade.current[i];
        if (lm) lm.opacity = m.opacity * (ridotto ? 0.8 : Math.sin(tt * 7) > 0 ? 1 : 0.15);
        const nm = nastriMat.current[i];
        if (nm) nm.opacity = m.opacity;
      }

      // luce: il fascio del faro quando passa sotto la carta, e il riflesso del puntatore
      const rf = riflessi[i];
      if (rf) {
        const giro = Math.PI * 2;
        const fase = (((faroAl(stato.clock.elapsedTime) - a) % giro) + giro) % giro;
        const inCorso = !ridotto && fase < DURATA_FASCIO;
        rf.uniforms.uFascia.value = inCorso ? -0.65 + (fase / DURATA_FASCIO) * 1.9 : -1;
        rf.uniforms.uForza.value = inCorso ? (tema === "scuro" ? 0.3 : 0.24) : 0;
        const alone = c.id === sopra && !selezionato && !ridotto ? 1 : 0;
        rf.uniforms.uAlone.value = THREE.MathUtils.lerp(rf.uniforms.uAlone.value, alone, k);
        rf.uniforms.uPuntatore.value.set((puntatore.current.x + 1) / 2, (puntatore.current.y + 1) / 2);
        rf.uniforms.uOpacita.value = m.opacity;
      }
      const filB = c.id === selezionato ? 0.72 : accesa ? 0.42 : altra ? 0 : p.filigranaRiposo;
      fil.opacity = THREE.MathUtils.lerp(fil.opacity, filB * entrata, k * 0.6);
    });
  });

  if (!grafica) return null;

  return (
    <>
      {carte.map((c, i) => {
        const a = angoloDi(i, carte.length);
        const pos = direzione(a).multiplyScalar(RAGGIO);
        if (c.dati.contatto) {
          const pp = direzione(a).multiplyScalar(RAGGIO + 0.5);
          return (
            <Portale
              key={c.id}
              posizione={[pp.x, 0.3, pp.z]}
              rotazione={-a}
              notte={tema === "scuro"}
              titolo={c.dati.titolo}
              sotto={c.dati.tipo}
              mono={famiglie.mono}
              serif={famiglie.serif}
              opacita={opacitaPortale.current}
              ridotto={ridotto}
              onApri={() => onSeleziona(c.id)}
            />
          );
        }
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
                {grafica.nastri[i] && (
                  <>
                    <mesh position={[0.05, -0.12, 0.012]} rotation={[0, 0, 0.17]} raycast={() => null} renderOrder={5}>
                      <planeGeometry args={[LARGO * 1.18, 0.15]} />
                      <meshBasicMaterial
                        ref={(n) => {
                          nastriMat.current[i] = n;
                        }}
                        map={grafica.nastri[i]}
                        transparent
                        opacity={0}
                        toneMapped={false}
                      />
                    </mesh>
                    <sprite position={[-LARGO / 2 + 0.1, ALTO / 2 + 0.02, 0.02]} scale={[0.42, 0.42, 1]} raycast={() => null} renderOrder={6}>
                      <spriteMaterial
                        ref={(l) => {
                          lampade.current[i] = l;
                        }}
                        map={grafica.lampada}
                        transparent
                        opacity={0}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        toneMapped={false}
                      />
                    </sprite>
                  </>
                )}
                <mesh position={[0, 0, 0.004]} raycast={() => null} renderOrder={4} material={riflessi[i]}>
                  <planeGeometry args={[LARGO, ALTO]} />
                </mesh>
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
          </group>
        );
      })}
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
    pitch: conIngresso && !ridotto ? -0.22 : SGUARDO,
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
      st.pitch = THREE.MathUtils.clamp(st.pitch + dy * k * 0.6, -0.25, 0.75);
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
      st.pitch = THREE.MathUtils.lerp(st.pitch, SGUARDO, ease(3));
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
      if (!st.trascina) st.pitch = THREE.MathUtils.lerp(st.pitch, SGUARDO, ease(1.1));
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
  const { stretto, tema, carte } = props;
  const p = PALETTE[tema];
  const attiva = useRef<string | null>(null);
  const [angoli, quote] = useMemo(() => {
    const an: Record<string, number> = {};
    const qu: Record<string, number> = {};
    carte.forEach((c, i) => {
      an[c.id] = angoloDi(i, carte.length);
      qu[c.id] = quotaDi(i);
    });
    return [an, qu];
  }, [carte]);
  const mono = useMemo(() => leggiFamiglie().mono, []);
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
        moduloAperto={props.moduloAperto}
        attiva={attiva}
      />
      {tema === "chiaro" && <CieloDiGiorno orizzonte={p.fondo} />}
      <Suolo notte={tema === "scuro"} fondo={p.fondo} stretto={stretto} ridotto={props.ridotto} />
      <Cielo
        notte={tema === "scuro"}
        colore={p.costellazione}
        lingua={props.lingua}
        angoli={angoli}
        quote={quote}
        attiva={attiva}
        ridotto={props.ridotto}
        stretto={stretto}
        mono={mono}
      />
    </Canvas>
  );
}
