/*
 * I contenuti della visita alla casa in campagna: le zone, le fasi, le persone, i dialoghi, i testi dell'interfaccia.
 * Tutto in tre lingue. I fatti sono quelli raccontati da Livio (la casa, il pozzo, i pannelli, le galline,
 * l'agrumeto, le varietà dell'uliveto, Chiaramonte Gulfi, il metodo dell'olio); le fasi delle colture sono
 * pratica agricola generale, senza dati dell'azienda che non ci sono.
 */

import type { Lingua } from "@/dictionaries";
import { AGRUMETO, CAVEDIO, CORPI, PISCINA, POLLAIO, POZZO, ULIVO_CAVEDIO, altrove, type P3 } from "./casaLuoghi";

export type Testo = Record<Lingua, string>;
const t = (it: string, en: string, es: string): Testo => ({ it, en, es });

export type ZonaId = "arrivo" | "agrumeto" | "piscina" | "casa" | "cavedio" | "pollaio" | "uliveto" | "chiaramonte" | "frantoio";
/** Le zone che stanno a Chiaramonte: ci si arriva in trattore. */
export const ZONE_LONTANE: ZonaId[] = ["chiaramonte", "frantoio"];

export type Fase = { titolo: Testo; testo: Testo };

export type Zona = {
  id: ZonaId;
  nome: Testo;
  occhiello: Testo;
  titolo: Testo;
  testo: Testo;
  /** dove sta la camera e dove guarda */
  camera: P3;
  guarda: P3;
  /** il segnaposto cliccabile nella scena */
  segno: P3;
  /** dove si mette Livio quando accompagna in questa zona */
  livio: P3;
  fasi?: Fase[];
};

const A = AGRUMETO, C = CORPI;

export const ZONE: Zona[] = [
  {
    id: "arrivo",
    nome: t("Arrivo", "Arrival", "Llegada"),
    occhiello: t("La strada di campagna", "The country lane", "El camino de campo"),
    titolo: t("La casa in campagna", "The house in the country", "La casa en el campo"),
    testo: t(
      "Dal cancello con le teste di moro si entra nella proprietà, chiusa dal muretto a secco: subito a destra l'agrumeto, a sinistra la piscina, in fondo la casa col cavedio. Dietro la casa ci sono il capanno, le galline e l'uliveto; fra gli ulivi e gli agrumi, gli alberi da frutto. Gli altri uliveti sono a Chiaramonte Gulfi: ci si va in trattore.",
      "Through the gate with the Moor's heads you enter the property, closed by a dry-stone wall: the citrus grove straight away on the right, the pool on the left, the house with its courtyard at the end. Behind the house are the shed, the hens and the olive grove; among the olive and citrus trees, the fruit trees. The other olive groves are in Chiaramonte Gulfi: you get there by tractor.",
      "Por la verja con las cabezas de moro se entra en la finca, cerrada por el muro de piedra seca: enseguida a la derecha los cítricos, a la izquierda la piscina, al fondo la casa con su patio. Detrás de la casa están el cobertizo, las gallinas y el olivar; entre los olivos y los cítricos, los frutales. Los otros olivares están en Chiaramonte Gulfi: se va en tractor."
    ),
    camera: [-7.2, 1.7, 49],
    guarda: [3, 2.6, -18],
    segno: [-7.1, 3.6, 36],
    livio: [-4.6, 0, 41.5],
  },
  {
    id: "agrumeto",
    nome: t("Agrumeto", "Citrus grove", "Cítricos"),
    occhiello: t("Appena entrati, a destra", "Just inside, on the right", "Nada más entrar, a la derecha"),
    titolo: t("L'agrumeto", "The citrus grove", "El huerto de cítricos"),
    testo: t(
      "Gli agrumi sono la prima cosa che si incontra arrivando, a file, sulla destra della strada.",
      "The citrus trees are the first thing you meet on the way in, in rows, on the right of the lane.",
      "Los cítricos son lo primero que se encuentra al llegar, en hileras, a la derecha del camino."
    ),
    camera: [-6.4, 1.7, 24.5],
    guarda: [8, 1.3, 17],
    segno: [(A.x0 + A.x1) / 2, 4.4, (A.z0 + A.z1) / 2],
    livio: [-2.4, 0, 21.2],
    fasi: [
      {
        titolo: t("La zagara", "Orange blossom", "El azahar"),
        testo: t(
          "In primavera gli agrumi fioriscono: fiori bianchi e profumati, che in Sicilia si chiamano zagara.",
          "In spring the citrus trees flower: white, scented blossoms, which in Sicily are called zagara.",
          "En primavera los cítricos florecen: flores blancas y perfumadas, que en Sicilia se llaman zagara."
        ),
      },
      {
        titolo: t("Frutti verdi", "Green fruit", "Frutos verdes"),
        testo: t(
          "Dopo la fioritura i frutti si formano e crescono verdi per tutta l'estate.",
          "After flowering the fruit sets and grows green all through the summer.",
          "Tras la floración se forman los frutos, que crecen verdes todo el verano."
        ),
      },
      {
        titolo: t("Maturi", "Ripe", "Maduros"),
        testo: t(
          "Fra l'autunno e l'inverno i frutti prendono colore: è il momento di raccoglierli.",
          "Between autumn and winter the fruit takes on its colour: time to pick it.",
          "Entre el otoño y el invierno los frutos toman color: es el momento de recogerlos."
        ),
      },
    ],
  },
  {
    id: "piscina",
    nome: t("Piscina", "Pool", "Piscina"),
    occhiello: t("Sul prato", "On the lawn", "En el césped"),
    titolo: t("La piscina", "The pool", "La piscina"),
    testo: t(
      "A sinistra dell'ingresso, sul prato chiuso dalla siepe.",
      "To the left of the entrance, on the lawn inside the hedge.",
      "A la izquierda de la entrada, en el césped rodeado por el seto."
    ),
    camera: [-14.2, 2.7, 23.5],
    guarda: [PISCINA.x, -0.4, PISCINA.z - 1],
    segno: [PISCINA.x, 3.2, PISCINA.z],
    livio: [-19.2, 0, 19.6],
  },
  {
    id: "casa",
    nome: t("Casa", "House", "Casa"),
    occhiello: t("Acqua dal pozzo, luce dal sole", "Water from the well, power from the sun", "Agua del pozo, luz del sol"),
    titolo: t("La casa", "The house", "La casa"),
    testo: t(
      "L'acqua viene dal pozzo, che sta dentro casa, nel cortile. L'energia viene dai pannelli solari sul tetto: la casa va a energia rinnovabile.",
      "Water comes from the well, which is inside the house, in the courtyard. Power comes from the solar panels on the roof: the house runs on renewable energy.",
      "El agua viene del pozo, que está dentro de la casa, en el patio. La energía viene de los paneles solares del tejado: la casa funciona con energía renovable."
    ),
    camera: [8.6, 1.75, -4.6],
    guarda: [POZZO[0], 1.4, POZZO[2]],
    segno: [C.torretta.x, C.torretta.h + 2.2, C.torretta.z],
    livio: [7, 0, -10.2],
  },
  {
    id: "cavedio",
    nome: t("Cavedio", "Courtyard", "Patio"),
    occhiello: t("Dentro casa", "Inside the house", "Dentro de la casa"),
    titolo: t("Il cavedio", "The courtyard", "El patio"),
    testo: t(
      "Un cortile dentro casa, coi muri bianchi tutt'attorno: l'ulivo al centro, il forno a legna e, lungo la casa, un grande porticato antico di legno.",
      "A courtyard inside the house, with white walls all around: the olive tree in the middle, the wood-fired oven and, along the house, a large old wooden portico.",
      "Un patio dentro de la casa, con muros blancos alrededor: el olivo en el centro, el horno de leña y, a lo largo de la casa, un gran porche antiguo de madera."
    ),
    camera: [CAVEDIO.varco, 1.7, CAVEDIO.z1 - 1.2],
    guarda: [-4, 1.6, -35.5],
    segno: [ULIVO_CAVEDIO[0], 5.6, ULIVO_CAVEDIO[1]],
    livio: [-11.6, 0, -29.4],
  },
  {
    id: "pollaio",
    nome: t("Galline", "Hens", "Gallinas"),
    occhiello: t("Le uova di casa", "Eggs for the house", "Los huevos de casa"),
    titolo: t("Il pollaio", "The hen house", "El gallinero"),
    testo: t(
      "Dietro casa, accanto al capanno: le galline razzolano nel recinto e fanno le uova per la casa.",
      "Behind the house, next to the shed: the hens scratch about in their run and lay eggs for the house.",
      "Detrás de la casa, junto al cobertizo: las gallinas escarban en su corral y ponen los huevos para la casa."
    ),
    camera: [-8.4, 1.7, -40.6],
    guarda: [POLLAIO.x, 0.4, POLLAIO.z],
    segno: [POLLAIO.x, 3.6, POLLAIO.z - 1],
    livio: [-5, 0, -43.4],
  },
  {
    id: "uliveto",
    nome: t("Uliveto", "Olive grove", "Olivar"),
    occhiello: t("Dietro la casa", "Behind the house", "Detrás de la casa"),
    titolo: t("L'uliveto", "The olive grove", "El olivar"),
    testo: t(
      "Tonda iblea, nocellara e moresca.",
      "Tonda iblea, nocellara and moresca.",
      "Tonda iblea, nocellara y moresca."
    ),
    camera: [-16, 1.7, -41],
    guarda: [-24, 1.6, -62],
    segno: [-22, 4.6, -56],
    livio: [-15.2, 0, -46.8],
    fasi: [
      {
        titolo: t("Fioritura", "Flowering", "Floración"),
        testo: t(
          "In primavera l'ulivo mette le mignole, grappoli di fiori bianchi minuscoli. Il polline lo porta il vento.",
          "In spring the olive tree puts out its flower clusters, tiny and white. The wind carries the pollen.",
          "En primavera el olivo echa sus racimos de flores, diminutas y blancas. El viento lleva el polen."
        ),
      },
      {
        titolo: t("Frutto verde", "Green fruit", "Fruto verde"),
        testo: t(
          "D'estate le olive crescono, verdi e dure.",
          "In summer the olives grow, green and hard.",
          "En verano las aceitunas crecen, verdes y duras."
        ),
      },
      {
        titolo: t("Invaiatura", "Veraison", "Envero"),
        testo: t(
          "In autunno le olive cambiano colore, dal verde al viola, ciascuna coi suoi tempi. Per questo conta il momento della raccolta.",
          "In autumn the olives change colour, from green to purple, each at its own pace. That is why the moment of harvest matters.",
          "En otoño las aceitunas cambian de color, del verde al morado, cada una a su ritmo. Por eso importa el momento de la cosecha."
        ),
      },
      {
        titolo: t("Raccolta", "Harvest", "Cosecha"),
        testo: t(
          "Reti stese sotto gli alberi, pertiche fra i rami, le olive nelle cassette. Poi al frantoio entro ventiquattro ore.",
          "Nets spread under the trees, poles among the branches, olives into crates. Then to the mill within twenty-four hours.",
          "Redes tendidas bajo los árboles, varas entre las ramas, las aceitunas en cajas. Luego a la almazara en menos de veinticuatro horas."
        ),
      },
    ],
  },
  {
    id: "chiaramonte",
    nome: t("Chiaramonte", "Chiaramonte", "Chiaramonte"),
    occhiello: t("Monti Iblei", "Hyblaean Mountains", "Montes Hibleos"),
    titolo: t("Gli uliveti di Chiaramonte Gulfi", "The olive groves at Chiaramonte Gulfi", "Los olivares de Chiaramonte Gulfi"),
    testo: t(
      "Sui Monti Iblei, in provincia di Ragusa: ulivi vecchi, tronchi aperti dal tempo, terra rossa. La raccolta si fa in famiglia: le reti stese, le pertiche fra i rami, mia madre sul cassone a sistemare il carico del giorno.",
      "In the Hyblaean Mountains, in the province of Ragusa: old olive trees, trunks split open by time, red earth. The harvest is a family job: nets spread out, poles among the branches, my mother on the truck bed stacking the day's load.",
      "En los Montes Hibleos, en la provincia de Ragusa: olivos viejos, troncos abiertos por el tiempo, tierra roja. La cosecha se hace en familia: las redes tendidas, las varas entre las ramas, mi madre en la caja de la camioneta colocando la carga del día."
    ),
    camera: altrove([9.5, 1.7, -27]),
    guarda: altrove([-6, 1.9, -56]),
    segno: altrove([9, 4.6, -31]),
    livio: altrove([4.4, 0, -29.8]),
  },
  {
    id: "frantoio",
    nome: t("Frantoio", "Mill", "Almazara"),
    occhiello: t("Dall'oliva all'olio", "From olive to oil", "De la aceituna al aceite"),
    titolo: t("Il frantoio", "The mill", "La almazara"),
    testo: t(
      "Le olive arrivano qui entro ventiquattro ore dalla raccolta.",
      "The olives arrive here within twenty-four hours of the harvest.",
      "Las aceitunas llegan aquí en menos de veinticuatro horas desde la cosecha."
    ),
    camera: altrove([-14, 1.75, -31.5]),
    guarda: altrove([-14, 1.3, -46]),
    segno: altrove([-14, 5.6, -40]),
    livio: altrove([-16.6, 0, -38.4]),
    fasi: [
      {
        titolo: t("Entro ventiquattro ore", "Within twenty-four hours", "En menos de veinticuatro horas"),
        testo: t(
          "Dalla pianta al frantoio in meno di un giorno: più l'oliva aspetta, più l'olio perde profumo e prende difetti. Le olive si lavano e si tolgono le foglie.",
          "From tree to mill in less than a day: the longer an olive waits, the more the oil loses aroma and picks up defects. The olives are washed and the leaves removed.",
          "Del árbol a la almazara en menos de un día: cuanto más espera la aceituna, más aroma pierde el aceite y más defectos coge. Las aceitunas se lavan y se les quitan las hojas."
        ),
      },
      {
        titolo: t("Frangitura", "Crushing", "Molienda"),
        testo: t(
          "Le macine di pietra schiacciano le olive intere, nocciolo compreso, e ne fanno una pasta.",
          "The stone mills crush the whole olives, pits and all, into a paste.",
          "Las muelas de piedra aplastan las aceitunas enteras, con hueso, y las convierten en pasta."
        ),
      },
      {
        titolo: t("La pressa coi fiscoli", "The press and its mats", "La prensa con los capachos"),
        testo: t(
          "La pasta si stende sui fiscoli, dischi intrecciati impilati sotto la pressa, e si spreme a freddo, perché l'olio conservi aromi e polifenoli.",
          "The paste is spread on the fiscoli, woven mats stacked under the press, and pressed cold, so the oil keeps its aromas and polyphenols.",
          "La pasta se extiende sobre los capachos, discos trenzados apilados bajo la prensa, y se prensa en frío, para que el aceite conserve aromas y polifenoles."
        ),
      },
      {
        titolo: t("Olio nuovo", "New oil", "Aceite nuevo"),
        testo: t(
          "Si filtra e scende nel bidone. Appena fatto è verde e torbido.",
          "It is filtered and runs into the can. Freshly made, it is green and cloudy.",
          "Se filtra y cae al bidón. Recién hecho es verde y turbio."
        ),
      },
    ],
  },
];

export const zona = (id: ZonaId) => ZONE.find((z) => z.id === id) as Zona;

/* ------------------------------------------------------------------ persone e dialoghi */

/** Una domanda e la sua risposta; poi le domande che seguono; vai porta in una zona. */
export type Tema = { d: Testo; r: Testo; poi?: Tema[]; vai?: ZonaId };
/** Quello che una persona dice in una zona: il saluto, una domanda per ogni fase, i temi fissi. */
export type Copione = { saluto: Testo; perFase?: Tema[]; temi: Tema[] };

export type Aspetto = {
  pelle: string;
  capelli: { stile: "raccolti" | "corti" | "coda" | "rasati" | "rasta"; colore: string };
  barba?: "corta" | "baffi" | "lunga" | "pizzo";
  cappello?: { tipo: "coppola" | "paglia" | "berretto"; colore: string };
  maglia: { colore: string; maniche: "corte" | "lunghe" };
  pantaloni: string;
  /** pantaloni corti fino al ginocchio */
  corti?: boolean;
  scarpe: string;
  /** stivali di gomma alti */
  stivali?: string;
  guanti?: string;
  grembiule?: string;
  gilet?: string;
  braccialetto?: string;
  /** altezza in metri */
  altezza?: number;
  /** 1 = media; più alto, più robusto */
  corpo?: number;
};

export type Azione = "fermo" | "raccoglie" | "abbacchia" | "lavora";

export type Personaggio = {
  id: string;
  nome: Testo;
  /** la riga piccola sull'etichetta */
  sotto: Testo;
  zona?: ZonaId;
  pos?: P3;
  azione?: Azione;
  aspetto: Aspetto;
  /** il ritratto nel dialogo, ritagliato da una foto */
  ritratto?: string;
  copioni: Partial<Record<ZonaId, Copione>>;
};

const livio: Personaggio = {
  id: "livio",
  nome: t("Livio", "Livio", "Livio"),
  sotto: t("Parla con me", "Talk to me", "Habla conmigo"),
  // dalle foto: rasta lunghi scuri, baffi e pizzo, maglietta blu scuro, pantaloni corti grigi, stivali di gomma
  aspetto: {
    pelle: "#C99876",
    capelli: { stile: "rasta", colore: "#2A1E16" },
    barba: "pizzo",
    maglia: { colore: "#1E2433", maniche: "corte" },
    pantaloni: "#4A4A46",
    corti: true,
    scarpe: "#3A3A38",
    stivali: "#3E403C",
    altezza: 1.8,
    corpo: 0.94,
  },
  ritratto: "/olio/ritratti/livio.jpg",
  copioni: {
    arrivo: {
      saluto: t(
        "Ciao, sono Livio. Questa è la mia casa in campagna: ti faccio fare il giro.",
        "Hi, I'm Livio. This is my house in the country: let me show you around.",
        "Hola, soy Livio. Esta es mi casa en el campo: te enseño todo."
      ),
      temi: [
        {
          d: t("Chi sei?", "Who are you?", "¿Quién eres?"),
          r: t(
            "Faccio siti web. Prima facevo olio: con la mia famiglia da quando ero bambino, poi per mestiere, da imprenditore agricolo professionale.",
            "I build websites. Before that I made olive oil: with my family since I was a child, then as a profession, as a professional farmer.",
            "Hago páginas web. Antes hacía aceite: con mi familia desde niño, y luego como oficio, de agricultor profesional."
          ),
        },
        {
          d: t("Cosa c'è qui?", "What's here?", "¿Qué hay aquí?"),
          r: t(
            "A destra l'agrumeto, a sinistra la piscina, in fondo la casa. Dietro la casa l'uliveto e le galline. Per gli uliveti di Chiaramonte si prende il trattore, all'aia.",
            "The citrus grove on the right, the pool on the left, the house at the end. Behind the house the olive grove and the hens. For the groves at Chiaramonte you take the tractor, in the yard.",
            "A la derecha los cítricos, a la izquierda la piscina, al fondo la casa. Detrás de la casa el olivar y las gallinas. Para los olivares de Chiaramonte se coge el tractor, en la era."
          ),
          vai: "agrumeto",
        },
      ],
    },
    agrumeto: {
      saluto: t("L'agrumeto: è la prima cosa che si incontra.", "The citrus grove: the first thing you meet.", "Los cítricos: lo primero que se encuentra."),
      temi: [
        {
          d: t("Cos'è la zagara?", "What is zagara?", "¿Qué es la zagara?"),
          r: t(
            "Il fiore degli agrumi: bianco, profumato, in primavera.",
            "The citrus blossom: white and scented, in spring.",
            "La flor de los cítricos: blanca, perfumada, en primavera."
          ),
        },
        {
          d: t("Quando maturano?", "When do they ripen?", "¿Cuándo maduran?"),
          r: t(
            "Fra l'autunno e l'inverno. Puoi cambiare stagione dal pannello.",
            "Between autumn and winter. You can change season from the panel.",
            "Entre el otoño y el invierno. Puedes cambiar de estación desde el panel."
          ),
        },
        {
          d: t("E poi?", "And then?", "¿Y luego?"),
          r: t("Dall'altra parte della strada c'è la piscina.", "On the other side of the lane is the pool.", "Al otro lado del camino está la piscina."),
          vai: "piscina",
        },
      ],
    },
    piscina: {
      saluto: t("La piscina, per l'estate.", "The pool, for the summer.", "La piscina, para el verano."),
      temi: [
        {
          d: t("E la casa?", "And the house?", "¿Y la casa?"),
          r: t(
            "Più avanti, in fondo alla strada, col pozzo e i pannelli sul tetto.",
            "Further on, at the end of the lane, with the well and the panels on the roof.",
            "Más adelante, al final del camino, con el pozo y los paneles en el tejado."
          ),
          vai: "casa",
        },
      ],
    },
    casa: {
      saluto: t("Questa è casa.", "This is home.", "Esta es la casa."),
      temi: [
        {
          d: t("Da dove viene l'acqua?", "Where does the water come from?", "¿De dónde viene el agua?"),
          r: t("Dal pozzo, che sta dentro casa, nel cortile.", "From the well, which is inside the house, in the courtyard.", "Del pozo, que está dentro de la casa, en el patio."),
        },
        {
          d: t("E la corrente?", "And the power?", "¿Y la electricidad?"),
          r: t(
            "Dai pannelli solari sul tetto: la casa va a energia rinnovabile.",
            "From the solar panels on the roof: the house runs on renewable energy.",
            "De los paneles solares del tejado: la casa funciona con energía renovable."
          ),
        },
        {
          d: t("E le teste di moro?", "And the Moor's heads?", "¿Y las cabezas de moro?"),
          r: t(
            "Sono vasi di ceramica, tipici della Sicilia: stanno sui pilastri del cancello e sopra l'ingresso di casa.",
            "They are ceramic pots, typical of Sicily: they sit on the gate pillars and above the entrance of the house.",
            "Son jarrones de cerámica, típicos de Sicilia: están sobre los pilares de la verja y encima de la entrada de la casa."
          ),
        },
        {
          d: t("E di là?", "And over there?", "¿Y por allí?"),
          r: t("Il cavedio, dentro casa.", "The courtyard, inside the house.", "El patio, dentro de la casa."),
          vai: "cavedio",
        },
      ],
    },
    cavedio: {
      saluto: t("Il cavedio.", "The courtyard.", "El patio."),
      temi: [
        {
          d: t("Cos'è quel forno?", "What's that oven?", "¿Qué es ese horno?"),
          r: t("Il forno a legna.", "The wood-fired oven.", "El horno de leña."),
        },
        {
          d: t("E il porticato?", "And the portico?", "¿Y el porche?"),
          r: t("È di legno, antico.", "It's wooden, and old.", "Es de madera, antiguo."),
        },
        {
          d: t("Cosa c'è dietro casa?", "What's behind the house?", "¿Qué hay detrás de la casa?"),
          r: t("Il capanno e le galline, e più in là l'uliveto.", "The shed and the hens, and further on the olive grove.", "El cobertizo y las gallinas, y más allá el olivar."),
          vai: "pollaio",
        },
      ],
    },
    pollaio: {
      saluto: t("Le galline.", "The hens.", "Las gallinas."),
      temi: [
        {
          d: t("A cosa servono?", "What are they for?", "¿Para qué sirven?"),
          r: t("Alle uova per la casa.", "Eggs for the house.", "Para los huevos de casa."),
        },
        {
          d: t("Chi è il cane?", "Who's the dog?", "¿Quién es el perro?"),
          r: t("Romero, il mio cane: un cane corso.", "Romero, my dog: a cane corso.", "Romero, mi perro: un cane corso."),
        },
        {
          d: t("E l'uliveto?", "And the olive grove?", "¿Y el olivar?"),
          r: t("Comincia qui, dietro la casa.", "It starts here, behind the house.", "Empieza aquí, detrás de la casa."),
          vai: "uliveto",
        },
      ],
    },
    uliveto: {
      saluto: t("L'uliveto dietro casa.", "The olive grove behind the house.", "El olivar detrás de casa."),
      perFase: [
        {
          d: t("Quando fiorisce?", "When does it flower?", "¿Cuándo florece?"),
          r: t(
            "In primavera. Il fiore dell'ulivo si vede appena: è il vento a fare il lavoro.",
            "In spring. The olive flower is barely visible: the wind does the work.",
            "En primavera. La flor del olivo apenas se ve: el viento hace el trabajo."
          ),
        },
        {
          d: t("E d'estate?", "And in summer?", "¿Y en verano?"),
          r: t("Le olive crescono, ancora verdi e dure.", "The olives grow, still green and hard.", "Las aceitunas crecen, todavía verdes y duras."),
        },
        {
          d: t("Perché cambiano colore?", "Why do they change colour?", "¿Por qué cambian de color?"),
          r: t(
            "Maturano: dal verde al viola, poi al nero. Ognuna coi suoi tempi.",
            "They are ripening: green to purple, then black. Each at its own pace.",
            "Maduran: del verde al morado, luego al negro. Cada una a su ritmo."
          ),
        },
        {
          d: t("Come si raccoglie?", "How is it harvested?", "¿Cómo se cosecha?"),
          r: t(
            "Reti stese sotto gli alberi, pertiche fra i rami, le olive nelle cassette. Poi al frantoio entro ventiquattro ore.",
            "Nets under the trees, poles among the branches, olives into crates. Then to the mill within twenty-four hours.",
            "Redes bajo los árboles, varas entre las ramas, las aceitunas en cajas. Luego a la almazara en menos de veinticuatro horas."
          ),
        },
      ],
      temi: [
        {
          d: t("Che varietà sono?", "Which varieties?", "¿Qué variedades son?"),
          r: t(
            "Tonda iblea, nocellara e moresca. La tonda iblea e la moresca sono varietà della Sicilia sud-orientale.",
            "Tonda iblea, nocellara and moresca. Tonda iblea and moresca are varieties of south-eastern Sicily.",
            "Tonda iblea, nocellara y moresca. La tonda iblea y la moresca son variedades del sudeste de Sicilia."
          ),
        },
        {
          d: t("E gli altri alberi?", "And the other trees?", "¿Y los otros árboles?"),
          r: t(
            "Alberi da frutto, sparsi fra gli ulivi e gli agrumi: meli, peri, papaye, melograni, prugni, peschi di tanti tipi, azzeruoli, giuggioli, fichi, nespoli, ciliegi. E i cactus San Pedro, altissimi.",
            "Fruit trees, scattered among the olive and citrus trees: apples, pears, papayas, pomegranates, plums, all kinds of peaches, azaroles, jujubes, figs, loquats, cherries. And the San Pedro cacti, very tall.",
            "Frutales, repartidos entre los olivos y los cítricos: manzanos, perales, papayos, granados, ciruelos, melocotoneros de muchas clases, acerolos, azufaifos, higueras, nísperos, cerezos. Y los cactus San Pedro, altísimos."
          ),
        },
        {
          d: t("E gli altri uliveti?", "And the other groves?", "¿Y los otros olivares?"),
          r: t(
            "A Chiaramonte Gulfi, sui Monti Iblei. Ci andiamo in trattore.",
            "At Chiaramonte Gulfi, in the Hyblaean Mountains. We'll go by tractor.",
            "En Chiaramonte Gulfi, en los Montes Hibleos. Vamos en tractor."
          ),
          vai: "chiaramonte",
        },
      ],
    },
    chiaramonte: {
      saluto: t(
        "Chiaramonte Gulfi. Qui ci sono gli altri uliveti.",
        "Chiaramonte Gulfi. The other olive groves are here.",
        "Chiaramonte Gulfi. Aquí están los otros olivares."
      ),
      temi: [
        {
          d: t("Com'è la raccolta?", "What's the harvest like?", "¿Cómo es la cosecha?"),
          r: t(
            "Si fa in famiglia. Le reti stese sotto gli alberi, le pertiche fra i rami, le olive nelle cassette; mia madre sul cassone a sistemare il carico.",
            "It's a family job. Nets spread under the trees, poles among the branches, olives in crates; my mother on the truck bed stacking the load.",
            "Se hace en familia. Las redes bajo los árboles, las varas entre las ramas, las aceitunas en cajas; mi madre en la camioneta colocando la carga."
          ),
        },
        {
          d: t("Perché tanta fretta?", "Why the hurry?", "¿Por qué tanta prisa?"),
          r: t(
            "Perché la qualità di un olio si decide in poche ore: frangitura entro ventiquattro ore dalla raccolta, estrazione a freddo, nessuna scorciatoia.",
            "Because the quality of an oil is decided in a few hours: milling within twenty-four hours of the harvest, cold extraction, no shortcuts.",
            "Porque la calidad de un aceite se decide en pocas horas: molienda en menos de veinticuatro horas desde la cosecha, extracción en frío, sin atajos."
          ),
          vai: "frantoio",
        },
      ],
    },
    frantoio: {
      saluto: t("Il frantoio.", "The mill.", "La almazara."),
      perFase: [
        {
          d: t("Perché entro ventiquattro ore?", "Why within twenty-four hours?", "¿Por qué en menos de veinticuatro horas?"),
          r: t(
            "Più l'oliva aspetta, più l'olio perde profumo e prende difetti.",
            "The longer an olive waits, the more the oil loses aroma and picks up defects.",
            "Cuanto más espera la aceituna, más aroma pierde el aceite y más defectos coge."
          ),
        },
        {
          d: t("Anche il nocciolo?", "Pits too?", "¿También el hueso?"),
          r: t("Sì: si frange l'oliva intera.", "Yes: the whole olive is crushed.", "Sí: se muele la aceituna entera."),
        },
        {
          d: t("Cosa sono i fiscoli?", "What are fiscoli?", "¿Qué son los capachos?"),
          r: t(
            "Dischi intrecciati: ci si stende la pasta, si impilano e si mettono sotto la pressa.",
            "Woven mats: the paste is spread on them, they are stacked and put under the press.",
            "Discos trenzados: se extiende la pasta encima, se apilan y van bajo la prensa."
          ),
        },
        {
          d: t("Perché è torbido?", "Why is it cloudy?", "¿Por qué es turbio?"),
          r: t(
            "Appena fatto l'olio è verde e torbido; poi si filtra.",
            "Freshly made, the oil is green and cloudy; then it is filtered.",
            "Recién hecho, el aceite es verde y turbio; luego se filtra."
          ),
        },
      ],
      temi: [
        {
          d: t("E dopo?", "And afterwards?", "¿Y después?"),
          r: t(
            "Imbottigliato e spedito a chi lo sceglieva, in Italia e all'estero. Ho seguito anche la vendita.",
            "Bottled and shipped to those who chose it, in Italy and abroad. I handled the sales as well.",
            "Embotellado y enviado a quien lo elegía, en Italia y en el extranjero. También me ocupaba de la venta."
          ),
        },
        {
          d: t("E oggi?", "And today?", "¿Y hoy?"),
          r: t(
            "Oggi faccio siti web. Per un'azienda olearia so che cosa raccontare e come venderlo: posso fare il sito, lo shop e i testi.",
            "Today I build websites. For an olive oil company I know what to tell and how to sell it: I can build the site, the shop and the copy.",
            "Hoy hago páginas web. Para una empresa de aceite sé qué contar y cómo venderlo: puedo hacer la web, la tienda y los textos."
          ),
        },
      ],
    },
  },
};

const madre: Personaggio = {
  id: "madre",
  nome: t("Mia madre", "My mother", "Mi madre"),
  sotto: t("Il carico del giorno", "The day's load", "La carga del día"),
  zona: "chiaramonte",
  pos: altrove([5.1, 0, -31.4]),
  azione: "lavora",
  // dal video del carico: capelli scuri raccolti, maglietta bordeaux, guanti da lavoro neri
  aspetto: {
    pelle: "#D2A07C",
    capelli: { stile: "raccolti", colore: "#2E2018" },
    maglia: { colore: "#6A2E2A", maniche: "corte" },
    pantaloni: "#3A3A44",
    scarpe: "#4A4038",
    guanti: "#1A1A1A",
    altezza: 1.62,
    corpo: 0.92,
  },
  ritratto: "/olio/ritratti/madre.jpg",
  copioni: {
    chiaramonte: {
      saluto: t("Ciao! Questo è il carico di oggi.", "Hi! This is today's load.", "¡Hola! Esta es la carga de hoy."),
      temi: [
        {
          d: t("Dove vanno le olive?", "Where do the olives go?", "¿Adónde van las aceitunas?"),
          r: t("Al frantoio, oggi stesso.", "To the mill, today.", "A la almazara, hoy mismo."),
          vai: "frantoio",
        },
        {
          d: t("Chi raccoglie?", "Who picks them?", "¿Quién las recoge?"),
          r: t(
            "Noi, la famiglia: si stendono le reti e si va albero per albero.",
            "Us, the family: we spread the nets and go tree by tree.",
            "Nosotros, la familia: se tienden las redes y se va árbol por árbol."
          ),
        },
      ],
    },
  },
};

export const PERSONAGGI: Personaggio[] = [livio, madre];

/* ------------------------------------------------------------------ le foto e i video sparsi */

export type Forma = "bacheca" | "filo";
export type Quadro = {
  id: string;
  tipo: "foto" | "video";
  src: string;
  /** l'immagine che si vede nella scena (per i video, il fotogramma) */
  anteprima: string;
  didascalia: Testo;
  zona: ZonaId;
  p: P3;
  forma?: Forma;
};

const foto = (n: string) => ({ tipo: "foto" as const, src: `/olio/foto/${n}.jpg`, anteprima: `/olio/foto/${n}.jpg` });
const video = (n: string) => ({ tipo: "video" as const, src: `/olio/video/${n}.mp4`, anteprima: `/olio/video/${n}.jpg` });

export const QUADRI: Quadro[] = [
  { id: "caffe", ...foto("caffe"), didascalia: t("Pausa caffè in campagna", "Coffee break in the grove", "Pausa para el café en el campo"), zona: "agrumeto", p: [1.0, 0, 22.6] },
  { id: "ulivo", ...video("ulivo"), didascalia: t("Un ulivo", "One of the olive trees", "Uno de los olivos"), zona: "uliveto", p: [-20.5, 0, -50.5] },
  { id: "oliva", ...foto("oliva"), didascalia: t("L'oliva all'invaiatura", "An olive at veraison", "Una aceituna en envero"), zona: "uliveto", p: [-25.5, 0, -47.5] },
  { id: "carico", ...video("carico"), didascalia: t("Mia madre, col carico del giorno", "My mother, with the day's load", "Mi madre, con la carga del día"), zona: "chiaramonte", p: altrove([9.6, 0, -35.4]) },
  { id: "pranzo", ...foto("pranzo"), didascalia: t("Il pranzo, sulle cassette", "Lunch, on the crates", "El almuerzo, sobre las cajas"), zona: "chiaramonte", p: altrove([8.8, 0, -43]) },
  { id: "raccolta-reti", ...video("raccolta-reti"), didascalia: t("Si raccolgono le reti", "Gathering the nets", "Recogiendo las redes"), zona: "chiaramonte", p: altrove([-2.6, 0, -33.2]) },
  { id: "reti", ...video("reti"), didascalia: t("Le olive sulle reti", "Olives on the nets", "Aceitunas en las redes"), zona: "chiaramonte", p: altrove([-1, 0, -44.4]) },
  { id: "cassette-ulivi", ...video("cassette-ulivi"), didascalia: t("Cassette piene, fra gli ulivi", "Full crates among the trees", "Cajas llenas entre los olivos"), zona: "chiaramonte", p: altrove([3.5, 0, -46.5]) },
  { id: "reti-stese", ...foto("reti-stese"), forma: "filo", didascalia: t("Si stendono le reti", "Spreading the nets", "Tendiendo las redes"), zona: "chiaramonte", p: altrove([-5.5, 0, -35.5]) },
  { id: "sotto-gli-ulivi", ...foto("sotto-gli-ulivi"), forma: "filo", didascalia: t("Tutti sotto gli alberi", "Everyone under the trees", "Todos bajo los árboles"), zona: "chiaramonte", p: altrove([-5.5, 0, -35.5]) },
  { id: "abbacchiatore", ...foto("abbacchiatore"), forma: "filo", didascalia: t("Con l'abbacchiatore", "With the olive shaker", "Con el vareador"), zona: "chiaramonte", p: altrove([-5.5, 0, -35.5]) },
  { id: "pertiche", ...foto("pertiche"), forma: "filo", didascalia: t("Pertiche e carriola", "Poles and wheelbarrow", "Varas y carretilla"), zona: "chiaramonte", p: altrove([-5.5, 0, -35.5]) },
  { id: "nastro", ...video("nastro"), didascalia: t("Le olive verso la frangitura", "Olives on their way to the crusher", "Las aceitunas hacia la molienda"), zona: "frantoio", p: altrove([-19.6, 0, -40.4]) },
  { id: "pressa", ...video("pressa"), didascalia: t("La pressa coi fiscoli", "The press and its mats", "La prensa con los capachos"), zona: "frantoio", p: altrove([-8.4, 0, -40.4]) },
  { id: "filtro", ...video("filtro"), didascalia: t("Filtrato, nel bidone", "Filtered, into the can", "Filtrado, al bidón"), zona: "frantoio", p: altrove([-22.6, 0, -45.6]) },
  { id: "olio", ...video("olio"), didascalia: t("L'olio nuovo", "New oil", "El aceite nuevo"), zona: "frantoio", p: altrove([-5.4, 0, -45.6]) },
];

/* ------------------------------------------------------------------ i testi dell'interfaccia */

export const TESTI = {
  titolo: t("La casa in campagna", "The house in the country", "La casa en el campo"),
  luogo: t("Sicilia sud-orientale", "South-eastern Sicily", "Sudeste de Sicilia"),
  carica: t("Si apre il cancello", "Opening the gate", "Se abre la verja"),
  entra: t("Entra", "Come in", "Entra"),
  comandi: t("Comandi", "Controls", "Controles"),
  musica: t("Musica", "Music", "Música"),
  muto: t("Muto", "Muted", "Silencio"),
  accendiMusica: t("Accendi la musica", "Turn the music on", "Activa la música"),
  spegniMusica: t("Spegni la musica", "Turn the music off", "Apaga la música"),
  modo: t("Modo di visita", "How to visit", "Modo de visita"),
  guidata: t("Visita guidata", "Guided tour", "Visita guiada"),
  cammina: t("Cammina", "Walk", "Camina"),
  zone: t("Zone della campagna", "Places", "Lugares"),
  fase: t("fase", "stage", "fase"),
  di: t("di", "of", "de"),
  fasePrec: t("Fase precedente", "Previous stage", "Fase anterior"),
  faseSucc: t("Fase successiva", "Next stage", "Fase siguiente"),
  parlaCon: t("Parla con", "Talk to", "Habla con"),
  altraDomanda: t("Altra domanda", "Another question", "Otra pregunta"),
  grazie: t("Grazie, a dopo", "Thanks, see you later", "Gracias, hasta luego"),
  andiamo: t("Andiamo", "Let's go", "Vamos"),
  chiudi: t("Chiudi", "Close", "Cerrar"),
  finitoFasi: t(
    "Su questa fase ti ho detto tutto. Cambia fase dal pannello: a ogni fase c'è qualcosa di diverso.",
    "That's all on this stage. Change stage from the panel: each one has something different.",
    "De esta fase te lo he contado todo. Cambia de fase desde el panel: en cada una hay algo distinto."
  ),
  finito: t("Ti ho raccontato quello che c'era qui. Andiamo avanti?", "That's all there is here. Shall we move on?", "Te he contado lo que había aquí. ¿Seguimos?"),
  guidaTocco: t(
    "Trascina per guardarti intorno · tocca le etichette per spostarti · tocca le persone per parlare",
    "Drag to look around · tap the labels to move · tap people to talk",
    "Arrastra para mirar alrededor · toca las etiquetas para moverte · toca a las personas para hablar"
  ),
  guidaMouse: t(
    "Trascina per guardarti intorno · clic sulle etichette per spostarti · clic sulle persone per parlare",
    "Drag to look around · click the labels to move · click people to talk",
    "Arrastra para mirar alrededor · haz clic en las etiquetas para moverte · haz clic en las personas para hablar"
  ),
  camminaTocco: t(
    "Joystick per camminare · trascina per guardarti intorno · segui le luci dorate",
    "Joystick to walk · drag to look around · follow the golden lights",
    "Joystick para caminar · arrastra para mirar alrededor · sigue las luces doradas"
  ),
  camminaMouse: t(
    "W A S D o frecce per camminare · Shift per correre · trascina per guardarti intorno · segui le luci dorate",
    "W A S D or arrows to walk · Shift to run · drag to look around · follow the golden lights",
    "W A S D o flechas para caminar · Shift para correr · arrastra para mirar alrededor · sigue las luces doradas"
  ),
  comeMuoversi: t("Come muoversi", "How to move", "Cómo moverse"),
  benvenuto: t("Benvenuto in campagna", "Welcome to the country", "Bienvenido al campo"),
  joystick: t("Joystick in basso a sinistra: cammina", "Joystick bottom left: walk", "Joystick abajo a la izquierda: camina"),
  trascinaDito: t("Trascina con il dito: guardati intorno", "Drag with your finger: look around", "Arrastra con el dedo: mira alrededor"),
  trascina: t("trascina", "drag", "arrastra"),
  camminaFrecce: t("Cammina. Con le frecce ← → giri lo sguardo", "Walk. The ← → arrows turn your view", "Camina. Con las flechas ← → giras la vista"),
  corri: t("Tienilo premuto per correre", "Hold it to run", "Mantenlo pulsado para correr"),
  guardati: t("Guardati intorno", "Look around", "Mira alrededor"),
  nota1: t("Segui le luci dorate a terra e i cartelli: portano nei posti.", "Follow the golden lights on the ground and the signs: they lead to the places.", "Sigue las luces doradas del suelo y los carteles: llevan a los sitios."),
  nota2: t(
    "Clicca sulle persone per parlarci, sulle foto per vederle, sulle etichette o sui pulsanti in basso per andarci da solo.",
    "Click people to talk, photos to see them, labels or the buttons below to go there on your own.",
    "Haz clic en las personas para hablar, en las fotos para verlas, en las etiquetas o en los botones de abajo para ir solo."
  ),
  nota3: t("Per gli uliveti di Chiaramonte si sale sul trattore, all'aia.", "For the groves at Chiaramonte, get on the tractor in the yard.", "Para los olivares de Chiaramonte, sube al tractor en la era."),
  capito: t("Ho capito, si parte", "Got it, let's go", "Entendido, vamos"),
  versoLontano: t("In trattore verso Chiaramonte…", "By tractor to Chiaramonte…", "En tractor hacia Chiaramonte…"),
  versoCasa: t("Si torna a casa…", "Heading home…", "Volvemos a casa…"),
  trattoreVa: t("Uliveti di Chiaramonte", "Groves at Chiaramonte", "Olivares de Chiaramonte"),
  trattoreTorna: t("Torna a casa", "Back home", "Volver a casa"),
  sali: t("Sali sul trattore", "Get on the tractor", "Sube al tractor"),
  cartello1: t("Andiamo agli uliveti", "Off to the olive groves", "Vamos a los olivares"),
  cartello2: t("di Chiaramonte Gulfi", "of Chiaramonte Gulfi", "de Chiaramonte Gulfi"),
  vai: t("Vai", "Go", "Ir"),
  guarda: t("Guarda", "View", "Ver"),
  romero: t("Il cane di casa", "The house dog", "El perro de casa"),
  senza3d: t(
    "Questo dispositivo non mostra la scena 3D: ecco i posti e le foto.",
    "This device can't show the 3D scene: here are the places and the photos.",
    "Este dispositivo no muestra la escena 3D: aquí están los sitios y las fotos."
  ),
};
