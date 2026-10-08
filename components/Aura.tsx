"use client";

import { useEffect, useRef } from "react";
import { schermoPortale } from "./Portale";

/**
 * L'energia che esce dal portale quando si apre il modulo.
 * Prima un flusso che corre dal portale ai bordi del modulo, poi resta lì intorno:
 * di giorno lingue di fiamma corallo che salgono dai bordi,
 * di notte un vapore azzurro e viola che evapora lento.
 * Solo decorazione: canvas 2D dietro il modulo, invisibile agli screen reader.
 */

type Particella = {
  x: number; y: number; vx: number; vy: number;
  da: { x: number; y: number }; a: { x: number; y: number };
  vita: number; durata: number; r: number; volo: boolean; seme: number;
};

const FIAMMA = ["#FFE08A", "#FFB45C", "#FF7A4D", "#F0473F", "#B9283A"];
const VAPORE = ["#8FB0FF", "#6E7BFF", "#9A6BFF", "#4FD1C5"];

/** Una pallina sfumata per colore, disegnata una volta e poi riusata. */
function sprite(colore: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, colore);
    g.addColorStop(0.45, colore + "88");
    g.addColorStop(1, colore + "00");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
  return c;
}

/** Un punto a caso sul perimetro del rettangolo, con la normale verso l'esterno. */
function sulBordo(r: DOMRect) {
  const giro = 2 * (r.width + r.height);
  let d = Math.random() * giro;
  if (d < r.width) return { x: r.left + d, y: r.top, nx: 0, ny: -1 };
  d -= r.width;
  if (d < r.height) return { x: r.right, y: r.top + d, nx: 1, ny: 0 };
  d -= r.height;
  if (d < r.width) return { x: r.right - d, y: r.bottom, nx: 0, ny: 1 };
  d -= r.width;
  return { x: r.left, y: r.bottom - d, nx: -1, ny: 0 };
}

export default function Aura({ bersaglio }: { bersaglio: React.RefObject<HTMLElement | null> }) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = tela.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const giorno = document.documentElement.dataset.tema === "chiaro";
    const colori = (giorno ? FIAMMA : VAPORE).map(sprite);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ridim = () => {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ridim();
    window.addEventListener("resize", ridim);

    // il flusso parte dal portale se è in vista, altrimenti dal basso
    const origine = schermoPortale.visibile
      ? { x: (schermoPortale.x * 0.5 + 0.5) * innerWidth, y: (-schermoPortale.y * 0.5 + 0.5) * innerHeight }
      : { x: innerWidth * 0.5, y: innerHeight * 1.05 };

    const part: Particella[] = [];
    const t0 = performance.now();
    let prima = t0;
    let fotogramma = 0;
    const stretto = innerWidth < 760;
    const tetto = stretto ? 420 : 900;
    const debito = { flusso: 0, bordo: 0 };

    const ciclo = (ora: number) => {
      fotogramma = requestAnimationFrame(ciclo);
      const dt = Math.min((ora - prima) / 1000, 0.05);
      prima = ora;
      const e = (ora - t0) / 1000;
      const r = bersaglio.current?.getBoundingClientRect();
      if (!r) return;

      // 1. il flusso: per poco più di un secondo l'energia corre dal portale ai bordi
      // le quantità sono per secondo, così l'effetto non dipende dalla velocità del computer
      debito.flusso += dt * (stretto ? 220 : 420);
      debito.bordo += dt * (giorno ? (stretto ? 140 : 300) : stretto ? 45 : 90);
      if (e < 1.15) {
        for (; debito.flusso >= 1; debito.flusso--) {
          const b = sulBordo(r);
          part.push({
            x: origine.x, y: origine.y, vx: 0, vy: 0,
            da: { x: origine.x + (Math.random() - 0.5) * 30, y: origine.y + (Math.random() - 0.5) * 30 },
            a: { x: b.x, y: b.y },
            vita: 0, durata: 0.55 + Math.random() * 0.55, r: 6 + Math.random() * 8, volo: true, seme: Math.random() * 10,
          });
        }
      }
      // 2. poi resta intorno al modulo
      if (e >= 1.15) debito.flusso = 0;
      if (e < 0.55 || part.length >= tetto) debito.bordo = 0;
      if (e > 0.55 && part.length < tetto) {
        for (; debito.bordo >= 1; debito.bordo--) {
          const b = sulBordo(r);
          part.push(
            giorno
              ? {
                  x: b.x + b.nx * 4, y: b.y + b.ny * 4,
                  vx: b.nx * (14 + Math.random() * 18), vy: -(38 + Math.random() * 70) + b.ny * 12,
                  da: b, a: b, vita: 0, durata: 0.7 + Math.random() * 0.9,
                  r: 12 + Math.random() * 20, volo: false, seme: Math.random() * 10,
                }
              : {
                  x: b.x + b.nx * 6, y: b.y + b.ny * 6,
                  vx: b.nx * (6 + Math.random() * 14), vy: b.ny * (6 + Math.random() * 14) - 7,
                  da: b, a: b, vita: 0, durata: 2.4 + Math.random() * 2.8,
                  r: 22 + Math.random() * 38, volo: false, seme: Math.random() * 10,
                }
          );
        }
      }

      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = giorno ? "source-over" : "lighter";

      for (let i = part.length - 1; i >= 0; i--) {
        const p = part[i];
        p.vita += dt;
        const a = p.vita / p.durata;
        if (a >= 1) {
          part.splice(i, 1);
          continue;
        }
        let alfa: number;
        let raggio = p.r;
        let tinta: HTMLCanvasElement;
        if (p.volo) {
          // corsa curva dal portale al bordo, con un'ondulazione laterale
          const k = 1 - Math.pow(1 - a, 3);
          const dx = p.a.x - p.da.x;
          const dy = p.a.y - p.da.y;
          const ond = Math.sin(a * Math.PI) * 60 * Math.sin(p.seme);
          p.x = p.da.x + dx * k - (dy / Math.hypot(dx, dy || 1)) * ond;
          p.y = p.da.y + dy * k + (dx / Math.hypot(dx, dy || 1)) * ond;
          alfa = Math.sin(a * Math.PI) * (giorno ? 0.8 : 0.5);
          tinta = colori[Math.floor(p.seme) % colori.length];
        } else if (giorno) {
          // fiamma: sale, tremola, si stringe, vira dal giallo al rosso
          p.vx += Math.sin(p.vita * 9 + p.seme) * 60 * dt;
          p.vy -= 30 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          raggio = p.r * (1 - a * 0.7);
          alfa = Math.pow(1 - a, 1.2) * 0.75;
          tinta = colori[Math.min(colori.length - 1, Math.floor(a * colori.length))];
        } else {
          // vapore: deriva lenta, si allarga, sbiadisce
          p.vx += Math.sin(p.y * 0.012 + e * 0.6 + p.seme) * 9 * dt;
          p.vy += Math.cos(p.x * 0.012 + e * 0.5 + p.seme) * 9 * dt - 2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          raggio = p.r * (1 + a * 1.3);
          alfa = Math.sin(a * Math.PI) * 0.3;
          tinta = colori[Math.floor(p.seme) % colori.length];
        }
        ctx.globalAlpha = alfa;
        ctx.drawImage(tinta, p.x - raggio, p.y - raggio, raggio * 2, raggio * 2);
      }
      ctx.globalAlpha = 1;
    };
    fotogramma = requestAnimationFrame(ciclo);

    return () => {
      cancelAnimationFrame(fotogramma);
      window.removeEventListener("resize", ridim);
    };
  }, [bersaglio]);

  return <canvas ref={tela} className="aura" aria-hidden="true" />;
}
