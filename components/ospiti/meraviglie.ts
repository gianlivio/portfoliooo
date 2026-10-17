import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { alone, generatore } from "./comuni";

/*
 * Tre cose lontane sull'orizzonte di giorno, a sinistra dello sviluppatore:
 * l'Alhambra sulla collina della Sabika con la Sierra Nevada innevata dietro;
 * il Perito Moreno, il fronte del ghiacciaio sul lago con le Ande alle spalle, da cui ogni tanto si stacca un blocco;
 * il Labirinto di Arianna, la grande opera di Fiumara d'Arte, in cima alla collina delle pale.
 * Tutto è a colori cotti: la luce del sole e la foschia della distanza sono già nei vertici, il materiale non fa calcoli.
 */

const SU = PELO_ACQUA - 0.3;
const CIELO = new THREE.Color("#BFD6EA");
/** La luce, nelle coordinate di ogni gruppo (x lungo l'orizzonte, y in alto, −z verso chi guarda). */
const SOLE = new THREE.Vector3(0.35, 0.78, -0.52).normalize();

const suAnello = (a: number, d: number, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);

/** Un gruppo messo sull'anello, rivolto verso il centro. */
export function sulRing(a: number, d: number, alzo = 0) {
  const g = new THREE.Group();
  g.position.copy(suAnello(a, d, SU + alzo));
  g.rotation.y = Math.PI - a;
  return g;
}

/** Colora una geometria: colore pieno (o per vertice, se `per` è dato), luce del sole, foschia. Toglie le uv, per poterle unire. */
function colora(g: THREE.BufferGeometry, colore: THREE.ColorRepresentation, velo: number, per?: (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) {
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

const unisci = (pezzi: THREE.BufferGeometry[]) => {
  const m = new THREE.Mesh(mergeGeometries(pezzi), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  pezzi.forEach((p) => p.dispose());
  return m;
};

/** Un crinale come striscia alzata: x da x0 a x1, profondità da z0 a z1, la quota data da h(x, z). */
function rilievo(x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: (x: number, z: number) => number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, h(pos.getX(i), pos.getZ(i)));
  return g;
}

/* ------------------------------------------------------------------ l'Alhambra */

export function alhambra(a: number) {
  const r = generatore(31);
  // alzata: la base la coprono comunque le carte, così si vede la fortezza e non solo la cima delle torri
  const g = sulRing(a, 39, 1.2);
  const pezzi: THREE.BufferGeometry[] = [];
  // la Sierra Nevada, dietro, innevata in alto
  pezzi.push(
    colora(
      rilievo(-15, 15, 6, 10, 90, 6, (x, z) => {
        const k = Math.sin(((z - 6) / 4) * Math.PI);
        const cime = 6.2 + 1.6 * Math.sin(x * 0.42 + 1) + 0.9 * Math.abs(Math.sin(x * 1.3)) + 0.4 * Math.sin(x * 3.7);
        return (cime * Math.min(1, (15 - Math.abs(x)) / 4) + 0.6) * Math.pow(k, 0.6) - 0.6;
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

/* --------------------------------------------------------------- il Perito Moreno */

type Blocco = { m: THREE.Mesh; inizio: number; x: number; schizzi: THREE.Sprite[] };

export class PeritoMoreno {
  gruppo: THREE.Group;
  private blocchi: Blocco[] = [];
  private prossimo = 6;
  private FRONTE = 4.3;
  private r = generatore(57);
  texture: THREE.Texture[] = [];

  constructor(a: number) {
    const r = this.r;
    // alzato: il fronte del ghiacciaio deve spuntare sopra le carte, il lago lo coprono comunque
    this.gruppo = sulRing(a, 41.5, 3.2);
    const pezzi: THREE.BufferGeometry[] = [];
    // le Ande: cime aguzze, roccia scura, neve in alto
    pezzi.push(
      colora(
        rilievo(-14, 14, 7, 11, 110, 6, (x, z) => {
          const k = Math.sin(((z - 7) / 4) * Math.PI);
          const cime = 9.5 + 2.6 * Math.abs(Math.sin(x * 0.55 + 0.4)) + 1.6 * Math.abs(Math.sin(x * 1.7)) + 0.5 * Math.sin(x * 4.3);
          return (cime * Math.min(1, (14 - Math.abs(x)) / 3) + 0.8) * Math.pow(k, 0.5) - 0.8;
        }),
        "#55545A",
        0.38,
        (p) => new THREE.Color(p.y > 7.6 + Math.sin(p.x * 1.9) * 0.7 ? "#F4F7FA" : p.y > 4 ? "#4E4D55" : "#3F5A3A")
      )
    );
    // i fianchi della valle, boscosi in basso, ai due lati del ghiacciaio
    for (const s of [-1, 1]) {
      pezzi.push(
        colora(
          rilievo(s < 0 ? -15 : 6.5, s < 0 ? -6.5 : 15, -3, 8, 34, 22, (x, z) => {
            const dentro = Math.min(1, Math.max(0, (Math.abs(x) - 6.5) / 3));
            const cresta = 8.2 + 1.8 * Math.sin(z * 0.6 + x * 0.7) + 0.6 * Math.abs(Math.sin(z * 2.3 + x));
            return cresta * Math.pow(dentro, 0.7) * Math.min(1, (z + 3) / 2.5) - 0.4;
          }),
          "#2F4A2E",
          0.28,
          (p) => new THREE.Color(p.y > 8.4 + Math.sin(p.z * 3) * 0.4 ? "#EEF1F4" : p.y > 5.2 ? "#55545B" : "#2F4A2E")
        )
      );
    }
    // la superficie del ghiacciaio: sale dal fronte verso le montagne, irta di seracchi
    const F = this.FRONTE;
    const sup = (x: number, z: number) => F + Math.max(0, z + 2) * 0.32 + 0.22 * Math.abs(Math.sin(x * 3.1 + z * 2.2)) * Math.abs(Math.sin(z * 4.7 - x));
    pezzi.push(
      colora(rilievo(-7.5, 7.5, -2, 8, 90, 40, sup), "#F2F7FB", 0.24, (p) => {
        // bianco, appena azzurro nei crepacci; e le morene, strisce scure che scendono con il ghiaccio
        const crepa = Math.max(0, Math.sin(p.x * 3.1 + p.z * 2.2) * Math.sin(p.z * 4.7 - p.x));
        const c = new THREE.Color("#F4F8FB").lerp(new THREE.Color("#A8CDE6"), crepa * 0.55);
        for (const mx of [-4.4, -1.1, 2.0, 5.0]) {
          const d = Math.abs(p.x - mx - Math.sin(p.z * 0.6) * 0.4);
          if (d < 0.22) c.lerp(new THREE.Color("#6E6A66"), (1 - d / 0.22) * 0.75);
        }
        return c;
      })
    );
    // il fronte: una parete verticale frastagliata, azzurra, più blu in basso, con le colonne di ghiaccio
    {
      const N = 120;
      const pos: number[] = [];
      for (let i = 0; i < N; i++) {
        // la cresta del fronte: guglie e seracchi, irregolari
        const cima = (x: number) => sup(x, -2) + 0.6 * Math.pow(Math.abs(Math.sin(x * 2.9)), 3) + 0.2 * Math.sin(x * 7.3) + 0.12 * Math.sin(x * 17.1);
        const x0 = -7.5 + (15 * i) / N, x1 = -7.5 + (15 * (i + 1)) / N;
        const t0 = cima(x0), t1 = cima(x1);
        const z = -2 - 0.12 * Math.sin(i * 1.7);
        pos.push(x0, 0, z, x1, 0, z, x1, t1, z, x0, 0, z, x1, t1, z, x0, t0, z);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      pezzi.push(
        colora(g, "#8CC0E0", 0.18, (p) => {
          const fascia = 0.5 + 0.5 * Math.sin(p.x * 5.1) * Math.sin(p.x * 1.3);
          return new THREE.Color("#4F93C8").lerp(new THREE.Color("#E6F2FA"), Math.min(1, p.y / F) * 0.7 + fascia * 0.3);
        })
      );
    }
    // il lago, azzurro lattiginoso
    pezzi.push(colora(new THREE.PlaneGeometry(30, 8).rotateX(-Math.PI / 2).translate(0, 0.02, -6), "#8CC3CF", 0.15));
    this.gruppo.add(unisci(pezzi));

    // i blocchi che si staccano, e gli spruzzi quando toccano l'acqua
    const tx = alone("#FFFFFF");
    for (let k = 0; k < 2; k++) {
      const geo = new THREE.BoxGeometry(1.1, 1.8, 0.8, 3, 4, 2);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.85 + r() * 0.3), p.getY(i) * (0.9 + r() * 0.2), p.getZ(i) * (0.8 + r() * 0.4));
      geo.translate(0, 0.9, 0.4); // il perno in basso, sul bordo verso il lago
      const m = new THREE.Mesh(
        colora(geo, "#A9D2EC", 0.15, (_p, n) => new THREE.Color(n.y > 0.5 ? "#F3F8FC" : "#7DB4DC")),
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, fog: false })
      );
      m.visible = false;
      const schizzi = Array.from({ length: 8 }, () => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, fog: false }));
        this.gruppo.add(s);
        return s;
      });
      this.gruppo.add(m);
      this.blocchi.push({ m, inizio: -1, x: 0, schizzi });
    }
    this.texture.push(tx);
  }

  /** Ogni tanto un blocco si stacca: s'incrina, si piega verso il lago, cade, schizza, poi galleggia e si allontana. */
  aggiorna(t: number) {
    if (t > this.prossimo) {
      const b = this.blocchi.find((x) => x.inizio < 0 || t - x.inizio > 24);
      if (b) {
        b.inizio = t;
        b.x = (this.r() * 2 - 1) * 5.5;
      }
      this.prossimo = t + 7 + this.r() * 7;
    }
    const F = this.FRONTE;
    this.blocchi.forEach((b) => {
      if (b.inizio < 0) return;
      const e = t - b.inizio;
      const m = b.m;
      m.visible = true;
      let y = F - 1.8, z = -2.4, rx = 0, op = 1;
      if (e < 0.8) rx = -0.05 * Math.sin(e * 40) * (e / 0.8); // s'incrina, trema
      else if (e < 2.2) {
        const k = (e - 0.8) / 1.4;
        rx = -k * k * 1.5; // si piega verso il lago
        y = F - 1.8 - k * k * (F - 0.6);
        z = -2.4 - k * 0.9;
      } else {
        const k = e - 2.2;
        rx = -1.5 + Math.min(0.3, k * 0.2);
        y = -0.6 + Math.sin(k * 1.6) * 0.06 * Math.exp(-k * 0.3); // affonda per metà e dondola
        z = -3.3 - k * 0.12;
        op = Math.max(0, 1 - k / 20);
      }
      m.position.set(b.x, y, z);
      m.rotation.x = rx;
      (m.material as THREE.MeshBasicMaterial).opacity = op;
      // gli spruzzi all'impatto
      const s = e - 2.1;
      b.schizzi.forEach((sp, i) => {
        if (s < 0 || s > 1.4) {
          sp.material.opacity = 0;
          return;
        }
        const an = (i / b.schizzi.length) * Math.PI - Math.PI / 2;
        sp.position.set(b.x + Math.sin(an) * s * 1.6, 0.2 + s * 2.2 * (1 - s / 1.4) + (i % 3) * 0.2, -3.2 - Math.cos(an) * s * 0.6);
        sp.scale.setScalar(0.5 + s * 1.2);
        sp.material.opacity = 0.85 * (1 - s / 1.4);
      });
      if (op <= 0) {
        b.inizio = -1;
        m.visible = false;
      }
    });
  }
}

/* --------------------------------------------------------- il Labirinto di Arianna */

/**
 * Il labirinto di Italo Lanfredini a Castel di Lucio: un grande cerchio di muri concentrici,
 * percorso a spirale, e all'ingresso il portale alto, ad arco ogivale. Qui sta in cima alla collina.
 */
export function labirinto(): THREE.Mesh {
  const pezzi: THREE.BufferGeometry[] = [];
  const cemento = "#F1EEE6";
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
  pezzi.push(colora(new THREE.ExtrudeGeometry(arco, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -2.75), "#CFC6B3", 0.18));
  // il prato su cui sta, rasato
  pezzi.push(colora(new THREE.CylinderGeometry(2.6, 2.75, 0.12, 40).translate(0, -0.06, 0), "#7E8B4E", 0.2));
  return unisci(pezzi);
}
