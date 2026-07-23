"use client";

import { useEffect, useRef } from "react";
import archivio from "@/public/dati/archivio.json";

/**
 * Nuvola di punti in tre dimensioni: un punto per contratto.
 * x = anno, y = importo in scala logaritmica, z = profondità.
 *
 * Proiezione prospettica scritta a mano su canvas 2D: nessuna libreria.
 * La scena oscilla invece di ruotare, così l'asse degli anni resta leggibile;
 * il puntatore la inclina di poco. Il ciclo si sospende fuori dallo schermo
 * e con prefers-reduced-motion disegna un fotogramma solo.
 *
 * Sorgente: public/dati/archivio.json — righe [anno, importo, diretto].
 */

type Riga = [number, number, number];

type Punto = {
  x: number; y: number; z: number;
  diretto: boolean;
  daX: number; daY: number; daZ: number;
};

const ANNO_MIN = 2015;
const ANNO_MAX = 2025;

export default function Archivio() {
  const rifTela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tela = rifTela.current;
    if (!tela) return;
    const ctx = tela.getContext("2d");
    if (!ctx) return;

    const fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let punti: Punto[] = [];
    let larghezza = 0;
    let altezza = 0;
    let fotogramma: number | null = null;
    let visibile = true;
    let annullato = false;
    let t0: number | null = null;
    let mx = 0, my = 0, bersaglioX = 0, bersaglioY = 0;

    let seme = 20150101;
    const casuale = () => {
      seme |= 0; seme = (seme + 0x6d2b79f5) | 0;
      let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    function costruisci(righe: Riga[]) {
      const importi = righe.map((r) => Math.log10(Math.max(r[1], 1)));
      const min = Math.min(...importi);
      const max = Math.max(...importi);
      const campo = max - min || 1;

      punti = righe.map((r, i) => {
        const anno = (r[0] - ANNO_MIN) / (ANNO_MAX - ANNO_MIN);
        return {
          x: (anno - 0.5) * 2.3 + (casuale() - 0.5) * 0.13,
          y: ((importi[i] - min) / campo - 0.5) * 1.15,
          z: (casuale() - 0.5) * 0.95,
          diretto: r[2] === 1,
          daX: (casuale() - 0.5) * 3.4,
          daY: (casuale() - 0.5) * 2.4,
          daZ: (casuale() - 0.5) * 3,
        };
      });
    }

    function misura() {
      const r = tela!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      larghezza = r.width;
      altezza = r.height;
      tela!.width = Math.round(larghezza * dpr);
      tela!.height = Math.round(altezza * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const attenua = (x: number) => 1 - Math.pow(1 - x, 3);

    function disegna(ts: number) {
      if (annullato || punti.length === 0) {
        fotogramma = null;
        return;
      }
      if (t0 === null) t0 = ts;
      const trascorso = (ts - t0) / 1000;

      const montaggio = fermo ? 1 : Math.min(trascorso / 1.4, 1);
      const k = attenua(montaggio);

      const oscillazione = fermo ? 0 : Math.sin(trascorso * 0.32) * 0.3;
      mx += (bersaglioX - mx) * 0.06;
      my += (bersaglioY - my) * 0.06;

      const ry = oscillazione + mx;
      const rx = -0.16 + my;
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cx = Math.cos(rx), sx = Math.sin(rx);

      ctx!.clearRect(0, 0, larghezza, altezza);

      const scala = Math.min(larghezza, altezza * 1.9) * 0.42;
      const ox = larghezza / 2;
      const oy = altezza / 2;
      const fov = 3.4;

      for (const p of punti) {
        const px = p.daX + (p.x - p.daX) * k;
        const py = p.daY + (p.y - p.daY) * k;
        const pz = p.daZ + (p.z - p.daZ) * k;

        const x1 = px * cy - pz * sy;
        const z1 = px * sy + pz * cy;
        const y1 = py * cx - z1 * sx;
        const z2 = py * sx + z1 * cx;

        const d = fov / (fov + z2);
        const X = ox + x1 * scala * d;
        const Y = oy - y1 * scala * d;

        const a = (0.2 + d * 0.55) * (0.35 + k * 0.65);
        ctx!.fillStyle = p.diretto
          ? `rgba(27,63,209,${a.toFixed(3)})`
          : `rgba(120,120,112,${(a * 0.72).toFixed(3)})`;

        const r = d * 1.35;
        ctx!.fillRect(X - r / 2, Y - r / 2, r, r);
      }

      if (fermo) { fotogramma = null; return; }
      fotogramma = visibile ? requestAnimationFrame(disegna) : null;
    }

    function avvia() {
      if (fotogramma === null && !annullato) {
        fotogramma = requestAnimationFrame(disegna);
      }
    }

    const suPuntatore = (e: PointerEvent) => {
      const r = tela.getBoundingClientRect();
      bersaglioX = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
      bersaglioY = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
    };
    const suUscita = () => { bersaglioX = 0; bersaglioY = 0; };

    misura();
    window.addEventListener("resize", misura);
    tela.addEventListener("pointermove", suPuntatore);
    tela.addEventListener("pointerleave", suUscita);

    const osservatore = new IntersectionObserver((voci) => {
      visibile = voci[0].isIntersecting;
      if (visibile) avvia();
    });
    osservatore.observe(tela);

    costruisci(archivio.punti as Riga[]);
    avvia();

    return () => {
      annullato = true;
      if (fotogramma !== null) cancelAnimationFrame(fotogramma);
      osservatore.disconnect();
      window.removeEventListener("resize", misura);
      tela.removeEventListener("pointermove", suPuntatore);
      tela.removeEventListener("pointerleave", suUscita);
    };
  }, []);

  return (
    <div className="tela-contenitore">
      <canvas
        ref={rifTela}
        className="tela"
        role="img"
        aria-label="Nuvola di punti: i contratti pubblici per l'accoglienza dal 2015 al 2025, distribuiti per anno e per importo."
      />
    </div>
  );
}
