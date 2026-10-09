import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { type Ospite, alone, liberaTutto } from "./comuni";

/**
 * Di notte, sullo sfondo, due elettrodotti: tralicci a traliccio d'acciaio con le mensole,
 * i cavi che pendono da uno all'altro, le luci rosse d'ostacolo in cima che pulsano insieme.
 * Il nostro tempo, fermo all'orizzonte, mentre davanti passano navi antiche e draghi.
 */

const ALTO = 10;

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

  constructor() {
    const linee: number[] = [];
    const cavi: number[] = [];
    const tx = alone("#FF3020");
    this.texture.push(tx);
    // due elettrodotti, in direzioni diverse, che corrono lungo l'orizzonte
    const tracciati: { azimut: number; distanza: number; n: number; passo: number }[] = [
      { azimut: 0.35, distanza: 33, n: 9, passo: 10 },
      { azimut: 2.9, distanza: 38, n: 7, passo: 11 },
    ];
    tracciati.forEach(({ azimut, distanza, n, passo }) => {
      const normale = new THREE.Vector3(Math.sin(azimut), 0, -Math.cos(azimut));
      const asse = new THREE.Vector3(Math.cos(azimut), 0, Math.sin(azimut));
      const piloni: ReturnType<typeof traliccio>[] = [];
      for (let i = 0; i < n; i++) {
        const o = normale.clone().multiplyScalar(distanza).addScaledVector(asse, (i - (n - 1) / 2) * passo);
        // le mensole stanno di traverso al tracciato
        piloni.push(traliccio(linee, o, normale, asse));
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
    // le luci d'ostacolo pulsano tutte insieme, lente
    const c = (t % 2.0) / 2.0;
    const a = c < 0.5 ? Math.sin((c / 0.5) * Math.PI) : 0;
    this.luci.forEach((l) => (l.material.opacity = 0.15 + a * 0.85));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
