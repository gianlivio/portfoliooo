import * as THREE from "three";
import { loft } from "./comuni";

/**
 * Figure umane piccole, da vedere in controluce: busto, testa con la coppola, braccia a due
 * segmenti, gambe. Servono ai pescatori della feluca e allo sviluppatore alla scrivania.
 * Unità: 1 = un metro; la figura guarda verso +z, i piedi (o il sedile) in y = 0.
 */

export type Figura = {
  gruppo: THREE.Group;
  busto: THREE.Group;
  testa: THREE.Group;
  spalle: THREE.Group[]; // [destra, sinistra]
  gomiti: THREE.Group[];
  anche: THREE.Group[];
  ginocchia: THREE.Group[];
};

const verticale = (g: THREE.BufferGeometry) => g.rotateX(-Math.PI / 2);

export function figura(
  mat: { pelle: THREE.Material; abito: THREE.Material; capo?: THREE.Material },
  { seduta = false, coppola = true, felpa = false } = {}
): Figura {
  const gruppo = new THREE.Group();
  const busto = new THREE.Group();
  busto.position.y = seduta ? 0.45 : 0.95;
  gruppo.add(busto);
  // busto: dal bacino alle spalle, spalle più larghe, schiena appena curva
  busto.add(new THREE.Mesh(verticale(loft([
    { z: 0.0, l: 0.17, su: 0.11 },
    { z: 0.18, l: 0.155, su: 0.1, y: -0.005 },
    { z: 0.36, l: 0.18, su: 0.115, y: -0.012 },
    { z: 0.5, l: felpa ? 0.225 : 0.21, su: felpa ? 0.13 : 0.12, y: -0.02 },
    { z: 0.56, l: 0.13, su: 0.09, y: -0.02 },
    { z: 0.6, l: 0.06, su: 0.055, y: -0.015 },
  ], { radiali: 16, passi: 3 })), mat.abito));
  // collo e testa
  const testa = new THREE.Group();
  testa.position.set(0, 0.62, -0.01);
  busto.add(testa);
  testa.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10).translate(0, 0.0, 0), mat.pelle));
  testa.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12).scale(0.92, 1.1, 1.0).translate(0, 0.14, 0.01), mat.pelle));
  if (felpa) {
    // capelli corti e il cappuccio della felpa abbassato sulla schiena
    testa.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.05, 1.02).translate(0, 0.16, -0.005), mat.capo ?? mat.abito));
    busto.add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.045, 8, 16, Math.PI).rotateX(Math.PI / 2 + 0.5).translate(0, 0.55, -0.08), mat.abito));
  } else if (coppola) {
    testa.add(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.05, 14).translate(0, 0.22, 0), mat.capo ?? mat.abito));
    testa.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.08).translate(0, 0.2, 0.1), mat.capo ?? mat.abito));
  }
  // braccia
  const spalle: THREE.Group[] = [];
  const gomiti: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const spalla = new THREE.Group();
    spalla.position.set(s * 0.2, 0.52, -0.02);
    spalla.add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.3, 8).translate(0, -0.15, 0), mat.abito));
    const gomito = new THREE.Group();
    gomito.position.y = -0.3;
    gomito.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.27, 8).translate(0, -0.135, 0), felpa ? mat.abito : mat.pelle));
    gomito.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6).scale(0.8, 1.1, 0.6).translate(0, -0.3, 0), mat.pelle));
    spalla.add(gomito);
    busto.add(spalla);
    spalle.push(spalla);
    gomiti.push(gomito);
  }
  // gambe
  const anche: THREE.Group[] = [];
  const ginocchia: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const anca = new THREE.Group();
    anca.position.set(s * 0.09, seduta ? 0.45 : 0.95, 0);
    anca.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.46, 8).translate(0, -0.23, 0), mat.abito));
    const ginocchio = new THREE.Group();
    ginocchio.position.y = -0.46;
    ginocchio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.44, 8).translate(0, -0.22, 0), mat.abito));
    ginocchio.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.22).translate(0, -0.45, 0.05), mat.capo ?? mat.abito));
    anca.add(ginocchio);
    gruppo.add(anca);
    anche.push(anca);
    ginocchia.push(ginocchio);
    if (seduta) {
      // seduto: cosce in avanti, stinchi giù
      anca.rotation.x = -1.45;
      ginocchio.rotation.x = 1.45;
    }
  }
  return { gruppo, busto, testa, spalle, gomiti, anche, ginocchia };
}
