"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dizionario, Lingua } from "@/dictionaries";
import { lingue } from "@/dictionaries";
import { PERSONAGGI, QUADRI, TESTI, ZONE, zona, type Tema, type ZonaId } from "@/content/casa";
import Modulo from "./Modulo";
import { suono } from "./audio";
import { ascoltaCaricamento } from "./casa/mondo/base";
import { musica } from "./casa/musica";
import type { Modo, Movimento } from "./casa/Scena";
import "@/app/casa.css";

const Scena = dynamic(() => import("./casa/Scena"), { ssr: false });

/**
 * La pagina dell'olio: la visita alla casa in campagna, come un piccolo gioco. Si arriva dalla strada e si
 * cammina (o ci si fa portare) fra l'agrumeto, la piscina, la casa col pozzo e i pannelli, le galline e
 * l'uliveto dietro casa; col trattore si va agli uliveti di Chiaramonte Gulfi e al frantoio. Livio accompagna,
 * Romero gli corre dietro; ogni posto ha la sua musica, calma. Le foto e i video stanno sparsi nella campagna.
 * Senza WebGL restano i testi, le foto e i video, in colonna.
 */

type Ambiente = { webgl: boolean; stretto: boolean; tocco: boolean; ridotto: boolean; compatto: boolean };

/** Schermi dove il pannello va in basso e parte chiuso: telefoni, tablet in verticale, schermi bassi. */
const COMPATTO = "(max-width: 900px), (max-height: 520px), (orientation: portrait) and (max-width: 1100px)";

function supportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const FASI_INIZIALI: Record<ZonaId, number> = { arrivo: 0, agrumeto: 2, piscina: 0, casa: 0, pollaio: 0, uliveto: 2, chiaramonte: 0, frantoio: 1 };

export default function Olio({ d, lingua }: { d: Dizionario; lingua: Lingua }) {
  const o = d.olio;
  const T = (k: keyof typeof TESTI) => TESTI[k][lingua];
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  const [fontPronti, setFontPronti] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [pronta, setPronta] = useState(false);
  const [entrato, setEntrato] = useState(false);
  const [modo, setModo] = useState<Modo>("cammina");
  /** la schermata dei comandi, come nei videogiochi: compare entrando, si riapre col "?" */
  const [comandi, setComandi] = useState(false);
  const [zonaId, setZonaId] = useState<ZonaId>("arrivo");
  const [vicina, setVicina] = useState<ZonaId>("arrivo");
  const [fasi, setFasi] = useState(FASI_INIZIALI);
  /** il dialogo aperto: con chi, e la catena delle domande fatte (vuota = il saluto) */
  const [dialogo, setDialogo] = useState<{ chi: string; percorso: Tema[] } | null>(null);
  /** le domande già fatte, per persona e zona: non tornano nel menu */
  const [chiesti, setChiesti] = useState<Record<string, string[]>>({});
  const [pannello, setPannello] = useState(true);
  const [mosso, setMosso] = useState(false);
  const [aperto, setAperto] = useState<string | null>(null);
  const [modulo, setModulo] = useState(false);
  const movimento = useRef<Movimento>({ x: 0, y: 0 });
  const schermo = useRef<HTMLDivElement>(null);
  const [musicaAccesa, setMusicaAccesa] = useState(false);
  // la vista d'ingresso è quella del passaggio dalla stanza, di giorno o di notte secondo il tema
  const [notte, setNotte] = useState(true);
  useEffect(() => musica.ascolta(setMusicaAccesa), []);

  // arrivando dalla stanza la sua musica cala fino al silenzio; uscendo, la musica della campagna si spegne
  useEffect(() => {
    document.documentElement.classList.remove("con-scena");
    suono.sfumaVia(4);
    return () => musica.chiudi();
  }, []);

  useEffect(() => {
    const leggi = () =>
      setAmbiente({
        webgl: supportaWebGL(),
        stretto: window.innerWidth < 760,
        tocco: window.matchMedia("(pointer: coarse)").matches,
        ridotto: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        compatto: window.matchMedia(COMPATTO).matches,
      });
    const primo = requestAnimationFrame(() => {
      leggi();
      setNotte(document.documentElement.dataset.tema !== "chiaro");
      if (window.matchMedia(COMPATTO).matches) setPannello(false);
    });
    let attesa: ReturnType<typeof setTimeout>;
    const ridim = () => {
      clearTimeout(attesa);
      attesa = setTimeout(() => setAmbiente((a) => (a ? { ...a, stretto: window.innerWidth < 760, compatto: window.matchMedia(COMPATTO).matches } : a)), 250);
    };
    window.addEventListener("resize", ridim);
    // i font servono anche alle scritte disegnate nella scena: si aspetta che siano pronti (al massimo 2 s)
    const fonti = ["300 20px Newsreader", "400 20px Newsreader", "500 20px 'IBM Plex Sans'", "400 20px 'IBM Plex Mono'", "500 20px 'IBM Plex Mono'"];
    Promise.race([Promise.all(fonti.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2000))]).then(() => setFontPronti(true));
    const via = ascoltaCaricamento(setProgresso);
    return () => {
      cancelAnimationFrame(primo);
      window.removeEventListener("resize", ridim);
      via();
    };
  }, []);

  // la pagina non scorre: lo scorrimento di lato del trackpad non deve diventare il gesto "indietro" del browser
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("in-uliveto", "in-campagna");
    const lato = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault();
    };
    window.addEventListener("wheel", lato, { passive: false });
    return () => {
      html.classList.remove("in-uliveto", "in-campagna");
      window.removeEventListener("wheel", lato);
    };
  }, []);

  const vai = useCallback((id: ZonaId) => {
    setModo("guida");
    setZonaId(id);
    setVicina(id);
    setDialogo(null);
    // sugli schermi piccoli il pannello resta chiuso: si apre al tocco
    setPannello(!window.matchMedia(COMPATTO).matches);
  }, []);

  const parla = useCallback((id: string) => {
    setDialogo({ chi: id, percorso: [] });
    if (window.matchMedia(COMPATTO).matches) setPannello(false);
  }, []);

  // il velo nero del viaggio in trattore, e la sua riga
  const velo = useCallback((o: number) => {
    if (schermo.current) schermo.current.style.opacity = String(o);
  }, []);
  const scritta = useCallback((t: string) => {
    const p = schermo.current?.querySelector("p");
    if (p) p.textContent = t;
  }, []);
  const muovi = useCallback((x: number, y: number) => {
    movimento.current = { x, y };
  }, []);

  const cambiaModo = (m: Modo) => {
    if (m === modo) return;
    if (m === "guida") setZonaId(vicina);
    setModo(m);
    setMosso(false);
  };

  const zonaAttiva = modo === "guida" ? zonaId : vicina;
  useEffect(() => {
    musica.zonaAttiva(zonaAttiva);
  }, [zonaAttiva]);

  // da tastiera: Esc chiude il dialogo, i comandi e la foto aperta; le frecce servono a camminare
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDialogo(null);
      setComandi(false);
      setAperto(null);
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, []);

  const testata = (
    <header className="olio-testata cv-testata">
      <Link className="olio-torna" href={`/${lingua}`}>
        <span aria-hidden="true">←</span> {o.torna}
      </Link>
      <nav className="olio-comandi" aria-label={d.testata.lingua}>
        {lingue.map((l) => (
          <Link key={l} href={`/${l}/olio`} aria-current={l === lingua ? "page" : undefined} className="olio-lingua">
            {l.toUpperCase()}
          </Link>
        ))}
      </nav>
    </header>
  );

  const quadroAperto = aperto ? QUADRI.find((q) => q.id === aperto) ?? null : null;
  const schermoMedia = quadroAperto && (
    <div className="olio-schermo" role="dialog" aria-modal="true" aria-label={quadroAperto.didascalia[lingua]} onClick={() => setAperto(null)}>
      <div className="olio-schermo-dentro" onClick={(e) => e.stopPropagation()}>
        {quadroAperto.tipo === "video" ? (
          <video src={quadroAperto.src} poster={quadroAperto.anteprima} controls autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={quadroAperto.src} alt={quadroAperto.didascalia[lingua]} />
        )}
        <p className="cv-didascalia">{quadroAperto.didascalia[lingua]}</p>
        <button className="olio-schermo-chiudi" onClick={() => setAperto(null)} autoFocus>
          {o.chiudi}
        </button>
      </div>
    </div>
  );

  // i testi della visita in colonna: si vedono senza WebGL; con la scena restano per i lettori di schermo
  // e per chi legge l'HTML senza eseguire il codice (sono già nella pagina servita)
  const colonna = (visibile: boolean) => (
    <main className={visibile ? "cv-colonna" : "cv-solo-schermo"}>
      <p className="olio-occhiello">{T("luogo")}</p>
      <h1 className="cv-titolo">{T("titolo")}</h1>
      <p className={visibile ? "cv-nota" : undefined}>{visibile ? T("senza3d") : o.attacco}</p>
      {ZONE.map((z) => (
        <section key={z.id}>
          <p className="olio-occhiello">{z.occhiello[lingua]}</p>
          <h2>{z.titolo[lingua]}</h2>
          <p>{z.testo[lingua]}</p>
          {z.fasi && (
            <ol>
              {z.fasi.map((f) => (
                <li key={f.titolo.it}>
                  <strong>{f.titolo[lingua]}.</strong> {f.testo[lingua]}
                </li>
              ))}
            </ol>
          )}
          {visibile && (
            <div className="olio-piani">
              {QUADRI.filter((q) => q.zona === z.id).map((q) =>
                q.tipo === "video" ? (
                  <video key={q.id} className="olio-cornice" src={q.src} poster={q.anteprima} controls preload="none" playsInline aria-label={q.didascalia[lingua]} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={q.id} className="olio-cornice" src={q.src} alt={q.didascalia[lingua]} />
                )
              )}
            </div>
          )}
        </section>
      ))}
      <section>
        <h2>{o.percheTitolo}</h2>
        <p>{o.perche}</p>
        <button className="olio-scrivimi" onClick={() => setModulo(true)}>
          {o.scrivimi}
        </button>
      </section>
    </main>
  );

  if (!ambiente)
    return (
      <div className="olio cv">
        {testata}
        {colonna(false)}
      </div>
    );

  // senza WebGL: i posti, le foto e i video in colonna
  if (!ambiente.webgl) {
    return (
      <div className="olio cv cv-senza">
        {testata}
        {colonna(true)}
        {modulo && <Modulo d={d} lingua={lingua} onChiudi={() => setModulo(false)} />}
      </div>
    );
  }

  const z = zona(zonaAttiva);
  const fase = fasi[zonaAttiva];
  const cambiaFase = (n: number) => {
    if (!z.fasi) return;
    const k = (n + z.fasi.length) % z.fasi.length;
    setFasi((f) => ({ ...f, [zonaAttiva]: k }));
  };

  const personaggio = dialogo ? PERSONAGGI.find((p) => p.id === dialogo.chi) ?? null : null;
  // Livio parla della zona in cui si è; gli altri della loro
  const zonaDialogo: ZonaId = personaggio?.zona ?? zonaAttiva;
  const copione = personaggio ? personaggio.copioni[zonaDialogo] : undefined;
  const chiave = `${personaggio?.id}|${zonaDialogo}`;
  const giaChiesti = chiesti[chiave] ?? [];
  const faseDialogo = fasi[zonaDialogo];
  const nomeFase = zona(zonaDialogo).fasi?.[faseDialogo]?.titolo[lingua];
  const ultimo = dialogo && dialogo.percorso.length ? dialogo.percorso[dialogo.percorso.length - 1] : null;
  const nuove = (temi: (Tema | undefined)[]) => temi.filter((t): t is Tema => !!t && !giaChiesti.includes(t.d.it));
  const domande = copione ? (ultimo ? nuove(ultimo.poi ?? []) : nuove([copione.perFase?.[faseDialogo], ...copione.temi])) : [];
  const testoDialogo = !copione ? "" : ultimo ? ultimo.r[lingua] : domande.length ? copione.saluto[lingua] : copione.perFase ? T("finitoFasi") : T("finito");
  const chiedi = (t: Tema) => {
    if (!personaggio) return;
    setChiesti((c) => ({ ...c, [chiave]: [...(c[chiave] ?? []), t.d.it] }));
    setDialogo({ chi: personaggio.id, percorso: [...(dialogo?.percorso ?? []), t] });
  };
  const altri = PERSONAGGI.filter((p) => p.zona === zonaAttiva);

  return (
    <div className="olio cv">
      {fontPronti && (
        <div className={`cv-esperienza${entrato ? " cv-esperienza--dentro" : ""}`}>
          <Scena
            modo={modo}
            zonaId={zonaId}
            fasi={fasi}
            lingua={lingua}
            parlante={dialogo?.chi ?? null}
            stretto={ambiente.stretto}
            ridotto={ambiente.ridotto}
            movimento={movimento}
            onVelo={velo}
            onScritta={scritta}
            testi={{ andata: T("versoLontano"), ritorno: T("versoCasa"), vai: T("vai") }}
            onApri={setAperto}
            onVai={vai}
            onVicina={setVicina}
            onParla={parla}
            onPronta={() => setPronta(true)}
            onMosso={() => {
              setMosso(true);
              setComandi(false);
            }}
            onCammina={() => {
              setModo("cammina");
              setComandi(false);
            }}
          />
        </div>
      )}

      {/* il velo nero del viaggio in trattore */}
      <div className="cv-viaggio" ref={schermo} aria-live="polite">
        <p />
      </div>

      {/* l'attesa: la vista d'ingresso (la stessa del passaggio dalla stanza), poi "Entra" */}
      {!entrato && (
        <div className={`olio-velo cv-avvio${pronta ? " cv-avvio--pronta" : ""}`} style={{ backgroundImage: `url(/olio/ingresso-${notte ? "notte" : "giorno"}.jpg)` }}>
          <div className="cv-avvio-centro" role="dialog" aria-label={T("titolo")}>
            <p className="olio-occhiello">{T("luogo")}</p>
            <p className="cv-titolo">{T("titolo")}</p>
            <p className="cv-attacco">{o.attacco}</p>
            {pronta ? (
              <button
                className="cv-entra"
                autoFocus
                onClick={() => {
                  setEntrato(true);
                  setComandi(true);
                  // il clic su "Entra" è il gesto che permette al browser di suonare
                  musica.zonaAttiva("arrivo");
                  musica.accendi();
                }}
              >
                {T("entra")}
              </button>
            ) : (
              <span className="olio-attesa cv-carica">
                {T("carica")} · {Math.round(Math.min(progresso, 0.99) * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {testata}

      {entrato && (
        <div className={`cv-interfaccia${ambiente.compatto ? " cv-interfaccia--compatta" : ""}${pannello ? " cv-pannello-aperto" : ""}${dialogo ? " cv-con-dialogo" : ""}`}>
          <div className="cv-comandi">
            <button className="cv-aiuto" onClick={() => setComandi((v) => !v)} aria-label={T("comandi")} title={T("comandi")}>
              ?
            </button>
            <button
              className="cv-suono"
              onClick={() => musica.interruttore()}
              aria-pressed={musicaAccesa}
              aria-label={musicaAccesa ? T("spegniMusica") : T("accendiMusica")}
              title={musicaAccesa ? T("spegniMusica") : T("accendiMusica")}
            >
              <span className={`cv-suono-segno${musicaAccesa ? " cv-suono-segno--acceso" : ""}`} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="cv-suono-testo">{musicaAccesa ? T("musica") : T("muto")}</span>
            </button>
            <div className="cv-modi" role="group" aria-label={T("modo")}>
              <button aria-pressed={modo === "guida"} onClick={() => cambiaModo("guida")}>
                {T("guidata")}
              </button>
              <button aria-pressed={modo === "cammina"} onClick={() => cambiaModo("cammina")}>
                {T("cammina")}
              </button>
            </div>
          </div>

          {comandi && <Comandi tocco={ambiente.tocco} lingua={lingua} onChiudi={() => setComandi(false)} />}

          <p className={`cv-guida${mosso || comandi ? " cv-guida--via" : ""}`} aria-hidden="true">
            {modo === "guida" ? (ambiente.tocco ? T("guidaTocco") : T("guidaMouse")) : ambiente.tocco ? T("camminaTocco") : T("camminaMouse")}
          </p>

          {/* il pannello della zona, con le fasi */}
          <aside
            className={`cv-pannello${pannello ? "" : " cv-pannello--chiuso"}${comandi ? " cv-pannello--nascosto" : ""}`}
            key={zonaAttiva}
            aria-labelledby="cv-pannello-titolo"
            onClick={() => !pannello && setPannello(true)}
          >
            <button className="cv-pannello-maniglia" onClick={() => setPannello((v) => !v)} aria-expanded={pannello}>
              <span className="cv-occhiello">{z.occhiello[lingua]}</span>
              <span className="cv-pannello-segno" aria-hidden="true">
                {pannello ? "–" : "+"}
              </span>
            </button>
            <h2 id="cv-pannello-titolo" className="cv-pannello-titolo">
              {z.fasi ? z.fasi[fase].titolo[lingua] : z.titolo[lingua]}
            </h2>
            {pannello && (
              <>
                {z.fasi && (
                  <p className="cv-pannello-luogo">
                    {z.titolo[lingua]} · {T("fase")} {fase + 1} {T("di")} {z.fasi.length}
                  </p>
                )}
                <p className="cv-pannello-testo" key={`${zonaAttiva}-${fase}`}>
                  {z.fasi ? z.fasi[fase].testo[lingua] : z.testo[lingua]}
                </p>
                {z.fasi && (
                  <div className="cv-fasi">
                    <button className="cv-freccia" onClick={() => cambiaFase(fase - 1)} aria-label={T("fasePrec")}>
                      ←
                    </button>
                    <ol className="cv-fasi-punti">
                      {z.fasi.map((f, i) => (
                        <li key={f.titolo.it}>
                          <button aria-current={i === fase ? "step" : undefined} onClick={() => cambiaFase(i)} title={f.titolo[lingua]}>
                            <span className="cv-solo-schermo">{f.titolo[lingua]}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button className="cv-freccia" onClick={() => cambiaFase(fase + 1)} aria-label={T("faseSucc")}>
                      →
                    </button>
                  </div>
                )}
                {zonaAttiva === "frantoio" && (
                  <div className="cv-perche">
                    <p className="cv-occhiello">{o.percheTitolo}</p>
                    <p>{o.perche}</p>
                  </div>
                )}
                <div className="cv-parla-con">
                  <button className="cv-parla" onClick={() => parla("livio")}>
                    {T("parlaCon")} Livio
                  </button>
                  {altri.map((p) => (
                    <button key={p.id} className="cv-parla cv-parla--altro" onClick={() => parla(p.id)}>
                      {T("parlaCon")} {p.nome[lingua].toLowerCase()}
                    </button>
                  ))}
                  {zonaAttiva === "frantoio" && (
                    <button className="cv-parla cv-parla--altro" onClick={() => setModulo(true)}>
                      {o.scrivimi}
                    </button>
                  )}
                </div>
              </>
            )}
          </aside>

          {personaggio && copione && (
            <aside className="cv-dialogo" aria-live="polite" key={`${personaggio.id}-${zonaDialogo}-${dialogo?.percorso.length}-${faseDialogo}`}>
              <p className="cv-occhiello">
                {zona(zonaDialogo).titolo[lingua]}
                {nomeFase && `, ${nomeFase.toLowerCase()}`}
              </p>
              {personaggio.ritratto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cv-ritratto" src={personaggio.ritratto} alt="" width={64} height={64} />
              )}
              <h2 className="cv-dialogo-nome">{personaggio.nome[lingua]}</h2>
              {ultimo && <p className="cv-dialogo-domanda">{ultimo.d[lingua]}</p>}
              <p className="cv-dialogo-testo">{testoDialogo}</p>
              <div className="cv-scelte">
                {domande.map((t) => (
                  <button key={t.d.it} onClick={() => chiedi(t)}>
                    {t.d[lingua]}
                  </button>
                ))}
                {ultimo?.vai && (
                  <button className="cv-scelta-vai" onClick={() => vai(ultimo.vai as ZonaId)}>
                    {T("andiamo")}: {zona(ultimo.vai).nome[lingua]} →
                  </button>
                )}
                {ultimo && (
                  <button className="cv-scelta-tenue" onClick={() => setDialogo({ chi: personaggio.id, percorso: [] })}>
                    {T("altraDomanda")}
                  </button>
                )}
                <button className="cv-scelta-tenue" onClick={() => setDialogo(null)}>
                  {T("grazie")}
                </button>
              </div>
              <button className="cv-chiudi" onClick={() => setDialogo(null)} aria-label={T("chiudi")}>
                ×
              </button>
            </aside>
          )}

          <nav className="cv-zone" aria-label={T("zone")}>
            {ZONE.map((zz) => (
              <button key={zz.id} aria-current={zonaAttiva === zz.id ? "true" : undefined} onClick={() => vai(zz.id)}>
                {zz.nome[lingua]}
              </button>
            ))}
          </nav>

          {ambiente.tocco && <Joystick onMuovi={muovi} />}
        </div>
      )}

      {colonna(false)}
      {schermoMedia}
      {modulo && <Modulo d={d} lingua={lingua} onChiudi={() => setModulo(false)} />}
    </div>
  );
}

function Joystick({ onMuovi }: { onMuovi: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });
  const id = useRef<number | null>(null);
  const muovi = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    setP({ x, y });
    onMuovi(x, -y);
  };
  const fine = () => {
    id.current = null;
    setP({ x: 0, y: 0 });
    onMuovi(0, 0);
  };
  return (
    <div
      ref={base}
      className="cv-joystick"
      onPointerDown={(e) => {
        e.stopPropagation();
        id.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        muovi(e);
      }}
      onPointerMove={muovi}
      onPointerUp={fine}
      onPointerCancel={fine}
    >
      <i style={{ transform: `translate(${p.x * 34}px, ${p.y * 34}px)` }} />
    </div>
  );
}

/** La schermata dei comandi, come all'inizio di un videogioco. */
function Comandi({ tocco, lingua, onChiudi }: { tocco: boolean; lingua: Lingua; onChiudi: () => void }) {
  const T = (k: keyof typeof TESTI) => TESTI[k][lingua];
  return (
    <div className="cv-comandi-gioco" role="dialog" aria-label={T("comeMuoversi")}>
      <p className="cv-occhiello">{T("comeMuoversi")}</p>
      <h2>{T("benvenuto")}</h2>
      {tocco ? (
        <div className="cv-righe">
          <div className="cv-riga">
            <span className="cv-stick" aria-hidden="true">
              <i />
            </span>
            <span>{T("joystick")}</span>
          </div>
          <div className="cv-riga">
            <span className="cv-tasto cv-tasto--largo">☝ {T("trascina")}</span>
            <span>{T("trascinaDito")}</span>
          </div>
        </div>
      ) : (
        <div className="cv-righe">
          <div className="cv-riga">
            <span className="cv-croce" aria-hidden="true">
              <kbd className="cv-tasto c-su">W</kbd>
              <kbd className="cv-tasto c-sx">A</kbd>
              <kbd className="cv-tasto c-giu">S</kbd>
              <kbd className="cv-tasto c-dx">D</kbd>
            </span>
            <span className="cv-croce" aria-hidden="true">
              <kbd className="cv-tasto c-su">↑</kbd>
              <kbd className="cv-tasto c-sx">←</kbd>
              <kbd className="cv-tasto c-giu">↓</kbd>
              <kbd className="cv-tasto c-dx">→</kbd>
            </span>
            <span>{T("camminaFrecce")}</span>
          </div>
          <div className="cv-riga">
            <kbd className="cv-tasto cv-tasto--largo">Shift</kbd>
            <span>{T("corri")}</span>
          </div>
          <div className="cv-riga">
            <kbd className="cv-tasto cv-tasto--largo">🖱 {T("trascina")}</kbd>
            <span>{T("guardati")}</span>
          </div>
        </div>
      )}
      <ul className="cv-note">
        <li>{T("nota1")}</li>
        <li>{T("nota2")}</li>
        <li>{T("nota3")}</li>
      </ul>
      <button className="cv-entra" onClick={onChiudi}>
        {T("capito")}
      </button>
    </div>
  );
}
