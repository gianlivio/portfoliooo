"use client";

import { useEffect, useRef, useState } from "react";
import type { Dizionario } from "@/dictionaries";
import { recapiti } from "@/content/collegamenti";

type Stato = "pronto" | "invio" | "ok" | "errore";

/** Modulo di contatto: manda a /api/contatti, che inoltra via Resend. */
export default function Modulo({
  d, lingua, onChiudi,
}: {
  d: Dizionario;
  lingua: string;
  onChiudi: () => void;
}) {
  const [stato, setStato] = useState<Stato>("pronto");
  const primo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStato("invio");
    try {
      const r = await fetch("/api/contatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: f.get("nome"),
          email: f.get("email"),
          messaggio: f.get("messaggio"),
          sito: f.get("sito"),
          lingua,
        }),
      });
      setStato(r.ok ? "ok" : "errore");
    } catch {
      setStato("errore");
    }
  }

  const m = d.modulo;
  return (
    <div className="velo" onClick={onChiudi}>
      <div
        className="modulo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modulo-titolo"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="chiudi" onClick={onChiudi} aria-label={m.chiudi}>
          ×
        </button>
        <h2 id="modulo-titolo">{m.titolo}</h2>
        <p className="modulo-sotto">{m.sottotitolo}</p>

        {stato === "ok" ? (
          <p className="esito esito--ok" role="status">
            {m.ok}
          </p>
        ) : (
          <form onSubmit={invia}>
            <label>
              <span>{m.nome}</span>
              <input ref={primo} name="nome" required maxLength={100} autoComplete="name" />
            </label>
            <label>
              <span>{m.email}</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" />
            </label>
            <label>
              <span>{m.messaggio}</span>
              <textarea
                name="messaggio"
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                placeholder={m.segnaposto}
              />
            </label>
            {/* trappola per i bot: nascosta alle persone */}
            <input className="trappola" name="sito" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button className="invia" type="submit" disabled={stato === "invio"}>
              {stato === "invio" ? m.invio : m.invia}
            </button>
            {stato === "errore" && (
              <p className="esito esito--errore" role="alert">
                {m.errore} <a href={recapiti.email.href}>{recapiti.email.valore}</a>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
