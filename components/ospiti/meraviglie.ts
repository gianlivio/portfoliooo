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

export function alhambra(a: number) {
  const r = generatore(31);
  // nel tratto di cielo libero sopra lo sviluppatore: poggia sull'orizzonte, nessuna carta davanti
  const g = sulRing(a, 40.5, 0);
  const pezzi: THREE.BufferGeometry[] = [];
  // la Sierra Nevada, dietro, innevata in alto
  pezzi.push(
    colora(
      rilievo(-14, 8, 6, 10, 70, 6, (x, z) => {
        const k = Math.sin(((z - 6) / 4) * Math.PI);
        const cime = 6.2 + 1.6 * Math.sin(x * 0.42 + 1) + 0.9 * Math.abs(Math.sin(x * 1.3)) + 0.4 * Math.sin(x * 3.7);
        return (cime * Math.min(1, (14 + x) / 4, (8 - x) / 3) + 0.6) * Math.pow(k, 0.6) - 0.6;
      }),
      "#8E8A86",
      0.5,
      (p) => new THREE.Color(p.y > 5.2 + Math.sin(p.x * 2.1) * 0.4 ? "#F5F7FA" : p.y > 3.5 ? "#8E8A86" : "#7C7A62")
    )
  );
  // la Sabika: la collina boscosa, lunga, piatta in cima
  const TOP = 3.6;
  const quota = (x: number, z: number) => {
    const fianchi = Math.min(1, Math.max(0, (7.5 - Math.abs(x)) / 2.6));
    const dorso = Math.max(0, 1 - Math.pow(Math.abs(z) / 2.6, 2.4));
    return TOP * Math.pow(fianchi, 0.8) * dorso + 0.08 * Math.sin(x * 2.3 + z) - 0.3;
  };
  pezzi.push(colora(rilievo(-9, 9, -2.8, 2.8, 72, 14, quota), "#5F6E3E", 0.22, () => new THREE.Color(r() < 0.25 ? "#7F7A4A" : "#566637")));
  // gli alberi sui fianchi
  for (let k = 0; k < 70; k++) {
    const x = (r() * 2 - 1) * 7.8, z = -2.4 + r() * 1.6;
    const y = quota(x, z);
    if (y < 0.2 || y > TOP - 0.2) continue;
    pezzi.push(colora(new THREE.IcosahedronGeometry(0.28 + r() * 0.2, 0).translate(x, y + 0.15, z), "#3E5530", 0.24));
  }
  const pietra = "#B8694C", chiara = "#D8C6A2";
  const box = (x: number, y: number, z: number, l: number, h: number, p: number, c: THREE.ColorRepresentation) =>
    pezzi.push(colora(new THREE.BoxGeometry(l, h, p).translate(x, y + h / 2, z), c, 0.2));
  const Y = TOP - 0.32;
  // le mura: davanti, dietro, le testate; e la merlatura sul fronte
  box(-0.3, Y, -1.15, 10.4, 0.8, 0.16, pietra);
  box(-0.3, Y, 1.0, 10.4, 0.7, 0.16, pietra);
  box(-5.45, Y, -0.08, 0.16, 0.8, 2.3, pietra);
  box(4.85, Y, -0.08, 0.16, 0.8, 2.3, pietra);
  for (let x = -5.3; x < 4.8; x += 0.3) box(x, Y + 0.8, -1.15, 0.13, 0.14, 0.17, pietra);
  // le torri: la Vela all'estremo, le altre dell'Alcazaba, Comares la più alta, poi le minori lungo il fronte
  const torri: [number, number, number, number][] = [
    [-5.3, -1.1, 0.85, 1.9], [-4.5, 0.9, 0.7, 1.5], [-3.6, -1.1, 0.6, 1.3], [0.7, -0.9, 1.0, 2.5],
    [-1.9, -1.15, 0.5, 1.2], [2.0, -1.15, 0.5, 1.25], [3.2, -1.15, 0.55, 1.15], [4.6, -1.1, 0.6, 1.3], [1.6, 0.95, 0.5, 1.1],
  ];
  torri.forEach(([x, z, l, h]) => {
    box(x, Y, z, l, h, l, pietra);
    for (let k = -1; k <= 1; k++) box(x + k * l * 0.33, Y + h, z - l * 0.4, l * 0.18, 0.13, l * 0.18, pietra);
    // feritoie e finestre scure sul lato verso chi guarda
    for (let j = 0; j < 2; j++) box(x + (j - 0.5) * l * 0.35, Y + h * 0.55, z - l / 2 - 0.01, 0.08, 0.2, 0.02, "#4A2E25");
  });
  // la campana della Vela
  box(-5.3, Y + 1.9 + 0.13, -1.1, 0.3, 0.4, 0.3, chiara);
  // il palazzo di Carlo V, quadrato e più chiaro, e Santa María col suo campanile
  box(-1.0, Y, 0.0, 1.5, 1.25, 1.3, chiara);
  box(-2.6, Y, 0.3, 0.9, 1.05, 0.9, "#CDB58E");
  box(-2.95, Y, 0.0, 0.3, 1.7, 0.3, "#CDB58E");
  // i cipressi, scuri e affusolati, fra le mura e nel Generalife
  for (let k = 0; k < 26; k++) {
    const x = k < 14 ? -4.8 + r() * 9.4 : 5.4 + r() * 1.8, z = k < 14 ? -0.3 + r() * 1.1 : -0.8 + r() * 1.6;
    const y = k < 14 ? Y : quota(x, z);
    const h = 0.7 + r() * 0.6;
    pezzi.push(colora(new THREE.ConeGeometry(0.1, h, 6).translate(x, y + h / 2, z), "#2B4228", 0.2));
  }
  // il Generalife: bianco, più in là, fra i giardini
  box(6.1, quota(6.1, -0.2) - 0.1, -0.2, 1.3, 0.55, 0.5, "#EDE6D6");
  box(6.6, quota(6.6, -0.2) - 0.1, -0.2, 0.35, 0.95, 0.35, "#EDE6D6");
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
