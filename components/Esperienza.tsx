"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { lavori, ID_CONTATTO } from "@/content/lavori";
import { curriculum } from "@/content/collegamenti";
import schermate from "@/content/schermate.json";
import type { Carta } from "./Scena";
import Modulo from "./Modulo";

const Scena = dynamic(() => import("./Scena"), { ssr: false });

function supportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Esperienza({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [modulo, setModulo] = useState(false);
  const [mosso, setMosso] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [ambiente, setAmbiente] = useState<{
    webgl: boolean; ridotto: boolean; stretto: boolean; tocco: boolean;
  } | null>(null);

  useEffect(() => {
    const leggi = () =>
      setAmbiente({
        webgl: supportaWebGL(),
        ridotto: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        stretto: window.innerWidth < 760,
        tocco: window.matchMedia("(pointer: coarse)").matches,
      });
    const primo = requestAnimationFrame(leggi);
    let attesa: ReturnType<typeof setTimeout>;
    const ridim = () => {
      clearTimeout(attesa);
      attesa = setTimeout(leggi, 250);
    };
    window.addEventListener("resize", ridim);
    return () => {
      cancelAnimationFrame(primo);
      window.removeEventListener("resize", ridim);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("con-scena", !!ambiente?.webgl);
  }, [ambiente?.webgl]);

  const carte = useMemo<Carta[]>(() => {
    const totale = lavori.length;
    const elenco: Carta[] = lavori.map((l, i) => {
      const t = d.lavori[l.id as keyof typeof d.lavori];
      return {
        id: l.id,
        immagine: (schermate as string[]).includes(l.id) ? `/lavori/${l.id}.jpg` : null,
        dati: {
          numero: String(i + 1).padStart(2, "0"),
          tipo: t.tipo,
          titolo: t.titolo,
          dominio: l.link ? `↗ ${l.link.etichetta}` : `— ${d.vignetta.senzaLink}`,
          anno: l.anno,
          tinta: l.tinta,
          motivo: l.motivo,
          contatto: false,
        },
      };
    });
    elenco.push({
      id: ID_CONTATTO,
      immagine: null,
      dati: {
        numero: String(totale + 1).padStart(2, "0"),
        tipo: d.contatto.tipo,
        titolo: d.contatto.titolo,
        dominio: d.contatto.riga,
        anno: "",
        tinta: "",
        motivo: "testo",
        contatto: true,
      },
    });
    return elenco;
  }, [d]);

  const seleziona = useCallback((id: string | null) => {
    if (id === ID_CONTATTO) {
      setSelezionato(null);
      setModulo(true);
      setMosso(true);
      return;
    }
    setSelezionato(id);
    if (id) setMosso(true);
  }, []);

  const interagisci = useCallback(() => setMosso(true), []);
  const chiudiModulo = useCallback(() => setModulo(false), []);

  const indice = selezionato ? lavori.findIndex((l) => l.id === selezionato) : -1;
  const vai = useCallback(
    (passo: number) => {
      if (indice < 0) return;
      const n = lavori.length;
      setSelezionato(lavori[(indice + passo + n) % n].id);
    },
    [indice]
  );

  useEffect(() => {
    if (!selezionato) return;
    const tasti = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelezionato(null);
      if (e.key === "ArrowRight") vai(1);
      if (e.key === "ArrowLeft") vai(-1);
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, [selezionato, vai]);

  if (!ambiente || !ambiente.webgl) {
    // senza WebGL resta l'elenco in HTML della pagina, più il modulo
    return ambiente ? (
      <>
        <button className="scrivimi scrivimi--fisso" onClick={() => setModulo(true)}>
          {d.testata.scrivimi}
        </button>
        {modulo && <Modulo d={d} lingua={lingua} onChiudi={chiudiModulo} />}
      </>
    ) : null;
  }

  const lavoro = indice >= 0 ? lavori[indice] : null;
  const testi = lavoro ? d.lavori[lavoro.id as keyof typeof d.lavori] : null;

  return (
    <div className={`esperienza${pronta ? " esperienza--pronta" : ""}${selezionato ? " esperienza--aperta" : ""}`}>
      <Scena
        key={`${lingua}-${ambiente.stretto}`}
        carte={carte}
        selezionato={selezionato}
        onSeleziona={seleziona}
        onInteragisci={interagisci}
        onPronta={() => setPronta(true)}
        ridotto={ambiente.ridotto}
        stretto={ambiente.stretto}
      />

      <header className="testata">
        <div className="firma">
          <p className="firma-nome">{d.nome}</p>
          <p className="firma-ruolo">{d.ruolo}</p>
        </div>
        <nav className="comandi" aria-label={d.testata.lingua}>
          {lingue.map((l) => (
            <Link
              key={l}
              href={`/${l}`}
              hrefLang={l}
              aria-current={l === lingua ? "true" : undefined}
            >
              {l.toUpperCase()}
            </Link>
          ))}
          <a className="cv" href={curriculum[lingua]} download>
            {d.testata.cv} ↓
          </a>
        </nav>
      </header>

      <p className={`guida${mosso ? " guida--via" : ""}`} aria-hidden="true">
        {ambiente.tocco ? d.guida.tocco : d.guida.mouse}
      </p>

      <button className="scrivimi" onClick={() => setModulo(true)}>
        {d.testata.scrivimi}
      </button>

      {lavoro && testi && (
        <aside className="vignetta" aria-live="polite" key={lavoro.id}>
          <p className="vignetta-occhiello">
            {String(indice + 1).padStart(2, "0")} / {String(lavori.length).padStart(2, "0")} ·{" "}
            {testi.tipo}
          </p>
          <h2 className="vignetta-titolo">{testi.titolo}</h2>
          <p className="vignetta-riga">{testi.riga}</p>
          {lavoro.anno && <p className="vignetta-anno">{lavoro.anno}</p>}
          <div className="vignetta-azioni">
            {lavoro.link ? (
              <a className="visita" href={lavoro.link.href} target="_blank" rel="noopener">
                {d.vignetta.visita} ↗
              </a>
            ) : (
              <span className="senza-link">{d.vignetta.senzaLink}</span>
            )}
            <span className="frecce">
              <button onClick={() => vai(-1)} aria-label={d.vignetta.precedente}>
                ←
              </button>
              <button onClick={() => vai(1)} aria-label={d.vignetta.successivo}>
                →
              </button>
            </span>
          </div>
          <button className="chiudi" onClick={() => setSelezionato(null)} aria-label={d.vignetta.chiudi}>
            ×
          </button>
        </aside>
      )}

      {modulo && <Modulo d={d} lingua={lingua} onChiudi={chiudiModulo} />}
    </div>
  );
}
