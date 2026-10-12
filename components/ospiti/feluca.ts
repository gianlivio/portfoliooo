import * as THREE from "three";
import { PELO_ACQUA, gocce } from "../condivisi";
import {
  type Ospite, alone, assi, cancella, casuale, finito, fra, liberaTutto, loft, morbido, primo, riposo, segno, tela, tocca,
} from "./comuni";
import { type Figura, figura } from "./figure";

/**
 * Di notte, la caccia al pesce spada nello Stretto. Una barca a remi dipinta di bianco e d'azzurro,
 * con l'albero altissimo e la vedetta in cima, la passerella lunghissima a prua col lanciatore,
 * la lampara accesa che fa sull'acqua un cerchio di luce. Nel cerchio compare la sagoma del pesce,
 * con la pinna che taglia la superficie: la vedetta indica, i rematori vogano all'impazzata,
 * il lanciatore alza l'arpione e lo scaglia; l'acqua esplode in uno schizzo, il pesce sparisce.
 * La barca rallenta e se ne va, con la cima dell'arpione che fila in acqua.
 */

const SLOT = [4, 5, 6, 7];
const SCALA_UOMO = 0.13;

function texturaPesce() {
  return tela(256, 64, (x) => {
    // vista dall'alto: corpo affusolato, spada lunghissima, pinne pettorali, coda a mezzaluna
    x.fillStyle = "#fff";
    x.beginPath();
    x.moveTo(8, 32);
    x.lineTo(96, 30);
    x.quadraticCurveTo(120, 20, 170, 24);
    x.quadraticCurveTo(205, 27, 218, 32);
    x.quadraticCurveTo(205, 37, 170, 40);
    x.quadraticCurveTo(120, 44, 96, 34);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(214, 32);
    x.lineTo(248, 8);
    x.lineTo(236, 32);
    x.lineTo(248, 56);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(132, 26);
    x.lineTo(150, 6);
    x.lineTo(156, 25);
    x.moveTo(132, 38);
    x.lineTo(150, 58);
    x.lineTo(156, 39);
    x.fill();
  });
}

const luce = (colore: string) =>
  tela(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, colore);
    g.addColorStop(0.45, colore + "88");
    g.addColorStop(1, colore + "00");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });

type Remo = { g: THREE.Group; lato: number; uomo: Figura };

export class Feluca implements Ospite {
  gruppo = new THREE.Group();
  private barca = new THREE.Group();
  private remi: Remo[] = [];
  private lanciatore: Figura;
  private vedetta: Figura;
  private arpione = new THREE.Group();
  private volo = new THREE.Group();
  private cima: THREE.Line;
  private lampada: THREE.PointLight;
  private bagliore: THREE.Sprite;
  private pozza: THREE.Mesh;
  private pesce: THREE.Mesh;
  private pinna: THREE.Mesh;
  private schizzi: { s: THREE.Sprite; v: THREE.Vector3 }[] = [];
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(0, 3), inizio: -1, durata: 34, k: 0,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    fase: 0, slot: 0, scia: 0, lancio: -1, impatto: -1,
    bersaglio: new THREE.Vector3(), partenza: new THREE.Vector3(), pesce: new THREE.Vector3(),
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), w: new THREE.Vector3(), m: new THREE.Matrix4() };

  constructor() {
    const legno = new THREE.MeshStandardMaterial({ color: "#4A3424", roughness: 0.85 });
    const pelle = new THREE.MeshStandardMaterial({ color: "#8C5E42", roughness: 0.8 });
    const abito = new THREE.MeshStandardMaterial({ color: "#2B2C30", roughness: 0.9 });
    const capo = new THREE.MeshStandardMaterial({ color: "#1C1C1E", roughness: 0.9 });

    // scafo: bianco sopra, una fascia azzurra, il fondo scuro; prua e poppa che salgono
    const scafo = loft([
      { z: -0.75, y: 0.16, l: 0.02, su: 0.05, giu: 0.06 },
      { z: -0.62, y: 0.1, l: 0.15, su: 0.1, giu: 0.12 },
      { z: -0.2, y: 0.07, l: 0.22, su: 0.11, giu: 0.15, n: 2.4 },
      { z: 0.3, y: 0.07, l: 0.21, su: 0.11, giu: 0.15, n: 2.4 },
      { z: 0.62, y: 0.11, l: 0.12, su: 0.1, giu: 0.12 },
      { z: 0.76, y: 0.2, l: 0.015, su: 0.06, giu: 0.08 },
    ], {
      radiali: 20, passi: 4,
      colore: (_k, _a, p) => new THREE.Color(p.y > 0.13 ? "#E9ECEA" : p.y > 0.05 ? "#2F5A8C" : "#3A2E26"),
    });
    const matScafo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    this.barca.add(new THREE.Mesh(scafo, matScafo));

    // passerella lunghissima a prua, con il parapetto e gli stralli che la reggono dall'albero
    const passerella = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 1.25).translate(0, 0, 0.62), legno);
    passerella.position.set(0, 0.22, 0.7);
    passerella.rotation.x = -0.06;
    this.barca.add(passerella);
    const linee: number[] = [];
    const seg = (a: THREE.Vector3, b: THREE.Vector3) => linee.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (const s of [-1, 1]) seg(new THREE.Vector3(s * 0.03, 0.3, 0.75), new THREE.Vector3(s * 0.03, 0.38, 1.9));
    // l'albero, altissimo, con la gabbia della vedetta
    const ALTO = 1.75;
    this.barca.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, ALTO, 6).translate(0, ALTO / 2 + 0.15, 0.05), legno));
    const gabbia = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.06, 10, 1, true), legno);
    gabbia.position.set(0, ALTO + 0.02, 0.05);
    this.barca.add(gabbia);
    const cima = new THREE.Vector3(0, ALTO + 0.1, 0.05);
    seg(cima, new THREE.Vector3(0, 0.36, 1.85));
    seg(cima, new THREE.Vector3(0, 0.3, 1.2));
    seg(cima, new THREE.Vector3(0, 0.18, -0.72));
    for (const s of [-1, 1]) seg(new THREE.Vector3(0, ALTO - 0.1, 0.05), new THREE.Vector3(s * 0.2, 0.18, -0.05));
    this.barca.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linee, 3)),
      new THREE.LineBasicMaterial({ color: "#6E5A48" })
    ));

    // la lampara, appesa a prua sopra l'acqua: luce vera, bagliore, cerchio sull'acqua
    this.lampada = new THREE.PointLight("#FFC56E", 3.5, 3.2, 2);
    this.lampada.position.set(0, 0.32, 0.92);
    this.barca.add(this.lampada);
    const txLuce = alone("#FFD08A");
    this.texture.push(txLuce);
    this.bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: txLuce, color: "#FFC77A", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.bagliore.position.copy(this.lampada.position);
    this.bagliore.scale.setScalar(0.45);
    this.barca.add(this.bagliore);
    const lampadina = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: "#FFF1C8" }));
    lampadina.position.copy(this.lampada.position);
    this.barca.add(lampadina);
    const txPozza = luce("#FFC676");
    this.texture.push(txPozza);
    this.pozza = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.3).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txPozza, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.pozza.position.set(0, 0.004, 1.35);
    this.barca.add(this.pozza);

    // i rematori: due per lato, seduti, coi remi
    const posti: [number, number][] = [[1, 0.25], [-1, 0.1], [1, -0.15], [-1, -0.3]];
    posti.forEach(([lato, z]) => {
      const uomo = figura({ pelle, abito, capo }, { seduta: true });
      uomo.gruppo.scale.setScalar(SCALA_UOMO);
      uomo.gruppo.position.set(-lato * 0.06, 0.12, z);
      uomo.gruppo.rotation.y = Math.PI; // vogano guardando la poppa
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
    // il lanciatore in piedi in punta alla passerella, con l'arpione
    this.lanciatore = figura({ pelle, abito, capo }, { coppola: true });
    this.lanciatore.gruppo.scale.setScalar(SCALA_UOMO);
    this.lanciatore.gruppo.position.set(0, 0.36, 1.82);
    this.barca.add(this.lanciatore.gruppo);
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.7, 5).translate(0, 0.2, 0), legno);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 5).translate(0, 0.58, 0), new THREE.MeshStandardMaterial({ color: "#9AA0A6", metalness: 0.7, roughness: 0.3 }));
    this.arpione.add(asta, punta);
    this.arpione.position.set(0.03, 0.17, 0);
    this.lanciatore.gomiti[0].add(this.arpione);
    this.arpione.scale.setScalar(1 / SCALA_UOMO);
    this.arpione.rotation.x = Math.PI; // la punta in alto quando il braccio è giù
    // l'arpione in volo è un'altra copia, nel mondo
    this.volo.add(asta.clone(), punta.clone());
    this.volo.visible = false;
    this.gruppo.add(this.volo);
    this.cima = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3)),
      new THREE.LineBasicMaterial({ color: "#B9A68A", transparent: true, opacity: 0.8 })
    );
    this.cima.visible = false;
    this.cima.frustumCulled = false;
    this.gruppo.add(this.cima);
    // la vedetta in cima all'albero
    this.vedetta = figura({ pelle, abito, capo }, { coppola: true });
    this.vedetta.gruppo.scale.setScalar(SCALA_UOMO);
    this.vedetta.gruppo.position.set(0, ALTO + 0.05 - 0.12, 0.05);
    this.barca.add(this.vedetta.gruppo);

    // il pesce: sagoma scura appena sotto il pelo dell'acqua, pinna dorsale che taglia la superficie
    const txPesce = texturaPesce();
    this.texture.push(txPesce);
    this.pesce = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.155).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: txPesce, color: "#0E1A22", transparent: true, opacity: 0, depthWrite: false })
    );
    this.pesce.visible = false;
    this.gruppo.add(this.pesce);
    const pinna = new THREE.Shape();
    pinna.moveTo(0, 0);
    pinna.lineTo(0.03, 0.07);
    pinna.lineTo(0.07, 0);
    pinna.closePath();
    this.pinna = new THREE.Mesh(new THREE.ShapeGeometry(pinna).translate(-0.035, 0, 0).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#1A242C", side: THREE.DoubleSide, roughness: 0.4 }));
    this.pinna.visible = false;
    this.gruppo.add(this.pinna);

    const txSchizzo = alone("#EAF2FF");
    this.texture.push(txSchizzo);
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txSchizzo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.visible = false;
      this.gruppo.add(s);
      this.schizzi.push({ s, v: new THREE.Vector3() });
    }

    this.barca.scale.setScalar(1.15);
    this.gruppo.add(this.barca);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  private punto(k: number, out: THREE.Vector3) {
    const s = this.stato;
    const u = 1 - k;
    return out.set(u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x, 0, u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notte", "feluca", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d1 = casuale(4.0, 4.8), d2 = casuale(4.0, 4.8);
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -5.6 * v);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 5.6 * v);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-0.8, 0.5));
      s.inizio = t;
      s.k = 0;
      s.lancio = -1;
      s.impatto = -1;
      this.gruppo.visible = true;
      this.volo.visible = false;
      this.cima.visible = false;
      this.arpione.visible = true;
    }
    const e = t - s.inizio;
    const { p, q, w } = this.tmp;

    // le fasi: avvistamento, inseguimento, lancio, dopo
    const avvista = fra(e, 7, 8.5);
    const caccia = e > 12 && s.impatto < 0;
    const dopo = s.impatto >= 0;
    const velocita = (caccia ? 0.075 : dopo ? 0.022 : 0.032) * (1 + Math.sin(s.fase * Math.PI * 2) * 0.15);
    s.k = Math.min(1, s.k + velocita * dt);
    this.punto(s.k, p);
    this.punto(Math.min(1, s.k + 0.01), q);
    const rotta = Math.atan2(q.x - p.x, q.z - p.z);
    this.gruppo.position.set(0, 0, 0);
    this.barca.position.set(p.x, PELO_ACQUA + Math.sin(t * 1.3) * 0.012, p.z);
    this.barca.rotation.set(Math.sin(t * 0.9) * 0.02 - (caccia ? 0.03 : 0), rotta, Math.sin(t * 1.1) * 0.035);
    this.barca.updateMatrixWorld(true);

    // la voga: lenta, poi all'impazzata; i rematori si piegano e tirano
    const cadenza = caccia ? 1.6 : 0.75;
    s.fase = (s.fase + dt * cadenza) % 1;
    const inAcqua = s.fase < 0.45;
    let r: number, giu: number;
    if (inAcqua) {
      const u = s.fase / 0.45;
      r = -0.5 + u;
      giu = 0.42;
    } else {
      const u = (s.fase - 0.45) / 0.55;
      r = 0.5 - morbido(u);
      giu = 0.25 - Math.sin(u * Math.PI) * 0.12;
    }
    this.remi.forEach((rm) => {
      rm.g.rotation.set(0, rm.lato * r, -rm.lato * giu);
      // il rematore: indietro mentre tira, avanti mentre riporta il remo
      rm.uomo.busto.rotation.x = -0.35 + (inAcqua ? (s.fase / 0.45) * 0.7 : 0.7 - morbido((s.fase - 0.45) / 0.55) * 0.7);
      rm.uomo.spalle.forEach((sp) => (sp.rotation.x = -1.2 + rm.uomo.busto.rotation.x * 0.6));
      rm.uomo.gomiti.forEach((g) => (g.rotation.x = -0.6));
    });
    // cerchi sull'acqua quando i remi entrano, e a prua quando si corre
    if (s.fase < 0.05 && t > s.scia && caccia) {
      s.scia = t + 0.3;
      w.set(0.75, 0, 0);
      this.remi[Math.floor(Math.random() * 4)].g.children[0].localToWorld(w);
      gocce[SLOT[s.slot]].set(w.x, w.z, t, 0.35);
      s.slot = (s.slot + 1) % SLOT.length;
    }

    // il pesce: davanti alla prua, dentro il cerchio di luce, scarta a zig-zag
    const visto = e > 6.5 && !dopo;
    if (visto) {
      const avanti = 1.55 + (caccia ? -0.25 * fra(e, 12, 20) : 0);
      w.set(Math.sin(t * 1.7) * 0.18, 0, avanti).applyMatrix4(this.barca.matrixWorld);
      s.pesce.copy(w);
      this.pesce.visible = true;
      this.pesce.position.set(w.x, PELO_ACQUA + 0.003, w.z);
      this.pesce.rotation.y = rotta - Math.PI / 2 + Math.cos(t * 1.7) * 0.25;
      (this.pesce.material as THREE.MeshBasicMaterial).opacity = 0.7 * fra(e, 6.5, 8);
      this.pinna.visible = true;
      this.pinna.position.set(w.x, PELO_ACQUA, w.z);
      this.pinna.rotation.y = rotta + Math.cos(t * 1.7) * 0.25;
      this.pinna.scale.setScalar(0.9 + Math.sin(t * 6) * 0.1);
    }

    // la vedetta indica il pesce
    const v = this.vedetta;
    v.spalle[0].rotation.x = -avvista * 2.3 * (dopo ? 0 : 1);
    v.gomiti[0].rotation.x = -avvista * 0.2;
    v.testa.rotation.x = avvista * 0.35;

    // il lanciatore: carica, scaglia
    const L = this.lanciatore;
    const carica = fra(e, 17, 19.5);
    L.spalle[0].rotation.x = -2.7 * carica + (s.lancio >= 0 ? Math.min(1, (t - s.lancio) * 6) * 2.2 : 0);
    L.spalle[0].rotation.z = 0.25 * carica;
    L.busto.rotation.x = -0.25 * carica + (s.lancio >= 0 ? 0.4 * Math.min(1, (t - s.lancio) * 5) : 0);
    if (s.lancio < 0 && e > 20.2) {
      s.lancio = t;
      this.arpione.visible = false;
      this.volo.visible = true;
      this.arpione.getWorldPosition(s.partenza);
      s.bersaglio.copy(s.pesce);
    }
    if (s.lancio >= 0 && s.impatto < 0) {
      const u = Math.min(1, (t - s.lancio) / 0.8);
      w.lerpVectors(s.partenza, s.bersaglio, u);
      w.y = THREE.MathUtils.lerp(s.partenza.y, PELO_ACQUA, u) + Math.sin(u * Math.PI) * 0.35;
      q.lerpVectors(s.partenza, s.bersaglio, Math.min(1, u + 0.02));
      q.y = THREE.MathUtils.lerp(s.partenza.y, PELO_ACQUA, Math.min(1, u + 0.02)) + Math.sin(Math.min(1, u + 0.02) * Math.PI) * 0.35;
      this.volo.position.copy(w);
      this.volo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(w).normalize());
      this.volo.scale.setScalar(1.15);
      if (u >= 1) {
        // colpito: l'acqua esplode, cerchi larghi, il pesce sparisce
        s.impatto = t;
        for (let k = 0; k < 3; k++) {
          gocce[SLOT[s.slot]].set(s.bersaglio.x + casuale(-0.05, 0.05), s.bersaglio.z + casuale(-0.05, 0.05), t + k * 0.12, 1.2);
          s.slot = (s.slot + 1) % SLOT.length;
        }
        this.schizzi.forEach((sc) => {
          const a = casuale(0, Math.PI * 2);
          const o = casuale(0.3, 0.9);
          sc.v.set(Math.cos(a) * o, casuale(1.0, 2.2), Math.sin(a) * o);
          sc.s.position.copy(s.bersaglio).setY(PELO_ACQUA + 0.02);
          sc.s.visible = true;
        });
      }
    }
    if (s.impatto >= 0) {
      const ei = t - s.impatto;
      (this.pesce.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - fra(ei, 0, 0.35));
      this.pinna.visible = ei < 0.15;
      // l'arpione resta piantato in acqua, inclinato, poi va giù
      this.volo.position.y = PELO_ACQUA + 0.15 - fra(ei, 1.5, 3.5) * 0.4;
      this.volo.visible = ei < 3.5;
      this.schizzi.forEach((sc) => {
        if (!sc.s.visible) return;
        sc.v.y -= 7 * dt;
        sc.s.position.addScaledVector(sc.v, dt);
        sc.s.scale.setScalar(0.05 + ei * 0.05);
        sc.s.material.opacity = Math.max(0, 0.9 - ei * 1.2);
        if (sc.s.position.y < PELO_ACQUA || ei > 0.8) sc.s.visible = false;
      });
    }
    // la cima dell'arpione, dal lanciatore all'acqua
    if (s.lancio >= 0 && t - s.lancio < 6) {
      this.cima.visible = true;
      const pos = this.cima.geometry.attributes.position as THREE.BufferAttribute;
      L.gomiti[0].getWorldPosition(p);
      for (let i = 0; i < 16; i++) {
        const u = i / 15;
        w.lerpVectors(p, this.volo.position, u);
        w.y -= Math.sin(u * Math.PI) * 0.06;
        pos.setXYZ(i, w.x, w.y, w.z);
      }
      pos.needsUpdate = true;
    } else this.cima.visible = false;

    // la lampada trema un poco
    const tremo = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3);
    this.lampada.intensity = 3.5 * tremo;
    this.bagliore.material.opacity = 0.9 * tremo;

    if (s.k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      this.pesce.visible = false;
      this.pinna.visible = false;
      finito("notte", "feluca", t);
    }
  }

  libera() {
    cancella("notte", "feluca");
    SLOT.forEach((k) => gocce[k].set(0, 0, -100, 0));
    liberaTutto(this.gruppo, this.texture);
  }
}
