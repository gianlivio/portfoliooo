import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { type Ospite, alone, liberaTutto, primo } from "./comuni";
import { LivioRasta, type PosaLibera } from "./livioRasta";

/**
 * Sul marmo, in piccolo, un'onda olografica e Livio coi rasta che la surfa. L'onda si stampa dal basso,
 * comincia a rompere da un capo e il frangente corre lungo la cresta: dove rompe il labbro si lancia avanti e
 * ricade, e fa il tubo; più in là l'onda è ancora una parete liscia che cala verso la spalla. Lui sta appena
 * davanti al punto di rottura, giù nella curva di fondo e su verso il labbro, accovacciato quando il tubo gli si
 * chiude sopra, le braccia aperte, i rasta dietro. In fondo scavalca la cresta, l'onda si chiude in schiuma e
 * tutto si cancella dall'alto. Poi, dopo un po', di nuovo.
 * Si guarda di tre quarti dal lato della spalla: così si vede dentro il tubo, come nelle fotografie di surf.
 * Di giorno la figura è ambra e l'onda petrolio (sul marmo chiaro l'azzurro sparisce), di notte azzurro tutti e due.
 * Coordinate dell'onda: x lungo la cresta (si corre verso +x), y in alto, −z il davanti dell'onda.
 */

const H = 2.3; // l'altezza dell'onda aperta, in metri della figura: il tubo è più alto di lui
const X0 = -3.6, X1 = 3.6; // la cresta
const CORSA = 9; // quanto dura la cavalcata, in secondi
const SCALA = 0.2;

/*
 * La sezione dell'onda, da dietro (+z) a davanti (−z): il dorso, la cresta, il labbro di fuori fino alla punta,
 * il labbro di dentro, la gola, la faccia, il cavo, l'acqua piatta davanti. z in unità di H, y in unità
 * dell'altezza locale. Due sezioni con gli stessi punti: la spalla (il labbro ancora chiuso nella faccia) e il
 * tubo (il labbro lanciato avanti fino quasi al pelo dell'acqua); in mezzo si mescolano.
 */
const SPALLA: [number, number][] = [
  [2.2, 0], [1.3, 0], [0.85, 0.22], [0.45, 0.66], [0.15, 0.94], [0.0, 1.0], [-0.08, 0.98], [-0.13, 0.95],
  [-0.16, 0.92], [-0.18, 0.89], [-0.2, 0.86], [-0.23, 0.8], [-0.27, 0.7], [-0.36, 0.5], [-0.55, 0.25], [-1.0, 0.04], [-2.6, 0],
];
const TUBO: [number, number][] = [
  [2.2, 0], [1.3, 0], [0.8, 0.3], [0.4, 0.85], [0.05, 1.12], [-0.35, 1.18], [-0.75, 1.02], [-1.02, 0.66],
  [-1.1, 0.22], [-0.98, 0.42], [-0.72, 0.8], [-0.38, 0.96], [-0.08, 0.86], [-0.02, 0.5], [-0.2, 0.14], [-1.0, 0], [-2.6, 0],
];
const NC = SPALLA.length;
const FACCIA_DA = 12; // dalla gola in giù: la faccia, dove sta il surfista
const FACCIA_A = 15;
const PER = 3; // campioni per tratto di sezione
const NU = (NC - 1) * PER; // righe della superficie
const NX = 56;

const VERT = /* glsl */ `
varying vec3 vNw;
varying vec3 vV;
varying vec3 vW;
varying vec3 vL;
void main(){
  vL = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vNw = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform float uT;
uniform float uVis;
uniform float uBase;
uniform float uTaglio;
uniform vec3 uColore;
varying vec3 vNw;
varying vec3 vV;
varying vec3 vW;
varying vec3 vL;
void main(){
  float h = vW.y - uBase;
  if (h > uTaglio) discard;
  vec3 n = normalize(vNw);
  float bordo = smoothstep(0.02, 0.0, uTaglio - h) * step(uTaglio, 0.52);
  float fres = pow(1.0 - abs(dot(n, normalize(vV))), 1.5);
  // l'acqua piatta sfuma ai bordi: un ritaglio di mare, non una lastra
  float sfuma = smoothstep(-3.6, -2.4, vL.x) * smoothstep(3.6, 2.4, vL.x) * smoothstep(-5.6, -3.4, vL.z) * smoothstep(5.0, 3.0, vL.z);
  float alto = clamp(vL.y / 1.6, 0.0, 1.0);
  // i filetti d'acqua che salgono lungo la faccia, e le increspature sul piatto
  float filetti = mix(1.0, 0.8 + 0.2 * step(0.5, fract((vL.y - vL.z) * 3.2 - uT * 1.4)), step(0.06, vL.y));
  float luce = 0.55 + 0.6 * max(dot(n, normalize(vec3(-0.3, 0.8, -0.5))), 0.0);
  float dorso = 1.0 - 0.55 * smoothstep(0.1, 1.2, vL.z);
  float a = (0.1 + 0.25 * step(0.06, vL.y) + 0.5 * alto + 0.3 * fres) * dorso * filetti * sfuma * uVis + bordo * 0.8;
  vec3 c = uColore * luce * (0.75 + 0.6 * fres);
  // il labbro e la cresta si sbiancano
  c = mix(c, vec3(0.92, 0.98, 1.0), smoothstep(1.55, 2.1, vL.y) * 0.5);
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export class Surf implements Ospite {
  gruppo = new THREE.Group();
  private onda = new THREE.Group();
  private surfista: LivioRasta;
  private matOnda: THREE.ShaderMaterial;
  private superficie: THREE.BufferGeometry;
  private schiuma: THREE.Points;
  private posSchiuma: Float32Array;
  private seme: Float32Array;
  private texture: THREE.Texture[] = [];
  private tempo = 0;
  private stato: "spento" | "stampa" | "corre" | "chiude" | "cancella" = "spento";
  private finoA = primo(4, 0.5);
  private q = new THREE.Quaternion();
  /** la sezione corrente di una colonna, prima di campionarla */
  private sez: [number, number][] = SPALLA.map(() => [0, 0]);

  constructor(notte: boolean) {
    // dove stava il tempio: sul pavimento, di lato al cancello dell'uliveto
    const a = ANGOLO_ZONA + Math.PI - 0.9;
    this.gruppo.position.set(Math.sin(a) * 3.6, PELO_ACQUA, -Math.cos(a) * 3.6);
    // di tre quarti, dal lato della spalla: chi guarda vede la faccia di sbieco e dentro il tubo
    this.gruppo.rotation.y = Math.PI - a + 0.8;
    this.gruppo.scale.setScalar(SCALA);
    this.matOnda = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uT: { value: 0 }, uVis: { value: 1 }, uBase: { value: 0 }, uTaglio: { value: 0 },
        uColore: { value: new THREE.Color(notte ? "#3FB8FF" : "#0F6A82") },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    // una superficie sola: righe lungo la sezione, colonne lungo la cresta
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((NX + 1) * (NU + 1) * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array((NX + 1) * (NU + 1) * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NU; j++) {
      const a0 = i * (NU + 1) + j, a1 = (i + 1) * (NU + 1) + j;
      idx.push(a0, a1, a0 + 1, a1, a1 + 1, a0 + 1);
    }
    g.setIndex(idx);
    this.superficie = g;
    const m = new THREE.Mesh(g, this.matOnda);
    m.frustumCulled = false;
    m.renderOrder = 8;
    this.onda.add(m);
    // la schiuma: punti sul labbro che ricade e sull'acqua bianca dietro la rottura
    const N = 360;
    this.posSchiuma = new Float32Array(N * 3);
    this.seme = new Float32Array(N).map(() => Math.random());
    const gs = new THREE.BufferGeometry();
    gs.setAttribute("position", new THREE.BufferAttribute(this.posSchiuma, 3));
    const txs = alone("#FFFFFF");
    this.texture.push(txs);
    this.schiuma = new THREE.Points(gs, new THREE.PointsMaterial({
      map: txs, color: notte ? "#CDEFFF" : "#8FD3E0", size: 0.05, transparent: true, opacity: 0, depthWrite: false,
      blending: notte ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    }));
    this.schiuma.frustumCulled = false;
    this.schiuma.renderOrder = 9;
    this.onda.add(this.schiuma);
    this.onda.position.y = 0.06; // appena sopra il marmo, che specchia: niente sfarfallio
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
    return X0 + 0.2 + (X1 - X0 - 1.6) * Math.min(1, r / CORSA);
  }

  /** Alla colonna x: l'altezza e quanto è tubo (0 la spalla liscia, 1 il labbro lanciato). */
  private colonna(x: number, rompe: number, t: number, chiusa: number) {
    const d = x - rompe;
    // dietro la rottura l'acqua bianca, bassa; davanti l'onda aperta, che cala verso la spalla in fondo
    const spalla = 1 - 0.4 * Math.max(0, (x - 0.8) / (X1 - 0.8));
    const aperta = H * spalla * (1 - 0.6 * chiusa);
    const bianca = 0.42 + 0.1 * Math.sin(x * 3.1 + t * 2.3);
    const k = THREE.MathUtils.smoothstep(d, -0.6, 0.5);
    const h = bianca + (aperta - bianca) * k;
    // il tubo: pieno subito davanti alla rottura, si richiude verso la spalla
    const tubo = d < -0.3 ? 0 : THREE.MathUtils.smoothstep(d, -0.3, 0.3) * (1 - THREE.MathUtils.smoothstep(d, 2.4, 4.4)) * (1 - chiusa);
    return { h, tubo };
  }

  /** La sezione alla colonna, mescolando spalla e tubo, in coordinate dell'onda (z, y). */
  private sezione(h: number, tubo: number) {
    for (let c = 0; c < NC; c++) {
      this.sez[c][0] = (SPALLA[c][0] + (TUBO[c][0] - SPALLA[c][0]) * tubo) * H;
      this.sez[c][1] = (SPALLA[c][1] + (TUBO[c][1] - SPALLA[c][1]) * tubo) * h;
    }
    return this.sez;
  }

  /** L'onda alla corsa r: la superficie e la schiuma. */
  private disegnaOnda(r: number, t: number, chiusa: number) {
    const rompe = this.rottura(r);
    const pos = this.superficie.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= NX; i++) {
      const x = X0 + ((X1 - X0) * i) / NX;
      const { h, tubo } = this.colonna(x, rompe, t, chiusa);
      const S = this.sezione(h, tubo);
      const ondula = 0.04 * Math.sin(x * 2.2 - t * 1.7);
      // Catmull-Rom lungo i punti della sezione
      for (let c = 0; c < NC - 1; c++) {
        const p0 = S[Math.max(0, c - 1)], p1 = S[c], p2 = S[c + 1], p3 = S[Math.min(NC - 1, c + 2)];
        for (let s = 0; s < PER; s++) {
          const u = s / PER, u2 = u * u, u3 = u2 * u;
          const cr = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u2 + (-a + 3 * b - 3 * cc + d) * u3);
          const z = cr(p0[0], p1[0], p2[0], p3[0]);
          const y = Math.max(0, cr(p0[1], p1[1], p2[1], p3[1]));
          pos.setXYZ(i * (NU + 1) + c * PER + s, x, y + ondula * Math.min(1, y), z);
        }
      }
      const ultimo = S[NC - 1];
      pos.setXYZ(i * (NU + 1) + NU, x, ultimo[1], ultimo[0]);
    }
    pos.needsUpdate = true;
    this.superficie.computeVertexNormals();
    // la schiuma: metà dove il labbro ricade nel cavo, metà sull'acqua bianca dietro, che ribolle
    const n = this.seme.length;
    for (let k = 0; k < n; k++) {
      const s = this.seme[k];
      const sopra = k % 2 === 0;
      let x: number, y: number, z: number;
      if (sopra) {
        x = rompe - 0.2 + s * 1.0;
        const { h, tubo } = this.colonna(x, rompe, t, chiusa);
        // lungo il labbro, dalla cresta alla punta
        const v = (s * 7.3) % 1;
        z = (-0.1 - v * 1.0 * tubo) * H + Math.sin(t * 5 + k) * 0.02;
        y = h * (1.15 - v * (0.93 * tubo + 0.12)) + Math.sin(t * 4 + k * 1.7) * 0.02;
      } else {
        x = X0 + (rompe - X0 + 0.4) * s;
        y = 0.12 + ((s * 13.7) % 1) * 0.45 + Math.sin(t * (3 + s * 4) + k) * 0.08;
        z = (-1.2 + ((s * 5.7) % 1) * 1.6) * H * 0.6;
      }
      this.posSchiuma[k * 3] = Math.min(X1 - 0.4, x);
      this.posSchiuma[k * 3 + 1] = y;
      this.posSchiuma[k * 3 + 2] = z;
    }
    (this.schiuma.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Sulla faccia, alla colonna x, alla quota relativa v (0 il cavo, 1 la gola): dove sta e quanto è ripida. */
  private sullaFaccia(x: number, v: number, rompe: number, t: number, chiusa: number) {
    const { h, tubo } = this.colonna(x, rompe, t, chiusa);
    const S = this.sezione(h, tubo);
    // la faccia va dalla gola (FACCIA_DA) al cavo (FACCIA_A), con y che scende
    const yv = S[FACCIA_A][1] + (S[FACCIA_DA][1] - S[FACCIA_A][1]) * v;
    for (let c = FACCIA_DA; c < FACCIA_A; c++) {
      const [za, ya] = S[c], [zb, yb] = S[c + 1];
      if (yv <= ya && yv >= yb) {
        const u = ya === yb ? 0 : (ya - yv) / (ya - yb);
        return { y: yv, z: za + (zb - za) * u, pendenza: Math.atan2(ya - yb, Math.abs(zb - za) + 1e-4), h, tubo };
      }
    }
    return { y: yv, z: S[FACCIA_A][0], pendenza: 0.3, h, tubo };
  }

  /** Il surfista alla corsa r: davanti alla rottura, giù e su per la faccia, accovacciato nel tubo. */
  private posaSurf(r: number, t: number, uscita: number) {
    const rompe = this.rottura(r);
    // la curva di fondo e la risalita, ogni 2.4 s; a metà corsa più dentro il tubo, più basso e raccolto
    const f = (r / 2.4) * Math.PI * 2;
    const dentro = Math.max(0, 1 - Math.abs(r - CORSA * 0.5) / 2.2);
    const x = Math.min(X1 - 0.9, rompe + 0.75 - 0.2 * dentro + 0.2 * Math.sin(f * 0.5));
    const v = 0.38 + 0.22 * Math.sin(f) - 0.12 * dentro;
    const F = this.sullaFaccia(x, Math.max(0.12, v), rompe, t, 0);
    let y = F.y, z = F.z, pendenza = F.pendenza;
    // l'uscita: sale sulla cresta e la scavalca, dietro
    if (uscita > 0) {
      const u = Math.min(1, uscita * 1.4);
      y = y + (F.h * 1.02 - y) * u;
      z = z + (0.6 * H - z) * uscita;
      pendenza = pendenza * (1 - uscita);
    }
    const sale = Math.cos(f); // positivo quando sale verso il labbro
    const dove = new THREE.Vector3(x, y, z - 0.04);
    // girato verso il largo (di schiena all'onda), la tavola lungo la cresta, inclinata come la faccia
    const verso = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.min(1.0, pendenza) * 0.55)
      .multiply(this.q.setFromEuler(new THREE.Euler(0, Math.PI, -0.18 * sale, "YXZ")));
    const accovacciato = 0.1 * Math.max(dentro, F.tubo * 0.6) + 0.05 * Math.max(0, -sale);
    const P: PosaLibera = {
      // le braccia aperte: quella verso dove va avanti e bassa, l'altra indietro e alta
      s: new THREE.Vector3(0.5, 1.02 + 0.1 * sale - accovacciato, 0.18 + 0.1 * dentro),
      d: new THREE.Vector3(-0.6, 0.95 - 0.08 * sale - accovacciato, 0.12),
      ps: new THREE.Vector3(0.26, 0, 0.02),
      pd: new THREE.Vector3(-0.28, 0, 0.0),
      h: 0.8 - accovacciato - 0.04 * Math.max(0, -sale),
      yaw: -0.38 - 0.1 * sale,
      av: 0.05 + 0.08 * dentro,
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
    const ALTO = 2.7; // poco sopra l'onda più alta, in unità dell'onda
    let taglio = ALTO, r = 0, chiusa = 0, uscita = 0, vis = 1;
    if (this.stato === "stampa") {
      taglio = (this.tempo / 1.3) * ALTO;
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
      taglio = ALTO - (this.tempo / 1.3) * ALTO;
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
    u.uVis.value = Math.max(0, vis);
    u.uBase.value = base;
    u.uTaglio.value = taglio * SCALA;
    (this.schiuma.material as THREE.PointsMaterial).opacity = Math.min(1, taglio / ALTO) * vis * 0.7;
    this.disegnaOnda(r, t, chiusa);
    const { P, dove, verso } = this.posaSurf(r, t, uscita);
    // la figura è alta quasi quanto l'onda: il suo taglio arriva più su
    this.surfista.guida(P, dove, verso, dt, t, Math.max(0, vis), taglio * SCALA * 1.4);
  }

  libera() {
    this.surfista.libera();
    this.matOnda.dispose();
    liberaTutto(this.gruppo, this.texture);
  }
}
