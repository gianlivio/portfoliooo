"use client";

import { useEffect, useState } from "react";
import { suono } from "./audio";

type Testi = { volume: string; posizione: string; prima: string; dopo: string };

const minuti = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Il lettore del pezzo: compare in basso a sinistra quando suona la musica di Juan Lee.
 * Il titolo, il pezzo prima e quello dopo, il cursore per spostarsi nel brano, il volume.
 */
export default function Lettore({ testi }: { testi: Testi }) {
  const leggi = () => {
    const p = suono.pezzo();
    const pos = suono.posizione();
    return p && pos ? { titolo: p.titolo, artista: p.artista, t: pos.t, durata: pos.durata } : null;
  };
  const [stato, setStato] = useState(leggi);
  const [volume, setVolume] = useState(() => suono.volume());
  // mentre si trascina il cursore del brano, il tempo segue la mano e non il pezzo
  const [tiene, setTiene] = useState<number | null>(null);

  useEffect(() => {
    const giro = setInterval(() => setStato(leggi()), 250);
    return () => clearInterval(giro);
  }, []);

  if (!stato) return null;
  const t = tiene ?? stato.t;
  return (
    <div className="lettore" role="group" aria-label={`${stato.artista} — ${stato.titolo}`}>
      <div className="lettore-riga">
        <button className="lettore-tasto" onClick={() => suono.cambiaBrano(-1)} aria-label={testi.prima} title={testi.prima}>
          ‹
        </button>
        <p className="lettore-titolo">
          <span>{stato.artista}</span> {stato.titolo}
        </p>
        <button className="lettore-tasto" onClick={() => suono.cambiaBrano(1)} aria-label={testi.dopo} title={testi.dopo}>
          ›
        </button>
      </div>
      <div className="lettore-riga">
        <span className="lettore-tempo">{minuti(t)}</span>
        <input
          className="lettore-cursore"
          type="range"
          min={0}
          max={Math.floor(stato.durata)}
          step={1}
          value={Math.floor(t)}
          aria-label={testi.posizione}
          aria-valuetext={`${minuti(t)} / ${minuti(stato.durata)}`}
          onChange={(e) => setTiene(Number(e.target.value))}
          onPointerUp={(e) => {
            suono.cerca(Number((e.target as HTMLInputElement).value));
            setTiene(null);
          }}
          onKeyUp={(e) => {
            suono.cerca(Number((e.target as HTMLInputElement).value));
            setTiene(null);
          }}
        />
        <span className="lettore-tempo">{minuti(stato.durata)}</span>
      </div>
      <div className="lettore-riga">
        <span className="lettore-etichetta" aria-hidden="true">
          {testi.volume}
        </span>
        <input
          className="lettore-cursore"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label={testi.volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            suono.setVolume(v);
          }}
        />
      </div>
    </div>
  );
}
