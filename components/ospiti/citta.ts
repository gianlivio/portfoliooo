import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, generatore, liberaTutto, tela } from "./comuni";

/**
 * La città sullo sfondo, alle spalle di chi guarda la zona dello sviluppatore: la stessa città che cambia.
 * Di notte una metropoli come Manhattan: torri alte con le finestre accese, luci rosse in cima,
 * fasci di riflettori che spazzano il cielo, un bagliore arancio sopra i tetti.
 * Di giorno un paesino bianco come quelli della Sierra Nevada: case a cubo calce e tegole su una collina,
 * il campanile, quasi dipinto.
 */

const DIST = 38; // dentro la volta delle stelle (42)
const AZ = ANGOLO_ZONA + Math.PI;
const ARCO = 0.55; // mezza larghezza, in radianti

function suArco(u: number, d: number) {
  const a = AZ + u * ARCO;
  return new THREE.Vector3(Math.sin(a) * d, 0, -Math.cos(a) * d);
}

export class Citta {
  gruppo = new THREE.Group();
  private notte = new THREE.Group();
  private giorno = new THREE.Group();
  private fari: THREE.Mesh[] = [];
  private cime: THREE.Sprite[] = [];
  private texture: THREE.Texture[] = [];

  constructor(eNotte: boolean) {
    const r = generatore(41);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

    /* ------------------------------------------------ la metropoli, di notte */
    const finestre = tela(64, 256, (x) => {
      x.fillStyle = "#07080C";
      x.fillRect(0, 0, 64, 256);
      for (let j = 0; j < 64; j++) for (let i = 0; i < 8; i++) {
        if (r() < 0.42) continue;
        const k = r();
        x.fillStyle = k < 0.7 ? "#FFD58A" : k < 0.88 ? "#F2F4FF" : "#8FD3FF";
        x.globalAlpha = 0.45 + r() * 0.55;
        x.fillRect(i * 8 + 2, j * 4 + 1, 4, 2);
      }
    });
    finestre.wrapS = finestre.wrapT = THREE.RepeatWrapping;
    finestre.magFilter = THREE.NearestFilter;
    this.texture.push(finestre);
    const N = 70;
    const torri = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ map: finestre, fog: false, toneMapped: false }),
      N
    );
    const txLuce = alone("#FF3A2A");
    this.texture.push(txLuce);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1;
      const centro = 1 - Math.abs(u);
      const h = 2 + Math.pow(r(), 2) * 9 * (0.4 + centro) + (r() < 0.08 ? 5 : 0);
      const p = suArco(u, DIST + r() * 4);
      const l = 0.9 + r() * 1.4;
      q.setFromAxisAngle(up, -(AZ + u * ARCO));
      m.compose(p.setY(PELO_ACQUA - 0.3), q, s.set(l, h, l));
      torri.setMatrixAt(i, m);
      torri.setColorAt(i, new THREE.Color().setHSL(0.6, 0.15, 0.55 + r() * 0.45));
      if (h > 7 && this.cime.length < 9) {
        const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: txLuce, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        c.position.copy(p).setY(PELO_ACQUA - 0.3 + h + 0.2);
        c.scale.setScalar(0.9);
        this.cime.push(c);
        this.notte.add(c);
      }
    }
    this.notte.add(torri);
    // il bagliore arancio della città sul cielo
    const txB = alone("#FF8A3A");
    this.texture.push(txB);
    const bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: txB, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    bagliore.position.copy(suArco(0, DIST + 2)).setY(3);
    bagliore.scale.set(46, 14, 1);
    this.notte.add(bagliore);
    // i riflettori, che spazzano il cielo
    const lama = tela(32, 256, (x) => {
      const g = x.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 256);
    });
    this.texture.push(lama);
    for (const u of [-0.5, 0.05, 0.45]) {
      const f = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 30).translate(0, 15, 0),
        new THREE.MeshBasicMaterial({ map: lama, color: "#CFE0FF", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      f.position.copy(suArco(u, DIST)).setY(PELO_ACQUA);
      f.userData.u = u;
      this.fari.push(f);
      this.notte.add(f);
    }

    /* ---------------------------------------------- il paesino bianco, di giorno */
    // la collina: un dosso largo color terra secca, alto abbastanza da spuntare sopra le carte
    const collina = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(17, 11.5, 7),
      new THREE.MeshBasicMaterial({ color: "#C9B795", fog: false })
    );
    collina.position.copy(suArco(0, DIST + 4)).setY(PELO_ACQUA - 0.8);
    collina.rotation.y = -AZ;
    this.giorno.add(collina);
    // le case: cubi bianchi a gradoni sulla collina, qualche tetto di tegole
    const H = 110;
    const case_ = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: "#FFFFFF", fog: false }), H);
    const tetti = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.4, 4).rotateY(Math.PI / 4).translate(0, 0.2, 0), new THREE.MeshLambertMaterial({ color: "#B8603E", fog: false }), H);
    let nt = 0;
    for (let i = 0; i < H; i++) {
      const u = (r() * 2 - 1) * 0.85;
      const v = r();
      const p = suArco(u * (1 - v * 0.55), DIST + 3 - v * 1.5);
      const y = PELO_ACQUA - 0.8 + Math.sqrt(Math.max(0, 1 - (u * u) * (1 - v * 0.55) ** 2 * 1.1)) * 11.5 * (0.25 + v * 0.7);
      const l = 0.7 + r() * 0.7;
      const h = 0.6 + r() * 0.6;
      q.setFromAxisAngle(up, -(AZ + u * ARCO) + (r() - 0.5) * 0.3);
      m.compose(p.clone().setY(y), q, s.set(l, h, l * (0.8 + r() * 0.5)));
      case_.setMatrixAt(i, m);
      case_.setColorAt(i, new THREE.Color().setHSL(0.1, 0.25, 0.93 + r() * 0.07));
      if (r() < 0.4) {
        m.compose(p.clone().setY(y + h), q, s.set(l, 1, l));
        tetti.setMatrixAt(nt++, m);
      }
    }
    tetti.count = nt;
    this.giorno.add(case_, tetti);
    // il campanile in cima
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9).translate(0, 1.6, 0), new THREE.MeshLambertMaterial({ color: "#FBF8F2", fog: false }));
    torre.position.copy(suArco(0.02, DIST + 3.6)).setY(PELO_ACQUA - 0.8 + 10.3);
    const cuspide = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.1, 4).rotateY(Math.PI / 4).translate(0, 3.75, 0), new THREE.MeshLambertMaterial({ color: "#B8603E", fog: false }));
    cuspide.position.copy(torre.position);
    this.giorno.add(torre, cuspide);

    this.gruppo.add(this.notte, this.giorno);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(eNotte);
  }

  setNotte(notte: boolean) {
    this.notte.visible = notte;
    this.giorno.visible = !notte;
  }

  aggiorna(t: number) {
    if (!this.notte.visible) return;
    this.fari.forEach((f, i) => {
      f.rotation.set(0, -AZ + Math.PI / 2, Math.sin(t * (0.25 + i * 0.07) + i * 2) * 0.55);
    });
    const lampo = Math.sin(t * 2.6) > 0.6 ? 1 : 0.15;
    this.cime.forEach((c) => (c.material.opacity = lampo));
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
