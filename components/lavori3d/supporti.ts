import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Supporto } from "@/content/lavori";

/*
 * Gli oggetti che accompagnano i lavori nella scena, piccoli, ai piedi del pannello: ognuno richiama il lavoro
 * (il quadro elettrico per lo shop di materiale elettrico, la sedia per Bellelli, il guanto monouso per Sanires...).
 * Sullo schermino dell'oggetto c'è la cima della pagina del sito; la pagina vera sta sul pannello (pannello.ts).
 *
 * I modelli vengono da Poly Haven (polyhaven.com, licenza CC0), ridotti per il web con gltf-transform
 * (texture webp 256–512 px, geometria semplificata e quantizzata) e serviti da public/lavori/oggetti:
 *   power_box_01, standing_chalkboard_01, plastic_monobloc_chair_01, garden_gloves_01, television_02,
 *   cement_bag, trowel_01, vintage_suitcase, ornate_mirror_01, BarberShopChair_01, concrete_road_barrier,
 *   WetFloorSign_01, projector_screen, classic_laptop, standing_picture_frame_02, clipboard, life_jacket, lifebuoy.
 * Il gommone, l'arnia e il blocco di resina non ci sono: sono costruiti qui.
 *
 * Coordinate: in metri, y in alto dal pavimento, +z verso chi guarda dal centro della scena.
 * Lo schermo ha sempre le proporzioni 16:11 (largo / 1,4545): le stesse delle vecchie carte.
 */

export const PROPORZIONE = 2.4 / 1.65;

type Pezzo = {
  nome: string;
  pos: [number, number, number];
  rot?: [number, number, number];
  scala: number;
  /** ritocchi ai materiali del modello */
  ritocco?: (m: THREE.MeshStandardMaterial) => void;
};

type SchermoOggetto = { pos: [number, number, number]; rot: [number, number, number]; largo: number };

type Definizione = {
  pezzi: Pezzo[];
  schermo: SchermoOggetto;
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
  // shop.puntoluce.net, materiale elettrico: un quadro elettrico grande, lo schermo davanti all'interno
  quadro: {
    pezzi: [{ nome: "power_box_01", pos: [0.08, 0.66, -0.12], scala: 2.6 }],
    schermo: { pos: [0.08, 0.68, 0.02], rot: [0, 0, 0], largo: 0.86 },
  },
  // blog Punto Luce: la lavagna a cavalletto
  lavagna: {
    pezzi: [{ nome: "standing_chalkboard_01", pos: [0, 0, 0], scala: 1 }],
    schermo: { pos: [0.01, 0.88, 0.2], rot: [-0.25, 0, 0], largo: 0.74 },
  },
  // Bellelli, sedie di design: la sedia trasparente, lo schermo appoggiato sul sedile
  sedia: {
    pezzi: [{ nome: "plastic_monobloc_chair_01", pos: [0, 0, 0], scala: 1.35, ritocco: trasparente }],
    schermo: { pos: [0, 0.94, 0.02], rot: [-0.18, 0, 0], largo: 0.86 },
  },
  // Sanires, guanti monouso: un guanto enorme che spunta dal pavimento e regge lo schermo
  guanto: {
    pezzi: [{ nome: "garden_gloves_01", pos: [0, 0, 0.1], rot: [-Math.PI / 2, 0, 0], scala: 5, ritocco: nitrile }],
    schermo: { pos: [0, 0.86, 0.42], rot: [-0.1, 0, 0], largo: 0.95 },
  },
  // Ghigo Miranda, miele: l'arnia
  arnia: {
    pezzi: [],
    schermo: { pos: [0, 1.27, 0.02], rot: [-0.1, 0, 0], largo: 0.9 },
    costruisci: arnia,
  },
  // Livello Zero, videogiochi: il televisore a tubo
  televisore: {
    pezzi: [{ nome: "television_02", pos: [0, 0, 0], scala: 2.7 }],
    schermo: { pos: [-0.06, 0.68, 0.34], rot: [0, 0, 0], largo: 0.7 },
  },
  // Osservatorio Accoglienza: il gommone
  gommone: {
    pezzi: [
      { nome: "life_jacket", pos: [-0.95, 0.2, 0.2], rot: [-1.45, 0, 0.5], scala: 0.9 },
      { nome: "life_jacket", pos: [0.6, 0.2, 0.25], rot: [-1.5, 0, -0.7], scala: 0.9 },
      { nome: "lifebuoy", pos: [1.25, 0.44, 0.5], rot: [-0.3, -0.4, 0.1], scala: 0.85 },
    ],
    schermo: { pos: [-0.15, 0.8, -0.25], rot: [-0.1, 0, 0], largo: 1.0 },
    costruisci: gommone,
  },
  // NDN Luxury, resina e microcemento: un blocco di resina colata, il sacco e la cazzuola
  resina: {
    pezzi: [
      { nome: "cement_bag", pos: [0.85, 0, 0.05], rot: [0, 0.4, 0], scala: 1 },
      { nome: "trowel_01", pos: [0.36, 0.56, 0.2], rot: [0, 1.9, 0], scala: 1.6 },
    ],
    schermo: { pos: [0, 0.86, -0.05], rot: [-0.1, 0, 0], largo: 0.9 },
    costruisci: resina,
  },
  // ESH, alloggi per studenti Erasmus: le valigie con gli adesivi
  valigia: {
    pezzi: [{ nome: "vintage_suitcase", pos: [0, 0, 0], scala: 1 }],
    schermo: { pos: [0, 0.9, 0.0], rot: [-0.06, 0, 0], largo: 1.0 },
  },
  // Beauty Broker: lo specchio da camerino (lo schermo nello specchio) e la poltrona da barbiere
  specchio: {
    pezzi: [
      { nome: "ornate_mirror_01", pos: [-0.25, 1.0, 0], scala: 2.3 },
      { nome: "BarberShopChair_01", pos: [0.85, 0, 0.35], rot: [0, -0.7, 0], scala: 0.9 },
    ],
    schermo: { pos: [-0.25, 0.97, 0.08], rot: [0, 0, 0], largo: 0.8 },
  },
  // in costruzione: la barriera di cemento e il cartello giallo
  cantiere: {
    pezzi: [
      { nome: "concrete_road_barrier", pos: [0, 0, 0], scala: 1 },
      { nome: "WetFloorSign_01", pos: [1.0, 0, 0.35], rot: [0, -0.4, 0], scala: 1.2 },
    ],
    schermo: { pos: [0, 1.17, 0], rot: [-0.06, 0, 0], largo: 1.0 },
  },
  // All Studios, app per grafici (in costruzione): il telo da proiezione sul treppiede
  proiettore: {
    pezzi: [{ nome: "projector_screen", pos: [0, 0, 0], scala: 1 }],
    schermo: { pos: [0, 1.33, 0.1], rot: [0, 0, 0], largo: 0.92 },
  },
  // Jointoyou: la cornice da tavolo, grande
  cornice: {
    pezzi: [{ nome: "standing_picture_frame_02", pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], scala: 4.4 }],
    schermo: { pos: [0, 0.6, 0.1], rot: [-0.15, 0, 0], largo: 0.78 },
  },
  // Copystudio: il portatile d'epoca
  portatile: {
    pezzi: [{ nome: "classic_laptop", pos: [0, 0, 0], scala: 2 }],
    schermo: { pos: [0, 0.68, -0.28], rot: [-0.2, 0, 0], largo: 0.86 },
  },
  // Hetaweb: la cartellina portablocco, in piedi
  appunti: {
    pezzi: [{ nome: "clipboard", pos: [0, 0.9, 0], rot: [Math.PI / 2 - 0.2, 0, 0], scala: 5 }],
    schermo: { pos: [0, 1.02, 0.25], rot: [-0.2, 0, 0], largo: 0.86 },
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
 * Costruisce l'oggetto che accompagna il pannello del lavoro: torna il gruppo (si riempie quando i modelli
 * arrivano) e prepara(), che sullo schermo dell'oggetto mette la cima della pagina del sito, poi rimpicciolisce
 * l'oggetto (al massimo 0,55 m di larghezza e 0,6 di altezza) e lo appoggia a terra col fianco sinistro in x = 0.
 */
export function supporto(id: Supporto) {
  const def = DEF[id];
  const gruppo = new THREE.Group();
  if (def.costruisci) def.costruisci(gruppo);
  gruppo.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => null;
  });
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
  // il contenuto (oggetto + schermino) sta in un gruppo interno: quello esterno si scala e si sposta
  const esterno = new THREE.Group();
  esterno.add(gruppo);
  esterno.visible = false;
  const prepara = (pagina: THREE.Texture | null) => {
    if (pagina) {
      const t = pagina.clone();
      const L = def.schermo.largo, A = L / PROPORZIONE;
      const img = pagina.image as HTMLImageElement;
      const q = Math.min(1, (A / L) * (img.naturalWidth / img.naturalHeight));
      t.repeat.set(1, q);
      t.offset.set(0, 1 - q);
      t.needsUpdate = true;
      const schermino = new THREE.Mesh(new THREE.PlaneGeometry(L, A), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
      schermino.position.set(...def.schermo.pos);
      schermino.rotation.set(...def.schermo.rot);
      schermino.raycast = () => null;
      gruppo.add(schermino);
    }
    pronto.then(() => {
      const b = new THREE.Box3().setFromObject(gruppo);
      const w = b.max.x - b.min.x, h = b.max.y - b.min.y;
      const k = Math.min(0.55, 0.55 / w, 0.6 / h);
      esterno.scale.setScalar(k);
      esterno.position.set(-b.min.x * k, -b.min.y * k, -((b.min.z + b.max.z) / 2) * k);
      esterno.visible = true;
    });
  };
  return { gruppo: esterno, pronto, prepara };
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
