import * as THREE from "three";
import { SOLE } from "../condivisi";
import { type Ospite } from "./comuni";

/**
 * Il sole del giorno, dall'alba al tramonto in sei minuti (la visita comincia a metà mattina).
 * Muove la direzione condivisa SOLE, che il cielo e il marmo leggono, e la luce della scena:
 * bassa e calda all'alba e al tramonto, alta e bianca a mezzogiorno. Le ombre delle carte
 * girano sul marmo come su una meridiana, lunghe la mattina, corte a mezzogiorno, di nuovo lunghe la sera.
 */

const GIORNO = 360;
const INIZIO = 0.2;
const ALZO_MAX = 0.95;
const AZIMUT_ALBA = -1.3;

export class Sole implements Ospite {
  gruppo = new THREE.Group();
  private luce = new THREE.DirectionalLight("#FFF4E4", 1.6);
  private caldo = new THREE.Color("#FFB27A");
  private bianco = new THREE.Color("#FFF6E8");

  constructor() {
    this.gruppo.add(this.luce);
    this.gruppo.add(this.luce.target);
  }

  aggiorna(t: number) {
    const a = (INIZIO + t / GIORNO) % 1;
    const az = AZIMUT_ALBA + a * Math.PI;
    const el = Math.asin(Math.sin(a * Math.PI) * Math.sin(ALZO_MAX));
    SOLE.set(Math.sin(az) * Math.cos(el), Math.max(0.015, Math.sin(el)), -Math.cos(az) * Math.cos(el)).normalize();
    this.luce.position.copy(SOLE).multiplyScalar(30);
    const alto = THREE.MathUtils.smoothstep(SOLE.y, 0.05, 0.5);
    this.luce.color.copy(this.caldo).lerp(this.bianco, alto);
    this.luce.intensity = 0.7 + alto * 1.1;
  }

  libera() {
    this.luce.dispose();
  }
}
