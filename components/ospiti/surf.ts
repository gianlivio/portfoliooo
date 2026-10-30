import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { type Ospite, alone, liberaTutto } from "./comuni";
import { FRAG, LivioRasta, type PosaLibera, VERT } from "./livioRasta";

/**
 * Sul marmo, in piccolo, un'onda olografica e Livio coi rasta che la surfa. L'onda si stampa dal basso,
 * comincia a rompere da un capo e il frangente corre lungo la cresta; lui la prende davanti al punto di rottura
 * e la percorre tutta, giù nella curva di fondo e su verso il labbro, accovacciato nel tubo dove il labbro
 * gli si chiude sopra, le braccia aperte per l'equilibrio, i rasta che volano dietro. In fondo esce dall'onda
 * scavalcandone la cresta, l'onda si chiude in schiuma e tutto si cancella dall'alto. Poi, dopo un po', di nuovo.
 * Di giorno la figura è ambra e l'onda petrolio (sul marmo chiaro l'azzurro sparisce), di notte azzurro tutti e due.
 * Coordinate dell'onda: x lungo la cresta, y in alto, −z il davanti dell'onda (verso chi guarda).
 */

const H = 2.0; // l'altezza dell'onda aperta, in metri della figura
const X0 = -3.6, X1 = 3.6; // la cresta
const NX = 46, NU = 18; // le divisioni della superficie
const CORSA = 9; // quanto dura la cavalcata, in secondi
const SCALA = 0.55;

/** La faccia dell'onda alla quota y: quanto sta avanti (z, negativo verso chi guarda) e la pendenza. */
function faccia(y: number, h: number) {
  const u = Math.min(1, Math.max(0, y / h));
  const z = -1.25 * Math.pow(1 - u, 1.6);
  const dz = (1.25 * 1.6 * Math.pow(1 - u, 0.6)) / h; // dz/dy
  return { z, pendenza: Math.atan2(1, dz) }; // angolo della faccia sull'orizzontale
}

export class Surf implements Ospite {
  gruppo = new THREE.Group();
  private onda = new THREE.Group();
  private surfista: LivioRasta;
  private matOnda: THREE.ShaderMaterial;
  private faccia: THREE.BufferGeometry;
  private labbro: THREE.BufferGeometry;
  private schiuma: THREE.Points;
  private posSchiuma: Float32Array;
  private seme: Float32Array;
  private texture: THREE.Texture[] = [];
  private tempo = 0;
  private stato: "spento" | "stampa" | "corre" | "chiude" | "cancella" = "spento";
  private finoA = 4;
  private q = new THREE.Quaternion();

  constructor(notte: boolean) {
    // dove stava il tempio: sul pavimento, di lato al cancello dell'uliveto
    const a = ANGOLO_ZONA + Math.PI - 0.9;
    this.gruppo.position.set(Math.sin(a) * 3.9, PELO_ACQUA, -Math.cos(a) * 3.9);
    this.gruppo.rotation.y = Math.PI - a; // il davanti dell'onda (−z locale) verso chi guarda
    this.gruppo.scale.setScalar(SCALA);
    this.matOnda = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uT: { value: 0 }, uVis: { value: 0.75 }, uBase: { value: 0 }, uTaglio: { value: 0 },
        uColore: { value: new THREE.Color(notte ? "#3FB8FF" : "#14788F") },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // la faccia e il dorso, una superficie sola; il labbro, una seconda che parte dalla cresta e si arriccia avanti
    const griglia = (nu: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((NX + 1) * (nu + 1) * 3), 3));
      g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array((NX + 1) * (nu + 1) * 3), 3));
      const idx: number[] = [];
      for (let i = 0; i < NX; i++) for (let j = 0; j < nu; j++) {
        const a0 = i * (nu + 1) + j, a1 = (i + 1) * (nu + 1) + j;
        idx.push(a0, a1, a0 + 1, a1, a1 + 1, a0 + 1);
      }
      g.setIndex(idx);
      return g;
    };
    this.faccia = griglia(NU);
    this.labbro = griglia(8);
    for (const g of [this.faccia, this.labbro]) {
      const m = new THREE.Mesh(g, this.matOnda);
      m.frustumCulled = false;
      m.renderOrder = 8;
      this.onda.add(m);
    }
    // la schiuma: punti di luce sul labbro che rompe e sull'acqua bianca dietro
    const N = 420;
    this.posSchiuma = new Float32Array(N * 3);
    this.seme = new Float32Array(N).map(() => Math.random());
    const gs = new THREE.BufferGeometry();
    gs.setAttribute("position", new THREE.BufferAttribute(this.posSchiuma, 3));
    const txs = alone("#FFFFFF");
    this.texture.push(txs);
    this.schiuma = new THREE.Points(gs, new THREE.PointsMaterial({
      map: txs, color: notte ? "#BFEAFF" : "#2A9AB3", size: 0.16, transparent: true, opacity: 0, depthWrite: false,
      blending: notte ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    }));
    this.schiuma.frustumCulled = false;
    this.schiuma.renderOrder = 9;
    this.onda.add(this.schiuma);
    this.gruppo.add(this.onda);

    const lampo = alone("#FFFFFF");
    this.texture.push(lampo);
    this.surfista = new LivioRasta(lampo, "surf");
    this.surfista.setNotte(notte);
    this.gruppo.add(this.surfista.gruppo);
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
    this.gruppo.visible = false;
  }

  /** Dove rompe l'onda, lungo la cresta, al tempo r della corsa. */
  private rottura(r: number) {
    return X0 - 0.6 + ((X1 - X0) * Math.min(1, r / CORSA));
  }

  /** L'onda alla corsa r: la superficie (faccia e dorso), il labbro, la schiuma. */
  private disegnaOnda(r: number, t: number, chiusa: number) {
    const rompe = this.rottura(r);
    const pf = this.faccia.attributes.position as THREE.BufferAttribute;
    const pl = this.labbro.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= NX; i++) {
      const x = X0 + ((X1 - X0) * i) / NX;
      const d = x - rompe;
      // dietro la rottura l'acqua bianca, bassa; davanti l'onda aperta, che cala verso la spalla in fondo
      const spalla = 1 - 0.35 * Math.max(0, (x - 1.2) / (X1 - 1.2));
      const aperta = H * spalla * (1 - 0.45 * chiusa);
      const bianca = 0.55 + 0.12 * Math.sin(x * 3.1 + t * 2.3);
      const k = Math.min(1, Math.max(0, (d + 0.5) / 0.9));
      const h = bianca + (aperta - bianca) * k * k * (3 - 2 * k);
      // il tubo: il labbro si arriccia al massimo appena davanti alla rottura, poi si distende sulla spalla
      const curl = d < 0 ? 0 : Math.max(0, 1 - Math.abs(d - 0.6) / 1.6) * (1 - chiusa);
      const ondula = 0.04 * Math.sin(x * 2.2 - t * 1.7);
      for (let j = 0; j <= NU; j++) {
        // da davanti (j = 0, la base della faccia) alla cresta (metà) e giù per il dorso fino alla base dietro
        const u = j / NU;
        let y: number, z: number;
        if (u <= 0.55) {
          const v = u / 0.55;
          y = h * v;
          z = faccia(y, h).z;
        } else {
          const v = (u - 0.55) / 0.45;
          y = h * (1 - v * v * (3 - 2 * v));
          z = 1.9 * v;
        }
        pf.setXYZ(i * (NU + 1) + j, x, y + ondula * (y / h), z);
      }
      // il labbro: dalla cresta in avanti e in giù, lungo quanto è arricciato
      for (let j = 0; j <= 8; j++) {
        const v = j / 8;
        const ang = v * Math.PI * 0.85 * (0.4 + curl);
        const r0 = 0.55 * (0.25 + curl) * h * 0.5;
        pl.setXYZ(i * 9 + j, x, h + Math.sin(ang) * r0 * 0.6 - (1 - Math.cos(ang)) * r0 * 0.9, -Math.sin(ang) * r0 * 1.4 + ondula);
      }
    }
    pf.needsUpdate = true;
    pl.needsUpdate = true;
    this.faccia.computeVertexNormals();
    this.labbro.computeVertexNormals();
    // la schiuma: metà sul labbro che rompe, metà sull'acqua bianca dietro, che ribolle
    const n = this.seme.length;
    for (let k = 0; k < n; k++) {
      const s = this.seme[k];
      const sopra = k % 2 === 0;
      const x = sopra ? rompe + (s - 0.3) * 1.2 : X0 + (rompe - X0 + 0.3) * s;
      const ribolle = Math.sin(t * (3 + s * 4) + k) * 0.08;
      const y = sopra ? H * (1 - 0.45 * chiusa) * (0.65 + 0.35 * ((s * 7.3) % 1)) : 0.35 + ((s * 13.7) % 1) * 0.5 + ribolle;
      const z = sopra ? -0.35 - ((s * 3.1) % 1) * 0.5 : -0.9 + ((s * 5.7) % 1) * 1.6;
      this.posSchiuma[k * 3] = Math.min(X1, x);
      this.posSchiuma[k * 3 + 1] = y;
      this.posSchiuma[k * 3 + 2] = z;
    }
    (this.schiuma.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Il surfista alla corsa r: davanti alla rottura, giù e su per la faccia, accovacciato nel tubo. */
  private posaSurf(r: number, uscita: number) {
    const rompe = this.rottura(r);
    // la curva di fondo e la risalita, ogni 2.4 s; a metà corsa si infila nel tubo, più basso e raccolto
    const f = (r / 2.4) * Math.PI * 2;
    const tubo = Math.max(0, 1 - Math.abs(r - CORSA * 0.55) / 1.4);
    let y = H * (0.42 + 0.26 * Math.sin(f) - 0.12 * tubo);
    const x = Math.min(X1 - 0.6, rompe + 1.0 + 0.25 * Math.sin(f * 0.5));
    let z = faccia(y, H).z;
    let pendenza = faccia(y, H).pendenza;
    // l'uscita: sale sulla cresta e la scavalca, dietro
    if (uscita > 0) {
      y = y + (H * 1.05 - y) * Math.min(1, uscita * 1.6);
      z = z + (0.9 - z) * uscita;
      pendenza = pendenza * (1 - uscita);
    }
    const sale = Math.cos(f); // positivo quando sale verso il labbro
    const dove = new THREE.Vector3(x, y, z - 0.05);
    // girato verso chi guarda (di schiena all'onda), la tavola lungo la cresta, inclinata come la faccia;
    // la punta va su e giù con la curva
    const verso = new THREE.Quaternion()
      // la tavola segue la faccia, il corpo ci sta sopra un poco piegato verso l'onda: metà dell'inclinazione
      .setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pendenza * 0.45)
      .multiply(this.q.setFromEuler(new THREE.Euler(0, Math.PI, -0.18 * sale, "YXZ")));
    const accovacciato = 0.08 * tubo + 0.05 * Math.max(0, -sale);
    const P: PosaLibera = {
      // le braccia aperte: quella davanti (la sua destra, verso dove va) avanti e bassa, l'altra indietro e alta
      s: new THREE.Vector3(0.5, 1.05 + 0.1 * sale - accovacciato, 0.18 + 0.1 * tubo),
      d: new THREE.Vector3(-0.62, 0.95 - 0.08 * sale - accovacciato, 0.12),
      ps: new THREE.Vector3(0.28, 0, 0.02),
      pd: new THREE.Vector3(-0.3, 0, 0.0),
      h: 0.8 - accovacciato - 0.04 * Math.max(0, -sale),
      yaw: -0.38 - 0.1 * sale,
      av: 0.05 + 0.06 * tubo,
      giro: 0, lato: 0, nod: -0.05,
      bs: false, bd: false, gs: false, gd: false, ms: "palmo", md: "palmo", colpo: null,
    };
    return { P, dove, verso };
  }

  aggiorna(t: number, dt: number) {
    this.tempo += dt;
    if (this.stato === "spento") {
      this.gruppo.visible = false;
      if (this.tempo < this.finoA) return;
      this.stato = "stampa";
      this.tempo = 0;
    }
    this.gruppo.visible = true;
    let taglio = 3, r = 0, chiusa = 0, uscita = 0, vis = 1;
    if (this.stato === "stampa") {
      taglio = (this.tempo / 1.3) * 3;
      if (this.tempo >= 1.3) [this.stato, this.tempo] = ["corre", 0];
    } else if (this.stato === "corre") {
      r = this.tempo;
      if (this.tempo >= CORSA) [this.stato, this.tempo] = ["chiude", 0];
    } else if (this.stato === "chiude") {
      r = CORSA;
      chiusa = Math.min(1, this.tempo / 1.4);
      uscita = Math.min(1, this.tempo / 1.0);
      if (this.tempo >= 1.4) [this.stato, this.tempo] = ["cancella", 0];
    } else if (this.stato === "cancella") {
      r = CORSA;
      chiusa = 1;
      uscita = 1;
      taglio = 3 - (this.tempo / 1.3) * 3;
      vis = 1 - this.tempo / 1.3;
      if (this.tempo >= 1.3) {
        this.stato = "spento";
        this.tempo = 0;
        this.finoA = 20 + Math.random() * 25;
        this.gruppo.visible = false;
        return;
      }
    }
    this.gruppo.updateWorldMatrix(true, false);
    const base = new THREE.Vector3().setFromMatrixPosition(this.gruppo.matrixWorld).y;
    const u = this.matOnda.uniforms;
    u.uT.value = t;
    u.uBase.value = base;
    u.uTaglio.value = taglio * SCALA;
    (this.schiuma.material as THREE.PointsMaterial).opacity = Math.min(1, taglio / 3) * vis * 0.8;
    this.disegnaOnda(r, t, chiusa);
    const { P, dove, verso } = this.posaSurf(r, uscita);
    this.surfista.guida(P, dove, verso, dt, t, Math.max(0, vis), taglio * SCALA);
  }

  libera() {
    this.surfista.libera();
    this.matOnda.dispose();
    liberaTutto(this.gruppo, this.texture);
  }
}
