"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { lavori, ID_CONTATTO } from "@/content/lavori";
import { frammenti } from "@/content/frammenti";
import { curriculum } from "@/content/collegamenti";
import schermate from "@/content/schermate.json";
import type { Carta, Tema } from "./Scena";
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

type Ambiente = { webgl: boolean; ridotto: boolean; stretto: boolean; tocco: boolean };

export default function Esperienza({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [focale, setFocale] = useState<number | null>(null);
  const [modulo, setModulo] = useState(false);
  const [mosso, setMosso] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  const [tema, setTema] = useState<Tema>("scuro");
  const [montaggi, setMontaggi] = useState(0);
  const palco = useRef<HTMLDivElement>(null);
  const titoloVignetta = useRef<HTMLHeadingElement>(null);
  const daTastiera = useRef(false);

  useEffect(() => {
    const leggi = () => {
      setAmbiente({
        webgl: supportaWebGL(),
        ridotto: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        stretto: window.innerWidth < 760,
        tocco: window.matchMedia("(pointer: coarse)").matches,
      });
      // il tema l'ha già scelto lo script in testa alla pagina, prima del primo disegno
      setTema(document.documentElement.dataset.tema === "chiaro" ? "chiaro" : "scuro");
    };
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

  const cambiaTema = useCallback(() => {
    const nuovo: Tema = tema === "scuro" ? "chiaro" : "scuro";
    document.documentElement.dataset.tema = nuovo;
    try {
      localStorage.setItem("tema", nuovo);
    } catch {
      /* archivio non disponibile: il tema vale per questa visita */
    }
    setTema(nuovo);
    setMontaggi((m) => m + 1);
  }, [tema]);

  const carte = useMemo<Carta[]>(() => {
    const totale = lavori.length;
    const elenco: Carta[] = lavori.map((l, i) => {
      const t = d.lavori[l.id as keyof typeof d.lavori];
      return {
        id: l.id,
        immagine: (schermate as string[]).includes(l.id) ? `/lavori/${l.id}.jpg` : null,
        frammento: frammenti[l.id] ?? "",
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
      frammento: "",
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
    if (id) {
      setMosso(true);
      setFocale(null);
    }
  }, []);

  const interagisci = useCallback(() => {
    setMosso(true);
    setFocale(null);
  }, []);
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

  const chiudiVignetta = useCallback(() => {
    setSelezionato(null);
    if (daTastiera.current) palco.current?.focus();
  }, []);

  // con la vignetta aperta: Esc chiude, ← → passano al lavoro accanto
  useEffect(() => {
    if (!selezionato || modulo) return;
    const tasti = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea")) return;
      if (e.key === "Escape") chiudiVignetta();
      if (e.key === "ArrowRight") vai(1);
      if (e.key === "ArrowLeft") vai(-1);
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, [selezionato, modulo, vai, chiudiVignetta]);

  // aperta da tastiera, la vignetta prende il fuoco
  useEffect(() => {
    if (selezionato && daTastiera.current) titoloVignetta.current?.focus();
  }, [selezionato]);

  /** Sul palco: ← → scorrono le carte, Invio apre quella col fuoco. */
  function tastiPalco(e: React.KeyboardEvent<HTMLDivElement>) {
    if (selezionato) return;
    const n = carte.length;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      daTastiera.current = true;
      setMosso(true);
      setFocale((f) => {
        const base = f ?? (e.key === "ArrowRight" ? -1 : 1);
        return (base + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
      });
    }
    if ((e.key === "Enter" || e.key === " ") && focale !== null) {
      e.preventDefault();
      daTastiera.current = true;
      seleziona(carte[focale].id);
    }
  }

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
  const cartaFocale = focale !== null ? carte[focale] : null;

  return (
    <div
      className={`esperienza${pronta ? " esperienza--pronta" : ""}${selezionato ? " esperienza--aperta" : ""}`}
    >
      <div
        ref={palco}
        className="palco"
        tabIndex={0}
        role="group"
        aria-roledescription={d.tastiera.ruolo}
        aria-label={d.tastiera.etichetta}
        onKeyDown={tastiPalco}
        onPointerDown={() => {
          daTastiera.current = false;
        }}
      >
        <Scena
          key={`${lingua}-${ambiente.stretto}-${tema}`}
          carte={carte}
          selezionato={selezionato}
          focale={focale}
          onSeleziona={seleziona}
          onInteragisci={interagisci}
          onPronta={() => setPronta(true)}
          ridotto={ambiente.ridotto}
          stretto={ambiente.stretto}
          tema={tema}
          conIngresso={montaggi === 0}
          lingua={lingua}
          moduloAperto={modulo}
        />
      </div>

      <p className="solo-schermo" aria-live="polite">
        {cartaFocale
          ? `${cartaFocale.dati.numero} / ${String(carte.length).padStart(2, "0")} — ${cartaFocale.dati.titolo}, ${cartaFocale.dati.tipo}`
          : ""}
      </p>

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
          <button
            className="tema"
            onClick={cambiaTema}
            aria-label={tema === "scuro" ? d.tema.versoChiaro : d.tema.versoScuro}
            title={tema === "scuro" ? d.tema.versoChiaro : d.tema.versoScuro}
          >
            <span className={`tema-segno tema-segno--${tema}`} aria-hidden="true" />
          </button>
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
        <aside className="vignetta" key={lavoro.id} aria-labelledby="vignetta-titolo">
          <p className="vignetta-occhiello">
            {String(indice + 1).padStart(2, "0")} / {String(lavori.length).padStart(2, "0")} ·{" "}
            {testi.tipo}
          </p>
          <h2 id="vignetta-titolo" className="vignetta-titolo" ref={titoloVignetta} tabIndex={-1}>
            {testi.titolo}
          </h2>
          <p className="vignetta-riga">{testi.riga}</p>
          {lavoro.anno && <p className="vignetta-anno">{lavoro.anno}</p>}
          <div className="vignetta-azioni">
            {lavoro.link ? (
              <a className="visita" href={lavoro.link.href} target="_blank" rel="noopener">
                {d.vignetta.visita} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="senza-link">{d.vignetta.senzaLink}</span>
            )}
            <span className="frecce">
              <button onClick={() => vai(-1)} aria-label={d.vignetta.precedente}>
                <span aria-hidden="true">←</span>
              </button>
              <button onClick={() => vai(1)} aria-label={d.vignetta.successivo}>
                <span aria-hidden="true">→</span>
              </button>
            </span>
          </div>
          <button className="chiudi" onClick={chiudiVignetta} aria-label={d.vignetta.chiudi}>
            <span aria-hidden="true">×</span>
          </button>
        </aside>
      )}

      {modulo && <Modulo d={d} lingua={lingua} onChiudi={chiudiModulo} />}
    </div>
  );
}
