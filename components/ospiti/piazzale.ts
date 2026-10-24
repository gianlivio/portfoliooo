import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { alone } from "./comuni";

/*
 * Il piazzale del frantoio, in fondo al cammino: il capannone col portone aperto e l'insegna, i silos
 * d'acciaio, le bins vuote impilate, e la strada davanti con la fila dei mezzi che portano le olive.
 * La fila avanza a scatti: a ogni turno chi è al portone scarica e se ne va, gli altri avanzano di un posto,
 * uno nuovo arriva dalla nebbia. Di notte il frantoio lavora: il portone acceso, i fari, i lampioni.
 * Ogni mezzo è fatto di scatole e cilindri uniti per colore: pochi oggetti da disegnare.
 * Coordinate: l'origine è il punto del piazzale davanti al portone; la strada corre lungo x.
 */

/** Un pezzo di mezzo: geometria e colore. I pezzi dello stesso colore si uniscono in un solo mesh. */
type Pezzo = { g: THREE.BufferGeometry; colore: string };
const scatola = (l: number, a: number, p: number, x: number, y: number, z: number, colore: string): Pezzo => ({ g: new THREE.BoxGeometry(l, a, p).translate(x, y, z), colore });
const ruota = (r: number, x: number, z: number): Pezzo => ({ g: new THREE.CylinderGeometry(r, r, 0.22, 12).rotateZ(Math.PI / 2).translate(x, r, z), colore: "#26262A" });
/** Una bins delle olive: il contenitore chiaro e il carico scuro appena sotto il bordo. */
const bins = (x: number, y: number, z: number): Pezzo[] => [scatola(1.1, 0.72, 1.0, x, y + 0.36, z, "#D6D6CE"), scatola(1.0, 0.04, 0.9, x, y + 0.66, z, "#3A3530")];
const cassa = (x: number, y: number, z: number, colore: string): Pezzo[] => [scatola(0.5, 0.26, 0.4, x, y + 0.13, z, colore), scatola(0.44, 0.03, 0.34, x, y + 0.23, z, "#3A3530")];

/** I mezzi, col muso verso +z (poi girati verso il portone). */
const MEZZI: (() => Pezzo[])[] = [
  // il camion con due bins sul cassone
  () => [
    scatola(2.0, 1.7, 1.6, 0, 1.45, 1.9, "#E8E6E0"),
    scatola(1.9, 0.5, 0.06, 0, 1.75, 2.71, "#5A6A78"),
    scatola(2.1, 0.18, 3.8, 0, 0.62, -0.5, "#3A3C40"),
    scatola(2.1, 0.35, 0.06, 0, 0.88, -2.4, "#8A8C90"),
    ...bins(-0.45, 0.71, -0.4),
    ...bins(0.45, 0.71, -1.5),
    ruota(0.42, -0.95, 1.8),
    ruota(0.42, 0.95, 1.8),
    ruota(0.42, -0.95, -1.6),
    ruota(0.42, 0.95, -1.6),
  ],
  // l'Ape azzurra con le cassette
  () => [
    scatola(1.25, 1.3, 1.1, 0, 0.95, 0.9, "#6F98B8"),
    scatola(1.1, 0.4, 0.05, 0, 1.3, 1.46, "#3A4650"),
    scatola(1.3, 0.35, 1.6, 0, 0.62, -0.5, "#6F98B8"),
    ...cassa(-0.3, 0.8, -0.2, "#C8443A"),
    ...cassa(0.3, 0.8, -0.2, "#4E8A4A"),
    ...cassa(-0.3, 0.8, -0.8, "#2A2A2E"),
    ...cassa(0.3, 0.8, -0.8, "#C8443A"),
    ruota(0.28, 0, 1.2),
    ruota(0.28, -0.6, -0.8),
    ruota(0.28, 0.6, -0.8),
  ],
  // il trattore rosso col rimorchio
  () => [
    scatola(1.0, 0.9, 1.6, 0, 1.2, 1.4, "#B0302A"),
    scatola(1.2, 1.5, 1.0, 0, 1.85, 0.2, "#3A3C40"),
    scatola(1.3, 0.06, 1.2, 0, 2.62, 0.2, "#B0302A"),
    { g: new THREE.CylinderGeometry(0.75, 0.75, 0.4, 14).rotateZ(Math.PI / 2).translate(-0.85, 0.75, 0.0), colore: "#26262A" },
    { g: new THREE.CylinderGeometry(0.75, 0.75, 0.4, 14).rotateZ(Math.PI / 2).translate(0.85, 0.75, 0.0), colore: "#26262A" },
    ruota(0.4, -0.65, 1.8),
    ruota(0.4, 0.65, 1.8),
    scatola(0.12, 0.12, 1.0, 0, 0.6, -0.9, "#3A3C40"),
    scatola(1.9, 0.5, 2.6, 0, 0.9, -2.8, "#8A6A48"),
    ...bins(0, 1.15, -2.8),
    ruota(0.36, -0.9, -2.8),
    ruota(0.36, 0.9, -2.8),
  ],
  // il pick-up bianco con le cassette, come quello della pausa caffè
  () => [
    scatola(1.75, 0.75, 4.3, 0, 0.75, 0, "#E8E6E0"),
    scatola(1.65, 0.6, 1.6, 0, 1.42, 0.55, "#E8E6E0"),
    scatola(1.55, 0.45, 0.05, 0, 1.45, 1.36, "#3A4650"),
    ...cassa(-0.4, 1.12, -1.0, "#4E8A4A"),
    ...cassa(0.3, 1.12, -1.0, "#C8443A"),
    ...cassa(-0.1, 1.12, -1.55, "#E0DED6"),
    ruota(0.36, -0.85, 1.35),
    ruota(0.36, 0.85, 1.35),
    ruota(0.36, -0.85, -1.35),
    ruota(0.36, 0.85, -1.35),
  ],
  // l'utilitaria color oro col carrello
  () => [
    scatola(1.7, 0.7, 3.7, 0, 0.7, 0.8, "#BFA65A"),
    scatola(1.55, 0.6, 1.9, 0, 1.33, 0.6, "#BFA65A"),
    scatola(1.45, 0.45, 0.05, 0, 1.36, 1.56, "#3A4650"),
    ruota(0.33, -0.8, 2.0),
    ruota(0.33, 0.8, 2.0),
    ruota(0.33, -0.8, -0.4),
    ruota(0.33, 0.8, -0.4),
    scatola(0.1, 0.1, 0.9, 0, 0.45, -1.4, "#3A3C40"),
    scatola(1.5, 0.4, 1.8, 0, 0.75, -2.7, "#6A6C70"),
    ...cassa(-0.35, 0.95, -2.4, "#C8443A"),
    ...cassa(0.35, 0.95, -2.4, "#2F5E8C"),
    ...cassa(0, 0.95, -3.1, "#4E8A4A"),
    ruota(0.3, -0.85, -2.7),
    ruota(0.3, 0.85, -2.7),
  ],
  // un secondo camion, azzurro, con tre bins
  () => [
    scatola(2.0, 1.7, 1.6, 0, 1.45, 2.2, "#7FA7C4"),
    scatola(1.9, 0.5, 0.06, 0, 1.75, 3.01, "#3A4650"),
    scatola(2.1, 0.18, 4.4, 0, 0.62, -0.5, "#3A3C40"),
    ...bins(-0.45, 0.71, 0.6),
    ...bins(0.45, 0.71, -0.5),
    ...bins(-0.45, 0.71, -1.6),
    ruota(0.42, -0.95, 2.1),
    ruota(0.42, 0.95, 2.1),
    ruota(0.42, -0.95, -1.9),
    ruota(0.42, 0.95, -1.9),
  ],
];

/** Le fermate della fila lungo la strada: l'arrivo nella nebbia, i posti in coda, il portone, la partenza. */
const FERMATE = [70, 27, 20.5, 14, 7.5, 0.5, -70];
/** Quanto dura un turno: tanto ci vuole a scaricare un mezzo. */
const TURNO = 7;

export class Piazzale {
  gruppo = new THREE.Group();
  private mezzi: THREE.Group[] = [];
  private materiali = new Map<string, THREE.MeshLambertMaterial>();
  private geometrie: THREE.BufferGeometry[] = [];
  private texture: THREE.Texture[] = [];
  /** i materiali fuori dalla tavolozza: fari, portone, insegna, aloni */
  private altri: THREE.Material[] = [];
  private tieni<M extends THREE.Material>(m: M) {
    this.altri.push(m);
    return m;
  }
  private quota: (x: number, z: number) => number;
  private origine: THREE.Vector3;
  private strada: number;

  /**
   * origine: il punto davanti al portone, nel mondo; strada: la distanza della strada dal portone (verso +z).
   */
  constructor(origine: THREE.Vector3, notte: boolean, quota: (x: number, z: number) => number) {
    this.origine = origine;
    this.quota = quota;
    this.strada = 3.2;
    this.gruppo.position.set(origine.x, 0, origine.z);
    this.costruisciCapannone(notte);
    MEZZI.forEach((fai, i) => {
      const g = this.unisci(fai());
      if (notte) {
        // i fari accesi
        const luce = this.tieni(new THREE.MeshBasicMaterial({ color: "#FFF1C8" }));
        const l = new THREE.PlaneGeometry(0.22, 0.14);
        this.geometrie.push(l);
        const fronte = i === 1 ? 1.47 : i === 2 ? 2.21 : i === 3 ? 2.16 : i === 4 ? 2.66 : i === 5 ? 3.02 : 2.71;
        [-1, 1].forEach((s) => {
          const f = new THREE.Mesh(l, luce);
          f.position.set(s * (i === 1 ? 0.4 : 0.7), 0.85, fronte);
          g.add(f);
        });
        const aloneFari = this.alone("#FFF1C8", 2.2);
        aloneFari.position.set(0, 0.9, fronte + 0.3);
        g.add(aloneFari);
      }
      // il muso verso il portone: la fila cammina verso -x
      g.rotation.y = -Math.PI / 2;
      this.mezzi.push(g);
      this.gruppo.add(g);
    });
    this.aggiorna(0);
  }

  private materiale(colore: string) {
    let m = this.materiali.get(colore);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: colore });
      this.materiali.set(colore, m);
    }
    return m;
  }

  /** I pezzi dello stesso colore in un solo mesh. */
  private unisci(pezzi: Pezzo[]) {
    const g = new THREE.Group();
    const perColore = new Map<string, THREE.BufferGeometry[]>();
    pezzi.forEach((p) => perColore.set(p.colore, [...(perColore.get(p.colore) ?? []), p.g.index ? p.g.toNonIndexed() : p.g]));
    perColore.forEach((gs, colore) => {
      const unita = mergeGeometries(gs);
      this.geometrie.push(unita);
      g.add(new THREE.Mesh(unita, this.materiale(colore)));
    });
    pezzi.forEach((p) => p.g.dispose());
    return g;
  }

  private alone(colore: string, grande: number) {
    const t = alone(colore);
    this.texture.push(t);
    const s = new THREE.Sprite(this.tieni(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })));
    s.scale.setScalar(grande);
    return s;
  }

  private costruisciCapannone(notte: boolean) {
    const y0 = this.quota(this.origine.x, this.origine.z);
    const pezzi: Pezzo[] = [
      // il capannone: muri d'intonaco chiaro, il tetto di lamiera a due falde basse
      scatola(18, 6, 0.3, 0, 3, -1.0, "#E6DCC6"),
      scatola(0.3, 6, 10, -9, 3, -6, "#DCD2BC"),
      scatola(0.3, 6, 10, 9, 3, -6, "#DCD2BC"),
      scatola(18, 6, 0.3, 0, 3, -11, "#DCD2BC"),
      { g: new THREE.BoxGeometry(18.8, 0.2, 5.6).rotateX(0.16).translate(0, 6.45, -3.5), colore: "#8E9398" },
      { g: new THREE.BoxGeometry(18.8, 0.2, 5.6).rotateX(-0.16).translate(0, 6.45, -8.5), colore: "#8E9398" },
      // lo zoccolo e la cornice del portone
      scatola(18, 0.5, 0.34, 0, 0.25, -0.98, "#B8AE98"),
      scatola(5.4, 0.3, 0.4, 0, 4.65, -0.9, "#B8AE98"),
      // i silos d'acciaio sul fianco, e le bins vuote impilate dall'altra parte
      { g: new THREE.CylinderGeometry(0.9, 0.9, 5.2, 16).translate(11, 2.6, -3), colore: "#BCC2C8" },
      { g: new THREE.CylinderGeometry(0.9, 0.9, 5.2, 16).translate(13.2, 2.6, -3), colore: "#BCC2C8" },
      { g: new THREE.CylinderGeometry(0.9, 0.9, 5.2, 16).translate(12.1, 2.6, -5.2), colore: "#BCC2C8" },
      { g: new THREE.ConeGeometry(0.9, 0.5, 16).translate(11, 5.45, -3), colore: "#A8AEB4" },
      { g: new THREE.ConeGeometry(0.9, 0.5, 16).translate(13.2, 5.45, -3), colore: "#A8AEB4" },
      { g: new THREE.ConeGeometry(0.9, 0.5, 16).translate(12.1, 5.45, -5.2), colore: "#A8AEB4" },
      ...[0, 1, 2].flatMap((k) => [scatola(1.1, 0.72, 1.0, -11 + k * 1.2, 0.36, -2.2, "#D6D6CE"), scatola(1.1, 0.72, 1.0, -10.4 + k * 1.2, 1.08, -2.2, "#D6D6CE")]),
    ];
    const capannone = this.unisci(pezzi);
    capannone.position.y = y0;
    this.gruppo.add(capannone);
    // il portone aperto: dentro buio di giorno, acceso di notte, con la macchina inox in controluce
    const vano = new THREE.PlaneGeometry(4.8, 4.4);
    this.geometrie.push(vano);
    const dentro = new THREE.Mesh(vano, this.tieni(new THREE.MeshBasicMaterial({ color: notte ? "#F2A85A" : "#2A2622", fog: !notte })));
    dentro.position.set(0, y0 + 2.2, -0.8);
    this.gruppo.add(dentro);
    const macchina = this.unisci([scatola(2.4, 1.6, 0.6, 0.4, 0.8, -1.4, notte ? "#5A4A3A" : "#7C848C"), { g: new THREE.CylinderGeometry(0.5, 0.5, 2.4, 12).translate(-1.4, 1.2, -1.6), colore: notte ? "#5A4A3A" : "#8C949C" }]);
    macchina.position.y = y0;
    this.gruppo.add(macchina);
    // l'insegna sopra il portone
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 160;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    x.fillStyle = "#3A2E22";
    x.fillRect(0, 0, 1024, 160);
    x.fillStyle = "#F0E2C0";
    x.font = "600 92px Georgia, serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("FRANTOIO OLEARIO", 512, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.texture.push(t);
    const insegna = new THREE.PlaneGeometry(6.4, 1.0);
    this.geometrie.push(insegna);
    const cartello = new THREE.Mesh(insegna, this.tieni(new THREE.MeshBasicMaterial({ map: t, color: notte ? "#B8B0A0" : "#FFFFFF" })));
    cartello.position.set(0, y0 + 5.35, -0.82);
    this.gruppo.add(cartello);
    if (notte) {
      const a = this.alone("#FFC07A", 9);
      a.position.set(0, y0 + 2.4, 0.4);
      this.gruppo.add(a);
      // due lampioni sul piazzale
      [-7, 7].forEach((lx) => {
        const palo = this.unisci([scatola(0.12, 4.2, 0.12, 0, 2.1, 0, "#3A3C40"), scatola(0.5, 0.12, 0.3, 0, 4.2, 0.1, "#3A3C40")]);
        palo.position.set(lx, this.quota(this.origine.x + lx, this.origine.z + 6), 6);
        const l = this.alone("#FFE2A8", 3.4);
        l.position.set(0, 4.05, 0.15);
        palo.add(l);
        this.gruppo.add(palo);
      });
    }
  }

  /** A tempo t: la fila avanza di un posto a ogni turno; chi arriva e chi parte fa la strada lunga. */
  aggiorna(t: number) {
    const turno = Math.floor(t / TURNO);
    const dentro = (t / TURNO) % 1;
    const nF = FERMATE.length;
    this.mezzi.forEach((g, i) => {
      // ogni mezzo sta alla fermata (turno + i) e va verso la successiva
      const k = (turno + i) % nF;
      const da = FERMATE[k];
      const a = FERMATE[(k + 1) % nF];
      let x: number;
      if (k === nF - 1) {
        // dalla partenza all'arrivo: nella nebbia, non si vede
        x = FERMATE[0];
      } else if (k === 0 || k === nF - 2) {
        // l'arrivo e la partenza: tutto il turno per fare la strada, rallentando o accelerando
        const e = k === 0 ? 1 - Math.pow(1 - dentro, 2) : dentro * dentro;
        x = da + (a - da) * e;
      } else {
        // in coda: si avanza nella prima parte del turno, poi si aspetta
        const e = THREE.MathUtils.smoothstep(dentro, 0, 0.4);
        x = da + (a - da) * e;
      }
      g.visible = Math.abs(x) < 62;
      const wx = this.origine.x + x, wz = this.origine.z + this.strada;
      g.position.set(x, this.quota(wx, wz), this.strada);
    });
  }

  dispose() {
    this.geometrie.forEach((g) => g.dispose());
    this.materiali.forEach((m) => m.dispose());
    this.texture.forEach((t) => t.dispose());
    this.altri.forEach((m) => m.dispose());
  }
}
