"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { competenze, competenzeDi, nomeCompetenza } from "@/content/competenze";

/**
 * Il cielo della stanza.
 * Di notte: stelle vere (posizioni reali, cielo d'autunno visto dalla Sicilia) con le linee
 * delle costellazioni appena accennate, e qualche centinaio di stelle deboli.
 * Sempre: la costellazione delle competenze. Quando una carta è attiva, dalla carta
 * salgono fili verso le competenze usate in quel lavoro.
 */

const LAT = 37; // latitudine dell'osservatore
const TSL = 1.0; // tempo siderale locale, in ore: autunno, prima serata
const R_CIELO = 42;
const R_COMPETENZE = 15;

type Stella = [string, number, number, number]; // nome, AR (ore), dec (gradi), magnitudine

const STELLE: Stella[] = [
  ["Dubhe", 11.062, 61.75, 1.8], ["Merak", 11.031, 56.38, 2.4], ["Phecda", 11.897, 53.69, 2.4],
  ["Megrez", 12.257, 57.03, 3.3], ["Alioth", 12.9, 55.96, 1.8], ["Mizar", 13.399, 54.93, 2.2], ["Alkaid", 13.792, 49.31, 1.9],
  ["Polaris", 2.53, 89.26, 2.0], ["Kochab", 14.845, 74.16, 2.1], ["Pherkad", 15.345, 71.83, 3.0],
  ["Yildun", 17.537, 86.59, 4.4], ["epsUMi", 16.766, 82.04, 4.2], ["zetUMi", 15.734, 77.79, 4.3], ["etaUMi", 16.292, 75.76, 5.0],
  ["Caph", 0.153, 59.15, 2.3], ["Schedar", 0.675, 56.54, 2.2], ["gamCas", 0.945, 60.72, 2.2], ["Ruchbah", 1.43, 60.24, 2.7], ["Segin", 1.907, 63.67, 3.4],
  ["Deneb", 20.69, 45.28, 1.3], ["Sadr", 20.37, 40.26, 2.2], ["Gienah", 20.77, 33.97, 2.5], ["delCyg", 19.75, 45.13, 2.9], ["Albireo", 19.512, 27.96, 3.1],
  ["Vega", 18.616, 38.78, 0.0], ["Sheliak", 18.835, 33.36, 3.5], ["Sulafat", 18.982, 32.69, 3.3], ["zetLyr", 18.746, 37.6, 4.3], ["delLyr", 18.908, 36.9, 4.3],
  ["Altair", 19.846, 8.87, 0.8], ["Tarazed", 19.771, 10.61, 2.7], ["Alshain", 19.922, 6.41, 3.7],
  ["Betelgeuse", 5.919, 7.41, 0.5], ["Bellatrix", 5.419, 6.35, 1.6], ["Alnitak", 5.679, -1.94, 1.8], ["Alnilam", 5.604, -1.2, 1.7],
  ["Mintaka", 5.533, -0.3, 2.2], ["Saiph", 5.796, -9.67, 2.1], ["Rigel", 5.242, -8.2, 0.1],
  ["Aldebaran", 4.599, 16.51, 0.9], ["Pleiadi", 3.79, 24.1, 1.6], ["Capella", 5.278, 45.99, 0.1], ["Mirfak", 3.405, 49.86, 1.8],
  ["Alpheratz", 0.14, 29.09, 2.1], ["Mirach", 1.162, 35.62, 2.1], ["Almach", 2.065, 42.33, 2.1],
  ["Markab", 23.079, 15.21, 2.5], ["Scheat", 23.063, 28.08, 2.4], ["Algenib", 0.22, 15.18, 2.8],
];

const LINEE: [string, string][] = [
  ["Dubhe", "Merak"], ["Merak", "Phecda"], ["Phecda", "Megrez"], ["Megrez", "Dubhe"], ["Megrez", "Alioth"], ["Alioth", "Mizar"], ["Mizar", "Alkaid"],
  ["Polaris", "Yildun"], ["Yildun", "epsUMi"], ["epsUMi", "zetUMi"], ["zetUMi", "etaUMi"], ["etaUMi", "Pherkad"], ["Pherkad", "Kochab"], ["Kochab", "zetUMi"],
  ["Caph", "Schedar"], ["Schedar", "gamCas"], ["gamCas", "Ruchbah"], ["Ruchbah", "Segin"],
  ["Deneb", "Sadr"], ["Sadr", "Albireo"], ["delCyg", "Sadr"], ["Sadr", "Gienah"],
  ["Vega", "zetLyr"], ["zetLyr", "Sheliak"], ["Sheliak", "Sulafat"], ["Sulafat", "delLyr"], ["delLyr", "zetLyr"],
  ["Tarazed", "Altair"], ["Altair", "Alshain"],
  ["Betelgeuse", "Bellatrix"], ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"], ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"],
  ["Alnitak", "Saiph"], ["Mintaka", "Rigel"],
  ["Alpheratz", "Mirach"], ["Mirach", "Almach"],
  ["Markab", "Scheat"], ["Scheat", "Alpheratz"], ["Alpheratz", "Algenib"], ["Algenib", "Markab"],
];

const RAD = Math.PI / 180;

/** Da coordinate equatoriali a un punto sulla volta, visto dalla latitudine LAT. */
function sullaVolta(ar: number, dec: number, raggio: number) {
  const ha = (TSL - ar) * 15 * RAD;
  const d = dec * RAD;
  const l = LAT * RAD;
  const alt = Math.asin(Math.sin(d) * Math.sin(l) + Math.cos(d) * Math.cos(l) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha) * Math.cos(d), Math.cos(l) * Math.sin(d) - Math.sin(l) * Math.cos(d) * Math.cos(ha));
  return {
    alt,
    p: new THREE.Vector3(Math.sin(az) * Math.cos(alt) * raggio, Math.sin(alt) * raggio - 1.5, -Math.cos(az) * Math.cos(alt) * raggio),
  };
}

const STELLE_VERT = `
attribute float aDim;
attribute float aFase;
uniform float uTempo;
uniform float uPixel;
varying float vLuce;
void main(){
  vLuce = 0.78 + 0.22 * sin(uTempo * (0.6 + aFase * 0.9) + aFase * 40.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aDim * uPixel;
}`;

const STELLE_FRAG = `
uniform vec3 uColore;
uniform float uOpacita;
varying float vLuce;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  gl_FragColor = vec4(uColore, a * a * vLuce * uOpacita);
}`;

function materialeStelle(colore: string, pixel: number) {
  return new THREE.ShaderMaterial({
    vertexShader: STELLE_VERT,
    fragmentShader: STELLE_FRAG,
    uniforms: {
      uTempo: { value: 0 },
      uPixel: { value: pixel },
      uColore: { value: new THREE.Color(colore) },
      uOpacita: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    fog: false,
  });
}

function etichetta(testo: string, mono: string) {
  const tela = document.createElement("canvas");
  const ctx0 = tela.getContext("2d");
  const font = `400 30px ${mono}`;
  if (ctx0) ctx0.font = font;
  const w = Math.ceil((ctx0?.measureText(testo).width ?? 200) + 20);
  tela.width = w;
  tela.height = 44;
  const ctx = tela.getContext("2d");
  if (ctx) {
    ctx.font = font;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(testo, 10, 23);
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  return { t, rapporto: w / 44 };
}

type Nodo = { id: string; nome: string; peso: number; pos: THREE.Vector3 };

export default function Cielo({
  notte, colore, lingua, angoli, quote, attiva, ridotto, stretto, mono,
}: {
  notte: boolean;
  colore: string;
  lingua: string;
  /** angolo e quota di ogni carta, per id */
  angoli: Record<string, number>;
  quote: Record<string, number>;
  /** id della carta attiva (passaggio, fuoco o apertura), scritto dalle carte */
  attiva: MutableRefObject<string | null>;
  ridotto: boolean;
  stretto: boolean;
  mono: string;
}) {
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.75);

  /* ------------------------------ stelle vere e deboli, linee delle costellazioni */
  const notturno = useMemo(() => {
    if (!notte) return null;
    const pos: number[] = [];
    const dim: number[] = [];
    const fase: number[] = [];
    const indice: Record<string, THREE.Vector3> = {};
    STELLE.forEach(([nome, ar, dec, mag]) => {
      const { alt, p } = sullaVolta(ar, dec, R_CIELO);
      if (alt < 4 * RAD) return;
      indice[nome] = p;
      pos.push(p.x, p.y, p.z);
      dim.push(THREE.MathUtils.clamp(5.2 - mag * 1.05, 1.6, 5.4));
      fase.push(Math.random());
    });
    let s = 99;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let k = 0; k < (stretto ? 380 : 760); k++) {
      const az = rnd() * Math.PI * 2;
      const alt = Math.asin(0.08 + rnd() * 0.92);
      pos.push(Math.sin(az) * Math.cos(alt) * R_CIELO, Math.sin(alt) * R_CIELO - 1.5, -Math.cos(az) * Math.cos(alt) * R_CIELO);
      dim.push(0.7 + rnd() * 1.0);
      fase.push(rnd());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aDim", new THREE.Float32BufferAttribute(dim, 1));
    g.setAttribute("aFase", new THREE.Float32BufferAttribute(fase, 1));
    const punti = new THREE.Points(g, materialeStelle("#FFFFFF", dpr));
    punti.raycast = () => undefined;

    const seg: number[] = [];
    LINEE.forEach(([a, b]) => {
      const pa = indice[a];
      const pb = indice[b];
      if (pa && pb) seg.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    });
    const gl = new THREE.BufferGeometry();
    gl.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    const linee = new THREE.LineSegments(
      gl,
      new THREE.LineBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.09, depthWrite: false, fog: false })
    );
    linee.raycast = () => undefined;
    return { punti, linee };
  }, [notte, stretto, dpr]);

  /* ------------------------------------------- la costellazione delle competenze */
  const nodi = useMemo<Nodo[]>(() => {
    const ids = Object.keys(competenzeDi);
    const peso: Record<string, number> = {};
    const verso: Record<string, THREE.Vector2> = {};
    ids.forEach((lav) =>
      competenzeDi[lav].forEach((c) => {
        peso[c] = (peso[c] ?? 0) + 1;
        const a = angoli[lav] ?? 0;
        (verso[c] ??= new THREE.Vector2()).add(new THREE.Vector2(Math.cos(a), Math.sin(a)));
      })
    );
    // azimut desiderato: la media degli angoli dei lavori che la usano
    let s = 7;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const voci = competenze.map((c) => {
      const v = verso[c.id];
      const az = v && v.lengthSq() > 1e-6 ? Math.atan2(v.y, v.x) : rnd() * Math.PI * 2;
      return { c, az: (az + Math.PI * 2) % (Math.PI * 2) };
    });
    voci.sort((a, b) => a.az - b.az);
    // tre file di altezza; in ogni fila le voci si distanziano finché non si toccano più
    const file = [21, 29, 37].map((e) => e * RAD);
    const perFila: { c: (typeof voci)[number]["c"]; az: number }[][] = [[], [], []];
    voci.forEach((v, i) => perFila[i % 3].push({ ...v }));
    const minimo = (Math.PI * 2) / (voci.length / 3) * 0.92;
    perFila.forEach((fila) => {
      for (let it = 0; it < 60; it++) {
        for (let i = 0; i < fila.length; i++) {
          const a = fila[i];
          const b = fila[(i + 1) % fila.length];
          let d = b.az - a.az;
          if (i === fila.length - 1) d += Math.PI * 2;
          if (d < minimo) {
            const sposta = (minimo - d) / 2;
            a.az -= sposta;
            b.az += sposta;
          }
        }
      }
    });
    const out: Nodo[] = [];
    perFila.forEach((fila, f) =>
      fila.forEach(({ c, az }) => {
        const alt = file[f] + (rnd() - 0.5) * 3 * RAD;
        out.push({
          id: c.id,
          nome: nomeCompetenza(c, lingua),
          peso: peso[c.id] ?? 0,
          pos: new THREE.Vector3(
            Math.sin(az) * Math.cos(alt) * R_COMPETENZE,
            Math.sin(alt) * R_COMPETENZE - 1.5,
            -Math.cos(az) * Math.cos(alt) * R_COMPETENZE
          ),
        });
      })
    );
    return out;
  }, [angoli, lingua]);

  const grafica = useMemo(() => {
    const pos: number[] = [];
    const dim: number[] = [];
    const fase: number[] = [];
    nodi.forEach((n) => {
      pos.push(n.pos.x, n.pos.y, n.pos.z);
      dim.push(3.2 + Math.min(n.peso, 6) * 0.7);
      fase.push(Math.random());
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aDim", new THREE.Float32BufferAttribute(dim, 1));
    g.setAttribute("aFase", new THREE.Float32BufferAttribute(fase, 1));
    const luci = new THREE.BufferAttribute(new Float32Array(nodi.length), 1);
    g.setAttribute("aAccesa", luci);
    const mat = materialeStelle(colore, dpr);
    // le competenze accese crescono e brillano
    mat.vertexShader = mat.vertexShader
      .replace("attribute float aFase;", "attribute float aFase;\nattribute float aAccesa;\nvarying float vAccesa;")
      .replace("gl_PointSize = aDim * uPixel;", "vAccesa = aAccesa;\n  gl_PointSize = aDim * uPixel * (1.0 + aAccesa * 0.8);");
    mat.fragmentShader = mat.fragmentShader
      .replace("varying float vLuce;", "varying float vLuce;\nvarying float vAccesa;")
      .replace("a * a * vLuce * uOpacita", "a * a * vLuce * uOpacita * (0.42 + vAccesa * 0.58)");
    const punti = new THREE.Points(g, mat);
    punti.raycast = () => undefined;

    const etichette = nodi.map((n) => {
      const { t, rapporto } = etichetta(n.nome, mono);
      const m = new THREE.SpriteMaterial({ map: t, color: colore, transparent: true, opacity: 0, depthWrite: false, fog: false });
      const sp = new THREE.Sprite(m);
      const alto = stretto ? 0.32 : 0.26;
      sp.scale.set(alto * rapporto, alto, 1);
      sp.center.set(-0.08, 1.05);
      sp.position.copy(n.pos);
      sp.raycast = () => undefined;
      return sp;
    });

    const max = nodi.length * 2;
    const gf = new THREE.BufferGeometry();
    gf.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(max * 3), 3));
    gf.setDrawRange(0, 0);
    const fili = new THREE.LineSegments(
      gf,
      new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    fili.raycast = () => undefined;
    fili.frustumCulled = false;
    return { punti, luci, etichette, fili };
  }, [nodi, colore, dpr, mono, stretto]);

  useEffect(
    () => () => {
      notturno?.punti.geometry.dispose();
      (notturno?.punti.material as THREE.Material | undefined)?.dispose();
      notturno?.linee.geometry.dispose();
      (notturno?.linee.material as THREE.Material | undefined)?.dispose();
    },
    [notturno]
  );
  useEffect(
    () => () => {
      grafica.punti.geometry.dispose();
      (grafica.punti.material as THREE.Material).dispose();
      grafica.etichette.forEach((e) => {
        e.material.map?.dispose();
        e.material.dispose();
      });
      grafica.fili.geometry.dispose();
      (grafica.fili.material as THREE.Material).dispose();
    },
    [grafica]
  );

  const ultima = useRef<string | null>(null);
  const accese = useRef<Set<string>>(new Set());
  const forzaFili = useRef(0);

  useFrame((stato, dt) => {
    const t = ridotto ? 0 : stato.clock.elapsedTime;
    if (notturno) (notturno.punti.material as THREE.ShaderMaterial).uniforms.uTempo.value = t;
    (grafica.punti.material as THREE.ShaderMaterial).uniforms.uTempo.value = t;

    const id = attiva.current;
    if (id !== ultima.current) {
      ultima.current = id;
      // la carta "Scrivimi" accende tutto: è quello che posso fare per chi scrive
      const usate = id === "contatto" ? competenze.map((c) => c.id) : id ? competenzeDi[id] ?? [] : [];
      accese.current = new Set(usate);
      if (id && angoli[id] !== undefined) {
        const a = angoli[id];
        const da = new THREE.Vector3(Math.sin(a) * 5.75, (quote[id] ?? 0) + 0.85, -Math.cos(a) * 5.75);
        const arr = grafica.fili.geometry.attributes.position.array as Float32Array;
        let k = 0;
        nodi.forEach((n) => {
          if (!accese.current.has(n.id)) return;
          arr.set([da.x, da.y, da.z, n.pos.x, n.pos.y, n.pos.z], k * 6);
          k++;
        });
        grafica.fili.geometry.attributes.position.needsUpdate = true;
        grafica.fili.geometry.setDrawRange(0, k * 2);
        forzaFili.current = 0;
      }
    }

    const k = 1 - Math.exp(-dt * 4);
    forzaFili.current = THREE.MathUtils.lerp(forzaFili.current, id ? 1 : 0, ridotto ? 1 : k);
    (grafica.fili.material as THREE.LineBasicMaterial).opacity = forzaFili.current * (notte ? 0.26 : 0.3);

    nodi.forEach((n, i) => {
      const su = accese.current.has(n.id) && !!id;
      const v = grafica.luci.array as Float32Array;
      v[i] = THREE.MathUtils.lerp(v[i], su ? 1 : 0, k);
      const m = grafica.etichette[i].material;
      const base = notte ? 0.13 : 0.16;
      m.opacity = THREE.MathUtils.lerp(m.opacity, su ? 0.95 : id ? base * 0.5 : base, k);
    });
    grafica.luci.needsUpdate = true;
  });

  return (
    <group>
      {notturno && <primitive object={notturno.punti} />}
      {notturno && <primitive object={notturno.linee} />}
      <primitive object={grafica.punti} />
      {grafica.etichette.map((e, i) => (
        <primitive key={i} object={e} />
      ))}
      <primitive object={grafica.fili} />
    </group>
  );
}
