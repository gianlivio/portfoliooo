import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, generatore, liberaTutto, tela } from "./comuni";

/**
 * La città sullo sfondo, alle spalle di chi guarda la zona dello sviluppatore: la stessa città che cambia.
 * Di notte una metropoli come Manhattan: torri alte con le finestre accese, luci rosse in cima,
 * fasci di riflettori che spazzano il cielo, un bagliore arancio sopra i tetti.
 * Di giorno, qui, niente: Granada (l'Albaicín col Sacromonte, la Cattedrale e l'Alcaicería) sta di fronte
 * all'Alhambra, sopra la zona dello sviluppatore.
 */

const DIST = 38; // dentro la volta delle stelle (42)
const AZ = ANGOLO_ZONA + Math.PI;
const ARCO = 0.55; // mezza larghezza, in radianti

function suArco(u: number, d: number) {
  const a = AZ + u * ARCO;
  return new THREE.Vector3(Math.sin(a) * d, 0, -Math.cos(a) * d);
}

export class Citta {
  gruppo = new THREE.Group();
  private notte = new THREE.Group();
  private giorno = new THREE.Group();
  private fari: THREE.Mesh[] = [];
  private cime: THREE.Sprite[] = [];
  private texture: THREE.Texture[] = [];
  /** L'Albaicín: vive col giorno della città (compare e sparisce con lei), ma sta accanto all'Alhambra. */
  albaicin!: THREE.Group;

  constructor(eNotte: boolean) {
    const r = generatore(41);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

    /* ------------------------------------------------ la metropoli, di notte */
    const finestre = tela(64, 256, (x) => {
      x.fillStyle = "#07080C";
      x.fillRect(0, 0, 64, 256);
      for (let j = 0; j < 64; j++) for (let i = 0; i < 8; i++) {
        if (r() < 0.42) continue;
        const k = r();
        x.fillStyle = k < 0.7 ? "#FFD58A" : k < 0.88 ? "#F2F4FF" : "#8FD3FF";
        x.globalAlpha = 0.45 + r() * 0.55;
        x.fillRect(i * 8 + 2, j * 4 + 1, 4, 2);
      }
    });
    finestre.wrapS = finestre.wrapT = THREE.RepeatWrapping;
    finestre.magFilter = THREE.NearestFilter;
    this.texture.push(finestre);
    const N = 70;
    const torri = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ map: finestre, fog: false, toneMapped: false }),
      N
    );
    const txLuce = alone("#FF3A2A");
    this.texture.push(txLuce);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1;
      const centro = 1 - Math.abs(u);
      const h = 2 + Math.pow(r(), 2) * 9 * (0.4 + centro) + (r() < 0.08 ? 5 : 0);
      const p = suArco(u, DIST + r() * 4);
      const l = 0.9 + r() * 1.4;
      q.setFromAxisAngle(up, -(AZ + u * ARCO));
      m.compose(p.setY(PELO_ACQUA - 0.3), q, s.set(l, h, l));
      torri.setMatrixAt(i, m);
      torri.setColorAt(i, new THREE.Color().setHSL(0.6, 0.15, 0.55 + r() * 0.45));
      if (h > 7 && this.cime.length < 9) {
        const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: txLuce, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        c.position.copy(p).setY(PELO_ACQUA - 0.3 + h + 0.2);
        c.scale.setScalar(0.9);
        this.cime.push(c);
        this.notte.add(c);
      }
    }
    this.notte.add(torri);
    // il bagliore arancio della città sul cielo
    const txB = alone("#FF8A3A");
    this.texture.push(txB);
    const bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: txB, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    bagliore.position.copy(suArco(0, DIST + 2)).setY(3);
    bagliore.scale.set(46, 14, 1);
    this.notte.add(bagliore);
    // i riflettori, che spazzano il cielo
    const lama = tela(32, 256, (x) => {
      const g = x.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 256);
    });
    this.texture.push(lama);
    for (const u of [-0.5, 0.05, 0.45]) {
      const f = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 30).translate(0, 15, 0),
        new THREE.MeshBasicMaterial({ map: lama, color: "#CFE0FF", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      f.position.copy(suArco(u, DIST)).setY(PELO_ACQUA);
      f.userData.u = u;
      this.fari.push(f);
      this.notte.add(f);
    }

    /* ------------------------- Granada, di giorno: non qui, ma di fronte all'Alhambra */
    // di giorno qui non c'è niente: l'Albaicín e la città bassa stanno accanto all'Alhambra, sopra la zona dello sviluppatore
    this.albaicin = granada(r, this.texture);
    this.giorno.add(this.albaicin);

    this.gruppo.add(this.notte, this.giorno);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(eNotte);
  }

  setNotte(notte: boolean) {
    this.notte.visible = notte;
    this.giorno.visible = !notte;
  }

  aggiorna(t: number) {
    if (!this.notte.visible) return;
    this.fari.forEach((f, i) => {
      f.rotation.set(0, -AZ + Math.PI / 2, Math.sin(t * (0.25 + i * 0.07) + i * 2) * 0.55);
    });
    const lampo = Math.sin(t * 2.6) > 0.6 ? 1 : 0.15;
    this.cime.forEach((c) => (c.material.opacity = lampo));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}

/* ----------------------------------------------------------------------- Granada */

/*
 * Granada vista dalla città bassa, a sinistra dell'Alhambra: la collina dell'Albaicín con le case bianche
 * e i tetti di coppi, i cármenes coi cipressi, le torri mudéjar delle chiese, San Nicolás col suo mirador
 * e la muralla zirí che sale al crinale; in cima il Sacromonte con l'abbazia fra i pini, e sul fianco di dietro
 * le cuevas dei gitani, le facciate bianche scavate nel monte coi comignoli che spuntano dalla terra, fra fichi
 * d'India e agavi. Ai piedi, verso l'Alhambra, la città bassa: la Cattedrale con la facciata di Alonso Cano
 * (i tre grandi archi), la torre e la rotonda della Capilla Mayor, la Capilla Real gotica accanto; e attaccata
 * alla Cattedrale l'Alcaicería, il vecchio mercato della seta, i vicoli di botteghe ad archi moreschi:
 * lì c'è la casa dove Livio ha vissuto, la più alta della fila davanti, col balcone e i gerani.
 * Coordinate del gruppo: x lungo l'orizzonte (+x a sinistra per chi guarda), y in alto, −z verso chi guarda.
 */

/** Dove sta Granada: a sinistra dell'Alhambra (ANGOLO_ZONA − 0.5), di fronte, più vicina e più bassa. */
export const GRANADA = { a: ANGOLO_ZONA - 0.5, d: 34, scala: 0.62 };

const smussa = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Il terreno: la piana della città bassa, la collina dell'Albaicín che sale al crinale, il Sacromonte in cima. */
function quota(x: number, z: number) {
  const ax = Math.max(0, 1 - ((x - 3) / 17) ** 2);
  const rz = z < 10 ? smussa(1.5, 10, z) : Math.max(0, 1 - (z - 10) / 6);
  const sacro = 1.6 * Math.exp(-((x - 10) ** 2) / 26) * smussa(5, 10, z);
  const ruvido = 0.22 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 1.1 - x * 0.4) + 0.12 * Math.sin(x * 3.1 - z * 2.3);
  return Math.max(0.3, (11 * Math.pow(ax, 0.8) + sacro) * Math.pow(rz, 1.1) + ruvido * ax * rz);
}

/** La direzione in discesa, nel piano: dove guarda una facciata scavata nel pendio. */
function discesa(x: number, z: number) {
  const e = 0.25;
  const gx = (quota(x + e, z) - quota(x - e, z)) / (2 * e), gz = (quota(x, z + e) - quota(x, z - e)) / (2 * e);
  const l = Math.hypot(gx, gz) || 1;
  return { x: -gx / l, z: -gz / l };
}

/** La faccia di una casa: muro a calce con porte e finestre; quattro varianti, persiane verdi e porte di legno. */
function facciata(v: number) {
  return tela(64, 64, (x) => {
    x.fillStyle = "#FFFFFF";
    x.fillRect(0, 0, 64, 64);
    const verde = "#3E6B4A", legno = "#6B4A2E", scuro = "#3A3530";
    if (v === 0) {
      x.fillStyle = legno; x.fillRect(22, 36, 14, 28);
      x.fillStyle = verde; x.fillRect(42, 14, 12, 12);
    } else if (v === 1) {
      x.fillStyle = scuro; x.fillRect(10, 16, 10, 12); x.fillRect(40, 16, 10, 12);
      x.fillStyle = legno; x.fillRect(26, 40, 12, 24);
    } else if (v === 2) {
      x.fillStyle = legno; x.beginPath(); x.moveTo(24, 64); x.lineTo(24, 42); x.arc(32, 42, 8, Math.PI, 0); x.lineTo(40, 64); x.fill();
      x.fillStyle = verde; x.fillRect(46, 18, 10, 12);
    } else {
      x.fillStyle = scuro; x.fillRect(28, 20, 8, 10);
    }
    // l'ombra della gronda di coppi e una riga di sporco alla base
    x.fillStyle = "rgba(150,80,50,0.35)"; x.fillRect(0, 0, 64, 4);
    x.fillStyle = "rgba(120,110,100,0.18)"; x.fillRect(0, 60, 64, 4);
  });
}

/** La facciata della Cattedrale di Alonso Cano: i tre grandi archi rientranti, le lesene, il medaglione, la cornice. */
function facciataCattedrale() {
  return tela(256, 256, (x) => {
    x.fillStyle = "#E6D6B2";
    x.fillRect(0, 0, 256, 256);
    // le lesene e la cornice alta
    x.fillStyle = "#D4C29A";
    for (const px of [0, 58, 92, 164, 198, 246]) x.fillRect(px, 18, 10, 238);
    x.fillStyle = "#C8B48A";
    x.fillRect(0, 10, 256, 10);
    x.fillRect(0, 0, 256, 4);
    // i tre archi, profondi: ombra dentro, la porta in fondo
    const arco = (cx: number, l: number, alto: number) => {
      const r = l / 2;
      x.fillStyle = "#9E8A66";
      x.beginPath(); x.moveTo(cx - r, 256); x.lineTo(cx - r, alto + r); x.arc(cx, alto + r, r, Math.PI, 0); x.lineTo(cx + r, 256); x.fill();
      x.fillStyle = "#B7A27C";
      x.beginPath(); x.moveTo(cx - r + 6, 256); x.lineTo(cx - r + 6, alto + r + 8); x.arc(cx, alto + r + 8, r - 6, Math.PI, 0); x.lineTo(cx + r - 6, 256); x.fill();
      x.fillStyle = "#4A3A2C";
      x.fillRect(cx - r * 0.35, 256 - 70 * (l / 60), r * 0.7, 70 * (l / 60));
    };
    arco(128, 66, 34);
    arco(36, 40, 70);
    arco(220, 40, 70);
    // il medaglione sopra la porta grande, e i due tondi sopra quelle piccole
    x.fillStyle = "#A8946C";
    x.beginPath(); x.arc(128, 132, 14, 0, Math.PI * 2); x.fill();
    for (const cx of [36, 220]) { x.beginPath(); x.arc(cx, 150, 8, 0, Math.PI * 2); x.fill(); }
  });
}

/** Una bottega dell'Alcaicería: muro bianco, la fascia di arabeschi, tre archi a ferro di cavallo con la merce colorata. */
function bottega(casa: boolean) {
  return tela(96, 96, (x) => {
    x.fillStyle = "#F4EEE2";
    x.fillRect(0, 0, 96, 96);
    const sotto = casa ? 52 : 30;
    // la fascia di arabeschi ocra e rossa sopra gli archi
    x.fillStyle = "#C98A4A";
    x.fillRect(0, sotto - 10, 96, 8);
    x.fillStyle = "#9A3A2A";
    for (let i = 0; i < 96; i += 8) x.fillRect(i + 2, sotto - 8, 4, 4);
    // tre archi a ferro di cavallo: il bordo rosso, il buio della bottega, lampade e stoffe
    for (const cx of [18, 48, 78]) {
      x.fillStyle = "#9A3A2A";
      x.beginPath(); x.moveTo(cx - 11, 96); x.lineTo(cx - 11, sotto + 12); x.arc(cx, sotto + 12, 13, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(cx + 11, 96); x.fill();
      x.fillStyle = "#2E2420";
      x.beginPath(); x.moveTo(cx - 8, 96); x.lineTo(cx - 8, sotto + 13); x.arc(cx, sotto + 13, 10, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(cx + 8, 96); x.fill();
      const tinte = ["#E8B23A", "#3A7FC2", "#C23A4A", "#4AA86A", "#E07A2A"];
      for (let k = 0; k < 5; k++) {
        x.fillStyle = tinte[(k + cx) % tinte.length];
        x.fillRect(cx - 7 + (k % 3) * 5, sotto + 16 + Math.floor(k / 3) * 9 + (k % 2) * 3, 4, 6);
      }
    }
    if (casa) {
      // la casa di Livio: il piano di sopra, due finestre con le persiane, il balcone di ferro e i gerani
      x.fillStyle = "#3E6B4A";
      x.fillRect(14, 12, 18, 22); x.fillRect(64, 12, 18, 22);
      x.fillStyle = "#2B2620";
      x.fillRect(19, 14, 8, 18); x.fillRect(69, 14, 8, 18);
      x.fillStyle = "#2B2620";
      x.fillRect(8, 33, 80, 2);
      for (let i = 10; i < 88; i += 5) x.fillRect(i, 26, 1, 8);
      x.fillStyle = "#D8343A";
      for (const gx of [12, 22, 36, 60, 72, 84]) { x.beginPath(); x.arc(gx, 30, 2.6, 0, Math.PI * 2); x.fill(); }
    }
  });
}

/** La facciata di una cueva: la calce sul monte, la porta ad arco scura, una finestrella. */
function cueva() {
  return tela(64, 64, (x) => {
    x.fillStyle = "#FBFAF5";
    x.beginPath(); x.moveTo(0, 64); x.lineTo(0, 20); x.quadraticCurveTo(32, 0, 64, 20); x.lineTo(64, 64); x.fill();
    x.fillStyle = "#3A2E26";
    x.beginPath(); x.moveTo(22, 64); x.lineTo(22, 40); x.arc(32, 40, 10, Math.PI, 0); x.lineTo(42, 64); x.fill();
    x.fillStyle = "#4A6E8A";
    x.fillRect(48, 34, 7, 8);
    x.fillStyle = "#3E6B4A";
    x.fillRect(6, 32, 8, 10);
  });
}

function granada(r: () => number, texture: THREE.Texture[]) {
  const g = new THREE.Group();
  g.name = "granada";
  const A = GRANADA.a;
  g.position.set(Math.sin(A) * GRANADA.d, PELO_ACQUA - 0.3, -Math.cos(A) * GRANADA.d);
  g.rotation.y = Math.PI - A; // +z locale verso fuori, −z verso chi guarda
  g.scale.setScalar(GRANADA.scala);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const su = new THREE.Vector3(0, 1, 0);
  // un poco di luce propria: le facce in ombra verso chi guarda restano calce, non grigio
  const lambert = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial({ fog: false, emissive: "#2E2A24", ...o });
  const tinta = (h: string) => lambert({ color: h });
  const box = (x: number, y: number, z: number, l: number, h: number, pr: number, mat: THREE.Material | THREE.Material[], ry = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(l, h, pr).translate(0, h / 2, 0), mat);
    o.position.set(x, y, z);
    o.rotation.y = ry;
    g.add(o);
    return o;
  };
  const tex = (t: THREE.Texture) => (texture.push(t), t);

  // il terreno: terra secca e oliveti sulla collina, la piana chiara della città
  const terra = new THREE.PlaneGeometry(48, 18, 120, 45).rotateX(-Math.PI / 2).translate(0, 0, 7.2);
  const pos = terra.attributes.position as THREE.BufferAttribute;
  const col: number[] = [];
  const pietre = ["#B8A57E", "#A8946C", "#C4B28C", "#9A8862"].map((h) => new THREE.Color(h));
  const verde = new THREE.Color("#6E7A44"), piana = new THREE.Color("#CFC2A4");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = quota(x, z);
    pos.setY(i, y - (z < -1 ? 1.2 : 0));
    c.copy(pietre[Math.floor(r() * pietre.length)]);
    if (y < 0.5) c.lerp(piana, 0.7);
    else if (r() < 0.22) c.lerp(verde, 0.65);
    col.push(c.r, c.g, c.b);
  }
  terra.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  terra.computeVertexNormals();
  g.add(new THREE.Mesh(terra, lambert({ vertexColors: true, flatShading: true })));

  /* ---------------------------------------------- la Cattedrale e la Capilla Real */
  const pietra = lambert({ color: "#DCCAA2", emissive: "#4A4232" }), pietraScura = lambert({ color: "#C9B68C", emissive: "#3E3628" }), piombo = tinta("#8E8C84");
  const CX = -13, CZ = 1.6; // il centro della facciata, che guarda chi guarda
  box(CX, 0.3, CZ + 3.0, 4.4, 3.0, 5.9, pietra); // le cinque navate
  box(CX, 3.3, CZ + 3.0, 4.2, 0.12, 5.7, piombo); // il tetto basso
  const fac = tex(facciataCattedrale());
  const facMat = lambert({ map: fac });
  box(CX, 0.3, CZ + 0.15, 4.4, 4.5, 0.3, [pietra, pietra, pietraScura, pietra, pietra, facMat]); // la faccia −z guarda chi guarda
  // la torre, a sinistra della facciata: tre ordini che si stringono, con le finestre ad arco
  const TX = CX + 2.75, TZ = CZ + 0.6;
  box(TX, 0.3, TZ, 1.2, 2.9, 1.2, pietra);
  box(TX, 3.2, TZ, 1.32, 0.1, 1.32, pietraScura);
  box(TX, 3.3, TZ, 1.0, 1.5, 1.0, pietra);
  box(TX, 4.8, TZ, 1.1, 0.08, 1.1, pietraScura);
  box(TX, 4.88, TZ, 0.8, 1.05, 0.8, pietra);
  box(TX, 5.93, TZ, 0.9, 0.08, 0.9, pietraScura);
  const buio = tinta("#3A2E24");
  for (const [y, h, l] of [[3.75, 0.7, 0.26], [5.1, 0.55, 0.2]] as const) {
    box(TX, y, TZ - (l === 0.26 ? 0.51 : 0.41), l, h, 0.02, buio);
    box(TX + (l === 0.26 ? 0.51 : 0.41), y, TZ, 0.02, h, l, buio);
  }
  // la rotonda della Capilla Mayor, dietro: il tamburo ottagonale, la cupola di piombo, la lanterna
  const rot = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.6, 1.4, 8).translate(0, 0.7, 0), pietra);
  rot.position.set(CX, 3.3, CZ + 5.0);
  g.add(rot);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), piombo);
  cup.position.set(CX, 4.7, CZ + 5.0);
  g.add(cup);
  box(CX, 5.35, CZ + 5.0, 0.32, 0.45, 0.32, pietra);
  // la Capilla Real, a destra: più bassa, gotica, coi pinnacoli lungo il ciglio
  const RX = CX - 3.4;
  box(RX, 0.3, CZ + 3.2, 2.4, 2.3, 4.4, pietraScura);
  box(RX, 2.6, CZ + 3.2, 2.3, 0.1, 4.3, piombo);
  const pinn = new THREE.ConeGeometry(0.07, 0.45, 5).translate(0, 0.22, 0);
  const pinnacoli = new THREE.InstancedMesh(pinn, pietraScura, 40);
  let np = 0;
  for (let k = 0; k <= 10; k++) {
    for (const lato of [-1.15, 1.15]) {
      m.compose(p.set(RX + lato, 2.6, CZ + 1.1 + k * 0.42), q.identity(), s.set(1, 1, 1));
      pinnacoli.setMatrixAt(np++, m);
    }
  }
  for (let k = 0; k < 6; k++) {
    m.compose(p.set(RX - 1.0 + k * 0.4, 2.6, CZ + 1.0), q.identity(), s.set(1, 1, 1));
    pinnacoli.setMatrixAt(np++, m);
  }
  pinnacoli.count = np;
  g.add(pinnacoli);

  /* ------------------------------------------------- l'Alcaicería e la casa di Livio */
  // attaccata alla Cattedrale, dal lato della torre: tre file di botteghe fra vicoli stretti
  const coppi = tinta("#B8653F");
  const muroBianco = lambert({ color: "#F4EEE2", emissive: "#4A463E" });
  const facBottega = lambert({ map: tex(bottega(false)) });
  const facCasa = lambert({ map: tex(bottega(true)) });
  for (let fila = 0; fila < 3; fila++) {
    for (let k = 0; k < 4; k++) {
      const x = TX + 1.15 + k * 0.92, z = CZ - 0.1 + fila * 1.05;
      // la casa: la prima della fila davanti, accanto alla torre; più alta, col piano di sopra
      const casa = fila === 0 && k === 0;
      const h = casa ? 1.55 : 0.85 + r() * 0.2;
      const faccia = casa ? facCasa : facBottega;
      box(x, 0.3, z, 0.8, h, 0.78, [muroBianco, muroBianco, coppi, muroBianco, muroBianco, faccia]);
    }
  }

  /* ----------------------------------------------- la città bassa intorno, e le case */
  type Casa = { x: number; z: number; y: number; l: number; h: number; p: number; ry: number };
  const case_: Casa[] = [];
  const libero = (x: number, z: number) =>
    // la Cattedrale e la Capilla Real, con la piazza davanti (Plaza de las Pasiegas)
    !(x > CX - 5.0 && x < CX + 2.4 && z > CZ - 3 && z < CZ + 7.4) &&
    // la torre e l'Alcaicería, coi vicoli davanti liberi: la si vede dalla piazza
    !(x > TX - 0.8 && x < TX + 4.9 && z > CZ - 3 && z < CZ + 2.8);
  // la piana: isolati bassi, file larghe
  for (let z = -0.8; z < 7.5; z += 0.55) {
    for (let x = -23; x < -4; ) {
      const l = 0.6 + r() * 0.8;
      const cx = x + l / 2;
      if (libero(cx, z) && quota(cx, z) < 1.4 && r() > 0.12) case_.push({ x: cx, z: z + (r() - 0.5) * 0.15, y: quota(cx, z), l, h: 0.55 + r() * 0.5, p: 0.45 + r() * 0.15, ry: 0 });
      x += l + 0.05 + (r() < 0.2 ? 0.25 : 0);
    }
  }
  // l'Albaicín: file sovrapposte che salgono il pendio, una addosso all'altra; in alto a sinistra le cuevas
  for (let fila = 0; fila < 20; fila++) {
    const z = 1.8 + fila * 0.38;
    let x = -9 + r();
    while (x < 13.5 - fila * 0.15) {
      const l = 0.5 + r() * 0.7;
      const cx = x + l / 2;
      const y = quota(cx, z);
      const cuevas = cx > 6 && z > 6.6;
      if (!cuevas && libero(cx, z) && y > 0.9 && r() > 0.06) case_.push({ x: cx, z: z + (r() - 0.5) * 0.12, y, l, h: 0.45 + r() * 0.45, p: 0.42 + r() * 0.25, ry: (r() - 0.5) * 0.25 });
      x += l + (r() < 0.18 ? r() * 0.55 : 0.03);
    }
  }
  // un secondo piano, arretrato, su una casa su quattro
  const sopra: Casa[] = case_.filter(() => r() < 0.26).map((k) => ({ ...k, x: k.x + (r() - 0.5) * 0.15, z: k.z + 0.1, y: k.y + k.h, l: k.l * 0.6, h: 0.35 + r() * 0.2, p: k.p * 0.6 }));
  const tutte = [...case_, ...sopra];
  const tettoBianco = tinta("#FFFFFF");
  // tre varianti coi coppi, una con la terrazza bianca
  const varianti = [0, 1, 2, 3].map((v) => {
    const muro = lambert({ map: tex(facciata(v)), emissive: "#4A463E" });
    const tetto = v === 3 ? tettoBianco : coppi;
    return new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [muro, muro, tetto, tetto, muro, muro], tutte.length);
  });
  const conta = [0, 0, 0, 0];
  tutte.forEach((k, i) => {
    const v = r() < 0.2 ? 3 : Math.floor(r() * 3);
    // le case di sotto affondano nel pendio: niente vuoti
    const affondo = i < case_.length ? 1.2 : 0;
    m.compose(p.set(k.x, k.y - affondo, k.z), q.setFromAxisAngle(su, k.ry), s.set(k.l, k.h + affondo, k.p));
    varianti[v].setMatrixAt(conta[v], m);
    // quasi tutte bianche, qualcuna color calce sporca o ocra
    const t = r();
    c.setHSL(0.09, t < 0.82 ? 0.08 : 0.4, t < 0.82 ? 0.95 + r() * 0.05 : 0.84);
    varianti[v].setColorAt(conta[v]++, c);
  });
  varianti.forEach((v, i) => {
    v.count = conta[i];
    g.add(v);
  });

  /* ------------------------------------------ i cármenes: cipressi e giardini fra le case */
  const cipressi = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 1, 6).translate(0, 0.5, 0), tinta("#2E4A2C"), 110);
  const chiome = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.26, 0), lambert({ color: "#4C6236", flatShading: true }), 90);
  let nc = 0, nh = 0;
  for (let i = 0; i < 600 && (nc < 110 || nh < 90); i++) {
    const x = -9 + r() * 22, z = 1.6 + r() * 8;
    const y = quota(x, z);
    if (y < 0.9 || !libero(x, z) || (x > 6 && z > 6.6)) continue;
    if (r() < 0.55 && nc < 110) {
      const h = 0.8 + r() * 0.7;
      m.compose(p.set(x, y + 0.3, z), q.identity(), s.set(1, h, 1));
      cipressi.setMatrixAt(nc++, m);
    } else if (nh < 90) {
      m.compose(p.set(x, y + 0.45, z), q.setFromAxisAngle(su, r() * 6), s.setScalar(0.7 + r() * 0.6));
      chiome.setMatrixAt(nh++, m);
    }
  }
  cipressi.count = nc;
  chiome.count = nh;
  g.add(cipressi, chiome);

  /* ------------------------------------------- le torri mudéjar delle chiese, San Nicolás */
  const mattone = tinta("#B8774E");
  const chiesa = (x: number, z: number, alta: number) => {
    const y = quota(x, z);
    box(x + 0.55, y - 0.4, z + 0.2, 1.4, 1.15, 0.75, [muroBianco, muroBianco, coppi, muroBianco, muroBianco, muroBianco]);
    box(x, y - 0.4, z, 0.42, alta + 0.4, 0.42, mattone);
    box(x, y + alta - 0.32, z - 0.215, 0.18, 0.26, 0.02, buio);
    box(x - 0.215, y + alta - 0.32, z, 0.02, 0.26, 0.18, buio);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.35, 4).rotateY(Math.PI / 4).translate(0, 0.17, 0), coppi);
    t.position.set(x, y + alta, z);
    g.add(t);
  };
  // San Nicolás in alto, col mirador davanti; le altre sparse sul pendio
  chiesa(0.2, 8.4, 1.6);
  box(-0.2, quota(-0.2, 7.7) - 0.15, 7.55, 2.2, 0.32, 0.9, tinta("#D9C9A6"));
  for (const [x, z, h] of [[-5.5, 4.2, 1.3], [-1.8, 5.6, 1.4], [3.6, 4.4, 1.35], [6.8, 6.0, 1.3], [-6.4, 6.8, 1.25]] as const) chiesa(x, z, h);

  /* ------------------------------------------------------------- la muralla zirí */
  const tapial = tinta("#C08A5C");
  const percorso = [[-3.6, 2.3], [-1.5, 4.0], [1.0, 6.0], [3.4, 8.2], [5.6, 9.7], [8.5, 10.3]];
  for (let j = 0; j < percorso.length - 1; j++) {
    const [x0, z0] = percorso[j], [x1, z1] = percorso[j + 1];
    const lungo = Math.hypot(x1 - x0, z1 - z0), passi = Math.ceil(lungo / 0.45);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let k = 0; k < passi; k++) {
      const x = x0 + ((x1 - x0) * (k + 0.5)) / passi, z = z0 + ((z1 - z0) * (k + 0.5)) / passi;
      const y = quota(x, z);
      box(x, y - 0.3, z, lungo / passi + 0.03, 0.95, 0.16, tapial, ry);
      if (k % 2 === 0) box(x, y + 0.65, z, 0.12, 0.12, 0.16, tapial, ry);
    }
    // una torre a ogni gomito
    box(x1, quota(x1, z1) - 0.3, z1, 0.55, 1.35, 0.55, tapial);
  }

  /* ------------------------------------------------ il Sacromonte: l'abbazia fra i pini */
  const AX = 10.2, AZ = 10.7, ay = quota(AX, AZ);
  const ocra = tinta("#E3CFA4");
  box(AX, ay - 0.4, AZ, 3.0, 1.45, 1.5, [ocra, ocra, coppi, ocra, ocra, ocra]);
  box(AX - 1.9, ay - 0.4, AZ - 0.1, 1.0, 1.9, 1.9, [ocra, ocra, coppi, ocra, ocra, ocra]);
  box(AX - 1.5, ay - 0.4, AZ - 0.9, 0.48, 2.7, 0.48, ocra);
  const cima = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.42, 4).rotateY(Math.PI / 4).translate(0, 0.21, 0), coppi);
  cima.position.set(AX - 1.5, ay + 2.3, AZ - 0.9);
  g.add(cima);
  for (let k = 0; k < 4; k++) box(AX - 1.0 + k * 0.6, ay + 0.35, AZ - 0.76, 0.14, 0.24, 0.02, buio);
  const pini = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 5).scale(1, 0.55, 1), lambert({ color: "#3E5530", flatShading: true }), 24);
  for (let k = 0; k < 24; k++) {
    const x = AX - 4 + r() * 8, z = AZ - 1.8 + r() * 3.6;
    if (Math.abs(x - AX + 0.4) < 2.3 && Math.abs(z - AZ) < 1.1) { k--; continue; }
    m.compose(p.set(x, quota(x, z) + 0.32, z), q.identity(), s.setScalar(0.8 + r() * 0.5));
    pini.setMatrixAt(k, m);
  }
  g.add(pini);

  /* ------------------------------------------ le cuevas dei gitani, i fichi d'India, le agavi */
  const facCueva = lambert({ map: tex(cueva()), transparent: true, alphaTest: 0.5 });
  const cueve = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.62).translate(0, 0.31, 0), facCueva, 90);
  const comignoli = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 6).translate(0, 0.15, 0), muroBianco, 90);
  const pale = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4).scale(1, 1.35, 0.32), tinta("#6F8A4A"), 320);
  const agavi = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.32, 5).translate(0, 0.16, 0), tinta("#7C9A86"), 70);
  let nq = 0, nf = 0, na = 0;
  for (let i = 0; i < 900 && nq < 90; i++) {
    const x = 5.5 + r() * 14, z = 6.0 + r() * 7.2;
    const y = quota(x, z);
    if (y < 2.4 || (Math.abs(x - AX + 0.4) < 2.8 && Math.abs(z - AZ) < 1.6)) continue;
    const d = discesa(x, z);
    const ry = Math.atan2(d.x, d.z);
    // la facciata affonda appena nel monte, rivolta in discesa; il comignolo spunta dalla terra, più su
    m.compose(p.set(x, y - 0.12, z), q.setFromAxisAngle(su, ry), s.setScalar(0.85 + r() * 0.3));
    cueve.setMatrixAt(nq, m);
    const ux = x - d.x * 0.45, uz = z - d.z * 0.45;
    m.compose(p.set(ux, quota(ux, uz) - 0.05, uz), q.identity(), s.set(1, 0.8 + r() * 0.6, 1));
    comignoli.setMatrixAt(nq++, m);
    for (let k = 0; k < 4 && nf < 320; k++) {
      const fx = x + (r() - 0.5) * 0.9, fz = z + (r() - 0.5) * 0.9;
      m.compose(p.set(fx, quota(fx, fz) + 0.08, fz), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.8, r() * 6, (r() - 0.5) * 0.8)), s.setScalar(0.8 + r() * 0.6));
      pale.setMatrixAt(nf++, m);
    }
    if (na < 70 && r() < 0.8) {
      const ax = x + (r() - 0.5) * 1.2, az = z + (r() - 0.5) * 1.2;
      m.compose(p.set(ax, quota(ax, az) - 0.04, az), q.identity(), s.setScalar(0.8 + r() * 0.5));
      agavi.setMatrixAt(na++, m);
    }
  }
  cueve.count = nq;
  comignoli.count = nq;
  pale.count = nf;
  agavi.count = na;
  g.add(cueve, comignoli, pale, agavi);
  unisciPerMateriale(g);
  return g;
}

/** I pezzi singoli (muri, torri, chiese) con lo stesso materiale diventano un solo oggetto: poche chiamate di disegno. */
function unisciPerMateriale(g: THREE.Group) {
  const gruppi = new Map<THREE.Material, THREE.Mesh[]>();
  for (const o of g.children) {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || Array.isArray(o.material) || !o.geometry.index) continue;
    const l = gruppi.get(o.material) ?? [];
    l.push(o);
    gruppi.set(o.material, l);
  }
  for (const [mat, pezzi] of gruppi) {
    if (pezzi.length < 2) continue;
    const geo = mergeGeometries(
      pezzi.map((o) => {
        o.updateMatrix();
        return o.geometry.clone().applyMatrix4(o.matrix);
      })
    );
    if (!geo) continue;
    for (const o of pezzi) {
      g.remove(o);
      o.geometry.dispose();
    }
    g.add(new THREE.Mesh(geo, mat));
  }
}
