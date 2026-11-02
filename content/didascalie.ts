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
  | "petrolchimico";

export const didascalie: Record<string, Record<IdLuogo, string>> = {
  // il tono: una guida di viaggio d'altri tempi, sobria e precisa; nessuna battuta
  it: {
    etna: "'A Muntagna: l'Etna, il vulcano della mia isola, il segno della Sicilia",
    sieteColores: "Il Cerro de los Siete Colores sopra Purmamarca, nella Quebrada de Humahuaca: strati di arenaria, argilla e calcare di età diverse",
    iguazu: "Le cascate dell'Iguazú, fra Argentina e Brasile: circa duecentosettanta salti, il maggiore è la Garganta del Diablo",
    peritoMoreno: "Il ghiacciaio Perito Moreno, nel Parco Nazionale Los Glaciares: un fronte di ghiaccio alto una settantina di metri sul Lago Argentino",
    puntaSecca: "Punta Secca, sulla costa iblea: il faro e la casa sul mare del commissario Montalbano",
    barocco: "Ibla e Modica, ricostruite dopo il terremoto del 1693 nel barocco del Val di Noto; e Comiso, il mio paese, con la Pagoda della Pace del reverendo Morishita",
    labirinto: "Il Labirinto di Arianna di Italo Lanfredini, a Castel di Lucio, nella Fiumara d'Arte",
    liotru: "U Liotru, l'elefante di pietra lavica di Catania. Dei tre popoli della Sicilia antica, Sicani, Elimi e Siculi, questa è la terra dei Siculi: la parte da cui viene la mia cultura",
    tempio: "Un tempio dorico ai piedi dell'Etna: costruito, frequentato dai fedeli, caduto in rovina, visitato dai turisti",
    alhambra: "L'Alhambra, ultima roccaforte araba d'Europa: la reggia della dinastia nasride, consegnata ai Re Cattolici nel 1492",
    albaicin: "L'Albaicín, il quartiere arabo di fronte all'Alhambra: case bianche, cármenes, il mirador di San Nicolás",
    sacromonte: "Il Sacromonte: in cima l'abbazia, sul fianco le cuevas scavate nella roccia, dove abitano i gitani di Granada",
    alcaiceria: "L'Alcaicería, l'antico mercato della seta accanto alla Cattedrale di Granada: qui ho abitato",
    flamenco: "Una zambra al Sacromonte: il flamenco dei gitani di Granada, dentro una cueva",
    bologna: "Bologna e il santuario di San Luca, col portico di seicentosessantasei archi: qui ho studiato filosofia e semiotica",
    rave: "Montedonato, sui colli di Bologna: un rave dove ho suonato, che i giornali ribattezzarono «Montedannato» e le istituzioni trattarono come un male da combattere. Fu l'inizio: i centri sociali ci chiamarono per le serate benefit per le spese legali, e da lì ho suonato in tutta Europa e organizzato feste nei locali",
    petrolchimico: "Le torce del petrolchimico, come a Priolo e a Gela, sulle coste della Sicilia orientale e meridionale",
  },
  en: {
    etna: "'A Muntagna: Etna, the volcano of my island, the sign of Sicily",
    sieteColores: "The Hill of Seven Colours above Purmamarca, in the Quebrada de Humahuaca: layers of sandstone, clay and limestone of different ages",
    iguazu: "The Iguazú Falls, between Argentina and Brazil: some two hundred and seventy cascades, the greatest the Devil's Throat",
    peritoMoreno: "The Perito Moreno Glacier, in Los Glaciares National Park: a wall of ice some seventy metres high above Lake Argentino",
    puntaSecca: "Punta Secca, on the Hyblaean coast: the lighthouse and Inspector Montalbano's house by the sea",
    barocco: "Ibla and Modica, rebuilt after the earthquake of 1693 in the Baroque of the Val di Noto; and Comiso, my hometown, with the Peace Pagoda of the Reverend Morishita",
    labirinto: "Ariadne's Labyrinth by Italo Lanfredini, at Castel di Lucio, in the Fiumara d'Arte",
    liotru: "U Liotru, the lava-stone elephant of Catania. Of the three peoples of ancient Sicily, Sicani, Elymians and Sicels, this is the land of the Sicels: the part my culture comes from",
    tempio: "A Doric temple at the foot of Etna: built, attended by the faithful, fallen into ruin, visited by tourists",
    alhambra: "The Alhambra, last Arab stronghold in Europe: palace of the Nasrid dynasty, surrendered to the Catholic Monarchs in 1492",
    albaicin: "The Albaicín, the Moorish quarter facing the Alhambra: white houses, cármenes, the viewpoint of San Nicolás",
    sacromonte: "The Sacromonte: the abbey above, and along its flank the caves cut into the rock where the gitanos of Granada live",
    alcaiceria: "The Alcaicería, the old silk market beside Granada Cathedral: I lived here",
    flamenco: "A zambra in the Sacromonte: the flamenco of the gitanos of Granada, inside a cave",
    bologna: "Bologna and the sanctuary of San Luca, with its portico of six hundred and sixty-six arches: where I studied philosophy and semiotics",
    rave: "Montedonato, in the hills of Bologna: a rave where I played, which the papers renamed «Montedannato» and the institutions treated as an evil to be fought. It was the beginning: social centres called us for benefit nights to cover the legal costs, and from there I played across Europe and organised parties in clubs",
    petrolchimico: "The flares of the refinery, as at Priolo and Gela, on the eastern and southern coasts of Sicily",
  },
  es: {
    etna: "'A Muntagna: el Etna, el volcán de mi isla, el signo de Sicilia",
    sieteColores: "El Cerro de los Siete Colores sobre Purmamarca, en la Quebrada de Humahuaca: estratos de arenisca, arcilla y caliza de distintas edades",
    iguazu: "Las cataratas del Iguazú, entre Argentina y Brasil: unos doscientos setenta saltos, el mayor es la Garganta del Diablo",
    peritoMoreno: "El glaciar Perito Moreno, en el Parque Nacional Los Glaciares: un frente de hielo de unos setenta metros sobre el Lago Argentino",
    puntaSecca: "Punta Secca, en la costa iblea: el faro y la casa junto al mar del comisario Montalbano",
    barocco: "Ibla y Módica, reconstruidas tras el terremoto de 1693 en el barroco del Val di Noto; y Comiso, mi pueblo, con la Pagoda de la Paz del reverendo Morishita",
    labirinto: "El Laberinto de Ariadna de Italo Lanfredini, en Castel di Lucio, en la Fiumara d'Arte",
    liotru: "U Liotru, el elefante de piedra volcánica de Catania. De los tres pueblos de la Sicilia antigua, sicanos, élimos y sículos, esta es la tierra de los sículos: la parte de la que viene mi cultura",
    tempio: "Un templo dórico al pie del Etna: construido, frecuentado por los fieles, caído en ruinas, visitado por los turistas",
    alhambra: "La Alhambra, último bastión árabe de Europa: el palacio de la dinastía nazarí, entregado a los Reyes Católicos en 1492",
    albaicin: "El Albaicín, el barrio árabe frente a la Alhambra: casas blancas, cármenes, el mirador de San Nicolás",
    sacromonte: "El Sacromonte: arriba la abadía, en la ladera las cuevas excavadas en la roca donde viven los gitanos de Granada",
    alcaiceria: "La Alcaicería, el antiguo mercado de la seda junto a la Catedral de Granada: aquí viví",
    flamenco: "Una zambra en el Sacromonte: el flamenco de los gitanos de Granada, dentro de una cueva",
    bologna: "Bolonia y el santuario de San Luca, con su pórtico de seiscientos sesenta y seis arcos: aquí estudié filosofía y semiótica",
    rave: "Montedonato, en las colinas de Bolonia: una rave donde toqué, que los periódicos rebautizaron «Montedannato» y las instituciones trataron como un mal que combatir. Fue el comienzo: los centros sociales nos llamaron para noches benéficas por los gastos legales, y desde allí toqué por toda Europa y organicé fiestas en locales",
    petrolchimico: "Las antorchas de la refinería, como en Priolo y Gela, en las costas oriental y meridional de Sicilia",
  },
};
