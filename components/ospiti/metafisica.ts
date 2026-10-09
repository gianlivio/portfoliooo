import * as THREE from "three";
import { PELO_ACQUA, SOLE } from "../condivisi";
import { type Ospite, attesa, bruma, casuale, liberaTutto, primo, segno, tela } from "./comuni";

/**
 * Di giorno la stanza diventa una piazza metafisica: oltre le carte, due porticati che fuggono
 * verso l'orizzonte con le arcate in ombra, una torre rossa a gradoni con le colonnine e le
 * bandiere al vento, una ciminiera di mattoni, un muro basso all'orizzonte. Ogni tanto,
 * dietro il muro, passa un treno lontano: se ne vede il pennacchio di fumo che sale e si allunga.
 * Il linguaggio di De Chirico (luce bassa, ombre lunghe, l'antico e il moderno nella stessa piazza),
 * senza copiare nessun quadro.
 */

const OCRA = new THREE.Color("#D8A468");
const MATTONE = new THREE.Color("#A9472F");
const PIETRA = new THREE.Color("#CDBB98");

/** Facciata ad arcate: muro ocra, archi bui, cornicione chiaro. Un arco per ogni 128 px. */
function texturaPortico() {
  return tela(1024, 256, (x) => {
    x.fillStyle = "#D9A86C";
    x.fillRect(0, 0, 1024, 256);
    // cornicione e fascia marcapiano
    x.fillStyle = "#E7C48E";
    x.fillRect(0, 0, 1024, 26);
    x.fillStyle = "#B98450";
    x.fillRect(0, 26, 1024, 6);
    for (let i = 0; i < 8; i++) {
      const cx = i * 128 + 64;
      // l'arco: rettangolo e semicerchio, nero caldo; un filo di luce sull'intradosso
      x.fillStyle = "#2B201B";
      x.beginPath();
      x.moveTo(cx - 40, 256);
      x.lineTo(cx - 40, 110);
      x.arc(cx, 110, 40, Math.PI, 0);
      x.lineTo(cx + 40, 256);
      x.closePath();
      x.fill();
      x.strokeStyle = "rgba(240,200,140,0.35)";
      x.lineWidth = 3;
      x.beginPath();
      x.arc(cx, 110, 41, Math.PI * 1.05, Math.PI * 1.6);
      x.stroke();
      // finestrella quadrata sopra l'arco
      x.fillStyle = "#3A2B22";
      x.fillRect(cx - 9, 42, 18, 22);
    }
  });
}

/** Un porticato lungo `l`, alto `h`, che parte da `da` e va nella direzione `dir`, con le arcate verso `verso`. */
function portico(da: THREE.Vector3, dir: THREE.Vector3, l: number, h: number, tx: THREE.Texture) {
  const g = new THREE.Group();
  const t = tx.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(l / 2.4 / 8, 1);
  t.needsUpdate = true;
  const facciata = new THREE.MeshLambertMaterial({ map: t });
  const muro = new THREE.MeshLambertMaterial({ color: OCRA });
  const tetto = new THREE.MeshLambertMaterial({ color: "#B47C4E" });
  // +z della scatola: la facciata con le arcate
  const box = new THREE.Mesh(new THREE.BoxGeometry(l, h, 2.6), [muro, muro, tetto, muro, facciata, muro]);
  box.position.set(0, h / 2, 0);
  g.add(box);
  // parapetto sul tetto
  const parapetto = new THREE.Mesh(new THREE.BoxGeometry(l, 0.35, 0.18), muro);
  parapetto.position.set(0, h + 0.17, 1.2);
  g.add(parapetto);
  g.position.copy(da).addScaledVector(dir, l / 2).setY(PELO_ACQUA);
  g.rotation.y = Math.atan2(-dir.z, dir.x);
  return g;
}

/** Torre a gradoni: tamburi di mattoni, giri di colonnine, bandiere in cima. */
function torre(bandiere: THREE.Mesh[]) {
  const g = new THREE.Group();
  const mattone = new THREE.MeshLambertMaterial({ color: MATTONE });
  const cornice = new THREE.MeshLambertMaterial({ color: PIETRA });
  let y = 0;
  const piani: [number, number][] = [[1.7, 3.2], [1.25, 1.3], [0.9, 1.0], [0.6, 0.8]];
  piani.forEach(([r, h], i) => {
    const tamburo = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 28), mattone);
    tamburo.position.y = y + h / 2;
    g.add(tamburo);
    y += h;
    const anello = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.12, 28), cornice);
    anello.position.y = y;
    g.add(anello);
    if (i < 3) {
      // il giro di colonnine attorno al tamburo successivo
      const rr = piani[i + 1][0] + (r - piani[i + 1][0]) * 0.55;
      const n = 14 - i * 3;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6), cornice);
        c.position.set(Math.cos(a) * rr, y + 0.45, Math.sin(a) * rr);
        g.add(c);
      }
    }
  });
  // due aste con le bandiere, che sventolano
  for (const [x, colore] of [[-0.25, "#3E7D4A"], [0.25, "#B8402E"]] as [number, string][]) {
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), cornice);
    asta.position.set(x, y + 0.8, 0);
    g.add(asta);
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.36, 12, 1).translate(0.5, 0, 0),
      new THREE.MeshLambertMaterial({ color: colore, side: THREE.DoubleSide })
    );
    b.position.set(x, y + 1.42, 0);
    g.add(b);
    bandiere.push(b);
  }
  return g;
}

function ciminiera() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: "#9C4A33" });
  const fusto = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.6, 13, 16), m);
  fusto.position.y = 6.5;
  const bocca = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.5, 16), m);
  bocca.position.y = 13.1;
  g.add(fusto, bocca);
  return g;
}

/** Locomotiva e tre vagoni, in silhouette scura. */
function treno() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: "#3B2F29" });
  const caldaia = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.4, 12).rotateZ(Math.PI / 2), m);
  caldaia.position.set(1.4, 1.0, 0);
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 1.0), m);
  cabina.position.set(0.0, 1.15, 0);
  const fumaiolo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.6, 8), m);
  fumaiolo.position.set(2.3, 1.7, 0);
  g.add(caldaia, cabina, fumaiolo);
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 1.0), m);
    v.position.set(-1.9 - i * 2.85, 1.05, 0);
    g.add(v);
  }
  g.userData.fumaiolo = fumaiolo;
  return g;
}

type Sbuffo = { s: THREE.Sprite; t: number; v: THREE.Vector3; vivo: boolean };

export class Metafisica implements Ospite {
  gruppo = new THREE.Group();
  private bandiere: THREE.Mesh[] = [];
  private treno: THREE.Group;
  private sbuffi: Sbuffo[] = [];
  private fumoCiminiera: Sbuffo[] = [];
  private ciminiera: THREE.Group;
  private texture: THREE.Texture[] = [];
  private stato = {
    prossima: primo(18, 3), inizio: -1, durata: 40, da: new THREE.Vector3(), a: new THREE.Vector3(),
    sbuffo: 0, fumo: 0,
  };

  constructor() {
    const tx = texturaPortico();
    this.texture.push(tx);
    // due porticati che fuggono verso l'orizzonte, uno per parte
    const dirDa = (azimut: number, d: number) => new THREE.Vector3(Math.sin(azimut) * d, 0, -Math.cos(azimut) * d);
    const fuga = (azimut: number, dev: number) =>
      new THREE.Vector3(Math.sin(azimut), 0, -Math.cos(azimut)).applyAxisAngle(new THREE.Vector3(0, 1, 0), dev);
    // corrono quasi di traverso, come i lati di una piazza: le arcate si vedono in fuga
    const p1 = portico(dirDa(-0.75, 13), fuga(-0.75, 1.05), 30, 5.2, tx);
    const p2 = portico(dirDa(1.35, 14), fuga(1.35, -1.1), 26, 4.6, tx);
    this.gruppo.add(p1, p2);
    // le arcate devono guardare la piazza: se la facciata dà sul fuori, si gira il porticato
    [p1, p2].forEach((p) => {
      const fuori = new THREE.Vector3(0, 0, 1).applyQuaternion(p.quaternion);
      const versoCentro = p.position.clone().setY(0).multiplyScalar(-1);
      if (fuori.dot(versoCentro) < 0) p.rotateY(Math.PI);
    });
    // la torre rossa e la ciminiera, lontane
    const t = torre(this.bandiere);
    t.position.copy(dirDa(0.3, 26)).setY(PELO_ACQUA);
    this.gruppo.add(t);
    this.ciminiera = ciminiera();
    this.ciminiera.position.copy(dirDa(-0.28, 38)).setY(PELO_ACQUA);
    this.gruppo.add(this.ciminiera);
    // il muro basso all'orizzonte, dietro cui corre il treno
    const muro = new THREE.Mesh(new THREE.BoxGeometry(70, 1.6, 0.6), new THREE.MeshLambertMaterial({ color: "#C49A6A" }));
    muro.position.copy(dirDa(2.9, 34)).setY(PELO_ACQUA + 0.8);
    muro.lookAt(new THREE.Vector3(0, PELO_ACQUA + 0.8, 0));
    this.gruppo.add(muro);
    this.treno = treno();
    this.treno.visible = false;
    this.gruppo.add(this.treno);
    const txFumo = bruma(9);
    this.texture.push(txFumo);
    const sbuffo = () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txFumo, color: "#F4EEE2", transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false;
      this.gruppo.add(s);
      return { s, t: 0, v: new THREE.Vector3(), vivo: false };
    };
    for (let i = 0; i < 40; i++) this.sbuffi.push(sbuffo());
    for (let i = 0; i < 14; i++) this.fumoCiminiera.push(sbuffo());
    this.gruppo.userData.muro = muro;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  private soffia(lista: Sbuffo[], da: THREE.Vector3, t: number, v: THREE.Vector3) {
    const b = lista.find((x) => !x.vivo);
    if (!b) return;
    b.vivo = true;
    b.t = t;
    b.s.position.copy(da);
    b.v.copy(v);
    b.s.visible = true;
    b.s.material.rotation = casuale(0, 6.28);
  }

  private muoviFumo(lista: Sbuffo[], t: number, dt: number, vita: number, cresce: number, opac: number) {
    lista.forEach((b) => {
      if (!b.vivo) return;
      const e = t - b.t;
      if (e > vita) {
        b.vivo = false;
        b.s.visible = false;
        return;
      }
      b.s.position.addScaledVector(b.v, dt);
      b.v.y *= 1 - dt * 0.25;
      b.s.scale.setScalar(0.6 + e * cresce);
      b.s.material.opacity = opac * Math.min(1, e * 3) * (1 - e / vita);
    });
  }

  aggiorna(t: number, dt: number) {
    // bandiere al vento
    this.bandiere.forEach((b, i) => {
      const pos = b.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k);
        pos.setZ(k, Math.sin(t * 4 + x * 5 + i) * 0.12 * x);
      }
      pos.needsUpdate = true;
    });
    // la ciminiera fuma piano, il vento porta il fumo dalla parte opposta al sole
    const vento = new THREE.Vector3(-SOLE.x, 0, -SOLE.z).normalize().multiplyScalar(0.5);
    if (t > this.stato.fumo) {
      this.stato.fumo = t + 0.9;
      const bocca = this.ciminiera.position.clone().setY(PELO_ACQUA + 13.4);
      this.soffia(this.fumoCiminiera, bocca, t, vento.clone().setY(0.45));
    }
    this.muoviFumo(this.fumoCiminiera, t, dt, 12, 0.35, 0.35);

    // il treno: ogni tanto, dietro il muro, da un capo all'altro
    const s = this.stato;
    if (s.inizio < 0 && t >= s.prossima) {
      const muro = this.gruppo.userData.muro as THREE.Mesh;
      const lungo = new THREE.Vector3(1, 0, 0).applyQuaternion(muro.quaternion);
      const v = segno();
      const dietro = muro.position.clone().setY(0).normalize().multiplyScalar(1.2);
      s.da.copy(muro.position).add(dietro).addScaledVector(lungo, -34 * v).setY(PELO_ACQUA);
      s.a.copy(muro.position).add(dietro).addScaledVector(lungo, 34 * v).setY(PELO_ACQUA);
      s.durata = casuale(36, 44);
      s.inizio = t;
      this.treno.visible = true;
      this.treno.lookAt(this.treno.position.clone().add(lungo.multiplyScalar(v)));
      this.treno.rotateY(-Math.PI / 2);
    }
    if (s.inizio >= 0) {
      const k = (t - s.inizio) / s.durata;
      if (k >= 1) {
        s.inizio = -1;
        s.prossima = t + attesa(95, 120);
        this.treno.visible = false;
      } else {
        this.treno.position.lerpVectors(s.da, s.a, k);
        if (t > s.sbuffo) {
          // sbuffi regolari, come il ritmo dei pistoni
          s.sbuffo = t + 0.45;
          const f = (this.treno.userData.fumaiolo as THREE.Mesh).getWorldPosition(new THREE.Vector3());
          this.soffia(this.sbuffi, f, t, vento.clone().setY(0.9).add(new THREE.Vector3(casuale(-0.1, 0.1), 0, casuale(-0.1, 0.1))));
        }
      }
    }
    this.muoviFumo(this.sbuffi, t, dt, 9, 0.55, 0.55);
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
