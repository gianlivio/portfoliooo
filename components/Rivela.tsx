"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rende visibile il contenuto quando entra nello schermo.
 * Un solo osservatore per istanza, che si stacca dopo il primo passaggio.
 */
export default function Rivela({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rif = useRef<HTMLElement>(null);
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    const nodo = rif.current;
    if (!nodo) return;

    const osservatore = new IntersectionObserver(
      (voci) => {
        if (voci[0].isIntersecting) {
          setDentro(true);
          osservatore.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );

    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, []);

  return (
    <section
      ref={rif}
      className={`${className} rivela${dentro ? " rivela--dentro" : ""}`}
    >
      {children}
    </section>
  );
}
