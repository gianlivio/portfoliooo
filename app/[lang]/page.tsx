import { getDizionario } from "@/dictionaries";
import { collegamentiLavoro, recapiti, curriculum } from "@/content/collegamenti";
import Apparato from "@/components/Apparato";
import Archivio from "@/components/Archivio";
import Rivela from "@/components/Rivela";
import SelettoreLingua from "@/components/SelettoreLingua";

export default async function Pagina({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: lingua } = await params;
  const d = getDizionario(lingua);

  const elenco = [
    ["email", recapiti.email],
    ["telefono", recapiti.telefono],
    ["linkedin", recapiti.linkedin],
    ["github", recapiti.github],
  ] as const;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: d.apertura.nome,
    jobTitle: d.meta.titolo.split(" — ")[1] ?? d.meta.titolo,
    url: `${baseUrl}/${lingua}`,
    sameAs: [recapiti.linkedin.href, recapiti.github.href],
  };

  return (
    <div className="cornice">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="testata">
        <SelettoreLingua attiva={lingua} />
        <a href="#contatti" className="verso-contatti">
          {d.nav.contatti} ↓
        </a>
      </header>

      <section className="blocco blocco--primo">
        <Apparato voci={d.apertura.apparato} />
        <div className="contenuto">
          <h1 className="nome">{d.apertura.nome}</h1>
          <p className="tesi">
            {d.apertura.tesi.map((pezzo, i) =>
              "e" in pezzo && pezzo.e ? (
                <em key={i}>{pezzo.t}</em>
              ) : (
                <span key={i}>{pezzo.t}</span>
              )
            )}
          </p>
          {d.apertura.sommario.map((p, i) => (
            <p key={i} className="sommario">
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="blocco archivio">
        <Apparato voci={d.archivio.apparato}>
          <p className="legenda">
            <span>
              <i className="pallino-blu" />
              {d.archivio.legenda.diretto}
            </span>
            <span>
              <i className="pallino-grigio" />
              {d.archivio.legenda.gara}
            </span>
          </p>
        </Apparato>
        <div className="contenuto">
          <Archivio />
          <p className="assi">
            <span>2015</span>
            <span>2020</span>
            <span>2025</span>
          </p>
        </div>
      </section>

      {d.lavori.items.map((lavoro, i) => (
        <Rivela key={lavoro.id} className="blocco">
          <Apparato
            voci={lavoro.apparato}
            limite={"limite" in lavoro ? lavoro.limite : undefined}
            collegamenti={collegamentiLavoro[lavoro.id]}
            etichettaCollegamenti={d.lavori.vedi}
          />
          <div className="contenuto">
            <p className="occhiello">
              {d.lavori.occhiello} — {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="titolo">{lavoro.titolo}</h2>
            <p className="sottotitolo">{lavoro.sottotitolo}</p>
            <ul className="voci">
              {lavoro.voci.map((v) => (
                <li key={v.h}>
                  <h3>{v.h}</h3>
                  <p>{v.p}</p>
                </li>
              ))}
            </ul>
          </div>
        </Rivela>
      ))}

      <Rivela className="blocco">
        <Apparato voci={d.percorso.apparato} />
        <div className="contenuto">
          <p className="occhiello">{d.percorso.occhiello}</p>
          <h2 className="titolo">{d.percorso.titolo}</h2>
          <ul className="tappe">
            {d.percorso.tappe.map((t) => (
              <li key={t.cosa}>
                <span className="anno">{t.anno}</span>
                <span>
                  <strong>{t.cosa}</strong>
                  <br />
                  <span className="dove">{t.dove}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Rivela>

      <Rivela className="blocco">
        <span id="contatti" />
        <Apparato voci={d.contatti.apparato} />
        <div className="contenuto">
          <p className="occhiello">{d.contatti.occhiello}</p>
          <h2 className="titolo">{d.contatti.titolo}</h2>
          <p className="sottotitolo">{d.contatti.sottotitolo}</p>

          <ul className="recapiti">
            {elenco.map(([chiave, r]) => (
              <li key={chiave}>
                <a href={r.href}>
                  <span className="etichetta">{d.contatti.etichette[chiave]}</span>
                  <span className="valore">{r.valore}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="scarica">
            {(["it", "en", "es"] as const).map((l) => (
              <a key={l} href={curriculum[l]} download>
                ↓ {d.contatti.cv[l]}
              </a>
            ))}
          </div>
        </div>
      </Rivela>

      <footer className="piede">
        <span>{d.piede.sinistra}</span>
        <span>{d.piede.destra}</span>
      </footer>
    </div>
  );
}
