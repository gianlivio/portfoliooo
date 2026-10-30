/**
 * Le didascalie dei luoghi della stanza: una riga per luogo, nelle tre lingue.
 * Si leggono al passaggio del puntatore, o toccando il luogo sul telefono (components/Didascalie.tsx).
 */
export type IdLuogo =
  | "etna"
  | "sieteColores"
  | "iguazu"
  | "peritoMoreno"
  | "puntaSecca"
  | "barocco"
  | "labirinto"
  | "liotru"
  | "tempio"
  | "alhambra"
  | "albaicin"
  | "sacromonte"
  | "alcaiceria"
  | "flamenco"
  | "bologna"
  | "rave"
  | "lunaPark"
  | "petrolchimico";

export const didascalie: Record<string, Record<IdLuogo, string>> = {
  it: {
    etna: "L'Etna, che a Catania chiamano 'a Muntagna",
    sieteColores: "Il Cerro de los Siete Colores, Purmamarca, Argentina",
    iguazu: "Le cascate dell'Iguazú, la Garganta del Diablo, Argentina",
    peritoMoreno: "Il ghiacciaio Perito Moreno, Patagonia, Argentina",
    puntaSecca: "Punta Secca: il faro e la casa del commissario Montalbano",
    barocco: "Ibla e Modica, il barocco del Val di Noto, e la pagoda della pace di Comiso, il mio paese",
    labirinto: "Il Labirinto di Arianna di Italo Lanfredini, Fiumara d'Arte",
    liotru: "Catania: u Liotru, l'elefante di pietra lavica",
    tempio: "Un tempio dorico ai piedi dell'Etna: crolla nei secoli, e i fedeli diventano turisti",
    alhambra: "Granada: l'Alhambra vista dall'Albaicín",
    albaicin: "L'Albaicín, di fronte all'Alhambra: case bianche, cármenes, il mirador di San Nicolás",
    sacromonte: "Il Sacromonte: in cima l'abbazia, sul fianco le cuevas dei gitani",
    alcaiceria: "L'Alcaicería, accanto alla Cattedrale di Granada: qui ho vissuto",
    flamenco: "Una zambra al Sacromonte, sotto l'Alhambra",
    bologna: "Bologna e San Luca: dove ho studiato filosofia e semiotica",
    rave: "Un rave in campagna, fino all'alba",
    lunaPark: "Il luna park sul lungomare",
    petrolchimico: "Le torce del petrolchimico, come a Priolo e a Gela",
  },
  en: {
    etna: "Mount Etna, which Catania calls 'a Muntagna, the Mountain",
    sieteColores: "Cerro de los Siete Colores, Purmamarca, Argentina",
    iguazu: "Iguazú Falls, the Devil's Throat, Argentina",
    peritoMoreno: "Perito Moreno Glacier, Patagonia, Argentina",
    puntaSecca: "Punta Secca: the lighthouse and Inspector Montalbano's house",
    barocco: "Ibla and Modica, the Baroque of the Val di Noto, and the Peace Pagoda of Comiso, my hometown",
    labirinto: "Ariadne's Labyrinth by Italo Lanfredini, Fiumara d'Arte",
    liotru: "Catania: u Liotru, the lava-stone elephant",
    tempio: "A Doric temple at the foot of Etna: it crumbles over the centuries, and the faithful turn into tourists",
    alhambra: "Granada: the Alhambra seen from the Albaicín",
    albaicin: "The Albaicín, facing the Alhambra: white houses, cármenes, the San Nicolás viewpoint",
    sacromonte: "The Sacromonte: the abbey on top, the gitano cave houses on its flank",
    alcaiceria: "The Alcaicería, beside Granada Cathedral: I lived here",
    flamenco: "A zambra in the Sacromonte, below the Alhambra",
    bologna: "Bologna and San Luca: where I studied philosophy and semiotics",
    rave: "A rave in the countryside, until dawn",
    lunaPark: "The funfair on the seafront",
    petrolchimico: "The flares of the refinery, as in Priolo and Gela",
  },
  es: {
    etna: "El Etna, que en Catania llaman 'a Muntagna, la Montaña",
    sieteColores: "El Cerro de los Siete Colores, Purmamarca, Argentina",
    iguazu: "Las cataratas del Iguazú, la Garganta del Diablo, Argentina",
    peritoMoreno: "El glaciar Perito Moreno, Patagonia, Argentina",
    puntaSecca: "Punta Secca: el faro y la casa del comisario Montalbano",
    barocco: "Ibla y Módica, el barroco del Val di Noto, y la pagoda de la paz de Comiso, mi pueblo",
    labirinto: "El Laberinto de Ariadna de Italo Lanfredini, Fiumara d'Arte",
    liotru: "Catania: u Liotru, el elefante de piedra volcánica",
    tempio: "Un templo dórico al pie del Etna: se derrumba con los siglos, y los fieles se vuelven turistas",
    alhambra: "Granada: la Alhambra vista desde el Albaicín",
    albaicin: "El Albaicín, frente a la Alhambra: casas blancas, cármenes, el mirador de San Nicolás",
    sacromonte: "El Sacromonte: arriba la abadía, en la ladera las cuevas de los gitanos",
    alcaiceria: "La Alcaicería, junto a la Catedral de Granada: aquí viví",
    flamenco: "Una zambra en el Sacromonte, bajo la Alhambra",
    bologna: "Bolonia y San Luca: donde estudié filosofía y semiótica",
    rave: "Una rave en el campo, hasta el amanecer",
    lunaPark: "La feria en el paseo marítimo",
    petrolchimico: "Las antorchas de la refinería, como en Priolo y Gela",
  },
};
