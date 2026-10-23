"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { accesaDaSotto, costruisciUlivo } from "./ospiti/ulivo";
import { alone, generatore } from "./ospiti/comuni";
import type { Luogo, Media } from "@/content/olio";

/*
 * L'uliveto della pagina dell'olio: una trazzera fra muretti a secco e ulivi, al tramonto (tema chiaro)
 * o di notte coi faretti sotto gli alberi (tema scuro). Chi scorre la pagina cammina lungo la trazzera.
 * Il cammino passa per tre luoghi: l'uliveto, la raccolta (reti stese, cassette, una scala), il frantoio
 * con la macina che gira. I quadri, video e foto, stanno nel luogo del loro contenuto: appesi fra gli alberi,
 * su cavalletti accanto alle cassette, in cerchio attorno alla macina. Si accendono quando ci si passa
 * davanti e si aprono a tutto schermo con un clic.
 */

export type Quadro = { media: Media; luogo: Luogo; didascalia: string };
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

/** I tratti del cammino (in parametro della curva) dei primi due luoghi. */
const TRATTI: Record<"alberi" | "raccolta", [number, number]> = { alberi: [0.05, 0.33], raccolta: [0.37, 0.62] };

/**
 * Dispone i quadri: in ogni luogo si distribuiscono lungo il suo tratto alternando i lati;
 * al frantoio in arco attorno alla macina, rivolti verso chi arriva.
 */
function disponi(quadri: Quadro[], stretto: boolean): Posto[] {
  const conta: Record<Luogo, number> = { alberi: 0, raccolta: 0, frantoio: 0 };
  const totale: Record<Luogo, number> = { alberi: 0, raccolta: 0, frantoio: 0 };
  quadri.forEach((q) => totale[q.luogo]++);
  const fine = sulCammino(1), avanti = CAMMINO.getTangentAt(1).setY(0).normalize(), lato = destra(1);
  const arrivo = sulCammino(FINE_CAMERA);
  return quadri.map((q) => {
    const k = conta[q.luogo]++;
    const n = totale[q.luogo];
    if (q.luogo === "frantoio") {
      // in arco dietro la macina, da sinistra a destra
      const a = n === 1 ? 0 : -1.15 + (2.3 * k) / (n - 1);
      const pos = fine.clone().add(avanti.clone().multiplyScalar(Math.cos(a) * 3.1)).add(lato.clone().multiplyScalar(Math.sin(a) * 3.4));
      return { pos, verso: arrivo.clone(), y: 1.6, alto: 1.15, sostegno: "pali" };
    }
    const [p0, p1] = TRATTI[q.luogo];
    const p = p0 + ((k + 0.5) / n) * (p1 - p0);
    const parte = k % 2 ? -1 : 1;
    const dist = q.luogo === "alberi" ? (stretto ? 1.6 : 2.4) : stretto ? 1.4 : 1.9;
    const pos = sulCammino(p).add(destra(p).multiplyScalar(parte * dist));
    // guarda il cammino un poco indietro: lo si vede venendo avanti
    const verso = sulCammino(Math.max(0, p - 0.05));
    return q.luogo === "alberi"
      ? { pos, verso, y: 1.75, alto: 1.25, sostegno: "pali" }
      : { pos, verso, y: 1.0, alto: 0.85, sostegno: "cavalletto" };
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
      {disponi(props.quadri, props.stretto).map((posto, i) => (
        <QuadroFraGliUlivi key={i} quadro={props.quadri[i]} posto={posto} indice={i} notte={props.notte} vuoto={props.vuoto} onApri={props.onApri} />
      ))}
      {props.notte && !props.ridotto && <Lucciole />}
      <Passo progresso={props.progresso} ridotto={props.ridotto} onPronta={props.onPronta} />
    </Canvas>
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
const CIELO_F = `
uniform vec3 uBasso; uniform vec3 uAlto; uniform vec3 uSole; uniform vec3 uDirSole; uniform float uNotte;
varying vec3 vD;
void main(){
  float h = clamp(vD.y * 1.8 + 0.08, 0.0, 1.0);
  vec3 c = mix(uBasso, uAlto, pow(h, 0.7));
  float s = max(dot(normalize(vD), normalize(uDirSole)), 0.0);
  c += uSole * (pow(s, 600.0) * 1.4 + pow(s, 12.0) * 0.35) * (1.0 - uNotte);
  c += vec3(0.85, 0.88, 0.95) * pow(s, 900.0) * uNotte;
  gl_FragColor = vec4(c, 1.0);
}`;

function Cielo({ notte }: { notte: boolean }) {
  // il tramonto: orizzonte d'oro, cielo che sale all'azzurro; la notte: blu profondo, la luna al posto del sole
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
        },
      }),
    [notte]
  );
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
  const cielo = useRef<THREE.Mesh>(null);
  const stelleRif = useRef<THREE.Points>(null);
  useFrame(({ camera }) => {
    // il cielo segue chi cammina
    cielo.current?.position.copy(camera.position);
    stelleRif.current?.position.copy(camera.position);
  });
  return (
    <>
      <mesh ref={cielo} material={mat} renderOrder={-10}>
        <sphereGeometry args={[120, 32, 16]} />
      </mesh>
      {notte && (
        <points ref={stelleRif} geometry={stelle}>
          <pointsMaterial color="#E8ECF5" size={0.35} sizeAttenuation transparent opacity={0.8} fog={false} depthWrite={false} />
        </points>
      )}
      <fog attach="fog" args={[notte ? "#141A2A" : "#E9C08C", notte ? 10 : 14, notte ? 52 : 70]} />
      <hemisphereLight args={[notte ? "#5A6890" : "#FFE2B8", notte ? "#2A221C" : "#7A5236", notte ? 0.9 : 1.1]} />
      <directionalLight position={notte ? [-8, 14, -20] : [10, 6, -40]} intensity={notte ? 0.7 : 1.6} color={notte ? "#AFC0E8" : "#FFC98A"} />
    </>
  );
}

/* ------------------------------------------------------------------ la terra */

function Terra({ notte }: { notte: boolean }) {
  const [suolo, strada, pietre] = useMemo(() => {
    const caso = generatore(7);
    // la terra rossa, mossa appena, coi colori variati
    const g = new THREE.PlaneGeometry(120, 160, 60, 80).rotateX(-Math.PI / 2).translate(0, 0, -40);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const a = new THREE.Color("#8A6048"), b = new THREE.Color("#A4876A"), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, quota(x, z));
      c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(x * 0.7 + z * 1.1) * Math.sin(z * 0.3));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    // la trazzera: una striscia chiara che segue il cammino
    const n = 400;
    const sp: number[] = [];
    const idx: number[] = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      sulCammino(p, v);
      destra(p, d);
      // la trazzera segue la terra, appena sopra: altrimenti le onde del suolo la bucano
      const ax = v.x - d.x * 0.75, az = v.z - d.z * 0.75, bx = v.x + d.x * 0.75, bz = v.z + d.z * 0.75;
      sp.push(ax, quota(ax, az) + 0.06, az, bx, quota(bx, bz) + 0.06, bz);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const s = new THREE.BufferGeometry();
    s.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    s.setIndex(idx);
    s.computeVertexNormals();
    // i muretti a secco ai due lati: pietre in fila, due corsi
    const m: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < 1000; i++) {
      const p = (i % 500) / 500;
      const lato = i < 500 ? -1 : 1;
      sulCammino(p, v);
      destra(p, d);
      for (let corso = 0; corso < 2; corso++) {
        const k = 1.05 + caso() * 0.08;
        e.set(caso() * 3, caso() * 3, caso() * 3);
        q.setFromEuler(e);
        sc.set(1.2 + caso() * 0.6, 0.7 + caso() * 0.3, 1 + caso() * 0.4).multiplyScalar(0.085);
        const px = v.x + d.x * k * lato, pz = v.z + d.z * k * lato;
        m.push(new THREE.Matrix4().compose(new THREE.Vector3(px, quota(px, pz) + 0.07 + corso * 0.11, pz), q, sc));
      }
    }
    return [g, s, m];
  }, []);
  const muretti = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const im = muretti.current;
    if (!im) return;
    pietre.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
  }, [pietre]);
  return (
    <>
      <mesh geometry={suolo}>
        <meshLambertMaterial vertexColors color={notte ? "#8A8A9A" : "#FFFFFF"} />
      </mesh>
      <mesh geometry={strada}>
        <meshLambertMaterial color={notte ? "#9A948C" : "#D9C49A"} />
      </mesh>
      <instancedMesh ref={muretti} args={[undefined, undefined, pietre.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color={notte ? "#6A6872" : "#D8CCB2"} flatShading />
      </instancedMesh>
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
                <instancedMesh ref={metti(0)} args={[v.legnoGeo, undefined, n]}>
                  <meshLambertMaterial color="#7A6E60" flatShading />
                </instancedMesh>
                <instancedMesh ref={metti(1)} args={[v.frondeGeo, undefined, n]}>
                  <meshLambertMaterial color="#93A07A" flatShading />
                </instancedMesh>
                <instancedMesh ref={metti(2)} args={[v.frondeGeo, undefined, n]} scale={[1, 1, 1]}>
                  <meshLambertMaterial color="#D2D6C2" flatShading transparent opacity={0.4} />
                </instancedMesh>
              </>
            )}
            {notte && (
              <>
                <instancedMesh ref={metti(3)} args={[v.legnoNotte, undefined, n]}>
                  <meshBasicMaterial vertexColors />
                </instancedMesh>
                <instancedMesh ref={metti(4)} args={[v.frondeNotte, undefined, n]}>
                  <meshBasicMaterial vertexColors />
                </instancedMesh>
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

/* ------------------------------------------------------------------ il frantoio */

/** In fondo al cammino: il frantoio a cielo aperto, la vasca di pietra con la macina che gira, una tettoia. */
function Frantoio({ notte, ridotto }: { notte: boolean; ridotto: boolean }) {
  const macina = useRef<THREE.Group>(null);
  const fine = useMemo(() => sulCammino(1), []);
  useFrame((_, dt) => {
    if (!ridotto && macina.current) macina.current.rotation.y += dt * 0.35;
  });
  const pietra = notte ? "#77746F" : "#CFC3AA";
  const legno = notte ? "#4A3A2C" : "#6B4A2E";
  return (
    <group position={[fine.x, 0, fine.z]}>
      {/* la vasca */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.6, 1.7, 0.7, 32]} />
        <meshLambertMaterial color={pietra} />
      </mesh>
      <mesh position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 1.45, 32]} />
        <meshLambertMaterial color={notte ? "#3B3A2A" : "#7C6B3E"} />
      </mesh>
      {/* la macina: una ruota di pietra in piedi, girata attorno al perno centrale */}
      <group ref={macina} position={[0, 0.7, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.6, 10]} />
          <meshLambertMaterial color={legno} />
        </mesh>
        <mesh position={[0.75, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.35, 28]} />
          <meshLambertMaterial color={pietra} />
        </mesh>
        <mesh position={[0.55, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 1.3, 8]} />
          <meshLambertMaterial color={legno} />
        </mesh>
      </group>
      {/* la tettoia: quattro pali e un tetto di coppi */}
      {[[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.2], [2.4, 2.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.5, z]}>
          <boxGeometry args={[0.16, 3, 0.16]} />
          <meshLambertMaterial color={legno} />
        </mesh>
      ))}
      <mesh position={[0, 3.1, 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[5.6, 0.14, 5.2]} />
        <meshLambertMaterial color={notte ? "#5A3426" : "#A8553A"} />
      </mesh>
      {/* una lanterna, accesa di notte */}
      <mesh position={[2.4, 2.6, -2.3]}>
        <boxGeometry args={[0.18, 0.26, 0.18]} />
        <meshBasicMaterial color={notte ? "#FFD08A" : "#3A3A38"} />
      </mesh>
      {notte && <pointLight position={[2.2, 2.5, -2.6]} intensity={6} distance={9} color="#FFC27A" />}
    </group>
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
        const pos = base.clone().add(new THREE.Vector3((k % 2) * 0.48, quota(base.x, base.z) + 0.15 + Math.floor(k / 2) * 0.27, (caso() - 0.5) * 0.06));
        casse.push(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (caso() - 0.5) * 0.3), new THREE.Vector3(1, 1, 1)));
      }
    });
    const scala = sulCammino(0.48).add(destra(0.48).multiplyScalar(4.4));
    return { reti, casse, scala };
  }, []);
  const casse = useRef<THREE.InstancedMesh>(null);
  const olive = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    dati.casse.forEach((m, i) => {
      casse.current?.setMatrixAt(i, m);
      // il carico di olive, appena sotto il bordo
      const o = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.06, 0));
      olive.current?.setMatrixAt(i, o);
    });
    if (casse.current) casse.current.instanceMatrix.needsUpdate = true;
    if (olive.current) olive.current.instanceMatrix.needsUpdate = true;
  }, [dati]);
  return (
    <>
      {dati.reti.map((r, i) => (
        <mesh key={i} position={[r.pos.x, quota(r.pos.x, r.pos.z) + 0.12, r.pos.z]} rotation={[-Math.PI / 2, 0, r.r]}>
          <planeGeometry args={[3.6, 2.6]} />
          <meshLambertMaterial color={notte ? "#24402C" : "#3E7A4C"} transparent opacity={0.92} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <instancedMesh ref={casse} args={[undefined, undefined, dati.casse.length]}>
        <boxGeometry args={[0.46, 0.26, 0.34]} />
        <meshLambertMaterial color={notte ? "#5A4630" : "#B88A55"} />
      </instancedMesh>
      <instancedMesh ref={olive} args={[undefined, undefined, dati.casse.length]}>
        <boxGeometry args={[0.42, 0.16, 0.3]} />
        <meshLambertMaterial color="#2B2230" />
      </instancedMesh>
      {/* la scala appoggiata a un ulivo */}
      <group position={[dati.scala.x, 0, dati.scala.z]} rotation={[0.3, 0.4, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 1.3, 0]}>
            <boxGeometry args={[0.05, 2.6, 0.05]} />
            <meshLambertMaterial color={notte ? "#4A3A2A" : "#9C7C55"} />
          </mesh>
        ))}
        {Array.from({ length: 8 }, (_, k) => (
          <mesh key={k} position={[0, 0.25 + k * 0.3, 0]}>
            <boxGeometry args={[0.4, 0.035, 0.035]} />
            <meshLambertMaterial color={notte ? "#4A3A2A" : "#9C7C55"} />
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

  // alto quanto il luogo consente, largo al massimo una volta e mezza tanto
  const alto = Math.min(dove.alto, (dove.alto * 1.5) / aspetto);
  const largo = alto * aspetto;
  const Y = dove.y;
  const acceso = useRef(0);
  useFrame(({ camera }, dt) => {
    const g = gruppo.current;
    if (!g) return;
    const d = camera.position.distanceTo(posto);
    const vicino = d < 6.5 ? 1 : 0;
    acceso.current += (vicino - acceso.current) * Math.min(1, dt * 2.5);
    if (mat.current) mat.current.color.setScalar((notte ? 0.22 : 0.35) + (notte ? 0.5 : 0.65) * acceso.current);
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
          <mesh key={s} position={[s * (largo / 2 + 0.06), (Y + alto / 2 + 0.15) / 2, -0.02]}>
            <boxGeometry args={[0.06, Y + alto / 2 + 0.15, 0.06]} />
            <meshLambertMaterial color={notte ? "#3E3226" : "#5E4630"} />
          </mesh>
        ))
      ) : (
        // il cavalletto: due gambe davanti, una dietro
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (largo / 2 - 0.05), Y / 2 + 0.1, 0.05]} rotation={[-0.12, 0, s * -0.08]}>
              <boxGeometry args={[0.04, Y + alto / 2 + 0.2, 0.04]} />
              <meshLambertMaterial color={notte ? "#3E3226" : "#7A5C3C"} />
            </mesh>
          ))}
          <mesh position={[0, Y / 2 + 0.1, -0.28]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.04, Y + alto / 2 + 0.1, 0.04]} />
            <meshLambertMaterial color={notte ? "#3E3226" : "#7A5C3C"} />
          </mesh>
        </group>
      )}
      <mesh position={[0, Y, -0.03]}>
        <boxGeometry args={[largo + 0.08, alto + 0.08, 0.04]} />
        <meshLambertMaterial color={notte ? "#1E1A16" : "#2E2620"} />
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
