import * as THREE from "three";
import { lavori } from "@/content/lavori";
import { PELO_ACQUA } from "./condivisi";

/**
 * La zona dello sviluppatore: il posto sull'anello che prima era della carta "Scrivimi".
 * Lì stanno la scrivania, il cassetto aperto (il modulo di contatto),
 * la mensola coi libri, lo schiacciasogni e il tavolino delle macchine del suono. Tutto è misurato nelle unità della scrivania
 * (circa metri), poi scalato di SCALA_ZONA e messo al suo posto sull'anello, rivolto verso fuori:
 * lo sviluppatore dà le spalle a chi guarda. In queste coordinate +z va verso fuori, −z verso il centro.
 */

/** Posti sull'anello: uno per lavoro, poi la zona, poi l'ingresso dell'uliveto. */
export const POSTI = lavori.length + 2;
export const POSTO_ZONA = lavori.length;
export const POSTO_ULIVETO = lavori.length + 1;
/** L'angolo fra due posti vicini. */
export const PASSO = (Math.PI * 2) / POSTI;
export const ANGOLO_ZONA = POSTO_ZONA * PASSO;
export const ANGOLO_ULIVETO = POSTO_ULIVETO * PASSO;
export const RAGGIO_ZONA = 5.45;
export const SCALA_ZONA = 0.55;

/** Le cose della zona, in coordinate della scrivania (x di lato, y in alto, z verso fuori). */
export const POSIZIONI = {
  /** la cassettiera col cassetto aperto, accanto alla sedia, dalla parte di chi guarda */
  cassetto: new THREE.Vector3(1.22, 0, 0.18),
  /** lo studietto delle macchine del suono, a due piani: a destra (per chi guarda) della scrivania */
  studio: new THREE.Vector3(-1.75, 0, 0.7),
  /** la libreria bianca dietro lo studietto: in cima stanno i tre libri */
  pannello: new THREE.Vector3(-2.35, 0, 1.45),
};

/** Mette una zona-gruppo al suo posto sull'anello. */
export function collocaZona(g: THREE.Object3D) {
  const a = ANGOLO_ZONA;
  g.position.set(Math.sin(a) * RAGGIO_ZONA, PELO_ACQUA, -Math.cos(a) * RAGGIO_ZONA);
  g.rotation.set(0, Math.PI - a, 0);
  g.scale.setScalar(SCALA_ZONA);
}

/** Da coordinate della scrivania a coordinate del mondo. */
export function nelMondo(locale: THREE.Vector3, out = new THREE.Vector3()) {
  const a = ANGOLO_ZONA;
  const r = Math.PI - a;
  const x = locale.x * SCALA_ZONA, z = locale.z * SCALA_ZONA;
  return out.set(
    Math.sin(a) * RAGGIO_ZONA + x * Math.cos(r) + z * Math.sin(r),
    PELO_ACQUA + locale.y * SCALA_ZONA,
    -Math.cos(a) * RAGGIO_ZONA - x * Math.sin(r) + z * Math.cos(r)
  );
}
