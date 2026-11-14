import * as THREE from "three";
import { PELO_ACQUA } from "./condivisi";

/**
 * La zona dello sviluppatore: il posto sull'anello che prima era della carta "Scrivimi".
 * Lì stanno la scrivania, il cassetto aperto (il modulo di contatto),
 * la mensola coi libri, lo schiacciasogni e il tavolino delle macchine del suono. Tutto è misurato nelle unità della scrivania
 * (circa metri), poi scalato di SCALA_ZONA e messo al suo posto sull'anello, rivolto verso fuori:
 * lo sviluppatore dà le spalle a chi guarda. In queste coordinate +z va verso fuori, −z verso il centro.
 */

/**
 * Le direzioni della scena si contano in passi: quattordici per giro, i posti dell'anello di carte con cui
 * il paesaggio è stato disegnato. Il numero è fisso: i lavori hanno ciascuno il suo posto (content/lavori.ts),
 * e aggiungerne uno non fa più ruotare il paesaggio.
 */
export const POSTI = 14;
export const POSTO_ZONA = 12;
export const POSTO_ULIVETO = 5;
/** L'angolo fra due posti vicini. */
export const PASSO = (Math.PI * 2) / POSTI;
export const ANGOLO_ZONA = POSTO_ZONA * PASSO;
export const ANGOLO_ULIVETO = POSTO_ULIVETO * PASSO;
export const RAGGIO_ZONA = 5.45;
export const SCALA_ZONA = 0.55;
/** Il cancello dell'uliveto: più indietro dei lavori vicini. */
export const RAGGIO_ULIVETO = 7.6;

/** Le cose della zona, in coordinate della scrivania (x di lato, y in alto, z verso fuori). */
export const POSIZIONI = {
  /** la cassettiera col cassetto aperto, accanto alla sedia, dalla parte di chi guarda */
  cassetto: new THREE.Vector3(1.22, 0, 0.18),
  /** lo studietto delle macchine del suono, a due piani: a destra (per chi guarda) della scrivania */
  // davanti alla libreria bianca: dietro il musicista olografico c'è un fondo chiaro
  studio: new THREE.Vector3(-2.25, 0, 0.7),
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
