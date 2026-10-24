"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { lavori, ID_CONTATTO, ID_ULIVETO } from "@/content/lavori";
import { precaricaUliveto } from "./precaricaUliveto";
import { frammenti } from "@/content/frammenti";
import { curriculum } from "@/content/collegamenti";
import schermate from "@/content/schermate.json";
import type { Carta, Tema } from "./Scena";
import Modulo from "./Modulo";
import Avvio from "./Avvio";
import { suono, type Modo } from "./audio";

const Scena = dynamic(() => import("./Scena"), { ssr: false });

function supportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Ambiente = {
  webgl: boolean;
  ridotto: boolean;
  stretto: boolean;
  tocco: boolean;
};

export default function Esperienza({
  d,
  lingua,
}: {
  d: Dizionario;
  lingua: Lingua;
}) {
  const router = useRouter();
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [focale, setFocale] = useState<number | null>(null);
  const [modulo, setModulo] = useState(false);
  const [mosso, setMosso] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  /** il passaggio verso l'uliveto: la vista d'ingresso che si allarga dal punto del clic */
  const [passaggio, setPassaggio] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    router.prefetch(`/${lingua}/olio`);
  }, [router, lingua]);
  // a stanza pronta, con calma, si scarica in sottofondo l'uliveto: varcato il cancello si aspetta meno
  useEffect(() => {
    if (!pronta) return;
    const id = window.setTimeout(() => {
      const ric = (window as Window & { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback;
      if (ric) ric(precaricaUliveto);
      else precaricaUliveto();
    }, 6000);
    return () => window.clearTimeout(id);
  }, [pronta]);
  const versoUliveto = useCallback(
    (x: number, y: number) => {
      if (ambiente?.ridotto) {
        router.push(`/${lingua}/olio`);
        return;
      }
      setPassaggio({ x, y });
      setTimeout(() => router.push(`/${lingua}/olio`), 950);
    },
    [router, lingua, ambiente?.ridotto]
  );
  const [tema, setTema] = useState<Tema>("scuro");
  const [audio, setAudio] = useState<Modo>("spento");
  const testiMusica = useMemo<[string, string]>(
    () => [d.audio.musica, d.audio.silenzio],
    [d],
  );
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
      setTema(
        document.documentElement.dataset.tema === "chiaro" ? "chiaro" : "scuro",
      );
    };
    const primo = requestAnimationFrame(leggi);
    let attesa: ReturnType<typeof setTimeout>;
    const ridim = () => {
      clearTimeout(attesa);
      attesa = setTimeout(leggi, 250);
    };
    window.addEventListener("resize", ridim);
    // "riduci movimento" può cambiare a pagina aperta: si ascolta il cambio, non solo l'avvio
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cambiaRidotto = () =>
      setAmbiente((a) => (a ? { ...a, ridotto: mq.matches } : a));
    mq.addEventListener("change", cambiaRidotto);
    return () => {
      cancelAnimationFrame(primo);
      window.removeEventListener("resize", ridim);
      mq.removeEventListener("change", cambiaRidotto);
    };
  }, []);

  // l'audio: legge la scelta salvata (con "riduci movimento" non si riaccende da solo) e aspetta un gesto
  useEffect(() => {
    if (!ambiente) return;
    const via = suono.ascolta(setAudio);
    suono.prepara(ambiente.ridotto);
    // il primo gesto fa partire l'audio salvato come acceso. Più eventi, perché i browser non sono d'accordo
    // su quale valga (sul telefono il tocco conta al rilascio, non alla pressione). Il bottone dell'audio
    // fa da sé: se lo accendesse anche questo, il suo clic subito dopo lo spegnerebbe.
    const gesto = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".audio")) return;
      suono.gesto();
    };
    const eventi = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    eventi.forEach((n) => window.addEventListener(n, gesto));
    return () => {
      via();
      eventi.forEach((n) => window.removeEventListener(n, gesto));
      suono.sospendi();
    };
  }, [ambiente?.ridotto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    suono.setNotte(tema === "scuro");
  }, [tema]);

  useEffect(() => {
    document.documentElement.classList.toggle("con-scena", !!ambiente?.webgl);
    // uscendo dalla stanza la pagina torna a scorrere
    return () => document.documentElement.classList.remove("con-scena");
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
    suono.setNotte(nuovo === "scuro");
    suono.effetto("tema");
  }, [tema]);

  const carte = useMemo<Carta[]>(() => {
    const totale = lavori.length;
    const elenco: Carta[] = lavori.map((l, i) => {
      const t = d.lavori[l.id as keyof typeof d.lavori];
      return {
        id: l.id,
        immagine: (schermate as string[]).includes(l.id)
          ? `/lavori/${l.id}.jpg`
          : null,
        frammento: frammenti[lingua][l.id] ?? "",
        dati: {
          numero: String(i + 1).padStart(2, "0"),
          tipo: t.tipo,
          titolo: t.titolo,
          dominio: l.link
            ? `↗ ${l.link.etichetta}`
            : `— ${d.vignetta.senzaLink}`,
          anno: l.anno,
          tinta: l.tinta,
          motivo: l.motivo,
          contatto: false,
          avviso: l.motivo === "cantiere" ? d.vignetta.cantiere : undefined,
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
    // l'ingresso dell'uliveto: un posto sull'anello come le carte, ma sulla scena è un cancello
    elenco.push({
      id: ID_ULIVETO,
      immagine: null,
      frammento: "",
      dati: {
        numero: String(totale + 2).padStart(2, "0"),
        tipo: d.olio.luoghi.alberi,
        titolo: d.ulivo.scritta,
        dominio: "",
        anno: "",
        tinta: "",
        motivo: "testo",
        contatto: false,
        uliveto: true,
      },
    });
    return elenco;
  }, [d, lingua]);

  const seleziona = useCallback((id: string | null) => {
    // l'ingresso dell'uliveto (da tastiera): il passaggio parte dal centro dello schermo
    if (id === ID_ULIVETO) {
      versoUliveto(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }
    if (id === ID_CONTATTO) {
      setSelezionato(null);
      setModulo(true);
      setMosso(true);
      suono.effetto("cassetto");
      return;
    }
    setSelezionato(id);
    if (id) {
      setMosso(true);
      setFocale(null);
      suono.effetto("apri");
    }
  }, [versoUliveto]);

  const interagisci = useCallback(() => {
    setMosso(true);
    setFocale(null);
  }, []);
  const chiudiModulo = useCallback(() => setModulo(false), []);

  // passando con le frecce da una carta all'altra, ogni carta suona la sua nota: un arpeggio
  useEffect(() => {
    if (focale !== null) suono.notaCarta(focale);
  }, [focale]);

  const indice = selezionato
    ? lavori.findIndex((l) => l.id === selezionato)
    : -1;
  const vai = useCallback(
    (passo: number) => {
      if (indice < 0) return;
      const n = lavori.length;
      setSelezionato(lavori[(indice + passo + n) % n].id);
    },
    [indice],
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
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const n = lavori.length;
        suono.notaCarta(
          (lavori.findIndex((l) => l.id === selezionato) +
            (e.key === "ArrowRight" ? 1 : -1) +
            n) %
            n,
        );
      }
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

  // l'avvio sta sempre al primo posto dello stesso frammento: React lo tiene montato mentre arriva la scena
  const avvio = <Avvio pronta={pronta} nome={d.nome} testo={d.avvio} />;
  if (!ambiente) return <>{avvio}</>;
  if (!ambiente.webgl) {
    // senza WebGL resta l'elenco in HTML della pagina, più il modulo
    return ambiente ? (
      <>
        <button
          className="scrivimi scrivimi--fisso"
          onClick={() => setModulo(true)}
        >
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
    <>
      {avvio}
      <div
        className={`esperienza${pronta ? " esperienza--pronta" : ""}${selezionato ? " esperienza--aperta" : ""}${modulo ? " esperienza--modulo" : ""}`}
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
          {/* il tema non rimonta la scena: cambia materiali e uniform */}
          <Scena
            key={`${lingua}-${ambiente.stretto}`}
            carte={carte}
            selezionato={selezionato}
            focale={focale}
            onSeleziona={seleziona}
            onInteragisci={interagisci}
            onPronta={() => setPronta(true)}
            ridotto={ambiente.ridotto}
            stretto={ambiente.stretto}
            tema={tema}
            conIngresso
            lingua={lingua}
            moduloAperto={modulo}
            sezioneEditoria={d.elenco.editoria}
            testiMusica={testiMusica}
            testoUlivo={d.ulivo.scritta}
            onOlio={versoUliveto}
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
            {/* cambio lingua con un caricamento vero: la scena, il cielo e le texture ripartono da capo */}
            {lingue.map((l) => (
              <a
                key={l}
                href={`/${l}`}
                hrefLang={l}
                lang={l}
                aria-current={l === lingua ? "true" : undefined}
              >
                {l.toUpperCase()}
              </a>
            ))}
            <button
              className="tema audio"
              onClick={() => suono.interruttore()}
              aria-pressed={audio !== "spento"}
              aria-label={audio === "spento" ? d.audio.accendi : d.audio.spegni}
              title={audio === "spento" ? d.audio.accendi : d.audio.spegni}
            >
              <span
                className={`audio-segno${audio !== "spento" ? " audio-segno--acceso" : ""}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
            </button>
            <button
              className="tema"
              onClick={cambiaTema}
              aria-label={
                tema === "scuro" ? d.tema.versoChiaro : d.tema.versoScuro
              }
              title={tema === "scuro" ? d.tema.versoChiaro : d.tema.versoScuro}
            >
              <span
                className={`tema-segno tema-segno--${tema}`}
                aria-hidden="true"
              />
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
          <aside
            className="vignetta"
            key={lavoro.id}
            aria-labelledby="vignetta-titolo"
          >
            <p className="vignetta-occhiello">
              {String(indice + 1).padStart(2, "0")} /{" "}
              {String(lavori.length).padStart(2, "0")} · {testi.tipo}
            </p>
            <h2
              id="vignetta-titolo"
              className="vignetta-titolo"
              ref={titoloVignetta}
              tabIndex={-1}
            >
              {testi.titolo}
            </h2>
            <p className="vignetta-ruolo">
              {testi.ruolo}
              {lavoro.anno && ` · ${lavoro.anno}`}
            </p>
            {/* il corpo scorre da solo se è lungo; titolo e azioni restano fermi */}
            <div
              className="vignetta-corpo"
              tabIndex={0}
              aria-label={testi.titolo}
            >
              <p className="vignetta-riga">{testi.riga}</p>
              {testi.compiti.length > 0 && (
                <>
                  <h3 className="vignetta-etichetta">{d.vignetta.compiti}</h3>
                  <ul className="vignetta-compiti">
                    {testi.compiti.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              {testi.strumenti && (
                <>
                  <h3 className="vignetta-etichetta">{d.vignetta.strumenti}</h3>
                  <p className="vignetta-strumenti">{testi.strumenti}</p>
                </>
              )}
            </div>
            <div className="vignetta-azioni">
              {lavoro.link ? (
                <a
                  className="visita"
                  href={lavoro.link.href}
                  target="_blank"
                  rel="noopener"
                >
                  {d.vignetta.visita} <span aria-hidden="true">↗</span>
                </a>
              ) : lavoro.motivo === "cantiere" ? (
                <span className="cantiere">
                  <span aria-hidden="true" className="cantiere-luce" />
                  {d.vignetta.cantiere}
                </span>
              ) : (
                <span className="senza-link">{d.vignetta.senzaLink}</span>
              )}
              <span className="frecce">
                <button
                  onClick={() => vai(-1)}
                  aria-label={d.vignetta.precedente}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  onClick={() => vai(1)}
                  aria-label={d.vignetta.successivo}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </span>
            </div>
            <button
              className="chiudi"
              onClick={chiudiVignetta}
              aria-label={d.vignetta.chiudi}
            >
              <span aria-hidden="true">×</span>
            </button>
          </aside>
        )}

        {modulo && <Modulo d={d} lingua={lingua} onChiudi={chiudiModulo} />}

        {passaggio && (
          <div
            className="passaggio"
            aria-hidden="true"
            style={
              {
                "--x": `${passaggio.x}px`,
                "--y": `${passaggio.y}px`,
                backgroundImage: `url(/olio/ingresso-${tema === "scuro" ? "notte" : "giorno"}.jpg)`,
              } as React.CSSProperties
            }
          />
        )}
      </div>
    </>
  );
}
