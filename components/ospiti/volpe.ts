import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import {
  type Ospite, assi, attesa, casuale, fra, generatore, liberaTutto, loft, morbido, ombra, primo, segno,
} from "./comuni";

/**
 * Di giorno una volpe attraversa il marmo al trotto, ogni volta per una strada diversa.
 * Lungo il percorso si ferma due volte e fa qualcosa: annusa il pavimento,
 * si volta a guardare chi guarda (inclina la testa, muove un orecchio, sbatte le palpebre),
 * si siede con la coda attorno alle zampe, oppure fa il salto del topo: si acquatta,
 * balza ad arco e atterra di muso, poi si scrolla. A volte se ne va al galoppo.
 */

/* ------------------------------------------------------------------ colori */

const ARANCIO = new THREE.Color("#C2561B");
const FIANCO = new THREE.Color("#D47332");
const DORSO = new THREE.Color("#9C4417");
const BIANCO = new THREE.Color("#F1EADF");
const CREMA = new THREE.Color("#E3C7A2");
const NERO = new THREE.Color("#221915");

const rnd = generatore(11);
/** Un po' di variazione per vertice: il pelo non è mai di un colore solo. */
const pelo = (c: THREE.Color, q = 0.07) => c.clone().multiplyScalar(1 - q + rnd() * q * 2);
const mix = (a: THREE.Color, b: THREE.Color, k: number) => a.clone().lerp(b, Math.min(1, Math.max(0, k)));

/** Mantello del tronco: dorso scuro, fianchi aranciati, petto bianco che sfuma in crema sul ventre. */
function mantello(k: number, ang: number) {
  const s = Math.sin(ang);
  let c = s > 0.6 ? mix(FIANCO, DORSO, (s - 0.6) / 0.4) : FIANCO;
  c = mix(c, ARANCIO, 0.4);
  const sotto = morbido((-s - 0.25) / 0.45);
  const petto = morbido((k - 0.55) / 0.3);
  c = mix(c, mix(CREMA, BIANCO, petto), sotto * (0.55 + 0.45 * petto));
  return pelo(c);
}

/* ------------------------------------------------------------------ pose */

type Zampa = { anca: THREE.Group; ginocchio: THREE.Group; piede: THREE.Group; dietro: boolean; lato: number };

type Azione = "fiuta" | "guarda" | "siede" | "balzo";
type Sosta = { k: number; azione: Azione; durata: number };

const DURATA: Record<Azione, () => number> = {
  fiuta: () => casuale(2.4, 3.4),
  guarda: () => casuale(3.0, 4.0),
  siede: () => casuale(4.2, 5.5),
  balzo: () => 3.3,
};

/* ------------------------------------------------------------------ volpe */

export class Volpe implements Ospite {
  gruppo = new THREE.Group();
  private volpe = new THREE.Group();
  private corpo = new THREE.Group();
  private collo = new THREE.Group();
  private testa = new THREE.Group();
  private orecchie: THREE.Group[] = [];
  private palpebre: THREE.Mesh[] = [];
  private zampe: Zampa[] = [];
  private coda: THREE.Group[] = [];
  private ombra: THREE.Mesh;
  private stato = {
    prossima: primo(6, 2), inizio: -1, k: 0, s: 0, L: 1,
    da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    soste: [] as Sosta[], sosta: null as Sosta | null, tSosta: 0, vel: 0, velVoluta: 0.9,
    fase: 0, galoppo: false, prima: new THREE.Vector3(), imbardata: 0,
    orecchioT: 0, orecchio: 0, palpebraT: 0,
    sguardo: { yaw: 0, pitch: 0 },
  };
  private tmp = { p: new THREE.Vector3(), q: new THREE.Vector3(), cam: new THREE.Vector3() };

  constructor() {
    const mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.88, metalness: 0,
      sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color("#FFD2A0"),
    });
    const lucido = new THREE.MeshPhysicalMaterial({ color: "#120C09", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 });
    const iride = new THREE.MeshPhysicalMaterial({ color: "#B8741C", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });

    this.volpe.add(this.corpo);

    // tronco
    this.corpo.add(new THREE.Mesh(loft([
      { z: -0.37, y: 0.305, l: 0.045, su: 0.045 },
      { z: -0.32, y: 0.3, l: 0.088, su: 0.07, giu: 0.078 },
      { z: -0.17, y: 0.302, l: 0.098, su: 0.07, giu: 0.07 },
      { z: -0.02, y: 0.305, l: 0.1, su: 0.075, giu: 0.09 },
      { z: 0.14, y: 0.31, l: 0.104, su: 0.085, giu: 0.115 },
      { z: 0.24, y: 0.33, l: 0.085, su: 0.08, giu: 0.1 },
      { z: 0.3, y: 0.36, l: 0.055, su: 0.055, giu: 0.06 },
    ], { radiali: 22, passi: 4, colore: mantello }), mat));

    // collo e testa
    this.collo.position.set(0, 0.365, 0.235);
    this.corpo.add(this.collo);
    this.collo.add(new THREE.Mesh(loft([
      { z: -0.04, y: -0.005, l: 0.07, su: 0.065, giu: 0.08 },
      { z: 0.06, y: 0.03, l: 0.058, su: 0.052, giu: 0.062 },
      { z: 0.13, y: 0.065, l: 0.048, su: 0.045, giu: 0.05 },
    ], {
      radiali: 18, passi: 3,
      colore: (k, ang) => pelo(mix(ARANCIO, BIANCO, morbido((-Math.sin(ang) + 0.1) / 0.5))),
    }), mat));
    this.testa.position.set(0, 0.075, 0.12);
    this.collo.add(this.testa);
    this.testa.add(new THREE.Mesh(loft([
      { z: -0.055, y: 0.0, l: 0.045, su: 0.045, giu: 0.04 },
      { z: 0.0, y: 0.008, l: 0.066, su: 0.056, giu: 0.045 },
      { z: 0.05, y: 0.004, l: 0.062, su: 0.046, giu: 0.04 },
      { z: 0.1, y: -0.008, l: 0.035, su: 0.03, giu: 0.03 },
      { z: 0.15, y: -0.014, l: 0.022, su: 0.022, giu: 0.02 },
      { z: 0.19, y: -0.017, l: 0.013, su: 0.014, giu: 0.012 },
      { z: 0.2, y: -0.016, l: 0.006, su: 0.007, giu: 0.006 },
    ], {
      radiali: 20, passi: 4,
      colore: (k, ang, p) => {
        // guance e labbro bianchi, una macchia scura fra muso e occhio
        const s = Math.sin(ang);
        let c = pelo(ARANCIO);
        if (s < 0.15 && k > 0.2) c = mix(c, BIANCO, morbido((0.15 - s) / 0.35));
        if (k > 0.55 && s < -0.2) c = mix(c, NERO, 0.35);
        if (k > 0.42 && k < 0.62 && Math.abs(s) < 0.35 && Math.abs(p.x) > 0.02) c = mix(c, NERO, 0.3);
        return c;
      },
    }), mat));
    const naso = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), lucido);
    naso.position.set(0, -0.011, 0.197);
    naso.scale.set(1.15, 0.85, 0.9);
    this.testa.add(naso);
    for (const s of [-1, 1]) {
      // occhio a mandorla: iride ambra, pupilla, palpebra che si chiude
      const o = new THREE.Group();
      o.position.set(s * 0.038, 0.022, 0.06);
      o.rotation.set(0, s * 0.55, 0);
      const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 14, 10), iride);
      bulbo.scale.set(1.25, 0.8, 0.6);
      const pupilla = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), lucido);
      pupilla.position.z = 0.006;
      pupilla.scale.set(0.5, 1.6, 0.5);
      const palpebra = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      palpebra.scale.set(1.3, 0.05, 0.75);
      o.add(bulbo, pupilla, palpebra);
      this.testa.add(o);
      this.palpebre.push(palpebra);
      // orecchio: grande, a punta, nero dietro e in cima, chiaro dentro
      const orecchio = new THREE.Group();
      orecchio.position.set(s * 0.034, 0.045, -0.012);
      orecchio.rotation.set(-0.15, 0, s * -0.28);
      const g = new THREE.ConeGeometry(0.03, 0.085, 10, 3, true, Math.PI * 0.1, Math.PI * 1.8);
      g.translate(0, 0.0425, 0);
      g.scale(1, 1, 0.45);
      const col: number[] = [];
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const h = pos.getY(i) / 0.085;
        const dietro = pos.getZ(i) < 0;
        let c = dietro ? mix(ARANCIO, NERO, 0.75) : mix(CREMA, BIANCO, 0.5);
        if (h > 0.72) c = NERO;
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, mat);
      (m.material as THREE.Material).side = THREE.DoubleSide;
      orecchio.add(m);
      this.testa.add(orecchio);
      this.orecchie.push(orecchio);
    }

    // zampe: anteriori dritte, posteriori con il garretto; calze nere
    const segmento = (l: number, r0: number, r1: number, scura: number) =>
      new THREE.Mesh(loft([
        { z: 0, l: r0, su: r0 * 1.15 },
        { z: l * 0.5, l: (r0 + r1) / 2, su: ((r0 + r1) / 2) * 1.1 },
        { z: l, l: r1, su: r1 * 1.05 },
      ], {
        radiali: 10, passi: 2,
        colore: (k) => pelo(mix(ARANCIO, NERO, morbido((k - (1 - scura)) / 0.25) )),
      }).rotateX(Math.PI / 2), mat);
    const attacchi: [number, number, number, boolean][] = [
      [0.062, 0.29, 0.17, false], [-0.062, 0.29, 0.17, false],
      [0.066, 0.29, -0.28, true], [-0.066, 0.29, -0.28, true],
    ];
    attacchi.forEach(([x, y, z, dietro]) => {
      const anca = new THREE.Group();
      anca.position.set(x, y, z);
      const ginocchio = new THREE.Group();
      ginocchio.position.y = -0.145;
      const piede = new THREE.Group();
      piede.position.y = -0.14;
      const sopra = dietro ? segmento(0.145, 0.045, 0.026, 0.1) : segmento(0.145, 0.032, 0.02, 0.45);
      const sotto = dietro ? segmento(0.14, 0.018, 0.014, 0.9) : segmento(0.14, 0.018, 0.015, 1);
      const zampaG = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), mat);
      const g = zampaG.geometry;
      g.scale(0.9, 0.55, 1.4);
      g.translate(0, 0.0, 0.012);
      g.setAttribute("color", new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(0).flatMap(() => [NERO.r, NERO.g, NERO.b]), 3));
      anca.add(sopra, ginocchio);
      ginocchio.add(sotto, piede);
      piede.add(zampaG);
      this.corpo.add(anca);
      this.zampe.push({ anca, ginocchio, piede, dietro, lato: Math.sign(x) });
    });

    // coda: folta, quattro tratti che si passano il movimento, punta bianca
    let padre: THREE.Object3D = this.corpo;
    const raggi = [0.05, 0.068, 0.07, 0.058, 0.03];
    for (let i = 0; i < 4; i++) {
      const v = new THREE.Group();
      v.position.set(0, i === 0 ? 0.31 : 0, i === 0 ? -0.35 : -0.105);
      const r0 = raggi[i], r1 = raggi[i + 1];
      v.add(new THREE.Mesh(loft([
        { z: 0.012, l: r0, su: r0 },
        { z: -0.06, l: (r0 + r1) / 2 * 1.06, su: (r0 + r1) / 2 * 1.06 },
        { z: -0.118, l: r1, su: r1 },
      ], {
        radiali: 14, passi: 2,
        colore: (k, ang) => {
          const t = (i + k) / 4;
          const s = Math.sin(ang);
          let c = mix(FIANCO, DORSO, morbido(s) * 0.7);
          if (s < -0.3) c = mix(c, CREMA, 0.3);
          if (t > 0.86) c = BIANCO;
          else if (t > 0.78) c = mix(c, BIANCO, (t - 0.78) / 0.08);
          return pelo(c, 0.1);
        },
      }), mat));
      padre.add(v);
      this.coda.push(v);
      padre = v;
    }

    this.volpe.scale.setScalar(1.25);
    this.gruppo.add(this.volpe);

    const tx = ombra();
    this.ombra = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0.55 })
    );
    this.ombra.rotation.x = -Math.PI / 2;
    this.gruppo.add(this.ombra);

    this.gruppo.visible = false;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  private punto(k: number, out: THREE.Vector3) {
    const s = this.stato;
    const u = 1 - k;
    return out.set(
      u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x, 0,
      u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z
    );
  }

  private parti(camera: THREE.Camera) {
    const s = this.stato;
    const { avanti, lato } = assi(camera);
    const v = segno();
    const d1 = casuale(2.6, 3.6), d2 = casuale(2.6, 3.8);
    s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -6.4 * v);
    s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 6.4 * v);
    s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-1.4, 1.0)).addScaledVector(lato, casuale(-1.5, 1.5));
    // lunghezza della curva, per avanzare a velocità costante
    let L = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.punto(0, a);
    for (let i = 1; i <= 40; i++) {
      this.punto(i / 40, b);
      L += a.distanceTo(b);
      a.copy(b);
    }
    s.L = L;
    s.s = 0;
    // due soste, con gesti diversi
    const scelte: Azione[] = ["fiuta", "guarda", "siede", "balzo"];
    const prima = scelte[Math.floor(Math.random() * 4)];
    let seconda = scelte[Math.floor(Math.random() * 4)];
    if (seconda === prima) seconda = prima === "guarda" ? "siede" : "guarda";
    s.soste = [
      { k: casuale(0.3, 0.4), azione: prima, durata: DURATA[prima]() },
      { k: casuale(0.56, 0.66), azione: seconda, durata: DURATA[seconda]() },
    ];
    s.sosta = null;
    s.galoppo = Math.random() < 0.45;
    s.velVoluta = casuale(0.8, 1.0);
    s.vel = s.velVoluta;
    this.punto(0, s.prima);
    s.imbardata = Math.atan2(s.a.x - s.da.x, s.a.z - s.da.z);
  }

  aggiorna(t: number, dt: number, camera: THREE.Camera) {
    const s = this.stato;
    if (s.inizio < 0) {
      if (t < s.prossima) return;
      this.parti(camera);
      s.inizio = t;
      this.gruppo.visible = true;
    }

    // soste
    let w = 0; // peso del gesto
    let e = 0; // tempo dentro il gesto
    if (!s.sosta && s.soste.length && s.s / s.L >= s.soste[0].k) {
      s.sosta = s.soste.shift() ?? null;
      s.tSosta = t;
    }
    if (s.sosta) {
      e = t - s.tSosta;
      if (e >= s.sosta.durata) {
        s.sosta = null;
      } else {
        w = Math.min(fra(e, 0, 0.45), 1 - fra(e, s.sosta.durata - 0.5, s.sosta.durata));
      }
    }
    const azione = s.sosta?.azione;

    // velocità: trotto, ferma nei gesti, galoppo in uscita
    const kk = s.s / s.L;
    const fugge = s.galoppo && kk > 0.74;
    let voluta = s.sosta ? 0 : fugge ? 2.4 : s.velVoluta;
    // il balzo porta avanti da sé
    let spinta = 0;
    let quota = 0;
    let beccheggio = 0;
    if (azione === "balzo") {
      voluta = 0;
      const salto = fra(e, 1.25, 2.0);
      if (e > 1.25 && e < 2.0) spinta = 1.25 / 0.75;
      quota = Math.sin(salto * Math.PI) * 0.42;
      beccheggio = e < 1.25 ? 0 : e < 2.0 ? -0.55 + salto * 1.5 : (1 - fra(e, 2.0, 2.4)) * 0.6;
    }
    s.vel += (voluta - s.vel) * Math.min(1, dt * (s.sosta ? 5 : 2.5));
    const passo = (s.vel + spinta) * dt;
    s.s = Math.min(s.L, s.s + passo);
    const { p, q } = this.tmp;
    this.punto(s.s / s.L, p);
    this.punto(Math.min(1, s.s / s.L + 0.01), q);
    const imb = Math.atan2(q.x - p.x, q.z - p.z);
    s.imbardata += ((imb - s.imbardata + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
    this.gruppo.position.set(p.x, PELO_ACQUA, p.z);
    this.volpe.rotation.y = s.imbardata;

    // andatura: trotto a coppie diagonali, galoppo a coppie davanti/dietro
    const vel = s.vel;
    const ampiezza = fugge ? 0.72 : 0.4;
    const freq = fugge ? vel * 1.25 : vel * 2.3;
    s.fase = (s.fase + dt * freq) % 1;
    const andatura = Math.min(1, vel / 0.5);
    const sfasi = fugge ? [0, 0.1, 0.5, 0.6] : [0, 0.5, 0.5, 0];
    const gambe = this.zampe.map((z, i) => {
      const ph = (s.fase + sfasi[i]) % 1;
      let a: number, piega: number;
      if (ph < 0.55) {
        a = -ampiezza + (ph / 0.55) * ampiezza * 2;
        piega = 0;
      } else {
        const r = (ph - 0.55) / 0.45;
        a = ampiezza - morbido(r) * ampiezza * 2;
        piega = Math.sin(r * Math.PI) * (z.dietro ? 0.9 : 1.2);
      }
      return { a: a * andatura, piega: piega * andatura };
    });
    const sobbalzo = Math.abs(Math.sin(s.fase * Math.PI * 2)) * 0.012 * andatura;
    const ondeggio = fugge ? Math.sin(s.fase * Math.PI * 2) * 0.1 * andatura : 0;

    // posa del gesto
    let corpoY = sobbalzo + quota, corpoX = ondeggio + beccheggio, corpoZ = 0;
    let colloX = 0.15, colloY = 0, testaX = -0.15, testaY = 0, testaZ = 0;
    let codaX = 0, codaY = 0, codaSu = 0;
    let orecchieAvanti = 0;
    const camLoc = this.volpe.worldToLocal(this.tmp.cam.copy(camera.position));
    const yawCam = THREE.MathUtils.clamp(Math.atan2(camLoc.x, camLoc.z), -1.5, 1.5);
    const pitchCam = THREE.MathUtils.clamp(-Math.atan2(camLoc.y - 0.5, Math.hypot(camLoc.x, camLoc.z)), -0.8, 0.3);
    const sedere = { su: 0, giu: 0 };
    if (azione === "fiuta") {
      colloX += w * 0.85;
      testaX += w * (0.45 + Math.sin(t * 17) * 0.04);
      testaY += w * Math.sin(e * 1.3) * 0.25;
      corpoY -= w * 0.015;
      codaSu -= w * 0.1;
    } else if (azione === "guarda") {
      colloY += w * yawCam * 0.55;
      testaY += w * yawCam * 0.45;
      colloX += w * (pitchCam * 0.5 - 0.25);
      testaX += w * pitchCam * 0.5;
      // a metà inclina la testa, come per capire
      testaZ += w * fra(e, 1.2, 1.6) * (1 - fra(e, 2.4, 2.8)) * 0.32;
      orecchieAvanti = w;
      codaY += w * Math.sin(t * 2.2) * 0.25;
    } else if (azione === "siede") {
      corpoX -= w * 0.5;
      corpoY -= w * 0.075;
      corpoZ -= w * 0.05;
      sedere.su = w;
      colloX -= w * 0.25;
      colloY += w * Math.sin(e * 0.9) * 0.6;
      testaY += w * Math.sin(e * 0.9 + 0.4) * 0.3;
      codaY += w * 0.55;
      codaX += w * 0.45;
    } else if (azione === "balzo") {
      // si acquatta e punta, salta, atterra di muso, si scrolla
      const punta = fra(e, 0, 0.5) * (1 - fra(e, 1.2, 1.3));
      corpoY -= punta * 0.05;
      colloX += punta * 0.55 + (e > 2.0 ? (1 - fra(e, 2.0, 2.6)) * 0.4 : 0);
      testaX += punta * 0.3;
      orecchieAvanti = Math.max(punta, fra(e, 2.0, 2.2) * (1 - fra(e, 2.6, 2.8)));
      codaSu += punta * 0.4 + (e > 1.25 && e < 2.0 ? 0.6 : 0);
      if (e > 2.6 && e < 3.2) corpoZ += Math.sin((e - 2.6) * 38) * 0.35 * (1 - fra(e, 2.6, 3.2));
    }
    this.corpo.position.y += (corpoY - this.corpo.position.y) * Math.min(1, dt * 12);
    this.corpo.rotation.x = corpoX;
    this.corpo.rotation.z = corpoZ;
    // sedendosi il bacino scende e arretra, lo sterno resta su
    this.corpo.position.z = -sedere.su * 0.06;
    const morb = Math.min(1, dt * 6);
    this.collo.rotation.x += (colloX - this.collo.rotation.x) * morb;
    this.collo.rotation.y += (colloY - this.collo.rotation.y) * morb;
    this.testa.rotation.x += (testaX - this.testa.rotation.x) * morb;
    this.testa.rotation.y += (testaY - this.testa.rotation.y) * morb;
    this.testa.rotation.z += (testaZ - this.testa.rotation.z) * morb;

    // zampe
    this.zampe.forEach((z, i) => {
      const g = gambe[i];
      let a = g.a, b = g.piega;
      if (z.dietro) {
        a += -0.32;
        b += 0.6;
      } else {
        a += 0.06;
        b += -0.08;
      }
      // seduta: posteriori ripiegate a terra, anteriori dritte sotto il petto
      if (sedere.su > 0) {
        if (z.dietro) {
          a = THREE.MathUtils.lerp(a, -1.05, sedere.su);
          b = THREE.MathUtils.lerp(b, 2.3, sedere.su);
        } else {
          a = THREE.MathUtils.lerp(a, 0, sedere.su);
          b = THREE.MathUtils.lerp(b, 0, sedere.su);
        }
      }
      // nel balzo: anteriori tese in avanti, posteriori allungate indietro
      if (azione === "balzo" && e > 1.2 && e < 2.05) {
        const k = fra(e, 1.2, 1.4);
        a = THREE.MathUtils.lerp(a, z.dietro ? 0.9 : -0.9, k);
        b = THREE.MathUtils.lerp(b, z.dietro ? 0.2 : 0.3, k);
      }
      z.anca.rotation.x = a - corpoX * (z.dietro ? 0.2 : 1);
      z.ginocchio.rotation.x = b;
      z.piede.rotation.x = -(a + b) * 0.7;
    });

    // coda: segue il moto, ondeggia, si stende nel galoppo
    this.coda.forEach((c, i) => {
      // positivo alza la coda, negativo la lascia pendere
      const base = i === 0 ? -0.55 + codaSu + (fugge ? 0.38 : 0) : -0.05 + codaSu * 0.2;
      c.rotation.x = base + Math.sin(t * 3 - i * 0.8) * 0.04 * andatura - codaX * (i === 0 ? 0.3 : 0.4);
      c.rotation.y = codaY * (i === 0 ? 0.4 : 0.6) + Math.sin(s.fase * Math.PI * 2 - i * 0.9) * 0.12 * andatura;
    });

    // orecchie: dritte e girate avanti quando ascolta; ogni tanto una scatta
    if (t > s.orecchioT) {
      s.orecchioT = t + casuale(1.2, 3);
      s.orecchio = Math.random() < 0.5 ? 0 : 1;
    }
    const scatto = Math.max(0, 1 - (t - (s.orecchioT - 1.2)) * 4);
    this.orecchie.forEach((o, i) => {
      const lato = i === 0 ? -1 : 1;
      o.rotation.y = lato * (0.15 - orecchieAvanti * 0.15) + (i === s.orecchio ? scatto * 0.6 * lato : 0);
      o.rotation.x = -0.15 - orecchieAvanti * 0.15 + (fugge ? 0.6 : 0);
    });
    // palpebre: un battito ogni tanto
    if (t > s.palpebraT) s.palpebraT = t + casuale(2, 5);
    const chiude = Math.max(0, 1 - Math.abs(t - (s.palpebraT - 0.08)) / 0.08);
    this.palpebre.forEach((pp) => pp.scale.set(1.3, 0.05 + chiude * 0.9, 0.75));

    // ombra: più piccola e chiara quando salta
    this.ombra.position.set(0, 0.004, 0);
    this.ombra.rotation.z = s.imbardata;
    const so = 1 - quota * 1.2;
    this.ombra.scale.set(0.42 * so, 0.95 * so, 1);
    (this.ombra.material as THREE.MeshBasicMaterial).opacity = 0.55 * so;

    if (s.s >= s.L) {
      s.inizio = -1;
      s.prossima = t + attesa(50, 90);
      this.gruppo.visible = false;
    }
  }

  libera() {
    liberaTutto(this.gruppo);
  }
}
