import type { Metadata } from "next";
import { getDizionario, type Lingua } from "@/dictionaries";
import Olio from "@/components/Olio";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const o = getDizionario(lang).olio;
  return {
    title: o.meta.titolo,
    description: o.meta.descrizione,
    alternates: {
      canonical: `/${lang}/olio`,
      languages: { it: "/it/olio", en: "/en/olio", es: "/es/olio", "x-default": "/it/olio" },
    },
    openGraph: {
      title: o.meta.titolo,
      description: o.meta.descrizione,
      type: "article",
      locale: lang,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: o.meta.titolo }],
    },
    twitter: { card: "summary_large_image", title: o.meta.titolo, description: o.meta.descrizione, images: ["/og.png"] },
  };
}

export default async function PaginaOlio({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const d = getDizionario(lang);
  const lingua = (["it", "en", "es"].includes(lang) ? lang : "it") as Lingua;
  return <Olio d={d} lingua={lingua} />;
}
