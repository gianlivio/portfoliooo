import * as THREE from "three";

/** Quota del pavimento (acqua di notte, marmo di giorno). */
export const PELO_ACQUA = -1.22;

/**
 * La scia di chi nuota: la scrive il coccodrillo, la legge l'acqua.
 * pos e dir sul piano xz; forza 0–1 (0 = nessuna scia).
 */
export const scia = { pos: new THREE.Vector2(), dir: new THREE.Vector2(1, 0), forza: 0 };
