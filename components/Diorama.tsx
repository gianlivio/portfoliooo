"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * L'uliveto di carta: un teatrino di fogli ritagliati, uno dietro l'altro, come un libro pop-up.
 * In fondo il cielo e i monti Iblei con Chiaramonte Gulfi sul colle; poi le colline, i filari, la scena
 * (gli ulivi, le reti, la raccolta, l'Ape col carico, il frantoio con la macina, l'olio), davanti il muretto a secco.
 * Scorrendo la pagina si cammina: i fogli scorrono di lato a velocità diverse (i lontani piano, i vicini svelti),
 * e a ogni tappa del racconto le sagome di quella tappa si alzano dal fondo come in un libro che si apre.
 * Tutto è fermo tranne pochi pezzi: le chiome al vento, le olive che cadono, le pertiche, il fumo, la macina,
 * le ruote dell'Ape, l'olio che cola; di notte le finestre accese, le stelle e le lucciole.
 * Niente WebGL e niente immagini: solo SVG e CSS, qualche decina di KB. Ogni foglio ha la sua ombra, una copia
 * scura spostata di qualche unità; la grana della carta è un filtro di rumore, calcolato una volta sola.
 * Con "riduci movimento" i pezzi non si muovono e tutte le sagome stanno già in piedi.
 */

export type Lato = "sx" | "dx" | "centro";

/* ---------------------------------------------------------------- misure */

const H = 1000; // l'altezza di ogni foglio, in unità del disegno
const MARGINE = 900; // spazio prima della prima tappa e dopo l'ultima
const PASSO = 640; // fra una tappa e l'altra, sul foglio della scena
/** Quanto si muove ogni foglio rispetto a quello della scena: i lontani meno, il muretto davanti di più. */
const FOGLI = [
  { id: "monti", f: 0.16 },
  { id: "colline", f: 0.38 },
  { id: "filari", f: 0.68 },
  { id: "scena", f: 1 },
  { id: "muretto", f: 1.32 },
] as const;
type IdFoglio = (typeof FOGLI)[number]["id"];

/* ---------------------------------------------------------------- attrezzi */

/** Numeri a caso ma sempre gli stessi: il disegno non cambia da una visita all'altra. */
function generatore(seme: number) {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n1 = (v: number) => Math.round(v * 10) / 10;

/** Una sagoma tonda ritagliata a mano: un poligono irregolare con gli angoli smussati. */
function macchia(cx: number, cy: number, rx: number, ry: number, r: () => number, punti = 12, scarto = 0.18) {
  const p: [number, number][] = [];
  for (let i = 0; i < punti; i++) {
    const a = (i / punti) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * scarto;
    p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // curve quadratiche fra i punti medi: il bordo è morbido ma non perfetto
  const m = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${m(p[punti - 1], p[0]).map(n1).join(" ")}`;
  for (let i = 0; i < punti; i++) {
    const q = p[i], s = m(p[i], p[(i + 1) % punti]);
    d += `Q${n1(q[0])} ${n1(q[1])} ${n1(s[0])} ${n1(s[1])}`;
  }
  return d + "Z";
}

/** Un crinale da un capo all'altro del foglio, chiuso in basso: onde sovrapposte e un po' di tremolio della forbice. */
function crinale(W: number, base: number, onde: [number, number, number][], r: () => number, passo = 36) {
  let d = `M0 ${H}L0 ${base}`;
  for (let x = 0; x <= W + passo; x += passo) {
    let y = base;
    for (const [amp, lung, fase] of onde) y -= amp * Math.sin((x / lung) * Math.PI * 2 + fase);
    d += `L${x} ${n1(y + (r() - 0.5) * 5)}`;
  }
  return d + `L${W + passo} ${H}Z`;
}

/* ---------------------------------------------------------------- colore e ombra */

/** Dentro la copia d'ombra ogni sagoma è scura e senza luci. */
const Ombra = createContext(false);
function useColore() {
  const ombra = useContext(Ombra);
  return { ombra, c: (v: string) => (ombra ? "var(--d-ombra)" : `var(--d-${v})`) };
}

/* ---------------------------------------------------------------- sagome */

/** Un ulivo: il tronco contorto, le chiome in tre verdi, a volte le olive. La chioma ondeggia piano. */
function Ulivo({ x, y, s, seme, olive = false, vento = true }: { x: number; y: number; s: number; seme: number; olive?: boolean; vento?: boolean }) {
  const { c, ombra } = useColore();
  const d = useMemo(() => {
    const r = generatore(seme);
    const piega = (r() - 0.5) * 40;
    const tronco = `M${-26} 0 C${-20} ${-60} ${-34 + piega} ${-110} ${-14 + piega} ${-170} L${10 + piega} ${-172} C${6 + piega} ${-120} ${30} ${-70} ${28} 0Z`;
    const rami = `M${piega - 6} ${-160} Q${piega - 60} ${-200} ${piega - 92} ${-206} L${piega - 86} ${-196} Q${piega - 52} ${-186} ${piega + 2} ${-150}Z M${piega + 4} ${-164} Q${piega + 56} ${-206} ${piega + 98} ${-212} L${piega + 92} ${-200} Q${piega + 50} ${-190} ${piega + 8} ${-150}Z`;
    const chiome = [
      { d: macchia(piega - 70, -220, 78, 52, r), t: "ulivo-scuro" },
      { d: macchia(piega + 74, -226, 82, 54, r), t: "ulivo-scuro" },
      { d: macchia(piega, -262, 96, 62, r), t: "ulivo" },
      { d: macchia(piega - 40, -244, 58, 40, r), t: "ulivo-chiaro" },
      { d: macchia(piega + 48, -256, 52, 36, r), t: "ulivo-chiaro" },
    ];
    const frutti = Array.from({ length: 14 }, () => ({ x: piega + (r() - 0.5) * 220, y: -200 - r() * 90 }));
    return { tronco, rami, chiome, frutti, ritardo: -r() * 6, durata: 5 + r() * 3 };
  }, [seme]);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={d.tronco} fill={c("tronco")} />
      <path d={d.rami} fill={c("tronco")} />
      <g className={vento ? "ondeggia" : undefined} style={vento ? { animationDelay: `${d.ritardo}s`, animationDuration: `${d.durata}s` } : undefined}>
        {d.chiome.map((k, i) => (
          <path key={i} d={k.d} fill={c(k.t)} />
        ))}
        {olive && !ombra && d.frutti.map((o, i) => <circle key={i} cx={o.x} cy={o.y} r={5} fill="var(--d-oliva)" />)}
      </g>
    </g>
  );
}

/** Un alberello dei filari lontani: tronco e due macchie. */
function Alberello({ x, y, s, seme }: { x: number; y: number; s: number; seme: number }) {
  const { c } = useColore();
  const d = useMemo(() => {
    const r = generatore(seme);
    return { a: macchia(-18, -64, 38, 26, r, 10), b: macchia(16, -72, 34, 24, r, 10) };
  }, [seme]);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-6 0L-4 -50L5 -50L7 0Z" fill={c("tronco")} />
      <path d={d.a} fill={c("ulivo-scuro")} />
      <path d={d.b} fill={c("ulivo")} />
    </g>
  );
}

/** Una persona di carta: testa, camicia, pantaloni, cappello; braccia come le vuole la scena. */
function Persona({ x, y, s = 1, camicia, cappello = false, gonna = false, children }: { x: number; y: number; s?: number; camicia: string; cappello?: boolean; gonna?: boolean; children?: ReactNode }) {
  const { c, ombra } = useColore();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {gonna ? <path d="M-22 -70L22 -70L28 -8L-28 -8Z" fill={ombra ? c("") : camicia} /> : <path d="M-14 -72L-2 -72L-4 0L-16 0Z M2 -72L14 -72L16 0L4 0Z" fill={c("pantaloni")} />}
      <path d="M-18 -132Q0 -140 18 -132L16 -66L-16 -66Z" fill={ombra ? c("") : camicia} />
      <circle cx="0" cy="-150" r="15" fill={c("pelle")} />
      {cappello && <path d="M-22 -158L22 -158L14 -164Q0 -178 -14 -164Z" fill={c("cappello")} />}
      {children}
    </g>
  );
}

/** Una cassetta di plastica per le olive, coi buchi e il colmo di olive. */
function Cassetta({ x, y, colore, piena = true }: { x: number; y: number; colore: string; piena?: boolean }) {
  const { c, ombra } = useColore();
  return (
    <g transform={`translate(${x} ${y})`}>
      {piena && !ombra && <path d="M-34 -36Q0 -52 34 -36Z" fill="var(--d-oliva)" />}
      <rect x="-36" y="-38" width="72" height="38" rx="3" fill={ombra ? c("") : colore} />
      {!ombra && [-20, -6, 8, 22].map((k) => <rect key={k} x={k - 4} y="-30" width="8" height="18" rx="2" fill="rgba(0,0,0,.18)" />)}
    </g>
  );
}

/** La rete sotto l'ulivo: un telo verde in prospettiva, con la trama. */
function Rete({ x, y, l }: { x: number; y: number; l: number }) {
  const { c, ombra } = useColore();
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-l / 2} 0L${l / 2} 0L${l / 2 - 40} -26L${-l / 2 + 40} -26Z`} fill={c("rete")} />
      {!ombra && <path d={`M${-l / 2} 0L${l / 2} 0L${l / 2 - 40} -26L${-l / 2 + 40} -26Z`} fill="url(#trama-rete)" />}
    </g>
  );
}

/** Le olive che cadono dalla chioma sulla rete, a turno. */
function Cadono({ x, y, alto, n = 7, seme }: { x: number; y: number; alto: number; n?: number; seme: number }) {
  const { ombra } = useColore();
  const v = useMemo(() => {
    const r = generatore(seme);
    return Array.from({ length: n }, () => ({ dx: (r() - 0.5) * 180, ritardo: -r() * 2.4, durata: 1.6 + r() * 1.2 }));
  }, [n, seme]);
  if (ombra) return null;
  return (
    <g transform={`translate(${x} ${y})`}>
      {v.map((o, i) => (
        <circle key={i} cx={o.dx} cy={-alto} r="5" fill="var(--d-oliva)" className="cade" style={{ ["--alto" as string]: `${alto}px`, animationDelay: `${o.ritardo}s`, animationDuration: `${o.durata}s` }} />
      ))}
    </g>
  );
}

/** Un fiocco di fumo che sale dal camino. */
function Fumo({ x, y }: { x: number; y: number }) {
  const { ombra } = useColore();
  if (ombra) return null;
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} r="16" fill="var(--d-fumo)" className="fumo" style={{ animationDelay: `${-i * 1.5}s` }} />
      ))}
    </g>
  );
}

/** Una finestra: di giorno scura, di notte accesa. */
function Finestra({ x, y, w = 14, h = 20 }: { x: number; y: number; w?: number; h?: number }) {
  const { c, ombra } = useColore();
  if (ombra) return null;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c("vetro")} />
      <rect x={x} y={y} width={w} height={h} fill="var(--d-luce)" className="solo-notte" />
    </g>
  );
}

/* ---------------------------------------------------------------- i fogli */

/** I monti Iblei, lontani, e Chiaramonte Gulfi in cima al suo colle. */
function Monti({ W }: { W: number }) {
  const { c } = useColore();
  const d = useMemo(() => {
    const r = generatore(3);
    const lontani = crinale(W, 560, [[50, 900, 0.4], [26, 330, 1.7], [9, 120, 2.2]], r, 30);
    const vicini = crinale(W, 640, [[40, 700, 2.4], [18, 260, 0.6], [6, 90, 1.1]], r, 30);
    // il paese: case a gradoni sul colle, la chiesa madre con la cupola e il campanile
    const cx = Math.min(W * 0.42, 1500);
    const colle = `M${cx - 420} 700Q${cx - 220} 520 ${cx - 40} 470Q${cx + 80} 455 ${cx + 200} 490Q${cx + 360} 560 ${cx + 480} 700Z`;
    const case_: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const u = (i / 25) * 2 - 1;
      const x = cx + u * 280 + (r() - 0.5) * 20;
      const y = 480 + Math.abs(u) * 90 + r() * 30;
      case_.push({ x, y, w: 26 + r() * 26, h: 22 + r() * 22 });
    }
    return { lontani, vicini, colle, case_, cx };
  }, [W]);
  return (
    <>
      <path d={d.lontani} fill={c("monti-lontani")} />
      <path d={d.vicini} fill={c("monti")} />
      <path d={d.colle} fill={c("monti")} />
      {d.case_.map((k, i) => (
        <g key={i}>
          <rect x={k.x} y={k.y - k.h} width={k.w} height={k.h + 30} fill={c("paese")} />
          <path d={`M${k.x - 3} ${k.y - k.h}L${k.x + k.w / 2} ${k.y - k.h - 10}L${k.x + k.w + 3} ${k.y - k.h}Z`} fill={c("tetto")} />
          {i % 3 === 0 && <Finestra x={k.x + k.w / 2 - 3} y={k.y - k.h + 8} w={6} h={8} />}
        </g>
      ))}
      <g transform={`translate(${d.cx + 10} 470)`}>
        <rect x="-40" y="-60" width="80" height="60" fill={c("paese")} />
        <rect x="-12" y="-96" width="24" height="40" fill={c("paese")} />
        <path d="M-32 -60A32 34 0 0 1 32 -60Z" fill={c("cupola")} />
        <rect x="46" y="-118" width="22" height="118" fill={c("paese")} />
        <path d="M44 -118L57 -136L70 -118Z" fill={c("tetto")} />
        <Finestra x={-6} y={-44} w={12} h={16} />
      </g>
    </>
  );
}

/** Le colline vicine: terra rossa degli Iblei, i terrazzamenti a muretti, filari minuti. */
function Colline({ W }: { W: number }) {
  const { c } = useColore();
  const d = useMemo(() => {
    const r = generatore(9);
    const prima = crinale(W, 700, [[60, 1100, 1.2], [22, 380, 0.3], [8, 140, 2.8]], r);
    const seconda = crinale(W, 770, [[44, 900, 2.6], [16, 300, 1.4]], r);
    const terrazze: string[] = [];
    for (let k = 0; k < 4; k++) {
      let p = `M0 ${790 + k * 46}`;
      for (let x = 0; x <= W; x += 60) p += `L${x} ${n1(790 + k * 46 - 18 * Math.sin(x / 520 + k))}`;
      terrazze.push(p);
    }
    const puntini: { x: number; y: number; s: number }[] = [];
    for (let x = 40; x < W; x += 70 + r() * 50) puntini.push({ x, y: 830 + r() * 120, s: 0.35 + r() * 0.2 });
    return { prima, seconda, terrazze, puntini };
  }, [W]);
  return (
    <>
      <path d={d.prima} fill={c("colline")} />
      <path d={d.seconda} fill={c("terra-lontana")} />
      {d.terrazze.map((p, i) => (
        <path key={i} d={p} fill="none" stroke={c("muretto-lontano")} strokeWidth="3" />
      ))}
      {d.puntini.map((p, i) => (
        <Alberello key={i} x={p.x} y={p.y} s={p.s} seme={100 + i} />
      ))}
    </>
  );
}

/** I filari: ulivi di mezza taglia su due file, sulla terra. */
function Filari({ W }: { W: number }) {
  const { c } = useColore();
  const d = useMemo(() => {
    const r = generatore(21);
    const terra = crinale(W, 820, [[22, 800, 0.9], [8, 230, 2.1]], r);
    const alberi: { x: number; y: number; s: number }[] = [];
    for (let x = 60; x < W; x += 150 + r() * 90) alberi.push({ x, y: 840 + r() * 30, s: 0.42 + r() * 0.12 });
    return { terra, alberi };
  }, [W]);
  return (
    <>
      <path d={d.terra} fill={c("terra-media")} />
      {d.alberi.map((a, i) => (
        <Ulivo key={i} x={a.x} y={a.y} s={a.s} seme={300 + i} vento={i % 3 === 0} />
      ))}
    </>
  );
}

/**
 * La scena: il suolo e, a ogni tappa, il suo quadretto, che si alza dal fondo quando la tappa arriva.
 * Le tappe, nell'ordine della pagina: l'apertura, la terra, la famiglia, la regola, la raccolta,
 * le ventiquattro ore, la spremitura, l'Italia e l'Europa, per chi fa olio.
 */
function Scena({ W, n }: { W: number; n: number }) {
  const { c, ombra } = useColore();
  const suolo = useMemo(() => crinale(W, 905, [[10, 600, 0.2], [5, 170, 1.3]], generatore(33), 40), [W]);
  const P = (i: number) => MARGINE + Math.min(i, n - 1) * PASSO;
  const tappa = (i: number, contenuto: ReactNode) => (
    <g className="pop" data-tappa={i} key={i}>
      {contenuto}
    </g>
  );
  return (
    <>
      <path d={suolo} fill={c("terra")} />
      {/* fra una tappa e l'altra, ulivi grandi sempre in piedi */}
      {Array.from({ length: n + 1 }, (_, i) => (
        <Ulivo key={`u${i}`} x={P(i) - PASSO / 2 + 30} y={920} s={0.95} seme={700 + i} />
      ))}

      {/* 0 · l'apertura: un ulivo secolare con le olive, la sedia e il caffè sotto */}
      {tappa(0, (
        <g transform={`translate(${P(0)} 0)`}>
          <Ulivo x={-60} y={930} s={1.35} seme={11} olive />
          <rect x="60" y="868" width="40" height="6" fill={c("legno")} />
          <path d="M64 874L60 912M96 874L100 912M64 868L60 830L66 830L70 868Z" stroke={c("legno")} strokeWidth="5" fill={c("legno")} />
          <rect x="110" y="888" width="44" height="24" fill={c("legno")} />
          {!ombra && <path d="M124 880q4 -10 0 -18M134 880q4 -10 0 -18" stroke="var(--d-fumo)" strokeWidth="3" fill="none" className="vapore" />}
          <rect x="122" y="880" width="18" height="10" rx="2" fill={c("tazza")} />
        </g>
      ))}

      {/* 1 · la terra: la zolla rossa, i sassi bianchi, l'ulivo giovane col tutore */}
      {tappa(1, (
        <g transform={`translate(${P(1)} 0)`}>
          <path d="M-160 930Q-80 860 0 872Q90 860 170 930Z" fill={c("zolla")} />
          {[-110, -40, 30, 90].map((x, i) => (
            <path key={i} d={macchia(x, 900 - (i % 2) * 8, 18, 10, generatore(50 + i), 8)} fill={c("pietra-chiara")} />
          ))}
          <Ulivo x={0} y={880} s={0.6} seme={77} />
          <rect x="22" y="740" width="6" height="140" fill={c("legno")} />
        </g>
      ))}

      {/* 2 · la famiglia: la madre col carico, il padre con la pertica, un bambino con una cassetta piccola */}
      {tappa(2, (
        <g transform={`translate(${P(2)} 0)`}>
          <Persona x={-90} y={930} camicia="var(--d-camicia-a)" gonna>
            <g transform="translate(0 -170)">
              <Cassetta x={0} y={0} colore="var(--d-cassa-rossa)" />
            </g>
            <path d="M-18 -128L-30 -168M18 -128L28 -168" stroke={c("pelle")} strokeWidth="7" strokeLinecap="round" />
          </Persona>
          <Persona x={40} y={930} camicia="var(--d-camicia-b)" cappello>
            <g className="batte" style={{ transformOrigin: "12px -110px" }}>
              <path d="M12 -110L120 -300" stroke={c("legno")} strokeWidth="6" strokeLinecap="round" />
              <path d="M12 -110L-4 -96" stroke={c("pelle")} strokeWidth="7" strokeLinecap="round" />
            </g>
          </Persona>
          <Persona x={140} y={930} s={0.62} camicia="var(--d-camicia-c)">
            <Cassetta x={0} y={-70} colore="var(--d-cassa-gialla)" />
          </Persona>
        </g>
      ))}

      {/* 3 · la regola: l'ulivo con la rete stesa sotto, aspettando */}
      {tappa(3, (
        <g transform={`translate(${P(3)} 0)`}>
          <Rete x={0} y={936} l={360} />
          <Ulivo x={0} y={920} s={1.15} seme={19} olive />
        </g>
      ))}

      {/* 4 · la raccolta: due con l'abbacchiatore, le olive che piovono sulla rete, le cassette piene */}
      {tappa(4, (
        <g transform={`translate(${P(4)} 0)`}>
          <Rete x={0} y={938} l={420} />
          <Ulivo x={0} y={918} s={1.2} seme={41} olive />
          <Cadono x={0} y={930} alto={250} n={9} seme={5} />
          <Persona x={-150} y={936} camicia="var(--d-camicia-b)" cappello>
            <g className="batte" style={{ transformOrigin: "14px -110px" }}>
              <path d="M14 -110L110 -320" stroke={c("legno")} strokeWidth="6" strokeLinecap="round" />
              <path d="M14 -110L-2 -98" stroke={c("pelle")} strokeWidth="7" strokeLinecap="round" />
            </g>
          </Persona>
          <Persona x={160} y={936} camicia="var(--d-camicia-a)" gonna>
            <g className="batte batte--due" style={{ transformOrigin: "-14px -110px" }}>
              <path d="M-14 -110L-100 -330" stroke={c("legno")} strokeWidth="6" strokeLinecap="round" />
              <path d="M-14 -110L2 -98" stroke={c("pelle")} strokeWidth="7" strokeLinecap="round" />
            </g>
          </Persona>
          <Cassetta x={250} y={950} colore="var(--d-cassa-verde)" />
          <Cassetta x={330} y={950} colore="var(--d-cassa-blu)" />
          <Cassetta x={290} y={912} colore="var(--d-cassa-rossa)" />
        </g>
      ))}

      {/* 5 · entro ventiquattro ore: l'Ape carica di cassette che parte verso il frantoio */}
      {tappa(5, (
        <g transform={`translate(${P(5)} 0)`}>
          <g className="ape">
            <path d="M-150 920L-150 840Q-150 800 -110 800L-60 800L-40 860L-40 920Z" fill={c("ape")} />
            <path d="M-136 846L-136 816Q-136 812 -112 812L-70 812L-56 846Z" fill={c("vetro")} />
            <rect x="-40" y="860" width="190" height="60" fill={c("ape-cassone")} />
            <Cassetta x={-6} y={858} colore="var(--d-cassa-rossa)" />
            <Cassetta x={70} y={858} colore="var(--d-cassa-verde)" />
            <Cassetta x={110} y={820} colore="var(--d-cassa-gialla)" />
            <Cassetta x={30} y={820} colore="var(--d-cassa-blu)" />
            {[-110, 110].map((x) => (
              <g key={x} transform={`translate(${x} 922)`}>
                <g className="ruota">
                  <circle r="24" fill={c("gomma")} />
                  {!ombra && <path d="M-14 0H14M0 -14V14" stroke="var(--d-cerchio)" strokeWidth="5" />}
                </g>
              </g>
            ))}
          </g>
          {/* l'orologio della corsa: ventiquattro ore */}
          <g transform="translate(150 760)">
            <circle r="34" fill={c("orologio")} />
            {!ombra && <g className="lancetta"><path d="M0 0L0 -24" stroke="var(--d-inchiostro)" strokeWidth="4" strokeLinecap="round" /></g>}
            {!ombra && <path d="M0 0L14 0" stroke="var(--d-inchiostro)" strokeWidth="4" strokeLinecap="round" />}
          </g>
        </g>
      ))}

      {/* 6 · la spremitura a freddo: il frantoio di pietra, il camino che fuma, la macina che gira */}
      {tappa(6, (
        <g transform={`translate(${P(6)} 0)`}>
          <rect x="-230" y="700" width="330" height="230" fill={c("frantoio")} />
          <path d="M-246 700L-65 610L116 700Z" fill={c("tetto")} />
          <rect x="40" y="590" width="34" height="90" fill={c("frantoio")} />
          <Fumo x={57} y={588} />
          <path d="M-140 930L-140 820A44 44 0 0 1 -52 820L-52 930Z" fill={c("portone")} />
          <Finestra x={20} y={760} w={40} h={46} />
          <Finestra x={-212} y={760} w={40} h={46} />
          {!ombra && <text x="-65" y="690" textAnchor="middle" className="insegna" fill="var(--d-inchiostro)">FRANTOIO</text>}
          {/* la macina in cortile: la vasca e la ruota di pietra che gira */}
          <rect x="130" y="880" width="170" height="50" fill={c("pietra-chiara")} />
          <g transform="translate(215 848)">
            <g className="ruota ruota--lenta">
              <circle r="56" fill={c("macina")} />
              {!ombra && <circle r="12" fill="var(--d-pietra-scura)" />}
              {!ombra && <path d="M-40 -20L-30 -14M30 22L40 16M-6 40L4 44" stroke="var(--d-pietra-scura)" strokeWidth="4" />}
            </g>
          </g>
        </g>
      ))}

      {/* 7 · in Italia e in Europa: le latte e le bottiglie impilate, pronte, coi cartellini della spedizione */}
      {tappa(7, (
        <g transform={`translate(${P(7)} 0)`}>
          {[[-120, 930], [-40, 930], [40, 930], [-80, 850], [0, 850], [-40, 770]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x="-36" y="-80" width="72" height="80" fill={c("latta")} />
              {!ombra && <rect x="-36" y="-56" width="72" height="30" fill="var(--d-etichetta)" />}
              {!ombra && <circle cx="0" cy="-41" r="9" fill="var(--d-oro)" />}
            </g>
          ))}
          {[130, 170, 210].map((x, i) => (
            <g key={x} transform={`translate(${x} 930)`}>
              <path d="M-14 0L-14 -70Q-14 -84 -6 -92L-6 -112L6 -112L6 -92Q14 -84 14 -70L14 0Z" fill={c("bottiglia")} />
              {!ombra && <rect x="-14" y="-52" width="28" height="22" fill="var(--d-etichetta)" />}
              {!ombra && i === 1 && <path d="M-14 -40H14" stroke="var(--d-oro)" strokeWidth="4" />}
            </g>
          ))}
          {!ombra &&
            ["IT", "DE", "FR"].map((t, i) => (
              <g key={t} transform={`translate(${-150 + i * 70} 690) rotate(${(i - 1) * 6})`} className="cartellino" style={{ animationDelay: `${-i * 0.8}s` }}>
                <path d="M0 -40V0" stroke="var(--d-spago)" strokeWidth="2" />
                <rect x="-22" y="0" width="44" height="28" rx="3" fill="var(--d-carta)" />
                <text x="0" y="20" textAnchor="middle" className="sigla" fill="var(--d-inchiostro)">{t}</text>
              </g>
            ))}
        </g>
      ))}

      {/* 8 · per chi fa olio: la giara, l'olio nuovo che cola d'oro dalla cannella */}
      {tappa(8, (
        <g transform={`translate(${P(8)} 0)`}>
          <path d="M-40 640L80 640L80 668L-20 668L-20 700L-40 700Z" fill={c("frantoio")} />
          <path d="M-10 700L-10 700" />
          {!ombra && <path d="M-30 702L-30 860" className="olio-cola" stroke="var(--d-oro)" strokeWidth="9" strokeLinecap="round" />}
          <path d="M-110 940Q-150 860 -110 800Q-80 770 -30 770Q20 770 50 800Q90 860 50 940Z" fill={c("giara")} />
          <path d="M-70 770L-70 752L10 752L10 770Z" fill={c("giara")} />
          {!ombra && <path d="M-118 860Q-30 880 58 860" stroke="var(--d-oro)" strokeWidth="6" fill="none" opacity=".6" />}
          <Persona x={130} y={936} camicia="var(--d-camicia-b)" cappello>
            <path d="M-18 -128L-48 -100" stroke={c("pelle")} strokeWidth="7" strokeLinecap="round" />
          </Persona>
        </g>
      ))}
    </>
  );
}

/** Il muretto a secco davanti, coi sassi a corsi, l'erba, qualche pala di fico d'India; di notte le lucciole. */
function Muretto({ W }: { W: number }) {
  const { c, ombra } = useColore();
  const d = useMemo(() => {
    const r = generatore(57);
    const sassi: { d: string; t: string }[] = [];
    // il muretto corre a tratti, coi varchi per guardare dentro la scena
    for (let x = 0; x < W; ) {
      const lungo = 380 + r() * 420;
      for (let corso = 0; corso < 3; corso++) {
        const y = 990 - corso * 34;
        for (let sx = x + (corso % 2) * 18; sx < x + lungo - corso * 30; sx += 34 + r() * 24) {
          const t = ["pietra", "pietra-chiara", "pietra-scura"][Math.floor(r() * 3)];
          sassi.push({ d: macchia(sx + 16, y, 22 + r() * 8, 15 + r() * 4, r, 8, 0.22), t });
        }
      }
      x += lungo + 260 + r() * 360;
    }
    const erba: string[] = [];
    for (let x = 0; x < W; x += 50 + r() * 70) {
      let p = "";
      for (let k = 0; k < 5; k++) {
        const bx = x + k * 6, h = 30 + r() * 40, piega = (r() - 0.5) * 30;
        p += `M${n1(bx)} 1000Q${n1(bx + piega / 2)} ${n1(1000 - h / 2)} ${n1(bx + piega)} ${n1(1000 - h)}L${n1(bx + 5)} 1000Z`;
      }
      erba.push(p);
    }
    const fichi: { x: number; pale: { d: string }[]; frutti: [number, number][] }[] = [];
    for (let x = 500; x < W; x += 1300 + r() * 900) {
      const pale = [
        { d: macchia(x, 930, 36, 52, r, 10, 0.08) },
        { d: macchia(x - 40, 860, 30, 42, r, 10, 0.08) },
        { d: macchia(x + 38, 850, 30, 44, r, 10, 0.08) },
        { d: macchia(x, 790, 26, 38, r, 10, 0.08) },
      ];
      fichi.push({ x, pale, frutti: [[x - 52, 820], [x + 54, 808], [x + 12, 752]] });
    }
    const lucciole = Array.from({ length: Math.round(W / 260) }, () => ({ x: r() * W, y: 760 + r() * 180, ritardo: -r() * 6 }));
    return { sassi, erba, fichi, lucciole };
  }, [W]);
  return (
    <>
      {d.fichi.map((f, i) => (
        <g key={i}>
          {f.pale.map((p, k) => (
            <path key={k} d={p.d} fill={c(k % 2 ? "fico" : "fico-scuro")} />
          ))}
          {!ombra && f.frutti.map(([x, y], k) => <ellipse key={k} cx={x} cy={y} rx="9" ry="12" fill="var(--d-frutto)" />)}
        </g>
      ))}
      {d.sassi.map((s, i) => (
        <path key={i} d={s.d} fill={c(s.t)} />
      ))}
      {d.erba.map((p, i) => (
        <path key={i} d={p} fill={c(i % 2 ? "erba" : "erba-scura")} />
      ))}
      {!ombra &&
        d.lucciole.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r="4" fill="var(--d-luce)" className="lucciola solo-notte" style={{ animationDelay: `${l.ritardo}s` }} />
        ))}
    </>
  );
}

/* ---------------------------------------------------------------- il teatrino */

function Foglio({ id, W, children, aperto, ordine }: { id: IdFoglio; W: number; children: ReactNode; aperto: boolean; ordine: number }) {
  return (
    <div className={`foglio foglio--${id}${aperto ? " foglio--aperto" : ""}`} style={{ transitionDelay: `${ordine * 0.12}s` }}>
      <svg data-foglio={id} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">
        <Ombra.Provider value={true}>
          <g transform="translate(7 9)" className="ombra">
            {children}
          </g>
        </Ombra.Provider>
        {children}
      </svg>
    </div>
  );
}

export default function Diorama({ lati, ridotto, stretto }: { lati: Lato[]; ridotto: boolean; stretto: boolean }) {
  const radice = useRef<HTMLDivElement>(null);
  const n = lati.length;
  const W4 = MARGINE * 2 + (n - 1) * PASSO;
  /** la larghezza di ogni foglio: tanto quanto serve perché, mosso col suo passo, copra sempre lo schermo */
  const larghezze = useMemo(() => Object.fromEntries(FOGLI.map((f) => [f.id, Math.ceil(f.f * W4 + 2000 * Math.max(0, 1 - f.f) + 60)])) as Record<IdFoglio, number>, [W4]);

  useEffect(() => {
    const el = radice.current;
    if (!el) return;
    const fogli = FOGLI.map((f) => ({ ...f, el: el.querySelector<HTMLElement>(`.foglio--${f.id}`)!, svg: el.querySelector<SVGSVGElement>(`svg[data-foglio="${f.id}"]`)! }));
    const sole = el.querySelector<HTMLElement>(".diorama-sole");
    const tappe = Array.from(document.querySelectorAll<HTMLElement>(".tappa"));
    const pop = Array.from(el.querySelectorAll<SVGGElement>(".pop"));
    let scala = 1, vw = 1, centri: number[] = [];
    let attuale = -1, meta = -1;
    let raf = 0;

    const misura = () => {
      const alto = el.clientHeight;
      vw = el.clientWidth;
      scala = alto / H;
      for (const f of fogli) f.svg.style.width = `${larghezze[f.id] * scala}px`;
      // dove ogni tappa sta "a metà schermo", in pixel di scorrimento
      centri = tappe.map((t) => t.offsetTop + t.offsetHeight / 2 - window.innerHeight / 2);
      meta = -1;
      disegna();
    };

    /** La tappa a cui si è arrivati, con la frazione verso la prossima. */
    const doveSiamo = () => {
      const y = window.scrollY;
      if (!centri.length || y <= centri[0]) return 0;
      for (let i = 0; i < centri.length - 1; i++) {
        if (y < centri[i + 1]) return i + (y - centri[i]) / Math.max(1, centri[i + 1] - centri[i]);
      }
      return centri.length - 1;
    };

    /** Dove guarda il teatrino alla tappa i: il quadretto dalla parte libera dal testo (sul telefono, al centro). */
    const mira = (i: number) => {
      const x = MARGINE + i * PASSO;
      if (stretto) return x;
      const vU = vw / scala;
      const lato = lati[i] === "sx" ? -1 : lati[i] === "dx" ? 1 : 0;
      return x + lato * vU * 0.24;
    };

    const disegna = () => {
      raf = 0;
      const t = doveSiamo();
      const i0 = Math.floor(t), k = t - i0;
      const i1 = Math.min(n - 1, i0 + 1);
      const morbido = k * k * (3 - 2 * k);
      const x = mira(i0) + (mira(i1) - mira(i0)) * morbido;
      const T = Math.max(0, Math.min(W4 * scala - vw, x * scala - vw / 2));
      if (Math.abs(T - meta) > 0.2) {
        meta = T;
        for (const f of fogli) f.el.style.transform = `translate3d(${(-T * f.f).toFixed(1)}px,0,0)`;
      }
      // il sole cala mentre si cammina
      if (sole) sole.style.transform = `translate3d(0,${(t / Math.max(1, n - 1)) * 14}vh,0)`;
      // le sagome delle tappe raggiunte stanno in piedi; tornando indietro si ripiegano
      const arrivo = Math.round(t + 0.35);
      if (arrivo !== attuale) {
        attuale = arrivo;
        for (const g of pop) g.classList.toggle("su", ridotto || Number(g.dataset.tappa) <= arrivo);
      }
    };
    const chiedi = () => {
      if (!raf) raf = requestAnimationFrame(disegna);
    };

    misura();
    window.addEventListener("scroll", chiedi, { passive: true });
    window.addEventListener("resize", misura);
    // i testi e i font possono cambiare l'altezza delle tappe dopo il primo disegno
    const oss = new ResizeObserver(misura);
    tappe.forEach((t) => oss.observe(t));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", chiedi);
      window.removeEventListener("resize", misura);
      oss.disconnect();
    };
  }, [lati, n, W4, larghezze, ridotto, stretto]);

  // il libro si apre: un fotogramma dopo il primo disegno i fogli si alzano, uno dopo l'altro
  const [aperto, setAperto] = useState(false);
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setAperto(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={radice} className={`diorama${ridotto ? " diorama--fermo" : ""}`} aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <pattern id="trama-rete" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 0L12 12M12 0L0 12" stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
          </pattern>
        </defs>
      </svg>
      <div className="diorama-cielo" />
      <div className="diorama-sole" />
      <div className="diorama-luna solo-notte" />
      <Stelle />
      <Nuvole />
      <div className="diorama-uccelli" aria-hidden="true">
        <svg viewBox="0 0 120 40">
          {[[10, 20], [40, 10], [70, 22], [96, 14]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y}q8 -8 14 0q6 -8 14 0`} className="ala" style={{ animationDelay: `${-i * 0.15}s` }} />
          ))}
        </svg>
      </div>
      {FOGLI.map((f, i) => (
        <Foglio key={f.id} id={f.id} W={larghezze[f.id]} aperto={aperto || ridotto} ordine={i}>
          {f.id === "monti" ? <Monti W={larghezze.monti} /> : f.id === "colline" ? <Colline W={larghezze.colline} /> : f.id === "filari" ? <Filari W={larghezze.filari} /> : f.id === "scena" ? <Scena W={larghezze.scena} n={n} /> : <Muretto W={larghezze.muretto} />}
        </Foglio>
      ))}
      <div className="diorama-grana" />
    </div>
  );
}

/** Le stelle, di notte: puntini che brillano a turno. */
function Stelle() {
  const s = useMemo(() => {
    const r = generatore(13);
    return Array.from({ length: 60 }, () => ({ x: r() * 100, y: r() * 45, d: -r() * 4, g: r() < 0.2 }));
  }, []);
  return (
    <svg className="diorama-stelle solo-notte" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {s.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.g ? 0.28 : 0.16} className={p.g ? "stella" : undefined} style={p.g ? { animationDelay: `${p.d}s` } : undefined} />
      ))}
    </svg>
  );
}

/** Tre nuvole di carta che passano piano. */
function Nuvole() {
  const d = useMemo(() => {
    const r = generatore(71);
    return [0, 1, 2].map((i) => ({
      d: [macchia(60, 40, 50, 22, r, 10, 0.12), macchia(110, 30, 42, 26, r, 10, 0.12), macchia(150, 44, 40, 18, r, 10, 0.12)],
      top: 8 + i * 9,
      durata: 140 + i * 50,
      ritardo: -i * 60,
      s: 1 - i * 0.2,
    }));
  }, []);
  return (
    <>
      {d.map((n, i) => (
        <div key={i} className="diorama-nuvola" style={{ top: `${n.top}%`, animationDuration: `${n.durata}s`, animationDelay: `${n.ritardo}s`, ["--s" as string]: n.s }}>
          <svg viewBox="0 0 200 80" aria-hidden="true">
            <g transform="translate(4 5)" fill="var(--d-ombra)">
              {n.d.map((p, k) => (
                <path key={k} d={p} />
              ))}
            </g>
            <g fill="var(--d-nuvola)">
              {n.d.map((p, k) => (
                <path key={k} d={p} />
              ))}
            </g>
          </svg>
        </div>
      ))}
    </>
  );
}
