import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { alone, bruma, generatore, liberaTutto, tela } from "./comuni";
import { alhambra, bologna, colora, labirinto, rilievo, sulRing, unisci } from "./meraviglie";

/**
 * L'orizzonte a sinistra dello sviluppatore, fino alla città: tutto in lontananza.
 * Di notte un petrolchimico come quelli di Priolo e di Gela, con le torce che bruciano, e più in qua
 * un faro su uno scoglio col fascio che gira. Di giorno colline siciliane d'erba secca,
 * pale eoliche sulla cresta e una fila di radiotelescopi sull'altopiano.
 */

const SU = PELO_ACQUA - 0.3;

const suAnello = (a: number, d: number, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);

/**
 * La versione notturna di un luogo a colori cotti (l'Alhambra, Bologna): ne clona le geometrie e ricolora
 * i vertici. La pietra calda e gli intonaci chiari del costruito diventano ambra, come sotto i riflettori;
 * il verde dei boschi quasi nero; le montagne dietro (z locale oltre 3) blu notte, la neve appena chiara.
 * Alla base del costruito, una fila di aloni caldi: i riflettori che lo illuminano dal basso.
 */
function notturno(g: THREE.Group, alone: THREE.Texture) {
  const n = g.clone(true);
  const c = new THREE.Color(), v = new THREE.Vector3(), box = new THREE.Box3();
  n.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry = m.geometry.clone();
    const col = m.geometry.attributes.color as THREE.BufferAttribute | undefined;
    if (!col) {
      const mat = (m.material as THREE.MeshBasicMaterial).clone();
      mat.color.multiplyScalar(0.3);
      m.material = mat;
      return;
    }
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < col.count; i++) {
      c.fromBufferAttribute(col, i);
      v.fromBufferAttribute(pos, i);
      const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      // i colori dei vertici sono lineari: i valori bassi qui sono già scuri a schermo
      if (v.z > 3) c.setRGB(...(l > 0.75 ? [0.05, 0.06, 0.11] : [0.008, 0.01, 0.024]) as [number, number, number]);
      else if (c.g > c.r && c.g >= c.b) c.setRGB(0.004, 0.008, 0.006);
      else if (c.r > c.b + 0.08 || l > 0.6) {
        c.setRGB(1, 0.42, 0.13).multiplyScalar(0.25 + 0.75 * l);
        box.expandByPoint(v);
      } else c.multiplyScalar(0.05);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  });
  if (!box.isEmpty()) {
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone, color: "#FFB45A", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.set(box.min.x + ((box.max.x - box.min.x) * (k + 0.5)) / 7, box.min.y + 0.4, box.min.z - 0.3);
      s.scale.setScalar(2.4);
      n.add(s);
    }
  }
  return n;
}

/** Orienta un oggetto sull'anello: −z locale verso il centro, cioè verso chi guarda. */
function rivolgi(o: THREE.Object3D, a: number) {
  o.rotation.y = Math.PI - a;
}

export class Lontano {
  gruppo = new THREE.Group();
  private notte = new THREE.Group();
  private giorno = new THREE.Group();
  private texture: THREE.Texture[] = [];
  private fasci = new THREE.Group();
  private luciImpianto!: THREE.PointsMaterial;
  private luciRosse!: THREE.PointsMaterial;
  private ciminiere: THREE.Vector3[] = [];
  private fiamme: { cuore: THREE.Sprite; fiamma: THREE.Sprite; alone: THREE.Sprite; base: THREE.Vector3 }[] = [];
  private fumi: { s: THREE.Sprite; da: THREE.Vector3; fase: number }[] = [];
  private fumoTorce: { s: THREE.Sprite; da: THREE.Vector3; fase: number }[] = [];
  private rotori: THREE.Object3D[] = [];
  private parabole: { az: THREE.Object3D; el: THREE.Object3D; fase: number }[] = [];

  constructor(eNotte: boolean) {
    const r = generatore(77);
    this.petrolchimico(r);
    this.faro();
    this.colline(r);
    this.gruppo.add(this.notte, this.giorno);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(eNotte);
  }

  /* ------------------------------------------------------------------ notte */

  /**
   * Il petrolchimico, come a Priolo o a Gela: colonne di distillazione punteggiate di luci al sodio,
   * serbatoi sferici, due ciminiere con le luci rosse, due torce che bruciano e il vapore rischiarato dal basso.
   */
  private petrolchimico(r: () => number) {
    const pezzi: THREE.BufferGeometry[] = [];
    const luci: number[] = [], colori: number[] = [], rosse: number[] = [];
    const sodio = new THREE.Color("#FFB45A"), bianca = new THREE.Color("#FFF1D6"), rossa = new THREE.Color("#FF3A2A");
    const luce = (p: THREE.Vector3, c: THREE.Color) => {
      if (c === rossa) return void rosse.push(p.x, p.y, p.z);
      luci.push(p.x, p.y, p.z);
      colori.push(c.r, c.g, c.b);
    };
    const qui = (a: number, d: number) => suAnello(a, d, SU);
    const metti = (g: THREE.BufferGeometry, p: THREE.Vector3) => pezzi.push(g.translate(p.x, p.y, p.z));
    const A0 = ANGOLO_ZONA - 2.45, A1 = ANGOLO_ZONA - 1.75;
    // le colonne di distillazione, con i ballatoi e le luci giro giro
    for (let k = 0; k < 16; k++) {
      const a = A0 + 0.04 + r() * (A1 - A0 - 0.08);
      const p = qui(a, 39 + r() * 2.5);
      const h = 3.5 + Math.pow(r(), 1.4) * 7.5;
      const rad = 0.16 + r() * 0.22;
      metti(new THREE.CylinderGeometry(rad, rad * 1.1, h, 10).translate(0, h / 2, 0), p);
      metti(new THREE.SphereGeometry(rad, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, h, 0), p);
      for (let y = 1.4; y < h; y += 1.5 + r() * 0.6) {
        metti(new THREE.CylinderGeometry(rad + 0.14, rad + 0.14, 0.05, 12).translate(0, y, 0), p);
        for (let n = 0; n < 4; n++) {
          const an = (n / 4) * Math.PI * 2 + r();
          luce(p.clone().add(new THREE.Vector3(Math.cos(an) * (rad + 0.16), y + 0.08, Math.sin(an) * (rad + 0.16))), r() < 0.75 ? sodio : bianca);
        }
      }
      if (h > 8) luce(p.clone().setY(SU + h + 0.25), rossa);
    }
    // i serbatoi sferici sulle gambe
    for (let k = 0; k < 5; k++) {
      const p = qui(A0 + 0.1 + k * 0.13 + r() * 0.04, 37.5 + r());
      metti(new THREE.SphereGeometry(0.95, 16, 10).translate(0, 2.1, 0), p);
      for (let n = 0; n < 6; n++) {
        const an = (n / 6) * Math.PI * 2;
        metti(new THREE.BoxGeometry(0.07, 1.6, 0.07).translate(Math.cos(an) * 0.75, 0.8, Math.sin(an) * 0.75), p);
      }
      luce(p.clone().setY(SU + 3.1), bianca);
    }
    // i pipe rack: file di luci basse, orizzontali, fra le colonne
    for (let k = 0; k < 3; k++) {
      const y = SU + 2.2 + k * 1.1;
      for (let a = A0 + 0.05; a < A1 - 0.05; a += 0.018) if (r() < 0.7) luce(suAnello(a, 39.4 + k * 0.6, y), sodio);
    }
    // le ciminiere, alte, con le luci rosse a metà e in cima
    this.ciminiere = [ANGOLO_ZONA - 2.3, ANGOLO_ZONA - 1.92].map((a, i) => {
      const p = qui(a, 41);
      const h = 12.5 + i * 1.5;
      metti(new THREE.CylinderGeometry(0.3, 0.5, h, 12).translate(0, h / 2, 0), p);
      luce(p.clone().setY(SU + h + 0.1), rossa);
      luce(p.clone().setY(SU + h * 0.55), rossa);
      return p.clone().setY(SU + h + 0.3);
    });
    // le torce: un traliccio sottile, la fiamma in cima
    const torce = [ANGOLO_ZONA - 2.12, ANGOLO_ZONA - 1.82].map((a, i) => {
      const p = qui(a, 40.2);
      const h = 10 + i * 2;
      metti(new THREE.CylinderGeometry(0.1, 0.16, h, 6).translate(0, h / 2, 0), p);
      for (let y = 0; y < h; y += 1.2) metti(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 6).translate(0, y, 0), p);
      return p.clone().setY(SU + h);
    });
    // l'acciaio preso dal riverbero delle torce: un bruno caldo, appena più chiaro del cielo
    const ferro = new THREE.MeshBasicMaterial({ color: "#3A332E", fog: false });
    const tutto = mergeGeometries(pezzi.map((g) => (g.index ? g.toNonIndexed() : g)));
    pezzi.forEach((g) => g.dispose());
    this.notte.add(new THREE.Mesh(tutto, ferro));
    // la fiamma: una lingua che sfuma dal giallo bianco alla base all'arancio, poi al rosso, in alto trasparente
    const lingua = (caldo: boolean) =>
      tela(64, 128, (x) => {
        const g = x.createRadialGradient(32, 100, 2, 32, 80, 60);
        g.addColorStop(0, caldo ? "rgba(255,250,220,1)" : "rgba(255,190,90,1)");
        g.addColorStop(0.35, caldo ? "rgba(255,200,90,0.9)" : "rgba(255,120,40,0.8)");
        g.addColorStop(0.7, "rgba(230,70,20,0.35)");
        g.addColorStop(1, "rgba(120,20,0,0)");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(32, 2);
        x.bezierCurveTo(52, 50, 62, 90, 32, 126);
        x.bezierCurveTo(2, 90, 12, 50, 32, 2);
        x.fill();
      });
    const txW = alone("#FFFFFF"), txF = lingua(false), txC = lingua(true), txB = alone("#FF7A2A"), fumo = bruma(5);
    this.texture.push(txW, txF, txC, txB, fumo);
    const pts = new THREE.BufferGeometry();
    pts.setAttribute("position", new THREE.Float32BufferAttribute(luci, 3));
    pts.setAttribute("color", new THREE.Float32BufferAttribute(colori, 3));
    this.luciImpianto = new THREE.PointsMaterial({ map: txW, vertexColors: true, size: 0.55, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.notte.add(new THREE.Points(pts, this.luciImpianto));
    const ptsR = new THREE.BufferGeometry();
    ptsR.setAttribute("position", new THREE.Float32BufferAttribute(rosse, 3));
    this.luciRosse = new THREE.PointsMaterial({ map: txW, color: "#FF3A2A", size: 0.9, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.notte.add(new THREE.Points(ptsR, this.luciRosse));
    // le fiamme: un cuore chiaro, una fiamma arancio, un alone largo che rischiara il fumo
    const sprite = (map: THREE.Texture, op: number) =>
      new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    torce.forEach((p) => {
      const cuore = sprite(txC, 1), fiamma = sprite(txF, 0.95), alone_ = sprite(txB, 0.28);
      cuore.position.copy(p).setY(p.y + 0.5);
      fiamma.position.copy(p).setY(p.y + 0.9);
      alone_.position.copy(p).setY(p.y + 1);
      alone_.scale.setScalar(5);
      this.notte.add(cuore, fiamma, alone_);
      this.fiamme.push({ cuore, fiamma, alone: alone_, base: p });
    });
    // il vapore delle ciminiere, che sale e si allarga, preso dal bagliore arancio
    for (let k = 0; k < 10; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fumo, color: "#C9A58A", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      this.notte.add(s);
      this.fumi.push({ s, da: this.ciminiere[k % 2], fase: k / 10 });
    }
    // il fumo scuro delle torce
    torce.forEach((p, i) => {
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fumo, transparent: true, opacity: 0, depthWrite: false, fog: false }));
        this.notte.add(s);
        this.fumoTorce.push({ s, da: p, fase: k / 5 + i * 0.1 });
      }
    });
    // il bagliore sopra l'impianto
    const b = sprite(txB, 0.2);
    b.position.copy(suAnello(ANGOLO_ZONA - 2.1, 42, 3));
    b.scale.set(28, 10, 1);
    this.notte.add(b);
  }

  private faro() {
    const a = ANGOLO_ZONA - 1.05;
    const g = new THREE.Group();
    g.position.copy(suAnello(a, 38, SU));
    rivolgi(g, a);
    // lo scoglio
    const scoglio = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1).scale(3.2, 3.6, 2.4), new THREE.MeshBasicMaterial({ color: "#14161B", fog: false }));
    scoglio.position.y = 0.2;
    g.add(scoglio);
    // la torre a fasce bianche e rosse, appena rischiarata dalla lanterna
    const fasce = tela(16, 128, (x) => {
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i % 2 ? "#5A1C1C" : "#8C8C90";
        x.fillRect(0, i * 32, 16, 32);
      }
    });
    this.texture.push(fasce);
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 4.2, 16).translate(0, 5.6, 0), new THREE.MeshBasicMaterial({ map: fasce, fog: false }));
    g.add(torre);
    const lanterna = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 12).translate(0, 7.95, 0), new THREE.MeshBasicMaterial({ color: "#FFF1C2", fog: false, toneMapped: false }));
    g.add(lanterna);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.5, 12).translate(0, 8.45, 0), new THREE.MeshBasicMaterial({ color: "#20242B", fog: false }));
    g.add(cap);
    const txL = alone("#FFF0C0");
    this.texture.push(txL);
    const alo = new THREE.Sprite(new THREE.SpriteMaterial({ map: txL, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    alo.position.set(0, 7.95, 0);
    alo.scale.setScalar(3.2);
    g.add(alo);
    // il fascio: due coni di luce opposti che girano, più chiari vicino alla lanterna
    const sfuma = tela(4, 128, (x) => {
      const v = x.createLinearGradient(0, 0, 0, 128);
      v.addColorStop(0, "rgba(255,255,255,1)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = v;
      x.fillRect(0, 0, 4, 128);
    });
    this.texture.push(sfuma);
    const L = 26;
    const cono = new THREE.ConeGeometry(2.4, L, 20, 1, true).translate(0, -L / 2, 0).rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: sfuma, color: "#FFF2C8", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.fasci.position.set(0, 7.95, 0);
    this.fasci.add(new THREE.Mesh(cono, mat));
    const altro = new THREE.Mesh(cono, mat);
    altro.rotation.y = Math.PI;
    this.fasci.add(altro);
    g.add(this.fasci);
    this.notte.add(g);
  }

  /* ------------------------------------------------------------------ giorno */

  private colline(r: () => number) {
    // due crinali: quello dietro più alto e più velato, quello davanti con l'altopiano dei radiotelescopi
    const cielo = new THREE.Color("#BFD6EA");
    // le colline stanno nel mezzo: verso la città Bologna e San Luca, verso lo sviluppatore l'Alhambra
    // da sinistra a destra (per chi guarda): Bologna, le colline, l'Albaicín, l'Alhambra; ognuno a una distanza sua
    // le colline dove prima stava Bologna; Bologna passa sopra la carta più bassa, perché San Luca si veda
    const C0 = ANGOLO_ZONA - 2.4, C1 = ANGOLO_ZONA - 1.74;
    const ang = (u: number) => C0 + (C1 - C0) * u;
    const crinale = (d: number, alto: number, velo: number, piani: [number, number, number][], seme: number) => {
      const N = 140, M = 8;
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      const toni = ["#C8A85E", "#B99A58", "#D2B670", "#9C9456", "#A88E55"].map((c) => new THREE.Color(c));
      const quota = (u: number) => {
        let h = 0.55 + 0.25 * Math.sin(u * 9 + seme) + 0.15 * Math.sin(u * 23 + seme * 2) + 0.06 * Math.sin(u * 61);
        // gli altopiani, raccordati dolcemente al crinale
        for (const [da, a, q] of piani) {
          const k = Math.min(1, Math.max(0, Math.min(u - da, a - u) / 0.05 + 0.5));
          h += (q - h) * k * k * (3 - 2 * k);
        }
        const bordo = Math.min(1, u / 0.08, (1 - u) / 0.08);
        return Math.max(0, h) * alto * bordo;
      };
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const a = ang(u);
        const h = quota(u);
        for (let j = 0; j <= M; j++) {
          const v = j / M; // 0 davanti, 1 dietro
          const k = Math.sin(v * Math.PI); // la cresta a metà
          const p = suAnello(a, d - 3 + v * 6, SU - 1 + (h + 1) * Math.pow(k, 0.7));
          pos.push(p.x, p.y, p.z);
          const c = toni[Math.floor(r() * toni.length)].clone().lerp(cielo, velo);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
        const q = i * (M + 1) + j;
        idx.push(q, q + M + 1, q + 1, q + 1, q + M + 1, q + M + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      this.giorno.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, fog: false })));
      return (u: number) => SU - 1 + quota(u) + 1;
    };
    const dietro = crinale(43, 6.4, 0.4, [], 1.3);
    // davanti: due pianori, uno (dove stava il labirinto) vuoto, più in qua quello dei radiotelescopi
    const davanti = crinale(37.5, 4.6, 0.14, [[0.2, 0.36, 1], [0.55, 0.75, 0.78]], 4.1);
    // il labirinto: sul pianoro stava dietro una carta. Ora sta da solo nel varco fra le carte (3,81, dove prima
    // c'era Comiso), più vicino, in cima a un poggio suo all'inizio delle colline delle pale, inclinato verso chi guarda
    {
      const aL = ANGOLO_ZONA + 3.81, H = 6.4;
      const lab = sulRing(aL, 33, 0);
      lab.add(
        unisci([
          colora(
            // un poggio largo, piatto in cima e inclinato verso chi guarda come il labirinto, che vi poggia tutto
            rilievo(-8, 8, -5.5, 5.5, 64, 44, (x, z) => {
              const k = 1 - THREE.MathUtils.smoothstep(Math.hypot(x / 3.4, z / 3.4), 0.85, 2.2);
              return (H + 0.5 * z) * k + 0.08 * Math.sin(x * 2 + z) - 0.25;
            }),
            "#B99A58",
            0.14,
            (q) => new THREE.Color(q.y > H - 1.0 ? "#C8A85E" : q.y > 2.2 ? "#A88E55" : "#9C9456"),
          ),
        ]),
      );
      const disco = labirinto();
      disco.position.set(0, H - 0.25, 0);
      disco.rotation.x = -Math.atan(0.5);
      lab.add(disco);
      this.giorno.add(lab);
    }
    // l'Alhambra e il Perito Moreno
    // l'Alhambra a destra dell'Albaicín (che sta in citta.ts, più vicino): fra i due la valle del Darro
    // nel tratto di cielo libero sopra lo sviluppatore: lì le carte non la coprono
    const al = alhambra(ANGOLO_ZONA - 0.02);
    al.scale.setScalar(1.35);
    this.giorno.add(al);
    // di notte l'Alhambra e Bologna restano, illuminate dai riflettori: l'orizzonte sopra lo sviluppatore non è più vuoto
    const txRifl = alone("#FFD9A0");
    this.texture.push(txRifl);
    this.notte.add(notturno(al, txRifl));
    // San Luca (a sinistra nel gruppo) cade sopra la carta più bassa dell'anello; le torri stanno più a destra
    const bo = bologna(ANGOLO_ZONA - 1.16);
    bo.scale.setScalar(1.5);
    this.texture.push(bo.userData.texture as THREE.Texture);
    this.giorno.add(bo);
    this.notte.add(notturno(bo, txRifl));

    // le pale eoliche sulla cresta di dietro
    const bianco = new THREE.MeshLambertMaterial({ color: "#F4F5F7", fog: false });
    for (let k = 0; k < 8; k++) {
      const u = 0.1 + k * 0.11 + (r() - 0.5) * 0.02;
      const a = ang(u);
      const t = new THREE.Group();
      t.position.copy(suAnello(a, 43, dietro(u) - 0.2));
      rivolgi(t, a);
      t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 3.6, 8).translate(0, 1.8, 0), bianco));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.55).translate(0, 3.65, 0.08), bianco));
      const rotore = new THREE.Group();
      rotore.position.set(0, 3.65, -0.22);
      for (let p = 0; p < 3; p++) {
        const pala = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.7, 0.03).translate(0, 0.85, 0), bianco);
        pala.rotation.z = (p / 3) * Math.PI * 2;
        rotore.add(pala);
      }
      rotore.userData.v = 0.9 + r() * 0.5;
      rotore.rotation.z = r() * 6;
      this.rotori.push(rotore);
      t.add(rotore);
      t.rotation.y += (r() - 0.5) * 0.3;
      t.scale.setScalar(0.8);
      this.giorno.add(t);
    }

    // i radiotelescopi sull'altopiano di quello davanti
    const piatto = new THREE.LatheGeometry(
      Array.from({ length: 9 }, (_, i) => new THREE.Vector2((i / 8) * 1.15, ((i / 8) * 1.15) ** 2 * 0.3)),
      28
    );
    const grigio = new THREE.MeshLambertMaterial({ color: "#C9CCD2", fog: false });
    const piattoM = new THREE.MeshLambertMaterial({ color: "#F7F7F5", side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 4; k++) {
      const u = 0.58 + k * 0.045;
      const a = ang(u);
      const base = new THREE.Group();
      base.position.copy(suAnello(a, 37.5, davanti(u) - 0.1));
      rivolgi(base, a);
      base.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.1, 10).translate(0, 0.55, 0), grigio));
      const az = new THREE.Group();
      az.position.y = 1.15;
      const forcella = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), grigio);
      az.add(forcella);
      const el = new THREE.Group();
      el.position.y = 0.35;
      const disco = new THREE.Mesh(piatto, piattoM);
      disco.rotation.x = -Math.PI / 2; // la concavità guarda verso chi guarda (−z), poi l'elevazione la alza
      el.add(disco);
      const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6).rotateX(Math.PI / 2).translate(0, 0, -0.55), grigio);
      el.add(asta);
      az.add(el);
      base.add(az);
      this.parabole.push({ az, el, fase: k * 0.9 });
      this.giorno.add(base);
    }
  }

  setNotte(notte: boolean) {
    this.notte.visible = notte;
    this.giorno.visible = !notte;
  }

  aggiorna(t: number) {
    if (this.notte.visible) {
      this.fasci.rotation.y = t * 0.55;
      // le torce: fiamme che tremano e si piegano al vento
      this.fiamme.forEach(({ cuore, fiamma, alone, base }, i) => {
        const v = 0.75 + 0.25 * Math.sin(t * 9 + i * 3) * Math.sin(t * 5.3 + i) + 0.1 * Math.sin(t * 23 + i);
        cuore.scale.set(0.6 * v, 1.2 * v, 1);
        cuore.position.set(base.x + 0.05 * Math.sin(t * 1.7 + i), base.y + 0.5 * v, base.z);
        fiamma.scale.set(1.3 * v, 2.5 * (0.85 + 0.3 * Math.sin(t * 3.1 + i * 2)), 1);
        fiamma.position.set(base.x + 0.16 * Math.sin(t * 1.3 + i), base.y + 1.05 * v, base.z);
        alone.material.opacity = 0.2 + 0.1 * v;
      });
      // il vapore: sale, si allarga, svanisce
      this.fumi.forEach(({ s, da, fase }) => {
        const k = (t * 0.045 + fase) % 1;
        s.position.set(da.x + k * 2.5, da.y + k * 6, da.z);
        s.scale.setScalar(1.2 + k * 5);
        s.material.opacity = Math.sin(k * Math.PI) * 0.55;
      });
      // il fumo scuro sopra le torce, preso di sotto dalla fiamma
      this.fumoTorce.forEach(({ s, da, fase }) => {
        const k = (t * 0.07 + fase) % 1;
        s.position.set(da.x + k * 2.2 + Math.sin(t * 0.5 + fase * 6) * 0.3, da.y + 3 + k * 5, da.z);
        s.scale.setScalar(1.5 + k * 4.5);
        s.material.opacity = Math.sin(k * Math.PI) * 0.6;
        s.material.color.setRGB(0.55 - k * 0.35, 0.3 - k * 0.18, 0.18 - k * 0.1);
      });
      // le luci rosse delle ciminiere e delle colonne lampeggiano insieme
      this.luciRosse.opacity = Math.sin(t * 2.2) > 0.55 ? 1 : 0.15;
      return;
    }
    this.rotori.forEach((ro) => (ro.rotation.z = t * ro.userData.v));
    // le parabole si muovono insieme, lente, come se seguissero la stessa sorgente
    this.parabole.forEach(({ az, el, fase }) => {
      az.rotation.y = Math.sin(t * 0.05 + fase * 0.1) * 0.9;
      el.rotation.x = 0.7 + 0.3 * Math.sin(t * 0.07 + fase * 0.1);
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
