import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Supporto } from "@/content/lavori";

/*
 * Gli oggetti che accompagnano alcuni lavori nella scena, a terra accanto al pannello:
 * la sedia di design sotto Bellelli (il pannello ci sta seduto sopra), il gommone dietro l'Osservatorio,
 * l'arnia accanto a Ghigo Miranda. Ognuno ha la sua posa.
 *
 * Modelli e texture da Poly Haven (polyhaven.com, licenza CC0), ridotti per il web e serviti da public/lavori/oggetti:
 *   plastic_monobloc_chair_01, life_jacket, lifebuoy (glb, gltf-transform: webp, geometria quantizzata);
 *   wood_peeling_paint_weathered, weathered_brown_planks, metal_plate (texture dell'arnia, webp 512 px,
 *   schiarite e ritinte: legno dipinto color crema, legno grezzo, lamiera zincata).
 * Il gommone e l'arnia sono costruiti qui.
 *
 * Coordinate: in metri, y in alto dal pavimento, +z verso chi guarda dal centro della scena,
 * x = 0 al centro del pannello (largo 1,22: i fianchi stanno a ±0,61; +x a destra di chi guarda).
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
type Posa = {
  x: number; z: number; giro: number; alto: number;
  /** di quanto si alza il pannello, se ci sta sopra */
  pannello?: number;
};

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
const DEF: Record<Supporto, Definizione> = {
  // Bellelli, sedie di design: una sedia trasparente in miniatura, col pannello seduto sopra
  sedia: {
    pezzi: [{ nome: "plastic_monobloc_chair_01", pos: [0, 0, 0], scala: 1, ritocco: trasparente }],
    posa: { x: 0, z: -0.04, giro: 0.32, alto: 0.6, pannello: 0.2 },
  },
  // Osservatorio Accoglienza: il gommone arenato dietro il pannello, a sinistra, coi giubbotti e il salvagente
  gommone: {
    pezzi: [
      { nome: "life_jacket", pos: [-0.75, 0.2, 0.2], rot: [-1.45, 0, 0.5], scala: 0.9 },
      { nome: "life_jacket", pos: [0.4, 0.2, -0.15], rot: [-1.5, 0, -0.7], scala: 0.9 },
      { nome: "lifebuoy", pos: [1.25, 0.44, 0.5], rot: [-0.3, -0.4, 0.1], scala: 0.85 },
    ],
    posa: { x: -0.78, z: -0.5, giro: 0.5, alto: 0.38 },
    costruisci: gommone,
  },
  // Ghigo Miranda, miele: l'arnia a destra, appena girata, con le api
  arnia: {
    pezzi: [],
    posa: { x: 0.98, z: 0.05, giro: -0.4, alto: 0.62 },
    costruisci: arnia,
  },
};

/** Di quanto si alza il pannello del lavoro sopra il suo oggetto (la sedia di Bellelli). */
export function sollevamento(id: Supporto | null) {
  return id ? DEF[id].posa.pannello ?? 0 : 0;
}

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

/** Una texture di Poly Haven, una volta sola. */
const texture = new Map<string, THREE.Texture>();
function foto(nome: string, colore = true) {
  let t = texture.get(nome);
  if (!t) {
    t = new THREE.TextureLoader().load(`/lavori/oggetti/${nome}.webp`);
    if (colore) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texture.set(nome, t);
  }
  return t;
}

/**
 * L'arnia, come quelle nei campi: il cavalletto di legno grezzo, il fondo col predellino d'entrata,
 * il nido e il melario di legno dipinto e scrostato (di due tinte appena diverse), le maniglie incavate,
 * il coprifavo e il tetto di lamiera che sporge. Davanti all'entrata, le api.
 */
function arnia(g: THREE.Group) {
  const grezzo = new THREE.MeshStandardMaterial({ map: foto("arnia-base-colore"), normalMap: foto("arnia-base-rilievo", false), roughness: 0.95 });
  const nido = new THREE.MeshStandardMaterial({ map: foto("arnia-legno-colore"), normalMap: foto("arnia-legno-rilievo", false), color: "#FFFFFF", roughness: 0.85 });
  const melario = new THREE.MeshStandardMaterial({ map: foto("arnia-legno-colore"), normalMap: foto("arnia-legno-rilievo", false), color: "#F6E7BE", roughness: 0.85 });
  const lamiera = new THREE.MeshStandardMaterial({ map: foto("arnia-lamiera-colore"), normalMap: foto("arnia-lamiera-rilievo", false), roughness: 0.5, metalness: 0.1 });
  const buio = new THREE.MeshBasicMaterial({ color: "#140F08" });
  const L = 0.5, P = 0.5;
  const scatola = (l: number, a: number, p: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  // il cavalletto: quattro gambe un po' divaricate, due traverse
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const gamba = scatola(0.05, 0.36, 0.05, grezzo, sx * 0.21, 0.18, sz * 0.2);
    gamba.rotation.z = -sx * 0.06;
    gamba.rotation.x = sz * 0.06;
  }));
  scatola(L + 0.04, 0.04, 0.06, grezzo, 0, 0.3, 0.2);
  scatola(L + 0.04, 0.04, 0.06, grezzo, 0, 0.3, -0.2);
  // il fondo, e il predellino inclinato davanti all'entrata
  scatola(L + 0.02, 0.04, P + 0.02, grezzo, 0, 0.34, 0);
  const predellino = scatola(L * 0.8, 0.018, 0.12, grezzo, 0, 0.33, P / 2 + 0.05);
  predellino.rotation.x = 0.28;
  // il nido e il melario, con una fuga scura fra l'uno e l'altro
  let y = 0.36;
  ([[0.29, nido], [0.17, melario]] as const).forEach(([h, m], i) => {
    scatola(L, h, P, m, 0, y + h / 2, 0);
    // le maniglie incavate sui fianchi
    [-1, 1].forEach((s) => scatola(0.008, 0.026, 0.13, buio, s * (L / 2 + 0.002), y + h * 0.66, 0));
    if (i === 0) scatola(L * 0.62, 0.016, 0.006, buio, 0, y + 0.014, P / 2 + 0.002); // l'entrata
    y += h;
    scatola(L + 0.004, 0.004, P + 0.004, buio, 0, y, 0);
  });
  // il coprifavo e il tetto di lamiera, più largo, coi bordi ripiegati
  scatola(L, 0.02, P, melario, 0, y + 0.01, 0);
  y += 0.02;
  scatola(L + 0.07, 0.03, P + 0.07, lamiera, 0, y + 0.015, 0);
  [-1, 1].forEach((s) => {
    scatola(L + 0.07, 0.05, 0.008, lamiera, 0, y - 0.005, s * (P / 2 + 0.035));
    scatola(0.008, 0.05, P + 0.07, lamiera, s * (L / 2 + 0.035), y - 0.005, 0);
  });
  // le api: il corpo giallo bruno a righe, le ali di vetro; girano davanti all'entrata (muoviApi)
  const api = new THREE.Group();
  api.userData.api = true;
  const corpo = new THREE.MeshStandardMaterial({ color: "#C08A1E", roughness: 0.6 });
  const righe = new THREE.MeshBasicMaterial({ color: "#1E1408" });
  const ali = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 11; i++) {
    const a = new THREE.Group();
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6).scale(1.6, 1, 1), corpo);
    a.add(c);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0112, 0.0112, 0.005, 8).rotateZ(Math.PI / 2), righe);
    r.position.x = -0.004;
    a.add(r);
    [-1, 1].forEach((s) => {
      const ala = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.009), ali);
      ala.position.set(0.002, 0.009, s * 0.008);
      ala.rotation.x = s * 0.5;
      ala.userData.ala = s;
      a.add(ala);
    });
    a.userData.fase = i * 0.61;
    api.add(a);
  }
  api.position.set(0, 0.42, P / 2 + 0.2);
  g.add(api);
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
      if (!m.isMesh || !m.visible) return;
      for (let p = o.parent; p; p = p.parent) if (p.userData.api) return; // le api non contano
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

/** Le api attorno all'arnia: girano davanti all'entrata, sbattono le ali, guardano dove vanno. */
export function muoviApi(g: THREE.Object3D, t: number) {
  g.traverse((o) => {
    if (!o.userData.api) return;
    o.children.forEach((a, i) => {
      const f = (a.userData.fase as number) + t * (0.8 + (i % 3) * 0.22);
      a.position.set(Math.sin(f * 1.3) * 0.3, Math.sin(f * 2.1) * 0.1 + 0.08, Math.cos(f) * 0.16);
      a.rotation.y = Math.atan2(-Math.cos(f * 1.3) * 1.3 * 0.3, -Math.sin(f) * 0.16);
      a.children.forEach((c) => {
        if (c.userData.ala) c.rotation.x = (c.userData.ala as number) * (0.3 + Math.abs(Math.sin(t * 60 + i)) * 0.9);
      });
    });
  });
}
