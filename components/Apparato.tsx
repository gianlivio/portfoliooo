import type { Collegamento } from "@/content/collegamenti";

type Voce = { dt: string; dd: string };

export default function Apparato({
  voci,
  limite,
  collegamenti,
  etichettaCollegamenti,
  children,
}: {
  voci: readonly Voce[];
  limite?: string;
  collegamenti?: Collegamento[];
  etichettaCollegamenti?: string;
  children?: React.ReactNode;
}) {
  return (
    <aside className="apparato">
      <dl>
        {voci.map((v) => (
          <div key={v.dt}>
            <dt>{v.dt}</dt>
            <dd>{v.dd}</dd>
          </div>
        ))}

        {collegamenti && collegamenti.length > 0 && (
          <div>
            <dt>{etichettaCollegamenti}</dt>
            <dd>
              {collegamenti.map((c) => (
                <span key={c.href}>
                  <a href={c.href} target="_blank" rel="noopener noreferrer">
                    {c.etichetta}
                  </a>
                  <br />
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {children}

      {limite && (
        <p className="limite">
          <span aria-hidden="true">✎</span>
          {limite}
        </p>
      )}
    </aside>
  );
}
