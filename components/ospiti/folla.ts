import * as THREE from "three";

/*
 * Una folla di persone in campagna, leggera: ogni parte del corpo (busto, testa, cappello, gambe, braccia,
 * pertica, bidone) è un solo InstancedMesh per tutte le persone, con un materiale semplice e il colore per
 * copia. Le persone non sono oggetti: a ogni fotogramma si ricompongono le matrici delle parti a partire
 * da un piccolo scheletro (anca, busto, spalle, gambe), secondo quello che ognuno sta facendo.
 * Lo stile è quello del podere nella stanza: capsule e sfere, la coppola, nessun volto.
 */

export type Attivita = "batte" | "abbacchia" | "raccoglie" | "aspetta" | "chiacchiera" | "cammina";
export type Persona = {
  pos: THREE.Vector3;
  /** dove guarda (radianti attorno all'asse verticale; 0 = verso +z) */
  giro: number;
  attivita: Attivita;
  /** sfasamento dell'animazione, perché nessuno si muova all'unisono */
  fase: number;
  camicia: string;
  pantaloni: string;
  pelle?: string;
  cappello?: string;
  alta?: number;
  /** chi cammina va da pos a meta e torna */
  meta?: THREE.Vector3;
  /** un bidone dell'olio in mano */
  bidone?: boolean;
};

const PELLI = ["#C9936C", "#B57E58", "#D8A982"];

export class Folla {
  gruppo = new THREE.Group();
  private persone: Persona[];
  private materiale = new THREE.MeshLambertMaterial({ color: "#FFFFFF" });
  private geometrie: THREE.BufferGeometry[] = [];
  private corpo: THREE.InstancedMesh;
  private testa: THREE.InstancedMesh;
  private cappello: THREE.InstancedMesh;
  private gambe: THREE.InstancedMesh;
  private braccia: THREE.InstancedMesh;
  private pertica: THREE.InstancedMesh;
  private bidone: THREE.InstancedMesh;
  /** quota della terra sotto un punto: chi cammina la segue */
  private quota: (x: number, z: number) => number;

  constructor(persone: Persona[], quota: (x: number, z: number) => number) {
    this.persone = persone;
    this.quota = quota;
    const n = persone.length;
    const parte = (g: THREE.BufferGeometry, quante: number) => {
      this.geometrie.push(g);
      const m = new THREE.InstancedMesh(g, this.materiale, quante);
      // si muovono: niente ritagli sul volume iniziale
      m.frustumCulled = false;
      this.gruppo.add(m);
      return m;
    };
    this.corpo = parte(new THREE.CapsuleGeometry(0.16, 0.36, 3, 8).scale(1, 1, 0.72).translate(0, 0.32, 0), n);
    this.testa = parte(new THREE.SphereGeometry(0.11, 10, 8), n);
    this.cappello = parte(new THREE.CylinderGeometry(0.12, 0.125, 0.06, 10), n);
    this.gambe = parte(new THREE.CapsuleGeometry(0.062, 0.74, 3, 6).translate(0, -0.43, 0), n * 2);
    this.braccia = parte(new THREE.CapsuleGeometry(0.042, 0.5, 3, 6).translate(0, -0.29, 0), n * 2);
    this.pertica = parte(new THREE.CylinderGeometry(0.018, 0.026, 3.4, 5).translate(0, 1.3, 0), n);
    this.bidone = parte(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 8).translate(0, -0.17, 0), n);
    const c = new THREE.Color();
    persone.forEach((p, i) => {
      const pelle = p.pelle ?? PELLI[i % PELLI.length];
      this.corpo.setColorAt(i, c.set(p.camicia));
      this.testa.setColorAt(i, c.set(pelle));
      this.cappello.setColorAt(i, c.set(p.cappello ?? "#000000"));
      this.gambe.setColorAt(i * 2, c.set(p.pantaloni));
      this.gambe.setColorAt(i * 2 + 1, c);
      this.braccia.setColorAt(i * 2, c.set(p.camicia));
      this.braccia.setColorAt(i * 2 + 1, c);
      this.pertica.setColorAt(i, c.set(p.attivita === "abbacchia" ? "#26262A" : "#A78B62"));
      this.bidone.setColorAt(i, c.set("#C9CED2"));
    });
    this.aggiorna(0);
  }

  // matrici di lavoro, riusate a ogni fotogramma
  private P = new THREE.Matrix4();
  private anca = new THREE.Matrix4();
  private busto = new THREE.Matrix4();
  private m = new THREE.Matrix4();
  private r = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private nulla = new THREE.Matrix4().makeScale(0, 0, 0);
  private su = new THREE.Vector3(0, 1, 0);

  /** A tempo t (secondi): ognuno al suo gesto. */
  aggiorna(t: number) {
    const { P, anca, busto, m, r, v, q, s, su } = this;
    this.persone.forEach((p, i) => {
      const f = p.fase;
      const onda = (vel: number, d = 0) => Math.sin(t * vel + f + d);
      // dove sta e dove guarda; chi cammina va e torna fra pos e meta
      let x = p.pos.x, z = p.pos.z, giro = p.giro, passo = 0;
      if (p.attivita === "cammina" && p.meta) {
        const dx = p.meta.x - p.pos.x, dz = p.meta.z - p.pos.z;
        const lungo = Math.hypot(dx, dz);
        const u = ((t * 1.1) / lungo + f) % 2;
        const a = u < 1 ? u : 2 - u;
        x = p.pos.x + dx * a;
        z = p.pos.z + dz * a;
        giro = Math.atan2(dx, dz) + (u < 1 ? 0 : Math.PI);
        passo = Math.sin(t * 6.5 + f);
      }
      const y = p.attivita === "cammina" ? this.quota(x, z) : p.pos.y;
      P.compose(v.set(x, y, z), q.setFromAxisAngle(su, giro), s.setScalar(p.alta ?? 1));

      // la posa: curvatura del busto, braccia (in avanti e di lato), gambe, inclinazione della pertica
      let piega = 0.03, bx = 0.05, bz = 0.08, bxS = 0.05, gamba = 0, abbassa = 0, perticaInc = 0, ruota = 0;
      switch (p.attivita) {
        case "batte":
          bx = bxS = -2.5 + 0.12 * onda(2.6);
          bz = 0.12;
          perticaInc = 0.4 + 0.32 * onda(2.6);
          break;
        case "abbacchia":
          bx = bxS = -2.3;
          bz = 0.1;
          perticaInc = 0.22 + 0.08 * onda(0.5) + 0.025 * Math.sin(t * 38 + f);
          break;
        case "raccoglie":
          piega = 1.0 + 0.12 * onda(1.3);
          bx = -0.35 + 0.35 * onda(1.3, 1);
          bxS = -0.45 + 0.35 * onda(1.3, 2.4);
          gamba = -0.18;
          abbassa = 0.06;
          break;
        case "aspetta":
          ruota = 0.12 * onda(0.35);
          bx = 0.04;
          bxS = 0.02;
          break;
        case "chiacchiera":
          bx = 0.05;
          bxS = -0.9 + 0.35 * onda(2.1);
          bz = 0.18;
          ruota = 0.08 * onda(0.6);
          break;
        case "cammina":
          bx = 0.4 * passo;
          bxS = p.bidone ? -0.08 * passo : -0.4 * passo;
          gamba = 0;
          break;
      }

      anca.copy(P).multiply(m.makeTranslation(0, 0.9 - abbassa + (passo ? Math.abs(passo) * 0.02 : 0), 0));
      busto.copy(anca).multiply(r.makeRotationY(ruota)).multiply(m.makeRotationX(piega));
      this.corpo.setMatrixAt(i, busto);
      // testa e coppola
      m.copy(busto).multiply(r.makeTranslation(0, 0.8, 0));
      this.testa.setMatrixAt(i, m);
      if (p.cappello) this.cappello.setMatrixAt(i, m.multiply(r.makeTranslation(0, 0.09, 0)).multiply(r.makeRotationX(-0.12)));
      else this.cappello.setMatrixAt(i, this.nulla);
      // gambe: chi cammina le alterna
      [-1, 1].forEach((lato, k) => {
        const a = p.attivita === "cammina" ? 0.45 * passo * lato : gamba;
        m.copy(anca).multiply(r.makeTranslation(lato * 0.09, 0, 0)).multiply(r.makeRotationX(a));
        this.gambe.setMatrixAt(i * 2 + k, m);
      });
      // braccia: la sinistra (k=0) e la destra (k=1), che regge il bidone
      [-1, 1].forEach((lato, k) => {
        m.copy(busto)
          .multiply(r.makeTranslation(lato * 0.21, 0.58, 0))
          .multiply(r.makeRotationX(k ? bxS : bx))
          .multiply(r.makeRotationZ(lato * bz));
        this.braccia.setMatrixAt(i * 2 + k, m);
        if (k === 1) {
          if (p.bidone) this.bidone.setMatrixAt(i, m.multiply(r.makeTranslation(0, -0.56, 0)).multiply(r.makeRotationX(-(k ? bxS : bx))));
          else this.bidone.setMatrixAt(i, this.nulla);
        }
      });
      // la pertica o l'abbacchiatore, fra le mani alzate, inclinata verso la chioma
      if (p.attivita === "batte" || p.attivita === "abbacchia") {
        m.copy(busto).multiply(r.makeTranslation(0, 1.05, 0.3)).multiply(r.makeRotationX(perticaInc));
        this.pertica.setMatrixAt(i, m);
      } else this.pertica.setMatrixAt(i, this.nulla);
    });
    for (const im of [this.corpo, this.testa, this.cappello, this.gambe, this.braccia, this.pertica, this.bidone]) {
      im.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.geometrie.forEach((g) => g.dispose());
    this.materiale.dispose();
  }
}
