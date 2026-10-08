import type { MetadataRoute } from "next";
import { lingue } from "@/dictionaries";
import { urlSito } from "@/content/sito";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = urlSito;

  return lingue.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
  }));
}
