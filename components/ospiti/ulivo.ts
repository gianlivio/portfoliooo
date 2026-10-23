import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANGOLO_ZONA } from "../zona";
import { PELO_ACQUA } from "../condivisi";
import { fra, generatore, liberaTutto } from "./comuni";

/*
 * L'ulivo fra le carte: un diorama sul pavimento, davanti al varco fra la prima carta e la seconda, come il tempio.
 * Un ulivo vecchio dal tronco attorto, su un rialzo di terra rossa. Di giorno ci lavorano le persone,
 * e in un minuto passa un anno: si stendono le reti, si abbacchia e si pettina, le olive cadono, si raccolgono
 * nelle cassette e si portano via; poi si pota, i rami tagliati finiscono in una fascina; l'albero ributta,
 * fiorisce, allega, e le olive tornano a maturare. Di notte resta l'albero, senza persone.
 * Sopra, una scritta che si clicca come quella della musica: porta alla pagina dell'olio.
 * In queste coordinate +z va lontano da chi guarda, −z verso il centro.
 */

/** Dove sta: sul pavimento davanti al varco fra il primo e il secondo posto dopo la zona, piccolo come il tempio. */
// un poco verso la prima carta: sotto il suo angolo, che è alto, l'albero non copre i titoli
const ANGOLO = ANGOLO_ZONA + (Math.PI * 2 / 13) * 1.5 - 0.08;
const DISTANZA = 3.1;
/** Un diorama: l'albero resta sotto il bordo basso delle carte, le persone si vedono intere. */
const SCALA = 0.3;
const CICLO = 60;

const stoffa = (colore: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: colore, roughness: 0.85, ...extra });
const PELLE = "#C9936C";
const LUNA = new THREE.Color("#5A6C90");

/** Un pezzo appeso a un perno: il gruppo ruota attorno al perno, il pezzo pende verso il basso per "lungo". */
function arto(materiale: THREE.Material, raggio: number, lungo: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(raggio, lungo, 3, 8).translate(0, -lungo / 2, 0), materiale));
  return g;
}

function testa(capelli: string, cappello?: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), stoffa(PELLE)));
  if (cappello) {
    // la coppola, o il fazzoletto
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.08, 0.05, 14).translate(0, 0.055, 0), stoffa(cappello)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.06).translate(0, 0.035, -0.08), stoffa(cappello)));
  } else g.add(new THREE.Mesh(new THREE.SphereGeometry(0.076, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.5), stoffa(capelli)));
  return g;
}

/** Un ramo fra due punti: un cilindro rastremato, nodoso. */
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

/** Un ciuffo di chioma: un icosaedro schiacciato e smosso. */
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

/** La quota del rialzo di terra in un punto (senza le piccole onde). */
const quota = (x: number, z: number) => 0.34 * (1 - THREE.MathUtils.smoothstep(Math.hypot(x, z) / 2.4, 0.45, 1)) - 0.04;
/** Dove si lavora: sul lato sinistro dell'albero per chi guarda (+x qui), che resta scoperto sotto la prima carta. */
const ENTRATA = new THREE.Vector3(2.9, 0, -1.3);
const FASCINA = new THREE.Vector3(1.95, 0, -0.3);
const SCALA_A = new THREE.Vector3(0.48, 0, -0.55);
/** L'angolo per guardare il tronco da (x, z): le figure hanno il davanti verso +z. */
const versoTronco = (x: number, z: number) => Math.atan2(-x, -z);

type Oliva = { su: THREE.Vector3; giu: THREE.Vector3; cade: number; matura: number };
type Persona = { g: THREE.Group; braccia: THREE.Group[]; attrezzo?: THREE.Object3D };
type Taglio = { g: THREE.Group; perno: THREE.Vector3; cade: number; terra: THREE.Vector3; giro: THREE.Vector3 };

export class Ulivo {
  gruppo = new THREE.Group();
  /** La scritta: la sola cosa che risponde al puntatore. */
  cartello: THREE.Mesh;
  private scritta: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private testo = "";
  private sopra = false;
  private gonfio = 1;
  private persone = new THREE.Group();
  private olive: THREE.InstancedMesh;
  private dati: Oliva[] = [];
  private reti: THREE.Mesh[] = [];
  private cassette: THREE.Group[] = [];
  private tagli: Taglio[] = [];
  private fascina = new THREE.Group();
  private fiori: THREE.Points;
  private abbacchiatori: Persona[] = [];
  private scala = new THREE.Group();
  private sullaScala: Persona;
  private raccoglitore: Persona;
  private potatore: Persona;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  private texture: THREE.Texture[] = [];
  private notte = false;
  private legno!: THREE.Material;
  /** I materiali dell'albero e della terra: di notte prendono un poco di luce di luna. */
  private lunari: THREE.MeshStandardMaterial[] = [];

  constructor(notte: boolean) {
    const caso = generatore(4242);
    this.gruppo.position.set(Math.sin(ANGOLO) * DISTANZA, PELO_ACQUA, -Math.cos(ANGOLO) * DISTANZA);
    this.gruppo.rotation.y = Math.PI - ANGOLO;
    this.gruppo.scale.setScalar(SCALA);

    // il rialzo di terra rossa, con qualche sasso
    const terra = new THREE.CircleGeometry(2.4, 48, 0, Math.PI * 2).rotateX(-Math.PI / 2);
    {
      const p = terra.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i)) / 2.4;
        p.setY(i, 0.34 * (1 - THREE.MathUtils.smoothstep(r, 0.45, 1)) - 0.04 + 0.03 * Math.sin(p.getX(i) * 5 + p.getZ(i) * 3));
      }
      terra.computeVertexNormals();
    }
    this.gruppo.add(new THREE.Mesh(terra, stoffa("#8E5638", { roughness: 1 })));
    const sassi: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const a = caso() * Math.PI * 2, r = 1.2 + caso() * 0.9;
      sassi.push(new THREE.DodecahedronGeometry(0.05 + caso() * 0.07, 0).scale(1, 0.6, 1).translate(Math.cos(a) * r, 0.12 * (1 - r / 2.4) + 0.02, Math.sin(a) * r));
    }
    this.gruppo.add(new THREE.Mesh(mergeGeometries(sassi), stoffa("#CFC6B4")));
    sassi.forEach((s) => s.dispose());

    // il tronco: corto, grosso, attorto, che si apre in tre branche
    const Y = 0.3;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, Y + y, z);
    const legno: THREE.BufferGeometry[] = [];
    const nodi = [V(0, 0, 0), V(0.08, 0.35, 0.03), V(-0.05, 0.62, 0.06)];
    legno.push(ramo(nodi[0], nodi[1], 0.26, 0.2, caso), ramo(nodi[1], nodi[2], 0.2, 0.17, caso));
    legno.push(new THREE.SphereGeometry(0.3, 12, 8).scale(1.1, 0.45, 1).translate(0, Y + 0.02, 0)); // il ceppo
    const branche: [THREE.Vector3, THREE.Vector3][] = [
      [nodi[2], V(-0.62, 1.12, 0.12)],
      [nodi[2], V(0.6, 1.18, -0.08)],
      [nodi[2], V(0.08, 1.3, 0.42)],
      [nodi[1], V(0.42, 0.85, 0.3)],
    ];
    branche.forEach(([a, b]) => legno.push(ramo(a, b, 0.13, 0.08, caso)));
    // i rami fini verso la chioma
    const centri: THREE.Vector3[] = [];
    const punte = [V(-1.05, 1.5, 0.05), V(-0.55, 1.75, -0.25), V(-0.35, 1.6, 0.5), V(0.95, 1.55, -0.2), V(0.55, 1.85, 0.2), V(0.2, 1.95, -0.15), V(0.15, 1.7, 0.75), V(0.85, 1.25, 0.55), V(-0.75, 1.3, -0.45)];
    punte.forEach((p, i) => {
      const da = branche[[0, 0, 0, 1, 1, 2, 2, 3, 0][i]][1];
      legno.push(ramo(da, p, 0.07, 0.035, caso));
      centri.push(p);
    });
    this.legno = stoffa("#6A5E50", { roughness: 1, flatShading: true });
    const tronco = new THREE.Mesh(mergeGeometries(legno), this.legno);
    legno.forEach((g) => g.dispose());
    this.gruppo.add(tronco);

    // la chioma: ciuffi verde oliva sopra, argentei sotto; quattro sono rami che si potano, a parte
    const POTATI = [0, 3, 6, 8];
    const chioma: THREE.BufferGeometry[] = [];
    const verde = stoffa("#7F8C62", { flatShading: true, roughness: 0.9 });
    centri.forEach((c, i) => {
      const pezzi = [ciuffo(c, 0.42 + caso() * 0.12, caso), ciuffo(c.clone().add(new THREE.Vector3((caso() - 0.5) * 0.5, 0.12, (caso() - 0.5) * 0.4)), 0.3, caso)];
      if (POTATI.includes(i)) {
        // un ramo da potare: col suo pezzo di legno, che cade intero
        const g = new THREE.Group();
        const perno = branche[[0, 0, 0, 1, 1, 2, 2, 3, 0][i]][1].clone().lerp(c, 0.35);
        g.position.copy(perno);
        const ramoGeo = ramo(perno, c, 0.05, 0.03, caso).translate(-perno.x, -perno.y, -perno.z);
        g.add(new THREE.Mesh(ramoGeo, tronco.material));
        const foglie = mergeGeometries(pezzi).translate(-perno.x, -perno.y, -perno.z);
        pezzi.forEach((p) => p.dispose());
        g.add(new THREE.Mesh(foglie, verde));
        this.gruppo.add(g);
        const a = caso() * Math.PI * 2;
        this.tagli.push({ g, perno, cade: 0, terra: new THREE.Vector3(0.7 + Math.cos(a) * 0.35, quota(0.9, -0.4) + 0.06, -0.4 + Math.sin(a) * 0.3), giro: new THREE.Vector3(caso() - 0.5, 0, caso() - 0.5).normalize() });
      } else chioma.push(...pezzi);
    });
    const fronde = mergeGeometries(chioma);
    chioma.forEach((p) => p.dispose());
    this.gruppo.add(new THREE.Mesh(fronde, verde));
    // il rovescio delle foglie: un velo d'argento sotto la chioma
    const argento = fronde.clone();
    argento.scale(1.015, 0.96, 1.015);
    this.gruppo.add(new THREE.Mesh(argento, stoffa("#B7BEA3", { flatShading: true, transparent: true, opacity: 0.6 })));

    // le olive: sulla parte bassa dei ciuffi; ognuna ha il suo posto a terra, sulla rete
    const N = 110;
    this.olive = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 8, 6).scale(1, 1.25, 1), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
    for (let i = 0; i < N; i++) {
      const c = centri[i % centri.length];
      const a = caso() * Math.PI * 2;
      const su = c.clone().add(new THREE.Vector3(Math.cos(a) * (0.25 + caso() * 0.25), -0.12 - caso() * 0.12, Math.sin(a) * (0.2 + caso() * 0.25)));
      const gx = 0.0 + caso() * 1.9, gz = -1.05 + caso() * 1.5;
      this.dati.push({ su, giu: new THREE.Vector3(gx, quota(gx, gz) + 0.05, gz), cade: 7 + caso() * 15, matura: caso() });
    }
    this.gruppo.add(this.olive);

    // le reti verdi stese sotto l'albero
    [0.42, 1.52].forEach((cx) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.3, 8, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.2), stoffa("#3E7A4C", { side: THREE.DoubleSide, transparent: true, opacity: 0.88 }));
      const p = r.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        p.setY(i, quota(p.getX(i) + cx, p.getZ(i)) + 0.035);
      }
      r.position.x = cx;
      this.reti.push(r);
      this.gruppo.add(r);
    });

    // le cassette, che si riempiono e se ne vanno
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Group();
      const legnoChiaro = stoffa("#B88A55");
      for (const [l, a, p, x, y, z] of [[0.36, 0.02, 0.26, 0, 0, 0], [0.36, 0.12, 0.02, 0, 0.06, 0.12], [0.36, 0.12, 0.02, 0, 0.06, -0.12], [0.02, 0.12, 0.26, 0.17, 0.06, 0], [0.02, 0.12, 0.26, -0.17, 0.06, 0]] as const)
        c.add(new THREE.Mesh(new THREE.BoxGeometry(l, a, p).translate(x, y, z), legnoChiaro));
      const carico = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.22).translate(0, 0.05, 0), stoffa("#2B2230", { roughness: 0.5 }));
      carico.name = "carico";
      c.add(carico);
      this.cassette.push(c);
      this.gruppo.add(c);
    }

    // i fiori di primavera: la mignola, puntini bianchi sulla chioma
    const fp: number[] = [];
    for (let i = 0; i < 160; i++) {
      const c = centri[i % centri.length];
      fp.push(c.x + (caso() - 0.5) * 0.8, c.y + (caso() - 0.5) * 0.4, c.z + (caso() - 0.5) * 0.7);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    this.fiori = new THREE.Points(fg, new THREE.PointsMaterial({ color: "#F4F0DC", size: 0.035, transparent: true, opacity: 0, depthWrite: false }));
    this.gruppo.add(this.fiori);

    // la fascina dei rami potati
    this.gruppo.add(this.fascina);

    // le persone
    const persona = (camicia: string, pantaloni: string, cappello?: string): Persona => {
      const g = new THREE.Group();
      const p = stoffa(pantaloni);
      for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.09).translate(sx * 0.055, 0.22, 0), p));
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
      this.persone.add(g);
      return { g, braccia };
    };
    // due con la pertica, a battere i rami
    for (const [camicia, cappello] of [["#C9B48A", "#3B3A38"], ["#7E93A6", undefined]] as const) {
      const p = persona(camicia, "#3D4049", cappello);
      const pertica = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 2.1, 6).translate(0, 1.05, 0), stoffa("#A78B62"));
      pertica.position.set(0, 0.68, 0.18);
      p.braccia.forEach((b) => (b.rotation.x = -1.1));
      p.g.add(pertica);
      p.attrezzo = pertica;
      this.abbacchiatori.push(p);
    }
    // la scala, e chi ci sta sopra: prima pettina i rami, poi pota
    const scala = stoffa("#9C7C55");
    for (const sx of [-1, 1]) this.scala.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.5, 0.03).translate(sx * 0.13, 0.75, 0), scala));
    for (let k = 0; k < 6; k++) this.scala.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.02).translate(0, 0.15 + k * 0.24, 0), scala));
    this.scala.rotation.x = 0.28;
    this.gruppo.add(this.scala);
    this.sullaScala = persona("#B0563A", "#2F3138");
    this.raccoglitore = persona("#E7E1D3", "#4A4238", "#7A5A3A");
    this.potatore = this.sullaScala;
    const sega = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.3).translate(0, 0, 0.15), stoffa("#9EA3A8", { metalness: 0.6, roughness: 0.4 }));
    sega.visible = false;
    this.sullaScala.braccia[1].add(sega);
    sega.position.y = -0.27;
    this.sullaScala.attrezzo = sega;
    this.gruppo.add(this.persone);

    // la scritta sopra l'albero
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(tx);
    this.scritta = { x: c.getContext("2d") as CanvasRenderingContext2D, t: tx };
    this.cartello = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0 * (160 / 768)),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    );
    this.cartello.position.set(0, Y + 2.5, -0.4);
    this.cartello.rotation.y = Math.PI;
    this.cartello.renderOrder = 10;
    this.cartello.userData.olio = true;
    this.gruppo.add(this.cartello);

    this.gruppo.traverse((o) => {
      if (o !== this.cartello) o.raycast = () => undefined;
      const m = (o as THREE.Mesh).material;
      // non le olive: il loro colore è per istanza, la luce propria le farebbe bianche
      if (m instanceof THREE.MeshStandardMaterial && o !== this.olive && !this.persone.getObjectById(o.id) && !this.lunari.includes(m)) this.lunari.push(m);
    });
    this.setNotte(notte);
  }

  /** Il testo della scritta, nella lingua della pagina. */
  setTesto(testo: string) {
    if (testo === this.testo) return;
    this.testo = testo;
    const { x, t } = this.scritta;
    x.clearRect(0, 0, 768, 160);
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim() || "Georgia, serif";
    // lo stesso bottone della musica: fascia scura, bordo sottile; qui il bordo è color olio
    x.fillStyle = "rgba(16,16,10,0.88)";
    x.beginPath();
    x.roundRect(6, 10, 756, 140, 34);
    x.fill();
    x.strokeStyle = "#B9A84E";
    x.lineWidth = 4;
    x.stroke();
    // il segno: una foglia d'ulivo e un'oliva
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
    this.notte = notte;
    this.lunari.forEach((m) => {
      // il colore suo, abbassato e velato d'azzurro: le foglie restano verdi, la terra rossa
      if (notte) m.emissive.copy(m.color).multiplyScalar(0.32).lerp(LUNA, 0.25);
      else m.emissive.set("#000000");
    });
    this.persone.visible = !notte;
    this.scala.visible = !notte;
    this.reti.forEach((r) => (r.visible = !notte));
    this.cassette.forEach((c) => (c.visible = !notte));
    this.fascina.visible = !notte;
  }

  aggiorna(t: number, ridotto: boolean) {
    // la scritta: sotto il puntatore si gonfia; altrimenti respira appena, per invitare al clic
    const meta = this.sopra ? 1.1 : ridotto ? 1 : 1 + 0.035 * Math.sin(t * 3.2 + 1);
    this.gonfio += (meta - this.gonfio) * 0.2;
    this.cartello.scale.setScalar((this.gonfio * 0.29) / SCALA);
    // con "riduci movimento" l'albero resta carico e fermo, all'inizio della raccolta
    const notte = this.notte;
    const e = ridotto || notte ? 4 : t % CICLO;

    // le stagioni: 0–4 si stendono le reti; 5–24 si raccoglie; 24–29 si porta via;
    // 30–46 si pota; 47–51 ributta; 51–55 fiorisce; 54–60 allega e matura
    const reti = fra(e, 1, 4) * (1 - fra(e, 24, 27));
    this.reti.forEach((r, k) => {
      r.scale.set(1, 1, Math.max(0.001, reti));
      r.position.z = (1 - reti) * (k ? 0.8 : -0.8);
      (r.material as THREE.MeshStandardMaterial).opacity = 0.88 * Math.min(1, reti * 3);
    });

    // le olive: allegano a fine ciclo, maturano dal verde al nero; nella raccolta cadono sulla rete
    const allega = fra(e, 54, 57.5);
    const nuove = e >= 50;
    this.dati.forEach((o, i) => {
      let vis = 1;
      let pos = o.su;
      let caduta = 0;
      if (nuove) vis = allega;
      else if (e > o.cade) {
        caduta = Math.min(1, (e - o.cade) / 0.55);
        const k = caduta * caduta;
        this.v.copy(o.su).lerp(o.giu, k);
        this.v.y = o.su.y + (o.giu.y - o.su.y) * k;
        pos = this.v;
        // sulla rete fino a quando la rete si raccoglie
        if (caduta >= 1) vis = 1 - fra(e, 22 + o.matura * 2, 25);
      }
      this.s.setScalar(Math.max(0.0001, vis * (nuove ? 0.6 + allega * 0.4 : 1)));
      this.m.compose(pos, this.q, this.s);
      this.olive.setMatrixAt(i, this.m);
      // il colore: di notte e nella raccolta sono già nere e violacee; quelle nuove verdi che virano
      const nero = nuove ? fra(e, 56.5 + o.matura * 1.5, 60) : 1;
      this.col.set("#7C8A3C").lerp(new THREE.Color(o.matura > 0.6 ? "#3A2238" : "#21181E"), nero);
      this.olive.setColorAt(i, this.col);
    });
    this.olive.instanceMatrix.needsUpdate = true;
    if (this.olive.instanceColor) this.olive.instanceColor.needsUpdate = true;
    // di notte l'albero sta carico, fermo, coi rami tutti al loro posto
    if (notte) {
      this.tagli.forEach((tg) => {
        tg.g.position.copy(tg.perno);
        tg.g.rotation.set(0, 0, 0);
        tg.g.scale.setScalar(1);
      });
      return;
    }

    // la potatura: i rami cadono uno alla volta, poi vanno nella fascina; ributtano a fine ciclo
    const ributta = fra(e, 47, 51);
    this.tagli.forEach((tg, k) => {
      const quando = 33 + k * 3.2;
      const giu = fra(e, quando, quando + 0.8);
      const via = fra(e, quando + 2, quando + 3.2);
      if (e < 47) {
        tg.g.position.copy(tg.perno).lerp(tg.terra, giu * giu);
        tg.g.position.lerp(this.v.set(FASCINA.x, quota(FASCINA.x, FASCINA.z) + 0.1, FASCINA.z), via);
        tg.g.setRotationFromAxisAngle(tg.giro, giu * 1.4);
        tg.g.scale.setScalar(Math.max(0.001, 1 - via));
      } else {
        tg.g.position.copy(tg.perno);
        tg.g.rotation.set(0, 0, 0);
        tg.g.scale.setScalar(Math.max(0.001, ributta));
      }
    });
    // la fascina cresce coi rami portati, poi se ne va
    const fasci = this.tagli.filter((_, k) => e > 33 + k * 3.2 + 3.2 && e < 47).length;
    if (this.fascina.children.length !== fasci) {
      while (this.fascina.children.length > fasci) {
        const c = this.fascina.children.pop() as THREE.Mesh;
        c.geometry.dispose();
      }
      while (this.fascina.children.length < fasci) {
        const k = this.fascina.children.length;
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.7, 5).rotateZ(Math.PI / 2 + (k - 2) * 0.25).translate(FASCINA.x, quota(FASCINA.x, FASCINA.z) + 0.04 + k * 0.035, FASCINA.z + (k % 2) * 0.06), this.legno);
        f.raycast = () => undefined;
        this.fascina.add(f);
      }
    }

    // i fiori
    (this.fiori.material as THREE.PointsMaterial).opacity = fra(e, 51, 52.5) * (1 - fra(e, 54.5, 56)) * 0.95;

    // le persone entrano da sinistra, lavorano, escono
    const raccolta = fra(e, 0.5, 3) * (1 - fra(e, 26, 29));
    const potatura = fra(e, 30, 32.5) * (1 - fra(e, 46, 48.5));
    const entra = (p: Persona, dove: THREE.Vector3, quanto: number, verso: number) => {
      p.g.visible = quanto > 0.01;
      this.v.copy(ENTRATA).lerp(dove, quanto);
      p.g.position.set(this.v.x, quanto > 0.98 ? dove.y : quota(this.v.x, this.v.z), this.v.z);
      // camminando guarda dove va; arrivato, verso il lavoro
      p.g.rotation.y = quanto > 0.98 ? verso : Math.atan2(dove.x - ENTRATA.x, dove.z - ENTRATA.z);
      // camminando dondola
      if (quanto > 0.02 && quanto < 0.98) p.g.position.y += Math.abs(Math.sin(t * 9)) * 0.02;
    };
    // abbacchiatori: la pertica batte i rami
    this.abbacchiatori.forEach((p, k) => {
      const [x, z] = k ? [1.3, -0.45] : [0.62, -1.0];
      entra(p, new THREE.Vector3(x, quota(x, z), z), raccolta, versoTronco(x, z));
      const batte = e > 6 && e < 23 ? Math.pow(Math.abs(Math.sin(t * 3.4 + k * 1.3)), 4) : 0;
      if (p.attrezzo) p.attrezzo.rotation.x = 0.55 + batte * 0.35;
      p.braccia.forEach((b) => (b.rotation.x = -1.4 - batte * 0.3));
    });
    // sulla scala: nella raccolta pettina, nella potatura sega
    const suScala = Math.max(raccolta, potatura);
    this.scala.visible = suScala > 0.01;
    this.scala.position.set(SCALA_A.x, quota(SCALA_A.x, SCALA_A.z), SCALA_A.z);
    this.scala.scale.setScalar(Math.max(0.001, fra(suScala, 0.5, 1)));
    const p = this.sullaScala;
    const inCima = fra(suScala, 0.7, 1);
    entra(p, new THREE.Vector3(SCALA_A.x, quota(SCALA_A.x, SCALA_A.z) + inCima * 0.62, SCALA_A.z - 0.2 + inCima * 0.17), suScala, 0);
    const lavora = inCima > 0.95;
    if (p.attrezzo) p.attrezzo.visible = potatura > 0.5;
    if (lavora && e < 29) {
      // il pettine: le mani su e giù fra le foglie
      p.braccia.forEach((b, k) => b.rotation.set(-2.5 + Math.sin(t * 5 + k * 2) * 0.35, 0, (k ? 1 : -1) * 0.2));
    } else if (lavora) {
      // la sega: avanti e indietro, veloce
      p.braccia[1].rotation.set(-2.3 + Math.sin(t * 11) * 0.22, 0, 0.25);
      p.braccia[0].rotation.set(-2.6, 0, -0.3);
    } else p.braccia.forEach((b) => b.rotation.set(Math.sin(t * 9) * 0.3, 0, 0));
    // chi raccoglie: in ginocchio sulla rete a riempire le cassette, poi le porta via; nella potatura fa la fascina
    const r = this.raccoglitore;
    const portaVia = fra(e, 24, 28.5);
    const accucciato = e > 9 && e < 24;
    entra(r, new THREE.Vector3(1.2, quota(1.2, -1.2), -1.2), Math.max(raccolta, e > 30 && e < 48 ? potatura : 0), 0.9);
    if (e > 30 && e < 48) {
      // porta i rami tagliati alla fascina
      const k = (e - 33) / 3.2;
      const f = k - Math.floor(k);
      const verso = Math.sin(f * Math.PI);
      if (potatura > 0.98) {
        const x = THREE.MathUtils.lerp(0.75, FASCINA.x - 0.25, verso), z = THREE.MathUtils.lerp(-0.6, FASCINA.z - 0.2, verso);
        r.g.position.set(x, quota(x, z), z);
        r.g.rotation.y = Math.cos(f * Math.PI) > 0 ? 1.4 : -1.7;
      }
      r.braccia.forEach((b) => b.rotation.set(-0.9, 0, 0));
    } else {
      r.g.scale.set(1, accucciato ? 0.66 : 1, 1);
      r.braccia.forEach((b, k) => b.rotation.set(accucciato ? -1.2 + Math.sin(t * 4 + k) * 0.4 : portaVia > 0 ? -1.3 : 0, 0, 0));
      if (portaVia > 0) {
        const x = THREE.MathUtils.lerp(1.2, ENTRATA.x, portaVia), z = THREE.MathUtils.lerp(-1.2, ENTRATA.z, portaVia);
        r.g.position.set(x, quota(x, z), z);
        r.g.rotation.y = Math.PI / 2;
        r.g.visible = portaVia < 0.99;
      }
    }
    if (!(e > 30 && e < 48)) r.g.scale.y = accucciato ? 0.66 : 1;
    else r.g.scale.y = 1;
    // le cassette: si riempiono accanto a chi raccoglie, poi partono con lui
    const piene = fra(e, 10, 23);
    this.cassette.forEach((c, k) => {
      const vis = fra(e, 8, 9) * (1 - fra(e, 28, 28.6));
      c.visible = vis > 0.01;
      c.scale.setScalar(Math.max(0.001, vis));
      const carico = c.getObjectByName("carico") as THREE.Mesh;
      carico.scale.y = Math.max(0.001, fra(piene, k * 0.5, k * 0.5 + 0.5));
      if (portaVia > 0) {
        c.position.copy(r.g.position).add(new THREE.Vector3(0.18, 0.62 + k * 0.13, 0));
        c.rotation.y = r.g.rotation.y;
      } else {
        c.position.set(1.55 + k * 0.36, quota(1.55 + k * 0.36, -1.32), -1.32);
        c.rotation.y = 0.2;
      }
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
