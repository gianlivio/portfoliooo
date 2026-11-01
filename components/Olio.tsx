"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { mediaOlio, type Forma, type Luogo, type Media } from "@/content/olio";
import Diorama from "./Diorama";
import Modulo from "./Modulo";
import { Campagna } from "./campagna";
import { suono } from "./audio";

/** Una foto o un video dell'uliveto, legato alla tappa del testo che racconta la stessa cosa. */
export type Quadro = { media: Media; luogo: Luogo; forma: Forma; didascalia: string; /** indice della tappa */ tappa: number };

/**
 * La pagina dell'olio: si attraversa un uliveto di carta scorrendo. Dietro, fisso, il teatrino di fogli
 * ritagliati (Diorama); davanti, le tappe del cammino, una per schermata: il titolo, la storia, i quattro passi
 * del metodo, il frantoio. Accanto a ogni testo, dalla parte opposta, le sue foto e i suoi video, come stampe
 * fissate col nastro; il clic le apre grandi. I suoni della campagna si accendono a mano.
 */

type Tappa = { id: string; occhiello?: string; titolo?: string; testo?: string; lato: "sx" | "dx" | "centro" };

export default function Olio({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const o = d.olio;
  const [modulo, setModulo] = useState(false);
  const [suoni, setSuoni] = useState(false);
  const [aperto, setAperto] = useState<number | null>(null);
  const [ambiente, setAmbiente] = useState<{ ridotto: boolean; stretto: boolean } | null>(null);
  const campagna = useRef<Campagna | null>(null);

  // le tappe del cammino, nell'ordine
  const tappe = useMemo<Tappa[]>(
    () => [
      { id: "apertura", lato: "sx" },
      ...o.storia.map((t, i): Tappa => ({ id: `storia-${i}`, occhiello: o.storiaTitolo, titolo: o.storiaTitoli[i], testo: t, lato: i % 2 ? "dx" : "sx" })),
      ...o.metodo.map((m, i): Tappa => ({ id: `metodo-${i}`, occhiello: `${o.metodoTitolo} · ${String(i + 1).padStart(2, "0")}`, titolo: m.titolo, testo: m.testo, lato: i % 2 ? "sx" : "dx" })),
      { id: "frantoio", occhiello: o.luoghi.frantoio, titolo: o.percheTitolo, testo: o.perche, lato: "sx" },
    ],
    [o]
  );

  // i quadri: nel luogo del loro contenuto, non nelle tappe
  const quadri = useMemo<Quadro[]>(
    () =>
      mediaOlio.map((v) => ({
        media: v.media,
        luogo: v.luogo,
        forma: v.forma ?? "bacheca",
        didascalia: v.didascalia?.[lingua] ?? o.luoghi[v.luogo],
        tappa: Math.max(0, tappe.findIndex((t) => t.id === v.tappa)),
      })),
    [o, lingua, tappe]
  );

  // arrivando dalla stanza: la pagina scorre e la musica della stanza cala fino al silenzio (la dissolvenza
  // comincia al clic sul cancello; se si arriva da un link o ricaricando, comincia qui)
  useEffect(() => {
    document.documentElement.classList.remove("con-scena");
    suono.sfumaVia(4);
    window.scrollTo(0, 0);
    const ambiente = {
      ridotto: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      stretto: window.innerWidth < 760,
    };
    // dopo il primo disegno, come nella stanza
    const primo = requestAnimationFrame(() => setAmbiente(ambiente));
    return () => cancelAnimationFrame(primo);
  }, []);

  // il tema: di giorno il tramonto, di notte i faretti; il suono lo segue
  useEffect(() => {
    const c = new Campagna();
    campagna.current = c;
    const leggi = () => c.setNotte(document.documentElement.dataset.tema !== "chiaro");
    leggi();
    const oss = new MutationObserver(leggi);
    oss.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => {
      oss.disconnect();
      c.chiudi();
    };
  }, []);

  // nella stanza il trackpad gira la vista anche di lato; qui lo stesso gesto, invece di far tornare il browser
  // alla pagina prima (lo scorrimento di lato su Mac è "indietro"), fa camminare come quello in verticale
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("in-uliveto");
    const lato = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      window.scrollBy({ top: e.deltaX, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("wheel", lato, { passive: false });
    return () => {
      html.classList.remove("in-uliveto");
      window.removeEventListener("wheel", lato);
    };
  }, []);

  // il testo di una tappa compare quando la tappa è a metà schermo
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".tappa");
    const oss = new IntersectionObserver(
      (voci) => voci.forEach((v) => v.target.classList.toggle("tappa--qui", v.isIntersecting)),
      { rootMargin: "-35% 0px -35% 0px" }
    );
    els.forEach((e) => oss.observe(e));
    return () => oss.disconnect();
  }, []);

  const mediaAperto: Media = aperto === null ? null : quadri[aperto].media;
  const lati = useMemo(() => tappe.map((t) => t.lato), [tappe]);

  return (
    <div className={`olio${ambiente ? " olio--carta" : ""}`}>
      {ambiente && <Diorama lati={lati} ridotto={ambiente.ridotto} stretto={ambiente.stretto} />}

      <header className="olio-testata">
        <Link className="olio-torna" href={`/${lingua}`}>
          <span aria-hidden="true">←</span> {o.torna}
        </Link>
        <nav className="olio-comandi" aria-label={d.testata.lingua}>
          {lingue.map((l) => (
            <Link key={l} href={`/${l}/olio`} aria-current={l === lingua ? "page" : undefined} className="olio-lingua">
              {l.toUpperCase()}
            </Link>
          ))}
          <button
            className="olio-suoni"
            aria-pressed={suoni}
            aria-label={suoni ? o.silenzio : o.suoni}
            onClick={() => setSuoni(campagna.current?.alterna() ?? false)}
          >
            <Onde attive={suoni} />
            <span className="olio-suoni-testo">{suoni ? o.silenzio : o.suoni}</span>
          </button>
        </nav>
      </header>

      <main className="olio-cammino">
        {tappe.map((t, it) => (
          <section key={t.id} className={`tappa tappa--${t.lato} tappa--${t.id.split("-")[0]}`}>
            {t.id === "apertura" ? (
              <div className="tappa-pannello tappa-apertura">
                <p className="olio-occhiello">{o.occhiello}</p>
                <h1 className="olio-titolo">{o.titolo}</h1>
                <p className="olio-attacco">{o.attacco}</p>
                <p className="olio-scorri">{o.scorri}</p>
              </div>
            ) : (
              <div className="tappa-pannello">
                {t.occhiello && <p className="tappa-occhiello">{t.occhiello}</p>}
                {t.titolo && <h2 className="tappa-titolo">{t.titolo}</h2>}
                {t.testo && <p className="tappa-testo">{t.testo}</p>}
                {t.id === "frantoio" && (
                  <div className="olio-azioni">
                    <button className="olio-scrivimi" onClick={() => setModulo(true)}>
                      {o.scrivimi}
                    </button>
                    <Link className="olio-torna" href={`/${lingua}`}>
                      <span aria-hidden="true">←</span> {o.torna}
                    </Link>
                  </div>
                )}
              </div>
            )}
            <Stampe quadri={quadri} tappa={it} vuoto={o.videoInArrivo} guarda={o.guarda} onApri={setAperto} />
          </section>
        ))}
      </main>

      {mediaAperto && (
        <div className="olio-schermo" role="dialog" aria-modal="true" onClick={() => setAperto(null)}>
          <div className="olio-schermo-dentro" onClick={(e) => e.stopPropagation()}>
            {mediaAperto.tipo === "video" ? (
              <video src={mediaAperto.src} poster={mediaAperto.poster} controls autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaAperto.src} alt={aperto !== null ? quadri[aperto].didascalia : ""} />
            )}
            <button className="olio-schermo-chiudi" onClick={() => setAperto(null)} autoFocus>
              {o.chiudi}
            </button>
          </div>
        </div>
      )}

      {modulo && <Modulo d={d} lingua={lingua} onChiudi={() => setModulo(false)} />}
    </div>
  );
}

/**
 * Le foto e i video di una tappa, come stampe fissate col nastro, dalla parte libera dal testo.
 * Il video mostra il suo fotogramma e il segno del play; il clic apre l'uno o l'altro a tutto schermo.
 */
function Stampe({ quadri, tappa, vuoto, guarda, onApri }: { quadri: Quadro[]; tappa: number; vuoto: string; guarda: string; onApri: (i: number) => void }) {
  const qui = quadri.map((q, i) => ({ q, i })).filter(({ q }) => q.tappa === tappa);
  if (!qui.length) return null;
  return (
    <ul className={`stampe stampe--${Math.min(qui.length, 4)}`}>
      {qui.map(({ q, i }, k) => (
        <li key={i} className="stampa" style={{ ["--giro" as string]: `${(k % 2 ? 1 : -1) * (1.5 + ((k * 7) % 3))}deg` }}>
          {q.media ? (
            <button className="stampa-foto" onClick={() => onApri(i)} aria-label={`${guarda}: ${q.didascalia}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.media.tipo === "video" ? q.media.poster ?? "" : q.media.src} alt="" loading="lazy" decoding="async" />
              {q.media.tipo === "video" && <span className="stampa-play" aria-hidden="true" />}
            </button>
          ) : (
            <span className="stampa-foto stampa-foto--vuota">{vuoto}</span>
          )}
          <span className="stampa-didascalia">{q.didascalia}</span>
        </li>
      ))}
    </ul>
  );
}

function Onde({ attive }: { attive: boolean }) {
  return (
    <span className={`olio-onde${attive ? " olio-onde--attive" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
