import it from "./it.json";
import en from "./en.json";
import es from "./es.json";

export const lingue = ["it", "en", "es"] as const;
export type Lingua = (typeof lingue)[number];

const dizionari = { it, en, es } as const;

/** Tipo del dizionario, derivato dall'italiano: le altre lingue devono combaciare. */
export type Dizionario = typeof it;

export function getDizionario(lingua: string): Dizionario {
  return (dizionari[lingua as Lingua] ?? dizionari.it) as Dizionario;
}
