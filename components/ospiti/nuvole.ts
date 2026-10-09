import * as THREE from "three";
import { SOLE } from "../condivisi";
import { type Ospite, generatore, liberaTutto, tela } from "./comuni";

/**
 * Di giorno, nuvole: cumuli bianchi con la base piatta e appena grigia, lontani,
 * che girano lentissimi attorno alla stanza. All'alba e al tramonto prendono il rosa del sole.
 * (Le nuvole di Aristofane, che ci mette dentro Socrate a pensare sospeso in una cesta.)
 */

function texturaNuvola(seme: number) {
  return tela(512, 320, (x) => {
    const r = generatore(seme);
    const base = 236;
    const n = 26 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      // i cumuli più alti stanno al centro; nessuno tocca i bordi della tela
      const cx = 96 + r() * 320;
      const centro = 1 - Math.abs(cx - 256) / 256;
      const rr = 24 + r() * 40 * (0.5 + centro);
      const cy = base - rr * 0.6 - r() * 80 * (0.3 + centro);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(255,255,255,0.85)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, rr, 0, Math.PI * 2);
      x.fill();
    }
    // la pancia appena più grigia e azzurrina
    x.globalCompositeOperation = "source-atop";
    const o = x.createLinearGradient(0, 120, 0, base);
    o.addColorStop(0, "rgba(255,255,255,0)");
    o.addColorStop(1, "rgba(206,214,228,0.45)");
    x.fillStyle = o;
    x.fillRect(0, 0, 512, 320);
    // base piatta ma morbida: sfuma invece di tagliare
    x.globalCompositeOperation = "destination-in";
    const f = x.createLinearGradient(0, base - 30, 0, base + 6);
    f.addColorStop(0, "rgba(0,0,0,1)");
    f.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = f;
    x.fillRect(0, 0, 512, 320);
  });
}

type Nuvola = { s: THREE.Sprite; az: number; d: number; el: number; v: number; fase: number };

export class Nuvole implements Ospite {
  gruppo = new THREE.Group();
  private nuvole: Nuvola[] = [];
  private texture: THREE.Texture[] = [];
  private tinta = new THREE.Color();
  private rosa = new THREE.Color("#FFD0B8");
  private bianco = new THREE.Color("#FFFFFF");

  constructor() {
    for (let k = 0; k < 4; k++) this.texture.push(texturaNuvola(31 + k * 17));
    const r = generatore(77);
    const n = 13;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.texture[i % 4], transparent: true, depthWrite: false, fog: false, opacity: 0.96,
      }));
      const largo = 9 + r() * 10;
      s.scale.set(largo, largo * 0.625, 1);
      s.renderOrder = -0.5;
      s.raycast = () => undefined;
      this.gruppo.add(s);
      this.nuvole.push({
        s,
        az: (i / n) * Math.PI * 2 + r() * 0.4,
        d: 36 + r() * 10,
        el: 0.13 + r() * 0.24,
        v: 0.004 + r() * 0.003,
        fase: r() * 10,
      });
    }
  }

  aggiorna(t: number) {
    const basso = 1 - THREE.MathUtils.smoothstep(SOLE.y, 0.04, 0.4);
    this.tinta.copy(this.bianco).lerp(this.rosa, basso * 0.8);
    this.nuvole.forEach((n) => {
      const az = n.az + t * n.v;
      const y = Math.tan(n.el + Math.sin(t * 0.05 + n.fase) * 0.01) * n.d;
      n.s.position.set(Math.sin(az) * n.d, y, -Math.cos(az) * n.d);
      n.s.material.color.copy(this.tinta);
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
