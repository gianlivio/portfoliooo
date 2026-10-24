/**
 * Video e foto dell'uliveto, ognuno accanto al testo che racconta la stessa cosa.
 *   alberi:   gli ulivi, la terra, la campagna — appesi fra gli alberi nella prima parte del cammino;
 *   raccolta: reti, pertiche, cassette, persone — accanto alle reti e alle cassette, a metà cammino;
 *   frantoio: la frangitura, la spremitura, l'olio che esce — attorno alla macina, in fondo.
 * Nello stesso luogo i quadri si distribuiscono da soli, alternando i lati. src è il percorso del file servito
 * (in public/ o da un servizio esterno); poster l'immagine che si vede prima che il video parta.
 * Finché un posto è vuoto (media null) si vede la cornice con "Video in arrivo".
 * I file stanno in public/olio/video/ (mp4 compressi per il web e un fotogramma jpg per ciascuno) e public/olio/foto/.
 */
export type Luogo = "alberi" | "raccolta" | "frantoio";
export type Media = { tipo: "video" | "foto"; src: string; poster?: string } | null;
/**
 * tappa: il testo a cui il video è legato (id della tappa: apertura, storia-0…2, metodo-0…3, frantoio).
 * Il quadro sta qualche metro più avanti di dove ci si ferma per leggere, dalla parte libera dal testo;
 * quelli della tappa "frantoio" stanno in arco dietro la macina. luogo serve senza la scena 3D,
 * per raggruppare i video sotto il testo.
 */
/**
 * forma: come sta nella scena.
 *   bacheca  (predefinita) un quadro su pali o cavalletto, dalla parte libera dal testo;
 *   filo     appesa con le mollette a un filo teso sopra la trazzera, come i panni stesi;
 *   muretto  una stampa piccola appoggiata sul colmo del muretto a secco;
 *   cassette sulla cassetta che fa da tavola, nel pranzo in campagna.
 */
export type Forma = "bacheca" | "filo" | "muretto" | "cassette";
export type VoceMedia = { luogo: Luogo; tappa: string; media: Media; forma?: Forma; didascalia?: { it: string; en: string; es: string } };

const v = (nome: string): Media => ({ tipo: "video", src: `/olio/video/${nome}.mp4`, poster: `/olio/video/${nome}.jpg` });
const f = (nome: string): Media => ({ tipo: "foto", src: `/olio/foto/${nome}.jpg` });

export const mediaOlio: VoceMedia[] = [
  { luogo: "alberi", tappa: "apertura", media: { tipo: "foto", src: "/olio/foto/caffe.jpg" }, didascalia: { it: "Pausa caffè in campagna", en: "Coffee break in the grove", es: "Pausa para el café en el campo" } },
  { luogo: "alberi", tappa: "storia-0", media: v("ulivo"), didascalia: { it: "Un ulivo del podere", en: "One of the olive trees", es: "Uno de los olivos" } },
  { luogo: "raccolta", tappa: "storia-1", media: v("carico"), didascalia: { it: "Mia madre, col carico del giorno", en: "My mother, with the day's load", es: "Mi madre, con la carga del día" } },
  { luogo: "raccolta", tappa: "storia-1", forma: "cassette", media: f("pranzo"), didascalia: { it: "Il pranzo, sulle cassette", en: "Lunch, on the crates", es: "El almuerzo, sobre las cajas" } },
  { luogo: "raccolta", tappa: "storia-2", media: v("raccolta-reti"), didascalia: { it: "Si raccolgono le reti", en: "Gathering the nets", es: "Recogiendo las redes" } },
  { luogo: "raccolta", tappa: "metodo-0", media: v("reti"), didascalia: { it: "Le olive sulle reti", en: "Olives on the nets", es: "Aceitunas en las redes" } },
  { luogo: "raccolta", tappa: "metodo-0", forma: "filo", media: f("reti-stese"), didascalia: { it: "Si stendono le reti", en: "Spreading the nets", es: "Tendiendo las redes" } },
  { luogo: "raccolta", tappa: "metodo-0", forma: "filo", media: f("sotto-gli-ulivi"), didascalia: { it: "Tutti sotto gli alberi", en: "Everyone under the trees", es: "Todos bajo los árboles" } },
  { luogo: "raccolta", tappa: "metodo-0", forma: "filo", media: f("abbacchiatore"), didascalia: { it: "Con l'abbacchiatore", en: "With the olive shaker", es: "Con el vareador" } },
  { luogo: "raccolta", tappa: "metodo-0", forma: "filo", media: f("pertiche"), didascalia: { it: "Pertiche e carriola", en: "Poles and wheelbarrow", es: "Varas y carretilla" } },
  { luogo: "alberi", tappa: "metodo-1", media: v("cassette-ulivi"), didascalia: { it: "Cassette piene, fra gli ulivi", en: "Full crates among the trees", es: "Cajas llenas entre los olivos" } },
  { luogo: "alberi", tappa: "metodo-1", forma: "muretto", media: f("oliva"), didascalia: { it: "L'oliva all'invaiatura", en: "An olive at veraison", es: "Una aceituna en envero" } },
  { luogo: "frantoio", tappa: "metodo-2", media: v("nastro"), didascalia: { it: "Le olive verso la frangitura", en: "Olives on their way to the crusher", es: "Las aceitunas hacia la molienda" } },
  { luogo: "frantoio", tappa: "metodo-2", media: v("pressa"), didascalia: { it: "La pressa coi fiscoli", en: "The press and its mats", es: "La prensa con los capachos" } },
  { luogo: "frantoio", tappa: "metodo-3", media: v("filtro"), didascalia: { it: "Filtrato, nel bidone", en: "Filtered, into the can", es: "Filtrado, al bidón" } },
  { luogo: "frantoio", tappa: "frantoio", media: v("olio"), didascalia: { it: "L'olio nuovo", en: "New oil", es: "El aceite nuevo" } },
];
