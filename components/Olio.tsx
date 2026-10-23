"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { mediaOlio, type Luogo, type Media } from "@/content/olio";
import type { Quadro } from "./Uliveto";
import Modulo from "./Modulo";
import { Campagna } from "./campagna";
import { suono } from "./audio";

const Uliveto = dynamic(() => import("./Uliveto"), { ssr: false });

/**
 * La pagina dell'olio: si attraversa un uliveto scorrendo. Dietro, fissa, la scena 3D (Uliveto);
 * davanti, le tappe del cammino, una per schermata: il titolo, la storia, i quattro passi del metodo,
 * i video, il frantoio. Ogni tappa ha il suo quadro fra gli ulivi, dalla parte opposta al testo.
 * Senza WebGL restano le tappe, su fondo pieno. I suoni della campagna si accendono a mano.
 */

type Tappa = { id: string; titolo?: string; testo?: string; numero?: string; lato: "sx" | "dx" | "centro" };

export default function Olio({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const o = d.olio;
  const [modulo, setModulo] = useState(false);
  const [suoni, setSuoni] = useState(false);
  const [aperto, setAperto] = useState<number | null>(null);
  const [ambiente, setAmbiente] = useState<{ webgl: boolean; ridotto: boolean; stretto: boolean } | null>(null);
  const [notte, setNotte] = useState(true);
  const [pronta, setPronta] = useState(false);
  const campagna = useRef<Campagna | null>(null);
  const progresso = useRef(0);

  // le tappe del cammino, nell'ordine
  const tappe = useMemo<Tappa[]>(
    () => [
      { id: "apertura", lato: "sx" },
      ...o.storia.map((t, i): Tappa => ({ id: `storia-${i}`, titolo: i === 0 ? o.storiaTitolo : undefined, testo: t, lato: i % 2 ? "dx" : "sx" })),
      ...o.metodo.map((m, i): Tappa => ({ id: `metodo-${i}`, titolo: m.titolo, testo: m.testo, numero: String(i + 1).padStart(2, "0"), lato: i % 2 ? "sx" : "dx" })),
      { id: "frantoio", titolo: o.percheTitolo, testo: o.perche, lato: "sx" },
    ],
    [o]
  );

  // i quadri: nel luogo del loro contenuto, non nelle tappe
  const quadri = useMemo<Quadro[]>(
    () => mediaOlio.map((v) => ({ media: v.media, luogo: v.luogo, didascalia: v.didascalia?.[lingua] ?? o.luoghi[v.luogo] })),
    [o, lingua]
  );
  /** Senza la scena: i quadri di un luogo stanno sotto l'ultima tappa di quel luogo. */
  const luogoDellaTappa: Record<string, Luogo> = { "storia-2": "alberi", "metodo-1": "raccolta", frantoio: "frantoio" };

  // arrivando dalla stanza: la pagina scorre e la musica della stanza tace
  useEffect(() => {
    document.documentElement.classList.remove("con-scena");
    suono.sospendi();
    window.scrollTo(0, 0);
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    const ambiente = {
      webgl,
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
    const leggi = () => {
      const n = document.documentElement.dataset.tema !== "chiaro";
      setNotte(n);
      c.setNotte(n);
    };
    leggi();
    const oss = new MutationObserver(leggi);
    oss.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => {
      oss.disconnect();
      c.chiudi();
    };
  }, []);

  // scorrere è camminare
  useEffect(() => {
    const leggi = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progresso.current = max > 0 ? window.scrollY / max : 0;
    };
    leggi();
    window.addEventListener("scroll", leggi, { passive: true });
    window.addEventListener("resize", leggi);
    return () => {
      window.removeEventListener("scroll", leggi);
      window.removeEventListener("resize", leggi);
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
  const con3d = !!ambiente?.webgl;

  return (
    <div className={`olio${con3d ? " olio--3d" : ""}`}>
      {ambiente && con3d && (
        <div className="uliveto" aria-hidden="true">
          <Uliveto
            quadri={quadri}
            progresso={progresso}
            notte={notte}
            ridotto={ambiente.ridotto}
            stretto={ambiente.stretto}
            vuoto={o.videoInArrivo}
            onApri={setAperto}
            onPronta={() => setPronta(true)}
          />
        </div>
      )}
      {/* la vista d'ingresso, la stessa del passaggio dalla stanza: copre la scena finché non è pronta */}
      <div
        className={`olio-velo${pronta || (ambiente && !con3d) ? " olio-velo--via" : ""}`}
        aria-hidden="true"
        style={{ backgroundImage: `url(/olio/ingresso-${notte ? "notte" : "giorno"}.jpg)` }}
      />

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
        {tappe.map((t) => (
          <section key={t.id} className={`tappa tappa--${t.lato} tappa--${t.id.split("-")[0]}`}>
            {t.id === "apertura" ? (
              <div className="tappa-pannello tappa-apertura">
                <p className="olio-occhiello">{o.occhiello}</p>
                <h1 className="olio-titolo">{o.titolo}</h1>
                <p className="olio-attacco">{o.attacco}</p>
                {con3d && <p className="olio-scorri">{o.scorri}</p>}
              </div>
            ) : (
              <div className="tappa-pannello">
                {t.numero && <p className="olio-numero">{t.numero}</p>}
                {t.titolo && (t.numero ? <h3>{t.titolo}</h3> : <h2>{t.titolo}</h2>)}
                {t.testo && <p className="tappa-testo">{t.testo}</p>}
                {/* senza la scena, i video della tappa stanno qui sotto */}
                {!con3d && luogoDellaTappa[t.id] && <QuadriPiani quadri={quadri.filter((q) => q.luogo === luogoDellaTappa[t.id])} vuoto={o.videoInArrivo} />}
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

/** Senza WebGL: i video della tappa in fila, coi controlli. */
function QuadriPiani({ quadri, vuoto }: { quadri: Quadro[]; vuoto: string }) {
  if (!quadri.length) return null;
  return (
    <div className="olio-piani">
      {quadri.map((q, i) =>
        q.media ? (
          q.media.tipo === "video" ? (
            <video key={i} className="olio-cornice" src={q.media.src} poster={q.media.poster} controls preload="metadata" playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} className="olio-cornice" src={q.media.src} alt={q.didascalia} />
          )
        ) : (
          <div key={i} className="olio-cornice olio-cornice--vuota">
            <span>{vuoto}</span>
          </div>
        )
      )}
    </div>
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
