"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { videoOlio, type Video } from "@/content/olio";
import Modulo from "./Modulo";
import { Campagna } from "./campagna";
import { suono } from "./audio";

/**
 * La pagina dell'olio: fuori dalla stanza, a tutto schermo. In alto la luce che passa fra le foglie
 * (o il video di sfondo, quando c'è), poi la storia, il metodo in quattro passi, i video, e perché lo racconto.
 * I suoni della campagna si accendono a mano. Il tema è quello scelto nella stanza.
 */
export default function Olio({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const o = d.olio;
  const [modulo, setModulo] = useState(false);
  const [suoni, setSuoni] = useState(false);
  const campagna = useRef<Campagna | null>(null);

  // arrivando dalla stanza: la pagina scorre e la musica della stanza tace (la stanza, nella navigazione
  // fra pagine, può restare montata di nascosto, e allora le sue pulizie non partono)
  useEffect(() => {
    document.documentElement.classList.remove("con-scena");
    suono.sospendi();
    window.scrollTo(0, 0);
  }, []);

  // il suono segue il tema: di notte grilli e assiolo
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

  // le sezioni compaiono salendo, una volta sola
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".olio [data-rivela]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("visto"));
      return;
    }
    const oss = new IntersectionObserver(
      (voci) =>
        voci.forEach((v) => {
          if (v.isIntersecting) {
            v.target.classList.add("visto");
            oss.unobserve(v.target);
          }
        }),
      { threshold: 0.15 },
    );
    els.forEach((e) => oss.observe(e));
    return () => oss.disconnect();
  }, []);

  return (
    <div className="olio">
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

      <section className="olio-apertura">
        {videoOlio.sfondo ? (
          <video className="olio-sfondo" src={videoOlio.sfondo.src} poster={videoOlio.sfondo.poster} autoPlay muted loop playsInline aria-hidden="true" />
        ) : (
          <Fronde />
        )}
        <div className="olio-apertura-testo">
          <p className="olio-occhiello">{o.occhiello}</p>
          <h1 className="olio-titolo">{o.titolo}</h1>
          <p className="olio-attacco">{o.attacco}</p>
        </div>
        <span className="olio-scendi" aria-hidden="true" />
      </section>

      <main className="olio-corpo">
        <section className="olio-storia" data-rivela>
          <h2>{o.storiaTitolo}</h2>
          {o.storia.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>

        <section className="olio-metodo" data-rivela>
          <h2>{o.metodoTitolo}</h2>
          <ol>
            {o.metodo.map((m, i) => (
              <li key={m.titolo} data-rivela>
                <Cornice video={videoOlio.metodo[i]} vuoto={o.videoInArrivo} muto />
                <p className="olio-numero">{String(i + 1).padStart(2, "0")}</p>
                <h3>{m.titolo}</h3>
                <p>{m.testo}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="olio-video" data-rivela>
          <h2>{o.videoTitolo}</h2>
          <div className="olio-galleria">
            {videoOlio.galleria.map((v, i) => (
              <Cornice key={i} video={v} vuoto={o.videoInArrivo} />
            ))}
          </div>
        </section>

        <section className="olio-perche" data-rivela>
          <h2>{o.percheTitolo}</h2>
          <p>{o.perche}</p>
          <div className="olio-azioni">
            <button className="olio-scrivimi" onClick={() => setModulo(true)}>
              {o.scrivimi}
            </button>
            <Link className="olio-torna" href={`/${lingua}`}>
              <span aria-hidden="true">←</span> {o.torna}
            </Link>
          </div>
        </section>
      </main>

      {modulo && <Modulo d={d} lingua={lingua} onChiudi={() => setModulo(false)} />}
    </div>
  );
}

/** Un posto per un video: il video, se c'è; altrimenti la cornice vuota. */
function Cornice({ video, vuoto, muto = false }: { video: Video; vuoto: string; muto?: boolean }) {
  if (!video)
    return (
      <div className="olio-cornice olio-cornice--vuota">
        <span>{vuoto}</span>
      </div>
    );
  return muto ? (
    <video className="olio-cornice" src={video.src} poster={video.poster} autoPlay muted loop playsInline />
  ) : (
    <video className="olio-cornice" src={video.src} poster={video.poster} controls preload="metadata" playsInline />
  );
}

/** Tre barre che ondeggiano quando i suoni sono accesi. */
function Onde({ attive }: { attive: boolean }) {
  return (
    <span className={`olio-onde${attive ? " olio-onde--attive" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Finché non c'è il video di sfondo: la luce del sole che passa fra le foglie di un ulivo, su terra calda.
 * Ombre di foglie strette e lunghe, mosse dal vento; tutto su una tela piccola, ingrandita e sfocata dal CSS.
 */
function Fronde() {
  const tela = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = tela.current;
    const x = c?.getContext("2d");
    if (!c || !x) return;
    const W = 320, H = 200;
    c.width = W;
    c.height = H;
    const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let caso = 7;
    const rnd = () => ((caso = (caso * 16807) % 2147483647) / 2147483647);
    // rametti che entrano dai bordi, con le foglie alterne lungo il rametto, strette e lunghe come quelle dell'ulivo
    const rametti = Array.from({ length: 16 }, () => {
      const x = rnd() * W, y = rnd() * H;
      const a = rnd() * Math.PI * 2;
      const n = 7 + Math.floor(rnd() * 6);
      const passo = 5 + rnd() * 3;
      return {
        x, y, a, f: rnd() * Math.PI * 2,
        foglie: Array.from({ length: n }, (_, k) => ({
          d: k * passo,
          lato: k % 2 ? 1 : -1,
          ang: 0.5 + rnd() * 0.35,
          l: 7 + rnd() * 5,
        })),
      };
    });
    let id = 0;
    const disegna = (ms: number) => {
      const t = ms / 1000;
      const notte = document.documentElement.dataset.tema !== "chiaro";
      const g = x.createLinearGradient(0, 0, W, H);
      if (notte) {
        g.addColorStop(0, "#1A1C14");
        g.addColorStop(1, "#0B0C08");
      } else {
        g.addColorStop(0, "#E9D9A6");
        g.addColorStop(1, "#C9A86A");
      }
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      // le ombre delle foglie: di giorno scure su terra chiara, di notte chiare (la luna) su buio
      x.fillStyle = notte ? "rgba(190,200,170,0.10)" : "rgba(58,62,34,0.30)";
      x.strokeStyle = x.fillStyle;
      x.lineWidth = 0.8;
      rametti.forEach((r) => {
        const vento = Math.sin(t * 0.6 + r.f) * 0.06 + Math.sin(t * 1.9 + r.f * 2) * 0.015;
        x.save();
        x.translate(r.x, r.y);
        x.rotate(r.a + vento);
        const lungo = r.foglie[r.foglie.length - 1].d + 4;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(lungo, 0);
        x.stroke();
        r.foglie.forEach((f, k) => {
          x.save();
          x.translate(f.d, 0);
          x.rotate(f.lato * (f.ang + Math.sin(t * 2.3 + r.f + k) * 0.08));
          x.beginPath();
          x.ellipse(f.l * 0.55, 0, f.l * 0.55, f.l * 0.11, 0, 0, Math.PI * 2);
          x.fill();
          x.restore();
        });
        x.restore();
      });
      if (!ridotto) id = requestAnimationFrame(disegna);
    };
    id = requestAnimationFrame(disegna);
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={tela} className="olio-fronde" aria-hidden="true" />;
}
