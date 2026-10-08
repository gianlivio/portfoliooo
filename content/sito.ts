/** Indirizzo pubblico del sito: NEXT_PUBLIC_SITE_URL se impostato, altrimenti il dominio di produzione Vercel. */
export const urlSito =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
