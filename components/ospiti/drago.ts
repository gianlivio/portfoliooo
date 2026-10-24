import * as THREE from "three";
import { type Ospite, alone, assi, cancella, casuale, finito, liberaTutto, loft, primo, riposo, segno, tela, tocca } from "./comuni";

/**
 * Di notte, di rado, un drago cinese attraversa il cielo dietro le carte, gigantesco e lento:
 * un corpo di serpente lunghissimo che ondeggia come se nuotasse nell'aria, squame d'oro,
 * il ventre chiaro a placche, la cresta vermiglia come una fiamma lungo tutta la schiena,
 * quattro zampe corte con gli artigli, la testa con le corna ramificate, i lunghi baffi che ondeggiano,
 * la criniera rossa, gli occhi accesi. Ogni tanto spalanca le fauci e sputa una lingua di fuoco.
 */

const LUNGO = 26; // lunghezza del corpo, in unità di scena
const N = 140; // anelli lungo la spina
const R = 14; // vertici per anello
const ORO = new THREE.Color("#F0B845");
const VENTRE = new THREE.Color("#F4E2AE");
const VERMIGLIO = "#D8452B";

/** Raggio del corpo a una distanza s dalla testa: collo, ventre pieno, coda che si assottiglia. */
function raggio(s: number) {
  const u = s / LUNGO;
  const collo = 0.46 + 0.24 * THREE.MathUtils.smoothstep(s, 0, 2.6);
  return Math.max(0.06, collo * Math.pow(1 - u, 0.7) + 0.05 * (1 - u));
}

/** Squame a embrice: tessera chiara al centro, bordo scuro in basso. Grigia: il colore lo danno i vertici. */
function texturaSquame() {
  return tela(128, 128, (x) => {
    x.fillStyle = "#6A5A40";
    x.fillRect(0, 0, 128, 128);
    const S = 32;
    for (let r = -1; r < 6; r++) {
      for (let c = -1; c < 6; c++) {
        const cx = c * S + (r % 2 ? S / 2 : 0);
        const cy = r * S * 0.75;
        const g = x.createRadialGradient(cx, cy + S * 0.15, 2, cx, cy, S * 0.62);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(0.65, "#D8CCB0");
        g.addColorStop(0.9, "#8A7550");
        g.addColorStop(1, "#4A3C28");
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, S * 0.58, 0, Math.PI);
        x.fill();
      }
    }
  });
}

type Zampa = { g: THREE.Group; s: number; lato: number; fase: number; coscia: THREE.Group; stinco: THREE.Group };

export class Drago implements Ospite {
  gruppo = new THREE.Group();
  private drago = new THREE.Group();
  private corpo: THREE.Mesh;
  private cresta: THREE.Mesh;
  private testa = new THREE.Group();
  private mandibola = new THREE.Group();
  private baffi: THREE.Line[] = [];
  private zampe: Zampa[] = [];
  private fuoco: { s: THREE.Sprite; nato: number; v: THREE.Vector3 }[] = [];
  private soffio = { inizio: -10, prossimo: 0, emessi: 0 };
  private texture: THREE.Texture[] = [];
  private spina = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }));
  private stato = { prossima: primo(6, 2), inizio: -1, durata: 44, da: new THREE.Vector3(), a: new THREE.Vector3(), fase: 0 };
  private m = new THREE.Matrix4();
  private v = new THREE.Vector3();

  constructor() {
    const txSquame = texturaSquame();
    txSquame.wrapS = txSquame.wrapT = THREE.RepeatWrapping;
    this.texture.push(txSquame);
    const pelle = new THREE.MeshStandardMaterial({
      map: txSquame, vertexColors: true, roughness: 0.5, metalness: 0.2,
      emissive: "#D08A28", emissiveMap: txSquame, emissiveIntensity: 0.62, fog: false,
    });
    const rosso = new THREE.MeshStandardMaterial({ color: VERMIGLIO, roughness: 0.6, emissive: "#C4301A", emissiveIntensity: 0.55, side: THREE.DoubleSide, vertexColors: true, fog: false });
    const avorio = new THREE.MeshStandardMaterial({ color: "#F2E6C8", roughness: 0.4, emissive: "#5A4A30", emissiveIntensity: 0.5, fog: false });

    // il corpo: un tubo che si rifà a ogni fotogramma lungo la spina che ondeggia
    const pos = new Float32Array(N * R * 3);
    const uv = new Float32Array(N * R * 2);
    const col = new Float32Array(N * R * 3);
    const idx: number[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < R; j++) {
        const k = i * R + j;
        const ang = (j / R) * Math.PI * 2;
        // le squame girano attorno al corpo e si ripetono lungo: anelli di tessere, non righe
        uv[k * 2] = (j / R) * 7;
        uv[k * 2 + 1] = (i / (N - 1)) * 64;
        // il ventre è sotto (sin < 0): chiaro, a placche; il dorso d'oro, più scuro verso la coda e sui fianchi
        const sotto = THREE.MathUtils.smoothstep(-Math.sin(ang), 0.35, 0.75);
        const rilievo = 0.62 + 0.38 * Math.max(0, Math.sin(ang)) + 0.12 * Math.cos(ang);
        const c = ORO.clone().multiplyScalar(rilievo * (1 - (i / N) * 0.25)).lerp(VENTRE.clone().multiplyScalar(i % 3 === 0 ? 0.78 : 1), sotto);
        col.set([c.r, c.g, c.b], k * 3);
        if (i < N - 1) {
          const a = k, b = i * R + ((j + 1) % R), cc = (i + 1) * R + j, d = (i + 1) * R + ((j + 1) % R);
          idx.push(a, b, cc, b, d, cc);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    this.corpo = new THREE.Mesh(geo, pelle);
    this.drago.add(this.corpo);

    // la cresta: un nastro di fiamme lungo la schiena, rosso alla base e arancio in punta
    const cpos = new Float32Array(N * 2 * 3);
    const ccol = new Float32Array(N * 2 * 3);
    const cidx: number[] = [];
    const base = new THREE.Color("#9A2414"), punta = new THREE.Color("#FF8A3A");
    for (let i = 0; i < N; i++) {
      ccol.set([base.r, base.g, base.b, punta.r, punta.g, punta.b], i * 6);
      if (i < N - 1) cidx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const cgeo = new THREE.BufferGeometry();
    cgeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
    cgeo.setAttribute("color", new THREE.BufferAttribute(ccol, 3));
    cgeo.setIndex(cidx);
    this.cresta = new THREE.Mesh(cgeo, rosso);
    this.drago.add(this.cresta);

    // la testa, muso verso +z, costruita a parte e orientata sulla spina
    const cranio = loft([
      { z: -0.35, l: 0.34, su: 0.36, giu: 0.3 },
      { z: -0.05, l: 0.38, su: 0.34, giu: 0.26 },
      { z: 0.35, l: 0.3, su: 0.26, giu: 0.16 },
      { z: 0.8, l: 0.22, su: 0.2, giu: 0.1, y: -0.04 },
      { z: 1.1, l: 0.24, su: 0.2, giu: 0.1, y: -0.05 },
      { z: 1.25, l: 0.16, su: 0.14, giu: 0.08, y: -0.06 },
      { z: 1.32, l: 0.04, su: 0.04, giu: 0.04, y: -0.07 },
    ], { radiali: 18, passi: 3 });
    const pelleTesta = new THREE.MeshStandardMaterial({ color: ORO, roughness: 0.45, metalness: 0.2, emissive: "#C07E24", emissiveIntensity: 0.62, fog: false });
    this.testa.add(new THREE.Mesh(cranio, pelleTesta));
    // arcate sopracciliari e occhi accesi
    const occhi = new THREE.MeshBasicMaterial({ color: "#FFE680", toneMapped: false, fog: false });
    for (const s of [-1, 1]) {
      const arcata = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8).scale(1, 0.55, 1.6), pelleTesta);
      arcata.position.set(s * 0.22, 0.25, 0.32);
      this.testa.add(arcata);
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), occhi);
      o.position.set(s * 0.27, 0.17, 0.38);
      this.testa.add(o);
      // narici a bulbo in punta al muso
      const narice = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pelleTesta);
      narice.position.set(s * 0.12, 0.08, 1.18);
      this.testa.add(narice);
      // corna ramificate, all'indietro
      const corno = new THREE.Group();
      corno.position.set(s * 0.18, 0.32, -0.15);
      corno.rotation.set(-0.9, s * 0.35, 0);
      corno.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.8, 7).translate(0, 0.4, 0), avorio));
      const ramo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.35, 6).translate(0, 0.175, 0), avorio);
      ramo.position.y = 0.38;
      ramo.rotation.x = 0.8;
      corno.add(ramo);
      const ramo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.25, 6).translate(0, 0.125, 0), avorio);
      ramo2.position.y = 0.62;
      ramo2.rotation.x = -0.7;
      corno.add(ramo2);
      this.testa.add(corno);
      // ciuffi della criniera sulle guance, tirati indietro dal vento
      for (let k = 0; k < 3; k++) {
        const ciuffo = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 6).translate(0, 0.35, 0), rosso);
        ciuffo.position.set(s * 0.3, -0.05 + k * 0.12, -0.1 - k * 0.06);
        ciuffo.rotation.set(-1.9 + k * 0.2, 0, s * (0.5 + k * 0.15));
        this.testa.add(ciuffo);
      }
    }
    // la mandibola, un po' aperta, con le zanne
    const mand = loft([
      { z: -0.1, l: 0.26, su: 0.06, giu: 0.1 },
      { z: 0.5, l: 0.2, su: 0.05, giu: 0.08 },
      { z: 1.05, l: 0.15, su: 0.04, giu: 0.06 },
      { z: 1.15, l: 0.03, su: 0.02, giu: 0.03 },
    ], { radiali: 14, passi: 3 });
    this.mandibola.add(new THREE.Mesh(mand, pelleTesta));
    for (const s of [-1, 1]) {
      const zanna = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 6), avorio);
      zanna.position.set(s * 0.12, 0.1, 0.95);
      this.mandibola.add(zanna);
      const zanna2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 6).rotateX(Math.PI), avorio);
      zanna2.position.set(s * 0.14, -0.08, 1.0);
      this.testa.add(zanna2);
    }
    // la barba sotto il mento
    const barba = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 7).translate(0, -0.3, 0), rosso);
    barba.position.set(0, -0.08, 0.2);
    barba.rotation.x = 0.7;
    this.mandibola.add(barba);
    this.mandibola.position.set(0, -0.1, 0.0);
    this.testa.add(this.mandibola);
    // i baffi: due fili lunghi dal labbro superiore, ondeggiano all'indietro
    for (let s = 0; s < 2; s++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#F6DFA0", fog: false }));
      this.testa.add(l);
      this.baffi.push(l);
    }
    this.drago.add(this.testa);

    // le zampe: corte, con tre artigli
    const zampa = (s: number, lato: number, fase: number) => {
      const g = new THREE.Group();
      const coscia = new THREE.Group();
      coscia.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.55, 8).translate(0, -0.27, 0), pelleTesta));
      const stinco = new THREE.Group();
      stinco.position.y = -0.52;
      stinco.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 8).translate(0, -0.22, 0), pelleTesta));
      for (let k = -1; k <= 1; k++) {
        const artiglio = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5).translate(0, 0.11, 0), avorio);
        artiglio.position.set(k * 0.06, -0.45, 0.02);
        artiglio.rotation.set(1.2, 0, k * 0.4);
        stinco.add(artiglio);
      }
      // un ciuffo rosso al gomito
      const ciuffo = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5).translate(0, -0.17, 0), rosso);
      ciuffo.rotation.x = 2.2;
      stinco.add(ciuffo);
      coscia.add(stinco);
      g.add(coscia);
      this.drago.add(g);
      this.zampe.push({ g, s, lato, fase, coscia, stinco });
    };
    zampa(2.6, 1, 0);
    zampa(2.6, -1, Math.PI);
    zampa(10.5, 1, Math.PI * 0.6);
    zampa(10.5, -1, Math.PI * 1.6);

    // il fuoco: sbuffi luminosi che escono dalla bocca, si gonfiano, passano dal giallo al rosso e si spengono
    const txFuoco = alone("#FFE7B0");
    this.texture.push(txFuoco);
    for (let k = 0; k < 80; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: txFuoco, color: "#FFC24A", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
      sp.visible = false;
      this.drago.add(sp);
      this.fuoco.push({ s: sp, nato: -10, v: new THREE.Vector3() });
    }

    this.gruppo.add(this.drago);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  /** La spina nello spazio del drago: x avanti, y su, z di lato. L'onda corre dalla testa alla coda. */
  private piega(t: number) {
    const f = this.stato.fase;
    this.spina.forEach((sp, i) => {
      const s = (i / (N - 1)) * LUNGO;
      const busta = 0.35 + 0.65 * THREE.MathUtils.smoothstep(s, 0, 5);
      sp.p.set(
        -s,
        Math.sin((s / 9) * Math.PI * 2 - t * 1.1 + f) * 1.5 * busta,
        Math.sin((s / 13) * Math.PI * 2 - t * 0.8 + f * 1.7) * 1.9 * busta
      );
    });
    const su = this.v.set(0, 1, 0);
    this.spina.forEach((sp, i) => {
      const a = this.spina[Math.max(0, i - 1)].p, b = this.spina[Math.min(N - 1, i + 1)].p;
      sp.t.subVectors(a, b).normalize(); // verso la testa
      sp.n.copy(su).addScaledVector(sp.t, -su.dot(sp.t)).normalize();
      sp.b.crossVectors(sp.t, sp.n);
    });
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const _dt = dt;
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notteCielo", "drago", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d = casuale(36, 42);
      const y = d * Math.tan(casuale(0.24, 0.3));
      s.da.copy(avanti).multiplyScalar(d).addScaledVector(lato, -(d * 0.9 + LUNGO) * v).setY(y);
      s.a.copy(avanti).multiplyScalar(d + casuale(-3, 3)).addScaledVector(lato, (d * 0.9 + LUNGO) * v).setY(y + casuale(-1.5, 1.5));
      s.durata = casuale(40, 48);
      s.fase = casuale(0, 10);
      s.inizio = t;
      this.soffio.prossimo = t + casuale(4, 7);
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notteCielo", "drago", t);
      return;
    }
    // il drago vola da un capo all'altro del cielo; il suo spazio ha x nella direzione del volo
    this.drago.position.lerpVectors(s.da, s.a, k);
    const dir = this.v.subVectors(s.a, s.da).normalize();
    this.drago.rotation.set(0, Math.atan2(-dir.z, dir.x), Math.sin(t * 0.3) * 0.05);

    this.piega(t);
    // il corpo
    const pos = this.corpo.geometry.attributes.position as THREE.BufferAttribute;
    const w = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const sp = this.spina[i];
      const r = raggio((i / (N - 1)) * LUNGO);
      for (let j = 0; j < R; j++) {
        const ang = (j / R) * Math.PI * 2;
        w.copy(sp.p).addScaledVector(sp.b, Math.cos(ang) * r * 0.92).addScaledVector(sp.n, Math.sin(ang) * r);
        pos.setXYZ(i * R + j, w.x, w.y, w.z);
      }
    }
    pos.needsUpdate = true;
    this.corpo.geometry.computeVertexNormals();
    // la cresta: punte a fiamma che tremano
    const cp = this.cresta.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const sp = this.spina[i];
      const sv = (i / (N - 1)) * LUNGO;
      const r = raggio(sv);
      const dente = 0.12 + 0.88 * Math.pow(Math.abs(Math.sin(sv * 2.2)), 3);
      const h = (0.1 + r * 0.8) * dente * (1 + 0.12 * Math.sin(t * 6 + i * 0.7)) * (i < 3 ? 0.2 : 1);
      w.copy(sp.p).addScaledVector(sp.n, r * 0.92);
      cp.setXYZ(i * 2, w.x, w.y, w.z);
      w.addScaledVector(sp.n, h).addScaledVector(sp.t, -h * 0.5);
      cp.setXYZ(i * 2 + 1, w.x, w.y, w.z);
    }
    cp.needsUpdate = true;
    this.cresta.geometry.computeVertexNormals();

    // la testa sulla punta della spina, orientata come lei; la bocca si apre e si chiude piano
    const t0 = this.spina[0];
    this.m.makeBasis(t0.b.clone().negate(), t0.n, t0.t);
    this.testa.quaternion.setFromRotationMatrix(this.m);
    this.testa.position.copy(t0.p).addScaledVector(t0.t, 0.15);
    this.testa.scale.setScalar(1.7);
    // il soffio: la bocca si spalanca, il fuoco esce per un secondo e mezzo; poi di nuovo fra qualche secondo
    const so = this.soffio;
    if (t > so.prossimo && e < s.durata - 4) {
      so.inizio = t;
      so.emessi = 0;
      so.prossimo = t + casuale(6, 10);
    }
    const es = t - so.inizio;
    const aperta = es < 1.9 ? Math.sin(Math.min(1, es / 1.9) * Math.PI) : 0;
    this.mandibola.rotation.x = 0.18 + 0.12 * Math.sin(t * 0.7) + aperta * 0.55;
    const bocca = w.set(0, -0.16, 2.5).applyQuaternion(this.testa.quaternion).add(this.testa.position);
    const avantiTesta = this.v.set(0, -0.12, 1).normalize().applyQuaternion(this.testa.quaternion);
    if (es >= 0 && es < 1.5) {
      const dovuti = Math.floor(es * 50);
      for (; so.emessi < dovuti; so.emessi++) {
        const f = this.fuoco.find((x) => t - x.nato > 1.3);
        if (!f) break;
        f.nato = t;
        f.s.position.copy(bocca);
        f.v.copy(avantiTesta).multiplyScalar(casuale(15, 19)).add(new THREE.Vector3(casuale(-0.8, 0.8), casuale(-0.6, 0.6), casuale(-0.8, 0.8)));
        // con pochi fotogrammi al secondo ne escono parecchi insieme: li sparpaglio lungo il tratto già percorso
        f.s.position.addScaledVector(f.v, Math.random() * Math.min(_dt, 0.1));
        f.s.visible = true;
      }
    }
    const caldo = new THREE.Color("#FFE38A"), freddo = new THREE.Color("#E2361A");
    this.fuoco.forEach((f) => {
      const vita = (t - f.nato) / 1.3;
      if (vita >= 1 || vita < 0) {
        f.s.visible = false;
        return;
      }
      f.s.position.addScaledVector(f.v, _dt);
      f.v.multiplyScalar(Math.max(0, 1 - _dt * 0.7));
      f.v.y += _dt * 1.2;
      f.s.scale.setScalar(1.2 + vita * 4);
      f.s.material.color.copy(caldo).lerp(freddo, Math.min(1, vita * 1.4));
      f.s.material.opacity = (1 - vita) * Math.min(1, vita * 8) * 0.95;
    });
    // i baffi
    this.baffi.forEach((l, q) => {
      const lato = q ? 1 : -1;
      const bp = l.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 24; i++) {
        const u = i / 23;
        bp.setXYZ(
          i,
          lato * (0.2 + u * 0.9 + Math.sin(t * 1.6 + u * 4) * 0.15 * u),
          0.02 - u * 0.4 + Math.sin(t * 2.1 + u * 5 + q) * 0.25 * u,
          1.05 - u * 2.6
        );
      }
      bp.needsUpdate = true;
    });
    // le zampe, attaccate al fianco, remano piano nell'aria
    this.zampe.forEach((z) => {
      const i = Math.round((z.s / LUNGO) * (N - 1));
      const sp = this.spina[i];
      const r = raggio(z.s);
      z.g.position.copy(sp.p).addScaledVector(sp.b, z.lato * r * 0.75).addScaledVector(sp.n, -r * 0.35);
      z.g.scale.setScalar(1.6);
      this.m.makeBasis(sp.b.clone().negate(), sp.n, sp.t);
      z.g.quaternion.setFromRotationMatrix(this.m);
      z.coscia.rotation.set(-0.5 + Math.sin(t * 1.2 + z.fase) * 0.45, 0, -z.lato * 0.5);
      z.stinco.rotation.set(0.9 + Math.sin(t * 1.2 + z.fase + 1) * 0.35, 0, 0);
    });
  }

  libera() {
    cancella("notteCielo", "drago");
    liberaTutto(this.gruppo, this.texture);
  }
}
