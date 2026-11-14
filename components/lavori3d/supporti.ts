import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Supporto } from "@/content/lavori";

/*
 * Gli oggetti che accompagnano i lavori nella scena, a terra accanto al pannello: ognuno richiama il lavoro
 * (il quadro elettrico per lo shop di materiale elettrico, la sedia per Bellelli, il guanto monouso per Sanires...).
 * Ognuno ha la sua posa: da che parte del pannello sta, quanto è avanti, come è girato, quanto è alto.
 *
 * I modelli vengono da Poly Haven (polyhaven.com, licenza CC0), ridotti per il web con gltf-transform
 * (texture webp 256–512 px, geometria semplificata e quantizzata) e serviti da public/lavori/oggetti:
 *   power_box_01, standing_chalkboard_01, plastic_monobloc_chair_01, garden_gloves_01, television_02,
 *   cement_bag, trowel_01, vintage_suitcase, BarberShopChair_01, WetFloorSign_01, spray_paint_bottles, classic_laptop, standing_picture_frame_02, clipboard, life_jacket, lifebuoy.
 * Il gommone, l'arnia e il blocco di resina non ci sono: sono costruiti qui.
 *
 * Coordinate: in metri, y in alto dal pavimento, +z verso chi guarda dal centro della scena,
 * x = 0 al centro del pannello (largo 1,22: i fianchi stanno a ±0,61).
 */

type Pezzo = {
  nome: string;
  pos: [number, number, number];
  rot?: [number, number, number];
  scala: number;
  /** ritocchi ai materiali del modello */
  ritocco?: (m: THREE.MeshStandardMaterial) => void;
};

/**
 * La posa dell'oggetto accanto al pannello: dove sta il suo centro (x, z), di quanto è girato
 * (radianti; positivo verso destra di chi guarda) e quanto è alto, in metri.
 */
type Posa = { x: number; z: number; giro: number; alto: number };

type Definizione = {
  pezzi: Pezzo[];
  posa: Posa;
  /** le parti costruite qui, senza modello */
  costruisci?: (g: THREE.Group) => void;
};

const trasparente = (m: THREE.MeshStandardMaterial) => {
  // il policarbonato delle sedie di design: trasparente, appena fumé
  m.transparent = true;
  m.opacity = 0.42;
  m.color.set("#D8E4EC");
  m.map = null;
  m.roughness = 0.08;
  m.metalness = 0;
  m.depthWrite = false;
};
const nitrile = (m: THREE.MeshStandardMaterial) => {
  // il guanto monouso: nitrile blu
  m.map = null;
  m.color.set("#3F7FD8");
  m.roughness = 0.45;
};

const DEF: Record<Supporto, Definizione> = {
  // shop.puntoluce.net, materiale elettrico: il quadro elettrico con lo sportello aperto, posato a terra a sinistra
  quadro: {
    pezzi: [{ nome: "power_box_01", pos: [0, 0, 0], rot: [0, 0, 0], scala: 1 }],
    posa: { x: -0.92, z: 0.25, giro: 0.55, alto: 0.62 },
  },
  // blog Punto Luce: la lavagna a cavalletto, dietro a destra, come davanti a un locale
  lavagna: {
    pezzi: [{ nome: "standing_chalkboard_01", pos: [0, 0, 0], scala: 1 }],
    posa: { x: 0.95, z: -0.15, giro: -0.45, alto: 1.05 },
  },
  // Bellelli, sedie di design: la sedia trasparente accanto, girata verso il pannello
  sedia: {
    pezzi: [{ nome: "plastic_monobloc_chair_01", pos: [0, 0, 0], scala: 1, ritocco: trasparente }],
    posa: { x: 0.95, z: 0.25, giro: -0.85, alto: 0.84 },
  },
  // Sanires, guanti monouso: un paio di guanti blu buttati a terra davanti al pannello
  guanto: {
    pezzi: [{ nome: "garden_gloves_01", pos: [0, 0, 0], scala: 1, ritocco: nitrile }],
    posa: { x: 0.55, z: 0.6, giro: -0.9, alto: 0.09 },
  },
  // Ghigo Miranda, miele: l'arnia a destra, appena girata, con le api
  arnia: {
    pezzi: [],
    posa: { x: 1.0, z: 0.0, giro: -0.4, alto: 0.95 },
    costruisci: arnia,
  },
  // Livello Zero, videogiochi: il televisore a tubo per terra, girato verso chi guarda
  televisore: {
    pezzi: [{ nome: "television_02", pos: [0, 0, 0], scala: 1 }],
    posa: { x: -0.9, z: 0.3, giro: 0.6, alto: 0.48 },
  },
  // Osservatorio Accoglienza: il gommone arenato dietro il pannello, di traverso, coi giubbotti e il salvagente
  gommone: {
    pezzi: [
      { nome: "life_jacket", pos: [-0.75, 0.2, 0.2], rot: [-1.45, 0, 0.5], scala: 0.9 },
      { nome: "life_jacket", pos: [0.4, 0.2, -0.15], rot: [-1.5, 0, -0.7], scala: 0.9 },
      { nome: "lifebuoy", pos: [1.25, 0.44, 0.5], rot: [-0.3, -0.4, 0.1], scala: 0.85 },
    ],
    posa: { x: 0.55, z: -0.55, giro: -0.55, alto: 0.52 },
    costruisci: gommone,
  },
  // NDN Luxury, resina e microcemento: il blocco di resina colata, il sacco e la cazzuola, a sinistra
  resina: {
    pezzi: [
      { nome: "cement_bag", pos: [0.85, 0, 0.05], rot: [0, 0.4, 0], scala: 1 },
      { nome: "trowel_01", pos: [0.3, 0.56, 0.12], rot: [0, 1.9, 0], scala: 1.6 },
    ],
    posa: { x: -1.0, z: 0.25, giro: 0.5, alto: 0.34 },
    costruisci: resina,
  },
  // ESH, alloggi per studenti Erasmus: le valigie con gli adesivi, appena arrivate
  valigia: {
    pezzi: [{ nome: "vintage_suitcase", pos: [0, 0, 0], scala: 1 }],
    posa: { x: 0.98, z: 0.3, giro: -0.7, alto: 0.48 },
  },
  // Beauty Broker: la poltrona da barbiere, girata verso chi guarda
  specchio: {
    pezzi: [{ nome: "BarberShopChair_01", pos: [0, 0, 0], scala: 1 }],
    posa: { x: -0.98, z: 0.2, giro: 0.75, alto: 1.05 },
  },
  // in costruzione: il cartello giallo, davanti a destra
  cantiere: {
    pezzi: [{ nome: "WetFloorSign_01", pos: [0, 0, 0], scala: 1 }],
    posa: { x: 0.88, z: 0.35, giro: -0.5, alto: 0.78 },
  },
  // All Studios, app per grafici (in costruzione): le bombolette di vernice a terra
  bombolette: {
    pezzi: [{ nome: "spray_paint_bottles", pos: [0, 0, 0], scala: 1 }],
    posa: { x: 0.85, z: 0.45, giro: -0.5, alto: 0.24 },
  },
  // Jointoyou: la cornice da tavolo, appoggiata a terra
  cornice: {
    pezzi: [{ nome: "standing_picture_frame_02", pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], scala: 1 }],
    posa: { x: -0.9, z: 0.3, giro: 0.5, alto: 0.5 },
  },
  // Copystudio: il portatile d'epoca, aperto per terra
  portatile: {
    pezzi: [{ nome: "classic_laptop", pos: [0, 0, 0], scala: 1 }],
    posa: { x: 0.9, z: 0.35, giro: -0.6, alto: 0.36 },
  },
  // Hetaweb: la cartellina portablocco appoggiata al pannello
  appunti: {
    pezzi: [{ nome: "clipboard", pos: [0, 0, 0], rot: [Math.PI / 2 - 0.25, 0, 0], scala: 1 }],
    posa: { x: -0.75, z: 0.18, giro: 0.35, alto: 0.48 },
  },
};

/* ------------------------------------------------------------- costruiti */

/** Il gommone degli scafisti: il tubolare grigio chiuso a punta davanti, il fondo, lo specchio di poppa. */
function gommone(g: THREE.Group) {
  const gomma = new THREE.MeshStandardMaterial({ color: "#4A4E52", roughness: 0.62, metalness: 0 });
  const fondo = new THREE.MeshStandardMaterial({ color: "#2E3134", roughness: 0.85 });
  const L = 2.9, W = 1.25, R = 0.21;
  // il contorno: poppa dritta a sinistra, i fianchi, la prua che si chiude a punta a destra
  const forma = new THREE.CurvePath<THREE.Vector3>();
  const p = (x: number, z: number) => new THREE.Vector3(x, R, z);
  const xp = -L / 2, xm = L / 2 - 0.75;
  forma.add(new THREE.LineCurve3(p(xp, W / 2), p(xm, W / 2)));
  forma.add(new THREE.QuadraticBezierCurve3(p(xm, W / 2), p(L / 2, W / 2 - 0.05), p(L / 2, 0)));
  forma.add(new THREE.QuadraticBezierCurve3(p(L / 2, 0), p(L / 2, -W / 2 + 0.05), p(xm, -W / 2)));
  forma.add(new THREE.LineCurve3(p(xm, -W / 2), p(xp, -W / 2)));
  const tubo = new THREE.TubeGeometry(forma, 96, R, 16, false);
  g.add(new THREE.Mesh(tubo, gomma));
  // i tappi dei due tubolari a poppa
  [-1, 1].forEach((s) => {
    const tappo = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 10), gomma);
    tappo.position.set(xp, R, (s * W) / 2);
    g.add(tappo);
  });
  // il fondo e lo specchio di poppa, di compensato scuro
  const piano = new THREE.Shape();
  piano.moveTo(xp, -W / 2 + 0.05);
  piano.lineTo(xm, -W / 2 + 0.05);
  piano.quadraticCurveTo(L / 2 - 0.08, -W / 2 + 0.1, L / 2 - 0.08, 0);
  piano.quadraticCurveTo(L / 2 - 0.08, W / 2 - 0.1, xm, W / 2 - 0.05);
  piano.lineTo(xp, W / 2 - 0.05);
  piano.closePath();
  const f = new THREE.Mesh(new THREE.ShapeGeometry(piano, 24), fondo);
  f.rotation.x = -Math.PI / 2;
  f.position.y = 0.05;
  g.add(f);
  const poppa = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, W - 0.1), fondo);
  poppa.position.set(xp + 0.02, 0.26, 0);
  g.add(poppa);
  // la striscia di rinforzo lungo il tubolare
  const striscia = new THREE.Mesh(new THREE.TubeGeometry(forma, 96, R * 1.015, 16, false), new THREE.MeshStandardMaterial({ color: "#2B2D30", roughness: 0.7 }));
  striscia.scale.set(1, 0.18, 1);
  striscia.position.y = R * 0.82;
  g.add(striscia);
  // il gommone si vede di fianco, con la prua verso destra
}

/** L'arnia: il basamento, due melari bianchi e il coperchio di lamiera; qualche ape davanti. */
function arnia(g: THREE.Group) {
  const legno = new THREE.MeshStandardMaterial({ color: "#EEE6D2", roughness: 0.85 });
  const legnoScuro = new THREE.MeshStandardMaterial({ color: "#B79A6B", roughness: 0.9 });
  const lamiera = new THREE.MeshStandardMaterial({ color: "#A9ADB0", roughness: 0.45, metalness: 0.6 });
  const L = 0.62, P = 0.52;
  // il basamento a quattro piedi
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const piede = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), legnoScuro);
    piede.position.set((sx * L) / 2.4, 0.16, (sz * P) / 2.4);
    g.add(piede);
  }));
  const base = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.05, P + 0.1), legnoScuro);
  base.position.y = 0.345;
  g.add(base);
  // il nido e il melario, con la fessura dell'entrata
  let y = 0.37;
  [0.3, 0.22].forEach((h, i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(L, h, P), legno);
    c.position.y = y + h / 2;
    g.add(c);
    // le maniglie incavate sui fianchi
    [-1, 1].forEach((s) => {
      const man = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.14), legnoScuro);
      man.position.set((s * L) / 2 + s * 0.004, y + h * 0.65, 0);
      g.add(man);
    });
    if (i === 0) {
      const entrata = new THREE.Mesh(new THREE.BoxGeometry(L * 0.6, 0.022, 0.01), new THREE.MeshBasicMaterial({ color: "#1A140C" }));
      entrata.position.set(0, y + 0.02, P / 2 + 0.004);
      g.add(entrata);
    }
    y += h + 0.004;
  });
  const coperchio = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.06, P + 0.06), lamiera);
  coperchio.position.y = y + 0.03;
  g.add(coperchio);
  // le api: puntini scuri davanti all'entrata (si muovono in Lavoro3D, se c'è userData.api)
  const api = new THREE.Group();
  api.userData.api = true;
  const ape = new THREE.MeshBasicMaterial({ color: "#2A1F0C" });
  for (let i = 0; i < 9; i++) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4).scale(1.4, 1, 1), ape);
    a.userData.fase = i * 0.7;
    api.add(a);
  }
  api.position.set(0, 0.45, P / 2 + 0.2);
  g.add(api);
}

/** Il blocco di resina colata: lucido, a strati, con una sbavatura che cola su un fianco. */
function resina(g: THREE.Group) {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#E9E2D6");
  gr.addColorStop(0.45, "#CFC4B2");
  gr.addColorStop(0.7, "#B6A894");
  gr.addColorStop(1, "#8F8270");
  x.fillStyle = gr;
  x.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const blocco = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.52, 0.62, 1, 1, 1), mat);
  blocco.position.y = 0.26;
  g.add(blocco);
  const cola = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 10), mat);
  cola.scale.set(1, 1, 0.35);
  cola.position.set(-0.38, 0.33, 0.31);
  g.add(cola);
}

/* ------------------------------------------------------------- caricamento */

const caricatore = new GLTFLoader();
const modelli = new Map<string, Promise<THREE.Group>>();

function modello(nome: string) {
  let p = modelli.get(nome);
  if (!p) {
    p = caricatore.loadAsync(`/lavori/oggetti/${nome}.glb`).then((gltf) => {
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.raycast = () => null; // si clicca lo schermo e la sagoma, non i mille pezzi
      });
      return gltf.scene;
    });
    modelli.set(nome, p);
  }
  return p;
}

/**
 * Costruisce l'oggetto che accompagna il pannello del lavoro, nella sua posa: torna il gruppo, che compare
 * quando i modelli sono arrivati, già all'altezza giusta, girato e al suo posto accanto al pannello.
 */
export function supporto(id: Supporto) {
  const def = DEF[id];
  const gruppo = new THREE.Group();
  if (def.costruisci) def.costruisci(gruppo);
  const pronto = Promise.all(
    def.pezzi.map(async (p) => {
      const sorgente = await modello(p.nome);
      const copia = sorgente.clone(true);
      if (p.ritocco) {
        copia.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.material = (m.material as THREE.MeshStandardMaterial).clone();
            p.ritocco?.(m.material as THREE.MeshStandardMaterial);
          }
        });
      }
      copia.position.set(...p.pos);
      if (p.rot) copia.rotation.set(...p.rot);
      copia.scale.setScalar(p.scala);
      gruppo.add(copia);
    })
  ).catch(() => undefined);
  // dentro: l'oggetto, centrato e appoggiato a terra; fuori: la posa
  const esterno = new THREE.Group();
  esterno.add(gruppo);
  esterno.visible = false;
  pronto.then(() => {
    gruppo.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => null;
    });
    // l'ingombro nelle coordinate del gruppo stesso (il gruppo è già nella scena, girato e spostato)
    gruppo.updateMatrixWorld(true);
    const inversa = gruppo.matrixWorld.clone().invert();
    const b = new THREE.Box3();
    const pezzo = new THREE.Box3();
    gruppo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible || o.parent?.userData.api) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      pezzo.copy(m.geometry.boundingBox as THREE.Box3).applyMatrix4(m.matrixWorld).applyMatrix4(inversa);
      b.union(pezzo);
    });
    const { x, z, giro, alto } = def.posa;
    const k = alto / Math.max(0.01, b.max.y - b.min.y);
    gruppo.scale.setScalar(k);
    gruppo.position.set(-((b.min.x + b.max.x) / 2) * k, -b.min.y * k, -((b.min.z + b.max.z) / 2) * k);
    esterno.position.set(x, 0, z);
    esterno.rotation.y = giro;
    esterno.visible = true;
  });
  return { gruppo: esterno };
}

/** Le api attorno all'arnia: girano piano davanti all'entrata. */
export function muoviApi(g: THREE.Object3D, t: number) {
  g.traverse((o) => {
    if (!o.userData.api) return;
    o.children.forEach((a, i) => {
      const f = (a.userData.fase as number) + t * (0.9 + (i % 3) * 0.25);
      a.position.set(Math.sin(f * 1.3) * 0.32, Math.sin(f * 2.1) * 0.12 + 0.1, Math.cos(f) * 0.18);
    });
  });
}
