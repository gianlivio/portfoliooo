import * as THREE from "three";
import { PELO_ACQUA, gocce } from "../condivisi";
import {
  type Ospite, alone, assi, cancella, casuale, finito, fra, liberaTutto, loft, morbido, primo, riposo, segno, tocca,
} from "./comuni";
import { type Figura, figura } from "./figure";
import { type ComuniSpettro, comuniSpettro, spettro } from "./spettro";

/**
 * Di notte, la caccia al pesce spada nello Stretto, come un ricordo che torna: una feluca fantasma,
 * d'oro pallido (la nave di Ulisse è turchese, il galeone verde). L'albero altissimo con la vedetta,
 * la passerella lunghissima a prua col lanciatore in punta, quattro rematori, la lampara accesa
 * che fa un cerchio di luce sull'acqua. Più avanti, ben staccato dalla prua, il pesce spada d'argento:
 * nuota a fior d'acqua con la pinna fuori, salta una volta quando la vedetta lo indica.
 * I rematori vogano all'impazzata, il lanciatore alza l'arpione sopra la testa e lo scaglia:
 * l'arpione vola in arco lasciando una scia, l'acqua esplode, il pesce si dibatte e va giù,
 * la cima si tende. La feluca quasi si ferma, poi riparte e si disfa.
 */

const SLOT = [4, 5, 6, 7];
const SCALA_BARCA = 1.2;
const SCALA_UOMO = 0.14;
const PUNTA = 1.95; // z della punta della passerella, nello spazio della barca
const ORO = "#FFC46B";
const ARGENTO = "#CFE2FF";
const SCIA = 24;

/** Il pesce spada, muso verso +z: corpo, spada, pinna dorsale a falce, pettorali, coda a mezzaluna. */
function pesceSpada(mat: THREE.Material) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(loft([
    { z: -0.27, l: 0.008, su: 0.012, giu: 0.012 },
    { z: -0.2, l: 0.022, su: 0.03, giu: 0.026 },
    { z: -0.05, l: 0.04, su: 0.058, giu: 0.05 },
    { z: 0.08, l: 0.045, su: 0.062, giu: 0.055 },
    { z: 0.17, l: 0.034, su: 0.045, giu: 0.04 },
    { z: 0.22, l: 0.016, su: 0.02, giu: 0.018 },
  ], { radiali: 14, passi: 3 }), mat));
  // la spada: lunga quasi un terzo dell'animale, piatta
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.3, 8).rotateX(Math.PI / 2).scale(1, 0.45, 1).translate(0, 0.006, 0.37), mat));
  // pinna dorsale alta, a falce
  const dorsale = new THREE.Shape();
  dorsale.moveTo(0, 0);
  dorsale.quadraticCurveTo(0.02, 0.07, -0.02, 0.12);
  dorsale.quadraticCurveTo(-0.03, 0.06, -0.09, 0.0);
  dorsale.closePath();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(dorsale).rotateY(-Math.PI / 2).translate(0, 0.05, 0.1), mat));
  // pettorali
  for (const s of [-1, 1]) {
    const p = new THREE.Shape();
    p.moveTo(0, 0);
    p.quadraticCurveTo(0.03, -0.02, 0.1, -0.05);
    p.quadraticCurveTo(0.04, -0.005, 0, -0.02);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(p).rotateY(-Math.PI / 2), mat);
    m.position.set(s * 0.035, -0.025, 0.11);
    m.rotation.z = s * 0.6;
    g.add(m);
  }
  // la coda, su un perno che oscilla
  const coda = new THREE.Group();
  coda.position.z = -0.25;
  const mezzaluna = new THREE.Shape();
  mezzaluna.moveTo(0, 0);
  mezzaluna.quadraticCurveTo(-0.05, 0.06, -0.1, 0.13);
  mezzaluna.quadraticCurveTo(-0.05, 0.05, -0.04, 0.0);
  mezzaluna.quadraticCurveTo(-0.05, -0.05, -0.1, -0.13);
  mezzaluna.quadraticCurveTo(-0.05, -0.06, 0, 0);
  coda.add(new THREE.Mesh(new THREE.ShapeGeometry(mezzaluna).rotateY(-Math.PI / 2), mat));
  g.add(coda);
  return { g, coda };
}

type Remo = { g: THREE.Group; lato: number; uomo: Figura };

export class Feluca implements Ospite {
  gruppo = new THREE.Group();
  private barca = new THREE.Group();
  private remi: Remo[] = [];
  private lanciatore: Figura;
  private vedetta: Figura;
  private arpione = new THREE.Group();
  private scia: THREE.Line;
  private cima: THREE.Line;
  private sartiame: THREE.LineSegments;
  private bagliore: THREE.Sprite;
  private pozza: THREE.Mesh;
  private pesce: THREE.Group;
  private coda: THREE.Group;
  private schizzi: { s: THREE.Sprite; v: THREE.Vector3; nato: number }[] = [];
  private texture: THREE.Texture[] = [];
  private c: ComuniSpettro;
  private cp: ComuniSpettro;
  private storia: THREE.Vector3[] = Array.from({ length: SCIA }, () => new THREE.Vector3(0, -100, 0));
  private stato = {
    prossima: primo(0, 3), inizio: -1, k: 0,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    fase: 0, slot: 0, sciaAcqua: 0, salto: -1, rientrato: false, lancio: -1, impatto: -1, zig: 0,
    partenza: new THREE.Vector3(), bersaglio: new THREE.Vector3(),
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), w: new THREE.Vector3(), mano: new THREE.Vector3(), z: new THREE.Vector3(0, 0, 1) };

  constructor() {
    this.c = comuniSpettro(ORO, PELO_ACQUA);
    this.cp = comuniSpettro(ARGENTO, PELO_ACQUA);
    const scafo = spettro(this.c, { buchi: 0.12, seme: 2 });
    const legno = spettro(this.c, { buchi: 0.03, tavole: 0, seme: 5 });
    const gente = spettro(this.c, { buchi: 0.02, tavole: 0, seme: 7, luminoso: 0.06 });

    // scafo: prua e poppa che salgono, bordo basso
    this.barca.add(new THREE.Mesh(loft([
      { z: -0.75, y: 0.16, l: 0.02, su: 0.05, giu: 0.06 },
      { z: -0.62, y: 0.1, l: 0.15, su: 0.1, giu: 0.12 },
      { z: -0.2, y: 0.07, l: 0.22, su: 0.11, giu: 0.15, n: 2.4 },
      { z: 0.3, y: 0.07, l: 0.21, su: 0.11, giu: 0.15, n: 2.4 },
      { z: 0.62, y: 0.11, l: 0.12, su: 0.1, giu: 0.12 },
      { z: 0.76, y: 0.2, l: 0.015, su: 0.06, giu: 0.08 },
    ], { radiali: 20, passi: 4 }), scafo));

    // passerella lunghissima a prua
    const passerella = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 1.25).translate(0, 0, 0.62), legno);
    passerella.position.set(0, 0.22, 0.7);
    passerella.rotation.x = -0.06;
    this.barca.add(passerella);
    const linee: number[] = [];
    const seg = (a: THREE.Vector3, b: THREE.Vector3) => linee.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (const s of [-1, 1]) seg(new THREE.Vector3(s * 0.03, 0.3, 0.75), new THREE.Vector3(s * 0.03, 0.38, 1.9));
    // l'albero altissimo, la gabbia della vedetta, gli stralli
    const ALTO = 1.75;
    this.barca.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, ALTO, 6).translate(0, ALTO / 2 + 0.15, 0.05), legno));
    const gabbia = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.06, 10, 1, true), legno);
    gabbia.position.set(0, ALTO + 0.02, 0.05);
    this.barca.add(gabbia);
    const testa = new THREE.Vector3(0, ALTO + 0.1, 0.05);
    seg(testa, new THREE.Vector3(0, 0.36, 1.85));
    seg(testa, new THREE.Vector3(0, 0.3, 1.2));
    seg(testa, new THREE.Vector3(0, 0.18, -0.72));
    for (const s of [-1, 1]) seg(new THREE.Vector3(0, ALTO - 0.1, 0.05), new THREE.Vector3(s * 0.2, 0.18, -0.05));
    this.sartiame = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linee, 3)),
      new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.barca.add(this.sartiame);

    // la lampara a prua: bagliore e cerchio di luce sull'acqua
    const txLuce = alone("#FFD08A");
    this.texture.push(txLuce);
    this.bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: txLuce, color: "#FFC77A", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.bagliore.position.set(0, 0.32, 0.92);
    this.bagliore.scale.setScalar(0.5);
    this.barca.add(this.bagliore);
    this.pozza = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txLuce, color: "#FFB566", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.pozza.position.set(0, 0.004, 1.5);
    this.barca.add(this.pozza);

    // i rematori, due per lato, seduti, coi remi
    const posti: [number, number][] = [[1, 0.25], [-1, 0.1], [1, -0.15], [-1, -0.3]];
    posti.forEach(([lato, z]) => {
      const uomo = figura({ pelle: gente, abito: gente, capo: gente }, { seduta: true });
      uomo.gruppo.scale.setScalar(SCALA_UOMO);
      uomo.gruppo.position.set(-lato * 0.06, 0.12, z);
      uomo.gruppo.rotation.y = Math.PI;
      this.barca.add(uomo.gruppo);
      const g = new THREE.Group();
      g.position.set(lato * 0.2, 0.2, z + 0.02);
      g.rotation.order = "YZX";
      const remo = new THREE.Group();
      remo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.95, 5).rotateZ(Math.PI / 2).translate(0.3, 0, 0), legno));
      remo.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.005).translate(0.72, 0, 0), legno));
      remo.scale.x = lato;
      g.add(remo);
      this.barca.add(g);
      this.remi.push({ g, lato, uomo });
    });
    // il lanciatore in punta alla passerella; la vedetta in cima all'albero
    this.lanciatore = figura({ pelle: gente, abito: gente, capo: gente }, { coppola: true });
    this.lanciatore.gruppo.scale.setScalar(SCALA_UOMO);
    this.lanciatore.gruppo.position.set(0, 0.36, PUNTA - 0.12);
    this.barca.add(this.lanciatore.gruppo);
    this.vedetta = figura({ pelle: gente, abito: gente, capo: gente }, { coppola: true });
    this.vedetta.gruppo.scale.setScalar(SCALA_UOMO);
    this.vedetta.gruppo.position.set(0, ALTO + 0.05 - 0.12, 0.05);
    this.barca.add(this.vedetta.gruppo);

    // l'arpione: asta lunga, punta di ferro che brilla; sta nel mondo, così può volare
    this.arpione.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.78, 6).rotateX(Math.PI / 2).translate(0, 0, -0.3), legno));
    this.arpione.add(new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.09, 6).rotateX(Math.PI / 2).translate(0, 0, 0.13), spettro(this.c, { buchi: 0, tavole: 0, luminoso: 0.5 })));
    this.gruppo.add(this.arpione);
    // la scia dell'arpione in volo, e la cima che lo lega alla barca
    const sciaGeo = new THREE.BufferGeometry();
    sciaGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SCIA * 3), 3));
    sciaGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SCIA * 3), 3));
    this.scia = new THREE.Line(sciaGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.gruppo.add(this.scia);
    this.cima = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(20 * 3), 3)),
      new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.gruppo.add(this.cima);

    // il pesce, d'argento
    const pesce = pesceSpada(spettro(this.cp, { buchi: 0.02, tavole: 0, seme: 9, luminoso: 0.3 }));
    this.pesce = pesce.g;
    this.coda = pesce.coda;
    this.pesce.scale.setScalar(1.1);
    this.gruppo.add(this.pesce);

    const txSchizzo = alone("#F4F8FF");
    this.texture.push(txSchizzo);
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txSchizzo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.visible = false;
      this.gruppo.add(s);
      this.schizzi.push({ s, v: new THREE.Vector3(), nato: 0 });
    }

    this.barca.scale.setScalar(SCALA_BARCA);
    this.gruppo.add(this.barca);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = 10;
    });
  }

  private punto(k: number, out: THREE.Vector3) {
    const s = this.stato;
    const u = 1 - k;
    return out.set(u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x, 0, u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z);
  }

  /** Schizzi d'acqua e cerchi, in un punto; forza 0..1+. */
  private spruzza(dove: THREE.Vector3, forza: number, t: number) {
    const s = this.stato;
    const n = Math.round(8 + forza * 18);
    for (let i = 0; i < n && i < this.schizzi.length; i++) {
      const sc = this.schizzi[i];
      const a = casuale(0, Math.PI * 2);
      const o = casuale(0.2, 0.7) * forza;
      sc.v.set(Math.cos(a) * o, casuale(0.8, 2.0) * forza, Math.sin(a) * o);
      sc.s.position.set(dove.x, PELO_ACQUA + 0.02, dove.z);
      sc.s.visible = true;
      sc.nato = t;
    }
    gocce[SLOT[s.slot]].set(dove.x, dove.z, t, 0.6 + forza * 0.6);
    s.slot = (s.slot + 1) % SLOT.length;
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notte", "feluca", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d1 = casuale(4.4, 5.0), d2 = casuale(4.4, 5.0);
      // percorso spostato all'indietro: il colpo (barca a destra, pesce a sinistra) cade al centro della vista
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -7.0 * v);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 3.6 * v);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-0.6, 0.4)).addScaledVector(lato, -1.7 * v);
      s.inizio = t;
      s.k = 0;
      s.salto = s.lancio = s.impatto = -1;
      s.rientrato = false;
      s.zig = casuale(0, 10);
      this.storia.forEach((h) => h.set(0, -100, 0));
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const { p, q, w, mano, z } = this.tmp;
    const caccia = e > 10 && s.impatto < 0;
    const dopo = s.impatto >= 0;
    const ei = dopo ? t - s.impatto : -1;

    // il moto della barca: lento, poi di corsa; dopo il colpo quasi ferma, poi riparte
    // (il colpo deve cadere a metà del passaggio, davanti a chi guarda)
    const inVolo = s.lancio >= 0 && !dopo;
    const velocita = (inVolo ? 0.006 : dopo ? (ei < 4.5 ? 0.003 : 0.034) : caccia ? 0.03 : 0.022) * (1 + Math.sin(s.fase * Math.PI * 2) * 0.12);
    s.k = Math.min(1, s.k + velocita * dt);
    this.punto(s.k, p);
    this.punto(Math.min(1, s.k + 0.01), q);
    const rotta = Math.atan2(q.x - p.x, q.z - p.z);
    this.barca.position.set(p.x, PELO_ACQUA + Math.sin(t * 1.3) * 0.012, p.z);
    this.barca.rotation.set(Math.sin(t * 0.9) * 0.02 - (caccia ? 0.025 : 0), rotta, Math.sin(t * 1.1) * 0.03);
    this.barca.updateMatrixWorld(true);

    // presenza: si compone e si disfa
    const vis = Math.min(fra(e, 0, 4), 1 - fra(s.k, 0.88, 1));
    const forza = 0.92 + 0.08 * Math.sin(t * 2.1) * Math.sin(t * 3.3);
    const c = this.c;
    c.uT.value = t;
    c.uVis.value = vis;
    c.uForza.value = forza;
    c.uInv.value.copy(this.barca.matrixWorld).invert();
    (this.sartiame.material as THREE.LineBasicMaterial).opacity = 0.45 * vis * forza;
    const tremo = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
    this.bagliore.material.opacity = vis * tremo;
    (this.pozza.material as THREE.MeshBasicMaterial).opacity = 0.32 * vis * tremo;

    // la voga; ferma mentre il pesce tira
    const cadenza = caccia && !inVolo ? 1.5 : inVolo || (dopo && ei < 4.5) ? 0 : 0.7;
    s.fase = (s.fase + dt * cadenza) % 1;
    const inAcqua = s.fase < 0.45;
    let r: number, giu: number;
    if (inAcqua) {
      r = -0.5 + s.fase / 0.45;
      giu = 0.42;
    } else {
      const u = (s.fase - 0.45) / 0.55;
      r = 0.5 - morbido(u);
      giu = 0.25 - Math.sin(u * Math.PI) * 0.12;
    }
    this.remi.forEach((rm) => {
      rm.g.rotation.set(0, rm.lato * r, -rm.lato * giu);
      rm.uomo.busto.rotation.x = -0.35 + (inAcqua ? (s.fase / 0.45) * 0.7 : 0.7 - morbido((s.fase - 0.45) / 0.55) * 0.7);
      rm.uomo.spalle.forEach((sp) => (sp.rotation.x = -1.2 + rm.uomo.busto.rotation.x * 0.6));
      rm.uomo.gomiti.forEach((g) => (g.rotation.x = -0.6));
    });
    if (cadenza > 0 && s.fase < 0.05 && t > s.sciaAcqua && vis > 0.5) {
      s.sciaAcqua = t + 0.35;
      w.set(0.75, 0, 0);
      this.remi[Math.floor(Math.random() * 4)].g.children[0].localToWorld(w);
      gocce[SLOT[s.slot]].set(w.x, w.z, t, caccia ? 0.4 : 0.25);
      s.slot = (s.slot + 1) % SLOT.length;
    }

    // il pesce: ben avanti alla punta della passerella, a zig-zag; la barca guadagna un poco
    const cp = this.cp;
    cp.uT.value = t;
    const distanza = PUNTA + 0.95 - 0.3 * fra(e, 10, 19);
    if (!dopo && s.lancio < 0) {
      const zig = Math.sin(t * 1.2 + s.zig) * 0.16;
      w.set(zig, 0, distanza).applyMatrix4(this.barca.matrixWorld);
      this.pesce.position.set(w.x, PELO_ACQUA - 0.012, w.z);
      this.pesce.rotation.set(0, rotta + Math.cos(t * 1.2 + s.zig) * 0.35, 0);
    }
    if (!dopo) {
      // il salto, quando la vedetta lo vede
      if (s.salto < 0 && e > 7.2) {
        s.salto = t;
        this.spruzza(this.pesce.position, 0.45, t);
      }
      const es = s.salto >= 0 ? (t - s.salto) / 1.3 : -1;
      if (es >= 0 && es <= 1) {
        this.pesce.position.y = PELO_ACQUA - 0.012 + Math.sin(es * Math.PI) * 0.3;
        this.pesce.rotateX(-Math.cos(es * Math.PI) * 0.9);
      }
      if (es > 1 && !s.rientrato) {
        s.rientrato = true;
        this.spruzza(this.pesce.position, 0.4, t);
      }
      cp.uVis.value = fra(e, 4.5, 7.5) * vis;
      this.coda.rotation.y = Math.sin(t * (caccia ? 11 : 6)) * 0.45;
    } else {
      // colpito: si dibatte, poi va giù tirando la cima
      if (ei < 1.8) {
        this.pesce.position.y = PELO_ACQUA - 0.01 + Math.abs(Math.sin(ei * 7)) * 0.1 * (1 - ei / 1.8);
        this.pesce.rotation.set(Math.sin(ei * 9) * 0.25, this.pesce.rotation.y + dt * Math.sin(ei * 5) * 2, Math.sin(ei * 13) * 0.5);
        this.coda.rotation.y = Math.sin(t * 24) * 0.7;
        if (Math.random() < dt * 3) this.spruzza(this.pesce.position, 0.3, t);
      } else {
        const u = fra(ei, 1.8, 3.6);
        this.pesce.position.y = PELO_ACQUA - 0.01 - u * 0.25;
        this.pesce.rotation.set(u * 0.7, this.pesce.rotation.y, 0);
        this.coda.rotation.y = Math.sin(t * 14) * 0.5;
      }
      cp.uVis.value = vis * (1 - fra(ei, 2.4, 3.8));
    }

    // la vedetta indica il pesce
    const avvista = fra(e, 6.5, 8) * (dopo ? 1 - fra(ei, 0, 1) : 1);
    this.vedetta.spalle[0].rotation.x = -avvista * 2.3;
    this.vedetta.gomiti[0].rotation.x = -avvista * 0.2;
    this.vedetta.testa.rotation.x = avvista * 0.35;

    // il lanciatore: alza l'arpione sopra la testa, si inarca, scaglia
    const L = this.lanciatore;
    const carica = fra(e, 16.5, 19);
    const sl = s.lancio >= 0 ? Math.min(1, (t - s.lancio) * 4) : 0;
    L.spalle[0].rotation.x = -2.8 * carica + sl * 2.0;
    L.gomiti[0].rotation.x = -0.9 * carica * (1 - sl);
    L.spalle[1].rotation.x = -1.2 * carica * (1 - sl * 0.5); // l'altro braccio avanti, a mirare
    L.busto.rotation.x = -0.28 * carica + sl * 0.5;
    L.anche.forEach((a, i) => (a.rotation.x = (i ? 0.25 : -0.3) * carica));
    L.gruppo.updateMatrixWorld(true);
    mano.set(0, -0.3, 0);
    L.gomiti[0].localToWorld(mano);
    if (s.lancio < 0) {
      // in mano: la punta in avanti e in su, l'asta dietro la testa
      this.arpione.position.copy(mano);
      w.set(0, 0.35 + carica * 0.25, 1).normalize().transformDirection(this.barca.matrixWorld);
      this.arpione.quaternion.setFromUnitVectors(z, w);
      this.arpione.visible = vis > 0.3;
      if (e > 19.6) {
        s.lancio = t;
        s.partenza.copy(mano);
        // mira dove sarà il pesce
        w.set(Math.sin((t + 1.1) * 1.2 + s.zig) * 0.16, 0, PUNTA + 0.72).applyMatrix4(this.barca.matrixWorld);
        s.bersaglio.set(w.x, PELO_ACQUA, w.z);
      }
    }
    const VOLO = 1.1;
    if (s.lancio >= 0 && !dopo) {
      const u = Math.min(1, (t - s.lancio) / VOLO);
      const arco = (uu: number, out: THREE.Vector3) => {
        out.lerpVectors(s.partenza, s.bersaglio, uu);
        out.y = THREE.MathUtils.lerp(s.partenza.y, PELO_ACQUA + 0.02, uu) + Math.sin(uu * Math.PI) * 0.38;
        return out;
      };
      arco(u, w);
      arco(Math.min(1, u + 0.02), q);
      this.arpione.position.copy(w);
      this.arpione.quaternion.setFromUnitVectors(z, q.sub(w).normalize());
      // il pesce, ignaro, va dove arriverà l'arpione
      q.copy(s.bersaglio).setY(this.pesce.position.y);
      this.pesce.position.lerp(q, Math.min(1, dt * 3));
      if (u >= 1) {
        s.impatto = t;
        this.pesce.position.x = s.bersaglio.x;
        this.pesce.position.z = s.bersaglio.z;
        this.spruzza(s.bersaglio, 1.1, t);
        gocce[SLOT[s.slot]].set(s.bersaglio.x, s.bersaglio.z, t + 0.15, 1.4);
        s.slot = (s.slot + 1) % SLOT.length;
      }
    }
    this.pesce.updateMatrixWorld(true);
    cp.uInv.value.copy(this.pesce.matrixWorld).invert();
    if (dopo) {
      // l'arpione resta piantato nel pesce e va giù con lui
      this.arpione.position.copy(this.pesce.position).add(w.set(0, 0.1 - Math.min(0.3, ei * 0.08), 0));
      this.arpione.visible = ei < 3.8 && vis > 0.2;
    }

    // la scia luminosa dell'arpione in volo
    for (let i = SCIA - 1; i > 0; i--) this.storia[i].copy(this.storia[i - 1]);
    this.storia[0].copy(this.arpione.position);
    const volando = s.lancio >= 0 && (!dopo || ei < 0.6);
    const spegni = dopo ? 1 - fra(ei, 0, 0.6) : 1;
    const sp = this.scia.geometry.attributes.position as THREE.BufferAttribute;
    const sc = this.scia.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < SCIA; i++) {
      const h = this.storia[i];
      sp.setXYZ(i, h.x, h.y, h.z);
      const a = volando ? (1 - i / (SCIA - 1)) * spegni : 0;
      sc.setXYZ(i, a, a * 0.82, a * 0.5);
    }
    sp.needsUpdate = true;
    sc.needsUpdate = true;

    // la cima: dalla punta della passerella alla coda dell'arpione; si tende quando il pesce tira
    const cm = this.cima.material as THREE.LineBasicMaterial;
    if (s.lancio >= 0) {
      w.set(0, 0.24, PUNTA).applyMatrix4(this.barca.matrixWorld);
      mano.set(0, 0, -0.65).applyQuaternion(this.arpione.quaternion).add(this.arpione.position);
      const tesa = dopo ? fra(ei, 1.6, 2.4) : 0;
      const pc = this.cima.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 20; i++) {
        const u = i / 19;
        q.lerpVectors(w, mano, u);
        q.y -= Math.sin(u * Math.PI) * 0.1 * (1 - tesa);
        pc.setXYZ(i, q.x, q.y, q.z);
      }
      pc.needsUpdate = true;
      cm.opacity = 0.55 * vis * (dopo ? 1 - fra(ei, 3.4, 4.4) : 1);
    } else cm.opacity = 0;

    // gli schizzi
    this.schizzi.forEach((s2) => {
      if (!s2.s.visible) return;
      const ee = t - s2.nato;
      s2.v.y -= 6.5 * dt;
      s2.s.position.addScaledVector(s2.v, dt);
      s2.s.scale.setScalar(0.04 + ee * 0.08);
      s2.s.material.opacity = Math.max(0, 0.9 - ee * 1.3);
      if (s2.s.position.y < PELO_ACQUA || ee > 0.9) s2.s.visible = false;
    });

    if (s.k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notte", "feluca", t);
    }
  }

  libera() {
    cancella("notte", "feluca");
    SLOT.forEach((k) => gocce[k].set(0, 0, -100, 0));
    liberaTutto(this.gruppo, this.texture);
  }
}
