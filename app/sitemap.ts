import type { MetadataRoute } from "next";
import { lingue } from "@/dictionaries";
import { urlSito } from "@/content/sito";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = urlSito;

  const lingueDi = (percorso: string) => ({
    languages: Object.fromEntries([...lingue.map((l) => [l, `${baseUrl}/${l}${percorso}`]), ["x-default", `${baseUrl}/it${percorso}`]]),
  });
  return lingue.flatMap((lang) => [
    { url: `${baseUrl}/${lang}`, lastModified: new Date(), alternates: lingueDi("") },
    { url: `${baseUrl}/${lang}/olio`, lastModified: new Date(), alternates: lingueDi("/olio") },
  ]);
}
