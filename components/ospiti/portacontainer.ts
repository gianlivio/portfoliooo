import * as THREE from "three";
import { PELO_ACQUA, gocce } from "../condivisi";
import {
  type Ospite, alone, assi, cancella, casuale, finito, generatore, liberaTutto, loft, primo, riposo, segno, tela, tocca,
} from "./comuni";

/**
 * Di notte, una portacontainer che passa lenta, lontana quanto basta per sembrare enorme.
 * Scafo scuro con la linea rossa dell'antivegetativa, la prua a bulbo che apre l'onda,
 * le pile di container di tutti i colori fra i ponti di rizzaggio, il castello bianco a poppa
 * con le finestre accese e la plancia con le alette, il fumaiolo. Le luci come vuole il regolamento:
 * bianche di testa sugli alberi, rossa a sinistra, verde a dritta, bianca a poppa;
 * e le luci arancioni del ponte che illuminano i container.
 */

const SLOT = [4, 5, 6, 7];
const LUNGA = 3.4; // da poppa a prua, in unità di scena

/** Facciata del castello: file di finestre, quasi tutte accese di luce calda, qualcuna spenta. */
function texturaFinestre(seme: number) {
  const r = generatore(seme);
  return tela(128, 128, (x) => {
    x.fillStyle = "#000";
    x.fillRect(0, 0, 128, 128);
    for (let riga = 0; riga < 6; riga++) {
      for (let col = 0; col < 8; col++) {
        const acceso = r() < 0.62;
        x.fillStyle = acceso ? (r() < 0.8 ? "#FFD79A" : "#DDEBFF") : "#0A0A0A";
        x.fillRect(6 + col * 15, 10 + riga * 20, 9, 8);
      }
    }
    // la plancia, in cima: una fascia di vetrate fioca, verdognola per gli strumenti
    x.fillStyle = "#3C5A50";
    x.fillRect(4, 0, 120, 6);
  });
}

/** Lamiera ondulata dei container: righe verticali chiare e scure, bordi dei telai. */
function texturaLamiera() {
  return tela(64, 16, (x) => {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 64, 16);
    for (let i = 0; i < 64; i += 4) {
      x.fillStyle = "rgba(0,0,0,0.22)";
      x.fillRect(i, 0, 1, 16);
      x.fillStyle = "rgba(255,255,255,0.5)";
      x.fillRect(i + 2, 0, 1, 16);
    }
    x.fillStyle = "rgba(0,0,0,0.35)";
    x.fillRect(0, 0, 64, 1);
    x.fillRect(0, 15, 64, 1);
    x.fillRect(0, 0, 2, 16);
    x.fillRect(62, 0, 2, 16);
  });
}

const COLORI = ["#2E6E9E", "#3A8FC4", "#A8322D", "#C9542B", "#E3E1D9", "#2F6B45", "#7A7F86", "#6A4636", "#D9A42B", "#1F3B66", "#8E2C4F", "#B8BCC0"];

export class Portacontainer implements Ospite {
  gruppo = new THREE.Group();
  private nave = new THREE.Group();
  private onde: { s: THREE.Sprite; base: THREE.Vector3 }[] = [];
  private fanali: { s: THREE.Sprite; base: number }[] = [];
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(10, 2), inizio: -1, durata: 46, fase: 0, slot: 0, scia: 0,
    da: new THREE.Vector3(), a: new THREE.Vector3(),
  };
  private w = new THREE.Vector3();

  constructor() {
    const r = generatore(7);
    // scafo: fianchi diritti, prua a bulbo e slanciata, poppa a specchio
    const scafo = loft([
      { z: -1.7, y: 0.05, l: 0.2, su: 0.16, giu: 0.06, n: 5 },
      { z: -1.55, l: 0.235, su: 0.2, giu: 0.1, n: 5 },
      { z: -0.8, l: 0.25, su: 0.2, giu: 0.12, n: 6 },
      { z: 0.9, l: 0.25, su: 0.2, giu: 0.12, n: 6 },
      { z: 1.4, l: 0.19, su: 0.21, giu: 0.11, n: 3.5 },
      { z: 1.62, y: 0.02, l: 0.08, su: 0.22, giu: 0.1, n: 2.2 },
      { z: 1.72, y: 0.05, l: 0.012, su: 0.2, giu: 0.06 },
    ], {
      radiali: 24, passi: 4,
      colore: (_k, _a, p) => new THREE.Color(p.y < 0.035 ? "#7E2620" : p.y > 0.205 ? "#C9CCCB" : "#24324A"),
    });
    this.nave.add(new THREE.Mesh(scafo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 })));
    const ponte = new THREE.MeshStandardMaterial({ color: "#3B4049", roughness: 0.8 });
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.01, 3.05).translate(0, 0.2, -0.05), ponte));
    // castello di prua con il frangionde
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.22).translate(0, 0.23, 1.46), ponte));
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.015).translate(0, 0.25, 1.32), new THREE.MeshStandardMaterial({ color: "#C9CCCB", roughness: 0.6 })));

    // container: baie da quaranta piedi, file attraverso, piani in altezza; skyline irregolare
    const lamiera = texturaLamiera();
    lamiera.wrapS = lamiera.wrapT = THREE.RepeatWrapping;
    this.texture.push(lamiera);
    const C = { l: 0.13, b: 0.036, h: 0.034 };
    const FILE = 12;
    const BAIE = 15;
    const posti: { x: number; y: number; z: number }[] = [];
    for (let baia = 0; baia < BAIE; baia++) {
      const z = 1.2 - baia * 0.148 - Math.floor(baia / 2) * 0.012;
      const alta = 3 + Math.floor(r() * 3) + (baia > 1 && baia < BAIE - 1 ? 1 : 0);
      for (let f = 0; f < FILE; f++) {
        // le file esterne verso prua sono più basse, lo scafo si stringe
        const x = (f - (FILE - 1) / 2) * (C.b + 0.002);
        if (baia === 0 && Math.abs(x) > 0.16) continue;
        let h = alta - (Math.abs(f - (FILE - 1) / 2) > 4.5 && r() < 0.5 ? 1 : 0);
        if (r() < 0.06) h -= 1 + Math.floor(r() * 2);
        for (let p = 0; p < h; p++) posti.push({ x, y: 0.205 + C.h / 2 + p * (C.h + 0.001), z });
      }
    }
    const cassa = new THREE.InstancedMesh(
      new THREE.BoxGeometry(C.b, C.h, C.l),
      new THREE.MeshStandardMaterial({ map: lamiera, roughness: 0.7, metalness: 0.15 }),
      posti.length
    );
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    posti.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      cassa.setMatrixAt(i, m);
      // tante dello stesso armatore, poi di tutto
      cassa.setColorAt(i, col.set(r() < 0.35 ? COLORI[0] : COLORI[Math.floor(r() * COLORI.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.06));
    });
    this.nave.add(cassa);
    // ponti di rizzaggio, gialli, fra una coppia di baie e l'altra
    const giallo = new THREE.MeshStandardMaterial({ color: "#B99A2E", roughness: 0.7 });
    for (let baia = 2; baia < BAIE; baia += 2) {
      const z = 1.2 - baia * 0.148 - Math.floor(baia / 2) * 0.012 + 0.08;
      this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.06, 0.006).translate(0, 0.235, z), giallo));
    }

    // il castello a poppa: blocco bianco, plancia con le alette, fumaiolo
    const bianco = new THREE.MeshStandardMaterial({ color: "#D4D7D4", roughness: 0.6 });
    const txFin = texturaFinestre(3);
    this.texture.push(txFin);
    const finestre = new THREE.MeshStandardMaterial({ color: "#D4D7D4", roughness: 0.6, emissive: "#FFFFFF", emissiveMap: txFin, emissiveIntensity: 1.1 });
    const castello = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.2), [finestre, finestre, bianco, bianco, finestre, finestre]);
    castello.position.set(0, 0.41, -1.2);
    this.nave.add(castello);
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.12).translate(0, 0.645, -1.16), bianco));
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.22).translate(0, 0.685, -1.2), bianco));
    // albero radar sul tetto della plancia
    const scuro = new THREE.MeshStandardMaterial({ color: "#2A2D33", roughness: 0.7 });
    this.nave.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.18, 6).translate(0, 0.79, -1.22), scuro));
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.012).translate(0, 0.83, -1.22), scuro));
    const fumaiolo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.1).translate(0, 0.72, -1.42), scuro);
    this.nave.add(fumaiolo);
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.04, 0.102).translate(0, 0.76, -1.42), new THREE.MeshStandardMaterial({ color: "#2E6E9E", roughness: 0.6 })));
    this.nave.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.18).translate(0, 0.31, -1.5), bianco));
    // albero di prua
    this.nave.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.34, 6).translate(0, 0.4, 1.5), scuro));

    // fanali e luci di coperta
    const tx = alone("#FFFFFF");
    this.texture.push(tx);
    const fanale = (x: number, y: number, z: number, colore: string, base: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: colore, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.set(x, y, z);
      s.scale.setScalar(base);
      this.nave.add(s);
      this.fanali.push({ s, base });
    };
    fanale(0, 0.58, 1.5, "#FFFFFF", 0.12); // testa, prua
    fanale(0, 0.89, -1.22, "#FFFFFF", 0.12); // testa, poppa, più alto
    fanale(0.28, 0.66, -1.12, "#FF3B30", 0.12); // sinistra, rossa
    fanale(-0.28, 0.66, -1.12, "#30FF7A", 0.12); // dritta, verde
    fanale(0, 0.26, -1.72, "#FFFFFF", 0.1); // poppa
    for (let z = 1.1; z > -0.9; z -= 0.5) {
      for (const x of [0.235, -0.235]) fanale(x, 0.43, z, "#FFB259", 0.07);
    }
    // le luci arancioni del ponte illuminano davvero i container
    for (const z of [0.7, -0.4]) {
      const l = new THREE.PointLight("#FFA54D", 1.6, 1.6, 2);
      l.position.set(0, 0.6, z);
      this.nave.add(l);
    }
    const plancia = new THREE.PointLight("#FFE0B0", 0.8, 1.0, 2);
    plancia.position.set(0, 0.5, -0.95);
    this.nave.add(plancia);

    // l'onda di prua e la scia: schiuma chiara che ribolle sui fianchi
    const txSchiuma = alone("#E8EEF5");
    this.texture.push(txSchiuma);
    const schiuma = (x: number, z: number, s: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: txSchiuma, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      sp.position.set(x, 0.01, z);
      sp.scale.set(s, s * 0.35, 1);
      this.nave.add(sp);
      this.onde.push({ s: sp, base: sp.position.clone() });
    };
    for (const x of [0.12, -0.12, 0.2, -0.2]) schiuma(x, 1.62 - Math.abs(x) * 1.2, 0.3);
    for (const x of [0.14, 0, -0.14]) schiuma(x, -1.8, 0.4);

    this.nave.scale.setScalar(LUNGA / 3.4);
    this.gruppo.add(this.nave);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("notte", "portacontainer", t)) return;
      const { avanti, lato } = assi(camera);
      const v = segno();
      const d = casuale(4.8, 5.3);
      s.da.copy(avanti).multiplyScalar(d + casuale(-0.2, 0.2)).addScaledVector(lato, -7.5 * v);
      s.a.copy(avanti).multiplyScalar(d + casuale(-0.2, 0.2)).addScaledVector(lato, 7.5 * v);
      s.durata = casuale(42, 50);
      s.fase = casuale(0, 10);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    const k = e / s.durata;
    if (k >= 1) {
      s.inizio = -1;
      s.prossima = t + riposo();
      this.gruppo.visible = false;
      finito("notte", "portacontainer", t);
      return;
    }
    this.gruppo.position.lerpVectors(s.da, s.a, k).setY(PELO_ACQUA);
    this.gruppo.rotation.set(0, Math.atan2(s.a.x - s.da.x, s.a.z - s.da.z), 0);
    // una nave così grande quasi non si muove: un beccheggio lunghissimo
    this.nave.rotation.set(Math.sin(t * 0.35 + s.fase) * 0.006, 0, Math.sin(t * 0.27 + s.fase) * 0.01);
    this.nave.position.y = Math.sin(t * 0.4 + s.fase) * 0.006;
    this.onde.forEach((o, i) => {
      o.s.material.opacity = 0.18 + 0.1 * Math.sin(t * 3 + i * 1.7);
      o.s.position.y = o.base.y + Math.sin(t * 2 + i) * 0.004;
    });
    // l'onda di prua lascia cerchi larghi sull'acqua, ogni tanto
    if (t > s.scia) {
      s.scia = t + 1.4;
      this.w.set(0, 0, 1.65);
      this.nave.localToWorld(this.w);
      gocce[SLOT[s.slot]].set(this.w.x, this.w.z, t, 0.7);
      s.slot = (s.slot + 1) % SLOT.length;
    }
  }

  libera() {
    cancella("notte", "portacontainer");
    SLOT.forEach((k) => gocce[k].set(0, 0, -100, 0));
    liberaTutto(this.gruppo, this.texture);
  }
}
