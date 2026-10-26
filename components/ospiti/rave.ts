import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, bruma, generatore, liberaTutto, tela } from "./comuni";

/*
 * Di notte, fra il luna park e la città, un rave in corso su un pianoro di campagna: il muro di casse
 * nere col bordo di led, i laser che spazzano il cielo, i fari a cono, lo stroboscopio a tempo, la foschia
 * colorata; la folla che salta, molti con le braccia alzate; tutt'attorno i camper coi finestrini accesi,
 * i furgoni e i camion; fuori dalle transenne le volanti della polizia coi lampeggianti blu e gli agenti.
 * Sta nel varco fra due carte (2,47, dove di giorno c'è il Perito Moreno) e sul pianoro alto, perché
 * il muro, la folla e i laser spuntino sopra le carte. Tutto a materiale semplice, senza luci vere.
 */

const A = ANGOLO_ZONA + 2.47;
const D = 31;
const SU = PELO_ACQUA - 0.3;
/** l'altezza del pianoro sopra l'acqua */
const H = 5.2;
const BPM = 142;

type Pezzi = THREE.BufferGeometry[];

/** Colora una geometria per vertice, con un poco d'ombra sulle facce che non guardano in su o verso chi guarda. */
function tinta(g: THREE.BufferGeometry, colore: THREE.ColorRepresentation) {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  geo.deleteAttribute("uv");
  geo.computeVertexNormals();
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const base = new THREE.Color(colore), c = new THREE.Color();
  const col = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    c.copy(base).multiplyScalar(0.7 + 0.3 * Math.max(n.getY(i), -n.getZ(i), 0));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}
const box = (p: Pezzi, x: number, y: number, z: number, l: number, h: number, pr: number, c: THREE.ColorRepresentation, ry = 0) =>
  p.push(tinta(new THREE.BoxGeometry(l, h, pr).translate(0, h / 2, 0).rotateY(ry).translate(x, y, z), c));
const unisci = (p: Pezzi, materiale: THREE.Material) => {
  const m = new THREE.Mesh(mergeGeometries(p), materiale);
  p.forEach((g) => g.dispose());
  return m;
};

export class Rave {
  gruppo = new THREE.Group();
  private texture: THREE.Texture[] = [];
  private laser: { m: THREE.Mesh; fase: number; base: number }[] = [];
  private coni: { m: THREE.Mesh; fase: number }[] = [];
  private strobo: THREE.Sprite;
  private bagliori: THREE.Sprite[] = [];
  private lampeggianti: { s: THREE.Sprite; fase: number }[] = [];
  private led: THREE.Mesh;
  private ledTela: { x: CanvasRenderingContext2D; t: THREE.CanvasTexture };
  private corpi: THREE.InstancedMesh;
  private teste: THREE.InstancedMesh;
  private braccia: THREE.InstancedMesh;
  private gente: { x: number; z: number; giro: number; fase: number; su: boolean; alto: number }[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(notte: boolean) {
    const g = this.gruppo;
    g.position.set(Math.sin(A) * D, SU, -Math.cos(A) * D);
    g.rotation.y = Math.PI - A;
    const r = generatore(42);
    const scuro = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

    // il pianoro: piatto in cima, scende ripido verso l'acqua; terra scura, appena illuminata dal rave
    {
      const geo = new THREE.PlaneGeometry(30, 20, 60, 40).rotateX(-Math.PI / 2).translate(0, 0, 1);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const col = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const t = Math.hypot(x / 12.5, (z - 1) / 7.5);
        const k = t < 0.85 ? 1 : t > 1.25 ? 0 : 1 - THREE.MathUtils.smoothstep(t, 0.85, 1.25);
        pos.setY(i, -0.6 + (H + 0.6) * k + 0.08 * Math.sin(x * 1.7 + z));
        // al centro la terra battuta riflette un poco le luci del palco
        const luce = Math.exp(-(x * x) / 30 - ((z - 1) * (z - 1)) / 10);
        c.setRGB(0.05, 0.045, 0.05).lerp(new THREE.Color(0.16, 0.08, 0.2), luce * k);
        col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.add(new THREE.Mesh(geo, scuro));
    }

    const fisso: Pezzi = [];
    const acceso: Pezzi = [];
    // il muro di casse in fondo: pile di bassi e di medi, nere, coi coni grigi verso chi guarda
    const MZ = 4.2;
    for (let k = -4; k <= 4; k++) {
      const x = k * 0.95, alti = 4 + (Math.abs(k) < 3 ? 1 : 0);
      for (let j = 0; j < alti; j++) {
        const y = H + j * 0.9;
        box(fisso, x, y, MZ, 0.92, 0.88, 0.8, "#121216");
        const grande = j < 2;
        const cono = (cx: number, cy: number, rr: number) => fisso.push(tinta(new THREE.CircleGeometry(rr, 18).rotateY(Math.PI).translate(cx, cy, MZ - 0.41), "#3A3B42"));
        if (grande) cono(x, y + 0.44, 0.34);
        else {
          cono(x - 0.2, y + 0.44, 0.16);
          cono(x + 0.2, y + 0.44, 0.16);
        }
      }
    }
    // la consolle davanti al muro, col banco e il telo
    box(fisso, 0, H, MZ - 1.4, 2.4, 1.0, 0.8, "#1B1B22");
    box(fisso, 0, H + 1.0, MZ - 1.4, 2.5, 0.06, 0.9, "#2A2A33");
    // il bordo di led sopra e ai lati del muro: una tela che cambia colore a tempo
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 8;
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(tx);
    this.ledTela = { x: c.getContext("2d") as CanvasRenderingContext2D, t: tx };
    this.led = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 0.16).rotateY(Math.PI).translate(0, H + 4.62, MZ - 0.42), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, fog: false }));
    g.add(this.led);

    // i camper, i furgoni, i camion: in cerchio largo attorno alla folla, coi finestrini accesi
    const veicolo = (x: number, z: number, ry: number, tipo: "camper" | "furgone" | "camion") => {
      const L = tipo === "camion" ? 5.2 : tipo === "camper" ? 3.4 : 2.4, A2 = tipo === "camion" ? 1.9 : 1.6, P = tipo === "camion" ? 1.25 : 1.05;
      const colore = tipo === "camper" ? "#C9C6BC" : tipo === "camion" ? "#2A2C33" : r() < 0.5 ? "#3B3F4A" : "#6A5A44";
      const rot = (gg: THREE.BufferGeometry) => gg.rotateY(ry).translate(x, H, z);
      fisso.push(rot(tinta(new THREE.BoxGeometry(L, A2, P).translate(0, A2 / 2 + 0.25, 0), colore)));
      fisso.push(rot(tinta(new THREE.BoxGeometry(0.8, A2 * 0.75, P).translate(L / 2 + 0.4, (A2 * 0.75) / 2 + 0.25, 0), tipo === "camion" ? "#3A4150" : colore)));
      for (const sx of [-L / 2 + 0.5, L / 2 + 0.3]) fisso.push(rot(tinta(new THREE.CylinderGeometry(0.28, 0.28, P + 0.04, 10).rotateX(Math.PI / 2).translate(sx, 0.28, 0), "#0A0A0C")));
      if (tipo === "camper") {
        // la striscia, i finestrini accesi, il tendalino con la fila di lucine
        fisso.push(rot(tinta(new THREE.BoxGeometry(L + 0.02, 0.08, P + 0.02).translate(0, 0.9, 0), "#7A3A2A")));
        for (const wx of [-0.9, 0.2, 1.0]) acceso.push(rot(tinta(new THREE.PlaneGeometry(0.42, 0.3).rotateY(Math.PI).translate(wx, 1.35, -P / 2 - 0.01), "#FFC873")));
      } else if (tipo === "furgone") {
        acceso.push(rot(tinta(new THREE.PlaneGeometry(0.5, 0.25).rotateY(Math.PI).translate(-0.3, 1.25, -P / 2 - 0.01), "#FFB25E")));
      } else {
        // il camion col portellone aperto, dentro la luce
        acceso.push(rot(tinta(new THREE.PlaneGeometry(1.2, 1.2).rotateY(-Math.PI / 2).translate(-L / 2 - 0.01, 1.2, 0), "#FF8A4A")));
      }
      acceso.push(rot(tinta(new THREE.PlaneGeometry(0.5, 0.35).rotateY(Math.PI).translate(L / 2 + 0.4, 1.25, -P / 2 - 0.01), "#3A4A66")));
    };
    veicolo(-8.6, 1.5, 0.5, "camper");
    veicolo(-9.4, -1.6, 0.25, "camper");
    veicolo(-7.2, 4.4, -0.3, "camion");
    veicolo(8.8, 1.2, Math.PI - 0.45, "camper");
    veicolo(9.6, -1.9, Math.PI - 0.2, "furgone");
    veicolo(7.4, 4.6, Math.PI + 0.3, "camion");
    veicolo(5.4, 6.4, Math.PI, "furgone");
    veicolo(-4.8, 6.6, 0, "camper");

    // le transenne davanti, e fuori, sul ciglio, le volanti con gli agenti
    // le transenne: basse e scure, a griglia, in arco davanti alla folla; il varco al centro
    for (let k = -12; k <= 12; k++) {
      const x = k * 0.7;
      if (Math.abs(x) < 1.0) continue;
      const z = -3.6 + 0.02 * x * x;
      box(fisso, x, H + 0.05, z, 0.66, 0.04, 0.03, "#3A3C42");
      box(fisso, x, H + 0.42, z, 0.66, 0.04, 0.03, "#3A3C42");
      for (const dx of [-0.3, 0, 0.3]) box(fisso, x + dx, H, z, 0.025, 0.46, 0.025, "#3A3C42");
    }
    const volante = (x: number, z: number, ry: number) => {
      const rot = (gg: THREE.BufferGeometry) => gg.rotateY(ry).translate(x, H, z);
      fisso.push(rot(tinta(new THREE.BoxGeometry(2.2, 0.55, 0.95).translate(0, 0.5, 0), "#1E2A4A")));
      fisso.push(rot(tinta(new THREE.BoxGeometry(1.2, 0.42, 0.9).translate(-0.1, 0.98, 0), "#1E2A4A")));
      fisso.push(rot(tinta(new THREE.BoxGeometry(2.21, 0.08, 0.96).translate(0, 0.55, 0), "#B8322A")));
      for (const sx of [-0.7, 0.7]) fisso.push(rot(tinta(new THREE.CylinderGeometry(0.2, 0.2, 0.98, 10).rotateX(Math.PI / 2).translate(sx, 0.22, 0), "#0A0A0C")));
      acceso.push(rot(tinta(new THREE.BoxGeometry(0.24, 0.04, 0.14).translate(0.85, 0.6, 0.3), "#FFF2D0")));
      acceso.push(rot(tinta(new THREE.BoxGeometry(0.24, 0.04, 0.14).translate(0.85, 0.6, -0.3), "#FFF2D0")));
      // i lampeggianti, blu, alternati
      const tb = alone("#4A7BFF");
      this.texture.push(tb);
      for (const dz of [-0.25, 0.25]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tb, color: "#5C8CFF", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        sp.position.copy(this.v.set(-0.1, 1.28, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)).add(new THREE.Vector3(x, H, z));
        sp.scale.setScalar(1.3);
        g.add(sp);
        this.lampeggianti.push({ s: sp, fase: dz > 0 ? 0 : Math.PI });
      }
    };
    // le volanti fuori, ai due fianchi del pianoro, girate verso il rave: non coprono la folla
    volante(-11.2, -2.2, -0.9);
    volante(-10.6, -4.6, -0.6);
    volante(11.0, -3.4, Math.PI + 0.8);
    // gli agenti: in piedi accanto alle volanti, il berretto, uno con la torcia
    const agente = (x: number, z: number) => {
      box(fisso, x, H, z, 0.32, 1.25, 0.24, "#141B2E");
      fisso.push(tinta(new THREE.SphereGeometry(0.12, 8, 6).translate(x, H + 1.4, z), "#2A2A30"));
      fisso.push(tinta(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8).translate(x, H + 1.53, z), "#141B2E"));
    };
    [[-9.6, -3.6], [-9.2, -4.3], [-9.9, -1.2], [9.8, -2.4], [10.2, -4.8]].forEach(([x, z]) => agente(x, z));

    g.add(unisci(fisso, scuro));
    g.add(unisci(acceso, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false })));

    // la folla: corpo, testa, braccia; istanze scure contro le luci del palco
    const N = 240;
    for (let i = 0; i < N; i++) {
      const raggio = Math.sqrt(r()) * 1, an = r() * Math.PI * 2;
      const x = Math.cos(an) * raggio * 6.6, z = 0.4 + Math.sin(an) * raggio * 3.2;
      if (z > 2.4 || z < -3.2) continue;
      this.gente.push({ x, z, giro: Math.PI + (r() - 0.5) * 0.9, fase: r() * 6, su: r() < 0.45, alto: 0.9 + r() * 0.2 });
    }
    const n = this.gente.length;
    const nero = new THREE.MeshBasicMaterial({ color: "#FFFFFF", fog: false });
    this.corpi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.9, 2, 6).translate(0, 0.65, 0), nero, n);
    this.teste = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), nero, n);
    this.braccia = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.06, 0.6, 2, 5).translate(0, 0.32, 0), nero, n * 2);
    // controluce: scuri, appena tinti dai colori del palco
    const tinte = ["#1A1424", "#241830", "#2A1426", "#14202A", "#1C1C22"];
    this.gente.forEach((p, i) => {
      const c2 = new THREE.Color(tinte[i % tinte.length]);
      this.corpi.setColorAt(i, c2);
      this.teste.setColorAt(i, c2);
      this.braccia.setColorAt(i * 2, c2);
      this.braccia.setColorAt(i * 2 + 1, c2);
    });
    for (const im of [this.corpi, this.teste, this.braccia]) {
      im.frustumCulled = false;
      g.add(im);
    }

    // i laser: lame sottili dal muro verso il cielo, che spazzano; verdi, magenta, azzurri
    const colori = ["#39FF7A", "#FF3AD9", "#3AE0FF", "#39FF7A", "#FF3AD9", "#B05CFF"];
    for (let k = 0; k < 6; k++) {
      const geo = new THREE.PlaneGeometry(0.05, 30).translate(0, 15, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colori[k], transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      m.position.set(-3.2 + k * 1.28, H + 3.8, MZ - 0.3);
      g.add(m);
      this.laser.push({ m, fase: k * 1.1, base: (k - 2.5) * 0.16 });
    }
    // i fari a cono: fasci larghi e sfumati, che si muovono sopra la folla
    const sfuma = tela(4, 128, (x) => {
      const v = x.createLinearGradient(0, 0, 0, 128);
      v.addColorStop(0, "rgba(255,255,255,0)");
      v.addColorStop(1, "rgba(255,255,255,1)");
      x.fillStyle = v;
      x.fillRect(0, 0, 4, 128);
    });
    this.texture.push(sfuma);
    for (let k = 0; k < 4; k++) {
      // la punta sul faro, la bocca larga in alto
      const geo = new THREE.ConeGeometry(1.6, 14, 18, 1, true).rotateX(Math.PI).translate(0, 7, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: sfuma, color: k % 2 ? "#FFE2B0" : "#B98AFF", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.position.set(-3 + k * 2, H + 3.9, MZ - 0.6);
      g.add(m);
      this.coni.push({ m, fase: k * 1.7 });
    }
    // lo stroboscopio sopra la consolle, i bagliori colorati nella foschia sopra la folla
    const tw = alone("#FFFFFF");
    this.texture.push(tw);
    this.strobo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tw, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.strobo.position.set(0, H + 4.4, MZ - 0.6);
    this.strobo.scale.setScalar(5);
    g.add(this.strobo);
    const tf = bruma(21);
    this.texture.push(tf);
    ["#FF3AD9", "#3AE0FF", "#7A5CFF"].forEach((col, k) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tf, color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.set(-4 + k * 4, H + 2.4, 1.5);
      s.scale.set(9, 5, 1);
      g.add(s);
      this.bagliori.push(s);
    });

    g.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
    this.setNotte(notte);
  }

  setNotte(notte: boolean) {
    this.gruppo.visible = notte;
  }

  aggiorna(t: number) {
    if (!this.gruppo.visible) return;
    const battito = (t * BPM) / 60;
    const fase = battito % 1;
    const colpo = Math.exp(-fase * 6);
    // la folla salta a tempo, ognuno un poco sfasato; chi ha le braccia su le agita
    this.gente.forEach((p, i) => {
      const salto = Math.max(0, Math.sin((battito + p.fase * 0.08) * Math.PI * 2)) * 0.16;
      const y = H + salto;
      this.q.setFromAxisAngle(this.v.set(0, 1, 0), p.giro);
      this.m.compose(this.v.set(p.x, y, p.z), this.q, this.s.setScalar(p.alto));
      this.corpi.setMatrixAt(i, this.m);
      this.m.compose(this.v.set(p.x, y + 1.38 * p.alto, p.z), this.q, this.s.setScalar(p.alto));
      this.teste.setMatrixAt(i, this.m);
      [-1, 1].forEach((lato, k) => {
        const alzo = p.su ? Math.PI - 0.35 + 0.25 * Math.sin(battito * Math.PI * 2 + p.fase + k) : 0.25;
        this.e.set(0, p.giro, lato * alzo, "YXZ");
        this.q.setFromEuler(this.e);
        const spalla = this.v.set(lato * 0.24, 1.15 * p.alto, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.giro);
        this.m.compose(spalla.add(new THREE.Vector3(p.x, y, p.z)), this.q, this.s.setScalar(p.alto));
        this.braccia.setMatrixAt(i * 2 + k, this.m);
      });
    });
    for (const im of [this.corpi, this.teste, this.braccia]) im.instanceMatrix.needsUpdate = true;
    // i laser spazzano e a volte si spengono tutti insieme
    const buio = Math.floor(battito / 16) % 4 === 3 && Math.floor(battito) % 2 === 0;
    this.laser.forEach((l) => {
      l.m.rotation.z = l.base + 0.55 * Math.sin(t * 0.7 + l.fase);
      l.m.rotation.x = -0.35 + 0.2 * Math.sin(t * 0.4 + l.fase * 2);
      (l.m.material as THREE.MeshBasicMaterial).opacity = buio ? 0 : 0.55 + 0.35 * colpo;
    });
    this.coni.forEach((c) => {
      c.m.rotation.z = 0.5 * Math.sin(t * 0.5 + c.fase);
      c.m.rotation.x = -0.6 + 0.25 * Math.sin(t * 0.33 + c.fase);
    });
    // lo stroboscopio: un lampo su ogni battuta nei tratti forti
    const forte = Math.floor(battito / 32) % 2 === 1;
    this.strobo.material.opacity = forte ? colpo : 0;
    this.bagliori.forEach((b, k) => (b.material.opacity = 0.16 + 0.18 * Math.max(0, Math.sin(t * 0.9 + k * 2)) + 0.12 * colpo));
    // i lampeggianti blu, alternati, veloci
    this.lampeggianti.forEach((l) => (l.s.material.opacity = Math.sin(t * 9 + l.fase) > 0.2 ? 1 : 0.08));
    // il bordo di led: una fascia di colore che corre a tempo
    const { x, t: tx } = this.ledTela;
    for (let i = 0; i < 32; i++) {
      const h = ((i / 32 + battito / 8) % 1 + 1) % 1;
      x.fillStyle = `hsl(${Math.round(h * 360)},90%,${50 + 25 * colpo}%)`;
      x.fillRect(i * 8, 0, 8, 8);
    }
    tx.needsUpdate = true;
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
