import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { generatore } from "./comuni";

/*
 * Tre cose lontane sull'orizzonte di giorno, a sinistra dello sviluppatore:
 * l'Alhambra sulla collina della Sabika con la Sierra Nevada innevata dietro;
 * Bologna con il Colle della Guardia, il santuario di San Luca in cima e il portico che vi sale a tornanti;
 * il Labirinto di Arianna, la grande opera di Fiumara d'Arte, in cima alla collina delle pale.
 * Tutto è a colori cotti: la luce del sole e la foschia della distanza sono già nei vertici, il materiale non fa calcoli.
 */

export const SU = PELO_ACQUA - 0.3;
export const CIELO = new THREE.Color("#BFD6EA");
/** La luce, nelle coordinate di ogni gruppo (x lungo l'orizzonte, y in alto, −z verso chi guarda). */
const SOLE = new THREE.Vector3(0.35, 0.78, -0.52).normalize();

export const suAnello = (a: number, d: number, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);

/** Un gruppo messo sull'anello, rivolto verso il centro. */
export function sulRing(a: number, d: number, alzo = 0) {
  const g = new THREE.Group();
  g.position.copy(suAnello(a, d, SU + alzo));
  g.rotation.y = Math.PI - a;
  return g;
}

/** Colora una geometria: colore pieno (o per vertice, se `per` è dato), luce del sole, foschia. Toglie le uv, per poterle unire. */
export function colora(g: THREE.BufferGeometry, colore: THREE.ColorRepresentation, velo: number, per?: (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  geo.deleteAttribute("uv");
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
  const base = new THREE.Color(colore), c = new THREE.Color(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    c.copy(per ? per(p, n) : base).multiplyScalar(0.68 + 0.42 * Math.max(0, n.dot(SOLE))).lerp(CIELO, velo);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

export const unisci = (pezzi: THREE.BufferGeometry[]) => {
  const m = new THREE.Mesh(mergeGeometries(pezzi), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  pezzi.forEach((p) => p.dispose());
  return m;
};

/** Un crinale come striscia alzata: x da x0 a x1, profondità da z0 a z1, la quota data da h(x, z). */
export function rilievo(x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: (x: number, z: number) => number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, h(pos.getX(i), pos.getZ(i)));
  return g;
}

/* ------------------------------------------------------------------ l'Alhambra */

/**
 * L'Alhambra come si vede dall'Albaicín, a nord: la collina della Sabika col suo bosco, le mura rosse che
 * ne seguono il ciglio; a destra l'Alcazaba (la Torre de la Vela con la campana, l'Homenaje, la Quebrada),
 * al centro la Torre di Comares massiccia con le bifore, dietro i tetti di coppi dei palazzi nasridi, il palazzo
 * di Carlo V e Santa María col campanile; lungo il muro nord il Partal col portico, le torri dei Picos, della
 * Cautiva e delle Infantas; a sinistra, sul Cerro del Sol, il Generalife bianco fra i giardini e i cipressi.
 * Dietro, la Sierra Nevada innevata. Tutto cotto nei vertici: un solo oggetto da disegnare.
 */
export function alhambra(a: number) {
  const r = generatore(31);
  // nel tratto di cielo libero sopra lo sviluppatore: poggia sull'orizzonte, nessuna carta davanti
  const g = sulRing(a, 40.5, 0);
  const pezzi: THREE.BufferGeometry[] = [];
  const rumore = (x: number, y: number) => 0.5 + 0.25 * Math.sin(x * 7.1 + y * 3.3) + 0.15 * Math.sin(x * 17.3 - y * 11.1) + 0.1 * Math.sin(x * 31.7 + y * 23.9);
  // la Sierra Nevada, subito dietro la collina: più lontano cadrebbe oltre il piano di taglio della camera (60)
  pezzi.push(
    colora(
      rilievo(-15, 9, 3.2, 5.6, 90, 8, (x, z) => {
        const k = Math.sin(((z - 3.2) / 2.4) * Math.PI);
        const cime = 6.2 + 1.6 * Math.sin(x * 0.42 + 1) + 0.9 * Math.abs(Math.sin(x * 1.3)) + 0.4 * Math.sin(x * 3.7) + 0.25 * Math.sin(x * 7.9);
        return (cime * Math.min(1, (15 + x) / 4, (9 - x) / 3) + 0.6) * Math.pow(k, 0.6) - 0.6;
      }),
      "#6E6F78",
      0.3,
      (p) => {
        const neve = 5.0 + Math.sin(p.x * 2.1) * 0.4 + Math.sin(p.x * 6.3) * 0.25;
        return new THREE.Color(p.y > neve ? "#FFFFFF" : p.y > neve - 0.35 && Math.sin(p.x * 9) > 0.3 ? "#E4E8EE" : p.y > 3.4 ? "#6E6F78" : "#66694F");
      }
    )
  );
  // la Sabika: la collina boscosa, lunga, piatta in cima
  const TOP = 3.6;
  const quota = (x: number, z: number) => {
    const fianchi = Math.min(1, Math.max(0, ((x < 0 ? 9.2 : 7.5) - Math.abs(x)) / 2.6));
    const dorso = Math.max(0, 1 - Math.pow(Math.abs(z) / 2.9, 2.6));
    return TOP * Math.pow(fianchi, 0.8) * dorso + 0.08 * Math.sin(x * 2.3 + z) - 0.3;
  };
  pezzi.push(colora(rilievo(-10.6, 9.4, -2.8, 2.8, 90, 14, quota), "#5F6E3E", 0.22, () => new THREE.Color(r() < 0.25 ? "#7F7A4A" : "#566637")));
  // il bosco dell'Alhambra, fitto sui fianchi: chiome tonde di due verdi
  for (let k = 0; k < 150; k++) {
    const x = (r() * 2 - 1) * 8.4, z = -2.5 + r() * 1.9;
    const y = quota(x, z);
    if (y < 0.15 || y > TOP - 0.25) continue;
    pezzi.push(colora(new THREE.IcosahedronGeometry(0.2 + r() * 0.2, 0).scale(1, 0.85, 1).translate(x, y + 0.12, z), r() < 0.5 ? "#3E5530" : "#4C6236", 0.24));
  }
  // la muratura: il tapial rossastro, a macchie, più scuro alla base, più chiaro in cima
  const Y = TOP - 0.32;
  const muro = (p: THREE.Vector3) => {
    const base = new THREE.Color("#B05A3A").lerp(new THREE.Color("#DA9462"), Math.min(1, Math.max(0, rumore(p.x * 1.3, p.y * 1.7) * 1.3 - 0.15)));
    return base.multiplyScalar(0.8 + 0.28 * Math.min(1, Math.max(0, (p.y - Y) / 2)));
  };
  const box = (x: number, y: number, z: number, l: number, h: number, p: number, c: THREE.ColorRepresentation | "muro", velo = 0.12) =>
    pezzi.push(colora(new THREE.BoxGeometry(l, h, p).translate(x, y + h / 2, z), c === "muro" ? "#B8694C" : c, velo, c === "muro" ? muro : undefined));
  const merli = (x0: number, x1: number, y: number, z: number, passo = 0.24) => {
    for (let x = x0; x < x1; x += passo) box(x, y, z, passo * 0.5, 0.12, 0.14, "muro");
  };
  // le mura nord, a tratti: seguono il ciglio della collina con piccoli salti
  const fronte = (x: number) => -1.15 + 0.12 * Math.sin(x * 1.1) + (x > 1.5 ? 0.06 : 0);
  for (let x = -5.0; x < 4.9; x += 0.5) {
    const h = 0.72 + 0.08 * Math.sin(x * 2.7);
    box(x + 0.25, Y, fronte(x + 0.25), 0.52, h, 0.16, "muro");
    merli(x + 0.05, x + 0.5, Y + h, fronte(x + 0.25));
  }
  box(-0.1, Y, 1.0, 10.0, 0.66, 0.16, "muro");
  box(-5.2, Y, -0.1, 0.16, 0.8, 2.3, "muro");
  box(4.95, Y, -0.08, 0.16, 0.8, 2.3, "muro");
  // una torre: il corpo, i merli sul fronte, le finestre scure verso chi guarda
  const torre = (x: number, z: number, l: number, p: number, h: number, finestre = 2) => {
    box(x, Y, z, l, h, p, "muro");
    merli(x - l / 2 + 0.04, x + l / 2, Y + h, z - p / 2 + 0.06, l / 4);
    for (let j = 0; j < finestre; j++) box(x + (j - (finestre - 1) / 2) * l * 0.32, Y + h * 0.58, z - p / 2 - 0.01, 0.07, 0.18, 0.02, "#4A2E25");
  };
  // l'Alcazaba, a destra: la Vela con la sua campana a vela, l'Homenaje più alta, la Quebrada spaccata
  torre(-5.45, -0.95, 0.95, 0.95, 1.75, 3);
  box(-5.45, Y + 1.75, -0.95, 0.42, 0.42, 0.1, "#E3D5B8");
  box(-5.45, Y + 1.83, -1.0, 0.16, 0.2, 0.04, "#2E2620");
  torre(-4.35, 0.55, 0.72, 0.72, 2.0, 2);
  torre(-4.1, -1.12, 0.62, 0.55, 1.3, 1);
  box(-4.1, Y + 1.3, -1.12, 0.06, 0.4, 0.56, "#2E2620", 0.3);
  // la Torre di Comares, la più massiccia, con tre bifore sul fronte
  torre(0.45, -0.98, 1.15, 1.05, 2.55, 0);
  for (let j = -1; j <= 1; j++) {
    for (const d of [-0.06, 0.06]) box(0.45 + j * 0.34 + d, Y + 1.55, -1.51, 0.08, 0.32, 0.02, "#3E2620");
  }
  // i tetti di coppi dei palazzi nasridi, dietro le mura: a due falde, bassi
  const tetto = (x: number, z: number, l: number, p: number, y: number) => {
    const t = new THREE.CylinderGeometry(p * 0.62, p * 0.62, l, 3, 1).rotateZ(Math.PI / 2).scale(1, 0.38, 1).translate(x, y + p * 0.12, z);
    pezzi.push(colora(t, "#A9573A", 0.2, (q) => new THREE.Color("#A9573A").lerp(new THREE.Color("#C06A44"), rumore(q.x * 2, q.z * 3))));
  };
  box(1.5, Y, -0.35, 2.2, 0.75, 0.9, "#D8C3A0");
  tetto(1.5, -0.35, 2.3, 0.95, Y + 0.75);
  box(1.9, Y, 0.45, 1.7, 0.65, 0.8, "#D8C3A0");
  tetto(1.9, 0.45, 1.8, 0.85, Y + 0.65);
  box(-0.2, Y, 0.0, 0.9, 0.7, 0.8, "#D8C3A0");
  tetto(-0.2, 0.0, 1.0, 0.85, Y + 0.7);
  // il Partal: la Torre de las Damas col portico bianco ad archi davanti
  torre(2.55, -1.08, 0.6, 0.55, 1.25, 1);
  box(2.55, Y, -1.42, 0.95, 0.5, 0.12, "#EFE8DA");
  for (let j = 0; j < 5; j++) box(2.55 + (j - 2) * 0.17, Y + 0.08, -1.49, 0.09, 0.3, 0.02, "#4A3A30");
  // le torri minori lungo il muro nord: dei Picos, della Cautiva, delle Infantas; e due sul muro sud
  torre(3.4, -1.05, 0.55, 0.5, 1.35, 2);
  torre(4.05, -1.0, 0.48, 0.45, 1.1, 1);
  torre(4.7, -1.0, 0.52, 0.48, 1.15, 1);
  torre(-1.9, -1.1, 0.5, 0.45, 1.15, 1);
  torre(-1.5, 1.0, 0.5, 0.45, 1.0, 0);
  torre(2.9, 1.0, 0.5, 0.45, 1.05, 0);
  // il palazzo di Carlo V: quadrato, di pietra chiara, con due file di finestre
  box(-1.35, Y, 0.15, 1.55, 1.25, 1.45, "#D8C6A2");
  box(-1.35, Y + 1.25, 0.15, 1.6, 0.06, 1.5, "#C4B08C");
  for (let fila = 0; fila < 2; fila++) for (let j = 0; j < 5; j++) box(-1.35 + (j - 2) * 0.28, Y + 0.38 + fila * 0.45, -0.61, 0.07, 0.16, 0.02, "#4A3E30");
  // Santa María e il suo campanile col tetto a punta
  box(-2.65, Y, 0.35, 0.95, 0.95, 0.85, "#CDB58E");
  tetto(-2.65, 0.35, 1.0, 0.9, Y + 0.95);
  box(-3.05, Y, -0.05, 0.32, 1.75, 0.32, "#CDB58E");
  box(-3.05, Y + 1.4, -0.22, 0.12, 0.18, 0.02, "#3A2E24");
  pezzi.push(colora(new THREE.ConeGeometry(0.24, 0.32, 4).rotateY(Math.PI / 4).translate(-3.05, Y + 1.91, -0.05), "#A9573A", 0.2));
  // i cipressi fra le mura
  for (let k = 0; k < 16; k++) {
    const x = -4.8 + r() * 9.4, z = -0.4 + r() * 1.2;
    const h = 0.7 + r() * 0.6;
    pezzi.push(colora(new THREE.ConeGeometry(0.1, h, 6).translate(x, Y + h / 2, z), "#2B4228", 0.2));
  }
  // il Generalife, a sinistra sul Cerro del Sol: i giardini a terrazze, la galleria bianca ad archi,
  // il mirador, i tetti; davanti il viale dei cipressi in due file
  const gy = (x: number) => quota(x, -0.2) - 0.08;
  pezzi.push(colora(new THREE.BoxGeometry(2.3, 0.08, 1.3).translate(6.3, gy(6.3) + 0.04, -0.1), "#5E7A3C", 0.22));
  box(6.0, gy(6.0), -0.25, 1.6, 0.5, 0.45, "#EDE6D6");
  for (let j = 0; j < 7; j++) box(6.0 + (j - 3) * 0.2, gy(6.0) + 0.06, -0.48, 0.1, 0.3, 0.02, "#5A4A3A");
  tetto(6.0, -0.25, 1.65, 0.5, gy(6.0) + 0.5);
  box(6.95, gy(6.95), -0.15, 0.4, 0.95, 0.4, "#EDE6D6");
  pezzi.push(colora(new THREE.ConeGeometry(0.3, 0.28, 4).rotateY(Math.PI / 4).translate(6.95, gy(6.95) + 1.09, -0.15), "#A9573A", 0.2));
  box(6.5, gy(6.5), 0.45, 1.1, 0.4, 0.4, "#E6DECC");
  tetto(6.5, 0.45, 1.15, 0.42, gy(6.5) + 0.4);
  for (let k = 0; k < 9; k++) {
    for (const dz of [-0.75, -0.55]) {
      const x = 5.1 + k * 0.24, h = 0.75 + r() * 0.3;
      pezzi.push(colora(new THREE.ConeGeometry(0.08, h, 6).translate(x, quota(x, dz) + h / 2 - 0.05, dz), "#24391F", 0.22));
    }
  }
  g.add(unisci(pezzi));
  return g;
}

/* ----------------------------------------------------------- Bologna e San Luca */

/** La facciata del portico: pilastri color ocra, archi a tutto sesto scuri, la cornice sopra. Un arco per ripetizione. */
function arcata() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 48;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.fillStyle = "#D29A5E";
  x.fillRect(0, 0, 64, 48);
  x.fillStyle = "#E3B47A";
  x.fillRect(0, 0, 64, 7);
  x.fillStyle = "#5A3A2A";
  x.beginPath();
  x.moveTo(12, 48);
  x.lineTo(12, 26);
  x.arc(32, 26, 20, Math.PI, 0);
  x.lineTo(52, 48);
  x.closePath();
  x.fill();
  // la luce dentro il portico, appena più calda in fondo
  x.fillStyle = "rgba(160,96,60,0.45)";
  x.fillRect(16, 34, 32, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/**
 * Bologna dal basso, con il Colle della Guardia a destra: la città rossa di tetti e torri (le Due Torri,
 * la Garisenda che pende, le altre torri, San Petronio con la facciata a metà), e sul colle il santuario
 * di San Luca, raggiunto dal portico che sale a tornanti dall'Arco del Meloncello.
 */
export function bologna(a: number) {
  const r = generatore(83);
  const g = sulRing(a, 41.5, 2.6);
  const pezzi: THREE.BufferGeometry[] = [];
  const box = (x: number, y: number, z: number, l: number, h: number, p: number, c: THREE.ColorRepresentation, velo = 0.22) =>
    pezzi.push(colora(new THREE.BoxGeometry(l, h, p).translate(x, y + h / 2, z), c, velo));
  /** Un tetto a due falde, colmo lungo x. */
  const tetto = (x: number, y: number, z: number, l: number, p: number, h: number, c: THREE.ColorRepresentation) => {
    const f = new THREE.Shape();
    f.moveTo(-p / 2, 0);
    f.lineTo(p / 2, 0);
    f.lineTo(0, h);
    f.closePath();
    const geo = new THREE.ExtrudeGeometry(f, { depth: l, bevelEnabled: false }).translate(0, 0, -l / 2).rotateY(Math.PI / 2).translate(x, y, z);
    pezzi.push(colora(geo, c, 0.22));
  };
  // l'Appennino dietro, verde e velato
  pezzi.push(
    colora(
      rilievo(-15, 15, 7, 11, 80, 6, (x, z) => (4.6 + 1.2 * Math.sin(x * 0.35 + 2) + 0.6 * Math.sin(x * 0.9)) * Math.sin(((z - 7) / 4) * Math.PI) - 0.4),
      "#6F8152",
      0.48
    )
  );
  // il Colle della Guardia: sale da sinistra, cima a destra
  const colle = (x: number, z: number) => {
    // un colle largo e tondo, non un cono: la cima ampia, i fianchi che scendono morbidi
    const dx = (x - 8) / 6.8, dz = (z - 2.2) / 3.8;
    const k = Math.max(0, 1 - (dx * dx + dz * dz));
    return Math.max(0, 6.2 * Math.pow(k, 0.85) * (1 - 0.15 * k) + 0.1 * Math.sin(x * 3 + z * 2)) - 0.2;
  };
  pezzi.push(colora(rilievo(-1, 15, -2, 8, 90, 40, colle), "#55703F", 0.2, (p) => new THREE.Color(Math.sin(p.x * 2.7) * Math.sin(p.z * 3.1) > 0.45 ? "#8C9A5A" : "#4F6A3A")));
  // gli alberi sul colle, a ciuffi
  for (let k = 0; k < 220; k++) {
    const x = 1.5 + r() * 12.5, z = -1.5 + r() * 6;
    const y = colle(x, z);
    if (y < 0.4) continue;
    const t = 0.1 + r() * 0.12;
    pezzi.push(colora(new THREE.IcosahedronGeometry(t, 1).scale(1, 0.85, 1).translate(x, y + t * 0.6, z), r() < 0.5 ? "#3D5A30" : "#4A6636", 0.22));
  }
  // la città: isolati fitti, muri ocra e rossi, tetti di coppi
  const muri = ["#C98B4E", "#D29A5E", "#B8653F", "#C4744A", "#DDB07A"];
  for (let i = 0; i < 230; i++) {
    const x = -13 + r() * 13.5, z = -1.8 + r() * 4.2;
    if (x > -0.5 && z < 0) continue;
    const l = 0.35 + r() * 0.45, p = 0.3 + r() * 0.3, h = 0.35 + r() * 0.5;
    box(x, -0.2, z, l, h + 0.2, p, muri[Math.floor(r() * muri.length)]);
    tetto(x, h, z, l + 0.04, p + 0.06, 0.16 + r() * 0.06, r() < 0.8 ? "#A9472F" : "#B85A3A");
  }
  // le torri: Asinelli altissima con la rocchetta in cima, Garisenda bassa e pendente, e altre torri gentilizie
  box(-6, -0.2, 0.2, 0.32, 5.4, 0.32, "#A8643F");
  box(-6, 5.2, 0.2, 0.22, 0.35, 0.22, "#B87250");
  {
    const gar = new THREE.BoxGeometry(0.38, 2.7, 0.38).translate(0, 1.35, 0).rotateZ(-0.075).translate(-5.55, -0.2, 0.15);
    pezzi.push(colora(gar, "#A05C3A", 0.22));
  }
  for (const [x, z, h] of [[-9.8, 0.6, 3.2], [-7.6, -0.4, 2.6], [-4.4, 0.9, 3.0], [-3.1, -0.2, 2.2], [-10.9, -0.6, 2.4]]) {
    box(x, -0.2, z, 0.26, h, 0.26, "#AE6A44");
    box(x, h - 0.2, z, 0.3, 0.08, 0.3, "#9A5838");
  }
  // San Petronio: la grande navata, la facciata a metà (marmo sotto, mattone sopra)
  box(-8.5, -0.2, 0.9, 1.5, 1.7, 2.6, "#B5704A");
  tetto(-8.5, 1.5, 0.9, 2.6, 1.6, 0.5, "#9A4A30");
  {
    const facciata = new THREE.BoxGeometry(1.55, 1.9, 0.06);
    pezzi.push(colora(facciata.translate(-8.5, 0.75, -0.42), "#C27A50", 0.2, (q) => new THREE.Color(q.y < 0.55 ? "#E8DCCB" : "#B4704A")));
  }
  // Palazzo d'Accursio con la torre dell'orologio
  box(-7.2, -0.2, -0.9, 1.4, 1.1, 0.6, "#B86A42");
  box(-6.75, 0.9, -0.9, 0.3, 0.9, 0.3, "#B86A42");
  // San Luca in cima al colle: la chiesa ellittica, il tamburo, la cupola, la lanterna, il pronao davanti
  const SX = 8, SZ = 2.2, SY = colle(8, 2.2) - 0.1;
  pezzi.push(colora(new THREE.CylinderGeometry(0.75, 0.78, 0.75, 28).scale(1.25, 1, 1).translate(SX, SY + 0.37, SZ), "#D08A5C", 0.18));
  pezzi.push(colora(new THREE.CylinderGeometry(0.46, 0.48, 0.42, 24).translate(SX, SY + 0.95, SZ), "#D9976A", 0.18));
  pezzi.push(colora(new THREE.SphereGeometry(0.5, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.15, 1).translate(SX, SY + 1.16, SZ), "#9E8C7C", 0.18));
  pezzi.push(colora(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10).translate(SX, SY + 1.88, SZ), "#E2C9A8", 0.18));
  box(SX, SY, SZ - 0.95, 0.9, 0.62, 0.35, "#E0A472", 0.18);
  tetto(SX, SY + 0.62, SZ - 0.95, 0.5, 0.95, 0.22, "#9A4A30");
  // le due ali curve davanti, basse
  for (const s of [-1, 1]) box(SX + s * 0.95, SY, SZ - 0.6, 0.6, 0.45, 0.3, "#D29462", 0.18);

  const solidi = unisci(pezzi);
  g.add(solidi);

  // il portico: dall'Arco del Meloncello sale a tornanti lungo il colle fino al santuario
  const tappe: [number, number][] = [
    [0.3, -1.2], [1.8, -1.5], [3.2, -0.9], [2.6, -0.1], [3.9, 0.5], [5.4, 0.1], [6.2, 0.9], [5.3, 1.5], [6.6, 2.0], [7.4, 1.4], [SX, SZ - 1.15],
  ];
  const via = new THREE.CatmullRomCurve3(tappe.map(([x, z]) => new THREE.Vector3(x, colle(x, z), z)), false, "catmullrom", 0.3);
  const N = 420;
  const punti = via.getSpacedPoints(N).map((q) => q.setY(Math.max(colle(q.x, q.z), 0) + 0.01));
  const H = 0.3, LARGO = 0.2, ARCO = 0.13;
  const fronte: number[] = [], uv: number[] = [], tetti: number[] = [];
  let lungo = 0;
  for (let i = 0; i < N; i++) {
    const a0 = punti[i], a1 = punti[i + 1];
    const tratto = a0.distanceTo(a1);
    const u0 = lungo / ARCO, u1 = (lungo + tratto) / ARCO;
    lungo += tratto;
    // la parete con gli archi, il lato verso valle (verso chi guarda)
    fronte.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, a1.x, a1.y + H, a1.z, a0.x, a0.y, a0.z, a1.x, a1.y + H, a1.z, a0.x, a0.y + H, a0.z);
    uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    // il tetto di coppi, appena spiovente verso valle
    const d = new THREE.Vector3().subVectors(a1, a0).normalize();
    const n = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(LARGO);
    tetti.push(
      a0.x, a0.y + H + 0.04, a0.z, a1.x, a1.y + H + 0.04, a1.z, a1.x + n.x, a1.y + H - 0.01, a1.z + n.z,
      a0.x, a0.y + H + 0.04, a0.z, a1.x + n.x, a1.y + H - 0.01, a1.z + n.z, a0.x + n.x, a0.y + H - 0.01, a0.z + n.z
    );
  }
  const tx = arcata();
  const gFronte = new THREE.BufferGeometry();
  gFronte.setAttribute("position", new THREE.Float32BufferAttribute(fronte, 3));
  gFronte.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const portico = new THREE.Mesh(gFronte, new THREE.MeshBasicMaterial({ map: tx, color: "#F3EDE6", side: THREE.DoubleSide, fog: false }));
  const gTetti = new THREE.BufferGeometry();
  gTetti.setAttribute("position", new THREE.Float32BufferAttribute(tetti, 3));
  const coppi = new THREE.Mesh(gTetti, new THREE.MeshBasicMaterial({ color: "#9C4A32", side: THREE.DoubleSide, fog: false }));
  g.add(portico, coppi);
  // l'Arco del Meloncello, alla partenza
  {
    const m: THREE.BufferGeometry[] = [];
    const arco = new THREE.Shape();
    arco.moveTo(-0.45, 0);
    arco.lineTo(-0.45, 0.75);
    arco.lineTo(0.45, 0.75);
    arco.lineTo(0.45, 0);
    arco.lineTo(0.2, 0);
    arco.lineTo(0.2, 0.32);
    arco.absarc(0, 0.32, 0.2, 0, Math.PI, false);
    arco.lineTo(-0.2, 0);
    arco.closePath();
    m.push(colora(new THREE.ExtrudeGeometry(arco, { depth: 0.3, bevelEnabled: false }).translate(0.3, colle(0.3, -1.2), -1.35), "#D9A066", 0.2));
    g.add(unisci(m));
  }
  g.userData.texture = tx;
  return g;
}

/* --------------------------------------------------------- il Labirinto di Arianna */

/**
 * Il labirinto di Italo Lanfredini a Castel di Lucio: un grande cerchio di muri concentrici,
 * percorso a spirale, e all'ingresso il portale alto, ad arco ogivale. Qui sta in cima alla collina.
 */
export function labirinto(): THREE.Mesh {
  const pezzi: THREE.BufferGeometry[] = [];
  // il colore vero dell'opera: un rosso chiaro, da terracotta
  const cemento = "#C97B69";
  // i muri: cinque anelli concentrici, ognuno interrotto in un punto diverso
  for (let k = 0; k < 5; k++) {
    const R = 0.45 + k * 0.42;
    const varco = 0.5 + k * 1.9;
    const archi = 36 + k * 8;
    for (let i = 0; i < archi; i++) {
      const a0 = (i / archi) * Math.PI * 2, a1 = ((i + 1) / archi) * Math.PI * 2;
      if (Math.abs(((a0 - varco + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.2) continue;
      const l = R * (a1 - a0) * 1.04;
      const g = new THREE.BoxGeometry(l, 0.32, 0.09).translate(0, 0.16, 0);
      g.rotateY(-(a0 + a1) / 2 + Math.PI / 2).translate(Math.cos((a0 + a1) / 2) * R, 0, Math.sin((a0 + a1) / 2) * R);
      pezzi.push(colora(g, cemento, 0.18));
    }
  }
  // il portale: due pilastri che si chiudono in un arco a sesto acuto, verso chi guarda
  const arco = new THREE.Shape();
  arco.moveTo(-0.55, 0);
  arco.lineTo(-0.55, 0.9);
  arco.quadraticCurveTo(-0.5, 1.55, 0, 1.85);
  arco.quadraticCurveTo(0.5, 1.55, 0.55, 0.9);
  arco.lineTo(0.55, 0);
  arco.lineTo(0.3, 0);
  arco.lineTo(0.3, 0.9);
  arco.quadraticCurveTo(0.28, 1.35, 0, 1.55);
  arco.quadraticCurveTo(-0.28, 1.35, -0.3, 0.9);
  arco.lineTo(-0.3, 0);
  arco.closePath();
  pezzi.push(colora(new THREE.ExtrudeGeometry(arco, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -2.75), "#BF6E5C", 0.18));
  // il prato su cui sta, rasato
  pezzi.push(colora(new THREE.CylinderGeometry(2.6, 2.75, 0.12, 40).translate(0, -0.06, 0), "#7E8B4E", 0.2));
  return unisci(pezzi);
}
