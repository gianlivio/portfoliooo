"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { accesaDaSotto, costruisciUlivo } from "./ospiti/ulivo";
import { alone, generatore } from "./ospiti/comuni";
import type { Media } from "@/content/olio";

/*
 * L'uliveto della pagina dell'olio: una trazzera fra muretti a secco e ulivi, al tramonto (tema chiaro)
 * o di notte coi faretti sotto gli alberi (tema scuro). Chi scorre la pagina cammina lungo la trazzera.
 * Fra gli alberi, accanto al cammino, i quadri: video e foto che si accendono quando ci si passa davanti
 * e che si aprono a tutto schermo con un clic. In fondo il frantoio, con la macina che gira.
 */

export type Quadro = { media: Media; p: number; lato: 1 | -1; didascalia: string };

type Props = {
  quadri: Quadro[];
  /** quanto si è camminato, 0–1: lo scrive la pagina mentre scorre */
  progresso: React.MutableRefObject<number>;
  notte: boolean;
  ridotto: boolean;
  stretto: boolean;
  vuoto: string;
  onApri: (i: number) => void;
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

/** Un punto del cammino e la direzione "a destra" lì. */
function sulCammino(p: number, out = new THREE.Vector3()) {
  return CAMMINO.getPointAt(THREE.MathUtils.clamp(p, 0, 1), out);
}
function destra(p: number, out = new THREE.Vector3()) {
  const t = CAMMINO.getTangentAt(THREE.MathUtils.clamp(p, 0, 1));
  return out.set(-t.z, 0, t.x).normalize();
}

/** Dove sta il quadro di una tappa: poco più avanti della camera, di lato. */
export function postoQuadro(q: Quadro, stretto: boolean) {
  const pc = q.p * FINE_CAMERA + 0.055;
  const pos = sulCammino(pc).add(destra(pc).multiplyScalar(q.lato * (stretto ? 0.95 : 1.35)));
  return pos;
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
      {props.quadri.map((q, i) => (
        <QuadroFraGliUlivi key={i} quadro={q} indice={i} stretto={props.stretto} notte={props.notte} vuoto={props.vuoto} onApri={props.onApri} />
      ))}
      {props.notte && !props.ridotto && <Lucciole />}
      <Passo progresso={props.progresso} ridotto={props.ridotto} />
    </Canvas>
  );
}

/* ------------------------------------------------------------------ il passo */

/** La camera segue lo scorrimento, morbida; dondola appena, come chi cammina. */
function Passo({ progresso, ridotto }: { progresso: React.MutableRefObject<number>; ridotto: boolean }) {
  const p = useRef(progresso.current);
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
      pos.setY(i, 0.12 * Math.sin(x * 0.4 + z * 0.3) + 0.08 * Math.sin(x * 1.3 - z * 0.7) - 0.05);
      c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(x * 0.7 + z * 1.1) * Math.sin(z * 0.3));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    // la trazzera: una striscia chiara che segue il cammino
    const n = 200;
    const sp: number[] = [];
    const idx: number[] = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      sulCammino(p, v);
      destra(p, d);
      sp.push(v.x - d.x * 0.75, 0.09, v.z - d.z * 0.75, v.x + d.x * 0.75, 0.09, v.z + d.z * 0.75);
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
        m.push(new THREE.Matrix4().compose(new THREE.Vector3(v.x + d.x * k * lato, 0.1 + corso * 0.11, v.z + d.z * k * lato), q, sc));
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

function QuadroFraGliUlivi({
  quadro, indice, stretto, notte, vuoto, onApri,
}: { quadro: Quadro; indice: number; stretto: boolean; notte: boolean; vuoto: string; onApri: (i: number) => void }) {
  const gruppo = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [aspetto, setAspetto] = useState(0.8);
  const [sopra, setSopra] = useState(false);
  const posto = useMemo(() => postoQuadro(quadro, stretto), [quadro, stretto]);
  // il quadro guarda il punto del cammino da cui lo si vede meglio
  const verso = useMemo(() => sulCammino(quadro.p * FINE_CAMERA), [quadro.p]);
  const { textura, video } = useMemo(() => {
    const m = quadro.media;
    if (!m) return { textura: telaVuota(vuoto, quadro.didascalia), video: null };
    if (m.tipo === "foto") {
      const t = new THREE.TextureLoader().load(m.src, (tx) => {
        const im = tx.image as HTMLImageElement;
        setAspetto(im.width / im.height);
      });
      t.colorSpace = THREE.SRGBColorSpace;
      return { textura: t, video: null };
    }
    const v = document.createElement("video");
    v.src = m.src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.crossOrigin = "anonymous";
    v.addEventListener("loadedmetadata", () => setAspetto(v.videoWidth / v.videoHeight || 0.8));
    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    return { textura: t, video: v };
  }, [quadro.media, quadro.didascalia, vuoto]);
  useEffect(() => () => {
    textura.dispose();
    video?.pause();
  }, [textura, video]);
  useEffect(() => {
    document.body.style.cursor = sopra ? "pointer" : "";
  }, [sopra]);

  // alto 1,2 al massimo, largo 1,6 al massimo
  const alto = Math.min(1.2, 1.6 / aspetto);
  const largo = alto * aspetto;
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
          g.position.set(posto.x, 0, posto.z);
          g.lookAt(verso.x, 0, verso.z);
        }
      }}
    >
      {/* due pali di legno piantati in terra, e il quadro fra loro */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (largo / 2 + 0.06), 1.05, -0.02]}>
          <boxGeometry args={[0.06, 2.1, 0.06]} />
          <meshLambertMaterial color={notte ? "#3E3226" : "#5E4630"} />
        </mesh>
      ))}
      <mesh position={[0, 1.35, -0.03]}>
        <boxGeometry args={[largo + 0.08, alto + 0.08, 0.04]} />
        <meshLambertMaterial color={notte ? "#1E1A16" : "#2E2620"} />
      </mesh>
      <mesh
        position={[0, 1.35, 0]}
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
        <meshBasicMaterial ref={mat} map={textura} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
