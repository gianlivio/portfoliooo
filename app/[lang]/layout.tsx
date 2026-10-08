import type { Metadata } from "next";
import localFont from "next/font/local";
import { getDizionario, lingue } from "@/dictionaries";
import "../globals.css";
import { urlSito } from "@/content/sito";

/* Font auto-ospitati in app/fonts: il build non dipende da Google Fonts. */
const serif = localFont({
  src: [
    { path: "../fonts/newsreader-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../fonts/newsreader-latin-300-italic.woff2", weight: "300", style: "italic" },
    { path: "../fonts/newsreader-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/newsreader-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

const sans = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export function generateStaticParams() {
  return lingue.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const d = getDizionario(lang);
  const baseUrl = urlSito;
  return {
    metadataBase: new URL(baseUrl),
    title: d.meta.titolo,
    description: d.meta.descrizione,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        it: "/it",
        en: "/en",
        es: "/es",
      },
    },
    openGraph: {
      title: d.meta.titolo,
      description: d.meta.descrizione,
      type: "profile",
      locale: lang,
    },
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <html lang={lang} className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
