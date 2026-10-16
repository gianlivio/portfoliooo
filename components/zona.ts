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

/** Posti sull'anello: uno per lavoro, più l'ultimo per la zona. */
export const POSTI = lavori.length + 1;
export const POSTO_ZONA = lavori.length;
export const ANGOLO_ZONA = (POSTO_ZONA / POSTI) * Math.PI * 2;
export const RAGGIO_ZONA = 5.05;
export const SCALA_ZONA = 0.55;

/** Le cose della zona, in coordinate della scrivania (x di lato, y in alto, z verso fuori). */
export const POSIZIONI = {
  /** la cassettiera col cassetto aperto, accanto alla sedia, dalla parte di chi guarda */
  cassetto: new THREE.Vector3(1.22, 0, 0.18),
  /** il tavolino delle macchine del suono: a destra (per chi guarda) oltre la mensola, contro la stessa parete */
  studio: new THREE.Vector3(-2.35, 0, 0.66),
  /** il pannello di legno a cui sono appese la mensola e lo schiacciasogni */
  pannello: new THREE.Vector3(-1.32, 0, 0.92),
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
