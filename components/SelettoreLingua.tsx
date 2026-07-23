import Link from "next/link";
import { lingue } from "@/dictionaries";

export default function SelettoreLingua({ attiva }: { attiva: string }) {
  return (
    <nav className="lingue" aria-label="Lingua">
      {lingue.map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          hrefLang={l}
          aria-current={l === attiva ? "true" : undefined}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
