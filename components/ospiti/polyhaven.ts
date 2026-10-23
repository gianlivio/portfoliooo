import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/*
 * Gli asset presi da Poly Haven (polyhaven.com, licenza CC0), ridotti per il web e serviti da public/olio/scena:
 *   cielo-tramonto.jpg  ← qwantani_sunset_puresky (HDRI, esposto e ridotto a JPG)
 *   cielo-notte.jpg     ← qwantani_night_puresky
 *   terra-*.webp        ← red_laterite_soil_stones (la terra rossa)
 *   trazzera-*.webp     ← dirt_floor
 *   muretto-*.webp      ← stone_wall (pietra calcarea a secco)
 *   botte.glb           ← wine_barrel_01
 *   masso.glb           ← namaqualand_boulder_05 (pietra chiara, quasi calcare: sassi e massi a scale diverse)
 *   cassetta.glb        ← plastic_crate_02 (la cassetta gialla della raccolta)
 * Le texture si caricano una volta sola e restano in memoria: passare dal giorno alla notte non le riscarica.
 */

const CARTELLA = "/olio/scena/";
const texture = new Map<string, THREE.Texture>();
const modelli = new Map<
  string,
  Promise<{ geometria: THREE.BufferGeometry; materiale: THREE.Material }>
>();

/** Una texture che si ripete; colore = true per le immagini a colori (sRGB), false per i rilievi. */
export function textura(
  nome: string,
  colore: boolean,
  ripeti: [number, number] = [1, 1],
) {
  const chiave = `${nome}|${ripeti.join("x")}`;
  let t = texture.get(chiave);
  if (!t) {
    t = new THREE.TextureLoader().load(CARTELLA + nome);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(ripeti[0], ripeti[1]);
    t.anisotropy = 8;
    if (colore) t.colorSpace = THREE.SRGBColorSpace;
    texture.set(chiave, t);
  }
  return t;
}

/** Il cielo: un'immagine equirettangolare, letta così com'è (senza mipmap, per non vedere la cucitura). */
export function cielo(notte: boolean, pronto: () => void) {
  const nome = notte ? "cielo-notte.jpg" : "cielo-tramonto.jpg";
  const vecchia = texture.get(nome);
  if (vecchia) {
    if (vecchia.image) pronto();
    else vecchia.userData.attese = [...(vecchia.userData.attese ?? []), pronto];
    return vecchia;
  }
  const t = new THREE.TextureLoader().load(CARTELLA + nome, (tx) => {
    pronto();
    (tx.userData.attese as (() => void)[] | undefined)?.forEach((f) => f());
    tx.userData.attese = [];
  });
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  texture.set(nome, t);
  return t;
}

/** Il primo mesh di un modello glb: geometria e materiale, da usare in un InstancedMesh. */
export function modello(nome: string) {
  let m = modelli.get(nome);
  if (!m) {
    m = new GLTFLoader().loadAsync(CARTELLA + nome).then((gltf) => {
      let trovato: THREE.Mesh | null = null;
      gltf.scene.traverse((o) => {
        if (!trovato && (o as THREE.Mesh).isMesh) trovato = o as THREE.Mesh;
      });
      const mesh = trovato as unknown as THREE.Mesh;
      mesh.updateWorldMatrix(true, false);
      // i modelli sono quantizzati (interi normalizzati): prima in virgola mobile, poi la trasformazione del nodo
      const geometria = mesh.geometry.clone();
      for (const [nome, a] of Object.entries(geometria.attributes)) {
        const attr = a as THREE.BufferAttribute;
        if (attr.array instanceof Float32Array) continue;
        const valori = new Float32Array(attr.count * attr.itemSize);
        for (let i = 0; i < attr.count; i++)
          for (let k = 0; k < attr.itemSize; k++)
            valori[i * attr.itemSize + k] = attr.getComponent(i, k);
        geometria.setAttribute(
          nome,
          new THREE.BufferAttribute(valori, attr.itemSize),
        );
      }
      geometria.applyMatrix4(mesh.matrixWorld);
      return { geometria, materiale: mesh.material as THREE.Material };
    });
    modelli.set(nome, m);
  }
  return m;
}
