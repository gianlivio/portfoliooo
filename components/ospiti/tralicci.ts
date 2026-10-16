import * as THREE from "three";
import { PELO_ACQUA, mondo } from "../condivisi";
import { type Ospite, alone, liberaTutto } from "./comuni";

/**
 * Di notte, sullo sfondo, un elettrodotto che si allontana come un viale: tralicci a traliccio d'acciaio con le mensole,
 * i cavi che pendono da uno all'altro, le luci rosse d'ostacolo in cima che lampeggiano insieme:
 * "SCRIVIMI" in codice Morse, in ciclo.
 * Il nostro tempo, fermo all'orizzonte, mentre davanti passano navi antiche.
 */

const ALTO = 10;

/** La durata di un punto, a loop spento: abbastanza lento da leggerlo. */
const PUNTO = 0.24;

/**
 * "SCRIVIMI" in Morse, unità per unità (1 = acceso): punto = 1, linea = 3, pausa fra segni = 1,
 * fra lettere = 3, in fondo al messaggio 7 prima di ricominciare.
 */
const MORSE = (() => {
  const codice: Record<string, string> = { S: "...", C: "-.-.", R: ".-.", I: "..", V: "...-", M: "--" };
  const u: number[] = [];
  "SCRIVIMI".split("").forEach((l, i) => {
    if (i) u.push(0, 0, 0);
    codice[l].split("").forEach((s, k) => {
      if (k) u.push(0);
      u.push(...(s === "." ? [1] : [1, 1, 1]));
    });
  });
  u.push(0, 0, 0, 0, 0, 0, 0);
  return u;
})();

/** Un traliccio come elenco di segmenti: gambe, crociere a X, mensole, cuspide. Le mensole sono lungo x. */
function traliccio(linee: number[], o: THREE.Vector3, asse: THREE.Vector3, normale: THREE.Vector3) {
  const P = (x: number, y: number, z: number) =>
    o.clone().addScaledVector(normale, x).addScaledVector(asse, z).setY(PELO_ACQUA + y);
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => linee.push(a.x, a.y, a.z, b.x, b.y, b.z);
  // il fusto: quattro gambe che si stringono salendo
  const livelli = [0, 1.6, 3.1, 4.5, 5.8, 6.6, 7.4, 8.2, ALTO];
  const largo = (y: number) => (y < 5.8 ? 0.85 - (y / 5.8) * 0.55 : 0.3 - ((y - 5.8) / (ALTO - 5.8)) * 0.18);
  const angoli = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < livelli.length - 1; i++) {
    const y0 = livelli[i], y1 = livelli[i + 1];
    const w0 = largo(y0), w1 = largo(y1);
    for (let k = 0; k < 4; k++) {
      const [ax, az] = angoli[k];
      const [bx, bz] = angoli[(k + 1) % 4];
      seg(P(ax * w0, y0, az * w0), P(ax * w1, y1, az * w1));
      // croce di Sant'Andrea su ogni faccia
      seg(P(ax * w0, y0, az * w0), P(bx * w1, y1, bz * w1));
      seg(P(bx * w0, y0, bz * w0), P(ax * w1, y1, az * w1));
      seg(P(ax * w1, y1, az * w1), P(bx * w1, y1, bz * w1));
    }
  }
  // mensole: due ordini, a triangolo, con gli isolatori che pendono
  const attacchi: THREE.Vector3[] = [];
  for (const [y, l] of [[5.8, 2.6], [7.4, 2.0]] as [number, number][]) {
    for (const s of [-1, 1]) {
      const w = largo(y);
      const punta = P(s * l, y, 0);
      seg(P(s * w, y, -w), punta);
      seg(P(s * w, y, w), punta);
      seg(P(s * w, y + 0.6, 0), punta);
      seg(P(s * w, y, 0), P(s * (w + (l - w) / 2), y + 0.3, 0));
      const isolatore = P(s * (l - 0.1), y - 0.7, 0);
      seg(P(s * (l - 0.1), y, 0), isolatore);
      attacchi.push(isolatore);
    }
  }
  // cuspide con il cavo di guardia
  const cima = P(0, ALTO + 0.5, 0);
  for (const [ax, az] of angoli) seg(P(ax * largo(ALTO), ALTO, az * largo(ALTO)), cima);
  attacchi.push(cima);
  return { attacchi, cima };
}

export class Tralicci implements Ospite {
  gruppo = new THREE.Group();
  private luci: THREE.Sprite[] = [];
  private texture: THREE.Texture[] = [];
  private acceso = 0;

  constructor() {
    const linee: number[] = [];
    const cavi: number[] = [];
    const tx = alone("#FF3020");
    this.texture.push(tx);
    // un solo elettrodotto, come un viale: il primo traliccio vicino e alto,
    // gli altri sempre più lontani, e quindi sempre più bassi, fino all'orizzonte
    const tracciati: { azimut: number; distanza: number; n: number; passo: number; deviazione: number }[] = [
      { azimut: -0.42, distanza: 15, n: 5, passo: 10, deviazione: 0.55 },
    ];
    tracciati.forEach(({ azimut, distanza, n, passo, deviazione }) => {
      const radiale = new THREE.Vector3(Math.sin(azimut), 0, -Math.cos(azimut));
      const asse = radiale.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -deviazione);
      const normale = new THREE.Vector3(-asse.z, 0, asse.x);
      const piloni: ReturnType<typeof traliccio>[] = [];
      for (let i = 0; i < n; i++) {
        const o = radiale.clone().multiplyScalar(distanza).addScaledVector(asse, i * passo);
        // le mensole stanno di traverso al tracciato
        piloni.push(traliccio(linee, o, asse, normale));
      }
      // i cavi pendono a catenaria fra un traliccio e il successivo
      for (let i = 0; i < piloni.length - 1; i++) {
        piloni[i].attacchi.forEach((a, k) => {
          const b = piloni[i + 1].attacchi[k];
          const freccia = k === piloni[i].attacchi.length - 1 ? 0.9 : 1.3;
          let prima = a;
          for (let j = 1; j <= 16; j++) {
            const u = j / 16;
            const p = a.clone().lerp(b, u);
            p.y -= Math.sin(u * Math.PI) * freccia;
            cavi.push(prima.x, prima.y, prima.z, p.x, p.y, p.z);
            prima = p;
          }
        });
      }
      piloni.forEach((p) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tx, color: "#FF3B26", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0,
        }));
        s.position.copy(p.cima).setY(p.cima.y + 0.1);
        s.scale.setScalar(1.4);
        this.luci.push(s);
        this.gruppo.add(s);
      });
    });
    const acciaio = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linee, 3)),
      new THREE.LineBasicMaterial({ color: "#39415A", transparent: true, opacity: 0.6, fog: false })
    );
    const fili = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(cavi, 3)),
      new THREE.LineBasicMaterial({ color: "#2F3649", transparent: true, opacity: 0.5, fog: false })
    );
    this.gruppo.add(acciaio, fili);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
    });
  }

  aggiorna(t: number) {
    // le luci d'ostacolo lampeggiano tutte insieme "SCRIVIMI" in Morse, in ciclo.
    // A loop acceso il Morse va a tempo (un punto = un ottavo) e fra un messaggio e l'altro
    // le luci battono i quarti per due battute: il messaggio resta intero e leggibile.
    const b = mondo.battito;
    let a: number;
    if (b.attivo) {
      const ottavi = b.n * 2 + (b.fase >= 0.5 ? 1 : 0);
      const ciclo = MORSE.length + 16;
      const k = ottavi % ciclo;
      a = k < MORSE.length ? MORSE[k] : Math.exp(-b.fase * 6);
    } else {
      const k = Math.floor(t / PUNTO) % MORSE.length;
      a = MORSE[k];
    }
    this.acceso += (a - this.acceso) * 0.6;
    this.luci.forEach((l) => (l.material.opacity = 0.12 + this.acceso * 0.88));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
