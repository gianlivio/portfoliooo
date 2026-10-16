"use client";

import { useEffect, useState } from "react";

/**
 * L'avvio, mentre il mondo si prepara: l'anello visto dall'alto, dodici carte e un punto (la zona dello
 * sviluppatore) che si accendono a turno girando piano; sotto il nome e una riga che respira.
 * Quando la scena è pronta l'anello si apre verso chi guarda, come se ci si entrasse, e svanisce.
 * Resta almeno un attimo, perché non lampeggi; con "riduci movimento" niente giro, solo dissolvenza.
 */
const CARTE = 12;
const MINIMO = 1700;
const USCITA = 1100;

export default function Avvio({ pronta, nome, testo }: { pronta: boolean; nome: string; testo: string }) {
  const [minimo, setMinimo] = useState(false);
  const [via, setVia] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinimo(true), MINIMO);
    return () => clearTimeout(t);
  }, []);
  const chiude = pronta && minimo;
  useEffect(() => {
    if (!chiude) return;
    const t = setTimeout(() => setVia(true), USCITA);
    return () => clearTimeout(t);
  }, [chiude]);
  if (via) return null;
  const passo = 360 / (CARTE + 1);
  return (
    <div className={`avvio${chiude ? " avvio--chiude" : ""}`} aria-hidden="true">
      <svg className="avvio-anello" viewBox="-100 -100 200 200">
        <circle className="avvio-orbita" r="70" />
        {Array.from({ length: CARTE }, (_, i) => (
          <rect
            key={i}
            className="avvio-carta"
            x="-9"
            y="-74"
            width="18"
            height="7"
            rx="1.5"
            transform={`rotate(${i * passo})`}
            style={{ animationDelay: `${(i * 2.6) / (CARTE + 1)}s` }}
          />
        ))}
        <circle
          className="avvio-zona"
          cx="0"
          cy="-70.5"
          r="4.2"
          transform={`rotate(${CARTE * passo})`}
          style={{ animationDelay: `${(CARTE * 2.6) / (CARTE + 1)}s` }}
        />
        <circle className="avvio-centro" r="2.2" />
      </svg>
      <p className="avvio-nome">{nome}</p>
      <p className="avvio-testo">
        {testo}
        <span className="avvio-punti" />
      </p>
    </div>
  );
}
