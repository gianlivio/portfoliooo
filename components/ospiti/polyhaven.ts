import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/*
 * Gli asset presi da Poly Haven (polyhaven.com, licenza CC0), ridotti per il web e serviti da public/olio/scena:
 *   cielo-tramonto.jpg  ← qwantani_sunset_puresky (HDRI, esposto e ridotto a JPG)
 *   cielo-notte.jpg     ← qwantani_night_puresky
 *   terra-*.webp        ← red_laterite_soil_stones (la terra rossa)
 *   trazzera-*.webp     ← dirt_floor
 *   muretto-*.webp      ← stone_wall (pietra calcarea a secco)
 *   corteccia-*.webp    ← bark_willow_02 (grigia e fessurata, come quella dell'ulivo)
 *   fronde-*.webp       ← forest_leaves_02 (ne resta solo la grana, sul verde argento delle chiome)
 *   legno-*.webp        ← rough_wood (pali, scala, cornici, tettoia)
 *   coppi-*.webp        ← clay_roof_tiles_02
 *   vasca-*.webp        ← old_sandstone_02
 *   macina-*.webp       ← sandstone_cracks
 *   botte.glb           ← wine_barrel_01
 *   masso.glb           ← namaqualand_boulder_05 (pietra chiara, quasi calcare: sassi e massi a scale diverse)
 *   cassetta.glb        ← plastic_crate_02 (la cassetta gialla della raccolta)
 *   erba.glb            ← grass_medium_02, un ciuffo solo, col colore "secco" e il suo canale alfa
 * Le texture si caricano una volta sola e restano in memoria: passare dal giorno alla notte non le riscarica.
 */

const CARTELLA = "/olio/scena/";
const texture = new Map<string, THREE.Texture>();
const modelli = new Map<string, Promise<{ geometria: THREE.BufferGeometry; materiale: THREE.Material }>>();

/** Una texture che si ripete; colore = true per le immagini a colori (sRGB), false per i rilievi. */
export function textura(nome: string, colore: boolean, ripeti: [number, number] = [1, 1]) {
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

/**
 * La grana di una foto su una geometria senza coordinate di texture (gli ulivi): proiettata dai tre assi
 * nello spazio dell'oggetto, così resta attaccata all'albero anche nelle copie. Della foto si usa solo la
 * luminosità, divisa per la sua media: il colore resta quello del materiale (o dei vertici, di notte),
 * la foto ci aggiunge le fessure della corteccia o il folto delle foglie.
 *   scala: quante ripetizioni per unità; forza: 0 nessuna grana, 1 tutta; media: luminosità media della foto.
 */
export function triplanare<M extends THREE.MeshLambertMaterial | THREE.MeshBasicMaterial>(mat: M, mappa: THREE.Texture, scala: number, forza: number, media: number) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTriMappa = { value: mappa };
    s.uniforms.uTriScala = { value: scala };
    s.uniforms.uTriForza = { value: forza };
    s.uniforms.uTriMedia = { value: media };
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNor;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTriPos = position;\nvTriNor = normal;");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNor;\nuniform sampler2D uTriMappa;\nuniform float uTriScala;\nuniform float uTriForza;\nuniform float uTriMedia;"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          vec3 w = pow(abs(normalize(vTriNor)), vec3(4.0));
          w /= (w.x + w.y + w.z);
          vec3 p = vTriPos * uTriScala;
          vec3 c = texture2D(uTriMappa, p.zy).rgb * w.x + texture2D(uTriMappa, p.xz).rgb * w.y + texture2D(uTriMappa, p.xy).rgb * w.z;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722)) / uTriMedia;
          diffuseColor.rgb *= mix(1.0, l, uTriForza);
        }`
      );
  };
  mat.customProgramCacheKey = () => `triplanare-${mappa.uuid}-${scala}-${forza}`;
  return mat;
}

/** La rete per le olive: maglia verde fitta, un poco trasparente, disegnata su tela. */
export function rete() {
  const chiave = "rete";
  const vecchia = texture.get(chiave);
  if (vecchia) return vecchia;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  x.fillStyle = "rgba(40,92,52,0.42)";
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "rgba(70,140,80,0.95)";
  x.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 128);
    x.moveTo(0, i);
    x.lineTo(128, i);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texture.set(chiave, t);
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
        for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) valori[i * attr.itemSize + k] = attr.getComponent(i, k);
        geometria.setAttribute(nome, new THREE.BufferAttribute(valori, attr.itemSize));
      }
      geometria.applyMatrix4(mesh.matrixWorld);
      return { geometria, materiale: mesh.material as THREE.Material };
    });
    modelli.set(nome, m);
  }
  return m;
}
