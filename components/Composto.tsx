"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Principio unico: il testo, sempre composto e leggibile, respira.
 * Scala 1 — il carattere. Ogni lettera oscilla in continuo attorno alla
 * propria posizione, ampiezza minima, con fase e durata proprie derivate
 * in modo deterministico dall'indice e dal codice del carattere.
 * L'animazione gira solo mentre il titolo è in viewport (IntersectionObserver),
 * per non tenere il layer attivo a vuoto fuori schermo. Il testo reale resta
 * nel DOM per lo screen reader; le lettere decorative sono aria-hidden.
 */

function ampiezzaX(indice: number, codice: number): number {
  return (((indice * 31 + codice * 7) % 21) - 10) / 10; // -1.0 .. 1.0 px
}
function ampiezzaY(indice: number, codice: number): number {
  return (((indice * 53 + codice * 11) % 31) - 15) / 10; // -1.5 .. 1.5 px
}
function durata(indice: number, codice: number): number {
  return 8 + ((indice * 17 + codice * 3) % 61) / 10; // 8.0 .. 14.0 s
}
function ritardo(indice: number, codice: number): number {
  return -(((indice * 29 + codice * 13) % 140) / 10); // -13.9 .. 0 s
}

export default function Composto({
  testo,
  tag,
  className = "",
}: {
  testo: string;
  tag: "h1" | "h2";
  className?: string;
}) {
  const rif = useRef<HTMLHeadingElement>(null);

  const lettere = useMemo(
    () =>
      Array.from(testo).map((carattere, indice) => {
        const codice = carattere.charCodeAt(0);
        return {
          carattere: carattere === " " ? " " : carattere,
          indice,
          ax: ampiezzaX(indice, codice),
          ay: ampiezzaY(indice, codice),
          dur: durata(indice, codice),
          rit: ritardo(indice, codice),
        };
      }),
    [testo]
  );

  useEffect(() => {
    const nodo = rif.current;
    if (!nodo) return;

    if (typeof IntersectionObserver === "undefined") {
      nodo.classList.add("in-vista");
      return;
    }

    const osservatore = new IntersectionObserver((voci) => {
      nodo.classList.toggle("in-vista", voci[0].isIntersecting);
    });
    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, []);

  const contenuto = (
    <>
      <span className="solo-schermo">{testo}</span>
      <span className="lettere" aria-hidden="true">
        {lettere.map((l) => (
          <span
            key={l.indice}
            className="lettera"
            style={
              {
                "--ax": `${l.ax}px`,
                "--ay": `${l.ay}px`,
                "--durata": `${l.dur}s`,
                "--ritardo": `${l.rit}s`,
                "--i": l.indice,
              } as React.CSSProperties
            }
          >
            {l.carattere}
          </span>
        ))}
      </span>
    </>
  );

  return tag === "h1" ? (
    <h1 ref={rif} className={className}>
      {contenuto}
    </h1>
  ) : (
    <h2 ref={rif} className={className}>
      {contenuto}
    </h2>
  );
}
