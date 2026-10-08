import * as THREE from "three";

/** Quota del pavimento (acqua di notte, marmo di giorno). */
export const PELO_ACQUA = -1.22;

/**
 * Le gocce cadute sull'acqua: le scrive Fauna, le legge lo shader dell'acqua.
 * Per ognuna: x, z, istante dell'impatto (sull'orologio della scena), forza (0 = libera).
 */
export const MAX_GOCCE = 4;
export const gocce: THREE.Vector4[] = Array.from({ length: MAX_GOCCE }, () => new THREE.Vector4(0, 0, -100, 0));
