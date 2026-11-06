import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Attrezzi comuni della scena. Le texture e i modelli in public/scena vengono da Poly Haven (CC0),
 * gli stessi del portfolio: stone_wall, clay_roof_tiles_02, red_laterite_soil_stones, dirt_floor,
 * bark_willow_02, qwantani_sunset_puresky, plastic_crate_02, wine_barrel_01, namaqualand_boulder_05,
 * grass_medium_02.
 */

const CARTELLA = "/olio/scena/";
const cache = new Map<string, THREE.Texture>();

/** Una texture che si ripete; colore = true per le immagini a colori. */
export function textura(nome: string, colore: boolean, ripeti: [number, number] = [1, 1]) {
  const chiave = `${nome}|${ripeti.join("x")}`;
  let t = cache.get(chiave);
  if (!t) {
    // una texture per ogni ripetizione; il file lo scarica una volta sola la cache del browser
    t = new THREE.TextureLoader().load(CARTELLA + nome);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (colore) t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(ripeti[0], ripeti[1]);
    cache.set(chiave, t);
  }
  return t;
}

/** Generatore pseudocasuale con seme: la stessa forma a ogni montaggio. */
export function generatore(seme: number) {
  let s = seme;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Le coordinate di texture di un BoxGeometry in metri: ogni faccia ripete la texture una volta ogni `passo` metri,
 * così la pietra ha la stessa grana su muri lunghi e corti.
 */
export function scatola(l: number, a: number, p: number, passo = 2) {
  const g = new THREE.BoxGeometry(l, a, p);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // ordine delle facce: +x, -x, +y, -y, +z, -z; 4 vertici ciascuna
  const misure: [number, number][] = [[p, a], [p, a], [l, p], [l, p], [l, a], [l, a]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * misure[f][0]) / passo, (uv.getY(i) * misure[f][1]) / passo);
    }
  }
  return g;
}

/** Testo su tela, come texture. */
export function scritta(
  testo: string,
  { larghezza = 1024, altezza = 160, font = "300 92px Newsreader, Georgia, serif", colore = "#F3F1EB", fondo = "rgba(0,0,0,0)", bordo }: {
    larghezza?: number; altezza?: number; font?: string; colore?: string; fondo?: string; bordo?: string;
  } = {}
) {
  const c = document.createElement("canvas");
  c.width = larghezza;
  c.height = altezza;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.fillStyle = fondo;
  x.fillRect(0, 0, larghezza, altezza);
  if (bordo) {
    x.strokeStyle = bordo;
    x.lineWidth = 6;
    x.strokeRect(10, 10, larghezza - 20, altezza - 20);
  }
  x.font = font;
  x.fillStyle = colore;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(testo, larghezza / 2, altezza / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Un'etichetta a pillola (per i segnaposti e i nomi), disegnata su tela. */
export function pillola(testo: string, sotto?: string) {
  const c = document.createElement("canvas");
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const f1 = "500 44px 'IBM Plex Sans', system-ui, sans-serif";
  const f2 = "400 26px 'IBM Plex Mono', ui-monospace, monospace";
  x.font = f1;
  let w = x.measureText(testo).width;
  if (sotto) {
    x.font = f2;
    w = Math.max(w, x.measureText(sotto.toUpperCase()).width);
  }
  c.width = Math.ceil(w + 80);
  c.height = sotto ? 128 : 84;
  const y = c.getContext("2d") as CanvasRenderingContext2D;
  y.fillStyle = "rgba(12,13,10,0.72)";
  const r = 40;
  y.beginPath();
  y.roundRect(2, 2, c.width - 4, c.height - 4, r);
  y.fill();
  y.strokeStyle = "rgba(217,194,106,0.55)";
  y.lineWidth = 2;
  y.stroke();
  y.textAlign = "center";
  y.fillStyle = "#F3F1EB";
  y.font = f1;
  y.textBaseline = "middle";
  y.fillText(testo, c.width / 2, sotto ? 46 : c.height / 2 + 2);
  if (sotto) {
    y.font = f2;
    y.fillStyle = "#D9C26A";
    y.fillText(sotto.toUpperCase(), c.width / 2, 92);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, rapporto: c.width / c.height };
}

/* ------------------------------------------------------------------ modelli glb */

const modelli = new Map<string, Promise<{ geometria: THREE.BufferGeometry; materiale: THREE.Material }>>();

/** Tutti i mesh di un glb fusi in una geometria, portata all'altezza voluta e appoggiata a y = 0. */
export function modello(nome: string, altezza: number) {
  const chiave = `${nome}|${altezza}`;
  let m = modelli.get(chiave);
  if (!m) {
    m = new GLTFLoader().loadAsync(CARTELLA + nome).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const geos: THREE.BufferGeometry[] = [];
      let materiale: THREE.Material | null = null;
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const g = mesh.geometry.clone();
        // i modelli sono quantizzati: tutto in virgola mobile
        for (const [n, a] of Object.entries(g.attributes)) {
          const attr = a as THREE.BufferAttribute;
          if (attr.array instanceof Float32Array) continue;
          const v = new Float32Array(attr.count * attr.itemSize);
          for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) v[i * attr.itemSize + k] = attr.getComponent(i, k);
          g.setAttribute(n, new THREE.BufferAttribute(v, attr.itemSize));
        }
        g.applyMatrix4(mesh.matrixWorld);
        for (const n of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(n)) g.deleteAttribute(n);
        if (!g.attributes.normal) g.computeVertexNormals();
        geos.push(g.index ? g.toNonIndexed() : g);
        materiale ??= mesh.material as THREE.Material;
      });
      const geometria = geos.length === 1 ? geos[0] : (mergeGeometries(geos) as THREE.BufferGeometry);
      geometria.computeBoundingBox();
      const b = geometria.boundingBox as THREE.Box3;
      const s = altezza / (b.max.y - b.min.y);
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      geometria.translate(-cx, -b.min.y, -cz);
      geometria.scale(s, s, s);
      return { geometria, materiale: materiale as unknown as THREE.Material };
    });
    modelli.set(chiave, m);
  }
  return m;
}

/* ------------------------------------------------------------------ geometrie */

/** Un ramo: cilindro deformato fra due punti. */
export function ramo(da: THREE.Vector3, a: THREE.Vector3, r0: number, r1: number, caso: () => number, lati = 7) {
  const dir = a.clone().sub(da);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), lati, 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (caso() - 0.5) * 0.35;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate(da.x, da.y, da.z);
  return g;
}

function ciuffo(c: THREE.Vector3, r: number, caso: () => number, schiaccia = 0.62) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.78 + caso() * 0.44);
    pos.setXYZ(i, v.x, v.y * schiaccia, v.z);
  }
  g.translate(c.x, c.y, c.z);
  return g;
}

/**
 * Un albero vecchio a branche aperte, alto circa 2,3 unità (dal portfolio: l'ulivo).
 * Restituisce legno, fronde e i centri dei ciuffi (per appenderci le olive).
 */
export function albero(seme = 4242, folto = 1, schiaccia = 0.62) {
  const caso = generatore(seme);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const legno: THREE.BufferGeometry[] = [];
  const nodi = [V(0, 0, 0), V(0.08, 0.35, 0.03), V(-0.05, 0.62, 0.06)];
  legno.push(ramo(nodi[0], nodi[1], 0.24, 0.19, caso, 9), ramo(nodi[1], nodi[2], 0.19, 0.16, caso, 9));
  legno.push(new THREE.SphereGeometry(0.28, 10, 6).scale(1.1, 0.4, 1).translate(0, 0.02, 0));
  const j = () => (caso() - 0.5) * 0.25;
  const branche: [THREE.Vector3, THREE.Vector3][] = [
    [nodi[2], V(-0.6 + j(), 1.1 + j(), 0.12 + j())],
    [nodi[2], V(0.58 + j(), 1.15 + j(), -0.08 + j())],
    [nodi[2], V(0.08 + j(), 1.28 + j(), 0.4 + j())],
    [nodi[1], V(0.42 + j(), 0.85 + j(), 0.3 + j())],
  ];
  branche.forEach(([a, b]) => legno.push(ramo(a, b, 0.12, 0.07, caso)));
  const centri: THREE.Vector3[] = [];
  const punte = [V(-1.0, 1.48, 0.05), V(-0.5, 1.72, -0.22), V(-0.32, 1.58, 0.48), V(0.92, 1.52, -0.18), V(0.52, 1.82, 0.2), V(0.18, 1.92, -0.12), V(0.15, 1.68, 0.72), V(0.82, 1.24, 0.52), V(-0.72, 1.28, -0.42)];
  punte.forEach((p, i) => {
    p.x += j();
    p.y += j() * 0.6;
    p.z += j();
    legno.push(ramo(branche[[0, 0, 0, 1, 1, 2, 2, 3, 0][i]][1], p, 0.065, 0.032, caso, 5));
    centri.push(p);
  });
  const legnoGeo = mergeGeometries(legno.map((g) => (g.index ? g.toNonIndexed() : g))) as THREE.BufferGeometry;
  const chioma: THREE.BufferGeometry[] = [];
  centri.forEach((c) =>
    chioma.push(
      ciuffo(c, (0.42 + caso() * 0.12) * folto, caso, schiaccia),
      ciuffo(c.clone().add(V((caso() - 0.5) * 0.5, 0.12, (caso() - 0.5) * 0.4)), 0.3 * folto, caso, schiaccia)
    )
  );
  const frondeGeo = mergeGeometries(chioma.map((g) => (g.index ? g.toNonIndexed() : g))) as THREE.BufferGeometry;
  frondeGeo.computeVertexNormals();
  return { legnoGeo, frondeGeo, centri };
}

/** Matrice di posa: posizione, rotazione attorno a y, scala (uniforme o per asse). */
export function posa(x: number, y: number, z: number, ry = 0, s: number | [number, number, number] = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  const sc = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return m.compose(new THREE.Vector3(x, y, z), q, sc);
}

/** Smorzamento esponenziale indipendente dal frame rate. */
export const smorza = (da: number, a: number, velocita: number, dt: number) => THREE.MathUtils.lerp(da, a, 1 - Math.exp(-velocita * dt));

/* ------------------------------------------------------------------ caricamento */

type Ascoltatore = (p: number) => void;
const ascoltatori = new Set<Ascoltatore>();
let progresso = 0;
let partito = false;
THREE.DefaultLoadingManager.onStart = () => {
  partito = true;
};
THREE.DefaultLoadingManager.onProgress = (_u, caricati, totali) => {
  progresso = totali ? caricati / totali : 1;
  ascoltatori.forEach((f) => f(progresso));
};
THREE.DefaultLoadingManager.onLoad = () => {
  progresso = 1;
  ascoltatori.forEach((f) => f(1));
};
export function ascoltaCaricamento(f: Ascoltatore) {
  ascoltatori.add(f);
  f(partito ? progresso : 0);
  return () => {
    ascoltatori.delete(f);
  };
}
