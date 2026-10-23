import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANGOLO_ZONA } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { fra, generatore, liberaTutto, tela } from "./comuni";

/*
 * L'ulivo dietro le carte, nel varco fra la prima carta e la seconda dopo la zona dello sviluppatore.
 * Tutto piccolo: l'albero sta nel varco, le persone passano e lavorano sotto il bordo della prima carta, che è alto.
 * In un minuto e mezzo una vita: l'ulivo nasce come un alberello legato al suo palo e cresce in fretta;
 * gli passano accanto un bambino in triciclo, poi un carro coi buoi. Cresciuto, comincia la raccolta:
 * reti, pertiche, olive che cadono, cassette portate via. Poi cresce ancora e le raccolte si susseguono.
 * Di notte niente persone: l'albero è acceso da faretti a terra, come gli ulivi delle ville del sud.
 * Sopra, nel cielo fra le carte, la scritta che porta alla pagina dell'olio, legata all'albero da un filo di luce.
 * In queste coordinate +x è a sinistra per chi guarda, −z verso chi guarda.
 */

const ANGOLO = ANGOLO_ZONA + (Math.PI * 2 / 13) * 1.5;
const DISTANZA = 8.6;
/** Una persona è alta circa un'unità: nel mondo trenta centimetri, quanto basta per stare sotto la carta. */
const SCALA = 0.3;
const CICLO = 84;
/** Le tre raccolte, in secondi del ciclo. */
const RACCOLTE: [number, number][] = [[22, 36], [44, 58], [66, 80]];
/** La trazzera su cui passano il triciclo e il carro. */
const STRADA_Z = -1.35;

const stoffa = (colore: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: colore, roughness: 0.85, ...extra });
const PELLE = "#C9936C";
const CALDA = new THREE.Color("#FFC98A");

function arto(materiale: THREE.Material, raggio: number, lungo: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(raggio, lungo, 3, 8).translate(0, -lungo / 2, 0), materiale));
  return g;
}

function testa(capelli: string, cappello?: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), stoffa(PELLE)));
  if (cappello) {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.08, 0.05, 14).translate(0, 0.055, 0), stoffa(cappello)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.06).translate(0, 0.035, 0.08), stoffa(cappello)));
  } else g.add(new THREE.Mesh(new THREE.SphereGeometry(0.076, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.5), stoffa(capelli)));
  return g;
}

function ramo(da: THREE.Vector3, a: THREE.Vector3, r0: number, r1: number, caso: () => number) {
  const dir = a.clone().sub(da);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), 9, 5);
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

function ciuffo(c: THREE.Vector3, r: number, caso: () => number) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.8 + caso() * 0.4);
    pos.setXYZ(i, v.x, v.y * 0.62, v.z);
  }
  g.translate(c.x, c.y, c.z);
  return g;
}

/**
 * Un ulivo vecchio: tronco corto e attorto che si apre in tre branche, chioma a ciuffi.
 * Alto circa 2,3 unità; restituisce le geometrie del legno e delle fronde, e i centri dei ciuffi.
 */
export function costruisciUlivo(seme = 4242) {
  const caso = generatore(seme);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const legno: THREE.BufferGeometry[] = [];
  const nodi = [V(0, 0, 0), V(0.08, 0.35, 0.03), V(-0.05, 0.62, 0.06)];
  legno.push(ramo(nodi[0], nodi[1], 0.24, 0.19, caso), ramo(nodi[1], nodi[2], 0.19, 0.16, caso));
  legno.push(new THREE.SphereGeometry(0.28, 12, 8).scale(1.1, 0.4, 1).translate(0, 0.02, 0));
  // le branche e le punte variano un poco col seme: ogni albero è diverso
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
    legno.push(ramo(branche[[0, 0, 0, 1, 1, 2, 2, 3, 0][i]][1], p, 0.065, 0.032, caso));
    centri.push(p);
  });
  const legnoGeo = mergeGeometries(legno);
  legno.forEach((g) => g.dispose());
  const chioma: THREE.BufferGeometry[] = [];
  centri.forEach((c) => chioma.push(ciuffo(c, 0.42 + caso() * 0.12, caso), ciuffo(c.clone().add(new THREE.Vector3((caso() - 0.5) * 0.5, 0.12, (caso() - 0.5) * 0.4)), 0.3, caso)));
  const frondeGeo = mergeGeometries(chioma);
  chioma.forEach((g) => g.dispose());
  return { legnoGeo, frondeGeo, centri };
}

/**
 * La versione notturna di una geometria: colori cotti come da faretti a terra.
 * Più luce in basso e sulle facce rivolte in giù, il colore suo scaldato; in alto si perde nel buio.
 */
export function accesaDaSotto(g: THREE.BufferGeometry, colore: THREE.ColorRepresentation, alto: number, forza = 1) {
  const geo = g.index ? g.toNonIndexed() : g.clone();
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
  const base = new THREE.Color(colore), c = new THREE.Color();
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = THREE.MathUtils.clamp(pos.getY(i) / alto, 0, 1);
    const k = 0.75 * Math.pow(1 - h, 1.4) + 0.55 * Math.max(0, -nor.getY(i)) + 0.12;
    c.copy(base).multiplyScalar((0.1 + 1.25 * k) * forza).lerp(CALDA, 0.28 * k * forza);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

type Oliva = { su: THREE.Vector3; giu: THREE.Vector3; ritardo: number; matura: number };
type Persona = { g: THREE.Group; braccia: THREE.Group[]; gambe: THREE.Group[]; pertica?: THREE.Object3D };

export class Ulivo {
  gruppo = new THREE.Group();
  /** La scritta: la sola cosa che risponde al puntatore. */
  cartello: THREE.Mesh;
  private scritta: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private testo = "";
  private sopra = false;
  private gonfio = 1;
  private filo: THREE.Line;
  /** L'albero, che cresce: scalato tutto insieme dal colletto. */
  private albero = new THREE.Group();
  private giorno = new THREE.Group();
  private notte = new THREE.Group();
  private tutore: THREE.Mesh;
  private olive: THREE.InstancedMesh;
  private dati: Oliva[] = [];
  private reti: THREE.Mesh[] = [];
  private cassette: THREE.Group[] = [];
  private persone = new THREE.Group();
  private abbacchiatori: Persona[] = [];
  private raccoglitore: Persona;
  private triciclo = new THREE.Group();
  private ruoteTriciclo: THREE.Object3D[] = [];
  private pedali: THREE.Group[] = [];
  private carro = new THREE.Group();
  private ruoteCarro: THREE.Object3D[] = [];
  private zampe: THREE.Group[] = [];
  private coni: THREE.Mesh[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  private texture: THREE.Texture[] = [];
  private eNotte = false;

  constructor(notte: boolean) {
    const caso = generatore(4242);
    this.gruppo.position.set(Math.sin(ANGOLO) * DISTANZA, PELO_ACQUA, -Math.cos(ANGOLO) * DISTANZA);
    this.gruppo.rotation.y = Math.PI - ANGOLO;
    this.gruppo.scale.setScalar(SCALA);

    // la terra rossa sotto l'albero, piatta, e la trazzera chiara su cui passa la gente
    const terra = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(2.4, 1, 1.6).translate(0.6, 0.012, -0.2), stoffa("#8E5638", { roughness: 1 }));
    const strada = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.6).rotateX(-Math.PI / 2).translate(2.2, 0.008, STRADA_Z), stoffa("#C8B48C", { roughness: 1 }));
    this.gruppo.add(terra, strada);
    // i muretti a secco ai lati della trazzera: pietre chiare in fila
    const pietre: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 70; i++) {
      const x = -4 + i * 0.19 + caso() * 0.05;
      pietre.push(new THREE.DodecahedronGeometry(0.08 + caso() * 0.03, 0).scale(1.3, 0.8, 1).translate(x, 0.07 + (i % 3) * 0.05, STRADA_Z - 0.42));
    }
    const muretto = new THREE.Mesh(mergeGeometries(pietre), stoffa("#D2C7B0", { flatShading: true }));
    pietre.forEach((p) => p.dispose());
    this.gruppo.add(muretto);

    // l'albero, costruito grande, poi scalato dalla crescita
    const { legnoGeo, frondeGeo, centri } = costruisciUlivo();
    const ALTO = 2.3;
    // di giorno: materiali illuminati dalla scena, verde oliva sopra e argento sotto
    this.giorno.add(new THREE.Mesh(legnoGeo, stoffa("#6A5E50", { roughness: 1, flatShading: true })));
    this.giorno.add(new THREE.Mesh(frondeGeo, stoffa("#7F8C62", { flatShading: true, roughness: 0.9 })));
    const argento = frondeGeo.clone().scale(1.015, 0.96, 1.015);
    this.giorno.add(new THREE.Mesh(argento, stoffa("#B7BEA3", { flatShading: true, transparent: true, opacity: 0.6 })));
    // di notte: gli stessi pezzi coi colori dei faretti
    this.notte.add(accesaDaSotto(legnoGeo, "#8A7A66", ALTO), accesaDaSotto(frondeGeo, "#8C9A6C", ALTO));
    this.albero.add(this.giorno, this.notte);
    // il palo dell'alberello, legato al fusto finché è giovane
    this.tutore = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.2, 6).translate(0.12, 0.6, -0.05), stoffa("#B59A6E"));
    this.albero.add(this.tutore);

    // le olive, appese alla chioma; ognuna ha il suo posto sulla rete
    const N = 90;
    this.olive = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.25, 1), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
    for (let i = 0; i < N; i++) {
      const c = centri[i % centri.length];
      const a = caso() * Math.PI * 2;
      const su = c.clone().add(new THREE.Vector3(Math.cos(a) * (0.25 + caso() * 0.25), -0.12 - caso() * 0.12, Math.sin(a) * (0.2 + caso() * 0.25)));
      this.dati.push({ su, giu: new THREE.Vector3(0.1 + caso() * 1.7, 0.05, -0.9 + caso() * 1.2), ritardo: caso(), matura: caso() });
    }
    this.olive.frustumCulled = false;
    this.albero.add(this.olive);
    this.gruppo.add(this.albero);

    // i faretti a terra: tre lampade incassate, e i loro coni di luce che salgono nella chioma
    const cono = tela(64, 256, (x) => {
      const g = x.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, "rgba(255,214,150,0.3)");
      g.addColorStop(0.6, "rgba(255,214,150,0.06)");
      g.addColorStop(1, "rgba(255,214,150,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 256);
    });
    this.texture.push(cono);
    [[0.75, -0.55, -0.35], [-0.6, -0.5, 0.3], [0.2, 0.6, 0.05]].forEach(([x, z, inclina]) => {
      const lampada = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 12).translate(x, 0.03, z), stoffa("#2A2A2C", { metalness: 0.5 }));
      const vetro = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12).rotateX(-Math.PI / 2).translate(x, 0.062, z), new THREE.MeshBasicMaterial({ color: "#FFE2B0" }));
      const fascio = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.06, 2.4, 20, 1, true).translate(0, 1.2, 0),
        new THREE.MeshBasicMaterial({ map: cono, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
      );
      fascio.position.set(x, 0.06, z);
      fascio.rotation.z = inclina;
      fascio.rotation.x = -z * 0.25;
      this.coni.push(fascio);
      this.gruppo.add(lampada, vetro, fascio);
    });

    // le reti verdi, stese sotto l'albero dalla parte scoperta
    [0.35, 1.3].forEach((cx) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9).rotateX(-Math.PI / 2).translate(0, 0.02, -0.25), stoffa("#3E7A4C", { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      r.position.x = cx;
      this.reti.push(r);
      this.gruppo.add(r);
    });
    // le cassette
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Group();
      const chiaro = stoffa("#B88A55");
      for (const [l, a, p, x, y, z] of [[0.36, 0.02, 0.26, 0, 0, 0], [0.36, 0.12, 0.02, 0, 0.06, 0.12], [0.36, 0.12, 0.02, 0, 0.06, -0.12], [0.02, 0.12, 0.26, 0.17, 0.06, 0], [0.02, 0.12, 0.26, -0.17, 0.06, 0]] as const)
        c.add(new THREE.Mesh(new THREE.BoxGeometry(l, a, p).translate(x, y, z), chiaro));
      const carico = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.22).translate(0, 0.05, 0), stoffa("#2B2230", { roughness: 0.5 }));
      carico.name = "carico";
      c.add(carico);
      this.cassette.push(c);
      this.persone.add(c);
    }

    // le persone
    const persona = (camicia: string, pantaloni: string, cappello?: string, alta = 1): Persona => {
      const g = new THREE.Group();
      const p = stoffa(pantaloni);
      const gambe = [-1, 1].map((sx) => {
        const gm = arto(p, 0.04, 0.38);
        gm.position.set(sx * 0.055, 0.44, 0);
        g.add(gm);
        return gm;
      });
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 3, 8).translate(0, 0.6, 0), stoffa(camicia)));
      const t = testa("#2A1F18", cappello);
      t.position.y = 0.88;
      g.add(t);
      const braccia = [-1, 1].map((sx) => {
        const b = arto(stoffa(camicia), 0.026, 0.26);
        b.position.set(sx * 0.12, 0.74, 0);
        g.add(b);
        return b;
      });
      g.scale.setScalar(alta);
      this.persone.add(g);
      return { g, braccia, gambe };
    };
    for (const [camicia, cappello] of [["#C9B48A", "#3B3A38"], ["#7E93A6", undefined]] as const) {
      const p = persona(camicia, "#3D4049", cappello);
      const pertica = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 2.0, 6).translate(0, 1.0, 0), stoffa("#A78B62"));
      pertica.position.set(0, 0.68, 0.18);
      p.g.add(pertica);
      p.pertica = pertica;
      this.abbacchiatori.push(p);
    }
    this.raccoglitore = persona("#E7E1D3", "#4A4238", "#7A5A3A");

    // il bambino sul triciclo: rosso, con la ruota grande davanti; va verso −x
    {
      const rosso = stoffa("#C2332B", { roughness: 0.5 });
      const nero = stoffa("#1E1E22");
      const ruota = (r: number) => {
        const w = new THREE.Group();
        w.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 18), nero));
        w.add(new THREE.Mesh(new THREE.BoxGeometry(r * 1.9, 0.012, 0.012), stoffa("#BFC3C8")));
        return w;
      };
      const davanti = ruota(0.16);
      davanti.position.set(-0.3, 0.16, 0);
      const dietro = [-1, 1].map((sz) => {
        const w = ruota(0.09);
        w.position.set(0.18, 0.09, sz * 0.13);
        return w;
      });
      this.ruoteTriciclo.push(davanti, ...dietro);
      this.triciclo.add(davanti, ...dietro);
      this.triciclo.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03).translate(-0.05, 0.2, 0), rosso));
      this.triciclo.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.3).translate(0.18, 0.09, 0), rosso));
      this.triciclo.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03).translate(-0.3, 0.3, 0), rosso));
      this.triciclo.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.22).translate(-0.28, 0.42, 0), nero));
      this.triciclo.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.12).translate(0.05, 0.27, 0), nero));
      // il bambino: piccolo, maglietta gialla
      const bimbo = new THREE.Group();
      bimbo.position.set(0.05, 0.28, 0);
      bimbo.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.14, 3, 8).translate(0, 0.14, 0), stoffa("#E3B23C")));
      const tb = testa("#5A3A22");
      tb.scale.setScalar(0.85);
      tb.position.set(0, 0.34, 0);
      bimbo.add(tb);
      for (const sz of [-1, 1]) {
        const b = arto(stoffa("#E3B23C"), 0.02, 0.17);
        b.position.set(-0.03, 0.22, sz * 0.07);
        b.rotation.z = -1.2;
        bimbo.add(b);
        const gamba = arto(stoffa("#2F4A7A"), 0.026, 0.2);
        gamba.position.set(-0.02, 0.02, sz * 0.045);
        bimbo.add(gamba);
        this.pedali.push(gamba);
      }
      this.triciclo.add(bimbo);
      this.triciclo.rotation.y = 0;
      this.persone.add(this.triciclo);
    }

    // il carro coi buoi: due buoi bianchi aggiogati, il carro dipinto, il carrettiere seduto; va verso −x
    {
      const bue = stoffa("#E6DED0");
      const corna = stoffa("#D9C9A3");
      const muso = stoffa("#3A332E");
      [-0.2, 0.2].forEach((z) => {
        const b = new THREE.Group();
        b.position.set(-1.0, 0, z);
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.22).translate(0, 0.42, 0), bue));
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.16).translate(-0.38, 0.5, 0), bue));
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.12).translate(-0.49, 0.46, 0), muso));
        for (const sz of [-1, 1]) b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.16, 5).rotateX(sz * 1.0).translate(-0.36, 0.64, sz * 0.1), corna));
        for (const [lx, lz] of [[-0.24, -0.07], [-0.24, 0.07], [0.24, -0.07], [0.24, 0.07]]) {
          const z2 = arto(bue, 0.035, 0.26);
          z2.position.set(lx, 0.3, lz);
          b.add(z2);
          this.zampe.push(z2);
        }
        this.carro.add(b);
      });
      const legnoScuro = stoffa("#6B4A2E");
      this.carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.62).translate(-1.3, 0.62, 0), legnoScuro)); // il giogo
      this.carro.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.04).translate(-0.55, 0.5, 0), legnoScuro)); // il timone
      // il carro: cassa gialla coi fianchi rossi, ruote gialle a raggi rossi
      const giallo = stoffa("#E2B53A"), rossoCarro = stoffa("#B8322A");
      this.carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.5).translate(0.25, 0.5, 0), giallo));
      for (const sz of [-1, 1]) this.carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.03).translate(0.25, 0.62, sz * 0.25), rossoCarro));
      this.carro.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.5).translate(0.64, 0.62, 0), rossoCarro));
      // il carico: un mucchio di fieno
      this.carro.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.7, 0.8).translate(0.3, 0.55, 0), stoffa("#D8BE6A", { flatShading: true })));
      for (const sz of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(0.25, 0.3, sz * 0.3);
        w.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 24), giallo));
        for (let k = 0; k < 6; k++) w.add(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.02, 0.02).rotateZ((k * Math.PI) / 6), rossoCarro));
        this.ruoteCarro.push(w);
        this.carro.add(w);
      }
      // il carrettiere, seduto sul davanti, col bastone
      const c = new THREE.Group();
      c.position.set(-0.1, 0.52, 0);
      c.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 8).translate(0, 0.2, 0), stoffa("#4D4A44")));
      const tc = testa("#2A1F18", "#2E2C2A");
      tc.position.y = 0.44;
      c.add(tc);
      const bastone = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 5).rotateZ(1.0).translate(-0.3, 0.42, 0.08), stoffa("#8A6A44"));
      c.add(bastone);
      this.carro.add(c);
      this.persone.add(this.carro);
    }
    this.gruppo.add(this.persone);

    // la scritta, alta nel cielo fra le carte, e il filo di luce che la lega all'albero
    const cv = document.createElement("canvas");
    cv.width = 768;
    cv.height = 160;
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(tx);
    this.scritta = { x: cv.getContext("2d") as CanvasRenderingContext2D, t: tx };
    this.cartello = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0 * (160 / 768)),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    );
    this.cartello.position.set(0, 10, -0.4);
    this.cartello.rotation.y = Math.PI;
    this.cartello.renderOrder = 10;
    this.cartello.userData.olio = true;
    this.gruppo.add(this.cartello);
    this.filo = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 9.55, -0.4), new THREE.Vector3(0, 2.6, -0.4)]),
      new THREE.LineBasicMaterial({ color: "#C9B45A", transparent: true, opacity: 0.45, depthWrite: false, fog: false })
    );
    this.gruppo.add(this.filo);

    this.gruppo.traverse((o) => {
      o.frustumCulled = false;
      if (o !== this.cartello) o.raycast = () => undefined;
    });
    this.setNotte(notte);
  }

  setTesto(testo: string) {
    if (testo === this.testo) return;
    this.testo = testo;
    const { x, t } = this.scritta;
    x.clearRect(0, 0, 768, 160);
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim() || "Georgia, serif";
    x.fillStyle = "rgba(16,16,10,0.88)";
    x.beginPath();
    x.roundRect(6, 10, 756, 140, 34);
    x.fill();
    x.strokeStyle = "#B9A84E";
    x.lineWidth = 4;
    x.stroke();
    x.save();
    x.translate(86, 80);
    x.rotate(-0.6);
    x.fillStyle = "#AEB58A";
    x.beginPath();
    x.ellipse(0, -8, 9, 30, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
    x.fillStyle = "#4A3A4E";
    x.beginPath();
    x.ellipse(98, 92, 11, 14, 0.3, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#FFFFFF";
    x.font = `300 58px ${serif}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(testo, 430, 84, 560);
    t.needsUpdate = true;
  }

  evidenzia(si: boolean) {
    this.sopra = si;
  }

  setNotte(notte: boolean) {
    this.eNotte = notte;
    this.giorno.visible = !notte;
    this.notte.visible = notte;
    this.coni.forEach((c) => (c.visible = notte));
    this.persone.visible = !notte;
    this.reti.forEach((r) => (r.visible = !notte));
  }

  aggiorna(t: number, ridotto: boolean) {
    const meta = this.sopra ? 1.1 : ridotto ? 1 : 1 + 0.035 * Math.sin(t * 3.2 + 1);
    this.gonfio += (meta - this.gonfio) * 0.2;
    this.cartello.scale.setScalar((this.gonfio * 0.8) / SCALA);
    (this.filo.material as THREE.LineBasicMaterial).opacity = (this.eNotte ? 0.6 : 0.45) * (0.85 + 0.15 * Math.sin(t * 1.7));

    // di notte e con "riduci movimento": l'albero adulto, carico, fermo
    const e = ridotto || this.eNotte ? 40 : t % CICLO;
    const notte = this.eNotte;

    // la crescita: da alberello a pianta in venti secondi, poi un poco a ogni raccolta; alla fine si dissolve
    const crescita = 0.12 + 0.88 * fra(e, 2, 20) + 0.1 * fra(e, 37, 43) + 0.1 * fra(e, 59, 65);
    const fine = 1 - fra(e, 80.5, 83.5);
    const nasce = fra(e, 0, 1.5);
    this.albero.scale.set(crescita * fine * nasce + 0.0001, crescita * fine * nasce + 0.0001, crescita * fine * nasce + 0.0001);
    this.tutore.visible = crescita < 0.6;

    // in quale raccolta siamo, e quanto ci siamo dentro
    const giro = RACCOLTE.findIndex(([a, b]) => e >= a - 8 && e < b + 2);
    const [a, b] = giro >= 0 ? RACCOLTE[giro] : [-100, -100];
    // le olive: allegano nelle otto ore prima della raccolta, maturano verdi poi nere, cadono, restano sulla rete, spariscono
    this.dati.forEach((o, i) => {
      let vis = 0;
      let pos = o.su;
      if (giro >= 0) {
        vis = fra(e, a - 8, a - 5);
        const cade = a + 3 + o.ritardo * (b - a - 7);
        if (e > cade) {
          const k = Math.min(1, (e - cade) / 0.5);
          // il punto a terra, nelle coordinate dell'albero che cresce
          this.v.copy(o.giu).divideScalar(Math.max(0.01, crescita)).sub(o.su).multiplyScalar(k * k).add(o.su);
          pos = this.v;
          if (k >= 1) vis *= 1 - fra(e, b - 3, b - 1.5);
        }
      }
      this.s.setScalar(Math.max(0.0001, vis));
      this.m.compose(pos, this.q, this.s);
      this.olive.setMatrixAt(i, this.m);
      const nero = giro >= 0 ? fra(e, a - 5 + o.matura * 2, a + 1) : 0;
      this.col.set("#7C8A3C").lerp(new THREE.Color(o.matura > 0.6 ? "#3A2238" : "#21181E"), nero);
      this.olive.setColorAt(i, this.col);
    });
    this.olive.instanceMatrix.needsUpdate = true;
    if (this.olive.instanceColor) this.olive.instanceColor.needsUpdate = true;
    if (notte) return;

    // il bambino in triciclo (4–13) e il carro coi buoi (11–22): passano sulla trazzera, da sinistra verso il varco
    const passa = (g: THREE.Group, da: number, a2: number, x0: number, x1: number) => {
      const k = (e - da) / (a2 - da);
      g.visible = k > 0 && k < 1;
      g.position.set(THREE.MathUtils.lerp(x0, x1, k), 0, STRADA_Z);
      return k;
    };
    const kt = passa(this.triciclo, 4, 13, 7, -3);
    this.ruoteTriciclo.forEach((w, i) => (w.rotation.z = kt * (i ? 40 : 22)));
    this.pedali.forEach((p, i) => (p.rotation.z = Math.sin(kt * 22 + i * Math.PI) * 0.6 - 0.4));
    this.triciclo.position.y = Math.abs(Math.sin(kt * 60)) * 0.01;
    const kc = passa(this.carro, 11, 22, 7.5, -3.5);
    this.ruoteCarro.forEach((w) => (w.rotation.z = kc * 22));
    this.zampe.forEach((z, i) => (z.rotation.z = Math.sin(kc * 70 + (i % 4 < 2 ? 0 : Math.PI) + (i % 2) * 0.5) * 0.35));

    // la raccolta: reti stese, due battono i rami con la pertica, uno raccoglie nelle cassette e le porta via
    const lavoro = giro >= 0 ? fra(e, a - 0.5, a + 2) * (1 - fra(e, b - 1.5, b + 1)) : 0;
    const reti = giro >= 0 ? fra(e, a + 0.5, a + 2.5) * (1 - fra(e, b - 3, b - 1.5)) : 0;
    this.reti.forEach((r) => {
      r.visible = reti > 0.01;
      r.scale.set(1, 1, Math.max(0.001, reti));
    });
    const ENTRATA = 4.5;
    const posti: [number, number][] = [[0.75, -0.75], [1.45, -0.35]];
    this.abbacchiatori.forEach((p, k) => {
      const [x, z] = posti[k];
      p.g.visible = lavoro > 0.01;
      const cammina = lavoro > 0.02 && lavoro < 0.98;
      p.g.position.set(THREE.MathUtils.lerp(ENTRATA + k * 0.6, x, lavoro), 0, THREE.MathUtils.lerp(STRADA_Z, z, lavoro));
      p.g.rotation.y = cammina ? -Math.PI / 2 : Math.atan2(-x, -z);
      p.gambe.forEach((g, j) => (g.rotation.x = cammina ? Math.sin(t * 9 + j * Math.PI) * 0.5 : 0));
      const batte = !cammina && lavoro > 0.5 && e > a + 3 && e < b - 3 ? Math.pow(Math.abs(Math.sin(t * 3.4 + k * 1.3)), 4) : 0;
      if (p.pertica) {
        p.pertica.visible = !cammina;
        p.pertica.rotation.x = 0.5 + batte * 0.35;
      }
      p.braccia.forEach((br) => (br.rotation.x = cammina ? 0 : -1.4 - batte * 0.3));
    });
    // chi raccoglie: in ginocchio sulla rete, poi via con le cassette
    const r = this.raccoglitore;
    const via = giro >= 0 ? fra(e, b - 3, b + 1) : 0;
    const arriva = giro >= 0 ? fra(e, a + 1, a + 4) : 0;
    r.g.visible = arriva > 0.01 && via < 0.99;
    const accucciato = arriva > 0.98 && via < 0.01;
    const xr = via > 0 ? THREE.MathUtils.lerp(1.1, ENTRATA, via) : THREE.MathUtils.lerp(ENTRATA, 1.1, arriva);
    const zr = via > 0 ? THREE.MathUtils.lerp(-1.0, STRADA_Z, via) : THREE.MathUtils.lerp(STRADA_Z, -1.0, arriva);
    r.g.position.set(xr, 0, zr);
    r.g.rotation.y = via > 0 ? Math.PI / 2 : accucciato ? 0.8 : -Math.PI / 2;
    r.g.scale.y = accucciato ? 0.66 : 1;
    r.gambe.forEach((g, j) => (g.rotation.x = accucciato ? 0 : Math.sin(t * 9 + j * Math.PI) * 0.5));
    r.braccia.forEach((br, k) => br.rotation.set(accucciato ? -1.2 + Math.sin(t * 4 + k) * 0.4 : via > 0 ? -1.3 : 0, 0, 0));
    const piene = giro >= 0 ? fra(e, a + 5, b - 4) : 0;
    this.cassette.forEach((c, k) => {
      const vis = giro >= 0 ? fra(e, a + 3.5, a + 4.5) * (1 - fra(e, b + 0.6, b + 1)) : 0;
      c.visible = vis > 0.01;
      c.scale.setScalar(Math.max(0.001, vis));
      (c.getObjectByName("carico") as THREE.Mesh).scale.y = Math.max(0.001, fra(piene, k * 0.5, k * 0.5 + 0.5));
      if (via > 0) {
        c.position.copy(r.g.position).add(this.v.set(0, 0.62 + k * 0.13, 0.15));
        c.rotation.y = r.g.rotation.y;
      } else {
        c.position.set(1.5 + k * 0.36, 0, -1.05);
        c.rotation.y = 0.2;
      }
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
