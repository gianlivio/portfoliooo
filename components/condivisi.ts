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
 * Il sole del giorno: direzione verso il sole (vettore unitario), condivisa e viva.
 * La muove Sole (in ospiti/sole.ts) dall'alba al tramonto; la leggono il cielo,
 * il marmo (per le ombre delle carte) e la luce della scena.
 */
export const SOLE = new THREE.Vector3(0.6, 0.35, 0.7).normalize();

/**
 * Lo stato del mondo che più parti devono conoscere: lo scrive chi lo sa, lo legge chi serve.
 * modulo: il modulo di contatto è aperto (Romero alza la testa).
 * ridotto: "riduci movimento" è attivo.
 * battito: il tempo del loop della drum machine (attivo solo a loop acceso); fase 0–1 dentro la battuta
 * da un quarto, n = numero del quarto dall'avvio del loop.
 */
export const mondo = {
  modulo: false,
  ridotto: false,
  battito: { attivo: false, fase: 0, n: 0 },
};

/** Il tempo del mondo, anche a loop spento: la festa sul galeone balla comunque a 130 BPM. */
export const BPM = 130;

/** Dov'è la tartaruga, perché il robot la possa incrociare. */
export const tartaruga = { attiva: false, pos: new THREE.Vector3(), rotta: 0 };

/** Dov'è lo pterodattilo, perché il jet gli possa volare accanto. */
export const pterodattilo = { attivo: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), fine: 0 };
