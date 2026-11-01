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
  // il tono: il taccuino di un viaggiatore del Grand Tour, fra Sette e Ottocento; asciutto, colto, un po' ironico
  it: {
    etna: "'A Muntagna: così i catanesi chiamano l'Etna, come una parente; fuma, brontola, e ogni tanto rifà la strada",
    sieteColores: "Purmamarca, il Cerro de los Siete Colores: il geologo lo spiega, il viaggiatore non gli crede",
    iguazu: "Iguazú, la Garganta del Diablo: si racconta che Eleanor Roosevelt, vedendola, abbia detto «povero Niagara»",
    peritoMoreno: "Il Perito Moreno: un ghiaccio che ancora avanza, e annuncia ogni passo con un tuono",
    puntaSecca: "Punta Secca: un faro, una spiaggia, e la casa di un commissario che non è mai esistito, eppure ci abita",
    barocco: "Ibla e Modica, rifatte dopo il 1693 come se il terremoto fosse stato un pretesto; e Comiso, il mio paese, con la sua pagoda nata contro i missili",
    labirinto: "Il Labirinto di Arianna, alla Fiumara d'Arte: ci si entra per smarrirsi, se ne esce, dicono, rinati",
    liotru: "U Liotru: un elefante di lava con l'obelisco in groppa che, a sentire i catanesi, tiene a bada il vulcano",
    tempio: "Un tempio dorico ai piedi dell'Etna, eretto per gli dèi e finito ai turisti: la pietra non fa preferenze",
    alhambra: "L'Alhambra vista dall'Albaicín: i re nasridi la lasciarono ai poeti, i poeti alle code",
    albaicin: "L'Albaicín: calce, cármenes dietro i muri, e al mirador di San Nicolás un tramonto dove tutti fingono di non essere turisti",
    sacromonte: "Il Sacromonte: l'abbazia in cima, le cuevas sul fianco, e fra le due il flamenco, che non chiede permesso a nessuna",
    alcaiceria: "L'Alcaicería, il vecchio mercato della seta all'ombra della Cattedrale: qui ho abitato",
    flamenco: "Una zambra al Sacromonte: la grotta, la chitarra, e quel duende che nessuno ha mai saputo tradurre",
    bologna: "Bologna e San Luca: seicentosessantasei archi di portico per salire al santuario, e per me qualche anno di filosofia e semiotica",
    rave: "Baccanale moderno in aperta campagna: casse, laser e piedi che non si fermano; fuori dalle transenne, la polizia aspetta l'alba con gli altri",
    lunaPark: "Il luna park sul lungomare: gira la ruota, gira il calcinculo, e d'estate la notte non trova la strada di casa",
    petrolchimico: "Le torce del petrolchimico, come a Priolo e a Gela: fuochi che nessuna notte spegne, e che nessuno guarda volentieri",
  },
  en: {
    etna: "'A Muntagna: so Catania calls Etna, as one would a relative; it smokes, it grumbles, and now and then it redraws the roads",
    sieteColores: "Purmamarca, the Hill of Seven Colours: the geologist explains it, the traveller does not believe him",
    iguazu: "Iguazú, the Devil's Throat: Eleanor Roosevelt, it is said, took one look and sighed «poor Niagara»",
    peritoMoreno: "The Perito Moreno: a glacier that still advances, and announces each step with thunder",
    puntaSecca: "Punta Secca: a lighthouse, a beach, and the house of an inspector who never existed, yet lives there",
    barocco: "Ibla and Modica, rebuilt after 1693 as if the earthquake had been an excuse; and Comiso, my hometown, with its pagoda born against the missiles",
    labirinto: "Ariadne's Labyrinth at Fiumara d'Arte: one enters to get lost, and leaves, they say, reborn",
    liotru: "U Liotru: a lava elephant with an obelisk on its back which, Catania assures you, keeps the volcano in check",
    tempio: "A Doric temple at the foot of Etna, raised for the gods and left to the tourists: stone has no favourites",
    alhambra: "The Alhambra seen from the Albaicín: the Nasrid kings left it to the poets, the poets to the queues",
    albaicin: "The Albaicín: whitewash, gardens behind walls, and at San Nicolás a sunset where everyone pretends not to be a tourist",
    sacromonte: "The Sacromonte: the abbey above, the caves along its flank, and between them flamenco, which asks neither for leave",
    alcaiceria: "The Alcaicería, the old silk market in the shadow of the Cathedral: I lived here",
    flamenco: "A zambra in the Sacromonte: the cave, the guitar, and that duende no one has ever managed to translate",
    bologna: "Bologna and San Luca: six hundred and sixty-six arches of portico up to the sanctuary, and for me a few years of philosophy and semiotics",
    rave: "A modern bacchanal in open country: speakers, lasers and feet that never stop; beyond the barriers, the police wait for dawn like everyone else",
    lunaPark: "The funfair on the seafront: the wheel turns, the swings turn, and in summer the night cannot find its way home",
    petrolchimico: "The flares of the refinery, as at Priolo and Gela: fires no night puts out, and no one watches gladly",
  },
  es: {
    etna: "'A Muntagna: así llaman en Catania al Etna, como a una pariente; humea, refunfuña, y de vez en cuando rehace los caminos",
    sieteColores: "Purmamarca, el Cerro de los Siete Colores: el geólogo lo explica, el viajero no se lo cree",
    iguazu: "Iguazú, la Garganta del Diablo: cuentan que Eleanor Roosevelt, al verla, suspiró «pobre Niágara»",
    peritoMoreno: "El Perito Moreno: un hielo que todavía avanza, y anuncia cada paso con un trueno",
    puntaSecca: "Punta Secca: un faro, una playa, y la casa de un comisario que nunca existió y, sin embargo, vive allí",
    barocco: "Ibla y Módica, rehechas tras 1693 como si el terremoto hubiera sido un pretexto; y Comiso, mi pueblo, con su pagoda nacida contra los misiles",
    labirinto: "El Laberinto de Ariadna, en la Fiumara d'Arte: se entra para perderse y se sale, dicen, renacido",
    liotru: "U Liotru: un elefante de lava con un obelisco a cuestas que, según los cataneses, mantiene a raya al volcán",
    tempio: "Un templo dórico al pie del Etna, alzado para los dioses y acabado para los turistas: la piedra no tiene favoritos",
    alhambra: "La Alhambra vista desde el Albaicín: los reyes nazaríes se la dejaron a los poetas, y los poetas a las colas",
    albaicin: "El Albaicín: cal, cármenes tras los muros, y en San Nicolás un atardecer donde todos fingen no ser turistas",
    sacromonte: "El Sacromonte: la abadía arriba, las cuevas en la ladera, y entre ambas el flamenco, que no pide permiso a ninguna",
    alcaiceria: "La Alcaicería, el viejo mercado de la seda a la sombra de la Catedral: aquí viví",
    flamenco: "Una zambra en el Sacromonte: la cueva, la guitarra y ese duende que nadie ha sabido traducir",
    bologna: "Bolonia y San Luca: seiscientos sesenta y seis arcos de pórtico hasta el santuario, y para mí unos años de filosofía y semiótica",
    rave: "Bacanal moderna en pleno campo: altavoces, láseres y pies que no paran; tras las vallas, la policía espera el alba como todos",
    lunaPark: "La feria del paseo marítimo: gira la noria, gira el columpio, y en verano la noche no encuentra el camino de vuelta",
    petrolchimico: "Las antorchas de la refinería, como en Priolo y Gela: fuegos que ninguna noche apaga, y que nadie mira a gusto",
  },
};
