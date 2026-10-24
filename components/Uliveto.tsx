"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { accesaDaSotto, costruisciUlivo } from "./ospiti/ulivo";
import { alone, generatore } from "./ospiti/comuni";
import { cielo, modello, rete, textura, triplanare } from "./ospiti/polyhaven";
import type { Forma, Luogo, Media } from "@/content/olio";

/*
 * L'uliveto della pagina dell'olio: una trazzera fra muretti a secco e ulivi, al tramonto (tema chiaro)
 * o di notte coi faretti sotto gli alberi (tema scuro). Chi scorre la pagina cammina lungo la trazzera.
 * Il cammino passa per tre luoghi: l'uliveto, la raccolta (reti stese, cassette, una scala), il frantoio
 * con la macina che gira. I quadri, video e foto, stanno nel luogo del loro contenuto: appesi fra gli alberi,
 * su cavalletti accanto alle cassette, in cerchio attorno alla macina. Si accendono quando ci si passa
 * davanti e si aprono a tutto schermo con un clic.
 */

export type Quadro = { media: Media; luogo: Luogo; forma: Forma; didascalia: string; /** indice della tappa del testo a cui è legato */ tappa: number };
/** Dove sta un quadro: la base, il punto verso cui guarda, l'altezza del centro, l'altezza massima, il sostegno. */
type Posto = { pos: THREE.Vector3; verso: THREE.Vector3; y: number; alto: number; sostegno: "pali" | "cavalletto" };

type Props = {
  quadri: Quadro[];
  /** quanto si è camminato, 0–1: lo scrive la pagina mentre scorre */
  progresso: React.MutableRefObject<number>;
  notte: boolean;
  ridotto: boolean;
  stretto: boolean;
  vuoto: string;
  onApri: (i: number) => void;
  /** dopo i primi fotogrammi: la scena è pronta, il velo può sfumare */
  onPronta: () => void;
  /** da che parte sta il testo di ogni tappa: i quadri stanno dall'altra */
  lati: ("sx" | "dx" | "centro")[];
};

/** Il cammino, da dove si entra al frantoio: sale e scende appena, piega a destra e a sinistra. */
const CAMMINO = new THREE.CatmullRomCurve3(
  [
    [0, 0, 4], [0.6, 0, -8], [-1.4, 0, -20], [0.8, 0, -32], [-0.6, 0, -44], [0.4, 0, -56], [0, 0, -64],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  "catmullrom",
  0.4
);
/** La camera si ferma prima della fine, per vedere il frantoio davanti. */
const FINE_CAMERA = 0.9;
const OCCHI = 1.55;

/** La quota della terra: piccole onde, le stesse della geometria del suolo. */
const quota = (x: number, z: number) => 0.12 * Math.sin(x * 0.4 + z * 0.3) + 0.08 * Math.sin(x * 1.3 - z * 0.7) - 0.05;

/** Un punto del cammino e la direzione "a destra" lì. */
function sulCammino(p: number, out = new THREE.Vector3()) {
  return CAMMINO.getPointAt(THREE.MathUtils.clamp(p, 0, 1), out);
}
function destra(p: number, out = new THREE.Vector3()) {
  const t = CAMMINO.getTangentAt(THREE.MathUtils.clamp(p, 0, 1));
  return out.set(-t.z, 0, t.x).normalize();
}

/**
 * Dispone i quadri: ognuno qualche metro più avanti della tappa del testo a cui è legato, dalla parte
 * libera dal pannello; quelli dell'ultima tappa in arco dietro la macina, rivolti verso chi arriva.
 */
function disponi(quadri: Quadro[], stretto: boolean, lati: ("sx" | "dx" | "centro")[]): Posto[] {
  const N = lati.length;
  const fine = sulCammino(1), avanti = CAMMINO.getTangentAt(1).setY(0).normalize(), lato = destra(1);
  const arrivo = sulCammino(FINE_CAMERA);
  const inArco = quadri.filter((q) => q.tappa === N - 1).length;
  const perTappa: Record<number, number> = {};
  return quadri.map((q) => {
    const k = (perTappa[q.tappa] = (perTappa[q.tappa] ?? -1) + 1);
    if (q.tappa === N - 1) {
      // l'ultima tappa: in arco dietro la macina
      const a = inArco === 1 ? 0 : -1.1 + (2.2 * k) / (inArco - 1);
      const pos = fine.clone().add(avanti.clone().multiplyScalar(Math.cos(a) * 3.6)).add(lato.clone().multiplyScalar(Math.sin(a) * 4.0));
      return { pos, verso: arrivo.clone(), y: 1.9, alto: inArco === 1 ? 2.4 : 1.9, sostegno: "pali" };
    }
    // dove ci si ferma per leggere la tappa, e qualche metro più avanti; il secondo quadro accanto al primo
    const fermo = (q.tappa / (N - 1)) * FINE_CAMERA;
    // il secondo sta più avanti e più in fuori: davanti a chi legge si vedono tutti e due, e alla tappa
    // successiva è già alle spalle; sul telefono i quadri stanno più al centro, sopra il pannello
    const p = fermo + (stretto ? 0.095 : 0.075) + k * 0.03;
    const parte: 1 | -1 = lati[q.tappa] === "sx" ? 1 : lati[q.tappa] === "dx" ? -1 : k % 2 ? -1 : 1;
    const pos = sulCammino(p).add(destra(p).multiplyScalar(parte * (stretto ? 0.9 + k * 1.1 : 1.6 + k * 1.45)));
    // guarda chi arriva da dove si legge
    const verso = sulCammino(fermo);
    return q.luogo === "raccolta"
      ? { pos, verso, y: 1.4, alto: 1.6, sostegno: "cavalletto" }
      : { pos, verso, y: 1.7, alto: 2.0, sostegno: "pali" };
  });
}

export default function Uliveto(props: Props) {
  return (
    <Canvas
      className="uliveto-tela"
      dpr={props.stretto ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: props.stretto ? 68 : 52, near: 0.1, far: 140, position: [0, OCCHI, 4] }}
    >
      <Cielo notte={props.notte} />
      <Terra notte={props.notte} />
      <Ulivi notte={props.notte} ridotto={props.ridotto} />
      <Frantoio notte={props.notte} ridotto={props.ridotto} />
      <Raccolta notte={props.notte} />
      <Sassi notte={props.notte} />
      <Erba notte={props.notte} stretto={props.stretto} />
      <Bacheche {...props} />
      <FotoNelPodere {...props} />
      {props.notte && !props.ridotto && <Lucciole />}
      <Passo progresso={props.progresso} ridotto={props.ridotto} onPronta={props.onPronta} />
    </Canvas>
  );
}

/** I quadri su pali e cavalletti: solo quelli in forma di bacheca, con l'indice che hanno fra tutti. */
function Bacheche(props: Props) {
  const bacheche = props.quadri.map((q, i) => ({ q, i })).filter(({ q }) => q.forma === "bacheca");
  const posti = disponi(
    bacheche.map(({ q }) => q),
    props.stretto,
    props.lati
  );
  return (
    <>
      {bacheche.map(({ q, i }, k) => (
        <QuadroFraGliUlivi key={i} quadro={q} posto={posti[k]} indice={i} notte={props.notte} vuoto={props.vuoto} onApri={props.onApri} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ il passo */

/** La camera segue lo scorrimento, morbida; dondola appena, come chi cammina. */
function Passo({ progresso, ridotto, onPronta }: { progresso: React.MutableRefObject<number>; ridotto: boolean; onPronta: () => void }) {
  const p = useRef(progresso.current);
  const fotogrammi = useRef(0);
  const guarda = useRef(new THREE.Vector3());
  const a = useRef(new THREE.Vector3());
  useFrame(({ camera, clock }, dt) => {
    const meta = progresso.current;
    p.current = ridotto ? meta : THREE.MathUtils.lerp(p.current, meta, 1 - Math.exp(-dt * 3));
    const pc = p.current * FINE_CAMERA;
    sulCammino(pc, a.current);
    const passo = ridotto ? 0 : Math.sin(pc * 260) * 0.02;
    camera.position.set(a.current.x, OCCHI + passo, a.current.z);
    sulCammino(pc + 0.04, guarda.current);
    guarda.current.y = OCCHI - 0.12 + (ridotto ? 0 : Math.sin(clock.elapsedTime * 0.3) * 0.03);
    camera.lookAt(guarda.current);
    if (++fotogrammi.current === 4) onPronta();
  });
  return null;
}

/* ------------------------------------------------------------------ il cielo */

const CIELO_V = `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/*
 * Finché la foto del cielo non arriva, un gradiente disegnato; poi la foto (un HDRI di Poly Haven),
 * girata in modo che il sole, o il chiarore della luna, stia in fondo al cammino. Sotto l'orizzonte
 * sfuma nel colore della nebbia, così la terra lontana non ha un bordo.
 */
const CIELO_F = `
uniform vec3 uBasso; uniform vec3 uAlto; uniform vec3 uSole; uniform vec3 uDirSole; uniform float uNotte;
uniform sampler2D uMappa; uniform float uPronto; uniform float uGiro; uniform vec3 uNebbia;
varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  float h = clamp(d.y * 1.8 + 0.08, 0.0, 1.0);
  vec3 c = mix(uBasso, uAlto, pow(h, 0.7));
  float s = max(dot(d, normalize(uDirSole)), 0.0);
  c += uSole * (pow(s, 600.0) * 1.4 + pow(s, 12.0) * 0.35) * (1.0 - uNotte);
  c += vec3(0.85, 0.88, 0.95) * pow(s, 900.0) * uNotte;
  float u = fract(atan(d.z, d.x) / 6.2831853 + 0.5 + uGiro);
  float v = asin(clamp(d.y, -1.0, 1.0)) / 3.1415926 + 0.5;
  vec3 m = texture2D(uMappa, vec2(u, v)).rgb;
  m = mix(m, uNebbia, smoothstep(0.05, -0.03, d.y));
  gl_FragColor = vec4(mix(c, m, uPronto), 1.0);
}`;

/** Il colore della nebbia, lo stesso dell'orizzonte della foto: la terra lontana ci sfuma dentro. */
const NEBBIA = { giorno: "#A99B85", notte: "#272D33" };

function Cielo({ notte }: { notte: boolean }) {
  // il tramonto: orizzonte d'oro, cielo che sale all'azzurro; la notte: blu profondo, la luna al posto del sole
  const mat = useMemo(() => {
    const nebbia = new THREE.Color().setStyle(notte ? NEBBIA.notte : NEBBIA.giorno, THREE.LinearSRGBColorSpace);
    const m = new THREE.ShaderMaterial({
      vertexShader: CIELO_V,
      fragmentShader: CIELO_F,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uBasso: { value: new THREE.Color(notte ? "#1A2033" : "#F0C487") },
        uAlto: { value: new THREE.Color(notte ? "#05070D" : "#7C9CC4") },
        uSole: { value: new THREE.Color("#FFD9A0") },
        uDirSole: { value: new THREE.Vector3(notte ? -0.4 : 0.25, notte ? 0.35 : 0.07, -1) },
        uNotte: { value: notte ? 1 : 0 },
        uMappa: { value: null as THREE.Texture | null },
        uPronto: { value: 0 },
        // il sole della foto (a 0,60 della larghezza) in fondo al cammino, appena a destra; la luna appena a sinistra
        uGiro: { value: notte ? 0.42 : 0.31 },
        uNebbia: { value: new THREE.Vector3(nebbia.r, nebbia.g, nebbia.b) },
      },
    });
    // la foto si scarica una volta; quando c'è, il cielo disegnato le lascia il posto
    m.uniforms.uMappa.value = cielo(notte, () => {
      m.userData.arrivata = true;
    });
    return m;
  }, [notte]);
  useEffect(() => () => mat.dispose(), [mat]);
  const stelle = useMemo(() => {
    const caso = generatore(11);
    const p: number[] = [];
    for (let i = 0; i < 500; i++) {
      const a = caso() * Math.PI * 2, y = 0.1 + caso() * 0.9;
      const r = Math.sqrt(1 - y * y);
      p.push(Math.cos(a) * r * 110, y * 110, Math.sin(a) * r * 110);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  const volta = useRef<THREE.Mesh>(null);
  const stelleRif = useRef<THREE.Points>(null);
  useFrame(({ camera }, dt) => {
    // il cielo segue chi cammina
    volta.current?.position.copy(camera.position);
    stelleRif.current?.position.copy(camera.position);
    // la foto del cielo entra sfumando
    const m = volta.current?.material as THREE.ShaderMaterial | undefined;
    if (m?.userData.arrivata && m.uniforms.uPronto.value < 1) m.uniforms.uPronto.value = Math.min(1, m.uniforms.uPronto.value + dt * 1.5);
  });
  return (
    <>
      <mesh ref={volta} material={mat} renderOrder={-10}>
        <sphereGeometry args={[120, 32, 16]} />
      </mesh>
      {notte && (
        <points ref={stelleRif} geometry={stelle}>
          <pointsMaterial color="#E8ECF5" size={0.3} sizeAttenuation transparent opacity={0.55} fog={false} depthWrite={false} />
        </points>
      )}
      <fog attach="fog" args={[notte ? NEBBIA.notte : NEBBIA.giorno, notte ? 12 : 16, notte ? 56 : 72]} />
      {/* di notte la luna sta alle spalle di chi cammina: la terra, i muretti e la macina si leggono, freddi */}
      <hemisphereLight args={[notte ? "#7F90C0" : "#FFE2B8", notte ? "#3A3028" : "#7A5236", notte ? 2.0 : 1.1]} />
      <directionalLight position={notte ? [-6, 12, 10] : [10, 6, -40]} intensity={notte ? 1.1 : 1.6} color={notte ? "#AFC0E8" : "#FFC98A"} />
    </>
  );
}

/* ------------------------------------------------------------------ la terra */

/** I muretti a secco: a che distanza dal centro della trazzera, quanto spessi, quanto alti. */
const MURETTO = { distanza: 1.12, spessore: 0.38, alto: 0.46 };

/** La trazzera: una striscia che segue il cammino, piena al centro e sfumata ai bordi nella terra rossa. */
function geometriaTrazzera() {
  const n = 400;
  // da sinistra a destra: bordo sfumato, pieno, pieno, bordo sfumato
  const colonne = [
    { d: -0.98, a: 0 },
    { d: -0.6, a: 1 },
    { d: 0.6, a: 1 },
    { d: 0.98, a: 0 },
  ];
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3(), d = new THREE.Vector3(), prima = new THREE.Vector3();
  let lungo = 0;
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    sulCammino(p, v);
    destra(p, d);
    if (i > 0) lungo += v.distanceTo(prima);
    prima.copy(v);
    colonne.forEach(({ d: k, a }) => {
      const x = v.x + d.x * k, z = v.z + d.z * k;
      // segue la terra, appena sopra: altrimenti le onde del suolo la bucano
      pos.push(x, quota(x, z) + 0.07, z);
      uv.push((k + 1) / 2, lungo / 2);
      col.push(1, 1, 1, a);
    });
    if (i < n) {
      for (let c = 0; c < 3; c++) {
        const a = i * 4 + c, b = a + 4;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * I muretti a secco ai due lati: un nastro di pietra con la faccia verso la trazzera, il colmo e la faccia
 * verso i campi, appena rastremato in alto; l'altezza varia un poco, come in un muro tirato su a mano.
 */
function geometriaMuretti() {
  const n = 500;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3(), d = new THREE.Vector3(), prima = new THREE.Vector3();
  const caso = generatore(13);
  const { distanza, spessore, alto } = MURETTO;
  let base = 0;
  for (const lato of [-1, 1]) {
    let lungo = 0;
    const scarti: number[] = [];
    for (let i = 0; i <= n; i++) scarti.push((caso() - 0.5) * 0.08);
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      sulCammino(p, v);
      destra(p, d);
      if (i > 0) lungo += v.distanceTo(prima);
      prima.copy(v);
      const h = alto + 0.05 * Math.sin(p * 90 + lato) + (scarti[i] + (scarti[i - 1] ?? 0) + (scarti[i + 1] ?? 0)) / 3;
      const punto = (k: number, y: number) => {
        const x = v.x + d.x * k * lato, z = v.z + d.z * k * lato;
        return [x, quota(x, z) + y, z];
      };
      const dentro = distanza - spessore / 2, fuori = distanza + spessore / 2;
      const u = lungo / 1.6;
      // tre facce, ognuna coi suoi vertici: gli spigoli restano netti
      pos.push(...punto(dentro, -0.1), ...punto(dentro + 0.05, h));
      uv.push(u, 0, u, (h + 0.1) / 1.6);
      pos.push(...punto(dentro + 0.05, h), ...punto(fuori - 0.05, h));
      uv.push(u, 0, u, spessore / 1.6);
      pos.push(...punto(fuori - 0.05, h), ...punto(fuori, -0.1));
      uv.push(u, (h + 0.1) / 1.6, u, 0);
      if (i < n) {
        for (let f = 0; f < 3; f++) {
          const a = base + i * 6 + f * 2, b = a + 6;
          // l'ordine dei vertici dipende dal lato, perché le facce guardino fuori
          if (lato > 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
          else idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    base += (n + 1) * 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Terra({ notte }: { notte: boolean }) {
  const [suolo, strada, muri] = useMemo(() => {
    // la terra rossa, mossa appena; il colore della foto variato a chiazze, perché la ripetizione non si veda
    const g = new THREE.PlaneGeometry(120, 160, 120, 160).rotateX(-Math.PI / 2).translate(0, 0, -40);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const a = new THREE.Color("#C9B6A6"), b = new THREE.Color("#FFFFFF"), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, quota(x, z));
      c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(x * 0.23 + z * 0.37) * Math.sin(z * 0.11 - x * 0.05));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return [g, geometriaTrazzera(), geometriaMuretti()];
  }, []);
  // le foto di Poly Haven: la terra ogni 2,7 metri, la trazzera ogni 2, il muretto ogni 1,6
  const terra = useMemo(() => ({ colore: textura("terra-colore.webp", true, [44, 58]), rilievo: textura("terra-rilievo.webp", false, [44, 58]) }), []);
  const via = useMemo(() => ({ colore: textura("trazzera-colore.webp", true), rilievo: textura("trazzera-rilievo.webp", false) }), []);
  const muro = useMemo(() => ({ colore: textura("muretto-colore.webp", true), rilievo: textura("muretto-rilievo.webp", false) }), []);
  const rilievo = useMemo(() => new THREE.Vector2(1, 1), []);
  return (
    <>
      <mesh geometry={suolo}>
        <meshLambertMaterial vertexColors map={terra.colore} normalMap={terra.rilievo} normalScale={rilievo} color={notte ? "#7E8090" : "#FFFFFF"} />
      </mesh>
      <mesh geometry={strada} renderOrder={1}>
        <meshLambertMaterial
          vertexColors
          transparent
          depthWrite={false}
          map={via.colore}
          normalMap={via.rilievo}
          normalScale={rilievo}
          color={notte ? "#8A8794" : "#F2E2C8"}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh geometry={muri}>
        <meshLambertMaterial map={muro.colore} normalMap={muro.rilievo} normalScale={rilievo} color={notte ? "#7A7884" : "#FFF4E2"} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ gli ulivi */

/** Le posizioni degli ulivi: in file ai due lati, lontano dal cammino quanto basta per lasciar vedere i quadri. */
function postiUlivi() {
  const caso = generatore(21);
  const posti: { x: number; z: number; s: number; r: number; v: number }[] = [];
  // il sesto d'impianto: file a sei metri, e la prima fila lascia la trazzera libera e i quadri in vista
  for (let z = 2; z > -74; z -= 6.2) {
    for (const lato of [-1, 1]) {
      for (let fila = 0; fila < 3; fila++) {
        const p = THREE.MathUtils.clamp((4 - z) / 68, 0, 1);
        const c = sulCammino(p);
        const x = c.x + lato * (5.2 + fila * 6 + caso() * 1.4);
        posti.push({ x, z: z + (caso() - 0.5) * 2.4 + (fila % 2) * 3.1, s: 1.15 + caso() * 0.45, r: caso() * Math.PI * 2, v: Math.floor(caso() * 3) });
      }
    }
  }
  return posti;
}

function Ulivi({ notte, ridotto }: { notte: boolean; ridotto: boolean }) {
  const dati = useMemo(() => {
    const varianti = [4242, 977, 3131].map((seme) => {
      const { legnoGeo, frondeGeo } = costruisciUlivo(seme);
      const legnoNotte = accesaDaSotto(legnoGeo, "#8A7A66", 2.3, 0.62);
      const frondeNotte = accesaDaSotto(frondeGeo, "#7E8C62", 2.3, 0.5);
      return { legnoGeo, frondeGeo, legnoNotte: legnoNotte.geometry, frondeNotte: frondeNotte.geometry };
    });
    const posti = postiUlivi();
    const cono = (() => {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 128;
      const x = c.getContext("2d") as CanvasRenderingContext2D;
      const g = x.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, "rgba(255,210,150,0.32)");
      g.addColorStop(0.6, "rgba(255,210,150,0.06)");
      g.addColorStop(1, "rgba(255,210,150,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    return { varianti, posti, cono };
  }, []);
  // la corteccia grigia e fessurata sui tronchi: la grana della foto sopra il colore di sempre
  const materiali = useMemo(() => {
    const corteccia = textura("corteccia-colore.webp", true);
    const legno = (m: THREE.MeshLambertMaterial | THREE.MeshBasicMaterial) => triplanare(m, corteccia, 2.2, 0.9, 0.2024);
    return {
      legnoGiorno: legno(new THREE.MeshLambertMaterial({ color: "#8A8073", flatShading: true })),
      frondeGiorno: new THREE.MeshLambertMaterial({ color: "#93A07A", flatShading: true }),
      veloGiorno: new THREE.MeshLambertMaterial({ color: "#D2D6C2", flatShading: true, transparent: true, opacity: 0.4 }),
      legnoNotte: legno(new THREE.MeshBasicMaterial({ vertexColors: true })),
      frondeNotte: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
  }, []);
  useEffect(() => () => Object.values(materiali).forEach((m) => m.dispose()), [materiali]);
  const rif = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    dati.varianti.forEach((_, v) => {
      const miei = dati.posti.filter((x) => x.v === v);
      for (let k = 0; k < 5; k++) {
        const im = rif.current[v * 5 + k];
        if (!im) continue;
        miei.forEach((x, i) => {
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), x.r);
          s.setScalar(x.s);
          p.set(x.x, 0, x.z);
          m.compose(p, q, s);
          // il cono di luce: un poco più largo, inclinato verso il tronco
          im.setMatrixAt(i, m);
        });
        im.instanceMatrix.needsUpdate = true;
      }
    });
  }, [dati, notte]);
  void ridotto;
  return (
    <>
      {dati.varianti.map((v, i) => {
        const n = dati.posti.filter((x) => x.v === i).length;
        const metti = (k: number) => (el: THREE.InstancedMesh | null) => {
          rif.current[i * 5 + k] = el;
        };
        return (
          <group key={i}>
            {!notte && (
              <>
                <instancedMesh ref={metti(0)} args={[v.legnoGeo, materiali.legnoGiorno, n]} />
                <instancedMesh ref={metti(1)} args={[v.frondeGeo, materiali.frondeGiorno, n]} />
                <instancedMesh ref={metti(2)} args={[v.frondeGeo, materiali.veloGiorno, n]} />
              </>
            )}
            {notte && (
              <>
                <instancedMesh ref={metti(3)} args={[v.legnoNotte, materiali.legnoNotte, n]} />
                <instancedMesh ref={metti(4)} args={[v.frondeNotte, materiali.frondeNotte, n]} />
              </>
            )}
          </group>
        );
      })}
      {notte && <Faretti posti={dati.posti} cono={dati.cono} />}
    </>
  );
}

/** Di notte, sotto ogni ulivo vicino al cammino, un faretto: la lampada a terra e il cono di luce. */
function Faretti({ posti, cono }: { posti: { x: number; z: number; s: number }[]; cono: THREE.Texture }) {
  const vicini = useMemo(() => posti.filter((p, i) => i % 3 === 0), [posti]);
  const coni = useRef<THREE.InstancedMesh>(null);
  const lampade = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    vicini.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x + 0.5, 0, p.z - 0.4), q.setFromEuler(new THREE.Euler(0.2, 0, 0.25)), s.setScalar(p.s));
      coni.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x + 0.5, 0.03, p.z - 0.4), new THREE.Quaternion(), s.setScalar(1));
      lampade.current?.setMatrixAt(i, m);
    });
    if (coni.current) coni.current.instanceMatrix.needsUpdate = true;
    if (lampade.current) lampade.current.instanceMatrix.needsUpdate = true;
  }, [vicini]);
  const fascio = useMemo(() => new THREE.CylinderGeometry(0.8, 0.06, 2.6, 18, 1, true).translate(0, 1.3, 0), []);
  return (
    <>
      <instancedMesh ref={coni} args={[fascio, undefined, vicini.length]}>
        <meshBasicMaterial map={cono} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false} />
      </instancedMesh>
      <instancedMesh ref={lampade} args={[undefined, undefined, vicini.length]}>
        <circleGeometry args={[0.07, 12]} />
        <meshBasicMaterial color="#FFE2B0" side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
}

/** Di notte qualche lucciola fra gli ulivi vicini al cammino. */
function Lucciole() {
  const n = 70;
  const geo = useMemo(() => {
    const caso = generatore(5);
    const p: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = caso();
      const c = sulCammino(t);
      p.push(c.x + (caso() - 0.5) * 9, 0.4 + caso() * 1.6, c.z + (caso() - 0.5) * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  const base = useMemo(() => (geo.attributes.position.array as Float32Array).slice(), [geo]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const punti = useRef<THREE.Points>(null);
  const tondo = useMemo(() => alone("#F4F8B0"), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = punti.current?.geometry;
    if (!g) return;
    const a = g.attributes.position.array as Float32Array;
    for (let i = 0; i < n; i++) {
      a[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 0.4;
      a[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + i * 2) * 0.2;
      a[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 0.4;
    }
    g.attributes.position.needsUpdate = true;
    if (mat.current) mat.current.opacity = 0.6 + 0.3 * Math.sin(t * 2.3);
  });
  return (
    <points ref={punti} geometry={geo} frustumCulled={false}>
      <pointsMaterial ref={mat} map={tondo} color="#E9F28A" size={0.12} sizeAttenuation transparent blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
    </points>
  );
}

/* ------------------------------------------------------------------ i materiali */

/** Un materiale semplice per colore, condiviso da tutti i pezzi di legno e di pietra che lo usano. */
const materiali = new Map<string, THREE.MeshLambertMaterial>();
function tinta(colore: string) {
  let m = materiali.get(colore);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: colore });
    materiali.set(colore, m);
  }
  return m;
}

/* ------------------------------------------------------------------ i modelli */

/**
 * Le copie di un modello di Poly Haven: lo si scarica una volta, poi un InstancedMesh per tutte le copie.
 * Di notte il materiale è velato di blu, come il resto della campagna.
 */
function Istanze({ nome, matrici, notte, colori }: { nome: string; matrici: THREE.Matrix4[]; notte: boolean; colori?: string[] }) {
  const [dati, setDati] = useState<{ geometria: THREE.BufferGeometry; materiale: THREE.Material } | null>(null);
  useEffect(() => {
    let vivo = true;
    modello(nome)
      .then((m) => {
        if (vivo) setDati(m);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [nome]);
  const materiale = useMemo(() => {
    if (!dati) return null;
    // lo stesso materiale semplice del resto della scena, non quello fisico del modello: costa molto meno
    // da compilare e da disegnare. Il colore del modello resta (la cassetta è arancio nel fattore, non nella
    // foto): lo si vela soltanto
    const o = dati.materiale as THREE.MeshStandardMaterial;
    const m = new THREE.MeshLambertMaterial({
      map: o.map ?? undefined,
      normalMap: o.normalMap ?? undefined,
      // con colori propri per copia, il colore del modello si lascia da parte: lo danno le copie
      color: (colori ? new THREE.Color("#FFFFFF") : o.color.clone()).multiply(new THREE.Color(notte ? "#6E7284" : "#FFF6EA")),
      alphaTest: o.alphaTest,
      side: o.side,
    });
    return m;
  }, [dati, notte, colori]);
  useEffect(() => () => materiale?.dispose(), [materiale]);
  const rif = useRef<THREE.InstancedMesh>(null);
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    const im = rif.current;
    if (!im) return;
    matrici.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    colori?.forEach((c, i) => im.setColorAt(i, new THREE.Color(c)));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    // lo shader si compila in disparte, senza fermare la pagina; il modello compare quando è pronto
    let vivo = true;
    im.visible = false;
    gl.compileAsync(im, camera, scene)
      .catch(() => undefined)
      .then(() => {
        if (vivo) im.visible = true;
      });
    return () => {
      vivo = false;
    };
  }, [matrici, colori, dati, materiale, gl, camera, scene]);
  if (!dati || !materiale) return null;
  return <instancedMesh ref={rif} args={[dati.geometria, materiale, matrici.length]} />;
}

/**
 * Pietre e massi fra gli ulivi, come in ogni campagna iblea: le pietre piccole fra il muretto e la prima
 * fila d'alberi, i massi più in là, fra le file. Lasciano liberi i quadri, le reti e il frantoio.
 */
function Sassi({ notte }: { notte: boolean }) {
  const { pietre, massi } = useMemo(() => {
    const caso = generatore(41);
    const pietre: THREE.Matrix4[] = [];
    const massi: THREE.Matrix4[] = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0);
    const girata = (a: number) => new THREE.Quaternion().setFromAxisAngle(su, a);
    for (let i = 0; i < 46; i++) {
      const p = 0.02 + caso() * 0.9;
      // dove stanno le reti, la fascia vicina resta più libera
      if (p > 0.36 && p < 0.65 && i % 2) continue;
      const lato = caso() < 0.5 ? -1 : 1;
      sulCammino(p, v);
      destra(p, d);
      const k = 3.6 + caso() * 1.0;
      const x = v.x + d.x * k * lato, z = v.z + d.z * k * lato;
      const s = 0.28 + caso() * 0.3;
      pietre.push(new THREE.Matrix4().compose(new THREE.Vector3(x, quota(x, z) - 0.04, z), girata(caso() * 6.28), new THREE.Vector3(s, s * (0.7 + caso() * 0.5), s)));
    }
    for (let i = 0; i < 12; i++) {
      const p = 0.03 + (i / 12) * 0.85 + caso() * 0.04;
      const lato = i % 2 ? -1 : 1;
      sulCammino(p, v);
      destra(p, d);
      const k = 8.2 + caso() * 1.6;
      const x = v.x + d.x * k * lato, z = v.z + d.z * k * lato;
      const s = 1.0 + caso() * 0.8;
      massi.push(new THREE.Matrix4().compose(new THREE.Vector3(x, quota(x, z) - 0.08, z), girata(caso() * 6.28), new THREE.Vector3(s, s, s)));
    }
    return { pietre, massi };
  }, []);
  return (
    <>
      <Istanze nome="masso.glb" matrici={pietre} notte={notte} />
      <Istanze nome="masso.glb" matrici={massi} notte={notte} />
    </>
  );
}

/**
 * L'erba secca d'autunno, a ciuffi: al piede dei muretti, dalla parte dei campi, e sparsa fra gli ulivi.
 * Sul telefono un terzo.
 */
function Erba({ notte, stretto }: { notte: boolean; stretto: boolean }) {
  const ciuffi = useMemo(() => {
    const caso = generatore(53);
    const m: THREE.Matrix4[] = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0);
    const n = stretto ? 40 : 120;
    for (let i = 0; i < n; i++) {
      const p = caso();
      const lato = caso() < 0.5 ? -1 : 1;
      sulCammino(p, v);
      destra(p, d);
      // un terzo al piede del muretto, il resto fra gli alberi
      const k = i % 3 === 0 ? MURETTO.distanza + MURETTO.spessore / 2 + 0.08 + caso() * 0.25 : 2.2 + caso() * 16;
      const x = v.x + d.x * k * lato, z = v.z + d.z * k * lato;
      const s = (i % 3 === 0 ? 1.5 : 2.0) + caso() * 1.4;
      m.push(new THREE.Matrix4().compose(new THREE.Vector3(x, quota(x, z) - 0.02, z), new THREE.Quaternion().setFromAxisAngle(su, caso() * 6.28), new THREE.Vector3(s, s * (0.8 + caso() * 0.6), s)));
    }
    return m;
  }, [stretto]);
  return <Istanze nome="erba.glb" matrici={ciuffi} notte={notte} />;
}

/* ------------------------------------------------------------------ il frantoio */

/** In fondo al cammino: il frantoio a cielo aperto, la vasca di pietra con la macina che gira, una tettoia. */
function Frantoio({ notte, ridotto }: { notte: boolean; ridotto: boolean }) {
  const macina = useRef<THREE.Group>(null);
  const fine = useMemo(() => sulCammino(1), []);
  useFrame((_, dt) => {
    if (!ridotto && macina.current) macina.current.rotation.y += dt * 0.35;
  });
  const pietra = notte ? "#8A8790" : "#CFC3AA";
  const legno = notte ? "#5E5864" : "#6B4A2E";
  const tetto = useMemo(() => {
    const coppi = new THREE.MeshLambertMaterial({
      map: textura("coppi-colore.webp", true, [5.6, 5.2]),
      normalMap: textura("coppi-rilievo.webp", false, [5.6, 5.2]),
      color: notte ? "#6E6A78" : "#FFFFFF",
    });
    // le facce del box: +x, -x, sopra, sotto, +z, -z
    const tavole = tinta(legno);
    return [coppi, coppi, coppi, tavole, coppi, coppi];
  }, [notte, legno]);
  useEffect(() => () => tetto[0].dispose(), [tetto]);
  // le botti dell'olio nuovo, ai lati della tettoia: due a sinistra, una a destra
  const botti = useMemo(
    () =>
      [
        [-3.1, 0.9, 0.3],
        [-3.0, 0.05, 1.1],
        [3.15, 1.0, -0.6],
      ].map(([x, z, r]) =>
        new THREE.Matrix4().compose(
          new THREE.Vector3(fine.x + x, quota(fine.x + x, fine.z + z) - 0.02, fine.z + z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r),
          new THREE.Vector3(1.05, 1.05, 1.05)
        )
      ),
    [fine]
  );
  return (
    <>
      <Istanze nome="botte.glb" matrici={botti} notte={notte} />
      <group position={[fine.x, 0, fine.z]}>
        {/* la vasca */}
        <mesh position={[0, 0.35, 0]} material={tinta(pietra)}>
          <cylinderGeometry args={[1.6, 1.7, 0.7, 32]} />
        </mesh>
        <mesh position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 1.45, 32]} />
          <meshLambertMaterial color={notte ? "#3B3A2A" : "#7C6B3E"} />
        </mesh>
        {/* la macina: una ruota di pietra in piedi, girata attorno al perno centrale */}
        <group ref={macina} position={[0, 0.7, 0]}>
          <mesh position={[0, 0.2, 0]} material={tinta(legno)}>
            <cylinderGeometry args={[0.12, 0.12, 1.6, 10]} />
          </mesh>
          <mesh position={[0.75, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={tinta(pietra)}>
            <cylinderGeometry args={[0.55, 0.55, 0.35, 28]} />
          </mesh>
          <mesh position={[0.55, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={tinta(legno)}>
            <cylinderGeometry args={[0.05, 0.05, 1.3, 8]} />
          </mesh>
        </group>
        {/* la tettoia: quattro pali e un tetto di coppi */}
        {[[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.2], [2.4, 2.2]].map(([x, z], i) => (
          <mesh key={i} position={[x, 1.5, z]} material={tinta(legno)}>
            <boxGeometry args={[0.16, 3, 0.16]} />
          </mesh>
        ))}
        {/* il tetto: i coppi di Poly Haven, un metro per ripetizione, le file giù per la pendenza; sotto, le tavole */}
        <mesh position={[0, 3.1, 0]} rotation={[0.08, 0, 0]} material={tetto}>
          <boxGeometry args={[5.6, 0.14, 5.2]} />
        </mesh>
        {/* una lanterna, accesa di notte */}
        <mesh position={[2.4, 2.6, -2.3]}>
          <boxGeometry args={[0.18, 0.26, 0.18]} />
          <meshBasicMaterial color={notte ? "#FFD08A" : "#3A3A38"} />
        </mesh>
        {notte && <pointLight position={[2.2, 2.5, -2.6]} intensity={6} distance={9} color="#FFC27A" />}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ la raccolta */

/** A metà cammino: reti verdi stese sotto gli ulivi della prima fila, cassette piene impilate, una scala. */
function Raccolta({ notte }: { notte: boolean }) {
  const dati = useMemo(() => {
    const caso = generatore(31);
    const reti: { pos: THREE.Vector3; r: number }[] = [];
    const casse: THREE.Matrix4[] = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3();
    [0.39, 0.45, 0.51, 0.57, 0.62].forEach((p, i) => {
      const lato = i % 2 ? 1 : -1;
      sulCammino(p, v);
      destra(p, d);
      reti.push({ pos: v.clone().add(d.clone().multiplyScalar(lato * 4.6)), r: caso() * 0.6 });
      // le cassette: una pila di quattro o cinque accanto al cammino
      const base = v.clone().add(d.clone().multiplyScalar(lato * (2.9 + caso() * 0.4)));
      const n = 4 + Math.floor(caso() * 2);
      for (let k = 0; k < n; k++) {
        const pos = base.clone().add(new THREE.Vector3((k % 2) * 0.54, quota(base.x, base.z) + 0.15 + Math.floor(k / 2) * 0.255, (caso() - 0.5) * 0.06));
        casse.push(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (caso() - 0.5) * 0.12), new THREE.Vector3(1, 1, 1)));
      }
    });
    const scala = sulCammino(0.48).add(destra(0.48).multiplyScalar(4.4));
    // la cassetta di plastica (Poly Haven) ha la base a terra: la si abbassa al fondo della scatola di prima
    const giu = new THREE.Matrix4().makeTranslation(0, -0.13, 0);
    const cassette = casse.map((m) => m.clone().multiply(giu));
    // le reti adagiate sulla terra, con qualche piega: una griglia che ne segue le onde
    const teli = reti.map(({ pos, r }) => {
      const g = new THREE.PlaneGeometry(3.6, 2.6, 24, 18).rotateX(-Math.PI / 2).rotateY(r);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) + pos.x, z = p.getZ(i) + pos.z;
        const piega = 0.035 * Math.max(0, Math.sin(p.getX(i) * 3.1 + r * 5)) + 0.02 * Math.sin(p.getZ(i) * 4.3);
        p.setXYZ(i, x, quota(x, z) + 0.04 + piega, z);
      }
      // la maglia: un quadretto ogni 8 cm circa
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 22, uv.getY(i) * 16);
      g.computeVertexNormals();
      return g;
    });
    return { reti, teli, casse, cassette, scala };
  }, []);
  const maglia = useMemo(() => rete(), []);
  useEffect(() => () => dati.teli.forEach((g) => g.dispose()), [dati]);
  const olive = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    dati.casse.forEach((m, i) => {
      // il carico di olive, appena sotto il bordo
      const o = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.06, 0));
      olive.current?.setMatrixAt(i, o);
    });
    if (olive.current) olive.current.instanceMatrix.needsUpdate = true;
  }, [dati]);
  return (
    <>
      {dati.teli.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={2}>
          <meshLambertMaterial map={maglia} color={notte ? "#7A8A90" : "#FFFFFF"} transparent depthWrite={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
      ))}
      <Istanze nome="cassetta.glb" matrici={dati.cassette} notte={notte} />
      <instancedMesh ref={olive} args={[undefined, undefined, dati.casse.length]}>
        <boxGeometry args={[0.46, 0.16, 0.36]} />
        <meshLambertMaterial color="#2B2230" />
      </instancedMesh>
      {/* la scala appoggiata a un ulivo */}
      <group position={[dati.scala.x, 0, dati.scala.z]} rotation={[0.3, 0.4, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 1.3, 0]} material={tinta(notte ? "#5E5864" : "#9C7C55")}>
            <boxGeometry args={[0.05, 2.6, 0.05]} />
          </mesh>
        ))}
        {Array.from({ length: 8 }, (_, k) => (
          <mesh key={k} position={[0, 0.25 + k * 0.3, 0]} material={tinta(notte ? "#5E5864" : "#9C7C55")}>
            <boxGeometry args={[0.4, 0.035, 0.035]} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ i quadri */

/** La tela vuota, finché il video non c'è: oro chiaro sfumato, la scritta in basso. */
function telaVuota(testo: string, didascalia: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const g = x.createRadialGradient(170, 190, 20, 256, 320, 520);
  g.addColorStop(0, "#E8D9A8");
  g.addColorStop(1, "#2A2618");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 640);
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.font = "400 40px Georgia, serif";
  x.fillText(didascalia, 36, 540, 440);
  x.fillStyle = "rgba(255,255,255,0.6)";
  x.font = "500 20px ui-monospace, monospace";
  x.fillText(testo.toUpperCase(), 36, 590);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** La targhetta sotto il quadro: la didascalia in serif chiaro su fondo scuro. */
function targhetta(testo: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 96;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.fillStyle = "rgba(20,18,14,0.82)";
  x.fillRect(0, 0, 1024, 96);
  x.fillStyle = "#F3EEDF";
  x.font = "400 46px Georgia, serif";
  x.textBaseline = "middle";
  x.fillText(testo, 28, 50, 968);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function QuadroFraGliUlivi({
  quadro, posto: dove, indice, notte, vuoto, onApri,
}: { quadro: Quadro; posto: Posto; indice: number; notte: boolean; vuoto: string; onApri: (i: number) => void }) {
  const gruppo = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [aspetto, setAspetto] = useState(0.8);
  const [sopra, setSopra] = useState(false);
  const posto = dove.pos;
  const verso = dove.verso;
  // la tela: vuota, una foto, o il fotogramma del video finché il video non parte; poi il video
  const { textura, filmato, video } = useMemo(() => {
    const m = quadro.media;
    if (!m) return { textura: telaVuota(vuoto, quadro.didascalia), filmato: null, video: null };
    const immagine = m.tipo === "foto" ? m.src : m.poster;
    const t = immagine
      ? new THREE.TextureLoader().load(immagine, (tx) => {
          const im = tx.image as HTMLImageElement;
          setAspetto(im.width / im.height);
        })
      : telaVuota(vuoto, quadro.didascalia);
    t.colorSpace = THREE.SRGBColorSpace;
    if (m.tipo === "foto") return { textura: t, filmato: null, video: null };
    const v = document.createElement("video");
    v.src = m.src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    // si scarica solo quando ci si avvicina
    v.preload = "none";
    const f = new THREE.VideoTexture(v);
    f.colorSpace = THREE.SRGBColorSpace;
    return { textura: t, filmato: f, video: v };
  }, [quadro.media, quadro.didascalia, vuoto]);
  const [inMoto, setInMoto] = useState(false);
  const scritta = useMemo(() => (quadro.media ? targhetta(quadro.didascalia) : null), [quadro.media, quadro.didascalia]);
  useEffect(() => () => scritta?.dispose(), [scritta]);
  useEffect(() => {
    if (!video) return;
    const parte = () => setInMoto(true);
    video.addEventListener("playing", parte);
    return () => video.removeEventListener("playing", parte);
  }, [video]);
  useEffect(() => () => {
    textura.dispose();
    filmato?.dispose();
    video?.pause();
  }, [textura, filmato, video]);
  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
  }, [sopra]);

  // alto quanto il luogo consente; i video orizzontali al massimo larghi 2,8
  const alto = Math.min(dove.alto, 2.8 / aspetto);
  const largo = alto * aspetto;
  const Y = dove.y;
  const acceso = useRef(0);
  useFrame(({ camera }, dt) => {
    const g = gruppo.current;
    if (!g) return;
    const d = camera.position.distanceTo(posto);
    const vicino = d < 9 ? 1 : 0;
    acceso.current += (vicino - acceso.current) * Math.min(1, dt * 2.5);
    if (mat.current) mat.current.color.setScalar((notte ? 0.45 : 0.6) + (notte ? 0.35 : 0.4) * acceso.current);
    const k = 1 + acceso.current * 0.04 + (sopra ? 0.04 : 0);
    g.scale.setScalar(k);
    const v = video;
    if (v) {
      if (vicino && v.paused) v.play().catch(() => undefined);
      if (!vicino && !v.paused) v.pause();
    }
  });
  return (
    <group
      ref={(g) => {
        gruppo.current = g;
        if (g) {
          const y = quota(posto.x, posto.z);
          g.position.set(posto.x, y, posto.z);
          g.lookAt(verso.x, y, verso.z);
        }
      }}
    >
      {dove.sostegno === "pali" ? (
        // due pali di legno piantati in terra, e il quadro fra loro
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * (largo / 2 + 0.06), (Y + alto / 2 + 0.15) / 2, -0.02]} material={tinta(notte ? "#4A4248" : "#5E4630")}>
            <boxGeometry args={[0.06, Y + alto / 2 + 0.15, 0.06]} />
          </mesh>
        ))
      ) : (
        // il cavalletto: due gambe davanti, una dietro
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (largo / 2 - 0.05), Y / 2 + 0.1, 0.05]} rotation={[-0.12, 0, s * -0.08]} material={tinta(notte ? "#4A4248" : "#7A5C3C")}>
              <boxGeometry args={[0.04, Y + alto / 2 + 0.2, 0.04]} />
            </mesh>
          ))}
          <mesh position={[0, Y / 2 + 0.1, -0.28]} rotation={[0.35, 0, 0]} material={tinta(notte ? "#4A4248" : "#7A5C3C")}>
            <boxGeometry args={[0.04, Y + alto / 2 + 0.1, 0.04]} />
          </mesh>
        </group>
      )}
      <mesh position={[0, Y, -0.03]} material={tinta(notte ? "#1E1A16" : "#2E2620")}>
        <boxGeometry args={[largo + 0.08, alto + 0.08, 0.04]} />
      </mesh>
      <mesh
        position={[0, Y, 0]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setSopra(true);
        }}
        onPointerOut={() => setSopra(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (quadro.media) onApri(indice);
        }}
      >
        <planeGeometry args={[largo, alto]} />
        <meshBasicMaterial ref={mat} map={inMoto && filmato ? filmato : textura} toneMapped={false} fog={false} />
      </mesh>
      {scritta && (
        <mesh position={[0, Y - alto / 2 - 0.1, 0.01]}>
          <planeGeometry args={[Math.max(largo, 0.9), Math.max(largo, 0.9) * (96 / 1024)]} />
          <meshBasicMaterial map={scritta} transparent toneMapped={false} fog={false} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ le foto nel podere */

/*
 * Le foto che non stanno in bacheca: appese a un filo sopra la trazzera, appoggiate sul muretto,
 * posate sulle cassette del pranzo. Ognuna sta alla sua tappa: il filo qualche metro più avanti di
 * dove si legge, sopra il cammino; il muretto e le cassette dalla parte libera dal testo.
 */
function FotoNelPodere({ quadri, lati, notte, ridotto, onApri }: Props) {
  const N = lati.length;
  const fermo = (tappa: number) => (tappa / (N - 1)) * FINE_CAMERA;
  const libero = (tappa: number): 1 | -1 => (lati[tappa] === "sx" ? 1 : -1);
  const tutte = quadri.map((q, i) => ({ q, i }));
  const perTappa = (forma: Forma) => {
    const gruppi = new Map<number, { q: Quadro; i: number }[]>();
    tutte.filter(({ q }) => q.forma === forma).forEach((x) => gruppi.set(x.q.tappa, [...(gruppi.get(x.q.tappa) ?? []), x]));
    return [...gruppi.entries()];
  };
  return (
    <>
      {perTappa("filo").map(([t, foto]) => (
        <Filo key={`filo-${t}`} foto={foto} p={fermo(t) + 0.1} notte={notte} ridotto={ridotto} onApri={onApri} />
      ))}
      {perTappa("muretto").map(([t, foto]) =>
        foto.map(({ q, i }, k) => <SulMuretto key={`muretto-${i}`} quadro={q} indice={i} p={fermo(t) + 0.05 + k * 0.012} lato={libero(t)} notte={notte} onApri={onApri} />)
      )}
      {perTappa("cassette").map(([t, foto]) => (
        <Pranzo key={`pranzo-${t}`} foto={foto} p={fermo(t) + 0.065} lato={libero(t)} notte={notte} onApri={onApri} />
      ))}
    </>
  );
}

/**
 * Una foto stampata, col bordo bianco della carta. Si scarica quando ci si avvicina (a una trentina di
 * metri), come i video; finché non c'è, resta la carta. L'origine è al centro della foto.
 */
function Foto({ quadro, indice, alto, notte, onApri }: { quadro: Quadro; indice: number; alto: number; notte: boolean; onApri: (i: number) => void }) {
  const gruppo = useRef<THREE.Group>(null);
  const qui = useRef(new THREE.Vector3());
  const chiesta = useRef(false);
  const [immagine, setImmagine] = useState<{ t: THREE.Texture; aspetto: number } | null>(null);
  const [sopra, setSopra] = useState(false);
  useFrame(({ camera }) => {
    const g = gruppo.current;
    const m = quadro.media;
    if (chiesta.current || !g || !m) return;
    g.getWorldPosition(qui.current);
    if (camera.position.distanceTo(qui.current) > 30) return;
    chiesta.current = true;
    const src = m.tipo === "foto" ? m.src : m.poster;
    if (!src) return;
    new THREE.TextureLoader().load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      const im = t.image as HTMLImageElement;
      setImmagine({ t, aspetto: im.width / im.height });
    });
  });
  useEffect(() => () => immagine?.t.dispose(), [immagine]);
  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
  }, [sopra]);
  const largo = alto * (immagine?.aspetto ?? 1.33);
  const luce = notte ? (sopra ? 0.85 : 0.68) : sopra ? 1 : 0.92;
  return (
    <group ref={gruppo}>
      {/* la carta, col margine bianco */}
      <mesh position={[0, 0, -0.004]}>
        <planeGeometry args={[largo + 0.05, alto + 0.05]} />
        <meshBasicMaterial color={notte ? "#8E8A84" : "#EFE9DC"} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setSopra(true);
        }}
        onPointerOut={() => setSopra(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (quadro.media) onApri(indice);
        }}
      >
        <planeGeometry args={[largo, alto]} />
        {/* un materiale nuovo quando la foto arriva: con la mappa lo shader è un altro */}
        <meshBasicMaterial key={immagine ? "foto" : "carta"} map={immagine?.t ?? null} color={immagine ? new THREE.Color(luce, luce, luce) : "#D8D2C4"} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

/**
 * Il filo teso sopra la trazzera fra due pali, con le foto appese alle mollette come i panni stesi;
 * dondolano appena al vento. Guarda chi arriva: lo si vede dalla tappa prima, ci si passa sotto.
 */
function Filo({ foto, p, notte, ridotto, onApri }: { foto: { q: Quadro; i: number }[]; p: number; notte: boolean; ridotto: boolean; onApri: (i: number) => void }) {
  // mezza campata, altezza dei pali, quanto il filo si flette in mezzo, altezza delle foto
  const L = 2.5, Y = 3.6, FRECCIA = 0.2, ALTO = 0.68;
  const { posto, verso, curva, tubo } = useMemo(() => {
    const posto = sulCammino(p);
    const verso = sulCammino(Math.max(0, p - 0.05));
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-L, Y, 0), new THREE.Vector3(0, Y - 2 * FRECCIA, 0), new THREE.Vector3(L, Y, 0));
    return { posto, verso, curva, tubo: new THREE.TubeGeometry(curva, 24, 0.007, 4) };
  }, [p]);
  useEffect(() => () => tubo.dispose(), [tubo]);
  const appese = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (ridotto) return;
    const t = clock.elapsedTime;
    appese.current.forEach((g, k) => {
      if (g) g.rotation.x = Math.sin(t * 1.1 + k * 1.7) * 0.07 + Math.sin(t * 2.3 + k) * 0.02;
    });
  });
  const legno = tinta(notte ? "#4A4248" : "#6B4A2E");
  const molletta = tinta(notte ? "#6A6470" : "#C9A97A");
  const y0 = quota(posto.x, posto.z);
  return (
    <group
      ref={(g) => {
        if (g) {
          g.position.set(posto.x, y0, posto.z);
          g.lookAt(verso.x, y0, verso.z);
        }
      }}
    >
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * L, Y / 2 + 0.02, 0]} material={legno}>
          <boxGeometry args={[0.08, Y + 0.04, 0.08]} />
        </mesh>
      ))}
      <mesh geometry={tubo}>
        <meshBasicMaterial color={notte ? "#5A5660" : "#D9D2C2"} />
      </mesh>
      {foto.map(({ q, i }, k) => {
        const punto = curva.getPoint((k + 1) / (foto.length + 1));
        return (
          <group
            key={i}
            position={[punto.x, punto.y - 0.01, 0]}
            ref={(g) => {
              appese.current[k] = g;
            }}
          >
            {[-0.22, 0.22].map((dx) => (
              <mesh key={dx} position={[dx, -0.02, 0.01]} material={molletta}>
                <boxGeometry args={[0.025, 0.07, 0.02]} />
              </mesh>
            ))}
            <group position={[0, -ALTO / 2 - 0.03, 0]}>
              <Foto quadro={q} indice={i} alto={ALTO} notte={notte} onApri={onApri} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Una stampa piccola appoggiata sul colmo del muretto, un poco inclinata indietro, rivolta a chi arriva. */
function SulMuretto({ quadro, indice, p, lato, notte, onApri }: { quadro: Quadro; indice: number; p: number; lato: 1 | -1; notte: boolean; onApri: (i: number) => void }) {
  const ALTO = 0.52;
  const { posto, verso } = useMemo(() => {
    const posto = sulCammino(p).add(destra(p).multiplyScalar(MURETTO.distanza * lato));
    // guarda indietro lungo la trazzera, verso il centro: la si vede arrivando
    return { posto, verso: sulCammino(Math.max(0, p - 0.06)) };
  }, [p, lato]);
  const y0 = quota(posto.x, posto.z) + MURETTO.alto;
  return (
    <group
      ref={(g) => {
        if (g) {
          g.position.set(posto.x, y0, posto.z);
          g.lookAt(verso.x, y0, verso.z);
        }
      }}
    >
      <group rotation={[-0.22, 0, 0]}>
        <group position={[0, ALTO / 2 + 0.03, 0]}>
          <Foto quadro={quadro} indice={indice} alto={ALTO} notte={notte} onApri={onApri} />
        </group>
      </group>
    </group>
  );
}

/**
 * Il pranzo in campagna, come nella foto: una cassetta nera fa da tavola, le altre da sedili, una bianca
 * vuota davanti. La foto è posata sulla tavola, appoggiata all'indietro.
 */
function Pranzo({ foto, p, lato, notte, onApri }: { foto: { q: Quadro; i: number }[]; p: number; lato: 1 | -1; notte: boolean; onApri: (i: number) => void }) {
  const { base, giro, matrici } = useMemo(() => {
    const base = sulCammino(p).add(destra(p).multiplyScalar(2.4 * lato));
    // la tavola guarda la trazzera, un poco indietro: chi arriva la vede di fronte
    const verso = sulCammino(Math.max(0, p - 0.05)).sub(base).setY(0).normalize();
    const giro = Math.atan2(verso.x, verso.z);
    const su = new THREE.Vector3(0, 1, 0);
    const matrici = (
      [
        [0, 0, 0, 0],
        [0.72, 0.08, 0.35, 0],
        [-0.74, 0.02, -0.25, 0],
        [0.15, 0.9, 0.55, 0],
        [-0.95, 0.75, -0.7, 0],
        [0.72, 0.08, 0.35, 1],
      ] as [number, number, number, number][]
    ).map(([x, z, r, piano]) => {
      const q = new THREE.Quaternion().setFromAxisAngle(su, giro + r);
      const pos = new THREE.Vector3(x, 0, z).applyAxisAngle(su, giro).add(base);
      pos.y = quota(pos.x, pos.z) - 0.01 + piano * 0.255;
      return new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
    });
    return { base, giro, matrici };
  }, [p, lato]);
  // nera la tavola, rossa e blu i sedili (la rossa doppia, più alta), bianca e verde a terra
  const colori = useMemo(() => ["#2A2A2E", "#C8443A", "#2F5E8C", "#EDEDE6", "#4E8A4A", "#C8443A"], []);
  const y0 = quota(base.x, base.z);
  return (
    <>
      <Istanze nome="cassetta.glb" matrici={matrici} notte={notte} colori={colori} />
      <group position={[base.x, y0, base.z]} rotation={[0, giro, 0]}>
        {foto.map(({ q, i }, k) => (
          <group key={i} position={[k * 0.1 - (foto.length - 1) * 0.05, 0.255, -0.08]} rotation={[-0.28, 0, 0]}>
            <group position={[0, 0.23, 0]}>
              <Foto quadro={q} indice={i} alto={0.42} notte={notte} onApri={onApri} />
            </group>
          </group>
        ))}
      </group>
    </>
  );
}
