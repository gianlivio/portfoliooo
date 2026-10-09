import * as THREE from "three";

/** Quota del pavimento (acqua di notte, marmo di giorno). */
export const PELO_ACQUA = -1.22;

/**
 * Le gocce cadute sull'acqua: le scrive Fauna, le legge lo shader dell'acqua.
 * Le prime quattro sono della pioggia, le altre dei remi della nave.
 * Per ognuna: x, z, istante dell'impatto (sull'orologio della scena), forza (0 = libera).
 */
export const MAX_GOCCE = 8;
export const gocce: THREE.Vector4[] = Array.from({ length: MAX_GOCCE }, () => new THREE.Vector4(0, 0, -100, 0));

/**
 * Il sole del giorno: basso, da dietro a destra rispetto allo sguardo iniziale,
 * come in un tardo pomeriggio d'ottobre. Direzione verso il sole (vettore unitario).
 * Lo usano il cielo, il marmo (per le ombre delle carte) e la luce della scena.
 */
const ALZO = 0.2;
const AZIMUT = 2.3;
export const SOLE = new THREE.Vector3(
  Math.sin(AZIMUT) * Math.cos(ALZO),
  Math.sin(ALZO),
  -Math.cos(AZIMUT) * Math.cos(ALZO)
).normalize();
