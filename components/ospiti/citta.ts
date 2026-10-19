import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, generatore, liberaTutto, tela } from "./comuni";

/**
 * La città sullo sfondo, alle spalle di chi guarda la zona dello sviluppatore: la stessa città che cambia.
 * Di notte una metropoli come Manhattan: torri alte con le finestre accese, luci rosse in cima,
 * fasci di riflettori che spazzano il cielo, un bagliore arancio sopra i tetti.
 * Di giorno, qui, niente: il quartiere bianco a terrazze (l'Albaicín) sta di fronte all'Alhambra, sopra la zona
 * dello sviluppatore.
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
  private pale: THREE.Object3D[] = [];
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

    /* ------------------------- l'Albaicín, di giorno: non qui, ma di fronte all'Alhambra */
    // di giorno qui non c'è niente: il quartiere bianco sta accanto all'Alhambra, sopra la zona dello sviluppatore
    this.albaicin = paese(r, this.texture, this.pale);
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
    // di giorno girano piano le pale dei mulini
    if (!this.notte.visible) {
      this.pale.forEach((p, i) => (p.rotation.z = t * (0.35 + i * 0.06) + i));
      return;
    }
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

/* ------------------------------------------------------------------------ il paese */

const LARGO = 20; // mezza larghezza del promontorio
const CIMA = 12.5;

/** Il promontorio: sale dal mare fino alla cresta, poi ridiscende dietro; roccia increspata. */
function quota(x: number, z: number) {
  const bx = Math.max(0, 1 - (x / LARGO) ** 2);
  const rz = z < 9 ? Math.sin((Math.max(0, z) / 9) * Math.PI * 0.5) : Math.max(0, 1 - (z - 9) / 7);
  const ruvido = 0.32 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 1.1 - x * 0.4) + 0.18 * Math.sin(x * 3.1 - z * 2.3);
  return CIMA * Math.pow(bx, 0.9) * (0.12 + 0.88 * rz) + ruvido * bx;
}

/** La faccia di una casa: muro a calce con porte e finestre; quattro varianti. */
function facciata(v: number) {
  return tela(64, 64, (x) => {
    x.fillStyle = "#FFFFFF";
    x.fillRect(0, 0, 64, 64);
    const blu = "#1F5BA6", scuro = "#3A3530";
    if (v === 0) {
      x.fillStyle = blu; x.fillRect(22, 34, 14, 30); x.fillRect(44, 16, 10, 10);
    } else if (v === 1) {
      x.fillStyle = scuro; x.fillRect(10, 16, 10, 12); x.fillRect(40, 16, 10, 12);
      x.fillStyle = blu; x.fillRect(26, 40, 12, 24);
    } else if (v === 2) {
      x.fillStyle = "#6B4A2E"; x.beginPath(); x.moveTo(24, 64); x.lineTo(24, 42); x.arc(32, 42, 8, Math.PI, 0); x.lineTo(40, 64); x.fill();
      x.fillStyle = scuro; x.fillRect(48, 20, 8, 8);
    } else {
      x.fillStyle = scuro; x.fillRect(30, 22, 6, 8);
    }
    // l'ombra della gronda e una riga di sporco alla base
    x.fillStyle = "rgba(120,110,100,0.18)"; x.fillRect(0, 0, 64, 3); x.fillRect(0, 60, 64, 4);
  });
}

/** Dove sta l'Albaicín: a sinistra dell'Alhambra (ANGOLO_ZONA − 0.56), di fronte, più vicino e più basso. */
const ALBAICIN = { a: ANGOLO_ZONA - 0.4, d: 35, scala: 0.5 };

function paese(r: () => number, texture: THREE.Texture[], pale: THREE.Object3D[]) {
  const g = new THREE.Group();
  const A = ALBAICIN.a;
  g.position.set(Math.sin(A) * ALBAICIN.d, PELO_ACQUA - 0.3, -Math.cos(A) * ALBAICIN.d);
  g.rotation.y = Math.PI - A; // +z locale verso fuori, −z verso chi guarda
  g.scale.setScalar(ALBAICIN.scala);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const lambert = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial({ fog: false, ...o });

  // la roccia del promontorio, a facce piatte, con i colori della pietra secca e qualche macchia di verde
  const terra = new THREE.PlaneGeometry(LARGO * 2.2, 17, 110, 40).rotateX(-Math.PI / 2).translate(0, 0, 7.5);
  const pos = terra.attributes.position as THREE.BufferAttribute;
  const col: number[] = [];
  const pietre = ["#B3A27F", "#9E8C6C", "#C4B592", "#8A7A5E"].map((h) => new THREE.Color(h));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = quota(x, z);
    pos.setY(i, y - (z < 0.4 ? 1.5 : 0));
    c.copy(pietre[Math.floor(r() * pietre.length)]);
    if (r() < 0.12 && y > 1) c.lerp(new THREE.Color("#6E7444"), 0.7);
    col.push(c.r, c.g, c.b);
  }
  terra.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  terra.computeVertexNormals();
  g.add(new THREE.Mesh(terra, lambert({ vertexColors: true, flatShading: true })));

  // il mare ai piedi del promontorio
  const mare = new THREE.Mesh(new THREE.PlaneGeometry(LARGO * 2.6, 6).rotateX(-Math.PI / 2).translate(0, 0.05, -2.2), lambert({ color: "#3F86B8" }));
  g.add(mare);

  // le case: file sovrapposte che salgono il pendio, una addosso all'altra
  type Casa = { x: number; z: number; y: number; l: number; h: number; p: number };
  const case_: Casa[] = [];
  for (let fila = 0; fila < 22; fila++) {
    const z = 0.7 + fila * 0.4;
    const ampio = 15.5 * (1 - fila / 30) + (r() - 0.5) * 2;
    let x = -ampio;
    while (x < ampio) {
      const l = 0.55 + r() * 0.75;
      if (r() > 0.07) {
        const cx = x + l / 2;
        const y = quota(cx, z);
        if (y > 1.2) case_.push({ x: cx, z: z + (r() - 0.5) * 0.12, y, l, h: 0.5 + r() * 0.55, p: 0.45 + r() * 0.3 });
      }
      x += l + (r() < 0.15 ? r() * 0.5 : 0.02);
    }
  }
  // un secondo piano, arretrato, su una casa su tre
  const sopra: Casa[] = case_.filter(() => r() < 0.33).map((k) => ({ x: k.x + (r() - 0.5) * 0.2, z: k.z + 0.12, y: k.y + k.h, l: k.l * 0.6, h: 0.4 + r() * 0.25, p: k.p * 0.6, base: 0 }));
  const tutte = [...case_, ...sopra];
  const tetto = lambert({ color: "#FFFFFF" });
  const varianti = [0, 1, 2, 3].map((v) => {
    const t = facciata(v);
    texture.push(t);
    const muro = lambert({ map: t });
    return new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [muro, muro, tetto, tetto, muro, muro], tutte.length);
  });
  const conta = [0, 0, 0, 0];
  tutte.forEach((k, i) => {
    const v = Math.floor(r() * 4);
    // le case di sotto affondano nella roccia: il pendio non lascia vuoti
    const affondo = i < case_.length ? 1.4 : 0;
    m.compose(p.set(k.x, k.y - affondo, k.z), q.identity(), s.set(k.l, k.h + affondo, k.p));
    varianti[v].setMatrixAt(conta[v], m);
    // quasi tutte bianche, qualcuna color calce sporca o sabbia
    const t = r();
    c.setHSL(0.09, t < 0.85 ? 0.08 : 0.35, t < 0.85 ? 0.95 + r() * 0.05 : 0.86);
    varianti[v].setColorAt(conta[v]++, c);
  });
  varianti.forEach((v, i) => {
    v.count = conta[i];
    g.add(v);
  });

  // le chiese: tamburo bianco e cupola azzurra; un campanile a vela accanto
  const tamburo = new THREE.CylinderGeometry(0.42, 0.42, 0.4, 16).translate(0, 0.2, 0);
  const cupola = new THREE.SphereGeometry(0.44, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.4, 0);
  const croce = new THREE.BoxGeometry(0.04, 0.22, 0.04).translate(0, 0.95, 0);
  const vela = tela(64, 96, (x) => {
    x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, 64, 96);
    x.fillStyle = "#2B2620";
    for (const cx of [18, 46]) { x.beginPath(); x.moveTo(cx - 8, 70); x.lineTo(cx - 8, 40); x.arc(cx, 40, 8, Math.PI, 0); x.lineTo(cx + 8, 70); x.fill(); }
  });
  texture.push(vela);
  const bianco = lambert({ color: "#FBFAF6" }), azzurro = lambert({ color: "#2756A8" });
  const scelte = case_.filter((k) => k.y > 3).sort(() => r() - 0.5).slice(0, 7);
  scelte.forEach((k, i) => {
    const ch = new THREE.Group();
    ch.position.set(k.x, k.y + k.h, k.z);
    ch.add(new THREE.Mesh(tamburo, bianco), new THREE.Mesh(cupola, azzurro), new THREE.Mesh(croce, bianco));
    if (i % 2 === 0) {
      const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9).translate(0.7, 0.45, -0.1).rotateY(Math.PI), lambert({ map: vela, side: THREE.DoubleSide }));
      ch.add(cv);
    }
    ch.scale.setScalar(0.8 + r() * 0.5);
    g.add(ch);
  });

  // i mulini sulla cresta: torre bianca, tetto conico di paglia, otto pale che girano
  const paglia = lambert({ color: "#8C7350" }), tela_ = lambert({ color: "#EFE9DD", side: THREE.DoubleSide });
  for (const mx of [-6.5, -4.6, 5.2]) {
    const mz = 9.1;
    const mu = new THREE.Group();
    mu.position.set(mx, quota(mx, mz) - 0.2, mz);
    mu.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 14).translate(0, 0.75, 0), bianco));
    mu.add(new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 14).translate(0, 1.77, 0), paglia));
    const ruota = new THREE.Group();
    ruota.position.set(0, 1.6, -0.55);
    for (let k = 0; k < 8; k++) {
      const pala = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.95).translate(0.05, 0.5, 0), tela_);
      pala.rotation.z = (k / 8) * Math.PI * 2;
      ruota.add(pala);
    }
    pale.push(ruota);
    mu.add(ruota);
    mu.rotation.y = (r() - 0.5) * 0.4;
    g.add(mu);
  }

  // qualche cespuglio di macchia fuori dal paese
  const cespugli = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), lambert({ color: "#5F6A3A", flatShading: true }), 140);
  let n = 0;
  for (let i = 0; i < 400 && n < 140; i++) {
    const x = (r() * 2 - 1) * LARGO * 0.95, z = r() * 14;
    const y = quota(x, z);
    const fuori = Math.abs(x) > 15.5 * (1 - Math.max(0, z - 0.7) / 0.4 / 30) || z > 9.5;
    if (!fuori || y < 0.6) continue;
    m.compose(p.set(x, y, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), s.setScalar(0.7 + r() * 0.9));
    cespugli.setMatrixAt(n++, m);
  }
  cespugli.count = n;
  g.add(cespugli);
  return g;
}
