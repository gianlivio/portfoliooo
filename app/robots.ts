import type { MetadataRoute } from "next";
import { urlSito } from "@/content/sito";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = urlSito;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
