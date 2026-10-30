import type { Metadata } from "next";
import { getDizionario, type Lingua } from "@/dictionaries";
import Olio from "@/components/Olio";
import { altriLocale, localeDi, nomeSito, urlSito } from "@/content/sito";

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
      url: `/${lang}/olio`,
      siteName: nomeSito,
      locale: localeDi(lang),
      alternateLocale: altriLocale(lang),
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
  const url = `${urlSito}/${lingua}/olio`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#pagina`,
        url,
        name: d.olio.meta.titolo,
        description: d.olio.meta.descrizione,
        inLanguage: lingua,
        isPartOf: { "@id": `${urlSito}/#sito` },
        about: { "@id": `${urlSito}/#persona` },
        author: { "@id": `${urlSito}/#persona` },
        primaryImageOfPage: `${urlSito}/og.png`,
        breadcrumb: { "@id": `${url}#briciole` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#briciole`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: d.nome, item: `${urlSito}/${lingua}` },
          { "@type": "ListItem", position: 2, name: d.olio.titolo, item: url },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Olio d={d} lingua={lingua} />
    </>
  );
}
