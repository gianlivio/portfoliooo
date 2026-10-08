import { getDizionario, type Lingua } from "@/dictionaries";
import { recapiti, curriculum } from "@/content/collegamenti";
import { lavori } from "@/content/lavori";
import { urlSito } from "@/content/sito";
import Esperienza from "@/components/Esperienza";

export default async function Pagina({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const d = getDizionario(lang);
  const lingua = (["it", "en", "es"].includes(lang) ? lang : "it") as Lingua;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: d.nome,
    jobTitle: "Full Stack Web Developer",
    url: `${urlSito}/${lingua}`,
    sameAs: [recapiti.linkedin.href, recapiti.github.href],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Testo reale della pagina: lo leggono motori di ricerca e screen reader,
          compare a chi naviga da tastiera e a chi non ha WebGL o JavaScript. */}
      <main className="elenco" id="elenco">
        <h1>
          {d.nome} — {d.ruolo}
        </h1>
        <p>{d.meta.descrizione}</p>
        <h2>{d.elenco.titolo}</h2>
        <ul>
          {lavori.map((l) => {
            const t = d.lavori[l.id as keyof typeof d.lavori];
            return (
              <li key={l.id}>
                <h3>{t.titolo}</h3>
                <p>
                  {t.tipo}
                  {l.anno ? ` · ${l.anno}` : ""}
                </p>
                <p>{t.riga}</p>
                {l.link && <a href={l.link.href}>{l.link.etichetta}</a>}
              </li>
            );
          })}
        </ul>
        <h2>{d.elenco.recapiti}</h2>
        <ul>
          {Object.entries(recapiti).map(([k, r]) => (
            <li key={k}>
              <a href={r.href}>{r.valore}</a>
            </li>
          ))}
          <li>
            <a href={curriculum[lingua]} download>
              {d.elenco.cv}
            </a>
          </li>
        </ul>
      </main>

      <Esperienza d={d} lingua={lingua} />
    </>
  );
}
