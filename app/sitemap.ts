import type { MetadataRoute } from "next";
import { lingue } from "@/dictionaries";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return lingue.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
  }));
}
