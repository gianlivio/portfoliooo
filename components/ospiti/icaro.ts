import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import {
  type Ospite, alone, assi, attesa, passa, tocca, casuale, fra, generatore, liberaTutto, loft, morbido, primo, segno,
} from "./comuni";

/**
 * Di giorno, di rado, Icaro.
 * Entra di lato battendo le ali di penne e cera legate alle braccia, sale verso un sole
 * che si accende in alto. La cera cola, le penne si staccano una a una e scendono
 * dondolando come foglie; lui batte le braccia sempre più in fretta, stalla, si ribalta
 * e precipita oltre l'orizzonte. Restano le penne: qualcuna arriva fin sul marmo,
 * davanti a chi guarda, si posa, e una folata se la riporta via.
 */

const SCALA = 1.3;
const PELLE = new THREE.Color("#B97A52");
const CAPELLI = new THREE.Color("#2B1D14");
const TELA = new THREE.Color("#EDE6D8");

/* ------------------------------------------------------------------ penna */

/** Una penna: rachide, vessillo asimmetrico con barbe e qualche spacco, cera alla radice. */
function texturaPenna() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const x = c.getContext("2d");
  if (x) {
    const r = generatore(5);
    // sagoma del vessillo: stretta alla radice, larga a metà, punta arrotondata
    x.beginPath();
    x.moveTo(32, 250);
    x.bezierCurveTo(12, 220, 4, 120, 14, 40);
    x.quadraticCurveTo(26, 4, 34, 6);
    x.bezierCurveTo(48, 20, 58, 110, 50, 200);
    x.quadraticCurveTo(44, 236, 32, 250);
    x.closePath();
    const g = x.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, "#C8923A");
    g.addColorStop(0.12, "#D9B56E");
    g.addColorStop(0.2, "#EFE6D3");
    g.addColorStop(0.7, "#E4D6BC");
    g.addColorStop(1, "#9B7C58");
    x.fillStyle = g;
    x.fill();
    x.save();
    x.clip();
    // barbe
    x.strokeStyle = "rgba(120,96,64,0.25)";
    x.lineWidth = 1;
    for (let yy = 20; yy < 240; yy += 3) {
      x.beginPath();
      x.moveTo(32, yy);
      x.lineTo(0, yy - 26);
      x.moveTo(32, yy);
      x.lineTo(64, yy - 30);
      x.stroke();
    }
    // bande più scure verso la punta
    x.fillStyle = "rgba(110,84,56,0.18)";
    for (let k = 0; k < 4; k++) x.fillRect(0, 20 + k * 22, 64, 7);
    // spacchi nel vessillo
    x.globalCompositeOperation = "destination-out";
    x.strokeStyle = "rgba(0,0,0,1)";
    x.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const yy = 50 + r() * 160;
      const lato = r() < 0.5 ? -1 : 1;
      x.beginPath();
      x.moveTo(32 + lato * 6, yy);
      x.lineTo(32 + lato * 34, yy - 22);
      x.stroke();
    }
    x.restore();
    // rachide
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = "#F7F1E4";
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(32, 256);
    x.quadraticCurveTo(30, 120, 33, 8);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Geometria unitaria: radice nell'origine, punta verso −z, giace nel piano xz. */
function geometriaPenna() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 4);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -0.5);
  // un filo d'arco lungo la rachide
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = -p.getZ(i);
    p.setY(i, Math.sin(z * Math.PI) * 0.04 - Math.abs(p.getX(i)) * 0.05);
  }
  g.computeVertexNormals();
  return g;
}

type Ala = {
  spalla: THREE.Group;
  mano: THREE.Group;
  interne: THREE.InstancedMesh;
  esterne: THREE.InstancedMesh;
  lato: number;
};

type Libera = {
  viva: boolean; eta: number; pos: THREE.Vector3; vel: THREE.Vector3; q0: THREE.Quaternion;
  scala: THREE.Vector3; dir: THREE.Vector3; fase: number; freq: number; giro: number; vGiro: number;
  posata: number; atterra: boolean; folata: number;
};

const LIBERE = 130;

/* ------------------------------------------------------------------ icaro */

export class Icaro implements Ospite {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private testa = new THREE.Group();
  private ali: Ala[] = [];
  private gambe: { anca: THREE.Group; ginocchio: THREE.Group }[] = [];
  private lembo: THREE.Mesh;
  private sole: THREE.Sprite;
  private gocce: { s: THREE.Sprite; v: THREE.Vector3; viva: boolean }[] = [];
  private libere: THREE.InstancedMesh;
  private stLibere: Libera[] = [];
  private attaccate: { ala: Ala; mesh: THREE.InstancedMesh; i: number; m: THREE.Matrix4 }[] = [];
  private texture: THREE.Texture[] = [];
  private curva: THREE.CatmullRomCurve3 | null = null;
  private stato = {
    prossima: primo(22, 6), inizio: -1, fase: "volo" as "volo" | "crisi" | "caduta" | "dopo" | "fermo",
    s: 0, L: 1, tFase: 0, battito: 0, staccate: 0, debito: 0, cera: 0,
    vel: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion(),
    imbardata: 0, rollio: 0, verso: 1, vicine: false, prima: new THREE.Vector3(),
    soleP: new THREE.Vector3(),
  };
  private tmp = {
    m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(),
    a: new THREE.Vector3(), tg: new THREE.Vector3(), zero: new THREE.Matrix4().makeScale(0, 0, 0),
  };

  constructor() {
    const pelle = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
    const legno = new THREE.MeshStandardMaterial({ color: "#6E5233", roughness: 0.9 });
    const cuoio = new THREE.MeshStandardMaterial({ color: "#4A3322", roughness: 0.8 });
    const tela = new THREE.MeshStandardMaterial({ color: TELA, roughness: 0.95, side: THREE.DoubleSide });
    const txPenna = texturaPenna();
    this.texture.push(txPenna);
    const piuma = new THREE.MeshStandardMaterial({ map: txPenna, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
    const gPenna = geometriaPenna();

    // busto, con il perizoma
    this.corpo.add(new THREE.Mesh(loft([
      { z: -0.25, l: 0.095, su: 0.06, giu: 0.07 },
      { z: -0.13, l: 0.11, su: 0.06, giu: 0.065 },
      { z: 0.0, l: 0.098, su: 0.058, giu: 0.06 },
      { z: 0.12, l: 0.13, su: 0.07, giu: 0.072 },
      { z: 0.22, l: 0.15, su: 0.062, giu: 0.06 },
      { z: 0.28, l: 0.06, su: 0.04, giu: 0.04 },
      { z: 0.33, l: 0.04, su: 0.035, giu: 0.035 },
    ], {
      radiali: 18, passi: 3,
      colore: (k) => (k < 0.2 ? TELA : PELLE.clone().multiplyScalar(0.95 + Math.random() * 0.08)),
    }), pelle));
    {
      // il lembo del perizoma che sventola dietro
      const g = new THREE.PlaneGeometry(0.12, 0.3, 1, 8);
      g.translate(0, -0.15, 0);
      g.rotateX(Math.PI / 2);
      this.lembo = new THREE.Mesh(g, tela);
      this.lembo.position.set(0, -0.03, -0.25);
      this.corpo.add(this.lembo);
    }

    // testa: riccioli scuri sopra e dietro, il viso avanti
    this.testa.position.set(0, 0.035, 0.36);
    this.testa.rotation.x = -0.35;
    this.corpo.add(this.testa);
    this.testa.add(new THREE.Mesh(loft([
      { z: -0.075, l: 0.05, su: 0.05, giu: 0.045 },
      { z: -0.03, l: 0.068, su: 0.072, giu: 0.06 },
      { z: 0.04, l: 0.066, su: 0.07, giu: 0.07, y: -0.005 },
      { z: 0.09, l: 0.05, su: 0.05, giu: 0.065, y: -0.01 },
      { z: 0.11, l: 0.025, su: 0.02, giu: 0.03, y: -0.015 },
    ], {
      radiali: 18, passi: 3,
      colore: (k, ang) => {
        const s = Math.sin(ang);
        const ricci = 0.85 + 0.3 * Math.abs(Math.sin(ang * 7 + k * 20));
        return s > -0.1 + k * 0.6 || k < 0.25 ? CAPELLI.clone().multiplyScalar(ricci) : PELLE;
      },
    }), pelle));

    // braccia con le ali: un'asta di legno, cinghie di cuoio, penne in file
    for (const lato of [1, -1]) {
      const spalla = new THREE.Group();
      spalla.position.set(lato * 0.14, 0.02, 0.2);
      spalla.scale.x = lato;
      const braccio = loft([
        { z: 0, l: 0.042, su: 0.045 },
        { z: 0.14, l: 0.038, su: 0.04 },
        { z: 0.27, l: 0.033, su: 0.033 },
        { z: 0.4, l: 0.03, su: 0.028 },
        { z: 0.54, l: 0.022, su: 0.02 },
      ], { radiali: 10, passi: 2, colore: () => PELLE });
      braccio.rotateY(Math.PI / 2);
      spalla.add(new THREE.Mesh(braccio, pelle));
      const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 1.0, 6), legno);
      asta.rotation.z = Math.PI / 2;
      asta.position.set(0.5, 0.012, 0.012);
      spalla.add(asta);
      for (const x of [0.26, 0.52]) {
        const c = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 5, 12), cuoio);
        c.rotation.y = Math.PI / 2;
        c.position.x = x;
        spalla.add(c);
      }
      const mano = new THREE.Group();
      mano.position.x = 0.54;
      spalla.add(mano);
      const pugno = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pelle);
      pugno.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(pugno.geometry.attributes.position.count).fill(0).flatMap(() => [PELLE.r, PELLE.g, PELLE.b]), 3));
      pugno.position.x = 0.03;
      mano.add(pugno);

      // penne del braccio: remiganti secondarie e due file di copritrici
      const interne: THREE.Matrix4[] = [];
      const metti = (arr: THREE.Matrix4[], x: number, y: number, ang: number, lungh: number, largh: number, torsione = 0) => {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, -0.008),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, torsione)),
          new THREE.Vector3(largh, 1, lungh)
        );
        arr.push(m);
      };
      for (let i = 0; i < 14; i++) {
        const k = i / 13;
        metti(interne, 0.05 + k * 0.48, -0.004, 0.06 + k * 0.22, 0.42 + k * 0.08, 0.085);
      }
      for (let i = 0; i < 14; i++) {
        const k = i / 13;
        metti(interne, 0.07 + k * 0.48, 0.006, 0.08 + k * 0.2, 0.24, 0.075);
      }
      for (let i = 0; i < 10; i++) {
        const k = i / 9;
        metti(interne, 0.06 + k * 0.48, 0.014, 0.1 + k * 0.15, 0.13, 0.07);
      }
      // penne della mano: remiganti primarie a ventaglio, e le loro copritrici
      const esterne: THREE.Matrix4[] = [];
      for (let i = 0; i < 10; i++) {
        const k = i / 9;
        metti(esterne, 0.0 + k * 0.42, -0.004 - k * 0.002, 0.34 + k * 0.95, 0.5 + k * 0.22, 0.09 - k * 0.012, k * 0.12);
      }
      for (let i = 0; i < 8; i++) {
        const k = i / 7;
        metti(esterne, 0.02 + k * 0.38, 0.008, 0.36 + k * 0.85, 0.22, 0.07);
      }
      const im = (mats: THREE.Matrix4[], padre: THREE.Object3D) => {
        const mesh = new THREE.InstancedMesh(gPenna, piuma, mats.length);
        mats.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.frustumCulled = false;
        padre.add(mesh);
        return mesh;
      };
      const ala: Ala = { spalla, mano, interne: im(interne, spalla), esterne: im(esterne, mano), lato };
      interne.forEach((m, i) => this.attaccate.push({ ala, mesh: ala.interne, i, m }));
      esterne.forEach((m, i) => this.attaccate.push({ ala, mesh: ala.esterne, i, m }));
      this.corpo.add(spalla);
      this.ali.push(ala);
    }

    // gambe, che scalciano piano
    for (const lato of [1, -1]) {
      const anca = new THREE.Group();
      anca.position.set(lato * 0.06, -0.01, -0.22);
      const coscia = loft([
        { z: 0, l: 0.055, su: 0.055 },
        { z: -0.2, l: 0.045, su: 0.047 },
        { z: -0.4, l: 0.033, su: 0.035 },
      ], { radiali: 10, passi: 2, colore: () => PELLE });
      anca.add(new THREE.Mesh(coscia, pelle));
      const ginocchio = new THREE.Group();
      ginocchio.position.z = -0.4;
      const stinco = loft([
        { z: 0, l: 0.034, su: 0.036 },
        { z: -0.14, l: 0.034, su: 0.038 },
        { z: -0.36, l: 0.022, su: 0.024 },
        { z: -0.42, l: 0.022, su: 0.02, y: -0.01 },
        { z: -0.47, l: 0.02, su: 0.012, y: -0.025 },
      ], { radiali: 10, passi: 2, colore: () => PELLE });
      ginocchio.add(new THREE.Mesh(stinco, pelle));
      anca.add(ginocchio);
      this.corpo.add(anca);
      this.gambe.push({ anca, ginocchio });
    }

    this.corpo.scale.setScalar(SCALA);
    this.gruppo.add(this.corpo);

    // le penne staccate: tutte in un'unica istanza, nel mondo
    this.libere = new THREE.InstancedMesh(gPenna, piuma, LIBERE);
    this.libere.frustumCulled = false;
    for (let i = 0; i < LIBERE; i++) {
      this.libere.setMatrixAt(i, this.tmp.zero);
      this.stLibere.push({
        viva: false, eta: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), q0: new THREE.Quaternion(),
        scala: new THREE.Vector3(1, 1, 1), dir: new THREE.Vector3(1, 0, 0), fase: 0, freq: 1, giro: 0, vGiro: 0,
        posata: -1, atterra: false, folata: 0,
      });
    }
    this.gruppo.add(this.libere);

    // gocce di cera
    const txCera = alone("#E0A548");
    this.texture.push(txCera);
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txCera, color: "#E8B25A", transparent: true, depthWrite: false }));
      s.visible = false;
      this.gruppo.add(s);
      this.gocce.push({ s, v: new THREE.Vector3(), viva: false });
    }

    // il sole: un bagliore caldo che si accende in alto
    const txSole = alone("#FFF4D6");
    this.texture.push(txSole);
    this.sole = new THREE.Sprite(new THREE.SpriteMaterial({
      map: txSole, color: "#FFE9B0", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.sole.visible = false;
    this.gruppo.add(this.sole);

    this.corpo.visible = false;
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  private nuovoVolo(camera: THREE.Camera) {
    const s = this.stato;
    const { avanti, lato } = assi(camera);
    const v = segno();
    s.verso = v;
    const P = (d: number, l: number, y: number) => avanti.clone().multiplyScalar(d).addScaledVector(lato, l * v).setY(y);
    const j = () => casuale(-1, 1);
    this.curva = new THREE.CatmullRomCurve3([
      P(19 + j(), -15 + j(), 3.6 + j() * 0.3),
      P(14.5 + j(), -7.5 + j(), 3.2 + j() * 0.2),
      P(12.5 + j() * 0.5, -1.5 + j(), 3.5 + j() * 0.2),
      P(11.8, 2.2 + j() * 0.6, 4.2),
      P(12.2, 3.6 + j() * 0.5, 4.75),
    ], false, "centripetal");
    s.L = this.curva.getLength();
    s.s = 0;
    s.soleP.copy(P(32, 7, 13.5));
    this.sole.position.copy(s.soleP);
    this.sole.scale.setScalar(16);
    // tutte le penne tornano al loro posto
    this.attaccate.forEach((a) => a.mesh.setMatrixAt(a.i, a.m));
    this.ali.forEach((a) => {
      a.interne.instanceMatrix.needsUpdate = true;
      a.esterne.instanceMatrix.needsUpdate = true;
    });
    s.staccate = 0;
    s.debito = 0;
    s.vicine = false;
    // ordine in cui si staccheranno: a caso, ma le più esterne un po' prima
    this.attaccate.sort(() => Math.random() - 0.5);
  }

  private stacca() {
    const s = this.stato;
    if (s.staccate >= this.attaccate.length) return;
    const a = this.attaccate[s.staccate++];
    const { m, p, q, s: sc } = this.tmp;
    a.mesh.updateMatrixWorld(true);
    m.multiplyMatrices(a.mesh.matrixWorld, a.m);
    m.decompose(p, q, sc);
    a.mesh.setMatrixAt(a.i, this.tmp.zero);
    a.mesh.instanceMatrix.needsUpdate = true;
    const l = this.stLibere.find((x) => !x.viva);
    if (!l) return;
    l.viva = true;
    l.eta = 0;
    l.pos.copy(p);
    l.q0.copy(q);
    l.scala.copy(sc);
    l.vel.copy(s.vel).multiplyScalar(0.5).add(new THREE.Vector3(casuale(-0.4, 0.4), casuale(-0.1, 0.4), casuale(-0.4, 0.4)));
    l.dir.set(casuale(-1, 1), 0, casuale(-1, 1)).normalize();
    l.fase = casuale(0, 6.28);
    l.freq = casuale(1.6, 2.6);
    l.giro = casuale(0, 6.28);
    l.vGiro = casuale(-1, 1);
    l.atterra = false;
    l.posata = -1;
  }

  /** Penne che arrivano davanti a chi guarda, scendono fino al marmo e ci restano un poco. */
  private vicine(camera: THREE.Camera) {
    const { avanti, lato } = assi(camera);
    const n = 3;
    for (let k = 0; k < n; k++) {
      const l = this.stLibere.find((x) => !x.viva);
      if (!l) return;
      l.viva = true;
      l.eta = -k * casuale(1.2, 2.2);
      l.pos.copy(avanti).multiplyScalar(casuale(2.4, 3.6)).addScaledVector(lato, casuale(-1.6, 1.6)).setY(casuale(3.2, 3.8));
      l.q0.setFromEuler(new THREE.Euler(0, casuale(0, 6.28), 0));
      l.scala.set(0.09 * SCALA, 1, casuale(0.4, 0.6) * SCALA);
      l.vel.set(0, -0.3, 0);
      l.dir.copy(lato).multiplyScalar(segno());
      l.fase = casuale(0, 6.28);
      l.freq = casuale(1.5, 2.2);
      l.giro = casuale(0, 6.28);
      l.vGiro = casuale(-0.6, 0.6);
      l.atterra = true;
      l.posata = -1;
    }
  }

  private muoviPenne(t: number, dt: number) {
    const { m, p, q } = this.tmp;
    const qm = new THREE.Quaternion();
    const asse = new THREE.Vector3();
    let vive = 0;
    this.stLibere.forEach((l, i) => {
      if (!l.viva) return;
      l.eta += dt;
      if (l.eta < 0) {
        this.libere.setMatrixAt(i, this.tmp.zero);
        vive++;
        return;
      }
      if (l.posata >= 0) {
        // posata sul marmo; poi una folata la solleva e la porta via
        const e = t - l.posata;
        if (e > 3.5) {
          if (l.folata === 0) {
            l.folata = t;
            l.vel.copy(l.dir).multiplyScalar(2.2).setY(0.9);
          }
          l.vel.y -= 0.6 * dt;
          l.pos.addScaledVector(l.vel, dt);
          l.giro += dt * 5;
          if (e > 7) l.viva = false;
        }
        p.copy(l.pos);
        qm.setFromEuler(new THREE.Euler(e > 3.5 ? Math.sin(t * 9) * 0.6 : 0, l.giro, e > 3.5 ? (e - 3.5) * 4 : 0));
        m.compose(p, qm, l.scala);
        this.libere.setMatrixAt(i, l.viva ? m : this.tmp.zero);
        vive++;
        return;
      }
      // in aria: scende lenta, dondola come una foglia, ruota piano
      l.vel.y += (-0.5 - l.vel.y) * Math.min(1, dt * 1.6);
      l.vel.x *= 1 - dt * 0.9;
      l.vel.z *= 1 - dt * 0.9;
      l.fase += dt * l.freq;
      const ondeggio = Math.cos(l.fase) * 0.55;
      l.pos.addScaledVector(l.vel, dt).addScaledVector(l.dir, ondeggio * dt);
      l.pos.y += Math.abs(Math.sin(l.fase)) * 0.12 * dt;
      l.giro += l.vGiro * dt;
      asse.set(-l.dir.z, 0, l.dir.x);
      qm.setFromAxisAngle(asse, Math.sin(l.fase) * 0.5);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.giro).premultiply(qm);
      const k = Math.min(1, l.eta / 1.4);
      const qq = l.q0.clone().slerp(q, morbido(k));
      if (l.atterra && l.pos.y <= PELO_ACQUA + 0.004) {
        l.pos.y = PELO_ACQUA + 0.004;
        l.posata = t;
        l.folata = 0;
      }
      if (!l.atterra && (l.pos.y < PELO_ACQUA - 0.3 || l.eta > 22)) l.viva = false;
      m.compose(l.pos, qq, l.scala);
      this.libere.setMatrixAt(i, l.viva ? m : this.tmp.zero);
      vive++;
    });
    this.libere.instanceMatrix.needsUpdate = true;
    return vive;
  }

  private muoviCera(dt: number) {
    this.gocce.forEach((g) => {
      if (!g.viva) return;
      g.v.y -= 7 * dt;
      g.s.position.addScaledVector(g.v, dt);
      g.s.scale.set(0.035, 0.035 + Math.min(0.09, -g.v.y * 0.012), 1);
      if (g.s.position.y < PELO_ACQUA - 0.5) {
        g.viva = false;
        g.s.visible = false;
      }
    });
  }

  private cola() {
    const g = this.gocce.find((x) => !x.viva);
    const a = this.attaccate[Math.floor(Math.random() * this.attaccate.length)];
    if (!g || !a) return;
    const { m, p, q, s } = this.tmp;
    a.mesh.updateMatrixWorld(true);
    m.multiplyMatrices(a.mesh.matrixWorld, a.m).decompose(p, q, s);
    g.s.position.copy(p);
    g.v.copy(this.stato.vel).multiplyScalar(0.4);
    g.viva = true;
    g.s.visible = true;
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    const vive = this.gruppo.visible ? this.muoviPenne(t, dt) : 0;
    this.muoviCera(dt);
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("cieloGiorno", "icaro", t)) return;
      this.nuovoVolo(camera);
      s.inizio = t;
      s.fase = "volo";
      s.tFase = t;
      this.gruppo.visible = true;
      this.corpo.visible = true;
      this.sole.visible = true;
    }
    const curva = this.curva;
    if (!curva) return;
    const { p, tg } = this.tmp;
    const e = t - s.tFase;
    let freq = 1.25, ampiezza = 0.55, ritmoStacco = 0, ritmoCera = 0, soleVoluto = 0;
    let sobbalzo = 0;

    if (s.fase === "volo") {
      // sale lungo la curva, sempre più lento verso la cima
      const k = s.s / s.L;
      const v = 2.5 - 1.3 * morbido((k - 0.5) / 0.5);
      s.s = Math.min(s.L, s.s + v * dt);
      const kk = s.s / s.L;
      curva.getPointAt(kk, p);
      curva.getTangentAt(kk, tg);
      s.vel.copy(tg).multiplyScalar(v);
      this.corpo.position.copy(p);
      this.orienta(tg, dt, 0.25);
      soleVoluto = fra(kk, 0.15, 0.85);
      ritmoCera = kk > 0.45 ? 3 : 0;
      ritmoStacco = kk > 0.62 ? 2 + (kk - 0.62) * 14 : 0;
      sobbalzo = Math.sin(s.battito) * 0.06;
      if (kk >= 1) {
        s.fase = "crisi";
        s.tFase = t;
        s.prima.copy(p);
      }
    } else if (s.fase === "crisi") {
      // in cima: sbatte le braccia in fretta, perde penne a manciate, quasi fermo
      freq = 2.4;
      ampiezza = 0.85;
      soleVoluto = 1;
      ritmoCera = 6;
      ritmoStacco = 20;
      p.copy(s.prima).add(new THREE.Vector3(0, Math.sin(e * 6) * 0.05 - e * 0.12, 0));
      this.corpo.position.copy(p);
      s.vel.set(0, -0.1, 0);
      this.corpo.rotateX(-0.25 * dt);
      if (e > 2.3) {
        s.fase = "caduta";
        s.tFase = t;
        s.prima.copy(p);
        const { avanti, lato } = assi(camera);
        s.vel.copy(avanti).multiplyScalar(1.4).addScaledVector(lato, casuale(-0.4, 0.4) * s.verso).setY(0.6);
        s.w.set(casuale(-1, 1), casuale(-0.5, 0.5), casuale(-1, 1)).normalize();
      }
    } else if (s.fase === "caduta") {
      // stalla, si ribalta e precipita oltre l'orizzonte
      freq = 2.8;
      ampiezza = 1.0;
      soleVoluto = 1 - fra(e, 0.5, 3.0);
      ritmoStacco = 12;
      s.vel.y -= 6.5 * dt;
      this.corpo.position.addScaledVector(s.vel, dt);
      const giro = (1.2 + e * 2.2) * dt;
      this.corpo.quaternion.premultiply(this.tmp.q.setFromAxisAngle(s.w, giro));
      if (!s.vicine && e > 0.8) {
        s.vicine = true;
        this.vicine(camera);
      }
      if (this.corpo.position.y < PELO_ACQUA - 0.2) {
        s.fase = "dopo";
        s.tFase = t;
        this.corpo.visible = false;
      }
    } else if (s.fase === "dopo") {
      soleVoluto = 0;
      if (vive === 0 && e > 2) {
        s.fase = "fermo";
        s.inizio = -1;
        s.prossima = t + attesa(100, 160);
        passa("cieloGiorno", t, attesa(30, 60));
        this.gruppo.visible = false;
        this.sole.visible = false;
        return;
      }
    }

    // ali: battito (giù rapido, su più lento), la mano segue in ritardo
    s.battito += dt * freq * Math.PI * 2;
    const b = s.battito;
    const giu = Math.sin(b - 0.3 * Math.sin(b));
    const caos = s.fase === "caduta" ? Math.sin(t * 13.7) * 0.4 : 0;
    this.ali.forEach((a, i) => {
      const fl = 0.1 + giu * ampiezza + (i === 0 ? caos : -caos);
      a.spalla.rotation.z = a.lato * fl;
      a.spalla.rotation.x = Math.cos(b) * 0.12;
      a.mano.rotation.z = Math.sin(b - 0.9) * ampiezza * 0.45;
    });
    this.corpo.position.y += sobbalzo * dt * 3;
    // gambe: una sforbiciata lenta; nella caduta si scompongono
    this.gambe.forEach((g, i) => {
      const lato = i === 0 ? 1 : -1;
      const calcio = Math.sin(t * 2.2 + i * Math.PI) * 0.12;
      g.anca.rotation.x = calcio + (s.fase === "caduta" ? Math.sin(t * 7 + i) * 0.6 : 0);
      g.anca.rotation.y = lato * (s.fase === "caduta" ? 0.4 : 0.06);
      g.ginocchio.rotation.x = -0.15 - Math.max(0, Math.sin(t * 2.2 + i * Math.PI + 0.6)) * 0.35;
    });
    // la testa guarda in alto, verso il sole
    this.testa.rotation.x = -0.35 - (s.fase === "volo" ? 0.15 : s.fase === "crisi" ? 0.45 : 0);
    // il lembo del perizoma
    {
      const pos = this.lembo.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const lungo = -z / 0.3;
        pos.setY(i, Math.sin(t * 9 - lungo * 6) * 0.03 * lungo);
      }
      pos.needsUpdate = true;
    }

    // penne che si staccano e cera che cola
    s.debito += ritmoStacco * dt;
    while (s.debito >= 1) {
      s.debito -= 1;
      this.stacca();
    }
    if (ritmoCera > 0 && Math.random() < ritmoCera * dt) this.cola();

    // il sole
    const mat = this.sole.material;
    mat.opacity += (soleVoluto * 0.95 - mat.opacity) * Math.min(1, dt * 1.5);
    this.sole.scale.setScalar(16 + Math.sin(t * 0.8) * 0.6);
  }

  /** Muso lungo la direzione di volo, inclinato in virata. */
  private orienta(tg: THREE.Vector3, dt: number, cabra: number) {
    const s = this.stato;
    const imb = Math.atan2(tg.x, tg.z);
    let d = imb - s.imbardata;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    s.imbardata = imb;
    const voluto = THREE.MathUtils.clamp((-d / Math.max(dt, 0.001)) * 0.8, -0.6, 0.6);
    s.rollio += (voluto - s.rollio) * Math.min(1, dt * 2);
    this.corpo.lookAt(this.tmp.a.copy(this.corpo.position).add(tg));
    this.corpo.rotateZ(s.rollio);
    this.corpo.rotateX(-cabra);
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
